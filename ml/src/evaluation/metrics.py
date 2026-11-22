"""
FedSocial V2 — Recommender Evaluation Metrics & Fairness Auditing
Implements Hit Rate@K, NDCG@K, MRR, Centralized Parity, and Gini Inequality Index.
"""

import math
from typing import List, Union
import numpy as np

def hit_rate_at_k(actual_item: Union[str, int], ranked_items: List[Union[str, int]], k: int = 10) -> float:
    """Hit Rate@K: Returns 1.0 if the ground-truth target item is in top-K recommendations, 0.0 otherwise."""
    top_k = ranked_items[:k]
    return 1.0 if actual_item in top_k else 0.0

def ndcg_at_k(actual_item: Union[str, int], ranked_items: List[Union[str, int]], k: int = 10) -> float:
    """
    Normalized Discounted Cumulative Gain@K (binary ground truth):
    DCG@K = 1 / log2(rank + 1) if target in top-K else 0.
    Since IDCG = 1.0 for single target, NDCG@K = DCG@K.
    """
    top_k = ranked_items[:k]
    if actual_item in top_k:
        rank = top_k.index(actual_item) + 1
        return 1.0 / math.log2(rank + 1)
    return 0.0

def mrr(actual_item: Union[str, int], ranked_items: List[Union[str, int]]) -> float:
    """Mean Reciprocal Rank: Returns 1 / rank if target is found, 0.0 otherwise."""
    if actual_item in ranked_items:
        rank = ranked_items.index(actual_item) + 1
        return 1.0 / rank
    return 0.0

def gini_coefficient(values: List[float]) -> float:
    """
    Computes Gini Inequality Index across client performance scores.
    Gini = 0.0 represents perfect equality across clients.
    Gini = 1.0 represents extreme performance disparity.
    """
    array = np.array(values, dtype=np.float64)
    if np.amin(array) < 0:
        array -= np.amin(array)
    array += 1e-12
    array = np.sort(array)
    n = len(array)
    index = np.arange(1, n + 1)
    return float((np.sum((2 * index - n - 1) * array)) / (n * np.sum(array)))

def compute_corpus_coverage(all_recommended_items: List[List[Union[str, int]]], total_catalog_size: int, k: int = 10) -> float:
    """Calculates catalog coverage: percentage of total items recommended at least once in top-K."""
    unique_recs = set()
    for rec_list in all_recommended_items:
        unique_recs.update(rec_list[:k])
    return float(len(unique_recs) / total_catalog_size)
