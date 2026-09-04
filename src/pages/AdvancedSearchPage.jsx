import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FlaskConical, Loader2, SlidersHorizontal, X, CheckSquare, Square, ChevronDown } from 'lucide-react';
import {
  buildVerseIndex, applyFilters, defaultFilters, NUMERIC_METRICS, isDefaultFilters,
  computeOptionAvailability, computeMetricRanges,
} from '@/lib/verseAnalysis';
import AdvancedFilterPanel from '@/components/search/AdvancedFilterPanel';
import AdvancedResultRow from '@/components/search/AdvancedResultRow';
import AdvancedResultsToolbar from '@/components/search/AdvancedResultsToolbar';

const PAGE_SIZE = 50;

export default function AdvancedSearchPage() {
  const [records, setRecords] = useState(null);   // null = loading
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false); // mobile drawer
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  // When no filter/term is set, results are hidden by default (so we don't dump
  // all 31,102 verses). "Show results" flips this on to force-display them.
  const [forceShow, setForceShow] = useState(false);
  const resultsRef = useRef(null);
  // Collapsed Testament / Book groups (keys stored in a Set = collapsed).
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  // The "Text contains" box updates this instantly for a responsive input, but
  // the actual (expensive) filtering only runs once typing pauses. We commit
  // the debounced value into filters.textContains ~350ms after the last keystroke.
  const [textDraft, setTextDraft] = useState(filters.textContains);
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters(prev => (prev.textContains === textDraft ? prev : { ...prev, textContains: textDraft }));
    }, 350);
    return () => clearTimeout(id);
  }, [textDraft]);
  // Keep the draft in sync when filters are reset externally (e.g. Reset button).
  useEffect(() => { setTextDraft(filters.textContains); }, [filters.textContains]);

  // Track the mobile bottom-nav footer mode so the filter drawer reserves the
  // right amount of bottom space — the "Show results"/"Reset" buttons must stay
  // reachable whether the bottom menu is expanded (two/one rows) or collapsed (bar).
  const [footerMode, setFooterMode] = useState(() => {
    try {
      const saved = localStorage.getItem('kjb-footer-mode');
      if (saved === 'none') return 'bar';
      return ['two', 'one', 'bar'].includes(saved) ? saved : 'one';
    } catch { return 'one'; }
  });
  useEffect(() => {
    const onChange = () => {
      try {
        const saved = localStorage.getItem('kjb-footer-mode');
        setFooterMode(saved === 'none' ? 'bar' : (['two', 'one', 'bar'].includes(saved) ? saved : 'one'));
      } catch {}
    };
    window.addEventListener('kjb-footer-mode-change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('kjb-footer-mode-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  // Approx height of the fixed bottom nav for each mode, plus the drawer's own
  // action button + breathing room. Used as bottom padding on the scroll area.
  const footerPad = footerMode === 'two' ? 200 : footerMode === 'one' ? 150 : 90;

  const toggleGroup = useCallback((groupKey, el) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      const wasCollapsed = next.has(groupKey);
      if (wasCollapsed) next.delete(groupKey); else next.add(groupKey);
      // On expand, jump the header into view — accounting for the sticky app
      // header so the Testament title isn't hidden behind it.
      if (wasCollapsed && el) {
        requestAnimationFrame(() => {
          const headerEl = document.querySelector('[data-kjb-app-header]');
          const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
          const top = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    buildVerseIndex()
      .then(recs => { if (!cancelled) setRecords(recs); })
      .catch(err => { if (!cancelled) setError(err?.message || 'Could not load Bible data.'); });
    return () => { cancelled = true; };
  }, []);

  // Until the user actually sets a filter or search term, the page starts
  // empty (no results) rather than dumping all 31,102 verses.
  const noFilters = useMemo(() => isDefaultFilters(filters), [filters]);
  // Show nothing until the user sets a filter/term OR explicitly taps "Show results".
  const isEmpty = noFilters && !forceShow;

  // Recompute results whenever filters or records change.
  const results = useMemo(() => {
    if (!records || isEmpty) return [];
    return applyFilters(records, filters);
  }, [records, filters, isEmpty]);

  // Reset the visible window + selection when the result set changes, and jump
  // the results panel back to the top so the user sees the first match.
  useEffect(() => {
    setVisible(PAGE_SIZE); setSelectedKeys(new Set()); setCollapsedGroups(new Set());
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [filters]);

  // Lock the page behind the mobile filter drawer. On mobile, overflow:hidden
  // alone doesn't stop touch scroll from bubbling to the page. We freeze the
  // body at its current scroll position with position:fixed, then restore the
  // exact scroll offset on close so there's no jump.
  useEffect(() => {
    if (!showFilters) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [showFilters]);

  const keyOf = (r) => `${r.abbr}-${r.chapter}-${r.verse}`;

  const toggleSelect = useCallback((r) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      const k = keyOf(r);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }, []);

  const selectedRecords = useMemo(
    () => results.filter(r => selectedKeys.has(keyOf(r))),
    [results, selectedKeys]
  );

  const sortLabel = useMemo(
    () => NUMERIC_METRICS.find(m => m.key === filters.sortKey)?.label.toLowerCase() || '',
    [filters.sortKey]
  );

  const handleReset = useCallback(() => { setFilters(defaultFilters()); setForceShow(false); }, []);

  // Which filter options would still return verses given the current filters.
  // Options yielding 0 results are greyed out in the panel.
  const availability = useMemo(
    () => (records ? computeOptionAvailability(records, filters) : null),
    [records, filters]
  );

  // Dynamic testament: auto-select the tightest testament for the current
  // filters. Re-evaluates on ANY filter change (text, numeric, property, etc.)
  // since `availability` recomputes each time.
  //  • On "All": if matches fall in ONLY one testament, switch to it (e.g.
  //    "Lamb of God" adjacent → only in New → switch to New).
  //  • On a specific testament with no matches: switch to whichever one has them.
  // Skips when no filter is set at all (default state shows nothing).
  useEffect(() => {
    if (!availability || isEmpty) return;
    const { old, new: neu } = availability.testaments;

    if (filters.testament === 'all') {
      // Matches in exactly one testament → narrow to it.
      if (old && !neu) setFilters(prev => ({ ...prev, testament: 'old', book: 'all' }));
      else if (neu && !old) setFilters(prev => ({ ...prev, testament: 'new', book: 'all' }));
      return;
    }

    // A specific testament is selected but yields nothing → rescue.
    if (!availability.testaments[filters.testament]) {
      const other = filters.testament === 'old' ? 'new' : 'old';
      if (availability.testaments[other]) setFilters(prev => ({ ...prev, testament: other, book: 'all' }));
      else if (availability.testaments.all) setFilters(prev => ({ ...prev, testament: 'all', book: 'all' }));
    }
  }, [availability, filters.testament, isEmpty]);

  // The actual data range (min/max) of each numeric metric — used to suggest
  // realistic values as placeholders in the numeric filter inputs.
  const metricRanges = useMemo(
    () => (records ? computeMetricRanges(records, filters) : null),
    [records, filters]
  );

  // Group the currently-visible results by Testament, then book — preserving
  // the order results already come in (canonical or by whatever sort is active).
  const groupedVisible = useMemo(() => {
    const shown = results.slice(0, visible);
    const testaments = [];
    const tMap = new Map();
    for (const r of shown) {
      const tKey = r.testament; // 'old' | 'new'
      let t = tMap.get(tKey);
      if (!t) {
        t = { key: tKey, label: tKey === 'old' ? 'Old Testament' : 'New Testament', books: [], bMap: new Map() };
        tMap.set(tKey, t);
        testaments.push(t);
      }
      let b = t.bMap.get(r.abbr);
      if (!b) {
        b = { key: r.abbr, label: r.shortName, rows: [] };
        t.bMap.set(r.abbr, b);
        t.books.push(b);
      }
      b.rows.push(r);
    }
    return testaments;
  }, [results, visible]);

  return (
    <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 pt-10 pb-32">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
          <FlaskConical className="w-7 h-7 text-white" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Advanced Search</h1>
        <p className="font-sans text-sm text-muted-foreground max-w-md mx-auto">
          Research the King James Bible by verse properties — length, pilcrows, italics, capitals, punctuation and more.
        </p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
      </div>

      <div className="max-w-md mx-auto mb-8 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 p-4">
        <p className="font-sans text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed text-center">
          ⚠️ Advanced Search is in <strong>beta</strong>. If you run into any issues, please contact me at{' '}
          <a href="mailto:kingjamesbiblereader@outlook.sg" className="underline">kingjamesbiblereader@outlook.sg</a>.
        </p>
      </div>

      {records === null && !error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary/70" />
          <p className="font-sans text-sm text-muted-foreground">Analysing all 31,102 verses…</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/40 p-4 max-w-lg mx-auto">
          <p className="font-sans text-sm text-destructive">{error} Make sure the Bible has downloaded, then try again.</p>
        </div>
      )}

      {records && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
          {/* Desktop filter column — sticky, with its own independent scroll
              so a long filter list scrolls on its own without moving the page. */}
          <div className="hidden lg:block sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain pr-1 pb-8 scrollbar-hide">
            <AdvancedFilterPanel filters={filters} onChange={setFilters} onReset={handleReset} availability={availability} metricRanges={metricRanges} textDraft={textDraft} onTextDraftChange={setTextDraft} />
          </div>

          {/* Results column */}
          <div ref={resultsRef} className="scroll-mt-4">
            {/* Result count + mobile filter button */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="font-sans text-sm text-muted-foreground">
                {isEmpty
                  ? 'Set a filter or search to begin'
                  : <><span className="font-semibold text-foreground">{results.length.toLocaleString()}</span> verse{results.length === 1 ? '' : 's'} match</>}
              </p>
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* Export / copy / print + select toggle */}
            {!isEmpty && results.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <AdvancedResultsToolbar records={results} selectedRecords={selectMode ? selectedRecords : null} filters={filters} />
                <button
                  onClick={() => { setSelectMode(m => !m); setSelectedKeys(new Set()); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    selectMode
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/60 border-border text-foreground hover:border-accent'
                  }`}
                >
                  {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectMode ? 'Done' : 'Select'}
                </button>
              </div>
            )}

            {selectMode && !isEmpty && results.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSelectedKeys(new Set(results.slice(0, visible).map(keyOf)))}
                  className="font-sans text-xs text-primary font-medium hover:underline"
                >
                  Select all shown
                </button>
                <button
                  onClick={() => setSelectedKeys(new Set())}
                  className="font-sans text-xs text-muted-foreground font-medium hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {isEmpty ? (
              <div className="rounded-2xl bg-card/70 border border-border/60 p-8 text-center">
                <p className="font-sans text-sm text-muted-foreground mb-5">Choose a testament, book, keyword, or metric filter to start exploring verses — or show every verse and sort by the selected metric.</p>
                <button
                  onClick={() => setForceShow(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
                >
                  <FlaskConical className="w-4 h-4" />
                  Show all verses
                </button>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl bg-card/70 border border-border/60 p-8 text-center">
                <p className="font-sans text-sm text-muted-foreground">No verses match these filters. Try loosening them.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedVisible.map(t => {
                  const tCollapsed = collapsedGroups.has(t.key);
                  const tCount = t.books.reduce((n, b) => n + b.rows.length, 0);
                  return (
                  <div key={t.key} className="space-y-5">
                    <button
                      onClick={(e) => toggleGroup(t.key, e.currentTarget)}
                      className="w-full flex items-center justify-between gap-2 border-b-2 border-accent/40 pb-1.5 text-left"
                    >
                      <h2 className="font-serif text-2xl font-bold text-foreground">
                        {t.label} <span className="font-sans text-sm font-normal text-muted-foreground">({tCount.toLocaleString()})</span>
                      </h2>
                      <ChevronDown className={`w-6 h-6 text-muted-foreground transition-transform ${tCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                    {!tCollapsed && t.books.map(b => {
                      const bKey = `${t.key}:${b.key}`;
                      const bCollapsed = collapsedGroups.has(bKey);
                      return (
                      <div key={b.key} className="space-y-3">
                        <button
                          onClick={(e) => toggleGroup(bKey, e.currentTarget)}
                          className="w-full flex items-center justify-between gap-2 sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-10 text-left"
                        >
                          <h3 className="font-serif text-lg font-semibold text-primary">
                            <span className="notranslate">{b.label}</span> <span className="font-sans text-xs font-normal text-muted-foreground">({b.rows.length})</span>
                          </h3>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${bCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                        {!bCollapsed && b.rows.map(r => {
                          const k = keyOf(r);
                          if (selectMode) {
                            const checked = selectedKeys.has(k);
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => toggleSelect(r)}
                                className={`w-full flex items-start gap-3 text-left rounded-2xl transition-colors ${
                                  checked ? 'ring-2 ring-primary rounded-2xl' : ''
                                }`}
                              >
                                <span className="mt-4 shrink-0">
                                  {checked
                                    ? <CheckSquare className="w-5 h-5 text-primary" />
                                    : <Square className="w-5 h-5 text-muted-foreground" />}
                                </span>
                                <span className="flex-1 pointer-events-none">
                                  <AdvancedResultRow record={r} sortKey={filters.sortKey} sortLabel={sortLabel} filters={filters} />
                                </span>
                              </button>
                            );
                          }
                          return (
                            <AdvancedResultRow key={k} record={r} sortKey={filters.sortKey} sortLabel={sortLabel} filters={filters} />
                          );
                        })}
                      </div>
                      );
                    })}
                  </div>
                  );
                })}
                {visible < results.length && (
                  <button
                    onClick={() => setVisible(v => v + PAGE_SIZE)}
                    className="w-full py-3 rounded-xl bg-secondary/50 border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-colors"
                  >
                    Show more ({(results.length - visible).toLocaleString()} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile filter drawer */}
      {showFilters && records && (
        <div className="lg:hidden fixed inset-0 z-50 flex h-[100dvh]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="relative ml-auto w-[88%] max-w-sm h-[100dvh] bg-background flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
              <h2 className="font-serif text-lg font-semibold text-foreground">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5"
              style={{ WebkitOverflowScrolling: 'touch', paddingBottom: footerPad }}
            >
              <AdvancedFilterPanel filters={filters} onChange={setFilters} onReset={handleReset} availability={availability} metricRanges={metricRanges} textDraft={textDraft} onTextDraftChange={setTextDraft} />
            </div>
            <div
              className="shrink-0 px-5 pt-3 bg-background border-t border-border/60"
              style={{ paddingBottom: `calc(1rem + ${footerPad}px)` }}
            >
              <button
                onClick={() => { if (noFilters) setForceShow(true); setShowFilters(false); }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium"
              >
                {isEmpty ? 'Show all verses' : `Show ${results.length.toLocaleString()} results`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}