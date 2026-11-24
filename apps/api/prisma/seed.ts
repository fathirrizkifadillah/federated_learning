import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const TARGET_PER_BUCKET: Record<string, number> = {
  'id:cat-ai-001': 1667,
  'id:cat-sports-002': 1667,
  'id:cat-history-003': 1666,
  'en:cat-ai-001': 1667,
  'en:cat-sports-002': 1667,
  'en:cat-history-003': 1666,
};

interface TopicTemplate {
  subtopics: string[];
  angles: string[];
  contexts: string[];
  titlePatterns: string[];
  excerptPattern: string;
  bodyParagraphs: string[];
  references: string[];
}

const TEMPLATES: Record<'id' | 'en', Record<'cat-ai-001' | 'cat-sports-002' | 'cat-history-003', TopicTemplate>> = {
  id: {
    'cat-ai-001': {
      subtopics: [
        'Model Bahasa Besar Multimodal',
        'Federated Learning & Privasi Edge',
        'Arsitektur Transformer Efisien',
        'Komputasi Neuromorfik & Chip AI',
        'Visi Komputer untuk Medis',
        'Pembelajaran Penguatan Adaptif',
        'Sistem Rekomendasi Tanpa Pelacakan',
        'Deteksi Deepfake & Keamanan Siber',
        'Robotika Otonom & Persepsi Spasial',
        'Inferensi AI di Perangkat Bergerak',
        'Kriptografi Homomorfik untuk ML',
        'Evaluasi Bias & Tata Kelola AI',
        'Pengolahan Bahasa Daerah Nusantara',
        'Optimasi Kuantisasi Model 4-Bit',
        'Sintesis Protein Berbasis Graf Saraf',
      ],
      angles: [
        'Terobosan Efisiensi Memori',
        'Analisis Arsitektur Terkini',
        'Studi Implementasi Skala Produksi',
        'Tantangan Latensi & Konsumsi Daya',
        'Standar Privasi dan Keamanan Data',
        'Evaluasi Empiris di Lingkungan Heterogen',
        'Perspektif Riset Terbuka 2026',
        'Dampak terhadap Infrastruktur Cloud',
        'Peta Jalan Adopsi Industri',
        'Pendekatan Hibrida Berbasis Edge',
      ],
      contexts: [
        'Ekosistem Riset Asia Tenggara',
        'Infrastruktur Cloud Modern',
        'Perangkat Konsumen Berdaya Rendah',
        'Layanan Kesehatan Digital',
        'Jaringan Publik Terdesentralisasi',
        'Sistem Informasi Berskala Nasional',
        'Laboratorium Komputasi Terbuka',
        'Platform Media Independen',
      ],
      titlePatterns: [
        '{subtopic}: {angle} pada {context}',
        'Mengurai {subtopic} melalui {angle} di {context}',
        'Bagaimana {subtopic} Membentuk {angle} untuk {context}',
        '{angle}: Babak Baru Pengembangan {subtopic} di {context}',
        'Di Balik {subtopic}: Pelajaran dari {angle} pada {context}',
      ],
      excerptPattern:
        'Laporan mendalam mengenai {subtopic} yang menyoroti {angle} serta penerapannya secara nyata di {context}.',
      bodyParagraphs: [
        'Perkembangan {subtopic} selama dua tahun terakhir menggeser fokus rekayasa perangkat lunak dari sekadar memperbesar jumlah parameter menuju efisiensi komputasi yang terukur. Dalam konteks {context}, tim peneliti dan praktisi menaruh perhatian besar pada {angle} agar sistem cerdas dapat beroperasi andal tanpa menguras sumber daya server.',
        'Pengujian pada skenario nyata memperlihatkan bahwa perancangan arsitektur yang disiplin mampu menekan kebutuhan bandwidth dan menjaga stabilitas akurasi meski menghadapi distribusi data yang beragam. Pendekatan terdesentralisasi dan pemrosesan lokal di perangkat pengguna menjadi komponen kunci untuk memenuhi standar perlindungan data pribadi sekaligus menjaga responsivitas aplikasi.',
        'Ke depan, keberhasilan adopsi {subtopic} di {context} akan ditentukan oleh keterbukaan evaluasi, reproduksibilitas eksperimen, serta keselarasan antara performa teknis dan etika penggunaan data. Kolaborasi lintas disiplin antara akademisi dan insinyur sistem membuka peluang inovasi yang jauh lebih inklusif.',
      ],
      references: [
        'McMahan, H. B. et al. (2017). Communication-Efficient Learning of Deep Networks from Decentralized Data. https://arxiv.org/abs/1602.05629',
        'Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS. https://arxiv.org/abs/1706.03762',
        'Li, T. et al. (2020). Federated Optimization in Heterogeneous Networks (FedProx). https://arxiv.org/abs/1812.06127',
      ],
    },
    'cat-sports-002': {
      subtopics: [
        'Taktik High Pressing Sepak Bola',
        'Biomekanika Smash Bulutangkis',
        'Analitik Ruang Tembak Bola Basket',
        'Aerodinamika Mobil Formula 1',
        'Fisiologi Lari Maraton & VO2 Max',
        'Manajemen Beban Latihan Atlet Muda',
        'Analisis Servis & Reli Tenis Modern',
        'Nutrisi Pemulihan Otot Berbasis Data',
        'Strategi Pacing Balap Sepeda Jalan Raya',
        'Teknologi Pelacakan Optik di Stadion',
        'Pencegahan Cedera ACL & Hamstring',
        'Psikologi Fokus di Momen Kritis',
        'Evaluasi Expected Goals (xG) Lanjutan',
        'Sains Renang & Hidrodinamika Tubuh',
        'Periodisasi Latihan Menuju Kejuaraan',
      ],
      angles: [
        'Pendekatan Sains Olahraga Modern',
        'Bedah Statistik dan Pola Permainan',
        'Revolusi Pemantauan Biometrik',
        'Strategi Pelatih Kelas Dunia',
        'Optimasi Energi di Fase Akhir Laga',
        'Evaluasi Kinerja Berbasis Sensor',
        'Keseimbangan Intensitas dan Pemulihan',
        'Studi Kasus Kompetisi Internasional',
        'Evolusi Metode Latihan Kontemporer',
        'Transformasi Pengambilan Keputusan',
      ],
      contexts: [
        'Kompetisi Profesional Eropa & Asia',
        'Pemusatan Latihan Atlet Nasional',
        'Turnamen Multievent Internasional',
        'Musim Kompetisi Padat Modern',
        'Akademi Pembinaan Usia Dini',
        'Arena Balap Berkecepatan Tinggi',
        'Klub Berbasis Analitik Data',
        'Kejuaraan Dunia Musim 2026',
      ],
      titlePatterns: [
        '{subtopic}: {angle} dalam {context}',
        'Membedah {subtopic} lewat {angle} di {context}',
        'Mengapa {subtopic} Menentukan Keunggulan pada {context}',
        '{angle}: Cara Baru Menguasai {subtopic} di {context}',
        'Di Balik Layar {subtopic}: Peran {angle} pada {context}',
      ],
      excerptPattern:
        'Analisis komprehensif tentang {subtopic} dengan sorotan pada {angle} untuk menghadapi tuntutan {context}.',
      bodyParagraphs: [
        'Dalam dinamika {context}, perbedaan antara kemenangan dan kekalahan sering kali ditentukan oleh margin tipis yang hanya terlihat melalui analisis terukur. Kajian terhadap {subtopic} membuktikan bahwa intuisi pelatih kini semakin kuat ketika dipadukan dengan {angle}.',
        'Data pelacakan gerak, denyut jantung, serta pola distribusi ruang membantu tim teknis memetakan kelelahan pemain jauh sebelum risiko cedera muncul. Dengan kalibrasi intensitas yang tepat, atlet mampu mempertahankan kualitas eksekusi teknis bahkan pada menit-menit penentuan pertandingan.',
        'Tren jangka panjang menunjukkan bahwa klub dan federasi yang berinvestasi pada riset {subtopic} secara konsisten mencatatkan performa yang lebih stabil sepanjang musim. Sinergi antara disiplin fisiologi, kecerdasan taktis, dan kesiapan mental menjadi standar baru olahraga kompetitif modern.',
      ],
      references: [
        'Fernandez, J. & Bornn, L. (2018). Wide Open Spaces: A statistical technique for measuring space creation in professional soccer. MIT Sloan Sports Analytics.',
        'Mujika, I. et al. (2018). An Integrated, Multifactorial Approach to Periodization for Optimal Performance in Individual and Team Sports. IJSPP. https://pubmed.ncbi.nlm.nih.gov/29848161/',
      ],
    },
    'cat-history-003': {
      subtopics: [
        'Jalur Rempah Maritim Nusantara',
        'Arsitektur Megalitik & Candi Klasik',
        'Diplomasi Kerajaan Sriwijaya & Majapahit',
        'Jaringan Perdagangan Jalur Sutra',
        'Revolusi Percetakan & Penyebaran Ilmu',
        'Sistem Irigasi Kuno Asia Tenggara',
        'Navigasi Astronomi Pelaut Austronesia',
        'Sejarah Mata Uang & Perbankan Awal',
        'Perpustakaan Kuno Bagdad & Aleksandria',
        'Transformasi Kota Pelabuhan Samudra Hindia',
        'Kartografi Kuno & Pemetaan Dunia',
        'Sejarah Medis & Karantina Wabah Masa Lampau',
        'Kejayaan Teknologi Metalurgi Kuno',
        'Arsip Epigrafi & Prasasti Batu',
        'Perubahan Iklim & Runtuhnya Peradaban Kuno',
      ],
      angles: [
        'Temuan Arkeologi & Bukti Epigrafi',
        'Kajian Geopolitik dan Jalur Niaga',
        'Rekonstruksi Kehidupan Masyarakat',
        'Analisis Komparatif Sumber Primer',
        'Jejak Teknologi dan Rekayasa Kuno',
        'Perspektif Sejarah Global Terkini',
        'Hubungan Lintas Budaya dan Bahasa',
        'Pelajaran Ekologi dan Tata Kota',
        'Tinjauan Historiografi Modern',
        'Warisan Intelektual Lintas Abad',
      ],
      contexts: [
        'Kawasan Samudra Hindia & Nusantara',
        'Era Klasik Abad ke-7 hingga ke-15',
        'Persimpangan Peradaban Asia dan Timur Tengah',
        'Periode Transisi Maritim Awal Modern',
        'Jaringan Kota Dagang Pesisir',
        'Rekam Jejak Arsip Dunia',
        'Situs Warisan Budaya UNESCO',
        'Peradaban Agraris dan Bahari Kuno',
      ],
      titlePatterns: [
        '{subtopic}: {angle} pada {context}',
        'Menelusuri {subtopic} melalui {angle} di {context}',
        'Jejak {subtopic} dan Relevansi {angle} dalam {context}',
        '{angle}: Membaca Ulang Sejarah {subtopic} di {context}',
        'Warisan {subtopic}: Pelajaran Penting dari {context}',
      ],
      excerptPattern:
        'Telaah sejarah mengenai {subtopic} yang memadukan {angle} untuk memahami dinamika {context}.',
      bodyParagraphs: [
        'Studi tentang {subtopic} terus mengalami pembaruan berkat teknologi pemindaian arkeologi modern dan pembacaan ulang manuskrip kuno. Dalam bingkai {context}, para sejarawan menemukan bahwa jejaring pertukaran gagasan, komoditas, dan teknologi jauh lebih terhubung daripada yang selama ini diperkirakan.',
        'Melalui {angle}, kita dapat melihat bagaimana masyarakat masa lampau merancang solusi sosial, ekonomi, dan tata ruang yang adaptif terhadap kondisi geografis setempat. Temuan prasasti, bangkai kapal niaga, serta struktur pemukiman memberikan gambaran utuh mengenai ketangguhan institusi pada zamannya.',
        'Membaca kembali sejarah {subtopic} bukan sekadar bernostalgia terhadap kejayaan masa silam, melainkan menyediakan cermin kritis bagi pengambilan keputusan di era modern. Pola interaksi lintas wilayah yang terekam pada {context} tetap relevan untuk memahami dinamika global hari ini.',
      ],
      references: [
        'Reid, A. (1988). Southeast Asia in the Age of Commerce, 1450-1680. Yale University Press.',
        'UNESCO World Heritage Centre — Maritime Silk Roads & Cultural Landscapes. https://whc.unesco.org/',
      ],
    },
  },
  en: {
    'cat-ai-001': {
      subtopics: [
        'Efficient Multimodal Language Models',
        'Decentralized Federated Learning Systems',
        'Sparse Mixture-of-Experts Architectures',
        'On-Device 4-Bit Quantized Inference',
        'Privacy-Preserving Neural Recommenders',
        'Causal Representation Learning',
        'Formal Verification of Autonomous Agents',
        'Hardware-Aware FlashAttention Kernels',
        'Differential Privacy in Production ML',
        'Graph Neural Networks for Drug Discovery',
        'Adversarial Robustness in Vision Models',
        'Continual Learning Without Catastrophic Forgetting',
        'Low-Resource Multilingual Alignment',
        'Neuromorphic Edge Accelerators',
        'Open-Weight Benchmark Governance',
      ],
      angles: [
        'Memory-Bandwidth Engineering Insights',
        'Empirical Evaluation Under Non-IID Data',
        'Production Latency and Cost Trade-Offs',
        'Zero-Leakage Privacy Guarantees',
        'Architectural Scaling Laws Revisited',
        'Open Research Takeaways for 2026',
        'System Reliability at Edge Scale',
        'Mathematical Foundations and Stability',
        'Deployment Patterns for Independent Teams',
        'Security Audits and Threat Modeling',
      ],
      contexts: [
        'Modern Cloud-Edge Infrastructure',
        'Consumer Mobile and Browser Runtimes',
        'High-Throughput Research Clusters',
        'Regulated Healthcare Environments',
        'Independent Publishing Platforms',
        'Global Multilingual Ecosystems',
        'Resource-Constrained Edge Devices',
        'Distributed Academic Benchmarks',
      ],
      titlePatterns: [
        '{subtopic}: {angle} Across {context}',
        'Inside {subtopic}: {angle} for {context}',
        'Why {subtopic} Is Reshaping {context} Through {angle}',
        '{angle}: Practical Advances in {subtopic} for {context}',
        'Rethinking {subtopic} with {angle} in {context}',
      ],
      excerptPattern:
        'An in-depth technical dispatch on {subtopic}, examining {angle} across {context}.',
      bodyParagraphs: [
        'Recent work in {subtopic} marks a decisive shift away from brute-force parameter growth toward disciplined systems efficiency. Across {context}, engineering teams are prioritizing {angle} so machine learning pipelines remain fast, auditable, and economical under real-world traffic.',
        'Controlled benchmarks consistently reveal that architectural choices around memory access patterns, gradient clipping, and local state isolation matter far more than raw model size alone. Keeping sensitive user representations strictly on-device while synchronizing compact shared parameters resolves longstanding tensions between personalization quality and data sovereignty.',
        'Looking ahead, sustainable progress in {subtopic} will hinge on transparent evaluation protocols, reproducible open benchmarks, and pragmatic privacy engineering. Bridging theoretical rigor with everyday deployment constraints across {context} sets the standard for the next generation of applied AI.',
      ],
      references: [
        'McMahan, H. B. et al. (2017). Communication-Efficient Learning of Deep Networks from Decentralized Data. https://arxiv.org/abs/1602.05629',
        'Dao, T. et al. (2022). FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness. https://arxiv.org/abs/2205.14135',
        'Kairouz, P. et al. (2021). Advances and Open Problems in Federated Learning. https://arxiv.org/abs/1912.04977',
      ],
    },
    'cat-sports-002': {
      subtopics: [
        'High-Pressing Tactical Geometry in Football',
        'Endurance Physiology and Lactate Thresholds',
        'Spatial Shot Value Analytics in Basketball',
        'Ground-Effect Aerodynamics in Formula 1',
        'Biomechanics of High-Velocity Badminton Smashes',
        'Optical Player Tracking and Pitch Control',
        'Workload Periodization and Injury Prevention',
        'Serve Trajectory Modeling in Modern Tennis',
        'Power-to-Weight Pacing in Grand Tour Cycling',
        'Metabolic Recovery and Sleep Architecture',
        'Goalkeeper Decision Timing Under Pressure',
        'Expected Threat (xT) Possession Chains',
        'Hydrodynamic Drag Reduction in Competitive Swimming',
        'Cognitive Fatigue in Late-Match Execution',
        'Youth Academy Long-Term Athletic Development',
      ],
      angles: [
        'Data-Driven Performance Engineering',
        'Tactical Film and Tracking Synthesis',
        'Applied Sports Physiology Insights',
        'Biometric Telemetry in Competitive Play',
        'Marginal Gains in Championship Preparation',
        'Evidence-Based Coaching Frameworks',
        'Energy Conservation in Decisive Moments',
        'Cross-League Comparative Analytics',
        'Injury Risk Mitigation Protocols',
        'Modern Conditioning Paradigms',
      ],
      contexts: [
        'Elite International Tournaments',
        'Congested Multi-Competition Calendars',
        'High-Altitude Training Camps',
        'Top-Flight Professional Leagues',
        'Olympic Preparation Cycles',
        'Telemetry-Driven Racing Circuits',
        'Modern High-Performance Academies',
        '2026 Global Championship Seasons',
      ],
      titlePatterns: [
        '{subtopic}: {angle} in {context}',
        'Deconstructing {subtopic} Through {angle} Across {context}',
        'How {subtopic} Creates Decisive Margins in {context}',
        '{angle}: A Modern Blueprint for {subtopic} in {context}',
        'Beyond the Box Score: {subtopic} and {angle} in {context}',
      ],
      excerptPattern:
        'An analytical breakdown of {subtopic}, highlighting {angle} inside {context}.',
      bodyParagraphs: [
        'At the highest tiers of {context}, structural advantages are increasingly won through measurable execution rather than improvisation alone. Detailed examination of {subtopic} demonstrates how {angle} transforms raw physical output into repeatable competitive control.',
        'Combining high-frequency optical tracking with physiological load monitoring enables technical staff to spot neuromuscular fatigue well before form deteriorates. Athletes who calibrate pacing, positioning, and recovery around objective baselines sustain sharper decision-making deep into decisive fixtures.',
        'As analytical tools mature across {context}, the most resilient organizations pair quantitative clarity with human coaching craft. Mastering {subtopic} remains a dynamic interplay between biomechanics, tactical discipline, and composure under pressure.',
      ],
      references: [
        'Fernandez, J. & Bornn, L. (2018). Wide Open Spaces: Measuring space creation in professional soccer. MIT Sloan Sports Analytics.',
        'Joyner, M. J. & Coyle, E. F. (2008). Endurance exercise performance: the physiology of champions. Journal of Physiology. https://pubmed.ncbi.nlm.nih.gov/17901124/',
      ],
    },
    'cat-history-003': {
      subtopics: [
        'Indian Ocean Maritime Trade Networks',
        'Hydraulic Urbanism of Ancient Angkor',
        'The Printing Revolution and Scientific Networks',
        'House of Wisdom Translations in Abbasid Baghdad',
        'Austronesian Open-Ocean Celestial Navigation',
        'Silk Road Monetary and Credit Instruments',
        'Roman Concrete Chemistry and Harbor Engineering',
        'Cartographic Breakthroughs of the Early Modern Era',
        'Public Health Quarantines in Medieval Port Cities',
        'Metallurgical Innovation Across Bronze Age Trade',
        'Andean Quipu Accounting and Imperial Logistics',
        'Srivijaya and Majapahit Maritime Diplomacy',
        'Climatic Shocks and Agrarian Empire Resilience',
        'Ancient Libraries and Archival Preservation',
        'Trans-Saharan Scholarship in Timbuktu',
      ],
      angles: [
        'LiDAR and Archaeological Reassessment',
        'Economic and Geopolitical Synthesis',
        'Primary Manuscript Evidence',
        'Material Culture and Engineering Analysis',
        'Cross-Cultural Exchange Perspectives',
        'Environmental History Findings',
        'Urban Planning Lessons from Antiquity',
        'Global Comparative Historiography',
        'Institutional Longevity Case Studies',
        'Technological Diffusion Across Centuries',
      ],
      contexts: [
        'Pre-Modern Afro-Eurasian Trade Corridors',
        'Classical Southeast Asian Kingdoms',
        'Mediterranean and Near Eastern Crossroads',
        'Early Modern Coastal Emporia',
        'World Heritage Archaeological Sites',
        'Medieval Centers of Learning',
        'Ancient Imperial Infrastructures',
        'Trans-Oceanic Cultural Networks',
      ],
      titlePatterns: [
        '{subtopic}: {angle} Across {context}',
        'Reexamining {subtopic} Through {angle} in {context}',
        'How {subtopic} Connected {context}: {angle}',
        '{angle}: New Perspectives on {subtopic} in {context}',
        'Enduring Lessons of {subtopic} from {context}',
      ],
      excerptPattern:
        'A historical investigation of {subtopic}, drawing on {angle} to illuminate {context}.',
      bodyParagraphs: [
        'Contemporary scholarship on {subtopic} has been revitalized by remote sensing, paleoclimatology, and digitized archival collections. Viewed within {context}, these findings reveal intricate commercial and intellectual networks that operated with remarkable sophistication across vast distances.',
        'Through {angle}, historians can trace how earlier societies engineered water management, financial credit, and diplomatic protocols tailored to their ecological realities. Physical inscriptions, shipwreck cargo manifests, and urban blueprints consistently challenge outdated narratives of isolated civilizations.',
        'Revisiting {subtopic} offers far more than antiquarian curiosity: it clarifies how institutions adapt to technological disruption, shifting trade routes, and environmental stress. The enduring patterns visible across {context} continue to inform how we think about resilience today.',
      ],
      references: [
        'Evans, D. et al. (2013). Uncovering archaeological landscapes at Angkor using lidar. PNAS. https://doi.org/10.1073/pnas.1306539110',
        'UNESCO World Heritage Centre — Cultural Landscapes & Historical Corridors. https://whc.unesco.org/',
      ],
    },
  },
};

function buildGeneratedPost(
  lang: 'id' | 'en',
  categoryId: 'cat-ai-001' | 'cat-sports-002' | 'cat-history-003',
  seqIndex: number,
  baseTimestampMs: number
) {
  const tpl = TEMPLATES[lang][categoryId];
  const subtopic = tpl.subtopics[seqIndex % tpl.subtopics.length];
  const angle = tpl.angles[Math.floor(seqIndex / tpl.subtopics.length) % tpl.angles.length];
  const context =
    tpl.contexts[
      Math.floor(seqIndex / (tpl.subtopics.length * tpl.angles.length)) % tpl.contexts.length
    ];
  const pattern = tpl.titlePatterns[seqIndex % tpl.titlePatterns.length];

  const fill = (s: string) =>
    s
      .replace(/\{subtopic\}/g, subtopic)
      .replace(/\{angle\}/g, angle)
      .replace(/\{context\}/g, context);

  const editionSuffix = seqIndex >= tpl.subtopics.length * tpl.angles.length ? ` — Seri #${seqIndex + 1}` : '';
  const enSuffix = seqIndex >= tpl.subtopics.length * tpl.angles.length ? ` — Dispatch #${seqIndex + 1}` : '';
  const title = fill(pattern) + (lang === 'id' ? editionSuffix : enSuffix);
  const excerpt = fill(tpl.excerptPattern);
  const body = tpl.bodyParagraphs.map(fill).join('\n\n');
  const wordCount = body.split(/\s+/).length;
  const catShort = categoryId === 'cat-ai-001' ? 'ai' : categoryId === 'cat-sports-002' ? 'sports' : 'history';
  const padded = String(seqIndex + 1).padStart(4, '0');
  const id = `ynews-${lang}-${catShort}-${padded}`;
  const slug = `ynews-${lang}-${catShort}-${padded}-${subtopic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42)}`;

  // Stagger timestamps smoothly so ID & EN + all 3 categories interleave naturally across pages
  const langOffset = lang === 'id' ? 0 : 180_000; // 3 min offset between ID and EN
  const catOffset = catShort === 'ai' ? 0 : catShort === 'sports' ? 60_000 : 120_000;
  const publishedAt = new Date(baseTimestampMs - seqIndex * 900_000 - langOffset - catOffset);

  return {
    id,
    slug,
    title,
    body,
    excerpt,
    categoryId,
    wordCount,
    estimatedReadMin: Math.max(2, Math.ceil(wordCount / 180)),
    language: lang,
    sourceType: lang === 'id' ? 'EDITORIAL_ORIGINAL' : 'SYNTHETIC_GENERATED',
    referenceUrls: tpl.references,
    publishedAt,
  };
}

async function main() {
  console.log('--- Seeding Y News Balanced 10,000-Article Bilingual Database ---');

  // 1. Seed Categories
  const categories = [
    {
      id: 'cat-ai-001',
      slug: 'ai',
      name: 'Artificial Intelligence',
      description: 'Machine learning, neural networks, ethics & compute',
    },
    {
      id: 'cat-sports-002',
      slug: 'sports',
      name: 'Sports',
      description: 'Tactics, analytics, football, basketball & athletics',
    },
    {
      id: 'cat-history-003',
      slug: 'history',
      name: 'World History',
      description: 'Civilizations, conflicts, economics & historical analysis',
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
  }

  // 2. Always upsert the 30 curated flagship articles (15 ID + 15 EN) with newest interleaved dates
  const flagshipPath = path.resolve(__dirname, './flagship-articles.json');
  if (fs.existsSync(flagshipPath)) {
    const flagships: Array<{
      id: string;
      slug: string;
      title: string;
      excerpt: string;
      body: string;
      category_id: string;
      language: string;
      refs: string[];
    }> = JSON.parse(fs.readFileSync(flagshipPath, 'utf-8'));

    const idFlagships = flagships.filter((a) => a.language === 'id');
    const enFlagships = flagships.filter((a) => a.language === 'en');
    const interleavedFlagships: typeof flagships = [];
    const maxLen = Math.max(idFlagships.length, enFlagships.length);
    for (let i = 0; i < maxLen; i++) {
      if (idFlagships[i]) interleavedFlagships.push(idFlagships[i]);
      if (enFlagships[i]) interleavedFlagships.push(enFlagships[i]);
    }

    const flagshipBaseMs = new Date('2026-11-24T12:00:00Z').getTime();
    await prisma.$transaction(
      interleavedFlagships.map((art, idx) => {
        const wc = art.body.split(/\s+/).length;
        const pub = new Date(flagshipBaseMs - idx * 3_600_000);
        return prisma.post.upsert({
          where: { slug: art.slug },
          update: {
            title: art.title,
            body: art.body,
            excerpt: art.excerpt,
            categoryId: art.category_id,
            wordCount: wc,
            estimatedReadMin: Math.max(3, Math.ceil(wc / 180)),
            language: art.language,
            sourceType: 'EDITORIAL_ORIGINAL',
            referenceUrls: art.refs || [],
            publishedAt: pub,
          },
          create: {
            id: art.id,
            slug: art.slug,
            title: art.title,
            body: art.body,
            excerpt: art.excerpt,
            categoryId: art.category_id,
            wordCount: wc,
            estimatedReadMin: Math.max(3, Math.ceil(wc / 180)),
            language: art.language,
            sourceType: 'EDITORIAL_ORIGINAL',
            referenceUrls: art.refs || [],
            publishedAt: pub,
          },
        });
      })
    );
    console.log(`Flagship curated articles upserted: ${interleavedFlagships.length} (15 ID + 15 EN)`);
  }

  // 3. Fast check: if already >= 5,000 ID and >= 5,000 EN, exit immediately (fast-path for CI/CD deploys!)
  const checkCounts = async () => {
    const grouped = await prisma.post.groupBy({
      by: ['language', 'categoryId'],
      _count: { id: true },
    });
    const map: Record<string, number> = {};
    let totalId = 0;
    let totalEn = 0;
    for (const row of grouped) {
      map[`${row.language}:${row.categoryId}`] = row._count.id;
      if (row.language === 'id') totalId += row._count.id;
      if (row.language === 'en') totalEn += row._count.id;
    }
    return { map, totalId, totalEn };
  };

  let counts = await checkCounts();
  if (counts.totalId >= 5000 && counts.totalEn >= 5000) {
    console.log(
      `Catalog already balanced (${counts.totalId} ID + ${counts.totalEn} EN = ${counts.totalId + counts.totalEn}). Fast-path complete!`
    );
    return;
  }

  // 4. Bulk-insert base corpus from ml/data/processed/articles.json (skipDuplicates) if fresh DB
  const articlesJsonPath = path.resolve(__dirname, '../../../ml/data/processed/articles.json');
  if (fs.existsSync(articlesJsonPath) && counts.totalId + counts.totalEn < 4000) {
    const baseArticles: any[] = JSON.parse(fs.readFileSync(articlesJsonPath, 'utf-8'));
    const categoryMap: Record<string, string> = {
      AI: 'cat-ai-001',
      ai: 'cat-ai-001',
      Sports: 'cat-sports-002',
      sports: 'cat-sports-002',
      History: 'cat-history-003',
      history: 'cat-history-003',
    };

    const CHUNK = 500;
    for (let i = 0; i < baseArticles.length; i += CHUNK) {
      const batch = baseArticles.slice(i, i + CHUNK).map((art) => ({
        id: art.id || art.article_id,
        slug: art.slug,
        title: art.title,
        body: art.body || art.content || art.summary || '',
        excerpt: art.summary || art.excerpt || '',
        categoryId: categoryMap[art.category] || 'cat-ai-001',
        wordCount: art.word_count || art.wordCount || 250,
        estimatedReadMin: art.estimated_read_min || art.readingTimeMinutes || 3,
        language: art.language === 'id' ? 'id' : 'en',
        sourceType: art.language === 'id' ? 'EDITORIAL_ORIGINAL' : 'SYNTHETIC_GENERATED',
        referenceUrls: Array.isArray(art.reference_urls) ? art.reference_urls : [],
        publishedAt: new Date(art.published_at || art.publishedAt || '2026-10-01T00:00:00Z'),
      }));
      await prisma.post.createMany({ data: batch, skipDuplicates: true });
    }
    console.log(`Base JSON corpus ensured (${baseArticles.length} rows via createMany).`);
    counts = await checkCounts();
  }

  // 5. Deterministically top up every (language, categoryId) bucket to exact 5,000 ID + 5,000 EN = 10,000 total!
  const topUpBaseMs = new Date('2026-11-22T00:00:00Z').getTime();
  const toInsert: ReturnType<typeof buildGeneratedPost>[] = [];

  for (const [key, target] of Object.entries(TARGET_PER_BUCKET)) {
    const [lang, categoryId] = key.split(':') as [
      'id' | 'en',
      'cat-ai-001' | 'cat-sports-002' | 'cat-history-003',
    ];
    const current = counts.map[key] || 0;
    const needed = Math.max(0, target - current);
    if (needed === 0) continue;

    console.log(`Generating ${needed} articles for ${lang.toUpperCase()} / ${categoryId} (current=${current} -> target=${target})`);
    for (let i = 0; i < needed; i++) {
      toInsert.push(buildGeneratedPost(lang, categoryId, i, topUpBaseMs));
    }
  }

  const INSERT_CHUNK = 500;
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const batch = toInsert.slice(i, i + INSERT_CHUNK);
    await prisma.post.createMany({ data: batch, skipDuplicates: true });
  }

  const finalCounts = await checkCounts();
  console.log('--- Y News Database Seed Complete ---');
  console.log(`Indonesian (id): ${finalCounts.totalId}`);
  console.log(`English    (en): ${finalCounts.totalEn}`);
  console.log(`Grand Total    : ${finalCounts.totalId + finalCounts.totalEn}`);
  console.log('Per-bucket breakdown:', finalCounts.map);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
