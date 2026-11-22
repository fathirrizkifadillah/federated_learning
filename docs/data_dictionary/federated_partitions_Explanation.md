# Federated Partitions & Split Schema Explanation

## Dataset Overview

### English
This documentation specifies the partitioned experimental datasets and metadata dictionaries utilized to simulate decentralized, privacy-preserving federated collaborative filtering. The experimental data was derived from the clean interactions matrix by applying a 3-core iterative graph pruning filter ($k=3$), followed by a strict per-user chronological Leave-Last-2-Out evaluation split and a Dirichlet distribution-based client assignment ($\text{Dir}(\alpha=0.5)$) to simulate severe non-IID statistical heterogeneity across 5 virtual edge client silos.

The partitions enable rigorous benchmarking across three distinct operational paradigms:
1. **Centralized Baseline (Gold Standard)**: All client data pooled on a single central server, violating privacy constraints but establishing the theoretical upper bound for recommendation accuracy.
2. **Isolated Local-Only Training**: Each client trains a decoupled model exclusively on its private local data, preserving privacy but suffering from severe data starvation on small silos.
3. **Decentralized Federated Learning**: Clients collaboratively train a shared item embedding matrix $V \in \mathbb{R}^{M \times d}$ using Masked FedAvg or FedProx, while keeping user embeddings $U_c \in \mathbb{R}^{N_c \times d}$ strictly local (zero user profile leakage).

The dataset includes comprehensive JSON metadata files (`user_mapping.json`, `item_mapping.json`, and `eval_negatives.json`) that ensure deterministic tensor indexing and leakage-free candidate negative sampling across all experimental evaluations.

### Bahasa Indonesia
Dokumentasi ini merinci skema dataset partisi eksperimental dan kamus metadata yang digunakan untuk mensimulasikan sistem rekomendasi kolaboratif federasi terdesentralisasi yang menjaga privasi pengguna. Data eksperimental ini diturunkan dari matriks interaksi bersih melalui pemangkasan graf berulang 3-core ($k=3$), diikuti oleh pemisahan evaluasi Leave-Last-2-Out kronologis per pengguna yang ketat, serta pengalokasian klien berbasis distribusi Dirichlet ($\text{Dir}(\alpha=0.5)$) untuk mensimulasikan heterogenitas statistik non-IID yang parah pada 5 silo klien *edge* virtual.

Partisi ini memungkinkan pengujian benchmark komparatif yang ketat pada tiga paradigma operasional:
1. **Centralized Baseline (Gold Standard)**: Seluruh data klien digabungkan pada satu server pusat, melanggar batasan privasi tetapi menetapkan batas atas teoritis untuk akurasi rekomendasi.
2. **Pelatihan Lokal Terisolasi (Isolated Local-Only)**: Setiap klien melatih model secara eksklusif menggunakan data lokalnya sendiri tanpa komunikasi, menjaga privasi namun mengalami kelaparan data parah pada silo kecil.
3. **Pembelajaran Federasi Terdesentralisasi (Decentralized FL)**: Klien berkolaborasi melatih matriks representasi item bersama $V \in \mathbb{R}^{M \times d}$ menggunakan Masked FedAvg atau FedProx, sementara matriks representasi pengguna $U_c \in \mathbb{R}^{N_c \times d}$ tetap tersimpan secara lokal di perangkat klien (nol kebocoran profil pengguna).

Dataset ini memuat berkas metadata JSON komprehensif (`user_mapping.json`, `item_mapping.json`, dan `eval_negatives.json`) yang menjamin pengindeksan tensor deterministik dan sampling kandidat negatif yang bebas kebocoran di seluruh evaluasi eksperimen.

---

## Partition Hierarchy & Directory Structure

```
data/partitions/
├── centralized/                      # Pooled benchmark splits (all users combined)
│   ├── train.csv                     # 5,079 historical interactions
│   ├── val.csv                       # 1,235 second-to-last interactions (1 per user)
│   └── test.csv                      # 1,235 strictly latest interactions (1 per user)
├── non_iid/                          # Dirichlet alpha=0.5 statistical skew (5 edge silos)
│   ├── client_0_{train,val,test}.csv # Client 0: 234 users, 1,066 train pairs, 680 items
│   ├── client_1_{train,val,test}.csv # Client 1:  43 users,   188 train pairs, 178 items (data-starved)
│   ├── client_2_{train,val,test}.csv # Client 2: 451 users, 1,534 train pairs, 798 items
│   ├── client_3_{train,val,test}.csv # Client 3:  39 users,   132 train pairs, 112 items
│   └── client_4_{train,val,test}.csv # Client 4: 466 users, 2,151 train pairs, 1,148 items (dominant)
├── iid/                              # Homogeneous uniform partition baseline (5 clients)
│   └── client_{0..4}_{train,val,test}.csv
├── user_mapping.json                 # 1,235 user IDs -> contiguous integers [0, 1234]
├── item_mapping.json                 # 1,439 item ASINs -> contiguous integers [0, 1438]
└── eval_negatives.json               # 1,235 users -> 99 unobserved candidate negatives each
```

---

## Partition CSV Column Explanation

All partition CSV files (`centralized/*.csv`, `non_iid/*.csv`, `iid/*.csv`) share an identical, normalized 4-column schema:

| Column | Data Type | English Explanation | Penjelasan Bahasa Indonesia | Constraints & Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | String | Hashed Amazon consumer identifier string (e.g., `AE24FFSUQ...`). | String pengidentifikasi unik konsumen Amazon yang telah di-hash (misal: `AE24FFSUQ...`). | Non-null string. Must exist in `user_mapping.json`. In federated non-IID splits, a user belongs strictly to one client device (mutually disjoint user subsets $\mathcal{U}_a \cap \mathcal{U}_b = \emptyset$). |
| `parent_asin` | String | Canonical Amazon Standard Identification Number of the parent product. | Pengidentifikasi kanonikal ASIN Amazon untuk produk induk. | Non-null string. Must exist in `item_mapping.json`. Shared across clients ($\mathcal{I}_a \cap \mathcal{I}_b \ne \emptyset$); constitutes the collaborative vocabulary for item gradient aggregation. |
| `rating` | Float64 | Explicit numerical review rating assigned by the user on a 1.0 to 5.0 scale. | Skor rating numerik eksplisit yang diberikan oleh pengguna dalam skala 1.0 hingga 5.0 bintang. | Bounded $[1.0, 5.0]$. In implicit BPR optimization, positive items satisfy $r \ge 4.0$. |
| `timestamp` | Int64 | Epoch millisecond submission timestamp. | Timestamp milidetik epoch Unix saat ulasan dikirimkan. | Strictly enforces chronological ordering: $\max(t_{\text{train}, u}) < t_{\text{val}, u} < t_{\text{test}, u}$ for 100% of evaluated users. |

---

## Metadata JSON File Specifications

### 1. `user_mapping.json` & `item_mapping.json`
- **Purpose**: Maps raw 28-character user strings and 10-character item ASIN strings to contiguous 0-indexed integers for PyTorch `nn.Embedding` tensor allocation.
- **Cardinals**: $|U| = 1,235$ users, $|I| = 1,439$ items.
- **Verification Guarantee**: Bijective mapping; sets of keys and values are strictly contiguous over $[0, |U|-1]$ and $[0, |I|-1]$.
- **JSON Structure**:
  ```json
  {
    "AE24FFSUQHE3J6NYBICB7V2WHUAA": 0,
    "AFKZENTNBQ7A7V7UXW5JJI6UGRYQ": 1,
    ...
  }
  ```

### 2. `eval_negatives.json`
- **Purpose**: Pre-computed pools of unobserved negative items used during validation and test ranking evaluation. For each user, provides exactly 99 candidate items uniformly sampled from the unobserved catalog $\mathcal{I} \setminus \mathcal{I}_u$.
- **Ranking Candidate Pool**: For any user $u$, evaluation ranks a candidate set of 100 items (1 ground-truth positive item + 99 unobserved candidate negatives).
- **Leakage Invariant**: The 99 candidate negatives are guaranteed to have 0% intersection with the user's historical training interactions, validation ground truth, or test ground truth.
- **JSON Structure**:
  ```json
  {
    "val": {
      "AE24FFSUQ...": ["B00000J1V5", "B07W535UQK", "... 99 items ..."]
    },
    "test": {
      "AE24FFSUQ...": ["B018504BSE", "B0892D8YCS", "... 99 items ..."]
    }
  }
  ```

---

## Suggested Analysis Questions

### English
1. How does the user count disparity across Dirichlet $\alpha=0.5$ partitions affect local model generalization?
2. What is the pairwise item catalog Jaccard similarity between data-starved Client 1 and dominant Client 4?
3. What percentage of items in the test set appear in the training set of Client 1?
4. How does the total interaction volume change after applying 3-core iterative graph pruning?
5. Is the chronological Leave-Last-2-Out protocol strictly respected with zero future-to-past time violations?
6. How does the performance of centralized pooled training compare against the sum of isolated client models?
7. What is the ratio of tail items to head items in each client's local training split?
8. Are candidate negative items sampled uniformly or inversely proportional to global item popularity?
9. Does the distribution of ratings differ significantly across the 5 non-IID virtual edge clients?
10. How does the Masked FedAvg aggregation handle items that are observed by only 1 out of 5 clients?
11. What is the communication payload overhead when transmitting item masks alongside weight tensors?
12. Why does personalized FL adaptation provide disproportionately higher performance lift to data-starved clients?

### Bahasa Indonesia
1. Bagaimana disparitas jumlah pengguna pada partisi Dirichlet $\alpha=0.5$ memengaruhi generalisasi model lokal?
2. Berapa nilai *Jaccard similarity* katalog item antara Client 1 yang kelaparan data dan Client 4 yang dominan?
3. Berapa persentase item dalam set uji (*test set*) yang pernah muncul pada data latih Client 1?
4. Bagaimana perubahan volume total interaksi setelah pemangkasan graf berulang 3-core diterapkan?
5. Apakah protokol kronologis Leave-Last-2-Out dihormati secara mutlak dengan nol pelanggaran urutan waktu?
6. Bagaimana perbandingan performa pelatihan terpusat (*centralized*) terhadap akumulasi model lokal terisolasi?
7. Berapa rasio item *tail* dibanding item *head* pada masing-masing split latih lokal klien?
8. Apakah kandidat item negatif disampel secara seragam atau berbanding terbalik dengan popularitas global item?
9. Apakah distribusi rating berbeda secara signifikan di antara kelima klien *edge* virtual non-IID?
10. Bagaimana agregasi Masked FedAvg menangani item yang hanya diobservasi oleh 1 dari 5 klien?
11. Berapa overhead beban komunikasi jaringan saat mengirimkan masker item bersamaan dengan tensor bobot?
12. Mengapa adaptasi lokal pFL memberikan peningkatan performa (*lift*) yang jauh lebih besar pada klien kelaparan data?

---

## Useful Derived Features & Splitting Indicators

### English
| Derived Feature | Formula / Concept | Business & Recommender Purpose |
| :--- | :--- | :--- |
| `split_role` | `train` \| `val` \| `test` | Explicit temporal evaluation role assigned to each interaction. |
| `client_id` | $\text{Client } c \in \{0, 1, 2, 3, 4\}$ | Decentralized edge data silo assignment indicator. |
| `is_data_starved_client` | $\mathbb{I}(c \in \{1, 3\})$ | Identifies vulnerable clients with $<50$ users for targeted fairness interventions. |
| `item_client_frequency` | $\sum_{c=1}^C \mathbb{I}(j \in \mathcal{I}_c)$ | Counts how many client silos observe item $j$; determines Masked FedAvg weighting. |
| `client_catalog_overlap` | $|\mathcal{I}_a \cap \mathcal{I}_b| / |\mathcal{I}_a \cup \mathcal{I}_b|$ | Quantifies collaborative knowledge transfer potential across silos. |
| `user_local_index` | $u \mapsto [0, N_c - 1]$ | Local client tensor index for private user embedding matrices $U_c$. |
| `global_item_index` | $i \mapsto [0, M - 1]$ | Global federated index for shared item embedding matrix $V$. |

### Bahasa Indonesia
| Fitur Turunan | Formula / Konsep | Tujuan Bisnis & Sistem Rekomendasi |
| :--- | :--- | :--- |
| `split_role` | `train` \| `val` \| `test` | Peran evaluasi temporal eksplisit yang ditetapkan pada setiap baris interaksi. |
| `client_id` | $\text{Client } c \in \{0, 1, 2, 3, 4\}$ | Penanda kepemilikan silo data pada perangkat *edge* terdesentralisasi. |
| `is_data_starved_client` | $\mathbb{I}(c \in \{1, 3\})$ | Menandai klien rentan dengan $<50$ pengguna untuk audit intervensi keadilan (*fairness*). |
| `item_client_frequency` | $\sum_{c=1}^C \mathbb{I}(j \in \mathcal{I}_c)$ | Menghitung berapa banyak klien yang mengamati item $j$; menentukan bobot agregasi Masked FedAvg. |
| `client_catalog_overlap` | $|\mathcal{I}_a \cap \mathcal{I}_b| / |\mathcal{I}_a \cup \mathcal{I}_b|$ | Mengukur potensi transfer pengetahuan kolaboratif antarsilo klien. |
| `user_local_index` | $u \mapsto [0, N_c - 1]$ | Indeks tensor lokal klien untuk matriks bobot representasi pengguna privat $U_c$. |
| `global_item_index` | $i \mapsto [0, M - 1]$ | Indeks federasi global untuk matriks bobot representasi item bersama $V$. |

---

## Summary Statistics & Cross-Partition Distribution

The table below presents the verified distribution of users, items, and interactions across centralized and non-IID client partitions:

| Partition Silo | Unique Users | Unique Items | Train Pairs | Val Pairs | Test Pairs | Total Interactions | User Disparity Ratio |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Centralized (Pooled)** | **1,235** | **1,439** | **5,079** | **1,235** | **1,235** | **7,549** | 1.0x (Baseline) |
| **Client 0** | 234 | 680 | 1,066 | 234 | 234 | 1,534 | 6.0x (vs Client 3) |
| **Client 1 (Data-Starved)**| **43** | **178** | **188** | **43** | **43** | **274** | **1.1x (Starved)** |
| **Client 2** | 451 | 798 | 1,534 | 451 | 451 | 2,436 | 11.6x (vs Client 3) |
| **Client 3 (Data-Starved)**| **39** | **112** | **132** | **39** | **39** | **210** | **1.0x (Smallest)** |
| **Client 4 (Dominant)** | **466** | **1,148** | **2,151** | **466** | **466** | **3,083** | **11.9x (Largest)** |
| **Cross-Silo Totals** | 1,235 unique | 1,439 unique | 5,079 | 1,235 | 1,235 | 7,549 | Max/Min = 11.9x |

---

## Domain Caveats & Zero-Leakage Guarantees

### English
- **Strict Zero Temporal Leakage**: Standard random cross-validation randomly shuffles historical ratings, leaking future consumer purchases into training embeddings. Our Leave-Last-2-Out chronological split guarantees that for 100% of evaluated users, $\max(t_{\text{train}}) < t_{\text{val}} < t_{\text{test}}$, completely eliminating temporal data leakage.
- **Zero Label Leakage in Candidate Pool**: Candidate negatives in `eval_negatives.json` were audited against each user's complete interaction history. Zero false negatives (unobserved items that the user actually purchased in train, val, or test) exist in the candidate sets.
- **Decoupled User Privacy Invariant**: Although user IDs are indexed globally in `user_mapping.json` for simulation consistency, the user embedding matrix $U_c \in \mathbb{R}^{N_c \times d}$ is initialized and optimized strictly on client device $c$. It is never serialized or transmitted to the Flower server.
- **Extreme Statistical Skew**: The Dirichlet partition ($\alpha=0.5$) generates severe data starvation in Client 1 (43 users, 188 pairs) and Client 3 (39 users, 132 pairs), replicating real-world edge IoT/mobile deployments where small devices cannot train reliable recommender models in isolation.
- **Masked Aggregation Invariant**: Cold items that are not observed by client $c$ in communication round $t$ receive a zero mask. In Masked FedAvg, only clients with non-zero interaction counts contribute to item updates, preventing cold item representations from being diluted by uninformative zero-gradients.

### Bahasa Indonesia
- **Jaminan Nol Kebocoran Waktu**: Validasi silang acak standar mengacak urutan ulasan historis, membocorkan pembelian masa depan ke dalam proses pelatihan. Protokol kronologis Leave-Last-2-Out menjamin 100% sampel pengguna mematuhi $\max(t_{\text{train}}) < t_{\text{val}} < t_{\text{test}}$, mengeliminasi kebocoran data temporal secara mutlak.
- **Jaminan Nol Kebocoran Label pada Negatif**: Seluruh kandidat negatif pada `eval_negatives.json` telah diaudit terhadap rekam jejak lengkap setiap pengguna. Tidak ada *false negative* (item yang sebenarnya pernah diulas pengguna di masa lalu atau masa depan) dalam kumpulan kandidat.
- **Invarian Privasi Profil Pengguna Terpisah**: Meskipun ID pengguna dipetakan secara global di `user_mapping.json` untuk konsistensi simulasi, matriks bobot pengguna $U_c \in \mathbb{R}^{N_c \times d}$ diinisialisasi dan dioptimasi secara eksklusif di perangkat lokal klien $c$, dan tidak pernah dikirimkan ke server Flower.
- **Skep Statistik Ekstrem**: Partisi Dirichlet ($\alpha=0.5$) menghasilkan kelaparan data ekstrem pada Client 1 (43 pengguna, 188 pasang) dan Client 3 (39 pengguna, 132 pasang), merefleksikan kondisi perangkat mobile/IoT dunia nyata di mana perangkat kecil tidak dapat melatih model rekomendasi yang andal secara terisolasi.
- **Invarian Agregasi Bermasker**: Item yang tidak diobservasi oleh klien $c$ pada putaran komunikasi $t$ diberikan masker nol. Pada Masked FedAvg, hanya klien dengan frekuensi interaksi positif yang berkontribusi pada pembaruan bobot item, mencegah representasi item dingin dirusak oleh gradien nol yang tidak informatif.
