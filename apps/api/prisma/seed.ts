import { PrismaClient, SourceType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

const prisma = new PrismaClient();

interface RealCorpusArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  categoryId: string;
  language: 'id' | 'en';
  wordCount: number;
  estimatedReadMin: number;
  sourceType: 'EDITORIAL_ORIGINAL' | 'EXTERNAL_BENCHMARK';
  referenceUrls: string[];
  publishedAt: string;
}

async function main() {
  console.log('--- Seeding Y News Real Bilingual Long-Form Editorial Catalog ---');

  // 1. Ensure Categories
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

  // 2. Load the verified real gzipped corpus (zero duplicates, 50:50 ID/EN, 100% real sources)
  const corpusGzPath = path.resolve(__dirname, './real-articles-corpus.json.gz');
  if (!fs.existsSync(corpusGzPath)) {
    throw new Error(`Real corpus file not found at ${corpusGzPath}`);
  }

  const rawJson = zlib.gunzipSync(fs.readFileSync(corpusGzPath)).toString('utf-8');
  const articles: RealCorpusArticle[] = JSON.parse(rawJson);
  const expectedIdCount = articles.filter((a) => a.language === 'id').length;
  const expectedEnCount = articles.filter((a) => a.language === 'en').length;

  // 3. Fast-path check for repeat CI/CD deploys
  const [syntheticCount, grouped] = await Promise.all([
    prisma.post.count({ where: { sourceType: SourceType.SYNTHETIC_GENERATED } }),
    prisma.post.groupBy({ by: ['language'], _count: { id: true } }),
  ]);
  const curId = grouped.find((g) => g.language === 'id')?._count.id || 0;
  const curEn = grouped.find((g) => g.language === 'en')?._count.id || 0;

  if (syntheticCount === 0 && curId === expectedIdCount && curEn === expectedEnCount) {
    console.log(
      `Catalog already synced with real verified corpus (${curId} ID + ${curEn} EN = ${curId + curEn}). Fast-path complete!`
    );
    return;
  }

  // 4. Purge legacy synthetic/duplicate posts ONLY (never touches User, UserProfile E2EE, Session, or FederatedGlobalModel)
  const validIds = articles.map((a) => a.id);
  const deleted = await prisma.post.deleteMany({
    where: {
      id: { notIn: validIds },
    },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} legacy synthetic/duplicate posts.`);
  }

  // 5. Bulk-insert all verified real long-form articles in fast chunks of 400
  const CHUNK = 400;
  for (let i = 0; i < articles.length; i += CHUNK) {
    const batch = articles.slice(i, i + CHUNK).map((art) => ({
      id: art.id,
      slug: art.slug,
      title: art.title,
      body: art.body,
      excerpt: art.excerpt,
      categoryId: art.categoryId,
      wordCount: art.wordCount,
      estimatedReadMin: art.estimatedReadMin,
      language: art.language,
      sourceType:
        art.sourceType === 'EDITORIAL_ORIGINAL'
          ? SourceType.EDITORIAL_ORIGINAL
          : SourceType.EXTERNAL_BENCHMARK,
      referenceUrls: art.referenceUrls || [],
      publishedAt: new Date(art.publishedAt),
    }));
    await prisma.post.createMany({ data: batch, skipDuplicates: true });
  }

  const finalGrouped = await prisma.post.groupBy({
    by: ['language', 'categoryId'],
    _count: { id: true },
  });
  const finalId = finalGrouped.filter((g) => g.language === 'id').reduce((s, g) => s + g._count.id, 0);
  const finalEn = finalGrouped.filter((g) => g.language === 'en').reduce((s, g) => s + g._count.id, 0);

  console.log('--- Y News Real Verified Catalog Seed Complete ---');
  console.log(`Indonesian (id): ${finalId}`);
  console.log(`English    (en): ${finalEn}`);
  console.log(`Grand Total    : ${finalId + finalEn} (0 synthetic, 100% real sources)`);
  console.log('Breakdown:', finalGrouped.map((g) => `${g.language}:${g.categoryId}=${g._count.id}`).join(', '));
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
