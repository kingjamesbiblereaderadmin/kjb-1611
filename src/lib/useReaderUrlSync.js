import { useEffect } from 'react';

// Keep the browser address bar in sync with the reader's current position on
// EVERY change — including navigations that set `pos` directly (gospel/search
// steppers, the kjb-navigate event from Home's daily/random buttons), not just
// the ones that call navigate(). Preserves any ?from=…&q=… context flags
// already in the URL so the "currently reading" indicators still restore.
export function useReaderUrlSync(pos, loading, a11yFont, navigate, searchTerm, gospelMode) {
  useEffect(() => {
    if (loading) return;
    try {
      const params = new URLSearchParams(window.location.search);
      let from = params.get('from');
      const q = params.get('q');
      // An active search/gospel context must win over a stale daily/random
      // flag left in the URL from a previous view. Otherwise the "currently
      // reading" indicator glitches — keeping the search term but showing the
      // old daily-verse / random-chapter reference. Drop the stale flag (or
      // switch it to 'search') so the indicator stays consistent.
      if ((from === 'daily' || from === 'random') && (searchTerm || gospelMode)) {
        from = gospelMode ? 'gospel' : 'search';
      }
      // When returning to /read from Home (URL has no `from` param), an active
      // search/gospel context must be flagged in the URL so the reader's
      // routerLocation.search effect runs the isFromSearch branch, calls
      // stepToResult, and restores filterMode + selectedVerses + highlight.
      if (!from && (searchTerm || gospelMode)) {
        from = gospelMode ? 'gospel' : 'search';
      }
      let url;
      if (pos.chapter === 0) {
        // Keep the testament-cover URL for GEN/MAT (their title page IS that
        // cover); every other book's title page needs its own book param, or
        // it gets rewritten into the Old Testament cover and silently jumps
        // back to Genesis.
        url = (pos.abbr === 'GEN' || pos.abbr === 'MAT')
          ? `/read?titlePage=${pos.abbr === 'MAT' ? 'new' : 'old'}`
          : `/read?book=${pos.abbr}&chapter=0`;
      } else {
        url = `/read?book=${pos.abbr}&chapter=${pos.chapter}`;
        if (pos.verse) url += `&verse=${pos.verse}`;
        if (from) url += `&from=${from}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
      }
      if (a11yFont && a11yFont !== 'default') url += `${url.includes('?') ? '&' : '?'}font=${a11yFont}`;
      if (url !== window.location.pathname + window.location.search) {
        // IMPORTANT: use React Router's own navigate (replace) instead of a raw
        // window.history.replaceState call. Calling the native History API
        // directly bypasses react-router's internal location tracking, which
        // can desync routerLocation.search from the real URL. Once desynced,
        // a later navigate() to a same-chapter-different-verse reference (e.g.
        // typing "John 3:17" while reading John 3:16) can silently no-op
        // because react-router believes it's already at that location — the
        // read-mode "can't jump to a reference in the same chapter" bug.
        if (navigate) {
          navigate(url, { replace: true });
        } else {
          window.history.replaceState({}, '', url);
        }
      }
    } catch {}
  }, [pos.abbr, pos.chapter, pos.verse, loading, a11yFont, navigate, searchTerm, gospelMode]);
}