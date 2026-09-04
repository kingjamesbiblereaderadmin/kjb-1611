import { NUMERIC_METRICS, BOOLEAN_METRICS } from '@/lib/verseAnalysis';
import { BIBLE_BOOKS } from '@/lib/bibleData';

// Turn an Advanced Search filter object into a professional, human-readable
// list of the settings that are actually active. Returns an array of
// { label, value } pairs (empty when nothing meaningful is set), so exporters
// can render it however they like (print/PDF/Word/CSV/TXT).
export function describeFilters(filters) {
  if (!filters) return [];
  const out = [];

  // Scope: testament + book
  if (filters.testament === 'old') out.push({ label: 'Testament', value: 'Old Testament' });
  else if (filters.testament === 'new') out.push({ label: 'Testament', value: 'New Testament' });

  if (filters.book && filters.book !== 'all') {
    const b = BIBLE_BOOKS.find(x => x.apiName === filters.book);
    out.push({ label: 'Book', value: b ? b.shortName : filters.book });
  }

  // Text search + its matching mode
  const text = (filters.textContains || '').trim();
  if (text) {
    out.push({ label: 'Search text', value: text });
    const mode = filters.textAdjacent
      ? 'Adjacent (exact phrase, in order)'
      : filters.textInOrder
        ? 'In the order typed'
        : 'Any order (all terms present)';
    out.push({ label: 'Match mode', value: mode });
    const opts = [];
    if (filters.textCaseSensitive) opts.push('Match case');
    if (filters.textWholeWord) opts.push('Whole word');
    if (opts.length) out.push({ label: 'Match options', value: opts.join(', ') });
  }

  // Numeric ranges
  for (const m of NUMERIC_METRICS) {
    const r = filters.ranges?.[m.key];
    if (!r) continue;
    const hasMin = r.min !== '' && r.min != null;
    const hasMax = r.max !== '' && r.max != null;
    if (!hasMin && !hasMax) continue;
    let value;
    if (hasMin && hasMax) value = `${r.min}–${r.max}`;
    else if (hasMin) value = `≥ ${r.min}`;
    else value = `≤ ${r.max}`;
    out.push({ label: m.label, value });
  }

  // Boolean property filters (only when set to yes/no)
  for (const m of BOOLEAN_METRICS) {
    const want = filters.bools?.[m.key];
    if (!want || want === 'any') continue;
    out.push({ label: m.label, value: want === 'yes' ? 'Yes' : 'No' });
  }

  // Sort
  if (filters.sortKey === 'canonical') {
    out.push({ label: 'Sorted by', value: `Book order (${filters.sortDir === 'asc' ? 'Genesis → Revelation' : 'Revelation → Genesis'})` });
  } else if (filters.sortKey && filters.sortKey !== 'none') {
    const m = NUMERIC_METRICS.find(x => x.key === filters.sortKey);
    if (m) out.push({ label: 'Sorted by', value: `${m.label} (${filters.sortDir === 'asc' ? 'lowest first' : 'highest first'})` });
  }

  return out;
}