# Evaluation Metrics & Edge Economics Dictionary

## Metric Overview

### English
This dictionary provides formal mathematical definitions, operational constraints, computation formulas, and interpretation standards for all evaluation metrics, fairness indices, privacy invariants, and edge deployment economics utilized in the federated recommender system research platform. Every metric defined herein is implemented as a pure function within the single source of truth module `recsys_core.py` and validated via automated unit testing (`tests/test_recsys_core.py`).

The platform evaluates system performance across four foundational pillars:
1. **Information Retrieval & Ranking Quality**: Top-$K$ ranking effectiveness on unobserved candidate items.
2. **Decentralized Client Fairness**: Dispersion and equity of recommendation accuracy across heterogeneous edge silos.
3. **Privacy Invariants**: Quantitative verification of zero user embedding transmission over communication channels.
4. **Edge Deployment Economics**: Network wire exchange, cellular data consumption, cloud infrastructure costs, and on-device battery drain.

By structuring evaluation around these four pillars, the platform enforces honest trade-off analysis between recommendation quality, privacy preservation, communication bandwidth, and hardware energy constraints.

### Bahasa Indonesia
Kamus metrik ini menyajikan definisi matematis formal, batasan operasional, formula komputasi, dan standar interpretasi untuk seluruh metrik evaluasi, indeks keadilan, invarian privasi, serta parameter ekonomi penerapan *edge* yang digunakan dalam platform riset sistem rekomendasi federasi. Setiap metrik yang didefinisikan di sini diimplementasikan sebagai fungsi murni dalam modul sumber kebenaran tunggal `recsys_core.py` dan divalidasi melalui unit testing otomatis (`tests/test_recsys_core.py`).

Platform ini mengevaluasi kinerja sistem berdasarkan empat pilar fundamental:
1. **Kualitas Temu Kembali Informasi & Ranking**: Efektivitas perangkingan Top-$K$ pada kandidat item yang belum pernah diobservasi.
2. **Keadilan Klien Terdesentralisasi**: Dispersi dan kesetaraan akurasi rekomendasi di seluruh silo *edge* yang heterogen.
3. **Invarian Privasi**: Verifikasi kuantitatif atas nol transmisi representasi profil pengguna (*zero user embedding*) pada jaringan komunikasi.
4. **Ekonomi Penerapan Edge**: Volume pertukaran data jaringan, konsumsi kuota seluler, biaya infrastruktur cloud, dan konsumsi baterai perangkat.

Dengan menstrukturkan evaluasi di sekitar empat pilar ini, platform menegakkan analisis pertukaran (*trade-off analysis*) yang jujur antara akurasi rekomendasi, jaminan privasi, konsumsi bandwidth, dan batasan energi perangkat keras.

---

## Evaluation Metrics Reference Table

| Metric Key | Category | Range / Units | English Explanation | Penjelasan Bahasa Indonesia | Target / Benchmark Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ndcg@k` | Ranking Accuracy | $[0.0, 1.0]$ | Normalized Discounted Cumulative Gain at rank cutoff $K$. Measures ranking quality by penalizing relevant items appearing lower in the recommendation list. | *Normalized Discounted Cumulative Gain* pada batas ranking $K$. Mengukur kualitas perangkingan dengan memberikan penalti jika item relevan berada di posisi bawah daftar rekomendasi. | Centralized MF-BPR: $0.0862 \pm 0.0029$. Target pFL: $\ge 0.0850$ ($>98\%$ paritas). Tercapai: **$0.0860$** ($99.77\%$). |
| `hit@k` | Ranking Accuracy | $\{0, 1\} \to [0.0, 1.0]$ | Binary hit rate indicator at cutoff $K$. Evaluates whether the user's ground-truth positive item appears anywhere within the top-$K$ recommendations. | Indikator *hit rate* biner pada batas $K$. Mengevaluasi apakah item positif ground-truth pengguna muncul di posisi mana pun dalam top-$K$ rekomendasi. | Centralized: $0.1620$. Random Baseline: $0.1085$. Target pFL: $\ge 0.1500$. Tercapai: **$0.1521$**. |
| `recall@k` | Ranking Accuracy | $[0.0, 1.0]$ | Proportion of relevant items retrieved in top-$K$. In the Leave-Last-2-Out evaluation protocol (1 positive test item), Recall@K is mathematically identical to Hit@K. | Proporsi item relevan yang berhasil ditemukan dalam top-$K$. Pada protokol evaluasi Leave-Last-2-Out (1 item uji positif), nilai Recall@K secara matematis identik dengan Hit@K. | Identik dengan Hit@K ($0.1521$ pada pFL). |
| `mrr` | Ranking Precision | $[0.0, 1.0]$ | Mean Reciprocal Rank. Evaluates the reciprocal rank of the first relevant item ($1 / \text{rank}$); yields 0 if the positive item is not ranked. | *Mean Reciprocal Rank*. Mengevaluasi kebalikan dari posisi ranking item relevan pertama ($1 / \text{rank}$); bernilai 0 jika item tidak teranking. | Random: $0.0475$. Centralized: $0.0683$. pFL: **$0.0886$** (+29.7% lift atas Centralized). |
| `gini_coefficient` | Client Fairness | $[0.0, 1.0]$ | Gini Inequality Index measuring the dispersion of recommendation accuracy across client silos. 0 represents perfect equality; 1 represents absolute concentration. | Indeks Ketimpangan Gini yang mengukur dispersi akurasi rekomendasi antarsilo klien. Nilai 0 merepresentasikan kesetaraan sempurna; 1 merepresentasikan ketimpangan mutlak. | Local-Only: $0.2219$ (Ketimpangan parah). Target pFL: $< 0.1200$. Tercapai: **$0.0997$** (Reduksi $-55.1\%$). |
| `centralized_parity` | System Fidelity | $[0.0\%, 100.0\%]$ | Ratio of federated model NDCG@10 relative to the pooled centralized benchmark gold standard. | Rasio performa NDCG@10 model federasi relatif terhadap benchmark terpusat (*gold standard*). | Target Operasional: $\ge 90.0\%$. Tercapai pFL: **$99.77\%$** ($0.0860 / 0.0862$). |
| `client_upload_kb` | Communication Payload | Kilobytes (KB) | Network payload transmitted from a single edge client to the central aggregation server per federated communication round. | Beban data jaringan yang dikirimkan oleh satu klien edge ke server agregator per putaran komunikasi federasi. | Fixed: **$184.2\text{ KB}$** ($M \times d \times 4\text{ bytes} = 1,439 \times 32 \times 4$). |
| `user_embedding_bytes` | Privacy Invariant | Bytes | Total bytes of private user preference vectors transmitted across the network during federation. | Jumlah byte vektor representasi pengguna pribadi yang dikirimkan melalui jaringan selama pelatihan federasi. | **Strictly $0\text{ Bytes}$** (Jaminan mutlak zero user leakage). |
| `per_client_cellular_mb` | Edge Economics | Megabytes (MB) | Total round-trip network data consumed on client cellular connections across a full multi-round training lifecycle. | Total data jaringan bolak-balik yang dikonsumsi koneksi seluler klien sepanjang siklus pelatihan federasi lengkap. | 10 Rounds: $3.60\text{ MB}$. 50 Rounds: $17.99\text{ MB}$ ($<1\%$ dari paket data 2 GB). |
| `total_cloud_cost_usd` | Cloud Economics | USD ($) | Total hosting and computation cost on AWS (EC2 compute + S3 egress bandwidth) to orchestrate federation rounds. | Total biaya komputasi dan transfer data pada cloud AWS (komputasi EC2 + bandwidth egress S3) untuk menjalankan putaran federasi. | 5 Clients / 10 Rounds: $\$0.043$. 1.000 Clients / 50 Rounds: $\$20.89$. |
| `battery_drain_pct` | Edge Hardware | Percentage (%) | Estimated smartphone battery percentage consumed per federated training round on a standard 4,000 mAh mobile battery. | Estimasi persentase daya baterai ponsel pintar yang terkuras per putaran pelatihan pada baterai standar 4.000 mAh. | Per Round: $0.054\%$. Sepanjang 10 Rounds: $0.54\%$ (Dampak energi terabaikan). |

---

## Mathematical Formulations

### 1. Normalized Discounted Cumulative Gain (NDCG@K)
$$\text{DCG}@K = \sum_{k=1}^K \frac{2^{r_k} - 1}{\log_2(k + 1)}$$
In our sequential Leave-Last-2-Out evaluation protocol, each user evaluates exactly 1 ground-truth positive item ($r_k \in \{0, 1\}$) against 99 unobserved candidate negatives ($|\mathcal{C}_u| = 100$ items):
$$\text{DCG}@K = \begin{cases} \frac{1}{\log_2(\text{rank} + 1)}, & \text{if } \text{rank} \le K \\ 0, & \text{if } \text{rank} > K \end{cases}$$
The Ideal DCG (IDCG@K) places the single positive item at rank 1:
$$\text{IDCG}@K = \frac{2^1 - 1}{\log_2(1 + 1)} = 1.0$$
$$\text{NDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K} = \text{DCG}@K$$

### 2. Hit Rate at K (Hit@K) & Recall at K (Recall@K)
$$\text{Hit}@K = \begin{cases} 1.0, & \text{if } \text{rank} \le K \\ 0.0, & \text{if } \text{rank} > K \end{cases}$$
Because each user has exactly 1 positive test item, Recall@K simplifies to:
$$\text{Recall}@K = \frac{|\text{Top-}K \cap \mathcal{I}_{u,\text{test}}|}{|\mathcal{I}_{u,\text{test}}|} = \frac{\mathbb{I}(\text{rank} \le K)}{1} \equiv \text{Hit}@K$$

### 3. Mean Reciprocal Rank (MRR)
$$\text{MRR} = \frac{1}{|\mathcal{U}|} \sum_{u \in \mathcal{U}} \text{RR}_u, \quad \text{RR}_u = \begin{cases} \frac{1}{\text{rank}_u}, & \text{if } \text{rank}_u < \infty \\ 0.0, & \text{if item not ranked} \end{cases}$$

### 4. Client Fairness Gini Inequality Index
$$G = \frac{\sum_{i=1}^C \sum_{j=1}^C |x_i - x_j|}{2 C \sum_{i=1}^C x_i}$$
where $x_c = \text{NDCG@10}_c$ represents the mean recommendation quality attained on edge client $c \in \{1, \dots, C\}$. A lower Gini index signifies greater equality in service quality across heterogeneous client silos.

### 5. Wire Payload Formulation
$$\text{Payload}_{\text{client}\to\text{server}} = M \times d \times B_{\text{dtype}} = 1,439 \times 32 \times 4\text{ bytes} = 184,192\text{ bytes} \approx 184.2\text{ KB}$$
$$\text{Payload}_{\text{round-trip}} = 2 \times \text{Payload}_{\text{upload}} \approx 368.4\text{ KB}$$
$$\text{User Embedding Transmitted} = 0\text{ bytes (Strict Zero-Leakage Guarantee)}$$

### 6. Edge Federation Economics Formulation
$$\text{Total Network Wire (GB)} = \frac{2 \times C \times T \times (M \times d \times 4)}{10^9}$$
$$\text{Total Compute Cost (USD)} = \frac{T \times t_{\text{round}}}{3600} \times \text{Rate}_{\text{EC2}}$$
$$\text{Total Network Egress Cost (USD)} = \text{Total Network Wire (GB)} \times \text{Rate}_{\text{Egress}}$$

---

## Suggested Analysis Questions

### English
1. Why does pFL achieve higher MRR (0.0886) than the pooled Centralized baseline (0.0683)?
2. What mathematical mechanism explains why FedAvg Non-IID Gini (0.1140) is dramatically lower than Local-Only Gini (0.2219)?
3. How sensitive is NDCG@10 to the rank position cutoff $K$ (e.g., comparing $K=5$ vs $K=10$)?
4. What is the impact of candidate pool size (e.g., 99 vs 999 negatives) on the absolute value of NDCG@10?
5. Under what data skew conditions would the FedProx proximal parameter $\mu$ outperform standard FedAvg?
6. How does the wire payload scale if the shared catalog size $M$ expands from 1,439 to 50,000 items?
7. What is the break-even cloud cost threshold for federated edge training compared to centralized data ingestion pipelines?
8. Why is Recall@K identical to Hit@K in sequential Leave-Last-2-Out evaluation setups?
9. What proportion of the total cloud deployment cost is driven by EC2 compute hours versus network egress bandwidth?
10. How does the battery drain of 3 local training epochs compare to active screen-on time on mobile client hardware?
11. How does Dirichlet concentration $\alpha$ impact convergence rate and final NDCG@10 stability?
12. What are the operational trade-offs between local adaptation epochs (1 epoch vs 2 epochs vs 5 epochs) in personalized FL?

### Bahasa Indonesia
1. Mengapa model pFL mencapai nilai MRR (0.0886) yang lebih tinggi daripada baseline Centralized (0.0683)?
2. Mekanisme matematis apa yang menjelaskan mengapa indeks Gini FedAvg Non-IID (0.1140) jauh lebih rendah daripada Local-Only (0.2219)?
3. Seberapa sensitif metrik NDCG@10 terhadap nilai batas ranking $K$ (misalnya perbandingan $K=5$ vs $K=10$)?
4. Bagaimana pengaruh ukuran kumpulan kandidat negatif (misal: 99 vs 999 item) terhadap nilai absolut NDCG@10?
5. Pada kondisi ketimpangan data seperti apa parameter proksimal FedProx $\mu$ lebih unggul daripada FedAvg standar?
6. Bagaimana skalabilitas beban transfer data (*wire payload*) jika katalog item $M$ berkembang dari 1.439 menjadi 50.000 item?
7. Berapa ambang batas efisiensi biaya cloud untuk pelatihan federasi *edge* dibanding *pipeline* penyerapan data terpusat?
8. Mengapa nilai Recall@K identik dengan Hit@K pada protokol evaluasi sekuensial Leave-Last-2-Out?
9. Berapa proporsi total biaya cloud yang didorong oleh jam komputasi EC2 dibandingkan bandwidth transfer data (*egress*)?
10. Bagaimana konsumsi baterai 3 epoch pelatihan lokal dibanding konsumsi daya layar aktif pada perangkat mobile?
11. Bagaimana pengaruh parameter konsentrasi Dirichlet $\alpha$ terhadap laju konvergensi dan stabilitas NDCG@10 akhir?
12. Apa pertukaran operasional antara jumlah epoch adaptasi lokal (1 epoch vs 2 epoch vs 5 epoch) pada pFL?

---

## Useful Derived Metrics & KPI Composite Indices

### English
| Derived Metric | Formula / Concept | Business & Engineering Purpose |
| :--- | :--- | :--- |
| `centralized_parity_pct` | $(\text{NDCG}_{\text{pFL}} / \text{NDCG}_{\text{Centralized}}) \times 100\%$ | Quantifies the performance gap between privacy-preserving federated models and unconstrained centralized pooling. |
| `starved_client_lift_pct` | $((\text{NDCG}_{\text{pFL}, c_1} - \text{NDCG}_{\text{Local}, c_1}) / \text{NDCG}_{\text{Local}, c_1}) \times 100\%$ | Measures collaborative value-add for the most vulnerable, data-starved edge silo. |
| `fairness_gain_pct` | $((G_{\text{Local}} - G_{\text{pFL}}) / G_{\text{Local}}) \times 100\%$ | Quantifies the reduction in service quality inequality achieved through federated knowledge sharing. |
| `wire_efficiency_ratio` | $\text{NDCG@10} / \text{Total Network MB}$ | Assesses ranking accuracy achieved per megabyte of network data exchanged. |
| `privacy_utility_tradeoff` | $\text{Parity} / (1 + \text{Leakage Bytes})$ | Institutional composite index evaluating accuracy retention under strict zero-leakage constraints. |
| `energy_cost_per_user` | $\text{Total Joules} / |\mathcal{U}|$ | Evaluates client hardware sustainability for on-device battery constraints. |

### Bahasa Indonesia
| Fitur Turunan | Formula / Konsep | Tujuan Bisnis & Rekayasa Sistem |
| :--- | :--- | :--- |
| `centralized_parity_pct` | $(\text{NDCG}_{\text{pFL}} / \text{NDCG}_{\text{Centralized}}) \times 100\%$ | Mengukur jurang performa antara model federasi berpenjaga privasi dan model terpusat tanpa batasan. |
| `starved_client_lift_pct` | $((\text{NDCG}_{\text{pFL}, c_1} - \text{NDCG}_{\text{Local}, c_1}) / \text{NDCG}_{\text{Local}, c_1}) \times 100\%$ | Mengukur nilai tambah kolaboratif bagi silo *edge* yang paling rentan dan kelaparan data. |
| `fairness_gain_pct` | $((G_{\text{Local}} - G_{\text{pFL}}) / G_{\text{Local}}) \times 100\%$ | Mengukur reduksi ketimpangan kualitas layanan yang dicapai melalui pertukaran pengetahuan federasi. |
| `wire_efficiency_ratio` | $\text{NDCG@10} / \text{Total Network MB}$ | Menilai efisiensi akurasi ranking yang dicapai per megabyte data jaringan yang dipertukarkan. |
| `privacy_utility_tradeoff` | $\text{Parity} / (1 + \text{Leakage Bytes})$ | Indeks komposit institusional untuk mengevaluasi retensi akurasi di bawah batasan *zero-leakage*. |
| `energy_cost_per_user` | $\text{Total Joules} / |\mathcal{U}|$ | Mengevaluasi keberlanjutan perangkat keras klien terhadap batasan daya baterai lokal. |

---

## Empirical Benchmark Comparison Table

The table below presents the verified empirical results across all baseline and federated architectures:

| Strategy / Model | NDCG@10 | Hit Rate@10 | MRR | Client Gini | Centralized Parity | Privacy Guarantee |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Random Guess** | 0.0510 | 0.1085 | 0.0475 | N/A | 59.16% | N/A (Non-learning) |
| **Global Popularity Ranker** | 0.1426 | 0.2462 | 0.1171 | N/A | 165.43% (Heuristic) | Leaked User Global Counts |
| **Isolated Local-Only (Non-IID Mean)** | 0.0618 | 0.1188 | 0.0677 | 0.2219 | 71.69% | Local Only (Severe Inequity) |
| **FedProx Non-IID ($\mu=0.01$)** | 0.0756 | 0.1385 | 0.0795 | 0.1082 | 87.70% | Zero User Embedding Leakage |
| **FedAvg IID (10 Rounds)** | 0.0774 | 0.1432 | 0.0810 | 0.0984 | 89.79% | Zero User Embedding Leakage |
| **FedAvg Non-IID (10 Rounds)** | 0.0824 | 0.1571 | 0.0824 | 0.1140 | 95.59% | Zero User Embedding Leakage |
| **Personalized FL (pFL Adaptation)** | **0.0860** | **0.1521** | **0.0886** | **0.0997** | **99.77%** | **Strict Zero-Leakage (0 Bytes)** |
| **Centralized MF-BPR (3 Seeds)** | **0.0862** $\pm$ 0.0029 | **0.1620** | **0.0683** | N/A (Pooled) | **100.0% (Ref)** | Centralized Pool (Violates Privacy) |

---

## Institutional Decision Gates (12 Go/No-Go Criteria)

| Gate ID | Verification Domain | Operational Criteria | Observed Empirical Value | Gate Status |
| :--- | :--- | :--- | :--- | :--- |
| `GATE-01` | Temporal Split Fidelity | $\max(t_{\text{train}}) < t_{\text{val}} < t_{\text{test}}$ across 100% of evaluated users. | 0 timestamp violations detected across all splits. | **PASS (GO)** |
| `GATE-02` | Candidate Negative Integrity | 99 candidate negatives strictly exclude train, val, and test positives. | 0 false negatives in 100-item candidate pool. | **PASS (GO)** |
| `GATE-03` | User Privacy Invariant | User preference embeddings $U_c$ strictly remain on client devices. | Strictly 0 bytes user embedding wire transmission. | **PASS (GO)** |
| `GATE-04` | Centralized Parity Retention | Federated model retains $\ge 90.0\%$ of Centralized pooled performance. | **$99.77\%$ retention** ($0.0860 / 0.0862$). | **PASS (GO)** |
| `GATE-05` | Data-Starvation Relief | Smallest client (Client 1) achieves positive lift over local training. | **$+164.7\%$ lift** ($0.0348 \to 0.0922$). | **PASS (GO)** |
| `GATE-06` | Inter-Client Fairness Gain | Federated learning reduces client Gini inequality index by $\ge 30\%$. | **$-55.1\%$ reduction** ($0.2219 \to 0.0997$). | **PASS (GO)** |
| `GATE-07` | Communication Wire Budget | Payload per client per round remains $< 500\text{ KB}$. | **$184.2\text{ KB}$** ($63\%$ below budget ceiling). | **PASS (GO)** |
| `GATE-08` | Edge Battery Budget | Local training lifecycle drains $< 2.0\%$ of standard mobile battery. | **$0.54\%$ total drain** across 10 rounds. | **PASS (GO)** |
| `GATE-09` | Multi-Seed Reproducibility | Centralized MF-BPR variance $\sigma_{\text{NDCG}} < 0.0050$. | $\sigma = 0.0029$ across Seeds 42, 123, 999. | **PASS (GO)** |
| `GATE-10` | Non-IID Optimization Stability | Optimization converges under Dirichlet skew $\alpha=0.5$ without divergence. | Monotonic convergence over 10 rounds. | **PASS (GO)** |
| `GATE-11` | Cleanroom Provenance Ledger | Cryptographic SHA-256 fingerprint verified; 0 loss of valid records. | SHA-256 verified; 129 duplicates quarantined. | **PASS (GO)** |
| `GATE-12` | Core Mathematical Auditing | 100% pure math functions verified via automated unit testing. | 13/13 pytest passed (100% green). | **PASS (GO)** |
