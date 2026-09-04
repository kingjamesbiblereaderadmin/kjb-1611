import { BIBLE_BOOKS } from '@/lib/bibleData';

// The daily/random-verse API returns short book codes (e.g. "Song", "Ge",
// "Mt", "Joh") that differ from BIBLE_BOOKS' abbr (e.g. "SNG", "GEN", "MAT",
// "JHN"). Map each API code to the reader's abbr so deep links built from API
// verses resolve correctly instead of falling back to Genesis.
const API_ABBR_TO_ABBR = {
  ge: 'GEN', ex: 'EXO', le: 'LEV', nu: 'NUM', de: 'DEU', jos: 'JOS', jg: 'JDG',
  ru: 'RUT', '1sa': '1SA', '2sa': '2SA', '1ki': '1KI', '2ki': '2KI', '1ch': '1CH',
  '2ch': '2CH', ezr: 'EZR', ne: 'NEH', es: 'EST', job: 'JOB', ps: 'PSA', pr: 'PRO',
  ec: 'ECC', song: 'SNG', isa: 'ISA', jer: 'JER', la: 'LAM', eze: 'EZK', da: 'DAN',
  ho: 'HOS', joe: 'JOL', am: 'AMO', ob: 'OBA', jon: 'JON', mic: 'MIC', na: 'NAM',
  hab: 'HAB', zep: 'ZEP', hag: 'HAG', zec: 'ZEC', mal: 'MAL', mt: 'MAT', mr: 'MRK',
  lu: 'LUK', joh: 'JHN', ac: 'ACT', ro: 'ROM', '1co': '1CO', '2co': '2CO', ga: 'GAL',
  eph: 'EPH', php: 'PHP', col: 'COL', '1th': '1TH', '2th': '2TH', '1ti': '1TI',
  '2ti': '2TI', tit: 'TIT', phm: 'PHM', heb: 'HEB', jas: 'JAS', '1pe': '1PE',
  '2pe': '2PE', '1jo': '1JN', '2jo': '2JN', '3jo': '3JN', jude: 'JDE', re: 'REV',
};

// Resolve a book from a URL/string token — accepts abbr (e.g. "GEN"),
// API short code (e.g. "Song"), short name, or api name (case-insensitive,
// ignores spaces).
export function resolveBook(token) {
  if (!token) return null;
  const t = String(token).trim().toLowerCase().replace(/\s+/g, '');
  const aliasAbbr = API_ABBR_TO_ABBR[t];
  return BIBLE_BOOKS.find(b =>
    (aliasAbbr && b.abbr === aliasAbbr) ||
    b.abbr.toLowerCase() === t ||
    b.shortName.toLowerCase().replace(/\s+/g, '') === t ||
    (b.apiName && b.apiName.toLowerCase().replace(/\s+/g, '') === t) ||
    (b.name && b.name.toLowerCase().replace(/\s+/g, '') === t)
  ) || null;
}

// Format verses with dashes for consecutive, commas for gaps (e.g. 1-3,5).
export function formatVerseRange(verses) {
  if (!verses || verses.length === 0) return '';
  if (verses.length === 1) return String(verses[0]);

  const sorted = [...verses].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);

  return ranges.join(',');
}