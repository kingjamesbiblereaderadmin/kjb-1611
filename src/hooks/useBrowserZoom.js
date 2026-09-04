import { useEffect } from 'react';

/**
 * Scales the root font-size so the entire rem-based layout grows or shrinks
 * together — a universal zoom for the whole app's layout (buttons, spacing,
 * and text on every page), not just the Bible reader's own text size.
 *
 * Combines two independent sources, multiplied together:
 *  1. Desktop browser zoom (Ctrl+/-), detected via devicePixelRatio drift
 *     from a captured baseline (works for any OS/display scale factor).
 *  2. The manual "App Zoom" setting (Settings page), stored under
 *     'kjb-layout-zoom' (default 100) — works on EVERY device, including
 *     mobile, where Ctrl+/- doesn't exist.
 *
 * The CSS variable `--kjb-zoom-scale` is consumed in index.css:
 *   :root { font-size: calc(100% * var(--kjb-zoom-scale, 1)); }
 *
 * IMPORTANT: devicePixelRatio bakes in OS/display scaling as well as browser
 * zoom — there's no way to read one without the other. Capturing whatever dpr
 * is in effect at first load as the baseline (already reflecting the OS scale
 * factor) and only reacting to dpr changing FROM that baseline is what real
 * Ctrl+/Ctrl- zooming does, without needing to guess the OS scale factor.
 */
const BASELINE_DPR = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
const isMobileDevice = typeof navigator !== 'undefined' && /iphone|ipad|ipod|android/i.test(navigator.userAgent);

function getManualZoomFactor() {
  try {
    const v = parseInt(localStorage.getItem('kjb-layout-zoom') || '100', 10);
    return (v >= 50 && v <= 200) ? v / 100 : 1;
  } catch {
    return 1;
  }
}

export function useBrowserZoom() {
  useEffect(() => {
    const apply = () => {
      // Desktop-only automatic browser-zoom detection (mobile pinch-zoom is
      // left untouched — visualViewport.scale on mobile reflects pinch, not
      // page zoom, and scaling the root font there would double-scale
      // already-zoomed content).
      let autoFactor = 1;
      if (!isMobileDevice) {
        const dpr = window.devicePixelRatio || 1;
        const zoom = dpr / BASELINE_DPR;
        // Invert: zoom OUT (zoom < 1) grows the layout, zoom IN (zoom > 1) shrinks it.
        autoFactor = 1 / zoom;
      }
      const manualFactor = getManualZoomFactor();
      // The boot-time inline script (index.html) sets html.style.fontSize
      // directly on first paint to avoid a flash. That inline style has
      // higher priority than the stylesheet's `:root { font-size: calc(...) }`
      // rule and never gets cleared — so once set, later zoom changes (which
      // only update the CSS variable below) were silently blocked from ever
      // visually applying. Clearing it here hands control back to the
      // stylesheet rule for the rest of the session.
      document.documentElement.style.removeProperty('font-size');
      document.documentElement.style.setProperty('--kjb-zoom-scale', String(autoFactor * manualFactor));
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('storage', apply);
    window.addEventListener('kjb-layout-zoom-changed', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('storage', apply);
      window.removeEventListener('kjb-layout-zoom-changed', apply);
      document.documentElement.style.removeProperty('--kjb-zoom-scale');
    };
  }, []);
}