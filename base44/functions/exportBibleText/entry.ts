// Generates a plain-text file of the whole King James Bible (Pure Cambridge
// Edition) in the format:  "Book Chapter:Verse Text"  — one verse per line.
// Returns the file as a text/plain download.

const ABBR_TO_NAME = {
  'Ge':'Genesis','Ex':'Exodus','Le':'Leviticus','Nu':'Numbers','De':'Deuteronomy',
  'Jos':'Joshua','Jg':'Judges','Ru':'Ruth','1Sa':'1 Samuel','2Sa':'2 Samuel',
  '1Ki':'1 Kings','2Ki':'2 Kings','1Ch':'1 Chronicles','2Ch':'2 Chronicles',
  'Ezr':'Ezra','Ne':'Nehemiah','Es':'Esther','Job':'Job','Ps':'Psalms','Pr':'Proverbs',
  'Ec':'Ecclesiastes','Song':'Song of Solomon','Isa':'Isaiah','Jer':'Jeremiah',
  'La':'Lamentations','Eze':'Ezekiel','Da':'Daniel','Ho':'Hosea','Joe':'Joel',
  'Am':'Amos','Ob':'Obadiah','Jon':'Jonah','Mic':'Micah','Na':'Nahum',
  'Hab':'Habakkuk','Zep':'Zephaniah','Hag':'Haggai','Zec':'Zechariah','Mal':'Malachi',
  'Mt':'Matthew','Mr':'Mark','Lu':'Luke','Joh':'John','Ac':'Acts','Ro':'Romans',
  '1Co':'1 Corinthians','2Co':'2 Corinthians','Ga':'Galatians','Eph':'Ephesians',
  'Php':'Philippians','Col':'Colossians','1Th':'1 Thessalonians','2Th':'2 Thessalonians',
  '1Ti':'1 Timothy','2Ti':'2 Timothy','Tit':'Titus','Phm':'Philemon','Heb':'Hebrews',
  'Jas':'James','1Pe':'1 Peter','2Pe':'2 Peter','1Jo':'1 John','2Jo':'2 John',
  '3Jo':'3 John','Jude':'Jude','Re':'Revelation'
};

const TEXT_URL = 'https://media.base44.com/files/public/6a05d76723afe58d80c589e8/91ec9491e_WHARTON_PCE.txt';

Deno.serve(async (req) => {
  try {
    const res = await fetch(TEXT_URL);
    if (!res.ok) throw new Error('Failed to fetch Bible text');
    // The source file is Latin-1 encoded: the paragraph mark (¶) is a single
    // byte 0xB6. Decoding as UTF-8 corrupts it into "Â¶"/U+FFFD, so decode as
    // latin1 and let norm() handle the marker.
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes);
    const lines = text.split(/\r?\n/);
    const out = [];

    // Pending subscript/heading lines (e.g. Psalm titles, "ALEPH.") that should
    // be printed immediately before the NEXT verse they belong to.
    let pendingSubscript = null;
    // Track the most recent chapter:verse so a colophon (which always follows
    // the last verse of a book) can be labelled with that verse number.
    let lastChapter = null, lastVerse = null;

    // Use a plain ASCII marker (#) for the paragraph mark so the file renders
    // correctly in EVERY viewer/editor regardless of encoding (the real ¶ shows
    // as "Â¶" in Latin-1 viewers).
    const norm = (s) => s.replace(/[\uFFFD\u00B6]/g, '#').replace(/\s+/g, ' ').trim();

    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx === -1) continue;
      const abbr = trimmed.slice(0, spaceIdx);
      const bookName = ABBR_TO_NAME[abbr];
      // Skip structural metadata lines ("Book Name:", "GENESIS CHAPTER 1", etc.)
      if (!bookName) continue;

      const rest = trimmed.slice(spaceIdx + 1);
      const colonIdx = rest.indexOf(':');

      // ── Non-verse lines belonging to a book (no "chapter:verse") ──
      // These are either a colophon ("¶ [Written to the Romans ...]") or a
      // Psalm subscript / heading ("A Psalm of David...", "ALEPH.").
      const looksLikeVerse = colonIdx !== -1 && /^\d+:\d+\s/.test(rest);
      if (!looksLikeVerse) {
        const clean = norm(rest);
        if (!clean) continue;
        if (/^#?\s*\[.*\]\s*$/.test(clean)) {
          // Colophon - print as its own line at the end of the chapter.
          // Strip the outer wrapping brackets (keep any inner [italic] words).
          const colo = clean
            .replace(/^#\s*/, '# ')
            .replace(/\[([\s\S]*)\]/, '$1');
          // Colophons follow the book's final verse — label them with it.
          const ref = (lastChapter != null && lastVerse != null)
            ? `${bookName} ${lastChapter}:${lastVerse}`
            : `${bookName} -`;
          out.push(`${ref} ${colo}`);
        } else {
          // Subscript / heading — hold it for the next verse.
          pendingSubscript = clean;
        }
        continue;
      }

      const chapter = parseInt(rest.slice(0, colonIdx), 10);
      if (isNaN(chapter)) continue;
      const spaceIdx2 = rest.indexOf(' ', colonIdx);
      if (spaceIdx2 === -1) continue;
      const verse = parseInt(rest.slice(colonIdx + 1, spaceIdx2), 10);
      let vt = rest.slice(spaceIdx2 + 1);
      if (isNaN(verse) || !vt) continue;

      // Normalise the paragraph mark, keep [italic] brackets and pilcrows.
      vt = norm(vt);

      // If a subscript was held, print it just before this verse (no brackets).
      if (pendingSubscript) {
        out.push(`${bookName} ${chapter}:${verse} ${pendingSubscript}`);
        pendingSubscript = null;
      }

      out.push(`${bookName} ${chapter}:${verse} ${vt}`);
      lastChapter = chapter;
      lastVerse = verse;
    }

    // Encode the full text as plain UTF-8 bytes (NO BOM) and return as a binary
    // body so the whole Bible is sent without truncation. Avoid the BOM since
    // some viewers double-decode it and show mojibake (Â¶, â€").
    // Final safety pass: convert any remaining non-ASCII punctuation to ASCII
    // so the file is 100% ASCII and renders cleanly in every viewer.
    const asciiOut = out.map((line) =>
      line
        .replace(/[\u2018\u2019]/g, "'")   // curly single quotes -> '
        .replace(/[\u201C\u201D]/g, '"')   // curly double quotes -> "
        .replace(/[\u2013\u2014]/g, '-')   // en/em dash -> -
    );
    const body = asciiOut.join('\n') + '\n';
    const encoded = new TextEncoder().encode(body);
    return new Response(encoded, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(encoded.length),
        'Content-Disposition': 'attachment; filename="KJB_PureCambridge.txt"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});