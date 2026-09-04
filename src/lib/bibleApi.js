import { getBibleData, isBibleCached } from '@/lib/bibleCache';
import { COLOPHONS, SUBSCRIPTS } from '@/lib/bibleSubscripts';
import { loadOverrides, applyOverrides, getSubscriptOverride, getColophonOverride, getEndMarkerOverride } from '@/lib/bibleTextOverrides';

// Default closing end-marker labels shown after the final chapter of the OT
// (Malachi 4) and the whole Bible (Revelation 22).
export const END_MARKERS = {
  'Malachi:4': 'The End of the Prophets',
  'Revelation:22': 'The End',
};
// Resolve the end marker for a chapter, honouring any admin override.
export function resolveEndMarker(bookApiName, chapter) {
  return getEndMarkerOverride(bookApiName, chapter) ?? END_MARKERS[`${bookApiName}:${chapter}`] ?? null;
}

// Resolve the subscript (Psalm superscription) for a chapter, honouring any
// admin override saved via the editor.
export function resolveSubscript(bookApiName, chapter) {
  return getSubscriptOverride(bookApiName, chapter) ?? SUBSCRIPTS[`${bookApiName}:${chapter}`] ?? null;
}
// Resolve the colophon for a chapter, honouring any admin override.
export function resolveColophon(bookApiName, chapter) {
  return getColophonOverride(bookApiName, chapter) ?? COLOPHONS[`${bookApiName}:${chapter}`] ?? null;
}

// Kick off a one-time background load of the shared verse corrections so
// they're ready in memory by the time a chapter is opened.
loadOverrides();

// The source text stores apostrophes in more than one way depending on the
// data source: a replacement/pilcrow char (\u00B6 or \uFFFD) immediately after
// a letter, e.g. "God\uFFFDs", OR a real curly apostrophe (\u2019), e.g.
// "God\u2019s". Convert all of them to a plain straight apostrophe. Used
// everywhere verse text is rendered OR searched/matched, so typing "God's"
// (straight quote) always matches "God's"/"God\u2019s" in the text.
export function normalizeApostrophes(text = '') {
  // Include ']'/'[' alongside letters — some possessives are split across an
  // italic bracket right at the apostrophe (e.g. "[man]'[s]", "[king]'[s]",
  // "[God]'[s]"), so the char before/after the apostrophe is a bracket, not a
  // letter. Without this, those specific possessives keep their curly quote
  // and never match a plain "man's"/"king's"/"God's" search.
  return String(text)
    .replace(/([A-Za-z\]])[\u00B6\uFFFD\u2019](?=[A-Za-z[])/g, "$1'")
    .replace(/([A-Za-z\]])[\u00B6\uFFFD\u2019](?=[^A-Za-z[]|$)/g, "$1'");
}

// Typed search input can contain a curly apostrophe/quote instead of a plain
// one — mobile keyboards with "smart punctuation" auto-curl a typed ' into '
// (\u2019) as you type. Normalize those to a plain apostrophe so the query
// matches verse text (which normalizeApostrophes above also reduces to plain
// apostrophes) regardless of which form the user's keyboard produced.
export function normalizeQueryApostrophes(text = '') {
  return String(text).replace(/[\u2018\u2019]/g, "'");
}

// The client-side Bible text spells several proper names with the classical
// æ/Æ ligature (e.g. "Judæa", "Cæsar", "Alphæus") — a single character that
// represents two letters. Typing the plain "ae" spelling (e.g. "Caesar",
// "Judea") would never match that character. Used for matching only (never
// on text that gets displayed), so the authentic ligature stays on screen.
export function normalizeLigatures(text = '') {
  return String(text).replace(/æ/g, 'ae').replace(/Æ/g, 'Ae');
}

// Strip trailing end markers and "Made in Australia" from verse text
function stripEndMarker(text) {
  return text
    .replace(/\s*[\u00B6\uFFFD]\s*THE END\.?\s*$/i, '')
    .replace(/\s*[\u00B6\uFFFD]\s*END OF THE PROPHETS\.?\s*$/i, '')
    .replace(/\s*made\s+in\s+australia\.?\s*$/i, '')
    .trim();
}

// Strip "Made in Australia" from any verse text globally
function stripMadeInAustralia(text) {
  return text.replace(/\s*made\s+in\s+australia\.?\s*/gi, '').trim();
}

// Merge adjacent bracketed (italic-supplied) words into a single bracket so
// "[to] [be]" becomes "[to be]" for cleaner formatting. Runs repeatedly to
// collapse runs of 3+ adjacent bracketed words.
export function mergeAdjacentBrackets(text = '') {
  let out = String(text);
  let prev;
  do {
    prev = out;
    out = out.replace(/\]( +)\[/g, '$1');
  } while (out !== prev);
  return out;
}

export async function fetchChapter(bookApiName, chapter) {
  // Get complete Bible data (from cache or network)
  const bible = await getBibleData();
  
  let verses = bible[bookApiName]?.[chapter] || [];
  console.log('[fetchChapter] Got', verses.length, 'verses for', bookApiName, chapter);
  if (verses.length > 0) {
    console.log('[fetchChapter] Sample verse 1:', verses[0]?.text?.substring(0, 150));
    console.log('[fetchChapter] Has brackets?', verses.some(v => v.text.includes('[')));
  }
  if (!verses.length) throw new Error(`No verses found for ${bookApiName} ${chapter}`);

  // Strip "Made in Australia" + merge adjacent [bracketed] words on all verses
  verses = verses.map(v => {
    const cleaned = mergeAdjacentBrackets(stripMadeInAustralia(v.text));
    return cleaned !== v.text ? { ...v, text: cleaned } : v;
  });

  // Strip end markers from the final verse of Malachi 4 and Revelation 22
  const isEndChapter = (bookApiName === 'Malachi' && chapter === 4) || (bookApiName === 'Revelation' && chapter === 22);
  if (isEndChapter && verses.length > 0) {
    const last = verses[verses.length - 1];
    const stripped = stripEndMarker(last.text);
    if (stripped !== last.text) {
      verses = [...verses.slice(0, -1), { ...last, text: stripped }];
    }
  }
  
  // Apply shared, database-backed verse corrections (if any are loaded).
  verses = applyOverrides(bookApiName, chapter, verses);

  // Colophon: admin override (BibleTextOverride verse=-1) falls back to the
  // hardcoded value in bibleSubscripts.js.
  const colophon = resolveColophon(bookApiName, chapter);
  return { verses, colophon };
}

export async function fetchVerseCount(bookApiName, chapter) {
  const bible = await getBibleData();
  return bible[bookApiName]?.[chapter]?.length ?? 0;
}

export async function isBibleAvailableOffline() {
  return await isBibleCached();
}

// Render verse text: turn [word] into <em>word</em> for KJB italics
// Render pilcrow (¶) ONLY at beginning of verses, not inside words
// Optionally highlight search terms with <mark> tags
export function renderVerseText(text, searchTerm = null) {
  // Debug: log verses to check for brackets and pilcrows
  if (text && Math.random() < 0.05) {
    console.log('[RENDER] Sample verse with brackets:', text.substring(0, 200));
    console.log('[RENDER] Has pilcrow (¶)?', text.includes('¶') || text.includes('\u00B6'));
    console.log('[RENDER] Pilcrow count:', (text.match(/¶/g) || []).length);
  }
  // Strip "Made in Australia" if it somehow appears in verse text
  let cleaned = text.replace(/\s*made\s+in\s+australia\.?\s*/gi, '');
  cleaned = mergeAdjacentBrackets(cleaned);
  cleaned = cleaned.replace(/[<>]|>>/g, '');
  // Normalize smart/curly apostrophes and quotes to plain ASCII to fix Edge rendering
  cleaned = cleaned
    .replace(/\u2019/g, "'")   // right single quotation mark → apostrophe
    .replace(/\u2018/g, "'")   // left single quotation mark
    .replace(/\u201C/g, '"')   // left double quote
    .replace(/\u201D/g, '"')   // right double quote
    .replace(/\u2032/g, "'");  // prime
  // In the source text every apostrophe is stored as a pilcrow/replacement char
  // immediately after a letter. Convert ALL such cases to an apostrophe, covering
  // both in-word ("Christ¶s" → "Christ's") and trailing possessives
  // ("sons¶ wives" → "sons' wives"). The remaining (verse-start / post-space)
  // pilcrows are handled below as paragraph marks.
  cleaned = normalizeApostrophes(cleaned);
  // Render pilcrow as a paragraph marker when it appears at the START of the text…
  cleaned = cleaned.replace(/^[\u00B6\uFFFD]\s*/, '<span class="pilcrow">¶</span> ');
  // …or mid-verse when preceded by a space or sentence punctuation (e.g. "houses. ¶But").
  // This prevents the raw ¶ from gluing to the previous word (the "kings¶" → "kingspilcrow" bug).
  cleaned = cleaned.replace(/([\s.,;:!?'")\]])[\u00B6\uFFFD]\s*/g, '$1 <span class="pilcrow">¶</span> ');
  // Turn [bracketed] text into italics
  const parts = cleaned.split(/\[([^\]]+)\]/g);
  let result = parts.map((part, i) =>
    i % 2 === 1 ? `<em>${part}</em>` : part
  ).join('');
  
  // Highlight search terms — split on HTML tags so we only replace inside text nodes.
  // Each match gets a sequential data-occ index so the reader can scroll to a
  // specific occurrence when a verse contains the term more than once.
  if (searchTerm && searchTerm.trim().length > 0) {
    // Multi-keyword search (e.g. "heart, imagination") arrives comma-joined.
    // Highlight EACH keyword. A quoted phrase stays as a single term.
    const raw = searchTerm.trim();
    const isQuoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith('\u201C') && raw.endsWith('\u201D'));
    const inner = isQuoted ? raw.slice(1, -1) : raw;
    const terms = isQuoted
      ? [inner.trim()].filter(Boolean)
      : inner.split(',').map(t => t.trim()).filter(Boolean);
    const list = terms.length ? terms : [inner.trim()].filter(Boolean);
    const escapedTerms = list.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const termRegex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    let occ = 0;
    // Split the HTML string into tag and text segments, only replace in text segments
    result = result.replace(/(<[^>]+>)|([^<]+)/g, (chunk, tag, text) => {
      if (tag) return tag; // keep HTML tags untouched
      return text.replace(termRegex, (m) =>
        `<mark data-occ="${occ++}" style="background-color: rgba(250, 204, 21, 0.55); border-radius: 3px; padding: 0 2px;">${m}</mark>`);
    });
  }

  return result;
}

// Escape HTML special characters to prevent XSS when rendering entity-sourced
// text. Applied after normalization but before the bracket-to-<em> transform,
// so only known-safe tags (<em>, <mark>, <span>) appear in the output.
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

// Highlight search terms inside an already-rendered HTML string, only touching
// text nodes (never inside HTML tags).
function highlightInHtml(html, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return html;
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const termRegex = new RegExp(`(${escaped})`, 'gi');
  return html.replace(/(<[^>]+>)|([^<]+)/g, (chunk, tag, text) => {
    if (tag) return tag;
    return text.replace(termRegex, '<mark style="background-color: rgba(250, 204, 21, 0.55); border-radius: 3px; padding: 0 2px;">$1</mark>');
  });
}

// Render colophon text (epistolary closing notes): pilcrow prefix + [brackets] → italic
export function renderColophonText(text, searchTerm = null) {
  if (!text || typeof text !== 'string') return '';
  let normalized = text
    .replace(/\u2019/g, "'").replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"').replace(/\u201D/g, '"')
    .replace(/^[\u00B6\uFFFD]\s*/, '');
  // Convert replacement-char/pilcrow apostrophes (e.g. "David�s" → "David's")
  normalized = normalizeApostrophes(normalized);
  normalized = mergeAdjacentBrackets(normalized);
  normalized = escapeHtml(normalized);
  const parts = normalized.split(/\[([^\]]+)\]/g);
  const rendered = parts.map((part, i) =>
    i % 2 === 1 ? `<em>${part}</em>` : part
  ).join('');
  return `<span class="pilcrow">¶</span> ${highlightInHtml(rendered, searchTerm)}`;
}

// Render Psalm subscript/superscription text:
// Non-italic by default, [bracketed] words italic, with a pilcrow prefix.
export function renderSubscriptText(text, searchTerm = null) {
  if (!text || typeof text !== 'string') return '';
  let normalized = text
    .replace(/\u2019/g, "'").replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"').replace(/\u201D/g, '"');
  // Convert replacement-char/pilcrow apostrophes to real apostrophes
  normalized = normalizeApostrophes(normalized);
  normalized = mergeAdjacentBrackets(normalized);
  normalized = escapeHtml(normalized);
  const parts = normalized.split(/\[([^\]]+)\]/g);
  const rendered = parts.map((part, i) =>
    i % 2 === 1 ? `<em>${part}</em>` : part
  ).join('');
  return `<span class="pilcrow">¶</span> ${highlightInHtml(rendered, searchTerm)}`;
}