import React, { useState } from 'react';
import { Check, Layers, X } from 'lucide-react';

export default function VerseSelector({ totalVerses, currentVerse, onSelect, onClose, multiSelect = false, onGoToChapter = null, hasSubscript = false, hasColophon = false }) {
  const [selected, setSelected] = useState(() => new Set(currentVerse ? (Array.isArray(currentVerse) ? currentVerse : [currentVerse]) : []));
  const [multiMode, setMultiMode] = useState(false); // Default to single-select mode

  const toggle = (v) => {
    if (!multiMode) {
      onSelect(v);
      onClose();
      return;
    }
    setSelected(prev => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size === 0) { onClose(); return; }
    const sorted = [...selected].sort((a, b) => a - b);
    onSelect(sorted);
    onClose();
  };

  // Special section buttons (colophon/subscript) flow inline after the last
  // verse, filling the remaining row cells — mirrors the VerseGrid layout.
  const COLS = 6;
  const specials = [];
  if (hasSubscript) specials.push({ key: 'subscript', label: 'Subscript', title: 'Go to the superscription (before verse 1)' });
  if (hasColophon) specials.push({ key: 'colophon', label: 'Colophon', title: 'Go to the colophon (after the last verse)' });
  const lastRowVerses = totalVerses % COLS;
  const remaining = lastRowVerses === 0 ? COLS : COLS - lastRowVerses;
  const baseSpan = Math.floor(remaining / Math.max(specials.length, 1));
  const extra = remaining - baseSpan * Math.max(specials.length, 1);
  const spans = specials.map((_, idx) => Math.max(1, idx < extra ? baseSpan + 1 : baseSpan));

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden w-[90vw] max-w-sm max-h-[70vh] flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="font-serif font-semibold text-foreground text-center flex-1">
          {multiMode ? `Select Verses${selected.size > 0 ? ` (${selected.size})` : ''}` : 'Select Verse'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMultiMode(!multiMode)}
            className={`p-1.5 rounded-lg border transition-colors ${multiMode ? 'bg-accent text-accent-foreground border-accent' : 'bg-secondary text-muted-foreground border-border'}`}
            title="Toggle multi-select"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-3">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: totalVerses }, (_, i) => i + 1).map(v => {
            const isActive = selected.has(v);
            return (
              <button
                key={v}
                data-vaul-no-drag
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => toggle(v)}
                className={`h-9 w-full rounded text-sm font-sans font-medium border transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-bold ring-2 ring-accent/50 border-accent'
                    : 'bg-secondary hover:bg-accent/20 text-foreground border-border'
                }`}
              >
                {v}
              </button>
            );
          })}
          {specials.map((s, idx) => (
            <button
              key={s.key}
              data-vaul-no-drag
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { onSelect({ section: s.key }); onClose(); }}
              style={{ gridColumn: `span ${spans[idx]}` }}
              className="h-9 w-full rounded text-sm font-sans font-medium border transition-colors bg-secondary hover:bg-accent/20 text-foreground border-border"
              title={s.title}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {onGoToChapter && (
        <div className="px-3 pt-3">
          <button
            onClick={onGoToChapter}
            className="w-full px-4 py-2.5 rounded-lg bg-accent/10 border border-accent/30 text-accent font-sans text-sm font-medium hover:bg-accent/20 transition-colors"
          >
            Go to whole chapter
          </button>
        </div>
      )}
      <div className="p-3 border-t border-border flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-lg bg-secondary border border-border text-secondary-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
        >
          Go
        </button>
      </div>
    </div>
  );
}