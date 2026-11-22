# Legacy Repository Audit Report — FedSocial V1 to V2 Migration

**Author**: Senior Architecture & Migration Engineering Team  
**Date**: November 22, 2026  
**Status**: APPROVED / COMPLETED  
**Source Branch**: `main` (Preserved intact at commit `7c95fae`)  
**Target Migration Branch**: `rebuild/fedsocial-v2`  

---

## 1. Executive Summary

This document presents a comprehensive, forensic audit of the legacy repository (`c:\CODING\federated_learning`) prior to executing the greenfield rebuild for **FedSocial V2**. The legacy project was developed as a specialized academic demonstration of decentralized collaborative filtering on an Amazon Reviews (Electronics 3-Core) dataset. While it achieved high mathematical rigor and institutional benchmark parity (NDCG@10 = 0.0860), it lacks the complete software architecture required for a production-grade personalized social/editorial content platform.

FedSocial V2 represents a fundamental conceptual and architectural transformation: migrating from a single-machine static CSV simulation with a Streamlit interface to an integrated full-stack monorepo featuring an editorial web experience (Next.js/React), backend API (Express/Prisma/PostgreSQL), client-side privacy-first behavioral tracking (IndexedDB/SQLite), and an advanced neural recommendation engine with Flower-based Federated Learning across multimodal article embeddings.

---

## 2. Existing Architecture & Directory Structure

The legacy repository consists of a flat Python-centric structure:

```
.
├── app.py                                # Streamlit dashboard (5 tabs, UI prototype)
├── findings.md                           # Markdown summary of Amazon Electronics benchmarks
├── main.ipynb                            # 8-chapter Jupyter research notebook (94 cells, 2.88 MB)
├── progress.md                           # Upgrade tracking ledger
├── README.md                             # Institutional documentation for Amazon RecSys
├── recsys_core.py                        # Single source of truth module (BPR, metrics, payload math)
├── requirements.txt                      # Partial pip package manifest
├── task_plan.md                          # Historical task plan
├── client/
│   └── flwr_client.py                    # Flower NumPyClient for local MF-BPR training
├── data/
│   ├── partitions/                       # Static CSV splits (centralized, IID, non-IID Dirichlet)
│   ├── processed/                        # Cleaned CSV (electronics_50k_clean.csv, 4.4 MB)
│   ├── quarantine/                       # Quarantined JSONL records (129 duplicate rows)
│   ├── raw/                              # Raw Amazon JSONL (electronics_50k_raw.jsonl, 32.8 MB)
│   └── reports/                          # Audit reports and predictions CSVs
├── docs/
│   └── data_dictionary/                  # 4 bilingual data dictionary markdown files
├── evaluation/
│   ├── audit_reality_check.py            # Reality check verification script
│   └── metrics.py                        # Information retrieval evaluation metrics
├── experiments/
│   ├── run_fl_experiments.py             # Flower simulation runner script
│   ├── train_centralized.py              # Centralized MF-BPR baseline trainer
│   └── train_local_only.py               # Isolated local client baseline trainer
├── models/
│   ├── baselines.py                      # Random and Global Popularity baselines
│   └── mf_bpr.py                         # PyTorch MatrixFactorizationBPR model class
├── plots/                                # 12 publication-grade 300 DPI PNG figures
├── preprocessing/                        # Data cleaning, 3-core pruning, and Dirichlet sharding
├── results/                              # Checkpoints (.pt) and metric JSON files
├── scripts/                              # Plot generator and SymPy verification scripts
├── server/
│   └── flwr_server.py                    # Flower server with custom aggregation
├── strategies/
│   ├── fedprox.py                        # FedProx aggregation strategy class
│   └── masked_fedavg.py                  # Masked FedAvg aggregation strategy class
└── tests/
    └── test_recsys_core.py               # Pytest suite (13 passing tests)
```

---

## 3. Existing Technologies & Manifest Inspection

| Layer | Existing Technology | Current State & Limitations |
| :--- | :--- | :--- |
| **Frontend** | Streamlit 1.57 (`app.py`) | Monolithic Python dashboard. No component hierarchy, no responsive mobile/desktop editorial layout, no client-side DOM manipulation, unsuitable for consumer editorial reading. |
| **Backend API** | None (Direct script invocation) | No REST API, no session management, no authentication, no client pairing endpoints, no routing. |
| **Database** | Static CSV & JSON files | No relational database, no indexes, no constraints, no ACID transactions. Vulnerable to corruption, concurrency issues, and unscalable. |
| **Local Client Storage**| In-memory PyTorch / disk CSV | No IndexedDB browser storage, no SQLite local agent daemon. |
| **Machine Learning** | PyTorch 2.15, Flower 1.43, Scikit-Learn | Standard matrix factorization (ID-based embedding lookup). Lacks text encoders, content representations, or hybrid neural architectures. |
| **Dataset** | Amazon Reviews 2023 (Electronics) | E-commerce purchase ratings (1–5 stars) converted to implicit binary feedback. Does not represent editorial articles, reading time, or text content. |
| **Package Manifest** | `requirements.txt` (Minimal 4 packages) | Incomplete; omits `sympy`, `scikit-learn`, `matplotlib`, `seaborn`, `pytest`, `ipykernel`, leading to environment drift. |

---

## 4. Component Inventory & Classification

### 4.1. Reusable Implementation (Preserve & Adapt)
1. **Mathematical Loss & IR Ranking Metrics (`recsys_core.py`)**:
   - `compute_bpr_loss`, `compute_fedprox_penalty`, `compute_ndcg_at_k`, `compute_recall_at_k`, `compute_hit_at_k`, `compute_mrr`, and `compute_gini_coefficient`.
   - Verified symbolically via SymPy and 100% covered by unit tests.
   - *Target Location in V2*: `ml/src/evaluation/metrics.py` and `ml/src/models/losses.py`.
2. **Federated Aggregation Strategies (`strategies/masked_fedavg.py`, `strategies/fedprox.py`)**:
   - Weighted parameter aggregation with boolean item masking to prevent unobserved parameter overwriting.
   - *Target Location in V2*: `ml/src/federated/strategies/`.
3. **Flower Client Base (`client/flwr_client.py`)**:
   - Parameter serialization (`get_parameters`, `set_parameters`), PyTorch local epoch training loops, and Flower NumPyClient interface.
   - *Target Location in V2*: `clients/local-agent/training/flower_client.py` and `ml/src/federated/client.py`.
4. **Pytest Testing Pattern (`tests/test_recsys_core.py`)**:
   - Parameterized tests and numerical assertions for ranking metrics.
   - *Target Location in V2*: `ml/tests/test_metrics.py`.

### 4.2. Components Requiring Replacement
1. **Streamlit UI (`app.py`)** $\to$ Replace with **Next.js 14+ / React / TypeScript / Tailwind CSS** editorial web application (`apps/web/`).
2. **Static CSV Storage (`data/partitions/`)** $\to$ Replace with **PostgreSQL 17 + Prisma ORM** (`apps/api/prisma/schema.prisma`) for public content and catalog metadata.
3. **No-Backend Execution** $\to$ Replace with **Express + TypeScript REST API** (`apps/api/`) supporting JWT authentication, article queries, and pseudonymous client coordination.
4. **ID-Only Collaborative Filtering (`models/mf_bpr.py`)** $\to$ Expand into **Content-Aware Neural Recommender** using `sentence-transformers/all-MiniLM-L6-v2` frozen text embeddings, article metadata projections, and neural scoring networks.
5. **Amazon Electronics Dataset** $\to$ Replace with **FedSocial Custom Content Dataset (3,000 articles)** across AI, Sports, and History, complemented by **MIND** (Microsoft News Dataset) as benchmark and **KuaiRec** as interaction reference.

### 4.3. Obsolete Code
- `scripts/build_notebook.py`: Monolithic notebook generation script tailored to Amazon Electronics; obsolete for V2.
- `preprocessing/clean_cleanroom.py`, `preprocessing/ingest_stream.py`: Amazon-specific JSONL stream ingestion routines.
- `app.py`: Replaced entirely by `apps/web/`.

---

## 5. Technical Problems & Architectural Debt Identified

1. **Monolithic Data Loading**:
   - `app.py` and `main.ipynb` load all client CSV files and the 3.3 MB `eval_negatives.json` directly into RAM at startup, which is inefficient and unscalable.
2. **Absence of Data Contracts**:
   - No TypeScript interfaces or JSON schema validation existed between data generation, model inference, and frontend display. Data types were loosely inferred by Pandas.
3. **Synthetic Simplification of Temporal Signals**:
   - In legacy RecSys, timestamps were static integers from Amazon reviews. There was no real-time duration tracking (e.g., active reading duration, scroll depth, idle tab detection).
4. **Lack of Identity & Pseudonymity Management**:
   - Klients were simply hardcoded integers (`0` to `4`). There was no secure device pairing, token authorization, or cryptographic pseudonymity.

---

## 6. Migration Risks & Mitigation Strategy

| Risk Category | Specific Risk | Technical Mitigation |
| :--- | :--- | :--- |
| **Data Loss / Destructive Overwrites** | Accidentally overwriting legacy Amazon data or experiments during monorepo restructuring. | Switched to dedicated branch `rebuild/fedsocial-v2`. Legacy files remain archived in Git history at commit `7c95fae`. |
| **Runtime Version Incompatibility** | Python 3.11 vs PyTorch 2.15 vs Flower 1.43 vs Node.js 24 compatibility issues. | Node.js v24.15.0 and Python 3.11.9 are verified installed. Dependencies will be pinned strictly in `package.json` and `ml/requirements.txt`. |
| **Database Connection & Drift** | PostgreSQL service availability or schema synchronization failure. | Native PostgreSQL 17 is verified running (`postgresql-x64-17`). Prisma migrations will manage all schema versions with zero manual SQL drift. |
| **Privacy Scope Creep** | Unintentionally storing raw user reading durations or click histories in central PostgreSQL. | Enforce strict Privacy by Design (GDPR Art. 25). Raw behavioral event schemas are isolated exclusively to IndexedDB / client-side SQLite. |

---

## 7. Recommended Greenfield Monorepo Architecture

The monorepo layout will follow the target specification:

```
fedsocial/
├── apps/
│   ├── web/                              # Next.js, React, Tailwind, Lucide/Radix, IndexedDB
│   └── api/                              # Node.js, Express, TypeScript, Prisma ORM, JWT Auth
├── ml/
│   ├── notebooks/                        # 19 structured Jupyter notebooks (00 to 18)
│   ├── data/                             # raw, external (MIND, KuaiRec), synthetic, processed
│   ├── src/                              # data, features, models, training, evaluation, federated
│   ├── artifacts/                        # Saved models (.pt), embeddings, checkpoints
│   ├── visualizations/                   # 9 dedicated category subdirectories for 200+ DPI PNGs
│   └── experiments/                      # YAML configs, results JSON, run logs
├── clients/
│   └── local-agent/                      # Python SQLite agent, Flower client daemon
├── packages/
│   └── shared-types/                     # TypeScript/JSON shared contracts
├── scripts/
│   └── data/                             # Dataset generation, seed pipelines, validation
├── docs/
│   ├── product/                          # PRD, user flows, functional specs
│   ├── architecture/                     # System overview, data flows, database design
│   ├── datasets/                         # Dataset catalog, data dictionary, provenance
│   ├── methodology/                      # Problem definition, model selection, evaluation protocols
│   ├── experiments/                      # Experiment plan, logs, results, limitations
│   ├── privacy/                          # Privacy model, threat model, GDPR data retention
│   ├── migration/                        # legacy-audit.md (this document)
│   └── development/                      # skills-used.md, setup guide, testing standards
├── docker-compose.yml
├── package.json                          # Monorepo root scripts & workspaces
└── README.md
```

---

**Next Action**: Proceed to Phase 0 deliverables: `docs/development/skills-used.md`, System Architecture Document, and initial monorepo scaffolding.
