"""
Module: models.baselines
Description: Implements non-personalized and naive recommendation baselines:
             1. Random Guessing (lower-bound sanity check)
             2. Global Popularity / Most Popular Ranker (frequency-based heuristic)
Principles: Follows 'baseline-ablation-lab' requirements for honest simple baselines.
"""

from collections import Counter
from typing import Dict, List, Sequence
import numpy as np
import pandas as pd


class RandomRecommender:
    """Ranks candidate items uniformly at random (naive control baseline)."""

    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def rank(self, user_id: str, candidate_items: Sequence[str]) -> List[str]:
        items_copy = list(candidate_items)
        self.rng.shuffle(items_copy)
        return items_copy


class PopularityRecommender:
    """Ranks candidate items based on their global interaction frequency in the training set."""

    def __init__(self):
        self.item_counts: Counter = Counter()

    def fit(self, train_df: pd.DataFrame) -> None:
        """Counts frequencies of each item in the training set."""
        self.item_counts = Counter(train_df["parent_asin"])

    def rank(self, user_id: str, candidate_items: Sequence[str]) -> List[str]:
        """Ranks candidates in descending order of frequency."""
        # Secondary sort by item ID string for deterministic tie-breaking
        return sorted(candidate_items, key=lambda item: (self.item_counts.get(item, 0), item), reverse=True)
