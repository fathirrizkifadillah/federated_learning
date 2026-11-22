import { Article, Category, PublicCandidatePoolResponse } from '@fedsocial/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function fetchFeedPosts(category?: string, page = 1, limit = 20): Promise<{
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

    const res = await fetch(`${API_BASE_URL}/posts?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('API fetch failed, falling back to empty feed', err);
    return { posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

export async function fetchPostBySlug(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn(`Failed to fetch article ${slug}:`, err);
    return null;
  }
}

export async function fetchPublicCandidates(limit = 100): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/posts/candidates?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data.candidates;
  } catch (err) {
    console.warn('Failed to fetch public candidates pool:', err);
    return [];
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.warn('Failed to fetch categories:', err);
    return [
      { id: '1', name: 'Artificial Intelligence', slug: 'ai', description: 'Machine learning, neural networks, ethics & compute' },
      { id: '2', name: 'Sports', slug: 'sports', description: 'Tactics, analytics, football, basketball & athletics' },
      { id: '3', name: 'World History', slug: 'history', description: 'Civilizations, conflicts, economics & historical analysis' },
    ];
  }
}
