import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useHeaderHide } from '@/lib/HeaderHideContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft, ChevronRight, Search as SearchIcon, List as ListIcon,
  Loader2, ZoomIn, ZoomOut, X, Download, BookOpen,
} from 'lucide-react';

// pdfjs-dist ships ESM-only worker/library builds. Bundling them through
// Vite means Base44's static asset host serves the .mjs chunk as
// application/octet-stream (not a JS MIME type), which browsers reject for
// dynamic module imports ("Setting up fake worker failed: Failed to fetch
// dynamically imported module"). Loading pdf.js from cdnjs instead sidesteps
// that entirely -- it serves the exact same version with correct
// `application/javascript` headers and CORS enabled. Cached as a
// module-level promise so it's only fetched once per session.
const PDFJS_VERSION = '4.10.38'; // must match the pdfjs-dist devDependency version
const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;
let _pdfjsPromise = null;
function loadPdfjs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = import(/* @vite-ignore */ `${PDFJS_BASE}/pdf.min.mjs`).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
      return mod;
    });
  }
  return _pdfjsPromise;
}

const FALLBACK_TOTAL_PAGES = 1506;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.6;

// Fold long-s OCR confusion (this 1611 scan often reads the historic
// long "ſ" as "f") so a modern-spelling search still finds it.
const fold = (s) => s.toLowerCase().replace(/f/g, 's');

// --- "Go to reference" (e.g. "John 3:16", "Gen 1:1-5", "1 Cor 13") ---

// Common abbreviations -> the TOC's `short_name`. Keys are normalized
// (lowercase, periods/spaces stripped) before lookup.
const BOOK_ALIASES = {
  gen: 'Genesis', genesis: 'Genesis',
  ex: 'Exodus', exo: 'Exodus', exod: 'Exodus', exodus: 'Exodus',
  lev: 'Leviticus', levit: 'Leviticus', leviticus: 'Leviticus',
  num: 'Numbers', numb: 'Numbers', numbers: 'Numbers',
  deut: 'Deuteronomy', deu: 'Deuteronomy', deuteronomy: 'Deuteronomy',
  josh: 'Joshua', joshua: 'Joshua',
  judg: 'Judges', jdg: 'Judges', judges: 'Judges',
  ruth: 'Ruth',
  '1sam': '1 Samuel', '1samuel': '1 Samuel', 'isam': '1 Samuel', '1stsamuel': '1 Samuel', 'firstsamuel': '1 Samuel',
  '2sam': '2 Samuel', '2samuel': '2 Samuel', 'iisam': '2 Samuel', '2ndsamuel': '2 Samuel', 'secondsamuel': '2 Samuel',
  '1kgs': '1 Kings', '1ki': '1 Kings', '1kings': '1 Kings', 'ikings': '1 Kings', 'firstkings': '1 Kings',
  '2kgs': '2 Kings', '2ki': '2 Kings', '2kings': '2 Kings', 'iikings': '2 Kings', 'secondkings': '2 Kings',
  '1chr': '1 Chronicles', '1chron': '1 Chronicles', '1chronicles': '1 Chronicles', 'firstchronicles': '1 Chronicles',
  '2chr': '2 Chronicles', '2chron': '2 Chronicles', '2chronicles': '2 Chronicles', 'secondchronicles': '2 Chronicles',
  ezra: 'Ezra',
  neh: 'Nehemiah', nehemiah: 'Nehemiah',
  est: 'Esther', esth: 'Esther', esther: 'Esther',
  job: 'Job',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', psalms: 'Psalms', pslm: 'Psalms',
  prov: 'Proverbs', pro: 'Proverbs', proverbs: 'Proverbs',
  eccl: 'Ecclesiastes', ecc: 'Ecclesiastes', ecclesiastes: 'Ecclesiastes', qoheleth: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon', songofsolomon: 'Song of Solomon', songofsongs: 'Song of Solomon', canticles: 'Song of Solomon',
  isa: 'Isaiah', isaiah: 'Isaiah',
  jer: 'Jeremiah', jeremiah: 'Jeremiah',
  lam: 'Lamentations', lamentations: 'Lamentations',
  ezek: 'Ezekiel', eze: 'Ezekiel', ezk: 'Ezekiel', ezekiel: 'Ezekiel',
  dan: 'Daniel', daniel: 'Daniel',
  hos: 'Hosea', hosea: 'Hosea',
  joel: 'Joel',
  am: 'Amos', amos: 'Amos',
  obad: 'Obadiah', oba: 'Obadiah', obadiah: 'Obadiah',
  jonah: 'Jonah', jon: 'Jonah',
  mic: 'Micah', micah: 'Micah',
  nah: 'Nahum', nahum: 'Nahum',
  hab: 'Habakkuk', habakkuk: 'Habakkuk',
  zeph: 'Zephaniah', zep: 'Zephaniah', zephaniah: 'Zephaniah',
  hag: 'Haggai', haggai: 'Haggai',
  zech: 'Zechariah', zec: 'Zechariah', zechariah: 'Zechariah',
  mal: 'Malachi', malachi: 'Malachi',
  matt: 'Matthew', mat: 'Matthew', mt: 'Matthew', matthew: 'Matthew',
  mark: 'Mark', mrk: 'Mark', mk: 'Mark',
  luke: 'Luke', luk: 'Luke', lk: 'Luke',
  john: 'John', joh: 'John', jn: 'John', jhn: 'John',
  acts: 'Acts', act: 'Acts',
  rom: 'Romans', romans: 'Romans',
  '1cor': '1 Corinthians', '1corinthians': '1 Corinthians', 'icor': '1 Corinthians', 'firstcorinthians': '1 Corinthians',
  '2cor': '2 Corinthians', '2corinthians': '2 Corinthians', 'iicor': '2 Corinthians', 'secondcorinthians': '2 Corinthians',
  gal: 'Galatians', galatians: 'Galatians',
  eph: 'Ephesians', ephesians: 'Ephesians',
  phil: 'Philippians', philippians: 'Philippians', php: 'Philippians',
  col: 'Colossians', colossians: 'Colossians',
  '1thess': '1 Thessalonians', '1thes': '1 Thessalonians', '1thessalonians': '1 Thessalonians', 'firstthessalonians': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2thes': '2 Thessalonians', '2thessalonians': '2 Thessalonians', 'secondthessalonians': '2 Thessalonians',
  '1tim': '1 Timothy', '1timothy': '1 Timothy', 'firsttimothy': '1 Timothy',
  '2tim': '2 Timothy', '2timothy': '2 Timothy', 'secondtimothy': '2 Timothy',
  titus: 'Titus', tit: 'Titus',
  philem: 'Philemon', phm: 'Philemon', philemon: 'Philemon',
  heb: 'Hebrews', hebrews: 'Hebrews',
  jas: 'James', james: 'James',
  '1pet': '1 Peter', '1peter': '1 Peter', 'firstpeter': '1 Peter',
  '2pet': '2 Peter', '2peter': '2 Peter', 'secondpeter': '2 Peter',
  '1john': '1 John', '1jn': '1 John', 'firstjohn': '1 John',
  '2john': '2 John', '2jn': '2 John', 'secondjohn': '2 John',
  '3john': '3 John', '3jn': '3 John', 'thirdjohn': '3 John',
  jude: 'Jude',
  rev: 'Revelation', revelation: 'Revelation', revelations: 'Revelation', apoc: 'Revelation',
};

function normalizeBookToken(raw) {
  let s = raw.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  // Fold ordinal words/roman numerals to a leading digit: "first john" -> "1john"
  s = s.replace(/^(first|1st|i)\s+/, '1').replace(/^(second|2nd|ii)\s+/, '2').replace(/^(third|3rd|iii)\s+/, '3');
  s = s.replace(/\s+/g, '');
  return s;
}

// Parses "John 3:16", "Jn 3:16-18", "Gen 1", "1 Cor 13:4" etc.
// Returns { shortName, chapter, verseStart, verseEnd } or null if unparseable.
function parseReference(raw, tocShortNames) {
  const m = raw.trim().match(/^\s*([1-3]?\s*[A-Za-z][A-Za-z .]*?)\s+(\d{1,3})\s*(?::\s*(\d{1,3})\s*(?:[-\u2013]\s*(\d{1,3}))?)?\s*$/);
  if (!m) return null;
  const [, bookRaw, chapterRaw, verseStartRaw, verseEndRaw] = m;
  const key = normalizeBookToken(bookRaw);
  // Try an exact (normalized) match against the real short names first, then aliases.
  const exact = tocShortNames.find((n) => normalizeBookToken(n) === key);
  const shortName = exact || BOOK_ALIASES[key];
  if (!shortName) return null;
  return {
    shortName,
    chapter: parseInt(chapterRaw, 10),
    verseStart: verseStartRaw ? parseInt(verseStartRaw, 10) : null,
    verseEnd: verseEndRaw ? parseInt(verseEndRaw, 10) : null,
  };
}

export default function Original1611Page() {
  const { setHideHeader } = useHeaderHide();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pdfUrl, setPdfUrl] = useState(undefined); // undefined = still loading
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [numPages, setNumPages] = useState(0);

  const initialPage = (() => {
    const p = parseInt(searchParams.get('page'), 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  })();
  const [pageNum, setPageNum] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [scale, setScale] = useState(1.35);
  const [rendering, setRendering] = useState(true);

  const [toc, setToc] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('contents');
  const [openBook, setOpenBook] = useState(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [highlightTerm, setHighlightTerm] = useState('');
  const [highlightChapter, setHighlightChapter] = useState(false);
  const [highlightVerse, setHighlightVerse] = useState(null);

  const [refInput, setRefInput] = useState('');
  const [refError, setRefError] = useState('');
  const [refBusy, setRefBusy] = useState(false);

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const pageTextCache = useRef(new Map());
  const pageItemsCache = useRef(new Map());
  const searchTokenRef = useRef(0);
  const scrollToHighlightRef = useRef(false);

  useEffect(() => {
    setHideHeader(true);
    return () => setHideHeader(false);
  }, [setHideHeader]);

  // Config (admin-set PDF URL)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await base44.entities.Original1611Config.list('-updated_date', 1);
        if (!cancelled) setPdfUrl(rows?.[0]?.pdf_url || '');
      } catch {
        if (!cancelled) setPdfUrl('');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Table of contents
  useEffect(() => {
    fetch('/kjb1611/toc.json')
      .then((r) => r.json())
      .then(setToc)
      .catch(() => setToc([]));
  }, []);

  // Load the PDF document once we know its URL
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    let task = null;
    loadPdfjs()
      .then((pdfjsLib) => {
        if (cancelled) return;
        task = pdfjsLib.getDocument({ url: pdfUrl });
        return task.promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Failed to load the PDF.');
      });
    return () => {
      cancelled = true;
      try { task?.destroy(); } catch { /* noop */ }
    };
  }, [pdfUrl]);

  const clampPage = useCallback(
    (p) => Math.min(Math.max(1, p), numPages || FALLBACK_TOTAL_PAGES),
    [numPages]
  );

  const goToPage = useCallback((p) => {
    setPageNum((cur) => clampPage(p) ?? cur);
    setSidebarOpen(false);
  }, [clampPage]);

  // Jumping to a search result also highlights that match on the page.
  const goToSearchResult = useCallback((p, term) => {
    setHighlightTerm(term);
    setHighlightChapter(false);
    setHighlightVerse(null);
    scrollToHighlightRef.current = true;
    goToPage(p);
  }, [goToPage]);

  // Jumping to a book/chapter from Contents highlights the chapter heading
  // ('CHAP.'/'PSALME' marker) on the page it lands on, so it's easy to spot.
  const goToChapter = useCallback((p) => {
    setHighlightTerm('');
    setHighlightVerse(null);
    setHighlightChapter(true);
    scrollToHighlightRef.current = true;
    goToPage(p);
  }, [goToPage]);

  const getPageItems = useCallback(async (idx) => {
    if (pageItemsCache.current.has(idx)) return pageItemsCache.current.get(idx);
    const page = await pdfDoc.getPage(idx);
    const tc = await page.getTextContent();
    pageItemsCache.current.set(idx, tc.items);
    return tc.items;
  }, [pdfDoc]);

  // Scans forward from a chapter's first page (up to the next chapter's page,
  // or 8 pages, whichever is sooner) for a text item that's just the bare
  // verse number -- this print sets each verse's number as its own token
  // right before the verse text, so this is a reasonable way to locate it
  // without any pre-built verse index.
  const findVersePage = useCallback(async (chapterPdfPage, upperBoundPdfPage, verseNum) => {
    const maxPage = Math.min(upperBoundPdfPage, chapterPdfPage + 8, numPages || FALLBACK_TOTAL_PAGES);
    for (let p = chapterPdfPage; p <= maxPage; p++) {
      const items = await getPageItems(p);
      for (const item of items) {
        const m = item.str.trim().match(/^(\d{1,3})[.:]?$/);
        if (m && parseInt(m[1], 10) === verseNum) return p;
      }
    }
    return chapterPdfPage;
  }, [getPageItems, numPages]);

  const goToReference = useCallback(async (raw) => {
    const tocShortNames = toc.map((b) => b.short_name);
    const parsed = parseReference(raw, tocShortNames);
    if (!parsed) {
      setRefError('Try a format like "John 3:16" or "Gen 1:1-5".');
      return;
    }
    const entry = toc.find((b) => b.short_name === parsed.shortName);
    if (!entry) { setRefError(`Couldn't find "${parsed.shortName}" in the contents.`); return; }
    const chapterObj = entry.chapters.find((c) => c.chapter === parsed.chapter);
    if (!chapterObj) { setRefError(`${parsed.shortName} doesn't have a chapter ${parsed.chapter}.`); return; }
    const chapterPdfPage = chapterObj.page + 1;

    if (!parsed.verseStart) {
      setRefError('');
      goToChapter(chapterPdfPage);
      return;
    }
    if (!pdfDoc) { setRefError('Still loading the scan…'); return; }

    setRefBusy(true);
    setRefError('');
    try {
      const nextChapterObj = entry.chapters.find((c) => c.chapter === parsed.chapter + 1);
      const upperBoundPdfPage = nextChapterObj ? nextChapterObj.page + 1 : entry.end_page + 1;
      const targetPage = await findVersePage(chapterPdfPage, upperBoundPdfPage, parsed.verseStart);
      setHighlightTerm('');
      setHighlightChapter(false);
      setHighlightVerse(parsed.verseStart);
      scrollToHighlightRef.current = true;
      goToPage(targetPage);
    } catch {
      setRefError('Could not locate that verse — try the chapter instead.');
    } finally {
      setRefBusy(false);
    }
  }, [toc, pdfDoc, findVersePage, goToChapter, goToPage]);

  // Keep ?page= in the URL in sync (shareable / refresh-safe)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(pageNum));
    setSearchParams(next, { replace: true });
    setPageInput(String(pageNum));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum]);

  // Render the current page: canvas image + an invisible text layer on top
  // (pdf.js's own OCR text, positioned to match) so the scan is selectable.
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    setRendering(true);
    (async () => {
      try {
        const page = await pdfDoc.getPage(clampPage(pageNum));
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { /* noop */ }
        }
        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (cancelled) return;

        const textContent = await page.getTextContent();
        if (cancelled) return;
        const layerDiv = textLayerRef.current;
        if (layerDiv) {
          layerDiv.innerHTML = '';
          layerDiv.style.width = `${viewport.width}px`;
          layerDiv.style.height = `${viewport.height}px`;
          const [vA, vB, vC, vD, vE, vF] = viewport.transform;
          const foldedHighlight = highlightTerm ? fold(highlightTerm) : '';
          let firstMatchSpan = null;
          for (const item of textContent.items) {
            if (!item.str) continue;
            const m = item.transform;
            const tx = [
              vA * m[0] + vB * m[2],
              vA * m[1] + vB * m[3],
              vC * m[0] + vD * m[2],
              vC * m[1] + vD * m[3],
              vA * m[4] + vB * m[5] + vE,
              vC * m[4] + vD * m[5] + vF,
            ];
            const fontHeight = Math.hypot(tx[2], tx[3]);
            const angle = Math.atan2(tx[1], tx[0]);
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - fontHeight}px`;
            span.style.fontSize = `${fontHeight}px`;
            if (angle) span.style.transform = `rotate(${angle}rad)`;
            if (foldedHighlight && fold(item.str).includes(foldedHighlight)) {
              span.className = 'pdf-search-hit';
              if (!firstMatchSpan) firstMatchSpan = span;
            } else if (highlightChapter && !firstMatchSpan) {
              // This 1611 print marks a new chapter with a "CHAP." heading (or
              // "PSALME" within Psalms) near the top of its first page -- find
              // and highlight that marker so it's obvious where the chapter starts.
              const bare = item.str.replace(/[^A-Za-z]/g, '').toLowerCase();
              if (bare === 'chap' || bare === 'psalme') {
                span.className = 'pdf-search-hit';
                firstMatchSpan = span;
              }
            } else if (highlightVerse != null && !firstMatchSpan) {
              const vm = item.str.trim().match(/^(\d{1,3})[.:]?$/);
              if (vm && parseInt(vm[1], 10) === highlightVerse) {
                span.className = 'pdf-search-hit';
                firstMatchSpan = span;
              }
            }
            layerDiv.appendChild(span);
          }
          if (scrollToHighlightRef.current && firstMatchSpan) {
            scrollToHighlightRef.current = false;
            setHighlightChapter(false);
            setHighlightVerse(null);
            requestAnimationFrame(() => {
              firstMatchSpan.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
            });
          }
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('1611 page render error', err);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, scale, clampPage, highlightTerm, highlightChapter, highlightVerse]);

  // Keyboard paging
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') goToPage(pageNum + 1);
      if (e.key === 'ArrowLeft') goToPage(pageNum - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNum, goToPage]);

  const ensurePageText = useCallback(async (idx) => {
    if (pageTextCache.current.has(idx)) return pageTextCache.current.get(idx);
    const page = await pdfDoc.getPage(idx);
    const tc = await page.getTextContent();
    const text = tc.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
    pageTextCache.current.set(idx, text);
    return text;
  }, [pdfDoc]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!pdfDoc || !q) { setSearchResults(null); return; }
    const token = ++searchTokenRef.current;
    setSearching(true);
    setSearchProgress(0);
    const foldedQuery = fold(q);
    const results = [];
    const total = numPages || FALLBACK_TOTAL_PAGES;
    for (let i = 1; i <= total; i++) {
      if (searchTokenRef.current !== token) return; // superseded by a newer search
      const text = await ensurePageText(i);
      const idx = fold(text).indexOf(foldedQuery);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const snippet = (start > 0 ? '…' : '') + text.slice(start, idx + foldedQuery.length + 60) + '…';
        results.push({ page: i, snippet });
        if (results.length >= 300) break;
      }
      if (i % 30 === 0) setSearchProgress(Math.round((i / total) * 100));
    }
    if (searchTokenRef.current !== token) return;
    setSearchProgress(100);
    setSearchResults(results);
    setSearching(false);
  }, [pdfDoc, query, numPages, ensurePageText]);

  const bookForPage = toc.find((b) => pageNum - 1 >= b.start_page && pageNum - 1 <= b.end_page);

  const totalPages = numPages || FALLBACK_TOTAL_PAGES;

  // ---- Admin placeholder: no PDF configured yet ----
  if (pdfUrl === '') {
    return (
      <div className="max-w-lg mx-auto py-24 px-6 text-center">
        <BookOpen className="w-10 h-10 mx-auto mb-4 text-primary/60" />
        <h1 className="text-lg font-semibold mb-2">1611 reader not set up yet</h1>
        <p className="text-sm text-muted-foreground">
          Upload the 1611 facsimile PDF through the Base44 file manager, then set its URL
          on the <code className="px-1 rounded bg-muted">Original1611Config</code> entity's{' '}
          <code className="px-1 rounded bg-muted">pdf_url</code> field.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-900 text-neutral-100">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-neutral-900/95 backdrop-blur">
        <Button
          variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => window.history.back()}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => { setSidebarTab('contents'); setSidebarOpen(true); }}
          aria-label="Contents"
        >
          <ListIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => { setSidebarTab('search'); setSidebarOpen(true); }}
          aria-label="Search"
        >
          <SearchIcon className="w-5 h-5" />
        </Button>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <span className="text-sm text-neutral-400 truncate hidden sm:inline">
            {bookForPage ? bookForPage.short_name : '1611 King James Bible'}
          </span>
        </div>

        <Button variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - 0.15).toFixed(2)))} aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + 0.15).toFixed(2)))} aria-label="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </Button>
        {pdfUrl && (
          <a href={pdfUrl} download className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10" aria-label="Download original PDF">
              <Download className="w-4 h-4" />
            </Button>
          </a>
        )}
      </div>

      {/* Page surface */}
      <div className="flex-1 overflow-auto flex justify-center">
        <div className="py-6 px-2">
          {loadError ? (
            <p className="text-sm text-red-300 max-w-sm text-center mt-16">{loadError}</p>
          ) : (
            <div className="relative inline-block shadow-2xl">
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/40">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
                </div>
              )}
              <canvas ref={canvasRef} className="block bg-white" />
              {/* Invisible, selectable OCR text positioned over the scan */}
              <div
                ref={textLayerRef}
                className="pdf-text-layer absolute top-0 left-0 origin-top-left"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom page nav */}
      <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-white/10 bg-neutral-900/95">
        <Button variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1} aria-label="Previous page">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <form
          onSubmit={(e) => { e.preventDefault(); goToPage(parseInt(pageInput, 10) || pageNum); }}
          className="flex items-center gap-1.5"
        >
          <Input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => goToPage(parseInt(pageInput, 10) || pageNum)}
            className="w-16 h-8 text-center bg-white/10 border-white/20 text-neutral-100"
            inputMode="numeric"
          />
          <span className="text-sm text-neutral-400 whitespace-nowrap">/ {totalPages}</span>
        </form>
        <Button variant="ghost" size="icon" className="text-neutral-100 hover:bg-white/10"
          onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= totalPages} aria-label="Next page">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Contents / Search sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-full sm:w-96 p-0 flex flex-col bg-neutral-950 text-neutral-100 border-white/10">
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-white/10 bg-transparent">
              <TabsTrigger value="contents" className="flex-1">Contents</TabsTrigger>
              <TabsTrigger value="search" className="flex-1">Search</TabsTrigger>
            </TabsList>

            <TabsContent value="contents" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full">
                <div className="py-2">
                  {toc.map((b) => (
                    <div key={b.book} className="border-b border-white/5">
                      <button
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 text-sm"
                        onClick={() => setOpenBook(openBook === b.book ? null : b.book)}
                      >
                        <span>{b.book}</span>
                        <span className="text-neutral-500 text-xs">
                          {b.chapters.length > 1 ? `${b.chapters.length} ch.` : ''}
                        </span>
                      </button>
                      {openBook === b.book && (
                        <div className="grid grid-cols-6 gap-1.5 px-4 pb-3">
                          {b.chapters.length > 1 ? b.chapters.map((c) => (
                            <button
                              key={c.chapter}
                              onClick={() => goToChapter(c.page + 1)}
                              className="text-xs rounded bg-white/5 hover:bg-white/15 py-1.5"
                            >
                              {c.chapter}
                            </button>
                          )) : (
                            <button
                              onClick={() => goToChapter(b.start_page + 1)}
                              className="col-span-6 text-xs rounded bg-white/5 hover:bg-white/15 py-1.5 text-left px-2"
                            >
                              Go to {b.book}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="flex-1 min-h-0 m-0 flex flex-col">
              <form
                onSubmit={(e) => { e.preventDefault(); runSearch(); }}
                className="flex items-center gap-2 p-3 border-b border-white/10"
              >
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the 1611 text…"
                  className="bg-white/10 border-white/20 text-neutral-100"
                />
                <Button type="submit" size="sm" disabled={searching || !pdfDoc}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
                </Button>
              </form>
              {searching && (
                <div className="px-3 py-2 text-xs text-neutral-400">
                  Reading the scan… {searchProgress}%
                  <div className="h-1 mt-1 rounded bg-white/10 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${searchProgress}%` }} />
                  </div>
                </div>
              )}
              <ScrollArea className="flex-1 min-h-0">
                {searchResults && !searching && (
                  <div className="px-3 py-2 text-xs text-neutral-500">
                    {searchResults.length === 0 ? 'No matches found.' : `${searchResults.length} match${searchResults.length === 1 ? '' : 'es'}`}
                  </div>
                )}
                <div className="pb-4">
                  {(searchResults || []).map((r, i) => (
                    <button
                      key={`${r.page}-${i}`}
                      onClick={() => goToSearchResult(r.page, query)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 border-b border-white/5"
                    >
                      <div className="text-xs text-primary mb-1">Page {r.page}</div>
                      <div className="text-sm text-neutral-300 leading-snug">{r.snippet}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-[11px] text-neutral-500 px-3 py-2 border-t border-white/10">
                Search runs against this 1611 scan's own OCR text — spelling follows the
                original printing (and the occasional OCR misread), so try a few phrasings
                if a search comes up empty.
              </p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <style>{`
        .pdf-text-layer {
          line-height: 1;
          user-select: text;
        }
        .pdf-text-layer span {
          position: absolute;
          color: transparent;
          white-space: pre;
          transform-origin: 0% 0%;
        }
        .pdf-text-layer ::selection {
          background: rgba(80, 140, 255, 0.4);
        }
        .pdf-text-layer span.pdf-search-hit {
          color: transparent;
          background: rgba(255, 230, 0, 0.55);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
