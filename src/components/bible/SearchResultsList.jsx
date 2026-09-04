import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, ArrowDown, ChevronRight } from 'lucide-react';
import { BIBLE_BOOKS, BOOK_BY_API_NAME } from '@/lib/bibleData';
import SearchResultRow from '@/components/bible/SearchResultRow';

const NT_BOOKS = new Set(BIBLE_BOOKS.filter(b => b.testament === 'NT' || BIBLE_BOOKS.indexOf(b) >= 39).map(b => b.apiName));

// Map reader font family values to actual CSS font families
function getFontFamilyValue(family) {
  if (family === 'cursive') return "'Dancing Script', cursive";
  if (family === 'serif') return "'Merriweather', 'Cormorant Garamond', Georgia, serif";
  if (family === 'sans-serif') return "'Inter', system-ui, -apple-system, sans-serif";
  if (family === 'monospace') return "'Courier New', monospace";
  if (family === 'dyslexic') return "'OpenDyslexic', 'Comic Sans MS', sans-serif";
  return "'Merriweather', 'Cormorant Garamond', Georgia, serif";
}

// Count occurrences of the search term(s) within a verse's text (multiple hits per verse).
// `term` may be a comma-separated list (multi-keyword search) — sum each term's hits.
// Honours whole-word boundaries so the count matches what's highlighted.
function countOccurrences(text, term, caseSensitive, wholeWord) {
  if (!term) return 1;
  const clean = (text || '').replace(/[[\]]/g, '');
  const terms = term.split(',').map(t => t.trim()).filter(Boolean);
  let total = 0;
  for (const t of terms) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = wholeWord
      ? new RegExp(`(?:^|[^A-Za-z'])${escaped}(?=$|[^A-Za-z'])`, caseSensitive ? 'g' : 'gi')
      : new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    total += (clean.match(re) || []).length;
  }
  return total || (terms.length ? 0 : 1);
}

function SearchResultsList({ results, highlightTerm, highlightCaseSensitive, highlightWholeWord, selectMode, selected, onToggleSelect, onGoToVerse, resultRefs }) {
  // Stable ref setter so rows don't re-render just because the callback identity changed.
  const setRowRef = useCallback((idx, el) => {
    if (resultRefs) resultRefs.current[idx] = el;
  }, [resultRefs]);

  const [otExpanded, setOtExpanded] = useState(true);
  const [ntExpanded, setNtExpanded] = useState(true);
  // Which book groups are collapsed (by apiName). Default: all expanded.
  const [collapsedBooks, setCollapsedBooks] = useState(() => new Set());
  const otRef = useRef(null);
  const ntRef = useRef(null);
  // Unified keyboard-navigation cursor over a flat list of "stops" that
  // interleaves book headers and their verses. -1 = nothing focused.
  const [navPos, setNavPos] = useState(-1);
  // Refs to each book-header button, keyed by book apiName, for scroll-into-view.
  const headerRefs = useRef({});
  const setHeaderRef = useCallback((book, el) => { headerRefs.current[book] = el; }, []);

  const [fontFamily, setFontFamily] = useState(() => {
    try { return localStorage.getItem('kjb-reader-font-family') || 'serif'; } catch { return 'serif'; }
  });
  useEffect(() => {
    const sync = () => {
      try { setFontFamily(localStorage.getItem('kjb-reader-font-family') || 'serif'); } catch {}
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);
  const fontStyle = useMemo(() => ({ fontFamily: getFontFamilyValue(fontFamily) }), [fontFamily]);

  // Group results by testament → book, preserving canonical order and each
  // result's original flat index (used for keyboard focus, selection, navigation).
  const { groups, otCount, ntCount, otVerses, ntVerses } = useMemo(() => {
    const byBook = new Map(); // apiName -> { book, items: [{ r, i }], count }
    let ot = 0, nt = 0;
    let otV = 0, ntV = 0;
    results.forEach((r, i) => {
      const occ = countOccurrences(r.text, highlightTerm, highlightCaseSensitive, highlightWholeWord);
      if (NT_BOOKS.has(r.book)) {
        nt += occ;
        ntV++;
      } else {
        ot += occ;
        otV++;
      }
      if (!byBook.has(r.book)) {
        byBook.set(r.book, { book: r.book, items: [], count: 0 });
      }
      const g = byBook.get(r.book);
      g.items.push({ r, i });
      g.count += occ;
    });
    // Order book groups canonically
    const ordered = [...byBook.values()].sort((a, b) => {
      const ai = BIBLE_BOOKS.findIndex(x => x.apiName === a.book);
      const bi = BIBLE_BOOKS.findIndex(x => x.apiName === b.book);
      return ai - bi;
    });
    return {
      groups: ordered.map(g => ({ ...g, isNT: NT_BOOKS.has(g.book) })),
      otCount: ot,
      ntCount: nt,
      otVerses: otV,
      ntVerses: ntV,
    };
  }, [results, highlightTerm, highlightCaseSensitive, highlightWholeWord]);

  const toggleBook = useCallback((apiName) => {
    setCollapsedBooks(prev => {
      const next = new Set(prev);
      next.has(apiName) ? next.delete(apiName) : next.add(apiName);
      return next;
    });
  }, []);

  // Flat sequence of navigation stops in visual order: each book contributes a
  // 'header' stop, followed by its 'verse' stops (skipped while the book is
  // collapsed). Arrow keys / J / K walk this list; Enter acts on the stop.
  const navStops = useMemo(() => {
    const stops = [];
    groups.forEach(group => {
      stops.push({ type: 'header', book: group.book });
      if (!collapsedBooks.has(group.book)) {
        group.items.forEach(({ i }) => stops.push({ type: 'verse', index: i }));
      }
    });
    return stops;
  }, [groups, collapsedBooks]);

  // Keep navPos in range when the stop list changes (e.g. a book collapses).
  useEffect(() => {
    setNavPos(prev => (prev >= navStops.length ? navStops.length - 1 : prev));
  }, [navStops.length]);

  // The currently-focused verse index (for highlighting rows) — derived from navPos.
  const currentStop = navPos >= 0 && navPos < navStops.length ? navStops[navPos] : null;
  const focusedVerseIndex = currentStop?.type === 'verse' ? currentStop.index : -1;
  const focusedHeaderBook = currentStop?.type === 'header' ? currentStop.book : null;

  // Scroll the focused stop into view within the app's scroll container.
  useEffect(() => {
    if (!currentStop) return;
    requestAnimationFrame(() => {
      const el = currentStop.type === 'header'
        ? headerRefs.current[currentStop.book]
        : resultRefs?.current?.[currentStop.index];
      const container = document.getElementById('kjb-scroll');
      if (!el || !container) return;
      const elRect = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      const MARGIN = 16;
      // Only scroll when out of view — let the selection move naturally otherwise.
      if (elRect.bottom > cRect.bottom || elRect.top < cRect.top) {
        const delta = elRect.top - cRect.top - MARGIN;
        container.scrollTo({ top: container.scrollTop + delta, behavior: 'auto' });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navPos]);

  // Reset cursor when results change.
  useEffect(() => { setNavPos(-1); }, [results]);

  // Unified keyboard navigation: ↑/↓ or J/K to move between headers & verses,
  // Enter to open a verse OR collapse/expand a book header, Escape to clear.
  useEffect(() => {
    if (!navStops.length) return;
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const targetTag = e.target?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || targetTag === 'INPUT' || targetTag === 'TEXTAREA';
      const isArrowNav = e.key === 'ArrowDown' || e.key === 'ArrowUp';

      // While typing, let the input handle everything except arrow keys (which
      // always move through the list — blur first so the list takes over).
      if (inInput && !isArrowNav) return;
      if (inInput && isArrowNav) document.activeElement?.blur();

      if (e.key === 'Enter' && navPos < 0) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setNavPos(prev => Math.min(prev + 1, navStops.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setNavPos(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const stop = navStops[navPos];
        if (!stop) return;
        if (stop.type === 'header') {
          toggleBook(stop.book);
        } else {
          const r = results[stop.index];
          if (!r) return;
          const section = r.isColophon ? 'colophon' : r.isSubscript ? 'subscript' : null;
          if (r.isColophon || r.isSubscript || r.verse === 0) onGoToVerse(r.abbr, r.chapter, null, null, stop.index, section);
          else onGoToVerse(r.abbr, r.chapter, r.verse, r.verseEnd || null, stop.index);
        }
      } else if (e.key === 'Escape') {
        setNavPos(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navStops, navPos, results, onGoToVerse, toggleBook]);

  let firstNTSeen = false;

  return (
    <div className="space-y-2">
      {groups.map((group, gi) => {
        const isNT = group.isNT;
        const showOTHeader = gi === 0 && !isNT;
        const showNTHeader = isNT && !firstNTSeen;
        if (isNT) firstNTSeen = true;
        const sectionCollapsed = isNT ? !ntExpanded : !otExpanded;
        const bookEntry = BOOK_BY_API_NAME[group.book];
        const bookName = bookEntry?.shortName || group.book;
        const fullBookName = bookEntry?.name || group.book;
        const bookCollapsed = collapsedBooks.has(group.book);

        return (
          <React.Fragment key={`grp-${group.book}`}>
            {showOTHeader && (
              <div ref={otRef} className="sticky z-[5] bg-background flex items-center gap-2 pt-2 pb-1 border-b border-border mb-1 print:static print:border-black/20" style={{ top: 'var(--kjb-search-sticky-offset, 0px)' }}>
                {ntCount > 0 ? (
                  <button
                    onClick={() => setOtExpanded(!otExpanded)}
                    className="flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors print:text-black"
                  >
                    {otExpanded ? <ChevronDown className="w-3 h-3 print:hidden" /> : <ChevronRight className="w-3 h-3 print:hidden" />}
                    Old Testament <span className="font-normal normal-case text-muted-foreground/60 print:text-black/60">[{otVerses} verse{otVerses !== 1 ? 's' : ''}, {otCount} occurrence{otCount !== 1 ? 's' : ''}]</span>
                  </button>
                ) : (
                  <p className="font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground print:text-black">
                    Old Testament <span className="font-normal normal-case text-muted-foreground/60 print:text-black/60">[{otVerses} verse{otVerses !== 1 ? 's' : ''}, {otCount} occurrence{otCount !== 1 ? 's' : ''}]</span>
                  </p>
                )}
                {ntCount > 0 && (
                  <button
                    onClick={() => {
                      setNtExpanded(true);
                      setTimeout(() => {
                        const container = document.getElementById('kjb-scroll');
                        if (!container || !ntRef.current) return;
                        const cRect = container.getBoundingClientRect();
                        const elRect = ntRef.current.getBoundingClientRect();
                        // Account for both the app's sticky header and the search
                        // page's own sticky header block (the CSS var it sets) plus a
                        // small margin, so the NT title lands just below them instead
                        // of being hidden behind them.
                        const appHeader = document.querySelector('[data-kjb-app-header]');
                        const appHeaderH = appHeader ? appHeader.getBoundingClientRect().height : 0;
                        const searchStickyH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kjb-search-sticky-offset') || '0') || 0;
                        const offset = appHeaderH + searchStickyH + 8;
                        const delta = elRect.top - cRect.top - offset;
                        container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' });
                      }, 50);
                    }}
                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors print:hidden"
                  >
                    Jump to NT <ArrowDown className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {showNTHeader && (
              <div ref={ntRef} className="sticky z-[5] bg-background flex items-center gap-2 pt-3 pb-1 border-b border-border mb-1 print:static print:border-black/20 print:pt-4" style={{ top: 'var(--kjb-search-sticky-offset, 0px)' }}>
                {otCount > 0 ? (
                  <button
                    onClick={() => setNtExpanded(!ntExpanded)}
                    className="flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors print:text-black"
                  >
                    {ntExpanded ? <ChevronDown className="w-3 h-3 print:hidden" /> : <ChevronRight className="w-3 h-3 print:hidden" />}
                    New Testament <span className="font-normal normal-case text-muted-foreground/60 print:text-black/60">[{ntVerses} verse{ntVerses !== 1 ? 's' : ''}, {ntCount} occurrence{ntCount !== 1 ? 's' : ''}]</span>
                  </button>
                ) : (
                  <p className="font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground print:text-black">
                    New Testament <span className="font-normal normal-case text-muted-foreground/60 print:text-black/60">[{ntVerses} verse{ntVerses !== 1 ? 's' : ''}, {ntCount} occurrence{ntCount !== 1 ? 's' : ''}]</span>
                  </p>
                )}
                {otCount > 0 && (
                  <button
                    onClick={() => {
                      setOtExpanded(true);
                      setTimeout(() => {
                        const container = document.getElementById('kjb-scroll');
                        if (!container || !otRef.current) return;
                        const cRect = container.getBoundingClientRect();
                        const elRect = otRef.current.getBoundingClientRect();
                        const appHeader = document.querySelector('[data-kjb-app-header]');
                        const appHeaderH = appHeader ? appHeader.getBoundingClientRect().height : 0;
                        const searchStickyH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kjb-search-sticky-offset') || '0') || 0;
                        const offset = appHeaderH + searchStickyH + 8;
                        const delta = elRect.top - cRect.top - offset;
                        container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' });
                      }, 50);
                    }}
                    className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors print:hidden"
                  >
                    Jump to OT <ArrowDown className="w-3 h-3 rotate-180" />
                  </button>
                )}
              </div>
            )}

            {/* Per-book dropdown header + its verses (hidden if testament collapsed) */}
            {!sectionCollapsed && (
              <div className="rounded-xl overflow-hidden print:border-none print:rounded-none print:overflow-visible print:mt-2">
                <button
                  ref={(el) => setHeaderRef(group.book, el)}
                  onClick={() => toggleBook(group.book)}
                  className={`w-full flex items-center gap-2 px-3 py-2 bg-secondary/60 hover:bg-accent/15 transition-colors text-left print:bg-transparent print:px-0 print:py-1 print:border-b print:border-border/50 ${
                    focusedHeaderBook === group.book ? 'ring-2 ring-inset ring-accent bg-accent/15' : ''
                  }`}
                >
                  {bookCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground print:hidden" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground print:hidden" />}
                  <span className="notranslate font-sans text-sm font-semibold text-foreground print:hidden">{bookName}</span>
                  <span className="notranslate hidden print:inline font-sans text-sm font-semibold text-black">{fullBookName}:</span>
                  <span className="font-sans text-xs text-muted-foreground print:text-black/60">
                    · {group.items.length} verse{group.items.length !== 1 ? 's' : ''}
                    {group.count > group.items.length ? ` · ${group.count} occurrence${group.count !== 1 ? 's' : ''}` : ''}
                  </span>
                </button>
                {!bookCollapsed && (
                  <div className="p-2 space-y-2">
                    {group.items.map(({ r, i }) => {
                      // Key refs and focus by the ABSOLUTE results index (i), not
                      // visible render order — the keyboard handler steps through
                      // `results` by index, so they must stay aligned regardless of grouping.
                      return (
                        <SearchResultRow
                          key={`row-${i}`}
                          r={r}
                          i={i}
                          thisIndex={i}
                          isFocused={focusedVerseIndex === i}
                          isSelected={selected.has(i)}
                          selectMode={selectMode}
                          highlightTerm={highlightTerm}
                          highlightCaseSensitive={highlightCaseSensitive}
                          highlightWholeWord={highlightWholeWord}
                          fontStyle={fontStyle}
                          onToggleSelect={onToggleSelect}
                          onGoToVerse={onGoToVerse}
                          setRef={setRowRef}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default React.memo(SearchResultsList);