'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Settings, User, LogOut } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { BrandLogo } from '@/components/BrandLogo';

function HeaderContent() {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCategory =
    pathname === '/' ? searchParams.get('category') || 'all' : null;

  const navItems = [
    { label: t('nav_all'), href: '/', active: activeCategory === 'all' },
    { label: t('nav_ai'), href: '/?category=ai', active: activeCategory === 'ai' },
    { label: t('nav_sports'), href: '/?category=sports', active: activeCategory === 'sports' },
    { label: t('nav_history'), href: '/?category=history', active: activeCategory === 'history' },
  ];

  return (
    <header className="border-b border-[#E8E5DF] bg-[#FDFCFB]/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo + Desktop Nav */}
          <div className="flex items-center space-x-5 min-w-0">
            <Link href="/" className="group flex items-center shrink-0" aria-label="Y News Home">
              <BrandLogo size="md" />
            </Link>

            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-[#E8E5DF]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    item.active
                      ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                      : 'text-charcoal-600 font-medium hover:text-charcoal-900 hover:bg-[#EAE6DE]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center border border-[#DED9D2] rounded bg-white p-0.5 text-xs font-mono">
              <button
                onClick={() => setLang('id')}
                className={`px-2 py-1 sm:py-0.5 rounded text-[11px] transition-colors ${
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
                className={`px-2 py-1 sm:py-0.5 rounded text-[11px] transition-colors ${
                  lang === 'en'
                    ? 'bg-charcoal-900 text-white font-bold'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Settings Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 border rounded text-xs font-medium transition-colors min-h-[32px] ${
                  settingsOpen
                    ? 'border-charcoal-900 bg-charcoal-900 text-white'
                    : 'border-[#DED9D2] bg-white text-charcoal-700 hover:border-charcoal-500 hover:bg-[#F5F3EF]'
                }`}
                aria-label={t('btn_settings')}
                title={t('btn_settings')}
              >
                <Settings className="w-3.5 h-3.5 stroke-[2]" />
                <span className="hidden sm:inline">{t('btn_settings')}</span>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white border border-[#DED9D2] rounded-md shadow-lg p-2 z-50 text-xs font-sans">
                  <div className="px-3 py-2 border-b border-[#F0ECE6]">
                    <p className="font-bold text-charcoal-900">{t('settings_title')}</p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {user && (
                      <Link
                        href="/profile"
                        onClick={() => setSettingsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                          pathname === '/profile'
                            ? 'bg-[#F2EFE9] font-semibold text-charcoal-900'
                            : 'hover:bg-[#FAF8F5] text-charcoal-800'
                        }`}
                      >
                        <User className="w-3.5 h-3.5 text-charcoal-600" />
                        <span>{lang === 'id' ? 'Profil & Pengaturan Akun' : 'Profile & Account'}</span>
                      </Link>
                    )}

                    <Link
                      href="/edge-data"
                      onClick={() => setSettingsOpen(false)}
                      className={`block px-3 py-2 rounded transition-colors ${
                        pathname === '/edge-data'
                          ? 'bg-[#F2EFE9] font-semibold text-charcoal-900'
                          : 'hover:bg-[#FAF8F5] text-charcoal-800'
                      }`}
                    >
                      <p className="font-semibold text-charcoal-900">{t('settings_edge_data')}</p>
                      <p className="text-[11px] text-charcoal-500 mt-0.5">{t('settings_edge_desc')}</p>
                    </Link>

                    <Link
                      href="/fl-network"
                      onClick={() => setSettingsOpen(false)}
                      className={`block px-3 py-2 rounded transition-colors ${
                        pathname === '/fl-network'
                          ? 'bg-[#F2EFE9] font-semibold text-charcoal-900'
                          : 'hover:bg-[#FAF8F5] text-charcoal-800'
                      }`}
                    >
                      <p className="font-semibold text-charcoal-900">{t('settings_fl_network')}</p>
                      <p className="text-[11px] text-charcoal-500 mt-0.5">{t('settings_fl_desc')}</p>
                    </Link>

                    {user && (
                      <button
                        onClick={() => {
                          setSettingsOpen(false);
                          logout();
                        }}
                        className="w-full md:hidden flex items-center gap-2 px-3 py-2 rounded text-left text-red-700 hover:bg-red-50 transition-colors font-medium border-t border-[#F0ECE6] mt-1 pt-2.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('btn_logout')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auth / Account Profile */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-[#E8E5DF]">
                <Link
                  href="/profile"
                  className={`flex items-center space-x-1.5 text-xs px-1.5 sm:px-2 py-1 rounded transition-colors ${
                    pathname === '/profile'
                      ? 'bg-[#ECE8E1] text-charcoal-900 font-bold ring-1 ring-charcoal-900/20'
                      : 'hover:bg-[#F2EFE9] text-charcoal-800'
                  }`}
                  title={lang === 'id' ? 'Profil Pengguna' : 'User Profile'}
                >
                  <span className="w-7 h-7 rounded-full bg-charcoal-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(user.displayName || user.username || 'U')[0].toUpperCase()}
                  </span>
                  <span className="font-semibold hidden sm:inline max-w-[96px] truncate">
                    {user.displayName || user.username}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="hidden md:inline-block text-xs text-charcoal-500 hover:text-red-700 hover:underline px-1 py-0.5 font-medium"
                >
                  {t('btn_logout')}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={`text-xs font-semibold px-3 sm:px-3.5 py-1.5 rounded transition-colors min-h-[32px] flex items-center ${
                  pathname === '/login'
                    ? 'bg-accent text-white font-bold'
                    : 'text-white bg-charcoal-900 hover:bg-accent'
                }`}
              >
                {t('btn_login')}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <nav className="flex md:hidden items-center space-x-1.5 py-2 overflow-x-auto text-xs font-medium border-t border-[#F0ECE6] -mx-3 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded whitespace-nowrap transition-colors min-h-[34px] flex items-center shrink-0 ${
                item.active
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                  : 'text-charcoal-600 hover:bg-[#F2EFE9]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded whitespace-nowrap transition-colors min-h-[34px] flex items-center shrink-0 ${
                pathname === '/profile'
                  ? 'bg-charcoal-900 text-white font-semibold shadow-sm'
                  : 'text-charcoal-600 hover:bg-[#F2EFE9]'
              }`}
            >
              {lang === 'id' ? 'Profil' : 'Profile'}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense
      fallback={
        <header className="border-b border-[#E8E5DF] bg-[#FDFCFB]/95 h-14 sm:h-16 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <BrandLogo size="md" />
        </header>
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
