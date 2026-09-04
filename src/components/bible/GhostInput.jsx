import React, { useRef, useState, useLayoutEffect } from 'react';
import { getBookCompletion, getBookAcceptValue, getNumberedBookHint, getNumberedBookVariants, getNumberedSiblings } from '@/lib/bookCompletion';

// A text input that shows a lighter "ghost" completion of the book name the
// user is typing (e.g. typing "Josh" shows "ua" in faded text). Press Tab or →
// (at the end of the input) to accept the completion.
//
// Props mirror a normal <input>; `value`, `onChange`, and `onAccept` are used
// for the ghost behavior. `inputClassName` styles the actual input.
const GhostInput = React.forwardRef(function GhostInput(
  { value, onChange, onAccept, onKeyDown, inputClassName = '', leftPadClass = 'pl-9', ...rest },
  forwardedRef
) {
  const innerRef = useRef(null);
  const setRef = (el) => {
    innerRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };

  // Support comma-separated multi-references: completion always operates on the
  // LAST segment after a comma (e.g. "Romans 3:25, Cor" → completes "Cor").
  // `prefix` is everything before that segment, restored on accept.
  const lastComma = value.lastIndexOf(',');
  const prefix = lastComma >= 0 ? value.slice(0, lastComma + 1) : '';
  const rawSeg = lastComma >= 0 ? value.slice(lastComma + 1) : value;
  const leadWs = rawSeg.match(/^\s*/)[0]; // preserve leading space after comma
  const seg = rawSeg.trim();
  const restore = (full) => `${prefix}${leadWs}${full}`;

  const suffix = getBookCompletion(seg); // normal case: letters to append
  const acceptValue = getBookAcceptValue(seg); // full name on accept (may prepend a number)
  // Numbered prepend case (e.g. "Corinthians" → "1 Corinthians", "Kings" → "1 Kings"):
  // only show this hint when there's a real numbered variant. A plain book like
  // "Romans" must NOT show it.
  const numberedHint = !suffix ? getNumberedBookHint(seg) : null;
  const isPrepend = !!numberedHint;
  // Numbered variants (e.g. ["1 Corinthians", "2 Corinthians"]) for Tab-cycling.
  const variants = isPrepend ? getNumberedBookVariants(seg) : [];
  // Sibling hint when segment is already a complete numbered book — show the OTHER
  // number(s) so the user knows Tab cycles (e.g. "1 Corinthians" → "Tab: 2").
  const siblings = getNumberedSiblings(seg);
  const siblingHint = (() => {
    if (suffix || siblings.length === 0) return '';
    const others = siblings.filter(s => s.toLowerCase() !== seg.toLowerCase());
    return others.length ? ` → Tab: ${others.join(' or ')}` : '';
  })();
  const ghost = suffix || (isPrepend ? ` → Tab: ${numberedHint}` : siblingHint);
  const canAccept = !!acceptValue || variants.length > 0;

  // Hide the ghost hint when it would overflow the input width (e.g. on narrow
  // mobile screens). We measure the rendered ghost layer against the input box.
  const ghostLayerRef = useRef(null);
  const [ghostFits, setGhostFits] = useState(true);
  useLayoutEffect(() => {
    if (!ghost) { setGhostFits(true); return; }
    const measure = () => {
      const layer = ghostLayerRef.current;
      const input = innerRef.current;
      if (!layer || !input) return;
      // scrollWidth includes the full (typed + ghost) content; clientWidth is the
      // visible box. If content is wider, the ghost can't fully fit → hide it.
      setGhostFits(layer.scrollWidth <= layer.clientWidth + 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ghost, value]);

  const accept = () => {
    // Cycle through numbered variants on each Tab. If the current segment is
    // already a variant, advance to the next (wrapping); otherwise pick the first.
    if (variants.length > 0) {
      const idx = variants.findIndex(v => v.toLowerCase() === seg.toLowerCase());
      const next = variants[(idx + 1) % variants.length];
      onAccept?.(restore(next));
      return true;
    }
    if (!acceptValue) return false;
    onAccept?.(restore(acceptValue));
    return true;
  };

  // When the current segment already equals a numbered variant, Tab should still
  // cycle to the next one (e.g. "1 Corinthians" → "2 Corinthians").
  const valueIsVariant = getNumberedSiblings(seg);

  const handleKeyDown = (e) => {
    const el = innerRef.current;
    const atEnd = el && el.selectionStart === value.length && el.selectionEnd === value.length;
    // Cycle numbered variants when value is already a complete variant.
    if (valueIsVariant.length > 0 && (e.key === 'Tab' || (e.key === 'ArrowRight' && atEnd))) {
      e.preventDefault();
      const idx = valueIsVariant.findIndex(v => v.toLowerCase() === seg.toLowerCase());
      onAccept?.(restore(valueIsVariant[(idx + 1) % valueIsVariant.length]));
      return;
    }
    if (canAccept && (e.key === 'Tab' || (e.key === 'ArrowRight' && atEnd))) {
      // Don't hijack Tab when there's no ghost; only accept when one exists.
      if (e.key === 'Tab') e.preventDefault();
      if (e.key === 'ArrowRight') e.preventDefault();
      accept();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative w-full">
      {/* Ghost layer — sits behind the input, shows typed text transparent + completion faded */}
      {ghost && (
        <div
          ref={ghostLayerRef}
          aria-hidden="true"
          className={`absolute inset-0 ${leftPadClass} pr-8 flex items-center pointer-events-none overflow-hidden whitespace-pre ${inputClassName} ${ghostFits ? '' : 'opacity-0'}`}
          style={{ background: 'transparent', borderColor: 'transparent' }}
        >
          <span className="invisible">{value}</span>
          <span className="text-foreground/60 font-bold">{ghost}</span>
        </div>
      )}
      <input
        ref={setRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className={`relative bg-transparent ${inputClassName}`}
        {...rest}
      />
    </div>
  );
});

export default GhostInput;