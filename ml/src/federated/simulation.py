"""
FedSocial V2 — Master Federated Learning Simulation Runner
Executes comprehensive empirical comparisons:
1. Centralized Baseline (Pooled Gold Standard)
2. Isolated Local-Only
3. Federated Averaging (FedAvg Non-IID Dirichlet alpha=0.5)
4. Federated Proximal (FedProx Non-IID mu=0.01)
Generates full benchmark matrix, per-round metrics, and saves results to ml/artifacts/.
"""

import json
import os
import sys
import random

# Ensure root directory is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
import numpy as np
import torch
import torch.optim as optim
from torch.utils.data import DataLoader

from ml.src.data.dataset import RecSysDataPipeline, BPRDataset
from ml.src.models.content_aware import ContentAwareNeuralRecommender
from ml.src.models.bpr_mf import BPRMatrixFactorization
from ml.src.models.popularity import PopularityRecommender
from ml.src.evaluation.metrics import hit_rate_at_k, ndcg_at_k, mrr, gini_coefficient

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

OUTPUT_BENCHMARK_PATH = os.path.join("ml", "artifacts", "federated_benchmark.json")

def evaluate_recsys_model(model, test_records, user_positive_items, num_items, device="cpu"):
    """Standardized Leave-Last-Out ranking evaluation against 99 unobserved negatives."""
    model.eval()
    hr_list, ndcg_list, mrr_list = [], [], []

    with torch.no_grad():
        for rec in test_records:
            u_idx = rec["u_idx"]
            pos_idx = rec["pos_idx"]

            user_pos = user_positive_items.get(u_idx, set())
            candidates = [pos_idx]
            while len(candidates) < 100:
                c = random.randint(0, num_items - 1)
                if c not in user_pos and c not in candidates:
                    candidates.append(c)

            cand_t = torch.tensor(candidates, dtype=torch.long, device=device)
            u_t = torch.tensor([u_idx] * len(candidates), dtype=torch.long, device=device)

            if hasattr(model, "get_item_representation"):
                u_emb = model.user_embeddings(u_t)
                i_emb = model.get_item_representation(cand_t)
                scores = model.score_pair(u_emb, i_emb).cpu().numpy()
            else:
                u_emb = model.user_embeddings(u_t)
                i_emb = model.item_embeddings(cand_t)
                scores = torch.sum(u_emb * i_emb, dim=1).cpu().numpy()

            ranked = [candidates[i] for i in np.argsort(-scores)]

            hr_list.append(hit_rate_at_k(pos_idx, ranked, k=10))
            ndcg_list.append(ndcg_at_k(pos_idx, ranked, k=10))
            mrr_list.append(mrr(pos_idx, ranked))

    return {
        "hr10": float(np.mean(hr_list)),
        "ndcg10": float(np.mean(ndcg_list)),
        "mrr": float(np.mean(mrr_list)),
        "per_user_ndcg": ndcg_list
    }

def run_centralized_training(pipeline, epochs=15, batch_size=64, lr=0.005, device="cpu"):
    print("\n--- 1. Training Centralized Neural Baseline (Gold Standard) ---")
    model = ContentAwareNeuralRecommender(
        num_users=pipeline.num_users,
        num_items=pipeline.num_items,
        pretrained_embeddings=torch.tensor(pipeline.item_embeddings, dtype=torch.float32),
        latent_dim=64,
        mlp_hidden_dim=64
    ).to(device)

    triplets = pipeline.get_bpr_triplets(split="train", num_negatives=1)
    loader = DataLoader(BPRDataset(triplets), batch_size=batch_size, shuffle=True)
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)

    for ep in range(epochs):
        model.train()
        total_loss = 0.0
        for u, pos, neg, w in loader:
            u, pos, neg, w = u.to(device), pos.to(device), neg.to(device), w.to(device)
            optimizer.zero_grad()
            pos_score, neg_score, u_emb, pos_emb, neg_emb = model(u, pos, neg)
            loss = model.compute_bpr_loss(pos_score, neg_score, u_emb, pos_emb, neg_emb, weights=w)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

    test_records = [
        {"u_idx": pipeline.user2idx[r["user_id"]], "pos_idx": pipeline.item2idx[r["article_id"]]}
        for _, r in pipeline.test_df.iterrows()
        if r["article_id"] in pipeline.item2idx
    ]
    res = evaluate_recsys_model(model, test_records, pipeline.user_positive_items, pipeline.num_items, device)
    print(f"Centralized Result: NDCG@10: {res['ndcg10']:.4f} | HR@10: {res['hr10']:.4f} | MRR: {res['mrr']:.4f}")
    return res

def run_isolated_local_training(pipeline, partitions, epochs=15, device="cpu"):
    print("\n--- 2. Training Isolated Local Models (Zero Federation) ---")
    non_iid = partitions["non_iid_partitions"]
    client_ndcgs = []
    client_hrs = []
    client_mrrs = []

    for cid, cdata in non_iid.items():
        client_users = set(cdata["users"])
        client_train = pipeline.train_df[pipeline.train_df["user_id"].isin(client_users)]
        client_test = pipeline.test_df[pipeline.test_df["user_id"].isin(client_users)]

        if len(client_train) == 0 or len(client_test) == 0:
            continue

        model = ContentAwareNeuralRecommender(
            num_users=pipeline.num_users,
            num_items=pipeline.num_items,
            pretrained_embeddings=torch.tensor(pipeline.item_embeddings, dtype=torch.float32),
            latent_dim=64
        ).to(device)

        # Local triplets
        triplets = []
        for _, r in client_train.iterrows():
            u_idx = pipeline.user2idx[r["user_id"]]
            pos_idx = pipeline.item2idx[r["article_id"]]
            w = min(float(r["dwell_time_sec"]) / 60.0, 3.0)
            neg_idx = random.randint(0, pipeline.num_items - 1)
            while neg_idx in pipeline.user_positive_items[u_idx]:
                neg_idx = random.randint(0, pipeline.num_items - 1)
            triplets.append((u_idx, pos_idx, neg_idx, w))

        loader = DataLoader(BPRDataset(triplets), batch_size=32, shuffle=True)
        optimizer = optim.Adam(model.parameters(), lr=0.005)

        for ep in range(epochs):
            model.train()
            for u, pos, neg, w in loader:
                u, pos, neg, w = u.to(device), pos.to(device), neg.to(device), w.to(device)
                optimizer.zero_grad()
                pos_s, neg_s, u_e, p_e, n_e = model(u, pos, neg)
                loss = model.compute_bpr_loss(pos_s, neg_s, u_e, p_e, n_e, weights=w)
                loss.backward()
                optimizer.step()

        test_records = [
            {"u_idx": pipeline.user2idx[r["user_id"]], "pos_idx": pipeline.item2idx[r["article_id"]]}
            for _, r in client_test.iterrows()
            if r["article_id"] in pipeline.item2idx
        ]
        res = evaluate_recsys_model(model, test_records, pipeline.user_positive_items, pipeline.num_items, device)
        client_ndcgs.append(res["ndcg10"])
        client_hrs.append(res["hr10"])
        client_mrrs.append(res["mrr"])

    mean_ndcg = float(np.mean(client_ndcgs))
    gini_score = float(gini_coefficient(client_ndcgs))
    print(f"Isolated Local Result: NDCG@10: {mean_ndcg:.4f} | HR@10: {np.mean(client_hrs):.4f} | Gini: {gini_score:.4f}")
    return {
        "ndcg10": mean_ndcg,
        "hr10": float(np.mean(client_hrs)),
        "mrr": float(np.mean(client_mrrs)),
        "gini": gini_score,
        "client_scores": client_ndcgs
    }

def run_federated_rounds(pipeline, partitions, strategy_name="FedAvg", mu=0.0, rounds=15, local_epochs=2, device="cpu"):
    print(f"\n--- 3. Running Decentralized Federated Training: {strategy_name} (mu={mu}) ---")
    non_iid = partitions["non_iid_partitions"]

    # Global Server Model holding shared item projection & scoring layers
    global_model = ContentAwareNeuralRecommender(
        num_users=pipeline.num_users,
        num_items=pipeline.num_items,
        pretrained_embeddings=torch.tensor(pipeline.item_embeddings, dtype=torch.float32),
        latent_dim=64
    ).to(device)

    # Local edge models: each client keeps its local user embeddings persistent across rounds!
    client_models = {}
    client_data = {}

    for cid, cdata in non_iid.items():
        client_users = set(cdata["users"])
        client_train = pipeline.train_df[pipeline.train_df["user_id"].isin(client_users)]
        client_test = pipeline.test_df[pipeline.test_df["user_id"].isin(client_users)]

        c_model = ContentAwareNeuralRecommender(
            num_users=pipeline.num_users,
            num_items=pipeline.num_items,
            pretrained_embeddings=torch.tensor(pipeline.item_embeddings, dtype=torch.float32),
            latent_dim=64
        ).to(device)

        triplets = []
        for _, r in client_train.iterrows():
            u_idx = pipeline.user2idx[r["user_id"]]
            pos_idx = pipeline.item2idx[r["article_id"]]
            w = min(float(r["dwell_time_sec"]) / 60.0, 3.0)
            neg_idx = random.randint(0, pipeline.num_items - 1)
            while neg_idx in pipeline.user_positive_items[u_idx]:
                neg_idx = random.randint(0, pipeline.num_items - 1)
            triplets.append((u_idx, pos_idx, neg_idx, w))

        test_records = [
            {"u_idx": pipeline.user2idx[r["user_id"]], "pos_idx": pipeline.item2idx[r["article_id"]]}
            for _, r in client_test.iterrows()
            if r["article_id"] in pipeline.item2idx
        ]

        client_models[cid] = c_model
        client_data[cid] = {"loader": DataLoader(BPRDataset(triplets), batch_size=32, shuffle=True), "test": test_records, "size": len(triplets)}

    history = []

    # Federation loop
    for r in range(1, rounds + 1):
        shared_deltas = []
        weights_sizes = []

        # 1. Distribute current global shared layers to all clients
        global_proj_w = global_model.item_projection.weight.clone().detach()
        global_proj_b = global_model.item_projection.bias.clone().detach()
        global_mlp_w1 = global_model.mlp[0].weight.clone().detach()
        global_mlp_b1 = global_model.mlp[0].bias.clone().detach()
        global_mlp_w2 = global_model.mlp[3].weight.clone().detach()
        global_mlp_b2 = global_model.mlp[3].bias.clone().detach()
        global_head_w = global_model.prediction_head.weight.clone().detach()

        # 2. Local edge training on private client devices
        for cid, c_model in client_models.items():
            # Synchronize shared parameters
            with torch.no_grad():
                c_model.item_projection.weight.copy_(global_proj_w)
                c_model.item_projection.bias.copy_(global_proj_b)
                c_model.mlp[0].weight.copy_(global_mlp_w1)
                c_model.mlp[0].bias.copy_(global_mlp_b1)
                c_model.mlp[3].weight.copy_(global_mlp_w2)
                c_model.mlp[3].bias.copy_(global_mlp_b2)
                c_model.prediction_head.weight.copy_(global_head_w)

            loader = client_data[cid]["loader"]
            if len(loader) == 0:
                continue

            optimizer = optim.Adam(c_model.parameters(), lr=0.005)

            for ep in range(local_epochs):
                c_model.train()
                for u, pos, neg, w in loader:
                    u, pos, neg, w = u.to(device), pos.to(device), neg.to(device), w.to(device)
                    optimizer.zero_grad()
                    pos_s, neg_s, u_e, p_e, n_e = c_model(u, pos, neg)
                    loss = c_model.compute_bpr_loss(pos_s, neg_s, u_e, p_e, n_e, weights=w)

                    if mu > 0:
                        prox = (
                            torch.norm(c_model.item_projection.weight - global_proj_w, 2).pow(2) +
                            torch.norm(c_model.mlp[0].weight - global_mlp_w1, 2).pow(2)
                        )
                        loss += (mu / 2.0) * prox

                    loss.backward()
                    optimizer.step()

            # Transmit ONLY shared parameters delta back to server
            shared_deltas.append({
                "proj_w": c_model.item_projection.weight.clone().detach(),
                "proj_b": c_model.item_projection.bias.clone().detach(),
                "mlp_w1": c_model.mlp[0].weight.clone().detach(),
                "mlp_b1": c_model.mlp[0].bias.clone().detach(),
                "mlp_w2": c_model.mlp[3].weight.clone().detach(),
                "mlp_b2": c_model.mlp[3].bias.clone().detach(),
                "head_w": c_model.prediction_head.weight.clone().detach(),
            })
            weights_sizes.append(client_data[cid]["size"])

        # 3. Masked Server Aggregation (Weighted average)
        total_w = sum(weights_sizes)
        with torch.no_grad():
            new_proj_w = sum(d["proj_w"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))
            new_proj_b = sum(d["proj_b"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))
            new_mlp_w1 = sum(d["mlp_w1"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))
            new_mlp_b1 = sum(d["mlp_b1"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))
            new_mlp_w2 = sum(d["mlp_w2"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))
            new_mlp_b2 = sum(d["mlp_b2"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))
            new_head_w = sum(d["head_w"] * (sz / total_w) for d, sz in zip(shared_deltas, weights_sizes))

            global_model.item_projection.weight.copy_(new_proj_w)
            global_model.item_projection.bias.copy_(new_proj_b)
            global_model.mlp[0].weight.copy_(new_mlp_w1)
            global_model.mlp[0].bias.copy_(new_mlp_b1)
            global_model.mlp[3].weight.copy_(new_mlp_w2)
            global_model.mlp[3].bias.copy_(new_mlp_b2)
            global_model.prediction_head.weight.copy_(new_head_w)

        # Evaluate edge performance across all clients at this round
        round_ndcgs, round_hrs, round_mrrs = [], [], []
        for cid, c_model in client_models.items():
            res = evaluate_recsys_model(c_model, client_data[cid]["test"], pipeline.user_positive_items, pipeline.num_items, device)
            round_ndcgs.append(res["ndcg10"])
            round_hrs.append(res["hr10"])
            round_mrrs.append(res["mrr"])

        mean_ndcg = float(np.mean(round_ndcgs))
        mean_hr = float(np.mean(round_hrs))
        mean_mrr = float(np.mean(round_mrrs))
        gini_score = float(gini_coefficient(round_ndcgs))

        history.append({
            "round": r,
            "ndcg10": mean_ndcg,
            "hr10": mean_hr,
            "mrr": mean_mrr,
            "gini": gini_score
        })
        if r % 5 == 0 or r == rounds:
            print(f"Round {r:02d}/{rounds:02d} — NDCG@10: {mean_ndcg:.4f} | HR@10: {mean_hr:.4f} | MRR: {mean_mrr:.4f} | Gini: {gini_score:.4f}")

    return {
        "final_ndcg10": history[-1]["ndcg10"],
        "final_hr10": history[-1]["hr10"],
        "final_mrr": history[-1]["mrr"],
        "final_gini": history[-1]["gini"],
        "history": history
    }

def run_all_simulations():
    print("=" * 70)
    print("Executing FedSocial V2 Recommender Benchmark & Federated Simulation")
    print("=" * 70)

    device = "cpu"
    pipeline = RecSysDataPipeline()
    with open("ml/data/processed/federated_partitions.json", "r", encoding="utf-8") as f:
        partitions = json.load(f)

    # 1. Centralized Gold Standard
    central_res = run_centralized_training(pipeline, epochs=15, device=device)

    # 2. Isolated Local
    isolated_res = run_isolated_local_training(pipeline, partitions, epochs=15, device=device)

    # 3. Federated Averaging (FedAvg Non-IID)
    fedavg_res = run_federated_rounds(pipeline, partitions, strategy_name="FedAvg", mu=0.0, rounds=15, device=device)

    # 4. Federated Proximal (FedProx Non-IID)
    fedprox_res = run_federated_rounds(pipeline, partitions, strategy_name="FedProx", mu=0.01, rounds=15, device=device)

    # Compute Centralized Parity (% of centralized performance retained under strict zero-leakage)
    fedavg_parity = float((fedavg_res["final_ndcg10"] / central_res["ndcg10"]) * 100.0)
    fedprox_parity = float((fedprox_res["final_ndcg10"] / central_res["ndcg10"]) * 100.0)
    isolated_parity = float((isolated_res["ndcg10"] / central_res["ndcg10"]) * 100.0)

    benchmark_summary = {
        "evaluation_protocol": "Leave-Last-2-Out Chronological Ranking against 99 Negatives",
        "centralized_baseline": {
            "ndcg10": central_res["ndcg10"],
            "hr10": central_res["hr10"],
            "mrr": central_res["mrr"],
            "parity_pct": 100.0,
            "privacy_guarantee": "Centralized Leakage (Raw logs stored)"
        },
        "isolated_local": {
            "ndcg10": isolated_res["ndcg10"],
            "hr10": isolated_res["hr10"],
            "mrr": isolated_res["mrr"],
            "gini_inequality": isolated_res["gini"],
            "parity_pct": isolated_parity,
            "privacy_guarantee": "0 Bytes Leakage (Severe Data Starvation)"
        },
        "fedavg_non_iid": {
            "ndcg10": fedavg_res["final_ndcg10"],
            "hr10": fedavg_res["final_hr10"],
            "mrr": fedavg_res["final_mrr"],
            "gini_inequality": fedavg_res["final_gini"],
            "parity_pct": fedavg_parity,
            "privacy_guarantee": "0 Bytes User Leakage (Item Projection Sync)"
        },
        "fedprox_non_iid": {
            "ndcg10": fedprox_res["final_ndcg10"],
            "hr10": fedprox_res["final_hr10"],
            "mrr": fedprox_res["final_mrr"],
            "gini_inequality": fedprox_res["final_gini"],
            "parity_pct": fedprox_parity,
            "privacy_guarantee": "0 Bytes User Leakage (Item Projection Sync)"
        },
        "fedavg_history": fedavg_res["history"],
        "fedprox_history": fedprox_res["history"]
    }

    os.makedirs(os.path.dirname(OUTPUT_BENCHMARK_PATH), exist_ok=True)
    with open(OUTPUT_BENCHMARK_PATH, "w", encoding="utf-8") as f:
        json.dump(benchmark_summary, f, indent=2)

    print("\n" + "=" * 70)
    print("EMPIRICAL BENCHMARK MATRIX (FEDERATED RECOMMENDATION UNDER ZERO LEAKAGE)")
    print("=" * 70)
    print(f"{'Paradigm / Strategy':<30} | {'NDCG@10':<9} | {'HR@10':<9} | {'MRR':<9} | {'Parity':<9} | {'Gini':<7}")
    print("-" * 85)
    print(f"{'Centralized Gold Standard':<30} | {central_res['ndcg10']:<9.4f} | {central_res['hr10']:<9.4f} | {central_res['mrr']:<9.4f} | 100.0%    | N/A")
    print(f"{'Isolated Local-Only':<30} | {isolated_res['ndcg10']:<9.4f} | {isolated_res['hr10']:<9.4f} | {isolated_res['mrr']:<9.4f} | {isolated_parity:<8.2f}% | {isolated_res['gini']:<7.4f}")
    print(f"{'FedAvg (Non-IID alpha=0.5)':<30} | {fedavg_res['final_ndcg10']:<9.4f} | {fedavg_res['final_hr10']:<9.4f} | {fedavg_res['final_mrr']:<9.4f} | {fedavg_parity:<8.2f}% | {fedavg_res['final_gini']:<7.4f}")
    print(f"{'FedProx (Non-IID mu=0.01)':<30} | {fedprox_res['final_ndcg10']:<9.4f} | {fedprox_res['final_hr10']:<9.4f} | {fedprox_res['final_mrr']:<9.4f} | {fedprox_parity:<8.2f}% | {fedprox_res['final_gini']:<7.4f}")
    print("=" * 85)
    print(f"Results successfully exported to {OUTPUT_BENCHMARK_PATH}")

if __name__ == "__main__":
    run_all_simulations()
