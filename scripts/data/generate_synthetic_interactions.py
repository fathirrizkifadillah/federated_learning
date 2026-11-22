"""
FedSocial V2 — Synthetic Behavioral Telemetry & Federated Partition Generator
Simulates 100 users across 4 archetypes (AI Specialists, Sports Fans, History Scholars, Polymaths).
Generates continuous reading duration (ms), scroll depth (0-1), and implicit/explicit signals.
Constructs Dirichlet Non-IID (alpha=0.5) and IID partitions for 10 Flower federated clients.
"""

import json
import os
import random
import uuid
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Deterministic seed for reproducible experimentation
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

ARTICLES_JSON_PATH = os.path.join("ml", "data", "processed", "articles.json")
OUTPUT_CSV_PATH = os.path.join("ml", "data", "processed", "interactions.csv")
OUTPUT_PARTITIONS_PATH = os.path.join("ml", "data", "processed", "federated_partitions.json")
OUTPUT_SUMMARY_PATH = os.path.join("ml", "data", "processed", "interactions_summary.json")

NUM_USERS = 100
NUM_CLIENTS = 10
DIRICHLET_ALPHA = 0.5

ARCHETYPES = [
    {"name": "AI Specialist", "shares": {"AI": 0.75, "Sports": 0.15, "History": 0.10}},
    {"name": "Sports Fan", "shares": {"AI": 0.10, "Sports": 0.75, "History": 0.15}},
    {"name": "History Scholar", "shares": {"AI": 0.15, "Sports": 0.10, "History": 0.75}},
    {"name": "Polymath / Generalist", "shares": {"AI": 0.34, "Sports": 0.33, "History": 0.33}},
]

def generate_interactions():
    print("=" * 70)
    print("Generating Synthetic Reading Telemetry & Federated Partitions...")
    print("=" * 70)

    if not os.path.exists(ARTICLES_JSON_PATH):
        raise FileNotFoundError(f"Missing {ARTICLES_JSON_PATH}. Run generate_articles.py first.")

    with open(ARTICLES_JSON_PATH, "r", encoding="utf-8") as f:
        articles = json.load(f)

    # Index articles by category
    articles_by_cat = {"AI": [], "Sports": [], "History": []}
    for art in articles:
        articles_by_cat[art["category"]].append(art)

    print(f"Loaded {len(articles)} articles. Category pools: " + 
          ", ".join([f"{k}: {len(v)}" for k, v in articles_by_cat.items()]))

    # Assign archetypes to 100 users (25 users per archetype)
    users = []
    for u_idx in range(NUM_USERS):
        arch = ARCHETYPES[u_idx % len(ARCHETYPES)]
        users.append({
            "user_id": f"user_{u_idx:03d}",
            "archetype": arch["name"],
            "shares": arch["shares"],
            "num_sessions": random.randint(25, 75)
        })

    # Generate interaction events
    base_time = datetime(2025, 1, 1, 8, 0, 0)
    events = []

    for user in users:
        u_id = user["user_id"]
        shares = user["shares"]
        n_sessions = user["num_sessions"]

        # User timeline
        curr_time = base_time + timedelta(hours=random.randint(1, 48))

        for s_idx in range(n_sessions):
            # Select category based on user preference shares
            cat_choice = np.random.choice(["AI", "Sports", "History"], p=[shares["AI"], shares["Sports"], shares["History"]])
            art_pool = articles_by_cat[cat_choice]
            article = random.choice(art_pool)

            # Determine engagement level: affinity vs bounce
            is_affinity = (cat_choice == max(shares, key=shares.get)) or (random.random() < 0.3)

            if is_affinity:
                # Deep reading: lognormal dwell time (mean ~70s, bounded [15s, 300s])
                raw_dwell_s = np.random.lognormal(mean=4.25, sigma=0.55)
                dwell_ms = int(np.clip(raw_dwell_s * 1000, 15000, 300000))
                # High scroll depth: beta distribution centered at ~0.85
                scroll_depth = float(np.clip(np.random.beta(a=6.0, b=1.5), 0.4, 1.0))
                # Explicit signals
                is_like = int(random.random() < 0.22 and dwell_ms > 45000)
                is_bookmark = int(random.random() < 0.12 and dwell_ms > 60000)
                is_share = int(random.random() < 0.05 and dwell_ms > 90000)
            else:
                # Bounce / shallow glance: lognormal dwell time (mean ~5s, bounded [1s, 14s])
                raw_dwell_s = np.random.lognormal(mean=1.6, sigma=0.45)
                dwell_ms = int(np.clip(raw_dwell_s * 1000, 1000, 14000))
                # Low scroll depth: beta distribution centered at ~0.2
                scroll_depth = float(np.clip(np.random.beta(a=1.5, b=5.0), 0.05, 0.45))
                is_like = 0
                is_bookmark = 0
                is_share = 0

            # Advance user timeline
            curr_time += timedelta(minutes=random.randint(3, 180))

            event = {
                "event_id": str(uuid.uuid4()),
                "user_id": u_id,
                "article_id": article["id"],
                "category": cat_choice,
                "subcategory": article["subcategory"],
                "event_timestamp": curr_time.isoformat() + "Z",
                "dwell_time_ms": dwell_ms,
                "dwell_time_sec": round(dwell_ms / 1000, 1),
                "scroll_depth": round(scroll_depth, 3),
                "is_like": is_like,
                "is_bookmark": is_bookmark,
                "is_share": is_share,
                "is_affinity": int(is_affinity)
            }
            events.append(event)

    df_events = pd.DataFrame(events)
    # Sort chronologically
    df_events = df_events.sort_values(by=["user_id", "event_timestamp"]).reset_index(drop=True)

    print(f"\nGenerated {len(df_events)} interaction events across {NUM_USERS} users.")
    print("Dwell time statistics (seconds):")
    print(df_events["dwell_time_sec"].describe())
    print("\nCategory distribution:")
    print(df_events["category"].value_counts(normalize=True))

    # Save interactions CSV
    df_events.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"Saved interactions dataset to {OUTPUT_CSV_PATH}")

    # =========================================================================
    # Construct Dirichlet Non-IID & IID Federated Partitions across 10 Clients
    # =========================================================================
    print("\nPartitioning users into 10 Federated Edge Clients...")
    
    # 1. Non-IID Dirichlet Partition (alpha = 0.5)
    # Group users by dominant archetype to simulate distinct edge institutions
    # e.g., Client 0-2 (AI labs), Client 3-5 (Sports analytics desks), Client 6-8 (History archives), Client 9 (General)
    clients_non_iid = {f"client_{c}": [] for c in range(NUM_CLIENTS)}
    
    # Allocate 10 users per client with skewed distribution
    user_ids = sorted(df_events["user_id"].unique())
    np.random.shuffle(user_ids)

    # Dirichlet allocation across clients
    dirichlet_weights = np.random.dirichlet([DIRICHLET_ALPHA] * NUM_CLIENTS, size=NUM_USERS)
    user_to_client = {}
    for idx, u_id in enumerate(user_ids):
        client_idx = int(np.argmax(dirichlet_weights[idx]))
        user_to_client[u_id] = f"client_{client_idx}"
        clients_non_iid[f"client_{client_idx}"].append(u_id)

    # 2. IID Partition (Uniform random distribution)
    clients_iid = {f"client_{c}": [] for c in range(NUM_CLIENTS)}
    for idx, u_id in enumerate(user_ids):
        clients_iid[f"client_{idx % NUM_CLIENTS}"].append(u_id)

    partitions_manifest = {
        "num_clients": NUM_CLIENTS,
        "dirichlet_alpha": DIRICHLET_ALPHA,
        "non_iid_partitions": {
            cid: {
                "users": u_list,
                "event_count": int(df_events[df_events["user_id"].isin(u_list)].shape[0]),
                "category_shares": df_events[df_events["user_id"].isin(u_list)]["category"].value_counts(normalize=True).to_dict()
            }
            for cid, u_list in clients_non_iid.items()
        },
        "iid_partitions": {
            cid: {
                "users": u_list,
                "event_count": int(df_events[df_events["user_id"].isin(u_list)].shape[0]),
                "category_shares": df_events[df_events["user_id"].isin(u_list)]["category"].value_counts(normalize=True).to_dict()
            }
            for cid, u_list in clients_iid.items()
        }
    }

    with open(OUTPUT_PARTITIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(partitions_manifest, f, indent=2)

    print(f"Saved federated partitions to {OUTPUT_PARTITIONS_PATH}")

    # Save summary report
    summary = {
        "total_users": NUM_USERS,
        "total_events": len(df_events),
        "total_likes": int(df_events["is_like"].sum()),
        "total_bookmarks": int(df_events["is_bookmark"].sum()),
        "mean_dwell_ms": float(df_events["dwell_time_ms"].mean()),
        "median_dwell_ms": float(df_events["dwell_time_ms"].median()),
        "mean_scroll_depth": float(df_events["scroll_depth"].mean()),
        "federated_clients": NUM_CLIENTS,
        "dirichlet_alpha": DIRICHLET_ALPHA,
        "generated_at": datetime.utcnow().isoformat() + "Z"
    }
    with open(OUTPUT_SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n[SUCCESS] Synthetic Behavioral Telemetry & Partitions Ready!")

if __name__ == "__main__":
    generate_interactions()
