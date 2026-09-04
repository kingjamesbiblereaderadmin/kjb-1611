import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, AlignJustify, AlignLeft, List, Columns2, Maximize2, Minimize2, ChevronDown, CheckSquare, Square, Copy, X, BookMarked, ZoomIn, Minus, Plus, Type, Share2, Printer, Highlighter, Bookmark } from 'lucide-react';
import { buildVerseUrl, formatVerseShare, cleanVerseText, centerLine } from '@/lib/formatDailyVerse';
import { BIBLE_BOOKS, getNextBook, getPrevBook } from '@/lib/bibleData';
import { fetchChapter, fetchVerseCount, renderVerseText, renderColophonText, renderSubscriptText, resolveSubscript, resolveEndMarker } from '@/lib/bibleApi';
import SubscriptContent from '@/components/bible/SubscriptContent';
import { getBibleData } from '@/lib/bibleCache';
import { SUBSCRIPTS, COLOPHONS } from '@/lib/bibleSubscripts';
import BookSelector from '@/components/bible/BookSelector';
import ChapterSelector from '@/components/bible/ChapterSelector';
import VerseGrid from '@/components/bible/VerseGrid';
import VerseText from '@/components/bible/VerseText';
import TitlePage from '@/components/bible/TitlePage';
import SelectorSheet from '@/components/bible/SelectorSheet';
import RunningHead from '@/components/bible/RunningHead';
import CurrentlyReadingIndicator from '@/components/bible/CurrentlyReadingIndicator';
import MinimizedHeaderBar from '@/components/bible/MinimizedHeaderBar';
import ReadingRangeBar from '@/components/bible/ReadingRangeBar';
import SelectActionBar from '@/components/bible/SelectActionBar';
import VerseTapBar from '@/components/bible/VerseTapBar';
import { useHeaderHide } from '@/lib/HeaderHideContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accessibility } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getAccessibilityFont, setAccessibilityFont, applyReaderFont } from '@/lib/accessibilityFont';
import { getSearchNav, setSearchNav, setSearchIndex, clearSearchNav, getGospelNav, setGospelNav, setGospelIndex, clearGospelNav } from '@/lib/searchNav';
import { getGospelResults } from '@/lib/gospelVerses';
import { getOccurrenceLabel, scrollToOccurrence, emphasizeOccurrence } from '@/lib/occurrenceLabel';
import { useReaderUrlSync } from '@/lib/useReaderUrlSync';
import { useReaderNavigation } from '@/lib/useReaderNavigation';
import { useToolbarState } from '@/lib/useToolbarState';
import { useSearchAndGospelResults } from '@/lib/useSearchAndGospelResults';
import { resolveBook, formatVerseRange } from '@/lib/readerHelpers';
import { useClosePopovers } from '@/lib/useClosePopovers';
import { printChapterContents } from '@/lib/printHelpers';
import { nativePrintCurrentPage } from '@/lib/nativePrint';
import { nativeShare } from '@/lib/nativeShare';
import { saveVerse, isVerseSaved, removeSavedVerse } from '@/lib/savedVerses';
import { setVerseHighlight, getVerseHighlight, removeVerseHighlight } from '@/lib/verseHighlights';
import { HIGHLIGHT_COLORS } from '@/lib/highlightColors';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { useReadingProgressTracker } from '@/hooks/useReadingProgressTracker';

// Viewport-width checks (window.innerWidth < 640) are unreliable inside some
// Android WebViews (e.g. the native app shell), which can report a much wider
// layout viewport than the device's visible width — causing the desktop popover
// to render instead of the mobile bottom sheet. Detect by actual input type
// (touchscreen vs mouse) and device user agent instead, which reflect the real
// device regardless of how the WebView measures its layout viewport.
const isMobile = () => {
  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  } catch {}
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || window.innerWidth < 640;
};
const STORAGE_KEY = 'kjb-position';

function loadPosition() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (p?.abbr && BIBLE_BOOKS.find(b => b.abbr === p.abbr)) return p;
  } catch {}
  return { abbr: 'GEN', chapter: 1, verse: null };
}

function savePosition(abbr, chapter, verse = null, verseEnd = null) {
  try {
    // verseEnd (a passage range — either a lookup/search reference like
    // "1 Cor 15:1-4" or a manual "Select verses -> Read Selected") IS
    // persisted here so the range highlight survives an app close/reopen.
    // Callers that want a range to survive pass it explicitly; anyone calling
    // with just (abbr, chapter, verse) still gets verseEnd: null as before.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ abbr, chapter, verse, verseEnd: verseEnd || null }));
    // Dispatch a storage event so the settings sync push listener picks up
    // the new position and pushes it to the cloud for cross-device sync.
    // localStorage.setItem in the same tab does NOT fire 'storage' natively.
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

async function copyToClipboard(text) {
  // Prefer the async Clipboard API — execCommand('copy') is deprecated and
  // silently fails (returns false WITHOUT throwing) in many modern browsers
  // and PWA standalone mode, so the old catch-fallback never ran and nothing
  // was copied. The Clipboard API returns a rejected promise on real failure,
  // so we only fall back to the textarea hack when it's genuinely unavailable.
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return; } catch {}
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(textarea);
}

export default function BibleReader() {
  const { hideHeader, setHideHeader } = useHeaderHide();
  const routerLocation = useLocation();
  const routerNavigate = useNavigate();
  const [pos, setPos] = useState(() => {
    const p = loadPosition();
    return { ...p, verse: null };
  });
  const [verses, setVerses] = useState([]);
  const [colophon, setColophon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightVerse, setHighlightVerse] = useState(pos.verse || null);
  const [highlightSection, setHighlightSection] = useState(null);
  const [highlightedVerses, setHighlightedVerses] = useState(new Set());
  const [verseCount, setVerseCount] = useState(0);

  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [flowMode, setFlowMode] = useState(() => {
    try {
      const v = localStorage.getItem('kjb-flow');
      if (v === 'line' || v === 'paragraph') return v;
      return localStorage.getItem('kjb-layout') === 'paragraph' ? 'paragraph' : 'line';
    } catch { return 'line'; }
  });
  const [columnOn, setColumnOn] = useState(() => {
    try {
      const v = localStorage.getItem('kjb-column');
      if (v === 'true') return true;
      if (v === 'false') return false;
      if (localStorage.getItem('kjb-layout') === 'column') return true;
      // Default: two-column on desktop, single-column on mobile.
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch { return false; }
  });
  const paragraphMode = flowMode === 'paragraph';
  const columnMode = columnOn;
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(() => {
    try { return parseInt(localStorage.getItem('kjb-zoom') || '100'); } catch { return 100; }
  });
  const [showZoomPopover, setShowZoomPopover] = useState(false);
  const [showFontPopover, setShowFontPopover] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState(() => {
    try { return localStorage.getItem('kjb-highlight-color') || 'yellow'; } catch { return 'yellow'; }
  });
  const chooseHighlightColor = (name) => {
    setHighlightColor(name);
    try { localStorage.setItem('kjb-highlight-color', name); } catch {}
  };
  const [selectedVerses, setSelectedVerses] = useState(new Set());
  const [selectedSections, setSelectedSections] = useState(new Set());
  const [filterMode, setFilterMode] = useState(false);
  const [fontFamily, setFontFamily] = useState(() => {
    try { return localStorage.getItem('kjb-reader-font-family') || 'serif'; } catch { return 'serif'; }
  });
  const [a11yFont, setA11yFont] = useState(getAccessibilityFont);
  const a11yActive = a11yFont !== 'default';

  useEffect(() => {
    if (a11yFont !== 'default' && fontFamily === 'cursive') {
      setFontFamily('serif');
      try { localStorage.setItem('kjb-reader-font-family', 'serif'); } catch {}
    }
  }, []);
  
  const [searchTerm, setSearchTerm] = useState(null);
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  const [searchTotalResults, setSearchTotalResults] = useState(0);
  const searchClearedRef = useRef(false);
  const lastReadingClearedRef = useRef(false);
  // Tracks whether this is the very first time the URL-driven navigation
  // effect has run for this mount (e.g. a hard page load / refresh, where
  // restoring a persisted search/gospel context makes sense). After that,
  // it's a live in-app navigation to a new reference, and a same-chapter
  // match with old toolbar state should NOT drag along a stale search term.
  const initialNavMountRef = useRef(true);

  const [gospelMode, setGospelMode] = useState(false);
  const [gospelResultIndex, setGospelResultIndex] = useState(() => getGospelNav().index);
  const [gospelTotalResults, setGospelTotalResults] = useState(() => getGospelNav().results.length);

  const handleFontChange = (font) => {
    if (font === 'dyslexic' || font === 'hyperlegible') {
      setAccessibilityFont(font);
      setA11yFont(font);
      window.dispatchEvent(new Event('storage'));
      return;
    }
    try { localStorage.setItem('kjb-reader-font-family', font); } catch {}
    setFontFamily(font);
    applyReaderFont(font);
    if (a11yFont !== 'default') {
      setAccessibilityFont('default');
      setA11yFont('default');
    }
    window.dispatchEvent(new Event('storage'));
  };

  const getFontFamilyValue = (family) => {
    if (family === 'cursive') return "'Dancing Script', cursive";
    if (family === 'serif') return "'Merriweather', 'Cormorant Garamond', Georgia, serif";
    if (family === 'sans-serif') return "'Inter', system-ui, -apple-system, sans-serif";
    if (family === 'monospace') return "'Courier New', monospace";
    if (family === 'comic-sans') return "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', system-ui, sans-serif";
    if (family === 'times') return "'Times New Roman', Times, serif";
    if (family === 'dyslexic') return "'OpenDyslexic', 'Comic Sans MS', sans-serif";
    if (family === 'hyperlegible') return "'Atkinson Hyperlegible', system-ui, sans-serif";
    return family;
  };

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  // Verse(s) tapped in normal reading mode — drives the VerseTapBar shown
  // under the main toolbar instead of a floating tap-anchored popover.
  // Tapping toggles membership in the set, so tapping more than one verse
  // builds up a multi-verse selection (tapping an already-tapped verse
  // removes just that one; other taps add more verses to the group).
  const [tappedVerses, setTappedVerses] = useState(new Set());
  const toggleTappedVerse = (vNum) => {
    const n = parseInt(vNum, 10);
    setTappedVerses(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };
  // Forces a re-render when a highlight is set/removed anywhere (including from
  // the VerseTapBar's own Highlight dropdown below) so the tap bar's
  // "Highlighted" state stays in sync instead of only refreshing on the next
  // unrelated re-render.
  const [, forceHighlightRefresh] = useState(0);
  useEffect(() => {
    const sync = () => forceHighlightRefresh(n => n + 1);
    window.addEventListener('kjb-highlights-changed', sync);
    return () => window.removeEventListener('kjb-highlights-changed', sync);
  }, []);
  const [tapCopyFeedback, setTapCopyFeedback] = useState(false);
  const [tapShareFeedback, setTapShareFeedback] = useState(false);
  const [tapSaveFeedback, setTapSaveFeedback] = useState(false);
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);
  const [lastReadingPos, setLastReadingPos] = useState(() => {
    try {
      const saved = localStorage.getItem('kjb-last-reading');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
      return null;
    } catch { return null; }
  });
  const [prevReadingSession, setPrevReadingSession] = useState(() => {
    try {
      const saved = localStorage.getItem('kjb-prev-reading-session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
      return null;
    } catch { return null; }
  });

  useReadingProgressTracker(pos, loading);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        setFullscreen(true);
        setHideHeader(true);
      } else {
        await document.exitFullscreen?.();
        setFullscreen(false);
        setHideHeader(false);
      }
    } catch {}
  };

  useEffect(() => {
    const handler = () => {
      const apiFull = !!document.fullscreenElement;
      const browserFull = Math.abs(window.innerHeight - window.screen.height) < 2;
      setFullscreen(apiFull || browserFull);
    };
    handler();
    document.addEventListener('fullscreenchange', handler);
    window.addEventListener('resize', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      setShowBookPicker(false); setShowChapterPicker(false); setShowVersePicker(false);
      setShowZoomPopover(false); setShowFontPopover(false);
    };
  }, [routerLocation.pathname]);


  const toggleFlow = () => {
    const next = flowMode === 'line' ? 'paragraph' : 'line';
    setFlowMode(next);
    try { localStorage.setItem('kjb-flow', next); } catch {}
    window.dispatchEvent(new Event('storage'));
  };

  const toggleColumn = () => {
    setColumnOn(prev => {
      const next = !prev;
      try { localStorage.setItem('kjb-column', String(next)); } catch {}
      window.dispatchEvent(new Event('storage'));
      return next;
    });
  };

  const adjustZoom = (delta) => {
    const newZoom = Math.max(75, Math.min(250, zoomLevel + delta));
    setZoomLevel(newZoom);
    try { localStorage.setItem('kjb-zoom', String(newZoom)); } catch {}
    window.dispatchEvent(new Event('storage'));
  };

  const handleZoomChange = (e) => {
    const newZoom = parseInt(e.target.value);
    setZoomLevel(newZoom);
    try { localStorage.setItem('kjb-zoom', String(newZoom)); } catch {}
    window.dispatchEvent(new Event('storage'));
  };

  const toggleSelectMode = () => {
    setTappedVerses(new Set());
    if (selectMode) {
      setSelectMode(false); setSelectedVerses(new Set()); setFilterMode(false);
    } else {
      setSelectMode(true);
    }
  };

  // Clear the verse tap bar whenever the chapter/book changes.
  useEffect(() => { setTappedVerses(new Set()); }, [pos.abbr, pos.chapter]);

  const tappedVerseNums = useMemo(() => [...tappedVerses].sort((a, b) => a - b), [tappedVerses]);
  const tappedVerseObjs = useMemo(
    () => tappedVerseNums.map(n => verses.find(v => parseInt(v.verse, 10) === n)).filter(Boolean),
    [tappedVerseNums, verses]
  );
  const buildTapShareText = () => {
    if (tappedVerseNums.length === 0) return '';
    const first = tappedVerseNums[0], last = tappedVerseNums[tappedVerseNums.length - 1];
    const isFirst = first === 1;
    const isLast = verses.length > 0 && last === parseInt(verses[verses.length - 1].verse, 10);
    const range = formatVerseRange(tappedVerseNums);
    // tappedVerseObjs[0].heading covers Psalm 119's per-verse acrostic headings
    // (ALEPH, BETH, ...), which chapterSubscript doesn't carry (it's null for
    // Ps119) — falls back to it so tapping e.g. v9 alone still shows "BETH".
    return formatVerseShare({
      text: tappedVerseObjs.map(v => v.text).join(' '),
      subscript: isFirst ? (chapterSubscript || null) : null,
      heading: tappedVerseObjs[0]?.heading || null,
      colophon: isLast ? (colophon || null) : null,
      ref: `${book.shortName} ${pos.chapter}:${range}`,
      url: buildVerseUrl({ abbr: pos.abbr, chapter: pos.chapter, verse: first, verseEnd: last > first ? last : undefined }),
    });
  };
  const handleTapCopy = async () => {
    await copyToClipboard(buildTapShareText());
    setTapCopyFeedback(true);
    setTimeout(() => setTapCopyFeedback(false), 1800);
  };
  const handleTapShare = async () => {
    const text = buildTapShareText();
    if (nativeShare({ text })) return;
    try { if (navigator.share) return await navigator.share({ text }); } catch (err) { if (err?.name === 'AbortError') return; }
    await copyToClipboard(text);
    setTapShareFeedback(true);
    setTimeout(() => setTapShareFeedback(false), 1800);
  };
  const handleTapSave = () => {
    if (tappedVerseNums.length === 0) return;
    const allSaved = tappedVerseNums.every(n => isVerseSaved(pos.abbr, pos.chapter, n));
    if (allSaved) {
      tappedVerseNums.forEach(n => removeSavedVerse(pos.abbr, pos.chapter, n));
    } else {
      tappedVerseObjs.forEach(v => {
        const n = parseInt(v.verse, 10);
        saveVerse({ abbr: pos.abbr, chapter: pos.chapter, verse: n, ref: `${book.shortName} ${pos.chapter}:${n}`, text: cleanVerseText(v.text), folder: 'Favorites' });
      });
      setTapSaveFeedback(true);
      setTimeout(() => setTapSaveFeedback(false), 1800);
    }
  };
  const handleTapHighlightToggle = (colorName) => {
    if (tappedVerseNums.length === 0) return;
    if (!colorName) { tappedVerseNums.forEach(n => removeVerseHighlight(pos.abbr, pos.chapter, n)); return; }
    tappedVerseNums.forEach(n => setVerseHighlight(pos.abbr, pos.chapter, n, colorName));
  };

  const activateSelectFromVerse = (verseNum) => {
    setSelectMode(true);
    setSelectedVerses(new Set([parseInt(verseNum, 10)]));
  };

  const toggleVerseSelect = (verseNum) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      const parsed = parseInt(verseNum, 10);
      next.has(parsed) ? next.delete(parsed) : next.add(parsed);
      return next;
    });
  };

  // Clear section selection whenever select mode is turned off (covers Cancel,
  // Clear, Read selected, and any navigation that exits select mode).
  useEffect(() => {
    if (!selectMode) setSelectedSections(new Set());
  }, [selectMode]);

  // In Select mode the subscript/colophon blocks toggle a selected state
  // (included in copy); outside Select mode they keep the single-highlight behaviour.
  const sectionActive = (key) => selectMode ? selectedSections.has(key) : highlightSection === key;
  const handleSectionClick = (key) => {
    if (selectMode) {
      setSelectedSections(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
    } else {
      setHighlightSection(s => s === key ? null : key);
    }
  };

  const selectAllVerses = () => {
    setSelectedVerses(new Set(verses.map(v => parseInt(v.verse, 10))));
    const next = new Set();
    if (chapterSubscript) next.add('subscript');
    if (colophon) next.add('colophon');
    setSelectedSections(next);
  };

  const generateShareText = () => {
    // Coerce verse numbers to ints — selectedVerses holds ints (from
    // toggleVerseSelect) while cached v.verse can be a string, so a plain
    // toUse.has(v.verse) match silently produced an empty selection and an
    // empty clipboard (copy "didn't work").
    const toUse = selectedVerses.size > 0 ? selectedVerses : new Set(verses.map(v => parseInt(v.verse, 10)));
    const verseInSel = (v) => toUse.has(parseInt(v.verse, 10));
    const selectedVersesList = verses.filter(verseInSel).sort((a, b) => parseInt(a.verse, 10) - parseInt(b.verse, 10));

    const groups = [];
    let group = [];
    selectedVersesList.forEach((v) => {
      const vn = parseInt(v.verse, 10);
      if (group.length === 0 || vn === parseInt(group[group.length - 1].verse, 10) + 1) {
        group.push(v);
      } else {
        groups.push(group);
        group = [v];
      }
    });
    if (group.length) groups.push(group);

    const chapterSubscript = resolveSubscript(book.apiName, pos.chapter) || null;
    const lastVerseNum = verses.length ? parseInt(verses[verses.length - 1].verse, 10) : null;
    // Subscript/colophon are included when explicitly selected (Select-mode tap)
    // or, when no section has been explicitly toggled, when their anchor verse
    // (1 / last) is in the selection — preserving the pre-tap behaviour.
    const anySectionToggled = selectedSections.size > 0;
    const wantSub = !!chapterSubscript && (selectedSections.has('subscript') || (!anySectionToggled && groups.some(g => g.some(v => parseInt(v.verse, 10) === 1))));
    const wantCol = !!colophon && (selectedSections.has('colophon') || (!anySectionToggled && groups.some(g => g.some(v => parseInt(v.verse, 10) === lastVerseNum))));
    const blocks = groups.map((g, gi) => {
      const nums = g.map(v => parseInt(v.verse, 10));
      const range = formatVerseRange(nums);
      const first = nums[0], last = nums[nums.length - 1];
      // g[0].heading covers Psalm 119's per-verse acrostic headings (ALEPH,
      // BETH, ...) — chapterSubscript is null for Ps119, and unlike it a
      // heading can start ANY group (not just the first), so check every
      // group's own first verse rather than gating on gi === 0.
      return formatVerseShare({
        text: g.map(v => cleanVerseText(v.text)).join(' '),
        subscript: gi === 0 && wantSub ? chapterSubscript : null,
        heading: g[0]?.heading || null,
        colophon: gi === groups.length - 1 && wantCol ? colophon : null,
        ref: `${book.shortName} ${pos.chapter}:${range}`,
        url: buildVerseUrl({ abbr: pos.abbr, chapter: pos.chapter, verse: first, verseEnd: last > first ? last : undefined, from: searchTerm ? 'search' : undefined }),
      });
    });
    return blocks.join('\n\n———\n\n');
  };

  const handleCopySelected = async () => {
    const lines = generateShareText();
    await copyToClipboard(lines);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1800);
  };

  // Per-verse copy: each selected verse's text on its own line, followed by a
  // single combined reference at the end (not a ref per verse).
  const generatePerVerseText = () => {
    // Coerce verse numbers to ints (see generateShareText) — cached v.verse can
    // be a string while selectedVerses holds ints, which broke the filter.
    const toUse = selectedVerses.size > 0 ? selectedVerses : new Set(verses.map(v => parseInt(v.verse, 10)));
    const verseInSel = (v) => toUse.has(parseInt(v.verse, 10));
    const selectedVersesList = verses.filter(verseInSel).sort((a, b) => parseInt(a.verse, 10) - parseInt(b.verse, 10));

    const verseLines = selectedVersesList.map(v => {
      const line = `${parseInt(v.verse, 10)} ${cleanVerseText(v.text).replace(/^¶\s*/, '')}`;
      // Psalm 119's acrostic heading (ALEPH, BETH, ...) lives on the verse
      // itself and can precede ANY verse in the list, not just the first —
      // insert it right above the verse it belongs to. chapterSub (below)
      // only ever covers a chapter-wide title attached to verse 1, which
      // doesn't apply to Ps119 (chapterSub is null there).
      return v.heading ? `${v.heading}\n${line}` : line;
    });
    const nums = selectedVersesList.map(v => parseInt(v.verse, 10));
    const range = formatVerseRange(nums);
    const ref = `${book.shortName} ${pos.chapter}:${range}`;
    const first = nums[0], last = nums[nums.length - 1];
    const url = buildVerseUrl({ abbr: pos.abbr, chapter: pos.chapter, verse: first, verseEnd: last > first ? last : undefined, from: searchTerm ? 'search' : undefined });

    // Include the Psalm superscription (subscript) and epistle colophon when
    // explicitly selected (Select-mode tap) or — when no section has been
    // toggled — when their anchor verse (1 / last) is in the selection.
    const parts = [];
    const includesV1 = selectedVersesList.some(v => parseInt(v.verse, 10) === 1);
    const chapterSub = resolveSubscript(book.apiName, pos.chapter) || null;
    const lastVerseNum = verses.length ? parseInt(verses[verses.length - 1].verse, 10) : null;
    const includesLast = lastVerseNum != null && selectedVersesList.some(v => parseInt(v.verse, 10) === lastVerseNum);
    const anySectionToggled = selectedSections.size > 0;
    // Copying more than one verse keeps the reference at the top (no dash);
    // a single verse moves it to the end with a dash, matching the
    // paragraph-copy citation style.
    const isMultiVerse = selectedVersesList.length > 1;
    if (isMultiVerse) parts.push(centerLine(`${ref} (KJB)`));
    if (chapterSub && (selectedSections.has('subscript') || (!anySectionToggled && includesV1))) {
      parts.push(`¶ ${cleanVerseText(chapterSub).replace(/^[\u00B6\uFFFD¶]\s*/, '')}`);
    }
    parts.push(verseLines.join('\n\n'));
    if (colophon && (selectedSections.has('colophon') || (!anySectionToggled && includesLast))) {
      parts.push(`¶ ${cleanVerseText(colophon).replace(/^[\u00B6\uFFFD¶]\s*/, '')}`);
    }
    if (!isMultiVerse) parts.push(`— ${ref} (KJB)`);
    parts.push(`Read more: <${url}>`);
    return parts.join('\n\n');
  };

  const handleCopyPerVerse = async () => {
    const lines = generatePerVerseText();
    await copyToClipboard(lines);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1800);
  };

  const handleSaveSelected = () => {
    if (!selectedVerses.size) return;
    [...selectedVerses].sort((a, b) => a - b).forEach((vNum) => {
      const v = verses.find(vv => parseInt(vv.verse, 10) === vNum);
      if (!v) return;
      saveVerse({ abbr: pos.abbr, chapter: pos.chapter, verse: vNum, ref: `${book.shortName} ${pos.chapter}:${vNum}`, text: cleanVerseText(v.text), folder: 'Favorites' });
    });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1800);
  };

  const handleHighlightSelected = (color) => {
    if (!selectedVerses.size) return;
    [...selectedVerses].forEach((vNum) => setVerseHighlight(pos.abbr, pos.chapter, vNum, color || highlightColor));
  };

  const handleReadSelected = () => {
    setFilterMode(true);
    setSelectMode(false);
    if (selectedVerses.size > 0) {
      const first = Math.min(...selectedVerses);
      const last = Math.max(...selectedVerses);
      let url = `/read?book=${pos.abbr}&chapter=${pos.chapter}&verse=${first}`;
      if (last > first) url += `&verseEnd=${last}`;
      try {
        // Use router navigate (not a raw History API call) so react-router's
        // tracked location stays in sync with the real URL — otherwise the
        // bottom nav's per-tab history and the URL-sync effect read a stale
        // location and can jump back into this filtered passage later.
        routerNavigate(url, { replace: true });
        // Persist verseEnd too now, consistent with lookup/search ranges —
        // reopening the reader restores this filtered passage instead of
        // collapsing to just the first verse.
        savePosition(pos.abbr, pos.chapter, first, last > first ? last : null);
      } catch {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowFilterOverlay(false), 3000);
  };

  const [shareFeedback, setShareFeedback] = useState(false);
  const handleShareChapter = async () => {
    const shareText = generateShareText();
    const hasSel = selectedVerses.size > 0;
    const ref = hasSel ? `${book.shortName} ${pos.chapter}:${formatVerseRange([...selectedVerses])}` : `${book.shortName} ${pos.chapter}`;
    if (nativeShare({ title: `${ref} — KJB Reader`, text: shareText })) return;
    try {
      if (navigator.share) return await navigator.share({ title: `${ref} — KJB Reader`, text: shareText });
    } catch (err) { if (err?.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 1800);
    } catch {}
  };

  const handleSharePerVerse = async () => {
    const shareText = generatePerVerseText();
    const hasSel = selectedVerses.size > 0;
    const ref = hasSel ? `${book.shortName} ${pos.chapter}:${formatVerseRange([...selectedVerses])}` : `${book.shortName} ${pos.chapter}`;
    if (nativeShare({ title: `${ref} — KJB Reader`, text: shareText })) return;
    try {
      if (navigator.share) return await navigator.share({ title: `${ref} — KJB Reader`, text: shareText });
    } catch (err) { if (err?.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 1800);
    } catch {}
  };

  const [shareLinkFeedback, setShareLinkFeedback] = useState(false);
  const handleShareLink = async () => {
    const hasSel = selectedVerses.size > 0;
    const ref = hasSel ? `${book.shortName} ${pos.chapter}:${formatVerseRange([...selectedVerses])}` : `${book.shortName} ${pos.chapter}`;
    const url = buildVerseUrl({ abbr: pos.abbr, chapter: pos.chapter, verse: hasSel ? Math.min(...selectedVerses) : null, verseEnd: hasSel ? Math.max(...selectedVerses) : null });
    // Wrap the link in <> so chat apps don't render a link embed/preview.
    const shareText = `${ref} (KJB)\n\n<${url}>`;
    if (nativeShare({ title: `${ref} — KJB Reader`, text: shareText })) return;
    try {
      if (navigator.share) return await navigator.share({ title: `${ref} — KJB Reader`, text: shareText, url });
    } catch (err) { if (err?.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareLinkFeedback(true);
      setTimeout(() => setShareLinkFeedback(false), 1800);
    } catch {}
  };

  const topRef = useRef(null);
  const readerContentRef = useRef(null);
  const setZoomPersist = useCallback((next) => {
    setZoomLevel(next);
    try { localStorage.setItem('kjb-zoom', String(next)); } catch {}
  }, []);
  usePinchZoom(readerContentRef, zoomLevel, setZoomPersist);

  const columnsContainerRef = useRef(null);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const book = BIBLE_BOOKS.find(b => b.abbr === pos.abbr) || BIBLE_BOOKS[0];
  // Subscript for the current chapter, honouring any admin override. Recomputed
  // when verses reload (loadOverrides populates the cache by then).
  const chapterSubscript = resolveSubscript(book.apiName, pos.chapter);

  useReaderUrlSync(pos, loading, a11yFont, routerNavigate, searchTerm, gospelMode);
  const isViewingTitlePage = pos.chapter === 0;

  const loadChapter = useCallback(async (bookAbbr, chapter, jumpVerse, jumpVerseEnd = null) => {
    setLoading(true); setError(null); setVerses([]); setColophon(null);
    (document.getElementById('kjb-scroll') || window).scrollTo({ top: 0 });
    const b = BIBLE_BOOKS.find(bk => bk.abbr === bookAbbr);
    if (!b) { setError('Book not found'); setLoading(false); return; }
    if (!jumpVerse) setHighlightVerse(null);
    if (chapter === 0) {
      setVerseCount(0); setLoading(false); setHighlightVerse(jumpVerse || null);
      savePosition(bookAbbr, chapter);
      return;
    }
    try {
      const data = await fetchChapter(b.apiName, chapter);
      setVerses(data.verses); setColophon(data.colophon || null); setVerseCount(data.verses.length);
      if (jumpVerse) setHighlightVerse(jumpVerse);
      // jumpVerseEnd, when the caller passed one, is what lets a lookup range
      // (e.g. "1 Cor 15:1-4") survive this save instead of collapsing to just
      // the first verse the moment the chapter finishes loading.
      savePosition(bookAbbr, chapter, jumpVerse || null, jumpVerseEnd || null);
    } catch (err) {
      setError('Failed to load chapter. Please check your connection.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    getBibleData().catch(err => console.error('[BibleReader] Cache preload failed:', err));
    // Restore toolbar state from localStorage on mount (persists across app restarts)
    try {
      const savedState = localStorage.getItem('kjb-reader-toolbar-state');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state && state.hasSearchContext && state.searchTerm) {
          searchClearedRef.current = false;
          setSearchTerm(state.searchTerm);
          setSearchResultIndex(state.searchResultIndex || 0);
          setSearchTotalResults(state.searchTotalResults || 0);
        }
        if (state && state.hasGospelContext) {
          const g = getGospelNav();
          if (g.results.length > 0) {
            setGospelMode(true);
            setGospelResultIndex(g.index);
            setGospelTotalResults(g.results.length);
          }
        }
      }
    } catch {}
    // ALSO restore legacy search context (fallback)
    try {
      const term = localStorage.getItem('kjb-search-term');
      const resultsRaw = localStorage.getItem('kjb-search-results');
      const index = localStorage.getItem('kjb-search-index');
      if (term && resultsRaw && !searchTerm) {
        const results = JSON.parse(resultsRaw);
        if (results.length > 0) {
          searchClearedRef.current = false;
          setSearchTerm(term);
          setSearchResultIndex(index ? parseInt(index, 10) : 0);
          setSearchTotalResults(results.length);
        }
      }
    } catch {}
    try {
      const saved = localStorage.getItem('kjb-last-reading');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) setLastReadingPos(parsed);
      }
    } catch {}
    try {
      const g = localStorage.getItem('kjb-gospel-results');
      if (g) {
        const results = JSON.parse(g);
        const idx = parseInt(localStorage.getItem('kjb-gospel-index') || '0', 10);
        if (results.length > 0) {
          setGospelMode(true);
          setGospelResultIndex(idx);
          setGospelTotalResults(results.length);
        }
      }
    } catch {}
    
    const initParams = new URLSearchParams(window.location.search);
    const urlBook = initParams.get('book');
    const urlChapter = initParams.get('chapter');
    const urlVerse = initParams.get('verse');
    const urlTitlePage = initParams.get('titlePage');
    if (urlTitlePage === 'old' || urlTitlePage === 'new') {
      const abbr = urlTitlePage === 'new' ? 'MAT' : 'GEN';
      setPos({ abbr, chapter: 0, verse: null });
      loadChapter(abbr, 0, null);
      return;
    }
    
    const urlBookObj = resolveBook(urlBook);
    if (urlBookObj && urlChapter) {
      const chapterNum = parseInt(urlChapter, 10);
      const verseNum = urlVerse ? parseInt(urlVerse, 10) : null;
      // Read verseEnd from the URL itself FIRST -- a cold-started deep link
      // (a shared "Acts 11:6-9" link tapped from outside the app, e.g.) has
      // the range right there in its own query string, and trusting it
      // directly is far more reliable than the localStorage fallback below,
      // which only happens to be correct when the device was ALREADY on this
      // exact book/chapter for some unrelated reason -- for a genuine fresh
      // cold start it's almost always empty or about a different passage
      // entirely, silently truncating the shared range down to one verse.
      let verseEnd = initParams.get('verseEnd') ? parseInt(initParams.get('verseEnd'), 10) : null;
      if (!verseEnd) {
        try {
          const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (p.abbr === urlBookObj.abbr && p.chapter === chapterNum && p.verseEnd) verseEnd = p.verseEnd;
        } catch {}
      }
      const isRange = verseNum && verseEnd && verseEnd > verseNum;
      if (isRange) {
        const range = new Set();
        for (let v = verseNum; v <= verseEnd; v++) range.add(v);
        setSelectedVerses(range); setHighlightedVerses(range); setFilterMode(true);
      }
      setPos({ abbr: urlBookObj.abbr, chapter: chapterNum, verse: verseNum });
      setHighlightVerse(verseNum || null);
      loadChapter(urlBookObj.abbr, chapterNum, verseNum, isRange ? verseEnd : null);
    } else {
      let restored = false;
      try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (p && p.abbr && p.chapter) {
          const isRange = p.verse && p.verseEnd && p.verseEnd > p.verse;
          if (isRange) {
            const range = new Set();
            for (let v = p.verse; v <= p.verseEnd; v++) range.add(v);
            setSelectedVerses(range); setHighlightedVerses(range); setFilterMode(true);
          }
          setPos({ abbr: p.abbr, chapter: p.chapter, verse: p.verse || null });
          setHighlightVerse(p.verse || null);
          loadChapter(p.abbr, p.chapter, p.verse || null, isRange ? p.verseEnd : null);
          restored = true;
        }
      } catch {}
      if (!restored) loadChapter(pos.abbr, pos.chapter, null);
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(routerLocation.search);
    const urlTitlePage = urlParams.get('titlePage');
    if (urlTitlePage === 'old' || urlTitlePage === 'new') {
      const abbr = urlTitlePage === 'new' ? 'MAT' : 'GEN';
      setSearchTerm(null); setGospelMode(false); setFilterMode(false);
      setSelectedVerses(new Set()); setHighlightedVerses(new Set());
      setPos({ abbr, chapter: 0, verse: null });
      loadChapter(abbr, 0, null);
      return;
    }
    const urlBookObj = resolveBook(urlParams.get('book'));
    const urlChapter = urlParams.get('chapter');
    const isFromSearch = urlParams.get('from') === 'search';
    const isFromDaily = urlParams.get('from') === 'daily';
    const isFromRandom = urlParams.get('from') === 'random';
    const isFromGospel = urlParams.get('from') === 'gospel';
    const urlHighlightSection = urlParams.get('highlight');
    setHighlightSection(urlHighlightSection === 'colophon' || urlHighlightSection === 'subscript' ? urlHighlightSection : null);
    // Capture whether this is the first time this effect runs for this mount
    // (hard page load / refresh) BEFORE flipping the ref, so every subsequent
    // in-app navigation is correctly treated as non-initial.
    const wasInitialNavMount = initialNavMountRef.current;
    initialNavMountRef.current = false;
    
    if (urlBookObj && urlChapter) {
      const chapterNum = parseInt(urlChapter, 10);
      const verseNum = urlParams.get('verse') ? parseInt(urlParams.get('verse'), 10) : null;
      let verseEnd = urlParams.get('verseEnd') ? parseInt(urlParams.get('verseEnd'), 10) : null;
      try {
        if (!verseEnd) {
          const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (p.abbr === urlBookObj.abbr && p.chapter === chapterNum && p.verseEnd) verseEnd = p.verseEnd;
        }
      } catch {}
      if (verseNum && verseEnd && verseEnd > verseNum) {
        const range = new Set();
        for (let v = verseNum; v <= verseEnd; v++) range.add(v);
        setSelectedVerses(range); setHighlightedVerses(range); setFilterMode(true);
      }
      
      if (isFromGospel) {
        let g = getGospelNav();
        if (g.results.length === 0) {
          const results = getGospelResults();
          const idx = Math.max(0, results.findIndex(r => r.abbr === urlBookObj.abbr && r.chapter === chapterNum && r.verse === verseNum));
          setGospelNav(results, idx);
          g = { results, index: idx };
        }
        if (g.results.length > 0) {
          setGospelMode(true); setGospelResultIndex(g.index); setGospelTotalResults(g.results.length);
          if (g.results[g.index]) { stepToResult(g.results[g.index]); return; }
        }
      } else {
        setGospelMode(false); clearGospelNav();
      }
      
      if (isFromSearch) {
        let { term, index, results } = getSearchNav();
        // Only a real keyword search carries a `q` param. A plain reference/passage
        // jump from the search bar or ContentsPage also routes through from=search
        // (to reuse the single-result highlight path) but has no `q` — it must NOT
        // be tagged as an ongoing search context, or useToolbarState's focus-listener
        // restore replays it (snapping the reader back to that single-verse filtered
        // view) after the app is backgrounded and reopened.
        // EXCEPTION: a multi-reference stepper (goToMultiReference / goToPassage)
        // also has no `q` but carries 2+ results — it needs the same ongoing-context
        // treatment as a keyword search so the prev/next stepper arrows render
        // (CurrentlyReadingIndicator gates on totalResults > 1 + an active term)
        // and the highlight survives the toolbar-state restore/focus cycle.
        const qParam = urlParams.get('q');
        const isMultiResultNav = !qParam && results.length > 1;
        if (qParam && results.length === 0) {
          results = [{ abbr: urlBookObj.abbr, chapter: chapterNum, verse: verseNum, verseEnd: verseEnd || null }];
          index = 0; setSearchNav(results, index, qParam);
        }
        if (qParam || isMultiResultNav) {
          searchClearedRef.current = false; setSearchTerm(qParam || term || '');
          setSearchResultIndex(index); setSearchTotalResults(results.length);
        } else {
          searchClearedRef.current = true;
          setSearchTerm('');
          setSearchResultIndex(0);
          setSearchTotalResults(0);
        }
        if (results[index]) { stepToResult(results[index]); return; }
      } else if (!isFromDaily && !isFromRandom) {
        // Keep the "Daily Verse" / "Random Chapter" indicator state in sync with
        // what's actually persisted. goTo()/keyword search clear kjb-last-reading
        // when the user deliberately jumps to a reference, so if it's gone here
        // the stale lastReadingPos must be cleared too — otherwise the indicator
        // stays stuck on "Daily Verse" (showing the newly-typed reference) when
        // the new verse happens to fall in the same chapter as the daily verse.
        try {
          const lastReadingRaw = localStorage.getItem('kjb-last-reading');
          setLastReadingPos(lastReadingRaw ? JSON.parse(lastReadingRaw) : null);
        } catch { setLastReadingPos(null); }

        // Try to restore search/gospel context from localStorage when returning to the same chapter.
        // Only do this on the initial mount (hard page load / refresh) — a live
        // in-app navigation to another reference that merely happens to land on
        // the same chapter should NOT drag along a stale search term.
        // Skip restoration for daily/random - they should NOT show search toolbar
        const savedState = localStorage.getItem('kjb-reader-toolbar-state');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            if (state.abbr === urlBookObj?.abbr && state.chapter === chapterNum && wasInitialNavMount) {
              // Restore search context with persisted data
              if (state.hasSearchContext && state.searchTerm) {
                searchClearedRef.current = false;
                setSearchTerm(state.searchTerm);
                setSearchResultIndex(state.searchResultIndex || 0);
                setSearchTotalResults(state.searchTotalResults || 0);
              }
              // Restore gospel context
              if (state.hasGospelContext) {
                const g = getGospelNav();
                if (g.results.length > 0) {
                  setGospelMode(true);
                  setGospelResultIndex(g.index);
                  setGospelTotalResults(g.results.length);
                }
              }
              // Restore the "verse only" vs "full chapter" view and any
              // selected verses ONLY when this was an active search or gospel
              // session — otherwise reopening would jump back into a "Read
              // Selected" passage filter from a previous session.
              const hadContext = (state.hasSearchContext && state.searchTerm) || state.hasGospelContext;
              if (hadContext) {
                if (state.filterMode !== undefined) setFilterMode(state.filterMode);
                if (state.selectedVerses && state.selectedVerses.length > 0) {
                  const newSet = new Set(state.selectedVerses);
                  setSelectedVerses(newSet);
                  setHighlightedVerses(newSet);
                }
              }
            } else if (searchTerm || gospelMode) {
              // Landed on a chapter with no saved toolbar state for it (e.g. a
              // freshly typed reference) — don't drag along the previous
              // search/gospel indicator.
              searchClearedRef.current = true;
              setSearchTerm(null); setSearchResultIndex(0); setSearchTotalResults(0);
              setGospelMode(false); clearGospelNav();
            }
          } catch {}
        } else if (searchTerm || gospelMode) {
          searchClearedRef.current = true;
          setSearchTerm(null); setSearchResultIndex(0); setSearchTotalResults(0);
          setGospelMode(false); clearGospelNav();
        }
      }
      
      if (posRef.current.abbr === urlBookObj.abbr && posRef.current.chapter === chapterNum && posRef.current.verse === verseNum && !isFromGospel) {
        return;
      }
      
      if (isFromDaily || isFromRandom) {
        // Clear any existing search context when coming from daily/random
        searchClearedRef.current = true; setSearchTerm(null); setSearchResultIndex(0); setSearchTotalResults(0);
        setGospelMode(false); clearGospelNav();
        // Also drop any leftover verse selection/filter mode from a previous
        // search — otherwise the selection toolbar keeps showing (with the
        // wrong label) because selectedVerses.size is still > 0 from before.
        setFilterMode(false); setSelectedVerses(new Set());
        lastReadingClearedRef.current = false;
        // DO NOT overwrite kjb-last-reading - HomePage already saved it with the correct prevAbbr/prevChapter
        // Just read what HomePage saved and use it
        try {
          const saved = localStorage.getItem('kjb-last-reading');
          if (saved) {
            const parsed = JSON.parse(saved);
            setLastReadingPos(parsed);
          }
        } catch {}
        // For daily/random, just set the highlight - NOT filterMode (that's for search results)
        setHighlightVerse(verseNum || null);
        setHighlightedVerses(verseNum ? new Set([verseNum]) : new Set());
      } else {
        // For search results, use filterMode for "Show Full Chapter" option
        setHighlightVerse(verseNum || null);
        if (verseNum && isFromSearch) {
          const single = new Set([verseNum]);
          setSelectedVerses(single);
          setHighlightedVerses(single);
          setFilterMode(true);
        } else if (!verseNum) {
          // A reference typed WITHOUT a verse (e.g. "John 3") must show the
          // full chapter — clear any filterMode/selectedVerses left over from
          // a previous verse-filtered view, otherwise the reader keeps showing
          // just the old selected verse(s) instead of the whole chapter.
          setFilterMode(false);
          setSelectedVerses(new Set());
          setHighlightedVerses(new Set());
        }
      }
      setPos({ abbr: urlBookObj.abbr, chapter: chapterNum, verse: verseNum });
      // Force scroll-to-top so the subsequent scroll-to-verse works reliably.
      // For whole-chapter jumps (no verseNum) there's no scroll-to-verse effect
      // to take over afterward, so without marking this a "fresh nav" the
      // scroll-RESTORE effect further down re-applies whatever offset was last
      // saved for this chapter a moment later, silently undoing this scrollTo.
      if (!verseNum) freshNavRef.current = true;
      (document.getElementById('kjb-scroll') || window).scrollTo({ top: 0 });
      // Pass the SAME verseEnd already computed above (from the URL, or
      // carried over from kjb-position when the URL didn't have one) --
      // without this, loadChapter's own savePosition() call re-saves
      // kjb-position with verseEnd defaulted back to null, silently wiping
      // the range that was JUST correctly shown a moment ago (via the
      // setSelectedVerses/setHighlightedVerses/setFilterMode calls above).
      // The session still looked right (nothing re-renders wrong THIS visit)
      // but what's actually persisted for the next launch/reboot was already
      // reduced to a single verse.
      loadChapter(urlBookObj.abbr, chapterNum, verseNum, (verseNum && verseEnd && verseEnd > verseNum) ? verseEnd : null);
      return;
    }

    try {
      const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (p && p.abbr && p.chapter) {
        // Check if we're coming from daily/random - if so, skip search restoration
        const urlParams = new URLSearchParams(window.location.search);
        const isFromDaily = urlParams.get('from') === 'daily';
        const isFromRandom = urlParams.get('from') === 'random';
        
        // Restore toolbar state from localStorage (search/gospel context persists across app restarts)
        let restoredSelection = false;
        let restoredFilterMode = false;
        let restoredHighlightVerse = null;
        try {
          const savedState = localStorage.getItem('kjb-reader-toolbar-state');
          console.log('[BibleReader] Fallback restore - saved state:', savedState);
          if (savedState && !isFromDaily && !isFromRandom) {
            const state = JSON.parse(savedState);
            console.log('[BibleReader] Fallback restore - parsed state:', state);
            if (state && state.abbr === p.abbr && state.chapter === p.chapter) {
              // Restore search context
              if (state.hasSearchContext && state.searchTerm) {
                searchClearedRef.current = false;
                setSearchTerm(state.searchTerm);
                setSearchResultIndex(state.searchResultIndex || 0);
                setSearchTotalResults(state.searchTotalResults || 0);
              }
              // Restore gospel context
              if (state.hasGospelContext) {
                const g = getGospelNav();
                if (g.results.length > 0) {
                  setGospelMode(true);
                  setGospelResultIndex(g.index);
                  setGospelTotalResults(g.results.length);
                }
              }
              // Restore filter mode and selected verses ONLY for an active
              // search/gospel session — a plain "Read Selected" passage filter
              // must not reapply on reopen (jumps back to filter from a previous).
              const hadContext = (state.hasSearchContext && state.searchTerm) || state.hasGospelContext;
              if (hadContext) {
                if (state.filterMode !== undefined) { setFilterMode(state.filterMode); restoredFilterMode = true; }
                if (state.selectedVerses && state.selectedVerses.length > 0) {
                  const newSet = new Set(state.selectedVerses);
                  setSelectedVerses(newSet);
                  setHighlightedVerses(newSet);
                  restoredSelection = true;
                  // Track the verse to highlight/scroll to below — kjb-position's own
                  // verse can be stale/null here even though a selection was restored.
                  restoredHighlightVerse = Math.min(...newSet);
                }
              }
              // Restore the "verse/chapter only" flag (Show Full Chapter vs Verses
              // Only) so it matches what the user last had open on this chapter.
              if (state.resultView) resultViewRef.current = state.resultView;
            }
          }
        } catch (err) {
          console.error('[BibleReader] Fallback restore error:', err);
        }
        // Restore a previously highlighted verse or multi-verse range so coming
        // back to the Reader keeps the highlight, not just the chapter. Skip the
        // "clear" branch if we just restored a search/select toolbar state above —
        // otherwise this immediately wipes out the filterMode/selectedVerses we
        // just restored (the bug that made the search & selection toolbars vanish
        // whenever you navigated away and back without an explicit verse range).
        const isRange = p.verse && p.verseEnd && p.verseEnd > p.verse;
        if (isRange) {
          // kjb-position has a verse range — the user was viewing a filtered
          // passage. Always restore filterMode=true and the selection, even if
          // the toolbar state also restored (it may have saved filterMode=false
          // during a race condition before the search session applied filter mode).
          const range = new Set();
          for (let v = p.verse; v <= p.verseEnd; v++) range.add(v);
          setSelectedVerses(range); setHighlightedVerses(range); setFilterMode(true);
        } else if (!restoredSelection && !restoredFilterMode) {
          setFilterMode(false); setSelectedVerses(new Set()); setHighlightedVerses(new Set());
        }
        setPos({ abbr: p.abbr, chapter: p.chapter, verse: p.verse || null });
        // Prefer the verse restored from the toolbar-state selection (may be
        // stale/null on kjb-position itself) so the reader highlights AND
        // scrolls to where the user left off, not just the top of the chapter.
        setHighlightVerse(restoredHighlightVerse || p.verse || null);
        loadChapter(p.abbr, p.chapter, p.verse || null, isRange ? p.verseEnd : null);
      }
    } catch (err) {
      console.error('[BibleReader] Fallback restore error:', err);
    }
    try {
      const saved = localStorage.getItem('kjb-last-reading');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLastReadingPos(parsed);
      }
    } catch {}

    const applyRequestedPosition = () => {
      let p;
      try { p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return; }
      if (!p || !resolveBook(p.abbr)) return;

      // If the URL already has the correct book/chapter/verse, the
      // routerLocation.search effect is already handling the load — don't
      // fire a redundant loadChapter that would clear verses mid-scroll
      // and break the verse jump (especially when navigating from Home).
      const urlParams = new URLSearchParams(window.location.search);
      const urlBookObj = resolveBook(urlParams.get('book'));
      const urlChapter = urlParams.get('chapter');
      const urlVerse = urlParams.get('verse');
      if (urlBookObj && urlChapter && urlBookObj.abbr === p.abbr &&
          parseInt(urlChapter, 10) === p.chapter &&
          parseInt(urlVerse || '0', 10) === (p.verse || 0)) {
        // Chapter-only jump landing on a URL that already matches (e.g. searching
        // the same chapter reference twice in a row) — still needs the fresh-nav
        // flag, otherwise the scroll-RESTORE effect below re-applies the last
        // saved scroll offset for this chapter instead of landing at the top.
        if (!p.verse) freshNavRef.current = true;
        setHighlightVerse(p.verse || null);
        return;
      }

      const fromSearch = urlParams.get('from') === 'search';
      const nav = getSearchNav();
      if (fromSearch && nav.results.length > 0) {
        const cur = nav.results[nav.index] || nav.results[0];
        if (cur && cur.abbr === p.abbr && cur.chapter === p.chapter) {
          stepToResult(cur); return;
        }
      }
      // Restore daily/random highlight position from localStorage (no filterMode - that's for search)
      const lastReading = localStorage.getItem('kjb-last-reading');
      if (lastReading) {
        try {
          const parsed = JSON.parse(lastReading);
          if (parsed && parsed.abbr === p.abbr && parsed.chapter === p.chapter && parsed.verse) {
            setHighlightVerse(parsed.verse);
            setHighlightedVerses(new Set([parsed.verse]));
            setFilterMode(false); // Daily verse is NOT filter mode
          }
        } catch {}
      }
      const isRange = p.verse && p.verseEnd && p.verseEnd > p.verse;
      if (isRange) {
        const range = new Set();
        for (let v = p.verse; v <= p.verseEnd; v++) range.add(v);
        setSelectedVerses(range); setHighlightedVerses(range); setFilterMode(true);
      } else if (!lastReading) {
        setFilterMode(false); setSelectedVerses(new Set()); setHighlightedVerses(new Set());
      }
      // Whole-chapter jumps (no verse) have no highlightVerse to drive a
      // scroll-to-verse, and without this flag the scroll-RESTORE effect below
      // (keyed on pos.abbr/pos.chapter) re-applies whatever offset was last
      // saved for that chapter instead of landing at the top — this is the
      // same flag BibleReader's own internal navigate() sets for Prev/Next and
      // book/chapter-selector jumps; the kjb-navigate event path (used by
      // search-bar reference jumps) never set it, which was the bug.
      if (!p.verse) freshNavRef.current = true;
      setPos({ abbr: p.abbr, chapter: p.chapter, verse: p.verse || null });
      setHighlightVerse(p.verse || null);
      loadChapter(p.abbr, p.chapter, p.verse || null, isRange ? p.verseEnd : null);
    };
    window.addEventListener('kjb-navigate', applyRequestedPosition);
    return () => window.removeEventListener('kjb-navigate', applyRequestedPosition);
  }, [routerLocation.search, loadChapter]);

  const scrollToVerseEl = useCallback((verseNum) => {
    const verseEl = document.getElementById(`v${verseNum}`);
    if (!verseEl) return;
    const occ = posRef.current?.occurrence || 0;
    emphasizeOccurrence(verseEl.querySelectorAll('mark[data-occ]'), occ);
    const scroller = document.getElementById('kjb-scroll');
    const toolbarH = topRef.current ? topRef.current.getBoundingClientRect().height : 0;
    const stickyOffset = toolbarH + 48;
    const numEl = verseEl.querySelector('sup, .kjb-dropcap-num');
    let topRect = numEl ? numEl.getBoundingClientRect().top : verseEl.getBoundingClientRect().top;
    const heading = verseEl.querySelector('.font-bold.text-center');
    if (heading && heading.getBoundingClientRect().top < topRect) topRect = heading.getBoundingClientRect().top;
    if (scroller) {
      scroller.scrollTo({ top: Math.max(0, topRect - scroller.getBoundingClientRect().top + scroller.scrollTop - stickyOffset), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: Math.max(0, topRect + window.scrollY - stickyOffset), behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (highlightVerse) {
      const scrollToVerse = () => scrollToVerseEl(highlightVerse);
      const t1 = setTimeout(scrollToVerse, 50), t2 = setTimeout(scrollToVerse, 200), t3 = setTimeout(scrollToVerse, 600);
      const container = document.querySelector('.kjb-reader-content');
      let ro = null;
      if (container && window.ResizeObserver) { ro = new ResizeObserver(scrollToVerse); ro.observe(container); }
      const tStop = setTimeout(() => ro && ro.disconnect(), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(tStop); ro && ro.disconnect(); };
    }
    // When returning from home/navigation, check lastReading for daily verse highlight
    const lastReadingRaw = localStorage.getItem('kjb-last-reading');
    if (lastReadingRaw && !highlightVerse) {
      try {
        const parsed = JSON.parse(lastReadingRaw);
        if (parsed && parsed.abbr === pos.abbr && parsed.chapter === pos.chapter && parsed.verse) {
          setHighlightVerse(parsed.verse);
          setHighlightedVerses(new Set([parsed.verse]));
          setTimeout(() => scrollToVerseEl(parsed.verse), 100);
        }
      } catch {}
    }
    if (freshNavRef.current) {
      freshNavRef.current = false;
      (document.getElementById('kjb-scroll') || window).scrollTo({ top: 0 });
      return;
    }
    if (highlightSection) return;
    // Restore the saved scroll position for this chapter. The content may not
    // have its full height yet right after a fresh mount/navigation, so we retry
    // across several frames AND observe the content for layout changes — this
    // prevents the scroll from collapsing to the top before the page is laid out.
    let saved = 0;
    try { saved = parseInt(localStorage.getItem(`kjb-scroll-${pos.abbr}-${pos.chapter}`) || '0', 10); } catch {}
    if (!saved || saved <= 0) return;
    const restore = () => {
      const scroller = document.getElementById('kjb-scroll');
      const target = scroller || window;
      const maxY = scroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      // Only restore once the page is tall enough to actually reach the saved Y.
      if (maxY >= saved - 4) { target.scrollTo({ top: saved }); return true; }
      return false;
    };
    const timers = [60, 200, 500, 1000, 1800, 3000].map(ms => setTimeout(restore, ms));
    const container = document.querySelector('.kjb-reader-content');
    let ro = null;
    if (container && window.ResizeObserver) { ro = new ResizeObserver(() => { if (restore()) ro && ro.disconnect(); }); ro.observe(container); }
    // Keep observing for longer so late layout shifts (fonts, images, large
    // chapters) still let the restore land instead of collapsing to the top.
    const tStop = setTimeout(() => ro && ro.disconnect(), 5000);
    return () => { timers.forEach(clearTimeout); clearTimeout(tStop); ro && ro.disconnect(); };
  }, [verses, loading, highlightVerse, highlightSection, pos.abbr, pos.chapter]);

  useEffect(() => {
    if (loading || !highlightSection) return;
    const anchorId = highlightSection === 'colophon' ? 'kjb-colophon-anchor' : 'kjb-subscript-anchor';
    const scrollToSection = () => {
      const el = document.getElementById(anchorId);
      if (!el) return;
      const scroller = document.getElementById('kjb-scroll');
      const toolbarH = topRef.current ? topRef.current.getBoundingClientRect().height : 0;
      const stickyOffset = toolbarH + 48;
      if (scroller) {
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - stickyOffset;
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else {
        const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    };
    const t1 = setTimeout(scrollToSection, 250); const t2 = setTimeout(scrollToSection, 650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading, highlightSection, verses, colophon, pos.abbr, pos.chapter]);

  useEffect(() => {
    if (loading || isViewingTitlePage) return;
    const key = `kjb-scroll-${pos.abbr}-${pos.chapter}`;
    const scroller = document.getElementById('kjb-scroll');
    const target = scroller || window;
    const getY = () => (scroller ? scroller.scrollTop : window.scrollY);
    let raf = null;

    // Immediately capture this chapter as the previous reading session as soon
    // as it loads in NORMAL reading mode. We rely ONLY on the URL params here —
    // not React state like highlightVerse/lastReadingPos, which are set async and
    // are still stale/null on the first render of a daily-verse chapter (which
    // previously caused this to overwrite the real previous session with the
    // daily verse's own chapter).
    const urlParams = new URLSearchParams(window.location.search);
    const fromSpecial = ['daily', 'random', 'search', 'gospel'].includes(urlParams.get('from'));
    const hasVerseParam = !!urlParams.get('verse');
    const hasHighlightParam = !!urlParams.get('highlight');
    if (!fromSpecial && !hasVerseParam && !hasHighlightParam && pos.abbr && pos.chapter) {
      try {
        const prevSession = { abbr: pos.abbr, chapter: pos.chapter, scrollY: Math.round(getY()) };
        localStorage.setItem('kjb-prev-reading-session', JSON.stringify(prevSession));
      } catch {}
    }

    const flush = () => {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      try { localStorage.setItem(key, String(Math.round(getY()))); } catch {}
      // ONLY save prev-reading-session for normal reading (not search/gospel/daily/random)
      const isSpecialMode = searchTerm || gospelMode || lastReadingPos;
      if (!isSpecialMode && pos.abbr && pos.chapter) {
        try {
          const prevSession = { abbr: pos.abbr, chapter: pos.chapter, scrollY: Math.round(getY()) };
          localStorage.setItem('kjb-prev-reading-session', JSON.stringify(prevSession));
        } catch {}
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        try { localStorage.setItem(key, String(Math.round(getY()))); } catch {}
        // Save prev-reading-session only for NORMAL reading. Use URL params
        // (reliable/synchronous) plus highlightVerse, so a daily/search/random
        // chapter never overwrites the real previous session.
        const sp = new URLSearchParams(window.location.search);
        const special = ['daily', 'random', 'search', 'gospel'].includes(sp.get('from')) || !!sp.get('verse') || !!sp.get('highlight');
        if (!special && !highlightVerse && !searchTerm && !gospelMode && !lastReadingPos && pos.abbr && pos.chapter) {
          try {
            const prevSession = { abbr: pos.abbr, chapter: pos.chapter, scrollY: Math.round(getY()) };
            localStorage.setItem('kjb-prev-reading-session', JSON.stringify(prevSession));
          } catch {}
        }
      });
    };
    // Flush the latest position whenever the page is hidden/closed. pagehide +
    // visibilitychange cover reload, tab close, app background, and PWA close —
    // cases where a pending rAF would otherwise never run.
    const onHide = () => {
      flush();
      // Also save prev-reading-session explicitly on close (for notification → clear flow)
      const urlParams = new URLSearchParams(window.location.search);
      const isFromDaily = urlParams.get('from') === 'daily';
      const isFromRandom = urlParams.get('from') === 'random';
      const isFromSearch = urlParams.get('from') === 'search';
      const isFromGospel = urlParams.get('from') === 'gospel';
      if (!isFromDaily && !isFromRandom && !isFromSearch && !isFromGospel) {
        try {
          const scroller = document.getElementById('kjb-scroll');
          const scrollY = scroller ? scroller.scrollTop : window.scrollY;
          const prevSession = { abbr: pos.abbr, chapter: pos.chapter, scrollY: Math.round(scrollY) };
          localStorage.setItem('kjb-prev-reading-session', JSON.stringify(prevSession));
        } catch {}
      }
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      flush();
      onHide(); // Save one more time on unmount
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loading, isViewingTitlePage, pos.abbr, pos.chapter]);

  // A plain "Read Selected" passage filter (no active search/gospel context)
  // pushes ?verse=&verseEnd= into the actual browser URL for shareability.
  // Unlike kjb-position (which intentionally never persists verseEnd), that URL
  // sticks around until another navigation replaces it — so closing/backgrounding
  // the tab or app while viewing a filtered passage, then reopening, re-parses
  // the same URL and jumps right back into the filtered view. Strip it the
  // moment the page is hidden so a reopen lands on the full chapter instead.
  useEffect(() => {
    const cleanupFilteredUrlOnHide = () => {
      if (filterMode && selectedVerses.size > 0 && !searchTerm && !gospelMode) {
        try {
          const url = pos.chapter === 0 ? window.location.pathname : `/read?book=${pos.abbr}&chapter=${pos.chapter}`;
          window.history.replaceState({}, '', url);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ abbr: pos.abbr, chapter: pos.chapter, verse: null, verseEnd: null }));
        } catch {}
      }
    };
    const onVisHidden = () => { if (document.visibilityState === 'hidden') cleanupFilteredUrlOnHide(); };
    window.addEventListener('pagehide', cleanupFilteredUrlOnHide);
    document.addEventListener('visibilitychange', onVisHidden);
    return () => {
      window.removeEventListener('pagehide', cleanupFilteredUrlOnHide);
      document.removeEventListener('visibilitychange', onVisHidden);
    };
  }, [filterMode, selectedVerses, searchTerm, gospelMode, pos.abbr, pos.chapter]);

  useEffect(() => {
    const sync = () => {
      try { setZoomLevel(parseInt(localStorage.getItem('kjb-zoom') || '100')); } catch {}
      try { const f = localStorage.getItem('kjb-reader-font-family') || 'serif'; setFontFamily(f); applyReaderFont(f); } catch {}
      try { setA11yFont(getAccessibilityFont()); } catch {}
      // Re-read search context and last reading position so the indicator reappears on focus/storage change.
      // Guarded by searchClearedRef: if the user has since navigated away from search
      // (which clears in-memory state but doesn't always wipe localStorage), don't
      // resurrect a stale past search when the app regains focus.
      try {
        if (!searchClearedRef.current) {
          const term = localStorage.getItem('kjb-search-term');
          const resultsRaw = localStorage.getItem('kjb-search-results');
          const index = localStorage.getItem('kjb-search-index');
          if (term && resultsRaw) {
            const results = JSON.parse(resultsRaw);
            if (results.length > 0) {
              setSearchTerm(term);
              setSearchResultIndex(index ? parseInt(index, 10) : 0);
              setSearchTotalResults(results.length);
            }
          }
        }
      } catch {}
      try {
        const saved = localStorage.getItem('kjb-last-reading');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed) {
            setLastReadingPos(parsed);
            // Restore highlight for daily verse when returning from home/navigation
            if (parsed.abbr === pos.abbr && parsed.chapter === pos.chapter && parsed.verse) {
              setHighlightVerse(parsed.verse);
              setHighlightedVerses(new Set([parsed.verse]));
              setTimeout(() => scrollToVerseEl(parsed.verse), 100);
            }
          }
        }
      } catch {}
      // Sync previous reading session
      try {
        const prevSaved = localStorage.getItem('kjb-prev-reading-session');
        if (prevSaved) {
          const prevParsed = JSON.parse(prevSaved);
          if (prevParsed) setPrevReadingSession(prevParsed);
        }
      } catch {}
    };
    sync();
    window.addEventListener('storage', sync); window.addEventListener('focus', sync); window.addEventListener('kjb-fonts-changed', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); window.removeEventListener('kjb-fonts-changed', sync); };
  }, [routerLocation.pathname, pos.abbr, pos.chapter]);

  useEffect(() => {
    const refreshContext = () => {
      try {
        // Once the reader has been marked as not-in-search (searchClearedRef),
        // don't let a stale label from getSearchNav() (e.g. left behind by a
        // plain reference jump, which also populates the search-nav for its
        // one-time highlight) get resurrected on window focus — that's what
        // caused the reader to snap back to an old search/filter view after
        // switching apps and returning.
        if (searchClearedRef.current) return;
        const { term, index, results } = getSearchNav();
        setSearchTerm(term || null); setSearchResultIndex(index); setSearchTotalResults(results.length);
        if (lastReadingClearedRef.current) { setLastReadingPos(null); return; }
        const lastReading = localStorage.getItem('kjb-last-reading');
        setLastReadingPos(lastReading ? JSON.parse(lastReading) : null);
      } catch {}
    };
    window.addEventListener('focus', refreshContext);
    return () => { window.removeEventListener('focus', refreshContext); };
  }, []);

  const resultViewRef = useRef('filter');

  useToolbarState(pos, loading, verses, filterMode, selectedVerses, searchTerm, searchResultIndex, searchTotalResults, gospelMode, searchClearedRef, setFilterMode, setSelectedVerses, setHighlightedVerses, resultViewRef, setSearchTerm, setSearchResultIndex, setSearchTotalResults, setGospelMode, setGospelResultIndex, setGospelTotalResults, setHighlightVerse);

  const { navigate: baseNavigate, returnToChapter: baseReturnToChapter, preSearchPosRef, rangeHighlightRef, freshNavRef } = useReaderNavigation(pos, loadChapter, routerNavigate, routerLocation);

  // When cloud sync delivers a new reading position from another device,
  // reload the chapter so Device B picks up where Device A left off.
  // Skipped if the URL has explicit book/chapter params or the user has
  // manually navigated since mount.
  useEffect(() => {
    const handler = () => {
      if (freshNavRef.current) return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('book') && params.get('chapter')) return;
      try {
        const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (!p || !p.abbr || !p.chapter) return;
        if (!resolveBook(p.abbr)) return;
        const cur = posRef.current;
        if (p.abbr === cur.abbr && p.chapter === cur.chapter) return;
        const isRange = p.verse && p.verseEnd && p.verseEnd > p.verse;
        if (isRange) {
          const range = new Set();
          for (let v = p.verse; v <= p.verseEnd; v++) range.add(v);
          setSelectedVerses(range); setHighlightedVerses(range); setFilterMode(true);
        }
        setPos({ abbr: p.abbr, chapter: p.chapter, verse: p.verse || null });
        setHighlightVerse(p.verse || null);
        loadChapter(p.abbr, p.chapter, p.verse || null, isRange ? p.verseEnd : null);
      } catch {}
    };
    window.addEventListener('kjb-settings-synced', handler);
    return () => window.removeEventListener('kjb-settings-synced', handler);
  }, [loadChapter]);

  const returnToChapter = (abbr, chapter, exactY) => {
    if (!abbr || !chapter) return;
    setHighlightSection(null);
    setShowFilterOverlay(false);
    
    // Save scroll position for restoration
    if (typeof exactY === 'number' && exactY > 0) {
      try { localStorage.setItem(`kjb-scroll-${abbr}-${chapter}`, String(Math.round(exactY))); } catch {}
    }
    
    // Reuse the app's main navigate() (defined below) instead of duplicating
    // pos/localStorage/URL updates here — it's the single vetted path that
    // keeps react-router's tracked location, the real URL, and kjb-position
    // in sync, so Home → Read afterward never re-reads a stale filtered verse.
    navigate(abbr, chapter, null, false, false, true);
    
    // ALSO manually restore scroll after chapter loads (in case effect doesn't trigger for same chapter)
    setTimeout(() => {
      if (typeof exactY === 'number' && exactY > 0) {
        const scroller = document.getElementById('kjb-scroll');
        if (scroller) {
          scroller.scrollTo({ top: exactY, behavior: 'auto' });
        } else {
          window.scrollTo({ top: exactY, behavior: 'auto' });
        }
      }
    }, 400);
  };
  
  const { stepToResult, clearSearchContext } = useSearchAndGospelResults(
    posRef, loading, verses, topRef, searchTerm, gospelMode, setGospelMode, setGospelResultIndex, setGospelTotalResults,
    setSearchTerm, setSearchResultIndex, setSearchTotalResults, resultViewRef, setFilterMode, setHighlightedVerses, setSelectedVerses,
    setHighlightSection, setHighlightVerse, setPos, loadChapter, returnToChapter, clearSearchNav, setGospelNav, setGospelIndex, clearGospelNav,
    setSelectMode, setShowFilterOverlay, setLastReadingPos
  );
  
  // Debug: log toolbar state on every render
  useEffect(() => {
    console.log('[BibleReader] Render state:', { searchTerm, gospelMode, filterMode, selectedVerses: selectedVerses.size, highlightVerse, pos });
  }, [searchTerm, gospelMode, filterMode, selectedVerses, highlightVerse, pos]);
  
  const navigate = (newAbbr, newChapter, jumpVerse = null, fromDailyVerse = false, fromRandom = false, isAutoAdvance = false, section = null, preserveSearchContext = false) => {
    const sameChapter = newAbbr === pos.abbr && newChapter === pos.chapter;
    const scroller = document.getElementById('kjb-scroll');
    const scrollY = scroller ? scroller.scrollTop : window.scrollY;
    
    // ALWAYS save current reading position before ANY navigation
    // This is the key fix - we save BEFORE overwriting with special mode positions
    if (pos.abbr && pos.chapter && !fromDailyVerse && !fromRandom) {
      const prevSession = { abbr: pos.abbr, chapter: pos.chapter, scrollY };
      try { localStorage.setItem('kjb-prev-reading-session', JSON.stringify(prevSession)); } catch {}
      setPrevReadingSession(prevSession);
    }
    
    // Clear search/gospel context for daily/random or when moving to different chapter
    if (fromDailyVerse || fromRandom || (!preserveSearchContext && !sameChapter)) {
      searchClearedRef.current = true; clearSearchNav(); setSearchTerm(null); setSearchResultIndex(0); setSearchTotalResults(0);
      setGospelMode(false); clearGospelNav();
    }
    
    // For daily/random: save where we came FROM so clear can return there
    if ((fromDailyVerse || fromRandom) && pos.abbr && pos.chapter) {
      lastReadingClearedRef.current = false;
      const lastPos = { abbr: newAbbr, chapter: newChapter, fromDailyVerse, fromRandom, prevAbbr: pos.abbr, prevChapter: pos.chapter, prevScrollY: scrollY };
      try { localStorage.setItem('kjb-last-reading', JSON.stringify(lastPos)); } catch {}
      setLastReadingPos(lastPos);
    }
    if (!jumpVerse) {
      setHighlightVerse(null); setFilterMode(false); setSelectMode(false);
      setSelectedVerses(new Set()); setHighlightedVerses(new Set()); setShowFilterOverlay(false);
    } else { setHighlightVerse(jumpVerse); }
    setHighlightSection(section);
    setPos({ abbr: newAbbr, chapter: newChapter, verse: jumpVerse });
    baseNavigate(newAbbr, newChapter, jumpVerse, fromDailyVerse, fromRandom, isAutoAdvance, section, preserveSearchContext, clearSearchNav, setGospelMode, clearGospelNav);
  };

  // Explicit verse pick from the Verse selector. This is plain navigation, so
  // it must clear any active special mode (search / gospel / daily / random) —
  // otherwise the yellow indicator lingers when you pick a verse in the same
  // chapter you were already viewing.
  const clearSpecialModes = () => {
    if (searchTerm) { clearSearchContext(); }
    if (gospelMode) { clearGospelNav(); setGospelMode(false); }
    setLastReadingPos(null);
    lastReadingClearedRef.current = true;
    // Drop the stale highlight/selection from the previous special mode so only
    // the freshly-picked verse highlights (navigate() sets the new one below).
    setHighlightVerse(null); setHighlightSection(null);
    setFilterMode(false); setSelectMode(false);
    setSelectedVerses(new Set()); setHighlightedVerses(new Set());
    try { localStorage.removeItem('kjb-last-reading'); localStorage.removeItem('kjb-reader-toolbar-state'); } catch {}
  };

  // Verse picker options for the custom dropdown: Whole chapter, each verse,
  // plus the chapter's subscript/colophon sections when present.
  const verseOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Whole chapter' }];
    for (let i = 1; i <= verseCount; i++) opts.push({ value: i, label: `Verse ${i}` });
    if (chapterSubscript) opts.push({ value: 'sub', label: 'Subscript' });
    if (colophon) opts.push({ value: 'col', label: 'Colophon' });
    return opts;
  }, [verseCount, chapterSubscript, colophon]);

  const handleVersePick = (v) => {
    setShowVersePicker(false);
    if (v === 'sub') { clearSpecialModes(); navigate(pos.abbr, pos.chapter, null, false, false, false, 'subscript'); return; }
    if (v === 'col') { clearSpecialModes(); navigate(pos.abbr, pos.chapter, null, false, false, false, 'colophon'); return; }
    if (v === '' || v === undefined) { clearSpecialModes(); navigate(pos.abbr, pos.chapter, null); return; }
    clearSpecialModes();
    navigate(pos.abbr, pos.chapter, Number(v));
  };

  const goNext = (isAutoAdvance = false) => {
    if (pos.chapter < book.chapters) {
      navigate(pos.abbr, pos.chapter + 1, null, false, false, isAutoAdvance);
      return true;
    }
    // Exception: end of the Old Testament (Malachi) stops at the New
    // Testament title page instead of jumping straight into Matthew 1.
    if (pos.abbr === 'MAL') {
      navigate('MAT', 0, null, false, false, isAutoAdvance);
      return true;
    }
    const next = getNextBook(pos.abbr);
    if (next) {
      navigate(next.abbr, 1, null, false, false, isAutoAdvance);
      return true;
    }
    return false;
  };

  const goPrev = () => {
    if (pos.chapter > 1) { navigate(pos.abbr, pos.chapter - 1); }
    // Exception: the start of the New Testament (Matthew) stops at the New
    // Testament title page instead of jumping straight back into Malachi 4.
    else if (pos.abbr === 'MAT' && pos.chapter === 1) { navigate('MAT', 0); }
    // Exception: the start of the Old Testament (Genesis) stops at the cover
    // title page instead of doing nothing (there is no previous book).
    else if (pos.abbr === 'GEN' && pos.chapter === 1) { navigate('GEN', 0); }
    else { const prev = getPrevBook(pos.abbr); if (prev) navigate(prev.abbr, prev.chapters); }
  };

  const anyMenuOpen = showBookPicker || showChapterPicker || showVersePicker || showZoomPopover || showFontPopover;
  const closeAllMenus = useCallback(() => {
    setShowBookPicker(false); setShowChapterPicker(false); setShowVersePicker(false);
    setShowZoomPopover(false); setShowFontPopover(false);
  }, []);

  // Close any open reader menu when the user clicks ANYWHERE outside the reader
  // toolbar / open popovers — including the app header bar buttons (search,
  // home, dark mode, 3-dot menu), which call stopPropagation and so never reach
  // the in-page backdrop. A capture-phase document listener catches them all.
  useEffect(() => {
    if (!anyMenuOpen) return;
    const onDocClick = (e) => {
      // Ignore clicks on a native <select> (or its options) — opening the OS
      // picker fires a click whose target isn't inside any of the panels below,
      // which would otherwise close the open selector sheet the instant you
      // tap the Book/Chapter/Verse dropdown.
      if (e.target.closest('select')) return;
      if (!e.target.closest('.kjb-reader-toolbar, .kjb-popover-panel, .kjb-selector-sheet, [role="menu"], [data-radix-popper-content-wrapper], [vaul-drawer], [data-vaul-drawer], [vaul-overlay], [data-vaul-overlay]')) {
        closeAllMenus();
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [anyMenuOpen, closeAllMenus]);

  const lastReadingActive = !!(lastReadingPos && !lastReadingPos.cleared && lastReadingPos.abbr === pos.abbr && lastReadingPos.chapter === pos.chapter);
  const isLastChapterLastBook = pos.abbr === 'REV' && pos.chapter === 22;
  const isFirstChapterFirstBook = pos.abbr === 'GEN' && pos.chapter === 0;
  const isGenesisChapterOne = pos.abbr === 'GEN' && pos.chapter === 1;

  return (
    <div onClick={(e) => { if (!e.target.closest('.kjb-verse-container, [id^="v"], h1, h2, h3, .kjb-subscript, .kjb-colophon, #kjb-colophon-anchor, #kjb-subscript-anchor, button, a, [role="menu"], [role="menuitem"], [data-radix-popper-content-wrapper]')) { setHighlightVerse(null); setHighlightSection(null); setTappedVerses(new Set()); if (!selectMode) setHighlightedVerses(new Set()); } }} className={`w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-3 ${hideHeader ? 'pt-16' : ''}`}>
      {!hideHeader && (
        <div ref={topRef} data-kjb-reader-toolbar-wrap className="print:hidden sticky top-0 z-[100] border-b border-border pb-4 pt-3 mb-8 relative shadow-sm -mx-5 sm:-mx-8 lg:-mx-12 px-5 sm:px-8 lg:px-12 bg-background before:content-[''] before:absolute before:bottom-full before:left-0 before:right-0 before:h-12 before:bg-background">
          <div
            onClickCapture={(e) => {
              // Tapping empty space inside the toolbar (the gaps/padding between
              // buttons, not a button or an open popover) closes any open menu.
              if (anyMenuOpen && !e.target.closest('button, [role="menu"], .kjb-popover-panel')) {
                closeAllMenus();
              }
            }}
            className="kjb-reader-toolbar flex flex-wrap items-stretch justify-stretch gap-3 w-full max-w-[120rem] mx-auto [&>button:not(.kjb-fixed-btn)]:flex-grow [&>button:not(.kjb-fixed-btn)]:basis-auto [&>div.relative]:flex-grow [&>div.relative>button]:w-full">
            <div className="relative flex">
              <button
                onClick={() => { setShowBookPicker(p => !p); setShowChapterPicker(false); setShowVersePicker(false); setShowZoomPopover(false); setShowFontPopover(false); }}
                className="flex items-center justify-center gap-1.5 px-3 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 touch-manipulation h-10 w-full"
              >
                <span className="notranslate truncate text-center">{isViewingTitlePage ? 'Title Page' : book.shortName}</span>
                <ChevronRight className={`w-3 h-3 opacity-70 transition-transform duration-200 flex-shrink-0 ${showBookPicker ? 'rotate-90' : ''}`} />
              </button>
              {showBookPicker && !isMobile() && (
                <div className="kjb-popover-panel absolute top-full left-0 mt-1 z-[100]">
                  <BookSelector
                    currentAbbr={pos.abbr}
                    onSelect={(b, isTitlePage, showChapter) => {
                      if (isTitlePage) { navigate(b.abbr, 0); setShowBookPicker(false); }
                      else if (showChapter) {
                        navigate(b.abbr, 1); setShowBookPicker(false);
                        // Single-chapter books (Obadiah, Philemon, Jude, etc.) have
                        // nothing to pick in the chapter grid — open the verse picker.
                        if (b.chapters <= 1) setShowVersePicker(true); else setShowChapterPicker(true);
                      }
                    }}
                    onClose={() => setShowBookPicker(false)}
                  />
                </div>
              )}
              <SelectorSheet open={showBookPicker && isMobile()} onClose={() => setShowBookPicker(false)} title="Select Book">
                <BookSelector
                  currentAbbr={pos.abbr}
                  onSelect={(b, isTitlePage, showChapter) => {
                    if (isTitlePage) { navigate(b.abbr, 0); setShowBookPicker(false); }
                    else if (showChapter) {
                      navigate(b.abbr, 1); setShowBookPicker(false);
                      if (b.chapters <= 1) setShowVersePicker(true); else setShowChapterPicker(true);
                    }
                  }}
                  onClose={() => setShowBookPicker(false)}
                />
              </SelectorSheet>
            </div>

            {!isViewingTitlePage && (
              <>
              <div className="relative flex">
                <button
                  onClick={() => {
                    setShowBookPicker(false); setShowZoomPopover(false); setShowFontPopover(false);
                    // Single-chapter books have no chapters to choose — open the
                    // verse picker instead of a pointless one-item chapter grid.
                    if (book.chapters <= 1) { setShowVersePicker(p => !p); setShowChapterPicker(false); }
                    else { setShowChapterPicker(p => !p); setShowVersePicker(false); }
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 rounded-lg bg-secondary border border-border text-secondary-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-all duration-200 touch-manipulation h-10 w-full"
                >
                  <span className="notranslate">Ch.{pos.chapter}</span>
                  <ChevronRight className={`w-3 h-3 opacity-70 transition-transform duration-200 flex-shrink-0 ${showChapterPicker ? 'rotate-90' : ''}`} />
                </button>
                {showChapterPicker && !isMobile() && (
                  <div className="kjb-popover-panel absolute top-full left-0 mt-1 z-[100]">
                    <ChapterSelector
                      totalChapters={book.chapters}
                      currentChapter={pos.chapter}
                      onSelect={(ch, showVerse) => { navigate(pos.abbr, ch); setShowChapterPicker(false); if (showVerse) setShowVersePicker(true); }}
                      onClose={() => setShowChapterPicker(false)}
                      bookName={book.name}
                    />
                  </div>
                )}
                <SelectorSheet open={showChapterPicker && isMobile()} onClose={() => setShowChapterPicker(false)} title="Select Chapter">
                  <ChapterSelector
                    totalChapters={book.chapters}
                    currentChapter={pos.chapter}
                    onSelect={(ch, showVerse) => { navigate(pos.abbr, ch); setShowChapterPicker(false); if (showVerse) setShowVersePicker(true); }}
                    onClose={() => setShowChapterPicker(false)}
                    bookName={book.name}
                    bare
                  />
                </SelectorSheet>
              </div>

              <div className="relative flex">
                <button
                  onClick={() => { setShowVersePicker(p => !p); setShowBookPicker(false); setShowChapterPicker(false); setShowZoomPopover(false); setShowFontPopover(false); }}
                  className={`flex items-center justify-center gap-1.5 px-3 rounded-lg border border-border font-sans text-sm font-medium transition-all duration-200 touch-manipulation h-10 w-full ${
                    selectMode ? 'bg-primary text-primary-foreground' : filterMode && selectedVerses.size > 0 ? 'bg-accent/20 text-accent' : highlightVerse ? 'bg-accent/20 text-accent' : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
                  }`}
                  disabled={verseCount === 0}
                >
                  <span className="truncate min-w-[3.5rem] text-center">
                    {selectMode ? `${selectedVerses.size > 0 ? selectedVerses.size : '0'} selected` : filterMode && selectedVerses.size > 0 ? `vv.${formatVerseRange([...selectedVerses])}` : highlightSection === 'colophon' ? 'Colophon' : highlightSection === 'subscript' ? 'Subscript' : highlightVerse ? `v.${highlightVerse}` : 'Verse'}
                  </span>
                  {selectMode ? <CheckSquare className="w-3.5 h-3.5 opacity-70 flex-shrink-0 transition-transform duration-200" /> : <ChevronRight className={`w-3 h-3 opacity-70 transition-transform duration-200 flex-shrink-0 ${showVersePicker ? 'rotate-90' : ''}`} />}
                </button>
                {showVersePicker && verseCount > 0 && !isMobile() && (
                  <div className="kjb-popover-panel absolute top-full left-0 mt-1 z-[100]">
                    <VerseGrid
                      verseCount={verseCount}
                      currentVerse={highlightVerse}
                      currentSection={highlightSection}
                      hasSubscript={!!chapterSubscript}
                      hasColophon={!!colophon}
                      onSelect={handleVersePick}
                    />
                  </div>
                )}
                <SelectorSheet open={showVersePicker && verseCount > 0 && isMobile()} onClose={() => setShowVersePicker(false)} title="Select Verse">
                  <VerseGrid
                    verseCount={verseCount}
                    currentVerse={highlightVerse}
                    currentSection={highlightSection}
                    hasSubscript={!!chapterSubscript}
                    hasColophon={!!colophon}
                    onSelect={handleVersePick}
                    bare
                  />
                </SelectorSheet>
              </div>

              <div className="relative flex">
              <button
                onClick={() => { setShowZoomPopover(p => !p); setShowBookPicker(false); setShowChapterPicker(false); setShowVersePicker(false); setShowFontPopover(false); }}
                title={`Zoom: ${zoomLevel}%`}
                className="flex items-center justify-center gap-1 px-3 rounded-lg bg-secondary border border-border text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-all duration-200 touch-manipulation h-10 whitespace-nowrap"
              >
                <ZoomIn className="w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0" />
                <span className="truncate">{zoomLevel}%</span>
              </button>
              {showZoomPopover && !isMobile() && (
                <div className="kjb-popover-panel absolute top-full right-0 mt-1 z-[100]" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-card border border-border rounded-xl shadow-xl p-4 w-64 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 pr-6">
                      <span className="font-sans text-xs font-medium text-foreground">Text Size</span>
                      <span className="font-sans text-xs font-semibold text-primary">{zoomLevel}%</span>
                    </div>
                    <button onClick={() => setShowZoomPopover(false)} className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => adjustZoom(-5)} className="p-1.5 rounded-lg bg-secondary hover:bg-accent/20 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                      <input type="range" min="75" max="250" step="5" value={zoomLevel} onChange={handleZoomChange} className="flex-1 h-2 bg-muted-foreground/30 rounded-lg appearance-none cursor-pointer accent-primary" />
                      <button onClick={() => adjustZoom(5)} className="p-1.5 rounded-lg bg-secondary hover:bg-accent/20 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    {zoomLevel !== 100 && (
                      <button onClick={() => { setZoomLevel(100); try { localStorage.setItem('kjb-zoom', '100'); } catch {} }} className="w-full mt-2 px-2 py-1.5 rounded-lg bg-primary/10 text-primary font-sans text-xs font-medium hover:bg-primary/20 transition-colors">Reset to 100%</button>
                    )}
                  </div>
                </div>
              )}
              <SelectorSheet open={showZoomPopover && isMobile()} onClose={() => setShowZoomPopover(false)} title="Text Size">
                <div className="space-y-4 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm font-medium text-foreground">Zoom Level</span>
                    <span className="font-sans text-sm font-semibold text-primary">{zoomLevel}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => adjustZoom(-5)} className="p-2 rounded-lg bg-secondary hover:bg-accent/20 transition-colors"><Minus className="w-4 h-4" /></button>
                    <input type="range" min="75" max="250" step="5" value={zoomLevel} onChange={handleZoomChange} className="flex-1 h-3 bg-muted-foreground/30 rounded-lg appearance-none cursor-pointer accent-primary" />
                    <button onClick={() => adjustZoom(5)} className="p-2 rounded-lg bg-secondary hover:bg-accent/20 transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                  {zoomLevel !== 100 && (
                    <button onClick={() => { setZoomLevel(100); try { localStorage.setItem('kjb-zoom', '100'); } catch {} }} className="w-full px-4 py-3 rounded-lg bg-primary/10 text-primary font-sans text-sm font-medium hover:bg-primary/20 transition-colors">Reset to 100%</button>
                  )}
                </div>
              </SelectorSheet>
              </div>

              <div className="relative flex">
              <button
                onClick={() => { setShowFontPopover(p => !p); setShowBookPicker(false); setShowChapterPicker(false); setShowVersePicker(false); setShowZoomPopover(false); }}
                title="Font family"
                className="flex items-center justify-center gap-1 px-3 rounded-lg bg-secondary border border-border text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-all duration-200 touch-manipulation h-10 whitespace-nowrap"
              >
                <Type className="w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0" />
                <span className="hidden sm:inline">{(() => { const active = a11yActive ? a11yFont : fontFamily; return active === 'serif' ? 'Serif' : active === 'sans-serif' ? 'Sans' : active === 'monospace' ? 'Mono' : active === 'comic-sans' ? 'Comic' : active === 'times' ? 'Times' : active === 'dyslexic' ? 'Dyslexic' : active === 'hyperlegible' ? 'Legible' : 'Cursive'; })()}</span>
              </button>
              {showFontPopover && !isMobile() && (
                <div className="kjb-popover-panel absolute top-full left-0 mt-1 z-[100]" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-card border border-border rounded-xl shadow-xl p-4 w-64 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3 pr-6"><span className="font-sans text-xs font-medium text-foreground">Font Family</span></div>
                    <button onClick={() => setShowFontPopover(false)} className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                    {a11yActive && <p className="font-sans text-[11px] text-muted-foreground mb-2 leading-snug">An accessibility font is active app-wide and overrides reading fonts.</p>}
                    <p className="font-sans text-[11px] text-muted-foreground">Standard</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {[ { value: 'serif', label: 'Serif' }, { value: 'sans-serif', label: 'Sans' }, { value: 'monospace', label: 'Mono' }, { value: 'cursive', label: 'Cursive' }, { value: 'comic-sans', label: 'Comic' }, { value: 'times', label: 'Times' } ].map(font => {
                        const isActive = a11yActive ? false : fontFamily === font.value;
                        const isDisabled = a11yActive;
                        return (
                        <button key={font.value} disabled={isDisabled} onClick={() => { handleFontChange(font.value); setShowFontPopover(false); }} className={`px-3 py-2 rounded-lg border font-sans text-xs font-medium transition-all ${ isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent/20' } ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`} style={{ fontFamily: getFontFamilyValue(font.value) }}>{font.label}</button>
                        );
                      })}
                    </div>
                    <p className="font-sans text-[11px] text-muted-foreground">Accessibility</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[ { value: 'dyslexic', label: 'Dyslexic' }, { value: 'hyperlegible', label: 'Legible' } ].map(font => {
                        const isActive = a11yActive && a11yFont === font.value;
                        return (
                        <button key={font.value} onClick={() => { handleFontChange(font.value); setShowFontPopover(false); }} className={`px-3 py-2 rounded-lg border font-sans text-xs font-medium transition-all ${ isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent/20' }`} style={{ fontFamily: getFontFamilyValue(font.value) }}>{font.label}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <SelectorSheet open={showFontPopover && isMobile()} onClose={() => setShowFontPopover(false)} title="Font Family">
                <div className="space-y-2 p-2">
                  {a11yActive && <p className="font-sans text-xs text-muted-foreground leading-snug mb-1">An accessibility font is active app-wide and overrides reading fonts.</p>}
                  <p className="font-sans text-xs text-muted-foreground">Standard</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[ { value: 'serif', label: 'Serif' }, { value: 'sans-serif', label: 'Sans' }, { value: 'monospace', label: 'Mono' }, { value: 'cursive', label: 'Cursive' }, { value: 'comic-sans', label: 'Comic' }, { value: 'times', label: 'Times' } ].map(font => {
                      const isActive = a11yActive ? false : fontFamily === font.value;
                      const isDisabled = a11yActive;
                      return (
                      <button key={font.value} disabled={isDisabled} onClick={() => { handleFontChange(font.value); setShowFontPopover(false); }} className={`w-full px-4 py-3 rounded-lg border font-sans text-sm font-medium transition-all ${ isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent/20' } ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`} style={{ fontFamily: getFontFamilyValue(font.value) }}>{font.label}</button>
                      );
                    })}
                  </div>
                  <p className="font-sans text-xs text-muted-foreground">Accessibility</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[ { value: 'dyslexic', label: 'Dyslexic' }, { value: 'hyperlegible', label: 'Legible' } ].map(font => {
                      const isActive = a11yActive && a11yFont === font.value;
                      return (
                      <button key={font.value} onClick={() => { handleFontChange(font.value); setShowFontPopover(false); }} className={`w-full px-4 py-3 rounded-lg border font-sans text-sm font-medium transition-all ${ isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent/20' }`} style={{ fontFamily: getFontFamilyValue(font.value) }}>{font.label}</button>
                      );
                    })}
                  </div>
                </div>
              </SelectorSheet>
              </div>

              <button onClick={toggleFlow} title={flowMode === 'line' ? 'Switch to paragraph' : 'Switch to line-by-line'} className={`flex items-center justify-center gap-1.5 px-3 rounded-lg border border-border font-sans text-xs font-medium transition-all duration-200 touch-manipulation h-10 whitespace-nowrap ${paragraphMode ? 'bg-accent/20 text-accent' : 'bg-secondary text-secondary-foreground hover:bg-accent/20'}`}>{flowMode === 'line' ? <List className="w-5 h-5 transition-transform duration-200 flex-shrink-0" /> : <AlignJustify className="w-5 h-5 transition-transform duration-200 flex-shrink-0" />}<span className="hidden lg:inline">{flowMode === 'line' ? 'Lines' : 'Para'}</span></button>
              <button onClick={toggleColumn} title={columnOn ? 'Switch to single column' : 'Switch to two-column'} className={`flex items-center justify-center gap-1.5 px-3 rounded-lg border border-border font-sans text-xs font-medium transition-all duration-200 touch-manipulation h-10 whitespace-nowrap ${columnOn ? 'bg-accent/20 text-accent' : 'bg-secondary text-secondary-foreground hover:bg-accent/20'}`}>{columnOn ? <Columns2 className="w-5 h-5 transition-transform duration-200 flex-shrink-0" /> : <AlignLeft className="w-5 h-5 transition-transform duration-200 flex-shrink-0" />}<span className="hidden lg:inline">{columnOn ? '2-Col' : '1-Col'}</span></button>
              <button onClick={toggleSelectMode} title="Select verses" className={`kjb-fixed-btn flex-none flex items-center justify-center gap-1.5 px-3 rounded-lg border border-border font-sans text-xs font-medium transition-all duration-200 touch-manipulation h-10  whitespace-nowrap ${selectMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent/20'}`}><CheckSquare className="w-5 h-5 transition-transform duration-200 flex-shrink-0" /><span className="hidden lg:inline">Select</span></button>
              
               <DropdownMenu onOpenChange={(open) => { if (open) closeAllMenus(); }}>
                <DropdownMenuTrigger asChild>
                  <button title={shareFeedback || shareLinkFeedback ? 'Copied!' : 'Share'} className="kjb-fixed-btn flex-none flex items-center justify-center gap-1.5 px-3 rounded-lg bg-secondary border border-border text-secondary-foreground hover:bg-accent/20 transition-all duration-200 touch-manipulation h-10 lg:w-24 whitespace-nowrap">
                    <Share2 className="w-5 h-5 transition-transform duration-200 flex-shrink-0" />
                    <span className="hidden lg:inline truncate">{shareFeedback || shareLinkFeedback ? 'Copied!' : 'Share'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuItem onClick={handleShareChapter} className="cursor-pointer">
                    <AlignLeft className="w-4 h-4 mr-2" />
                    Share Text (Passage)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSharePerVerse} className="cursor-pointer">
                    <List className="w-4 h-4 mr-2" />
                    Share Text (Per Verse)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareLink} className="cursor-pointer">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Link Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => printChapterContents(verses, book, pos, filterMode, selectedVerses, colophon, columnMode, paragraphMode)}
                title="Print"
                className="kjb-fixed-btn flex items-center justify-center gap-1.5 px-3 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground transition-all duration-200 touch-manipulation h-10 whitespace-nowrap"
              >
                <Printer className="w-5 h-5 transition-transform duration-200 flex-shrink-0" />
                <span className="hidden lg:inline">Print</span>
              </button>

              <button onClick={goPrev} disabled={isFirstChapterFirstBook} data-testid="prev-chapter-btn" className="kjb-fixed-btn flex-shrink-0 flex items-center justify-center gap-1.5 px-3 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground disabled:opacity-30 transition-all duration-200 touch-manipulation h-10 whitespace-nowrap"><ChevronLeft className="w-5 h-5 transition-transform duration-200 flex-shrink-0" /><span className="hidden lg:inline">Prev</span></button>
              <button onClick={() => goNext()} disabled={isLastChapterLastBook} data-testid="next-chapter-btn" className="kjb-fixed-btn flex-shrink-0 flex items-center justify-center gap-1.5 px-3 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground disabled:opacity-30 transition-all duration-200 touch-manipulation h-10 whitespace-nowrap"><span className="hidden lg:inline">Next</span><ChevronRight className="w-5 h-5 transition-transform duration-200 flex-shrink-0" /></button>
              <button onClick={toggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="kjb-fixed-btn flex-shrink-0 flex items-center justify-center gap-1.5 px-3 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground transition-all duration-200 touch-manipulation h-10 whitespace-nowrap">{fullscreen ? <Minimize2 className="w-5 h-5 transition-transform duration-200 flex-shrink-0" /> : <Maximize2 className="w-5 h-5 transition-transform duration-200 flex-shrink-0" />}<span className="hidden lg:inline">{fullscreen ? 'Exit' : 'Full Screen'}</span></button>
              <button onClick={(e) => { e.stopPropagation(); setHideHeader(!hideHeader); }} title={hideHeader ? "Show header" : "Hide header"} className="kjb-fixed-btn flex-shrink-0 flex items-center justify-center px-2.5 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground transition-all duration-200 touch-manipulation h-10  whitespace-nowrap"><ChevronDown className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${hideHeader ? '' : 'rotate-180'}`} /></button>

              {((filterMode && selectedVerses.size > 0) || lastReadingActive || searchTerm || gospelMode || highlightVerse) && (
                <CurrentlyReadingIndicator
                  highlightVerse={highlightVerse}
                  filterMode={filterMode}
                  selectedVerses={selectedVerses}
                  lastReadingPos={lastReadingActive ? lastReadingPos : null}
                  book={book}
                  pos={pos}
                  highlightSection={highlightSection}
                  searchTerm={searchTerm}
                  gospelMode={gospelMode}
                  gospelLabel={gospelMode ? (getGospelNav().results[gospelResultIndex]?.label || 'Gospel') : null}
                  currentResultIndex={gospelMode ? gospelResultIndex : searchResultIndex}
                  totalResults={gospelMode ? gospelTotalResults : searchTotalResults}
                  occurrenceLabel={!gospelMode && searchTerm ? getOccurrenceLabel(searchResultIndex) : ''}
                  onPrevResult={() => {
                    if (gospelMode) {
                      const { results, index } = getGospelNav();
                      if (results.length === 0) return;
                      const prevIndex = (index - 1 + results.length) % results.length;
                      const r = results[prevIndex];
                      if (r) { setGospelIndex(prevIndex); setGospelResultIndex(prevIndex); stepToResult(r); }
                      return;
                    }
                    const { results, index } = getSearchNav();
                    if (results.length === 0) return;
                    const prevIndex = (index - 1 + results.length) % results.length;
                    const r = results[prevIndex];
                    if (r) { setSearchIndex(prevIndex); setSearchResultIndex(prevIndex); stepToResult(r); }
                  }}
                  onNextResult={() => {
                    if (gospelMode) {
                      const { results, index } = getGospelNav();
                      if (results.length === 0) return;
                      const nextIndex = (index + 1) % results.length;
                      const r = results[nextIndex];
                      if (r) { setGospelIndex(nextIndex); setGospelResultIndex(nextIndex); stepToResult(r); }
                      return;
                    }
                    const { results, index } = getSearchNav();
                    if (results.length === 0) return;
                    const nextIndex = (index + 1) % results.length;
                    const r = results[nextIndex];
                    if (r) { setSearchIndex(nextIndex); setSearchResultIndex(nextIndex); stepToResult(r); }
                  }}
                  onClear={() => {
                    // ALWAYS check for a saved previous reading position FIRST (works for search/gospel/daily/random)
                    let prevAbbr, prevChapter, prevScrollY;
                    
                    // Prefer kjb-prev-reading-session — it's the most accurate record of
                    // the chapter the user was actually reading (captured on chapter load + scroll).
                    try {
                      const prevRaw = localStorage.getItem('kjb-prev-reading-session');
                      if (prevRaw) {
                        const prev = JSON.parse(prevRaw);
                        if (prev && prev.abbr && prev.chapter) {
                          prevAbbr = prev.abbr;
                          prevChapter = prev.chapter;
                          prevScrollY = prev.scrollY;
                        }
                      }
                    } catch {}
                    
                    // Fall back to the prevAbbr/prevChapter baked into kjb-last-reading
                    if (!prevAbbr || !prevChapter) {
                      try {
                        const lastRaw = localStorage.getItem('kjb-last-reading');
                        if (lastRaw) {
                          const last = JSON.parse(lastRaw);
                          if (last && last.prevAbbr && last.prevChapter) {
                            prevAbbr = last.prevAbbr;
                            prevChapter = last.prevChapter;
                            prevScrollY = typeof last.prevScrollY === 'number' ? last.prevScrollY : last.scrollY;
                          }
                        }
                      } catch {}
                    }
                    
                    // Clear ALL state first (search, gospel, daily, random, filter, highlight)
                    if (searchTerm) { clearSearchContext(); }
                    if (gospelMode) { clearGospelNav(); setGospelMode(false); }
                    setLastReadingPos(null); setFilterMode(false); setSelectMode(false); setSelectedVerses(new Set());
                    setHighlightedVerses(new Set()); setHighlightVerse(null); setHighlightSection(null);
                    setShowFilterOverlay(false);
                    try { localStorage.removeItem('kjb-last-reading'); } catch {}
                    try { localStorage.removeItem('kjb-reader-toolbar-state'); } catch {}
                    
                    // Navigate back if we have a saved position
                    if (prevAbbr && prevChapter) {
                      returnToChapter(prevAbbr, prevChapter, prevScrollY);
                    } else {
                      // No prior session found — still go through the main
                      // navigate() so kjb-position, the URL and react-router's
                      // tracked location all clear the saved verse together.
                      navigate(pos.abbr, pos.chapter, null, false, false, true);
                    }
                  }}
                />
              )}
            </>
            )}

            {isViewingTitlePage && (
              <>
                <button onClick={goPrev} disabled={isFirstChapterFirstBook} title="Previous" data-testid="prev-chapter-btn" className="flex flex-1 items-center justify-center gap-1.5 px-2.5 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground disabled:opacity-30 transition-all duration-200 touch-manipulation h-10 "><ChevronLeft className="w-5 h-5 flex-shrink-0" /><span className="hidden lg:inline">Prev</span></button>
                <button onClick={() => goNext()} title="Next" data-testid="next-chapter-btn" className="flex flex-1 items-center justify-center gap-1.5 px-2.5 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground transition-all duration-200 touch-manipulation h-10 "><span className="hidden lg:inline">Next</span><ChevronRight className="w-5 h-5 flex-shrink-0" /></button>
                <button onClick={toggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="flex flex-1 items-center justify-center gap-1.5 px-2.5 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground transition-all duration-200 touch-manipulation h-10 ">{fullscreen ? <Minimize2 className="w-5 h-5 flex-shrink-0" /> : <Maximize2 className="w-5 h-5 flex-shrink-0" />}<span className="hidden lg:inline">{fullscreen ? 'Exit' : 'Full'}</span></button>
                <button onClick={(e) => { e.stopPropagation(); setHideHeader(!hideHeader); }} title={hideHeader ? "Show header" : "Hide header"} className="flex items-center justify-center px-2.5 rounded-lg bg-secondary border border-border hover:bg-accent/20 text-foreground transition-all duration-200 touch-manipulation h-10  flex-shrink-0"><ChevronDown className={`w-5 h-5 flex-shrink-0 ${hideHeader ? '' : 'rotate-180'}`} /></button>
              </>
            )}
          </div>

          {/* Single unified toolbar - SelectActionBar for multi-select mode, ReadingRangeBar for search/gospel/daily/navigation */}
          {selectMode && (
            <SelectActionBar
              selectedCount={selectedVerses.size} totalVerses={verses.length} copyFeedback={copyFeedback} shareFeedback={shareFeedback} shareLinkFeedback={shareLinkFeedback} saveFeedback={saveFeedback}
              onSelectAll={selectAllVerses} onCancel={() => {
                if (searchTerm) { clearSearchContext(); return; }
                if (gospelMode) { clearGospelNav(); setGospelMode(false); setHighlightVerse(null); setLastReadingPos(null); try { localStorage.removeItem('kjb-last-reading'); } catch {} return; }
                // Exit select mode. Only PRESERVE the filter when one was
                // already active before selecting (e.g. daily verse / random
                // chapter) — so the user returns to that filtered view. When
                // select mode was entered from a full chapter, Cancel clears
                // the selection and returns to the full chapter instead of
                // unexpectedly dropping into a filtered view.
                setSelectMode(false);
                if (filterMode && selectedVerses.size > 0) {
                  setHighlightVerse(Math.min(...selectedVerses));
                } else {
                  setFilterMode(false); setSelectedVerses(new Set()); setHighlightVerse(null);
                }
              }}
              onCopy={handleCopySelected} onCopyPerVerse={handleCopyPerVerse} onShareText={handleShareChapter} onShareTextPerVerse={handleSharePerVerse} onShareLink={handleShareLink}
              onReadSelected={handleReadSelected} onShowFull={() => { setFilterMode(false); setSelectMode(false); setSelectedVerses(new Set()); setShowFilterOverlay(false); }}
              onPrintPage={() => { if (!nativePrintCurrentPage()) window.print(); }} onPrintContents={() => printChapterContents(verses, book, pos, filterMode, selectedVerses, colophon, columnMode, paragraphMode)}
              onSave={handleSaveSelected} onHighlight={handleHighlightSelected}
            />
          )}
          
          {!selectMode && selectedVerses.size > 0 && tappedVerses.size === 0 && (
            <ReadingRangeBar
              label={searchTerm ? (/\d+:\d+/.test(searchTerm) ? `Currently Reading: ${book.shortName} ${pos.chapter}:${formatVerseRange([...selectedVerses])}` : `Search: "${searchTerm}"`) : gospelMode ? 'Gospel' : lastReadingActive ? (lastReadingPos?.fromRandom ? 'Random Chapter' : 'Daily Verse') : `Reading ${book.shortName} ${pos.chapter}:${formatVerseRange([...selectedVerses])}`}
              filterMode={filterMode} copyFeedback={copyFeedback} shareFeedback={shareFeedback} shareLinkFeedback={shareLinkFeedback} saveFeedback={saveFeedback}
              onCopy={handleCopySelected} onCopyPerVerse={handleCopyPerVerse} onShareText={handleShareChapter} onShareTextPerVerse={handleSharePerVerse} onShareLink={handleShareLink} onSave={handleSaveSelected} onPrintPage={() => { if (!nativePrintCurrentPage()) window.print(); }}
              onPrintContents={() => printChapterContents(verses, book, pos, filterMode, selectedVerses, colophon, columnMode, paragraphMode)}
              onToggleView={() => {
                setFilterMode(prev => {
                  const next = !prev; rangeHighlightRef.current = next; resultViewRef.current = next ? 'filter' : 'full';
                  if (!next && selectedVerses.size > 0) {
                    const first = Math.min(...selectedVerses); setHighlightVerse(first);
                    setTimeout(() => scrollToVerseEl(first), 80); setTimeout(() => scrollToVerseEl(first), 350);
                  }
                  return next;
                });
              }}
              onClear={() => {
                if (searchTerm) { clearSearchContext(); return; }
                if (gospelMode) { clearGospelNav(); setGospelMode(false); setHighlightVerse(null); setLastReadingPos(null); try { localStorage.removeItem('kjb-last-reading'); localStorage.removeItem('kjb-reader-toolbar-state'); } catch {} return; }
                if (lastReadingActive) { setLastReadingPos(null); try { localStorage.removeItem('kjb-last-reading'); localStorage.removeItem('kjb-reader-toolbar-state'); } catch {} return; }
                rangeHighlightRef.current = false; setSelectMode(false); setShowFilterOverlay(false);
                try { localStorage.removeItem('kjb-reader-toolbar-state'); } catch {}
                // Go through the main navigate() so pos, kjb-position (verse
                // cleared) and the URL all update together via react-router —
                // otherwise Home → Read can re-read a stale filtered verse.
                navigate(pos.abbr, pos.chapter, null, false, false, true);
              }}
            />
          )}

          {!selectMode && tappedVerseNums.length > 0 && (
            <VerseTapBar
              label={`${book.shortName} ${pos.chapter}:${formatVerseRange(tappedVerseNums)}`}
              isHighlighted={tappedVerseNums.some(n => !!getVerseHighlight(pos.abbr, pos.chapter, n))}
              isSaved={tappedVerseNums.every(n => isVerseSaved(pos.abbr, pos.chapter, n))}
              copyFeedback={tapCopyFeedback} shareFeedback={tapShareFeedback} saveFeedback={tapSaveFeedback}
              onToggleHighlight={handleTapHighlightToggle}
              onCopy={handleTapCopy}
              onShare={handleTapShare}
              onSave={handleTapSave}
              onClose={() => setTappedVerses(new Set())}
            />
          )}

          </div>
          )}

          {hideHeader && <MinimizedHeaderBar fullscreen={fullscreen} toggleFullscreen={toggleFullscreen} setHideHeader={setHideHeader} />}

      {/* Desktop-only backdrop for the inline popovers. On mobile the selectors
          use the bottom sheet (SelectorSheet), which has its own overlay — rendering
          this backdrop there would intercept the first tap and close the sheet. */}
      {!isMobile() && (showBookPicker || showChapterPicker || showVersePicker || showZoomPopover || showFontPopover) && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => { setShowBookPicker(false); setShowChapterPicker(false); setShowVersePicker(false); setShowZoomPopover(false); setShowFontPopover(false); }}
        />
      )}

      {!isViewingTitlePage && (!(filterMode && selectedVerses.size > 0) || chapterSubscript) && (
        <div className={`text-center mb-6 pt-8 ${(!columnMode || pos.chapter === 1 || (filterMode && selectedVerses.size > 0)) ? '' : 'hidden print:block'}`} style={{ fontSize: `${zoomLevel / 100}rem` }}>
          {filterMode && selectedVerses.size > 0 ? null : (
            <>
              <h1 className={`notranslate kjb-book-title ${fontFamily === 'cursive' ? 'cursive-em-style' : 'font-serif'} text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight`} style={{ fontStyle: 'normal', fontWeight: '900' }}>{book.name}</h1>
              <p className={`notranslate kjb-chapter-heading font-sans text-muted-foreground tracking-widest uppercase mt-5 ${fontFamily === 'cursive' ? 'cursive-em-style' : ''}`} style={{ fontStyle: 'normal', fontSize: `${zoomLevel / 100 * 0.875}rem`, fontWeight: fontFamily === 'cursive' ? '400' : undefined }}>
                Chapter {pos.chapter}
              </p>
            </>
          )}
          {chapterSubscript && (
            <p
              onClick={() => handleSectionClick('subscript')} id="kjb-subscript-anchor"
              className={`notranslate kjb-subscript text-sm text-muted-foreground mt-2 mb-4 max-w-lg mx-auto leading-relaxed text-center transition-colors duration-500 rounded-lg cursor-pointer ${fontFamily === 'cursive' ? 'cursive-em-style' : 'font-serif'} ${sectionActive('subscript') ? 'bg-accent/20 ring-1 ring-accent/40 px-3 py-2' : ''}`}
              style={{ fontStyle: 'normal', fontSize: `${zoomLevel / 100}rem` }}
            >
              <SubscriptContent text={chapterSubscript} searchTerm={sectionActive('subscript') ? searchTerm : null} />
            </p>
          )}
        </div>
      )}

      <div 
        ref={readerContentRef}
        className={`kjb-reader-content leading-loose text-foreground ${fontFamily === 'cursive' ? 'cursive-em-style' : ''}`}
        style={{ fontSize: `${zoomLevel / 100 * 1.125}rem`, lineHeight: zoomLevel > 100 ? '1.8' : '1.6', ...(fontFamily !== 'cursive' ? { fontFamily: getFontFamilyValue(fontFamily) } : {}) }}
      >
        {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>}
        {error && <div className="text-center py-16 text-destructive font-sans">{error}</div>}
        {!loading && !error && isViewingTitlePage && (
          <div style={{ fontFamily: "'Merriweather', 'Cormorant Garamond', Georgia, serif" }} className="kjb-titlepage [&_*]:!font-serif"><TitlePage type={pos.abbr === 'GEN' ? 'testament-old' : pos.abbr === 'MAT' ? 'testament-new' : 'book'} book={book} /></div>
        )}
        {!loading && !error && verses.length > 0 && columnMode && !isViewingTitlePage && pos.chapter !== 1 && (
          <RunningHead bookName={book.name} chapter={pos.chapter} baseFontRem={zoomLevel / 100 * 0.7} isCursive={fontFamily === 'cursive'} />
        )}
        {!loading && !error && verses.length > 0 && (() => {
          // selectedVerses may contain numbers (restored from localStorage) while
          // v.verse can be a string from the cached Bible data. Coerce both so the
          // filter matches — otherwise every verse is filtered out and only the
          // chapter heading / reference shows with no verse text.
          const verseInSelection = (v) => selectedVerses.has(parseInt(v.verse, 10)) || selectedVerses.has(String(v.verse));
          // Only actually filter when there's a real selection — never blank the
          // whole chapter (which left just the reference/highlight visible).
          const activeFilter = filterMode && selectedVerses.size > 0;
          const shownVerses = verses.filter(v => !activeFilter || verseInSelection(v));
          const useColumns = columnMode && shownVerses.length > 6;

          const renderVerse = (v, isFirstOverall) => (
            <React.Fragment key={`${pos.abbr}-${pos.chapter}-${v.verse}`}>
              <VerseText
                verse={v} highlight={tappedVerses.size > 0 ? tappedVerses.has(parseInt(v.verse, 10)) : (parseInt(highlightVerse, 10) === parseInt(v.verse, 10) || highlightedVerses.has(parseInt(v.verse, 10)))}
                id={`v${v.verse}`} bookName={book.name} abbr={pos.abbr} chapter={pos.chapter} isFirstVerse={isFirstOverall} paragraphMode={paragraphMode} selectMode={selectMode}
                isSelected={selectedVerses.has(parseInt(v.verse, 10)) || selectedVerses.has(String(v.verse))} onSelect={toggleVerseSelect} onActivateSelect={activateSelectFromVerse} totalVerses={verseCount}
                colophon={verses.length > 0 && String(v.verse) === String(verses[verses.length - 1].verse) ? colophon : null}
                subscript={parseInt(v.verse, 10) === 1 ? (chapterSubscript || null) : null}
                isCursive={fontFamily === 'cursive'} fontFamilyValue={getFontFamilyValue(fontFamily)} zoomLevel={zoomLevel} columnMode={useColumns} dropCap={isFirstOverall && parseInt(v.verse, 10) === 1}
                searchTerm={searchTerm && parseInt(highlightVerse, 10) === parseInt(v.verse, 10) ? searchTerm : null}
                isDirectJump={parseInt(highlightVerse, 10) === parseInt(v.verse, 10)}
                onVerseTap={toggleTappedVerse}
              />
            </React.Fragment>
          );

          const subscriptBlock = columnMode && !isViewingTitlePage && !(filterMode && selectedVerses.size > 0) && chapterSubscript ? (
            <p onClick={() => handleSectionClick('subscript')} id="kjb-subscript-anchor" className={`notranslate kjb-subscript text-center text-muted-foreground mb-4 leading-relaxed transition-colors duration-500 rounded-lg cursor-pointer ${fontFamily === 'cursive' ? 'cursive-em-style' : 'font-serif'} ${sectionActive('subscript') ? 'bg-accent/20 ring-1 ring-accent/40 px-3 py-2' : ''}`} style={{ fontStyle: 'normal', fontSize: `${zoomLevel / 100}rem`, breakInside: 'avoid' }}><SubscriptContent text={chapterSubscript} searchTerm={sectionActive('subscript') ? searchTerm : null} /></p>
          ) : null;

          return (
          <div ref={useColumns ? columnsContainerRef : null} data-testid={useColumns ? 'kjb-two-col-container' : undefined} className={`${useColumns ? 'kjb-two-col text-left hyphens-auto' : 'text-left'} ${paragraphMode ? 'text-left px-2 sm:px-4' : ''}`} style={useColumns ? { fontSize: 'inherit', columnCount: 2, columnGap: fontFamily === 'cursive' ? '3.5rem' : '2.5rem', columnRule: '1px solid hsl(var(--border))' } : { fontSize: 'inherit' }}>
            {subscriptBlock}
            {shownVerses.map((v, idx) => renderVerse(v, idx === 0))}
          </div>
          );
        })()}
        {!loading && !error && colophon && (!(filterMode && selectedVerses.size > 0) || (verses.length > 0 && selectedVerses.has(parseInt(verses[verses.length - 1].verse, 10)))) && (
          <div onClick={() => handleSectionClick('colophon')} id="kjb-colophon-anchor" className={`${columnMode ? 'mt-6 mb-4' : 'mt-12 mb-4 border-t border-border pt-6'} text-center transition-colors duration-500 rounded-lg cursor-pointer ${sectionActive('colophon') ? 'bg-accent/20 ring-1 ring-accent/40 px-3 py-2' : ''}`}>
            <p className={`notranslate kjb-colophon text-sm text-muted-foreground leading-relaxed ${fontFamily === 'cursive' ? 'cursive-em-style' : 'font-serif'}`} style={{ fontStyle: 'normal', fontSize: `${zoomLevel / 100}rem`, breakInside: 'avoid' }}><SubscriptContent text={colophon} searchTerm={sectionActive('colophon') ? searchTerm : null} /></p>
          </div>
        )}
      </div>

      {!loading && !error && ((pos.abbr === 'MAL' && pos.chapter === 4) || (pos.abbr === 'REV' && pos.chapter === 22)) && (
        <div className="text-center mt-14 mb-12 select-none">
          <p className={`notranslate text-foreground tracking-[0.35em] uppercase font-semibold kjb-end-marker ${fontFamily === 'cursive' ? 'cursive-em-style' : 'font-serif'}`} style={{ fontSize: `${zoomLevel / 100 * 1.15}rem`, fontStyle: 'normal' }}>{resolveEndMarker(book.apiName, pos.chapter) || (pos.abbr === 'MAL' ? 'The End of the Prophets' : 'The End')}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="hidden print:block mt-8 pt-4 border-t border-border text-sm text-muted-foreground text-center">Printed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
      )}

      {!loading && !error && (
        <div className="print:hidden flex flex-nowrap justify-between gap-2 mt-8 pt-6 border-t border-border pb-2">
          {!isFirstChapterFirstBook ? (
          <button onClick={goPrev} data-testid="prev-chapter-btn" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-secondary border border-border text-secondary-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-colors min-h-[48px] touch-manipulation min-w-0">
            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">{isViewingTitlePage ? `${getPrevBook(pos.abbr)?.shortName} ${getPrevBook(pos.abbr)?.chapters}` : pos.chapter > 1 ? `Chapter ${pos.chapter - 1}` : pos.abbr === 'MAT' ? 'New Testament Title Page' : pos.abbr === 'GEN' ? 'Old Testament Title Page' : `${getPrevBook(pos.abbr)?.shortName} ${getPrevBook(pos.abbr)?.chapters}`}</span>
          </button>
          ) : <div className="flex-1" />}
          {!isLastChapterLastBook ? (
          <button onClick={() => goNext()} data-testid="next-chapter-btn" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-secondary border border-border text-secondary-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-colors min-h-[48px] touch-manipulation min-w-0">
            <span className="hidden sm:inline truncate">{isViewingTitlePage ? `Chapter 1` : pos.chapter < book.chapters ? `Chapter ${pos.chapter + 1}` : pos.abbr === 'MAL' ? 'New Testament Title Page' : getNextBook(pos.abbr) ? `${getNextBook(pos.abbr).shortName} 1` : ''}</span>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          </button>
          ) : <div className="flex-1" />}
        </div>
      )}

    </div>
  );
}