import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { cacheSplashLogo } from '@/lib/splashLogo'
import { isNativeAndroid } from '@/lib/isNativeAndroid'
import { toast } from 'sonner'

// Swallow the harmless, transient "Failed to update a ServiceWorker ... Not
// found" rejection that the preview sandbox throws when /sw.js momentarily
// can't be fetched. It's already caught at every call site; this is a final
// safety net so it never surfaces as an uncaught error.
const isSwNotFoundError = (msg) => /Failed to (update|register) a ServiceWorker/i.test(msg || '');

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  // The vite plugin's handler accesses reason.stack.match(...). If the
  // rejection is not a real Error (no string .stack), the plugin crashes.
  // preventDefault() + stopImmediatePropagation() so the plugin never sees it.
  if (!reason || typeof reason.stack !== 'string') {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (isSwNotFoundError(reason.message)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

// The browser also emits this as a window 'error' event during its automatic
// SW update check (separate from manual reg.update() calls). Catch it here too.
window.addEventListener('error', (event) => {
  const msg = event?.error?.message || event?.message || '';
  if (isSwNotFoundError(msg)) {
    event.preventDefault();
  }
});

// Guard against the classic "Failed to execute 'insertBefore'/'removeChild' on
// 'Node'" crash caused by browser translation tools (Google Translate, Edge
// Translate, etc.) rewriting text nodes behind React's back. When a node has
// already been moved/removed by the translator, React's next DOM patch throws
// a hard DOMException and can crash the whole app. These patches make the
// native calls no-ops in that specific case instead of throwing.
if (typeof Node === 'function' && Node.prototype) {
  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return origInsertBefore.call(this, newNode, referenceNode);
  };

  const origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return origRemoveChild.call(this, child);
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[KJB] #root element not found — cannot mount app.');
} else {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Service worker registration for offline support and notifications.
// Runs IMMEDIATELY (not deferred to the `load` event) so the SW begins
// installing on the first JS tick and is already registered by the time
// PWA scanners (PWABuilder, Lighthouse) evaluate the page within their
// short scan window. The DEV guard below still skips/unregisters in dev.
(async () => {

  // Skip service worker registration in development mode to prevent React hook errors
  if (import.meta.env.DEV) {
    console.log('[SW] Skipping registration in development mode');
    // Unregister any existing service workers in dev mode
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    return;
  }

  // Skip entirely on the native Android app. The Service Worker exists to
  // give the BROWSER/PWA context offline support -- but the native app
  // already has its own, better mechanism for that: the whole site is
  // bundled straight into the APK and served via MainActivity.java's
  // shouldInterceptRequest whenever there's no connectivity, rebuilt fresh
  // with every version, so it can never go stale the way a browser cache
  // can. Letting the SW run here too, on the SAME origin the native
  // fallback also uses, means its own cache-first strategy can end up
  // "in the way": a cache MISS against an OLDER build's hashed asset
  // filenames falls through to fetch(), which fails offline, and the SW's
  // own fallback for that (a synthetic broken placeholder response for
  // anything that isn't a navigation) breaks the page instead of ever
  // letting the always-fresh native bundle actually serve it. Also
  // unregisters any SW a device may already have picked up from an EARLIER
  // version of the app before this guard existed, so upgrading doesn't
  // leave a stale, still-active SW controlling the page indefinitely.
  if (isNativeAndroid()) {
    console.log('[SW] Skipping registration on native Android -- offline is handled natively instead');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    return;
  }

  // Cache the splash logo as base64 in localStorage for offline use (the
  // cross-origin logo URL is unreliable to cache via SW alone).
  cacheSplashLogo().catch(() => {});

  // The preview sandbox occasionally can't serve /sw.js, making
  // registration.update() reject with "Failed to update a ServiceWorker ...
  // Not found". Wrap update() so any such transient rejection is fully
  // swallowed and never surfaces as an uncaught error.
  const safeSwUpdate = (reg) => {
    try {
      return Promise.resolve(reg.update()).catch(() => {});
    } catch {
      return Promise.resolve();
    }
  };

  // Register fresh service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none', scope: '/' });
      console.log('[SW] Registered:', registration.scope);

      // A new service worker installs and activates itself silently in the
      // background (it calls self.skipWaiting() on install) — we deliberately
      // do NOT reload the current tab when that happens. Reloading mid-session
      // is what caused the disruptive "checking for updates" wait. Instead the
      // new version simply takes over for the NEXT app open, with no wait at all.

      // Periodic background update check — starts after SplashScreen is done.

      // Periodic background update check — every 60s while tab is visible.
      const POLL_MS = 60 * 1000;
      setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        if (navigator.onLine === false) return;
        safeSwUpdate(registration);
      }, POLL_MS);

      // Also check immediately whenever the tab becomes visible again.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine !== false) {
          safeSwUpdate(registration);
        }
      });

      // Prewarm: tell SW to cache every <script> and <link rel=stylesheet> on the page
      // so all lazy-loaded routes work offline, even if the user never visited them online.
      // Critical fonts that load lazily (accessibility fonts + Google Fonts CSS).
      // Explicitly prewarm them so the FULL app — including dyslexic/legible
      // fonts and all scripture fonts — works offline even if never triggered online.
      const CRITICAL_FONT_ASSETS = [
        '/fonts/OpenDyslexic-regular.woff',
        '/fonts/OpenDyslexic-bold.woff',
        '/fonts/OpenDyslexic-italic.woff',
        'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=block',
        // Main scripture/UI fonts (Google Fonts CSS). The actual woff2 files it
        // references are extracted and prewarmed in prewarmAssets() below.
        'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Dancing+Script:wght@300;400;500;600;700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=block',
        // App logo/icon used on the splash screen, daily card, and PWA.
        'https://media.base44.com/images/public/6a05d76723afe58d80c589e8/2279e016e_8e738d108_cfb4bf781_Untitled.png',
        'https://media.base44.com/images/public/6a05d76723afe58d80c589e8/f69363ad9_generated_image.png',
        // PWA icon (favicon, apple-touch-icon, boot splash image).
        'https://base44.app/api/apps/6a05d76723afe58d80c589e8/files/mp/public/6a05d76723afe58d80c589e8/c2459f3df_kjb-icon512-v20260713.png',
        // Landing page logo icon (a different file from the splash/favicon icon).
        'https://base44.app/api/apps/6a05d76723afe58d80c589e8/files/mp/public/6a05d76723afe58d80c589e8/1d77e5114_icon-512.png',
        ];

      const prewarmAssets = async () => {
        try {
          const urls = new Set(CRITICAL_FONT_ASSETS);
          document.querySelectorAll('script[src]').forEach(s => {
            try { urls.add(new URL(s.src, location.href).href); } catch {}
          });
          document.querySelectorAll('link[rel="stylesheet"], link[rel="modulepreload"], link[rel="preload"]').forEach(l => {
            try { if (l.href) urls.add(new URL(l.href, location.href).href); } catch {}
          });
          // Fetch each stylesheet and extract @font-face url() references so the
          // actual font files (woff2) are cached — not just the CSS that points at
          // them. Without this, a font face never rendered while online (e.g.
          // italic Merriweather) would be missing offline.
          const cssUrls = [...urls].filter(u => u.includes('fonts.googleapis.com/css') || u.endsWith('.css'));
          await Promise.all(cssUrls.map(async (cssUrl) => {
            try {
              const res = await fetch(cssUrl, { cache: 'no-store' });
              const text = await res.text();
              const re = /url\(([^)]+)\)/g;
              let m;
              while ((m = re.exec(text)) !== null) {
                const u = m[1].replace(/["']/g, '');
                if (u.startsWith('http')) urls.add(u);
              }
            } catch {}
          }));
          const list = Array.from(urls);
          if (list.length && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'PREWARM_ASSETS', urls: list });
            console.log('[SW] Prewarm requested for', list.length, 'assets');
          }
        } catch (err) {
          console.warn('[SW] Prewarm failed:', err);
        }
      };

      // Run prewarm when SW is controlling the page
      if (navigator.serviceWorker.controller) {
        // Already controlled — prewarm now (and after a delay to catch dynamic chunks)
        prewarmAssets();
        setTimeout(prewarmAssets, 3000);
        setTimeout(prewarmAssets, 10000);
      } else {
        // First load — wait for controllerchange, then prewarm
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          setTimeout(prewarmAssets, 500);
          setTimeout(prewarmAssets, 5000);
        });
      }

      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'UPDATE_AVAILABLE') {
          console.log('[SW] Update available, version:', event.data.cacheVersion);
        }
        if (event.data?.type === 'CACHE_VERSION') {
          console.log('[SW] Cache version:', event.data.cacheVersion);
        }
      });
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  }
})();