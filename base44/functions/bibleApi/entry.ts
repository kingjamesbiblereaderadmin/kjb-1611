import { ABBR_TO_NAME, BOOK_ORDER, NAME_TO_FULL, loadPceBible, buildFlatList, verseFromRef, normalizeDateKey, processVerse } from "../../shared/biblePceData.ts";

// NOTE: chapter-level caching was removed — it served stale responses
// (without superscriptions/colophons) from warm isolates after code updates.

const EXCLUDED_REFS = new Set([]);

// Load admin-managed exclusions + date pins from the DailyVerseControl entity.
// Cached briefly so a schedule request (many dates) doesn't re-query per date.
let _controlCache = null;
let _controlCacheAt = 0;
async function loadControls(b44) {
  if (_controlCache && Date.now() - _controlCacheAt < 15000) return _controlCache;
  const result = { extraExcluded: new Set(), pins: {}, pinIds: {} };
  try {
    const rows = await b44.asServiceRole.entities.DailyVerseControl.list('-created_date', 2000);
    for (const r of rows || []) {
      if (r.kind === 'exclusion' && r.ref) result.extraExcluded.add(r.ref);
      else if (r.kind === 'pin' && r.ref && r.date) { result.pins[r.date] = r.ref; result.pinIds[r.date] = r.id; }
    }
  } catch (err) {
    console.warn('[bibleApi] control load failed:', err?.message);
  }
  _controlCache = result;
  _controlCacheAt = Date.now();
  return result;
}

// buildFlatList, verseFromRef, normalizeDateKey — imported from shared/biblePceData.ts

// Pick a verse for a date seed. Seeds against the full stable list, then if the
// landed verse is excluded (DB exclusion), deterministically steps forward to
// the next non-excluded verse. Because the list length never changes, every
// OTHER day keeps its verse when an exclusion is added — only the day that
// landed on the excluded verse moves on to the next one.
function pickForSeed(flat, seed, extraExcluded) {
  const len = flat.length;
  let idx = ((seed * 2654435761) % len + len) % len;
  const excl = extraExcluded || new Set();
  for (let i = 0; i < len; i++) {
    const item = flat[idx];
    const ref = `${item.bookName} ${item.chapterNum}:${item.verseObj.verse}`;
    if (!excl.has(ref)) return item;
    idx = (idx + 1) % len;
  }
  return flat[((seed * 2654435761) % len + len) % len];
}

// Wrap every response with no-cache + CORS headers so external bots always
// get fresh data (no stale edge-cached responses without superscriptions).
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Access-Control-Allow-Origin': '*',
};
function json(data, statusOrOpts = 200) {
  const status = typeof statusOrOpts === 'number' ? statusOrOpts : (statusOrOpts?.status || 200);
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...NO_CACHE_HEADERS } });
}

Deno.serve(async (req) => {
  try {
    const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.38');
    const b44 = createClientFromRequest(req);

    const body = await req.json();
    const { action, book, chapter, verse, endVerse } = body;

    const bible = await loadPceBible();

    if (action === 'getChapter') {
      if (!book || !chapter) {
        return json({ error: 'book and chapter required' }, { status: 400 });
      }

      const rawVerses = bible[book]?.[chapter];
      if (!rawVerses || rawVerses.length === 0) {
        return json({ error: `No verses found for ${book} ${chapter}` }, { status: 404 });
      }

      const verses = rawVerses.map(v => processVerse(v, { book, chapter: parseInt(chapter) }));
      const colophon = bible.__colophons?.[`${book}:${chapter}`];
      const result = { verses, colophon };
      return json(result);
    }

    if (action === 'getVerseCount') {
      if (!book || !chapter) {
        return json({ error: 'book and chapter required' }, { status: 400 });
      }
      const count = bible[book]?.[chapter]?.length ?? 0;
      return json({ count });
    }

    if (action === 'getAllColophons') {
      return json({ colophons: bible.__colophons || {} });
    }

    if (action === 'random_verse') {
      const controls = await loadControls(b44);
      // Use biblical book order for consistency
      let currentSeed = Math.floor(Math.random() * 10000000);
      let bookName, chapterNum, verseObj;

      while (true) {
        bookName = BOOK_ORDER[currentSeed % BOOK_ORDER.length];
        if (!bible[bookName]) {
          currentSeed++;
          continue;
        }
        const chapters = Object.keys(bible[bookName]);
        if (!chapters.length) {
          currentSeed++;
          continue;
        }
        chapterNum = chapters[currentSeed % chapters.length];
        const verses = bible[bookName][chapterNum];
        if (!verses || !verses.length) {
          currentSeed++;
          continue;
        }
        verseObj = verses[currentSeed % verses.length];

        const ref = `${bookName} ${chapterNum}:${verseObj.verse}`;
        const isExcludedChapter = bookName === 'Romans' && parseInt(chapterNum) === 10;
        const hasExcludedText = EXCLUDED_REFS.has(ref) || controls.extraExcluded.has(ref);

        if (!hasExcludedText && !isExcludedChapter) break;
        currentSeed++;
      }

      const processed = processVerse(verseObj, { book: bookName, chapter: parseInt(chapterNum) });

      const abbrMatches = Object.entries(ABBR_TO_NAME).find(([k, v]) => v === bookName);
      const abbr = abbrMatches ? abbrMatches[0] : bookName.slice(0, 3).toUpperCase();
      const rawColophon = bible.__colophons?.[`${bookName}:${chapterNum}`];

      const verseResult: any = {
        abbr,
        book: bookName,
        bookFullName: NAME_TO_FULL[bookName] || bookName,
        chapter: parseInt(chapterNum),
        verse: verseObj.verse,
        text: processed.text,
        ref: `${bookName} ${chapterNum}:${verseObj.verse}`
      };
      if (processed.heading) verseResult.heading = processed.heading;
      if (processed.superscription) verseResult.superscription = processed.superscription;
      if (rawColophon) verseResult.colophon = rawColophon;

      return json({ verse: verseResult });
    }

    if (action === 'daily_verse') {
      // Always use the client's local date for synchronization
      let seed;
      if (body.clientDate) {
        const [y, m, d] = body.clientDate.split('-').map(Number);
        seed = y * 10000 + m * 100 + d;
      } else {
        // Fallback: use UTC date (shouldn't happen if client sends clientDate)
        const today = new Date();
        seed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
      }

      // Use biblical book order (matches legacy reader for consistent daily verse)
      if (!BOOK_ORDER.length) {
        return json({ error: 'No bible data' }, { status: 500 });
      }

      const controls = await loadControls(b44);

      // If an admin pinned a verse for this exact date, always return that.
      const dateKey = normalizeDateKey(body.clientDate || null);
      if (dateKey && controls.pins[dateKey]) {
        const pinned = verseFromRef(bible, controls.pins[dateKey]);
        if (pinned) {
          return json({ verse: pinned, _debug: { pinned: true, seed } });
        }
      }

      // Build a flat list of every eligible (book, chapter, verse) reference,
      // then pick one deterministically by the date seed. Indexing into a
      // single flat list guarantees consecutive days land on different verses.
      const flat = buildFlatList(bible);
      if (!flat.length) {
        return json({ error: 'No eligible verses' }, { status: 500 });
      }

      // Scatter consecutive days across the whole Bible: multiplying the date
      // seed by a large prime (coprime to the list length) makes each day jump
      // far from the previous one instead of landing on the next verse.
      const picked = pickForSeed(flat, seed, controls.extraExcluded);
      const verseData = verseFromRef(bible, `${picked.bookName} ${picked.chapterNum}:${picked.verseObj.verse}`);

      return json({
        verse: verseData,
        _debug: { seed, totalVerses: flat.length, modResult: seed % flat.length }
      });
    }

    // Returns the deterministic daily verse for a range of dates — the SAME
    // code path daily_verse uses, so the dev-tools preview is guaranteed to
    // match what the app actually shows (honours DB exclusions + pins).
    if (action === 'daily_schedule') {
      const dates = Array.isArray(body.dates) ? body.dates : [];
      if (!dates.length) return json({ error: 'dates[] required' }, { status: 400 });

      const controls = await loadControls(b44);
      const flat = buildFlatList(bible);
      if (!flat.length) return json({ error: 'No eligible verses' }, { status: 500 });

      const out = dates.map((rawKey) => {
        const dateKey = normalizeDateKey(rawKey);
        const [y, m, d] = String(dateKey).split('-').map(Number);
        const seed = y * 10000 + m * 100 + d;
        const pinnedRef = controls.pins[dateKey];
        let verseData;
        let pinned = false;
        if (pinnedRef) {
          verseData = verseFromRef(bible, pinnedRef);
          pinned = !!verseData;
        }
        if (!verseData) {
          const picked = pickForSeed(flat, seed, controls.extraExcluded);
          verseData = verseFromRef(bible, `${picked.bookName} ${picked.chapterNum}:${picked.verseObj.verse}`);
        }
        return { date: dateKey, verse: verseData, pinned, pinId: pinned ? controls.pinIds[dateKey] : null };
      });

      return json({ schedule: out, totalVerses: flat.length });
    }

    // Resolve a list of "book chapter:verse" refs into full verse payloads.
    // Used by the exclusion list so it can show the full verse text.
    if (action === 'resolve_refs') {
      const refs = Array.isArray(body.refs) ? body.refs : [];
      const verses = refs.map(ref => {
        const v = verseFromRef(bible, ref);
        return v || { ref, text: null, error: 'Verse not found' };
      });
      return json({ verses });
    }

    // Find eligible verses filtered by character count and/or word count of the
    // verse text ONLY (brackets/pilcrows stripped, superscription markers removed).
    if (action === 'find_by_length') {
      const controls = await loadControls(b44);
      const flat = buildFlatList(bible);

      const minChars = Number.isFinite(body.minChars) ? body.minChars : 0;
      const maxChars = Number.isFinite(body.maxChars) ? body.maxChars : Infinity;
      const minWords = Number.isFinite(body.minWords) ? body.minWords : 0;
      const maxWords = Number.isFinite(body.maxWords) ? body.maxWords : Infinity;
      const sortBy = body.sortBy === 'words' ? 'words' : 'chars';
      const order = body.order === 'desc' ? 'desc' : 'asc';
      const limit = Number.isFinite(body.limit) ? Math.min(body.limit, 500) : 100;

      const cleanOf = (t) => t
        .replace(/[[\]]/g, '')          // strip italics brackets
        .replace(/¶/g, '')              // strip pilcrows
        .trim();

      const matches = [];
      for (const item of flat) {
        const ref = `${item.bookName} ${item.chapterNum}:${item.verseObj.verse}`;
        if (controls.extraExcluded.has(ref)) continue;
        const text = cleanOf(item.verseObj.text);
        const chars = text.length;
        const words = text.split(/\s+/).filter(Boolean).length;
        if (chars < minChars || chars > maxChars) continue;
        if (words < minWords || words > maxWords) continue;
        matches.push({
          ref,
          book: item.bookName,
          chapter: item.chapterNum,
          verse: item.verseObj.verse,
          chars,
          words,
        });
      }

      matches.sort((a, b) => {
        const av = sortBy === 'words' ? a.words : a.chars;
        const bv = sortBy === 'words' ? b.words : b.chars;
        return order === 'desc' ? bv - av : av - bv;
      });

      return json({ total: matches.length, results: matches.slice(0, limit) });
    }

    // Full-text keyword search across every verse in the Bible.
    // Searching is done on the "visible" text (brackets/pilcrows stripped) so
    // results match what a reader sees, but the returned `text` keeps
    // [brackets] and ¶ for full context. Each result includes a `description`
    // field (verse text + ref combined) for Discord embeds.
    if (action === 'search') {
      const query = String(body.query || '').trim();
      if (!query) {
        return json({ error: 'query required' }, { status: 400 });
      }

      const caseSensitive = body.caseSensitive === true;
      const wholeWord = body.wholeWord === true;
      const wildcard = body.wildcard === true;
      const testament = String(body.testament || 'all').toLowerCase();
      const bookFilter = body.book ? String(body.book).trim() : null;
      const limit = Number.isFinite(body.limit) ? Math.min(body.limit, 500) : 100;
      const offset = Number.isFinite(body.offset) ? Math.max(0, body.offset) : 0;

      // Old Testament = first 39 books (Genesis–Malachi),
      // New Testament = last 27 (Matthew–Revelation).
      const OLD_TESTAMENT = new Set(BOOK_ORDER.slice(0, 39));
      const NEW_TESTAMENT = new Set(BOOK_ORDER.slice(39));

      // Resolve the set of books to search. A `book` filter overrides
      // `testament` (searching one book is the tightest scope). Accept either a
      // full name ("John") or an abbreviation ("Joh").
      let booksToSearch;
      if (bookFilter) {
        const fullName = ABBR_TO_NAME[bookFilter] || bookFilter;
        if (!bible[fullName]) {
          return json({ error: `Unknown book: ${bookFilter}` }, { status: 400 });
        }
        booksToSearch = [fullName];
      } else if (testament === 'old') {
        booksToSearch = BOOK_ORDER.filter((b) => OLD_TESTAMENT.has(b));
      } else if (testament === 'new') {
        booksToSearch = BOOK_ORDER.filter((b) => NEW_TESTAMENT.has(b));
      } else {
        booksToSearch = BOOK_ORDER;
      }

      // Build a single RegExp matcher for all modes. wildcard=true supports
      // ? (one char) and * (any run of chars); every other char is escaped.
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let pattern;
      if (wildcard) {
        pattern = '';
        for (const ch of query) {
          if (ch === '*') pattern += '.*';
          else if (ch === '?') pattern += '.';
          else pattern += escapeRegex(ch);
        }
      } else {
        pattern = escapeRegex(query);
      }
      if (wholeWord) pattern = `\\b${pattern}\\b`;
      const matcher = new RegExp(pattern, caseSensitive ? '' : 'i');

      const matches = [];
      for (const bookName of booksToSearch) {
        if (!bible[bookName]) continue;
        for (const chapterNum of Object.keys(bible[bookName])) {
          const verses = bible[bookName][chapterNum];
          if (!verses || !verses.length) continue;
          for (const vo of verses) {
            // Searchable text. Brackets and the pilcrow (¶) are normally stripped so
            // ordinary word/phrase queries match what a reader sees and span
            // italic-supplied words ("only [son]" → "only son"). But when the query
            // itself contains a literal bracket or pilcrow, search the RAW text so
            // "[son]" and "¶" match as literal characters.
            const rawText = String(vo.text);
            const queryHasBracketsOrPilcrow = /[\[\]¶]/.test(query);
            const visibleText = queryHasBracketsOrPilcrow
              ? rawText
              : rawText.replace(/\[/g, '').replace(/\]/g, '').replace(/¶/g, '');

            if (!matcher.test(visibleText)) continue;

            const processed = processVerse(vo, { book: bookName, chapter: parseInt(chapterNum) });
            const abbrEntry = Object.entries(ABBR_TO_NAME).find(([k, v]) => v === bookName);
            const abbr = abbrEntry ? abbrEntry[0] : bookName.slice(0, 3).toUpperCase();
            const cleanText = processed.text.replace(/^¶\s*/, '');
            const result: any = {
              abbr,
              book: bookName,
              bookFullName: NAME_TO_FULL[bookName] || bookName,
              chapter: parseInt(chapterNum),
              verse: vo.verse,
              ref: `${bookName} ${chapterNum}:${vo.verse}`,
              text: processed.text,
              description: `"${cleanText}"\n— ${bookName} ${chapterNum}:${vo.verse}`,
            };
            if (processed.superscription) result.superscription = processed.superscription;
            if (processed.heading) result.heading = processed.heading;
            matches.push(result);
          }
        }
      }

      const total = matches.length;
      const results = matches.slice(offset, offset + limit);
      return json({
        query,
        caseSensitive,
        wholeWord,
        testament,
        book: bookFilter,
        wildcard,
        total,
        count: results.length,
        offset,
        results,
      });
    }

    // Look up a verse (or verse range / chapter) by book + chapter + verse.
    // Returns the search-result-like shape the Chrome extension expects.
    // `book` accepts a full name ("John") or an abbreviation ("Joh").
    if (action === 'getVerse') {
      if (!book || !chapter) {
        return json({ error: 'book and chapter required' }, { status: 400 });
      }
      const fullName = ABBR_TO_NAME[book] || book;
      const chapterNum = parseInt(chapter);
      const verses = bible[fullName]?.[chapterNum];
      if (!verses || verses.length === 0) {
        return json({ error: `No verses found for ${fullName} ${chapterNum}` }, { status: 404 });
      }
      // Resolve the abbreviation + full title-page book name so external
      // consumers (e.g. the Chrome extension) get the same metadata the
      // search / random / daily-verse actions return.
      const abbrEntry = Object.entries(ABBR_TO_NAME).find(([k, v]) => v === fullName);
      const abbr = abbrEntry ? abbrEntry[0] : fullName.slice(0, 3).toUpperCase();
      const bookFullName = NAME_TO_FULL[fullName] || fullName;

      // Whole chapter when no verse is requested.
      if (verse == null && endVerse == null) {
        const out = verses.map(vo => {
          const p = processVerse(vo, { book: fullName, chapter: chapterNum });
          const item: any = { text: p.text, chapter: chapterNum, verse: vo.verse };
          if (p.heading) item.heading = p.heading;
          if (p.superscription) item.superscription = p.superscription;
          return item;
        });
        const resp: any = {
          text: out.map(v => v.text).join(' '),
          book: fullName,
          bookFullName,
          abbr,
          chapter: chapterNum,
          verse: null,
          ref: `${fullName} ${chapterNum}`,
          verses: out,
        };
        const rawColophon = bible.__colophons?.[`${fullName}:${chapterNum}`];
        if (rawColophon) resp.colophon = rawColophon;
        return json(resp);
      }

      const start = verse != null ? parseInt(String(verse)) : null;
      const end = endVerse != null ? parseInt(String(endVerse)) : start;

      // Range request (verse + endVerse): return every verse in [start, end].
      if (start != null && end != null && end > start) {
        const out = [];
        for (let v = start; v <= end; v++) {
          const vo = verses.find(x => x.verse === v);
          if (!vo) continue;
          const p = processVerse(vo, { book: fullName, chapter: chapterNum });
          const item: any = { text: p.text, chapter: chapterNum, verse: v };
          if (p.heading) item.heading = p.heading;
          if (p.superscription) item.superscription = p.superscription;
          out.push(item);
        }
        if (!out.length) {
          return json({ error: `No verses found for ${fullName} ${chapterNum}:${start}-${end}` }, { status: 404 });
        }
        const rangeResp: any = {
          text: out.map(v => v.text).join(' '),
          book: fullName,
          bookFullName,
          abbr,
          chapter: chapterNum,
          verse: start,
          ref: `${fullName} ${chapterNum}:${start}-${end}`,
          verses: out,
        };
        const rawColophon = bible.__colophons?.[`${fullName}:${chapterNum}`];
        if (rawColophon) rangeResp.colophon = rawColophon;
        return json(rangeResp);
      }

      // Single verse.
      if (start != null) {
        const vo = verses.find(x => x.verse === start);
        if (!vo) {
          return json({ error: `Verse ${fullName} ${chapterNum}:${start} not found` }, { status: 404 });
        }
        const p = processVerse(vo, { book: fullName, chapter: chapterNum });
        const singleResp: any = {
          text: p.text,
          book: fullName,
          bookFullName,
          abbr,
          chapter: chapterNum,
          verse: start,
          ref: `${fullName} ${chapterNum}:${start}`,
        };
        if (p.heading) singleResp.heading = p.heading;
        if (p.superscription) singleResp.superscription = p.superscription;
        const rawColophon = bible.__colophons?.[`${fullName}:${chapterNum}`];
        if (rawColophon) singleResp.colophon = rawColophon;
        return json(singleResp);
      }

      return json({ error: 'Invalid verse request' }, { status: 400 });
    }

    // Daily verse (date-seeded). No params required — defaults to today (UTC).
    // Optional `date` / `clientDate` (YYYY-MM-DD) pins the seed to a local date.
    // Returns the same { ref, text, book, chapter, verse, description } shape as
    // search results so the Chrome extension's daily-verse feature can render it
    // identically to a search hit.
    if (action === 'getDailyVerse') {
      if (!BOOK_ORDER.length) {
        return json({ error: 'No bible data' }, { status: 500 });
      }
      const controls = await loadControls(b44);

      let seed;
      const dateInput = body.date || body.clientDate;
      if (dateInput) {
        const [y, m, d] = String(dateInput).split('-').map(Number);
        seed = y * 10000 + m * 100 + d;
      } else {
        const today = new Date();
        seed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
      }

      // Honour an admin pin for this exact date, if one is set.
      const dateKey = normalizeDateKey(dateInput || null);
      if (dateKey && controls.pins[dateKey]) {
        const pinned = verseFromRef(bible, controls.pins[dateKey]);
        if (pinned) {
          const cleanText = pinned.text.replace(/^¶\s*/, '');
          return json({
            ref: pinned.ref,
            text: pinned.text,
            book: pinned.book,
            chapter: pinned.chapter,
            verse: pinned.verse,
            description: `"${cleanText}"\n— ${pinned.book} ${pinned.chapter}:${pinned.verse}`,
          });
        }
      }

      const flat = buildFlatList(bible);
      if (!flat.length) return json({ error: 'No eligible verses' }, { status: 500 });

      const picked = pickForSeed(flat, seed, controls.extraExcluded);
      const v = verseFromRef(bible, `${picked.bookName} ${picked.chapterNum}:${picked.verseObj.verse}`);
      if (!v) return json({ error: 'Verse not found' }, { status: 500 });
      const cleanText = v.text.replace(/^¶\s*/, '');
      return json({
        ref: v.ref,
        text: v.text,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
        description: `"${cleanText}"\n— ${v.book} ${v.chapter}:${v.verse}`,
      });
    }

    return json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
});