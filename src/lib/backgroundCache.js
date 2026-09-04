import { base44 } from '@/api/base44Client';

// Proactively caches every small, live/admin-editable dataset in the app in
// the background on launch, REGARDLESS of whether the user has ever visited
// the specific page that dataset belongs to. Without this, each page's own
// cache only ever got written the moment someone actually opened it while
// online -- so a user who used the rest of the app normally online, but
// never happened to open THAT particular page, would still see an empty/
// stale state the moment they went offline, even after a perfectly good
// connection the whole session. This mirrors the same background-caching
// pattern bibleCache.js already uses for the Bible text itself, applied to
// these smaller, page-specific datasets.

// Same shape-normalizer as KjbDefencePage.jsx's own toArray() -- kept as a
// separate small copy here rather than a shared import so this lightweight
// background module doesn't pull in anything page-specific.
function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === 'object') {
    if (Array.isArray(x.items)) return x.items;
    if (Array.isArray(x.data)) return x.data;
    if (Array.isArray(x.results)) return x.results;
    if (Array.isArray(x.entities)) return x.entities;
  }
  return [];
}

const PREFETCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours, matching bibleCache.js's own refresh cadence

const DEFENCE_CACHE_KEY = 'kjb-defence-cache';
const DEFENCE_LAST_PREFETCH_KEY = 'kjb-defence-prefetch-time';

export async function prefetchDefenceResources(force = false) {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!force) {
      const last = parseInt(localStorage.getItem(DEFENCE_LAST_PREFETCH_KEY) || '0', 10);
      if (Date.now() - last < PREFETCH_INTERVAL_MS) return;
    }
    const list = await base44.entities.DefenceResource.list('-updated_date', 500);
    const safeList = toArray(list);
    if (safeList.length > 0) {
      localStorage.setItem(DEFENCE_CACHE_KEY, JSON.stringify(safeList));
      localStorage.setItem(DEFENCE_LAST_PREFETCH_KEY, String(Date.now()));
    }
  } catch (err) {
    // Silent -- this is a background best-effort cache warm, not a
    // user-facing action. KjbDefencePage.jsx's own load() still handles
    // showing errors/fallbacks when the page is actually visited and a
    // live fetch fails.
    console.warn('[backgroundCache] Defence resources prefetch failed:', err?.message);
  }
}

const EXT_CACHE_KEY = 'kjb-extension-config-cache';
const EXT_LAST_PREFETCH_KEY = 'kjb-extension-config-prefetch-time';

// The browser-extension page's admin-editable config (version number,
// download links, hero icon, mockup screenshots).
export async function prefetchExtensionConfig(force = false) {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!force) {
      const last = parseInt(localStorage.getItem(EXT_LAST_PREFETCH_KEY) || '0', 10);
      if (Date.now() - last < PREFETCH_INTERVAL_MS) return;
    }
    const rows = await base44.entities.ExtensionConfig.list('-updated_date', 1);
    const cfg = rows && rows[0];
    if (cfg) {
      localStorage.setItem(EXT_CACHE_KEY, JSON.stringify(cfg));
      localStorage.setItem(EXT_LAST_PREFETCH_KEY, String(Date.now()));
    }
  } catch (err) {
    console.warn('[backgroundCache] Extension config prefetch failed:', err?.message);
  }
}

// Runs every prefetch above -- call once from a top-level, always-mounted
// component (AppLayout.jsx) so it fires regardless of which page the app
// actually opens to.
export function prefetchAllBackgroundCaches() {
  prefetchDefenceResources().catch(() => {});
  prefetchExtensionConfig().catch(() => {});
}
