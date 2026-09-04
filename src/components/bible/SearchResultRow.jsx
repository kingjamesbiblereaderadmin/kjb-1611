import React from 'react';
import { BookOpen, CheckSquare, Square } from 'lucide-react';
import { BOOK_BY_API_NAME } from '@/lib/bibleData';

// Render [bracketed] words as <em> italics, with optional search-term highlighting.
//
// Highlighting is computed over the BRACKET-STRIPPED text so that a match can
// span across italic boundaries (e.g. "lov[e]d" still highlights "love"). We
// build a per-character map of (isItalic, isHighlight) and then emit runs that
// share the same state, wrapping italics in <em> and highlights in <mark>.
function renderWithItalics(text, searchTerm, caseSensitive, wholeWord) {
  // 1. Strip brackets → clean text, tracking which clean-char indices are italic.
  let clean = '';
  const italicFlags = []; // italicFlags[i] === true if clean char i was bracketed
  let inItalic = false;
  for (let k = 0; k < text.length; k++) {
    const ch = text[k];
    if (ch === '[') { inItalic = true; continue; }
    if (ch === ']') { inItalic = false; continue; }
    clean += ch;
    italicFlags.push(inItalic);
  }

  // 2. Mark which clean-char indices fall inside a search-term match.
  //    searchTerm may be a comma-separated list (multi-keyword search) — highlight each term.
  const highlightFlags = new Array(clean.length).fill(false);
  if (searchTerm) {
    const terms = searchTerm.split(',').map(t => t.trim()).filter(Boolean);
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Whole-word: capture the term in a group with non-word boundaries around it,
      // so only the term itself (not the surrounding char) gets highlighted.
      const regex = wholeWord
        ? new RegExp(`(?:^|[^A-Za-z'])(${escaped})(?=$|[^A-Za-z'])`, caseSensitive ? 'g' : 'gi')
        : new RegExp(`(${escaped})`, caseSensitive ? 'g' : 'gi');
      let mm;
      while ((mm = regex.exec(clean)) !== null) {
        // For the whole-word regex the match may include a leading boundary char;
        // highlight only the captured group (mm[1]).
        const matchText = mm[1] !== undefined ? mm[1] : mm[0];
        const start = mm.index + (mm[0].length - matchText.length);
        for (let p = start; p < start + matchText.length; p++) highlightFlags[p] = true;
        if (mm.index === regex.lastIndex) regex.lastIndex++; // avoid zero-width loops
      }
    }
  }

  // 3. Emit runs sharing the same (italic, highlight) state.
  const nodes = [];
  let i = 0;
  let key = 0;
  while (i < clean.length) {
    const it = italicFlags[i];
    const hl = highlightFlags[i];
    let j = i + 1;
    while (j < clean.length && italicFlags[j] === it && highlightFlags[j] === hl) j++;
    const run = clean.slice(i, j);
    // Highlighted matches inside [bracketed] italics keep the italic styling
    // (slanted + muted colour) so they read as italic, not plain highlighted text.
    let node = hl
      ? <mark key={key} className={`bg-accent/40 rounded px-0.5 ${it ? 'italic text-foreground/75' : 'text-foreground'}`}>{run}</mark>
      : run;
    if (it && !hl) node = <em key={key} className="text-foreground/75">{node}</em>;
    else if (!hl) node = <React.Fragment key={key}>{run}</React.Fragment>;
    nodes.push(node);
    key++;
    i = j;
  }
  return nodes;
}

// A single search result row. Memoized so only the rows whose props actually
// change (e.g. the focused/selected one) re-render — not the whole list.
function SearchResultRow({ r, i, thisIndex, isFocused, isSelected, selectMode, highlightTerm, highlightCaseSensitive, highlightWholeWord, fontStyle, onToggleSelect, onGoToVerse, setRef }) {
  const isSubscript = r.isSubscript;
  const isHeading = r.isHeading;
  const isColophon = r.isColophon || (r.verse === 0 && !isSubscript && !isHeading);

  return (
    <div
      ref={el => setRef(thisIndex, el)}
      onClick={() => {
        if (selectMode) {
          onToggleSelect(i);
        } else if (isSubscript) {
          onGoToVerse(r.abbr, r.chapter, null, null, i, 'subscript');
        } else if (isColophon) {
          onGoToVerse(r.abbr, r.chapter, null, null, i, 'colophon');
        } else {
          onGoToVerse(r.abbr, r.chapter, r.verse, r.verseEnd || null, i);
        }
      }}
      className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 print:p-0 print:border-none print:rounded-none print:bg-transparent print:mb-3 print:break-inside-avoid ${
        isFocused
          ? 'bg-accent/10 border-accent/60 ring-1 ring-accent/40'
          : isSelected
          ? 'bg-primary/10 border-primary/40'
          : 'bg-card border-border hover:border-accent/40 hover:bg-accent/5'
      }`}
    >
      {selectMode && (
        <div className="shrink-0 mt-0.5 print:hidden">
          {isSelected
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : <Square className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-xs text-accent font-semibold mb-1 flex items-center gap-1 print:text-black">
          <span className="mr-1 text-accent print:text-black font-serif text-lg leading-none">&bull;</span>
          <BookOpen className="w-3 h-3 print:hidden" />
          <span className="notranslate print:hidden">{BOOK_BY_API_NAME[r.book]?.name || r.book}</span>
          <span className="notranslate hidden print:inline">{BOOK_BY_API_NAME[r.book]?.shortName || r.book}</span>
          <span className="print:hidden">:</span> <span className="hidden print:inline"> </span>{r.chapter}
          {isSubscript ? ' (Superscription)' : isColophon ? ' (Colophon)' : isHeading ? `:${r.verse} (Stanza)` : `:${r.verse}`}
        </p>
        <p className="notranslate text-base text-foreground leading-relaxed print:text-black" style={fontStyle}>
          {isHeading ? (
            <span className="font-bold tracking-wide">{renderWithItalics(r.text, highlightTerm, highlightCaseSensitive, highlightWholeWord)}</span>
          ) : (isColophon || isSubscript) ? (
            <span>¶ {renderWithItalics(r.text, highlightTerm, highlightCaseSensitive, highlightWholeWord)}</span>
          ) : (
            <span>"{renderWithItalics(r.text, highlightTerm, highlightCaseSensitive, highlightWholeWord)}"</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default React.memo(SearchResultRow);