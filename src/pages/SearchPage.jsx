import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, BookOpen, Loader2, Filter, Copy, Download, CheckSquare, Square, X, BookMarked, ChevronDown, Share2, ChevronUp, ChevronDown as ChevronDownIcon, ChevronRight, Printer, FlaskConical } from 'lucide-react';
import { getBibleData } from '@/lib/bibleCache';
import { normalizeApostrophes, normalizeQueryApostrophes, normalizeLigatures } from '@/lib/bibleApi';
import { BIBLE_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT, BOOK_BY_API_NAME } from '@/lib/bibleData';
import { parseReference, resolveBook } from '@/lib/parseReference';
import { expandPassage } from '@/lib/expandPassage';
import { isMultiReference, expandMultiReference } from '@/lib/multiReference';
import SearchResultsList from '@/components/bible/SearchResultsList';
import GhostInput from '@/components/bible/GhostInput';
import { setSearchNav, clearSearchNav } from '@/lib/searchNav';
import ExportMenu from '@/components/bible/ExportMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { exportVerses } from '@/lib/exportVerses';
import { buildVerseUrl } from '@/lib/formatDailyVerse';
import { getPublicOrigin } from '@/lib/publicOrigin';
import { nativeShare } from '@/lib/nativeShare';
import { isNativeAndroid } from '@/lib/isNativeAndroid';
import { toast } from 'sonner';
import { SUBSCRIPTS } from '@/lib/bibleSubscripts';

// Parse a cross-chapter / cross-book passage like "John 3:16-4:2" (same book,
// spans chapters) or "Matthew 28:1-Mark 1:5" (spans books). Returns
// { startBook, startCh, startV, endBook, endCh, endV } or null. Same-chapter
// ranges (e.g. "John 3:16-18") return null so parseReference handles them.
function parsePassage(input) {
  const trimmed = (input || '').trim();
  const m = trimmed.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+):(\d+)\s*-\s*((?:\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+)?(\d+):(\d+)$/);
  if (!m) return null;
  const startBook = resolveBook(m[1].trim());
  const startCh = parseInt(m[2], 10);
  const startV = parseInt(m[3], 10);
  const endBook = m[4] ? resolveBook(m[4].trim()) : startBook;
  const endCh = parseInt(m[5], 10);
  const endV = parseInt(m[6], 10);
  if (!startBook || !endBook) return null;
  if (startCh < 1 || startCh > startBook.chapters || endCh < 1 || endCh > endBook.chapters) return null;
  // Same book + same chapter → not a passage; let parseReference handle the range.
  if (startBook.abbr === endBook.abbr && startCh === endCh) return null;
  return { startBook, startCh, startV, endBook, endCh, endV };
}

const OT_BOOKS = new Set(BIBLE_BOOKS.filter(b => b.testament === 'old').map(b => b.apiName));
const NT_BOOKS = new Set(BIBLE_BOOKS.filter(b => b.testament === 'new').map(b => b.apiName));

// Strip surrounding quotes from a display query (for "results for" labels)
function stripQuotes(s) {
  if (!s) return s;
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
      (t.startsWith('\u201C') && t.endsWith('\u201D') && t.length >= 2)) {
    return t.slice(1, -1).trim();
  }
  return t;
}

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getQueryFromUrl = () => new URLSearchParams(window.location.search).get('q') || '';

  const [query, setQuery] = useState(getQueryFromUrl);
  // Start in loading state if there's a query in the URL, so the empty/prompt
  // states don't flash before the initial search kicks off.
  const [loading, setLoading] = useState(() => getQueryFromUrl().trim().length >= 2);
  const [highlightTerm, setHighlightTerm] = useState('');
  const [highlightCaseSensitive, setHighlightCaseSensitive] = useState(false);
  const [highlightWholeWord, setHighlightWholeWord] = useState(false);
  const [results, setResults] = useState([]);
  const [totalOccurrences, setTotalOccurrences] = useState(0);
  const [searched, setSearched] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState(new Set(['all'])); // Multi-select: 'all', 'old', 'new'
  const [wholeWord, setWholeWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [numberedBookFilter, setNumberedBookFilter] = useState(null);
  const [showBookFilter, setShowBookFilter] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [showBookResult, setShowBookResult] = useState(null); // { bookName, abbr, chapters, testament }
  const [bookFilterQuery, setBookFilterQuery] = useState('');
  const [booksWithResults, setBooksWithResults] = useState(null); // Track which books have results for current search (null = no search yet)
  // The full set of books that contain the word, computed from an UNFILTERED search.
  // The book-filter panel uses this so you can always clear back to every matching book,
  // even after a search was narrowed to a selected subset.
  const [allBooksWithResults, setAllBooksWithResults] = useState(null);
  const [searchStats, setSearchStats] = useState({ ot: null, nt: null });
  // Tracks the last query text we searched, so we only reset the book selection
  // on a genuinely new query (not when re-running to apply the book filter).
  const lastQueryRef = useRef(getQueryFromUrl());

  // Measures the sticky header block's rendered height (title + search box +
  // filters + results count/toolbar/keyboard hint — all one physical sticky
  // container) so the OT/NT section headers inside SearchResultsList can
  // stick right below it via the --kjb-search-sticky-offset CSS var, instead
  // of overlapping it. Uses the live measured height directly (via
  // ResizeObserver) rather than a fixed guess, so it stays correct even when
  // the block's height changes dynamically — e.g. selecting verses opens an
  // extra panel inside it, filters wrap to another line on a narrow screen,
  // etc. The observer re-fires automatically whenever that height changes.
  const stickyHeaderRef = useRef(null);
  useEffect(() => {
    const el = stickyHeaderRef.current;
    if (!el) return;
    const update = () => {
      // Set on the root element (not `el` itself) - SearchResultsList's OT/NT
      // headers are siblings of this block, not descendants, so the CSS var
      // needs a common ancestor to be visible to them.
      const h = el.getBoundingClientRect().height;
      try { document.documentElement.style.setProperty('--kjb-search-sticky-offset', `${h}px`); } catch {}
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { ro.disconnect(); try { document.documentElement.style.removeProperty('--kjb-search-sticky-offset'); } catch {} };
  }, []);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  
  // Track current search result index for navigation
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  // Keyboard navigation: focused result index (-1 = none)
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const resultRefs = React.useRef([]);

  const runSearch = useCallback(async (kw) => {
    if (!kw || kw.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    setSelected(new Set());
    setSelectMode(false);
    setNumberedBookFilter(null);
    // NOTE: do NOT clear selectedBooks here — runSearch also runs when applying
    // the book filter, and clearing it would wipe the user's selection. New
    // queries clear it explicitly in handleSubmit and the URL-change effect.

    try {
      console.log('[SEARCH] Starting search for:', kw);
      const bible = await getBibleData();
      // Yield a frame so the loading spinner actually paints before the heavy
      // synchronous scan begins (otherwise the UI looks frozen on big terms).
      await new Promise(r => requestAnimationFrame(() => r()));
      console.log('[SEARCH] Bible data loaded, books:', Object.keys(bible).filter(k => k !== '__colophons').length);
      // Normalize a curly apostrophe (from mobile "smart punctuation") to a
      // plain one, so the query matches verse text regardless of which
      // apostrophe form either side happens to use.
      let searchTerm = normalizeQueryApostrophes(kw.trim());
      // If query is wrapped in quotes, treat as exact phrase: strip the quotes
      // (the Bible text doesn't contain literal quote characters)
      const isQuotedPhrase = (searchTerm.startsWith('"') && searchTerm.endsWith('"') && searchTerm.length >= 3) ||
                              (searchTerm.startsWith('\u201C') && searchTerm.endsWith('\u201D') && searchTerm.length >= 3);
      if (isQuotedPhrase) {
        searchTerm = searchTerm.slice(1, -1).trim();
      }
      setHighlightTerm(searchTerm);
      
      // Quoted phrases force exact phrase + whole word + match case on, so
      // "Prince" matches only the capitalized form, not "prince".
      const effectiveCaseSensitive = isQuotedPhrase ? true : caseSensitive;
      const effectiveWholeWord = isQuotedPhrase ? true : wholeWord;
      setHighlightCaseSensitive(effectiveCaseSensitive);
      setHighlightWholeWord(effectiveWholeWord);
      if (isQuotedPhrase) {
        if (!wholeWord) setWholeWord(true);
        if (!caseSensitive) setCaseSensitive(true);
      }
      
      const kwLower = searchTerm.toLowerCase();

      // Multi-keyword AND search: if the query has multiple comma-separated terms
      // (e.g. "heart, imagination"), find verses containing ALL of them and
      // highlight each. Single-word or quoted queries are unaffected.
      const multiTerms = !isQuotedPhrase
        ? searchTerm.split(',').map(t => t.trim()).filter(t => t.length >= 2)
        : [];
      const isMultiKeyword = multiTerms.length >= 2;
      if (isMultiKeyword) {
        // Highlight every term (comma-joined; the highlighter splits on commas).
        setHighlightTerm(multiTerms.join(', '));
      }

      // Check if the query is a scripture reference (by name OR abbreviation),
      // e.g. "jn 3:16", "gen 1", "1 cor 13:4-7", "psalm 23". If so, jump straight to it.
      if (!isQuotedPhrase) {
        if (isMultiReference(searchTerm)) {
          goToMultiReference(searchTerm);
          setLoading(false);
          return;
        }
        const passage = parsePassage(searchTerm);
        if (passage) {
          goToPassage(passage);
          setLoading(false);
          return;
        }
        const ref = parseReference(searchTerm);
        if (ref) {
          goToReference(ref);
          setLoading(false);
          return;
        }
      }

      // Check if query is a numbered book (e.g., "1 john", "2 timothy") or contains one
      const numberedBookMatch = kwLower.match(/(\d+)\s+([a-z]+)/);
      
      // Check if query matches a book name (e.g. "Joshua", "Jude", "Samuel", "Genesis", "Kings")
      // Also match alternate names like "Preacher" for Ecclesiastes
      const ALTERNATE_NAMES = {
        preacher: 'ECC',
        ecclesiastes: 'ECC',
        song: 'SNG',
        songofsongs: 'SNG',
        canticles: 'SNG',
      };
      
      const alternateMatch = ALTERNATE_NAMES[kwLower];
      let bookMatches = [];
      
      if (alternateMatch) {
        // For alternate names like Preacher/Song, get the specific book
        bookMatches = [BIBLE_BOOKS.find(b => b.abbr === alternateMatch)].filter(Boolean);
      } else if (kwLower === 'kings') {
        // Special case: "kings" shows both Kings AND Samuel
        const kingsBooks = BIBLE_BOOKS.filter(b => ['1KI', '2KI'].includes(b.abbr));
        const samuelBooks = BIBLE_BOOKS.filter(b => ['1SA', '2SA'].includes(b.abbr));
        bookMatches = [...kingsBooks, ...samuelBooks];
      } else if (kwLower === 'samuel') {
        // Special case: "samuel" shows both Samuel AND Kings
        const samuelBooks = BIBLE_BOOKS.filter(b => ['1SA', '2SA'].includes(b.abbr));
        const kingsBooks = BIBLE_BOOKS.filter(b => ['1KI', '2KI'].includes(b.abbr));
        bookMatches = [...samuelBooks, ...kingsBooks];
      } else if (kwLower === 'chronicles') {
        // Special case: "chronicles" shows both 1&2 Chronicles
        const chroniclesBooks = BIBLE_BOOKS.filter(b => ['1CH', '2CH'].includes(b.abbr));
        bookMatches = chroniclesBooks;
      } else {
        // Standard matching. Require at least 2 chars before matching a book
        // abbreviation, so a single letter (e.g. "f") doesn't accidentally
        // match a one-letter internal abbr and suggest the wrong book.
        bookMatches = BIBLE_BOOKS.filter(b => 
          b.shortName.toLowerCase() === kwLower ||
          b.apiName.toLowerCase() === kwLower ||
          (kwLower.length >= 2 && b.abbr.toLowerCase() === kwLower) ||
          (kwLower.length >= 3 && b.shortName.toLowerCase().includes(kwLower))
        );
      }
      
      // For partial matches like "Samuel", "Chronicles" - show all matching books
      // Skip this for "kings" since we already handled it specially above
      if (kwLower.length >= 3 && kwLower !== 'kings') {
        const partialMatches = BIBLE_BOOKS.filter(b => b.shortName.toLowerCase().includes(kwLower));
        if (partialMatches.length > 1) {
          bookMatches = partialMatches;
        }
      }
      
      // Store all matching books for the UI to display multiple options
      const matchingBooks = bookMatches.length > 0 ? bookMatches : [];
      
      // Prioritize exact matches, fall back to first match
      const exactBookMatch = bookMatches.find(b => 
        b.shortName.toLowerCase() === kwLower ||
        b.apiName.toLowerCase() === kwLower ||
        (kwLower.length >= 2 && b.abbr.toLowerCase() === kwLower)
      );
      const bookMatch = exactBookMatch || (bookMatches.length > 0 ? bookMatches[0] : null);
      
      if (bookMatch && !isQuotedPhrase && !numberedBookMatch) {
        setShowBookResult({ 
          bookName: bookMatch.shortName, 
          abbr: bookMatch.abbr, 
          chapters: bookMatch.chapters, 
          testament: bookMatch.testament,
          allMatches: matchingBooks // Store all matches for UI
        });
      } else {
        setShowBookResult(null);
      }
      
      // Clear last reading position when starting a new search
      try { localStorage.removeItem('kjb-last-reading'); } catch {}
      let targetBookAbbr = null;
      if (numberedBookMatch) {
        const num = numberedBookMatch[1];
        const bookPart = numberedBookMatch[2];
        const matchingBook = BIBLE_BOOKS.find(b => 
          b.shortName.toLowerCase() === `${num} ${bookPart}` ||
          b.shortName.toLowerCase().startsWith(`${num} ${bookPart}`) ||
          b.shortName.toLowerCase().includes(`${num} ${bookPart}`)
        );
        if (matchingBook) {
          targetBookAbbr = matchingBook.abbr;
          setNumberedBookFilter(targetBookAbbr);
        }
      }

      const matches = [];
      const seen = new Set();
      const searchTermLower = searchTerm.toLowerCase();

      // Special keyword: "colophon(s)" lists every book colophon; "subscript(s)"
      // / "superscription(s)" lists every Psalm superscription.
      const listAllColophons = !isQuotedPhrase && ['colophon', 'colophons'].includes(kwLower);
      const listAllSubscripts = !isQuotedPhrase && ['subscript', 'subscripts', 'superscription', 'superscriptions'].includes(kwLower);
      if (listAllColophons || listAllSubscripts) {
        setHighlightTerm('');
        setShowBookResult(null);
        if (listAllColophons && bible.__colophons) {
          for (const key in bible.__colophons) {
            const [bookName, chapterNum] = key.split(':');
            if (!OT_BOOKS.has(bookName) && !NT_BOOKS.has(bookName)) continue;
            const bookEntry = BIBLE_BOOKS.find(b => b.apiName === bookName);
            matches.push({
              book: bookName,
              chapter: parseInt(chapterNum),
              verse: 0,
              text: bible.__colophons[key].replace(/¶\s*/g, ''),
              isColophon: true,
              abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
            });
          }
        }
        if (listAllSubscripts) {
          for (const key in SUBSCRIPTS) {
            const [bookName, chapterNum] = key.split(':');
            const bookEntry = BIBLE_BOOKS.find(b => b.apiName === bookName);
            matches.push({
              book: bookName,
              chapter: parseInt(chapterNum),
              verse: 0,
              text: SUBSCRIPTS[key].replace(/¶\s*/g, ''),
              isSubscript: true,
              abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
            });
          }
        }
        // Sort by canonical book order, then chapter
        matches.sort((a, b) => {
          const ai = BIBLE_BOOKS.findIndex(x => x.apiName === a.book);
          const bi = BIBLE_BOOKS.findIndex(x => x.apiName === b.book);
          return ai !== bi ? ai - bi : a.chapter - b.chapter;
        });
        setResults(matches);
        const booksWithHits = new Set(matches.map(m => m.abbr));
        setBooksWithResults(booksWithHits);
        
        // Only capture the full matching-book list when the search wasn't narrowed
        // by a book selection — so the panel can always offer every matching book.
        if (selectedBooks.size === 0) {
          setAllBooksWithResults(booksWithHits);
          
          let otVerses = 0, ntVerses = 0;
          let otOcc = 0, ntOcc = 0;
          for (const m of matches) {
            if (OT_BOOKS.has(m.book)) {
              otVerses++;
              otOcc++;
            } else if (NT_BOOKS.has(m.book)) {
              ntVerses++;
              ntOcc++;
            }
          }
          const otBooks = [...booksWithHits].filter(abbr => OLD_TESTAMENT.some(b => b.abbr === abbr)).length;
          const ntBooks = [...booksWithHits].filter(abbr => NEW_TESTAMENT.some(b => b.abbr === abbr)).length;
          setSearchStats({
            ot: { books: otBooks, verses: otVerses, occ: otOcc },
            nt: { books: ntBooks, verses: ntVerses, occ: ntOcc }
          });
        }
        setTotalOccurrences(matches.length);
        setLoading(false);
        return;
      }

      for (const bookName in bible) {
        if (bookName === '__colophons') continue;
        // Multi-select testament filter
        const hasAll = testamentFilter.has('all');
        const hasOld = testamentFilter.has('old');
        const hasNew = testamentFilter.has('new');
        const isOT = OT_BOOKS.has(bookName);
        const isNT = NT_BOOKS.has(bookName);
        // Skip if no matching testament selected
        if (!hasAll && ((isOT && !hasOld) || (isNT && !hasNew))) continue;
        
        if (selectedBooks.size > 0) {
          const bookEntry = BIBLE_BOOKS.find(b => b.apiName === bookName);
          if (!bookEntry || !selectedBooks.has(bookEntry.abbr)) continue;
        }
        
        if (targetBookAbbr) {
          const bookEntry = BIBLE_BOOKS.find(b => b.apiName === bookName);
          if (!bookEntry || bookEntry.abbr !== targetBookAbbr) continue;
        }

        const chapters = bible[bookName];
        for (const chapterNum in chapters) {
          const verses = chapters[chapterNum];
          // Keep italics in brackets for search and display. Apostrophes are
          // stored in the source text as a replacement char immediately after
          // a letter (e.g. "God\uFFFDs") — convert those to real apostrophes
          // so typing "God's" actually matches.
          const processedVerses = verses.map(v => ({
            verse: v.verse,
            text: normalizeApostrophes(v.text.replace(/¶\s*/g, '').replace(/^<<[^>]*>>\s*/, '')),
            heading: v.heading || null
          }));
          
          // Search in verses
          for (const verseObj of processedVerses) {
            let found = false;
            // Strip bracket markers so word boundaries match real words (e.g. [sin] -> sin).
            // Also normalize æ/Æ ligatures (e.g. "Judæa", "Cæsar") to "ae"/"Ae" for
            // matching only — typing "Caesar" or "Judea" still finds them — the
            // displayed match text below uses the original verseObj.text untouched.
            const searchText = normalizeLigatures(verseObj.text.replace(/[[\]]/g, ''));
            const searchTextLower = searchText.toLowerCase();

            // Multi-keyword AND: verse must contain EVERY term (case-insensitive,
            // honouring whole-word when enabled).
            if (isMultiKeyword) {
              found = multiTerms.every(term => {
                const tl = term.toLowerCase();
                if (effectiveWholeWord) {
                  const esc = tl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  return new RegExp(`(^|[^a-z'])${esc}($|[^a-z'])`, 'i').test(searchText);
                }
                return searchTextLower.includes(tl);
              });
              if (found) {
                const key = `${bookName}-${chapterNum}-${verseObj.verse}`;
                if (seen.has(key)) continue;
                seen.add(key);
                const bookEntry = BOOK_BY_API_NAME[bookName];
                matches.push({
                  book: bookName,
                  chapter: parseInt(chapterNum, 10),
                  verse: parseInt(verseObj.verse, 10),
                  text: verseObj.text,
                  abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
                });
              }
              continue;
            }

            if (effectiveCaseSensitive) {
              if (effectiveWholeWord) {
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordRegex = new RegExp(`(^|[^A-Za-z'])${escapedTerm}($|[^A-Za-z'])`);
                found = wordRegex.test(searchText);
              } else {
                found = searchText.includes(searchTerm);
              }
            } else {
              if (effectiveWholeWord) {
                const escapedTerm = searchTermLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordRegex = new RegExp(`(^|[^a-z'])${escapedTerm}($|[^a-z'])`, 'i');
                found = wordRegex.test(searchText);
              } else {
                found = searchTextLower.includes(searchTermLower);
              }
            }

            if (found) {
              const key = `${bookName}-${chapterNum}-${verseObj.verse}`;
              if (seen.has(key)) continue;
              seen.add(key);
              const bookEntry = BOOK_BY_API_NAME[bookName];
              matches.push({
                book: bookName,
                chapter: parseInt(chapterNum, 10),
                verse: parseInt(verseObj.verse, 10),
                text: verseObj.text,
                abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
              });
            }
          }
          
          // Search in Psalm 119 acrostic stanza headings (ALEPH, BETH, JOD, …)
          for (const verseObj of processedVerses) {
            if (!verseObj.heading) continue;
            const headingClean = verseObj.heading.trim();
            const headingLower = headingClean.toLowerCase();
            let headingFound = false;

            if (effectiveCaseSensitive) {
              if (effectiveWholeWord) {
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                headingFound = new RegExp(`(^|[^A-Za-z'])${escapedTerm}($|[^A-Za-z'])`).test(headingClean);
              } else {
                headingFound = headingClean.includes(searchTerm);
              }
            } else {
              if (effectiveWholeWord) {
                const escapedTerm = searchTermLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                headingFound = new RegExp(`(^|[^a-z'])${escapedTerm}($|[^a-z'])`, 'i').test(headingClean);
              } else {
                headingFound = headingLower.includes(searchTermLower);
              }
            }

            if (headingFound) {
              const key = `${bookName}-${chapterNum}-${verseObj.verse}-heading`;
              if (!seen.has(key)) {
                seen.add(key);
                const bookEntry = BOOK_BY_API_NAME[bookName];
                matches.push({
                  book: bookName,
                  chapter: parseInt(chapterNum, 10),
                  verse: parseInt(verseObj.verse, 10),
                  verseEnd: (bookName === 'Psalms' && parseInt(chapterNum, 10) === 119) ? parseInt(verseObj.verse, 10) + 7 : undefined,
                  text: headingClean.toUpperCase(),
                  isHeading: true,
                  abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
                });
              }
            }
          }

          // Search in colophons for this chapter (keyed flat as "BookName:chapter")
          const colophon = bible.__colophons?.[`${bookName}:${chapterNum}`];
          if (colophon) {
            const colophonText = normalizeApostrophes(colophon.replace(/¶\s*/g, ''));
            const colophonLower = colophonText.toLowerCase();
            let colophonFound = false;
            
            if (effectiveCaseSensitive) {
              if (effectiveWholeWord) {
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordRegex = new RegExp(`(^|[^A-Za-z'])${escapedTerm}($|[^A-Za-z'])`);
                colophonFound = wordRegex.test(colophonText);
              } else {
                colophonFound = colophonText.includes(searchTerm);
              }
            } else {
              if (effectiveWholeWord) {
                const escapedTerm = searchTermLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordRegex = new RegExp(`(^|[^a-z'])${escapedTerm}($|[^a-z'])`);
                colophonFound = wordRegex.test(colophonLower);
              } else {
                colophonFound = colophonLower.includes(searchTermLower);
              }
            }
            
            if (colophonFound) {
              const key = `${bookName}-${chapterNum}-colophon`;
              if (!seen.has(key)) {
                seen.add(key);
                const bookEntry = BOOK_BY_API_NAME[bookName];
                matches.push({
                  book: bookName,
                  chapter: parseInt(chapterNum),
                  verse: 0, // Mark as colophon
                  text: colophonText,
                  isColophon: true,
                  abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
                });
              }
            }
          }

          // Search in subscript (Psalm superscription) for this chapter
          const subscript = SUBSCRIPTS[`${bookName}:${chapterNum}`];
          if (subscript) {
            const subscriptText = normalizeApostrophes(subscript.replace(/¶\s*/g, ''));
            const subscriptClean = subscriptText.replace(/[[\]]/g, '');
            const subscriptLower = subscriptClean.toLowerCase();
            let subscriptFound = false;

            if (effectiveCaseSensitive) {
              if (effectiveWholeWord) {
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordRegex = new RegExp(`(^|[^A-Za-z'])${escapedTerm}($|[^A-Za-z'])`);
                subscriptFound = wordRegex.test(subscriptClean);
              } else {
                subscriptFound = subscriptClean.includes(searchTerm);
              }
            } else {
              if (effectiveWholeWord) {
                const escapedTerm = searchTermLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const wordRegex = new RegExp(`(^|[^a-z'])${escapedTerm}($|[^a-z'])`, 'i');
                subscriptFound = wordRegex.test(subscriptClean);
              } else {
                subscriptFound = subscriptLower.includes(searchTermLower);
              }
            }

            if (subscriptFound) {
              const key = `${bookName}-${chapterNum}-subscript`;
              if (!seen.has(key)) {
                seen.add(key);
                const bookEntry = BOOK_BY_API_NAME[bookName];
                matches.push({
                  book: bookName,
                  chapter: parseInt(chapterNum),
                  verse: 0, // Subscript sits before verse 1
                  text: subscriptText,
                  isSubscript: true,
                  abbr: bookEntry ? bookEntry.abbr : bookName.slice(0, 3).toUpperCase(),
                });
              }
            }
          }
        }
      }

      setResults(matches);

      // Track which books have results
      const booksWithHits = new Set(matches.map(m => {
        const bookEntry = BOOK_BY_API_NAME[m.book];
        return bookEntry ? bookEntry.abbr : null;
      }).filter(Boolean));
      setBooksWithResults(booksWithHits);
      
      // Compute total occurrences (multiple hits per verse counted) so the
      // results header matches standard concordance figures. For multi-keyword
      // searches, count every term's hits across each verse.
      const occTerms = isMultiKeyword ? multiTerms : [searchTerm];
      const occRes = occTerms.map(t => {
        const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return effectiveWholeWord
          ? new RegExp(`(?<![A-Za-z'])${esc}(?![A-Za-z'])`, effectiveCaseSensitive ? 'g' : 'gi')
          : new RegExp(esc, effectiveCaseSensitive ? 'g' : 'gi');
      });
      let totalOcc = 0;
      let otVerses = 0, ntVerses = 0;
      let otOcc = 0, ntOcc = 0;
      
      for (const m of matches) {
        const clean = (m.text || '').replace(/[[\]]/g, '');
        const occInVerse = occRes.reduce((sum, re) => sum + (clean.match(re) || []).length, 0);
        totalOcc += occInVerse;
        
        if (OT_BOOKS.has(m.book)) {
          otVerses++;
          otOcc += occInVerse;
        } else if (NT_BOOKS.has(m.book)) {
          ntVerses++;
          ntOcc += occInVerse;
        }
      }
      setTotalOccurrences(totalOcc);

      // Only capture the full matching-book list when the search wasn't narrowed
      // by a book selection — so the panel can always offer every matching book.
      if (selectedBooks.size === 0) {
        setAllBooksWithResults(booksWithHits);
        const otBooks = [...booksWithHits].filter(abbr => OLD_TESTAMENT.some(b => b.abbr === abbr)).length;
        const ntBooks = [...booksWithHits].filter(abbr => NEW_TESTAMENT.some(b => b.abbr === abbr)).length;
        setSearchStats({
          ot: { books: otBooks, verses: otVerses, occ: otOcc },
          nt: { books: ntBooks, verses: ntVerses, occ: ntOcc }
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    }
    setLoading(false);
  }, [testamentFilter, wholeWord, caseSensitive, selectedBooks, numberedBookFilter]);

  // Re-run the search whenever filters change (after an initial search has been done)
  // Note: selectedBooks is NOT included - book selection filters results without re-searching
  useEffect(() => {
    const q = (getQueryFromUrl() || query).trim();
    if (searched && q.length >= 2) {
      runSearch(q);
      // Filter change → jump results back to the top, same as a brand-new
      // query, so the new filtered set doesn't leave the user scrolled deep
      // into a list that just changed under them.
      const scroller = document.getElementById('kjb-scroll');
      if (scroller) scroller.scrollTo({ top: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testamentFilter, wholeWord, caseSensitive, numberedBookFilter]);

  // Re-run search whenever URL changes (fixes header search bar)
  useEffect(() => {
    const q = getQueryFromUrl();
    if (q) {
      setQuery(q);
      // Only treat as a brand-new search (clearing book selection) when the
      // query text actually changed — not on filter-driven re-renders.
      if (q !== lastQueryRef.current) {
        lastQueryRef.current = q;
        setSelectedBooks(new Set());
        // New query → forget the previous pre-search position so the next
        // result click captures the current reading chapter fresh.
        try { localStorage.removeItem('kjb-pre-search'); } catch {}
        // New query from the header search bar → scroll results to the top
        // (the app scrolls inside #kjb-scroll, not the window).
        const scroller = document.getElementById('kjb-scroll');
        if (scroller) scroller.scrollTo({ top: 0 });
      }
      runSearch(q);
    }
  }, [location.search]);

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
    }
    // Clear any focused result so the global Enter handler can't open a stale
    // result alongside this submit.
    setFocusedIndex(-1);
    const kw = query.trim();
    if (!kw) return;

    // Comma-separated multi-reference (e.g. "Romans 3:25, 1 Corinthians 15:1-4")
    if (isMultiReference(kw)) {
      goToMultiReference(kw);
      return;
    }

    // Check for a cross-chapter / cross-book passage first (e.g. "John 3:16-4:2"
    // or "Matthew 28:1-Mark 1:5") — go straight to the reader as a passage.
    const passage = parsePassage(kw);
    if (passage) {
      goToPassage(passage);
      return;
    }

    // Check if it's a single verse reference - if so, navigate directly to it.
    // Use a clean navigation (NOT goToVerse) so we don't reuse the previous
    // keyword results as the search stepper — otherwise the reader would open
    // the first stale result instead of this reference.
    const ref = parseReference(kw);
    if (ref) {
      goToReference(ref);
      return;
    }
    
    if (kw.length >= 2) {
      // Dismiss mobile keyboard explicitly before navigating state
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.history.replaceState({}, '', `/search?q=${encodeURIComponent(kw)}`);
      setSearched(true);
      setShowBookResult(null);
      // New query typed → start fresh with all books.
      setSelectedBooks(new Set());
      lastQueryRef.current = kw;
      // Scroll back to the top so the new results appear from the first verse,
      // not wherever the user had scrolled to in the previous results. The app
      // scrolls inside the #kjb-scroll <main>, not the window, so scroll that
      // element (window.scrollTo is a no-op here and left the list scrolled down).
      const scroller = document.getElementById('kjb-scroll');
      if (scroller) scroller.scrollTo({ top: 0 });
      runSearch(kw);
    }
  };

  const goToVerse = useCallback((abbr, chapter, verse, verseEnd, resultIndex = null, section = null) => {
    // Store the search term for the CurrentlyReadingIndicator.
    // Read the query from the URL (not the `query` state) so this callback's
    // identity stays stable while typing — otherwise SearchResultsList's
    // React.memo breaks and the whole list re-renders on every keystroke.
    const q = getQueryFromUrl();
    // Remember where the user was reading BEFORE this search jump, so closing
    // the search results returns them to the prior chapter (not the search one).
    // Only set it once per search session — don't overwrite when stepping
    // between results.
    try {
      if (!localStorage.getItem('kjb-pre-search')) {
        // Prefer the accurate last normal-reading chapter (written by the reader)
        // so Clear returns exactly where the user was — fall back to kjb-position.
        let cur = null;
        try {
          const prev = JSON.parse(localStorage.getItem('kjb-prev-reading-session') || 'null');
          if (prev && prev.abbr && prev.chapter) cur = prev;
        } catch {}
        if (!cur) cur = JSON.parse(localStorage.getItem('kjb-position') || '{}');
        if (cur && cur.abbr && cur.chapter) {
          const stash = { abbr: cur.abbr, chapter: cur.chapter, scrollY: typeof cur.scrollY === 'number' ? cur.scrollY : 0 };
          localStorage.setItem('kjb-pre-search', JSON.stringify(stash));
          // Also write the canonical key the reader's Clear handler reads first.
          localStorage.setItem('kjb-prev-reading-session', JSON.stringify(stash));
        }
      }
    } catch {}
    try { localStorage.setItem('kjb-position', JSON.stringify({ abbr, chapter, verse: verse || null, verseEnd: verseEnd || null, highlight: section || null })); } catch {}
    // Clear last reading position (from daily verse/random) when navigating from search
    try { localStorage.removeItem('kjb-last-reading'); } catch {}
    // Store search nav state (in-memory + localStorage backup).
    // Include the section (colophon/subscript) so the reader's prev/next stepper
    // can re-highlight non-verse sections instead of just loading the chapter.
    // Expand each verse into ONE entry per occurrence of the term, so stepping
    // up/down stops at every occurrence within the same verse separately.
    // Build one regex per search term. For a multi-keyword query like
    // "heart, imagination" we split on commas so EACH keyword occurrence in a
    // verse becomes its own a/b/c stepper stop. Quoted phrases stay as one term.
    const occRes = (() => {
      if (!q) return [];
      const isQuoted = (q.startsWith('"') && q.endsWith('"')) || (q.startsWith('\u201C') && q.endsWith('\u201D'));
      const cleaned = isQuoted ? q.slice(1, -1) : q;
      const terms = isQuoted
        ? [cleaned.trim()].filter(Boolean)
        : cleaned.split(',').map(t => t.trim()).filter(t => t.length >= 2);
      const list = terms.length ? terms : [cleaned.trim()].filter(Boolean);
      return list.map(t => {
        const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try { return new RegExp(esc, highlightCaseSensitive ? 'g' : 'gi'); } catch { return null; }
      }).filter(Boolean);
    })();
    const compact = [];
    let startNavIndex = 0;
    const clickedIdx = resultIndex !== null ? resultIndex : 0;
    results.forEach((r, ri) => {
      if (ri === clickedIdx) startNavIndex = compact.length;
      const base = {
        abbr: r.abbr,
        chapter: r.chapter,
        verse: r.verse,
        verseEnd: r.verseEnd || null,
        section: r.isColophon ? 'colophon' : r.isSubscript ? 'subscript' : null,
      };
      // Count occurrences in plain verses only (not ranges/colophons/subscripts).
      // Sum every search term's hits so multi-keyword verses get one stepper
      // stop (a/b/c) per keyword occurrence.
      let count = 1;
      if (!base.section && !base.verseEnd && occRes.length) {
        const clean = (r.text || '').replace(/[[\]]/g, '');
        count = Math.max(1, occRes.reduce((sum, re) => sum + (clean.match(re) || []).length, 0));
      }
      for (let o = 0; o < count; o++) compact.push({ ...base, occurrence: o });
    });
    setSearchNav(compact, startNavIndex, q);
    window.scrollTo({ top: 0 });
    // Navigate with URL params so the reader reliably scrolls to + highlights the verse.
    // Include the search term (&q=) so the URL is shareable/bookmarkable.
    const qParam = q ? `&q=${encodeURIComponent(q)}` : '';
    const hlParam = section ? `&highlight=${section}` : '';
    const vEndParam = verseEnd ? `&verseEnd=${verseEnd}` : '';
    const url = verse
      ? `/read?book=${abbr}&chapter=${chapter}&verse=${verse}${vEndParam}&from=search${qParam}`
      : `/read?book=${abbr}&chapter=${chapter}&from=search${hlParam}${qParam}`;
    navigate(url);
    // If already on /read, notify the mounted reader to load this passage.
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  }, [navigate, results]);

  // Navigate to a single parsed reference. A single-book verse RANGE
  // (e.g. "John 3:16-18") carries verseEnd so the reader filters to ONLY those
  // verses. A plain verse/chapter is a clean navigation.
  const goToReference = useCallback((ref) => {
    try {
      localStorage.setItem('kjb-position', JSON.stringify({ abbr: ref.abbr, chapter: ref.chapter, verse: ref.verse || null, verseEnd: ref.verseEnd || null }));
      localStorage.removeItem('kjb-last-reading');
      // Also clear the toolbar-state cache — otherwise useToolbarState's pending
      // restore timeout (100ms) reads the stale saved search context back in
      // when the reference lands on the same chapter it was saved for.
      localStorage.removeItem('kjb-reader-toolbar-state');
    } catch {}
    clearSearchNav();
    const vParam = ref.verse ? `&verse=${ref.verse}` : '';
    const vEndParam = ref.verse && ref.verseEnd && ref.verseEnd > ref.verse ? `&verseEnd=${ref.verseEnd}` : '';
    navigate(`/read?book=${ref.abbr}&chapter=${ref.chapter}${vParam}${vEndParam}`);
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  }, [navigate]);

  // Navigate to a multi-chapter/multi-book passage as a stepper (matches the
  // header search bar): expand into per-chapter blocks, store as search nav so
  // the reader's up/down arrows walk through each chapter with its verse range.
  const goToPassage = useCallback(async (p) => {
    const blocks = await expandPassage(p);
    if (!blocks.length) return;
    const results = blocks.map(b => ({ abbr: b.abbr, chapter: b.chapter, verse: b.vStart, verseEnd: b.vEnd }));
    const label = `${p.startBook.shortName} ${p.startCh}:${p.startV}–${p.endBook.abbr === p.startBook.abbr ? '' : p.endBook.shortName + ' '}${p.endCh}:${p.endV}`;
    setSearchNav(results, 0, label);
    const first = blocks[0];
    try {
      localStorage.setItem('kjb-position', JSON.stringify({ abbr: first.abbr, chapter: first.chapter, verse: first.vStart, verseEnd: first.vEnd }));
      localStorage.removeItem('kjb-last-reading');
    } catch {}
    const vEndParam = first.vEnd && first.vEnd > first.vStart ? `&verseEnd=${first.vEnd}` : '';
    navigate(`/read?book=${first.abbr}&chapter=${first.chapter}&verse=${first.vStart}${vEndParam}&from=search`);
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  }, [navigate]);

  // Navigate a comma-separated multi-reference (e.g. "Romans 3:25, 1 Cor 15:1-4")
  // as a stepper: expand every segment into ordered blocks and walk through them.
  const goToMultiReference = useCallback(async (input) => {
    const expanded = await expandMultiReference(input);
    if (!expanded) return;
    const { results, label } = expanded;
    setSearchNav(results, 0, label);
    const first = results[0];
    try {
      localStorage.setItem('kjb-position', JSON.stringify({ abbr: first.abbr, chapter: first.chapter, verse: first.verse, verseEnd: first.verseEnd || null }));
      localStorage.removeItem('kjb-last-reading');
    } catch {}
    const vParam = first.verse ? `&verse=${first.verse}` : '';
    const vEndParam = first.verse && first.verseEnd && first.verseEnd > first.verse ? `&verseEnd=${first.verseEnd}` : '';
    navigate(`/read?book=${first.abbr}&chapter=${first.chapter}${vParam}${vEndParam}&from=search`);
    setTimeout(() => { try { window.dispatchEvent(new Event('kjb-navigate')); } catch {} }, 0);
  }, [navigate]);

  // Selection helpers
  const toggleSelect = useCallback((i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(results.map((_, i) => i)));
  const clearSelection = () => { setSelected(new Set()); setSelectMode(false); };

  // Format selected verses — each verse on its own line with its own reference.
  // Brackets are converted to nothing (plain text) for clean copy/export.
  const formatVerses = (indices) => {
    const sorted = [...indices].sort((a, b) => a - b);
    const lines = sorted.map((i, idx) => {
      const r = results[i];
      // A pilcrow marks a new paragraph — keep that visual gap above it in the
      // copied text (instead of silently stripping it with no break) so
      // paragraph breaks stay legible outside the app.
      const hasPilcrow = /^\s*¶/.test(r.text || '');
      const text = r.text
        .replace(/¶\s*/g, '')
        .replace(/^<<[^>]*>>\s*/, '')
        .replace(/\[([^\]]+)\]/g, '$1');
      const bookEntry = BIBLE_BOOKS.find(b => b.apiName === r.book);
      const bookName = bookEntry ? bookEntry.shortName : r.book;
      const isColophon = r.isColophon || (r.verse === 0 && !r.isSubscript && !r.isHeading);
      const ref = r.isSubscript
        ? `${bookName} ${r.chapter} superscription`
        : r.isHeading
        ? `${bookName} ${r.chapter}:${r.verse} (stanza)`
        : (r.isColophon || r.verse === 0)
        ? `${bookName} ${r.chapter} colophon`
        : `${bookName} ${r.chapter}:${r.verse}`;
      const q = getQueryFromUrl() || query;
      const url = buildVerseUrl({ abbr: r.abbr, chapter: r.chapter, verse: (isColophon || r.isSubscript) ? null : r.verse, from: 'search' }) + (q ? `&q=${encodeURIComponent(q)}` : '');
      // Wrap the link in <> so chat apps don't render a link embed/preview.
      // Copying more than one verse puts each reference at the top (no dash);
      // a single verse keeps the reference at the end with a dash.
      const bullet = sorted.length > 1
        ? `${ref} (KJB)\n"${text}"\n  Read: <${url}>`
        : `• "${text}"\n  — ${ref} (KJB)\n  Read: <${url}>`;
      return (hasPilcrow && idx > 0) ? `\n${bullet}` : bullet;
    });
    return lines.join('\n\n');
  };

  const handleCopySelected = async () => {
    const text = selected.size > 0 ? formatVerses(selected) : formatVerses(results.map((_, i) => i));
    await navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1800);
  };

  // Build export items (raw text with brackets + reference) for the chosen format.
  const handleExport = (format) => {
    const indices = selected.size > 0 ? [...selected] : results.map((_, i) => i);
    const sorted = [...indices].sort((a, b) => a - b);
    const q = getQueryFromUrl() || query;
    const items = sorted.map(i => {
      const r = results[i];
      const bookEntry = BIBLE_BOOKS.find(b => b.apiName === r.book);
      const bookName = bookEntry ? bookEntry.shortName : r.book;
      const isColophon = r.isColophon || (r.verse === 0 && !r.isSubscript && !r.isHeading);
      const isSubscript = r.isSubscript;
      const isHeading = r.isHeading;
      const ref = isSubscript
        ? `${bookName}: ${r.chapter} superscription`
        : isHeading
        ? `${bookName}: ${r.chapter}:${r.verse} (stanza)`
        : isColophon
        ? `${bookName}: ${r.chapter} colophon`
        : `${bookName}: ${r.chapter}:${r.verse}`;
      const url = buildVerseUrl({ abbr: r.abbr, chapter: r.chapter, verse: (isColophon || isSubscript) ? null : r.verse, from: 'search' }) + (q ? `&q=${encodeURIComponent(q)}` : '');
      return { 
        text: r.text, 
        ref, 
        testament: bookEntry ? bookEntry.testament : 'old', 
        url, 
        bookName: bookEntry ? bookEntry.name : r.book,
        bookShortName: bookName,
        bookNameObj: bookEntry 
      };
    });
    // Describe the active filters so the export filename reflects them.
    const testament = testamentFilter.has('all')
      ? null
      : testamentFilter.has('old') && !testamentFilter.has('new')
      ? 'old'
      : testamentFilter.has('new') && !testamentFilter.has('old')
      ? 'new'
      : null;
    const filters = {
      wholeWord,
      caseSensitive,
      testament,
      bookCount: selectedBooks.size > 0 && selectedBooks.size < 66 ? selectedBooks.size : 0,
    };
    exportVerses(format, items, q, filters, { showQuery: true })
      .then(() => toast.success(isNativeAndroid() ? 'Saved to your Downloads folder!' : 'File downloaded successfully!'))
      .catch((err) => { console.error('Export failed:', err); toast.error('Export failed. Please try again.'); });
  };

  // Share search results as a LINK ONLY — builds the search URL and copies/shares it.
  const handleShare = async () => {
    const q = getQueryFromUrl() || query;
    const shareUrl = `<${getPublicOrigin()}/search?q=${encodeURIComponent(q)}>`;

    if (nativeShare({ title: `KJB Search: ${q}`, text: shareUrl })) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: `KJB Search: ${q}`, text: shareUrl });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 1800);
    } catch {}
  };

  const selectedList = [...selected].sort((a, b) => a - b);
  
  // Reset focus when results change
  useEffect(() => { setFocusedIndex(-1); resultRefs.current = []; }, [results]);

  // Arrow/J-K/Enter navigation (including book-header stops) is owned by
  // SearchResultsList, which knows the grouped order. We only reset focus here.

  // Navigate to previous/next search result
  const handlePrevResult = () => {
    if (currentResultIndex > 0) {
      const prevIndex = currentResultIndex - 1;
      const r = results[prevIndex];
      const section = r.isColophon ? 'colophon' : r.isSubscript ? 'subscript' : null;
      if (section) goToVerse(r.abbr, r.chapter, null, null, prevIndex, section);
      else goToVerse(r.abbr, r.chapter, r.verse, r.verseEnd || null, prevIndex);
    }
  };
  
  const handleNextResult = () => {
    if (currentResultIndex < results.length - 1) {
      const nextIndex = currentResultIndex + 1;
      const r = results[nextIndex];
      const section = r.isColophon ? 'colophon' : r.isSubscript ? 'subscript' : null;
      if (section) goToVerse(r.abbr, r.chapter, null, null, nextIndex, section);
      else goToVerse(r.abbr, r.chapter, r.verse, r.verseEnd || null, nextIndex);
    }
  };

  return (
    <div className="min-h-screen bg-background print:bg-none">
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-6 print:p-0 print:pt-4">
      {/* Title + search box + filters + results count/toolbar/keyboard hint
          all live inside this ONE sticky container, so they stay reachable
          and scroll together as a single unit while scrolling through a
          long results list. ref is used to measure its rendered height so
          the OT/NT section headers in SearchResultsList can stick right
          below it via the --kjb-search-sticky-offset CSS var. */}
      <div ref={stickyHeaderRef} className="sticky top-0 z-20 bg-background pt-6 -mt-6 pb-2 print:static print:p-0 print:m-0">
      <h1 className="font-serif text-2xl font-bold text-foreground mb-4 print:hidden">Search Bible</h1>

      {/* Print-only title */}
      <h1 className="hidden print:block font-serif text-2xl font-bold text-black mb-4">
        Search Results for "{stripQuotes(getQueryFromUrl() || query)}"
      </h1>

      <form onSubmit={handleSubmit} action="#" className="flex gap-2 mb-3 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <GhostInput
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusedIndex(-1); }}
            onAccept={(full) => setQuery(full)}
            onFocus={() => {
              // On mobile, the on-screen keyboard shrinks the viewport and the
              // browser's own scroll-into-view can leave this sticky header
              // (title + search box) scrolled above the visible area. Force the
              // scroll container back to the top after the keyboard finishes
              // animating in, so the input stays visible while typing.
              setTimeout(() => {
                const scroller = document.getElementById('kjb-scroll');
                if (scroller) scroller.scrollTo({ top: 0 });
                else window.scrollTo({ top: 0 });
              }, 300);
            }}
            onKeyDown={(e) => {
              // Enter in the box always submits THIS query. We preventDefault to
              // stop the browser's native form GET-submit (which bounces to "/" on
              // some mobile keyboards), and call handleSubmit ourselves so Enter
              // still works. stopPropagation keeps the global results-list keydown
              // handler from opening a stale result instead.
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent?.stopImmediatePropagation?.();
                handleSubmit();
              }
            }}
            enterKeyHint="search"
            placeholder="e.g. study, Romans 3:25, 1 Corinthians 15:1-4"
            leftPadClass="pl-9"
            inputClassName="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-sm font-sans text-foreground placeholder:text-muted-foreground placeholder:text-xs sm:placeholder:text-sm focus:outline-none focus:border-accent transition-colors"
            autoFocus={!getQueryFromUrl()}
          />
        </div>
        <button
          type="submit"
          disabled={query.trim().length < 2 || loading}
          className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-sans text-sm font-medium shadow-md shadow-primary/20 hover:brightness-105 disabled:opacity-40 transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="hidden xs:inline">Search</span>
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5 print:hidden">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-sans text-xs text-muted-foreground">Testament:</span>
        {(() => {
          const otDisabled = searched && !searchStats.ot?.books;
          const ntDisabled = searched && !searchStats.nt?.books;
          const testamentValue =
            testamentFilter.has('all') ? 'all'
            : (testamentFilter.has('old') && testamentFilter.has('new')) ? 'all'
            : testamentFilter.has('old') ? 'old'
            : testamentFilter.has('new') ? 'new' : 'all';
          const triggerLabel = testamentValue === 'all'
            ? (otDisabled && !ntDisabled ? 'All (NT only)' : (!otDisabled && ntDisabled ? 'All (OT only)' : 'All'))
            : testamentValue === 'old' ? 'Old Testament' : 'New Testament';
          return (
            <Select value={testamentValue} onValueChange={(val) => setTestamentFilter(new Set([val]))}>
              <SelectTrigger className="h-7 w-[132px] rounded-lg font-sans text-xs font-medium border-border bg-secondary px-2.5 py-1 gap-1">
                <SelectValue>{triggerLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-sans text-xs">All</SelectItem>
                <SelectItem value="old" className="font-sans text-xs" disabled={otDisabled}>Old Testament</SelectItem>
                <SelectItem value="new" className="font-sans text-xs" disabled={ntDisabled}>New Testament</SelectItem>
              </SelectContent>
            </Select>
          );
        })()}
        <button
          type="button"
          onClick={() => setShowBookFilter(!showBookFilter)}
          className={`px-2.5 py-1 rounded-lg font-sans text-xs font-medium transition-colors flex items-center gap-1 ${
            showBookFilter || (selectedBooks.size > 0 && selectedBooks.size < 66)
              ? 'bg-primary text-primary-foreground ring-2 ring-primary/40'
              : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          Books {selectedBooks.size > 0 && selectedBooks.size < 66 ? `(${selectedBooks.size})` : selectedBooks.size === 66 ? '(All)' : ''}
          <ChevronDown className={`w-3 h-3 transition-transform ${showBookFilter ? 'rotate-180' : ''}`} />
        </button>
        <div className="ml-2 flex items-center gap-1.5">
          <input
            id="whole-word"
            type="checkbox"
            checked={wholeWord}
            onChange={e => setWholeWord(e.target.checked)}
            className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer"
          />
          <label htmlFor="whole-word" className="font-sans text-xs text-muted-foreground cursor-pointer select-none">Match whole word</label>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            id="case-sensitive"
            type="checkbox"
            checked={caseSensitive}
            onChange={e => setCaseSensitive(e.target.checked)}
            className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer"
          />
          <label htmlFor="case-sensitive" className="font-sans text-xs text-muted-foreground cursor-pointer select-none">Match case</label>
        </div>
      </div>

      {/* Book filter panel — click/tap outside to dismiss */}
      {showBookFilter && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 flex items-start justify-center p-4 pt-20"
          onClick={() => setShowBookFilter(false)}
          onTouchEnd={() => setShowBookFilter(false)}
          style={{ pointerEvents: 'auto' }}
          role="presentation"
        >
          <div
            className="w-full max-w-md max-h-[70vh] flex flex-col bg-card border border-border rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <p className="font-sans text-sm font-semibold text-foreground">
                Select Books {selectedBooks.size > 0 && selectedBooks.size < 66 ? `(${selectedBooks.size})` : selectedBooks.size === 66 ? '(All 66)' : ''}
              </p>
              <button onClick={() => setShowBookFilter(false)} className="p-1.5 rounded-lg hover:bg-accent/20">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {/* Search input for filtering books */}
            <div className="p-5 pb-4 flex-shrink-0">
              <input
                type="text"
                value={bookFilterQuery}
                onChange={(e) => setBookFilterQuery(e.target.value)}
                placeholder="Search books..."
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2.5 px-4 sm:px-5 pb-1 flex-shrink-0">
              <button
                onClick={() => {
                  const booksToSelect = BIBLE_BOOKS
                    .filter(b => !bookFilterQuery || b.shortName.toLowerCase().includes(bookFilterQuery.toLowerCase()));
                  setSelectedBooks(new Set(booksToSelect.map(b => b.abbr)));
                }}
                className="px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedBooks(new Set())}
                className="px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {selectedBooks.size > 0 ? 'Clear (all matching books)' : 'Clear'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3" style={{ minHeight: '200px' }}>
              <div className="space-y-6">
                {/* Old Testament section — hidden entirely if the search has no OT matches at all */}
                {(!searched || !allBooksWithResults || [...allBooksWithResults].some(abbr => OLD_TESTAMENT.some(b => b.abbr === abbr))) && (
                <div>
                  <p className="relative z-10 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 sticky top-0 bg-card py-1.5">
                    Old Testament {searched && searchStats.ot?.books > 0 && <span className="font-normal normal-case text-muted-foreground/60">({searchStats.ot.books} book{searchStats.ot.books !== 1 ? 's' : ''}, {searchStats.ot.verses} verse{searchStats.ot.verses !== 1 ? 's' : ''}, {searchStats.ot.occ} occ)</span>}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {OLD_TESTAMENT
                      .filter(book => {
                        const matchesQuery = !bookFilterQuery || book.shortName.toLowerCase().includes(bookFilterQuery.toLowerCase());
                        // Show every book that contains the word (from the unfiltered search),
                        // so you can re-add books after narrowing or after clearing.
                        const hasResults = !searched || !allBooksWithResults || allBooksWithResults.has(book.abbr);
                        return matchesQuery && hasResults;
                      })
                      .map(book => {
                        const isSelected = selectedBooks.has(book.abbr);
                        return (
                          <button
                            key={book.abbr}
                            onClick={() => {
                              setSelectedBooks(prev => {
                                const next = new Set(prev);
                                if (next.has(book.abbr)) next.delete(book.abbr);
                                else next.add(book.abbr);
                                return next;
                              });
                            }}
                            className={`px-3.5 py-2.5 rounded-lg font-sans text-xs font-medium transition-colors whitespace-normal text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                              isSelected
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card'
                                : 'bg-secondary text-foreground hover:bg-accent/20'
                            }`}
                            aria-pressed={isSelected}
                            title={book.shortName}
                          >
                            <span className="notranslate" translate="no">{book.shortName}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
                )}
                {/* New Testament section — hidden entirely if the search has no NT matches at all */}
                {(!searched || !allBooksWithResults || [...allBooksWithResults].some(abbr => NEW_TESTAMENT.some(b => b.abbr === abbr))) && (
                <div>
                  <p className="relative z-10 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 sticky top-0 bg-card py-1.5">
                    New Testament {searched && searchStats.nt?.books > 0 && <span className="font-normal normal-case text-muted-foreground/60">({searchStats.nt.books} book{searchStats.nt.books !== 1 ? 's' : ''}, {searchStats.nt.verses} verse{searchStats.nt.verses !== 1 ? 's' : ''}, {searchStats.nt.occ} occ)</span>}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {NEW_TESTAMENT
                      .filter(book => {
                        const matchesQuery = !bookFilterQuery || book.shortName.toLowerCase().includes(bookFilterQuery.toLowerCase());
                        // Show every book that contains the word (from the unfiltered search),
                        // so you can re-add books after narrowing or after clearing.
                        const hasResults = !searched || !allBooksWithResults || allBooksWithResults.has(book.abbr);
                        return matchesQuery && hasResults;
                      })
                      .map(book => {
                        const isSelected = selectedBooks.has(book.abbr);
                        return (
                          <button
                            key={book.abbr}
                            onClick={() => {
                              setSelectedBooks(prev => {
                                const next = new Set(prev);
                                if (next.has(book.abbr)) next.delete(book.abbr);
                                else next.add(book.abbr);
                                return next;
                              });
                            }}
                            className={`px-3.5 py-2.5 rounded-lg font-sans text-xs font-medium transition-colors whitespace-normal text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                              isSelected
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card'
                                : 'bg-secondary text-foreground hover:bg-accent/20'
                            }`}
                            aria-pressed={isSelected}
                            title={book.shortName}
                          >
                            <span className="notranslate" translate="no">{book.shortName}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5 border-t border-border flex-shrink-0">
              <button
                onClick={() => {
                  setShowBookFilter(false);
                  // Apply the book filter immediately by re-running the search.
                  const q = (getQueryFromUrl() || query).trim();
                  if (searched && q.length >= 2) runSearch(q);
                  // Book filter applied → jump results back to the top, same as any
                  // other filter change.
                  const scroller = document.getElementById('kjb-scroll');
                  if (scroller) scroller.scrollTo({ top: 0 });
                }}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Search {selectedBooks.size > 0 && selectedBooks.size < 66 ? `(${selectedBooks.size} book${selectedBooks.size !== 1 ? 's' : ''})` : selectedBooks.size === 66 ? '(All 66 books)' : 'All Books'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results header + action bar + keyboard hint — physically inside the
          SAME sticky container as the title/search/filters above (not a
          second, separately-positioned sticky element), so the whole header
          area from the search box down through the keyboard hint sticks
          together as one unit while scrolling. */}
      {!loading && results.length > 0 && (
        <div className="bg-background pt-2 pb-1 print:static print:p-0 print:m-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
            <div>
              <p className="font-sans text-xs text-muted-foreground">
                {results.length} verse{results.length !== 1 ? 's' : ''} for "{stripQuotes(getQueryFromUrl() || query)}"
                {totalOccurrences > results.length && (
                  <span className="text-muted-foreground/70"> · {totalOccurrences} occurrences</span>
                )}
              </p>


              {numberedBookFilter && (
                <p className="font-sans text-xs text-primary font-semibold mt-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Showing only <span className="notranslate" translate="no">{BIBLE_BOOKS.find(b => b.abbr === numberedBookFilter)?.shortName}</span>
                </p>
              )}
            </div>

            {/* Action buttons — compact on narrow screens (icon-only), full labels on wider ones */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {!selectMode ? (
                <>
                  <button
                    onClick={() => setSelectMode(true)}
                    title="Select"
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">Select</span>
                  </button>
                  <button
                    onClick={handleCopySelected}
                    title="Copy All"
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">{copyFeedback ? 'Copied!' : 'Copy All'}</span>
                  </button>
                  <ExportMenu onExport={handleExport} label="Export" warning />
                  <button
                    onClick={() => handleExport('print')}
                    title="Print"
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">Print</span>
                  </button>
                  <button
                    onClick={handleShare}
                    title="Share"
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">{shareFeedback ? 'Copied!' : 'Share'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={selectAll} title="Select All" className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors">
                    <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" /> <span>All</span>
                  </button>
                  <button onClick={clearSelection} title="Cancel" className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors">
                    <X className="w-3.5 h-3.5 flex-shrink-0" /> <span>Cancel</span>
                  </button>
                  {selected.size > 0 && (
                    <>
                      <button
                        onClick={handleCopySelected}
                        title={`Copy (${selected.size})`}
                        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-sans text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        <Copy className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">{copyFeedback ? 'Copied!' : `Copy (${selected.size})`}</span>
                      </button>
                      <ExportMenu onExport={handleExport} count={selected.size} label="Export" warning />
                      <button
                        onClick={() => handleExport('print')}
                        title="Print"
                        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">Print</span>
                      </button>
                      <button
                        onClick={handleShare}
                        title={`Share (${selected.size})`}
                        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">{shareFeedback ? 'Copied!' : `Share (${selected.size})`}</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Selected verses reading panel */}
          {selectMode && selected.size > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20 print:hidden">
              <div className="flex items-center justify-between mb-2">
                <p className="font-sans text-xs font-semibold text-primary flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5" />
                  {selected.size} verse{selected.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedList.map(i => (
                  <div key={i} className="text-sm">
                    <span className="font-sans text-xs text-accent font-semibold mr-2 flex items-center gap-1">
                      <span className="text-accent font-serif text-lg leading-none">&bull;</span>
                      <span className="notranslate" translate="no">{BIBLE_BOOKS.find(b => b.apiName === results[i].book)?.name || results[i].book}</span>: {results[i].chapter}:{results[i].verse}
                    </span>
                    <span className="notranslate font-serif text-foreground leading-relaxed" translate="no">{results[i].text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keyboard hint */}
          {results.length > 0 && (
            <p className="font-sans text-xs text-muted-foreground/60 mb-2 hidden sm:block print:hidden">
              ↑ ↓ or J / K to navigate verses & book headers · Enter to open a verse or collapse / expand a book
            </p>
          )}
        </div>
      )}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/70" style={{ animationDuration: '2s' }} />
            <span className="font-sans text-xs text-foreground/70 font-medium tracking-[0.2em] uppercase">
              Searching the KJB...
            </span>
          </div>
        </div>
      )}



      {!loading && searched && results.length === 0 && (
        <div className="space-y-4">
          <p className="font-sans text-sm text-muted-foreground text-center py-12 print:text-black">No results found for "{stripQuotes(getQueryFromUrl() || query)}".</p>
          {showBookResult && (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-primary/5 border border-primary/20 print:hidden">
              <p className="font-sans text-xs text-muted-foreground mb-3 text-center">
                Did you mean the book of <span className="notranslate font-semibold text-foreground" translate="no">{showBookResult.bookName}</span>?
              </p>
              <button
                onClick={() => {
                  setShowBookResult(null);
                  goToVerse(showBookResult.abbr, 1, null);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <BookOpen className="w-4 h-4" />
                Go to <span className="notranslate" translate="no">{showBookResult.bookName}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          {/* Book match suggestion - shown when search term also matches a book name */}
          {showBookResult && (
            <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20 print:hidden">
              <p className="font-sans text-xs text-muted-foreground mb-3">
                {showBookResult.allMatches && showBookResult.allMatches.length > 1
                  ? `Found multiple books. Which one did you mean?`
                  : `Found the book of ${showBookResult.bookName}. How would you like to search?`
                }
              </p>
              {/* Show multiple book options when there are multiple matches (e.g. 1&2 Kings, Samuel, Chronicles, or alternate names) */}
              {showBookResult.allMatches && showBookResult.allMatches.length > 1 && (
                <div className="grid sm:grid-cols-2 gap-2 mb-3">
                  {showBookResult.allMatches.map(book => (
                    <button
                      key={book.abbr}
                      onClick={() => {
                        setShowBookResult(null);
                        goToVerse(book.abbr, 1, null);
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent/20 transition-colors"
                    >
                      <BookOpen className="w-5 h-5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="notranslate font-serif text-sm font-bold" translate="no">{book.shortName}</p>
                        <p className="text-xs opacity-75">{book.chapters} {book.chapters === 1 ? 'chapter' : 'chapters'} • {book.testament === 'old' ? 'Old' : 'New'} Testament</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowBookResult(null);
                      // Search is already running, just let it complete
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Search className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-serif text-sm font-bold">Search "{stripQuotes(getQueryFromUrl() || query)}"</p>
                      <p className="text-xs opacity-75">Find all mentions in verses</p>
                    </div>
                  </button>
                </div>
              )}
              {/* Single book option or search button */}
              {(!showBookResult.allMatches || showBookResult.allMatches.length <= 1) && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowBookResult(null);
                      goToVerse(showBookResult.abbr, 1, null);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <BookOpen className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-serif text-sm font-bold">Go to <span className="notranslate" translate="no">{showBookResult.bookName}</span></p>
                      <p className="text-xs opacity-75">{showBookResult.chapters} {showBookResult.chapters === 1 ? 'chapter' : 'chapters'} • {showBookResult.testament === 'old' ? 'Old' : 'New'} Testament</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowBookResult(null);
                      // Search is already running, just let it complete
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent/20 transition-colors"
                  >
                    <Search className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-serif text-sm font-bold">Search "{stripQuotes(getQueryFromUrl() || query)}"</p>
                      <p className="text-xs opacity-75">Find all mentions in verses</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Verse list */}
          <SearchResultsList
            results={results}
            highlightTerm={highlightTerm}
            highlightCaseSensitive={highlightCaseSensitive}
            highlightWholeWord={highlightWholeWord}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            onGoToVerse={goToVerse}
            resultRefs={resultRefs}
          />
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-12 print:hidden space-y-4">
          <p className="font-sans text-sm text-muted-foreground">
            Type a word or phrase above and press Search.
          </p>
          <button
            onClick={() => navigate('/advanced-search')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            Advanced Search — research by verse properties
          </button>
        </div>
      )}
    </div>
    </div>
  );
}