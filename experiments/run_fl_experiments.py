"""
Module: experiments.run_fl_experiments
Description: Executes Stage 5 Federated Learning experiments:
             - EXP-05 (A): FedAvg on IID (10 rounds)
             - EXP-05 (B): FedAvg on Non-IID (10 rounds)
             - EXP-06: FedProx on Non-IID (mu=0.01, 10 rounds)
             - EXP-07: Personalized Federated Learning (Local Fine-Tuning)
Outputs: Compiles results into results/fl_experiments_results.json.
Principles: Follows 'ml-experiment' and 'clean-code'.
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import flwr as fl
import numpy as np
import torch
from flwr.common import ndarrays_to_parameters, parameters_to_ndarrays

from client.flwr_client import FlowerRecClient, build_client_fn, clear_local_user_registry
from strategies.fedprox import FedProxRec
from strategies.masked_fedavg import MaskedFedAvg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

DATA_DIR = PROJECT_ROOT / "data" / "partitions"
RESULTS_DIR = PROJECT_ROOT / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
OUT_RESULTS_FILE = RESULTS_DIR / "fl_experiments_results.json"

NUM_CLIENTS = 5
NUM_ROUNDS = 10
LOCAL_EPOCHS = 2
EMBEDDING_DIM = 32
LEARNING_RATE = 0.005
L2_REG = 1e-4
BATCH_SIZE = 128
SEED = 42


def evaluate_all_clients_individually(
    partition_type: str,
    global_item_weights: np.ndarray,
    embedding_dim: int = EMBEDDING_DIM,
) -> Dict[str, Dict[str, float]]:
    """Evaluates the global model on each client individually to capture slice disparity."""
    per_client_metrics = {}
    for cid in range(NUM_CLIENTS):
        client = FlowerRecClient(
            cid=cid,
            partition_type=partition_type,
            embedding_dim=embedding_dim,
            batch_size=BATCH_SIZE,
        )
        _, _, metrics = client.evaluate([global_item_weights], {})
        per_client_metrics[f"client_{cid}"] = metrics
    return per_client_metrics


def run_single_fl_experiment(
    exp_name: str,
    partition_type: str,
    use_fedprox: bool = False,
    proximal_mu: float = 0.0,
    num_rounds: int = NUM_ROUNDS,
    seed: int = SEED,
) -> Dict[str, Any]:
    """Runs a complete FL experiment across specified rounds."""
    logger.info("=" * 70)
    logger.info("STARTING EXPERIMENT: %s (Partition: %s, FedProx: %s, Mu: %.3f)", exp_name, partition_type, use_fedprox, proximal_mu)
    logger.info("=" * 70)

    clear_local_user_registry()

    with open(DATA_DIR / "item_mapping.json", "r", encoding="utf-8") as f:
        item_to_id = json.load(f)
    num_items = len(item_to_id)

    # Initialize global item embeddings
    rng = np.random.default_rng(seed)
    initial_item_weights = rng.normal(0, 0.01, (num_items, EMBEDDING_DIM)).astype(np.float32)
    initial_parameters = ndarrays_to_parameters([initial_item_weights])

    # Instantiate strategy
    if use_fedprox:
        strategy = FedProxRec(
            num_items=num_items,
            embedding_dim=EMBEDDING_DIM,
            proximal_mu=proximal_mu,
            initial_parameters=initial_parameters,
            min_fit_clients=NUM_CLIENTS,
            min_available_clients=NUM_CLIENTS,
            seed=seed,
        )
    else:
        strategy = MaskedFedAvg(
            num_items=num_items,
            embedding_dim=EMBEDDING_DIM,
            initial_parameters=initial_parameters,
            min_fit_clients=NUM_CLIENTS,
            min_available_clients=NUM_CLIENTS,
        )

    client_fn = build_client_fn(
        partition_type=partition_type,
        embedding_dim=EMBEDDING_DIM,
        lr=LEARNING_RATE,
        l2_reg=L2_REG,
        local_epochs=LOCAL_EPOCHS,
        batch_size=BATCH_SIZE,
    )

    start_time = time.time()
    fl.simulation.start_simulation(
        client_fn=client_fn,
        num_clients=NUM_CLIENTS,
        config=fl.server.ServerConfig(num_rounds=num_rounds),
        strategy=strategy,
        client_resources={"num_cpus": 1, "num_gpus": 0.0},
    )
    elapsed_time = time.time() - start_time

    final_global_weights = strategy.global_item_embeddings
    per_client_final = evaluate_all_clients_individually(partition_type, final_global_weights)

    logger.info(
        "EXPERIMENT %s FINISHED in %.2fs | Final Round NDCG@10: %.4f | Hit@10: %.4f",
        exp_name,
        elapsed_time,
        strategy.round_history[-1].get("ndcg@10", 0.0),
        strategy.round_history[-1].get("hit@10", 0.0),
    )

    return {
        "experiment_name": exp_name,
        "partition_type": partition_type,
        "algorithm": "FedProx" if use_fedprox else "FedAvg",
        "proximal_mu": proximal_mu,
        "num_rounds": num_rounds,
        "local_epochs": LOCAL_EPOCHS,
        "elapsed_seconds": elapsed_time,
        "round_history": strategy.round_history,
        "final_global_metrics": strategy.round_history[-1],
        "per_client_metrics": per_client_final,
        "final_global_weights": final_global_weights,
    }


def run_personalized_fl(
    base_experiment_result: Dict[str, Any],
    adaptation_epochs: int = 2,
    adaptation_lr: float = 0.002,
) -> Dict[str, Any]:
    """Applies post-federation local personalization fine-tuning on each client."""
    logger.info("=" * 70)
    logger.info("STARTING EXPERIMENT: EXP-07 Personalized FL (Local Adaptation)")
    logger.info("=" * 70)

    partition_type = base_experiment_result["partition_type"]
    global_weights = base_experiment_result["final_global_weights"]

    start_time = time.time()
    personalized_per_client = {}

    for cid in range(NUM_CLIENTS):
        client = FlowerRecClient(
            cid=cid,
            partition_type=partition_type,
            embedding_dim=EMBEDDING_DIM,
            batch_size=BATCH_SIZE,
        )
        # Load the converged global item embeddings
        client.model.set_item_embeddings(torch.from_numpy(global_weights))
        # Fine-tune user embeddings
        p_metrics = client.personalize(adaptation_epochs=adaptation_epochs, adaptation_lr=adaptation_lr)
        personalized_per_client[f"client_{cid}"] = p_metrics
        logger.info("Personalized Client %d -> NDCG@10: %.4f | Hit@10: %.4f", cid, p_metrics["ndcg@10"], p_metrics["hit@10"])

    elapsed = time.time() - start_time

    # Calculate overall population average
    all_keys = ["ndcg@5", "ndcg@10", "hit@5", "hit@10", "recall@5", "recall@10", "mrr"]
    avg_personalized = {
        k: float(np.mean([personalized_per_client[f"client_{cid}"][k] for cid in range(NUM_CLIENTS)]))
        for k in all_keys
    }

    logger.info(
        "Personalized FL Complete in %.2fs | Avg NDCG@10: %.4f | Avg Hit@10: %.4f",
        elapsed,
        avg_personalized["ndcg@10"],
        avg_personalized["hit@10"],
    )

    return {
        "experiment_name": "EXP-07_Personalized_FL",
        "base_model": base_experiment_result["experiment_name"],
        "adaptation_epochs": adaptation_epochs,
        "adaptation_lr": adaptation_lr,
        "elapsed_seconds": elapsed,
        "mean_personalized_metrics": avg_personalized,
        "per_client_metrics": personalized_per_client,
    }


def main():
    logger.info("Executing Complete Federated Learning Experiment Suite (Stage 5)...")
    suite_start = time.time()
    results = {}

    # 1. FedAvg on IID (10 rounds)
    exp_iid = run_single_fl_experiment(
        exp_name="EXP-05A_FedAvg_IID",
        partition_type="iid",
        use_fedprox=False,
        proximal_mu=0.0,
        num_rounds=NUM_ROUNDS,
    )
    results["fedavg_iid"] = {k: v for k, v in exp_iid.items() if k != "final_global_weights"}

    # 2. FedAvg on Non-IID (10 rounds)
    exp_non_iid = run_single_fl_experiment(
        exp_name="EXP-05B_FedAvg_Non_IID",
        partition_type="non_iid",
        use_fedprox=False,
        proximal_mu=0.0,
        num_rounds=NUM_ROUNDS,
    )
    results["fedavg_non_iid"] = {k: v for k, v in exp_non_iid.items() if k != "final_global_weights"}

    # 3. FedProx on Non-IID (10 rounds, mu=0.01)
    exp_fedprox = run_single_fl_experiment(
        exp_name="EXP-06_FedProx_Non_IID",
        partition_type="non_iid",
        use_fedprox=True,
        proximal_mu=0.01,
        num_rounds=NUM_ROUNDS,
    )
    results["fedprox_non_iid"] = {k: v for k, v in exp_fedprox.items() if k != "final_global_weights"}

    # 4. Personalized FL on Non-IID (Fine-tuning the best federated non-IID model)
    exp_p_fl = run_personalized_fl(
        base_experiment_result=exp_fedprox,
        adaptation_epochs=2,
        adaptation_lr=0.002,
    )
    results["personalized_fl"] = exp_p_fl

    # Save all experimental results to JSON
    total_time = time.time() - suite_start
    results["summary_meta"] = {
        "num_clients": NUM_CLIENTS,
        "num_rounds": NUM_ROUNDS,
        "total_suite_duration_seconds": total_time,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }

    with open(OUT_RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    logger.info("ALL FL EXPERIMENTS COMPLETED in %.2f seconds! Results saved to %s", total_time, OUT_RESULTS_FILE)


if __name__ == "__main__":
    main()
