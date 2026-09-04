import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { downloadBibleForOfflineWithRetry } from '@/lib/bibleCache';

import { checkForUpdates, isBibleCached } from '@/lib/bibleCache';
import { Info } from 'lucide-react';

export default function RefreshCache() {
  const [status, setStatus] = useState('checking'); // checking, updating, success, no_update
  const [progress, setProgress] = useState(0);

  const handleRefresh = async () => {
    try {
      // Checking for updates and clearing caches both need network -- if
      // we're offline, doing either is actively harmful: caches.keys()
      // below deletes EVERY cache for this origin indiscriminately, which
      // includes the service worker's own app-shell precache (the thing
      // that makes offline self-healing possible at all -- see
      // MainActivity.java's comments on this). Wiping that while offline,
      // then trying to reload the real site, meant the reload had neither a
      // live connection NOR a cache to fall back on -- forcing the native
      // fallback to the frozen bundled snapshot instead of the site's own
      // self-updating cache. There's genuinely nothing useful this page can
      // do offline, so skip straight to a plain reload -- the service
      // worker's EXISTING (untouched) cache serves it normally.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        window.location.href = '/';
        return;
      }

      let hasCodeUpdates = false;
      let hasBibleUpdates = false;

      // 1. Check code updates
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update().catch(() => {});
          if (reg.waiting) {
            hasCodeUpdates = true;
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else if (reg.installing) {
            if (reg.installing.state === 'installed' || reg.installing.state === 'activating' || reg.installing.state === 'activated') {
              hasCodeUpdates = true;
              reg.installing.postMessage({ type: 'SKIP_WAITING' });
            } else {
              hasCodeUpdates = await new Promise(resolve => {
                let resolved = false;
                const worker = reg.installing;
                const handler = () => {
                  if (worker.state === 'installed' || worker.state === 'activating' || worker.state === 'activated') {
                    if (!resolved) {
                      resolved = true;
                      worker.postMessage({ type: 'SKIP_WAITING' });
                      resolve(true);
                    }
                  } else if (worker.state === 'redundant') {
                    if (!resolved) {
                      resolved = true;
                      resolve(false);
                    }
                  }
                };
                worker.addEventListener('statechange', handler);
                setTimeout(() => {
                  if (!resolved) {
                    resolved = true;
                    worker.removeEventListener('statechange', handler);
                    resolve(false);
                  }
                }, 6000);
              });
            }
          }
        }
      }

      // 2. Check Bible updates
      hasBibleUpdates = await checkForUpdates();
      const cached = await isBibleCached();
      if (!cached) hasBibleUpdates = true;

      if (!hasCodeUpdates && !hasBibleUpdates) {
        setStatus('no_update');
        setTimeout(() => { window.location.href = '/'; }, 1200);
        return;
      }

      setStatus('updating');

      if (hasBibleUpdates) {
        // Clear caches so the new one can fetch cleanly
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));

        localStorage.removeItem('bible_cache_version');
        localStorage.removeItem('bible_last_refresh');
        localStorage.removeItem('kjb-daily-verse-cache');
        
        await downloadBibleForOfflineWithRetry((pct) => setProgress(pct));
      }

      setStatus('success');
      
      // Indicate to the splash screen that updates were applied
      try {
        sessionStorage.setItem('kjb_sw_updated', hasCodeUpdates && hasBibleUpdates ? 'both' : hasBibleUpdates ? 'bible' : hasCodeUpdates ? 'app' : 'forced_update');
      } catch (e) {}

      // Reload after success
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (err) {
      console.error('Cache refresh failed:', err);
      // Fallback: just reload
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center opacity-100">
      <div className="flex flex-col items-center justify-center -mt-16 w-full max-w-sm px-6">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <img 
            src="https://media.base44.com/images/public/6a05d76723afe58d80c589e8/2279e016e_8e738d108_cfb4bf781_Untitled.png" 
            alt="KJB Reader" 
            className="relative w-32 h-32 object-contain drop-shadow-xl"
          />
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary/70" style={{ animationDuration: '2s' }} />
              <span className="font-sans text-xs text-foreground/70 font-medium tracking-[0.2em] uppercase">Checking for updates...</span>
            </div>
          )}
          {status === 'updating' && (
            <div className="flex flex-col items-center gap-3 w-full text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary/70" style={{ animationDuration: '2s' }} />
              <span className="font-sans text-xs text-foreground/70 font-medium tracking-[0.2em] uppercase">Updating cache...</span>
              {progress > 0 && (
                <div className="w-48 max-w-full bg-secondary rounded-full h-1 mt-1">
                  <div className="bg-primary h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <span className="font-sans text-xs text-foreground/70 font-medium tracking-[0.2em] uppercase">Cache updated...</span>
            </div>
          )}
          {status === 'no_update' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Info className="w-6 h-6 text-blue-500" />
              <span className="font-sans text-xs text-foreground/70 font-medium tracking-[0.2em] uppercase">App is up to date...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}