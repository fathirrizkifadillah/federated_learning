"""
FedSocial V2 — Bayesian Personalized Ranking Matrix Factorization (BPR-MF)
PyTorch implementation of collaborative filtering with pairwise ranking loss.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class BPRMatrixFactorization(nn.Module):
    def __init__(self, num_users: int, num_items: int, embedding_dim: int = 32, l2_reg: float = 1e-4):
        super().__init__()
        self.num_users = num_users
        self.num_items = num_items
        self.embedding_dim = embedding_dim
        self.l2_reg = l2_reg

        self.user_embeddings = nn.Embedding(num_users, embedding_dim)
        self.item_embeddings = nn.Embedding(num_items, embedding_dim)

        # Truncated normal initialization
        nn.init.normal_(self.user_embeddings.weight, std=0.01)
        nn.init.normal_(self.item_embeddings.weight, std=0.01)

    def forward(self, u_idx: torch.Tensor, pos_i_idx: torch.Tensor, neg_j_idx: torch.Tensor):
        u_emb = self.user_embeddings(u_idx)       # [B, D]
        pos_emb = self.item_embeddings(pos_i_idx) # [B, D]
        neg_emb = self.item_embeddings(neg_j_idx) # [B, D]

        pos_score = torch.sum(u_emb * pos_emb, dim=1) # [B]
        neg_score = torch.sum(u_emb * neg_emb, dim=1) # [B]

        return pos_score, neg_score, u_emb, pos_emb, neg_emb

    def compute_bpr_loss(
        self,
        pos_score: torch.Tensor,
        neg_score: torch.Tensor,
        u_emb: torch.Tensor,
        pos_emb: torch.Tensor,
        neg_emb: torch.Tensor,
        weights: torch.Tensor = None
    ) -> torch.Tensor:
        margin = pos_score - neg_score
        bpr_term = -F.logsigmoid(margin)

        if weights is not None:
            bpr_term = bpr_term * weights

        loss = torch.mean(bpr_term)

        # L2 Regularization penalty
        reg_loss = (
            torch.norm(u_emb, 2).pow(2) +
            torch.norm(pos_emb, 2).pow(2) +
            torch.norm(neg_emb, 2).pow(2)
        ) / u_emb.size(0)

        return loss + self.l2_reg * reg_loss

    def predict_all_items(self, u_idx: int) -> torch.Tensor:
        """Returns dot product score against all items for a given user."""
        with torch.no_grad():
            u_t = torch.tensor([u_idx], dtype=torch.long, device=self.user_embeddings.weight.device)
            u_emb = self.user_embeddings(u_t) # [1, D]
            all_items = self.item_embeddings.weight # [num_items, D]
            scores = torch.matmul(u_emb, all_items.t()).squeeze(0) # [num_items]
            return scores
