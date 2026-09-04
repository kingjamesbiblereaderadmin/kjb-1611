// Local-only reading progress — no cloud sync (accounts removed).

const PROGRESS_KEY = 'kjb-reading-progress';

export function getReadingProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getLatestProgress() {
  const all = getReadingProgress();
  return all.length > 0 ? all[0] : null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordReadingProgress(abbr, chapter, bookName) {
  if (!abbr || !chapter || chapter === 0) return;
  const book = bookName || abbr;
  const date = todayStr();
  const key = `${date}:${book}:${chapter}`;

  const local = getReadingProgress();
  const exists = local.some(p => `${p.date}:${p.book}:${p.chapter}` === key);
  if (!exists) {
    local.unshift({ date, book, chapter, completed: false });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));
  }
}