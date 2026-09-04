import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'kjb-install-dismissed';
const INSTALLED_KEY = 'kjb-is-installed';

// Google Play Store listing for the native Android app (package: kjbreader.app).
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=kjbreader.app';

// Android package id(s) this PWA is distributed as via PWABuilder / Play Store.
// `navigator.getInstalledRelatedApps()` reports the installed package here for
// a verified TWA, which is the only reliable "already installed" signal inside
// a PWABuilder Android shell (the custom UA token / ?from flag were for the
// abandoned Capacitor wrapper, and display-mode: standalone only matches when
// asset-links verification succeeds).
const TWA_PACKAGE_IDS = ['com.godisgracious1031m.kjbreader', 'kjbreader.app'];

// Async TWA detection. Returns true if the device reports this app as an
// installed related app (works inside a verified PWABuilder TWA on Android).
const getTwaInstalled = async () => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.getInstalledRelatedApps !== 'function') {
      return false;
    }
    const apps = await navigator.getInstalledRelatedApps();
    if (!Array.isArray(apps) || apps.length === 0) return false;
    return apps.some((a) => {
      if (!a) return false;
      const id = String(a.id || '').toLowerCase();
      const platform = String(a.platform || '').toLowerCase();
      // Match our Android package on the Play platform; fall back to a loose
      // id match in case the platform field is absent.
      if (platform === 'play' && TWA_PACKAGE_IDS.some((p) => id === p.toLowerCase())) return true;
      if (TWA_PACKAGE_IDS.some((p) => id === p.toLowerCase())) return true;
      return false;
    });
  } catch {
    return false;
  }
};

// Same API, but checks for our own web-app manifest listed as a
// "related_applications" entry (platform: "webapp") — this lets Chrome/Edge
// report the PWA as installed even from a plain, non-standalone browser tab,
// which display-mode media queries can't do on their own. Not supported by
// Firefox/Safari, and can be unreliable on some Chrome versions/platforms —
// it's an extra signal, not a replacement for display-mode detection.
const getWebAppInstalled = async () => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.getInstalledRelatedApps !== 'function') {
      return false;
    }
    const apps = await navigator.getInstalledRelatedApps();
    if (!Array.isArray(apps) || apps.length === 0) return false;
    return apps.some((a) => a && String(a.platform || '').toLowerCase() === 'webapp');
  } catch {
    return false;
  }
};

const isAndroidUA = () => {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
};

// Detect the native Android app — a WebView wrapper that loads the PWA. Its
// MainActivity appends a " KJBReader" token to the user agent so the web side
// can distinguish it from a plain Chrome-on-Android browser (the default
// WebView UA lacks the "wv" marker). Fall back to the generic Android WebView
// "wv" token for any build that doesn't carry the custom token. The native
// app also launches with ?from=native-app, which we persist to localStorage so
// the signal survives SPA navigations away from the root URL.
const NATIVE_FLAG_KEY = 'kjb-native-app';
// Reliable marker for the Play Store Android TWA (PWABuilder shell). When
// Digital Asset Links verification is pending/failing, neither
// `display-mode: standalone` nor `navigator.getInstalledRelatedApps()` report
// the app as installed — so install detection silently fails in the shipped
// Play Store app. To get a signal that doesn't depend on verification, set the
// TWA's start URL in PWABuilder to include `?from=twa` (e.g.
// https://<app-domain>/?from=twa). Only TWA launches carry this param, so it
// can't false-positive on regular browser visits; the flag is persisted so
// detection survives SPA navigation and reloads.
const TWA_FLAG_KEY = 'kjb-twa-app';
if (typeof window !== 'undefined') {
  try {
    const p = new URLSearchParams(window.location.search).get('from');
    if (p === 'native-app') localStorage.setItem(NATIVE_FLAG_KEY, 'true');
    if (p === 'twa' || p === 'play') {
      localStorage.setItem(TWA_FLAG_KEY, 'true');
      localStorage.setItem(INSTALLED_KEY, 'true');
    }
  } catch {}
}

export const isNativeAndroidApp = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(NATIVE_FLAG_KEY) === 'true') return true;
  } catch {}
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/KJBReader/i.test(ua)) return true;
  return /android/i.test(ua) && /wv/i.test(ua);
};

// Install detection using display-mode media queries (synchronous, no flicker).
// Once installed, state persists via localStorage until user manually resets.
const checkInstalled = () => {
  if (typeof window === 'undefined') return false;
  
  // Never report installed when running inside an iframe (preview/embed)
  try {
    if (window.self !== window.top) return false;
  } catch (e) {
    return false;
  }
  
  // 0. Native Android app (WebView wrapper) — already installed. The native
  // app's UA carries a "KJBReader" token (or the generic Android "wv" marker),
  // so we can tell it apart from a plain Chrome-on-Android browser.
  if (isNativeAndroidApp()) {
    localStorage.setItem(INSTALLED_KEY, 'true');
    return true;
  }

  // Play Store TWA — marked via `?from=twa` on the TWA's start URL. Reliable
  // regardless of Digital Asset Links verification status, and separate from
  // the native Capacitor flag so push routing isn't affected.
  try {
    if (localStorage.getItem(TWA_FLAG_KEY) === 'true') {
      localStorage.setItem(INSTALLED_KEY, 'true');
      return true;
    }
  } catch {}

  // 1. PRIMARY: display-mode media queries (works inside PWA, synchronous, no flicker)
  const dmFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dmMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
  const dmOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
  
  if (dmFullscreen || dmStandalone || dmMinimal || dmOverlay) {
    localStorage.setItem(INSTALLED_KEY, 'true');
    return true;
  }
  
  // 2. iOS Safari standalone (older iOS versions)
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    try {
      if (window.navigator.standalone === true) {
        localStorage.setItem(INSTALLED_KEY, 'true');
        return true;
      }
    } catch {}
  }

  // 3. Persisted flag — set only by one of the authoritative signals above (or
  // the 'appinstalled' event / getInstalledRelatedApps checks below), never
  // guessed. localStorage is shared across every tab on this origin, so once
  // any tab confirms a real install, every other tab (including plain browser
  // tabs that can't see display-mode: standalone) picks it up on next check —
  // and the "Reset install status" button removes it, which fires a 'storage'
  // event that syncs the "not installed" state back out to every other tab too.
  try {
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return true;
  } catch {}

  // Not installed - do NOT clear localStorage (prevents flicker on unreliable APIs)
  return false;
};

let deferredPrompt = (typeof window !== 'undefined' && window.kjbDeferredPrompt) || null;

const isSamsungInternet = () => {
  if (typeof window === 'undefined') return false;
  return /SamsungBrowser/i.test(navigator.userAgent);
};

const isPwaInstallable = () => {
  if (typeof window === 'undefined') return false;
  const hasManifest = !!document.querySelector('link[rel="manifest"]');
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  const notStandalone = !window.matchMedia('(display-mode: fullscreen)').matches &&
                        !window.matchMedia('(display-mode: standalone)').matches && 
                        !window.matchMedia('(display-mode: minimal-ui)').matches &&
                        !window.matchMedia('(display-mode: window-controls-overlay)').matches &&
                        window.navigator.standalone !== true;
  return hasManifest && isSecure && notStandalone;
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.kjbDeferredPrompt = e;
    window.dispatchEvent(new Event('kjb-install-change'));
  });
}

export function useInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(!!deferredPrompt || isPwaInstallable());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSamsung, setIsSamsung] = useState(false);

  useEffect(() => {
    const installed = checkInstalled();
    setIsInstalled(installed);
    setIsLoading(false);
    setIsSamsung(isSamsungInternet());

    // Async TWA detection: the synchronous signals (UA token, display-mode)
    // miss a verified PWABuilder Android TWA, so query the device's installed
    // related apps. When the TWA is present, persist the flag so subsequent
    // synchronous reads (checkInstalled) return true without another probe.
    if (!installed) {
      getTwaInstalled().then((twaInstalled) => {
        if (twaInstalled) {
          try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch {}
          setIsInstalled(true);
        }
      });
      getWebAppInstalled().then((webAppInstalled) => {
        if (webAppInstalled) {
          try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch {}
          setIsInstalled(true);
        }
      });
    }

    const handleStorage = () => {
      setIsInstalled(checkInstalled());
    };

    // beforeinstallprompt can fire seconds after load (Chrome engagement heuristic).
    // index.html captures it into window.kjbDeferredPrompt and dispatches these events,
    // so re-evaluate installability when they arrive instead of staying stale.
    const handleInstallChange = () => {
      deferredPrompt = (typeof window !== 'undefined' && window.kjbDeferredPrompt) || deferredPrompt;
      setIsInstallable(!!deferredPrompt || isPwaInstallable());
      setIsInstalled(checkInstalled());
    };

    // When the user accepts the install, flip to installed immediately in this tab.
    const handleAppInstalled = () => {
      deferredPrompt = null;
      try { window.kjbDeferredPrompt = null; } catch {}
      try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch {}
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('kjb-install-change', handleInstallChange);
    window.addEventListener('pwa-installable', handleInstallChange);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('kjb-install-change', handleInstallChange);
      window.removeEventListener('pwa-installable', handleInstallChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    // Always check window.kjbDeferredPrompt first (set by index.html event listener)
    if (!deferredPrompt && window.kjbDeferredPrompt) {
      deferredPrompt = window.kjbDeferredPrompt;
    }
    
    // If we have a deferred prompt, use it (standard Chrome/Edge/Samsung flow)
    if (deferredPrompt) {
      try {
        // Prompt accepted
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        window.kjbDeferredPrompt = null;
        setIsInstallable(false);
        return outcome === 'accepted';
      } catch (err) {
        console.error('Install prompt error:', err);
        return false;
      }
    }
    
    // No deferredPrompt available - check if we're on a browser that should support native installs
    // If so, the prompt may have been lost (e.g., after page reload) - return false to show manual guide
    // Edge Desktop: if PWA is installable but no prompt, user needs to reload or use browser menu
    if (isPwaInstallable()) {
      return false;
    }
    
    return false;
  };

  const wasDismissed = () => {
    try { return !!localStorage.getItem(DISMISSED_KEY); } catch { return false; }
  };
  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  };
  const handleInstall = async () => {
    const result = await promptInstall();
    return result;
  };
  const handleDismiss = () => dismiss();

  return {
    isInstallable, isInstalled, isLoading, isSamsung,
    playStoreUrl: PLAY_STORE_URL,
    isAndroidDevice: isAndroidUA(),
    isNativeAndroid: isNativeAndroidApp(),
    promptInstall, dismiss, wasDismissed, handleInstall, handleDismiss,
  };
}