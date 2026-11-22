"""
FedSocial V2 — Popularity Baseline Recommender
Ranks items by aggregate dwell time and engagement volume.
"""

from typing import List
import numpy as np
import pandas as pd

class PopularityRecommender:
    def __init__(self):
        self.item_scores = {}
        self.sorted_items = []

    def fit(self, train_df: pd.DataFrame, num_items: int):
        # Aggregate engagement signal: dwell_time_sec * (1 + 0.5 * is_like + 0.8 * is_bookmark)
        train_df = train_df.copy()
        train_df["score"] = train_df["dwell_time_sec"] * (
            1.0 + 0.5 * train_df["is_like"] + 0.8 * train_df["is_bookmark"]
        )
        agg = train_df.groupby("article_id")["score"].sum().to_dict()

        self.item_scores = agg
        self.sorted_items = sorted(agg.keys(), key=lambda k: agg[k], reverse=True)

    def recommend(self, user_id: str, top_k: int = 10, exclude_items: set = None) -> List[str]:
        exclude = exclude_items or set()
        recs = [item for item in self.sorted_items if item not in exclude]
        return recs[:top_k]
