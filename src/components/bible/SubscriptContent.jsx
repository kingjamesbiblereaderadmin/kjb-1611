import React from 'react';

// Normalizes unicode in subscript/colophon text (smart quotes → straight,
// replacement-char/pilcrow apostrophes → real apostrophes, merges adjacent
// brackets). Strips leading pilcrow (colophons include it in raw text).
function normalizeMetaText(text) {
  if (!text || typeof text !== 'string') return '';
  let normalized = text
    .replace(/\u2019/g, "'").replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"').replace(/\u201D/g, '"')
    .replace(/^[\u00B6\uFFFD]\s*/, '');
  normalized = normalized
    .replace(/([A-Za-z])[\u00B6\uFFFD](?=[A-Za-z])/g, "$1'")
    .replace(/([A-Za-z])[\u00B6\uFFFD](?=[^A-Za-z]|$)/g, "$1'");
  let prev;
  do {
    prev = normalized;
    normalized = normalized.replace(/\]( +)\[/g, '$1');
  } while (normalized !== prev);
  return normalized;
}

// Highlights search term occurrences in a text string as <mark> elements.
// React escapes all text content by default — no XSS risk.
function HighlightedText({ text, searchTerm }) {
  if (!searchTerm || !searchTerm.trim()) return text;
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const termRegex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(termRegex);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ backgroundColor: 'rgba(250, 204, 21, 0.55)', borderRadius: '3px', padding: '0 2px' }}>{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

// Safely renders subscript/colophon text as React elements — no
// dangerouslySetInnerHTML. [bracketed] words become <em>, search terms become
// <mark>, with a pilcrow prefix. All text is React-escaped by default, so
// even if the source data were compromised it cannot inject HTML.
export default function SubscriptContent({ text, searchTerm }) {
  const normalized = normalizeMetaText(text);
  const parts = normalized.split(/\[([^\]]+)\]/g);
  return (
    <>
      <span className="pilcrow">¶</span>{' '}
      {parts.map((part, i) =>
        i % 2 === 1
          ? <em key={i}><HighlightedText text={part} searchTerm={searchTerm} /></em>
          : <HighlightedText key={i} text={part} searchTerm={searchTerm} />
      )}
    </>
  );
}