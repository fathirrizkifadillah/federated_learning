"""
Module: strategies.masked_fedavg
Description: Implements Masked Federated Averaging (MaskedFedAvg) for Recommender Systems.
Key Innovation:
  - Aggregates ONLY shared item embeddings (user embeddings strictly stay on local devices).
  - Uses masked, item-wise weighted aggregation: items only receive updates from clients
    that actively interacted with or sampled them during local training.
  - Unobserved items preserve their existing global latent states rather than being diluted.
Principles: Follows 'clean-code' and 'recsys-pipeline-architect'.
"""

import json
import logging
from typing import Callable, Dict, List, Optional, Tuple, Union
import numpy as np
import flwr as fl
from flwr.common import (
    EvaluateIns,
    EvaluateRes,
    FitIns,
    FitRes,
    Metrics,
    Parameters,
    Scalar,
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)
from flwr.server.client_proxy import ClientProxy

logger = logging.getLogger(__name__)


class MaskedFedAvg(fl.server.strategy.FedAvg):
    """Masked Federated Averaging strategy for Federated Recommendation Systems."""

    def __init__(
        self,
        num_items: int,
        embedding_dim: int = 32,
        initial_parameters: Optional[Parameters] = None,
        min_fit_clients: int = 5,
        min_available_clients: int = 5,
        evaluate_metrics_aggregation_fn: Optional[Callable[[List[Tuple[int, Metrics]]], Metrics]] = None,
        **kwargs,
    ):
        super().__init__(
            min_fit_clients=min_fit_clients,
            min_available_clients=min_available_clients,
            min_evaluate_clients=min_fit_clients,
            fraction_fit=1.0,
            fraction_evaluate=1.0,
            initial_parameters=initial_parameters,
            evaluate_metrics_aggregation_fn=evaluate_metrics_aggregation_fn,
            **kwargs,
        )
        self.num_items = num_items
        self.embedding_dim = embedding_dim
        # Keep track of current global item embeddings array
        if initial_parameters is not None:
            self.global_item_embeddings: np.ndarray = parameters_to_ndarrays(initial_parameters)[0]
        else:
            self.global_item_embeddings = np.random.normal(0, 0.01, (num_items, embedding_dim)).astype(np.float32)

        self.round_history: List[Dict[str, float]] = []

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[Union[Tuple[ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Performs per-item masked aggregation over participating client item weights."""
        if not results:
            return None, {}

        if failures:
            logger.warning("Server round %d encountered %d failures.", server_round, len(failures))

        # Tensor accumulator for weighted sum of item embeddings
        weighted_item_sum = np.zeros_like(self.global_item_embeddings, dtype=np.float64)
        item_weight_counts = np.zeros(self.num_items, dtype=np.float64)

        total_interactions = 0
        active_items_union = set()

        for _, fit_res in results:
            client_arrays = parameters_to_ndarrays(fit_res.parameters)
            client_item_emb = client_arrays[0]  # Shape: (num_items, embedding_dim)
            num_samples = fit_res.num_examples
            total_interactions += num_samples

            # Parse client active item set if provided in metrics
            if "active_items" in fit_res.metrics:
                active_indices = json.loads(str(fit_res.metrics["active_items"]))
            else:
                # If no explicit mask sent, infer active items by parameter change
                diff = np.abs(client_item_emb - self.global_item_embeddings).sum(axis=-1)
                active_indices = np.where(diff > 1e-7)[0].tolist()

            active_items_union.update(active_indices)

            # Weight client contribution by their sample count on active items
            for item_idx in active_indices:
                weighted_item_sum[item_idx] += client_item_emb[item_idx] * num_samples
                item_weight_counts[item_idx] += num_samples

        # Update global embeddings
        updated_count = 0
        for item_idx in range(self.num_items):
            if item_weight_counts[item_idx] > 0:
                self.global_item_embeddings[item_idx] = (
                    weighted_item_sum[item_idx] / item_weight_counts[item_idx]
                ).astype(np.float32)
                updated_count += 1
            # Items with count == 0 preserve self.global_item_embeddings[item_idx] unchanged

        # Calculate communication payload: 4 bytes per float32 parameter
        bytes_per_client = self.num_items * self.embedding_dim * 4
        total_comm_bytes = len(results) * 2 * bytes_per_client  # Upload + Download

        fit_metrics: Dict[str, Scalar] = {
            "round": server_round,
            "participating_clients": len(results),
            "total_samples": total_interactions,
            "active_items_updated": updated_count,
            "active_items_coverage_pct": float(updated_count / self.num_items * 100),
            "comm_payload_kb": float(total_comm_bytes / 1024),
        }

        logger.info(
            "Round %d Fit Complete -> Updated %d/%d items (%.1f%%) | Transferred %.1f KB",
            server_round,
            updated_count,
            self.num_items,
            fit_metrics["active_items_coverage_pct"],
            fit_metrics["comm_payload_kb"],
        )

        return ndarrays_to_parameters([self.global_item_embeddings]), fit_metrics

    def aggregate_evaluate(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, EvaluateRes]],
        failures: List[Union[Tuple[ClientProxy, EvaluateRes], BaseException]],
    ) -> Tuple[Optional[float], Dict[str, Scalar]]:
        """Aggregates ranking evaluation metrics across all participating clients."""
        if not results:
            return None, {}

        total_examples = sum(res.num_examples for _, res in results)
        weighted_loss = sum(res.loss * res.num_examples for _, res in results) / total_examples

        # Aggregate ranking metrics
        aggregated_metrics: Dict[str, Scalar] = {"round": server_round}
        metric_keys = ["ndcg@5", "ndcg@10", "hit@5", "hit@10", "recall@5", "recall@10", "mrr"]

        for k in metric_keys:
            vals = [
                res.metrics[k] * res.num_examples
                for _, res in results
                if k in res.metrics
            ]
            if vals:
                aggregated_metrics[k] = float(sum(vals) / total_examples)

        self.round_history.append(aggregated_metrics)

        logger.info(
            "Round %d Eval Complete -> NDCG@10: %.4f | Hit@10: %.4f | MRR: %.4f | Loss: %.4f",
            server_round,
            aggregated_metrics.get("ndcg@10", 0.0),
            aggregated_metrics.get("hit@10", 0.0),
            aggregated_metrics.get("mrr", 0.0),
            weighted_loss,
        )

        return float(weighted_loss), aggregated_metrics
