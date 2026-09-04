// KJB book list with full titles, chapter counts, testament grouping
// Full canonical titles as in the KJB title pages
export const BIBLE_BOOKS = [
  // Old Testament
  { name: "The First Book of Moses, called Genesis", shortName: "Genesis", apiName: "Genesis", abbr: "GEN", chapters: 50, testament: "old" },
  { name: "The Second Book of Moses, called Exodus", shortName: "Exodus", apiName: "Exodus", abbr: "EXO", chapters: 40, testament: "old" },
  { name: "The Third Book of Moses, called Leviticus", shortName: "Leviticus", apiName: "Leviticus", abbr: "LEV", chapters: 27, testament: "old" },
  { name: "The Fourth Book of Moses, called Numbers", shortName: "Numbers", apiName: "Numbers", abbr: "NUM", chapters: 36, testament: "old" },
  { name: "The Fifth Book of Moses, called Deuteronomy", shortName: "Deuteronomy", apiName: "Deuteronomy", abbr: "DEU", chapters: 34, testament: "old" },
  { name: "The Book of Joshua", shortName: "Joshua", apiName: "Joshua", abbr: "JOS", chapters: 24, testament: "old" },
  { name: "The Book of Judges", shortName: "Judges", apiName: "Judges", abbr: "JDG", chapters: 21, testament: "old" },
  { name: "The Book of Ruth", shortName: "Ruth", apiName: "Ruth", abbr: "RUT", chapters: 4, testament: "old" },
  { name: "The First Book of Samuel, Otherwise called, The First Book Of The Kings", shortName: "1 Samuel", apiName: "1 Samuel", abbr: "1SA", chapters: 31, testament: "old" },
  { name: "The Second Book of Samuel, Otherwise called, The Second Book Of The Kings", shortName: "2 Samuel", apiName: "2 Samuel", abbr: "2SA", chapters: 24, testament: "old" },
  { name: "The First Book Of The Kings, Commonly called, The Third Book Of The Kings", shortName: "1 Kings", apiName: "1 Kings", abbr: "1KI", chapters: 22, testament: "old" },
  { name: "The Second Book Of The Kings, Commonly called, The Fourth Book Of The Kings", shortName: "2 Kings", apiName: "2 Kings", abbr: "2KI", chapters: 25, testament: "old" },
  { name: "The First Book of the Chronicles", shortName: "1 Chronicles", apiName: "1 Chronicles", abbr: "1CH", chapters: 29, testament: "old" },
  { name: "The Second Book of the Chronicles", shortName: "2 Chronicles", apiName: "2 Chronicles", abbr: "2CH", chapters: 36, testament: "old" },
  { name: "The Book of Ezra", shortName: "Ezra", apiName: "Ezra", abbr: "EZR", chapters: 10, testament: "old" },
  { name: "The Book of Nehemiah", shortName: "Nehemiah", apiName: "Nehemiah", abbr: "NEH", chapters: 13, testament: "old" },
  { name: "The Book of Esther", shortName: "Esther", apiName: "Esther", abbr: "EST", chapters: 10, testament: "old" },
  { name: "The Book of Job", shortName: "Job", apiName: "Job", abbr: "JOB", chapters: 42, testament: "old" },
  { name: "The Book of Psalms", shortName: "Psalms", apiName: "Psalms", abbr: "PSA", chapters: 150, testament: "old" },
  { name: "The Proverbs of Solomon the Son of David, King of Israel", shortName: "Proverbs", apiName: "Proverbs", abbr: "PRO", chapters: 31, testament: "old" },
  { name: "Ecclesiastes; or, the Preacher", shortName: "Ecclesiastes", apiName: "Ecclesiastes", abbr: "ECC", chapters: 12, testament: "old" },
  { name: "The Song of Songs, which is Solomon's", shortName: "Song of Solomon", apiName: "Song of Solomon", abbr: "SNG", chapters: 8, testament: "old" },
  { name: "The Book of Isaiah", shortName: "Isaiah", apiName: "Isaiah", abbr: "ISA", chapters: 66, testament: "old" },
  { name: "The Book of Jeremiah", shortName: "Jeremiah", apiName: "Jeremiah", abbr: "JER", chapters: 52, testament: "old" },
  { name: "The Lamentations of Jeremiah", shortName: "Lamentations", apiName: "Lamentations", abbr: "LAM", chapters: 5, testament: "old" },
  { name: "The Book of Ezekiel", shortName: "Ezekiel", apiName: "Ezekiel", abbr: "EZK", chapters: 48, testament: "old" },
  { name: "The Book of Daniel", shortName: "Daniel", apiName: "Daniel", abbr: "DAN", chapters: 12, testament: "old" },
  { name: "The Book of Hosea", shortName: "Hosea", apiName: "Hosea", abbr: "HOS", chapters: 14, testament: "old" },
  { name: "The Book of Joel", shortName: "Joel", apiName: "Joel", abbr: "JOL", chapters: 3, testament: "old" },
  { name: "The Book of Amos", shortName: "Amos", apiName: "Amos", abbr: "AMO", chapters: 9, testament: "old" },
  { name: "The Book of Obadiah", shortName: "Obadiah", apiName: "Obadiah", abbr: "OBA", chapters: 1, testament: "old" },
  { name: "The Book of Jonah", shortName: "Jonah", apiName: "Jonah", abbr: "JON", chapters: 4, testament: "old" },
  { name: "The Book of Micah", shortName: "Micah", apiName: "Micah", abbr: "MIC", chapters: 7, testament: "old" },
  { name: "The Book of Nahum", shortName: "Nahum", apiName: "Nahum", abbr: "NAM", chapters: 3, testament: "old" },
  { name: "The Book of Habakkuk", shortName: "Habakkuk", apiName: "Habakkuk", abbr: "HAB", chapters: 3, testament: "old" },
  { name: "The Book of Zephaniah", shortName: "Zephaniah", apiName: "Zephaniah", abbr: "ZEP", chapters: 3, testament: "old" },
  { name: "The Book of Haggai", shortName: "Haggai", apiName: "Haggai", abbr: "HAG", chapters: 2, testament: "old" },
  { name: "The Book of Zechariah", shortName: "Zechariah", apiName: "Zechariah", abbr: "ZEC", chapters: 14, testament: "old" },
  { name: "The Book of Malachi", shortName: "Malachi", apiName: "Malachi", abbr: "MAL", chapters: 4, testament: "old" },
  // New Testament
  { name: "The Gospel According to Saint Matthew", shortName: "Matthew", apiName: "Matthew", abbr: "MAT", chapters: 28, testament: "new" },
  { name: "The Gospel According to Saint Mark", shortName: "Mark", apiName: "Mark", abbr: "MRK", chapters: 16, testament: "new" },
  { name: "The Gospel According to Saint Luke", shortName: "Luke", apiName: "Luke", abbr: "LUK", chapters: 24, testament: "new" },
  { name: "The Gospel According to Saint John", shortName: "John", apiName: "John", abbr: "JHN", chapters: 21, testament: "new" },
  { name: "The Acts of the Apostles", shortName: "Acts", apiName: "Acts", abbr: "ACT", chapters: 28, testament: "new" },
  { name: "The Epistle of Paul the Apostle to the Romans", shortName: "Romans", apiName: "Romans", abbr: "ROM", chapters: 16, testament: "new" },
  { name: "The First Epistle of Paul the Apostle to the Corinthians", shortName: "1 Corinthians", apiName: "1 Corinthians", abbr: "1CO", chapters: 16, testament: "new" },
  { name: "The Second Epistle of Paul the Apostle to the Corinthians", shortName: "2 Corinthians", apiName: "2 Corinthians", abbr: "2CO", chapters: 13, testament: "new" },
  { name: "The Epistle of Paul the Apostle to the Galatians", shortName: "Galatians", apiName: "Galatians", abbr: "GAL", chapters: 6, testament: "new" },
  { name: "The Epistle of Paul the Apostle to the Ephesians", shortName: "Ephesians", apiName: "Ephesians", abbr: "EPH", chapters: 6, testament: "new" },
  { name: "The Epistle of Paul the Apostle to the Philippians", shortName: "Philippians", apiName: "Philippians", abbr: "PHP", chapters: 4, testament: "new" },
  { name: "The Epistle of Paul the Apostle to the Colossians", shortName: "Colossians", apiName: "Colossians", abbr: "COL", chapters: 4, testament: "new" },
  { name: "The First Epistle of Paul the Apostle to the Thessalonians", shortName: "1 Thessalonians", apiName: "1 Thessalonians", abbr: "1TH", chapters: 5, testament: "new" },
  { name: "The Second Epistle of Paul the Apostle to the Thessalonians", shortName: "2 Thessalonians", apiName: "2 Thessalonians", abbr: "2TH", chapters: 3, testament: "new" },
  { name: "The First Epistle of Paul the Apostle to Timothy", shortName: "1 Timothy", apiName: "1 Timothy", abbr: "1TI", chapters: 6, testament: "new" },
  { name: "The Second Epistle of Paul the Apostle to Timothy", shortName: "2 Timothy", apiName: "2 Timothy", abbr: "2TI", chapters: 4, testament: "new" },
  { name: "The Epistle of Paul the Apostle to Titus", shortName: "Titus", apiName: "Titus", abbr: "TIT", chapters: 3, testament: "new" },
  { name: "The Epistle of Paul the Apostle to Philemon", shortName: "Philemon", apiName: "Philemon", abbr: "PHM", chapters: 1, testament: "new" },
  { name: "The Epistle of Paul the Apostle to the Hebrews", shortName: "Hebrews", apiName: "Hebrews", abbr: "HEB", chapters: 13, testament: "new" },
  { name: "The General Epistle of James", shortName: "James", apiName: "James", abbr: "JAS", chapters: 5, testament: "new" },
  { name: "The First Epistle General of Peter", shortName: "1 Peter", apiName: "1 Peter", abbr: "1PE", chapters: 5, testament: "new" },
  { name: "The Second Epistle General of Peter", shortName: "2 Peter", apiName: "2 Peter", abbr: "2PE", chapters: 3, testament: "new" },
  { name: "The First Epistle General of John", shortName: "1 John", apiName: "1 John", abbr: "1JN", chapters: 5, testament: "new" },
  { name: "The Second Epistle of John", shortName: "2 John", apiName: "2 John", abbr: "2JN", chapters: 1, testament: "new" },
  { name: "The Third Epistle of John", shortName: "3 John", apiName: "3 John", abbr: "3JN", chapters: 1, testament: "new" },
  { name: "The General Epistle of Jude", shortName: "Jude", apiName: "Jude", abbr: "JDE", chapters: 1, testament: "new" },
  { name: "The Revelation of Saint John the Divine", shortName: "Revelation", apiName: "Revelation", abbr: "REV", chapters: 22, testament: "new" },
];

export const OLD_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === "old");
export const NEW_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === "new");

export function getBookByAbbr(abbr) {
  return BIBLE_BOOKS.find(b => b.abbr === abbr);
}

// Fast lookup map (apiName → book entry) so hot search loops avoid O(n)
// Array.find calls per match.
export const BOOK_BY_API_NAME = Object.fromEntries(BIBLE_BOOKS.map(b => [b.apiName, b]));

export function getBookByApiName(apiName) {
  return BOOK_BY_API_NAME[apiName];
}

export function getBookIndex(abbr) {
  return BIBLE_BOOKS.findIndex(b => b.abbr === abbr);
}

export function getNextBook(abbr) {
  const idx = getBookIndex(abbr);
  return idx >= 0 && idx < BIBLE_BOOKS.length - 1 ? BIBLE_BOOKS[idx + 1] : null;
}

export function getPrevBook(abbr) {
  const idx = getBookIndex(abbr);
  return idx > 0 ? BIBLE_BOOKS[idx - 1] : null;
}

// Build the audio-key form expected by the getAudioUrls backend function:
// "01_The First Book of Moses, called Genesis", ... (zero-padded canonical
// order + the book's full canonical title, which is what ChapterAudio records
// now store in their `book` field).
export function getBookAudioKey(book) {
  const idx = BIBLE_BOOKS.findIndex(b => b.abbr === book.abbr);
  if (idx < 0) return null;
  return `${String(idx + 1).padStart(2, '0')}_${book.name}`;
}