'use client';

import Link from 'next/link';
import { Article } from '@fedsocial/shared-types';
import { useLanguage } from '@/lib/language-context';

interface ArticleCardProps {
  article: Article & {
    recommendationScore?: number;
    explanation?: string;
  };
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const { lang, t } = useLanguage();

  const categoryLabels: Record<string, { id: string; en: string; style: string }> = {
    ai: {
      id: 'AI & KECERDASAN BUATAN',
      en: 'ARTIFICIAL INTELLIGENCE',
      style: 'text-indigo-900 bg-indigo-50/80 border-indigo-200/80',
    },
    sports: {
      id: 'ANALISIS OLAHRAGA',
      en: 'SPORTS ANALYTICS',
      style: 'text-emerald-900 bg-emerald-50/80 border-emerald-200/80',
    },
    history: {
      id: 'SEJARAH DUNIA',
      en: 'WORLD HISTORY',
      style: 'text-amber-950 bg-amber-50/80 border-amber-200/80',
    },
  };

  const catKey = (article.category?.toLowerCase() || 'ai');
  const catConfig = categoryLabels[catKey] || {
    id: article.category?.toUpperCase() || 'UMUM',
    en: article.category?.toUpperCase() || 'GENERAL',
    style: 'text-charcoal-800 bg-stone-100 border-stone-200',
  };

  const pubDate = article.publishedAt || (article as any).published_at || new Date().toISOString();
  const dateFormatted = new Date(pubDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const readMin = article.readingTimeMinutes ?? (article as any).estimated_read_min ?? 4;
  const authorName = article.author || (lang === 'id' ? 'Tim Redaksi FedSocial' : 'FedSocial Editorial Staff');
  const excerptText = article.summary || article.excerpt || '';
  const articleLang = (article as any).language || 'en';

  return (
    <article
      className={`group relative flex flex-col justify-between border border-[#E8E5DF] bg-[#FFFFFF] p-6 transition-all duration-200 hover:border-charcoal-800 hover:shadow-md ${
        featured ? 'md:col-span-2 md:p-8 bg-[#FAF8F5]' : ''
      }`}
    >
      <div>
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3 text-xs font-mono text-charcoal-500 mb-3.5 pb-2.5 border-b border-[#F5F3EF]">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border shrink-0 ${catConfig.style}`}
            >
              {lang === 'id' ? catConfig.id : catConfig.en}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-charcoal-700 uppercase shrink-0 border border-stone-200">
              {articleLang.toUpperCase()}
            </span>
            {article.subcategory && article.subcategory !== article.category && (
              <span className="truncate text-charcoal-600 hidden sm:inline text-[11px]">
                {article.subcategory}
              </span>
            )}
          </div>
          <span className="shrink-0 whitespace-nowrap text-[11px] font-mono text-charcoal-500 font-medium">
            {readMin} {t('read_time')}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`font-serif font-bold text-charcoal-900 group-hover:text-accent transition-colors leading-snug mb-3 ${
            featured ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
          }`}
        >
          <Link href={`/posts/${article.slug}`}>
            <span className="absolute inset-0" />
            {article.title}
          </Link>
        </h3>

        {/* Excerpt */}
        {excerptText && (
          <p className="text-charcoal-600 text-sm leading-relaxed line-clamp-3 mb-5 font-sans">
            {excerptText}
          </p>
        )}
      </div>

      <div className="pt-2">
        {/* Local Recommendation Match Pill */}
        {typeof article.recommendationScore === 'number' && (
          <div className="mb-3.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#EAE7E2] rounded flex items-center justify-between text-[11px] font-mono text-charcoal-700">
            <span className="flex items-center gap-1.5 font-bold text-accent">
              <span>★</span>
              <span>
                {lang === 'id' ? 'Kesesuaian Edge:' : 'Edge Match:'}{' '}
                {(article.recommendationScore * 100).toFixed(0)}%
              </span>
            </span>
            <span className="text-charcoal-500 text-[10px] truncate max-w-[170px]">
              {article.explanation || (lang === 'id' ? 'Dihitung di browser' : 'In-browser calculated')}
            </span>
          </div>
        )}

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE6] text-xs font-mono text-charcoal-500">
          <span className="font-semibold text-charcoal-800 truncate max-w-[180px]">{authorName}</span>
          <span className="shrink-0">{dateFormatted}</span>
        </div>
      </div>
    </article>
  );
}
