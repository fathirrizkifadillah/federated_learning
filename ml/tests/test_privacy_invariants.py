"""
Unit Tests for Privacy Invariants and Decoupled Federated Aggregation
"""

import pytest
import torch
from ml.src.models.content_aware import ContentAwareNeuralRecommender
from ml.src.federated.client import FlowerRecClient

def test_zero_user_leakage_in_federated_parameters():
    num_users = 100
    num_items = 3000
    fake_pretrained = torch.randn(num_items, 384)

    model = ContentAwareNeuralRecommender(
        num_users=num_users,
        num_items=num_items,
        pretrained_embeddings=fake_pretrained,
        latent_dim=64,
        mlp_hidden_dim=64
    )

    client = FlowerRecClient(
        client_id="test_client_01",
        model=model,
        train_triplets=[],
        test_records=[],
        all_item_indices=list(range(num_items)),
        user_positive_items={}
    )

    transmitted_params = client.get_parameters(config={})

    # Invariant 1: Exactly 7 shared parameter arrays are transmitted
    # (proj_w, proj_b, mlp0_w, mlp0_b, mlp3_w, mlp3_b, head_w)
    assert len(transmitted_params) == 7

    # Invariant 2: None of the transmitted arrays have shape (num_users, latent_dim) = (100, 64)
    for arr in transmitted_params:
        assert arr.shape != (num_users, 64), "User embedding matrix must NEVER be transmitted!"

    # Invariant 3: The user embedding table is in the model but isolated from transmission
    assert model.user_embeddings.weight.shape == (num_users, 64)
    user_weights = model.user_embeddings.weight.detach().cpu().numpy()
    for arr in transmitted_params:
        assert not (arr.shape == user_weights.shape and (arr == user_weights).all())
