import { useRef } from 'react';

export function useReaderNavigation(pos, loadChapter, routerNavigate, routerLocation) {
  const preSearchPosRef = useRef(null);
  const rangeHighlightRef = useRef(false);
  const resultViewRef = useRef('filter');
  const freshNavRef = useRef(false);

  const savePosition = (abbr, chapter, verse = null) => {
    try {
      let verseEnd = null;
      try {
        const prev = JSON.parse(localStorage.getItem('kjb-position') || '{}');
        if (prev.abbr === abbr && prev.chapter === chapter && prev.verse === verse && prev.verseEnd) {
          verseEnd = prev.verseEnd;
        }
      } catch {}
      localStorage.setItem('kjb-position', JSON.stringify({ abbr, chapter, verse, verseEnd }));
    } catch {}
  };

  const navigate = (newAbbr, newChapter, jumpVerse = null, fromDailyVerse = false, fromRandom = false, isAutoAdvance = false, section = null, preserveSearchContext = false, clearSearchNav, setGospelMode, clearGospelNav) => {
    if (!preserveSearchContext) {
      clearSearchNav();
      setGospelMode(false);
      clearGospelNav();
    }
    
    savePosition(newAbbr, newChapter, jumpVerse);
    resultViewRef.current = 'filter';
    rangeHighlightRef.current = false;
    freshNavRef.current = true;
    
    loadChapter(newAbbr, newChapter, jumpVerse);
    
    try {
      let url;
      if (newChapter === 0) {
        // GEN/MAT's title page doubles as the Old/New Testament cover — keep
        // that URL form. Every other book's title page has no testament-cover
        // equivalent, so it must carry its own book abbr instead of being
        // silently coerced into the Old Testament cover (which was reopening
        // Genesis whenever a Prev/BookSelector jump landed on another book's
        // title page).
        url = (newAbbr === 'GEN' || newAbbr === 'MAT')
          ? `/read?titlePage=${newAbbr === 'MAT' ? 'new' : 'old'}`
          : `/read?book=${newAbbr}&chapter=0`;
      }
      else {
        url = `/read?book=${newAbbr}&chapter=${newChapter}`;
        if (jumpVerse) url += `&verse=${jumpVerse}`;
        if (section) url += `&highlight=${section}`;
        // Carry the correct navigation-source context in the URL so the
        // "currently reading" indicator can't glitch. Without this, a plain
        // navigation (e.g. typing a search reference) built a URL with NO
        // `from` flag, and useReaderUrlSync then re-appended the STALE
        // `from=daily`/`from=random` flag left over from a previous daily/
        // random view — making the indicator show "Daily Verse"/"Random
        // Chapter" against the new search reference.
        if (preserveSearchContext) url += '&from=search';
      }
      routerNavigate(url, { replace: isAutoAdvance || false });
    } catch {}
  };

  const returnToChapter = (abbr, chapter, exactY, setFilterMode, setSelectMode, setSelectedVerses, setHighlightedVerses, setHighlightVerse, setHighlightSection, setShowFilterOverlay, loadChapter) => {
    if (!abbr || !chapter) return;
    setFilterMode(false); setSelectMode(false); setSelectedVerses(new Set());
    setHighlightedVerses(new Set()); setHighlightVerse(null); setHighlightSection(null);
    setShowFilterOverlay(false);
    if (typeof exactY === 'number' && exactY > 0) {
      try { localStorage.setItem(`kjb-scroll-${abbr}-${chapter}`, String(Math.round(exactY))); } catch {}
    }
    // Use router navigate (replace) rather than a raw History API call, so
    // react-router's internal location stays in sync with the real URL.
    try { routerNavigate('/read', { replace: true }); } catch {}
    freshNavRef.current = false;
    loadChapter(abbr, chapter, null);
  };

  return { navigate, returnToChapter, preSearchPosRef, rangeHighlightRef, resultViewRef, freshNavRef };
}