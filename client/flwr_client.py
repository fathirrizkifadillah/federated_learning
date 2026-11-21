"""
Module: client.flwr_client
Description: Implements the private on-device Federated Recommendation Client using Flower.
Privacy Architecture:
  - User embeddings remain strictly on-device (private to client cid).
  - Only shared item embeddings are synchronized with the server.
  - Supports FedProx proximal regularization and personalized local adaptation.
Principles: Follows 'clean-code' and 'recsys-pipeline-architect'.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import flwr as fl
import numpy as np
import pandas as pd
import torch
from flwr.app import Context
from flwr.client import Client, NumPyClient
from torch.utils.data import DataLoader

from evaluation.metrics import aggregate_ranking_metrics, compute_ranking_metrics_for_user
from experiments.train_centralized import BPRTrainDataset
from models.mf_bpr import MatrixFactorizationBPR

logger = logging.getLogger(__name__)

# In-memory registry to persist private user embeddings across federated rounds
LOCAL_USER_EMBEDDING_REGISTRY: Dict[str, torch.Tensor] = {}


def clear_local_user_registry() -> None:
    """Clears the registry when starting a fresh multi-round experiment."""
    LOCAL_USER_EMBEDDING_REGISTRY.clear()


class FlowerRecClient(NumPyClient):
    """Federated Recommendation Client for Matrix Factorization with BPR and FedProx."""

    def __init__(
        self,
        cid: int,
        partition_type: str = "iid",
        embedding_dim: int = 32,
        lr: float = 0.005,
        l2_reg: float = 1e-4,
        local_epochs: int = 2,
        batch_size: int = 128,
        device: Optional[torch.device] = None,
    ):
        self.cid = cid
        self.client_key = f"{partition_type}_client_{cid}"
        self.partition_type = partition_type
        self.embedding_dim = embedding_dim
        self.lr = lr
        self.l2_reg = l2_reg
        self.local_epochs = local_epochs
        self.batch_size = batch_size
        self.device = device or torch.device("cpu")

        # Load partition datasets and mappings
        self._load_local_data()

        # Initialize local PyTorch model
        self.model = MatrixFactorizationBPR(
            num_users=len(self.local_user_to_id),
            num_items=len(self.item_to_id),
            embedding_dim=self.embedding_dim,
            l2_reg=self.l2_reg,
        ).to(self.device)

        # Restore local private user embeddings if previous rounds exist
        if self.client_key in LOCAL_USER_EMBEDDING_REGISTRY:
            self.model.user_embeddings.weight.data.copy_(
                LOCAL_USER_EMBEDDING_REGISTRY[self.client_key].to(self.device)
            )

    def _load_local_data(self) -> None:
        """Loads client local data partition and pre-computes indexing structures."""
        data_dir = PROJECT_ROOT / "data" / "partitions"
        client_dir = data_dir / self.partition_type

        self.train_df = pd.read_csv(client_dir / f"client_{self.cid}_train.csv")
        self.val_df = pd.read_csv(client_dir / f"client_{self.cid}_val.csv")
        self.test_df = pd.read_csv(client_dir / f"client_{self.cid}_test.csv")

        with open(data_dir / "item_mapping.json", "r", encoding="utf-8") as f:
            self.item_to_id: Dict[str, int] = json.load(f)
        with open(data_dir / "eval_negatives.json", "r", encoding="utf-8") as f:
            self.eval_negatives: Dict[str, Dict[str, List[str]]] = json.load(f)

        # Map local users to contiguous indices [0 .. num_local_users - 1]
        unique_local_users = sorted(self.train_df["user_id"].unique())
        self.local_user_to_id = {u: idx for idx, u in enumerate(unique_local_users)}

        # Build observed interaction map to prevent false negative sampling
        all_local = pd.concat([self.train_df, self.val_df, self.test_df], ignore_index=True)
        self.user_observed_map: Dict[int, Set[int]] = {}
        for _, row in all_local.iterrows():
            u = self.local_user_to_id.get(row["user_id"])
            it = self.item_to_id.get(row["parent_asin"])
            if u is not None and it is not None:
                self.user_observed_map.setdefault(u, set()).add(it)

        # Build local training pairs
        self.train_pairs = [
            (self.local_user_to_id[row["user_id"]], self.item_to_id[row["parent_asin"]])
            for _, row in self.train_df.iterrows()
            if row["user_id"] in self.local_user_to_id and row["parent_asin"] in self.item_to_id
        ]

    def get_parameters(self, config: Dict[str, fl.common.Scalar]) -> List[np.ndarray]:
        """Returns ONLY item embeddings (user embeddings strictly stay on device)."""
        return [self.model.get_item_embeddings().cpu().numpy()]

    def fit(
        self, parameters: List[np.ndarray], config: Dict[str, fl.common.Scalar]
    ) -> Tuple[List[np.ndarray], int, Dict[str, fl.common.Scalar]]:
        """Trains local model using received global item embeddings with optional FedProx penalty."""
        # 1. Update local model with global item embeddings
        global_item_weights = torch.from_numpy(parameters[0]).to(self.device)
        self.model.set_item_embeddings(global_item_weights)

        # Extract config parameters
        epochs = int(config.get("local_epochs", self.local_epochs))
        lr = float(config.get("lr", self.lr))
        proximal_mu = float(config.get("proximal_mu", 0.0))
        seed = int(config.get("seed", 42)) + self.cid

        # 2. Setup training dataset
        dataset = BPRTrainDataset(
            interactions=self.train_pairs,
            num_items=len(self.item_to_id),
            user_observed_map=self.user_observed_map,
            seed=seed,
        )
        dataloader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)

        self.model.train()
        total_loss = 0.0
        active_items = set()

        # Track which items are trained
        for u, pos_i in self.train_pairs:
            active_items.add(pos_i)

        for _ in range(epochs):
            for u_batch, pos_batch, neg_batch in dataloader:
                u_batch = u_batch.to(self.device)
                pos_batch = pos_batch.to(self.device)
                neg_batch = neg_batch.to(self.device)

                for item_id in neg_batch.tolist():
                    active_items.add(item_id)

                optimizer.zero_grad()
                bpr_loss = self.model.compute_bpr_loss(u_batch, pos_batch, neg_batch)

                # FedProx Proximal Regularization Term: (mu / 2) * || Q - Q_global ||^2
                if proximal_mu > 0.0:
                    proximal_loss = (proximal_mu / 2.0) * torch.norm(
                        self.model.item_embeddings.weight - global_item_weights, p=2
                    ).pow(2)
                    loss = bpr_loss + proximal_loss
                else:
                    loss = bpr_loss

                loss.backward()
                optimizer.step()
                total_loss += loss.item()

        # 3. Persist local user embeddings in memory for future rounds
        LOCAL_USER_EMBEDDING_REGISTRY[self.client_key] = self.model.get_user_embeddings().cpu().clone()

        # 4. Return updated item embeddings and active items mask
        updated_item_weights = self.model.get_item_embeddings().cpu().numpy()
        metrics = {
            "loss": float(total_loss / max(1, len(dataloader) * epochs)),
            "active_items": json.dumps(sorted(list(active_items))),
            "active_item_count": len(active_items),
        }

        return [updated_item_weights], len(self.train_pairs), metrics

    def evaluate(
        self, parameters: List[np.ndarray], config: Dict[str, fl.common.Scalar]
    ) -> Tuple[float, int, Dict[str, fl.common.Scalar]]:
        """Evaluates ranking performance on local test data."""
        # Update local model with current global item embeddings
        global_item_weights = torch.from_numpy(parameters[0]).to(self.device)
        self.model.set_item_embeddings(global_item_weights)

        self.model.eval()
        user_metrics = []
        total_loss = 0.0

        for _, row in self.test_df.iterrows():
            user_str = row["user_id"]
            pos_item_str = row["parent_asin"]

            if user_str not in self.local_user_to_id or pos_item_str not in self.item_to_id:
                continue

            u_idx = self.local_user_to_id[user_str]
            pos_idx = self.item_to_id[pos_item_str]

            neg_items_str = self.eval_negatives["test"].get(user_str, [])
            neg_indices = [self.item_to_id[item] for item in neg_items_str if item in self.item_to_id]

            candidate_indices = [pos_idx] + neg_indices
            candidate_tensor = torch.tensor(candidate_indices, dtype=torch.long, device=self.device)

            scores = self.model.predict_user_item_scores(u_idx, candidate_tensor).cpu().numpy()
            ranked_indices = [candidate_indices[i] for i in np.argsort(-scores)]

            u_metric = compute_ranking_metrics_for_user(
                ranked_item_ids=ranked_indices,
                ground_truth_item_id=pos_idx,
                k_list=(5, 10),
            )
            user_metrics.append(u_metric)

        aggregated = aggregate_ranking_metrics(user_metrics)
        return total_loss, len(self.test_df), aggregated

    def personalize(self, adaptation_epochs: int = 2, adaptation_lr: float = 0.002) -> Dict[str, float]:
        """Performs client-specific local fine-tuning to personalize recommendations."""
        # Freeze item embeddings and fine-tune user embeddings on local train data
        self.model.item_embeddings.weight.requires_grad = False
        self.model.user_embeddings.weight.requires_grad = True

        dataset = BPRTrainDataset(
            interactions=self.train_pairs,
            num_items=len(self.item_to_id),
            user_observed_map=self.user_observed_map,
            seed=42 + self.cid,
        )
        dataloader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        optimizer = torch.optim.Adam([self.model.user_embeddings.weight], lr=adaptation_lr)

        self.model.train()
        for _ in range(adaptation_epochs):
            for u_batch, pos_batch, neg_batch in dataloader:
                u_batch = u_batch.to(self.device)
                pos_batch = pos_batch.to(self.device)
                neg_batch = neg_batch.to(self.device)

                optimizer.zero_grad()
                loss = self.model.compute_bpr_loss(u_batch, pos_batch, neg_batch)
                loss.backward()
                optimizer.step()

        # Update local user embedding registry
        LOCAL_USER_EMBEDDING_REGISTRY[self.client_key] = self.model.get_user_embeddings().cpu().clone()

        # Unfreeze
        self.model.item_embeddings.weight.requires_grad = True

        # Re-evaluate
        dummy_params = [self.model.get_item_embeddings().cpu().numpy()]
        _, _, personalized_metrics = self.evaluate(dummy_params, {})
        return personalized_metrics


def build_client_fn(
    partition_type: str = "iid",
    embedding_dim: int = 32,
    lr: float = 0.005,
    l2_reg: float = 1e-4,
    local_epochs: int = 2,
    batch_size: int = 128,
):
    """Factory creating Flower client instances for simulation."""

    def client_fn(context: Context) -> Client:
        cid = int(context.node_config["partition-id"])
        client = FlowerRecClient(
            cid=cid,
            partition_type=partition_type,
            embedding_dim=embedding_dim,
            lr=lr,
            l2_reg=l2_reg,
            local_epochs=local_epochs,
            batch_size=batch_size,
        )
        return client.to_client()

    return client_fn
