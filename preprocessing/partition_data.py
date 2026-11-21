"""
Module: preprocessing.partition_data
Description: Generates chronological train/val/test splits and federated client partitions (IID & Non-IID)
             strictly adhering to 'leakage-adversary', 'recsys-pipeline-architect', and 'clean-code'.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

CLEAN_DATA_PATH = Path("data/processed/electronics_50k_clean.csv")
PARTITIONS_DIR = Path("data/partitions")
RANDOM_SEED = 42
NUM_CLIENTS = 5
DIRICHLET_ALPHA = 0.5
NUM_EVAL_NEGATIVES = 99


def filter_k_core(df: pd.DataFrame, k_user: int = 3, k_item: int = 3) -> pd.DataFrame:
    """Iteratively filters dataset until all users and items satisfy k-core constraint."""
    logger.info("Applying iterative k-core filter (k_user=%d, k_item=%d)...", k_user, k_item)
    filtered = df.copy()
    iteration = 0
    while True:
        prev_rows = len(filtered)
        user_counts = filtered["user_id"].value_counts()
        filtered = filtered[filtered["user_id"].isin(user_counts[user_counts >= k_user].index)]
        item_counts = filtered["parent_asin"].value_counts()
        filtered = filtered[filtered["parent_asin"].isin(item_counts[item_counts >= k_item].index)]
        iteration += 1
        if len(filtered) == prev_rows:
            break
    logger.info(
        "K-core convergence in %d iterations: %d interactions | %d users | %d items",
        iteration,
        len(filtered),
        filtered["user_id"].nunique(),
        filtered["parent_asin"].nunique(),
    )
    return filtered


def perform_chronological_split(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Splits each user's interactions chronologically:
    - Earliest interactions -> train
    - Second to last interaction -> val
    - Last interaction -> test
    Guarantees no future temporal leakage into training data.
    """
    logger.info("Executing chronological per-user split (Leave-Last-2-Out: 1 val, 1 test)...")
    sorted_df = df.sort_values(by=["user_id", "timestamp"]).copy()
    sorted_df["seq"] = sorted_df.groupby("user_id").cumcount()
    sorted_df["total"] = sorted_df.groupby("user_id")["user_id"].transform("count")

    train_df = sorted_df[sorted_df["seq"] < (sorted_df["total"] - 2)].drop(columns=["seq", "total"])
    val_df = sorted_df[sorted_df["seq"] == (sorted_df["total"] - 2)].drop(columns=["seq", "total"])
    test_df = sorted_df[sorted_df["seq"] == (sorted_df["total"] - 1)].drop(columns=["seq", "total"])

    logger.info("Split sizes -> Train: %d | Val: %d | Test: %d", len(train_df), len(val_df), len(test_df))
    return train_df, val_df, test_df


def generate_evaluation_negatives(
    all_users: List[str],
    all_items: List[str],
    user_interaction_map: Dict[str, Set[str]],
    num_negatives: int = NUM_EVAL_NEGATIVES,
    seed: int = RANDOM_SEED,
) -> Dict[str, Dict[str, List[str]]]:
    """Generates fixed, reproducible negative candidate pools for validation and testing.
    Strictly enforces zero leakage: negative pool excludes ALL observed user interactions (train, val, test).
    """
    logger.info("Generating fixed evaluation negative candidate pools (%d per user)...", num_negatives)
    rng = np.random.default_rng(seed)
    all_items_array = np.array(all_items)
    eval_negatives: Dict[str, Dict[str, List[str]]] = {"val": {}, "test": {}}

    for user in all_users:
        observed_items = user_interaction_map.get(user, set())
        # Candidate negatives must be disjoint from all historical and future observed interactions
        unobserved_mask = ~np.isin(all_items_array, list(observed_items))
        unobserved_items = all_items_array[unobserved_mask]

        if len(unobserved_items) < num_negatives:
            raise ValueError(f"User {user} has fewer than {num_negatives} unobserved items!")

        # Sample 99 negatives for validation and 99 negatives for test
        sampled_indices = rng.choice(len(unobserved_items), size=num_negatives * 2, replace=False)
        val_negs = unobserved_items[sampled_indices[:num_negatives]].tolist()
        test_negs = unobserved_items[sampled_indices[num_negatives:]].tolist()

        eval_negatives["val"][user] = val_negs
        eval_negatives["test"][user] = test_negs

    return eval_negatives


def partition_iid(users: List[str], num_clients: int = NUM_CLIENTS, seed: int = RANDOM_SEED) -> Dict[int, List[str]]:
    """Partitions users into K disjoint clients with uniform random assignment (IID)."""
    rng = np.random.default_rng(seed)
    shuffled_users = rng.permutation(users)
    user_chunks = np.array_split(shuffled_users, num_clients)
    return {c: user_chunks[c].tolist() for c in range(num_clients)}


def partition_non_iid(
    df_train: pd.DataFrame,
    users: List[str],
    num_clients: int = NUM_CLIENTS,
    alpha: float = DIRICHLET_ALPHA,
    seed: int = RANDOM_SEED,
) -> Dict[int, List[str]]:
    """Partitions users into K disjoint clients using Dirichlet distribution over item frequency groups (Non-IID).
    Simulates real-world preference skew and data heterogeneity.
    """
    rng = np.random.default_rng(seed)
    # Group users by their median item popularity to capture distinct interest clusters
    item_frequencies = df_train["parent_asin"].value_counts()
    user_item_scores = df_train.groupby("user_id")["parent_asin"].apply(
        lambda items: np.median([item_frequencies.get(it, 0) for it in items])
    )

    user_scores_series = pd.Series({u: user_item_scores.get(u, 0) for u in users})
    num_groups = num_clients
    # Discretize users into quantile-based preference groups
    user_groups = pd.qcut(user_scores_series, q=num_groups, labels=False, duplicates="drop")

    client_user_assignments: Dict[int, List[str]] = {c: [] for c in range(num_clients)}

    for group_id in range(num_groups):
        group_users = user_scores_series[user_groups == group_id].index.to_numpy().copy()
        rng.shuffle(group_users)
        
        # Sample client shares from Dirichlet distribution
        proportions = rng.dirichlet(np.repeat(alpha, num_clients))
        # Scale to match group user count
        counts = (proportions * len(group_users)).astype(int)
        # Ensure sum matches exactly
        diff = len(group_users) - counts.sum()
        counts[rng.choice(num_clients, size=diff, replace=True)] += 1

        start_idx = 0
        for c in range(num_clients):
            assigned = group_users[start_idx : start_idx + counts[c]].tolist()
            client_user_assignments[c].extend(assigned)
            start_idx += counts[c]

    return client_user_assignments


def export_splits_and_metadata(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    iid_assignments: Dict[int, List[str]],
    non_iid_assignments: Dict[int, List[str]],
    eval_negatives: Dict[str, Dict[str, List[str]]],
    output_dir: Path = PARTITIONS_DIR,
) -> None:
    """Exports centralized datasets, IID & Non-IID client partitions, mappings, and evaluation pools."""
    output_dir.mkdir(parents=True, exist_ok=True)
    iid_dir = output_dir / "iid"
    non_iid_dir = output_dir / "non_iid"
    central_dir = output_dir / "centralized"

    iid_dir.mkdir(parents=True, exist_ok=True)
    non_iid_dir.mkdir(parents=True, exist_ok=True)
    central_dir.mkdir(parents=True, exist_ok=True)

    # 1. Export centralized baseline data
    cols = ["user_id", "parent_asin", "rating", "timestamp"]
    train_df[cols].to_csv(central_dir / "train.csv", index=False)
    val_df[cols].to_csv(central_dir / "val.csv", index=False)
    test_df[cols].to_csv(central_dir / "test.csv", index=False)
    logger.info("Exported centralized splits to %s", central_dir)

    # 2. Export IID partitions
    for c_id, client_users in iid_assignments.items():
        c_users_set = set(client_users)
        train_df[train_df["user_id"].isin(c_users_set)][cols].to_csv(iid_dir / f"client_{c_id}_train.csv", index=False)
        val_df[val_df["user_id"].isin(c_users_set)][cols].to_csv(iid_dir / f"client_{c_id}_val.csv", index=False)
        test_df[test_df["user_id"].isin(c_users_set)][cols].to_csv(iid_dir / f"client_{c_id}_test.csv", index=False)
    logger.info("Exported IID partitions for %d clients to %s", len(iid_assignments), iid_dir)

    # 3. Export Non-IID partitions
    for c_id, client_users in non_iid_assignments.items():
        c_users_set = set(client_users)
        train_df[train_df["user_id"].isin(c_users_set)][cols].to_csv(non_iid_dir / f"client_{c_id}_train.csv", index=False)
        val_df[val_df["user_id"].isin(c_users_set)][cols].to_csv(non_iid_dir / f"client_{c_id}_val.csv", index=False)
        test_df[test_df["user_id"].isin(c_users_set)][cols].to_csv(non_iid_dir / f"client_{c_id}_test.csv", index=False)
    logger.info("Exported Non-IID partitions for %d clients to %s", len(non_iid_assignments), non_iid_dir)

    # 4. Save metadata: Item mapping, User mapping, Eval negatives
    unique_items = sorted(train_df["parent_asin"].unique())
    item_to_id = {item: idx for idx, item in enumerate(unique_items)}
    with open(output_dir / "item_mapping.json", "w", encoding="utf-8") as f:
        json.dump(item_to_id, f, indent=2)

    unique_users = sorted(train_df["user_id"].unique())
    user_to_id = {user: idx for idx, user in enumerate(unique_users)}
    with open(output_dir / "user_mapping.json", "w", encoding="utf-8") as f:
        json.dump(user_to_id, f, indent=2)

    with open(output_dir / "eval_negatives.json", "w", encoding="utf-8") as f:
        json.dump(eval_negatives, f)

    logger.info("Exported item/user mappings and eval_negatives.json successfully.")


def main():
    logger.info("Initiating Data Partitioning and Splitting Pipeline...")
    raw_df = pd.read_csv(CLEAN_DATA_PATH)
    k_filtered_df = filter_k_core(raw_df, k_user=3, k_item=3)

    train_df, val_df, test_df = perform_chronological_split(k_filtered_df)

    all_users = sorted(k_filtered_df["user_id"].unique().tolist())
    all_items = sorted(k_filtered_df["parent_asin"].unique().tolist())

    # Build comprehensive user interaction map across all phases
    user_interaction_map = k_filtered_df.groupby("user_id")["parent_asin"].apply(set).to_dict()

    eval_negatives = generate_evaluation_negatives(
        all_users=all_users,
        all_items=all_items,
        user_interaction_map=user_interaction_map,
        num_negatives=NUM_EVAL_NEGATIVES,
        seed=RANDOM_SEED,
    )

    iid_assignments = partition_iid(all_users, num_clients=NUM_CLIENTS, seed=RANDOM_SEED)
    non_iid_assignments = partition_non_iid(train_df, all_users, num_clients=NUM_CLIENTS, alpha=DIRICHLET_ALPHA, seed=RANDOM_SEED)

    export_splits_and_metadata(
        train_df=train_df,
        val_df=val_df,
        test_df=test_df,
        iid_assignments=iid_assignments,
        non_iid_assignments=non_iid_assignments,
        eval_negatives=eval_negatives,
        output_dir=PARTITIONS_DIR,
    )
    logger.info("Partitioning Pipeline successfully finished.")


if __name__ == "__main__":
    main()
