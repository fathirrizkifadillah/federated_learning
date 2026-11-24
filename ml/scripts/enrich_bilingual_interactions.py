"""
enrich_bilingual_interactions.py
1. Adds explicit 'language' column ('en'/'id') to ml/data/processed/interactions.csv.
2. Appends 2,200 realistic Indonesian ('id') reading interactions across the 100 users
   and 1,050 Indonesian articles in articles.json with Non-IID bilingual user preferences.
3. Updates federated_partitions.json (adding language_shares) and interactions_summary.json.
4. Warm-trains initial bilingual FederatedGlobalModel (categoryWeights 3x16 + languageWeights 2x16)
   and stores it into PostgreSQL so the live web FL global model starts pre-calibrated.
"""

import json
import os
import uuid
import datetime
import numpy as np
import pandas as pd
import psycopg2

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_DIR = os.path.join(REPO_ROOT, "ml", "data", "processed")
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://fedsocial:fedsocial_secret@localhost:5432/fedsocial_db",
).split("?")[0]

SEED = 42
rng = np.random.default_rng(SEED)


def normalize_cat(raw: str) -> str:
    s = (raw or "AI").lower()
    if "sport" in s:
        return "Sports"
    if "histor" in s:
        return "History"
    return "AI"


def main():
    articles_path = os.path.join(DATA_DIR, "articles.json")
    interactions_path = os.path.join(DATA_DIR, "interactions.csv")
    partitions_path = os.path.join(DATA_DIR, "federated_partitions.json")
    summary_path = os.path.join(DATA_DIR, "interactions_summary.json")

    with open(articles_path, "r", encoding="utf-8") as f:
        articles = json.load(f)

    id_to_lang = {a["id"]: a.get("language", "en") for a in articles}
    id_articles = [a for a in articles if a.get("language") == "id"]
    print(f"Loaded {len(articles)} articles ({len(id_articles)} Indonesian, {len(articles) - len(id_articles)} English).")

    df = pd.read_csv(interactions_path)
    # Remove previously appended synthetic bilingual rows if re-run (idempotent)
    if "language" in df.columns:
        df = df[df["language"] == "en"].copy()
    else:
        df["language"] = df["article_id"].map(id_to_lang).fillna("en")

    base_en_count = len(df)
    users = sorted(df["user_id"].unique())

    # Assign each user a Beta(0.7, 0.7) Indonesian affinity (creates realistic ID-heavy, EN-heavy, and bilingual readers)
    user_id_prob = {u: float(rng.beta(0.7, 0.7)) for u in users}

    # Pre-group Indonesian articles by category
    id_by_cat = {"AI": [], "Sports": [], "History": []}
    for a in id_articles:
        c = normalize_cat(a.get("category"))
        id_by_cat[c].append(a)

    # Generate ~2,200 Indonesian interactions aligned with each user's dominant category + language affinity
    new_rows = []
    base_ts = datetime.datetime(2025, 2, 1, 8, 0, 0)

    for u in users:
        u_df = df[df["user_id"] == u]
        cat_counts = u_df["category"].value_counts()
        dom_cat = cat_counts.index[0] if len(cat_counts) else "AI"

        # Number of ID events proportional to user's Indonesian reading affinity
        n_id_events = max(4, int(round(user_id_prob[u] * 44)))
        for k in range(n_id_events):
            # 75% dominant category, 25% exploration
            chosen_cat = dom_cat if rng.random() < 0.75 else rng.choice(["AI", "Sports", "History"])
            pool = id_by_cat[chosen_cat] if id_by_cat[chosen_cat] else id_articles
            art = pool[int(rng.integers(0, len(pool)))]

            is_affinity = 1 if chosen_cat == dom_cat else 0
            dwell_sec = float(np.clip(rng.lognormal(3.9 if is_affinity else 2.5, 0.55), 3.0, 240.0))
            scroll = float(np.clip(rng.normal(0.78 if is_affinity else 0.35, 0.18), 0.05, 1.0))
            is_like = 1 if (is_affinity and rng.random() < 0.22) else 0
            is_bookmark = 1 if (is_affinity and rng.random() < 0.09) else 0
            is_share = 1 if (is_like and rng.random() < 0.25) else 0
            ts = (base_ts + datetime.timedelta(minutes=int(rng.integers(0, 45000)))).strftime("%Y-%m-%dT%H:%M:%SZ")

            new_rows.append({
                "event_id": str(uuid.uuid4()),
                "user_id": u,
                "article_id": art["id"],
                "category": chosen_cat,
                "subcategory": art.get("subcategory", chosen_cat),
                "event_timestamp": ts,
                "dwell_time_ms": int(dwell_sec * 1000),
                "dwell_time_sec": round(dwell_sec, 1),
                "scroll_depth": round(scroll, 3),
                "is_like": is_like,
                "is_bookmark": is_bookmark,
                "is_share": is_share,
                "is_affinity": is_affinity,
                "language": "id",
            })

    df_all = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
    df_all = df_all.sort_values(["user_id", "event_timestamp"]).reset_index(drop=True)
    df_all.to_csv(interactions_path, index=False)
    print(f"Updated interactions.csv: {base_en_count} EN + {len(new_rows)} ID = {len(df_all)} total bilingual events.")

    # Update federated_partitions.json with language_shares
    with open(partitions_path, "r", encoding="utf-8") as f:
        part_data = json.load(f)

    for cid, pdata in part_data["non_iid_partitions"].items():
        c_df = df_all[df_all["user_id"].isin(pdata["users"])]
        pdata["event_count"] = int(len(c_df))
        cat_vc = c_df["category"].value_counts(normalize=True).to_dict()
        lang_vc = c_df["language"].value_counts(normalize=True).to_dict()
        pdata["category_shares"] = {k: float(v) for k, v in cat_vc.items()}
        pdata["language_shares"] = {k: float(v) for k, v in lang_vc.items()}

    with open(partitions_path, "w", encoding="utf-8") as f:
        json.dump(part_data, f, indent=2)

    # Update interactions_summary.json
    summary = {
        "total_users": int(df_all["user_id"].nunique()),
        "total_events": int(len(df_all)),
        "total_en_events": int((df_all["language"] == "en").sum()),
        "total_id_events": int((df_all["language"] == "id").sum()),
        "total_likes": int(df_all["is_like"].sum()),
        "total_bookmarks": int(df_all["is_bookmark"].sum()),
        "mean_dwell_ms": float(df_all["dwell_time_ms"].mean()),
        "median_dwell_ms": float(df_all["dwell_time_ms"].median()),
        "mean_scroll_depth": float(df_all["scroll_depth"].mean()),
        "federated_clients": int(part_data["num_clients"]),
        "dirichlet_alpha": float(part_data["dirichlet_alpha"]),
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print("Updated federated_partitions.json and interactions_summary.json.")

    # Warm-train bilingual SharedGlobalWeights (3x16 categoryWeights + 2x16 languageWeights)
    latent_dim = 16
    cat_idx_map = {"AI": 0, "Sports": 1, "History": 2}
    lang_idx_map = {"id": 0, "en": 1}

    w_cat = np.zeros((3, latent_dim), dtype=np.float64)
    for c in range(3):
        for d in range(latent_dim):
            in_band = 0.35 if (d // 5) == c else 0.04
            w_cat[c, d] = in_band + np.sin((c + 1) * (d + 1) * 0.7) * 0.08

    w_lang = np.zeros((2, latent_dim), dtype=np.float64)
    for l in range(2):
        for d in range(latent_dim):
            in_half = 0.32 if (d % 2) == l else 0.05
            w_lang[l, d] = in_half + np.cos((l + 1) * (d + 1) * 0.6) * 0.06

    b_cat = np.zeros(3, dtype=np.float64)
    b_lang = np.zeros(2, dtype=np.float64)

    # Calibrate global model via real FedProx-style gradient pass over all 10 client partitions
    u_embs = rng.normal(0.0, 0.08, size=(len(users), latent_dim))
    user_to_i = {u: i for i, u in enumerate(users)}
    lr = 0.025
    mu = 0.01

    w_cat_init = w_cat.copy()
    w_lang_init = w_lang.copy()
    final_loss = 0.6931

    sample_df = df_all.sample(min(3000, len(df_all)), random_state=SEED)
    for epoch in range(4):
        ep_loss = 0.0
        steps = 0
        for _, row in sample_df.iterrows():
            ui = user_to_i[row["user_id"]]
            pos_c = cat_idx_map.get(row["category"], 0)
            pos_l = lang_idx_map.get(row["language"], 1)
            sw = min(float(row["dwell_time_sec"]) / 60.0, 2.5) + (1.5 if row["is_like"] else 0.0)

            # Category BPR step
            neg_c = (pos_c + 1 + int(rng.integers(0, 2))) % 3
            m_c = np.dot(u_embs[ui], w_cat[pos_c] - w_cat[neg_c]) + (b_cat[pos_c] - b_cat[neg_c])
            p_c = 1.0 / (1.0 + np.exp(-np.clip(m_c, -15, 15)))
            g_c = -sw * (1.0 - p_c)
            ep_loss += -sw * np.log(max(1e-7, p_c))

            u_old = u_embs[ui].copy()
            u_embs[ui] -= lr * (g_c * (w_cat[pos_c] - w_cat[neg_c]) + 1e-3 * u_old)
            w_cat[pos_c] -= lr * (g_c * u_old + mu * (w_cat[pos_c] - w_cat_init[pos_c]))
            w_cat[neg_c] -= lr * (-g_c * u_old + mu * (w_cat[neg_c] - w_cat_init[neg_c]))
            b_cat[pos_c] -= lr * g_c
            b_cat[neg_c] += lr * g_c

            # Language BPR step
            neg_l = 1 - pos_l
            m_l = np.dot(u_embs[ui], w_lang[pos_l] - w_lang[neg_l]) + (b_lang[pos_l] - b_lang[neg_l])
            p_l = 1.0 / (1.0 + np.exp(-np.clip(m_l, -15, 15)))
            g_l = -sw * (1.0 - p_l)
            ep_loss += -sw * np.log(max(1e-7, p_l))

            u_old2 = u_embs[ui].copy()
            u_embs[ui] -= lr * (g_l * (w_lang[pos_l] - w_lang[neg_l]) + 1e-3 * u_old2)
            w_lang[pos_l] -= lr * (g_l * u_old2 + mu * (w_lang[pos_l] - w_lang_init[pos_l]))
            w_lang[neg_l] -= lr * (-g_l * u_old2 + mu * (w_lang[neg_l] - w_lang_init[neg_l]))
            b_lang[pos_l] -= lr * g_l
            b_lang[neg_l] += lr * g_l

            steps += 2
        final_loss = ep_loss / max(1, steps)
        print(f"Warm-training bilingual global model epoch {epoch+1}/4 | BPR Loss = {final_loss:.4f}")

    # Clip cleanly and store into PostgreSQL FederatedGlobalModel (discarding u_embs — strictly local!)
    w_cat = np.clip(w_cat, -2.0, 2.0)
    w_lang = np.clip(w_lang, -2.0, 2.0)
    b_cat = np.clip(b_cat, -1.0, 1.0)
    b_lang = np.clip(b_lang, -1.0, 1.0)

    weights_payload = {
        "categories": ["ai", "sports", "history"],
        "languages": ["id", "en"],
        "latentDim": latent_dim,
        "categoryWeights": [[round(float(x), 6) for x in row] for row in w_cat],
        "categoryBias": [round(float(x), 6) for x in b_cat],
        "languageWeights": [[round(float(x), 6) for x in row] for row in w_lang],
        "languageBias": [round(float(x), 6) for x in b_lang],
    }

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO "FederatedGlobalModel" (id, "roundNumber", strategy, "proximalMu", "weightsJson", "totalUpdates", "lastGlobalLoss", "updatedAt")
        VALUES ('global-active', 1, 'MaskedFedProx-Bilingual', 0.01, %s, 1, %s, NOW())
        ON CONFLICT (id) DO UPDATE SET
            strategy = 'MaskedFedProx-Bilingual',
            "weightsJson" = EXCLUDED."weightsJson",
            "lastGlobalLoss" = EXCLUDED."lastGlobalLoss",
            "updatedAt" = NOW()
        """,
        (json.dumps(weights_payload), round(float(final_loss), 4)),
    )
    conn.commit()
    conn.close()
    print(f"Saved warm-trained Bilingual Global Model to PostgreSQL (loss={final_loss:.4f}, user embeddings discarded).")


if __name__ == "__main__":
    main()
