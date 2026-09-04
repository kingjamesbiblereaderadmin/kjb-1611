import React, { useState, useEffect } from 'react';
import { EyeOff } from 'lucide-react';
import { detectIncognito } from '@/lib/incognito';

// Banner shown only in incognito/private (guest) browsing windows, where
// storage, offline caching, install and notifications are unreliable.
export default function IncognitoWarning() {
  const [isIncognito, setIsIncognito] = useState(false);

  useEffect(() => {
    detectIncognito().then(setIsIncognito);
  }, []);

  if (!isIncognito) return null;

  return (
    <div className="print:hidden flex items-start gap-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mb-6">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
        <EyeOff className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-amber-700 dark:text-amber-400">You're in a private window (Incognito, InPrivate, or Guest)</p>
        <p className="font-sans text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-relaxed">
          Offline downloads, app install and notifications won't work here, and your settings will be erased when you close this window. Open the app in a normal window for the full experience.
        </p>
      </div>
    </div>
  );
}