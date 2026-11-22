"""
FedSocial V2 — Flower Federated NumPyClient
Executes private on-device BPR training and evaluation on local interaction slices.
"""

from typing import Dict, List, Tuple
import flwr as fl
from flwr.common import NDArrays, Scalar
import numpy as np
import torch
import torch.optim as optim
from torch.utils.data import DataLoader

from ml.src.models.content_aware import ContentAwareNeuralRecommender
from ml.src.data.dataset import BPRDataset
from ml.src.evaluation.metrics import hit_rate_at_k, ndcg_at_k, mrr

class FlowerRecClient(fl.client.NumPyClient):
    def __init__(
        self,
        client_id: str,
        model: ContentAwareNeuralRecommender,
        train_triplets: List[Tuple[int, int, int, float]],
        test_records: List[Dict],
        all_item_indices: List[int],
        user_positive_items: Dict[int, set],
        local_epochs: int = 2,
        batch_size: int = 64,
        lr: float = 0.005,
        device: str = "cpu"
    ):
        self.client_id = client_id
        self.model = model.to(device)
        self.train_triplets = train_triplets
        self.test_records = test_records
        self.all_item_indices = all_item_indices
        self.user_positive_items = user_positive_items
        self.local_epochs = local_epochs
        self.batch_size = batch_size
        self.lr = lr
        self.device = device

    def get_parameters(self, config: Dict[str, Scalar]) -> NDArrays:
        """Returns ONLY shared item projection and MLP weights (never user embeddings)."""
        shared_params = [
            self.model.item_projection.weight.detach().cpu().numpy().copy(),
            self.model.item_projection.bias.detach().cpu().numpy().copy(),
            self.model.mlp[0].weight.detach().cpu().numpy().copy(),
            self.model.mlp[0].bias.detach().cpu().numpy().copy(),
            self.model.mlp[3].weight.detach().cpu().numpy().copy(),
            self.model.mlp[3].bias.detach().cpu().numpy().copy(),
            self.model.prediction_head.weight.detach().cpu().numpy().copy(),
        ]
        return shared_params

    def set_parameters(self, parameters: NDArrays):
        """Updates local shared layers with globally aggregated parameters."""
        with torch.no_grad():
            self.model.item_projection.weight.copy_(torch.tensor(parameters[0], device=self.device))
            self.model.item_projection.bias.copy_(torch.tensor(parameters[1], device=self.device))
            self.model.mlp[0].weight.copy_(torch.tensor(parameters[2], device=self.device))
            self.model.mlp[0].bias.copy_(torch.tensor(parameters[3], device=self.device))
            self.model.mlp[3].weight.copy_(torch.tensor(parameters[4], device=self.device))
            self.model.mlp[3].bias.copy_(torch.tensor(parameters[5], device=self.device))
            self.model.prediction_head.weight.copy_(torch.tensor(parameters[6], device=self.device))

    def fit(self, parameters: NDArrays, config: Dict[str, Scalar]) -> Tuple[NDArrays, int, Dict[str, Scalar]]:
        self.set_parameters(parameters)
        mu = float(config.get("mu", 0.0))

        # Snapshot global parameters for FedProx proximal regularizer
        global_params = [p.clone().detach() for p in self.model.parameters() if p.requires_grad]

        dataset = BPRDataset(self.train_triplets)
        loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        optimizer = optim.Adam(self.model.parameters(), lr=self.lr, weight_decay=1e-5)

        self.model.train()
        total_loss = 0.0
        steps = 0

        for epoch in range(self.local_epochs):
            for u, pos, neg, w in loader:
                u, pos, neg, w = u.to(self.device), pos.to(self.device), neg.to(self.device), w.to(self.device)
                optimizer.zero_grad()

                pos_score, neg_score, u_emb, pos_emb, neg_emb = self.model(u, pos, neg)
                loss = self.model.compute_bpr_loss(pos_score, neg_score, u_emb, pos_emb, neg_emb, weights=w)

                # FedProx proximal term
                if mu > 0:
                    prox_term = 0.0
                    for local_p, global_p in zip(
                        [p for p in self.model.parameters() if p.requires_grad], global_params
                    ):
                        prox_term += torch.norm(local_p - global_p, 2).pow(2)
                    loss += (mu / 2.0) * prox_term

                loss.backward()
                optimizer.step()

                total_loss += loss.item()
                steps += 1

        avg_loss = total_loss / max(1, steps)
        return self.get_parameters(config), len(dataset), {"loss": avg_loss}

    def evaluate(self, parameters: NDArrays, config: Dict[str, Scalar]) -> Tuple[float, int, Dict[str, Scalar]]:
        self.set_parameters(parameters)
        self.model.eval()

        hr_list, ndcg_list, mrr_list = [], [], []

        with torch.no_grad():
            for record in self.test_records:
                u_idx = record["u_idx"]
                target_i_idx = record["pos_idx"]

                # Candidate pool: target item + 99 unobserved negative items
                user_pos = self.user_positive_items.get(u_idx, set())
                candidates = [target_i_idx]
                while len(candidates) < 100:
                    cand = np.random.randint(0, self.model.num_items)
                    if cand not in user_pos and cand not in candidates:
                        candidates.append(cand)

                cand_t = torch.tensor(candidates, dtype=torch.long, device=self.device)
                u_t = torch.tensor([u_idx] * len(candidates), dtype=torch.long, device=self.device)

                u_emb = self.model.user_embeddings(u_t)
                i_emb = self.model.get_item_representation(cand_t)
                scores = self.model.score_pair(u_emb, i_emb).cpu().numpy()

                # Rank descending
                ranked_candidates = [candidates[i] for i in np.argsort(-scores)]

                hr_list.append(hit_rate_at_k(target_i_idx, ranked_candidates, k=10))
                ndcg_list.append(ndcg_at_k(target_i_idx, ranked_candidates, k=10))
                mrr_list.append(mrr(target_i_idx, ranked_candidates))

        mean_hr = float(np.mean(hr_list)) if hr_list else 0.0
        mean_ndcg = float(np.mean(ndcg_list)) if ndcg_list else 0.0
        mean_mrr = float(np.mean(mrr_list)) if mrr_list else 0.0

        # Loss as 1 - NDCG for evaluation minimization
        eval_loss = 1.0 - mean_ndcg

        return eval_loss, len(self.test_records), {
            "hr10": mean_hr,
            "ndcg10": mean_ndcg,
            "mrr": mean_mrr
        }
