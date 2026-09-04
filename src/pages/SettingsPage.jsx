import React, { useState, useEffect, useRef } from 'react';

import { Settings, Download, CheckCircle2, AlertCircle, Loader2, Trash2, Smartphone, MonitorSmartphone, Eye, EyeOff, ZoomIn, ZoomOut, Palette, Upload, Crop, Type, ChevronDown, CheckCircle, ExternalLink, Shield, MessageCircle, Youtube, RotateCcw, Accessibility, Keyboard, Star, Server, Globe, Mail, PlayCircle, Link2, FileText, Lock, Wrench } from 'lucide-react';
import ShortcutsList from '@/components/ShortcutsList';

import DownloadBibleSection from '@/components/bible/DownloadBibleSection';
import OfflineHtmlSection from '@/components/bible/OfflineHtmlSection';
import ThemeColorPicker from '@/components/bible/ThemeColorPicker';
import { Switch } from '@/components/ui/switch';
import InstallAppSection from '@/components/settings/InstallAppSection';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { useTheme, COLOUR_PALETTES } from '@/lib/themeContext';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import ContactLinks from '@/components/ContactLinks';
import { useAuth } from '@/lib/AuthContext';
import { downloadBibleForOffline, downloadBibleForOfflineWithRetry, clearBibleCache, isBibleCached, CACHE_VERSION } from '@/lib/bibleCache';
import { getAccessibilityFont, setAccessibilityFont } from '@/lib/accessibilityFont';
import { getAutoRotate, setAutoRotate as persistAutoRotate } from '@/lib/autoRotate';
import { detectIncognito } from '@/lib/incognito';
import { getLiveWorkerVersion, getDeployedWorkerVersion } from '@/lib/liveWorkerVersion';
import { isMobileDevice } from '@/lib/isMobileDevice';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

const A11Y_FONTS = [
  { value: 'dyslexic', label: 'OpenDyslexic', desc: 'Designed for readers with dyslexia', preview: "'OpenDyslexic', 'Comic Sans MS', sans-serif" },
  { value: 'hyperlegible', label: 'Atkinson Hyperlegible', desc: 'High legibility for low vision', preview: "'Atkinson Hyperlegible', system-ui, sans-serif" },
];

const inIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

// Firefox (any OS) and Safari on Mac don't support PWA install, so we offer
// "Add to Favourites/Bookmarks" instead via the browser's bookmark shortcut.
const isEdgeDesktop = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isEdge = /edg/i.test(ua);
  const isMobile = /iphone|ipad|ipod|android/i.test(ua);
  return isEdge && !isMobile;
};

const isBookmarkBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isFirefox = /firefox/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isMobile = /iphone|ipad|ipod|android/i.test(ua);
  return !isMobile && (isFirefox || (isMac && isSafari));
};

const LAST_REVISED = 'September 4th, 2026';
const WORKER_VERSION = 'v20260904_1200';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [a11yFont, setA11yFont] = useState(getAccessibilityFont);
  const [bookmarkBrowser] = useState(isBookmarkBrowser);
  const [isIncognito, setIsIncognito] = useState(false);
  // The ACTUAL running service worker's version, read live from the SW itself.
  // Falls back to the hardcoded WORKER_VERSION constant only if the SW can't be
  // reached (dev, unsupported browser, or not yet controlling the page).
  const [liveWorkerVersion, setLiveWorkerVersion] = useState(null);

  const refreshVersions = React.useCallback(() => {
    getDeployedWorkerVersion().then(v => v ? setLiveWorkerVersion(v) : getLiveWorkerVersion().then(setLiveWorkerVersion));
  }, []);

  useEffect(() => {
    refreshVersions();
    // Re-query when the tab regains focus (e.g. after bumping in DevTools) so
    // the Advanced section reflects the latest pushed version without a reload.
    window.addEventListener('focus', refreshVersions);
    // Also poll periodically while Settings is open, so a bump made elsewhere
    // (another tab, or the DevTools bump) shows up here within a few seconds
    // without needing to refocus or reload.
    const poll = setInterval(refreshVersions, 8000);
    return () => {
      window.removeEventListener('focus', refreshVersions);
      clearInterval(poll);
    };
  }, [refreshVersions]);

  const [expandedSections, setExpandedSections] = useState({
    text: true,
    accessibility: true,
    shortcuts: true,
    appearance: true,
    install: true,
    offline: true,
    downloadPdf: true,
    offlineHtml: true,
    info: true,
    credits: true,
    contact: true,
    developer: false,
    danger: false,
  });
  const { isDark, mode, setMode, colourId, setColourId } = useTheme();
  const [readerFontFamily, setReaderFontFamily] = useState(() => {
    try { return localStorage.getItem('kjb-reader-font-family') || 'serif'; } catch { return 'serif'; }
  });

  const [zoomLevel, setZoomLevel] = useState(() => {
    try { return parseInt(localStorage.getItem('kjb-zoom') || '100'); } catch { return 100; }
  });
  const [appZoom, setAppZoom] = useState(() => {
    try { return parseInt(localStorage.getItem('kjb-layout-zoom') || '100'); } catch { return 100; }
  });
  const setAppZoomPersist = (next) => {
    const clamped = Math.max(75, Math.min(150, next));
    setAppZoom(clamped);
    try { localStorage.setItem('kjb-layout-zoom', String(clamped)); } catch {}
    window.dispatchEvent(new Event('kjb-layout-zoom-changed'));
  };
  const [autoRotate, setAutoRotateState] = useState(getAutoRotate);
  const toggleAutoRotate = (checked) => {
    setAutoRotateState(checked);
    persistAutoRotate(checked);
  };

  // Startup diagnostics toggle (Advanced) -- gates the small on-screen debug
  // button index.html's boot script shows before React mounts. Off by
  // default; a copy-paste-friendly aid for chasing native/offline-carry
  // bugs, not something a normal user needs to see.
  const [debugDiagnostics, setDebugDiagnosticsState] = useState(() => {
    try { return localStorage.getItem('kjb-debug-diagnostics') === 'true'; } catch { return false; }
  });
  const toggleDebugDiagnostics = (checked) => {
    setDebugDiagnosticsState(checked);
    try { localStorage.setItem('kjb-debug-diagnostics', String(checked)); } catch {}
  };

  const VERSE_FONTS = [
    { value: 'serif', label: 'Serif (Merriweather)' },
    { value: 'sans-serif', label: 'Sans Serif (Inter)' },
    { value: 'monospace', label: 'Mono' },
    { value: 'cursive', label: 'Cursive' },
    { value: 'comic-sans', label: 'Comic Sans', cssFamily: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', system-ui, sans-serif" },
    { value: 'times', label: 'Times New Roman', cssFamily: "'Times New Roman', Times, serif" },
  ];

  // Unified font-pick handler for the reader font: normal fonts write
  // kjb-reader-font-family and clear any a11y font; dyslexic/hyperlegible set
  // the app-wide accessibility font. Mirrors the reader & daily card exactly.
  const pickReaderFont = (value) => {
    if (value === 'dyslexic' || value === 'hyperlegible') {
      setA11yFont(value);
      setAccessibilityFont(value);
      return;
    }
    // Write the key BEFORE disabling a11y to avoid the sync listener reading a
    // stale value and reverting the chosen font.
    try { localStorage.setItem('kjb-reader-font-family', value); } catch {}
    setReaderFontFamily(value);
    if (a11yFont !== 'default') { setA11yFont('default'); setAccessibilityFont('default'); }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('kjb-fonts-changed'));
  };

  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlStatus, setDlStatus] = useState('');
  const [dlError, setDlError] = useState('');

  useEffect(() => {
    isBibleCached().then(async (isCached) => {
      setCached(isCached);
      // If user just triggered "Clear Cache & Reload", auto-start the download now.
      // Only clear the flag once the download actually succeeds -- if we're
      // offline (or it fails for any other reason), leave it set so the
      // 'online' listener below can pick it up and retry later, instead of
      // silently losing the retry intent the moment this attempt fails.
      try {
        if (localStorage.getItem('kjb-auto-redownload') === 'true' && navigator.onLine) {
          const ok = await handleDownload(null, true); // retry on transient failures
          if (ok) {
            try { localStorage.removeItem('kjb-auto-redownload'); } catch {}
          }
        }
      } catch {}
    });

    // Listen for storage + focus events to keep Settings in sync with changes
    // made on the reader or daily card (font, accessibility font, zoom, etc.).
    const handleStorage = () => {
      isBibleCached().then(setCached);
      try { setReaderFontFamily(localStorage.getItem('kjb-reader-font-family') || 'serif'); } catch {}
      try { setZoomLevel(parseInt(localStorage.getItem('kjb-zoom') || '100')); } catch {}
      try { setA11yFont(getAccessibilityFont()); } catch {}
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);
    window.addEventListener('kjb-fonts-changed', handleStorage);

    // Retry a pending auto-redownload once connectivity returns (covers the
    // case where Reset/Clear Cache happened while offline, so the attempt
    // above never got the chance to run and the flag is still set).
    const handleOnlineRetry = () => {
      try {
        if (localStorage.getItem('kjb-auto-redownload') === 'true') {
          isBibleCached().then(async (isCached) => {
            if (isCached) { try { localStorage.removeItem('kjb-auto-redownload'); } catch {} return; }
            const ok = await handleDownload(null, true);
            if (ok) { try { localStorage.removeItem('kjb-auto-redownload'); } catch {} }
          });
        }
      } catch {}
    };
    window.addEventListener('online', handleOnlineRetry);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
      window.removeEventListener('kjb-fonts-changed', handleStorage);
      window.removeEventListener('online', handleOnlineRetry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Detect incognito/private mode once on mount
  useEffect(() => {
    detectIncognito().then(setIsIncognito);
  }, []);


  const handleDownload = async (e, withRetry = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDownloading(true);
    setDlError('');
    setDlProgress(0);
    setDlStatus('Starting download...');
    try {
      const dl = withRetry ? downloadBibleForOfflineWithRetry : downloadBibleForOffline;
      await dl((pct, msg) => {
        setDlProgress(pct);
        setDlStatus(msg);
      });
      setCached(true);
      setDlStatus('All 66 books downloaded successfully!');
      // Dispatch storage event to sync FirstLoadPrompt
      window.dispatchEvent(new Event('storage'));
      // Also update localStorage to prevent prompt from reappearing
      try {
        localStorage.setItem('kjb-prompt-dismissed', 'true');
      } catch {}
      setDownloading(false);
      return true;
    } catch (err) {
      console.error('Download error:', err);
      setDlError('Download failed: ' + err.message + '. Please check your connection and try again.');
      setDownloading(false);
      return false;
    }
  };

  const handleClearCache = async () => {
    // Navigate to refresh-cache page which handles everything properly
    // including service worker updates and Bible re-download
    console.log('[Settings] Navigating to refresh-cache for complete cache clear...');
    navigate('/refresh-cache');
  };

  // Permanently delete the signed-in user's account and all their data
  // (saved verses, settings, reading progress), then sign out and return
  // to the home page. The backend function runs as the calling user.
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteUserAccount', {});
      toast.success('Account deleted. You have been signed out.');
      setShowDeleteConfirm(false);
      // Clear any locally-cached user-scoped state so nothing lingers after
      // the auth provider re-initializes on the home page.
      try { localStorage.removeItem('kjb-has-visited-app'); } catch {}
      await base44.auth.logout('/');
    } catch (err) {
      console.error('[Settings] Delete account failed:', err);
      toast.error(err?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const allExpanded = Object.values(expandedSections).every(v => v);
  
  const toggleAll = () => {
    const newState = !allExpanded;
    setExpandedSections({
      text: newState,
      accessibility: newState,
      shortcuts: newState,
      appearance: newState,
      install: newState,
      offline: newState,
      downloadPdf: newState,
      offlineHtml: newState,
      info: newState,
      credits: newState,
      contact: newState,
      developer: newState,
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 pt-10 pb-32">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg shadow-slate-500/30 mb-4">
          <Settings className="w-7 h-7 text-white" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="font-sans text-sm text-muted-foreground">Customise your experience</p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        <button
          onClick={toggleAll}
          className="mt-4 px-4 py-2 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Text Settings */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('text')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Display</h2>
            <p className="font-sans text-xs text-muted-foreground">Customise text size, zoom, font and rotation</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.text ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.text && (
        <div className="px-5 pb-6 pt-2 space-y-3">
        
        {/* Zoom Level */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-sm text-foreground font-medium">Text Size: {zoomLevel}%</p>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                {zoomLevel < 100 ? 'Smaller text' : zoomLevel > 100 ? 'Larger text' : 'Default size'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newZoom = Math.max(75, zoomLevel - 25);
                  setZoomLevel(newZoom);
                  try { localStorage.setItem('kjb-zoom', String(newZoom)); } catch {}
                  window.dispatchEvent(new Event('storage'));
                }}
                aria-label="Decrease text size"
                className="p-2 rounded-xl bg-transparent border border-border text-foreground hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const newZoom = Math.min(150, zoomLevel + 25);
                  setZoomLevel(newZoom);
                  try { localStorage.setItem('kjb-zoom', String(newZoom)); } catch {}
                  window.dispatchEvent(new Event('storage'));
                }}
                aria-label="Increase text size"
                className="p-2 rounded-xl bg-transparent border border-border text-foreground hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {zoomLevel !== 100 && (
                <button
                  onClick={() => {
                    setZoomLevel(100);
                    try { localStorage.setItem('kjb-zoom', '100'); } catch {}
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="px-3 py-2 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-xs font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* App Zoom — scales the entire app layout (buttons, spacing, text) on every page */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-sm text-foreground font-medium">App Zoom: {appZoom}%</p>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                Scales the whole app's layout on every page &mdash; not just the reader
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAppZoomPersist(appZoom - 25)}
                aria-label="Decrease app zoom"
                className="p-2 rounded-xl bg-transparent border border-border text-foreground hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAppZoomPersist(appZoom + 25)}
                aria-label="Increase app zoom"
                className="p-2 rounded-xl bg-transparent border border-border text-foreground hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {appZoom !== 100 && (
                <button
                  onClick={() => setAppZoomPersist(100)}
                  className="px-3 py-2 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-xs font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Auto Rotate */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-sans text-sm text-foreground font-medium">Auto Rotate</p>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">Allow the screen to rotate with your device</p>
              </div>
            </div>
            <Switch checked={autoRotate} onCheckedChange={toggleAutoRotate} />
          </div>
        </div>

        {/* Font Family */}
        <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-muted-foreground" />
        <p className="font-sans text-sm text-foreground font-medium">Font Family</p>
        </div>
        {a11yFont !== 'default' && (
          <p className="font-sans text-xs text-muted-foreground -mt-1 leading-snug">
            An accessibility font is on and overrides reading fonts. Pick another accessibility font, or disable it in the Accessibility section.
          </p>
        )}
        <div className="flex flex-col gap-2">
        {VERSE_FONTS.filter(f => f.value !== 'comic-sans' || (typeof window !== 'undefined' && window.innerWidth >= 640)).map(font => (
          <button
            key={font.value}
            onClick={() => pickReaderFont(font.value)}
            className={`w-full py-3 rounded-xl font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-center border ${
              (a11yFont === 'default' && readerFontFamily === font.value)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 backdrop-blur-sm text-foreground border-border hover:border-accent'
            } ${a11yFont !== 'default' ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ fontFamily: font.cssFamily || font.value }}
          >
            {font.label}
          </button>
        ))}
        {a11yFont === 'default' && readerFontFamily !== 'serif' && (
          <button
            onClick={() => pickReaderFont('serif')}
            className="w-full py-3 rounded-xl font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-center bg-secondary/50 backdrop-blur-sm border border-border text-foreground hover:border-accent"
          >
            Reset to Default
          </button>
        )}
        </div>
        </div>
        </div>
        )}
      </div>

      {/* Accessibility */}
      <div id="kjb-accessibility-section" className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-6 overflow-hidden shadow-lg shadow-black/[0.03] scroll-mt-4">
        <button
          onClick={() => toggleSection('accessibility')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Accessibility</h2>
            <p className="font-sans text-xs text-muted-foreground">Reading fonts for the whole app</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.accessibility ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.accessibility && (
        <div className="px-5 pb-6 pt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-muted-foreground" />
            <p className="font-sans text-sm text-foreground font-medium">Accessibility Font</p>
          </div>
          <p className="font-sans text-xs text-muted-foreground -mt-1">
            Applies across the entire app — menus, pages, and scripture.
          </p>
          <div className="flex flex-col gap-2">
            {A11Y_FONTS.map(font => (
              <button
                key={font.value}
                onClick={() => {
                  setA11yFont(font.value);
                  setAccessibilityFont(font.value);
                }}
                className={`w-full py-3 px-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left border ${
                  a11yFont === font.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/50 backdrop-blur-sm text-foreground border-border hover:border-accent'
                }`}
              >
                <div className="flex flex-col items-start justify-center gap-0.5">
                  <p className="font-sans text-sm font-medium" style={font.preview ? { fontFamily: font.preview } : undefined}>
                    {font.label}
                  </p>
                  <p className="font-sans text-[10px] opacity-70">{font.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {a11yFont !== 'default' && (
            <button
              onClick={() => { setA11yFont('default'); setAccessibilityFont('default'); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/50 backdrop-blur-sm border border-destructive text-destructive font-sans text-sm font-medium hover:bg-destructive/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Disable
            </button>
          )}
        </div>
        )}
      </div>

      {/* Keyboard Shortcuts — desktop only, not relevant on mobile/touch
          devices. "hidden sm:block" alone only checks CSS viewport WIDTH
          (>=640px), which a phone in landscape (or just a larger phone) can
          still exceed -- showing this on an actual touchscreen device with
          no physical keyboard. isMobileDevice() checks the real device type
          instead, regardless of current orientation/viewport size. */}
      {!isMobileDevice() && (
      <div className="hidden sm:block bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('shortcuts')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
            <p className="font-sans text-xs text-muted-foreground">Quick keys for navigation and search</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.shortcuts ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.shortcuts && (
          <div className="px-5 pb-6 pt-3 space-y-4">
            <ShortcutsList />
            <button
              onClick={() => window.dispatchEvent(new Event('kjb-open-shortcuts'))}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Keyboard className="w-4 h-4" />
              Open Shortcuts Overlay
            </button>
          </div>
        )}
      </div>
      )}

      {/* Appearance */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('appearance')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Appearance</h2>
            <p className="font-sans text-xs text-muted-foreground">Customise the look and feel</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.appearance ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.appearance && (
        <div className="px-5 pb-6 pt-2 space-y-3">
        
        {/* Theme Mode */}
        <div className="space-y-3">
          <h3 className="font-serif text-base font-semibold text-foreground">Theme</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'light', label: '☀️ Light' },
              { id: 'dark', label: '🌙 Dark' },
              { id: 'auto', label: '🕐 Auto' },
              { id: 'system', label: '📱 System' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`py-2 rounded-xl font-sans text-sm font-medium border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  mode === opt.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-foreground border-border hover:border-accent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="font-sans text-xs text-muted-foreground">
            {mode === 'auto' ? '🕐 Auto: light 6am–6pm, dark 6pm–6am' :
             mode === 'system' ? '📱 System: follows your device setting' :
             mode === 'dark' ? '🌙 Dark mode always on' : '☀️ Light mode always on'}
          </p>
        </div>

        {/* Theme Color */}
        <div className="pt-4 border-t border-border">
          <ThemeColorPicker />
        </div>

        </div>
        )}
      </div>

      {/* Install App */}
      <InstallAppSection expanded={expandedSections.install} isIncognito={isIncognito} />

      {/* Offline Library — shows disabled state in private/incognito windows and iframes */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('offline')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Offline Library</h2>
            <p className="font-sans text-xs text-muted-foreground">{isIncognito || inIframe() ? 'Not available in preview mode' : 'Download for offline reading'}</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.offline ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.offline && (
          <div className="px-5 pb-6 pt-2">
            {isIncognito || inIframe() ? (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 p-4">
                <p className="font-sans text-sm text-amber-700 dark:text-amber-400 font-medium leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{isIncognito ? 'Offline downloads are not available in private/incognito mode. The cache would be deleted when you close the private window. Open this app in a normal window to download the Bible for offline reading.' : 'You are viewing this inside a preview window where offline downloads are disabled. Open the app in a new tab to download the Bible for offline reading.'}</span>
                </p>
              </div>
            ) : (
              <>
                <p className="font-sans text-sm text-muted-foreground mb-4">
                  Download all 66 books to your device for offline reading. Once downloaded, the Bible is available without an internet connection.
                </p>

            {cached ? (
              <div className="space-y-3">
                {!downloading && (
                  <div className="flex items-start gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-sans text-sm font-medium">
                        The Bible is cached — available offline
                      </span>
                    </div>
                  </div>
                )}

                {downloading && (
                  <div className="w-full bg-secondary/70 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${dlProgress}%` }}
                    />
                  </div>
                )}
                {!downloading && (
                  <button
                    onClick={async () => {
                      setDownloading(true);
                      setDlError('');
                      setDlProgress(0);
                      setDlStatus('Checking for updates...');
                      try {
                        let hasCodeUpdates = false;
                        let swReg = null;
                        if ('serviceWorker' in navigator) {
                          swReg = await navigator.serviceWorker.getRegistration();
                          if (swReg) {
                            await swReg.update().catch(() => {});
                            if (swReg.waiting) hasCodeUpdates = true;
                            else if (swReg.installing) {
                              if (swReg.installing.state === 'installed' || swReg.installing.state === 'activating' || swReg.installing.state === 'activated') hasCodeUpdates = true;
                              else {
                                hasCodeUpdates = await new Promise(resolve => {
                                  let resolved = false;
                                  const worker = swReg.installing;
                                  const handler = () => {
                                    if (worker.state === 'installed' || worker.state === 'activating' || worker.state === 'activated') {
                                      if (!resolved) { resolved = true; resolve(true); }
                                    } else if (worker.state === 'redundant') {
                                      if (!resolved) { resolved = true; resolve(false); }
                                    }
                                  };
                                  worker.addEventListener('statechange', handler);
                                  setTimeout(() => {
                                    if (!resolved) { resolved = true; worker.removeEventListener('statechange', handler); resolve(false); }
                                  }, 6000);
                                });
                              }
                            }
                          }
                        }

                        const { checkForUpdates, downloadBibleForOffline, isBibleCached } = await import('@/lib/bibleCache');
                        let hasBibleUpdates = await checkForUpdates().catch(() => false);
                        if (!hasBibleUpdates) {
                          const cached = await isBibleCached().catch(() => false);
                          if (!cached) hasBibleUpdates = true;
                        }

                        if (!hasCodeUpdates && !hasBibleUpdates) {
                          setDlStatus('App & Bible data are up to date. Reloading to ensure latest version...');
                          sessionStorage.setItem('kjb_sw_updated', 'up_to_date');
                          setTimeout(() => {
                            window.location.href = window.location.pathname + '?refresh=' + Date.now();
                          }, 1500);
                          return;
                        }

                        let reloadText = 'Found updates...';
                        let updateType = 'app';
                        if (hasCodeUpdates && hasBibleUpdates) { reloadText = 'Found app & Bible updates...'; updateType = 'both'; }
                        else if (hasBibleUpdates) { reloadText = 'Found Bible data updates...'; updateType = 'bible'; }
                        else if (hasCodeUpdates) { reloadText = 'Found app updates...'; updateType = 'app'; }

                        setDlStatus(reloadText);

                        if (hasBibleUpdates) {
                          localStorage.removeItem('bible_cache_version');
                          localStorage.removeItem('bible_last_refresh');
                          await downloadBibleForOffline((pct, msg) => {
                             setDlProgress(pct);
                             setDlStatus(msg);
                          });
                        }

                        if (hasCodeUpdates && swReg) {
                          sessionStorage.setItem('kjb_last_app_update', Date.now().toString());
                          if (swReg.waiting) swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
                          else if (swReg.installing && swReg.installing.state === 'installed') swReg.installing.postMessage({ type: 'SKIP_WAITING' });
                        }
                        
                        sessionStorage.setItem('kjb_sw_updated', updateType);
                        setTimeout(() => {
                          window.location.href = window.location.pathname + '?refresh=' + Date.now();
                        }, 2500);
                      } catch (err) {
                        setDlError('Check failed: ' + err.message);
                        setDownloading(false);
                      }
                    }}
                    disabled={downloading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium hover:border-accent disabled:opacity-60 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Check for Updates & Reload
                  </button>
                )}
                {dlStatus && !downloading && (
                  <p className="font-sans text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-4 h-4" /> {dlStatus}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!downloading && !dlStatus && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="font-sans text-sm">Not downloaded — Bible loads from network each visit</span>
                    </div>

                  </div>
                )}
                <button
                  onClick={handleDownload}
                  onTouchEnd={(e) => { e.preventDefault(); handleDownload(e); }}
                  disabled={downloading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 disabled:opacity-60"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloading ? 'Downloading…' : 'Download All 66 Books'}
                </button>
                {downloading && (
                  <div className="space-y-2">
                    <div className="w-full bg-secondary/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dlProgress}%` }}
                      />
                    </div>
                    <p className="font-sans text-xs text-muted-foreground">{dlStatus}</p>
                  </div>
                )}
                {dlStatus && !downloading && (
                  <p className="font-sans text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {dlStatus}
                  </p>
                )}
                {dlError && (
                  <p className="font-sans text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {dlError}
                  </p>
                )}
              </div>
            )}
                </>
              )}
          </div>
        )}
      </div>

      {/* Download Bible as PDF */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('downloadPdf')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Download Bible</h2>
            <p className="font-sans text-xs text-muted-foreground">Whole Bible with layout options</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.downloadPdf ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.downloadPdf && <DownloadBibleSection />}
      </div>

      {/* Offline HTML Bible & Legacy Reader — for old browsers / no-JS environments */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('offlineHtml')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Old Browser & Offline Options</h2>
            <p className="font-sans text-xs text-muted-foreground">Standalone HTML file and Legacy Reader for IE & old devices</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.offlineHtml ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.offlineHtml && (
          <div>
            <OfflineHtmlSection />
            <div className="px-5 pb-5 pt-1 border-t border-border space-y-2">

              <Link
                to="/legacy"
                className="flex items-center gap-3 p-3 rounded-xl bg-transparent border border-border hover:border-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-background/50 backdrop-blur-md border border-border shadow-sm">
                  <MonitorSmartphone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Open Legacy Reader</p>
                  <p className="font-sans text-xs text-muted-foreground">Tested on Internet Explorer 11 / Windows 8.1. Old iOS, macOS, and Android are untested — email kingjamesbiblereader@outlook.sg to report any issues.</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('info')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">App Info</h2>
            <p className="font-sans text-xs text-muted-foreground">Version and features</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.info ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.info && (
          <div className="px-5 pb-6 pt-2 space-y-2">
            <div className="p-3 mb-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-start gap-2 text-primary">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-sans text-sm font-medium">Automatic Updates</p>
                  <p className="font-sans text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    This app connects to the internet in the background to automatically apply new features, typo corrections, and security fixes. You never have to refresh manually!
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center font-sans text-sm gap-4">
                <span className="text-muted-foreground shrink-0">Bible Text</span>
                <span className="text-foreground font-medium text-right">King James Bible (PCE)</span>
              </div>
              <div className="flex justify-between items-center font-sans text-sm gap-4">
                <span className="text-muted-foreground shrink-0">Last Updated</span>
                <span className="text-foreground font-medium text-right">{LAST_REVISED}</span>
              </div>
              <div className="flex justify-between items-center font-sans text-sm gap-4">
                <span className="text-muted-foreground shrink-0">Offline Support</span>
                <span className="text-foreground font-medium text-right flex items-center gap-1">
                  {inIframe() || isIncognito ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Unavailable
                    </>
                  ) : cached ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Not Downloaded
                    </>
                  )}
                </span>
              </div>
              {!isNativeAndroid() && (
                <div className="flex justify-between items-center font-sans text-sm gap-4">
                  <span className="text-muted-foreground shrink-0">PWA Status</span>
                  <span className="text-foreground font-medium text-right flex items-center gap-1">
                    {(() => {
                      try {
                        const dmFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
                        const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
                        const dmMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
                        const dmOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
                        if (dmFullscreen || dmStandalone || dmMinimal || dmOverlay || navigator.standalone === true) {
                          return <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Installed</>;
                        }
                      } catch {}
                      return <><Smartphone className="w-3.5 h-3.5 text-muted-foreground" /> Browser</>;
                    })()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center font-sans text-sm gap-4">
                <span className="text-muted-foreground shrink-0">Theme</span>
                <span className="text-foreground font-medium text-right">
                  {mode === 'auto' ? '🕐 Auto' :
                   mode === 'system' ? '📱 System' :
                   mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </span>
              </div>
            </div>

            {/* Admin sign-in / Defence access — compact filter-bar style row, matching Search's filter bar */}
            <div className="flex flex-wrap items-center gap-2 pt-4 mt-2 border-t border-border">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-sans text-xs text-muted-foreground">Admin Access:</span>
              {user?.role === 'admin' ? (
                <>
                  <button
                    onClick={() => navigate('/kjb-defence')}
                    className="px-2.5 py-1 rounded-lg font-sans text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-colors"
                  >
                    Open Defence
                  </button>
                  <button
                    onClick={() => navigate('/dev-tools')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-sans text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent/20 transition-colors"
                  >
                    <Wrench className="w-3 h-3" /> Dev Tools
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login?returnTo=/kjb-defence')}
                  className="px-2.5 py-1 rounded-lg font-sans text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Advanced */}
            <div className="pt-4 mt-2 border-t border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-sans text-sm text-foreground font-medium">Startup Diagnostics</p>
                    <p className="font-sans text-xs text-muted-foreground mt-0.5">Shows a small on-screen debug button at launch, for troubleshooting</p>
                  </div>
                </div>
                <Switch checked={debugDiagnostics} onCheckedChange={toggleDebugDiagnostics} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  if (confirm('Reset all settings to default? This cannot be undone.')) {
                    // Reset all localStorage settings.
                    localStorage.removeItem('kjb-verse-text-color');
                    localStorage.removeItem('kjb-verse-text-opacity');
                    localStorage.removeItem('kjb-verse-font-family');
                    localStorage.removeItem('kjb-reader-font-family');
                    localStorage.removeItem('kjb-verse-panel-visible');
                    localStorage.removeItem('kjb-zoom');
                    localStorage.removeItem('kjb-notif-image');
                    localStorage.removeItem('kjb-daily-verse-bg');
                    localStorage.removeItem('kjb-daily-verse-cache');
localStorage.removeItem('kjb-daily-verse-cache-v16');
localStorage.removeItem('kjb-daily-verse-cache-v17');
                    // Flag a fresh re-download for after the reload below
                    // picks it up (isBibleCached()'s mount effect checks this
                    // flag and auto-starts the download). clearBibleCache()
                    // itself only clears storage -- it does NOT reload on its
                    // own (despite an earlier version of this comment saying
                    // otherwise), so without the explicit reload below the
                    // flag just sat there unused until some unrelated later
                    // navigation happened to trigger it, disconnected from
                    // this button press entirely.
                    try { localStorage.setItem('kjb-auto-redownload', 'true'); } catch {}
                    await clearBibleCache();
                    window.location.reload();
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-transparent border border-destructive text-destructive font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Settings
              </button>
              <button
                onClick={handleClearCache}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:border-accent"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Cache & Reload
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Credits — link to dedicated page */}
      <Link
        to="/credits"
        className="block bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03] hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="w-full flex items-center justify-between px-5 py-3.5">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">About &amp; Credits</h2>
            <p className="font-sans text-xs text-muted-foreground">Attributions, licences and acknowledgements</p>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground -rotate-90" />
        </div>
      </Link>

      {/* Contact & Feedback */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
        <button
          onClick={() => toggleSection('contact')}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-lg font-semibold text-foreground">Contact & Feedback</h2>
            <p className="font-sans text-xs text-muted-foreground">Report bugs or share feedback</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.contact ? 'rotate-180' : ''}`} />
        </button>
        {expandedSections.contact && (
          <div className="px-5 pb-6 pt-2 space-y-2">
            <button
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-violet-500 to-purple-600">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Privacy Policy</p>
                <p className="font-sans text-xs text-muted-foreground">How your data is handled</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-primary to-accent">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Terms of Service</p>
                <p className="font-sans text-xs text-muted-foreground">View our terms</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
            </button>
            <ContactLinks />
          </div>
        )}
      </div>

    </div>
  );
}