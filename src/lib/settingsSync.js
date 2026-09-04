// Cloud settings sync has been removed. The localStorage monkey-patch is kept
// so same-tab writes to preference keys still dispatch 'storage' events for
// immediate UI updates (theme, fonts, zoom, etc.).

const SYNC_KEYS = [
  'kjb-zoom',
  'kjb-reader-font-family',
  'kjb-verse-font-family',
  'kjb-verse-text-color',
  'kjb-verse-text-opacity',
  'kjb-verse-panel-visible',
  'kjb-a11y-font',
  'kjb-theme-mode',
  'kjb-colour',
  'kjb-color-mode',
  'kjb-custom-accent',
  'kjb-footer-mode',
  'kjb-footer-auto-hide-enabled',
  'kjb-footer-hide-time',
  'kjb-notifications-enabled',
  'kjb-notification-time',
  'kjb-theme-1611',
  'kjb-position',
  'kjb-flow',
  'kjb-column',
];

let _patched = false;

function _patchLocalStorage() {
  if (_patched) return;
  _patched = true;
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    if (SYNC_KEYS.includes(key)) {
      window.dispatchEvent(new Event('storage'));
    }
  };
  localStorage.removeItem = function(key) {
    originalRemoveItem(key);
    if (SYNC_KEYS.includes(key)) {
      window.dispatchEvent(new Event('storage'));
    }
  };
}

_patchLocalStorage();

// No-op — cloud sync removed
export async function syncSettingsFromCloud() {}

// No-op — cloud sync removed
export function resetSettingsSync() {}

// Clears all locally-stored preference keys (used by "Reset All Settings")
export function clearLocalSettings() {
  SYNC_KEYS.forEach(key => localStorage.removeItem(key));
}