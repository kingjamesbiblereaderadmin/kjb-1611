// App-wide accessibility font preference.
// Applies a font override to the entire app via a data attribute on <html>.
// Options: 'default' | 'dyslexic' | 'hyperlegible'

const STORAGE_KEY = 'kjb-a11y-font';
const READER_FONT_KEY = 'kjb-reader-font-family';

// Apply the chosen reading font (serif/sans-serif/monospace/cursive) to the
// reader content via a data attribute on <html>. CSS in index.css turns this
// into an actual font-family. Keeping it on <html> guarantees every reading
// mode (line/paragraph/column) picks it up consistently.
export function applyReaderFont(font) {
  const root = document.documentElement;
  const valid = ['serif', 'sans-serif', 'monospace', 'cursive', 'comic-sans'];
  root.setAttribute('data-reader-font', valid.includes(font) ? font : 'serif');
}

export function getAccessibilityFont() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return ['dyslexic', 'hyperlegible', 'system'].includes(v) ? v : 'default';
  } catch {
    return 'default';
  }
}

export function applyAccessibilityFont(font) {
  const root = document.documentElement;
  if (font === 'dyslexic' || font === 'hyperlegible' || font === 'system') {
    root.setAttribute('data-a11y-font', font);
  } else {
    root.removeAttribute('data-a11y-font');
  }
}

export function setAccessibilityFont(font) {
  try {
    if (font === 'default') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, font);
      // Accessibility fonts and reader fonts are mutually exclusive. If the
      // reader is in 'cursive' (which is excluded from the a11y CSS override and
      // would keep rendering Dancing Script), reset it to serif so the chosen
      // accessibility font actually takes effect everywhere.
      if (localStorage.getItem('kjb-reader-font-family') === 'cursive') {
        localStorage.setItem('kjb-reader-font-family', 'serif');
      }
    }
  } catch {}
  applyAccessibilityFont(font);
  // Notify same-tab listeners (daily card, reader indicator/popover, settings).
  // A localStorage write in the same tab does NOT fire a 'storage' event, so we
  // dispatch one manually to keep every component's font state in sync.
  try { window.dispatchEvent(new Event('storage')); } catch {}
  // Also fire a dedicated event so listeners can sync reliably regardless of
  // whether they're mounted on the same route.
  try { window.dispatchEvent(new Event('kjb-fonts-changed')); } catch {}
}