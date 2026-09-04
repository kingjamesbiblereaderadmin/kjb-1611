import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Library, Info, List, Settings, Bookmark, FlaskConical } from 'lucide-react';
import QuickLinkCard from '@/components/home/QuickLinkCard';
import OfflineStatusBanner from '@/components/OfflineStatusBanner';
import IncognitoWarning from '@/components/IncognitoWarning';
import ScriptureBanner from '@/components/ScriptureBanner';

const QUICK_LINKS = [
  { path: '/read', icon: BookOpen, label: 'Read the Bible', desc: <span className="notranslate" translate="no">KJB Pure Cambridge Edition</span>, iconGradient: 'from-emerald-500 to-teal-600' },
  { path: '/contents', icon: List, label: 'Table of Contents', desc: 'Browse all 66 books', iconGradient: 'from-amber-500 to-orange-600' },
  { path: '/saved', icon: Bookmark, label: 'Saved Verses', desc: 'Your bookmarked verses', iconGradient: 'from-fuchsia-500 to-pink-600' },
  { path: '/advanced-search', icon: FlaskConical, label: 'Advanced Search', desc: 'Research verses by properties', iconGradient: 'from-indigo-500 to-purple-600' },
  { path: '/gospel', icon: Heart, label: 'Gospel', desc: 'Learn how to be saved', iconGradient: 'from-rose-500 to-pink-600' },
  { path: '/resources', icon: Library, label: 'Resources', desc: 'KJB defence & study', iconGradient: 'from-violet-500 to-purple-600' },
  { path: '/about', icon: Info, label: 'About', desc: 'Ministry & links', iconGradient: 'from-sky-500 to-cyan-600' },
  { path: '/settings', icon: Settings, label: 'Settings', desc: 'Offline downloads & info', iconGradient: 'from-slate-500 to-slate-700' },
];

export default function HomePage() {
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const swipedRef = useRef(false);

  // Auto-check for updates on home load, then every minute while the home page
  // is open. If an update is found, the splash "home update" sequence runs
  // after reload.
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    let intervalId = null;

    const run = () => {
      if (!navigator.onLine) return;
      import('@/lib/homeUpdateCheck').then(({ checkHomeForUpdates }) => {
        checkHomeForUpdates().catch(() => {});
      }).catch(() => {});
    };

    const startChecking = () => {
      run();
      intervalId = setInterval(run, 60 * 1000); // every minute
    };

    // Also re-check whenever the app regains focus / becomes visible.
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);

    let cleanupDoneListener = null;
    if (window.kjbSplashDone) {
      const t = setTimeout(startChecking, 1000);
      cleanupDoneListener = () => clearTimeout(t);
    } else {
      const onDone = () => { window.removeEventListener('kjb-splash-done', onDone); setTimeout(startChecking, 1000); };
      window.addEventListener('kjb-splash-done', onDone);
      cleanupDoneListener = () => window.removeEventListener('kjb-splash-done', onDone);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      cleanupDoneListener?.();
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = e.touches[0].clientY;
    swipedRef.current = false;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
    if (Math.abs(touchEndY.current - touchStartY.current) > 10) {
      swipedRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (!swipedRef.current) return;

    const pullDistance = touchEndY.current - touchStartY.current;

    // Pull down to refresh if at the top of the page
    if (pullDistance > 100 && window.scrollY <= 0) {
      console.log('[UpdateCheck] Pull-to-refresh triggered. Checking for updates...');
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        import('@/lib/homeUpdateCheck').then(({ checkHomeForUpdates }) => {
          checkHomeForUpdates().catch((e) => console.error('[UpdateCheck] Pull-to-refresh check failed:', e));
        });
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-background via-accent/10 to-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-6">
      <OfflineStatusBanner />
      <IncognitoWarning />

      <div className="print:hidden">
        <ScriptureBanner />
      </div>

      {/* Quick links */}
      <div className="print:hidden grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] lg:grid-cols-4 gap-3 sm:gap-4 mb-6 auto-rows-fr mt-2">
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

      {/* Gospel call */}
      <div className="print:hidden bg-gradient-to-br from-rose-50 to-red-50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-200/70 dark:border-red-900/30 rounded-3xl p-6 sm:p-8 text-center mb-6 shadow-sm">
        <p className="font-serif text-xl font-bold text-red-700 dark:text-red-400 mb-2">Are you saved?</p>
        <div className="font-sans text-sm text-foreground/80 mb-4 space-y-1.5">
          <p>Jesus Christ died, shed his blood, was buried, and rose again on the third day for our sins.</p>
          <p className="font-medium">Trust Christ's blood, death, burial and resurrection for your sins, and be eternally saved.</p>
        </div>
        <Link
          to="/gospel"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-sans text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <Heart className="w-4 h-4" />
          Learn How to be Saved
        </Link>
      </div>

      </div>

    </div>
  );
}