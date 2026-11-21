"""
Module: server.flwr_server
Description: Orchestrates Federated Recommendation Simulation on Flower.
Principles: Follows 'clean-code' and 'recsys-pipeline-architect'.
"""

import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import flwr as fl
import numpy as np
import torch
from flwr.common import ndarrays_to_parameters

from client.flwr_client import build_client_fn
from strategies.masked_fedavg import MaskedFedAvg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run_flower_simulation(
    num_clients: int = 5,
    num_rounds: int = 3,
    partition_type: str = "iid",
    embedding_dim: int = 32,
    local_epochs: int = 1,
    lr: float = 0.005,
    l2_reg: float = 1e-4,
    batch_size: int = 128,
    seed: int = 42,
) -> Tuple[MaskedFedAvg, List[Dict[str, float]]]:
    """Runs a complete Flower federated learning simulation for recommendation.

    Returns:
        Tuple of (strategy, list of per-round evaluation metrics)
    """
    logger.info(
        "Starting Flower FL Simulation | Clients: %d | Rounds: %d | Partition: %s",
        num_clients,
        num_rounds,
        partition_type,
    )

    data_dir = PROJECT_ROOT / "data" / "partitions"
    import json
    with open(data_dir / "item_mapping.json", "r", encoding="utf-8") as f:
        item_to_id = json.load(f)
    num_items = len(item_to_id)

    # Initialize global item embeddings
    rng = np.random.default_rng(seed)
    initial_item_weights = rng.normal(0, 0.01, (num_items, embedding_dim)).astype(np.float32)
    initial_parameters = ndarrays_to_parameters([initial_item_weights])

    # Configure MaskedFedAvg strategy
    strategy = MaskedFedAvg(
        num_items=num_items,
        embedding_dim=embedding_dim,
        initial_parameters=initial_parameters,
        min_fit_clients=num_clients,
        min_available_clients=num_clients,
    )

    # Client factory function
    client_fn = build_client_fn(
        partition_type=partition_type,
        embedding_dim=embedding_dim,
        lr=lr,
        l2_reg=l2_reg,
        local_epochs=local_epochs,
        batch_size=batch_size,
    )

    # Launch simulation
    fl.simulation.start_simulation(
        client_fn=client_fn,
        num_clients=num_clients,
        config=fl.server.ServerConfig(num_rounds=num_rounds),
        strategy=strategy,
        client_resources={"num_cpus": 1, "num_gpus": 0.0},
    )

    logger.info("Simulation finished. Total rounds evaluated: %d", len(strategy.round_history))
    return strategy, strategy.round_history


if __name__ == "__main__":
    run_flower_simulation(num_rounds=1)
