import { prisma } from '../../config/prisma';

export class PostsService {
  static async getFeed(options: {
    category?: string;
    limit?: number;
    cursor?: string;
    sort?: 'latest' | 'trending';
    language?: string;
  }) {
    const limit = Math.min(options.limit || 20, 50);
    const where: any = {};

    if (options.category && options.category.toLowerCase() !== 'all') {
      where.category = {
        slug: options.category.toLowerCase(),
      };
    }

    if (options.language && options.language.toLowerCase() !== 'all') {
      where.language = options.language.toLowerCase();
    }

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        take: limit + 1,
        ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
        orderBy: { publishedAt: 'desc' },
        include: {
          category: true,
          tags: { include: { tag: true } },
          images: { take: 1 },
        },
      }),
    ]);

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    return {
      total,
      items: posts.map((p) => ({
        id: p.id,
        article_id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt || p.body.slice(0, 180) + '...',
        summary: p.excerpt || p.body.slice(0, 180) + '...',
        body: p.body,
        content: p.body,
        category: p.category.name,
        category_slug: p.category.slug,
        subcategory: p.category.name,
        tags: p.tags.map((t) => t.tag.name),
        word_count: p.wordCount,
        wordCount: p.wordCount,
        estimated_read_min: p.estimatedReadMin,
        readingTimeMinutes: p.estimatedReadMin,
        language: p.language,
        published_at: p.publishedAt.toISOString(),
        publishedAt: p.publishedAt.toISOString(),
        image_url: p.images[0]?.imageUrl || null,
      })),
      nextCursor,
    };
  }

  static async getPostBySlug(slug: string) {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        category: true,
        tags: { include: { tag: true } },
        images: true,
      },
    });

    if (!post) {
      throw { statusCode: 404, code: 'POST_NOT_FOUND', message: 'Article not found.' };
    }

    return {
      article_id: post.id,
      slug: post.slug,
      title: post.title,
      body: post.body,
      excerpt: post.excerpt,
      category: post.category.name,
      category_slug: post.category.slug,
      tags: post.tags.map((t) => t.tag.name),
      word_count: post.wordCount,
      estimated_read_min: post.estimatedReadMin,
      language: post.language,
      images: post.images.map((img) => ({
        image_url: img.imageUrl,
        license: img.license,
        attribution: img.attribution,
      })),
      source_type: post.sourceType,
      reference_urls: post.referenceUrls,
      published_at: post.publishedAt.toISOString(),
    };
  }

  static async getCandidates(limit: number = 100, language?: string) {
    const where: any = {};
    if (language && language.toLowerCase() !== 'all') {
      where.language = language.toLowerCase();
    }

    const posts = await prisma.post.findMany({
      where,
      take: Math.min(limit, 200),
      select: {
        id: true,
        slug: true,
        title: true,
        body: true,
        excerpt: true,
        categoryId: true,
        category: { select: { name: true, slug: true } },
        wordCount: true,
        estimatedReadMin: true,
        language: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    return posts.map((p) => ({
      id: p.id,
      article_id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.excerpt || p.body.slice(0, 180) + '...',
      category: p.category.name,
      category_slug: p.category.slug,
      subcategory: p.category.name,
      word_count: p.wordCount,
      estimated_read_min: p.estimatedReadMin,
      readingTimeMinutes: p.estimatedReadMin,
      language: p.language,
      published_at: p.publishedAt.toISOString(),
      publishedAt: p.publishedAt.toISOString(),
    }));
  }

  static async search(query: string, limit: number = 20) {
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
          { tags: { some: { tag: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      },
      take: limit,
      include: {
        category: true,
        tags: { include: { tag: true } },
        images: { take: 1 },
      },
    });

    return posts.map((p) => ({
      article_id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || p.body.slice(0, 180) + '...',
      category: p.category.name,
      tags: p.tags.map((t) => t.tag.name),
      word_count: p.wordCount,
      estimated_read_min: p.estimatedReadMin,
      published_at: p.publishedAt.toISOString(),
      image_url: p.images[0]?.imageUrl || null,
    }));
  }
}
