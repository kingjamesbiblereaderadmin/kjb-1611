// Shared formatters for copying / sharing verses across the whole app.
// One consistent, clean format used by the daily verse, single-verse copy/share,
// and multi-verse selection copy/share.
import { getPublicOrigin } from '@/lib/publicOrigin';

// Build a shareable deep-link URL to a specific verse/chapter in the app.
export function buildVerseUrl({ abbr, chapter, verse, verseEnd, from } = {}) {
  if (!abbr || !chapter) return '';
  const base = getPublicOrigin();
  let url = `${base}/read?book=${abbr}&chapter=${chapter}`;
  if (verse) url += `&verse=${verse}`;
  if (verseEnd && verseEnd > verse) url += `&verseEnd=${verseEnd}`;
  if (from) url += `&from=${from}`;
  // Carry the sharer's accessibility font mode so the recipient opens in it too.
  try {
    const a11y = localStorage.getItem('kjb-a11y-font');
    if (a11y === 'dyslexic' || a11y === 'hyperlegible') url += `&font=${a11y}`;
  } catch {}
  return url;
}

// Clean raw KJB verse text for sharing: KEEP pilcrows (¶), superscription
// markers (<<...>>), and [italic] brackets intact (they mark supplied words);
// only collapse whitespace so the shared text matches what's on screen.
export function cleanVerseText(text = '') {
  return String(text)
    // In the source text every apostrophe AND pilcrow is stored as the broken
    // replacement char (�/\uFFFD); they're told apart purely by position:
    //  • Immediately AFTER a letter → a corrupted apostrophe. This covers both
    //    "David�s" → "David's" and trailing possessives "sons� wives" → "sons' wives".
    //  • Otherwise (verse start / after a space or punctuation) → a pilcrow ¶.
    .replace(/(\p{L})\uFFFD/gu, "$1'")
    // Any remaining broken replacement char is a paragraph mark (¶).
    .replace(/\uFFFD/g, '¶')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ensure a colophon/subscript line starts with a pilcrow (¶) so the copied text
// matches what's shown on screen (which renders both with a leading pilcrow).
function withPilcrow(text = '') {
  const clean = cleanVerseText(text).replace(/^[\u00B6\uFFFD]\s*/, '');
  return `¶ ${clean}`;
}

// The canonical share/copy format used everywhere — a clean, professional layout:
//
//   “<subscript>
//
//   <text> - <Reference> (KJB)
//
//   <colophon>”
//
//   Read more: <link>
//
// Optional title (e.g. "Verse of the Day") sits on its own line at the very top.
// Subscript/heading and colophon are folded INSIDE the same quotation marks as
// the verse text (not separate lines outside the quote) — a Psalm subscript,
// Psalm 119 stanza heading (ALEPH, BETH, ...), and epistle colophon are all
// part of what's being quoted, so the quote should read as one continuous
// passage. Each pilcrow (¶) still starts a fresh paragraph with a blank-line
// gap above it (matching read mode).
function breakParagraphsAtPilcrow(text = '') {
  return String(text)
    .replace(/\s*¶\s*/g, '\n\n¶ ')
    .replace(/^\n+\s*/, '')
    .trim();
}

export function formatVerseShare({ text, ref, url, title, subscript, heading, colophon } = {}) {
  const clean = breakParagraphsAtPilcrow(cleanVerseText(text));
  const parts = [];
  if (title) parts.push(title);
  const quoteInner = [];
  // Psalm 119 stanza heading (ALEPH, BETH, ...) — shown plain, no pilcrow,
  // matching how it's rendered on screen (VerseText's stanzaHeading).
  if (heading) quoteInner.push(cleanVerseText(heading));
  // Chapter subscript (Psalm title) — shown with a pilcrow, matching how
  // it's rendered on screen (SubscriptContent).
  if (subscript) quoteInner.push(withPilcrow(subscript));
  quoteInner.push(clean);
  if (colophon) quoteInner.push(withPilcrow(colophon));
  parts.push(`“${quoteInner.join('\n\n')}” - ${ref} (KJB)`);
  if (url) parts.push(`Read more: <${url}>`);
  return parts.join('\n\n');
}

// Pad a short line with leading spaces so it appears roughly centered when
// pasted into a monospace-ish context (notes apps, messaging). Plain text has
// no real alignment, so this is an approximation based on a typical line width.
export function centerLine(text, width = 40) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

export function formatDailyVerseForCopy(verse) {
  const dateTitle = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  return formatVerseShare({
    text: verse.text,
    ref: verse.ref,
    url: buildVerseUrl({ ...verse, from: 'daily' }),
    title: `${dateTitle} · Verse of the Day`,
  });
}