'use client';

import Link from 'next/link';
import { Article } from '@fedsocial/shared-types';
import { useLanguage } from '@/lib/language-context';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const { lang } = useLanguage();

  const categoryLabels: Record<string, { id: string; en: string }> = {
    ai: {
      id: 'Kecerdasan Buatan',
      en: 'Artificial Intelligence',
    },
    sports: {
      id: 'Olahraga',
      en: 'Sports',
    },
    history: {
      id: 'Sejarah',
      en: 'History',
    },
  };

  const catKey = (article.category?.toLowerCase() || 'ai');
  const catLabel = categoryLabels[catKey]
    ? lang === 'id'
      ? categoryLabels[catKey].id
      : categoryLabels[catKey].en
    : article.category;

  const pubDate = article.publishedAt || (article as any).published_at || new Date().toISOString();
  const dateFormatted = new Date(pubDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const authorName = article.author || (lang === 'id' ? 'Redaksi FedSocial' : 'FedSocial Staff');
  const excerptText = article.summary || article.excerpt || '';

  return (
    <article
      className={`group relative flex flex-col justify-between border border-[#E8E5DF] bg-white p-6 rounded transition-all duration-200 hover:border-charcoal-700 hover:shadow-sm ${
        featured ? 'md:col-span-2 md:p-8 bg-[#FAF8F5]' : ''
      }`}
    >
      <div>
        {/* Clean Category Label */}
        <div className="mb-3">
          <span className="text-[11px] font-semibold text-accent tracking-wider uppercase">
            {catLabel}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`font-serif font-bold text-charcoal-900 group-hover:text-accent transition-colors leading-snug mb-2.5 ${
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

      {/* Author and Date Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE6] text-xs text-charcoal-500 font-sans">
        <span className="font-medium text-charcoal-800">{authorName}</span>
        <span>{dateFormatted}</span>
      </div>
    </article>
  );
}
