"""
FedSocial V2 — Dataset Preparation & BPR Triplet Generator
Implements Chronological Leave-Last-2-Out Splitting, Negative Sampling, and Index Mappings.
"""

import json
import os
import random
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

class RecSysDataPipeline:
    def __init__(
        self,
        articles_path: str = "ml/data/processed/articles.json",
        interactions_path: str = "ml/data/processed/interactions.csv",
        embeddings_path: str = "ml/data/processed/article_embeddings.npy",
        seed: int = 42
    ):
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)

        # Load articles
        with open(articles_path, "r", encoding="utf-8") as f:
            self.articles = json.load(f)

        # Load interactions
        self.df_interactions = pd.read_csv(interactions_path)
        self.df_interactions["event_timestamp"] = pd.to_datetime(self.df_interactions["event_timestamp"])
        self.df_interactions = self.df_interactions.sort_values(by=["user_id", "event_timestamp"]).reset_index(drop=True)

        # Build index mappings
        self.user_list = sorted(self.df_interactions["user_id"].unique())
        self.user2idx = {u: i for i, u in enumerate(self.user_list)}
        self.idx2user = {i: u for u, i in self.user2idx.items()}

        self.item_list = [a["id"] for a in self.articles]
        self.item2idx = {item_id: i for i, item_id in enumerate(self.item_list)}
        self.idx2item = {i: item_id for item_id, i in self.item2idx.items()}

        self.num_users = len(self.user_list)
        self.num_items = len(self.item_list)

        # Load precomputed sentence embeddings (shape: [num_items, 384])
        if os.path.exists(embeddings_path):
            self.item_embeddings = np.load(embeddings_path).astype(np.float32)
        else:
            self.item_embeddings = np.random.randn(self.num_items, 384).astype(np.float32)

        # Split interactions into Train, Validation, Test using chronological leave-last-2-out
        self._split_chronological()

    def _split_chronological(self):
        train_rows, val_rows, test_rows = [], [], []

        for u_id, group in self.df_interactions.groupby("user_id"):
            sorted_events = group.sort_values("event_timestamp").to_dict("records")
            if len(sorted_events) >= 3:
                test_rows.append(sorted_events[-1])
                val_rows.append(sorted_events[-2])
                train_rows.extend(sorted_events[:-2])
            elif len(sorted_events) == 2:
                test_rows.append(sorted_events[-1])
                train_rows.append(sorted_events[0])
            else:
                train_rows.extend(sorted_events)

        self.train_df = pd.DataFrame(train_rows)
        self.val_df = pd.DataFrame(val_rows)
        self.test_df = pd.DataFrame(test_rows)

        # Precompute positive item sets for negative sampling
        self.user_positive_items: Dict[int, set] = {u_idx: set() for u_idx in range(self.num_users)}
        for _, row in self.df_interactions.iterrows():
            u_idx = self.user2idx[row["user_id"]]
            if row["article_id"] in self.item2idx:
                i_idx = self.item2idx[row["article_id"]]
                self.user_positive_items[u_idx].add(i_idx)

    def get_bpr_triplets(self, split: str = "train", num_negatives: int = 1) -> List[Tuple[int, int, int, float]]:
        """
        Generates (user_idx, pos_item_idx, neg_item_idx, interaction_weight) tuples.
        Interaction weight is derived continuously from dwell time in seconds.
        """
        df = self.train_df if split == "train" else (self.val_df if split == "val" else self.test_df)
        triplets = []

        for _, row in df.iterrows():
            u_idx = self.user2idx[row["user_id"]]
            if row["article_id"] not in self.item2idx:
                continue
            pos_idx = self.item2idx[row["article_id"]]
            
            # Continuous weight: dwell time in sec / 60, boosted by like/bookmark
            weight = min(float(row["dwell_time_sec"]) / 60.0, 3.0) + (1.5 if row["is_like"] else 0.0)

            for _ in range(num_negatives):
                # Negative sampling: uniform draw from items user never interacted with
                neg_idx = random.randint(0, self.num_items - 1)
                while neg_idx in self.user_positive_items[u_idx]:
                    neg_idx = random.randint(0, self.num_items - 1)

                triplets.append((u_idx, pos_idx, neg_idx, weight))

        return triplets

class BPRDataset(Dataset):
    def __init__(self, triplets: List[Tuple[int, int, int, float]]):
        self.triplets = triplets

    def __len__(self):
        return len(self.triplets)

    def __getitem__(self, idx):
        u, pos, neg, w = self.triplets[idx]
        return (
            torch.tensor(u, dtype=torch.long),
            torch.tensor(pos, dtype=torch.long),
            torch.tensor(neg, dtype=torch.long),
            torch.tensor(w, dtype=torch.float32)
        )
