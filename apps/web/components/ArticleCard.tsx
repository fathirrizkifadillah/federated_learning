'use client';

import Link from 'next/link';
import { Article } from '@fedsocial/shared-types';
import { useLanguage } from '@/lib/language-context';
import { getCategoryLabel } from '@/lib/categories';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const { lang } = useLanguage();

  const catLabel = getCategoryLabel(
    article.category,
    (article as any).category_slug,
    lang
  );

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
      className={`group relative flex flex-col justify-between border border-[#E8E5DF] bg-white p-4 sm:p-6 rounded-md transition-colors duration-150 hover:border-charcoal-700 hover:shadow-sm ${
        featured ? 'md:col-span-2 md:p-8 bg-[#FAF8F5]' : ''
      }`}
    >
      <div>
        {/* Clean Category Label */}
        <div className="mb-2 sm:mb-3">
          <span className="text-[11px] font-semibold text-accent tracking-wide">
            {catLabel}
          </span>
        </div>

        {/* Title */}
        <h3
          className={`font-serif font-bold text-charcoal-900 group-hover:text-accent transition-colors leading-snug mb-2 sm:mb-2.5 ${
            featured ? 'text-xl sm:text-3xl' : 'text-lg sm:text-xl'
          }`}
        >
          <Link href={`/posts/${article.slug}`}>
            <span className="absolute inset-0" />
            {article.title}
          </Link>
        </h3>

        {/* Excerpt */}
        {excerptText && (
          <p className="text-charcoal-600 text-sm leading-relaxed line-clamp-3 mb-4 sm:mb-5 font-sans">
            {excerptText}
          </p>
        )}
      </div>

      {/* Author and Date Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F0ECE6] text-xs text-charcoal-500 font-sans">
        <span className="font-medium text-charcoal-800 truncate pr-2">{authorName}</span>
        <span className="shrink-0">{dateFormatted}</span>
      </div>
    </article>
  );
}
