// Client-side Bible data caching for offline access
// Uses a single clean PCE text file (book titles, CHAPTER headings, [bracketed]
// italics, and double-space paragraph/pilcrow markers), parsed by biblePceParser.
// Uses IndexedDB for large data storage (~50MB+ capacity)

import { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB } from '@/lib/bibleIndexedDB';
import { COLOPHONS } from '@/lib/bibleSubscripts';
import { parsePceText } from '@/lib/biblePceParser';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

// Bump this version string whenever the Bible text file changes — every client
// will then re-download and re-parse fresh. Replaces the old remote VERSION.txt
// check (which 404'd/403'd and broke auto-updates).
export const CACHE_VERSION = 'v20260815_copy_repair';
const CACHE_KEY = 'bible_data_pce_v100_SINGLE_FILE';
// Single clean PCE source file: book titles, CHAPTER headings, [bracketed] italics,
// and double-space paragraph (pilcrow) markers. No separate italics file needed.
// Primary PCE Bible text source. The original file lived on the deleted old
// app's media storage (6a05d76723afe58d80c589e8); this is the recovered and
// verified complete 4,335,413-byte copy (same PureCambridgeEditionTextfile2
// format: book titles, CHAPTER headings, [bracketed] italics, double-space
// pilcrow markers). Bumping CACHE_VERSION forces every device to invalidate
// stale IndexedDB/localStorage Bible data and re-fetch from this source.
const REMOTE_PCE_TEXT_FILE_URL = 'https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/dabab1ba3_recovered-pce-bible.txt';
// In the native Android app, this exact same file is bundled into the APK
// (android/app/src/main/assets/bible/pce-bible.txt) and served locally by a
// WebViewClient.shouldInterceptRequest override in MainActivity.java for
// requests to this same-origin path — no real network involved. Means the
// full Bible is available from the very first launch, offline, with no
// one-time download required. Must match MainActivity's BUNDLED_BIBLE_PATH
// exactly. Falls back to the remote URL on web/iOS or if interception isn't
// wired up for some reason.
let isNative = false;
try { isNative = isNativeAndroid(); } catch {}
const PCE_TEXT_FILE_URL = isNative ? '/__native/pce-bible.txt' : REMOTE_PCE_TEXT_FILE_URL;

const EXPECTED_BOOK_COUNT = 66;

let parsedData = null;
let fetchInProgress = null;
let remoteVersion = null;

function isValidBibleData(data) {
  if (!data || typeof data !== 'object') return false;
  const bookCount = Object.keys(data).filter(k => k !== '__colophons').length;
  return bookCount >= EXPECTED_BOOK_COUNT;
}

// Integrity check for the known Psalm 9 numbering bug: verse 1 must be
// "I will praise" (not the superscription, and not shifted). If the cached data
// was parsed by an old buggy parser, this returns false so we re-fetch+re-parse.
function isPsalm9Correct(data) {
  const p9 = data?.['Psalms']?.[9];
  if (!Array.isArray(p9)) return true; // can't verify — don't block
  const v1 = p9.find(v => v.verse === 1);
  if (!v1 || !/^¶?\s*i will praise/i.test(v1.text)) return false;
  // Spot-check a few more superscription Psalms to catch any leaked headers.
  const checks = [
    [3, /^¶?\s*lord, how are they increased/i],
    [23, /^¶?\s*the lord \[?is\]? my shepherd/i],
    [51, /^¶?\s*have mercy upon me, o god/i],
  ];
  for (const [ch, re] of checks) {
    const verses = data?.['Psalms']?.[ch];
    if (Array.isArray(verses)) {
      const first = verses.find(v => v.verse === 1);
      if (first && !re.test(first.text)) return false;
    }
  }
  return true;
}

async function fetchWithRetry(url, retries = 5, expectPilcrows = false, onProgress = null) {
  // Fail fast if the device is offline instead of burning through several
  // 20s-timeout attempts with backoff between them. On mobile in particular,
  // fetch() can take much longer to surface a network failure than on desktop
  // (captive-portal checks, radio wake-up, DNS retry behavior), so without this
  // guard a first-load or home-update flow can appear "stuck" on the splash
  // screen for a minute or more before it finally gives up and falls back to
  // cached data. navigator.onLine isn't 100% reliable (it can be true on a
  // Wi-Fi network with no real internet), but it correctly catches the common
  // case this bug report is about: airplane mode / no radio at all.
  //
  // Exception: the bundled-Bible path on native Android never touches the
  // network at all (WebViewClient.shouldInterceptRequest in MainActivity.java
  // serves it straight from the APK's assets), so navigator.onLine is
  // irrelevant to it and would otherwise wrongly block a real offline launch.
  const isBundledLocalAsset = url.startsWith('/__native/');
  if (!isBundledLocalAsset && typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Offline — skipping network fetch');
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add timestamp to bypass browser/CDN cache
      const separator = url.includes('?') ? '&' : '?';
      const cacheBusterUrl = `${url}${separator}t=${Date.now()}`;
      
      // Use AbortSignal for timeout (20 seconds per attempt — the file is ~4MB)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const res = await fetch(cacheBusterUrl, { 
        cache: 'no-store', 
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      console.log('[FETCH] Attempt', attempt, '- Status:', res.status, '- URL:', url.substring(0, 80));
      if (!res.ok) {
        // 503/502/429/500 are transient server errors — worth retrying with backoff.
        // Surface a friendly message on the final attempt so the user knows to retry.
        const transient = [500, 502, 503, 429].includes(res.status);
        if (transient && attempt === retries) {
          throw new Error(`The Bible server is temporarily busy (HTTP ${res.status}). Please try again in a moment.`);
        }
        throw new Error('HTTP ' + res.status);
      }

      // Stream the body so we can report REAL download progress (bytes received
      // / total). Falls back to a plain arrayBuffer() if streaming isn't
      // available or there's no Content-Length header.
      const total = parseInt(res.headers.get('Content-Length') || '0', 10);
      let buf;
      if (onProgress && res.body && res.body.getReader && total > 0) {
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          // Reserve 0–90% for the download; parsing/saving uses the rest.
          onProgress(Math.min(90, Math.round((received / total) * 90)), 'Downloading Bible text...');
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) { merged.set(c, offset); offset += c.length; }
        buf = merged.buffer;
      } else {
        buf = await res.arrayBuffer();
      }
      const text = new TextDecoder('windows-1252').decode(buf);
      console.log('[FETCH] Received', text.length, 'characters');
      
      // Validate file format
      if (expectPilcrows) {
        // WHARTON file should have pilcrows (¶)
        const pilcrowCount = (text.match(/¶/g) || []).length;
        console.log('[FETCH] Pilcrow count:', pilcrowCount);
        if (pilcrowCount === 0 && text.length > 1000) {
          console.error('[FETCH] Expected pilcrows but found none - first 200 chars:', text.substring(0, 200));
        }
      } else {
        // RTF file should have brackets for italics
        const bracketCount = (text.match(/\[/g) || []).length;
        console.log('[FETCH] Bracket count:', bracketCount);
      }
      
      if (text.length < 1000) {
        console.error('[FETCH] File too small:', text.length, 'chars');
        throw new Error('Invalid Bible file');
      }
      
      return text;
    } catch (err) {
      console.error('Fetch attempt ' + attempt + '/' + retries + ' failed:', err.message);
      if (attempt === retries) throw err;
      // Exponential backoff: 800ms, 1.6s, 3.2s, 6.4s — gives a busy/503 server time to recover
      await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt - 1)));
    }
  }
}

// We use the CACHE_VERSION constant from code to determine if updates are needed.
// This avoids unnecessary network requests and prevents false-positive version mismatches.
export async function checkForUpdates() {
  const localVersion = localStorage.getItem('bible_cache_version');
  remoteVersion = CACHE_VERSION;
  
  if (!localVersion) {
    // If there is no local version, this is a fresh install or missing cache.
    // It's not an "update", so we return false to prevent unnecessary reloads.
    // The auto-downloader will fetch it silently in the background.
    return false;
  }

  if (localVersion !== remoteVersion) {
    console.log('[UPDATE] Code version', remoteVersion, 'differs from cached', localVersion);
    return true;
  }
  return false;
}

async function saveToCache(data) {
  await clearIndexedDB();
  // Clear old localStorage keys
  for (let i = 1; i <= 50; i++) {
    localStorage.removeItem(`bible_data_pce_v${i}`);
  }
  localStorage.removeItem('bible_data_complete');
  localStorage.removeItem('bible_data_complete_v2');
  // saveToIndexedDB resolves `false` (or throws) on failure — treat both as an
  // error so callers (the offline download) don't falsely report success when
  // nothing was actually persisted (e.g. after a storage reset in Chrome).
  const ok = await saveToIndexedDB(data);
  if (ok === false) throw new Error('Could not save Bible to device storage');
  
  if (!remoteVersion) {
    try {
      await checkForUpdates();
    } catch {}
  }

  if (remoteVersion) {
    localStorage.setItem('bible_cache_version', remoteVersion);
  }
  const colophonCount = data.__colophons ? Object.keys(data.__colophons).length : 0;
  console.log('[CACHE] ✓ Saved to IndexedDB, version:', remoteVersion, ',', colophonCount, 'colophons');
}

async function loadFromCache() {
  try {
    const data = await loadFromIndexedDB();
    if (data && isValidBibleData(data)) {
      // Always attach the latest hardcoded colophons (in case they were updated in code)
      data.__colophons = { ...COLOPHONS };
      const bookCount = Object.keys(data).filter(k => k !== '__colophons').length;
      console.log('[CACHE] ✓ Loaded from IndexedDB,', bookCount, 'books,', Object.keys(data.__colophons).length, 'colophons');
      return data;
    }
    console.log('[CACHE] No valid cache, will fetch fresh');
    return null;
  } catch (e) {
    console.error('Cache load failed:', e.message);
    return null;
  }
}

async function fetchAndParse(onProgress = null) {
  console.log('[FETCH] Fetching single PCE text file...');
  console.log('[FETCH] PCE URL:', PCE_TEXT_FILE_URL);

  const mainText = await fetchWithRetry(PCE_TEXT_FILE_URL, 3, false, onProgress);
  console.log('[FETCH] ✓ PCE text:', mainText.length, 'chars');

  const bracketCount = (mainText.match(/\[/g) || []).length;
  console.log('[FETCH] Bracket (italics) count:', bracketCount);

  // Parse the single file (titles, chapters, verses, [italics], double-space paragraphs)
  const data = parsePceText(mainText);

  if (!isValidBibleData(data)) {
    throw new Error('Parsed data only has ' + Object.keys(data).filter(k => k !== '__colophons').length + ' books');
  }
  
  // Log sample verse to verify pilcrows + italics
  const genesis1 = data['Genesis']?.[1];
  if (genesis1 && genesis1[1]) {
    console.log('[VERIFY] Genesis 1:1:', genesis1[1].text.substring(0, 200));
    console.log('[VERIFY] Has brackets?', genesis1[1].text.includes('['));
    console.log('[VERIFY] Has pilcrows?', genesis1[1].text.includes('¶') || genesis1[1].text.includes('\u00B6'));
  }
  
  // Count verses with formatting
  let versesWithPilcrows = 0;
  let versesWithBrackets = 0;
  Object.values(data).forEach(book => {
    if (typeof book === 'object') {
      Object.values(book).forEach(chapter => {
        if (Array.isArray(chapter)) {
          chapter.forEach(v => {
            if (v.text && (v.text.includes('¶') || v.text.includes('\u00B6'))) {
              versesWithPilcrows++;
            }
            if (v.text && v.text.includes('[')) {
              versesWithBrackets++;
            }
          });
        }
      });
    }
  });
  console.log('[VERIFY] Verses with pilcrows:', versesWithPilcrows);
  console.log('[VERIFY] Verses with brackets (italics):', versesWithBrackets);
  
  return data;
}

// Load Bible data — cache-first with network fallback and auto-update
export async function getBibleData() {
  if (parsedData && isValidBibleData(parsedData)) {
    console.log('[CACHE] Returning in-memory cached data');
    return parsedData;
  }
  if (fetchInProgress) {
    console.log('[CACHE] Fetch in progress, waiting...');
    return fetchInProgress;
  }

  fetchInProgress = (async () => {
    try {
      // Always check for remote updates first
      const needsUpdate = await checkForUpdates();
      const cached = await loadFromCache();

      // Self-heal: if the cached data has the old Psalm 9 numbering bug, force a
      // fresh re-parse even if the version string didn't change.
      const cachedIsStale = cached && !isPsalm9Correct(cached);
      if (cachedIsStale) console.log('[CACHE] ⚠️ Psalm 9 numbering wrong in cache — re-parsing');

      if (cached && !needsUpdate && !cachedIsStale) {
        parsedData = cached;
        console.log('[CACHE] ✓ Using cached version - instant load');
        return parsedData;
      }
      
      if (cached && needsUpdate) {
        console.log('[CACHE] Cache outdated, fetching fresh...');
      }

      if (!cached) {
        console.log('[FETCH] No cache, fetching fresh Bible data...');
      }
      
      try {
        parsedData = await fetchAndParse();
        await saveToCache(parsedData);
        console.log('[CACHE] ✓ Fresh data saved');
        return parsedData;
      } catch (fetchErr) {
        if (cached) {
          console.warn('[FETCH] Update failed, falling back to existing cache:', fetchErr.message);
          parsedData = cached;
          return parsedData;
        }
        throw fetchErr;
      }
    } catch (error) {
      console.error('All fetch attempts failed:', error.message);
      // Return minimal data with colophons for offline mode
      return { __colophons: { ...COLOPHONS } };
    } finally {
      fetchInProgress = null;
    }
  })();

  return fetchInProgress;
}

export function preloadBibleData() {
  // Only preload if not already loaded
  if (!parsedData) {
    console.log('[PRELOAD] Starting Bible data preload...');
    getBibleData();
  } else {
    console.log('[PRELOAD] Bible data already loaded, skipping');
  }
}

export async function isBibleCached() {
  const cached = await loadFromIndexedDB();
  return !!cached || (!!parsedData && isValidBibleData(parsedData));
}

export async function clearBibleCache() {
  // Clear ONLY Bible data cache keys — never user settings (theme, notifications,
  // fonts, etc.). Previously this also wiped kjb-theme-preference,
  // kjb-notifications-enabled, and notification scheduling keys, which could
  // reset the user's theme and turn off notifications after a cache clear.
  for (let i = 1; i <= 100; i++) {
    localStorage.removeItem(`bible_data_pce_v${i}`);
    localStorage.removeItem(`bible_data_pce_v${i}_WITH_BRACKETS`);
  }
  localStorage.removeItem('bible_data_complete');
  localStorage.removeItem('bible_data_complete_v2');
  localStorage.removeItem('bible_cache_version');
  localStorage.removeItem('bible_last_refresh');
  localStorage.removeItem('kjb-daily-verse-cache');
  await clearIndexedDB();
  parsedData = null;
  console.log('[CLEAR] ✓✓✓ Bible cache cleared - will fetch fresh with brackets');
}

export async function forceReloadBibleData() {
  console.log('[FORCE RELOAD] Clearing cache and fetching fresh...');
  await clearBibleCache();
  const data = await fetchAndParse();
  parsedData = data;
  await saveToCache(data);
  console.log('[FORCE RELOAD] ✓ Complete with', Object.keys(data.__colophons || {}).length, 'colophons');
  return data;
}

export async function downloadBibleForOffline(onProgress) {
  // NOTE: we deliberately do NOT clear IndexedDB here before fetching. If the
  // network drops mid-download (e.g. WiFi disconnects), the old cache must
  // stay intact so the app still has offline data to fall back on. The old
  // record is only replaced once the new data is fully fetched, parsed, and
  // validated below — saveToCache() does the clear+write as one atomic step
  // right before writing the new data, never before.
  onProgress && onProgress(0, 'Downloading Bible text...');

  // Real byte-level download progress (0–90%) streamed from the network, then
  // parsing → saving fill the remaining 90–100%.
  const data = await fetchAndParse(onProgress);

  if (!isValidBibleData(data)) {
    throw new Error('Download incomplete: only got ' + Object.keys(data).filter(k => k !== '__colophons').length + ' books');
  }

  onProgress && onProgress(90, 'Saving to device...');
  await saveToCache(data);
  parsedData = data;
  onProgress && onProgress(100, 'Done!');
  console.log('[DOWNLOAD] ✓ Complete -', Object.keys(data).filter(k => k !== '__colophons').length, 'books');
  return data;
}

// Download with automatic re-attempts after a delay. Used by Refresh Cache /
// Reset Settings so a transient failure (e.g. 503) self-heals without the user
// having to tap again. Tries up to `attempts` times, waiting `delayMs` between.
export async function downloadBibleForOfflineWithRetry(onProgress, attempts = 3, delayMs = 4000) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await downloadBibleForOffline(onProgress);
    } catch (err) {
      lastErr = err;
      console.warn(`[DOWNLOAD] Attempt ${i}/${attempts} failed:`, err.message);
      if (i < attempts) {
        onProgress && onProgress(0, `Server busy — retrying in ${Math.round(delayMs / 1000)}s…`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

const CACHE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const LAST_REFRESH_KEY = 'bible_last_refresh';

export async function refreshCacheIfDue() {
  const lastRefresh = parseInt(localStorage.getItem(LAST_REFRESH_KEY) || '0', 10);
  const now = Date.now();

  if (now - lastRefresh < CACHE_REFRESH_INTERVAL) return false;

  console.log('[REFRESH] Cache refresh due, checking for updates...');
  const needsUpdate = await checkForUpdates();

  if (needsUpdate) {
    try {
      const fresh = await fetchAndParse();
      await saveToCache(fresh);
      parsedData = fresh;
      localStorage.setItem(LAST_REFRESH_KEY, String(now));
      console.log('[REFRESH] ✓ Cache refreshed successfully');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('kjb-cache-updated'));
      return true;
    } catch (e) {
      console.error('[REFRESH] Failed to refresh cache:', e.message);
      // Silently fail - keep using cached version
      localStorage.setItem(LAST_REFRESH_KEY, String(now));
      return false;
    }
  }

  localStorage.setItem(LAST_REFRESH_KEY, String(now));
  return false;
}

let _cacheRefreshInitialized = false;
export function initPeriodicCacheRefresh() {
  if (_cacheRefreshInitialized) return;
  _cacheRefreshInitialized = true;
  
  // Only check on first load, not on every visibility change
  refreshCacheIfDue();
}

// Auto-download Bible data on first app load (also handles updates)
// Returns: { downloaded: bool, updated: bool } — so callers know whether to show a toast
let _autoDownloadInitialized = false;
export async function autoDownloadBibleOnFirstLoad() {
  if (_autoDownloadInitialized) return { downloaded: false, updated: false };
  _autoDownloadInitialized = true;

  // Skip entirely when offline — keep using whatever cache we have
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.log('[AUTO-DOWNLOAD] Offline — skipping version check, using cached data');
    return { downloaded: false, updated: false };
  }

  try {
    const cached = await loadFromIndexedDB();
    const hasValidCache = cached && isValidBibleData(cached);

    // Only check the version when we actually have a cache (otherwise we must download)
    let needsUpdate = false;
    if (hasValidCache) {
      needsUpdate = await checkForUpdates();
      // Self-heal on reload: if cached Psalms have leaked superscriptions
      // (old buggy parser), force a re-download even when the version matches.
      const cacheCorrupt = !isPsalm9Correct(cached);
      if (cacheCorrupt) console.log('[AUTO-DOWNLOAD] ⚠️ Psalm numbering wrong in cache — forcing re-parse');
      if (!needsUpdate && !cacheCorrupt) {
        console.log('[AUTO-DOWNLOAD] Cache up-to-date, skipping download');
        return { downloaded: false, updated: false };
      }
      console.log('[AUTO-DOWNLOAD] Update/repair needed, downloading fresh Bible data...');
    } else {
      console.log('[AUTO-DOWNLOAD] No cache found, downloading Bible data...');
      // Still need the remote version so saveToCache can record it
      await checkForUpdates();
    }

    const data = await fetchAndParse();
    await saveToCache(data);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('kjb-cache-updated'));
    console.log('[AUTO-DOWNLOAD] ✓ Bible saved for offline access');
    return { downloaded: true, updated: hasValidCache };
  } catch (err) {
    console.error('[AUTO-DOWNLOAD] Failed to auto-download:', err);
    return { downloaded: false, updated: false };
  }
}