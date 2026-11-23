'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

export function Header() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="border-b border-[#EAE7E2] bg-[#FDFCFB]/90 sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 border-b border-[#F0ECE6]">
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="group flex items-center space-x-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-charcoal-900 group-hover:text-accent transition-colors">
                FedSocial
              </span>
              <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#F5F3EF] text-charcoal-700 border border-[#EAE7E2]">
                v2.0 FL
              </span>
            </Link>
          </div>

          {/* Subtitle / Privacy Notice */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-charcoal-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald"></span>
            <span>{t('privacy_badge')}</span>
          </div>

          {/* Nav Actions & Language Switcher */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center border border-[#DED9D2] rounded bg-white p-0.5 text-xs font-mono shadow-sm">
              <button
                onClick={() => setLang('id')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  lang === 'id'
                    ? 'bg-charcoal-900 text-white font-bold'
                    : 'text-charcoal-600 hover:text-charcoal-900 font-medium'
                }`}
                title="Beralih ke Bahasa Indonesia"
              >
                ID
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  lang === 'en'
                    ? 'bg-charcoal-900 text-white font-bold'
                    : 'text-charcoal-600 hover:text-charcoal-900 font-medium'
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>

            <Link
              href="/edge-data"
              className="text-xs font-mono font-medium text-charcoal-700 hover:text-accent border border-[#EAE7E2] hover:border-accent/40 bg-surface px-3 py-1.5 rounded transition-all shadow-sm hidden sm:inline-block"
            >
              {t('btn_edge_data')}
            </Link>
            <Link
              href="/fl-network"
              className="text-xs font-mono font-medium bg-charcoal-900 hover:bg-accent text-white px-3 py-1.5 rounded transition-colors shadow-sm"
            >
              {t('btn_fl_network')}
            </Link>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="flex items-center space-x-6 py-2.5 overflow-x-auto text-sm font-medium text-charcoal-700">
          <Link href="/" className="hover:text-accent transition-colors whitespace-nowrap">
            {t('nav_all')}
          </Link>
          <Link href="/?category=ai" className="hover:text-accent transition-colors whitespace-nowrap">
            {t('nav_ai')}
          </Link>
          <Link href="/?category=sports" className="hover:text-accent transition-colors whitespace-nowrap">
            {t('nav_sports')}
          </Link>
          <Link href="/?category=history" className="hover:text-accent transition-colors whitespace-nowrap">
            {t('nav_history')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
