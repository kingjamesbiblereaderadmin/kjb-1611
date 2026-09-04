import React from 'react';
import { Download, X } from 'lucide-react';

export default function InstallBanner({ onInstall, onDismiss }) {
  return (
    <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-50 px-4 pb-3 pointer-events-none">
      <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3 pointer-events-auto">
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-semibold text-foreground">Add to Home Screen</p>
          <p className="font-sans text-xs text-muted-foreground mt-0.5">Install the KJB Reader app for offline access, and to look up verses in <span className="notranslate" translate="no">KJB Reader</span> right from other apps.</p>
        </div>
        <button
          onClick={onInstall}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
        <button
          onClick={onDismiss}
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}