import Link from 'next/link';

export function Header() {
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
          <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-charcoal-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald"></span>
            <span>Zero Behavioral Leakage: Interactions Stay In-Browser</span>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center space-x-4">
            <Link
              href="/edge-data"
              className="text-xs font-mono font-medium text-charcoal-700 hover:text-accent border border-[#EAE7E2] hover:border-accent/40 bg-surface px-3 py-1.5 rounded transition-all shadow-sm"
            >
              My Edge Data (IndexedDB)
            </Link>
            <Link
              href="/fl-network"
              className="text-xs font-mono font-medium bg-charcoal-900 hover:bg-accent text-white px-3 py-1.5 rounded transition-colors shadow-sm"
            >
              FL Network
            </Link>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="flex items-center space-x-6 py-2.5 overflow-x-auto text-sm font-medium text-charcoal-700">
          <Link href="/" className="hover:text-accent transition-colors whitespace-nowrap">
            All Feeds
          </Link>
          <Link href="/?category=ai" className="hover:text-accent transition-colors whitespace-nowrap">
            Artificial Intelligence
          </Link>
          <Link href="/?category=sports" className="hover:text-accent transition-colors whitespace-nowrap">
            Sports Analytics
          </Link>
          <Link href="/?category=history" className="hover:text-accent transition-colors whitespace-nowrap">
            World History
          </Link>
        </nav>
      </div>
    </header>
  );
}
