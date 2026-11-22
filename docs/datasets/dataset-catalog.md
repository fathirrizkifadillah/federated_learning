# FedSocial V2 — Dataset Catalog & Provenance Register

**Document**: `docs/datasets/dataset-catalog.md`  
**Status**: APPROVED / ASSET REGISTER  
**Standard**: Follows Section 6 of Master Specification  

---

## 1. Dataset Taxonomy & Usage Roles

| Dataset Code | Dataset Name | Source / Institution | Intended Role in FedSocial V2 | Licensing & Redistribution |
| :--- | :--- | :--- | :--- | :--- |
| **Dataset A** | **MIND (Microsoft News Dataset - Small)** | Microsoft Research (MSR) | External benchmark for news recommendation algorithms | Microsoft Research License Terms (Research only; do not commit raw data) |
| **Dataset B** | **KuaiRec** | Kuaishou / Chongming Gao et al. | Interaction density reference & offline feedback modeling | CC BY-NC 4.0 (Non-commercial research only) |
| **Dataset C** | **FedSocial Custom Content Corpus** | FedSocial Research Team | Primary editorial reading catalog (3,000 articles) | Proprietary / CC BY 4.0 Open Dataset |
| **Dataset D** | **Synthetic Skewed Interactions** | FedSocial Simulation Generator | Edge client simulation (IID & Non-IID Dirichlet $\alpha=0.5$) | Deterministic Generator Output (Seed=42) |

---

## 2. Dataset C — FedSocial Custom Content Corpus (3,000 Articles)

### Target Distribution:
- **Artificial Intelligence (AI)**: 1,000 articles (Subcategories: Machine Learning, Neural Networks, NLP & LLMs, Computer Vision, AI Ethics, Robotics, Hardware Accelerators).
- **Sports**: 1,000 articles (Subcategories: Football / Soccer, Basketball, Formula 1, Tennis, Athletics, Sports Science & Analytics).
- **History**: 1,000 articles (Subcategories: Ancient Civilizations, Medieval History, Renaissance, World War I & II, Cold War, History of Technology).

### Article Schema (`Article` Contract):
```json
{
  "article_id": "art-ai-0001",
  "slug": "understanding-transformer-attention-mechanisms",
  "title": "Understanding Transformer Attention Mechanisms: From Query-Key-Value to Sparse Attention",
  "body": "Detailed technical editorial article body...",
  "excerpt": "A deep dive into multi-head attention and computational efficiency in modern neural networks.",
  "category": "AI",
  "subcategory": "Neural Networks",
  "tags": ["Transformers", "Attention", "Deep Learning"],
  "word_count": 850,
  "estimated_read_min": 4,
  "language": "en",
  "image_url": "/images/articles/ai/transformer_architecture.webp",
  "image_license": "Unsplash Free License / Creative Commons",
  "image_attribution": "Photo by Example Photographer on Unsplash",
  "published_at": "2026-03-01T08:00:00Z",
  "source_type": "AI_GENERATED",
  "reference_urls": [
    "https://arxiv.org/abs/1706.03762",
    "https://jalammar.github.io/illustrated-transformer/"
  ]
}
```

---

## 3. Dataset Provenance Manifest & Storage Policy

Raw external datasets are stored in `ml/data/` following the pipeline progression:
```
ml/data/
├── raw/               # Downloaded archive files (MIND-small.zip)
├── external/          # Extracted third-party benchmarks
├── interim/           # Partially transformed schemas
├── processed/         # Cleaned, standardized article and interaction files
├── synthetic/         # Synthetic user profiles and interaction logs
└── partitions/        # Edge client splits (IID and Non-IID Dirichlet shards)
```

**Git Hygiene Policy**: Raw binary archives and files exceeding 10 MB are excluded from Git commits via `.gitignore`.
