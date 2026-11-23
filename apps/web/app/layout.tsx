import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Header } from '@/components/Header';
import { LanguageProvider } from '@/lib/language-context';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'FedSocial — Editorial Reading & Federated Learning Research',
  description:
    'A privacy-preserving personalized reading platform powered by On-Device Edge Recommendation and Federated Learning.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="bg-[#FDFCFB] text-[#111110]">
      <body className="min-h-screen flex flex-col font-sans selection:bg-accent-light selection:text-charcoal-900">
        <LanguageProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
              {children}
            </main>
            <footer className="border-t border-[#E8E5DF] bg-[#FAF8F5] py-8 mt-16 text-xs text-charcoal-500">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-bold text-charcoal-800 text-sm">FedSocial</span>
                  <span className="text-charcoal-400">•</span>
                  <span>Platform Baca & Publikasi Kurasi</span>
                </div>
                <div className="text-charcoal-500 text-[11px]">
                  © {new Date().getFullYear()} FedSocial. Hak Cipta Dilindungi.
                </div>
              </div>
            </footer>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
