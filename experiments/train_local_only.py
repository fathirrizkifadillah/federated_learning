"""
Module: experiments.train_local_only
Description: Trains and evaluates independent Local-Only MF-BPR models for each client
             (isolated training without federated aggregation), establishing the lower bound
             of isolated on-device learning for IID and Non-IID settings.
Outputs: Saves metrics to results/local_only_metrics.json.
Principles: Follows 'ml-experiment' and 'clean-code'.
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader

from evaluation.metrics import aggregate_ranking_metrics, compute_ranking_metrics_for_user
from experiments.train_centralized import BPRTrainDataset, evaluate_model_ranking
from models.mf_bpr import MatrixFactorizationBPR

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

DATA_DIR = Path("data/partitions")
RESULTS_DIR = Path("results")
NUM_CLIENTS = 5
EMBEDDING_DIM = 32
LEARNING_RATE = 0.005
L2_REG = 1e-4
BATCH_SIZE = 128
LOCAL_EPOCHS = 20
SEED = 42


def train_single_client_local(
    client_id: int,
    partition_type: str,
    user_to_id: Dict[str, int],
    item_to_id: Dict[str, int],
    eval_negatives: Dict[str, Dict[str, List[str]]],
    device: torch.device,
) -> Dict[str, float]:
    """Trains an isolated MF-BPR model exclusively on a single client's local data."""
    torch.manual_seed(SEED + client_id)
    np.random.seed(SEED + client_id)

    client_dir = DATA_DIR / partition_type
    train_file = client_dir / f"client_{client_id}_train.csv"
    val_file = client_dir / f"client_{client_id}_val.csv"
    test_file = client_dir / f"client_{client_id}_test.csv"

    train_df = pd.read_csv(train_file)
    val_df = pd.read_csv(val_file)
    test_df = pd.read_csv(test_file)

    # Local client users
    client_users = sorted(train_df["user_id"].unique())
    # Create local user index mapping [0 .. num_local_users - 1]
    local_user_to_id = {u: idx for idx, u in enumerate(client_users)}

    # Build local user observed map
    all_local_df = pd.concat([train_df, val_df, test_df], ignore_index=True)
    user_observed_map: Dict[int, Set[int]] = {}
    for _, row in all_local_df.iterrows():
        u = local_user_to_id.get(row["user_id"])
        i = item_to_id.get(row["parent_asin"])
        if u is not None and i is not None:
            user_observed_map.setdefault(u, set()).add(i)

    train_pairs = [
        (local_user_to_id[row["user_id"]], item_to_id[row["parent_asin"]])
        for _, row in train_df.iterrows()
        if row["user_id"] in local_user_to_id and row["parent_asin"] in item_to_id
    ]

    dataset = BPRTrainDataset(train_pairs, len(item_to_id), user_observed_map, seed=SEED + client_id)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    model = MatrixFactorizationBPR(
        num_users=len(local_user_to_id),
        num_items=len(item_to_id),
        embedding_dim=EMBEDDING_DIM,
        l2_reg=L2_REG,
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    for epoch in range(LOCAL_EPOCHS):
        model.train()
        for u_b, pos_b, neg_b in dataloader:
            u_b = u_b.to(device)
            pos_b = pos_b.to(device)
            neg_b = neg_b.to(device)

            optimizer.zero_grad()
            loss = model.compute_bpr_loss(u_b, pos_b, neg_b)
            loss.backward()
            optimizer.step()

    # Evaluate on client's local test set
    test_metrics = evaluate_model_ranking(
        model=model,
        eval_df=test_df,
        eval_negatives=eval_negatives,
        user_to_id=local_user_to_id,
        item_to_id=item_to_id,
        phase="test",
        device=device,
    )

    return test_metrics


def run_local_only_experiments():
    logger.info("Executing Isolated Local-Only Training Experiments...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    with open(DATA_DIR / "user_mapping.json", "r", encoding="utf-8") as f:
        user_to_id = json.load(f)
    with open(DATA_DIR / "item_mapping.json", "r", encoding="utf-8") as f:
        item_to_id = json.load(f)
    with open(DATA_DIR / "eval_negatives.json", "r", encoding="utf-8") as f:
        eval_negatives = json.load(f)

    all_results = {}

    for ptype in ("iid", "non_iid"):
        logger.info("--- Evaluating Local-Only on %s partitions ---", ptype.upper())
        client_metrics = {}
        for c in range(NUM_CLIENTS):
            res = train_single_client_local(
                client_id=c,
                partition_type=ptype,
                user_to_id=user_to_id,
                item_to_id=item_to_id,
                eval_negatives=eval_negatives,
                device=device,
            )
            client_metrics[f"client_{c}"] = res
            logger.info("Client %d (%s) -> NDCG@10: %.4f | Hit@10: %.4f", c, ptype, res["ndcg@10"], res["hit@10"])

        # Average across all clients
        avg_metrics = {
            k: float(np.mean([client_metrics[f"client_{c}"][k] for c in range(NUM_CLIENTS)]))
            for k in client_metrics["client_0"].keys()
        }
        logger.info("Mean Local-Only %s -> NDCG@10: %.4f | Hit@10: %.4f", ptype.upper(), avg_metrics["ndcg@10"], avg_metrics["hit@10"])

        all_results[ptype] = {
            "mean_metrics": avg_metrics,
            "per_client": client_metrics,
        }

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out_file = RESULTS_DIR / "local_only_metrics.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    logger.info("Local-Only experiment metrics saved to %s", out_file)


if __name__ == "__main__":
    run_local_only_experiments()
