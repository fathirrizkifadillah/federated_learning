import { Article, Category } from '@fedsocial/shared-types';
import fallbackArticlesData from './fallback-articles.json';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const fallbackArticles = fallbackArticlesData as unknown as Article[];

export async function fetchFeedPosts(
  category?: string,
  page = 1,
  limit = 30,
  lang?: string
): Promise<{
  posts: Article[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category && category !== 'all') {
      params.append('category', category);
    }
    if (lang && lang !== 'all') {
      params.append('language', lang);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${API_BASE_URL}/posts?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.data?.posts && data.data.posts.length > 0) {
      return data.data;
    }
    throw new Error('Empty backend data, falling back to local catalog');
  } catch (err) {
    // Robust local fallback when backend API is offline
    let filtered = [...fallbackArticles];

    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      filtered = filtered.filter(
        a => a.category?.toLowerCase() === catLower ||
             (a as any).category_id?.toLowerCase() === catLower
      );
    }

    if (lang && lang !== 'all') {
      filtered = filtered.filter(a => (a as any).language === lang);
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const sliced = filtered.slice(startIndex, startIndex + limit);

    return {
      posts: sliced,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export async function fetchPostBySlug(slug: string): Promise<Article | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${API_BASE_URL}/posts/${slug}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('Post not found');
    const data = await res.json();
    return data.data;
  } catch (err) {
    const found = fallbackArticles.find(
      a => a.slug === slug || a.id === slug || (a as any).article_id === slug
    );
    return found || null;
  }
}

export async function fetchPublicCandidates(limit = 100, lang?: string): Promise<Article[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const params = new URLSearchParams({ limit: String(limit) });
    if (lang && lang !== 'all') {
      params.append('language', lang);
    }

    const res = await fetch(`${API_BASE_URL}/posts/candidates?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    let candidates: Article[] = data.data.candidates || [];
    if (candidates.length > 0) return candidates;
    throw new Error('Empty candidate pool');
  } catch (err) {
    let pool = [...fallbackArticles];
    if (lang && lang !== 'all') {
      pool = pool.filter(a => (a as any).language === lang);
    }
    return pool.slice(0, limit);
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_BASE_URL}/categories`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    return [
      { id: 'cat-ai-001', name: 'Artificial Intelligence', slug: 'ai', description: 'Machine learning, neural networks, ethics & compute' },
      { id: 'cat-sports-002', name: 'Sports', slug: 'sports', description: 'Tactics, analytics, football, basketball & athletics' },
      { id: 'cat-history-003', name: 'World History', slug: 'history', description: 'Civilizations, conflicts, economics & historical analysis' },
    ];
  }
}
