import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { isBibleCached, checkForUpdates, downloadBibleForOffline } from '@/lib/bibleCache';
import { useNavigate } from 'react-router-dom';

export default function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bibleReady, setBibleReady] = useState(null); // null = checking
  const [cacheStale, setCacheStale] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const didAutoUpdate = useRef(false);
  const didAutoDownload = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkCache = () => {
      isBibleCached().then(async (cached) => {
        setBibleReady(cached);
        if (cached) {
          const stale = navigator.onLine ? await checkForUpdates() : false;
          setCacheStale(stale);
          // Auto-update immediately when stale and online
          if (stale && navigator.onLine && !didAutoUpdate.current) {
            didAutoUpdate.current = true;
            setUpdating(true);
            downloadBibleForOffline().then(() => {
              setDone(true);
              setCacheStale(false);
              setTimeout(() => setDone(false), 2000);
            }).catch(() => setUpdating(false));
          }
        } else if (navigator.onLine && !didAutoDownload.current) {
          // No cache at all yet (fresh install, or cleared some other way) --
          // silently populate it in the background instead of just leaving the
          // "not downloaded" state for the user to discover later in Settings.
          didAutoDownload.current = true;
          setUpdating(true);
          downloadBibleForOffline().then(() => {
            setBibleReady(true);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }).catch(() => {
            setUpdating(false);
            didAutoDownload.current = false; // allow a retry on the next online/mount event
          });
        }
      });
    };
    checkCache();
    window.addEventListener('kjb-cache-updated', checkCache);
    return () => window.removeEventListener('kjb-cache-updated', checkCache);
  }, [isOnline]);

  const handleUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await downloadBibleForOffline();
      setDone(true);
      setCacheStale(false);
      // Hide banner after 2 seconds
      setTimeout(() => setDone(false), 2000);
    } catch {
      setUpdating(false);
    }
  };

  if (dismissed) return null;

  // Online + Bible ready (stale or not) → no banner needed; auto-update runs silently in background
  if (isOnline && bibleReady && !done) return null;
  // Still checking
  if (bibleReady === null) return null;

  // Done state
  if (done) {
    return null; // Silently finish update
  }

  // Offline + Bible ready
  if (!isOnline && bibleReady) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 mb-4 relative">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <p className="font-sans text-xs font-medium flex-1 pr-6">You're offline — reading from cached Bible data.</p>
        <button onClick={() => setDismissed(true)} className="absolute right-3 p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors">
          <X className="w-4 h-4 opacity-70 hover:opacity-100" />
        </button>
      </div>
    );
  }

  // Online + cache is stale (new version available) — auto-update in place silently
  if (isOnline && bibleReady && cacheStale) {
    return null; // Silently update in background, no banner
  }

  // Offline + no Bible cache = can't read
  if (!isOnline && !bibleReady) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300 mb-4 relative">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <p className="font-sans text-xs font-medium flex-1 pr-6">Offline & Bible not downloaded. Connect to the internet to download it.</p>
        <button onClick={() => setDismissed(true)} className="absolute right-3 p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors">
          <X className="w-4 h-4 opacity-70 hover:opacity-100" />
        </button>
      </div>
    );
  }

  // Online but no Bible cache yet - handled silently in background
  if (isOnline && !bibleReady) {
    return null;
  }

  return null;
}