import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Header } from '@/components/Header';

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
    <html lang="en" className="bg-[#FDFCFB] text-[#111110]">
      <body className="min-h-screen flex flex-col font-sans selection:bg-accent-light selection:text-charcoal-900">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-[#EAE7E2] bg-[#FAF8F5] py-12 mt-16 text-xs text-charcoal-500 font-mono">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="font-bold text-charcoal-800 text-sm mb-1">FedSocial Research Platform v2.0</p>
              <p>
                Decoupled Recommender System: User interactions remain strictly local in IndexedDB.
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <span>Federated Learning Protocol: Flower (FedAvg / FedProx)</span>
              <span>Catalog Embeddings: Sentence-Transformers (all-MiniLM-L6-v2)</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
