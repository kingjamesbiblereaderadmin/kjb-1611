// Single source of truth for the app's keyboard shortcuts.
// Used by both the shortcuts overlay (Shift+?) and the Settings list.
export const SHORTCUTS = [
  { keys: ['Ctrl', 'F'], macKeys: ['⌘', 'F'], label: 'Focus the search bar' },
  { keys: ['Alt', '←'], macKeys: ['⌥', '←'], label: 'Go back' },
  { keys: ['Alt', 'H'], macKeys: ['⌥', 'H'], label: 'Go to Home' },
  { keys: ['?'], macKeys: ['?'], label: 'Show keyboard shortcuts' },
];

// Shortcuts available only on the search results page (handled by the
// results list, which knows the grouped order of verses + book headers).
export const SEARCH_SHORTCUTS = [
  { keys: ['↑', '↓'], macKeys: ['↑', '↓'], label: 'Navigate verses & book headers' },
  { keys: ['J', 'K'], macKeys: ['J', 'K'], label: 'Navigate verses & book headers' },
  { keys: ['Enter'], macKeys: ['Enter'], label: 'Open a verse · collapse / expand a book' },
];

export const isMac = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);