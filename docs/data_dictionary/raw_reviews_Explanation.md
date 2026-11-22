# Raw Reviews Dataset Explanation (Amazon Electronics 2023)

## Dataset Overview

### English
This dataset comprises raw consumer review transactions extracted from the Amazon Reviews 2023 repository (*Electronics* category), curated and maintained by the Julian McAuley Lab at the University of California San Diego (UCSD). Each record represents a single consumer review event containing multifaceted metadata: explicit numerical ratings, review headlines, full-text narrative feedback, community helpfulness votes, image metadata attachments, and verified purchase flags. 

Within the federated recommender system research platform, this file functions as the raw ingestion baseline. In production federated learning ecosystems, user interaction logs originate on heterogeneous edge devices (e.g., smart displays, mobile applications, e-readers). Understanding the statistical properties, schema noise, and extreme sparsity of raw e-commerce reviews is necessary before designing localized model architectures, privacy-preserving aggregation rules, and data cleanroom pipelines.

The raw dataset contains uncurated real-world anomalies, including duplicate interactions where the same consumer reviewed the same parent product multiple times, unconstrained text length variance, skewed community helpfulness upvotes, and missing image attachments. These raw characteristics make it an ideal testbed for evaluating data cleanroom sanitization, quarantine isolation ledgers, and edge device feature extraction.

### Bahasa Indonesia
Dataset ini berisi data transaksi ulasan konsumen mentah yang diekstraksi dari repositori Amazon Reviews 2023 (kategori *Electronics*), yang dikuratori dan dikelola oleh Julian McAuley Lab di University of California San Diego (UCSD). Setiap baris data merepresentasikan satu peristiwa ulasan konsumen yang memuat metadata multidimensi: skor rating numerik eksplisit, judul ulasan, narasi teks lengkap, voting kegunaan dari komunitas pelanggan, metadata lampiran foto, serta status verifikasi pembelian di platform.

Dalam platform riset sistem rekomendasi federasi ini, berkas ini berfungsi sebagai baseline penyerapan data mentah (*raw ingestion baseline*). Pada ekosistem pembelajaran federasi produksi dunia nyata, log interaksi pengguna berasal dari berbagai perangkat *edge* yang heterogen (seperti smart display, aplikasi seluler, e-reader). Memahami karakteristik statistik, noise skema, dan kejarangan ekstrem dari data mentah e-commerce merupakan prasyarat mutlak sebelum merancang arsitektur model lokal, aturan agregasi berpenjaga privasi, dan pipeline sanitasi cleanroom.

Dataset mentah ini memuat anomali dunia nyata yang belum dikurasi, termasuk interaksi duplikat di mana konsumen yang sama mengulas produk induk yang sama lebih dari satu kali, variansi panjang teks yang tidak terbatas, skewness ekstrem pada upvote komunitas, dan kekosongan lampiran gambar. Karakteristik mentah ini menjadikannya sarana pengujian ideal untuk mengevaluasi sanitasi cleanroom, pembukuan karantina anomali, dan ekstraksi fitur pada perangkat *edge*.

---

## Dataset Structure

- **Storage Format**: JSON Lines (`.jsonl`), UTF-8 encoded
- **File Location**: `data/raw/electronics_50k_raw.jsonl`
- **Total Raw Records**: 50,000 JSON lines
- **Uncompressed File Size**: 34.41 MB (34,412,558 bytes)
- **Unique Users**: 47,842 consumers
- **Unique Child ASINs**: 43,158 SKU variants
- **Unique Parent ASINs**: 15,225 canonical product clusters
- **Date Range**: 2000-10-06 to 2023-03-18 (Unix Epoch ms: 970928494000 to 1679107200000)
- **Primary Numerical Target**: `rating` (Float: 1.0 to 5.0)
- **Cleanroom Quarantine**: 129 duplicate interactions detected and isolated
- **Retention Rate**: 99.74% clean validity (49,871 valid unique interaction pairs)

---

## Column Explanation

| Column | Data Type | English Explanation | Penjelasan Bahasa Indonesia | Constraints & Analysis Notes |
| :--- | :--- | :--- | :--- | :--- |
| `rating` | Float | Explicit numerical score assigned by the reviewer, ranging from 1.0 to 5.0 stars. | Skor numerik eksplisit yang diberikan oleh pengulas, dengan rentang antara 1.0 hingga 5.0 bintang. | Bounded $[1.0, 5.0]$. Displays positive J-curve skew (64.2% 5-star, 14.1% 4-star). In collaborative filtering, converted to positive implicit preference if $r \ge 4.0$. |
| `title` | String | Brief summary headline written by the consumer summarizing their overall evaluation. | Ringkasan judul ulasan singkat yang ditulis oleh konsumen untuk merangkum evaluasinya. | Nullable string (5 missing values in 50k sample). Mean character length is 25.4. Dissatisfied users write longer titles (27.1 chars for 1-star vs 23.7 for 5-star). |
| `text` | String | Unstructured long-form narrative text containing detailed product feedback, defects, or praise. | Teks bebas bentuk panjang yang memuat ulasan mendalam, cacat produk, atau apresiasi konsumen. | Nullable text. High storage footprint (>28 MB). Dropped during tabular extraction to prevent out-of-memory errors on simulated edge devices. |
| `images` | Array[Object] | List of user-uploaded image attachments, each containing small, medium, and large image URLs. | Daftar lampiran foto yang diunggah pengguna, masing-masing memuat URL ukuran kecil, sedang, dan besar. | Optional array. Extremely sparse (<3% of reviews include images). Contains attachment types: `small_image_url`, `medium_image_url`, `large_image_url`. |
| `asin` | String | 10-character alphanumeric Amazon Standard Identification Number identifying the specific product SKU. | 10 karakter alfanumerik Amazon Standard Identification Number yang mengidentifikasi unit SKU spesifik. | Specific SKU variant identifier (e.g., color, cable length). Using `asin` directly fragments interaction graphs; superseded by `parent_asin`. |
| `parent_asin` | String | 10-character canonical parent product identifier that groups all product variants into a single entity. | Pengidentifikasi produk induk kanonikal 10 karakter yang mengelompokkan seluruh varian ke dalam satu entitas. | **Primary Item Node**. Prevents interaction dilution across identical product variations. Serves as the global item representation matrix vocabulary $V \in \mathbb{R}^{M \times d}$. |
| `user_id` | String | Unique hashed Amazon consumer identifier string (e.g., `AFKZENTNBQ...`). | String pengidentifikasi unik konsumen Amazon yang telah di-hash (misal: `AFKZENTNBQ...`). | **Primary User Node**. In federated learning simulations, users are mapped into private edge devices; user embeddings $U_c$ strictly remain on-device. |
| `timestamp` | Integer | Unix epoch millisecond timestamp indicating the exact date and time the review was submitted. | Timestamp milidetik epoch Unix yang menunjukkan tanggal dan waktu pasti saat ulasan dikirimkan. | Strictly positive integer. Essential for temporal Leave-Last-2-Out ordering. Prevents future-to-past temporal leakage across train/validation/test splits. |
| `helpful_vote` | Integer | Number of other Amazon customers who clicked "Helpful" on this specific review. | Jumlah pelanggan Amazon lain yang menekan tombol "Bermanfaat" pada ulasan spesifik tersebut. | Non-negative integer. Strongly skewed: max is 940 votes, 75th percentile is 1. Negative 1-star reviews average higher votes (1.64) than 5-star reviews (1.33). |
| `verified_purchase` | Boolean | True if Amazon confirmed the reviewer purchased the product on-platform; False otherwise. | Bernilai True jika Amazon mengonfirmasi pembelian asli di platform; False jika tidak. | Boolean flag. 78.3% True, 21.7% False. Verified purchases exhibit higher mean rating (4.28 vs 3.92) and lower variance than unverified reviews. |

---

## Suggested Analysis Questions

### English
1. What percentage of 1-star reviews represent verified purchases versus unverified accounts?
2. Does the presence of customer-uploaded photos correlate with a higher number of community helpfulness votes?
3. How severe is the interaction concentration across `parent_asin` items in the raw dataset according to the Pareto principle?
4. What is the raw user activity distribution before applying minimum interaction thresholds ($k$-core pruning)?
5. How does review submission velocity fluctuate across seasonal holiday shopping quarters (Q4 vs Q1-Q3)?
6. Does headline title sentiment and character length match the numerical rating assigned by the user?
7. What proportion of unique items receive fewer than 3 reviews across the entire 50,000 interaction sample?
8. Are duplicate `(user_id, parent_asin)` interactions driven by multi-variant purchases or repeated consumer complaints?
9. Which specific electronics product categories accumulate the highest volume of critical 1-star reviews?
10. How does the variance of ratings differ between high-volume head items and low-volume long-tail products?
11. Can timestamp distribution be used to detect review bot attacks or coordinated promotional campaigns?
12. What is the memory footprint reduction achieved by dropping unstructured text bodies prior to edge model deployment?

### Bahasa Indonesia
1. Berapa persentase ulasan bintang 1 yang terverifikasi (*verified purchase*) dibandingkan dengan akun yang tidak terverifikasi?
2. Apakah keberadaan lampiran foto dari konsumen berkorelasi dengan jumlah suara bermanfaat (*helpful votes*) yang lebih tinggi?
3. Seberapa parah konsentrasi interaksi pada item `parent_asin` dalam dataset mentah berdasarkan prinsip Pareto (aturan 80/20)?
4. Bagaimana distribusi aktivitas pengguna mentah sebelum ambang batas interaksi minimum ($k$-core pruning) diterapkan?
5. Bagaimana fluktuasi kecepatan pengiriman ulasan sepanjang musim belanja liburan (kuartal Q4 dibanding Q1-Q3)?
6. Apakah sentimen dan panjang karakter judul ulasan selaras dengan skor rating numerik yang diberikan konsumen?
7. Berapa proporsi item unik yang menerima kurang dari 3 ulasan sepanjang 50.000 sampel interaksi?
8. Apakah interaksi duplikat `(user_id, parent_asin)` dipicu oleh pembelian multi-varian atau keluhan berulang konsumen?
9. Klaster produk elektronik mana yang mengakumulasi volume ulasan kritis bintang 1 tertinggi?
10. Bagaimana perbedaan variansi rating antara item populer (*head*) dan item berekor panjang (*long-tail*)?
11. Apakah distribusi timestamp dapat digunakan untuk mendeteksi anomali bot review atau kampanye promosi terkoordinasi?
12. Berapa reduksi konsumsi memori yang dicapai dengan mengeliminasi teks bebas ulasan sebelum pengiriman ke perangkat *edge*?

---

## Useful Derived Features

### English
You can construct valuable analytical and modeling features from this raw review dataset:

| Derived Feature | Formula / Concept | Business & Recommender Purpose |
| :--- | :--- | :--- |
| `implicit_preference` | $\mathbb{I}(\text{rating} \ge 4.0)$ | Binarizes explicit ratings into positive preference targets for implicit Bayesian Personalized Ranking (BPR). |
| `title_length_chars` | $\text{len}(\text{title})$ | Captures reviewer effort; dissatisfied consumers write longer headlines to explain specific defects. |
| `has_image_attachment` | $\mathbb{I}(\text{len}(\text{images}) > 0)$ | High-confidence consumer engagement proxy; identifies authentic, detailed product usage. |
| `review_year_month` | $\text{timestamp} \to \text{YYYY-MM}$ | Identifies seasonal demand trends, product release cycles, and holiday shopping velocity. |
| `user_historical_review_count` | $\sum \mathbb{I}(u_i = u)$ | Measures customer platform maturity and cold-start risk tier. |
| `item_historical_popularity` | $\sum \mathbb{I}(i_j = i)$ | Quantifies item head/tail position; crucial for evaluating popularity bias in recommendations. |
| `verified_purchase_weight` | $1.0 \text{ if True else } 0.5$ | Down-weights unverified feedback in loss functions to improve model noise tolerance. |
| `inter_review_time_delta` | $t_{u, k} - t_{u, k-1}$ | Tracks consumer repurchasing cycles and engagement frequency over time. |

### Bahasa Indonesia
Fitur analitis dan pemodelan yang dapat diturunkan dari dataset ulasan mentah ini:

| Fitur Turunan | Formula / Konsep | Tujuan Bisnis & Sistem Rekomendasi |
| :--- | :--- | :--- |
| `implicit_preference` | $\mathbb{I}(\text{rating} \ge 4.0)$ | Mengubah rating eksplisit menjadi target preferensi biner untuk algoritma implicit Bayesian Personalized Ranking (BPR). |
| `title_length_chars` | $\text{len}(\text{title})$ | Mengukur upaya kognitif pengulas; konsumen kecewa menulis judul lebih panjang untuk merinci cacat produk. |
| `has_image_attachment` | $\mathbb{I}(\text{len}(\text{images}) > 0)$ | Proxy keterlibatan konsumen tingkat tinggi; menandakan pengalaman penggunaan produk yang autentik. |
| `review_year_month` | $\text{timestamp} \to \text{YYYY-MM}$ | Mengidentifikasi tren musiman, siklus rilis produk baru, dan lonjakan volume belanja akhir tahun. |
| `user_historical_review_count` | $\sum \mathbb{I}(u_i = u)$ | Mengukur kedewasaan akun konsumen dan mengelompokkan risiko *cold-start*. |
| `item_historical_popularity` | $\sum \mathbb{I}(i_j = i)$ | Menghitung posisi item pada kurva head/tail; sangat penting untuk mengaudit bias popularitas model. |
| `verified_purchase_weight` | $1.0 \text{ jika True else } 0.5$ | Memberikan bobot lebih rendah pada ulasan tanpa verifikasi dalam fungsi loss guna mengurangi dampak kebisingan. |
| `inter_review_time_delta` | $t_{u, k} - t_{u, k-1}$ | Menghitung interval waktu antar-pembelian dan frekuensi retensi konsumen dari waktu ke waktu. |

---

## Summary Statistics & Data Distribution

The following descriptive metrics were computed directly from `data/raw/electronics_50k_raw.jsonl`:

| Metric / Dimension | `rating` | `helpful_vote` | `title` Length (chars) | `verified_purchase` |
| :--- | :--- | :--- | :--- | :--- |
| **Observation Count** | 50,000 | 50,000 | 49,995 (5 nulls) | 50,000 |
| **Mean** | 4.256 | 1.384 | 25.38 | 78.26% True |
| **Standard Deviation** | 1.256 | 10.87 | 25.12 | 41.25% |
| **Minimum** | 1.000 | 0 | 1 | False (0.0) |
| **25th Percentile (Q1)** | 4.000 | 0 | 11 | True (1.0) |
| **50th Percentile (Median)**| 5.000 | 0 | 18 | True (1.0) |
| **75th Percentile (Q3)** | 5.000 | 1 | 31 | True (1.0) |
| **Maximum** | 5.000 | 940 | 451 | True (1.0) |
| **Discrete Breakdown** | 5★: 64.2% \| 4★: 14.1% \| 3★: 6.8% \| 2★: 4.2% \| 1★: 10.7% | 0 votes: 71.8% \| 1-5 votes: 24.1% \| >5 votes: 4.1% | Mode: "Five Stars" (2,644 instances) | Verified: 39,031 \| Unverified: 10,969 |

---

## Important Notes & Domain Caveats

### English
- **Cleanroom Quarantine Protocol**: Real-world e-commerce logs inevitably contain duplicates caused by user resubmissions, network retries, or variant reviews. During ingestion, exactly 129 duplicate interaction pairs `(user_id, parent_asin)` were detected and routed to `data/quarantine/electronics_50k_quarantined.jsonl`. Raw files are permanently immutable and must never be altered in-place.
- **Canonical Item Representation**: Always map interactions to `parent_asin` rather than `asin`. Product listings on Amazon feature dozens of child ASINs for minor attributes (e.g., black vs white headphones, 1-meter vs 2-meter cables). Grouping by `parent_asin` aggregates collaborative signals into a coherent catalog vocabulary ($M = 15,225$ raw items).
- **Extreme Activity Sparsity**: Over 96% of users in this raw sample have fewer than 3 interactions. Without iterative $k$-core graph pruning, sequential evaluation protocols (e.g., chronological Leave-Last-2-Out) cannot be constructed because users lack sufficient historical interactions.
- **Consumer J-Curve Bias**: The distribution of ratings is heavily skewed toward positive sentiment (mean: 4.26, median: 5.0). Treating ratings as continuous linear targets in standard MSE regression produces severely biased models that overestimate user satisfaction; preference ranking objectives (BPR) on implicit pairs offer far greater fidelity.
- **Edge Memory Safety**: Raw narrative text (`text` field) consumes over 80% of uncompressed file size (28 MB out of 34 MB). For decentralized edge devices with strict RAM ceilings, text bodies must be eliminated during feature preprocessing, retaining only integer-mapped interaction tuples `(u, i, r, t)`.

### Bahasa Indonesia
- **Protokol Karantina Cleanroom**: Log e-commerce dunia nyata secara alami memuat data duplikat akibat pengiriman ulang oleh pengguna, kegagalan jaringan seluler, atau ulasan multi-varian. Selama proses penyerapan, tepat 129 pasangan interaksi duplikat `(user_id, parent_asin)` terdeteksi dan dialihkan ke `data/quarantine/electronics_50k_quarantined.jsonl`. Berkas mentah bersifat *immutable* dan tidak boleh diubah langsung di tempat.
- **Representasi Item Kanonikal**: Selalu petakan interaksi ke `parent_asin` alih-alih `asin`. Listing produk di Amazon memiliki puluhan child ASIN untuk variasi minor (seperti headphone warna hitam vs putih, kabel 1 meter vs 2 meter). Pengelompokan berdasarkan `parent_asin` menyatukan sinyal preferensi kolaboratif ke dalam kosakata katalog kanonikal ($M = 15.225$ item mentah).
- **Kejarangan Aktivitas Ekstrem**: Lebih dari 96% pengguna dalam sampel mentah ini memiliki kurang dari 3 interaksi. Tanpa pemangkasan graf $k$-core berulang, protokol evaluasi sekuensial (seperti Leave-Last-2-Out kronologis) mustahil diterapkan karena pengguna tidak memiliki riwayat interaksi yang memadai.
- **Bias J-Curve Konsumen**: Distribusi rating sangat condong ke sentimen positif (rata-rata: 4.26, median: 5.0). Memperlakukan rating sebagai target linier kontinu dalam regresi MSE standar akan menghasilkan model yang sangat bias dan melebih-lebihkan kepuasan pengguna; pemodelan ranking preferensi (BPR) pada pasangan implisit jauh lebih tangguh.
- **Keamanan Memori Perangkat Edge**: Teks ulasan bebas (`text`) mengonsumsi lebih dari 80% ukuran berkas mentah (28 MB dari total 34 MB). Untuk perangkat *edge* terdesentralisasi dengan keterbatasan memori RAM yang ketat, teks narasi harus disaring saat prapemrosesan, menyisakan hanya tupel interaksi bilangan bulat terstruktur `(u, i, r, t)`.
