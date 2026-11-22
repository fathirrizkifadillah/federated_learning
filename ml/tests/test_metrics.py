"""
Unit Tests for Recommender Metrics & Fairness Auditing
"""

import pytest
import numpy as np
from ml.src.evaluation.metrics import hit_rate_at_k, ndcg_at_k, mrr, gini_coefficient

def test_hit_rate_at_k():
    ranked = ["item_a", "item_b", "item_c", "item_d", "item_e"]
    assert hit_rate_at_k("item_a", ranked, k=1) == 1.0
    assert hit_rate_at_k("item_c", ranked, k=3) == 1.0
    assert hit_rate_at_k("item_d", ranked, k=3) == 0.0
    assert hit_rate_at_k("item_z", ranked, k=5) == 0.0

def test_ndcg_at_k():
    ranked = ["item_a", "item_b", "item_c"]
    # Rank 1: 1 / log2(2) = 1.0
    assert ndcg_at_k("item_a", ranked, k=3) == pytest.approx(1.0, 1e-4)
    # Rank 2: 1 / log2(3) = 0.6309
    assert ndcg_at_k("item_b", ranked, k=3) == pytest.approx(0.6309, 1e-4)
    # Target not in top-K: 0.0
    assert ndcg_at_k("item_z", ranked, k=3) == 0.0

def test_mrr():
    ranked = ["item_a", "item_b", "item_c"]
    assert mrr("item_a", ranked) == 1.0
    assert mrr("item_b", ranked) == 0.5
    assert mrr("item_c", ranked) == pytest.approx(1.0 / 3.0, 1e-4)
    assert mrr("item_z", ranked) == 0.0

def test_gini_coefficient():
    # Perfect equality
    equal_scores = [0.1, 0.1, 0.1, 0.1]
    assert gini_coefficient(equal_scores) == pytest.approx(0.0, 1e-3)

    # Severe inequality
    skewed_scores = [0.0, 0.0, 0.0, 1.0]
    assert gini_coefficient(skewed_scores) > 0.5
