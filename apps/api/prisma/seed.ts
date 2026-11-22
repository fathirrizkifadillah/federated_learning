import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding FedSocial V2 Database ---');

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
  console.log('Categories seeded: AI, Sports, World History');

  // 2. Load Processed 3,000 Articles
  const articlesJsonPath = path.resolve(__dirname, '../../../ml/data/processed/articles.json');
  if (!fs.existsSync(articlesJsonPath)) {
    console.error(`Articles JSON file not found at ${articlesJsonPath}. Run generation script first.`);
    return;
  }

  const rawData = fs.readFileSync(articlesJsonPath, 'utf-8');
  const articles = JSON.parse(rawData);
  console.log(`Loaded ${articles.length} articles from JSON.`);

  // Mapping from category name to Category ID
  const categoryMap: Record<string, string> = {
    AI: 'cat-ai-001',
    ai: 'cat-ai-001',
    Sports: 'cat-sports-002',
    sports: 'cat-sports-002',
    History: 'cat-history-003',
    history: 'cat-history-003',
  };

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    
    await prisma.$transaction(
      batch.map((art: any) =>
        prisma.post.upsert({
          where: { slug: art.slug },
          update: {
            title: art.title,
            body: art.body || art.content,
            excerpt: art.summary || art.excerpt,
            categoryId: categoryMap[art.category] || 'cat-ai-001',
            wordCount: art.word_count || art.wordCount || 250,
            estimatedReadMin: art.estimated_read_min || art.readingTimeMinutes || 3,
            publishedAt: new Date(art.published_at || art.publishedAt),
          },
          create: {
            id: art.id || art.article_id,
            slug: art.slug,
            title: art.title,
            body: art.body || art.content,
            excerpt: art.summary || art.excerpt,
            categoryId: categoryMap[art.category] || 'cat-ai-001',
            wordCount: art.word_count || art.wordCount || 250,
            estimatedReadMin: art.estimated_read_min || art.readingTimeMinutes || 3,
            language: 'en',
            sourceType: 'SYNTHETIC_GENERATED',
            referenceUrls: [],
            publishedAt: new Date(art.published_at || art.publishedAt),
          },
        })
      )
    );

    console.log(`Seeded articles ${i + 1} - ${Math.min(i + BATCH_SIZE, articles.length)} of ${articles.length}`);
  }

  console.log('--- Successfully seeded 3,000 articles into PostgreSQL! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
