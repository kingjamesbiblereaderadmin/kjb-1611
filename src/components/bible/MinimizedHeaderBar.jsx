import React from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, ChevronDown } from 'lucide-react';

// The slim header bar shown when the main reader header is hidden.
// Provides fullscreen toggle and a button to restore the full header.
export default function MinimizedHeaderBar({ fullscreen, toggleFullscreen, setHideHeader }) {
  return createPortal(
    <div className="print:hidden fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur z-[110]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="w-full max-w-[120rem] mx-auto px-2 py-1.5 flex items-center justify-end gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleFullscreen}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-2 rounded-lg bg-secondary hover:bg-accent/20 text-foreground transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center cursor-pointer"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4 transition-transform duration-200 pointer-events-none" /> : <Maximize2 className="w-4 h-4 transition-transform duration-200 pointer-events-none" />}
          </button>
          <button
            type="button"
            onClick={() => setHideHeader(false)}
            className="p-2 rounded-lg bg-secondary hover:bg-accent/20 text-foreground transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center cursor-pointer"
            title="Show header"
          >
            <ChevronDown className="w-4 h-4 rotate-180 transition-transform duration-200 pointer-events-none" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}