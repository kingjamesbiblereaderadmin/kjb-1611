import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getGospelNav } from '@/lib/searchNav';

export function useToolbarState(pos, loading, verses, filterMode, selectedVerses, searchTerm, searchResultIndex, searchTotalResults, gospelMode, searchClearedRef, setFilterMode, setSelectedVerses, setHighlightedVerses, resultViewRef, setSearchTerm, setSearchResultIndex, setSearchTotalResults, setGospelMode, setGospelResultIndex, setGospelTotalResults, setHighlightVerse) {
  // Prevents the save effect from overwriting persisted state with default
  // values before the restore has had a chance to rehydrate it.
  const hasRestoredRef = useRef(false);
  // Forces the save effect to fire once after restore completes — even when
  // nothing was restored (e.g. toolbar state was cleared by goMulti). Without
  // this, the save effect would never fire and the current filterMode/selection
  // would never be persisted.
  const [restoreTick, setRestoreTick] = useState(0);

  // Capture the navigation source (?from=daily / ?from=random) ONCE on mount.
  // The reader's URL-sync strips the param shortly after navigation, so
  // re-reading window.location.search on every restore (including the focus
  // listener below) would lose the guard and resurrect a stale search filter
  // over a daily/random chapter. Pinning it per-mount keeps that from happening.
  const navFromRef = useRef(null);

  // Tracks whether we've already applied the saved filter/search/gospel state
  // for the CURRENT chapter. The focus/visibilitychange listeners re-run
  // restoreToolbarState() every time the tab/app regains visibility so a
  // background app switch is never missed - but re-applying the saved
  // filterMode/search/gospel context on every one of those return trips means
  // any change the user made after the initial restore (toggling off the
  // filter, clearing a search, just reading normally) gets silently
  // overwritten the next time they switch away and back. Restoration should
  // only happen once per chapter (on first load / navigation into it) - after
  // that, returning to the app should leave the toolbar state exactly as the
  // user left it.
  const appliedRestoreForChapterRef = useRef(false);

  // Persist toolbar state with chapter + search/gospel context
  useEffect(() => {
    if (loading || !hasRestoredRef.current) return;
    try {
      // Only persist when there's an active SEARCH or GOSPEL context. A plain
      // "Read Selected" passage filter (filterMode/selectedVerses alone) must
      // NOT persist — otherwise reopening the reader jumps back into that
      // filtered passage from a previous session.
      const hasContext = (searchTerm && !searchClearedRef.current) || gospelMode;
      if (!hasContext) {
        localStorage.removeItem('kjb-reader-toolbar-state');
        return;
      }
      
      const state = {
        abbr: pos.abbr,
        chapter: pos.chapter,
        filterMode,
        selectedVerses: [...selectedVerses],
        resultView: resultViewRef.current,
        hasSearchContext: !!(searchTerm && !searchClearedRef.current),
        hasGospelContext: gospelMode,
        searchTerm: searchTerm && !searchClearedRef.current ? searchTerm : null,
        searchResultIndex,
        searchTotalResults,
        timestamp: Date.now()
      };
      localStorage.setItem('kjb-reader-toolbar-state', JSON.stringify(state));
      console.log('[ToolbarState] Saved state:', state);
    } catch (err) {
      console.error('[ToolbarState] Save error:', err);
    }
  }, [filterMode, selectedVerses, searchTerm, searchClearedRef.current, gospelMode, searchResultIndex, searchTotalResults, pos.abbr, pos.chapter, loading, restoreTick]);

  // Restore toolbar state after chapter loads
  // useLayoutEffect (not useEffect) deliberately: this restores filterMode/
  // selectedVerses from localStorage AFTER the chapter's own verses have
  // just loaded (verses.length > 0 is a dependency). With a plain
  // useEffect, the browser gets a chance to PAINT the initial
  // filterMode=false render (the full, unfiltered chapter) before this
  // effect runs and flips it to the restored filtered view -- a visible
  // flash from "full chapter" to "filtered passage" on every navigation
  // into the reader with an active filter. useLayoutEffect runs
  // synchronously after React computes the DOM changes but BEFORE the
  // browser paints them, so the filterMode update here lands in the SAME
  // paint as the verses themselves -- nothing incorrect is ever actually
  // shown on screen.
  useLayoutEffect(() => {
    if (loading || verses.length === 0) return;

    const restoreToolbarState = (isRevisit = false) => {
      // On a revisit (tab/app regained focus/visibility), only skip re-applying
      // saved filter/search/gospel state if we already did so once for this
      // chapter - the user may have changed things since. A non-revisit call
      // (initial mount / chapter change) always runs.
      if (isRevisit && appliedRestoreForChapterRef.current) return;
      // Mark as restored so the save effect can start persisting again.
      hasRestoredRef.current = true;
      try {
        // Never rehydrate a stale search/gospel context when we've just
        // navigated here via Daily Verse or Random Chapter - those flows
        // explicitly clear search/gospel state, and this restore (also
        // triggered on window focus) shouldn't undo that.
        if (navFromRef.current === null) {
          navFromRef.current = new URLSearchParams(window.location.search).get('from') || '';
        }
        const navFrom = navFromRef.current;
        if (navFrom === 'daily' || navFrom === 'random') {
          appliedRestoreForChapterRef.current = true;
          setRestoreTick(t => t + 1);
          return;
        }
        const saved = localStorage.getItem('kjb-reader-toolbar-state');
        console.log('[ToolbarState] Restore attempt - saved:', saved);
        if (!saved) {
          // Nothing to restore — still force a save so the current state
          // (e.g. filterMode set by stepToResult) gets persisted.
          appliedRestoreForChapterRef.current = true;
          setRestoreTick(t => t + 1);
          return;
        }
        const state = JSON.parse(saved);
        console.log('[ToolbarState] Parsed state:', state);
        // Discard a stale snapshot from a past session (e.g. the app was closed
        // mid-search/gospel without an explicit Clear) — restoring a filter from
        // hours/days/weeks ago when the user happens to land back on the same
        // chapter is confusing, not helpful.
        const STALE_MS = 12 * 60 * 60 * 1000; // 12 hours
        if (state && state.timestamp && Date.now() - state.timestamp > STALE_MS) {
          try { localStorage.removeItem('kjb-reader-toolbar-state'); } catch {}
          setRestoreTick(t => t + 1);
          return;
        }
        // Restore search/gospel context if we're on the SAME chapter where it was saved
        if (state && state.abbr === pos.abbr && state.chapter === pos.chapter) {
          console.log('[ToolbarState] Chapter match - restoring');
          // Re-apply the passage filter ONLY for an active search/gospel
          // session — never for a stale "Read Selected" filter, which would
          // make reopening jump back into a filtered passage.
          const hadContext = state.hasSearchContext || state.hasGospelContext;
          if (hadContext && state.filterMode !== undefined) {
            setFilterMode(state.filterMode);
          }
          if (hadContext && state.selectedVerses && state.selectedVerses.length > 0) {
            const newSet = new Set(state.selectedVerses);
            setSelectedVerses(newSet);
            setHighlightedVerses(newSet);
            // Re-highlight and scroll to the restored verse(s) so coming back to
            // /read (e.g. via the bottom nav) lands where the user left off,
            // not just at the top of the chapter with the toolbar re-populated.
            if (setHighlightVerse) setHighlightVerse(Math.min(...newSet));
          }
          // Restore the "verse/chapter only" flag (Show Full Chapter vs Verses
          // Only) so it matches what the user last had open on this chapter.
          if (state.resultView) {
            console.log('[ToolbarState] Restoring resultView:', state.resultView);
            resultViewRef.current = state.resultView;
          }
          // Always restore search context if it exists and hasn't been cleared
          if (state.hasSearchContext && state.searchTerm) {
            console.log('[ToolbarState] Restoring search:', state.searchTerm);
            searchClearedRef.current = false;
            setSearchTerm(state.searchTerm);
            setSearchResultIndex(state.searchResultIndex || 0);
            setSearchTotalResults(state.searchTotalResults || 0);
          }
          // Restore gospel context
          if (state.hasGospelContext) {
            console.log('[ToolbarState] Restoring gospel mode');
            const g = getGospelNav();
            if (g.results.length > 0) {
              setGospelMode(true);
              setGospelResultIndex(g.index);
              setGospelTotalResults(g.results.length);
            }
          }
        } else {
          console.log('[ToolbarState] Chapter mismatch - not restoring', { state, pos });
        }
      } catch (err) {
        console.error('[ToolbarState] Restore error:', err);
      }
      appliedRestoreForChapterRef.current = true;
      // Force the save effect to fire with the (possibly) restored state.
      setRestoreTick(t => t + 1);
    };
    appliedRestoreForChapterRef.current = false;
    restoreToolbarState();
    const timer = setTimeout(restoreToolbarState, 100);
    // Re-apply persisted search/gospel/filter state when the page becomes
    // visible again. Switching browser tabs OR backgrounding/foregrounding a
    // mobile app fires `visibilitychange` but NOT always `focus` (especially
    // on Android/PWA), so listening to focus alone left the reader without its
    // restored search/gospel/filter context after returning from another tab
    // or app.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') restoreToolbarState(true);
    };
    const onFocus = () => restoreToolbarState(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pos.abbr, pos.chapter, verses.length]);
}