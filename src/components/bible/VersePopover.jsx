import React, { useState, useLayoutEffect, useRef } from 'react';

/**
 * Auto-positioning wrapper for the verse action popover.
 * Anchors to the exact tap point (not the verse block, which can be taller
 * than the viewport for long verses) and uses fixed positioning clamped to
 * stay fully inside the visible viewport — never cut off top, bottom, or sides.
 */
export default function VersePopover({ children, point }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ position: 'fixed', top: 0, left: 0, opacity: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reposition = () => {
      const popRect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;

      // The sticky toolbar covers the top of the screen and the footer nav /
      // audio bar covers the bottom — keep the popover clear of both. The
      // toolbar's real height varies (it wraps into multiple rows on narrow
      // screens, plus the select/reading-range bar), so measure it directly
      // instead of assuming a fixed height — a hardcoded value was too short
      // and let the popover render underneath/over the toolbar.
      const toolbarEl = document.querySelector('[data-kjb-reader-toolbar-wrap]');
      const headerH = toolbarEl ? toolbarEl.getBoundingClientRect().bottom : 96;
      const footerH = 96;
      const usableTop = headerH + margin;
      const usableBottom = vh - footerH - margin;

      const anchorX = point?.x ?? vw / 2;
      const anchorY = point?.y ?? vh / 2;

      // The popover can never be taller than the usable viewport area — cap it
      // and let it scroll internally, otherwise a tall popover (many wrapped
      // buttons) anchored near the top/bottom would get pushed off-screen and
      // clipped by the header/footer with no way to reach the hidden part.
      const availableHeight = usableBottom - usableTop;
      const maxHeight = Math.max(120, availableHeight);
      const popHeight = Math.min(popRect.height, maxHeight);

      // Prefer placing below the tap point; flip above if there isn't room.
      const spaceBelow = usableBottom - anchorY;
      const flipUp = spaceBelow < popHeight + margin;

      let top = flipUp ? anchorY - popHeight - margin : anchorY + margin;
      top = Math.max(usableTop, Math.min(top, usableBottom - popHeight));

      const maxWidth = vw - margin * 2;
      const width = Math.min(popRect.width, maxWidth);
      let left = anchorX - width / 2;
      left = Math.max(margin, Math.min(left, vw - margin - width));

      setStyle({ position: 'fixed', top, left, maxWidth, maxHeight, opacity: 1 });
    };

    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [point]);

  return (
    <div
      ref={ref}
      style={style}
      className="z-[120] w-max max-w-[calc(100vw-1rem)] inline-flex flex-wrap items-center justify-start gap-1.5 bg-card border border-border rounded-xl shadow-xl px-2.5 py-2 overflow-y-auto"
    >
      {children}
    </div>
  );
}