import { base44 } from '@/api/base44Client';

// Shared, database-backed corrections to individual verses. Fetched once and
// cached in memory. Applied inside fetchChapter so every reader sees the fix
// without re-generating any Bible data (no credits spent).
//
// Shape in memory: Map keyed by "Book:chapter:verse" -> corrected text.

let _cache = null;      // Map | null
let _loading = null;    // Promise | null

// Persist the last successful fetch so overrides still apply when offline.
const LS_KEY = 'kjb-overrides-cache';

function keyFor(book, chapter, verse) {
  return `${book}:${chapter}:${verse}`;
}

// Save/load the override map to localStorage as a plain [key, text] array.
function persistOverrides(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(map.entries()))); } catch {}
}
function readPersistedOverrides() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? new Map(entries) : null;
  } catch { return null; }
}

// Sentinel "verse" numbers used to store non-verse chapter parts as overrides
// in the same BibleTextOverride entity:
//   0  → the Psalm superscription / subscript line for that chapter
//   -1 → the epistle colophon line for that chapter
export const SUBSCRIPT_VERSE = 0;
export const COLOPHON_VERSE = -1;
//   -2 → the closing end marker ("The End" / "The End of the Prophets")
export const END_MARKER_VERSE = -2;

// Psalm 119 Hebrew-letter stanza headings (ALEPH, BETH, …) are NOT part of a
// verse's text — the parser stores them on verse.heading. To make them
// editable, we store a heading override under a per-verse offset key: the
// verse number plus this offset. e.g. heading for verse 9 → override verse
// number 1009. This keeps them in the same BibleTextOverride entity without
// colliding with real verse numbers (Psalm 119 has 176 verses).
export const HEADING_VERSE_OFFSET = 1000;
export const headingKeyVerse = (verseNum) => HEADING_VERSE_OFFSET + verseNum;

// Read an overridden Psalm 119 heading for a specific verse (null if none).
export function getHeadingOverride(book, chapter, verseNum) {
  if (!_cache) return null;
  return _cache.get(keyFor(book, chapter, headingKeyVerse(verseNum))) ?? null;
}

// Read an overridden subscript/colophon (returns null if none loaded/saved).
export function getSubscriptOverride(book, chapter) {
  if (!_cache) return null;
  return _cache.get(keyFor(book, chapter, SUBSCRIPT_VERSE)) ?? null;
}
export function getColophonOverride(book, chapter) {
  if (!_cache) return null;
  return _cache.get(keyFor(book, chapter, COLOPHON_VERSE)) ?? null;
}
export function getEndMarkerOverride(book, chapter) {
  if (!_cache) return null;
  return _cache.get(keyFor(book, chapter, END_MARKER_VERSE)) ?? null;
}

// Load all overrides from the database (once). Safe to call repeatedly.
export async function loadOverrides(force = false) {
  if (_cache && !force) return _cache;
  if (_loading && !force) return _loading;
  _loading = (async () => {
    try {
      const rows = await base44.entities.BibleTextOverride.list('-updated_date', 1000);
      const map = new Map();
      for (const r of rows) {
        if (r.book && r.chapter && r.verse != null && typeof r.text === 'string') {
          map.set(keyFor(r.book, r.chapter, r.verse), r.text);
        }
      }
      _cache = map;
      persistOverrides(map);
      return map;
    } catch (err) {
      // Offline / network failure: fall back to the last-fetched overrides
      // persisted in localStorage so corrections still apply offline.
      console.warn('[overrides] load failed, using persisted cache:', err?.message);
      _cache = readPersistedOverrides() || new Map();
      return _cache;
    } finally {
      _loading = null;
    }
  })();
  return _loading;
}

// Synchronously read the already-loaded cache (returns null if not loaded yet).
export function getOverrideSync(book, chapter, verse) {
  if (!_cache) return null;
  return _cache.get(keyFor(book, chapter, verse)) ?? null;
}

// Apply cached overrides to an array of {verse, text} for a given book/chapter.
// Returns a new array only if something changed.
export function applyOverrides(book, chapter, verses) {
  if (!_cache || !_cache.size || !Array.isArray(verses)) return verses;
  let changed = false;
  const out = verses.map(v => {
    let next = v;
    const ov = _cache.get(keyFor(book, chapter, v.verse));
    if (ov != null && ov !== v.text) {
      changed = true;
      next = { ...next, text: ov };
    }
    // Psalm 119 heading override for this verse (may add or change a heading).
    const hov = _cache.get(keyFor(book, chapter, headingKeyVerse(v.verse)));
    if (hov != null && hov !== (v.heading || '')) {
      changed = true;
      // An empty string clears the heading; otherwise set/replace it.
      next = { ...next, heading: hov.trim() ? hov.trim().toUpperCase() : undefined };
    }
    return next;
  });
  return changed ? out : verses;
}

// Clear the in-memory cache (call after saving/deleting so readers pick up changes).
export function invalidateOverrides() {
  _cache = null;
  _loading = null;
}