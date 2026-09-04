import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DefenceWarningBanner() {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="font-sans text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong className="font-semibold">For educational purposes:</strong> These resources are shared for study and reference. I do not necessarily endorse every doctrine or teaching found on the linked sites — please exercise discernment and compare all things with the scripture.
        </p>
      </div>
    </div>
  );
}