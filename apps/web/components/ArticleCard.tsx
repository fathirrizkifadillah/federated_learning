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

  const categoryColors: Record<string, string> = {
    ai: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    sports: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    history: 'text-amber-900 bg-amber-50 border-amber-200',
  };

  const badgeStyle =
    categoryColors[article.category?.toLowerCase() || ''] || 'text-charcoal-700 bg-stone-100 border-stone-200';

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
      className={`group relative flex flex-col justify-between border border-[#EAE7E2] bg-surface p-5 sm:p-6 rounded-none hover:border-accent/40 hover:shadow-sm transition-all ${
        featured ? 'md:col-span-2 md:p-8 bg-[#FAF8F5]' : ''
      }`}
    >
      <div>
        {/* Meta Header */}
        <div className="flex items-center justify-between text-xs font-mono text-charcoal-500 mb-3">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeStyle} uppercase`}>
              {article.category}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#EAE7E2] bg-stone-50 font-bold">
              {articleLang === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
            </span>
            <span>•</span>
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{article.subcategory}</span>
          </div>
          <span>
            {readMin} {t('read_time')}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`font-serif font-bold text-charcoal-900 group-hover:text-accent transition-colors leading-snug mb-2.5 ${
            featured ? 'text-2xl sm:text-3xl' : 'text-xl'
          }`}
        >
          <Link href={`/posts/${article.slug}`}>
            <span className="absolute inset-0" />
            {article.title}
          </Link>
        </h3>

        {/* Excerpt */}
        {excerptText && (
          <p className="text-charcoal-700 text-sm leading-relaxed line-clamp-3 mb-4 font-sans">
            {excerptText}
          </p>
        )}
      </div>

      <div>
        {/* Local Recommendation Match Pill */}
        {typeof article.recommendationScore === 'number' && (
          <div className="mb-3 px-2.5 py-1 bg-[#FBF9F6] border border-[#EAE7E2] rounded flex items-center justify-between text-[11px] font-mono text-charcoal-700">
            <span className="flex items-center gap-1 font-semibold text-accent">
              <span>★</span>
              <span>
                {lang === 'id' ? 'Skor Keselarasan Edge:' : 'Edge Match Score:'}{' '}
                {(article.recommendationScore * 100).toFixed(0)}%
              </span>
            </span>
            <span className="text-charcoal-500 truncate max-w-[180px]">
              {article.explanation || (lang === 'id' ? 'Dihitung di browser' : 'In-browser match')}
            </span>
          </div>
        )}

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE6] text-xs font-mono text-charcoal-500">
          <span className="font-medium text-charcoal-800">{authorName}</span>
          <span>{dateFormatted}</span>
        </div>
      </div>
    </article>
  );
}
