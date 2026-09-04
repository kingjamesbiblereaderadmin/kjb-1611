import React from 'react';

// Verse picker rendered as a number grid — mirrors the ChapterSelector layout.
// `bare` skips the outer card wrapper so it doesn't double-up inside the
// mobile SelectorSheet (which already provides its own card).
// Special entries: Whole chapter (top), Subscript + Colophon (end).
export default function VerseGrid({ verseCount, currentVerse, currentSection, hasSubscript, hasColophon, onSelect, bare }) {
  const isVerseActive = (v) => currentVerse != null && currentVerse === v && !currentSection;
  const isSectionActive = (key) => currentSection === key;
  const btnClass = (active) => `h-9 w-full rounded text-sm font-sans font-medium border transition-colors ${active ? 'bg-accent text-accent-foreground font-bold border-accent' : 'bg-secondary hover:bg-accent/20 text-foreground border-border'}`;

  const endSpecials = [];
  if (hasSubscript) endSpecials.push({ key: 'sub', label: 'Subscript', active: isSectionActive('subscript') });
  if (hasColophon) endSpecials.push({ key: 'col', label: 'Colophon', active: isSectionActive('colophon') });

  // Distribute the remaining cells of the last verse row across the special
  // buttons so they fill the row instead of leaving empty space / a new line.
  const COLS = 6;
  const lastRowVerses = verseCount % COLS;
  const remaining = lastRowVerses === 0 ? COLS : COLS - lastRowVerses;
  const baseSpan = Math.floor(remaining / Math.max(endSpecials.length, 1));
  const extra = remaining - baseSpan * Math.max(endSpecials.length, 1);
  const spans = endSpecials.map((_, idx) => Math.max(1, idx < extra ? baseSpan + 1 : baseSpan));

  const wrapperClass = bare
    ? 'flex flex-col'
    : 'bg-card rounded-2xl overflow-hidden w-[90vw] max-w-sm max-h-[70vh] flex flex-col relative';

  return (
    <div className={wrapperClass}>
      <div className={bare ? 'space-y-3' : 'overflow-y-auto flex-1 p-3 space-y-3'}>
        {/* Whole chapter — full width at top */}
        <button
          data-vaul-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSelect('')}
          className={btnClass(!currentVerse && !currentSection)}
        >
          Whole chapter
        </button>

        {/* Verse numbers + Subscript/Colophon flow together in one grid,
            so specials sit right next to the last verse, not on a separate line */}
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: verseCount }, (_, i) => i + 1).map(v => (
            <button
              key={v}
              data-vaul-no-drag
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect(v)}
              className={btnClass(isVerseActive(v))}
            >
              {v}
            </button>
          ))}
          {endSpecials.map((s, idx) => (
            <button
              key={s.key}
              data-vaul-no-drag
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect(s.key)}
              className={btnClass(s.active)}
              style={{ gridColumn: `span ${spans[idx]}` }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}