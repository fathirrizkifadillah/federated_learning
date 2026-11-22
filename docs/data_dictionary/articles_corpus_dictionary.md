# FedSocial V2 — Articles Corpus Data Dictionary

**Document**: `docs/data_dictionary/articles_corpus_dictionary.md`  
**Dataset**: FedSocial Curated 3,000 Articles Corpus  
**Storage**: `ml/data/processed/articles.json`, PostgreSQL 17 (`Post`, `Category`, `Tag` tables)  
**Semantic Embeddings**: `ml/data/processed/article_embeddings.npy` (Sentence-Transformers `all-MiniLM-L6-v2`)  

---

## 1. Domain Taxonomy & Distribution

The catalog contains exactly 3,000 long-form editorial articles uniformly balanced across 3 primary domains:
- **Artificial Intelligence** ($N = 1,000$): LLMs, Computer Vision, Robotics, Edge AI, Reinforcement Learning, AI Governance.
- **Sports Analytics** ($N = 1,000$): Football tactics, NBA analytics, F1 aerodynamics, Biomechanics, Endurance physiology.
- **World History** ($N = 1,000$): Classical antiquity, Silk Road trade, Industrial revolution, World Wars, Cold War geopolitics.

---

## 2. Column Specification

| Column Name | Type | Description (English) | Deskripsi (Bahasa Indonesia) | Constraints & Distribution |
| :--- | :--- | :--- | :--- | :--- |
| `id` / `article_id` | String (UUID) | Unique canonical identifier for the article. | Pengidentifikasi kanonikal unik artikel. | Primary Key. Non-null UUID v4. |
| `slug` | String | URL-safe slug for web navigation (`/posts/[slug]`). | Slug ramah URL untuk routing halaman web. | Unique index, lowercase alphanumeric with hyphens. |
| `title` | String | Editorial headline summarizing the thesis. | Judul editorial substantif artikel. | Non-null string, length 40–110 characters. |
| `body` / `content` | Text | Substantive article text (4 paragraphs). | Teks isi artikel multi-paragraf lengkap. | Non-null, length ~350–650 words (~2,000–4,000 chars). |
| `summary` / `excerpt`| Text | 2–3 sentence abstract. | Abstrak ringkas 2–3 kalimat. | Non-null, length 140–280 characters. |
| `category` | String | Top-level content category (`AI`, `Sports`, `History`). | Kategori utama artikel (`AI`, `Sports`, `History`). | Exact 3-class partition: 1,000 items each. |
| `subcategory` | String | Fine-grained subject specialization. | Subkategori spesifik bidang ilmu. | 10 subkategori per kategori (100 artikel/subkategori). |
| `word_count` | Int64 | Exact word count of the article body. | Jumlah kata persis dalam badan artikel. | Min: 204, Mean: 221.7, Max: 236. |
| `reading_time_minutes`| Int64 | Estimated read time based on 180 wpm. | Estimasi waktu baca (kecepatan 180 kata/menit). | Integer, range 3–5 menit. |
| `author` | String | Credited author / domain contributor. | Penulis artikel / kontributor terakreditasi. | 18 nama pakar unik terdistribusi konsisten. |
| `tags` | Array[String]| 3–5 contextual topic keywords. | 3–5 kata kunci taksonomi artikel. | Non-null array, e.g. `["transformers", "quantization", "ai"]`. |
| `published_at` | Timestamp | ISO-8601 publication timestamp. | Waktu publikasi ISO-8601. | Distributed across 2024-01-15 to 2025-12-15. |
