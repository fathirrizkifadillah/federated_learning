"""
FedSocial V2 — Proposed Content-Aware Neural Recommender
Combines Frozen Sentence-Transformers (384-d) + Trainable Item Projection + Local User Embeddings + Neural Interaction Head.
Designed for Decoupled Federated Learning (0-Byte User Profile Leakage).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class ContentAwareNeuralRecommender(nn.Module):
    def __init__(
        self,
        num_users: int,
        num_items: int,
        pretrained_embeddings: torch.Tensor, # [num_items, 384]
        latent_dim: int = 64,
        mlp_hidden_dim: int = 64,
        dropout: float = 0.1,
        l2_reg: float = 1e-4
    ):
        super().__init__()
        self.num_users = num_users
        self.num_items = num_items
        self.latent_dim = latent_dim
        self.l2_reg = l2_reg

        # Register frozen sentence transformer item embeddings buffer
        self.register_buffer("pretrained_item_embeddings", pretrained_embeddings)

        # Trainable Item Projection Layer: 384 -> latent_dim (64)
        # In FL, these weights are shared and aggregated globally
        self.item_projection = nn.Linear(384, latent_dim)

        # User Embeddings: num_users -> latent_dim (64)
        # In FL, this table remains strictly on edge devices (never sent to Flower server)
        self.user_embeddings = nn.Embedding(num_users, latent_dim)

        # Shared Neural Interaction Head (Aggregated globally in FL)
        # Combines GMF (latent_dim) + Deep MLP (latent_dim)
        self.mlp = nn.Sequential(
            nn.Linear(latent_dim * 2, mlp_hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(mlp_hidden_dim, latent_dim),
            nn.ReLU()
        )

        # Final prediction score layer
        self.prediction_head = nn.Linear(latent_dim * 2, 1, bias=False)

        self._init_weights()

    def _init_weights(self):
        nn.init.xavier_uniform_(self.item_projection.weight)
        nn.init.zeros_(self.item_projection.bias)
        nn.init.normal_(self.user_embeddings.weight, std=0.01)
        for layer in self.mlp:
            if isinstance(layer, nn.Linear):
                nn.init.xavier_uniform_(layer.weight)
                nn.init.zeros_(layer.bias)
        nn.init.xavier_uniform_(self.prediction_head.weight)

    def get_item_representation(self, item_indices: torch.Tensor) -> torch.Tensor:
        """Projects frozen 384-d semantic embedding to latent space."""
        raw_embs = self.pretrained_item_embeddings[item_indices] # [B, 384]
        return F.relu(self.item_projection(raw_embs))            # [B, 64]

    def score_pair(self, u_emb: torch.Tensor, i_emb: torch.Tensor) -> torch.Tensor:
        """Computes composite neural interaction score between user and item vectors."""
        # 1. Generalized Matrix Factorization branch
        gmf_out = u_emb * i_emb # [B, 64]

        # 2. Deep MLP branch
        mlp_in = torch.cat([u_emb, i_emb], dim=1) # [B, 128]
        mlp_out = self.mlp(mlp_in)                # [B, 64]

        # 3. Composite Head
        combined = torch.cat([gmf_out, mlp_out], dim=1) # [B, 128]
        return self.prediction_head(combined).squeeze(1) # [B]

    def forward(self, u_idx: torch.Tensor, pos_i_idx: torch.Tensor, neg_j_idx: torch.Tensor):
        u_emb = self.user_embeddings(u_idx)
        pos_emb = self.get_item_representation(pos_i_idx)
        neg_emb = self.get_item_representation(neg_j_idx)

        pos_score = self.score_pair(u_emb, pos_emb)
        neg_score = self.score_pair(u_emb, neg_emb)

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
        reg_loss = (torch.norm(u_emb, 2).pow(2) + torch.norm(pos_emb, 2).pow(2) + torch.norm(neg_emb, 2).pow(2)) / u_emb.size(0)
        return loss + self.l2_reg * reg_loss

    def predict_all_items(self, u_idx: int) -> torch.Tensor:
        """Generates ranked predictions across all items for user u_idx."""
        self.eval()
        with torch.no_grad():
            u_t = torch.tensor([u_idx], dtype=torch.long, device=self.user_embeddings.weight.device)
            u_emb = self.user_embeddings(u_t).repeat(self.num_items, 1) # [num_items, 64]

            all_indices = torch.arange(self.num_items, dtype=torch.long, device=u_emb.device)
            all_i_emb = self.get_item_representation(all_indices) # [num_items, 64]

            scores = self.score_pair(u_emb, all_i_emb)
            return scores
