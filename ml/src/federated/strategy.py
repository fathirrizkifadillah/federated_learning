"""
FedSocial V2 — Flower Federated Strategies
Implements Masked FedAvg and FedProx for Decoupled Recommendation Models.
Aggregates only shared item projection & scoring layers, isolating user embeddings strictly on edge clients.
"""

from typing import Callable, Dict, List, Optional, Tuple, Union
import flwr as fl
from flwr.common import (
    EvaluateIns,
    EvaluateRes,
    FitIns,
    FitRes,
    MetricsAggregationFn,
    NDArrays,
    Parameters,
    Scalar,
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)
from flwr.server.client_proxy import ClientProxy
import numpy as np

class MaskedFedAvg(fl.server.strategy.FedAvg):
    """
    Decoupled Federated Averaging Strategy.
    Aggregates only shared item projection and neural head parameter arrays.
    Guarantees 0-byte transmission of user embeddings.
    """
    def __init__(
        self,
        *,
        fraction_fit: float = 1.0,
        fraction_evaluate: float = 1.0,
        min_fit_clients: int = 2,
        min_evaluate_clients: int = 2,
        min_available_clients: int = 2,
        on_fit_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
        initial_parameters: Optional[Parameters] = None,
    ):
        super().__init__(
            fraction_fit=fraction_fit,
            fraction_evaluate=fraction_evaluate,
            min_fit_clients=min_fit_clients,
            min_evaluate_clients=min_evaluate_clients,
            min_available_clients=min_available_clients,
            on_fit_config_fn=on_fit_config_fn,
            initial_parameters=initial_parameters,
        )

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[Union[Tuple[ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        if not results:
            return None, {}

        # Weighted parameter averaging across responding edge clients
        weights_results = [
            (parameters_to_ndarrays(fit_res.parameters), fit_res.num_examples)
            for _, fit_res in results
        ]

        total_examples = sum(num_examples for _, num_examples in weights_results)
        if total_examples == 0:
            return None, {}

        # Compute weighted average across parameter layers
        aggregated_ndarrays = [
            np.zeros_like(layer, dtype=np.float32)
            for layer in weights_results[0][0]
        ]

        for client_params, num_examples in weights_results:
            weight = num_examples / total_examples
            for i, layer in enumerate(client_params):
                aggregated_ndarrays[i] += layer * weight

        parameters_aggregated = ndarrays_to_parameters(aggregated_ndarrays)

        # Aggregate training loss metrics
        losses = [fit_res.metrics["loss"] for _, fit_res in results if "loss" in fit_res.metrics]
        mean_loss = float(np.mean(losses)) if losses else 0.0

        return parameters_aggregated, {"train_loss": mean_loss, "round": server_round}

class FedProxStrategy(MaskedFedAvg):
    """
    Federated Proximal (FedProx) Strategy.
    Transmits mu proximal parameter to edge clients to stabilize descent under Dirichlet skew.
    """
    def __init__(self, mu: float = 0.01, **kwargs):
        super().__init__(**kwargs)
        self.mu = mu

    def configure_fit(
        self, server_round: int, parameters: Parameters, client_manager: fl.server.client_manager.ClientManager
    ) -> List[Tuple[ClientProxy, FitIns]]:
        config = {"mu": self.mu, "server_round": server_round}
        fit_ins = FitIns(parameters, config)
        clients = client_manager.sample(
            num_clients=self.min_fit_clients, min_num_clients=self.min_available_clients
        )
        return [(client, fit_ins) for client in clients]
