"""
Script: experiments/train_and_save_federated.py
Description: Trains FedAvg Non-IID, runs local adaptation for Personalized FL,
             and saves the checkpoints to results/models/ so that evaluation audits
             and Streamlit UI can load them instantly without re-training.
"""

import os
import sys
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import torch
from flwr.common import ndarrays_to_parameters
import flwr as fl

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from client.flwr_client import FlowerRecClient, build_client_fn, clear_local_user_registry
from strategies.masked_fedavg import MaskedFedAvg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

MODELS_DIR = PROJECT_ROOT / "results" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR = PROJECT_ROOT / "data" / "partitions"

NUM_CLIENTS = 5
NUM_ROUNDS = 10
LOCAL_EPOCHS = 2
LEARNING_RATE = 0.005
L2_REG = 1e-4
BATCH_SIZE = 128
EMBEDDING_DIM = 32
SEED = 42


def train_and_save():
    logger.info("=" * 70)
    logger.info("Training and Saving Converged Federated Models (FedAvg & Personalized FL)")
    logger.info("=" * 70)

    clear_local_user_registry()

    with open(DATA_DIR / "item_mapping.json", "r", encoding="utf-8") as f:
        item_to_id = json.load(f)
    num_items = len(item_to_id)

    # Initialize global item embeddings
    rng = np.random.default_rng(SEED)
    initial_item_weights = rng.normal(0, 0.01, (num_items, EMBEDDING_DIM)).astype(np.float32)
    initial_parameters = ndarrays_to_parameters([initial_item_weights])

    strategy = MaskedFedAvg(
        num_items=num_items,
        embedding_dim=EMBEDDING_DIM,
        initial_parameters=initial_parameters,
        min_fit_clients=NUM_CLIENTS,
        min_available_clients=NUM_CLIENTS,
    )

    client_fn = build_client_fn(
        partition_type="non_iid",
        embedding_dim=EMBEDDING_DIM,
        lr=LEARNING_RATE,
        l2_reg=L2_REG,
        local_epochs=LOCAL_EPOCHS,
        batch_size=BATCH_SIZE,
    )

    logger.info("[1/3] Running %d rounds of FedAvg Non-IID simulation...", NUM_ROUNDS)
    start_time = time.time()
    fl.simulation.start_simulation(
        client_fn=client_fn,
        num_clients=NUM_CLIENTS,
        config=fl.server.ServerConfig(num_rounds=NUM_ROUNDS),
        strategy=strategy,
        client_resources={"num_cpus": 1, "num_gpus": 0.0},
    )
    elapsed_fedavg = time.time() - start_time
    logger.info("FedAvg Non-IID finished in %.2f seconds", elapsed_fedavg)

    # Extract final global item weights
    global_item_weights = strategy.global_item_embeddings
    item_weights_path = MODELS_DIR / "fedavg_non_iid_item_embeddings.pt"
    torch.save(
        {"item_embeddings.weight": torch.from_numpy(global_item_weights)},
        item_weights_path,
    )
    logger.info("Saved global item embeddings to %s", item_weights_path)

    # 2. Local personalization & saving per-client checkpoints
    logger.info("[2/3] Performing 2-epoch local personalization fine-tuning...")
    p_start = time.time()
    personalized_metadata = {}

    for cid in range(NUM_CLIENTS):
        client = FlowerRecClient(
            cid=cid,
            partition_type="non_iid",
            embedding_dim=EMBEDDING_DIM,
            batch_size=BATCH_SIZE,
        )
        client.model.set_item_embeddings(torch.from_numpy(global_item_weights))
        metrics = client.personalize(adaptation_epochs=2, adaptation_lr=0.002)
        logger.info("Personalized Client %d -> NDCG@10: %.4f | Hit@10: %.4f", cid, metrics["ndcg@10"], metrics["hit@10"])

        client_ckpt_path = MODELS_DIR / f"personalized_client_{cid}.pt"
        torch.save(client.model.state_dict(), client_ckpt_path)
        personalized_metadata[f"client_{cid}"] = {
            "metrics": metrics,
            "path": str(client_ckpt_path),
            "num_users": client.model.num_users,
        }

    elapsed_p = time.time() - p_start
    meta_path = MODELS_DIR / "personalized_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(personalized_metadata, f, indent=2)

    logger.info("Personalized metadata saved to %s (Elapsed: %.2fs)", meta_path, elapsed_p)
    logger.info("[3/3] ALL CHECKPOINTS SAVED SUCCESSFULLY!")


if __name__ == "__main__":
    train_and_save()
