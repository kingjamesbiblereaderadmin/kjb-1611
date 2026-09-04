import { getLiveWorkerVersion } from '@/lib/liveWorkerVersion';

// Detect whether a newer service worker (app code) version has been deployed.
// The SW calls skipWaiting() on install, so a freshly-deployed worker usually
// auto-activates before any page code runs — leaving no waiting/installing
// worker to detect. Instead we fetch sw.js fresh and compare its version
// string ("// KJB Reader Service Worker vXXXX") against the version we last
// marked applied (kjb-applied-sw-version).

export async function fetchDeployedSwVersion() {
  // Prefer the runtime version bumped from DevTools (served by the manifest
  // function) so a version bump reaches clients without a code deploy. Falls
  // back to the version string baked into sw.js.
  try {
    const res = await fetch('/functions/manifest', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.version) return json.version;
    }
  } catch {}
  try {
    const res = await fetch('/sw.js', { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/Service Worker\s+(v?[a-zA-Z0-9_-]+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Force-fetch and activate the deployed service worker, then confirm the
// running worker actually reports the target version. Returns true only when
// the live worker matches `targetVersion` (or already does).
//
// Mobile Chrome throttles background SW update checks to ~24h, so reg.waiting
// can be absent right after a deploy — the new worker was never fetched. Without
// an explicit reg.update() + wait here, posting SKIP_WAITING would be a no-op,
// the old worker would keep running, and the splash would wrongly mark the new
// version "applied" — leaving the device stuck on the old worker forever (the
// next check would see applied == deployed and never re-trigger).
export async function activateDeployedServiceWorker(targetVersion, { installTimeoutMs = 6000, confirmTimeoutMs = 6000 } = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  if (!reg) return false;

  // Already running the target version?
  const liveNow = await getLiveWorkerVersion(2000).catch(() => null);
  if (targetVersion && liveNow === targetVersion) return true;

  // Force a SW update check (bypasses Chrome's throttle). Resolve once a new
  // worker reaches "installed" (waiting), or after the timeout.
  const installPromise = new Promise((resolve) => {
    let settled = false;
    const settle = () => { if (!settled) { settled = true; resolve(); } };
    if (reg.waiting) return settle();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return settle();
      if (w.state === 'installed') return settle();
      const onState = () => {
        if (w.state === 'installed' || w.state === 'redundant') { w.removeEventListener('statechange', onState); settle(); }
      };
      w.addEventListener('statechange', onState);
    });
    setTimeout(settle, installTimeoutMs);
  });
  await Promise.race([
    reg.update().catch(() => {}),
    new Promise(r => setTimeout(r, installTimeoutMs)),
  ]);
  await installPromise;

  // Activate the waiting worker.
  if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

  // Confirm the running worker actually became the target version.
  const start = Date.now();
  while (Date.now() - start < confirmTimeoutMs) {
    await new Promise(r => setTimeout(r, 400));
    const live = await getLiveWorkerVersion(1500).catch(() => null);
    if (targetVersion && live === targetVersion) return true;
  }
  const liveFinal = await getLiveWorkerVersion(2000).catch(() => null);
  return targetVersion ? (liveFinal === targetVersion) : !!liveFinal;
}

// Returns true if the deployed SW version differs from the last applied version.
// Also stashes the deployed version in sessionStorage('kjb-pending-sw-version')
// so the splash flow can mark it applied once it finishes.
export async function isSwUpdateAvailable() {
  const deployedVersion = await fetchDeployedSwVersion();
  if (!deployedVersion) return false;

  const applied = localStorage.getItem('kjb-applied-sw-version');
  try { sessionStorage.setItem('kjb-pending-sw-version', deployedVersion); } catch {}

  if (!applied) {
    // First time we ever see a version — record it so future bumps register.
    try { localStorage.setItem('kjb-applied-sw-version', deployedVersion); } catch {}
    return false;
  }
  return applied !== deployedVersion;
}

// Record the version the running service worker ACTUALLY reports — not the
// deployed/pending version. If the worker really updated, applied advances to
// the new version (and the update prompt stops firing); if it didn't (e.g.
// mobile throttle prevented activation), applied stays on the old version so
// the next visit re-triggers the update instead of falsely claiming done.
// Falls back to the pending version when no worker is controlling yet.
export async function markSwVersionApplied() {
  try {
    const live = await getLiveWorkerVersion(2500).catch(() => null);
    if (live) {
      localStorage.setItem('kjb-applied-sw-version', live);
      sessionStorage.removeItem('kjb-pending-sw-version');
      return;
    }
    const pending = sessionStorage.getItem('kjb-pending-sw-version');
    if (pending) {
      localStorage.setItem('kjb-applied-sw-version', pending);
      sessionStorage.removeItem('kjb-pending-sw-version');
    }
  } catch {}
}