import { useEffect } from 'react';
import { refreshCacheIfDue } from '@/lib/bibleCache';

export default function AutoUpdateHandler({ children }) {
  useEffect(() => {
    // Bible data cache refresh check — downloads silently in the background.
    refreshCacheIfDue();

    // A new service worker installs and activates itself silently in the
    // background (it calls self.skipWaiting() on install). We deliberately do
    // NOT reload the current tab when that happens — reloading mid-session is
    // what caused the disruptive "checking for updates" wait. The new version
    // simply takes effect the NEXT time the app is opened, with no wait at all.
  }, []);

  return children;
}