// Shared home-page update check.
// SILENT background check only: pings the service worker for a newer version
// and refreshes the Bible data cache if needed. Never reloads the page and
// never shows an update splash — a new version installs quietly in the
// background and simply takes effect the NEXT time the app is opened.

export async function checkHomeForUpdates() {
  if (typeof navigator === 'undefined' || !navigator.onLine) return false;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update().catch(() => {});
    } catch {}
  }

  try {
    const { refreshCacheIfDue } = await import('@/lib/bibleCache');
    await refreshCacheIfDue();
  } catch {}

  return false;
}