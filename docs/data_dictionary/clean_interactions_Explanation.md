# Clean Interactions Dataset Explanation (Sanitized RecSys Matrix)

## Dataset Overview

### English
This dataset contains cleanroom-sanitized user-item interaction records derived from the Amazon Reviews 2023 (*Electronics*) corpus. It is generated through an automated sanitization and audit pipeline (`messy-data-cleanroom`), designed to enforce institutional data governance principles: immutable source extraction, cryptographic provenance tracking via SHA-256 ledgers, schema constraint enforcement, removal of heavy narrative text bodies, and transparent quarantine isolation of anomalous duplicates.

Each row represents an authenticated consumer interaction event formatted as a structured tabular record. With 49,871 clean interaction records spanning 7,386 unique consumers and 34,349 canonical parent products, this dataset acts as the single source of truth for exploratory data analysis (EDA), statistical skew evaluations, and downstream federated graph partitioning.

The clean dataset bridges the gap between raw e-commerce unstructured logs and production recommender systems. By filtering corrupted records without mutating valid consumer feedback, it guarantees that all subsequent federated simulations operate on verified, reproducible, and causally valid historical interactions.

### Bahasa Indonesia
Dataset ini berisi data interaksi pengguna-item yang telah disanitasi secara cleanroom dari korpus Amazon Reviews 2023 (*Electronics*). Berkas ini dihasilkan melalui pipeline audit dan sanitasi otomatis (`messy-data-cleanroom`) yang dirancang untuk menegakkan prinsip tata kelola data institusional: penyerapan sumber yang tidak dapat diubah (*immutable*), penelusuran asal data berbasis kriptografi SHA-256, penegakan batasan skema, eliminasi teks narasi bebas yang membebani memori, serta isolasi transparan untuk anomali duplikasi.

Setiap baris data merepresentasikan satu peristiwa interaksi konsumen yang telah tervalidasi dan diformat menjadi catatan tabular terstruktur. Dengan memuat 49.871 interaksi bersih yang mencakup 7.386 konsumen unik dan 34.349 produk induk kanonikal, dataset ini menjadi sumber kebenaran tunggal (*single source of truth*) untuk analisis data eksploratif (EDA), evaluasi skewness statistik, dan pembagian partisi graf federasi hilir.

Dataset bersih ini menjembatani jurang antara log e-commerce mentah yang tidak terstruktur dan sistem rekomendasi produksi. Dengan menyaring data yang rusak tanpa memodifikasi preferensi asli konsumen, berkas ini memastikan seluruh simulasi pembelajaran federasi beroperasi di atas data historis yang terverifikasi, dapat direproduksi, dan valid secara kausal.

---

## Dataset Structure

- **Storage Format**: Comma-Separated Values (`.csv`), UTF-8 encoded
- **File Location**: `data/processed/electronics_50k_clean.csv`
- **Total Clean Interactions**: 49,871 rows
- **Columns**: 7
- **Unique Consumers (`user_id`)**: 7,386 unique users
- **Unique Products (`parent_asin`)**: 34,349 unique canonical items
- **Overall Interaction Density**: $0.0197\%$ ($99.9803\%$ matrix sparsity)
- **File Size**: 4.64 MB (4,636,735 bytes)
- **Cleanroom Retention Ratio**: $99.74\%$ ($49,871 / 50,000$ raw records)
- **Quarantined Records**: 129 duplicate interaction pairs isolated in `data/quarantine/`
- **Cryptographic Provenance**: SHA-256 fingerprint verified in experiment provenance ledger

---

## Column Explanation

| Column | Data Type | English Explanation | Penjelasan Bahasa Indonesia | Constraints & Analysis Notes |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | String | Unique 28-character alphanumeric hashed Amazon consumer identifier. | String alfanumerik 28 karakter yang mengidentifikasi konsumen Amazon secara unik. | Non-null string. Maximum user activity in clean sample is 810 reviews. In federated mode, mapped to local private edge client storage. |
| `parent_asin` | String | 10-character canonical parent product identifier. | Pengidentifikasi kanonikal 10 karakter untuk klaster produk induk Amazon. | Non-null string. Top product accumulates 166 clean reviews. Serves as the shared item parameter matrix vocabulary $V \in \mathbb{R}^{M \times d}$. |
| `rating` | Float64 | Numerical product rating score on a discrete 1.0 to 5.0 scale. | Skor rating produk numerik dalam skala diskret 1.0 hingga 5.0 bintang. | Mean: 4.26, Median: 5.0, Std: 1.26. In implicit BPR modeling, ratings $\ge 4.0$ denote positive consumer preference ($r \ge 4.0 \to y=1$). |
| `timestamp` | Int64 | Unix epoch millisecond timestamp recording exact review submission time. | Timestamp epoch Unix dalam satuan milidetik saat pengiriman ulasan. | Min: 970928494000 (2000), Max: 1679107200000 (2023). Used as the causal sorting key to prevent future-to-past temporal leakage. |
| `verified_purchase` | Boolean | True if Amazon authenticated an on-platform transaction; False otherwise. | Bernilai True jika Amazon mengonfirmasi pembelian asli di platform; False jika tidak. | Distribution: 78.3% True, 21.7% False. Verified purchases exhibit lower variance ($\sigma = 1.22$) than unverified reviews ($\sigma = 1.37$). |
| `helpful_vote` | Int64 | Count of community helpfulness upvotes received by the review. | Jumlah suara dukungan yang diterima ulasan dari komunitas pelanggan Amazon. | Min: 0, Max: 940, Mean: 1.38, 75th percentile: 1. 1-star reviews receive higher mean votes (1.64) than 5-star reviews (1.33). |
| `title` | String | Short review summary headline authored by the reviewer. | Judul ringkasan ulasan pendek yang ditulis oleh konsumen. | Character length: Min 1, Max 451, Mean 25.4. 5 missing titles (0.01%) handled via empty string fill during NLP feature extraction. |

---

## Suggested Analysis Questions

### English
1. What is the empirical rating distribution across discrete star values (1.0 to 5.0) in the clean dataset?
2. How does verified purchase status alter consumer rating variance and polarity?
3. What is the Gini coefficient of item interaction volume across the 34,349 clean parent products?
4. What proportion of users have sufficient interactions ($\ge 3$) to participate in Leave-Last-2-Out evaluation?
5. How does review submission velocity fluctuate across calendar months and Q4 holiday shopping periods?
6. Which items exhibit the highest ratio of helpful votes relative to their interaction volume?
7. Is there a statistically significant difference in review title length between 1-star and 5-star reviews?
8. How does the overall interaction matrix density change before and after applying 3-core graph pruning?
9. What is the ratio of single-interaction items ("one-shot products") across the entire clean catalog?
10. Does community helpfulness upvoting correlate positively or negatively with explicit product satisfaction?
11. How much memory is conserved by storing clean tabular records instead of raw JSON lines with unstructured text?
12. What proportion of reviews in the clean matrix were submitted within the most recent 3 years (2020–2023)?

### Bahasa Indonesia
1. Bagaimana distribusi frekuensi empiris rating pada nilai bintang diskret (1.0 hingga 5.0) dalam dataset bersih?
2. Bagaimana status verifikasi pembelian mengubah variansi rating dan polaritas evaluasi konsumen?
3. Berapa koefisien Gini dari volume interaksi item di antara 34.349 produk induk kanonikal?
4. Berapa proporsi pengguna yang memiliki interaksi memadai ($\ge 3$) untuk dievaluasi via protokol Leave-Last-2-Out?
5. Bagaimana fluktuasi kecepatan pengiriman ulasan sepanjang bulan kalender dan periode belanja akhir tahun (Q4)?
6. Item mana yang mencatat rasio suara bermanfaat (*helpful votes*) tertinggi relatif terhadap jumlah interaksinya?
7. Apakah terdapat perbedaan signifikan secara statistik pada panjang judul ulasan antara rating bintang 1 dan bintang 5?
8. Bagaimana perubahan densitas matriks interaksi sebelum dan sesudah penerapan pemangkasan graf 3-core?
9. Berapa rasio item dengan hanya satu kali interaksi (*one-shot items*) pada seluruh katalog produk bersih?
10. Apakah voting kegunaan komunitas berkorelasi positif atau negatif dengan kepuasan produk eksplisit?
11. Berapa efisiensi memori yang dihemat dengan menyimpan format tabular bersih dibanding JSONL mentah berteks narasi?
12. Berapa proporsi ulasan dalam matriks bersih yang dikirimkan dalam kurun waktu 3 tahun terakhir (2020–2023)?

---

## Useful Derived Features

### English
The clean interaction matrix enables the computation of domain-specific RecSys features:

| Derived Feature | Formula / Concept | Business & Recommender Purpose |
| :--- | :--- | :--- |
| `implicit_target` | $\mathbb{I}(\text{rating} \ge 4.0)$ | Binarizes explicit ratings into positive interaction pairs for Bayesian Personalized Ranking (BPR). |
| `title_length` | $\text{len}(\text{title})$ | Quantifies reviewer effort; critical reviews have longer headlines detailing specific product defects. |
| `is_heavy_user` | $\mathbb{I}(\text{user\_review\_count} \ge 10)$ | Flags mature consumer profiles for subgroup slice disparity evaluations. |
| `is_head_item` | $\mathbb{I}(\text{item\_popularity} \ge Q_{80})$ | Identifies top 20% most popular items for catalog coverage and popularity bias audits. |
| `is_tail_item` | $\mathbb{I}(\text{item\_popularity} \le Q_{50})$ | Flags long-tail items with sparse interaction histories requiring collaborative inductive transfer. |
| `review_year` | $\text{datetime}(\text{timestamp}).\text{year}$ | Macroeconomic and temporal trend segmentation variable. |
| `helpful_ratio` | $\text{helpful\_vote} / (\text{user\_total\_votes} + 1)$ | Weights reviewer credibility and community trustworthiness in collaborative loss. |
| `time_since_last_review` | $t_{u, k} - t_{u, k-1}$ | Models consumer inter-purchase velocity and temporal decay in recommendation relevance. |

### Bahasa Indonesia
Fitur turunan yang dapat dikonstruksi dari matriks interaksi bersih untuk kebutuhan pemodelan sistem rekomendasi:

| Fitur Turunan | Formula / Konsep | Tujuan Bisnis & Sistem Rekomendasi |
| :--- | :--- | :--- |
| `implicit_target` | $\mathbb{I}(\text{rating} \ge 4.0)$ | Mengubah rating eksplisit menjadi pasangan preferensi positif biner untuk algoritma BPR. |
| `title_length` | $\text{len}(\text{title})$ | Mengukur upaya ulasan konsumen; ulasan kritis memiliki judul lebih panjang untuk merinci cacat produk. |
| `is_heavy_user` | $\mathbb{I}(\text{user\_review\_count} \ge 10)$ | Menandai profil pengguna aktif untuk audit disparitas subgroup performa rekomendasi. |
| `is_head_item` | $\mathbb{I}(\text{item\_popularity} \ge Q_{80})$ | Mengidentifikasi 20% item terpopuler untuk audit bias popularitas dan cakupan katalog. |
| `is_tail_item` | $\mathbb{I}(\text{item\_popularity} \le Q_{50})$ | Menandai item ekor panjang (*long-tail*) bersinyal minim yang memerlukan transfer kolaboratif federasi. |
| `review_year` | $\text{datetime}(\text{timestamp}).\text{year}$ | Variabel segmentasi tren temporal dan siklus makroekonomi pasar. |
| `helpful_ratio` | $\text{helpful\_vote} / (\text{user\_total\_votes} + 1)$ | Membobot kredibilitas pengulas dan tingkat kepercayaan komunitas pada fungsi objektif. |
| `time_since_last_review` | $t_{u, k} - t_{u, k-1}$ | Memodelkan interval antar-transaksi konsumen dan efek peluruhan waktu (*temporal decay*). |

---

## Summary Statistics & Data Distribution

The following summary statistics were computed directly from `data/processed/electronics_50k_clean.csv`:

| Metric / Dimension | `rating` | `timestamp` (ms) | `helpful_vote` | `title` Length (chars) | `verified_purchase` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Record Count** | 49,871 | 49,871 | 49,871 | 49,866 (5 nulls) | 49,871 |
| **Mean** | 4.256 | 1.545281e+12 | 1.384 | 25.38 | 78.26% True |
| **Standard Deviation** | 1.256 | 9.536021e+10 | 10.866 | 25.12 | 41.25% |
| **Minimum** | 1.000 | 9.709285e+11 | 0 | 1 | False (0.0) |
| **25th Percentile (Q1)** | 4.000 | 1.484524e+12 | 0 | 11 | True (1.0) |
| **50th Percentile (Median)**| 5.000 | 1.566655e+12 | 0 | 18 | True (1.0) |
| **75th Percentile (Q3)** | 5.000 | 1.617844e+12 | 1 | 31 | True (1.0) |
| **Maximum** | 5.000 | 1.679107e+12 | 940 | 451 | True (1.0) |
| **Missing Values** | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) | 5 (0.01%) | 0 (0.0%) |
| **Cardinality** | 5 discrete values | 49,742 unique | 112 unique counts | 432 unique lengths | 2 boolean states |

---

## Important Notes & Domain Caveats

### English
- **Single Source of Truth Invariant**: This cleaned file serves as the definitive reference for all downstream experimental splits. No other data file should be used to instantiate train, validation, or test partitions.
- **Optimized Storage Footprint**: Dropping unstructured review narrative text reduced the dataset size from 34.41 MB to 4.64 MB (86.5% reduction), drastically lowering memory allocation during edge device partitioning simulations.
- **Extreme Sparsity**: With 49,871 interactions distributed across 7,386 users and 34,349 items, matrix sparsity is 99.98%. Evaluating recommendation models on this unfiltered matrix would cause extreme cold-start evaluation failures; iterative 3-core graph pruning is essential before training.
- **Implicit Feedback Transformation**: Consumer ratings are converted to implicit feedback: interactions with $r_{ui} \ge 4.0$ are treated as observed positive preference pairs, while unobserved catalog items serve as candidate negative samples.
- **Verified Purchase Bias**: Verified purchases represent 78.3% of records and display significantly lower variance ($\sigma = 1.22$) than unverified reviews ($\sigma = 1.37$), reflecting a substantially higher signal-to-noise ratio in authenticated transactions.

### Bahasa Indonesia
- **Invarian Sumber Kebenaran Tunggal**: Berkas bersih ini menjadi satu-satunya acuan definitif untuk seluruh pembagian partisi eksperimental hilir. Tidak boleh ada berkas lain yang digunakan untuk menyusun partisi latih, validasi, maupun uji.
- **Efisiensi Ruang Penyimpanan**: Penghapusan teks narasi ulasan bebas memangkas ukuran berkas dari 34.41 MB menjadi 4.64 MB (reduksi 86.5%), secara drastis menghemat alokasi memori RAM selama simulasi partisi perangkat *edge*.
- **Kejarangan Ekstrem**: Dengan 49.871 interaksi yang tersebar pada 7.386 pengguna dan 34.349 item, kejarangan matriks mencapai 99.98%. Mengevaluasi model rekomendasi pada matriks tanpa filter ini akan memicu kegagalan *cold-start* parah; pemangkasan graf 3-core secara iteratif bersifat wajib sebelum pelatihan.
- **Transformasi Umpan Balik Implisit**: Rating konsumen dikonversi menjadi umpan balik implisit: interaksi dengan skor $r_{ui} \ge 4.0$ diperlakukan sebagai pasangan preferensi positif teramati, sedangkan item katalog yang belum pernah diobservasi menjadi kandidat sampel negatif.
- **Bias Pembelian Terverifikasi**: Pembelian terverifikasi mencakup 78.3% data dan menunjukkan variansi yang jauh lebih rendah ($\sigma = 1.22$) dibanding ulasan tanpa verifikasi ($\sigma = 1.37$), mencerminkan rasio sinyal-terhadap-kebisingan (*signal-to-noise ratio*) yang jauh lebih tinggi pada transaksi autentik.
