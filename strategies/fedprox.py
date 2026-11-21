"""
Module: strategies.fedprox
Description: Implements the FedProx strategy for Federated Recommendation.
Architectural Design:
  - Extends MaskedFedAvg with proximal regularization parameter mu.
  - Passes proximal_mu into client training config so clients penalize drift
    relative to the global item embedding parameters: (mu / 2) * || Q_k - Q_global ||^2.
Principles: Follows 'clean-code' and 'recsys-pipeline-architect'.
"""

from typing import Dict, List, Optional, Tuple
import flwr as fl
from flwr.common import FitIns, Metrics, Parameters, Scalar
from flwr.server.client_manager import ClientManager
from flwr.server.client_proxy import ClientProxy

from strategies.masked_fedavg import MaskedFedAvg


class FedProxRec(MaskedFedAvg):
    """FedProx strategy adapted for Federated Recommendation Systems."""

    def __init__(
        self,
        num_items: int,
        embedding_dim: int = 32,
        proximal_mu: float = 0.01,
        initial_parameters: Optional[Parameters] = None,
        min_fit_clients: int = 5,
        min_available_clients: int = 5,
        seed: int = 42,
        **kwargs,
    ):
        super().__init__(
            num_items=num_items,
            embedding_dim=embedding_dim,
            initial_parameters=initial_parameters,
            min_fit_clients=min_fit_clients,
            min_available_clients=min_available_clients,
            **kwargs,
        )
        self.proximal_mu = proximal_mu
        self.seed = seed

    def configure_fit(
        self, server_round: int, parameters: Parameters, client_manager: ClientManager
    ) -> List[Tuple[ClientProxy, FitIns]]:
        """Injects proximal_mu and round seed into fit instructions."""
        client_instructions = super().configure_fit(server_round, parameters, client_manager)

        updated_instructions = []
        for client_proxy, fit_ins in client_instructions:
            config = dict(fit_ins.config)
            config["proximal_mu"] = self.proximal_mu
            config["seed"] = self.seed + server_round
            config["local_epochs"] = 2
            updated_instructions.append((client_proxy, FitIns(fit_ins.parameters, config)))

        return updated_instructions
