import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Heart, Library, Info, Moon, Sun, SunMoon, Settings, Menu, X, Bookmark, ChevronLeft, ChevronDown, ChevronRight, RotateCw, BookMarked, List, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '@/lib/themeContext';
import { useHeaderHide } from '@/lib/HeaderHideContext';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useBrowserZoom } from '@/hooks/useBrowserZoom';
import { Switch } from '@/components/ui/switch';
import { getAutoRotate, setAutoRotate as persistAutoRotate, applyAutoRotate } from '@/lib/autoRotate';
import BibleSearchBar from '@/components/bible/BibleSearchBar';
import ShortcutsModal from '@/components/ShortcutsModal';
import ScrollToTop from '@/components/ScrollToTop';
import AutoUpdateHandler from '@/components/AutoUpdateHandler';
import ProgressBar from '@/components/ProgressBar';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

import { getBibleData, isBibleCached, initPeriodicCacheRefresh, downloadBibleForOffline, refreshCacheIfDue, CACHE_VERSION } from '@/lib/bibleCache';
import { prefetchAllBackgroundCaches } from '@/lib/backgroundCache';
import { toast } from 'sonner';
import { useSoftReload } from '@/lib/SoftReloadContext';
import { getAccessibilityFont, applyAccessibilityFont } from '@/lib/accessibilityFont';

const scrollMainToTop = () => {
  // Instant, not smooth: this fires right before the page unmounts and the
  // next route's slide-in transition plays, so an animated scroll here just
  // gets cut off mid-motion by the swap -- looks like a jump/flash rather
  // than a smooth scroll.
  const el = document.getElementById('kjb-scroll');
  if (el) el.scrollTo({ top: 0, behavior: 'auto' });
  else window.scrollTo({ top: 0, behavior: 'auto' });
};

// Per-route colours so icons are colourful everywhere (menu, bottom nav, footer).
// `gradient` = icon-chip background; `text` = inactive icon colour.
const NAV_COLORS = {
  '/':          { gradient: 'from-blue-500 to-indigo-600',    text: 'text-blue-500' },
  '/contents':  { gradient: 'from-amber-500 to-orange-600',   text: 'text-amber-500' },
  '/read':      { gradient: 'from-emerald-500 to-teal-600',   text: 'text-emerald-500' },
  '/gospel':    { gradient: 'from-rose-500 to-pink-600',      text: 'text-rose-500' },
  '/resources': { gradient: 'from-violet-500 to-purple-600',  text: 'text-violet-500' },
  '/saved':     { gradient: 'from-fuchsia-500 to-pink-600',   text: 'text-fuchsia-500' },
  '/about':     { gradient: 'from-sky-500 to-cyan-600',       text: 'text-sky-500' },
  '/settings':  { gradient: 'from-slate-500 to-slate-700',    text: 'text-slate-500' },
};

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/contents', icon: List, label: 'Contents' },
  { path: '/read', icon: BookOpen, label: 'Read' },
  { path: '/gospel', icon: Heart, label: 'Gospel' },
  { path: '/resources', icon: Library, label: 'Resources' },
  { path: '/saved', icon: Bookmark, label: 'Saved' },
  { path: '/about', icon: Info, label: 'About' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const BOTTOM_NAV_PRIMARY = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/contents', icon: List, label: 'Contents' },
  { path: '/read', icon: BookOpen, label: 'Read' },
  { path: '/gospel', icon: Heart, label: 'Gospel' },
];

const BOTTOM_NAV_SECONDARY = [
  { path: '/resources', icon: Library, label: 'Resources' },
  { path: '/saved', icon: Bookmark, label: 'Saved' },
  { path: '/about', icon: Info, label: 'About' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isDark, mode, toggleTheme } = useTheme();
  const { hideHeader } = useHeaderHide();
  const { reloadKey, softReload, isReloading } = useSoftReload();
  useBrowserZoom();
  
  // Hide all layout chrome for legacy reader - it renders its own complete UI
  const isLegacy = pathname === '/legacy';
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isCheckingUpdatesRef = useRef(false);
  
  // Detect if running as installed PWA using display-mode (synchronous, no flicker)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isCheckingInstall, setIsCheckingInstall] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsCheckingInstall(false);
      return;
    }
    try {
      if (window.self !== window.top) {
        setIsPWAInstalled(false);
        setIsCheckingInstall(false);
        return;
      }
    } catch (e) {
      setIsPWAInstalled(false);
      setIsCheckingInstall(false);
      return;
    }
    
    // Check display-mode (works inside PWA window, synchronous)
    const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dmMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
    const dmOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
    const iOSStandalone = navigator.standalone === true;
    const localStorageInstalled = localStorage.getItem('kjb-is-installed') === 'true';
    
    const installed = dmStandalone || dmMinimal || dmOverlay || iOSStandalone || localStorageInstalled;
    
    setIsPWAInstalled(installed);
    setIsCheckingInstall(false);
    
    if (installed) {
      localStorage.setItem('kjb-is-installed', 'true');
      window.dispatchEvent(new Event('storage'));
    }
  }, []);

  // Persist install status to localStorage for cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined' || isCheckingInstall) return;
    try {
      if (window.self !== window.top) return;
    } catch (e) { return; }
    
    if (isPWAInstalled) {
      localStorage.setItem('kjb-is-installed', 'true');
      window.dispatchEvent(new Event('storage'));
    }
  }, [isPWAInstalled, isCheckingInstall]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    handler();
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) { await document.documentElement.requestFullscreen?.(); }
      else { await document.exitFullscreen?.(); }
    } catch {}
  };

  // Keep prompt open across PWA install - only close on explicit dismiss
  useEffect(() => {
    const handleInstallChange = () => {
      // Don't auto-close prompt when installation completes
    };
    window.addEventListener('kjb-install-change', handleInstallChange);
    return () => window.removeEventListener('kjb-install-change', handleInstallChange);
  }, []);



  // Close hamburger menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Remember the last route the user was on (persisted across app restarts), so
  // a full reload / app-open can reopen the Reader if that's where they were.
  useEffect(() => {
    if (pathname === '/legacy') return;
    try { localStorage.setItem('kjb-last-route', pathname); } catch {}
  }, [pathname]);

  // On cold app-open / full reload, if the last route was the Reader, reopen it
  // (with its last chapter + scroll restored). Runs once on mount only.
  const didRestoreRouteRef = useRef(false);
  useEffect(() => {
    if (didRestoreRouteRef.current) return;
    didRestoreRouteRef.current = true;
    try {
      const last = localStorage.getItem('kjb-last-route');
      if (last === '/read' && pathname === '/') {
        navigate('/read', { replace: true });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track visited in-app routes ourselves rather than relying on raw browser
  // history (window.history.length / navigate(-1) is unreliable after a hard
  // redirect — e.g. from /login?returnTo=... — leaving the header Back button
  // and Alt+← unable to go anywhere). Back always pops to the last DIFFERENT
  // route this app session actually visited, falling back to Home.
  const routeStackRef = useRef([pathname]);
  useEffect(() => {
    const stack = routeStackRef.current;
    if (stack[stack.length - 1] !== pathname) stack.push(pathname);
  }, [pathname]);

  const goBack = React.useCallback(() => {
    const stack = routeStackRef.current;
    if (stack.length > 1) {
      stack.pop();
      navigate(stack[stack.length - 1]);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // Keyboard shortcuts: Alt+← (Back) and Alt+H (Home).
  // Ignored while typing in an input/textarea so they don't hijack text editing.
  useEffect(() => {
    const handleNavKeys = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleNavKeys);
    return () => window.removeEventListener('keydown', handleNavKeys);
  }, [navigate, goBack]);

  // "?" opens the keyboard shortcuts overlay (ignored while typing).
  // Also opened from Settings via the "kjb-open-shortcuts" event.
  useEffect(() => {
    const handleHelpKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };
    const openEvent = () => setShowShortcuts(true);
    window.addEventListener('keydown', handleHelpKey);
    window.addEventListener('kjb-open-shortcuts', openEvent);
    return () => {
      window.removeEventListener('keydown', handleHelpKey);
      window.removeEventListener('kjb-open-shortcuts', openEvent);
    };
  }, []);

  // Reset the main scroll container to the top on every route change.
  // The reader (/read) manages its own scroll restoration, so skip it there.
  useEffect(() => {
    if (pathname === '/read') return;
    const el = document.getElementById('kjb-scroll');
    if (el) el.scrollTo({ top: 0 });
  }, [pathname]);

  // Close hamburger menu on any outside tap/click (excluding the menu itself and the toggle button)
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      const target = e.target;
      if (target.closest('[data-kjb-menu]') || target.closest('[data-kjb-menu-toggle]')) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);
  const [autoRotate, setAutoRotateState] = useState(getAutoRotate);
  useEffect(() => {
    applyAutoRotate(getAutoRotate());
    const sync = () => setAutoRotateState(getAutoRotate());
    window.addEventListener('storage', sync);
    window.addEventListener('kjb-auto-rotate-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('kjb-auto-rotate-changed', sync);
    };
  }, []);
  const toggleAutoRotate = (checked) => {
    setAutoRotateState(checked);
    persistAutoRotate(checked);
  };
  const [appZoom, setAppZoom] = useState(() => {
    try { return parseInt(localStorage.getItem('kjb-layout-zoom') || '100'); } catch { return 100; }
  });
  useEffect(() => {
    const sync = () => {
      try { setAppZoom(parseInt(localStorage.getItem('kjb-layout-zoom') || '100')); } catch {}
    };
    window.addEventListener('storage', sync);
    window.addEventListener('kjb-layout-zoom-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('kjb-layout-zoom-changed', sync);
    };
  }, []);
  const setAppZoomPersist = (next) => {
    const clamped = Math.max(75, Math.min(150, next));
    setAppZoom(clamped);
    try { localStorage.setItem('kjb-layout-zoom', String(clamped)); } catch {}
    window.dispatchEvent(new Event('kjb-layout-zoom-changed'));
  };
  const [footerMode, setFooterMode] = useState(() => {
    try {
      const saved = localStorage.getItem('kjb-footer-mode');
      return ['two', 'one', 'bar', 'none'].includes(saved) ? saved : 'one';
    } catch { return 'one'; }
  });
  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = localStorage.getItem('kjb-footer-mode');
        setFooterMode(['two', 'one', 'bar', 'none'].includes(saved) ? saved : 'one');
      } catch {}
    };
    window.addEventListener('kjb-footer-mode-change', onStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('kjb-footer-mode-change', onStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  // Footer is always visible on desktop, controlled by bottom nav on mobile
  const isRoot = pathname === '/';

  // FirstLoadPrompt has been moved to the LandingPage.

  useEffect(() => {
    // Apply app-wide accessibility font preference on load
    applyAccessibilityFont(getAccessibilityFont());

    // Initialize periodic cache refresh (checks every 24 hours when user opens app)
    initPeriodicCacheRefresh();

    // Proactively warm the KJB Defence resources and browser-extension
    // config caches too, regardless of whether the user ever opens those
    // specific pages (see backgroundCache.js for why this matters --
    // otherwise each only cached on its own page's visit, so it could still
    // show empty/stale offline for someone who'd been using the rest of the
    // app online the whole time).
    prefetchAllBackgroundCaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy reader gets no layout chrome - just render the outlet
  if (isLegacy) {
    return <Outlet />;
  }

  return (
    <AutoUpdateHandler>
    <div data-kjb-app-root className="h-[100dvh] bg-gradient-to-br from-background via-accent/5 to-background flex flex-col overflow-hidden">
      <header data-kjb-app-header className={`print:hidden border-b border-border/60 bg-card/70 backdrop-blur-xl z-50 flex-shrink-0 ${hideHeader ? 'hidden' : ''}`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <div className="w-full max-w-[120rem] mx-auto px-3 xs:px-5 sm:px-8 lg:px-12 h-14 flex items-center gap-1.5 xs:gap-2 sm:gap-3">
          {/* Logo / Back Button */}
          {pathname === '/' ? (
            <Link
              to="/"
              onClick={() => {
                setMenuOpen(false);
                scrollMainToTop();
              }}
              className="flex items-center gap-2 flex-shrink-0 pointer-events-auto"
            >
              <div className="flex items-center gap-1.5">
                <img src="https://media.base44.com/images/public/6a05d76723afe58d80c589e8/2279e016e_8e738d108_cfb4bf781_Untitled.png" alt="KJB Reader" className="h-8 w-auto" />
              </div>
            </Link>
          ) : (
            <div className="flex items-center -ml-3 flex-shrink-0 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  goBack();
                }}
                className="flex items-center gap-1 pl-2 pr-2 sm:pr-3 h-12 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors text-foreground touch-manipulation cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="w-6 h-6 pointer-events-none" />
                <span className="font-sans text-sm font-medium hidden sm:inline pointer-events-none">Back</span>
              </button>
              <Link
                to="/"
                onClick={() => {
                  setMenuOpen(false);
                  scrollMainToTop();
                }}
                className="flex items-center justify-center w-10 h-12 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors text-foreground touch-manipulation cursor-pointer"
                title="Home"
              >
                <Home className="w-5 h-5 pointer-events-none text-muted-foreground hover:text-foreground transition-colors" />
              </Link>
            </div>
          )}

          {/* Search - expands to fill all available space so icons sit flush right */}
          <div className="flex-1 min-w-0 pointer-events-auto">
            <BibleSearchBar onClose={() => setMenuOpen(false)} />
          </div>

          {/* Actions - responsive button sizes with visible square touch targets */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 shrink-0">
            {!isNativeAndroid() && (
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label="Toggle fullscreen"
                className="w-9 h-9 xs:w-11 xs:h-11 sm:w-10 sm:h-10 shrink-0 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 active:bg-secondary transition-all duration-200 flex items-center justify-center cursor-pointer touch-manipulation"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 pointer-events-none text-violet-500" /> : <Maximize2 className="w-4 h-4 pointer-events-none text-violet-500" />}
              </button>
            )}
            <button className="w-9 h-9 xs:w-11 xs:h-11 sm:w-10 sm:h-10 shrink-0 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 active:bg-secondary transition-all duration-200 flex items-center justify-center cursor-pointer touch-manipulation"
              onClick={(e) => { e.stopPropagation(); try { window.dispatchEvent(new Event('kjb-close-popovers')); } catch {} toggleTheme(); }}
              type="button"
              aria-label="Toggle theme"
            >
              {mode === 'auto' ? <SunMoon className="w-4 h-4 pointer-events-none transition-transform duration-200 text-amber-500" /> : isDark ? <Moon className="w-4 h-4 pointer-events-none transition-transform duration-200 text-indigo-400" /> : <Sun className="w-4 h-4 pointer-events-none transition-transform duration-200 text-amber-500" />}
            </button>
            <button data-kjb-menu-toggle className="w-9 h-9 xs:w-11 xs:h-11 sm:w-10 sm:h-10 shrink-0 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 active:bg-secondary transition-all duration-200 flex items-center justify-center cursor-pointer touch-manipulation"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
              type="button"
              aria-label="Open menu"
            >
              {menuOpen ? <X className="w-4 h-4 pointer-events-none transition-transform duration-200 text-violet-500" /> : <Menu className="w-4 h-4 pointer-events-none transition-transform duration-200 text-violet-500" />}
            </button>
          </div>
        </div>
        
        {menuOpen && (
          <>
            <div
              className="fixed inset-x-0 bottom-0 z-[60] bg-black/50 backdrop-blur-sm"
              style={{ top: 'calc(3.5rem + env(safe-area-inset-top))' }}
              onClick={() => setMenuOpen(false)}
            />
            <div data-kjb-menu className="absolute top-full right-0 left-0 z-[61] bg-card backdrop-blur-xl border-b border-border/60 shadow-lg shadow-black/[0.05] overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(100dvh - 3.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}>
              <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 pt-3 pb-1 flex items-center justify-between gap-3 border-b border-border/50">
                <span className="font-sans text-xs font-medium text-muted-foreground">App Zoom: {appZoom}%</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAppZoomPersist(appZoom - 25); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-foreground hover:border-accent transition-all duration-200 active:scale-95"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAppZoomPersist(appZoom + 25); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-foreground hover:border-accent transition-all duration-200 active:scale-95"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {appZoom !== 100 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAppZoomPersist(100); }}
                      className="px-2.5 h-8 flex items-center justify-center rounded-lg bg-primary border border-primary text-primary-foreground font-sans text-xs font-medium active:scale-95 transition-all duration-200"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-2.5 flex items-center justify-between gap-3 border-b border-border/50">
                <span className="flex items-center gap-1.5 font-sans text-xs font-medium text-muted-foreground">
                  <RotateCw className="w-3.5 h-3.5" />
                  Auto Rotate
                </span>
                <Switch checked={autoRotate} onCheckedChange={toggleAutoRotate} />
              </div>
              <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 pt-4 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2.5" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = item.path === '/' ? pathname === '/' : pathname === item.path;
                  const colors = NAV_COLORS[item.path] || NAV_COLORS['/'];
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        setMenuOpen(false);
                        scrollMainToTop();
                        navigate(item.path);
                      }}
                      className={`relative flex items-center gap-2.5 px-3.5 py-3 rounded-lg border font-sans text-sm font-medium leading-snug transition-all duration-200 hover:z-10 hover:shadow-md active:scale-95 ${
                        active
                          ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground border-transparent shadow-md shadow-primary/20'
                          : 'bg-card/60 text-foreground border-border hover:bg-secondary hover:border-accent/40'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br ${colors.gradient}`}>
                        <Icon className="w-4 h-4 transition-transform duration-200" />
                      </span>
                      <span className="min-w-0 whitespace-nowrap">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </header>

      <main
        id="kjb-scroll"
        className="flex-1 overflow-y-auto sm:!pb-0 relative"
        style={{ paddingBottom: `calc(${footerMode === 'bar' ? '2.5rem' : footerMode === 'two' ? '7rem' : '4rem'} + env(safe-area-inset-bottom))` }}
      >
        <div key={reloadKey} className={isReloading ? 'opacity-50 pointer-events-none' : ''}>
          <Outlet />
        </div>
      </main>

      <BottomNav pathname={pathname} navigate={navigate} />

      {/* Scroll to top button - only on the Read page */}
      {pathname === '/read' && <ScrollToTop />}

      <ProgressBar />

      <DesktopFooter navigate={navigate} setMenuOpen={setMenuOpen} />

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
    </AutoUpdateHandler>
  );
}

function DesktopFooter({ navigate, setMenuOpen }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('kjb-desktop-footer-open') !== 'false'; } catch { return true; }
  });
  const toggle = () => {
    setOpen(o => {
      const next = !o;
      try { localStorage.setItem('kjb-desktop-footer-open', String(next)); } catch {}
      return next;
    });
  };
  return (
      <footer className={`print:hidden hidden sm:block border-t border-border/60 bg-card/70 backdrop-blur-xl flex-shrink-0 ${open ? 'py-3' : 'py-0.5'}`}>
        <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12">
          <div className={`flex justify-center ${open ? 'mb-2' : 'mb-0'}`}>
            <button
              onClick={toggle}
              className={`flex items-center gap-1.5 px-3 rounded-lg font-sans text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${open ? 'py-1' : 'py-0.5'}`}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
            </button>
          </div>
          {open && (
          <>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-3">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const colors = NAV_COLORS[item.path] || NAV_COLORS['/'];
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setMenuOpen(false);
                    scrollMainToTop();
                    navigate(item.path);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                >
                  <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${colors.text}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <p className="text-center font-sans text-xs text-muted-foreground">
            Bible text from{' '}
            <a href="https://bibleprotector.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              bibleprotector.com
            </a>
            {' '}· Created with{' '}
            <a href="https://base44.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              Base44
            </a>
          </p>
          <p className="text-center font-sans text-xs text-muted-foreground mt-1">
            <Link to="/privacy" className="hover:text-foreground hover:underline transition-colors">Privacy</Link>
            {' · '}
            <Link to="/terms" className="hover:text-foreground hover:underline transition-colors">Terms</Link>
            {' · '}
            <Link to="/extension/change-log" className="hover:text-foreground hover:underline transition-colors">Changelog</Link>
            {' · '}
            <Link to="/contact" className="hover:text-foreground hover:underline transition-colors">Contact</Link>
          </p>
          </>
          )}
        </div>
      </footer>
  );
}



function BottomNav({ pathname, navigate }) {
  const [showMode, setShowMode] = useState(() => {
    try {
      const saved = localStorage.getItem('kjb-footer-mode');
      // Migrate old 'none' value to 'bar'
      if (saved === 'none') return 'bar';
      return ['two', 'one', 'bar'].includes(saved) ? saved : 'one';
    } catch { return 'one'; }
  });

  // Tab history: remember the last sub-path (pathname + search) for each tab,
  // so switching back to a tab restores its previous route instead of the root.
  const location = useLocation();
  const tabHistoryRef = useRef({});
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    const matchedTab = NAV_ITEMS.find(item =>
      item.path === '/' ? location.pathname === '/' : location.pathname === item.path
    );
    if (matchedTab) {
      tabHistoryRef.current[matchedTab.path] = fullPath;
    }
  }, [location.pathname, location.search]);

  const cycleShowMode = () => {
    // Cycle: one row (default) → two rows (expand, more nav items) → bar
    // (minimize to a thin strip) → back to one row. The chevron points DOWN,
    // which reads as "there's more below, tap to expand" -- starting the
    // cycle by jumping straight from the default 'one' state to 'bar' (as an
    // earlier version of this did) meant the very first tap always
    // MINIMIZED instead, which fights that expectation. This way the first
    // tap always expands first; a second tap is what minimizes.
    const next =
      showMode === 'one' ? 'two' :
      showMode === 'two' ? 'bar' :
      'one';
    setShowMode(next);
    try { localStorage.setItem('kjb-footer-mode', next); } catch {}
    try { window.dispatchEvent(new Event('kjb-footer-mode-change')); } catch {}
  };

  // Bar mode - ultra-thin footer strip with only the chevron toggle (no icons)
  if (showMode === 'bar') {
    return (
      <nav className="print:hidden sm:hidden fixed left-0 right-0 bottom-0 z-50 bg-card/80 backdrop-blur-md border-t border-border/50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-full max-w-[120rem] mx-auto px-2 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); cycleShowMode(); }}
            className="w-full h-4 flex items-center justify-center text-muted-foreground/50 hover:text-foreground active:bg-secondary/50 transition-all duration-200"
            title="Toggle navigation"
          >
            <ChevronDown className="w-3 h-3 rotate-180 transition-transform duration-200" />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="print:hidden sm:hidden fixed left-0 right-0 bottom-0 z-50 bg-card/70 backdrop-blur-xl border-t border-border/60 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full max-w-[120rem] mx-auto px-2 sm:px-8 lg:px-12">
        {/* Primary row: 5 nav items + chevron toggle button */}
        <div className="flex items-stretch">
          {BOTTOM_NAV_PRIMARY.map(item => {
            const Icon = item.icon;
            const active = item.path === '/' ? pathname === '/' : pathname === item.path;
            const colors = NAV_COLORS[item.path] || NAV_COLORS['/'];
            return (
              <button
                key={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById('kjb-scroll');
                  const isScrolled = el ? el.scrollTop > 0 : window.scrollY > 0;
                  
                  if (active) {
                    if (isScrolled) {
                      scrollMainToTop();
                    } else {
                      // Already at top + active tab re-clicked → reset to the
                      // tab's root path (e.g. /read → default Genesis 1) and
                      // clear the stashed sub-path so it doesn't restore it.
                      tabHistoryRef.current[item.path] = item.path;
                      navigate(item.path);
                    }
                  } else {
                    scrollMainToTop();
                    setTimeout(() => navigate(tabHistoryRef.current[item.path] || item.path), 150);
                  }
                }}
                className="flex flex-col items-center justify-center flex-1 min-h-[48px] active:bg-secondary/50 transition-all duration-200"
              >
                {active ? (
                  <span className={`w-5 h-5 mb-0.5 flex items-center justify-center rounded-md text-white shadow-sm bg-gradient-to-br ${colors.gradient}`}>
                    <Icon className="w-3 h-3 transition-transform duration-200" />
                  </span>
                ) : (
                  <Icon className={`w-4 h-4 mb-0.5 ${colors.text} transition-transform duration-200`} />
                )}
                <span className={`font-sans text-[10px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
              </button>
            );
          })}
          {/* Chevron toggle - inline in primary row */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); cycleShowMode(); }}
            className="w-8 flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-secondary/50 transition-all duration-200 shrink-0 border-l border-border"
            title="Toggle navigation rows"
          >
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
          </button>
        </div>

        {/* Secondary row - shown when two rows - 4 per line */}
        {showMode === 'two' && (
          <div className="grid grid-cols-4 border-t border-border">
            {BOTTOM_NAV_SECONDARY.map(item => {
              const Icon = item.icon;
              const active = pathname === item.path;
              const colors = NAV_COLORS[item.path] || NAV_COLORS['/'];
              return (
                <button
                  key={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById('kjb-scroll');
                    const isScrolled = el ? el.scrollTop > 0 : window.scrollY > 0;
                    
                    if (active) {
                      if (isScrolled) {
                        scrollMainToTop();
                      } else {
                        // Already at top + active tab re-clicked → reset to the
                        // tab's root path and clear the stashed sub-path.
                        tabHistoryRef.current[item.path] = item.path;
                        navigate(item.path);
                      }
                    } else {
                      scrollMainToTop();
                      setTimeout(() => navigate(tabHistoryRef.current[item.path] || item.path), 150);
                    }
                  }}
                  className="flex flex-col items-center justify-center w-full min-h-[48px] active:bg-secondary/50 transition-all duration-200"
                >
                  {active ? (
                    <span className={`w-5 h-5 mb-0.5 flex items-center justify-center rounded-md text-white shadow-sm bg-gradient-to-br ${colors.gradient}`}>
                      <Icon className="w-3 h-3 transition-transform duration-200" />
                    </span>
                  ) : (
                    <Icon className={`w-4 h-4 mb-0.5 ${colors.text} transition-transform duration-200`} />
                  )}
                  <span className={`font-sans text-[10px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}