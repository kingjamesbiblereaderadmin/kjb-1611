// Ordered list of all gospel verses, used for the in-reader "Gospel" stepper.
// Shared between the Gospel page (seeding on click) and BibleReader
// (seeding when a shared ?from=gospel link is opened fresh).
import { BIBLE_BOOKS } from '@/lib/bibleData';

export const GOSPEL_VERSES = [
  { book: 'Romans', chapter: 3, verse: 20, label: 'All sinned' },
  { book: 'Psalms', chapter: 9, verse: 17, label: 'Hell' },
  { book: '1 Timothy', chapter: 3, verse: 16, label: 'Jesus is God' },
  { book: '1 Corinthians', chapter: 15, verse: 1, verseEnd: 4, label: 'Gospel' },
  { book: 'Romans', chapter: 3, verse: 25, label: 'Faith in his blood' },
  { book: 'Ephesians', chapter: 1, verse: 13, label: 'OSAS' },
];

// Resolve the gospel verse list to reader results (with abbrs).
export function getGospelResults() {
  return GOSPEL_VERSES.map(g => {
    const bd = BIBLE_BOOKS.find(b => b.shortName === g.book || b.apiName === g.book);
    return bd ? { abbr: bd.abbr, chapter: g.chapter, verse: g.verse, verseEnd: g.verseEnd, label: g.label } : null;
  }).filter(Boolean);
}