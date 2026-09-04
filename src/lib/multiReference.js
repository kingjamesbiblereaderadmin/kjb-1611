import { resolveBook, parseReference } from '@/lib/parseReference';
import { expandPassage } from '@/lib/expandPassage';

// Parse a single comma segment into a normalized form:
//  • cross-chapter/cross-book passage  → { kind: 'passage', ... }
//  • single verse / in-chapter range   → { kind: 'ref', abbr, chapter, verse, verseEnd }
// Returns null if the segment isn't a valid reference.
function parseSegment(seg) {
  const trimmed = (seg || '').trim();
  if (!trimmed) return null;

  // Cross-chapter / cross-book: "Book Ch:V - [Book2] Ch:V"
  const cross = trimmed.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+):(\d+)\s*-\s*((?:\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+)?(\d+):(\d+)$/);
  if (cross) {
    const startBook = resolveBook(cross[1].trim());
    const startCh = parseInt(cross[2], 10);
    const startV = parseInt(cross[3], 10);
    const endBook = cross[4] ? resolveBook(cross[4].trim()) : startBook;
    const endCh = parseInt(cross[5], 10);
    const endV = parseInt(cross[6], 10);
    if (startBook && endBook && startCh >= 1 && startCh <= startBook.chapters && endCh >= 1 && endCh <= endBook.chapters) {
      if (startBook.abbr === endBook.abbr && startCh === endCh) {
        return { kind: 'ref', abbr: startBook.abbr, chapter: startCh, verse: startV, verseEnd: endV, book: startBook };
      }
      return { kind: 'passage', startBook, startCh, startV, endBook, endCh, endV };
    }
  }

  // Single verse, in-chapter range, or whole chapter
  const ref = parseReference(trimmed);
  if (ref) {
    const book = resolveBook(ref.abbr);
    return { kind: 'ref', abbr: ref.abbr, chapter: ref.chapter, verse: ref.verse, verseEnd: ref.verseEnd, book };
  }
  return null;
}

// Detect whether the input contains a multi-reference list (commas) AND every
// segment is a valid reference. Returns true only when there are 2+ valid refs.
export function isMultiReference(input) {
  if (!input || !input.includes(',')) return false;
  const segs = input.split(',').map(s => s.trim()).filter(Boolean);
  if (segs.length < 2) return false;
  return segs.every(s => parseSegment(s) !== null);
}

// Expand a comma-separated multi-reference into ordered stepper blocks
// ({ abbr, chapter, verse, verseEnd }) plus a display label. Cross-chapter/book
// passages are expanded per-chapter. Returns { results, label } or null.
export async function expandMultiReference(input) {
  const segs = (input || '').split(',').map(s => s.trim()).filter(Boolean);
  const parsed = segs.map(parseSegment);
  if (parsed.length < 2 || parsed.some(p => p === null)) return null;

  const results = [];
  const labelParts = [];
  for (const p of parsed) {
    if (p.kind === 'passage') {
      const blocks = await expandPassage(p);
      blocks.forEach(b => results.push({ abbr: b.abbr, chapter: b.chapter, verse: b.vStart, verseEnd: b.vEnd }));
      labelParts.push(`${p.startBook.shortName} ${p.startCh}:${p.startV}–${p.endBook.abbr === p.startBook.abbr ? '' : p.endBook.shortName + ' '}${p.endCh}:${p.endV}`);
    } else {
      results.push({ abbr: p.abbr, chapter: p.chapter, verse: p.verse, verseEnd: p.verseEnd || null });
      const vLabel = p.verse ? `:${p.verse}${p.verseEnd && p.verseEnd > p.verse ? `-${p.verseEnd}` : ''}` : '';
      labelParts.push(`${p.book ? p.book.shortName : p.abbr} ${p.chapter}${vLabel}`);
    }
  }
  if (!results.length) return null;
  return { results, label: labelParts.join(', ') };
}