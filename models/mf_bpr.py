"""
Module: models.mf_bpr
Description: Matrix Factorization optimized with Bayesian Personalized Ranking (BPR) loss.
Architectural Design:
  - User embeddings (p_u) and Item embeddings (q_i) in R^d.
  - Pairwise BPR objective: min -sum ln sigma(p_u^T q_i - p_u^T q_j) + lambda ||theta||^2.
  - Decoupled representation: Item parameters can be federated while user parameters remain local.
Principles: Follows 'clean-code' and 'recsys-pipeline-architect'.
"""

from typing import Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


class MatrixFactorizationBPR(nn.Module):
    """Matrix Factorization model trained with Bayesian Personalized Ranking (BPR) loss."""

    def __init__(self, num_users: int, num_items: int, embedding_dim: int = 32, l2_reg: float = 1e-4):
        super().__init__()
        self.num_users = num_users
        self.num_items = num_items
        self.embedding_dim = embedding_dim
        self.l2_reg = l2_reg

        # User and Item Latent Embeddings
        self.user_embeddings = nn.Embedding(num_users, embedding_dim)
        self.item_embeddings = nn.Embedding(num_items, embedding_dim)

        self._init_weights()

    def _init_weights(self) -> None:
        """Initializes embeddings with a truncated normal distribution for stable training."""
        nn.init.normal_(self.user_embeddings.weight, std=0.01)
        nn.init.normal_(self.item_embeddings.weight, std=0.01)

    def forward(
        self, user_indices: torch.Tensor, pos_item_indices: torch.Tensor, neg_item_indices: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass computing predicted preference scores for positive and negative items.

        Returns:
            Tuple of (pos_scores, neg_scores)
        """
        u_emb = self.user_embeddings(user_indices)       # (B, d)
        pos_emb = self.item_embeddings(pos_item_indices)  # (B, d)
        neg_emb = self.item_embeddings(neg_item_indices)  # (B, d)

        # Dot product prediction
        pos_scores = (u_emb * pos_emb).sum(dim=-1)       # (B,)
        neg_scores = (u_emb * neg_emb).sum(dim=-1)       # (B,)

        return pos_scores, neg_scores

    def compute_bpr_loss(
        self, user_indices: torch.Tensor, pos_item_indices: torch.Tensor, neg_item_indices: torch.Tensor
    ) -> torch.Tensor:
        """Computes Bayesian Personalized Ranking loss with L2 regularization."""
        pos_scores, neg_scores = self.forward(user_indices, pos_item_indices, neg_item_indices)
        diff = pos_scores - neg_scores

        # BPR Loss: -ln(sigma(x)) = softplus(-x)
        ranking_loss = F.softplus(-diff).mean()

        # L2 Regularization
        u_emb = self.user_embeddings(user_indices)
        pos_emb = self.item_embeddings(pos_item_indices)
        neg_emb = self.item_embeddings(neg_item_indices)
        reg_loss = self.l2_reg * (
            u_emb.norm(p=2).pow(2) + pos_emb.norm(p=2).pow(2) + neg_emb.norm(p=2).pow(2)
        ) / user_indices.size(0)

        return ranking_loss + reg_loss

    def predict_user_item_scores(self, user_idx: int, item_indices: torch.Tensor) -> torch.Tensor:
        """Vectorized prediction of preference scores for a given user against a tensor of item IDs."""
        with torch.no_grad():
            u_tensor = torch.tensor([user_idx], dtype=torch.long, device=self.user_embeddings.weight.device)
            u_emb = self.user_embeddings(u_tensor)  # (1, d)
            items_emb = self.item_embeddings(item_indices)  # (N, d)
            scores = (u_emb * items_emb).sum(dim=-1)  # (N,)
        return scores

    # --- Federated Learning Decoupling Primitives ---

    def get_item_embeddings(self) -> torch.Tensor:
        """Extracts item embedding weights for global federated aggregation."""
        return self.item_embeddings.weight.data.clone()

    def set_item_embeddings(self, weights: torch.Tensor) -> None:
        """Loads globally aggregated item embedding weights into the local model."""
        self.item_embeddings.weight.data.copy_(weights)

    def get_user_embeddings(self) -> torch.Tensor:
        """Extracts local private user embeddings (retained on client)."""
        return self.user_embeddings.weight.data.clone()
