# Advanced Search — Copy/Sync Instructions

> Paste this whole document into the target agent (e.g. Superagent). It describes
> the complete KJB Reader **Advanced Search** system so it can be replicated in
> another project. All paths are relative to the KJB Reader source.

## What it is

A **fully client-side** Bible research engine. It loads the entire KJB into
memory, computes ~30 measurable properties per verse (word/char counts,
pilcrows, italics, capitals, every punctuation mark, longest word, etc.), then
lets the user **filter** (by testament, book, text, numeric ranges, boolean
properties) and **sort** (by any metric, asc/desc) all 31,102 verses. Results
are grouped by Testament → Book, with per-term highlighting and export to
PDF/Word/CSV/TXT/print/copy.

There is also a separate **backend text search** (regular keyword search, not
the metrics engine) — see the last section if you need server-side search too.

---

## Files to copy (exact paths)

### The engine + UI (client-side, React + Tailwind)

| Source path | Role |
|---|---|
| `src/lib/verseAnalysis.js` | ⭐ THE ENGINE. Builds the verse index, computes metrics, defines `NUMERIC_METRICS`/`BOOLEAN_METRICS`, `defaultFilters`, `applyFilters`, `matchesTerms`, `computeOptionAvailability`, `computeMetricRanges` |
| `src/lib/describeFilters.js` | Turns a filter object into a human-readable `{label, value}[]` list (used by exports) |
| `src/pages/AdvancedSearchPage.jsx` | The page: loads index, holds filter state, debounced text input, grouping, pagination (50), select-mode, mobile filter drawer |
| `src/components/search/AdvancedFilterPanel.jsx` | Filter UI: Scope & text, Sort by, Numeric ranges, Property filters (tri-state any/yes/no), reset |
| `src/components/search/AdvancedResultsToolbar.jsx` | Export/print/copy toolbar; maps records → export items; builds filename from filters |
| `src/components/search/AdvancedResultRow.jsx` | One result row: renders verse with `[bracket]`→italic + `¶` + search-term **and** active-feature highlighting; metric chips |

### Dependencies these import (must exist or be copied)

| Source path | Exports used |
|---|---|
| `src/lib/bibleData.js` | `BIBLE_BOOKS` (array of `{apiName, abbr, shortName, testament}`), `BOOK_BY_API_NAME` |
| `src/lib/bibleCache.js` | `getBibleData()` → returns the Bible as `{bookApiName: {chapterNum: [{verse, text}]}}` |
| `src/lib/exportVerses.js` | `exportVerses(format, items, query, filters, options)` — PDF/Word/CSV/TXT/print |
| `src/lib/bibleApi.js` | `mergeAdjacentBrackets(text)` — used only by the toolbar's plain-copy |

> If your target project isn't React/Tailwind, port the **engine**
> (`verseAnalysis.js`) + `describeFilters.js` verbatim (they're pure JS, no JSX)
> and rebuild the UI to match.

---

## Core data shapes

### Filter object (`defaultFilters()`)

```js
{
  testament: 'all' | 'old' | 'new',
  book: 'all' | '<apiName>',
  textContains: '',          // space OR comma separated → AND matching
  textCaseSensitive: false,
  textWholeWord: false,
  textInOrder: false,        // terms in sequence, ≤1 gap
  textAdjacent: false,       // exact phrase (implies inOrder)
  ranges: { [metricKey]: { min: '' | number, max: '' | number } }, // one per NUMERIC_METRICS
  bools:  { [metricKey]: 'any' | 'yes' | 'no' },                   // one per BOOLEAN_METRICS
  sortKey: 'wordCount' | 'none' | 'canonical' | <any metricKey>,
  sortDir: 'asc' | 'desc',
}
```

### Verse record (built by `buildVerseIndex`)

```js
{
  book, abbr, shortName, testament, chapter, verse,
  ref: 'Gen 1:1',
  rawText,   // original incl. [brackets] + ¶
  plainText, // ¶ removed, [brackets] stripped, whitespace normalised
  metrics: { /* all numeric + boolean fields */ }
}
```

---

## Key behaviours to preserve

- **Empty by default**: until any filter/text is set, results are hidden
  (`isDefaultFilters`). A "Show all verses" button sets `forceShow`.
- **Text matching** (`matchesTerms`): split on `/[\s,]+` → every term must
  appear (AND). Modes:
  - any-order (default)
  - in-order (walk left→right, ≤`IN_ORDER_MAX_GAP`=1 word gap)
  - adjacent (single phrase regex)
  Whole-word uses non-consuming look-arounds `(?<![A-Za-z'-])` /
  `(?![A-Za-z'-])` so consecutive words like "Lamb of God" still match.
- **Dynamic testament**: if matches fall in only one testament, auto-narrow;
  if the selected testament has zero matches, rescue to the other.
- **Availability**: `computeOptionAvailability` greys out filter options that
  would yield 0 results (re-counts matches per option). `computeMetricRanges`
  gives realistic min/max placeholders per metric.
- **Grouping**: results grouped Testament → Book, each collapsible; "Show more"
  paginates 50 at a time.
- **Highlighting** (`AdvancedResultRow`): when text-searching, highlight terms;
  otherwise highlight the *active* feature (pilcrow/italics/punctuation/
  capitals) the user is filtering/sorting on — all active patterns merged into
  one regex.
- **Exports** reuse the same query/filters so highlights in PDF/Word match the
  on-screen search.

---

## Bible text format (critical for correctness)

- **Pilcrows** stored as `¶` (U+00B6) in processed text; raw source may use
  `\uFFFD`. A `¶` at the start of a verse marks a new paragraph; mid-word
  `\uFFFD`/`¶` after a letter is an **apostrophe** ("Christ¶s" → "Christ's").
- **Italics** = `[bracketed]` supplied words → render as `<em>`, strip for
  plain-text search/copy.
- When stripping for search, **only strip brackets/¶ when the query itself
  does NOT contain a literal `[`, `]`, or `¶`** — so users can search for
  literal `[son]` or `¶`.

---

## Backend text search (optional — server-side keyword search API)

These are separate from the metrics engine and serve external clients (browser
extension / Discord bot):

| Source path | Role |
|---|---|
| `base44/shared/bibleData.ts` | Shared loader: `loadBible()`, `BOOK_ORDER`, `ABBR_TO_NAME`, `NAME_TO_FULL`, `normalizePilcrows`, `processVerse`, `verseFromRef` |
| `base44/functions/bibleApi/entry.ts` | Multi-action endpoint; `action:'search'` does keyword search with `testament`/`book`/`wildcard`/`wholeWord`/`caseSensitive`/`limit`/`offset`. Uses the pilcrow/bracket-literal branch described above. |
| `base44/functions/searchBible/entry.ts` | Public CORS POST endpoint (`query`, `whole_word`, `case_sensitive`, `wildcard`, `testament`, `book`) → `{count, results}` |

### `searchBible` request/response

```
POST /functions/searchBible
Content-Type: application/json

{
  "query": "love",
  "whole_word": false,
  "case_sensitive": false,
  "wildcard": false,
  "testament": "all",          // "all" | "old" | "new"
  "book": null                 // full name or abbreviation, or null
}
```

Response:

```json
{
  "query": "love",
  "count": 546,
  "results": [
    {
      "book": "Genesis",
      "chapter": 22,
      "verse": 2,
      "text": "And he said, Take now thy son, thine only [son] Isaac, whom thou lovest...",
      "ref": "Genesis 22:2"
    }
  ]
}
```

### `bibleApi` `action: 'search'` request/response

```
POST /functions/bibleApi
Content-Type: application/json

{
  "action": "search",
  "query": "[son]",
  "caseSensitive": false,
  "wholeWord": false,
  "wildcard": false,
  "testament": "all",
  "book": null,
  "limit": 100,
  "offset": 0
}
```

Response:

```json
{
  "query": "[son]",
  "caseSensitive": false,
  "wholeWord": false,
  "testament": "all",
  "book": null,
  "wildcard": false,
  "total": 23,
  "count": 23,
  "offset": 0,
  "results": [
    {
      "abbr": "Ge",
      "book": "Genesis",
      "bookFullName": "The First Book of Moses, called Genesis",
      "chapter": 22,
      "verse": 2,
      "ref": "Genesis 22:2",
      "text": "And he said, Take now thy son, thine only [son] Isaac, whom thou lovest, and get thee into the land of Moriah; and offer him there for a burnt offering upon one of the mountains which I will tell thee of.",
      "description": "\"And he said, Take now thy son, thine only [son] Isaac, whom thou lovest...\"\n— Genesis 22:2"
    }
  ]
}
```

---

## Summary

The **engine** (`verseAnalysis.js`) is the heart of it; everything else is
UI/export wiring around it. Port the engine + `describeFilters.js` verbatim,
then recreate the four UI components to match the behaviours above.