"""
Unit Tests for Recommendation Models (BPR-MF and ContentAwareNeuralRecommender)
"""

import pytest
import torch
from ml.src.models.bpr_mf import BPRMatrixFactorization
from ml.src.models.content_aware import ContentAwareNeuralRecommender

def test_bpr_mf_forward_and_loss():
    num_users = 10
    num_items = 20
    model = BPRMatrixFactorization(num_users=num_users, num_items=num_items, embedding_dim=16)

    u = torch.tensor([0, 1, 2], dtype=torch.long)
    pos = torch.tensor([5, 6, 7], dtype=torch.long)
    neg = torch.tensor([10, 11, 12], dtype=torch.long)

    pos_s, neg_s, u_e, p_e, n_e = model(u, pos, neg)
    assert pos_s.shape == (3,)
    assert neg_s.shape == (3,)

    loss = model.compute_bpr_loss(pos_s, neg_s, u_e, p_e, n_e)
    assert loss.item() > 0.0

def test_content_aware_forward_and_prediction():
    num_users = 10
    num_items = 25
    fake_pretrained = torch.randn(num_items, 384)

    model = ContentAwareNeuralRecommender(
        num_users=num_users,
        num_items=num_items,
        pretrained_embeddings=fake_pretrained,
        latent_dim=32,
        mlp_hidden_dim=32
    )

    u = torch.tensor([0, 1], dtype=torch.long)
    pos = torch.tensor([3, 4], dtype=torch.long)
    neg = torch.tensor([8, 9], dtype=torch.long)

    pos_s, neg_s, u_e, p_e, n_e = model(u, pos, neg)
    assert pos_s.shape == (2,)
    assert neg_s.shape == (2,)

    loss = model.compute_bpr_loss(pos_s, neg_s, u_e, p_e, n_e)
    assert loss.item() > 0.0

    # Predict across all items
    scores = model.predict_all_items(u_idx=0)
    assert scores.shape == (num_items,)
