import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bibleData';
import { useNavigate } from 'react-router-dom';
import { expandPassage } from '@/lib/expandPassage';
import { isMultiReference, expandMultiReference } from '@/lib/multiReference';
import { setSearchNav } from '@/lib/searchNav';
import GhostInput from '@/components/bible/GhostInput';

// Resolve a book token to a BIBLE_BOOKS entry (shortName starts-with or abbr).
function matchBook(token) {
  const s = token.trim().toLowerCase();
  return BIBLE_BOOKS.find(b =>
    b.shortName.toLowerCase().startsWith(s) || b.abbr.toLowerCase() === s
  );
}

// Parse input like "John 3:16", "Romans 8", "Romans 1:20-22",
// "John 3:16-4:2" (cross-chapter), "Matthew 28:1-Mark 1:5" (cross-book),
// "Genesis", or plain keyword.
function parseReference(input) {
  const trimmed = input.trim();

  // Cross-chapter / cross-book range: "Book Ch:V - [Book2] Ch:V"
  // The end side may carry its own book name (cross-book) or omit it (cross-chapter).
  const crossMatch = trimmed.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+):(\d+)\s*-\s*((?:\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+)?(\d+):(\d+)$/);
  if (crossMatch) {
    const startBook = matchBook(crossMatch[1].trim());
    const startCh = parseInt(crossMatch[2]);
    const startV = parseInt(crossMatch[3]);
    const endBook = crossMatch[4] ? matchBook(crossMatch[4].trim()) : startBook;
    const endCh = parseInt(crossMatch[5]);
    const endV = parseInt(crossMatch[6]);
    if (startBook && endBook && startCh >= 1 && startCh <= startBook.chapters && endCh >= 1 && endCh <= endBook.chapters) {
      // Same chapter & book → treat as a normal in-chapter range (tints all).
      if (startBook.abbr === endBook.abbr && startCh === endCh && startV <= endV) {
        return { type: 'reference', book: startBook, chapter: startCh, verse: startV, verseEnd: endV };
      }
      // Spans chapters/books → expand into a multi-verse passage.
      return { type: 'passage', startBook, startCh, startV, endBook, endCh, endV };
    }
  }

  // Try to match "Book Chapter:Verse-Verse" range e.g. Romans 1:20-22
  const rangeMatch = trimmed.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+):(\d+)-(\d+)$/);
  if (rangeMatch) {
    const bookStr = rangeMatch[1].trim();
    const chapter = parseInt(rangeMatch[2]);
    const verseStart = parseInt(rangeMatch[3]);
    const verseEnd = parseInt(rangeMatch[4]);
    const book = matchBook(bookStr);
    if (book && chapter >= 1 && chapter <= book.chapters && verseStart <= verseEnd) {
      return { type: 'reference', book, chapter, verse: verseStart, verseEnd };
    }
  }

  // Try to match "Book Chapter:Verse" or "Book Chapter"
  // Handles books that start with a number like "1 John"
  const refMatch = trimmed.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+)(?::(\d+))?$/);
  if (refMatch) {
    const bookStr = refMatch[1].trim();
    const chapter = parseInt(refMatch[2]);
    const verse = refMatch[3] ? parseInt(refMatch[3]) : null;

    const book = BIBLE_BOOKS.find(b =>
      b.shortName.toLowerCase().startsWith(bookStr.toLowerCase()) ||
      b.abbr.toLowerCase() === bookStr.toLowerCase()
    );
    if (book && chapter >= 1 && chapter <= book.chapters) {
      return { type: 'reference', book, chapter, verse };
    }
  }

  // Try to match just a book name
  const book = BIBLE_BOOKS.find(b =>
    b.shortName.toLowerCase() === trimmed.toLowerCase() ||
    b.abbr.toLowerCase() === trimmed.toLowerCase()
  );
  if (book) return { type: 'reference', book, chapter: 1, verse: null };

  // Otherwise keyword
  if (trimmed.length >= 3) return { type: 'keyword', query: trimmed };
  return null;
}

export default function BibleSearchBar({ onClose }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Whether the "Search..." placeholder actually fits is measured directly —
  // not guessed via a fixed pixel breakpoint — by comparing the real rendered
  // width of that text (canvas measureText, using the input's own font) against
  // the input's real available inner width (its width minus its own padding).
  // This stays correct regardless of header layout changes on any screen size.
  const [hasRoomForPlaceholder, setHasRoomForPlaceholder] = useState(true);
  const measureCanvasRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const inputEl = el.querySelector('input');
      if (!inputEl) return;
      const canvas = measureCanvasRef.current || (measureCanvasRef.current = document.createElement('canvas'));
      const ctx = canvas.getContext('2d');
      const style = window.getComputedStyle(inputEl);
      ctx.font = `${style.fontSize} ${style.fontFamily}`;
      const textWidth = ctx.measureText('Search...').width;
      const availableWidth = inputEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setHasRoomForPlaceholder(availableWidth >= textWidth);
    };
    measure();
    // Re-measure on App Zoom changes too — zoom grows the rendered font size
    // (via the --kjb-zoom-scale root variable) without necessarily changing
    // the search box's own layout width, so a ResizeObserver alone can miss
    // it and leave a stale "fits" verdict that then overlaps/clips the icon.
    window.addEventListener('kjb-layout-zoom-changed', measure);
    window.addEventListener('storage', measure);
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('kjb-layout-zoom-changed', measure);
        window.removeEventListener('storage', measure);
      };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.removeEventListener('kjb-layout-zoom-changed', measure);
      window.removeEventListener('storage', measure);
    };
  }, []);

  // Ctrl-F / Cmd-F focuses this search bar instead of the browser's find dialog.
  useEffect(() => {
    const handleFindKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleFindKey);
    return () => window.removeEventListener('keydown', handleFindKey);
  }, []);

  // Close the dropdown when clicking/tapping outside the search box
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase().replace(/\s+/g, ''); // Remove spaces for matching (e.g. "1 kings" → "1kings")

    // Alternate names mapping (e.g. "Preacher" → Ecclesiastes)
    // Also supports numeric forms like "1 kings", "2 samuel", etc.
    const ALTERNATE_NAMES = {
      preacher: 'ECC',
      ecclesiastes: 'ECC',
      song: 'SNG',
      songofsongs: 'SNG',
      canticles: 'SNG',
      samuel: '1SA', // Shows both 1&2 Samuel
      chronicles: '1CH', // Shows both 1&2 Chronicles
      '1kings': '1KI',
      '2kings': '2KI',
      '1samuel': '1SA',
      '2samuel': '2SA',
      '1chronicles': '1CH',
      '2chronicles': '2CH',
      '1corinthians': '1CO',
      '2corinthians': '2CO',
      '1thessalonians': '1TH',
      '2thessalonians': '2TH',
      '1timothy': '1TI',
      '2timothy': '2TI',
      '1peter': '1PE',
      '2peter': '2PE',
      '1john': '1JN',
      '2john': '2JN',
      '3john': '3JN',
    };
    
    const alternateMatch = ALTERNATE_NAMES[q];
    let bookMatches = [];
    
    // Special case: "kings" shows both Kings AND Samuel (like in SearchPage)
    if (q === 'kings') {
      const kingsBooks = BIBLE_BOOKS.filter(b => ['1KI', '2KI'].includes(b.abbr));
      const samuelBooks = BIBLE_BOOKS.filter(b => ['1SA', '2SA'].includes(b.abbr));
      bookMatches = [...kingsBooks, ...samuelBooks].map(b => ({ type: 'book', book: b, label: b.shortName, sub: `${b.chapters} chapters` }));
    } else if (alternateMatch) {
      // For alternate names like Samuel/Chronicles, show both books
      if (['1SA', '1CH'].includes(alternateMatch)) {
        const firstBook = BIBLE_BOOKS.find(b => b.abbr === alternateMatch);
        const secondBookAbbr = alternateMatch === '1SA' ? '2SA' : '2CH';
        const secondBook = BIBLE_BOOKS.find(b => b.abbr === secondBookAbbr);
        bookMatches = [firstBook, secondBook].filter(Boolean).map(b => ({ type: 'book', book: b, label: b.shortName, sub: `${b.chapters} chapters` }));
      } else {
        const book = BIBLE_BOOKS.find(b => b.abbr === alternateMatch);
        if (book) {
          bookMatches = [{ type: 'book', book, label: book.shortName, sub: `${book.chapters} chapters` }];
        }
      }
    } else {
      // Standard matching
      bookMatches = BIBLE_BOOKS.filter(b =>
        b.shortName.toLowerCase().includes(q) || b.abbr.toLowerCase().startsWith(q)
      ).slice(0, 5).map(b => ({ type: 'book', book: b, label: b.shortName, sub: `${b.chapters} chapters` }));
    }

    // Reference hint if they typed book + number (including ranges)
    const refSuggestions = [];
    // Comma-separated multi-reference (e.g. "Romans 3:25, 1 Corinthians 15:1-4")
    if (isMultiReference(query.trim())) {
      const count = query.trim().split(',').filter(s => s.trim()).length;
      refSuggestions.push({
        type: 'multi',
        input: query.trim(),
        label: query.trim(),
        sub: `Go to ${count} references`,
      });
    }
    // Cross-chapter / cross-book passage: "Book Ch:V - [Book2] Ch:V"
    const crossMatch = query.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+):(\d+)\s*-\s*((?:\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+)?(\d+):(\d+)$/);
    if (crossMatch) {
      const sBook = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().startsWith(crossMatch[1].trim().toLowerCase()));
      const sCh = parseInt(crossMatch[2]);
      const sV = parseInt(crossMatch[3]);
      const eBook = crossMatch[4]
        ? BIBLE_BOOKS.find(b => b.shortName.toLowerCase().startsWith(crossMatch[4].trim().toLowerCase()))
        : sBook;
      const eCh = parseInt(crossMatch[5]);
      const eV = parseInt(crossMatch[6]);
      const sameSpot = sBook && eBook && sBook.abbr === eBook.abbr && sCh === eCh;
      if (sBook && eBook && sCh >= 1 && sCh <= sBook.chapters && eCh >= 1 && eCh <= eBook.chapters && !sameSpot) {
        refSuggestions.push({
          type: 'passage',
          startBook: sBook, startCh: sCh, startV: sV,
          endBook: eBook, endCh: eCh, endV: eV,
          label: `${sBook.shortName} ${sCh}:${sV} – ${eBook.abbr === sBook.abbr ? '' : eBook.shortName + ' '}${eCh}:${eV}`,
          sub: 'Go to passage (spans chapters)',
        });
      }
    }
    // Range: Book Ch:V1-V2
    const rangeMatch = !crossMatch && query.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+):(\d+)-(\d+)$/);
    if (rangeMatch) {
      const bookStr = rangeMatch[1].trim();
      const ch = parseInt(rangeMatch[2]);
      const v1 = parseInt(rangeMatch[3]);
      const v2 = parseInt(rangeMatch[4]);
      const book = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().startsWith(bookStr.toLowerCase()));
      if (book && ch >= 1 && ch <= book.chapters && v1 <= v2) {
        refSuggestions.push({
          type: 'ref',
          book,
          chapter: ch,
          verse: v1,
          verseEnd: v2,
          label: `${book.shortName} ${ch}:${v1}–${v2}`,
          sub: `Go to passage (${v2 - v1 + 1} verses)`,
        });
      }
    }
    // Single ref or chapter
    const refMatch = query.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+)(?::(\d+))?$/);
    if (!rangeMatch && !crossMatch && refMatch) {
      const bookStr = refMatch[1].trim();
      const ch = parseInt(refMatch[2]);
      const v = refMatch[3] ? parseInt(refMatch[3]) : null;
      const book = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().startsWith(bookStr.toLowerCase()));
      if (book && ch >= 1 && ch <= book.chapters) {
        refSuggestions.push({
          type: 'ref',
          book,
          chapter: ch,
          verse: v,
          label: `${book.shortName} ${ch}${v ? `:${v}` : ''}`,
          sub: 'Go to passage',
        });
      }
    }

    // If a single book match (including from alternate names), show two options: go to book OR search
    let finalSuggestions = [...refSuggestions, ...bookMatches];
    if (bookMatches.length === 1 && refSuggestions.length === 0) {
      const bookMatch = bookMatches[0];
      finalSuggestions = [
        { type: 'book', book: bookMatch.book, label: `Go to ${bookMatch.book.shortName}`, sub: `${bookMatch.book.chapters} chapters` },
        { type: 'keyword', query: query.trim(), label: `Search "${query.trim()}"`, sub: 'Find all mentions in verses' }
      ];
    }
    
    // If multiple book matches (e.g. "Kings", "Samuel", "Chronicles", or alternate names), show all books + search option
    if (bookMatches.length > 1 && refSuggestions.length === 0) {
      finalSuggestions = [
        ...bookMatches.map(b => ({ type: 'book', book: b.book, label: `Go to ${b.book.shortName}`, sub: `${b.book.chapters} chapters` })),
        { type: 'keyword', query: query.trim(), label: `Search "${query.trim()}"`, sub: 'Find all mentions in verses' }
      ];
    }

    // Special section suggestions — typing "colophon" or "subscript"/"superscription"
    // offers to list every colophon / Psalm superscription in the Bible.
    const sectionSuggestions = [];
    if ('colophons'.startsWith(q) && q.length >= 3) {
      sectionSuggestions.push({ type: 'keyword', query: 'colophons', label: 'List all Colophons', sub: 'End-notes appended to the New Testament books' });
    }
    if (('subscripts'.startsWith(q) || 'superscriptions'.startsWith(q)) && q.length >= 3) {
      sectionSuggestions.push({ type: 'keyword', query: 'superscriptions', label: 'List all Superscriptions', sub: 'Psalm titles shown above the first verse' });
    }

    // Keyword hint (only if no book match)
    const kwSuggestions = query.trim().length >= 3 && bookMatches.length === 0 && refSuggestions.length === 0
      ? [{ type: 'keyword', query: query.trim(), label: `Search: "${query.trim()}"`, sub: 'Keyword search across the Bible' }]
      : [];

    setSuggestions([...sectionSuggestions, ...finalSuggestions, ...kwSuggestions]);
    setSelectedIndex(-1); // Reset selection when suggestions change
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    // Esc always closes the dropdown and blurs, even with no suggestions
    if (e.key === 'Escape') {
      setOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (!open || suggestions.length === 0) {
      // Enter with no open dropdown / no suggestions must still submit via the
      // form handler — and never trigger a native form submit (which navigates
      // to "/" and bounces to Home on mobile when the soft keyboard fires Enter).
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e);
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Tab') {
      // Tab / Shift+Tab cycles through suggestions instead of leaving the field
      e.preventDefault();
      if (e.shiftKey) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else {
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Only honour an explicitly highlighted suggestion (arrow/hover). Otherwise
      // submit the literal typed text so a freshly-typed reference like
      // "Romans 3:25" is parsed live — never a stale suggestions[0].
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSelectedIndex(-1);
    }
  };

  const goTo = (abbr, chapter, verse, verseEnd) => {
    // Keep verseEnd in localStorage so the reader can enter range/filter mode.
    try { localStorage.setItem('kjb-position', JSON.stringify({ abbr, chapter, verse: verse || null, verseEnd: verseEnd || null })); } catch {}
    // Clear search term and last reading position so CurrentlyReadingIndicator doesn't show stale context.
    // Also clear the toolbar-state cache — otherwise useToolbarState's pending
    // restore timeout (100ms) reads the stale saved search context back in
    // when the reference lands on the same chapter it was saved for.
    try { localStorage.removeItem('kjb-search-term'); } catch {}
    try { localStorage.removeItem('kjb-last-reading'); } catch {}
    try { localStorage.removeItem('kjb-reader-toolbar-state'); } catch {}
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onClose?.();
    inputRef.current?.blur();
    const vEndParam = verse && verseEnd && verseEnd > verse ? `&verseEnd=${verseEnd}` : '';
    // Route verse-level jumps through the same single-result "search nav" path
    // that goPassage/goMulti already use (from=search + setSearchNav). That path
    // is what reliably sets the highlight and clears any stale one — the old
    // "no from param" fallback here is what let a typed reference land on a
    // chapter without highlighting, or drag along a previous chapter's stale
    // highlight/selection.
    if (verse) {
      const b = BIBLE_BOOKS.find(bk => bk.abbr === abbr);
      const label = `${b ? b.shortName : abbr} ${chapter}:${verse}`;
      setSearchNav([{ abbr, chapter, verse, verseEnd: verseEnd || null }], 0, label);
    } else {
      // Whole-chapter jumps (no verse) don't go through the highlightVerse
      // scroll-to-verse effect, and the kjb-navigate listener in BibleReader
      // doesn't reset scroll on its own — it falls through to the scroll-RESTORE
      // logic, which either re-applies a stale saved offset for that chapter or
      // (if none saved) leaves the page wherever it was already scrolled. Reset
      // to top explicitly here, same as ContentsPage's goTo().
      (document.getElementById('kjb-scroll') || window).scrollTo({ top: 0 });
    }
    const url = verse ? `/read?book=${abbr}&chapter=${chapter}&verse=${verse}${vEndParam}&from=search` : `/read?book=${abbr}&chapter=${chapter}`;
    navigate(url);
    // If already on /read with the same URL, notify the mounted reader to load it.
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  };

  const goPassage = async (p) => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onClose?.();
    inputRef.current?.blur();
    const blocks = await expandPassage(p);
    if (!blocks.length) return;
    // Store the blocks as a stepper so the reader's up/down arrows walk through
    // each chapter of the passage. Each block carries its verse range.
    const results = blocks.map(b => ({ abbr: b.abbr, chapter: b.chapter, verse: b.vStart, verseEnd: b.vEnd }));
    const label = `${p.startBook.shortName} ${p.startCh}:${p.startV}–${p.endBook.abbr === p.startBook.abbr ? '' : p.endBook.shortName + ' '}${p.endCh}:${p.endV}`;
    setSearchNav(results, 0, label);
    const first = blocks[0];
    try {
      localStorage.setItem('kjb-position', JSON.stringify({ abbr: first.abbr, chapter: first.chapter, verse: first.vStart, verseEnd: first.vEnd }));
      localStorage.removeItem('kjb-last-reading');
      localStorage.removeItem('kjb-reader-toolbar-state');
    } catch {}
    navigate(`/read?book=${first.abbr}&chapter=${first.chapter}&verse=${first.vStart}&from=search`);
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  };

  const goMulti = async (input) => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onClose?.();
    inputRef.current?.blur();
    const expanded = await expandMultiReference(input);
    if (!expanded) return;
    const { results, label } = expanded;
    setSearchNav(results, 0, label);
    const first = results[0];
    try {
      localStorage.setItem('kjb-position', JSON.stringify({ abbr: first.abbr, chapter: first.chapter, verse: first.verse, verseEnd: first.verseEnd || null }));
      localStorage.removeItem('kjb-last-reading');
      // Clear stale toolbar state so it can't override the filter mode / selection
      // that stepToResult sets for this search result (the old saved state may be
      // for the same chapter but with filterMode=false from a previous reading session).
      localStorage.removeItem('kjb-reader-toolbar-state');
    } catch {}
    const vParam = first.verse ? `&verse=${first.verse}` : '';
    navigate(`/read?book=${first.abbr}&chapter=${first.chapter}${vParam}&from=search`);
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  };

  const goKeyword = (kw) => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onClose?.();
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(kw)}`);
  };

  const handleSelect = (s) => {
    if (s.type === 'book') goTo(s.book.abbr, 1, null);
    else if (s.type === 'ref') goTo(s.book.abbr, s.chapter, s.verse, s.verseEnd);
    else if (s.type === 'passage') goPassage(s);
    else if (s.type === 'multi') goMulti(s.input);
    else if (s.type === 'keyword') goKeyword(s.query || query.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (isMultiReference(query.trim())) {
      goMulti(query.trim());
      return;
    }
    const parsed = parseReference(query);
    if (parsed?.type === 'reference') {
      goTo(parsed.book.abbr, parsed.chapter, parsed.verse, parsed.verseEnd);
    } else if (parsed?.type === 'passage') {
      goPassage(parsed);
    } else if (query.trim().length >= 3) {
      goKeyword(query.trim());
    }
  };

  return (
    <div className="relative w-full px-1" ref={containerRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none flex-shrink-0 z-10" />
          <GhostInput
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedIndex(-1); }}
            onAccept={(full) => { setQuery(full); setOpen(true); inputRef.current?.focus(); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={hasRoomForPlaceholder ? 'Search...' : ''}
            leftPadClass="pl-9"
            inputClassName="w-full pl-9 pr-8 py-1.5 h-9 rounded-lg bg-secondary border border-border text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors truncate"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
              className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground active:opacity-60"
              style={{ touchAction: 'manipulation' }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[240px] max-w-[calc(100vw-2rem)]">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-3 py-3 min-h-[48px] transition-colors text-left border-b border-border last:border-0 touch-manipulation ${
                i === selectedIndex
                  ? 'bg-accent/15 ring-1 ring-inset ring-accent/40 border-l-2 border-l-accent'
                  : 'hover:bg-secondary'
              }`}
            >
              <Search className={`w-3.5 h-3.5 flex-shrink-0 ${i === selectedIndex ? 'text-accent' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <p className="notranslate font-sans text-sm font-medium text-foreground truncate">{s.label}</p>
                <p className="font-sans text-xs text-muted-foreground truncate">{s.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}