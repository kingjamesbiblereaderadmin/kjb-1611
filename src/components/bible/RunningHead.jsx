import React, { useRef, useState, useLayoutEffect } from 'react';

// Renders the two-column split underline with the book name aligned to the
// left split-line edge and "Chapter N" aligned to the right split-line edge.
// Both labels share a single font size that auto-shrinks until BOTH fit on
// one line within their halves. If shrinking alone still can't make them
// fit (very long book names at higher zoom levels), it falls back to
// stacking the book name above the chapter line and lets the book name
// wrap instead of continuing to shrink into illegibility or overlapping.
const MIN_INLINE_SCALE = 0.6;
const MIN_STACKED_SCALE = 0.5;

export default function RunningHead({ bookName, chapter, baseFontRem, isCursive }) {
  const containerRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [stacked, setStacked] = useState(false);

  const chapterText = `Chapter ${chapter}`;

  // Reset to full size / inline layout when inputs change so we re-measure cleanly.
  useLayoutEffect(() => {
    setScale(1);
    setStacked(false);
  }, [bookName, chapter, baseFontRem]);

  // Phase 1: while inline (side-by-side), shrink the shared font size
  // step-by-step until both halves fit on one line WITH room between them.
  // Checking each label only against its own box (shrink-to-fit, so it's
  // nearly always "not overflowing" on its own) let the two labels run
  // together with no gap once their combined width reached the container's
  // — so measure the combined width against the container instead.
  // If we hit the floor scale and it's still overflowing, give up on
  // shrinking further and switch to stacked layout instead.
  useLayoutEffect(() => {
    if (stacked) return;
    const container = containerRef.current;
    const l = leftRef.current;
    const r = rightRef.current;
    if (!container || !l || !r) return;
    const gapPx = parseFloat(getComputedStyle(container).columnGap) || 16;
    const combined = l.scrollWidth + r.scrollWidth + gapPx;
    const overflowing = combined > container.clientWidth + 0.5;
    if (!overflowing) return;
    if (scale > MIN_INLINE_SCALE) {
      setScale((s) => Math.max(MIN_INLINE_SCALE, s - 0.05));
    } else {
      setStacked(true);
      setScale(1);
    }
  }, [scale, stacked, bookName, chapter, baseFontRem]);

  // Phase 2: stacked layout. The book name is now allowed to wrap onto
  // multiple lines, so it no longer needs to shrink to avoid overlap — only
  // shrink a little on very narrow containers where even a single word
  // (or "Chapter N") would otherwise overflow.
  useLayoutEffect(() => {
    if (!stacked) return;
    const container = containerRef.current;
    const l = leftRef.current;
    const r = rightRef.current;
    if (!container || !l || !r) return;
    const overflowing =
      l.scrollWidth > container.clientWidth + 0.5 ||
      r.scrollWidth > container.clientWidth + 0.5;
    if (overflowing && scale > MIN_STACKED_SCALE) {
      setScale((s) => Math.max(MIN_STACKED_SCALE, s - 0.05));
    }
  }, [scale, stacked, bookName, chapter, baseFontRem]);

  const fontSize = `${baseFontRem * scale}rem`;

  return (
    <div className={`kjb-running-head mb-6 print:hidden ${isCursive ? 'cursive-em-style' : 'font-serif'}`}>
      <div
        ref={containerRef}
        data-testid="kjb-running-head"
        data-stacked={stacked ? 'true' : 'false'}
        className={
          stacked
            ? 'flex flex-col items-center text-center gap-1 min-w-0'
            : 'flex justify-between items-baseline gap-4 min-w-0'
        }
      >
        <div className={stacked ? 'min-w-0 max-w-full' : 'min-w-0 max-w-full'}>
          <span
            ref={leftRef}
            data-testid="kjb-running-head-book"
            className={`notranslate inline-block max-w-full font-semibold tracking-wide text-foreground ${
              stacked ? 'whitespace-normal break-words' : 'whitespace-nowrap'
            }`}
            style={{ fontSize, fontStyle: 'normal' }}
          >
            {bookName}
          </span>
        </div>
        <div className="min-w-0 max-w-full">
          <span
            ref={rightRef}
            data-testid="kjb-running-head-chapter"
            className="notranslate kjb-running-chapter inline-block max-w-full whitespace-nowrap font-semibold tracking-wide text-foreground"
            style={{ fontSize, fontStyle: 'normal' }}
          >
            {chapterText}
          </span>
        </div>
      </div>
      <div className="pt-1.5">
        <div className="border-b border-border" />
      </div>
    </div>
  );
}
