# Sistem Rekomendasi Produk Personal Berbasis Federated Learning

Implementasi berorientasi riset untuk sistem rekomendasi produk yang menjaga privasi, menggunakan Federated Learning dan Amazon Reviews 2023.

## Gambaran Umum

Proyek ini mengeksplorasi implementasi sistem rekomendasi produk personal menggunakan **Federated Learning (FL)**.

Sistem rekomendasi tradisional umumnya mengumpulkan data interaksi pengguna di lingkungan terpusat untuk melatih sebuah model global. Meskipun pendekatan ini efektif, ia menimbulkan tantangan terkait privasi data, kepemilikan data, dan pengelolaan data yang terpusat.

Federated Learning menawarkan pendekatan alternatif. Alih-alih mengirimkan data mentah interaksi pengguna ke server pusat, masing-masing klien melatih model secara lokal dan hanya membagikan pembaruan model untuk diagregasi secara global.

Tujuan proyek ini adalah menyelidiki bagaimana Federated Learning dapat mendukung rekomendasi produk yang personal sambil tetap menjaga penyimpanan data yang terdesentralisasi.

## Tujuan Penelitian

Proyek ini berfokus pada tujuan-tujuan berikut:

- Mengimplementasikan model rekomendasi produk menggunakan data interaksi pengguna-item.
- Menerapkan Federated Learning untuk melatih model rekomendasi di banyak klien.
- Menyelidiki dampak distribusi data non-IID terhadap performa rekomendasi federated.
- Membandingkan pendekatan pelatihan terpusat (centralized) dan federated.
- Mengevaluasi kualitas rekomendasi, beban komunikasi, dan performa personalisasi.
- Mengeksplorasi teknik peningkat privasi untuk sistem rekomendasi federated.

## Dataset

**Amazon Reviews 2023**

Proyek ini menggunakan dataset Amazon Reviews 2023 yang dirilis oleh McAuley Lab di University of California, San Diego.

Dataset ini berisi ulasan pengguna berskala besar, rating produk, stempel waktu (timestamp), dan metadata produk dari berbagai kategori produk.

Sumber dataset:

- [Amazon Reviews 2023 — Dataset Resmi](https://amazon-reviews-2023.github.io/)

Demi efisiensi komputasi, pada tahap awal proyek ini akan difokuskan pada satu kategori produk terpilih, bukan memproses seluruh dataset.

Data yang dipilih akan difilter dan ditransformasi menjadi interaksi pengguna-item untuk pelatihan model rekomendasi.

## Arsitektur Sistem

Sistem mengikuti arsitektur federated client-server.

```text
                  Server Federated
                         |
                Agregasi Model Global
                         |
            Parameter Model / Pembaruan
                         |
          +--------------+--------------+
          |              |              |
       Klien 1        Klien 2        Klien N
          |              |              |
      Data Lokal     Data Lokal     Data Lokal
          |              |              |
      Model Lokal    Model Lokal    Model Lokal
          |              |              |
     Latih Lokal    Latih Lokal    Latih Lokal
          |              |              |
          +--------------+--------------+
                         |
                 Pembaruan Model
                         |
                  Server Federated
```

### Komponen Inti

**1. Pemrosesan Data**

- Pemuatan dan eksplorasi dataset.
- Pembersihan dan pemfilteran data.
- Pembentukan interaksi pengguna-item.
- Pemartisian data klien.
- Persiapan data latih, validasi, dan uji.

**2. Model Rekomendasi**

Model rekomendasi awal akan menggunakan Matrix Factorization dengan Bayesian Personalized Ranking (BPR).

Model mempelajari representasi laten dari pengguna dan produk untuk memperkirakan preferensi pengguna serta meranking produk yang relevan.

**3. Federated Learning**

Banyak klien melatih model rekomendasi menggunakan dataset lokal masing-masing.

Server pusat mengagregasi pembaruan model menggunakan Federated Averaging (FedAvg).

Strategi optimasi federated dan personalisasi tambahan akan dieksplorasi pada eksperimen-eksperimen berikutnya.

**4. Evaluasi**

Sistem akan dievaluasi menggunakan metrik kualitas rekomendasi dan pengukuran performa federated learning.

## Teknologi yang Digunakan

| Teknologi | Kegunaan |
|---|---|
| Python | Bahasa pemrograman utama |
| PyTorch | Deep learning dan model rekomendasi |
| Flower | Framework Federated Learning |
| Pandas | Pemrosesan data |
| NumPy | Komputasi numerik |
| scikit-learn | Prapemrosesan data dan utilitas |
| Matplotlib | Visualisasi data |
| Streamlit | Dashboard eksperimental |
| Docker | Pengelolaan lingkungan eksperimen |
| Git | Kontrol versi |

## Eksperimen yang Direncanakan

Eksperimen berikut direncanakan:

| Eksperimen | Deskripsi |
|---|---|
| Pelatihan Terpusat | Melatih model rekomendasi menggunakan data terpusat |
| Pelatihan Lokal Saja | Melatih model independen pada masing-masing klien |
| FedAvg | Pelatihan federated menggunakan Federated Averaging |
| FedProx | Optimasi federated pada data yang heterogen |
| Personalized FL | Menyelidiki strategi personalisasi |

Eksperimen akan menguji distribusi data IID maupun non-IID.

### Metrik Evaluasi

**Metrik Rekomendasi**
- Recall@K
- NDCG@K
- Hit Rate@K

**Metrik Federated Learning**
- Waktu pelatihan
- Biaya komunikasi
- Perilaku konvergensi
- Performa di seluruh klien

## Struktur Proyek

```text
federated-recommender/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── partitions/
│
├── preprocessing/
├── models/
├── clients/
├── server/
├── strategies/
├── evaluation/
├── experiments/
├── dashboard/
├── configs/
├── tests/
├── results/
│
├── requirements.txt
└── README.md
```

Struktur direktori dapat berubah seiring berjalannya implementasi.

## Status Pengembangan

<pre>
[ ] Akuisisi dan eksplorasi dataset
[ ] Prapemrosesan data
[ ] Baseline rekomendasi terpusat
[ ] Implementasi klien federated
[ ] Implementasi FedAvg
[ ] Eksperimen non-IID
[ ] Implementasi FedProx
[ ] Personalized Federated Learning
[ ] Evaluasi performa
[ ] Dashboard eksperimental
[ ] Dokumentasi dan analisis akhir
</pre>

Proyek ini saat ini berada pada tahap perencanaan dan pengembangan awal. Arsitektur, konfigurasi eksperimen, dan detail implementasi dapat berubah seiring kemajuan riset.

## Ruang Lingkup Riset

Fokus utama berada pada irisan dari:

- Sistem Rekomendasi (Recommender Systems)
- Federated Learning
- Optimasi Terdistribusi
- Machine Learning Personal
- Machine Learning yang Menjaga Privasi

Proyek ini dimaksudkan sebagai implementasi riset eksperimental, bukan layanan rekomendasi siap produksi.

---

**Proyek:** Sistem Rekomendasi Produk Personal Berbasis Federated Learning  
**Dataset:** Amazon Reviews 2023  
**Framework:** PyTorch + Flower  
**Status:** Dalam Pengembangan