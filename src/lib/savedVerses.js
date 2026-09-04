// Local-only saved verses — no cloud sync (accounts removed).

const SAVED_KEY = 'kjb-saved-verses';

export function getSavedVerses() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getSavedFolders() {
  try {
    const folders = JSON.parse(localStorage.getItem('kjb-saved-folders') || '["Favorites"]');
    if (!folders.includes('Favorites')) {
      folders.unshift('Favorites');
    }
    return folders;
  } catch {
    return ['Favorites'];
  }
}

export function createFolder(name) {
  const folders = getSavedFolders();
  if (!folders.includes(name)) {
    folders.push(name);
    localStorage.setItem('kjb-saved-folders', JSON.stringify(folders));
  }
}

export function isVerseSaved(abbr, chapter, verse) {
  return getSavedVerses().some(v => v.abbr === abbr && v.chapter === chapter && v.verse === verse);
}

export function saveVerse(entry) {
  const saved = getSavedVerses();
  if (!isVerseSaved(entry.abbr, entry.chapter, entry.verse)) {
    saved.unshift({ ...entry, folder: entry.folder || 'Favorites' });
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }
}

export function updateVerseFolder(abbr, chapter, verse, newFolder) {
  const saved = getSavedVerses().map(v => {
    if (v.abbr === abbr && v.chapter === chapter && v.verse === verse) {
      return { ...v, folder: newFolder };
    }
    return v;
  });
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
}

export function removeSavedVerse(abbr, chapter, verse) {
  const saved = getSavedVerses().filter(v => !(v.abbr === abbr && v.chapter === chapter && v.verse === verse));
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
}

export function deleteFolder(name) {
  if (name === 'Favorites') return;
  const folders = getSavedFolders().filter(f => f !== name);
  localStorage.setItem('kjb-saved-folders', JSON.stringify(folders));

  const saved = getSavedVerses().map(v => {
    if (v.folder === name) {
      return { ...v, folder: 'Favorites' };
    }
    return v;
  });
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
}