'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: t('nav_all'), href: '/', active: pathname === '/' },
    { label: t('nav_ai'), href: '/?category=ai', active: false },
    { label: t('nav_sports'), href: '/?category=sports', active: false },
    { label: t('nav_history'), href: '/?category=history', active: false },
  ];

  return (
    <header className="border-b border-[#E8E5DF] bg-[#FDFCFB]/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="group flex items-center space-x-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-charcoal-900 group-hover:text-accent transition-colors">
                FedSocial
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-[#E8E5DF]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    item.active
                      ? 'bg-charcoal-900 text-white font-semibold'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-[#F2EFE9]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="flex items-center border border-[#DED9D2] rounded bg-white p-0.5 text-xs font-mono shadow-sm">
              <button
                onClick={() => setLang('id')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  lang === 'id'
                    ? 'bg-charcoal-900 text-white font-bold'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                title="Bahasa Indonesia"
              >
                ID
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  lang === 'en'
                    ? 'bg-charcoal-900 text-white font-bold'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Settings & Diagnostics Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded text-xs font-medium transition-colors ${
                  settingsOpen
                    ? 'border-charcoal-900 bg-charcoal-900 text-white'
                    : 'border-[#DED9D2] bg-white text-charcoal-700 hover:border-charcoal-500'
                }`}
                title={t('btn_settings')}
              >
                <span>⚙</span>
                <span className="hidden sm:inline">{t('btn_settings')}</span>
              </button>

              {/* Dropdown Menu */}
              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#DED9D2] rounded shadow-lg p-2 z-50 text-xs font-sans">
                  <div className="px-3 py-2 border-b border-[#F0ECE6]">
                    <p className="font-bold text-charcoal-900">{t('settings_title')}</p>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">
                      {lang === 'id' ? 'Instrumen riset & diagnostik lokal' : 'Research & local diagnostics'}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/edge-data"
                      onClick={() => setSettingsOpen(false)}
                      className="block px-3 py-2 rounded hover:bg-[#FAF8F5] transition-colors"
                    >
                      <p className="font-semibold text-charcoal-900">{t('settings_edge_data')}</p>
                      <p className="text-[11px] text-charcoal-500 mt-0.5">{t('settings_edge_desc')}</p>
                    </Link>

                    <Link
                      href="/fl-network"
                      onClick={() => setSettingsOpen(false)}
                      className="block px-3 py-2 rounded hover:bg-[#FAF8F5] transition-colors"
                    >
                      <p className="font-semibold text-charcoal-900">{t('settings_fl_network')}</p>
                      <p className="text-[11px] text-charcoal-500 mt-0.5">{t('settings_fl_desc')}</p>
                    </Link>
                  </div>

                  <div className="px-3 py-2 bg-[#FAF8F5] border-t border-[#F0ECE6] rounded-b text-[10px] text-charcoal-600 leading-tight">
                    <strong className="block text-charcoal-800 mb-0.5">Zero-Leakage Privacy:</strong>
                    {t('settings_privacy_desc')}
                  </div>
                </div>
              )}
            </div>

            {/* Auth / Account Profile */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-[#E8E5DF]">
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="w-7 h-7 rounded-full bg-charcoal-900 text-white flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.username || 'U')[0].toUpperCase()}
                  </span>
                  <span className="font-semibold hidden lg:inline max-w-[100px] truncate text-charcoal-900">
                    {user.displayName || user.username}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-charcoal-500 hover:text-red-700 hover:underline px-1 py-0.5"
                >
                  {t('btn_logout')}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold text-white bg-charcoal-900 hover:bg-accent px-3.5 py-1.5 rounded transition-colors shadow-sm"
              >
                {t('btn_login')}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <nav className="flex md:hidden items-center space-x-2 py-2 overflow-x-auto text-xs font-medium border-t border-[#F0ECE6]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
                item.active
                  ? 'bg-charcoal-900 text-white font-semibold'
                  : 'text-charcoal-600 hover:bg-[#F2EFE9]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
