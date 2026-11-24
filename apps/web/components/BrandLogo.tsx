'use client';

interface BrandLogoProps {
  size?: 'sm' | 'md';
}

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const isSmall = size === 'sm';

  return (
    <span className="inline-flex items-center gap-2 select-none">
      {/* Editorial Monogram Stamp */}
      <span
        className={`relative inline-flex items-center justify-center rounded-[5px] bg-charcoal-900 text-[#FDFCFB] overflow-hidden shadow-sm transition-colors duration-150 group-hover:bg-charcoal-800 ${
          isSmall ? 'w-6 h-6' : 'w-8 h-8'
        }`}
        aria-hidden="true"
      >
        <span
          className={`font-serif font-bold leading-none -mt-0.5 tracking-tight ${
            isSmall ? 'text-sm' : 'text-lg'
          }`}
        >
          Y
        </span>
        <span className="absolute bottom-0 inset-x-0 h-[3px] bg-accent transition-all duration-150 group-hover:h-[4px]" />
      </span>

      {/* Masthead Wordmark */}
      <span className="flex flex-col leading-none">
        <span
          className={`font-serif font-bold uppercase text-charcoal-900 transition-colors duration-150 group-hover:text-accent ${
            isSmall ? 'text-sm tracking-[0.1em]' : 'text-[17px] sm:text-[19px] tracking-[0.11em]'
          }`}
        >
          News
        </span>
        {!isSmall && (
          <span className="hidden sm:block text-[8.5px] font-sans font-semibold uppercase tracking-[0.24em] text-charcoal-500 mt-0.5">
            Editorial
          </span>
        )}
      </span>
    </span>
  );
}
