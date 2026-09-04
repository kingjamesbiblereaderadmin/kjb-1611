import React from 'react';

// Known proper nouns / acronyms / references that appear inside admin-entered
// KJB Defence resource descriptions. Longest terms first so the regex prefers
// the fuller phrase over a shorter substring (e.g. "Westcott and Hort" over "Hort").
const TERMS = [
  'King James Bible', 'King James Version', 'Pure Cambridge Edition', 'Textus Receptus', 'Received Text', 'Critical Text',
  'Westcott and Hort', 'Westcott-Hort', 'Westcott & Hort', 'Johannine Comma', '1 John 5:7',
  'Free Presbyterian Global Ministries', 'The Bible For Today', 'Bible For Today',
  'A Lamp in the Dark', 'Jesus is Savior', 'Jesus is Precious', 'Scion of Zion', 'Brandplucked',
  'Gail Riplinger', 'Vaticanus', 'Sinaiticus', 'Alexandrian', 'Vatican',
  'KJV', 'KJB', 'NKJV', 'NIV', 'ESV', 'NLT', 'ASV', 'NASB', 'RSV', 'TBS', 'AV1611', 'FPGM', 'NA/UBS',
].sort((a, b) => b.length - a.length);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isWordChars = (s) => /^[A-Za-z0-9]+$/.test(s);

const PATTERN = new RegExp(
  `(${TERMS.map((t) => (isWordChars(t) ? `\\b${escapeRegex(t)}\\b` : escapeRegex(t))).join('|')})`,
  'g'
);

// Renders text as plain content with only the known proper nouns/acronyms
// wrapped in notranslate spans — the rest stays translatable.
export function renderProtectedText(text) {
  if (!text) return text;
  const parts = text.split(PATTERN);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="notranslate" translate="no">{part}</span>
      : part
  );
}