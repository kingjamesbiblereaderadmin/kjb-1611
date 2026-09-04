import React from 'react';
import { ScrollText, Info } from 'lucide-react';
import QuickLinkCard from '@/components/home/QuickLinkCard';
import OfflineStatusBanner from '@/components/OfflineStatusBanner';
import IncognitoWarning from '@/components/IncognitoWarning';

// Trimmed down (Sep 2026): this app is a clone of the main KJB Reader,
// repurposed to host only the 1611 facsimile viewer. See src/App.jsx for
// the full note on what was removed and why.
const QUICK_LINKS = [
  { path: '/1611', icon: ScrollText, label: '1611 Original', desc: 'Browse the original 1611 scan', iconGradient: 'from-amber-700 to-yellow-800' },
  { path: '/about', icon: Info, label: 'About', desc: 'Ministry & links', iconGradient: 'from-sky-500 to-cyan-600' },
];

export default function HomePage() {
  return (
    <div className="bg-gradient-to-br from-background via-accent/10 to-background">
      <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-6">
        <OfflineStatusBanner />
        <IncognitoWarning />

        <div className="print:hidden grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3 sm:gap-4 mb-6 auto-rows-fr mt-2 max-w-2xl mx-auto">
          {QUICK_LINKS.map((link) => (
            <QuickLinkCard
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              desc={link.desc}
              iconGradient={link.iconGradient}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
