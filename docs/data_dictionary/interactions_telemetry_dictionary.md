# FedSocial V2 — Behavioral Telemetry Data Dictionary

**Document**: `docs/data_dictionary/interactions_telemetry_dictionary.md`  
**Dataset**: Synthetic Behavioral Telemetry (100 Users, 4 Archetypes)  
**Storage**: `ml/data/processed/interactions.csv`, Browser `IndexedDB` (`fedsocial_edge_v2`), Edge Daemon SQLite (`local_interactions.db`)  
**Privacy Status**: Strictly Local Edge Storage (0 Bytes Sent to Central Cloud)  

---

## 1. Overview & Privacy Guarantee

This dataset captures granular user reading behavior without central surveillance. In FedSocial V2, continuous dwell time and scroll depth are recorded exclusively on client edge devices:
- **Total Interaction Records**: 4,865 events.
- **Simulated Users**: 100 users across 4 archetypes (AI Specialist, Sports Fan, History Scholar, Polymath).
- **Zero Central Storage**: Express API blocks `/api/v1/events` with HTTP 403 Forbidden.

---

## 2. Column Specification

| Column Name | Type | Description (English) | Deskripsi (Bahasa Indonesia) | Constraints & Distribution |
| :--- | :--- | :--- | :--- | :--- |
| `event_id` | String (UUID) | Unique identifier for the reading event. | Pengidentifikasi unik event pembacaan. | Primary Key. UUID v4. |
| `user_id` | String | User pseudonym identifier (`user_000`–`user_099`). | Pseudonim klien pengguna (`user_000`–`user_099`). | In FL, user embeds strictly on edge devices. |
| `article_id` | String (UUID) | Target article identifier from corpus. | ID artikel target dari korpus 3.000 artikel. | Foreign key to `articles.json`. |
| `category` | String | Domain of the interacted article. | Kategori artikel yang diakses (`AI`, `Sports`, `History`). | Balanced: ~33.8% AI, ~33.5% Sports, ~32.7% History. |
| `subcategory` | String | Fine-grained subject specialization. | Subkategori bidang ilmu artikel target. | Non-null string. |
| `event_timestamp` | Timestamp | ISO-8601 interaction timestamp. | Waktu pencatatan interaksi ISO-8601. | Chronological order per user. |
| `dwell_time_ms` | Int64 | Active reading duration in milliseconds. | Durasi membaca aktif dalam milidetik. | Continuous ms. Pauses when idle >30s or tab hidden. |
| `dwell_time_sec` | Float64 | Active reading duration in seconds. | Durasi membaca aktif dalam detik. | Min: 1.1s, Median: 55.6s, Mean: 62.0s, Max: 300.0s. |
| `scroll_depth` | Float64 | Maximum scroll depth reached (0.0 to 1.0). | Persentase scroll maksimum tercapai (0.0–1.0). | Beta distribution correlated with dwell time. |
| `is_like` | Int64 (0/1) | Explicit like signal. | Sinyal eksplisit menyukai artikel. | 1 if user liked (dwell > 45s), 0 otherwise. |
| `is_bookmark` | Int64 (0/1) | Explicit bookmark signal. | Sinyal eksplisit menyimpan bookmark. | 1 if user bookmarked (dwell > 60s), 0 otherwise. |
| `is_share` | Int64 (0/1) | Explicit social share signal. | Sinyal eksplisit membagikan artikel. | 1 if user shared (dwell > 90s), 0 otherwise. |
| `is_affinity` | Int64 (0/1) | True engagement vs bounce indicator. | Indikator pembacaan mendalam vs pantulan cepat. | Engaged (median ~70s) vs Bounce (median ~5s). |
