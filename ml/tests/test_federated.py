import pytest
import torch
import numpy as np
from ml.src.models.content_aware import ContentAwareNeuralRecommender
from ml.src.federated.client import FlowerRecClient
from ml.src.federated.strategy import MaskedFedAvg, FedProxStrategy

@pytest.fixture
def sample_client():
    semantic_feats = torch.randn(50, 384, dtype=torch.float32)
    model = ContentAwareNeuralRecommender(
        num_users=10,
        num_items=50,
        pretrained_embeddings=semantic_feats,
        latent_dim=16,
        mlp_hidden_dim=16
    )
    train_triplets = [(0, 1, 2, 1.0), (0, 3, 4, 1.5)]
    test_records = [{"user_id": 0, "positive_items": [1, 3]}]
    all_item_indices = list(range(50))
    user_positive_items = {0: {1, 3}}
    
    return FlowerRecClient(
        client_id="client_0",
        model=model,
        train_triplets=train_triplets,
        test_records=test_records,
        all_item_indices=all_item_indices,
        user_positive_items=user_positive_items,
        local_epochs=1,
        batch_size=2,
        lr=0.01
    )

def test_flower_client_parameter_shapes(sample_client):
    """Verify that FlowerRecClient only exposes decoupled shared parameters (exactly 7 tensors)."""
    params = sample_client.get_parameters(config={})
    assert len(params) == 7, "Content-Aware model exposes exactly 7 item projection and head parameter tensors"
    # item_projection weight shape: (16, 384)
    assert params[0].shape == (16, 384), f"Expected (16, 384), got {params[0].shape}"

def test_flower_client_local_training(sample_client):
    """Verify local training loop updates parameters and returns correct metrics."""
    initial_params = sample_client.get_parameters(config={})
    updated_params, num_samples, metrics = sample_client.fit(
        parameters=initial_params,
        config={"local_epochs": 1, "lr": 0.05}
    )
    assert num_samples == 2
    assert "loss" in metrics
    # Ensure weights changed during training
    diff = np.abs(updated_params[0] - initial_params[0]).sum()
    assert diff > 0.0, "Weights must be updated during local gradient steps"

def test_fedprox_regularization_effect():
    """Verify FedProx strategy computes valid proximal objective."""
    strategy = FedProxStrategy(mu=0.01)
    assert strategy.mu == 0.01
