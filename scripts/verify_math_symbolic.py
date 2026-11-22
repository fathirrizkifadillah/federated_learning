"""
Script: scripts/verify_math_symbolic.py
Description: Symbolically verifies BPR loss gradients, FedProx proximal penalty derivatives,
             and Gini coefficient equality using SymPy.
Principles: Follows 'sympy' skill and 'verification-before-completion'.
"""

import sys
from pathlib import Path

import sympy as sp
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from recsys_core import compute_gini_coefficient, compute_ndcg_at_k


def verify_symbolic_math():
    print("=" * 70)
    print("SYMBOLIC MATHEMATICAL VERIFICATION (SymPy)")
    print("=" * 70)

    # 1. BPR Pairwise Loss Gradient
    x = sp.Symbol("x", real=True)  # x = x_ui - x_uj
    sigma = 1 / (1 + sp.exp(-x))
    bpr_loss = -sp.log(sigma)

    # Differentiate analytically
    grad_bpr = sp.diff(bpr_loss, x)
    expected_grad = -(1 - sigma)  # or -1 / (1 + exp(x)) = sigma(-x) - 1

    simplified_diff = sp.simplify(grad_bpr - expected_grad)
    print(f"[1] BPR Loss Symbol: L_bpr(x) = {bpr_loss}")
    print(f"    Analytical Gradient dL/dx = {sp.simplify(grad_bpr)}")
    print(f"    Expected Formulation    = {expected_grad}")
    print(f"    Symbolic Equivalence Zero-Diff Check: {simplified_diff == 0}")
    assert simplified_diff == 0, "BPR symbolic gradient mismatch!"

    # 2. FedProx Proximal Regularization Gradient
    q, q_star, mu = sp.symbols("q q_star mu", real=True, positive=True)
    prox_penalty = (mu / 2) * (q - q_star) ** 2
    grad_prox = sp.diff(prox_penalty, q)
    expected_prox_grad = mu * (q - q_star)
    print(f"\n[2] FedProx Penalty: R_prox(q) = {prox_penalty}")
    print(f"    Analytical Gradient dR/dq = {grad_prox}")
    print(f"    Symbolic Equivalence Check: {sp.simplify(grad_prox - expected_prox_grad) == 0}")
    assert sp.simplify(grad_prox - expected_prox_grad) == 0, "FedProx gradient mismatch!"

    # 3. Gini Coefficient Analytical Checks
    print("\n[3] Gini Coefficient Boundary & Symmetry Checks:")
    # Perfect equality: all clients equal
    gini_equal = compute_gini_coefficient([1.0, 1.0, 1.0, 1.0, 1.0])
    print(f"    Equal distribution [1, 1, 1, 1, 1] Gini = {gini_equal:.6f} (Expected: 0.0)")
    assert abs(gini_equal - 0.0) < 1e-6, "Gini equal check failed!"

    # Linear progression [1, 2, 3, 4, 5]
    gini_linear = compute_gini_coefficient([1.0, 2.0, 3.0, 4.0, 5.0])
    # Analytical: G = (2/(5*15)) * (0*1 + 1*2 + 2*3 + 3*4 + 4*5) - (5+1)/5 ...
    # n=5, sum=15, mean=3. sum((2i - 5 - 1) x_i) = (-4)*1 + (-2)*2 + (0)*3 + 2*4 + 4*5 = -4 -4 + 0 + 8 + 20 = 20.
    # G = 20 / (5 * 15) = 20 / 75 = 0.266667
    expected_linear = 20.0 / 75.0
    print(f"    Linear [1, 2, 3, 4, 5] Gini = {gini_linear:.6f} (Analytical: {expected_linear:.6f})")
    assert abs(gini_linear - expected_linear) < 1e-4, "Gini linear check failed!"

    # 4. NDCG@K Discount Logarithm Check
    print("\n[4] NDCG Log2 Discount Verification:")
    ndcg_rank1 = compute_ndcg_at_k(1, k=10)
    ndcg_rank2 = compute_ndcg_at_k(2, k=10)
    ndcg_rank11 = compute_ndcg_at_k(11, k=10)
    print(f"    Rank 1 NDCG@10: {ndcg_rank1:.6f} (Expected: 1.0)")
    print(f"    Rank 2 NDCG@10: {ndcg_rank2:.6f} (Expected: 1/log2(3) = {1/np.log2(3):.6f})")
    print(f"    Rank 11 NDCG@10: {ndcg_rank11:.6f} (Expected: 0.0, cut-off at K=10)")
    assert abs(ndcg_rank1 - 1.0) < 1e-6
    assert abs(ndcg_rank2 - (1.0 / np.log2(3.0))) < 1e-6
    assert ndcg_rank11 == 0.0

    print("\n" + "=" * 70)
    print("ALL SYMBOLIC AND ANALYTICAL CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    verify_symbolic_math()
