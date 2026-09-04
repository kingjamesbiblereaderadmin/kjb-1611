import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Mobile bottom sheet wrapper for the Book/Chapter/Verse selectors.
 *
 * Deliberately NOT built on Vaul: Vaul intercepts pointer events across the
 * whole drawer for its drag-to-dismiss physics, which conflicts with native
 * <select> pickers on mobile and dismisses the sheet the instant you tap a
 * dropdown. This is a plain fixed sheet with a backdrop — the native pickers
 * work normally, and it only closes via the X button or a backdrop tap that
 * starts on the backdrop itself.
 */
export default function SelectorSheet({ open, onClose, title, children }) {
  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  // Portaled to document.body — otherwise `fixed` positioning is trapped
  // inside the reader toolbar's stacking context (z-index + transforms), so
  // the sheet renders behind/within the toolbar instead of full-screen.
  return createPortal(
    <div className="kjb-selector-sheet fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Backdrop — closes only when the press starts on the backdrop itself. */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      />
      <div className="relative flex flex-col rounded-t-2xl bg-card border-t border-border max-h-[80vh] shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mt-3 mb-2 w-10 h-1.5 rounded-full bg-border flex-shrink-0" />
        <div className="flex items-center justify-center relative pb-3 flex-shrink-0 px-4">
          {title && (
            <p className="font-sans text-sm font-semibold text-foreground text-center">{title}</p>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}