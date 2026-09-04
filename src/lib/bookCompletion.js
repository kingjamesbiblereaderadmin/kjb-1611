import { BIBLE_BOOKS } from '@/lib/bibleData';

// Given what the user has typed, return the "ghost" completion — the remaining
// letters of the best-matching book name (e.g. "Josh" → "ua").
// Returns '' when there's no useful completion.
// Handles a trailing chapter/verse reference too (e.g. "Joh 3" → completes "John").
export function getBookCompletion(value) {
  if (!value) return '';
  // Only complete the BOOK portion — split off any trailing number/ref.
  const m = value.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)(.*)$/);
  if (!m) return '';
  const typed = m[1];
  const rest = m[2]; // chapter/verse part (or empty)
  // If they've already moved past the book name (typed a number), don't suggest.
  if (rest.trim().length > 0) return '';

  const lower = typed.toLowerCase();
  // Match against the full short name, case-insensitive, prefix match.
  const match = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().startsWith(lower));
  if (!match) return '';
  if (match.shortName.toLowerCase() === lower) return ''; // already complete
  // The remaining letters that complete the name.
  return match.shortName.slice(typed.length);
}

// Returns the full book name to replace the typed value with when the user
// accepts the completion (Tab / →). Handles both normal prefix matches
// ("Josh" → "Joshua") and numbered books typed without their number
// ("Corinthians" → "1 Corinthians", picking the FIRST numbered book).
export function getBookAcceptValue(value) {
  if (!value) return null;
  const m = value.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)(.*)$/);
  if (!m) return null;
  const typed = m[1];
  const rest = m[2];
  if (rest.trim().length > 0) return null;
  const lower = typed.toLowerCase();

  // Direct prefix match
  const direct = BIBLE_BOOKS.find(b => b.shortName.toLowerCase().startsWith(lower));
  if (direct) return direct.shortName;

  // Numbered book typed without the leading number (e.g. "Corinthians")
  const numbered = BIBLE_BOOKS.find(b => {
    const mm = b.shortName.match(/^\d\s+(.+)$/);
    return mm && mm[1].toLowerCase().startsWith(lower);
  });
  if (numbered) return numbered.shortName;

  return null;
}

// For a numbered book typed without its number (e.g. "Corinthians"), return a
// hint listing every available number variant, e.g. "1 or 2 Corinthians".
// Returns null when not applicable (direct prefix match, or no numbered match).
export function getNumberedBookHint(value) {
  if (!value) return null;
  const m = value.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)(.*)$/);
  if (!m) return null;
  const typed = m[1];
  if (m[2].trim().length > 0) return null;
  const lower = typed.toLowerCase();

  // Skip if it's already a direct prefix match (handled by suffix completion).
  if (BIBLE_BOOKS.some(b => b.shortName.toLowerCase().startsWith(lower))) return null;

  // Collect all numbered variants whose name part matches what was typed.
  const nums = [];
  let nameLabel = null;
  for (const b of BIBLE_BOOKS) {
    const mm = b.shortName.match(/^(\d)\s+(.+)$/);
    if (mm && mm[2].toLowerCase().startsWith(lower)) {
      nums.push(mm[1]);
      nameLabel = mm[2];
    }
  }
  if (!nums.length) return null;
  const unique = [...new Set(nums)];
  return `${unique.join(' or ')} ${nameLabel}`;
}

// For a numbered book typed without its number (e.g. "Corinthians"), return the
// ordered list of full variant names, e.g. ["1 Corinthians", "2 Corinthians"].
// Returns [] when not applicable. Lets the UI cycle through them with Tab.
export function getNumberedBookVariants(value) {
  if (!value) return [];
  const m = value.match(/^(\d?\s?[a-zA-Z]+(?:\s+[a-zA-Z]+)?)(.*)$/);
  if (!m) return [];
  const typed = m[1];
  if (m[2].trim().length > 0) return [];
  const lower = typed.toLowerCase();
  if (BIBLE_BOOKS.some(b => b.shortName.toLowerCase().startsWith(lower))) return [];

  return BIBLE_BOOKS
    .filter(b => {
      const mm = b.shortName.match(/^\d\s+(.+)$/);
      return mm && mm[1].toLowerCase().startsWith(lower);
    })
    .map(b => b.shortName);
}

// When the value is already a complete numbered book (e.g. "1 Corinthians"),
// return all sibling variants sharing the same name part (["1 Corinthians",
// "2 Corinthians"]) so the UI can cycle with Tab. Returns [] if only one exists.
export function getNumberedSiblings(value) {
  if (!value) return [];
  const m = value.match(/^\d\s+(.+)$/);
  if (!m) return [];
  const name = m[1].trim().toLowerCase();
  const siblings = BIBLE_BOOKS
    .filter(b => {
      const mm = b.shortName.match(/^\d\s+(.+)$/);
      return mm && mm[1].toLowerCase() === name;
    })
    .map(b => b.shortName);
  return siblings.length > 1 ? siblings : [];
}