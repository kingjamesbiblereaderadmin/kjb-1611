// Detects whether the app is running in a private/incognito browsing context.
// In incognito, persistent storage and PWA install/notifications are unreliable
// (service workers, storage and push are often blocked or wiped), so the UI
// shows a warning banner.
//
// Modern browsers no longer cap incognito storage as aggressively, so the old
// quota-only heuristic missed many cases. We now combine several signals:
//  1. Storage quota relative to device memory (the most reliable on Chromium).
//  2. Failure to open IndexedDB (Firefox private mode blocks it).
//  3. localStorage being unavailable.
// Resolves to a boolean (defaults to false on any error).
//
// The result is memoized: the first call runs the actual detection and every
// subsequent call (from any component) reuses the same promise. This ensures
// the HomePage banner, Settings, and the FirstLoadPrompt all agree — previously
// each component ran its own async check and could disagree due to per-call
// IndexedDB/quota variance.
let _incognitoPromise = null;
export function detectIncognito() {
  if (!_incognitoPromise) {
    _incognitoPromise = _runDetection();
  }
  return _incognitoPromise;
}

async function _runDetection() {
  if (typeof navigator === 'undefined') return false;

  try {
    // Firefox private mode: IndexedDB is blocked / throws.
    const idbBlocked = await new Promise((resolve) => {
      try {
        if (!window.indexedDB) return resolve(true);
        const req = window.indexedDB.open('kjb-incognito-test');
        req.onsuccess = () => {
          try { req.result.close(); window.indexedDB.deleteDatabase('kjb-incognito-test'); } catch {}
          resolve(false);
        };
        req.onerror = () => resolve(true);
      } catch {
        resolve(true);
      }
    });
    if (idbBlocked) return true;

    // localStorage unavailable (some private modes block writes).
    try {
      const k = '__kjb_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
    } catch {
      return true;
    }

    // Chromium (Chrome/Edge/Brave) Incognito / InPrivate / Guest — PRIMARY.
    // Proven method from the detectIncognito library: in private mode the
    // temporary-storage quota is capped far below a normal window's budget.
    // Compare the reported quota against ~2x the JS heap limit (≈ device size).
    // This catches modern Chromium private modes the storage.estimate()
    // heuristic below can miss.
    if (navigator.webkitTemporaryStorage &&
        typeof navigator.webkitTemporaryStorage.queryUsageAndQuota === 'function') {
      const privateViaQuota = await new Promise((resolve) => {
        try {
          navigator.webkitTemporaryStorage.queryUsageAndQuota(
            (_usage, quota) => {
              const heapLimit = (window.performance && window.performance.memory &&
                window.performance.memory.jsHeapSizeLimit) || 1073741824; // 1 GB
              const quotaMiB = Math.round(quota / (1024 * 1024));
              const limitMiB = Math.round(heapLimit / (1024 * 1024)) * 2;
              resolve(quotaMiB < limitMiB);
            },
            () => resolve(false)
          );
        } catch {
          resolve(false);
        }
      });
      if (privateViaQuota) return true;
    }

    // Chromium (Chrome/Edge/Brave) Incognito / InPrivate / Guest — SECONDARY.
    // Modern, reliable method (used by the detectIncognito library): in private
    // mode the temporary-storage quota is capped near the device-memory-derived
    // ceiling, whereas a normal window's quota is a large fraction of free disk.
    // The library's rule: private when quota < (deviceMemory_or_8 GB) * 1024^3 / 2.
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const { quota } = await navigator.storage.estimate();
        const deviceMemoryGB = navigator.deviceMemory || 8; // Chromium only
        const ceiling = (deviceMemoryGB * 1024 * 1024 * 1024) / 2;
        if (typeof quota === 'number' && quota > 0 && quota < ceiling) {
          return true;
        }
      } catch {}
    }

    // Legacy temporary-filesystem API (older Chromium builds): DISABLED in
    // private mode (error callback), succeeds in normal windows.
    const fs = window.requestFileSystem || window.webkitRequestFileSystem;
    if (fs) {
      const privateViaFS = await new Promise((resolve) => {
        try {
          fs(
            0,    // 0 = TEMPORARY
            100,  // 100 bytes requested
            () => resolve(false), // success → normal window
            () => resolve(true)   // error → private mode
          );
        } catch {
          resolve(true);
        }
      });
      return privateViaFS;
    }
  } catch {
    // ignore — fall through to "not incognito"
  }
  return false;
}