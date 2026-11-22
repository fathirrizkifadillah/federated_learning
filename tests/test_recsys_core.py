"""
Test Suite: tests/test_recsys_core.py
Description: Production-grade unit tests for recsys_core using pytest.
Author: Antigravity Agent
Principles: Follows 'pytest-skill' and 'verification-before-completion'.
"""

import math
import sys
from pathlib import Path

import numpy as np
import pytest
import torch

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from recsys_core import (
    compute_bpr_loss,
    compute_fedprox_penalty,
    masked_fedavg_aggregate,
    compute_ndcg_at_k,
    compute_recall_at_k,
    compute_hit_at_k,
    compute_mrr,
    compute_ranking_metrics_for_user,
    aggregate_ranking_metrics,
    compute_gini_coefficient,
    calculate_wire_payload,
    simulate_federation_economics,
)


@pytest.fixture
def sample_tensors():
    pos_scores = torch.tensor([2.5, 1.8, 3.0])
    neg_scores = torch.tensor([0.5, 2.0, 1.0])
    return pos_scores, neg_scores


@pytest.fixture
def sample_embeddings():
    user_emb = torch.randn(3, 32)
    pos_emb = torch.randn(3, 32)
    neg_emb = torch.randn(3, 32)
    return user_emb, pos_emb, neg_emb


# 1. BPR Loss Tests
def test_bpr_loss_behavior(sample_tensors, sample_embeddings):
    pos_scores, neg_scores = sample_tensors
    user_emb, pos_emb, neg_emb = sample_embeddings

    # Loss without reg
    loss_no_reg = compute_bpr_loss(pos_scores, neg_scores)
    assert loss_no_reg.item() > 0.0

    # Loss with positive margin should be lower than inverted margin
    inverted_loss = compute_bpr_loss(neg_scores, pos_scores)
    assert loss_no_reg.item() < inverted_loss.item()

    # Regularization adds positive penalty
    loss_with_reg = compute_bpr_loss(
        pos_scores, neg_scores, user_emb, pos_emb, neg_emb, l2_reg=1e-3
    )
    assert loss_with_reg.item() > loss_no_reg.item()


# 2. FedProx Penalty Tests
def test_fedprox_penalty():
    local_weights = torch.ones(10, 32)
    global_weights = torch.ones(10, 32)

    # Identical weights -> 0 penalty
    assert compute_fedprox_penalty(local_weights, global_weights, mu=0.01).item() == 0.0

    # Zero mu -> 0 penalty
    diff_weights = torch.randn(10, 32)
    assert compute_fedprox_penalty(diff_weights, global_weights, mu=0.0).item() == 0.0

    # Divergent weights -> strictly positive penalty scaling with mu
    pen_1 = compute_fedprox_penalty(diff_weights, global_weights, mu=0.01).item()
    pen_2 = compute_fedprox_penalty(diff_weights, global_weights, mu=0.02).item()
    assert pen_1 > 0.0
    assert pen_2 == pytest.approx(pen_1 * 2.0, rel=1e-4)


# 3. Masked FedAvg Aggregation Tests
def test_masked_fedavg_aggregate():
    # 3 items, 2 dimensions, 2 clients
    client_1_weights = np.array([[1.0, 1.0], [2.0, 2.0], [0.0, 0.0]], dtype=np.float32)
    client_2_weights = np.array([[3.0, 3.0], [0.0, 0.0], [5.0, 5.0]], dtype=np.float32)

    # Item 0 observed by both (10 vs 30 times)
    # Item 1 observed only by client 1 (5 times)
    # Item 2 observed only by client 2 (20 times)
    client_1_counts = np.array([10, 5, 0], dtype=np.float32)
    client_2_counts = np.array([30, 0, 20], dtype=np.float32)

    anchor = np.zeros((3, 2), dtype=np.float32)

    agg = masked_fedavg_aggregate(
        [client_1_weights, client_2_weights],
        [client_1_counts, client_2_counts],
        global_anchor_matrix=anchor,
    )

    # Item 0: (1.0*10 + 3.0*30) / 40 = 100 / 40 = 2.5
    assert agg[0, 0] == pytest.approx(2.5)
    assert agg[0, 1] == pytest.approx(2.5)

    # Item 1: only client 1 -> 2.0
    assert agg[1, 0] == pytest.approx(2.0)

    # Item 2: only client 2 -> 5.0
    assert agg[2, 0] == pytest.approx(5.0)


# 4. Ranking Metrics Tests
@pytest.mark.parametrize(
    "rank,k,expected_hit,expected_ndcg",
    [
        (1, 10, 1.0, 1.0),
        (2, 10, 1.0, 1.0 / math.log2(3)),
        (10, 10, 1.0, 1.0 / math.log2(11)),
        (11, 10, 0.0, 0.0),
        (float("inf"), 10, 0.0, 0.0),
    ],
)
def test_ranking_metrics_cutoffs(rank, k, expected_hit, expected_ndcg):
    assert compute_hit_at_k(rank, k) == expected_hit
    assert compute_recall_at_k(rank, k) == expected_hit
    assert compute_ndcg_at_k(rank, k) == pytest.approx(expected_ndcg, rel=1e-5)


def test_ranking_metrics_for_user():
    ranked = ["item_a", "item_b", "item_c", "item_d"]
    # Positive is item_b -> rank 2
    res = compute_ranking_metrics_for_user(ranked, "item_b", k_list=(1, 5))
    assert res["hit@1"] == 0.0
    assert res["hit@5"] == 1.0
    assert res["mrr"] == 0.5
    assert res["ndcg@5"] == pytest.approx(1.0 / math.log2(3))


def test_aggregate_ranking_metrics():
    u1 = {"ndcg@10": 1.0, "hit@10": 1.0}
    u2 = {"ndcg@10": 0.0, "hit@10": 0.0}
    agg = aggregate_ranking_metrics([u1, u2])
    assert agg["ndcg@10"] == 0.5
    assert agg["hit@10"] == 0.5


# 5. Gini Inequality Tests
def test_gini_coefficient():
    # Completely equal
    assert compute_gini_coefficient([10, 10, 10, 10]) == pytest.approx(0.0)

    # Highly unequal: 0, 0, 0, 100
    gini_unequal = compute_gini_coefficient([0, 0, 0, 100])
    assert gini_unequal == pytest.approx(0.75, rel=1e-2)

    # Scaling invariance: doubling values does not change Gini
    v = [1, 3, 5, 8]
    assert compute_gini_coefficient(v) == pytest.approx(
        compute_gini_coefficient([x * 2 for x in v]), rel=1e-4
    )


# 6. Wire Payload & Resource Modeling Tests
def test_calculate_wire_payload():
    # 1,439 items, 32 dims, float32 (4 bytes)
    payload = calculate_wire_payload(num_items=1439, embedding_dim=32, precision_bytes=4)
    expected_bytes = 1439 * 32 * 4
    assert payload["client_upload_bytes"] == expected_bytes
    assert payload["client_upload_bytes"] == 184192
    assert payload["user_embedding_bytes"] == 0.0  # Zero user leakage guarantee


def test_simulate_federation_economics():
    econ = simulate_federation_economics(
        num_clients=5,
        num_rounds=10,
        num_items=1439,
        embedding_dim=32,
    )
    assert econ["total_data_transferred_mb"] > 0
    assert econ["server_compute_hours"] > 0
    assert econ["total_projected_cost_usd"] > 0
    assert econ["total_energy_kwh"] > 0
