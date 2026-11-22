"""
Module: recsys_core
Description: Centralized mathematical foundations, metric calculations, federated aggregation,
             and edge resource modeling for Federated Recommender Systems.
Author: Antigravity Agent (Federated Recommender System)
Principles: Follows 'python-pro', 'recsys-pipeline-architect', and 'full-output-enforcement'.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
import torch
import torch.nn.functional as F


# ==============================================================================
# 1. LOSS FUNCTIONS & MATHEMATICAL FORMULATIONS
# ==============================================================================


def compute_bpr_loss(
    pos_scores: torch.Tensor,
    neg_scores: torch.Tensor,
    user_emb: Optional[torch.Tensor] = None,
    pos_emb: Optional[torch.Tensor] = None,
    neg_emb: Optional[torch.Tensor] = None,
    l2_reg: float = 0.0,
) -> torch.Tensor:
    r"""Computes the Bayesian Personalized Ranking (BPR) pairwise preference loss.

    Mathematical Formulation:
    .. math::
        \mathcal{L}_{\text{BPR}}(\Theta) = - \sum_{(u, i, j) \in \mathcal{D}}
        \ln \sigma(\hat{x}_{ui} - \hat{x}_{uj}) + \frac{\lambda_{\Theta}}{2} \|\Theta\|_2^2

    where:
        - :math:`\hat{x}_{ui}` is the predicted affinity score for positive observed item :math:`i`.
        - :math:`\hat{x}_{uj}` is the predicted affinity score for negative unobserved item :math:`j`.
        - :math:`\sigma(z) = \frac{1}{1 + e^{-z}}` is the logistic sigmoid function.
        - :math:`\Theta = \{\mathbf{P}, \mathbf{Q}\}` represents the latent embedding matrices.

    Args:
        pos_scores: Tensor of shape (B,) containing predicted positive item scores.
        neg_scores: Tensor of shape (B,) containing predicted negative item scores.
        user_emb: Optional tensor of shape (B, d) representing user embeddings.
        pos_emb: Optional tensor of shape (B, d) representing positive item embeddings.
        neg_emb: Optional tensor of shape (B, d) representing negative item embeddings.
        l2_reg: L2 regularization hyperparameter :math:`\lambda_{\Theta}`.

    Returns:
        Scalar tensor containing the batch mean BPR loss.
    """
    diff = pos_scores - neg_scores
    bpr = -F.logsigmoid(diff).mean()

    if l2_reg > 0.0 and user_emb is not None and pos_emb is not None and neg_emb is not None:
        reg_loss = (
            torch.norm(user_emb, p=2).pow(2)
            + torch.norm(pos_emb, p=2).pow(2)
            + torch.norm(neg_emb, p=2).pow(2)
        ) / (2.0 * pos_scores.size(0))
        return bpr + l2_reg * reg_loss

    return bpr


def compute_fedprox_penalty(
    local_item_weights: torch.Tensor,
    global_item_weights: torch.Tensor,
    mu: float = 0.01,
) -> torch.Tensor:
    r"""Computes the FedProx proximal regularization penalty term.

    Mathematical Formulation:
    .. math::
        \mathcal{R}_{\text{prox}}(\mathbf{Q}_k, \mathbf{Q}^{(t)}) =
        \frac{\mu}{2} \|\mathbf{Q}_k - \mathbf{Q}^{(t)}\|_F^2

    where:
        - :math:`\mathbf{Q}_k` is the local client's item embedding matrix.
        - :math:`\mathbf{Q}^{(t)}` is the global item embedding matrix at round :math:`t`.
        - :math:`\mu` is the proximal penalty hyperparameter constraining client drift.
        - :math:`\|\cdot\|_F` denotes the Frobenius norm.

    Args:
        local_item_weights: Tensor of shape (M, d) of local client parameters.
        global_item_weights: Tensor of shape (M, d) of global server parameters.
        mu: Proximal strength coefficient :math:`\mu`.

    Returns:
        Scalar tensor containing the proximal penalty.
    """
    if mu <= 0.0:
        return torch.tensor(0.0, device=local_item_weights.device)

    diff = local_item_weights - global_item_weights
    return (mu / 2.0) * torch.norm(diff, p="fro").pow(2)


def masked_fedavg_aggregate(
    client_matrices: Sequence[np.ndarray],
    client_item_counts: Sequence[np.ndarray],
    global_anchor_matrix: Optional[np.ndarray] = None,
) -> np.ndarray:
    r"""Performs per-item frequency-weighted Masked Federated Averaging (Masked FedAvg).

    Mathematical Formulation:
    For each item :math:`j \in \{1, \dots, M\}`:
    .. math::
        \mathbf{q}_j^{(t+1)} = \sum_{k \in \mathcal{S}_j}
        \frac{n_{k,j}}{\sum_{m \in \mathcal{S}_j} n_{m,j}} \mathbf{q}_{j,k}^{(t+1)}

    where:
        - :math:`\mathcal{S}_j` is the set of clients that observed and updated item :math:`j`.
        - :math:`n_{k,j}` is the interaction count for item :math:`j` on client :math:`k`.
        - If :math:`\sum_{k} n_{k,j} = 0`, the item retains its previous anchor value :math:`\mathbf{q}_j^{(t)}`.

    Args:
        client_matrices: List of K client weight matrices, each of shape (M, d).
        client_item_counts: List of K client item frequency vectors, each of shape (M,).
        global_anchor_matrix: Optional fallback matrix of shape (M, d) for unobserved items.

    Returns:
        Aggregated global item matrix of shape (M, d).
    """
    if not client_matrices:
        raise ValueError("client_matrices must not be empty.")

    num_items, dim = client_matrices[0].shape
    aggregated = np.zeros((num_items, dim), dtype=np.float32)
    total_weights = np.zeros(num_items, dtype=np.float32)

    for weights, counts in zip(client_matrices, client_item_counts):
        # Broadcast counts across embedding dimensions: (M, 1) * (M, d)
        weights_expanded = counts[:, np.newaxis]
        aggregated += weights * weights_expanded
        total_weights += counts

    updated_mask = total_weights > 0
    aggregated[updated_mask] /= total_weights[updated_mask, np.newaxis]

    # Preserve anchor weights for items unobserved in this round
    if global_anchor_matrix is not None:
        aggregated[~updated_mask] = global_anchor_matrix[~updated_mask]

    return aggregated


# ==============================================================================
# 2. INFORMATION RETRIEVAL & RANKING METRICS
# ==============================================================================


def compute_ndcg_at_k(rank: Union[int, float], k: int = 10) -> float:
    r"""Computes Normalized Discounted Cumulative Gain at rank cut-off K for 1 positive item.

    Mathematical Formulation:
    .. math::
        \text{NDCG}@K =
        \begin{cases}
            \frac{1}{\log_2(\text{rank} + 1)}, & \text{if } 1 \le \text{rank} \le K \\
            0, & \text{if } \text{rank} > K
        \end{cases}

    Args:
        rank: 1-indexed rank position of the positive test item.
        k: Ranking truncation threshold K.

    Returns:
        Float value of NDCG@K in range [0.0, 1.0].
    """
    if 1 <= rank <= k:
        return float(1.0 / math.log2(rank + 1.0))
    return 0.0


def compute_recall_at_k(rank: Union[int, float], k: int = 10) -> float:
    r"""Computes Recall at rank cut-off K for a single ground-truth positive item.

    Mathematical Formulation:
    .. math::
        \text{Recall}@K = \mathbb{I}(\text{rank} \le K) =
        \begin{cases}
            1.0, & \text{if } \text{rank} \le K \\
            0.0, & \text{otherwise}
        \end{cases}

    Args:
        rank: 1-indexed rank position of the positive test item.
        k: Ranking truncation threshold K.

    Returns:
        1.0 if item is retrieved in top-K, else 0.0.
    """
    return 1.0 if 1 <= rank <= k else 0.0


def compute_hit_at_k(rank: Union[int, float], k: int = 10) -> float:
    r"""Computes Hit Rate at rank cut-off K (identical to Recall@K for single-positive evaluation).

    Args:
        rank: 1-indexed rank position of the positive test item.
        k: Ranking truncation threshold K.

    Returns:
        1.0 if item is retrieved in top-K, else 0.0.
    """
    return compute_recall_at_k(rank, k)


def compute_mrr(rank: Union[int, float]) -> float:
    r"""Computes Mean Reciprocal Rank (MRR) for a single query instance.

    Mathematical Formulation:
    .. math::
        \text{MRR} =
        \begin{cases}
            \frac{1}{\text{rank}}, & \text{if } \text{rank} < \infty \\
            0.0, & \text{if item not ranked}
        \end{cases}

    Args:
        rank: 1-indexed rank position of the positive test item.

    Returns:
        Reciprocal rank float in range [0.0, 1.0].
    """
    if rank > 0 and not math.isinf(rank):
        return float(1.0 / rank)
    return 0.0


def compute_ranking_metrics_for_user(
    ranked_item_ids: Sequence[Union[int, str]],
    ground_truth_item_id: Union[int, str],
    k_list: Sequence[int] = (5, 10),
) -> Dict[str, float]:
    """Computes HitRate@K, Recall@K, NDCG@K, and MRR for a single evaluated user.

    Args:
        ranked_item_ids: Ordered sequence of candidate item IDs sorted by descending predicted score.
        ground_truth_item_id: Ground truth positive item identifier.
        k_list: Sequence of top-K cutoffs.

    Returns:
        Dictionary mapping metric names (e.g. 'ndcg@10', 'hit@10', 'mrr') to computed float values.
    """
    try:
        rank = list(ranked_item_ids).index(ground_truth_item_id) + 1
    except ValueError:
        rank = float("inf")

    metrics = {"mrr": compute_mrr(rank)}
    for k in k_list:
        metrics[f"hit@{k}"] = compute_hit_at_k(rank, k)
        metrics[f"recall@{k}"] = compute_recall_at_k(rank, k)
        metrics[f"ndcg@{k}"] = compute_ndcg_at_k(rank, k)

    return metrics


def aggregate_ranking_metrics(user_metrics_list: Sequence[Dict[str, float]]) -> Dict[str, float]:
    """Computes arithmetic mean of individual user ranking metrics across all evaluated users.

    Args:
        user_metrics_list: List of metric dictionaries per user.

    Returns:
        Dictionary containing population-level averaged metrics.
    """
    if not user_metrics_list:
        return {}

    keys = user_metrics_list[0].keys()
    aggregated = {k: float(np.mean([m[k] for m in user_metrics_list])) for k in keys}
    return aggregated


# ==============================================================================
# 3. FAIRNESS & DISPARITY QUANTIFICATION
# ==============================================================================


def compute_gini_coefficient(values: Sequence[float]) -> float:
    r"""Computes the Gini coefficient of inequality for an array of values.

    Mathematical Formulation:
    .. math::
        G = \frac{\sum_{i=1}^n \sum_{j=1}^n |x_i - x_j|}{2 n^2 \bar{x}} =
        \frac{\sum_{i=1}^n (2i - n - 1) x_{(i)}}{n \sum_{i=1}^n x_{(i)}}

    where:
        - :math:`x_{(1)} \le x_{(2)} \le \dots \le x_{(n)}` are the sorted non-negative values.
        - :math:`n` is the number of observations (e.g. number of clients).
        - :math:`\bar{x}` is the sample mean.
        - :math:`G = 0` denotes perfect equality across clients.
        - :math:`G = 1` denotes maximum inequality (monopolized utility).

    Args:
        values: Sequence of performance metrics across clients.

    Returns:
        Float value of Gini coefficient in range [0.0, 1.0].
    """
    arr = np.array(values, dtype=np.float64)
    if len(arr) == 0:
        return 0.0

    if np.amin(arr) < 0:
        arr -= np.amin(arr)

    arr += 1e-12  # Prevent division by zero
    arr = np.sort(arr)
    n = arr.shape[0]
    index = np.arange(1, n + 1)
    gini = float((np.sum((2 * index - n - 1) * arr)) / (n * np.sum(arr)))
    return max(0.0, min(1.0, gini))


# ==============================================================================
# 4. EDGE COMMUNICATION & RESOURCE MODELING
# ==============================================================================


def calculate_wire_payload(
    num_items: int,
    embedding_dim: int = 32,
    precision_bytes: int = 4,
) -> Dict[str, float]:
    r"""Calculates exact network wire transmission payload for decoupled federated recommendation.

    Mathematical Formulation:
    .. math::
        \text{Client Payload (Bytes)} = M \times d \times B_{\text{dtype}}

    where:
        - :math:`M` is the item catalog cardinality (:math:`1,439` items).
        - :math:`d` is the latent factor dimension (:math:`32`).
        - :math:`B_{\text{dtype}} = 4\text{ bytes}` for single-precision IEEE 754 float32.
        - Private user embeddings :math:`\mathbf{P}_k \in \mathbb{R}^{U_k \times d}` transmit :math:`0\text{ bytes}`.

    Args:
        num_items: Total items in shared catalog :math:`M`.
        embedding_dim: Latent vector dimensionality :math:`d`.
        precision_bytes: Bytes per floating-point weight (4 for float32).

    Returns:
        Dictionary with byte, kilobyte, and megabyte breakdowns per client and per round.
    """
    client_bytes = num_items * embedding_dim * precision_bytes
    client_kb = client_bytes / 1024.0
    client_mb = client_kb / 1024.0

    return {
        "client_upload_bytes": client_bytes,
        "client_upload_kb": round(client_kb, 2),
        "client_upload_mb": round(client_mb, 4),
        "client_download_bytes": client_bytes,
        "client_round_trip_kb": round(client_kb * 2, 2),
        "user_embedding_bytes": 0.0,  # Strict Zero Leakage Guarantee
    }


def simulate_federation_economics(
    num_clients: int,
    num_rounds: int,
    num_items: int = 1439,
    embedding_dim: int = 32,
    cellular_rate_per_gb_usd: float = 0.15,
    server_hourly_rate_usd: float = 0.50,
    round_duration_seconds: float = 8.5,
) -> Dict[str, float]:
    r"""Simulates network data consumption, cloud computing cost, and energy footprint.

    Mathematical Formulation:
    .. math::
        \text{Total Network Wire (GB)} = \frac{2 \times \text{num\_clients} \times \text{num\_rounds} \times (M \times d \times 4)}{10^9}

    Args:
        num_clients: Number of participating edge devices :math:`K`.
        num_rounds: Total federated communication rounds :math:`T`.
        num_items: Total shared catalog items :math:`M`.
        embedding_dim: Latent dimension :math:`d`.
        cellular_rate_per_gb_usd: Cellular data cost per gigabyte ($ USD).
        server_hourly_rate_usd: Cloud server cost per hour ($ USD).
        round_duration_seconds: Average clock duration per round in seconds.

    Returns:
        Dictionary containing comprehensive economic simulation metrics.
    """
    wire_info = calculate_wire_payload(num_items, embedding_dim)
    client_rt_mb = (wire_info["client_upload_bytes"] * 2) / (1024.0 * 1024.0)

    total_mb = client_rt_mb * num_clients * num_rounds
    total_gb = total_mb / 1024.0

    total_compute_hours = (num_rounds * round_duration_seconds) / 3600.0
    server_cost_usd = total_compute_hours * server_hourly_rate_usd
    cellular_cost_usd = total_gb * cellular_rate_per_gb_usd

    # Energy model: Average modern ARM Cortex-A CPU consumes ~1.8 Joules per local BPR epoch
    local_energy_joules_per_client = num_rounds * 2 * 1.8
    total_energy_kwh = (local_energy_joules_per_client * num_clients) / 3.6e6

    return {
        "total_data_transferred_mb": round(total_mb, 2),
        "total_data_transferred_gb": round(total_gb, 4),
        "per_client_data_mb": round(client_rt_mb * num_rounds, 2),
        "server_compute_hours": round(total_compute_hours, 4),
        "server_cost_usd": round(server_cost_usd, 4),
        "cellular_cost_usd": round(cellular_cost_usd, 4),
        "total_projected_cost_usd": round(server_cost_usd + cellular_cost_usd, 4),
        "total_energy_kwh": round(total_energy_kwh, 6),
    }
