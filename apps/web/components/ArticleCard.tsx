import Link from 'next/link';
import { Article } from '@fedsocial/shared-types';

interface ArticleCardProps {
  article: Article & {
    recommendationScore?: number;
    explanation?: string;
  };
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const categoryColors: Record<string, string> = {
    ai: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    sports: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    history: 'text-amber-900 bg-amber-50 border-amber-200',
  };

  const badgeStyle =
    categoryColors[article.category.toLowerCase()] || 'text-charcoal-700 bg-stone-100 border-stone-200';

  const pubDate = article.publishedAt || article.published_at || new Date().toISOString();
  const dateFormatted = new Date(pubDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const readMin = article.readingTimeMinutes ?? article.estimated_read_min ?? 5;
  const authorName = article.author || 'FedSocial Editorial Staff';
  const excerptText = article.summary || article.excerpt || '';

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
            <span>•</span>
            <span>{article.subcategory}</span>
          </div>
          <span>{readMin} min read</span>
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

        {/* Excerpt / Summary */}
        <p className="text-charcoal-700 text-sm leading-relaxed mb-4 line-clamp-3">
          {excerptText}
        </p>
      </div>

      {/* Footer Meta & Private Edge Badge */}
      <div className="pt-3 border-t border-[#F5F3EF] flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-500">
        <div className="flex items-center space-x-2 font-mono">
          <span className="font-medium text-charcoal-800">{authorName}</span>
          <span>•</span>
          <time dateTime={pubDate}>{dateFormatted}</time>
        </div>

        {/* On-device private recommendation indicator */}
        {article.recommendationScore !== undefined && (
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#F5F3EF] border border-[#EAE7E2] text-[11px] font-mono text-charcoal-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span>
            <span>Edge Rank: {(article.recommendationScore * 100).toFixed(0)}%</span>
            {article.explanation && (
              <span className="text-[10px] text-charcoal-500 hidden sm:inline">({article.explanation})</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
