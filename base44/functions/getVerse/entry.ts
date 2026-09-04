import {
  ABBR_TO_NAME,
  loadPceBible,
  processVerse,
} from "../../shared/biblePceData.ts";

// Public, no-auth verse/chapter/range lookup endpoint for the KJB Reader
// browser extension. Loads the KJB (Pure Cambridge Edition) via the shared
// biblePceData module (same source as bibleApi) and returns processed verse
// text (keeps [italics], ¶, and original PCE casing incl. paragraph-opening
// capitalization like "JOHN" in Revelation 1:4).

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

export default async function (req) {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const rawBook = String(body.book || "").trim();
    const chapter = Number(body.chapter);
    const verse = body.verse != null ? Number(body.verse) : null;
    const endVerse = body.endVerse != null ? Number(body.endVerse) : null;

    if (!rawBook || !Number.isFinite(chapter)) {
      return json({ error: "book and chapter required" }, 400);
    }

    // Accept either a full name ("John") or an abbreviation ("Joh").
    const bookName = ABBR_TO_NAME[rawBook] || rawBook;

    const bible = await loadPceBible();
    const rawVerses = bible[bookName]?.[String(chapter)];
    if (!rawVerses || rawVerses.length === 0) {
      return json({ error: `No verses found for ${bookName} ${chapter}` }, 404);
    }

    let selected;
    if (verse == null) {
      // No verse specified → whole chapter.
      selected = rawVerses;
    } else if (endVerse != null && endVerse >= verse) {
      // Range: verse..endVerse inclusive.
      selected = rawVerses.filter((v) => v.verse >= verse && v.verse <= endVerse);
    } else {
      // Single verse.
      selected = rawVerses.filter((v) => v.verse === verse);
    }

    const verses = selected.map((v) => {
      const processed = processVerse(v, { book: bookName, chapter });
      return {
        book: bookName,
        chapter,
        verse: v.verse,
        text: processed.text,
        ref: `${bookName} ${chapter}:${v.verse}`,
      };
    });

    return json({ count: verses.length, verses });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}