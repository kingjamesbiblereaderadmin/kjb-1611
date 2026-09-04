import React from 'react';

// Catches lazy-chunk load failures (common right after a new deploy when the
// old cached HTML/chunks no longer match the CDN). Instead of the whole app
// going black, we auto-reload ONCE to pull the fresh build. If a reload was
// already attempted this session, we show a gentle recovery screen with a
// manual retry so we never get stuck in a reload loop.
//
// In dev we still catch, but we surface the real error message in the fallback
// so a broken chunk/transform error is diagnosable instead of a black screen.
export default class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }

  // Full clean-slate recovery: unregister the stale service worker AND wipe all
  // caches, so the reload fetches a fresh SW + fresh index.html + fresh chunks.
  // Without unregistering the SW, clearing caches alone loops: the stale SW
  // re-caches the missing chunks on the very next fetch, so the chunk keeps
  // failing and "Updating to the latest version… [Reload]" reappears forever.
  static async hardRecover() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
        await Promise.all((regs || []).map((r) => r.unregister().catch(() => {})));
      }
    } catch {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    window.location.reload();
  }

  componentDidCatch(error) {
    const msg = String(error?.message || error || '');
    const isChunkError =
      /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|dynamically imported module/i.test(msg);

    // Always log so the real cause is visible in the console / preview devtools.
    console.error('[ChunkErrorBoundary] caught:', error);

    if (isChunkError) {
      // If the splash is mid-update, it will reload on its own once the new SW
      // activates — don't race it with a competing hardRecover here.
      if (window._kjbSplashApplyingUpdate) return;
      const alreadyReloaded = sessionStorage.getItem('kjb-chunk-reloaded') === 'true';
      if (!alreadyReloaded && navigator.onLine !== false) {
        try { sessionStorage.setItem('kjb-chunk-reloaded', 'true'); } catch {}
        ChunkErrorBoundary.hardRecover();
      }
    }
  }

  render() {
    if (this.state.failed) {
      const msg = String(this.state.error?.message || this.state.error || '');
      const isChunkError =
        /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|dynamically imported module/i.test(msg);
      // Always show the real error so a broken chunk/transform/runtime error is
      // visible instead of a black screen. Genuine chunk failures auto-reload
      // once (componentDidCatch); other errors just display so they're
      // diagnosable.
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-sans text-sm font-semibold text-destructive">
            {isChunkError ? 'Loading the latest version…' : 'Something went wrong'}
          </p>
          {!isChunkError && (
            <pre className="font-sans text-xs text-muted-foreground max-w-xl whitespace-pre-wrap break-words text-left">
              {msg || 'Unknown error'}
            </pre>
          )}
          <button
            onClick={() => { try { sessionStorage.removeItem('kjb-chunk-reloaded'); } catch {} ChunkErrorBoundary.hardRecover(); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}