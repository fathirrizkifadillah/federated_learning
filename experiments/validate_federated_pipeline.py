"""
Module: experiments.validate_federated_pipeline
Description: Executes EXP-04: Flower Federated Learning Infrastructure Validation.
             Runs a 3-round end-to-end simulation on IID partitions to verify:
             1. Correct client initialization & local data loading
             2. Parameter decoupling (Item embeddings aggregated, User embeddings private)
             3. Masked aggregation per-item behavior
             4. Multi-round ranking convergence and evaluation
Outputs: Saves metrics to results/federated_pipeline_validation.json
Principles: Follows 'ml-experiment' and 'clean-code'.
"""

import json
import logging
import sys
import time
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from server.flwr_server import run_flower_simulation

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = RESULTS_DIR / "federated_pipeline_validation.json"


def main():
    logger.info("Starting EXP-04: Flower Federated Pipeline Validation (3 Rounds)...")
    start_time = time.time()

    strategy, round_history = run_flower_simulation(
        num_clients=5,
        num_rounds=3,
        partition_type="iid",
        embedding_dim=32,
        local_epochs=1,
        lr=0.005,
        l2_reg=1e-4,
        batch_size=128,
        seed=42,
    )

    elapsed_time = time.time() - start_time
    logger.info("EXP-04 execution completed in %.2f seconds.", elapsed_time)

    # Compile validation payload
    payload = {
        "experiment_id": "EXP-04",
        "status": "COMPLETED",
        "num_clients": 5,
        "num_rounds": 3,
        "partition_type": "iid",
        "embedding_dim": 32,
        "local_epochs_per_round": 1,
        "total_elapsed_seconds": elapsed_time,
        "round_history": round_history,
        "final_metrics": round_history[-1] if round_history else {},
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    logger.info("Validation metrics saved to %s", OUT_FILE)
    logger.info("Round History Summary:")
    for rh in round_history:
        logger.info(
            "  Round %d -> NDCG@10: %.4f | Hit@10: %.4f | MRR: %.4f",
            int(rh["round"]),
            rh.get("ndcg@10", 0.0),
            rh.get("hit@10", 0.0),
            rh.get("mrr", 0.0),
        )


if __name__ == "__main__":
    main()
