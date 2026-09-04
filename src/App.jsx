import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/themeContext';
import { HeaderHideProvider } from '@/lib/HeaderHideContext';
import { SoftReloadProvider, useSoftReload } from '@/lib/SoftReloadContext';
import AppLayout from '@/components/layout/AppLayout';
import ChunkErrorBoundary from '@/components/ChunkErrorBoundary';
import React, { lazy, Suspense, useEffect, useState } from 'react';

// Lazy-load pages. Each import() factory is kept as a reference so we can
// also trigger it manually in the background to preload all routes.
const loaders = {
  Home: () => import('@/pages/HomePage').catch((err) => { console.error('Failed to load HomePage:', err); throw err; }),
  BibleReader: () => import('@/pages/BibleReader').catch((err) => { console.error('Failed to load BibleReader:', err); throw err; }),
  Gospel: () => import('@/pages/GospelPage').catch((err) => { console.error('Failed to load GospelPage:', err); throw err; }),
  Resources: () => import('@/pages/ResourcesPage').catch((err) => { console.error('Failed to load ResourcesPage:', err); throw err; }),
  About: () => import('@/pages/AboutPage').catch((err) => { console.error('Failed to load AboutPage:', err); throw err; }),
  Contents: () => import('@/pages/ContentsPage.jsx').catch((err) => { console.error('Failed to load ContentsPage:', err); throw err; }),
  Settings: () => import('@/pages/SettingsPage.jsx').catch((err) => { console.error('Failed to load SettingsPage:', err); throw err; }),
  Search: () => import('@/pages/SearchPage.jsx').catch((err) => { console.error('Failed to load SearchPage:', err); throw err; }),
  AdvancedSearch: () => import('@/pages/AdvancedSearchPage.jsx').catch((err) => { console.error('Failed to load AdvancedSearchPage:', err); throw err; }),
  Saved: () => import('@/pages/SavedVersesPage.jsx').catch((err) => { console.error('Failed to load SavedVersesPage:', err); throw err; }),
  RefreshCache: () => import('@/pages/RefreshCache.jsx').catch((err) => { console.error('Failed to load RefreshCache:', err); throw err; }),
  ManifestIcons: () => import('@/pages/ManifestIcons.jsx').catch((err) => { console.error('Failed to load ManifestIcons:', err); throw err; }),
  ManifestScreenshots: () => import('@/pages/ManifestScreenshots.jsx').catch((err) => { console.error('Failed to load ManifestScreenshots:', err); throw err; }),
  Privacy: () => import('@/pages/PrivacyPolicyPage.jsx').catch((err) => { console.error('Failed to load PrivacyPolicyPage:', err); throw err; }),
  LegacyReader: () => import('@/pages/LegacyReader.jsx').catch((err) => { console.error('Failed to load LegacyReader:', err); throw err; }),
  BibleTxt: () => import('@/pages/BibleTxt.jsx').catch((err) => { console.error('Failed to load BibleTxt:', err); throw err; }),
  DevTools: () => import('@/pages/DevToolsPage.jsx').catch((err) => { console.error('Failed to load DevToolsPage:', err); throw err; }),
  Landing: () => import('@/pages/LandingPage').catch((err) => { console.error('Failed to load LandingPage:', err); throw err; }),
  Terms: () => import('@/pages/TermsOfServicePage').catch((err) => { console.error('Failed to load TermsOfServicePage:', err); throw err; }),
  Salvation: () => import('@/pages/SalvationPage').catch((err) => { console.error('Failed to load SalvationPage:', err); throw err; }),
  DiscordInvite: () => import('@/pages/DiscordInvitePage.jsx').catch((err) => { console.error('Failed to load DiscordInvitePage:', err); throw err; }),
  Extension: () => import('@/pages/ExtensionPage.jsx').catch((err) => { console.error('Failed to load ExtensionPage:', err); throw err; }),
  ExtensionPrivacy: () => import('@/pages/ExtensionPrivacyPage.jsx').catch((err) => { console.error('Failed to load ExtensionPrivacyPage:', err); throw err; }),
  ExtensionTerms: () => import('@/pages/ExtensionTermsPage.jsx').catch((err) => { console.error('Failed to load ExtensionTermsPage:', err); throw err; }),
  ExtensionLicense: () => import('@/pages/ExtensionLicensePage.jsx').catch((err) => { console.error('Failed to load ExtensionLicensePage:', err); throw err; }),
  KjbDefence: () => import('@/pages/KjbDefencePage.jsx').catch((err) => { console.error('Failed to load KjbDefencePage:', err); throw err; }),
  Login: () => import('@/pages/Login.jsx').catch((err) => { console.error('Failed to load Login:', err); throw err; }),
  ForgotPassword: () => import('@/pages/ForgotPassword.jsx').catch((err) => { console.error('Failed to load ForgotPassword:', err); throw err; }),
  ResetPassword: () => import('@/pages/ResetPassword.jsx').catch((err) => { console.error('Failed to load ResetPassword:', err); throw err; }),
  Contact: () => import('@/pages/ContactPage').catch((err) => { console.error('Failed to load ContactPage:', err); throw err; }),
  Register: () => import('@/pages/Register.jsx').catch((err) => { console.error('Failed to load Register:', err); throw err; }),
  OAuthConsent: () => import('@/pages/OAuthConsent.jsx').catch((err) => { console.error('Failed to load OAuthConsent:', err); throw err; }),

  Credits: () => import('@/pages/CreditsPage').catch((err) => { console.error('Failed to load CreditsPage:', err); throw err; }),
  Spanish: () => import('@/pages/SpanishResourcesPage.jsx').catch((err) => { console.error('Failed to load SpanishResourcesPage:', err); throw err; }),
  SpanishGospel: () => import('@/pages/SpanishGospelPage.jsx').catch((err) => { console.error('Failed to load SpanishGospelPage:', err); throw err; }),
  Changelog: () => import('@/pages/ChangelogPage').catch((err) => { console.error('Failed to load ChangelogPage:', err); throw err; }),

};
const HomePage = lazy(loaders.Home);
const BibleReader = lazy(loaders.BibleReader);
const GospelPage = lazy(loaders.Gospel);
const ResourcesPage = lazy(loaders.Resources);
const AboutPage = lazy(loaders.About);
const ContentsPage = lazy(loaders.Contents);
const SettingsPage = lazy(loaders.Settings);
const SearchPage = lazy(loaders.Search);
const AdvancedSearchPage = lazy(loaders.AdvancedSearch);
const SavedVersesPage = lazy(loaders.Saved);
const RefreshCache = lazy(loaders.RefreshCache);
const ManifestIcons = lazy(loaders.ManifestIcons);
const ManifestScreenshots = lazy(loaders.ManifestScreenshots);
const PrivacyPolicyPage = lazy(loaders.Privacy);
const LegacyReader = lazy(loaders.LegacyReader);
const BibleTxt = lazy(loaders.BibleTxt);
const DevToolsPage = lazy(loaders.DevTools);
const LandingPage = lazy(loaders.Landing);
const TermsOfServicePage = lazy(loaders.Terms);
const SalvationPage = lazy(loaders.Salvation);
const DiscordInvitePage = lazy(loaders.DiscordInvite);
const ExtensionPage = lazy(loaders.Extension);
const ExtensionPrivacyPage = lazy(loaders.ExtensionPrivacy);
const ExtensionTermsPage = lazy(loaders.ExtensionTerms);
const ExtensionLicensePage = lazy(loaders.ExtensionLicense);
const KjbDefencePage = lazy(loaders.KjbDefence);
const LoginPage = lazy(loaders.Login);
const ForgotPasswordPage = lazy(loaders.ForgotPassword);
const ResetPasswordPage = lazy(loaders.ResetPassword);
const ContactPage = lazy(loaders.Contact);
const RegisterPage = lazy(loaders.Register);
const OAuthConsentPage = lazy(loaders.OAuthConsent);
const CreditsPage = lazy(loaders.Credits);
const SpanishResourcesPage = lazy(loaders.Spanish);
const SpanishGospelPage = lazy(loaders.SpanishGospel);
const ChangelogPage = lazy(loaders.Changelog);


const getLoaderForPath = (pathname) => {
  if (pathname === '/') return loaders.Home;
  if (pathname === '/read') return loaders.BibleReader;
  if (pathname === '/gospel') return loaders.Gospel;
  if (pathname === '/resources') return loaders.Resources;
  if (pathname === '/about') return loaders.About;
  if (pathname === '/contents') return loaders.Contents;
  if (pathname === '/settings') return loaders.Settings;
  if (pathname === '/search') return loaders.Search;
  if (pathname === '/saved') return loaders.Saved;
  if (pathname === '/refresh-cache') return loaders.RefreshCache;
  return null;
};

// Preload all route chunks in the background after first paint so subsequent
// navigations are instant (no Suspense delay = no blank page).
let _preloaded = false;
function preloadAllRoutes() {
  if (_preloaded) return;
  _preloaded = true;
  const run = () => {
    // Skip preloading when offline — chunks not yet cached would 404 and
    // pollute the browser's failed-module map. Already-cached chunks still
    // load fine on demand via the SW.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const imports = Object.values(loaders).map(fn => fn().catch(() => {}));

    // After all chunks load, ask the SW to cache the newly-injected <script>
    // tags so every route works fully offline next time.
    Promise.all(imports).then(() => {
      try {
        if (navigator.serviceWorker?.controller) {
          const urls = [];
          document.querySelectorAll('script[src]').forEach(s => {
            try { urls.push(new URL(s.src, location.href).href); } catch {}
          });
          document.querySelectorAll('link[rel="modulepreload"], link[rel="preload"]').forEach(l => {
            try { if (l.href) urls.push(new URL(l.href, location.href).href); } catch {}
          });
          if (urls.length) {
            navigator.serviceWorker.controller.postMessage({ type: 'PREWARM_ASSETS', urls });
          }
        }
      } catch {}
    });
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 300);
  }
}

import { Loader2 } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';

const RouteLoader = () => (
  <div className="flex justify-center py-24">
    <Loader2 className="w-6 h-6 animate-spin text-primary/70" style={{ animationDuration: '2s' }} />
  </div>
);

// Wraps each route in a native-like horizontal slide so transitions feel like
// a mobile app: forward navigation slides in from the right, back navigation
// slides in from the left. Direction is detected from the browser history
// index (popstate / back = negative). Keyed by pathname so the animation
// replays on every navigation — but skipped on the very first render to
// avoid a flash on refresh.
let _firstRenderDone = false;
let _lastHistoryIdx = typeof window !== 'undefined' ? (window.history.state?.idx ?? 0) : 0;
const FadeIn = ({ children }) => {
  const { pathname } = useLocation();
  const [direction, setDirection] = useState('forward');

  useEffect(() => {
    const idx = window.history.state?.idx ?? 0;
    setDirection(idx < _lastHistoryIdx ? 'back' : 'forward');
    _lastHistoryIdx = idx;
    _firstRenderDone = true;
  }, [pathname]);

  const animClass = !_firstRenderDone
    ? ''
    : direction === 'back'
      ? 'kjb-slide-back'
      : 'kjb-slide-forward';

  return <div key={pathname} className={animClass}>{children}</div>;
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  // Captured once at mount (not the live location.pathname) specifically for
  // the "subsequent mode, non-home route" splash-skip check below. Using the
  // live pathname there instead would mean the skip stops applying the
  // moment the user navigates back to Home later in the same session --
  // since SplashScreen's internal flow (and the setShowSplash(false) it
  // triggers) never actually ran while skipped, showSplash itself stays
  // true in the background, so isVisible would flip back to true on that
  // later Home visit and the "WELCOME BACK" splash would suddenly pop up
  // mid-session, well after the app already feels fully loaded.
  const [initialPathname] = useState(() => location.pathname);

  // The app's canonical tab title. Printing/exporting opens a temporary
  // document whose title (e.g. "KJB Advanced Search") can otherwise get stuck
  // in the browser tab if `afterprint` doesn't fire (cancelled dialog, mobile
  // "Save as PDF"). We always restore to this fixed value, never a captured
  // snapshot that could itself already be stale.
  const CANONICAL_TITLE = 'KJB Reader';
  useEffect(() => {
    const beforePrint = () => { document.title = '\u200B'; };
    const afterPrint = () => { document.title = CANONICAL_TITLE; };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  // Keep the tab title pinned to the canonical name. The browser can otherwise
  // derive a title from the URL path (e.g. "/advanced-search" → "Advanced
  // Search") on a hard refresh, or restore a stale title from a history entry
  // that was captured mid print/export. We force it on every route change AND
  // on a short delay after mount, so any late browser override is corrected.
  useEffect(() => {
    document.title = CANONICAL_TITLE;
    const t = setTimeout(() => { document.title = CANONICAL_TITLE; }, 400);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Standalone routes (outside AppLayout — /extension, /privacy, /terms, etc.)
  // scroll the window itself, not the #kjb-scroll container that AppLayout
  // resets. Without this, navigating to such a page opens it at the previous
  // page's scroll position instead of the top.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [location.pathname]);

  // Preload route chunks in background
  useEffect(() => { preloadAllRoutes(); }, []);

  // App mounted successfully — clear the one-shot chunk-reload guard so a
  // future genuine chunk failure can auto-recover again.
  useEffect(() => { try { sessionStorage.removeItem('kjb-chunk-reloaded'); } catch {} }, []);

  // Determine splash mode once on mount.
  // IMPORTANT: do NOT remove the 'kjb-splash-home-update' flag here. If a
  // background SW reload happens mid-flow, removing it early would drop us back
  // into the 'subsequent' flow (showing "LOADING → CHECKING → FOUND" instead of
  // "FOUND UPDATES" first). The flag is cleared only when the splash completes.
  const splashMode = React.useMemo(() => {
    const homeUpdate = sessionStorage.getItem('kjb-splash-home-update') === 'true';
    const hasVisited = localStorage.getItem('kjb-has-visited-app');

    if (homeUpdate) {
      return 'home_update';
    }
    return hasVisited ? 'subsequent' : 'first_load';
  }, []);

  const handleSplashDone = () => {
    // Splash flow finished — now it's safe to clear the home-update flag.
    try { sessionStorage.removeItem('kjb-splash-home-update'); } catch {}
    setFadeSplash(true);
    setTimeout(() => {
      setShowSplash(false);
      window.kjbSplashDone = true;
      window.dispatchEvent(new Event('kjb-splash-done'));
    }, 500);
  };

  // First-time visitors are sent to the landing/setup page
  if (location.pathname === '/') {
    try {
      if (localStorage.getItem('kjb-has-visited-app') !== 'true') {
        return <Navigate to="/landing" replace />;
      }
    } catch {}
  }

  return (
    <>
      {/* Splash screen ALWAYS renders on first paint to prevent flash — hidden via opacity, not removed. */}
      <SplashScreen
        isFadingOut={fadeSplash}
        onDone={handleSplashDone}
        mode={splashMode}
        isVisible={showSplash && location.pathname !== '/legacy' && location.pathname !== '/bible.txt'}
        skipMarkVisited={location.pathname === '/landing'}
        isLookup={initialPathname === '/search'}
      />
      <ChunkErrorBoundary>
        <Routes location={location}>
            <Route path="/login" element={<Suspense fallback={<RouteLoader />}><LoginPage /></Suspense>} />
            <Route path="/forgot-password" element={<Suspense fallback={<RouteLoader />}><ForgotPasswordPage /></Suspense>} />
            <Route path="/reset-password" element={<Suspense fallback={<RouteLoader />}><ResetPasswordPage /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<RouteLoader />}><RegisterPage /></Suspense>} />
            <Route path="/oauth/consent" element={<Suspense fallback={<RouteLoader />}><OAuthConsentPage /></Suspense>} />
            <Route path="/credits" element={<Suspense fallback={<RouteLoader />}><CreditsPage /></Suspense>} />
            <Route path="/changelog" element={<Suspense fallback={<RouteLoader />}><ChangelogPage /></Suspense>} />
            <Route path="/extension/change-log" element={<Suspense fallback={<RouteLoader />}><ChangelogPage /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<RouteLoader />}><TermsOfServicePage /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<RouteLoader />}><PrivacyPolicyPage /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<RouteLoader />}><ContactPage /></Suspense>} />
            <Route path="/salvation" element={<Suspense fallback={<RouteLoader />}><SalvationPage /></Suspense>} />
            <Route path="/discord" element={<Suspense fallback={<RouteLoader />}><DiscordInvitePage /></Suspense>} />
            <Route path="/extension" element={<Suspense fallback={<RouteLoader />}><ExtensionPage /></Suspense>} />
            <Route path="/extension-privacy" element={<Suspense fallback={<RouteLoader />}><ExtensionPrivacyPage /></Suspense>} />
            <Route path="/extension/privacy" element={<Suspense fallback={<RouteLoader />}><ExtensionPrivacyPage /></Suspense>} />
            <Route path="/extension-terms" element={<Suspense fallback={<RouteLoader />}><ExtensionTermsPage /></Suspense>} />
            <Route path="/extension-license" element={<Suspense fallback={<RouteLoader />}><ExtensionLicensePage /></Suspense>} />
            <Route path="/landing" element={<Suspense fallback={<RouteLoader />}><LandingPage /></Suspense>} />
            <Route path="/espanol-evangelio" element={<Suspense fallback={<RouteLoader />}><SpanishGospelPage /></Suspense>} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Suspense fallback={<RouteLoader />}><FadeIn><HomePage /></FadeIn></Suspense>} />
              <Route path="/read" element={<Suspense fallback={<RouteLoader />}><FadeIn><BibleReader /></FadeIn></Suspense>} />
              <Route path="/gospel" element={<Suspense fallback={<RouteLoader />}><FadeIn><GospelPage /></FadeIn></Suspense>} />
              <Route path="/resources" element={<Suspense fallback={<RouteLoader />}><FadeIn><ResourcesPage /></FadeIn></Suspense>} />
              <Route path="/kjb-defence" element={<Suspense fallback={<RouteLoader />}><FadeIn><KjbDefencePage /></FadeIn></Suspense>} />
              <Route path="/about" element={<Suspense fallback={<RouteLoader />}><FadeIn><AboutPage /></FadeIn></Suspense>} />

              <Route path="/contents" element={<Suspense fallback={<RouteLoader />}><FadeIn><ContentsPage /></FadeIn></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<RouteLoader />}><FadeIn><SettingsPage /></FadeIn></Suspense>} />
              <Route path="/search" element={<Suspense fallback={<RouteLoader />}><FadeIn><SearchPage /></FadeIn></Suspense>} />
              <Route path="/advanced-search" element={<Suspense fallback={<RouteLoader />}><FadeIn><AdvancedSearchPage /></FadeIn></Suspense>} />
              <Route path="/saved" element={<Suspense fallback={<RouteLoader />}><FadeIn><SavedVersesPage /></FadeIn></Suspense>} />
              <Route path="/refresh-cache" element={<Suspense fallback={<RouteLoader />}><FadeIn><RefreshCache /></FadeIn></Suspense>} />
              <Route path="/manifest-icons" element={<Suspense fallback={<RouteLoader />}><FadeIn><ManifestIcons /></FadeIn></Suspense>} />
              <Route path="/manifest-screenshots" element={<Suspense fallback={<RouteLoader />}><FadeIn><ManifestScreenshots /></FadeIn></Suspense>} />
              <Route path="/legacy" element={<Suspense fallback={<RouteLoader />}><FadeIn><LegacyReader /></FadeIn></Suspense>} />
              <Route path="/dev-tools" element={<Suspense fallback={<RouteLoader />}><FadeIn><DevToolsPage /></FadeIn></Suspense>} />
              <Route path="/espanol" element={<Suspense fallback={<RouteLoader />}><FadeIn><SpanishResourcesPage /></FadeIn></Suspense>} />
            </Route>
            <Route path="/bible.txt" element={<Suspense fallback={null}><BibleTxt /></Suspense>} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
      </ChunkErrorBoundary>
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HeaderHideProvider>
          <SoftReloadProvider>
            <QueryClientProvider client={queryClientInstance}>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
              <SonnerToaster position="top-center" offset={70} expand={false} visibleToasts={1} />
            </QueryClientProvider>
          </SoftReloadProvider>
        </HeaderHideProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App