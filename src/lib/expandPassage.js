import { BIBLE_BOOKS, getBookIndex } from '@/lib/bibleData';
import { getBibleData } from '@/lib/bibleCache';

// Expand a cross-chapter / cross-book passage into an ordered list of
// per-chapter blocks: { abbr, chapter, vStart, vEnd }.
// Each block covers a whole chapter except the first (starts at vStart) and the
// last (ends at vEnd). Verse counts come from the cached Bible data.
export async function expandPassage({ startBook, startCh, startV, endBook, endCh, endV }) {
  const data = await getBibleData();

  const verseCount = (book, ch) => {
    const arr = data?.[book.apiName]?.[ch];
    return Array.isArray(arr) ? arr.length : 0;
  };

  const startIdx = getBookIndex(startBook.abbr);
  const endIdx = getBookIndex(endBook.abbr);
  if (startIdx < 0 || endIdx < 0) return [];

  const blocks = [];
  for (let bi = startIdx; bi <= endIdx; bi++) {
    const book = BIBLE_BOOKS[bi];
    const firstCh = bi === startIdx ? startCh : 1;
    const lastCh = bi === endIdx ? endCh : book.chapters;
    for (let ch = firstCh; ch <= lastCh; ch++) {
      const isFirst = bi === startIdx && ch === startCh;
      const isLast = bi === endIdx && ch === endCh;
      const total = verseCount(book, ch);
      blocks.push({
        abbr: book.abbr,
        chapter: ch,
        vStart: isFirst ? startV : 1,
        vEnd: isLast ? endV : (total || 999),
      });
    }
  }
  return blocks;
}