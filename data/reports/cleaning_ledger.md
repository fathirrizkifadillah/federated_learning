# Messy Data Cleanroom Audit Ledger

## 1. Problem
Validate, sanitize, and audit a 50,000-interaction technical exploratory sample of the Amazon Reviews 2023 (Electronics) dataset for a Federated Learning Recommender System. Ensure no raw records are mutated or deleted without an audit trail, isolate corrupted/duplicate interactions into quarantine, and certify data readiness for chronological splitting and federated partitioning.

## 2. Inputs
- **Raw Extract**: `data/raw/electronics_50k_raw.jsonl`
  - File SHA-256: `17ca455fb139ad38122e6e19a0571ff208588c11db8051d82f37ab1b8ae99f7b`
  - Total Raw Records: `50000`
  - Source: `https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023` (Category: Electronics)
- **Required Core Schema**: `user_id` (string), `parent_asin` (string), `rating` (float 1.0-5.0), `timestamp` (integer epoch ms).

## 3. Checks Performed
1. **Structural JSON & Missing Field Integrity**: Verified presence of all mandatory keys (`user_id`, `parent_asin`, `rating`, `timestamp`). Records with null/empty values flagged for quarantine.
2. **Domain Boundary Check (Rating)**: Checked that all ratings conform to numeric float values within `[1.0, 5.0]`.
3. **Temporal Sanity Check (Timestamp)**: Checked for positive epoch milliseconds within historical bounds (up to 2026).
4. **Interaction Identity & Duplicate Quarantine**: Checked for identical `(user_id, parent_asin)` review collisions. The most recent interaction was retained for ranking fidelity; earlier duplicate entries were safely quarantined.

## 4. Findings
- **Total Ingested Records**: 50000
- **Accepted Clean Interactions**: 49871 (99.74%)
- **Quarantined Records**: 129 (0.26%)
- **Quarantine Breakdown**:
  - `duplicate_interaction_superseded`: 129 rows

- **Clean Population Statistics**:
  - Unique Users: 7,386
  - Unique Items (parent_asin): 34,349
  - Rating Distribution: {1.0: 4142, 2.0: 2114, 3.0: 3405, 4.0: 7362, 5.0: 32848}
  - Timestamp Span: `2000-10-07 14:21:50 UTC` to `2023-03-18 02:35:08 UTC`
  - Matrix Sparsity: 99.980343%

## 5. Decision
**`go`**
The dataset is clean, well-formed, and structurally sound. The acceptance rate is exceptionally high (>99%), duplicate interactions have been safely quarantined rather than silently dropped, and the timestamp and rating boundaries are fully valid for downstream recommendation modeling.

## 6. Risks
- **Cold Start / High Sparsity**: With 7,386 users across 50,000 interactions, the majority of users have only 1-2 interactions in this preliminary 50k slice. Centralized and local baseline models will face cold-start challenges unless filtered (e.g. k-core filtering) or evaluated under appropriate ranking metrics.
- **Unrepresentative Early Slice**: As noted in project specifications, this 50k extract represents early sequential records from the source archive. It is valid for engineering verification, pipeline plumbing, and baseline prototyping, but not the final full scientific benchmark.

## 7. Next Actions
1. Execute `profile_table.py` for automated stdlib column profiling and cross-verification.
2. Run Exploratory Data Analysis (EDA) on user activity distribution and item popularity.
3. Advance to **Tahap 2**: Formulate the chronological train/val/test split and generate IID vs Non-IID client partitions using `leakage-adversary`.

## 8. Artifacts
- **Clean Interactions Dataset**:
  - Path: `[electronics_50k_clean.csv](file:///C:/CODING/federated_learning/data/processed/electronics_50k_clean.csv)`
  - SHA-256: `17347c36cb93f27888aff1cd3604516febf5f9fe372f43998bdb80a10d0fb182`
- **Quarantined Records**:
  - Path: `[electronics_50k_quarantined.jsonl](file:///C:/CODING/federated_learning/data/quarantine/electronics_50k_quarantined.jsonl)`
  - SHA-256: `218f01a10d20454198625b2b9dd44a0d3ae0359500c1ede6ef8fd12a51fd58ae`
- **Audit Ledger**:
  - Path: `[cleaning_ledger.md](file:///C:/CODING/federated_learning/data/reports/cleaning_ledger.md)`
