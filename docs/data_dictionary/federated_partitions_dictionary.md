# FedSocial V2 — Federated Partitions & Parameters Data Dictionary

**Document**: `docs/data_dictionary/federated_partitions_dictionary.md`  
**Dataset**: 10-Client Federated Network Partitions  
**Storage**: `ml/data/processed/federated_partitions.json`  
**Engine**: Flower (`flwr` 1.43) + PyTorch 2.15  

---

## 1. Partitioning Formulation & Heterogeneity

To evaluate decentralized collaborative filtering under real-world conditions, users are partitioned across 10 edge client nodes (`client_0` through `client_9`):
- **Non-IID Dirichlet Skew**: Formulated under $\text{Dirichlet}(\alpha = 0.5)$. Simulates realistic institutional clustering (e.g. AI research labs, Sports desks, History archives).
- **IID Benchmark**: Uniform random distribution for baseline comparison.
- **Leave-Last-2-Out Split**: Chronological holdout per user (last event = test, second-to-last = validation, remainder = train).

---

## 2. Federated Communication Payload & Privacy Invariants

| Parameter Component | Tensor Shape | Storage Location | Network Transmission | Privacy Guarantee |
| :--- | :--- | :--- | :--- | :--- |
| `item_projection.weight` | `[64, 384]` | Edge Model & Flower Server | Transmitted (~98.3 KB) | Public catalog projection only |
| `item_projection.bias` | `[64]` | Edge Model & Flower Server | Transmitted (~0.3 KB) | Public catalog projection only |
| `mlp.0.weight` | `[64, 128]` | Edge Model & Flower Server | Transmitted (~32.8 KB) | Shared neural scoring head |
| `mlp.0.bias` | `[64]` | Edge Model & Flower Server | Transmitted (~0.3 KB) | Shared neural scoring head |
| `mlp.3.weight` | `[64, 64]` | Edge Model & Flower Server | Transmitted (~16.4 KB) | Shared neural scoring head |
| `mlp.3.bias` | `[64]` | Edge Model & Flower Server | Transmitted (~0.3 KB) | Shared neural scoring head |
| `prediction_head.weight` | `[1, 128]` | Edge Model & Flower Server | Transmitted (~0.5 KB) | Shared scoring linear projection |
| **User Embeddings** | **`[100, 64]`** | **Client Device ONLY** | **NEVER Transmitted (0 B)**| **Strict 0-Byte User Leakage** |
