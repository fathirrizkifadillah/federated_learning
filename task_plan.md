# Task Plan: Upgrade Proyek RecSys Federated Learning ke Standar Institusional

**Acuan Kualitas**: `C:\CODING\EDA\Dubai Real Estate (2020-2026)`  
**Dataset**: Amazon Reviews 2023 (*Electronics* 3-Core: 1,235 users, 1,439 items, 7,549 interactions)  
**Framework**: PyTorch, Flower (`flwr`), Streamlit, SymPy, Matplotlib, Seaborn, Pytest  
**Status**: IN_PROGRESS

---

## 5-Phase Upgrade Roadmap

### Phase 1: `recsys_core.py` + `plots/` (Visual & Math Foundation) — COMPLETED
- [x] Implement `recsys_core.py` with pure functions, explicit type hints, and full docstrings containing formulas:
  - Bayesian Personalized Ranking (BPR) Loss
  - Masked FedAvg item aggregation
  - FedProx proximal regularization penalty
  - Personalized FL two-stage adaptation
  - Top-K ranking metrics: NDCG@K, Recall@K, Hit Rate@K, MRR
  - Gini inequality index
  - Wire payload calculator & edge energy footprint estimation
- [x] Verify formulas symbolically using `sympy` or manual matrix case (`scripts/verify_math_symbolic.py` passed)
- [x] Create comprehensive unit tests in `tests/test_recsys_core.py` (`pytest` 13/13 passed)
- [x] Build deterministic plot generator `scripts/generate_plots.py` (seed=42)
- [x] Generate 12 high-resolution (300 DPI) publication-grade plots in `plots/` using semantic 5-color palette:
  - `01_rating_sentiment_distribution.png`
  - `02_item_long_tail_pareto.png`
  - `03_user_activity_distribution.png`
  - `04_interaction_matrix_sparsity.png`
  - `05_temporal_review_velocity.png`
  - `06_verified_purchase_effect.png`
  - `07_dirichlet_client_preference_skew.png`
  - `08_inter_client_item_overlap.png`
  - `09_fl_convergence_trajectories.png`
  - `10_client_fairness_gini_reduction.png`
  - `11_subgroup_slice_disparity.png`
  - `12_model_benchmark_comparison.png`
- [x] Verify image DPI via PIL (`Image.info['dpi'] == (300, 300)` confirmed)

### Phase 2: `main.ipynb` (Comprehensive 8-Chapter Research Notebook) — COMPLETED
- [x] Structure 8 chapters (94 cells total, 30 code cells with outputs, 23 Key Insights):
  - Chapter 1: Executive Summary, Setup & Cleanroom Data Overview
  - Chapter 2: 10-Stage RecSys Exploratory Data Analysis (EDA) with inline visual figures and real calculated `**Key Insight:**`
  - Chapter 3: Domain-Specific Feature Engineering (3-Core, chronological split, 99 unobserved negatives, tiering)
  - Chapter 4: Mathematical Foundations & Theoretical Formulations (MPS via `doc2math`, SymPy proofs)
  - Chapter 5: Baseline Experiments & Honest Model Profiles (Random, Popularity, Centralized 3-seed, Local-Only)
  - Chapter 6: Federated Learning Simulation & Convergence (Flower 10 rounds, FedAvg vs FedProx vs pFL)
  - Chapter 7: Evaluation Reality Check & Subgroup Slice Fairness Audit (Gini reduction, slice disparity)
  - Chapter 8: Edge Deployment Economics & Interactive UI Integration (Wire payload, cellular quota, AWS costs)
- [x] Ensure all mathematical functions and metrics are imported from `recsys_core.py` (no duplicate formulas)
- [x] Execute top-to-bottom without errors (`nbconvert --execute` exited with code 0) and save all 2.88 MB of cell outputs

### Phase 3: `docs/data_dictionary/` (Bilingual Documentation) — COMPLETED & AUDITED
- [x] Create `docs/data_dictionary/` directory
- [x] Create `raw_reviews_Explanation.md` (150 lines, 17.6 KB): 10 raw JSON columns, image structures, ratings J-curve, 12 analysis questions, derived features table (EN/ID), full descriptive percentile distribution, and cleanroom quarantine caveats.
- [x] Create `clean_interactions_Explanation.md` (148 lines, 14.7 KB): 7 clean CSV columns, SHA-256 fingerprint, implicit feedback conversion threshold ($r \ge 4.0$), 12 analysis questions, derived features table (EN/ID), full descriptive percentile distribution.
- [x] Create `federated_partitions_Explanation.md` (184 lines, 16.7 KB): 4 columns, 3-core graph pruning, Leave-Last-2-Out chronological split, Dirichlet $\alpha=0.5$ non-IID shards, JSON metadata schemas (`user_mapping`, `item_mapping`, `eval_negatives`), cross-partition summary table, and zero temporal/label leakage guarantees.
- [x] Create `evaluation_metrics_Explanation.md` (169 lines, 18.5 KB): 11 metrics table, formal LaTeX mathematical formulations, target thresholds, derived composite KPI table, full empirical benchmark table (8 architectures), and 12 institutional Go/No-Go operational gates.
- [x] Total: 651 lines, 67.6 KB of institutional documentation across 4 files. 100% column names and empirical numbers verified against data on disk.

### Phase 4: `README.md` (Institutional Publication Quality, ~380 lines) — READY TO START
- [ ] 13 structured chapters matching Dubai Real Estate
- [ ] Functional shields badges, ASCII system architecture, relational data partition tree
- [ ] RecSys feature engineering table, 10-stage EDA findings, benchmark table with real metrics
- [ ] Mathematical foundations written in LaTeX KaTeX
- [ ] Edge economics, tech stack, installation guide, repository structure, and governance/privacy section
- [ ] Verify all command paths and execution instructions

### Phase 5: `app.py` (Interactive Dashboard & Edge Simulator)
- [ ] Add Tab "EDA Visual Gallery" featuring high-res plots from `plots/`
- [ ] Add "Edge Deployment & Bandwidth Simulator" with interactive client & round sliders
- [ ] Connect simulator calculations directly to `recsys_core.py`
- [ ] Verify app runs cleanly with `streamlit run app.py` and visual validation

---

## Errors & Blockers Log
| Timestamp | Phase | Error / Blocker | Resolution |
|---|---|---|---|
| 2026-11-21 23:13 | Phase 2 | `nbconvert` executed system python instead of `.venv` kernel (`ModuleNotFoundError: flwr`) | Installed dedicated `federated_venv` kernel pointing to `.venv\Scripts\python.exe` and passed `--ExecutePreprocessor.kernel_name=federated_venv`. |
| 2026-11-21 23:16 | Phase 2 | `KeyError: 'text'` in Stage 2.10 | Fixed column reference to `title` (character length) and `helpful_vote` distribution across ratings. |
| 2026-11-21 23:26 | Phase 2 | String literal escape in notebook generator for masked FedAvg test | Fixed newline escape sequence in `build_notebook.py` and assigned unique cell IDs. |
| 2026-11-21 23:30 | Phase 2 | `TypeError` in `masked_fedavg_aggregate` call | Aligned arguments to `client_matrices`, `client_item_counts`, `global_anchor_matrix`. |
| 2026-11-21 23:35 | Phase 2 | `TypeError: compute_ranking_metrics_for_user(..., target_idx=0)` | Aligned to signature `(ranked_item_ids, ground_truth_item_id, k_list=(5, 10))`. |
| 2026-11-21 23:38 | Phase 2 | `KeyError: 'convergence_history'` in FL results | Corrected key to `'round_history'` and `'mean_personalized_metrics'`. |
| 2026-11-21 23:46 | Phase 2 | `TypeError` in `calculate_wire_payload` keyword `dtype_bytes` | Corrected keyword argument to `precision_bytes=4` and aligned economic simulation dict keys. |
| 2026-11-21 23:51 | Phase 2 | `NameError: 'cells' is not defined` in final notebook cell | Replaced generator variable with static output string. Top-to-bottom run exited with code 0. |
