# Laporan Eksplorasi Data (EDA) — Amazon Reviews 2023 (Electronics)

## 1. Ringkasan Interaksi & Matriks Rekomendasi
* **Total Interaksi Bersih**: 49,871 baris
* **Jumlah Pengguna Unik (|U|)**: 7,386
* **Jumlah Produk Unik (|I|)**: 34,349
* **Kepadatan Matriks (Density)**: 0.0197%
* **Kelangkaan Matriks (Sparsity)**: 99.9803%

> [!NOTE]
> Rasio sparsity sebesar **99.98%** merupakan karakteristik standar dataset interaksi e-commerce skala besar. Pengguna berinteraksi dengan sebagian kecil dari total katalog produk.

---

## 2. Distribusi Aktivitas Pengguna (Interactions per User)
* **Rata-rata interaksi**: 6.75
* **Median**: 3
* **Maksimum**: 810
* **Kuantil Distribusi**:
  * 10%: 1
  * 25%: 1
  * 50% (Median): 3
  * 75%: 6
  * 90%: 13
  * 95%: 21
  * 99%: 71
  * 100% (Max): 810

---

## 3. Distribusi Popularitas Produk (Interactions per Item)
* **Rata-rata interaksi per item**: 1.45
* **Median**: 1
* **Maksimum**: 166
* **Kuantil Distribusi**:
  * 25%: 1
  * 50% (Median): 1
  * 75%: 1
  * 90%: 2
  * 95%: 3
  * 99%: 7
  * 100% (Max): 166

---

## 4. Distribusi Penilaian (Rating) & Skema BPR
| Rating | Jumlah Interaksi | Persentase |
| :---: | :---: | :---: |
| **1.0** | 4,142 | 8.31% |
| **2.0** | 2,114 | 4.24% |
| **3.0** | 3,405 | 6.83% |
| **4.0** | 7,362 | 14.76% |
| **5.0** | 32,848 | 65.87% |

### Analisis Skema Label Bayesian Personalized Ranking (BPR):
* **Umpan Balik Positif (Rating $\ge$ 4.0)**: 40,210 interaksi (80.63%)
* **Umpan Balik Negatif/Rendah (Rating $\le$ 2.0)**: 6,256 interaksi (12.54%)
* **Umpan Balik Netral (Rating = 3.0)**: 3,405 interaksi (6.83%) *(Dikecualikan dari pasangan positif-negatif awal)*

---

## 5. Analisis Temporal (Rentang Waktu)
* **Interaksi Paling Awal**: `2000-10-07 14:21:50 UTC`
* **Interaksi Paling Akhir**: `2023-03-18 02:35:08 UTC`
* **Rentang Waktu**: ~22.4 tahun

### Distribusi Per Tahun (5 Tahun Terakhir):
| Tahun | Jumlah Ulasan | Persentase |
| :---: | :---: | :---: |
| 2017 | 3,882 | 7.78% |
| 2018 | 4,700 | 9.42% |
| 2019 | 6,976 | 13.99% |
| 2020 | 7,405 | 14.85% |
| 2021 | 6,887 | 13.81% |
| 2022 | 6,590 | 13.21% |
| 2023 | 1,172 | 2.35% |

---

## 6. Kualitas Interaksi Tambahan
* **Verified Purchase Rate**: 78.26% (Tinggi, menunjukkan interaksi otentik)
* **Interaksi dengan Helpful Votes (>0)**: 25.63%

---

## 7. Kesimpulan & Implikasi untuk Tahap 2 (Partisi & Leakage Audit)
1. **Pemisahan Kronologis (Time-based Split)**: Rentang timestamp yang luas (2000 s/d 2023) mewajibkan pemisahan data kronologis agar tidak ada *future data leakage* (sesuai arahan skill `leakage-adversary`).
2. **Kepadatan Pengguna**: Karena sebagian besar pengguna hanya memiliki interaksi moderat pada sampel 50k baris ini, strategi evaluasi harus menyaring pengguna dengan interaksi minimal (misal $k$-core filter $\ge 3$ atau $\ge 5$ interaksi) agar pengujian ranking Recall@K dan NDCG@K valid dan memiliki data uji.
3. **Partisi Klien Federasi**: Distribusi popularitas item yang skewed (long-tail) sangat ideal untuk mensimulasikan kondisi **Non-IID** berbasis preferensi kategori/sub-kategori produk.
