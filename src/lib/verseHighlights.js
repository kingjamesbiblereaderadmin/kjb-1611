// Persisted verse highlights — local-only, keyed by book/chapter so the
// highlighter feature (toolbar toggle + per-verse popover) stays in sync and
// survives navigation, reload, and app restarts.

const KEY = 'kjb-verse-highlights';

function getAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

function chapterKey(abbr, chapter) {
  return `${abbr}-${chapter}`;
}

function saveAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  window.dispatchEvent(new Event('kjb-highlights-changed'));
}

export function getChapterHighlights(abbr, chapter) {
  return getAll()[chapterKey(abbr, chapter)] || {};
}

export function getVerseHighlight(abbr, chapter, verse) {
  return getChapterHighlights(abbr, chapter)[String(verse)] || null;
}

export function setVerseHighlight(abbr, chapter, verse, color) {
  const all = getAll();
  const key = chapterKey(abbr, chapter);
  all[key] = { ...(all[key] || {}), [String(verse)]: color };
  saveAll(all);
}

export function removeVerseHighlight(abbr, chapter, verse) {
  const all = getAll();
  const key = chapterKey(abbr, chapter);
  if (all[key]) {
    const { [String(verse)]: _, ...rest } = all[key];
    if (Object.keys(rest).length === 0) delete all[key];
    else all[key] = rest;
  }
  saveAll(all);
}