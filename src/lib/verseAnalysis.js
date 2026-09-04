// Advanced-search / research engine.
//
// Loads every verse from the cached Bible (getBibleData) and computes a rich
// set of measurable properties per verse, so the Advanced Search page can
// filter and sort by things like word/char count, pilcrows, italics, capitals,
// numerals, punctuation, unique words, longest word, etc.
//
// A "verse record" looks like:
//   {
//     book, abbr, chapter, verse, ref,        // location
//     rawText,                                 // original text incl. [brackets] + ¶
//     plainText,                               // display text: ¶ removed, [brackets] stripped
//     metrics: { ...numeric + boolean fields }
//   }

import { getBibleData } from '@/lib/bibleCache';
import { BOOK_BY_API_NAME, BIBLE_BOOKS } from '@/lib/bibleData';
import { normalizeApostrophes, normalizeQueryApostrophes, normalizeLigatures } from '@/lib/bibleApi';

// Strip the leading pilcrow and its space.
function stripPilcrow(t) {
  return t.replace(/^¶\s*/, '');
}

// Remove the [brackets] KJB uses to mark supplied (italic) words, keeping the
// words themselves — this is the plain reading text.
function stripBrackets(t) {
  return t.replace(/\[([^\]]*)\]/g, '$1');
}

// Words = maximal runs of letters/apostrophes. PCE omits apostrophes but keep
// the class robust anyway.
function words(t) {
  const m = t.match(/[A-Za-z]+/g);
  return m || [];
}

// Compute all metrics for one verse's raw text.
function computeMetrics(rawText) {
  const hasPilcrow = /¶/.test(rawText);
  const pilcrowCount = (rawText.match(/¶/g) || []).length;
  const noPilcrow = stripPilcrow(rawText);

  // Italics = [bracketed] supplied words. Count bracket groups + the words in them.
  const bracketGroups = noPilcrow.match(/\[[^\]]*\]/g) || [];
  const hasItalics = bracketGroups.length > 0;
  const italicWordCount = bracketGroups.reduce((n, g) => n + words(g).length, 0);

  // Plain text (what the reader shows): pilcrow + brackets removed.
  const plain = stripBrackets(noPilcrow).replace(/\s+/g, ' ').trim();

  const wordList = words(plain);
  const wordCount = wordList.length;
  const charCount = plain.length;                          // incl. spaces & punctuation
  const letterCount = (plain.match(/[A-Za-z]/g) || []).length;

  // Capitalised words (proper nouns / sentence starts / "LORD" etc.)
  const capitalWords = wordList.filter(w => /^[A-Z]/.test(w));
  const capitalWordCount = capitalWords.length;
  // ALL-CAPS words of length >= 2 (e.g. LORD, GOD) — often the divine name.
  const allCapsWords = wordList.filter(w => w.length >= 2 && w === w.toUpperCase());
  const allCapsWordCount = allCapsWords.length;

  // Sentence count — terminal punctuation groups.
  const sentenceCount = (plain.match(/[.!?]+/g) || []).length || (plain ? 1 : 0);
  // Individual punctuation marks — each tracked separately for precise filtering.
  const commaCount = (plain.match(/,/g) || []).length;
  const periodCount = (plain.match(/\./g) || []).length;         // full stops
  const semicolonCount = (plain.match(/;/g) || []).length;
  const colonCount = (plain.match(/:/g) || []).length;           // colons only (semicolons split out)
  const questionCount = (plain.match(/\?/g) || []).length;
  const exclamationCount = (plain.match(/!/g) || []).length;
  const hyphenCount = (plain.match(/-/g) || []).length;
  const apostropheCount = (plain.match(/['’]/g) || []).length;
  const totalPunctuationCount = commaCount + periodCount + semicolonCount + colonCount
    + questionCount + exclamationCount + hyphenCount + apostropheCount;

  // First & last word (lowercased) — useful for "verses beginning/ending with…"
  const firstWord = wordList.length ? wordList[0].toLowerCase() : '';
  const lastWord = wordList.length ? wordList[wordList.length - 1].toLowerCase() : '';
  // Does the verse begin a new paragraph (starts with a pilcrow)?
  const startsWithPilcrow = /^¶/.test(rawText.trim());

  // Unique (case-insensitive) words + longest word length.
  const lower = wordList.map(w => w.toLowerCase());
  const uniqueWordCount = new Set(lower).size;
  let longestWordLen = 0;
  let longestWord = '';
  for (const w of wordList) {
    if (w.length > longestWordLen) { longestWordLen = w.length; longestWord = w; }
  }
  const avgWordLen = wordCount ? +(letterCount / wordCount).toFixed(2) : 0;

  return {
    wordCount,
    charCount,
    letterCount,
    uniqueWordCount,
    longestWordLen,
    longestWord,
    avgWordLen,
    sentenceCount,
    commaCount,
    periodCount,
    semicolonCount,
    colonCount,
    questionCount,
    exclamationCount,
    hyphenCount,
    apostropheCount,
    totalPunctuationCount,
    capitalWordCount,
    allCapsWordCount,
    italicWordCount,
    pilcrowCount,
    firstWord,
    lastWord,
    hasPilcrow,
    hasItalics,
    hasComma: commaCount > 0,
    hasPeriod: periodCount > 0,
    hasSemicolon: semicolonCount > 0,
    hasHyphen: hyphenCount > 0,
    hasApostrophe: apostropheCount > 0,
    hasQuestion: questionCount > 0,
    hasExclamation: exclamationCount > 0,
    hasAllCaps: allCapsWordCount > 0,
    hasColon: colonCount > 0,
    startsWithPilcrow,
  };
}

let _cache = null;      // built verse records
let _building = null;   // in-flight promise

// Build (once) the full list of verse records with metrics from cached Bible.
export async function buildVerseIndex(force = false) {
  if (_cache && !force) return _cache;
  if (_building && !force) return _building;
  _building = (async () => {
    const data = await getBibleData();
    const records = [];
    // Iterate in canonical book order for stable default output.
    for (const bookEntry of BIBLE_BOOKS) {
      const book = bookEntry.apiName;
      const chapters = data[book];
      if (!chapters) continue;
      const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);
      for (const chapter of chapterNums) {
        const verses = chapters[chapter];
        if (!Array.isArray(verses)) continue;
        for (const v of verses) {
          if (!v || typeof v.text !== 'string' || v.verse == null) continue;
          // Apostrophes are stored as a replacement char after a letter
          // (e.g. "God\uFFFDs") — normalize before computing metrics/plain
          // text so text search and the apostrophe metrics work correctly.
          const text = normalizeApostrophes(v.text);
          const metrics = computeMetrics(text);
          // plainText is used for text-search matching ONLY (display uses
          // rawText) — also normalize æ/Æ ligatures here so typing "Caesar" or
          // "Judea" finds "Cæsar"/"Judæa" without changing the displayed text.
          const plain = normalizeLigatures(stripBrackets(stripPilcrow(text)).replace(/\s+/g, ' ').trim());
          records.push({
            book,
            abbr: bookEntry.abbr,
            shortName: bookEntry.shortName,
            testament: bookEntry.testament,
            chapter,
            verse: v.verse,
            ref: `${bookEntry.shortName} ${chapter}:${v.verse}`,
            rawText: text,
            plainText: plain,
            metrics,
          });
        }
      }
    }
    _cache = records;
    _building = null;
    return records;
  })();
  return _building;
}

// The list of numeric metrics available for min/max filtering AND sorting.
export const NUMERIC_METRICS = [
  { key: 'wordCount', label: 'Word count' },
  { key: 'charCount', label: 'Character count' },
  { key: 'letterCount', label: 'Letter count' },
  { key: 'uniqueWordCount', label: 'Unique words' },
  { key: 'longestWordLen', label: 'Longest word length' },
  { key: 'avgWordLen', label: 'Average word length' },
  { key: 'sentenceCount', label: 'Sentence count' },
  { key: 'commaCount', label: 'Commas' },
  { key: 'periodCount', label: 'Full stops (periods)' },
  { key: 'semicolonCount', label: 'Semicolons' },
  { key: 'colonCount', label: 'Colons' },
  { key: 'questionCount', label: 'Question marks' },
  { key: 'exclamationCount', label: 'Exclamation marks' },
  { key: 'hyphenCount', label: 'Hyphens' },
  { key: 'apostropheCount', label: 'Apostrophes' },
  { key: 'totalPunctuationCount', label: 'Total punctuation marks' },
  { key: 'capitalWordCount', label: 'Capitalised words' },
  { key: 'allCapsWordCount', label: 'ALL-CAPS words (e.g. LORD)' },
  { key: 'italicWordCount', label: 'Italic (supplied) words' },
];

// Boolean property toggles (tri-state handled in the panel: any / yes / no).
export const BOOLEAN_METRICS = [
  { key: 'hasPilcrow', label: 'Begins a new paragraph (¶)' },
  { key: 'hasItalics', label: 'Contains italics ([supplied] words)' },
  { key: 'hasComma', label: 'Contains a comma' },
  { key: 'hasPeriod', label: 'Contains a full stop (period)' },
  { key: 'hasSemicolon', label: 'Contains a semicolon' },
  { key: 'hasColon', label: 'Contains a colon' },
  { key: 'hasQuestion', label: 'Contains a question mark' },
  { key: 'hasExclamation', label: 'Contains an exclamation mark' },
  { key: 'hasHyphen', label: 'Contains a hyphen' },
  { key: 'hasApostrophe', label: 'Contains an apostrophe' },
  { key: 'hasAllCaps', label: 'Contains an ALL-CAPS word' },
];

// Default filter state.
export function defaultFilters() {
  const ranges = {};
  NUMERIC_METRICS.forEach(m => { ranges[m.key] = { min: '', max: '' }; });
  const bools = {};
  BOOLEAN_METRICS.forEach(m => { bools[m.key] = 'any'; }); // 'any' | 'yes' | 'no'
  return {
    testament: 'all',          // 'all' | 'old' | 'new'
    book: 'all',               // 'all' | apiName
    textContains: '',          // substring in plain text (matching honours the flags below)
    textCaseSensitive: false,  // match the exact letter case
    textWholeWord: false,      // match whole words only (not substrings)
    textInOrder: false,        // terms must appear in the same order they're typed (default off = any order)
    textAdjacent: false,       // terms must be adjacent (a phrase, no words between)
    textWildcard: false,       // treat * as any run of chars and ? as one char (matches bibleApi search)
    ranges,
    bools,
    sortKey: 'wordCount',
    sortDir: 'desc',           // 'asc' | 'desc'
  };
}

// True when the filters are still at their untouched defaults — i.e. the user
// hasn't set a testament, book, text search, any numeric range, or any boolean
// toggle. Sort key/direction alone don't count as "active" filtering.
export function isDefaultFilters(f) {
  if (f.testament !== 'all') return false;
  if (f.book !== 'all') return false;
  if (f.textContains.trim() !== '') return false;
  for (const m of NUMERIC_METRICS) {
    if (f.ranges[m.key].min !== '' || f.ranges[m.key].max !== '') return false;
  }
  for (const m of BOOLEAN_METRICS) {
    if (f.bools[m.key] !== 'any') return false;
  }
  return true;
}

// Split the "Text contains" box into individual search words. Multiple words
// are matched with AND (every word must appear somewhere in the verse, in any
// order) — e.g. "love God" matches verses containing both "love" and "God".
// Case is preserved so a case-sensitive match can compare exactly.
export function parseSearchTerms(text) {
  // Split on commas AND/OR whitespace, so "love, LORD begat" and "love LORD"
  // both work. Every term must appear in the verse (AND matching). Normalize a
  // curly apostrophe (mobile "smart punctuation") to a plain one so the term
  // matches verse text either way.
  return normalizeQueryApostrophes(text || '').trim().split(/[\s,]+/).filter(Boolean);
}

// Max number of unrelated words allowed between consecutive terms in "In order"
// mode, so it means "in sequence, close together" (e.g. "Lamb of God" won't
// match a stray "Lamb …(20 words)… of …(10 words)… God"). Adjacent = 0 gaps.
export const IN_ORDER_MAX_GAP = 1;

// Does the verse's plain text contain the given terms, honouring the flags?
//  - caseSensitive: compare exact letter case
//  - wholeWord:     match whole words only (not substrings)
//  - inOrder:       terms must appear in sequence, close together (<= IN_ORDER_MAX_GAP words apart)
//  - adjacent:      terms must be directly adjacent (a phrase, in order)
export function matchesTerms(plainText, terms, caseSensitive, wholeWord, inOrder = false, adjacent = false, wildcard = false) {
  if (!terms.length) return true;
  const haystack = caseSensitive ? plainText : plainText.toLowerCase();

  // Build a regex fragment for a single term, respecting whole-word. When
  // wildcard is on, '*' → any run of chars and '?' → exactly one char (every
  // other char escaped), matching the bibleApi search wildcard behaviour so
  // the website's Advanced Search and the Chrome extension stay in sync.
  const frag = (term) => {
    const t = caseSensitive ? term : term.toLowerCase();
    if (wildcard) {
      let pattern = '';
      for (const ch of t) {
        if (ch === '*') pattern += '.*';
        else if (ch === '?') pattern += '.';
        else pattern += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      return pattern;
    }
    return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const flags = caseSensitive ? '' : 'i';
  // Word boundaries as non-consuming look-arounds, so a match never eats the
  // boundary character that also separates it from the NEXT term. (Consuming
  // the trailing boundary was the bug that made whole-word "in order" and
  // "adjacent" phrase searches fail on consecutive words like "Lamb of God".)
  const before = wholeWord ? `(?<![A-Za-z'])` : '';
  const after = wholeWord ? `(?![A-Za-z'])` : '';

  // Adjacent → single phrase: term1 <space(s)> term2 <space(s)> … in order.
  if (adjacent) {
    const phrase = terms.map(frag).join('[,;:.!?()\\u2013\\u2014\\s-]+');
    const pattern = `${before}${phrase}${after}`;
    return new RegExp(pattern, flags).test(plainText);
  }

  // In order (but not necessarily adjacent) → walk left-to-right, requiring
  // each term to appear after the previous term's match. Any number of words
  // may sit between them.
  if (inOrder) {
    let from = 0;
    for (const term of terms) {
      const esc = frag(term);
      const re = new RegExp(`${before}${esc}${after}`, flags + 'g');
      re.lastIndex = from;
      const m = re.exec(plainText);
      if (!m) return false;
      from = m.index + m[0].length;
    }
    return true;
  }

  // Wildcard → each term is a regex pattern (* = any run, ? = one char); a
  // verse matches only when EVERY term pattern matches somewhere.
  if (wildcard) {
    return terms.every(term => {
      const pat = frag(term);
      const re = new RegExp(`${before}${pat}${after}`, flags);
      return re.test(plainText);
    });
  }

  // Default → every term appears somewhere, any order (AND matching).
  return terms.every(term => {
    const t = caseSensitive ? term : term.toLowerCase();
    if (wholeWord) {
      const esc = frag(term);
      const re = new RegExp(`${before}${esc}${after}`, flags);
      return re.test(plainText);
    }
    return haystack.includes(t);
  });
}

// Compute the actual min & max value of every numeric metric — by default
// across all verses, or (when `f` is given) across only the verses matching
// the OTHER active filters. For each metric we ignore that metric's own range
// while computing its available span, so the placeholders reflect what values
// are still reachable given everything else the user has selected. If no verse
// matches, the metric's range is null so the panel can grey it out.
let _rangeCache = null;
export function computeMetricRanges(records, f = null) {
  if (!records || !records.length) return null;
  if (!f) {
    if (_rangeCache) return _rangeCache;
    const ranges = {};
    for (const m of NUMERIC_METRICS) {
      let min = Infinity, max = -Infinity;
      for (const r of records) {
        const v = r.metrics[m.key];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ranges[m.key] = { min: Math.round(min), max: Math.round(max) };
    }
    _rangeCache = ranges;
    return ranges;
  }

  const ranges = {};
  for (const m of NUMERIC_METRICS) {
    // Match against all filters EXCEPT this metric's own numeric range.
    const others = { ...f, ranges: { ...f.ranges, [m.key]: { min: '', max: '' } } };
    let min = Infinity, max = -Infinity;
    for (const r of records) {
      if (!matchesNonRange(r, others, m.key)) continue;
      const v = r.metrics[m.key];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ranges[m.key] = max === -Infinity ? null : { min: Math.round(min), max: Math.round(max) };
  }
  return ranges;
}

// Does a verse match every filter dimension except the numeric range of
// `skipKey`? Used to compute per-metric available ranges.
function matchesNonRange(r, f, skipKey) {
  const terms = parseSearchTerms(f.textContains);
  if (f.testament !== 'all' && r.testament !== f.testament) return false;
  if (f.book !== 'all' && r.book !== f.book) return false;
  if (terms.length && !matchesTerms(r.plainText, terms, f.textCaseSensitive, f.textWholeWord, f.textInOrder, f.textAdjacent, f.textWildcard)) return false;
  for (const m of NUMERIC_METRICS) {
    if (m.key === skipKey) continue;
    const { min, max } = f.ranges[m.key];
    const val = r.metrics[m.key];
    if (min !== '' && val < Number(min)) return false;
    if (max !== '' && val > Number(max)) return false;
  }
  for (const m of BOOLEAN_METRICS) {
    const want = f.bools[m.key];
    if (want === 'any') continue;
    const val = !!r.metrics[m.key];
    if (want === 'yes' && !val) return false;
    if (want === 'no' && val) return false;
  }
  return true;
}

// Count how many verses match a given filter object (no sorting needed).
function countMatches(records, f) {
  const terms = parseSearchTerms(f.textContains);
  let n = 0;
  for (const r of records) {
    if (f.testament !== 'all' && r.testament !== f.testament) continue;
    if (f.book !== 'all' && r.book !== f.book) continue;
    if (terms.length && !matchesTerms(r.plainText, terms, f.textCaseSensitive, f.textWholeWord, f.textInOrder, f.textAdjacent, f.textWildcard)) continue;
    let ok = true;
    for (const m of NUMERIC_METRICS) {
      const { min, max } = f.ranges[m.key];
      const val = r.metrics[m.key];
      if (min !== '' && val < Number(min)) { ok = false; break; }
      if (max !== '' && val > Number(max)) { ok = false; break; }
    }
    if (!ok) continue;
    for (const m of BOOLEAN_METRICS) {
      const want = f.bools[m.key];
      if (want === 'any') continue;
      const val = !!r.metrics[m.key];
      if (want === 'yes' && !val) { ok = false; break; }
      if (want === 'no' && val) { ok = false; break; }
    }
    if (ok) n++;
  }
  return n;
}

// Build a map of which filter OPTIONS would still return at least one verse,
// given the current filters. Each option is tested by overriding just that one
// dimension in the current filter object and counting matches. Options that
// yield 0 results are marked disabled so the panel can grey them out.
export function computeOptionAvailability(records, f) {
  if (!records || !records.length) return null;

  // Testament options: 'all' | 'old' | 'new'
  const testaments = {};
  for (const t of ['all', 'old', 'new']) {
    testaments[t] = countMatches(records, { ...f, testament: t, book: 'all' }) > 0;
  }

  // Book options: 'all' + every apiName. Test within the current testament.
  const books = { all: countMatches(records, { ...f, book: 'all' }) > 0 };
  for (const b of BIBLE_BOOKS) {
    if (f.testament !== 'all' && b.testament !== f.testament) continue;
    books[b.apiName] = countMatches(records, { ...f, book: b.apiName }) > 0;
  }

  // Property (boolean) options: for each metric, which of any/yes/no still match.
  const bools = {};
  for (const m of BOOLEAN_METRICS) {
    bools[m.key] = {
      any: true, // 'any' never removes verses, always available
      yes: countMatches(records, { ...f, bools: { ...f.bools, [m.key]: 'yes' } }) > 0,
      no: countMatches(records, { ...f, bools: { ...f.bools, [m.key]: 'no' } }) > 0,
    };
  }

  return { testaments, books, bools };
}

// Apply filters + sort to the built records. Returns a new array.
export function applyFilters(records, f) {
  const terms = parseSearchTerms(f.textContains);
  let out = records.filter(r => {
    if (f.testament !== 'all' && r.testament !== f.testament) return false;
    if (f.book !== 'all' && r.book !== f.book) return false;
    if (terms.length && !matchesTerms(r.plainText, terms, f.textCaseSensitive, f.textWholeWord, f.textInOrder, f.textAdjacent, f.textWildcard)) return false;

    for (const m of NUMERIC_METRICS) {
      const { min, max } = f.ranges[m.key];
      const val = r.metrics[m.key];
      if (min !== '' && val < Number(min)) return false;
      if (max !== '' && val > Number(max)) return false;
    }
    for (const m of BOOLEAN_METRICS) {
      const want = f.bools[m.key];
      if (want === 'any') continue;
      const val = !!r.metrics[m.key];
      if (want === 'yes' && !val) return false;
      if (want === 'no' && val) return false;
    }
    return true;
  });

  const key = f.sortKey;

  // 'none' → keep the records in their natural (canonical) order, unsorted by
  // any metric. records are already built in canonical book order.
  if (key === 'none') return out;

  const dir = f.sortDir === 'asc' ? 1 : -1;
  const bookIndex = (apiName) => BIBLE_BOOKS.findIndex(x => x.apiName === apiName);

  // 'canonical' → sort by Bible book order, then chapter, then verse.
  if (key === 'canonical') {
    out = out.slice().sort((a, b) => {
      const ai = bookIndex(a.book);
      const bi = bookIndex(b.book);
      if (ai !== bi) return (ai - bi) * dir;
      if (a.chapter !== b.chapter) return (a.chapter - b.chapter) * dir;
      return (a.verse - b.verse) * dir;
    });
    return out;
  }

  out = out.slice().sort((a, b) => {
    const av = a.metrics[key];
    const bv = b.metrics[key];
    if (av === bv) {
      // Tie-break by canonical order (book index, chapter, verse).
      const ai = bookIndex(a.book);
      const bi = bookIndex(b.book);
      if (ai !== bi) return ai - bi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    }
    return (av - bv) * dir;
  });
  return out;
}