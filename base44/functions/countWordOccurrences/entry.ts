import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PCE_TEXT_FILE_URL = 'https://media.base44.com/files/public/6a05d76723afe58d80c589e8/b55b13158_KingJamesBible-PureCambridgeEditionTextfile1.txt';

// Replicates the client-side PCE parser (verses only — colophons are hardcoded
// client-side, so we count them separately in the app, not here).
function parsePceVerses(text) {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  const verses = []; // { book, chapter, verse, text }
  let currentChapter = null;
  let pendingFirstVerse = false;
  let titleBufferLen = 0;

  const isChapterLine = (l) => /^CHAPTER\s+\d+$/i.test(l.trim());
  const isVerseLine = (l) => /^\d+\s/.test(l);

  let chapterNum = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (isChapterLine(line)) {
      chapterNum = parseInt(trimmed.replace(/CHAPTER\s+/i, ''), 10);
      currentChapter = chapterNum;
      pendingFirstVerse = true;
      titleBufferLen = 0;
      continue;
    }
    if (!trimmed) continue;

    if (isVerseLine(line) && currentChapter != null) {
      const m = line.match(/^(\d+)(\s+)(.*)$/);
      if (m) {
        let t = m[3].replace(/\s*<<[^>]*>>\s*$/, '').trim();
        verses.push({ chapter: currentChapter, verse: parseInt(m[1], 10), text: t });
        pendingFirstVerse = false;
        continue;
      }
    }
    if (pendingFirstVerse && currentChapter != null) {
      let t = trimmed.replace(/\s*<<[^>]*>>\s*$/, '').trim();
      verses.push({ chapter: currentChapter, verse: 1, text: t });
      pendingFirstVerse = false;
      continue;
    }
    titleBufferLen++;
  }
  return verses;
}

// Mirror the app's default search: strip [brackets], lowercase, substring match.
function countWord(verses, word) {
  const needle = word.toLowerCase();
  let substringVerses = 0;   // verses containing the word as a substring (default search)
  let wholeWordVerses = 0;   // verses containing the word as a whole word
  let substringTotal = 0;    // total substring occurrences (multiple per verse)
  let wholeWordTotal = 0;    // total whole-word occurrences (multiple per verse)
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRe = new RegExp(`(^|[^a-z'])${escaped}($|[^a-z'])`, 'i');
  const subReGlobal = new RegExp(escaped, 'gi');
  const wordReGlobal = new RegExp(`(?<![a-z'])${escaped}(?![a-z'])`, 'gi');

  for (const v of verses) {
    const searchText = v.text.replace(/¶\s*/g, '').replace(/^<<[^>]*>>\s*/, '').replace(/[[\]]/g, '');
    const lower = searchText.toLowerCase();
    if (lower.includes(needle)) substringVerses++;
    if (wordRe.test(searchText)) wholeWordVerses++;
    substringTotal += (lower.match(subReGlobal) || []).length;
    wholeWordTotal += (lower.match(wordReGlobal) || []).length;
  }
  return { substringVerses, wholeWordVerses, substringTotal, wholeWordTotal };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(PCE_TEXT_FILE_URL, { cache: 'no-store' });
    if (!res.ok) return Response.json({ error: 'HTTP ' + res.status }, { status: 500 });
    const buf = await res.arrayBuffer();
    const text = new TextDecoder('windows-1252').decode(buf);

    const verses = parsePceVerses(text);

    const blood = countWord(verses, 'blood');
    const sin = countWord(verses, 'sin');

    return Response.json({
      totalVersesParsed: verses.length,
      blood: {
        verses_substring: blood.substringVerses,
        verses_wholeWord: blood.wholeWordVerses,
        totalOccurrences_substring: blood.substringTotal,
        totalOccurrences_wholeWord: blood.wholeWordTotal,
      },
      sin: {
        verses_substring: sin.substringVerses,
        verses_wholeWord: sin.wholeWordVerses,
        totalOccurrences_substring: sin.substringTotal,
        totalOccurrences_wholeWord: sin.wholeWordTotal,
      },
      note: 'verses_* = verse counts (a verse with the word twice counts once). totalOccurrences_* = total hits including multiple per verse. Colophons NOT included.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});