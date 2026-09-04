// Auto-rotate preference: when disabled, we lock the screen to whatever
// orientation it's currently in.
// - Native Android/iOS app (Capacitor): uses the ScreenOrientation plugin to
//   lock the actual native window — this is the only way to stop rotation
//   there, since a web page can't override the OS rotating the Activity.
// - Browser/TWA: tries the real Screen Orientation Lock API (works in
//   Fullscreen mode or an installed/standalone PWA), PLUS a CSS fallback that
//   counter-rotates the page back to the locked orientation when the device
//   is physically turned — this is what makes the lock work in a plain,
//   non-fullscreen browser tab too.
import { Capacitor } from '@capacitor/core';

const KEY = 'kjb-auto-rotate';
const STYLE_ID = 'kjb-orientation-lock-style';

export const getAutoRotate = () => {
  try { return localStorage.getItem(KEY) !== 'false'; } catch { return true; }
};

const removeCssLock = () => {
  const el = typeof document !== 'undefined' && document.getElementById(STYLE_ID);
  if (el) el.remove();
};

// Injects a media query that rotates <html> back to the locked orientation
// whenever the device's actual orientation flips to the opposite one.
const applyCssLock = (lockLandscape) => {
  removeCssLock();
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  const oppositeQuery = lockLandscape ? '(orientation: portrait)' : '(orientation: landscape)';
  const rotate = lockLandscape ? '90deg' : '-90deg';
  style.textContent = `
    @media ${oppositeQuery} {
      html {
        transform: rotate(${rotate});
        transform-origin: left top;
        width: 100vh;
        height: 100vw;
        overflow-x: hidden;
        position: absolute;
        top: ${lockLandscape ? '0' : '100%'};
        left: ${lockLandscape ? '100%' : '0'};
      }
      /* Viewport-height units (vh/dvh) always measure the real, physical
         viewport regardless of the rotate() above, so the app's h-[100dvh]
         root would otherwise size itself to the WRONG (post-rotation)
         dimension and leave blank space. Force it back to 100% of the
         already-correctly-sized rotated <html> box instead. */
      html body, html #root, html [data-kjb-app-root] {
        height: 100% !important;
        max-height: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
};

export const applyAutoRotate = async (enabled) => {
  // Talk to our own native bridge directly instead of the
  // @capacitor/screen-orientation plugin -- that plugin's native-vs-web
  // routing goes through Capacitor's own PluginHeaders mechanism, a
  // DIFFERENT check than window.__KJB_NATIVE_ANDROID__/isNativeAndroid()
  // above, and one we can't guarantee is always populated correctly. If it
  // ever reads wrong, ScreenOrientation.lock() would silently fall through
  // to the web implementation, which needs browser fullscreen to do
  // anything and otherwise just throws (caught below, doing nothing) --
  // exactly the "still rotates" symptom this replaces. window.kjbOrientation
  // Bridge (registered by MainActivity.java, Android only) calls
  // setRequestedOrientation() directly, with no plugin dispatch involved.
  if (typeof window !== 'undefined' && window.kjbOrientationBridge) {
    try {
      if (enabled) {
        window.kjbOrientationBridge.unlock();
      } else {
        let isLandscape = false;
        try { isLandscape = window.matchMedia('(orientation: landscape)').matches; } catch {}
        window.kjbOrientationBridge.lock(isLandscape ? 'landscape' : 'portrait');
      }
    } catch {
      // Bridge not available for some reason -- nothing more we can do.
    }
    return;
  }
  // iOS/other native platforms without our bridge: still use the Capacitor
  // plugin, since that's a genuinely different, untested platform.
  if (Capacitor.isNativePlatform()) {
    try {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation');
      if (enabled) {
        await ScreenOrientation.unlock();
      } else {
        const current = await ScreenOrientation.orientation();
        const orientation = current?.type?.startsWith('landscape') ? 'landscape' : 'portrait';
        await ScreenOrientation.lock({ orientation });
      }
    } catch {
      // Plugin not available (e.g. not synced into the native build yet) — ignore.
    }
    return;
  }
  if (enabled) {
    removeCssLock();
    if (typeof screen !== 'undefined' && screen.orientation?.unlock) {
      try { screen.orientation.unlock(); } catch {}
    }
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
    return;
  }
  let isLandscape = false;
  try { isLandscape = window.matchMedia('(orientation: landscape)').matches; } catch {}
  // Always apply the CSS fallback immediately — it works in a plain tab too.
  applyCssLock(isLandscape);
  if (typeof screen === 'undefined' || !screen.orientation) return;
  const current = screen.orientation.type || (isLandscape ? 'landscape-primary' : 'portrait-primary');
  try {
    // The real Lock API only succeeds in fullscreen / standalone display —
    // in a plain browser tab it throws, so we request fullscreen first (this
    // call must stay directly in the user-gesture call chain, not delayed by
    // a preceding await, so the browser still counts it as user-activated).
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    }
    await screen.orientation.lock(current);
    // A true lock is now active — the CSS fallback is no longer needed and
    // would otherwise double up with the real (already-correct) orientation.
    removeCssLock();
  } catch {
    // Fullscreen was refused/unsupported (e.g. not from a direct user
    // gesture) — the CSS fallback applied above remains in effect.
  }
};

export const setAutoRotate = (enabled) => {
  try { localStorage.setItem(KEY, String(enabled)); } catch {}
  applyAutoRotate(enabled);
  window.dispatchEvent(new Event('kjb-auto-rotate-changed'));
};