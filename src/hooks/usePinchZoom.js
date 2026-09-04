import { useEffect, useRef } from 'react';

/**
 * Pinch-to-zoom for the reading section only.
 *
 * Attaches a two-finger pinch gesture to the given element ref. The pinch
 * adjusts the reading "zoom level" (a percentage, 75–250) — the SAME value the
 * zoom toolbar controls — so only the scripture text resizes, never the toolbar
 * or other UI. While pinching, the browser's native page zoom is suppressed
 * (touch-action: none + preventDefault) so the gesture affects text size only.
 *
 * @param {React.RefObject<HTMLElement>} targetRef  Element to listen on (the reader content)
 * @param {number} zoomLevel                        Current zoom percentage
 * @param {(next:number)=>void} onZoomChange        Called with the new clamped zoom percentage
 */
export function usePinchZoom(targetRef, zoomLevel, onZoomChange) {
  // Keep the latest zoom in a ref so the gesture math always reads the current
  // value without re-binding listeners on every change.
  const zoomRef = useRef(zoomLevel);
  useEffect(() => { zoomRef.current = zoomLevel; }, [zoomLevel]);

  const startDistRef = useRef(0);
  const startZoomRef = useRef(0);
  const pinchingRef = useRef(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const dist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchingRef.current = true;
        startDistRef.current = dist(e.touches);
        startZoomRef.current = zoomRef.current;
      } else {
        // Any non-two-finger touch (i.e. a single-finger scroll) must NOT be a
        // pinch, and must leave touchAction untouched so scrolling works.
        pinchingRef.current = false;
        el.style.touchAction = '';
      }
    };

    const onTouchMove = (e) => {
      // Only ever act on genuine two-finger gestures. A single finger falls
      // straight through so the browser scrolls the page normally.
      if (!pinchingRef.current || e.touches.length !== 2) return;
      // Stop the browser from zooming the whole page during the pinch.
      e.preventDefault();
      const scale = dist(e.touches) / (startDistRef.current || 1);
      const next = Math.round((startZoomRef.current * scale) / 5) * 5;
      const clamped = Math.max(75, Math.min(250, next));
      if (clamped !== zoomRef.current) onZoomChange(clamped);
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinchingRef.current = false;
        // Always clear any inline touch-action so single-finger scrolling is
        // never left disabled after a pinch ends.
        el.style.touchAction = '';
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [targetRef, onZoomChange]);
}