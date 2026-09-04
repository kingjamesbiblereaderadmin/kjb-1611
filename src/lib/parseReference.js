import { BIBLE_BOOKS } from '@/lib/bibleData';

// Common abbreviations / alternate names mapped to canonical abbr
const ALIASES = {
  gen: 'GEN', ge: 'GEN', gn: 'GEN',
  exo: 'EXO', ex: 'EXO', exod: 'EXO',
  lev: 'LEV', le: 'LEV', lv: 'LEV',
  num: 'NUM', nu: 'NUM', nm: 'NUM', nb: 'NUM',
  deu: 'DEU', dt: 'DEU', deut: 'DEU',
  jos: 'JOS', josh: 'JOS',
  jdg: 'JDG', judg: 'JDG', jg: 'JDG',
  rut: 'RUT', ru: 'RUT', ruth: 'RUT',
  '1sa': '1SA', '1sam': '1SA', '1samuel': '1SA',
  '2sa': '2SA', '2sam': '2SA', '2samuel': '2SA',
  '1ki': '1KI', '1kgs': '1KI', '1kings': '1KI',
  '2ki': '2KI', '2kgs': '2KI', '2kings': '2KI',
  '1ch': '1CH', '1chr': '1CH', '1chron': '1CH', '1chronicles': '1CH',
  '2ch': '2CH', '2chr': '2CH', '2chron': '2CH', '2chronicles': '2CH',
  ezr: 'EZR', ezra: 'EZR',
  neh: 'NEH', ne: 'NEH',
  est: 'EST', es: 'EST', esth: 'EST',
  job: 'JOB', jb: 'JOB',
  psa: 'PSA', ps: 'PSA', psalm: 'PSA', psalms: 'PSA', pslm: 'PSA',
  pro: 'PRO', pr: 'PRO', prov: 'PRO', proverb: 'PRO', proverbs: 'PRO',
  ecc: 'ECC', ec: 'ECC', eccl: 'ECC',
  sng: 'SNG', song: 'SNG', sos: 'SNG', songofsolomon: 'SNG', canticles: 'SNG',
  isa: 'ISA', is: 'ISA',
  jer: 'JER', je: 'JER',
  lam: 'LAM', la: 'LAM',
  ezk: 'EZK', eze: 'EZK', ezek: 'EZK', ezekiel: 'EZK',
  dan: 'DAN', da: 'DAN', dn: 'DAN',
  hos: 'HOS', ho: 'HOS', hosea: 'HOS',
  jol: 'JOL', joe: 'JOL', joel: 'JOL',
  amo: 'AMO', am: 'AMO', amos: 'AMO',
  oba: 'OBA', ob: 'OBA', obad: 'OBA', obadiah: 'OBA',
  jon: 'JON', jnh: 'JON', jonah: 'JON',
  mic: 'MIC', mc: 'MIC', micah: 'MIC',
  nam: 'NAM', na: 'NAM', nah: 'NAM', nahum: 'NAM',
  hab: 'HAB', hb: 'HAB', habakkuk: 'HAB',
  zep: 'ZEP', zph: 'ZEP', zeph: 'ZEP', zephaniah: 'ZEP',
  hag: 'HAG', hg: 'HAG', haggai: 'HAG',
  zec: 'ZEC', zc: 'ZEC', zech: 'ZEC', zechariah: 'ZEC',
  mal: 'MAL', ml: 'MAL', malachi: 'MAL',
  mat: 'MAT', mt: 'MAT', matt: 'MAT', matthew: 'MAT',
  mrk: 'MRK', mk: 'MRK', mar: 'MRK', mark: 'MRK',
  luk: 'LUK', lk: 'LUK', luke: 'LUK',
  jhn: 'JHN', jn: 'JHN', joh: 'JHN', john: 'JHN',
  act: 'ACT', ac: 'ACT', acts: 'ACT',
  rom: 'ROM', ro: 'ROM', rm: 'ROM', romans: 'ROM',
  '1co': '1CO', '1cor': '1CO', '1corinthians': '1CO',
  '2co': '2CO', '2cor': '2CO', '2corinthians': '2CO',
  gal: 'GAL', ga: 'GAL', galatians: 'GAL',
  eph: 'EPH', ephesians: 'EPH',
  php: 'PHP', phil: 'PHP', philippians: 'PHP',
  col: 'COL', colossians: 'COL',
  '1th': '1TH', '1thess': '1TH', '1thessalonians': '1TH',
  '2th': '2TH', '2thess': '2TH', '2thessalonians': '2TH',
  '1ti': '1TI', '1tim': '1TI', '1timothy': '1TI',
  '2ti': '2TI', '2tim': '2TI', '2timothy': '2TI',
  tit: 'TIT', ti: 'TIT', titus: 'TIT',
  phm: 'PHM', phlm: 'PHM', philem: 'PHM', philemon: 'PHM',
  heb: 'HEB', hebrews: 'HEB',
  jas: 'JAS', jm: 'JAS', jam: 'JAS', james: 'JAS',
  '1pe': '1PE', '1pet': '1PE', '1peter': '1PE',
  '2pe': '2PE', '2pet': '2PE', '2peter': '2PE',
  '1jn': '1JN', '1joh': '1JN', '1john': '1JN',
  '2jn': '2JN', '2joh': '2JN', '2john': '2JN',
  '3jn': '3JN', '3joh': '3JN', '3john': '3JN',
  jde: 'JDE', jud: 'JDE', jude: 'JDE',
  rev: 'REV', re: 'REV', rv: 'REV', revelation: 'REV', apocalypse: 'REV',
};

// Resolve a book token (name, shortName, abbr, or alias) to a BIBLE_BOOKS entry
export function resolveBook(token) {
  if (!token) return null;
  const t = token.trim().toLowerCase().replace(/\s+/g, '');
  // Direct abbr match
  let book = BIBLE_BOOKS.find(b => b.abbr.toLowerCase() === t);
  if (book) return book;
  // Alias map
  if (ALIASES[t]) return BIBLE_BOOKS.find(b => b.abbr === ALIASES[t]) || null;
  // shortName (normalised, spaces removed)
  book = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().replace(/\s+/g, '') === t);
  if (book) return book;
  // Starts-with on shortName
  book = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().replace(/\s+/g, '').startsWith(t) && t.length >= 3);
  return book || null;
}

// Parse a reference string like "jn 3:16", "gen 1", "1 cor 13:4-7", "psalm 23"
// Returns { abbr, chapter, verse, verseEnd } or null if not a reference
export function parseReference(input) {
  if (!input) return null;
  let raw = input.trim();
  // Strip a protocol-handler scheme prefix from deep links, e.g.
  // "web+bible:John 3:16", "bible:John 3:16", "web+kjb:...", "kjb:...". Chrome
  // requires custom schemes to be web+-prefixed, so protocol_handlers register
  // web+bible / web+kjb; the %s substitution passes the full URI as `ref`.
  raw = raw.replace(/^(?:web\+)?(?:bible|kjb):\/?/i, '');
  // Match: <book tokens> <chapter>[:<verse>[-<verseEnd>]]
  const m = raw.match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z\s]*?)\s*(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);
  if (!m) return null;
  const bookToken = m[1].trim();
  const book = resolveBook(bookToken);
  if (!book) return null;
  const chapter = parseInt(m[2], 10);
  if (chapter < 1 || chapter > book.chapters) return null;
  const verse = m[3] ? parseInt(m[3], 10) : null;
  const verseEnd = m[4] ? parseInt(m[4], 10) : null;
  return { abbr: book.abbr, chapter, verse, verseEnd };
}