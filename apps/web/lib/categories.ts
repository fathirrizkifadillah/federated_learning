export type CategorySlug = 'ai' | 'sports' | 'history';

export function normalizeCategorySlug(category?: string, categorySlug?: string): CategorySlug {
  const raw = (categorySlug || category || 'ai').toLowerCase().trim();

  if (
    raw === 'ai' ||
    raw.includes('artificial') ||
    raw.includes('intelligence') ||
    raw.includes('kecerdasan') ||
    raw.includes('machine learning')
  ) {
    return 'ai';
  }

  if (
    raw === 'sports' ||
    raw.includes('sport') ||
    raw.includes('olahraga') ||
    raw.includes('athlet')
  ) {
    return 'sports';
  }

  if (
    raw === 'history' ||
    raw.includes('histor') ||
    raw.includes('sejarah') ||
    raw.includes('archaeo')
  ) {
    return 'history';
  }

  return 'ai';
}

const LABELS: Record<CategorySlug, { id: string; en: string }> = {
  ai: { id: 'Kecerdasan Buatan', en: 'Artificial Intelligence' },
  sports: { id: 'Olahraga', en: 'Sports' },
  history: { id: 'Sejarah', en: 'History' },
};

export function getCategoryLabel(
  category: string | undefined,
  categorySlug: string | undefined,
  lang: 'id' | 'en'
): string {
  const slug = normalizeCategorySlug(category, categorySlug);
  return LABELS[slug][lang];
}
