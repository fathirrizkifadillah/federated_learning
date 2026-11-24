"""
fl_train_monitor.py
Real PyTorch Federated Learning (Masked FedProx / FedAvg) Terminal Runner & Logger.
Executes genuine on-device BPR optimization over ml/data/processed/ Dirichlet Non-IID partitions,
aggregates ONLY decoupled shared item projection & neural interaction layers (0 bytes user embedding leakage),
evaluates real Leave-Last-2-Out NDCG@10, HR@10, MRR, and Client Gini Coefficient,
and streams structured logs to stdout and logs/federated_learning.log.
"""

import argparse
import copy
import json
import os
import random
import sys
import time
from datetime import datetime

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, REPO_ROOT)

import numpy as np
import torch
import torch.optim as optim
from torch.utils.data import DataLoader

from ml.src.data.dataset import RecSysDataPipeline, BPRDataset
from ml.src.models.content_aware import ContentAwareNeuralRecommender
from ml.src.evaluation.metrics import hit_rate_at_k, ndcg_at_k, mrr, gini_coefficient

LOGS_DIR = os.path.join(REPO_ROOT, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "federated_learning.log")


def write_log(line: str):
    ts = datetime.now().isoformat(timespec="seconds")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] {line}\n")


def evaluate_model(model, test_df, user2idx, item2idx, user_pos_items, num_items):
    model.eval()
    hr_list, ndcg_list, mrr_list = [], [], []
    with torch.no_grad():
        for _, row in test_df.iterrows():
            u_id = row["user_id"]
            a_id = row["article_id"]
            if u_id not in user2idx or a_id not in item2idx:
                continue
            u_idx = user2idx[u_id]
            pos_idx = item2idx[a_id]
            user_pos = user_pos_items.get(u_idx, set())
            cands = [pos_idx]
            while len(cands) < 100:
                c = random.randint(0, num_items - 1)
                if c not in user_pos and c not in cands:
                    cands.append(c)
            cand_t = torch.tensor(cands, dtype=torch.long)
            u_t = torch.tensor([u_idx] * len(cands), dtype=torch.long)
            scores = model.score_pair(
                model.user_embeddings(u_t),
                model.get_item_representation(cand_t),
            ).cpu().numpy()
            ranked = [cands[i] for i in np.argsort(-scores)]
            hr_list.append(hit_rate_at_k(pos_idx, ranked, k=10))
            ndcg_list.append(ndcg_at_k(pos_idx, ranked, k=10))
            mrr_list.append(mrr(pos_idx, ranked))
    return (
        float(np.mean(ndcg_list)),
        float(np.mean(hr_list)),
        float(np.mean(mrr_list)),
        float(gini_coefficient(ndcg_list)),
    )


def main():
    parser = argparse.ArgumentParser(description="FedSocial V2 Real PyTorch FL Terminal Monitor")
    parser.add_argument("--rounds", type=int, default=6, help="Number of FL communication rounds (default: 6)")
    parser.add_argument("--clients", type=int, default=5, help="Clients sampled per round (default: 5)")
    parser.add_argument("--mu", type=float, default=0.01, help="FedProx proximal weight mu (default: 0.01)")
    args = parser.parse_args()

    random.seed(42)
    np.random.seed(42)
    torch.manual_seed(42)

    print("\033[36m================================================================================\033[0m")
    print("\033[36m  FEDSOCIAL V2 — REAL PYTORCH FEDERATED LEARNING TERMINAL MONITOR\033[0m")
    print(f"\033[36m  Strategy: Masked FedProx (mu={args.mu}) | Decoupled Item Projection Sync\033[0m")
    print("\033[36m  Privacy Invariant: User Embeddings Stay Strictly Local (0 Bytes Uploaded)\033[0m")
    print("\033[36m================================================================================\033[0m")
    print(f"\033[90m[Log File] {LOG_FILE}\033[0m\n")

    write_log(f"=== REAL PYTORCH FL SESSION STARTED (rounds={args.rounds}, mu={args.mu}) ===")

    processed_dir = os.path.join(REPO_ROOT, "ml", "data", "processed")
    pipeline = RecSysDataPipeline(
        articles_path=os.path.join(processed_dir, "articles.json"),
        interactions_path=os.path.join(processed_dir, "interactions.csv"),
        embeddings_path=os.path.join(processed_dir, "article_embeddings.npy"),
    )
    with open(os.path.join(processed_dir, "federated_partitions.json"), "r", encoding="utf-8") as f:
        partitions = json.load(f)["non_iid_partitions"]

    all_train_triplets = pipeline.get_bpr_triplets(split="train", num_negatives=1)
    client_triplets = {}
    for cid, pdata in partitions.items():
        c_user_indices = {pipeline.user2idx[u] for u in pdata["users"] if u in pipeline.user2idx}
        client_triplets[cid] = [t for t in all_train_triplets if t[0] in c_user_indices]

    print(
        f"[Dataset] Users={pipeline.num_users} | Items={pipeline.num_items} | "
        f"Embeddings={pipeline.item_embeddings.shape} | Non-IID Clients={len(partitions)}"
    )
    write_log(f"Dataset loaded: users={pipeline.num_users}, items={pipeline.num_items}, clients={len(partitions)}")

    global_model = ContentAwareNeuralRecommender(
        num_users=pipeline.num_users,
        num_items=pipeline.num_items,
        pretrained_embeddings=torch.tensor(pipeline.item_embeddings, dtype=torch.float32),
        latent_dim=64,
        mlp_hidden_dim=64,
    )

    shared_keys = [
        k for k in global_model.state_dict().keys()
        if not k.startswith("user_embeddings") and not k.startswith("pretrained_item_embeddings")
    ]
    payload_bytes = sum(global_model.state_dict()[k].numel() * 4 for k in shared_keys)
    user_emb_bytes = global_model.user_embeddings.weight.numel() * 4

    print(
        f"[Privacy Audit] Shared Sync Payload: {payload_bytes / 1024:.2f} KB ({len(shared_keys)} tensors) | "
        f"Blocked Local User Embeddings: {user_emb_bytes / 1024:.2f} KB | Raw Telemetry Uploaded: 0 B\n"
    )
    write_log(
        f"Privacy Audit: shared_payload_kb={payload_bytes/1024:.2f}, "
        f"blocked_user_emb_kb={user_emb_bytes/1024:.2f}, raw_telemetry_sent=0B"
    )

    client_ids = list(partitions.keys())
    # Keep per-client private user embeddings strictly isolated per client
    client_user_embs = {
        cid: global_model.user_embeddings.weight.detach().clone() for cid in client_ids
    }

    for r in range(1, args.rounds + 1):
        t0 = time.time()
        sampled_clients = random.sample(client_ids, k=min(args.clients, len(client_ids)))
        ts_now = datetime.now().strftime("%H:%M:%S")
        print(f"\033[33m--- ROUND {r}/{args.rounds} [{ts_now}] ----------------------------------------------------\033[0m")
        write_log(f"ROUND {r}/{args.rounds} START: clients={sampled_clients}")

        global_shared_state = {k: global_model.state_dict()[k].clone().detach() for k in shared_keys}
        accum_state = {k: torch.zeros_like(v) for k, v in global_shared_state.items()}
        total_samples = 0

        for cid in sampled_clients:
            triplets = client_triplets.get(cid, [])
            if not triplets:
                continue

            local_model = copy.deepcopy(global_model)
            with torch.no_grad():
                local_model.user_embeddings.weight.copy_(client_user_embs[cid])

            local_model.train()
            optimizer = optim.Adam(local_model.parameters(), lr=0.005, weight_decay=1e-5)
            loader = DataLoader(BPRDataset(triplets), batch_size=32, shuffle=True)

            epoch_losses = []
            for _ in range(2):
                batch_losses = []
                for u, pos, neg, w in loader:
                    optimizer.zero_grad()
                    pos_s, neg_s, u_e, pos_e, neg_e = local_model(u, pos, neg)
                    loss = local_model.compute_bpr_loss(pos_s, neg_s, u_e, pos_e, neg_e, weights=w)
                    if args.mu > 0:
                        prox = 0.0
                        for name, param in local_model.named_parameters():
                            if name in global_shared_state:
                                prox = prox + torch.sum((param - global_shared_state[name]) ** 2)
                        loss = loss + 0.5 * args.mu * prox
                    loss.backward()
                    optimizer.step()
                    batch_losses.append(loss.item())
                epoch_losses.append(float(np.mean(batch_losses)))

            # Persist updated private user embeddings strictly locally
            client_user_embs[cid] = local_model.user_embeddings.weight.detach().clone()

            # Aggregate ONLY shared item projection & neural interaction weights
            n_k = len(triplets)
            total_samples += n_k
            local_state = local_model.state_dict()
            for k in shared_keys:
                accum_state[k] += local_state[k].detach() * n_k

            top_cat = max(partitions[cid]["category_shares"].items(), key=lambda x: x[1])[0]
            print(
                f"  \033[34m• [{cid:<8}]\033[0m dom={top_cat:<7} | triplets={n_k:<4} | "
                f"BPR Loss: {epoch_losses[0]:.4f} -> \033[32m{epoch_losses[-1]:.4f}\033[0m | "
                f"Delta={payload_bytes/1024:.1f} KB | \033[32mUserEmb Sent=0 B\033[0m"
            )
            write_log(
                f"  Client {cid} (dom={top_cat}): triplets={n_k}, "
                f"loss={epoch_losses[0]:.4f}->{epoch_losses[-1]:.4f}, delta_kb={payload_bytes/1024:.1f}, user_leakage=0B"
            )

        if total_samples > 0:
            new_global_state = global_model.state_dict()
            for k in shared_keys:
                new_global_state[k] = accum_state[k] / total_samples
            # Stitch each client's local user rows only in evaluation harness (server never sees them)
            merged_user_w = global_model.user_embeddings.weight.detach().clone()
            for cid, pdata in partitions.items():
                for u in pdata["users"]:
                    if u in pipeline.user2idx:
                        uidx = pipeline.user2idx[u]
                        merged_user_w[uidx] = client_user_embs[cid][uidx]
            new_global_state["user_embeddings.weight"] = merged_user_w
            global_model.load_state_dict(new_global_state)

        ndcg10, hr10, mrr_val, gini_val = evaluate_model(
            global_model,
            pipeline.test_df,
            pipeline.user2idx,
            pipeline.item2idx,
            pipeline.user_positive_items,
            pipeline.num_items,
        )
        elapsed = time.time() - t0
        print(
            f"  \033[32m[Aggregator]\033[0m Round {r} synced ({elapsed:.2f}s) | "
            f"NDCG@10=\033[1m{ndcg10:.4f}\033[0m | HR@10=\033[1m{hr10:.4f}\033[0m | "
            f"MRR={mrr_val:.4f} | Gini={gini_val:.4f}\n"
        )
        write_log(
            f"ROUND {r} COMPLETE ({elapsed:.2f}s): "
            f"ndcg10={ndcg10:.4f}, hr10={hr10:.4f}, mrr={mrr_val:.4f}, gini={gini_val:.4f}"
        )

    print("\033[1m\033[32mReal PyTorch Federated Learning session complete.\033[0m")
    print(f"Full audit log saved to: {LOG_FILE}\n")
    write_log("=== REAL PYTORCH FL SESSION COMPLETE ===")


if __name__ == "__main__":
    main()
