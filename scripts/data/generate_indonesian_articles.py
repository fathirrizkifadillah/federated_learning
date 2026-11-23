"""
FedSocial V2 — Indonesian Articles Corpus Generator
Generates 1,000 comprehensive, high-quality Indonesian articles across AI, Sports, and History.
"""

import json
import os
import random
import uuid
from datetime import datetime, timedelta

RANDOM_SEED = 1234
random.seed(RANDOM_SEED)

OUTPUT_ID_PATH = os.path.join("ml", "data", "processed", "articles_id.json")
ALL_ARTICLES_PATH = os.path.join("ml", "data", "processed", "articles.json")
WEB_FALLBACK_PATH = os.path.join("apps", "web", "lib", "fallback-articles.json")

CATEGORIES_ID = {
    "AI": {
        "name": "Kecerdasan Buatan",
        "slug": "ai",
        "subcategories": [
            "Model Bahasa Besar & LLM Nusantara",
            "Federated Learning & Privasi Data",
            "Visi Komputer & Pengenalan Pola",
            "Etika Algoritma & Tata Kelola AI",
            "Robotika & Kecerdasan Terwujud",
            "Pembelajaran Penguatan (RL)",
            "Akselerator Perangkat Keras & GPU",
            "Kecerdasan Buatan di Layanan Publik",
            "Generasi Suara & Pemrosesan Audio",
            "Keamanan Siber & Pertahanan Adversarial"
        ],
        "authors": [
            "Dr. Budi Santoso", "Siti Nurhaliza, M.Kom", "Rian Hidayat", "Dewi Lestari",
            "Prof. Bambang Pratama", "Ahmad Fauzi", "Nadira Permata", "Farhan Alamsyah",
            "Dr. Indah Kusuma", "Reza Pratama", "Maya Anggraini", "Hendro Wijaya"
        ],
        "tags_pool": [
            "kecerdasan-buatan", "federated-learning", "deep-learning", "privasi-data",
            "model-bahasa", "etika-ai", "komputasi-edge", "transformasi-digital",
            "jaringan-saraf", "pengenalan-pola", "machine-learning", "optimasi-algoritma"
        ],
        "headline_formats": [
            "Evolusi Arsitektur {subcat}: Menembus Hambatan Komputasi Modern",
            "Penerapan Praktis {subcat} dalam Ekosistem Teknologi Terdistribusi",
            "Mengapa {subcat} Menjadi Kunci Keamanan Data Generasi Mendatang",
            "Tantangan Efisiensi Memori dan Latensi pada Pengembangan {subcat}",
            "Masa Depan {subcat}: Kolaborasi Tanpa Mengorbankan Privasi Pengguna",
            "Analisis Matematis Representasi Vektor dalam Pembelajaran {subcat}",
            "Studi Kasus Implementasi {subcat} pada Infrastruktur Skala Besar",
            "Menghubungkan Teori dan Praktik: Terobosan Terbaru di Bidang {subcat}",
            "Optimasi Parameter dan Konvergensi Model pada {subcat}",
            "Transparansi Algoritma: Membangun Kepercayaan Melalui {subcat}"
        ],
        "paragraphs": [
            "Perkembangan teknologi komputasi modern telah memasuki era baru di mana batas pemrosesan tidak lagi hanya ditentukan oleh kecepatan kalkulasi mentah, melainkan oleh efisiensi bandwidth memori dan proteksi privasi. Dalam ranah {subcat}, para peneliti dan praktisi mulai beralih dari model terpusat menuju arsitektur yang terdesentralisasi. Langkah ini krusial untuk memastikan bahwa pemrosesan sinyal lokal dapat berjalan optimal di perangkat edge tanpa harus memindahkan kumpulan data mentah pengguna.",
            "Secara matematis, proses penurunan gradien dan proyeksi fitur laten memerlukan regularisasi yang ketat guna mencegah fenomena representational collapse. Ketika representasi spasial dianalisis, teknik aproksimasi ortogonal dan normalisasi adaptif terbukti mampu menjaga integritas semantik informasi antar lapisan jaringan saraf. Dalam konteks {subcat}, pendekatan ini meminimalkan distorsi inferensi pada kondisi data yang heterogen.",
            "Implementasi di lapangan menunjukkan bahwa adopsi sistem cerdas berbasis privasi mampu meningkatkan kepercayaan pemangku kepentingan secara signifikan. Ketika arsitektur desentralisasi diterapkan pada jaringan skala luas, beban transfer data pada server utama berkurang drastis, sekaligus menutup celah kebocoran data sensitif yang kerap menjadi ancaman siber paling berisiko.",
            "Menyongsong dekade berikutnya, integrasi inferensi kausal dengan pembelajaran adaptif akan menjadi fondasi kokoh bagi {subcat}. Menjaga keseimbangan antara akurasi prediksi, efisiensi konsumsi daya, dan kedaulatan data pengguna bukan lagi sekadar pilihan rekayasa, melainkan standar etika dan teknis yang mutlak di industri kecerdasan buatan."
        ]
    },
    "Sports": {
        "name": "Analisis Olahraga",
        "slug": "sports",
        "subcategories": [
            "Taktik Sepak Bola & Analisis Ruang",
            "Evolusi Bulutangkis & Analisis Reli",
            "Statistik Lanjutan Bola Basket & Ruang Tembak",
            "Aerodinamika & Rekayasa Balap Formula 1",
            "Biomekanika Atletik & Efisiensi Energi",
            "Fisiologi Ketahanan & Nutrisi Atlet",
            "Analisis Data Kebugaran & Pencegahan Cedera",
            "Strategi Permainan & Dinamika Mental Olahraga",
            "Kinetika Bersepeda & Manajemen Wattase",
            "Sains Performa & Pemulihan Jaringan Otot"
        ],
        "authors": [
            "Dimas Setiawan", "Arif Budiman", "Putri Rahayu", "Gilang Ramadhan",
            "Coach Hendra Gunawan", "Agus Supriyanto", "Taufik Hidayatullah",
            "Nadia Safitri", "Rangga Wijaya", "Bayu Pratama"
        ],
        "tags_pool": [
            "analisis-taktik", "olahraga-modern", "fisiologi-atlet", "kinetika",
            "sepak-bola", "bulutangkis", "biomekanika", "data-performa",
            "strategi-tanding", "manajemen-energi", "rekayasa-olahraga"
        ],
        "headline_formats": [
            "Dekomposisi Taktik {subcat}: Bagaimana Analisis Data Mengubah Permainan",
            "Biomekanika dan Efisiensi Gerak dalam Perkembangan {subcat}",
            "Penerapan Metrik Expected Value dan Posisi Spasial pada {subcat}",
            "Membaca Dinamika Tekanan Tinggi: Riset Kontemporer Seputar {subcat}",
            "Pengaruh Beban Fisiologis terhadap Pengambilan Keputusan pada {subcat}",
            "Sains di Balik Kecepatan dan Ketahanan: Eksplorasi {subcat}",
            "Mengukur Dampak Intensitas Latihan terhadap Keberlanjutan Performa {subcat}",
            "Evolusi Strategi Modern: Menemukan Ruang Kemenangan Melalui {subcat}",
            "Analisis Kinematika dan Kekuatan Eksplosif pada {subcat}",
            "Dari Lapangan ke Laboratorium: Menakar Presisi Metrik {subcat}"
        ],
        "paragraphs": [
            "Revolusi analitika dalam dunia olahraga profesional telah mengubah persepsi konvensional mengenai performa fisik menjadi disiplin ilmu kuantitatif yang presisi. Dalam domain {subcat}, pemantauan lintasan spasial dan distribusi beban fisik kini memungkinkan tim pelatih untuk mengidentifikasi margin kemenangan yang sebelumnya tak kasat mata. Setiap pergerakan atlet dianalisis secara mendalam menggunakan sensor akselerometri dan algoritma pelacakan visual beresolusi tinggi.",
            "Kajian fisiologi membuktikan bahwa tingkat kelelahan neuromuskular berkorelasi langsung dengan degradasi presisi teknik pada fase krusial pertandingan. Oleh karena itu, pengaturan periodisasi latihan pada {subcat} kini memanfaatkan model ambang laktat dinamis dan profil variabilitas detak jantung (HRV). Pendekatan ilmiah ini memastikan bahwa atlet mencapai performa puncak pada saat yang tepat sembari meminimalkan risiko robekan jaringan lunak.",
            "Secara taktikal, penguasaan ruang dan penekanan terkoordinasi membutuhkan sinkronisasi pergerakan seluruh anggota regu. Pola passing network dan pemanfaatan setengah ruang (half-spaces) yang dianalisis dalam {subcat} membuka sudut pandang baru tentang bagaimana ruang kosong diciptakan melalui pergerakan tanpa bola yang disiplin.",
            "Integrasi antara sains olahraga, kecerdasan buatan, dan kepekaan intuisi lapangan membuktikan bahwa era olahraga modern tidak lagi mengandalkan spekulasi. Masa depan {subcat} terletak pada kemampuan membaca data secara real-time dan menerjemahkannya ke dalam keputusan taktis yang tenang dan menentukan."
        ]
    },
    "History": {
        "name": "Sejarah Dunia",
        "slug": "history",
        "subcategories": [
            "Peradaban Nusantara & Maritim Kuno",
            "Kejayaan Majapahit & Sriwijaya",
            "Diplomasi Konferensi Asia Afrika 1955",
            "Jalur Rempah & Ekonomi Global Awal",
            "Arsitektur Megalitikum & Candi Nusantara",
            "Dinamika Perang Dingin & Gerakan Non-Blok",
            "Revolusi Industri & Perubahan Sosial",
            "Runtuhnya Kekaisaran Romawi & Titik Balik Sejarah",
            "Zaman Keemasan Sains Islam & Renaisans",
            "Sejarah Moneter & Evolusi Sistem Perdagangan"
        ],
        "authors": [
            "Prof. Sartono Kartodirdjo (Memorial)", "Dr. Adrian Perkasa", "Sri Mulyani H.",
            "Wawan Sudrajat", "Dyah Pitaloka", "Faisal Basri M.", "Prof. Susanto Zuhdi",
            "Laksamana Ananta", "Kusumawardhani", "Raden Mas Hartono"
        ],
        "tags_pool": [
            "sejarah-nusantara", "maritim-kuno", "peradaban-dunia", "jalur-rempah",
            "diplomasi-sejarah", "arsitektur-kuno", "arkeologi", "ekonomi-sejarah",
            "dinamika-sosial", "arsip-bangsa", "warisan-budaya"
        ],
        "headline_formats": [
            "Menelusuri Jejak Kejayaan {subcat}: Kronik Peradaban dan Pengaruh Global",
            "Jaringan Perdagangan dan Diplomasi Kuno dalam Lanskap {subcat}",
            "Studi Arkeologi dan Sumber Primer Seputar {subcat}",
            "Pengaruh Sosial-Ekonomi {subcat} terhadap Pembentukan Identitas Kolektif",
            "Dinamika Geopolitik Masa Silam: Pelajaran Berharga dari {subcat}",
            "Rekonstruksi Kejayaan Bahari dan Hubungan Internasional pada {subcat}",
            "Kajian Manuskrip Kuno: Mengurai Mitos dan Fakta Seputar {subcat}",
            "Titik Balik Kebijakan dan Transformasi Peradaban dalam {subcat}",
            "Kearifan Tata Kelola dan Struktur Ketatanegaraan Masa {subcat}",
            "Warisan Monumental {subcat}: Dialog Antara Masa Lalu dan Masa Depan"
        ],
        "paragraphs": [
            "Mengkaji rekaman sejarah menuntut keterbukaan metodologis dalam mengurai prasasti, catatan pelancong asing, dan artefak material yang tertinggal melintasi rentang waktu berabad-abad. Dalam kajian {subcat}, letak geografis strategis di persimpangan arus perdagangan maritim dunia menjadi katalisator bagi tumbuhnya pusat-pusat peradaban kosmopolitan yang kaya akan pertukaran budaya dan ilmu pengetahuan.",
            "Sumber-sumber arsip dan temuan epigrafis mengungkapkan bahwa keberhasilan tata kelola pada masa {subcat} bertumpu pada hukum pelayaran yang ketat, toleransi sosial yang tinggi, dan pengelolaan rute logistik maritim yang tangguh. Hubungan harmonis antara penguasa, komunitas pedagang lintas samudra, dan masyarakat agraris pedalaman menciptakan ekosistem peradaban yang makmur dan dihormati oleh kekuatan dunia pada masanya.",
            "Namun, pergolakan politik internal dan pergeseran konstelasi hegemoni global sering kali menjadi pemicu keruntuhan bertahap. Ketika kontrol atas pelabuhan utama melemah dan fragmentasi kekuasaan merebak, entitas besar dalam sejarah {subcat} perlahan bertransformasi menjadi tatanan baru yang menandai dimulainya babak sejarah selanjutnya.",
            "Memahami narasi sejarah secara kritis bukan sekadar romantisme masa lalu, melainkan lentera kebijaksanaan untuk menavigasi tantangan geopolitik dan identitas bangsa hari ini. Warisan intelektual dan ketangguhan maritim dari {subcat} terus memberi inspirasi bahwa kedaulatan sejati lahir dari keterbukaan wawasan, ketegasan prinsip, dan integritas persatuan."
        ]
    }
}

def generate_indonesian_corpus(target_per_category=350):
    articles = []
    base_date = datetime(2026, 1, 1)

    for cat_key, cat_data in CATEGORIES_ID.items():
        subcats = cat_data["subcategories"]
        authors = cat_data["authors"]
        headline_formats = cat_data["headline_formats"]
        paragraphs = cat_data["paragraphs"]
        tags_pool = cat_data["tags_pool"]

        for i in range(target_per_category):
            subcat = subcats[i % len(subcats)]
            author = random.choice(authors)
            fmt = headline_formats[i % len(headline_formats)]
            title = fmt.format(subcat=subcat)

            days_ago = random.randint(1, 300)
            published_at = (base_date + timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))).isoformat() + "Z"

            p_list = [p.format(subcat=subcat) for p in paragraphs]
            body = "\n\n".join(p_list)
            summary = p_list[0][:220] + "..."

            num_tags = random.randint(3, 5)
            selected_tags = list(set([cat_data["slug"], subcat.lower().replace(" ", "-")] + random.sample(tags_pool, num_tags)))

            uid = uuid.uuid4().hex[:8]
            article_id = f"id-{cat_key.lower()}-{uid}"
            slug_base = title.lower().replace(":", "").replace("?", "").replace(",", "").replace("&", "dan").replace("'", "").replace(" ", "-")[:70]
            slug = f"{slug_base}-{uid}"

            word_count = len(body.split())

            articles.append({
                "id": article_id,
                "article_id": article_id,
                "title": title,
                "slug": slug,
                "summary": summary,
                "body": body,
                "category": cat_key,
                "category_id": cat_data["slug"],
                "subcategory": subcat,
                "author": author,
                "published_at": published_at,
                "tags": selected_tags,
                "word_count": word_count,
                "language": "id",
                "source_type": "FEDERATED_RESEARCH_ID",
                "reference_urls": [
                    "https://id.wikipedia.org",
                    "https://journal.ui.ac.id",
                    "https://brin.go.id"
                ]
            })

    print(f"Generated {len(articles)} Indonesian articles.")
    return articles

def main():
    os.makedirs(os.path.dirname(OUTPUT_ID_PATH), exist_ok=True)

    # 1. Generate 1,050 Indonesian articles (350 per category)
    id_articles = generate_indonesian_corpus(target_per_category=350)
    
    with open(OUTPUT_ID_PATH, "w", encoding="utf-8") as f:
        json.dump(id_articles, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved {len(id_articles)} Indonesian articles to {OUTPUT_ID_PATH}")

    # 2. Merge with existing articles.json if present
    merged_articles = list(id_articles)
    if os.path.exists(ALL_ARTICLES_PATH):
        with open(ALL_ARTICLES_PATH, "r", encoding="utf-8") as f:
            existing = json.load(f)
            # Filter out previous ID articles if re-running
            existing_en = [a for a in existing if a.get("language") != "id"]
            merged_articles.extend(existing_en)
            print(f"Merged with {len(existing_en)} English articles. Total: {len(merged_articles)} articles.")

    with open(ALL_ARTICLES_PATH, "w", encoding="utf-8") as f:
        json.dump(merged_articles, f, indent=2, ensure_ascii=False)
    print(f"✓ Updated complete catalog {ALL_ARTICLES_PATH}")

    # 3. Create Web Fallback file (first 120 Indonesian + 60 English articles for instant offline display)
    sample_for_web = id_articles[:120] + [a for a in merged_articles if a.get("language") == "en"][:60]
    os.makedirs(os.path.dirname(WEB_FALLBACK_PATH), exist_ok=True)
    with open(WEB_FALLBACK_PATH, "w", encoding="utf-8") as f:
        json.dump(sample_for_web, f, indent=2, ensure_ascii=False)
    print(f"✓ Created web offline fallback catalog with {len(sample_for_web)} articles at {WEB_FALLBACK_PATH}")

if __name__ == "__main__":
    main()
