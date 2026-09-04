// Parser for the single-file King James Bible — Pure Cambridge Edition (PCE) text.
//
// Format of the source file:
//   - Book title spans 1-3 lines (e.g. "THE FIRST BOOK OF MOSES," / "CALLED" / "GENESIS.")
//     followed by a blank line, then "CHAPTER 1".
//   - Verse 1 of each chapter has NO leading number (text begins right after "CHAPTER N").
//   - Verses 2+ start with their number: "2 And the earth...".
//   - A paragraph mark (pilcrow ¶) is encoded as a DOUBLE space after the verse number
//     (e.g. "6  And God said" → new paragraph). Verse 1 paragraph marks use a leading double space.
//   - Italics are plain [bracketed] words.
//   - Apostrophes are intentionally omitted (PCE style: "wifes", "brothers").

import { RTF_TITLE_MAP } from '@/lib/bibleBookTitles';
import { COLOPHONS, SUBSCRIPTS, PSALM_VERSE_1 } from '@/lib/bibleSubscripts';

// All 66 book titles (upper-case, punctuation-stripped) in canonical order.
// Used to detect book-title lines, which can span multiple physical lines.
const TITLE_KEYS = Object.keys(RTF_TITLE_MAP);

// Normalise a candidate title line for matching (strip punctuation, collapse spaces, upper-case).
function normTitle(s) {
  return s.replace(/[.,]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

// Title keys sorted longest-first so the most specific title wins on substring
// matches. Critical for editions where Samuel/Kings titles overlap, e.g.
// "THE FIRST BOOK OF SAMUEL OTHERWISE CALLED THE FIRST BOOK OF THE KINGS" —
// without longest-first, "...THE FIRST BOOK OF THE KINGS" would match Kings
// and Samuel/Psalms verses would be lost (undercounting search results).
const TITLE_KEYS_BY_LEN = [...TITLE_KEYS].sort((a, b) => b.length - a.length);

// Given the accumulated title buffer lines, try to resolve a book name.
function resolveBook(bufferLines) {
  const joined = normTitle(bufferLines.join(' '));
  if (RTF_TITLE_MAP[joined]) return RTF_TITLE_MAP[joined];
  // The Samuel pages are titled e.g. "THE FIRST BOOK OF SAMUEL, OTHERWISE CALLED,
  // THE FIRST BOOK OF THE KINGS." — detect SAMUEL first so it isn't misread as Kings.
  if (joined.includes('SAMUEL')) {
    if (/SECOND|\b2\b/.test(joined)) return '2 Samuel';
    if (/FIRST|\b1\b/.test(joined)) return '1 Samuel';
  }
  // The real books of Kings share the "BOOK OF THE KINGS" phrase with Samuel —
  // only match Kings when SAMUEL is absent from the buffer.
  if (joined.includes('KINGS') && !joined.includes('SAMUEL')) {
    if (/SECOND|\b2\b/.test(joined)) return '2 Kings';
    if (/FIRST|\b1\b/.test(joined)) return '1 Kings';
  }
  // Partial: the buffer contains a known title as a substring — longest first.
  // Skip Samuel/Kings keys (handled above) so the shared phrase can't hijack.
  for (const key of TITLE_KEYS_BY_LEN) {
    if (key.includes('SAMUEL') || key.includes('KINGS')) continue;
    if (joined.includes(key)) return RTF_TITLE_MAP[key];
  }
  return null;
}

export function parsePceText(text) {
  const data = {};
  // Normalise CRLF / CR line endings and unescape brackets: the PCE source file
  // uses \[ and \] for italics, which we convert to plain [ and ].
  const normalizedText = text.replace(/\r\n?/g, '\n').replace(/\\[/g, '[').replace(/\\]/g, ']');
  const rawLines = normalizedText.split('\n');

  let currentBook = null;
  let currentChapter = null;
  let titleBuffer = [];
  let pendingFirstVerse = false; // next non-empty line is verse 1
  // For Psalms with a superscription, the file has TWO unnumbered lines before
  // verse 2: the superscription, then the real verse 1. When true, the next
  // unnumbered line is the superscription (skipped) and the one after is verse 1.
  let pendingSuperscript = false;
  // Psalm 119 acrostic: the most recent Hebrew letter heading, to stamp on the
  // next verse so the reader can show it as an italic stanza heading.
  let pendingHeading = null;
  let verseCount = 0;

  // Psalms uses "PSALM N" instead of "CHAPTER N"; every other book uses CHAPTER.
  const isChapterLine = (l) => /^(CHAPTER|PSALM)\s+\d+$/i.test(l.trim());
  const isVerseLine = (l) => /^\d+\s/.test(l);
  
  // Debug: log when we encounter chapter/psalm lines
  const debugChapterLine = (line, book) => {
    if (isChapterLine(line)) {
      const chapterNum = parseInt(line.replace(/(CHAPTER|PSALM)\s+/i, ''), 10);
      console.log(`[PCE-PARSE] Found chapter line: "${line.trim()}" in ${book}, chapter ${chapterNum}`);
    }
  };

  // Psalm 119 is an acrostic: each 8-verse stanza is preceded by an unnumbered
  // Hebrew letter heading ("ALEPH.", "BETH.", … "TAU."). These must NOT be parsed
  // as verses. Match a single all-caps word (optionally hyphenated) ending in a dot.
  const HEBREW_LETTERS = new Set([
    'ALEPH','BETH','GIMEL','DALETH','HE','VAU','ZAIN','CHETH','TETH','JOD',
    'CAPH','LAMED','MEM','NUN','SAMECH','AIN','PE','TZADDI','KOPH','RESH','SCHIN','TAU',
  ]);
  const isHebrewLetterHeading = (l) => {
    const t = l.trim().replace(/\.$/, '').toUpperCase();
    return HEBREW_LETTERS.has(t);
  };

  const pushVerse = (vs, rawAfterNumber, hadParagraph) => {
    if (!currentBook || currentChapter == null) return;
    // First unescape any escaped brackets and normalize pilcrow characters
    let t = rawAfterNumber.replace(/\\[/g, '[').replace(/\\]/g, ']').replace(/\s*<<[^>]*>>\s*$/, '').trim();
    // If the source has an actual pilcrow character (¶ or other markers), preserve it
    if (/^[¶\u000F\u00B6]\s+/.test(t)) {
      t = '¶ ' + t.replace(/^[¶\u000F\u00B6]\s+/, '');
    } else if (hadParagraph) {
      t = '¶ ' + t;
    }

    // Fix 1 John 2:23 PCE syntax: replace double brackets with single brackets
    // so it renders as standard italics without literal brackets.
    if (currentBook === '1 John' && currentChapter === 2 && vs === 23) {
      t = t.replace('[(but)', '[but'); // omit closing bracket so the trailing ] covers the whole phrase
      t = t.replace('[[but]]', '[but]');
    }

    if (!data[currentBook][currentChapter]) data[currentBook][currentChapter] = [];
    const entry = { verse: vs, text: t };
    // Stamp any pending Psalm 119 acrostic letter heading onto this verse.
    if (pendingHeading) {
      entry.heading = pendingHeading;
      pendingHeading = null;
    }
    data[currentBook][currentChapter].push(entry);
    verseCount++;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Chapter heading (CHAPTER N, or PSALM N for the book of Psalms)
    if (isChapterLine(line)) {
      currentChapter = parseInt(trimmed.replace(/(CHAPTER|PSALM)\s+/i, ''), 10);
      if (currentBook && !data[currentBook][currentChapter]) data[currentBook][currentChapter] = [];
      pendingFirstVerse = true;
      // Psalms with a known superscription have an extra unnumbered line (the
      // superscription) before the real verse 1 — skip it so verse 1 is correct.
      pendingSuperscript = currentBook === 'Psalms' && !!SUBSCRIPTS[`Psalms:${currentChapter}`];
      titleBuffer = [];
      console.log(`[PCE-PARSE] Chapter ${currentChapter} in ${currentBook}, superscript=${pendingSuperscript}`);
      continue;
    }

    // Blank line — flush any title buffer attempt (handled on chapter detection)
    if (!trimmed) continue;

    // Psalm 119 acrostic letter heading (ALEPH., BETH., …) — capture it as a
    // stanza heading to stamp on the next verse (NOT a verse, NOT a pilcrow).
    // Does NOT consume pendingFirstVerse, so the real verse 1 ("BLESSED…") is
    // still captured (with the ALEPH heading attached).
    if (currentBook === 'Psalms' && currentChapter === 119 && isHebrewLetterHeading(line)) {
      pendingHeading = trimmed.replace(/\.$/, '').toUpperCase();
      continue;
    }

    // Numbered verse (verse 2+)
    if (isVerseLine(line) && currentChapter != null) {
      const m = line.match(/^(\d+)(\s+)(.*)$/);
      if (m) {
        const vs = parseInt(m[1], 10);
        // Detect pilcrow: double space, OR actual pilcrow character at start
        const hadParagraph = m[2].length >= 2 || /^[¶\u000F\u00B6]/.test(m[3]);
        pushVerse(vs, m[3], hadParagraph);
        pendingFirstVerse = false;
        continue;
      }
    }

    // Superscription line for a Psalm (unnumbered, comes before verse 1) — skip it.
    if (pendingSuperscript && currentChapter != null) {
      pendingSuperscript = false;
      continue;
    }

    // First (unnumbered) verse of a chapter
    if (pendingFirstVerse && currentChapter != null) {
      // A leading double space OR pilcrow character marks a paragraph on verse 1
      const hadParagraph = /^\s{2,}\S/.test(line) || /^[¶\u000F\u00B6]/.test(trimmed);
      pushVerse(1, trimmed, hadParagraph);
      pendingFirstVerse = false;
      continue;
    }

    // Ignore title-like text until the current book has had a chapter — prevents
    // the "OTHERWISE CALLED THE BOOK OF THE KINGS" alias under Samuel titles from
    // hijacking the book mid-stream (which would lose 1/2 Samuel verses).
    if (currentBook && currentChapter == null) continue;

    // Otherwise this is (part of) a book title — accumulate until we resolve it
    titleBuffer.push(trimmed);
    const resolved = resolveBook(titleBuffer);
    if (resolved) {
      currentBook = resolved;
      currentChapter = null;
      if (!data[currentBook]) data[currentBook] = {};
      console.log(`[PCE-PARSE] ✓ Book detected: ${currentBook}`);
      titleBuffer = [];
    } else if (titleBuffer.length > 4) {
      // Avoid unbounded growth on stray lines
      titleBuffer.shift();
    }
  }

  // Post-process Psalms: the superscription line is now skipped during parsing
  // (see pendingSuperscript), so verse numbering is already correct. As a final
  // safety net, if the superscription somehow leaked into verse 1, detect it and
  // drop+renumber. Then force verse 1 to the authoritative hardcoded text.
  if (data['Psalms']) {
    for (const [ch, correctV1] of Object.entries(PSALM_VERSE_1)) {
      const chapter = parseInt(ch, 10);
      const verses = data['Psalms'][chapter];
      if (!verses || verses.length === 0) continue;

      const subscript = SUBSCRIPTS[`Psalms:${chapter}`];
      const subscriptPlain = subscript
        ? subscript.replace(/\[([^\]]+)\]/g, '$1').toLowerCase().trim()
        : '';
      const correctV1Plain = correctV1.replace(/\[([^\]]+)\]/g, '$1').toLowerCase().trim();

      const v1 = verses[0];
      if (v1 && v1.verse === 1) {
        const v1Plain = v1.text.replace(/^¶\s*/, '').trim().toLowerCase();
        const isCorrect = v1Plain === correctV1Plain || v1Plain.startsWith(correctV1Plain.substring(0, 20));
        // Only shift if verse 1 is clearly the superscription AND verse 2 is the real verse 1.
        const isSubscript = subscriptPlain && (v1Plain === subscriptPlain || v1Plain.startsWith(subscriptPlain.substring(0, 15)));
        const v2 = verses[1];
        const v2Plain = v2 ? v2.text.replace(/^¶\s*/, '').trim().toLowerCase() : '';
        const v2IsRealV1 = v2Plain.startsWith(correctV1Plain.substring(0, 20));
        if (!isCorrect && isSubscript && v2IsRealV1) {
          verses.shift();
          for (const v of verses) { v.verse -= 1; }
          console.log(`[PCE-PARSE] Safety renumber Psalms ${chapter} (dropped leaked subscript)`);
        }
      }

      // Force verse 1 to the authoritative hardcoded text
      const v1entry = verses.find(v => v.verse === 1);
      if (v1entry) {
        v1entry.text = correctV1;
      } else {
        verses.unshift({ verse: 1, text: correctV1 });
        console.log(`[PCE-PARSE] Inserted verse 1 for Psalms ${chapter}`);
      }
    }
  }

  data.__colophons = { ...COLOPHONS };
  const bookCount = Object.keys(data).filter((k) => k !== '__colophons').length;
  console.log('[PCE-PARSE] ✓', verseCount, 'verses across', bookCount, 'books');
  
  // Log all detected books and their chapter counts
  const bookSummary = Object.keys(data)
    .filter(k => k !== '__colophons')
    .map(book => {
      const chapters = Object.keys(data[book]).length;
      const firstChapter = Object.keys(data[book])[0];
      const verseCount = data[book][firstChapter]?.length || 0;
      return `${book}:${chapters}ch`;
    });
  console.log('[PCE-PARSE] Books:', bookSummary.join(', '));
  
  // Log colophon count
  const colophonCount = Object.keys(COLOPHONS).length;
  console.log('[PCE-PARSE] Colophons:', colophonCount, 'entries');
  
  return data;
}