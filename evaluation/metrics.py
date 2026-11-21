"""
Module: evaluation.metrics
Description: Implements standard information retrieval and recommendation ranking metrics
             (Hit Rate@K, Recall@K, NDCG@K, MRR) for top-K recommendation evaluation.
Principles: Follows 'clean-code' and 'recsys-pipeline-architect' ranking specifications.
"""

from typing import Dict, List, Sequence
import numpy as np


def compute_ranking_metrics_for_user(
    ranked_item_ids: Sequence[str],
    ground_truth_item_id: str,
    k_list: Sequence[int] = (5, 10),
) -> Dict[str, float]:
    """Computes HitRate@K, Recall@K, NDCG@K, and MRR for a single user with 1 ground-truth positive.

    Args:
        ranked_item_ids: Ordered list of item IDs (from highest predicted score to lowest).
        ground_truth_item_id: The actual ground-truth positive item ID.
        k_list: Cutoff positions for top-K metrics.

    Returns:
        Dictionary of computed metric values.
    """
    metrics: Dict[str, float] = {}

    try:
        rank = ranked_item_ids.index(ground_truth_item_id) + 1  # 1-indexed
    except ValueError:
        rank = float("inf")

    # MRR (Mean Reciprocal Rank)
    metrics["mrr"] = 1.0 / rank if rank != float("inf") else 0.0

    for k in k_list:
        if rank <= k:
            metrics[f"hit@{k}"] = 1.0
            metrics[f"recall@{k}"] = 1.0
            metrics[f"ndcg@{k}"] = 1.0 / np.log2(rank + 1)
        else:
            metrics[f"hit@{k}"] = 0.0
            metrics[f"recall@{k}"] = 0.0
            metrics[f"ndcg@{k}"] = 0.0

    return metrics


def aggregate_ranking_metrics(user_metrics_list: List[Dict[str, float]]) -> Dict[str, float]:
    """Averages individual user ranking metrics across all evaluated users."""
    if not user_metrics_list:
        return {}

    metric_keys = user_metrics_list[0].keys()
    aggregated = {k: float(np.mean([m[k] for m in user_metrics_list])) for k in metric_keys}
    return aggregated
