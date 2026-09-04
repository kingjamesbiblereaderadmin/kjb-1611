/**
 * Shared browser-side overflow check, used by every layout test file.
 *
 * `checkOverflow` runs inside the page (via page.evaluate), so it must be a
 * self-contained function with no closure references to Node-side code.
 *
 * Two things that look like overflow but aren't, which this accounts for:
 *  - An element clipped by an ancestor's `overflow: hidden`/`clip` never
 *    actually paints past that ancestor's edge, even if its own box
 *    geometry extends further (e.g. an indeterminate loading-bar animation
 *    sliding across a clipped track). If the clipping ancestor itself fits
 *    on screen, the element inside it can't be visually overflowing.
 *  - A zero-size or fully transparent/invisible element with no text and no
 *    background paints nothing, so it can't visually leak regardless of its
 *    box geometry (e.g. an empty, always-mounted notification container).
 */
export function checkOverflow(tolerance) {
  const docWidth = document.documentElement.clientWidth;
  const offenders = [];

  const isClippedWithinBounds = (el) => {
    let node = el.parentElement;
    while (node) {
      const s = getComputedStyle(node);
      if (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.overflow === 'hidden' || s.overflow === 'clip') {
        const nodeRect = node.getBoundingClientRect();
        if (nodeRect.right <= docWidth + tolerance) return true;
      }
      node = node.parentElement;
    }
    return false;
  };

  const isVisuallyEmpty = (el, text) => {
    if (text) return false;
    const s = getComputedStyle(el);
    const hasBg = s.backgroundImage !== 'none' || (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent');
    const hasBorder = parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 0;
    // Elements with a background/border ARE visible, but if they're also
    // clipped by an ancestor (checked separately) that's handled above —
    // this branch only excludes genuinely paint-nothing elements.
    return !hasBg && !hasBorder;
  };

  for (const el of document.querySelectorAll('body *')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right <= docWidth + tolerance) continue;

    const text = (el.textContent || '').trim();
    if (isVisuallyEmpty(el, text)) continue;
    if (isClippedWithinBounds(el)) continue;

    offenders.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 80),
      text: text.slice(0, 60),
      overBy: Math.round((rect.right - docWidth) * 10) / 10,
    });
  }

  const seen = new Set();
  return offenders.filter((o) => {
    const key = `${o.tag}:${o.cls}:${o.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
