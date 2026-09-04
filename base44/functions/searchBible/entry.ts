import {
  BOOK_ORDER,
  ABBR_TO_NAME,
  loadBible,
  processVerse,
  normalizePilcrows,
} from "../../shared/bibleData.ts";

// Public, no-auth Bible search endpoint for the KJB Reader browser extension.
// Searches the "visible" text (brackets/pilcrows/superscriptions stripped) so
// matches reflect what a reader sees, but the returned `text` keeps [brackets]
// and ¶ for full context.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...NO_CACHE_HEADERS },
  });
}

// Old Testament = first 39 books (Genesis–Malachi), New Testament = last 27 (Matthew–Revelation).
const OLD_TESTAMENT = new Set(BOOK_ORDER.slice(0, 39));
const NEW_TESTAMENT = new Set(BOOK_ORDER.slice(39));

// Strip KJB markup to get the searchable visible text. Uses the shared
// normalizePilcrows so a \uFFFD is only treated as an apostrophe when it
// follows a letter (e.g. "God\uFFFDs" -> "God's") — any other \uFFFD is a
// paragraph pilcrow and gets removed, not turned into a stray apostrophe.
function visibleText(raw) {
  const noSup = String(raw).replace(/^<<[^>]*>>\s*/, ""); // superscription markers
  return normalizePilcrows(noSup)
    .replace(/\[/g, "")   // italic-supplied word brackets
    .replace(/\]/g, "")
    .replace(/¶/g, "");   // pilcrows
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build a RegExp matcher from the query + options.
// wildcard=true supports ? (one char) and * (any run of chars).
function buildMatcher(query, { wholeWord, caseSensitive, wildcard }) {
  let pattern;
  if (wildcard) {
    pattern = "";
    for (const ch of query) {
      if (ch === "*") pattern += ".*";
      else if (ch === "?") pattern += ".";
      else pattern += escapeRegex(ch);
    }
  } else {
    pattern = escapeRegex(query);
  }
  if (wholeWord) pattern = `\\b${pattern}\\b`;
  return new RegExp(pattern, caseSensitive ? "" : "i");
}

export default async function (req) {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const body = await req.json();
    // Normalize a curly apostrophe (mobile "smart punctuation") to a plain
    // one, so the query matches verse text regardless of which apostrophe
    // form the caller's keyboard produced.
    const query = String(body.query || "").trim().replace(/[\u2018\u2019]/g, "'");
    if (!query) return json({ error: "query required" }, 400);

    const wholeWord = body.whole_word === true;
    const caseSensitive = body.case_sensitive === true;
    const wildcard = body.wildcard === true;
    const testament = String(body.testament || "all").toLowerCase();
    const bookFilter = body.book ? String(body.book).trim() : null;

    const bible = await loadBible();

    // Resolve the set of books to search.
    let booksToSearch;
    if (bookFilter) {
      // Accept either a full name ("John") or an abbreviation ("Joh").
      const fullName = ABBR_TO_NAME[bookFilter] || bookFilter;
      if (!bible[fullName]) return json({ error: `Unknown book: ${bookFilter}` }, 400);
      booksToSearch = [fullName];
    } else if (testament === "old") {
      booksToSearch = BOOK_ORDER.filter((b) => OLD_TESTAMENT.has(b));
    } else if (testament === "new") {
      booksToSearch = BOOK_ORDER.filter((b) => NEW_TESTAMENT.has(b));
    } else {
      booksToSearch = BOOK_ORDER;
    }

    const matcher = buildMatcher(query, { wholeWord, caseSensitive, wildcard });

    const results = [];
    for (const bookName of booksToSearch) {
      if (!bible[bookName]) continue;
      for (const chapterNum of Object.keys(bible[bookName])) {
        const verses = bible[bookName][chapterNum];
        if (!verses || !verses.length) continue;
        for (const vo of verses) {
          if (!matcher.test(visibleText(vo.text))) continue;
          const processed = processVerse(vo, { book: bookName, chapter: parseInt(chapterNum) });
          results.push({
            book: bookName,
            chapter: parseInt(chapterNum),
            verse: vo.verse,
            text: processed.text,
            ref: `${bookName} ${chapterNum}:${vo.verse}`,
          });
        }
      }
    }

    return json({ query, count: results.length, results });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}