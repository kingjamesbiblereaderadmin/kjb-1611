import { jsPDF } from 'jspdf';
import { mergeAdjacentBrackets } from '@/lib/bibleApi';
import { triggerDownload } from '@/lib/nativeDownload';
import { nativePrintHtml } from '@/lib/nativePrint';

// Trigger a file save for a Blob -- see nativeDownload.js for why this isn't
// just the plain browser Blob-URL trick.
function downloadBlob(blob, filename) {
  return triggerDownload(blob, filename);
}

// Escape text for safe HTML embedding (DOCX/XLS are HTML-based)
function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Convert [bracketed] words into <em>…</em> (italics), escaping the rest.
function bracketsToItalicHtml(text, keepPilcrow = false, isColophonOrSubscript = false) {
  let clean = text || '';
  if (!keepPilcrow) {
    clean = clean.replace(/¶\s*/g, '');
  }
  clean = mergeAdjacentBrackets(clean.replace(/^<<[^>]*>>\s*/, ''));
  // Split on [bracketed] segments, italicise those, escape everything.
  let html = clean.replace(/\[([^\]]+)\]|([^[]+)/g, (m, inside, plain) => {
    if (inside !== undefined) return `<em>${escapeHtml(inside)}</em>`;
    return escapeHtml(plain);
  });
  if (isColophonOrSubscript) {
    if (!html.includes('¶') && !html.includes('&para;')) {
      html = '<span style="opacity:0.5;">&para;</span> ' + html;
    } else if (html.includes('¶')) {
      html = html.replace(/¶\s*/g, '<span style="opacity:0.5;">&para;</span> ');
    }
  }
  return html;
}

// Plain text WITHOUT brackets (for TXT readability)
function plainNoBrackets(text, isColophonOrSubscript = false, keepPilcrow = false) {
  let clean = text || '';
  if (!keepPilcrow) {
    clean = clean.replace(/¶\s*/g, '');
  }
  let res = clean
    .replace(/^<<[^>]*>>\s*/, '')
    .replace(/\[([^\]]*)\]/g, '$1') // remove matched [italic] brackets, keep inner word
    .replace(/[[\]]/g, '');          // strip any stray/unmatched brackets
  if (isColophonOrSubscript && !res.includes('¶')) res = '¶ ' + res;
  return res;
}

// Plain text WITH brackets kept (for XLS / italics-aware contexts)
function plainWithBrackets(text, isColophonOrSubscript = false, keepPilcrow = false) {
  let clean = text || '';
  if (!keepPilcrow) {
    clean = clean.replace(/¶\s*/g, '');
  }
  let res = mergeAdjacentBrackets(clean.replace(/^<<[^>]*>>\s*/, ''));
  if (isColophonOrSubscript && !res.includes('¶')) res = '¶ ' + res;
  return res;
}

const sanitizeFilename = (q) => (q || 'verses').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30) || 'verses';

// ── Applied-filters summary (from options.filterSummary: [{label, value}]) ──
// Rendered near the top of every export so the reader knows exactly which
// filters produced these results.
function summaryHtml(filterSummary) {
  if (!filterSummary || !filterSummary.length) return '';
  const rows = filterSummary.map(f =>
    `<tr><td style="padding:2pt 12pt 2pt 0;color:#555;white-space:nowrap;vertical-align:top;">${escapeHtml(f.label)}</td>` +
    `<td style="padding:2pt 0;color:#000;">${escapeHtml(f.value)}</td></tr>`
  ).join('');
  return `<div style="margin:0 0 18pt 0;padding:10pt 14pt;background:#f5f5f7;border:1px solid #e2e2e6;border-radius:6pt;page-break-inside:avoid;">` +
    `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:9pt;letter-spacing:0.08em;text-transform:uppercase;color:#666;margin-bottom:6pt;">Applied filters</div>` +
    `<table style="font-family:Georgia,serif;font-size:10.5pt;border-collapse:collapse;">${rows}</table></div>`;
}

function summaryText(filterSummary) {
  if (!filterSummary || !filterSummary.length) return '';
  const lines = filterSummary.map(f => `  • ${f.label}: ${f.value}`).join('\n');
  return `APPLIED FILTERS\n${'-'.repeat(15)}\n${lines}\n\n`;
}

// Build the URL for the print footer. On the real public domain this is simply
// the current reader URL as-is (e.g. /read?book=2PE&chapter=1&verse=19&from=daily).
// We only normalise the preview/sandbox host so previews print a tidy link;
// the path and query are always preserved exactly.
export function cleanPrintUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const u = new URL(window.location.href);
    // app.base44.com/apps/<id>/editor/preview → public app domain (host only).
    const appIdMatch = u.pathname.match(/\/apps\/([a-f0-9]+)\//i);
    if (u.hostname.includes('app.base44.com') && appIdMatch) {
      u.protocol = 'https:';
      u.hostname = `${appIdMatch[1]}.base44.app`;
    }
    // preview-sandbox--<id>.base44.app → <id>.base44.app
    u.hostname = u.hostname.replace(/^preview-sandbox--/, '');
    // Native Android's internal offline-fallback origin -- never externally
    // meaningful (see MainActivity.java) -- swap it for the real public site.
    if (u.hostname === 'appassets.androidplatform.net') {
      u.protocol = 'https:';
      u.hostname = 'kingjamesbiblereader.com';
    }
    // Drop only refresh/updated internal flags; keep book/chapter/verse/from/q.
    u.searchParams.delete('refresh');
    u.searchParams.delete('updated');
    return u.href;
  } catch {
    return window.location.href;
  }
}

// Build a short filename suffix describing the active search filters, e.g.
// "-wholeword-matchcase-NT" or "-3books". Returns '' when no filters are set.
function filterSuffix(filters) {
  if (!filters) return '';
  const parts = [];
  if (filters.wholeWord) parts.push('wholeword');
  if (filters.caseSensitive) parts.push('matchcase');
  if (filters.testament === 'old') parts.push('OT');
  else if (filters.testament === 'new') parts.push('NT');
  if (filters.bookCount > 0) parts.push(`${filters.bookCount}books`);
  return parts.length ? `-${parts.join('-')}` : '';
}

// Count occurrences of the search term(s) in a verse's text — reuses the same
// quote/whole-word/case-sensitive rules as the on-screen highlighter, so
// export occurrence counts match what's shown in the search results.
function countTermOccurrences(text, query, filters) {
  const { terms, isQuoted } = parseQueryTerms(query);
  if (!terms.length) return 1;
  const cs = isQuoted || (filters && filters.caseSensitive);
  const ww = isQuoted || (filters && filters.wholeWord);
  const clean = (text || '').replace(/[[\]]/g, '');
  let total = 0;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = ww
      ? new RegExp(`(^|[^a-zA-Z'])(${escaped})(?=[^a-zA-Z']|$)`, cs ? 'g' : 'gi')
      : new RegExp(`(${escaped})`, cs ? 'g' : 'gi');
    total += (clean.match(re) || []).length;
  }
  return total;
}

// Split items into sections by Testament and then by Book. When occOptions
// ({query, filters}) is given, each section also gets an occCount — the
// summed term-occurrence count across its items (matching the on-screen
// "N verses, M occurrences" labels).
function splitBySections(items, occOptions) {
  const old = items.filter(it => it.testament !== 'new');
  const neu = items.filter(it => it.testament === 'new');
  const sections = [];
  const sumOcc = (arr) => occOptions
    ? arr.reduce((sum, it) => sum + countTermOccurrences(it.text, occOptions.query, occOptions.filters), 0)
    : arr.length;

  if (old.length) {
    sections.push({ title: 'Old Testament', isTestament: true, items: old, occCount: sumOcc(old) });
    const books = Array.from(new Set(old.map(it => it.bookName || it.book || '')));
    books.forEach(b => {
      const bookItems = old.filter(it => (it.bookName || it.book || '') === b);
      if (bookItems.length) sections.push({ title: b, isBook: true, items: bookItems, occCount: sumOcc(bookItems) });
    });
  }
  
  if (neu.length) {
    sections.push({ title: 'New Testament', isTestament: true, items: neu, occCount: sumOcc(neu) });
    const books = Array.from(new Set(neu.map(it => it.bookName || it.book || '')));
    books.forEach(b => {
      const bookItems = neu.filter(it => (it.bookName || it.book || '') === b);
      if (bookItems.length) sections.push({ title: b, isBook: true, items: bookItems, occCount: sumOcc(bookItems) });
    });
  }
  return sections;
}

// ── TXT ──
export async function exportTxt(items, query, filters, options = {}) {
  const titlePrefix = options.titlePrefix || 'KJB Search Results';
  const isReading = titlePrefix === 'KJB Reading';
  const showOcc = !isReading && !!query;
  const titleLine = isReading
    ? `${options.bookName || query}\n${options.chapterText ? options.chapterText.toUpperCase() + '\n' : ''}`
    : `${titlePrefix}${options.showQuery ? ` — "${query}"` : ''}\n`;
  const header = `${titleLine}${'='.repeat(50)}\n\n${!isReading ? summaryText(options.filterSummary) : ''}`;
  const sections = splitBySections(items, showOcc ? { query, filters } : null);
  const body = sections.map(sec => {
    if (sec.isTestament) {
      const occSuffix = showOcc ? `, ${sec.occCount} occurrence${sec.occCount !== 1 ? 's' : ''}` : '';
      const label = `${sec.title.toUpperCase()} [${sec.items.length} verse${sec.items.length !== 1 ? 's' : ''}${occSuffix}]`;
      return `${label}\n${'='.repeat(sec.title.length)}`;
    }
    const bookNameObj = sec.items[0]?.bookNameObj;
    const fullBookName = bookNameObj ? bookNameObj.name : sec.title;
    const bookOccSuffix = showOcc && sec.occCount > sec.items.length ? ` [${sec.occCount} occurrences]` : '';
    const headingText = `${fullBookName}:${bookOccSuffix}`;
    const heading = `${headingText}\n${'-'.repeat(headingText.length)}\n\n`;
    const verses = sec.items.map((it, idx) => {
      const isSpecial = it.isColophon || it.isSubscript;
      const hasPilcrow = (it.text || '').includes('¶');
      const heading = it.heading ? `\n   ${it.heading.charAt(0) + it.heading.slice(1).toLowerCase()}\n\n` : '';
      const text = plainWithBrackets(it.text, isSpecial, true);
      
      let prefix = '';
      if (hasPilcrow && idx > 0) {
        prefix = '\n';
      }

      let formattedText = (!isReading && query) ? highlightTermText(text, query, filters) : text;

      // Wrap the link in <> so chat apps don't render a link embed/preview.
      if (isSpecial) {
        return `${prefix}${heading}${formattedText}\n  — ${it.ref} (KJB)${it.url ? `\n  Read: <${it.url}>` : ''}`;
      }
      return `${prefix}${heading}• "${formattedText}"\n  — ${it.ref} (KJB)${it.url ? `\n  Read: <${it.url}>` : ''}`;
    }).join('\n\n');
    return heading + verses;
  }).join('\n\n\n');
  const footer = `\n\n${'='.repeat(50)}\n${items.length} verse${items.length !== 1 ? 's' : ''} — King James Bible`;
  const blob = new Blob(['\uFEFF', header + body + footer], { type: 'text/plain;charset=utf-8' });
  await downloadBlob(blob, `kjb-${sanitizeFilename(query)}${options.filenameSuffix || ''}${filterSuffix(filters)}.txt`);
}

// Parse a query into its highlight term(s). Quoted queries → a single literal
// phrase; otherwise split on commas to support multi-keyword search.
function parseQueryTerms(query) {
  let term = (query || '').trim();
  const isQuoted = (term.startsWith('"') && term.endsWith('"')) || (term.startsWith('\u201C') && term.endsWith('\u201D'));
  if (isQuoted && term.length >= 3) {
    const inner = term.slice(1, -1).trim();
    return { terms: inner ? [inner] : [], isQuoted: true };
  }
  const terms = term.split(',').map(t => t.trim()).filter(t => t.length >= 2);
  if (terms.length >= 2) return { terms, isQuoted: false };
  return { terms: term ? [term] : [], isQuoted: false };
}

// Highlight search term(s) in bracketed plain text (TXT / CSV).
// Strips [brackets] for matching so a multi-word term that spans an italic
// boundary (e.g. "love [me]" → "love me") is still found and highlighted.
// *** markers wrap around the matched words; brackets themselves are never
// inside a highlight marker — the marker closes before '[' and reopens after ']'.
function highlightTermText(text, query, filters) {
  const { terms, isQuoted } = parseQueryTerms(query);
  if (!terms.length) return text;
  const cs = isQuoted || (filters && filters.caseSensitive);
  const ww = isQuoted || (filters && filters.wholeWord);

  // Build plain text (brackets removed) + map each plain char back to its
  // position in the original bracketed text.
  const plainChars = [];
  const origPos = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '[') {
      i++;
      while (i < text.length && text[i] !== ']') {
        plainChars.push(text[i]);
        origPos.push(i);
        i++;
      }
      if (i < text.length) i++;
    } else {
      plainChars.push(text[i]);
      origPos.push(i);
      i++;
    }
  }
  const plainStr = plainChars.join('');

  const hlMask = new Array(plainStr.length).fill(false);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = ww
      ? new RegExp(`(^|[^a-zA-Z'])(${escaped})(?=[^a-zA-Z']|$)`, cs ? 'g' : 'gi')
      : new RegExp(`(${escaped})`, cs ? 'g' : 'gi');
    let m;
    while ((m = re.exec(plainStr)) !== null) {
      const prefix = ww ? m[1] : '';
      const termMatch = ww ? m[2] : m[0];
      const start = m.index + prefix.length;
      for (let p = start; p < start + termMatch.length; p++) hlMask[p] = true;
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  if (!hlMask.some(Boolean)) return text;

  // Rebuild original text, inserting *** around highlighted runs.
  let result = '';
  let plainIdx = 0;
  let inHl = false;
  for (let j = 0; j < text.length; j++) {
    const ch = text[j];
    if (ch === '[' || ch === ']') {
      if (inHl) { result += '***'; inHl = false; }
      result += ch;
      continue;
    }
    const isHl = hlMask[plainIdx];
    plainIdx++;
    if (isHl && !inHl) { result += '***'; inHl = true; }
    else if (!isHl && inHl) { result += '***'; inHl = false; }
    result += ch;
  }
  if (inHl) result += '***';
  return result;
}

// Build a boolean highlight mask across ALL italic/roman runs (for PDF).
// Concatenates every run's text into one plain string, finds matches there
// (so a multi-word term spanning an italic boundary is detected), and returns
// a per-character mask indexed by position in the concatenated string.
function buildRunsHighlightMask(runs, query, filters) {
  const { terms, isQuoted } = parseQueryTerms(query);
  if (!terms.length) return null;

  const cs = isQuoted || (filters && filters.caseSensitive);
  const ww = isQuoted || (filters && filters.wholeWord);

  const plainStr = runs.map(r => r.str).join('');
  const mask = new Array(plainStr.length).fill(false);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = ww
      ? new RegExp(`(^|[^a-zA-Z'])(${escaped})(?=[^a-zA-Z']|$)`, cs ? 'g' : 'gi')
      : new RegExp(`(${escaped})`, cs ? 'g' : 'gi');
    let m;
    while ((m = re.exec(plainStr)) !== null) {
      const prefix = ww ? m[1] : '';
      const termMatch = ww ? m[2] : m[0];
      const start = m.index + prefix.length;
      for (let p = start; p < start + termMatch.length; p++) mask[p] = true;
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }
  return mask.some(Boolean) ? mask : null;
}

// Highlight search term(s) in HTML text, correctly handling terms that span
// across inline HTML tags (e.g. a phrase where one word is <em>italic</em> and
// the next is not). Builds a plain-text view of the HTML (tags stripped), finds
// matches there, then wraps the corresponding text segments in highlight spans
// — never wrapping or nesting inside tags themselves.
function highlightTermHtml(html, query, filters) {
  const { terms, isQuoted } = parseQueryTerms(query);
  if (!terms.length) return html;

  const caseSensitive = isQuoted || (filters && filters.caseSensitive);
  const wholeWord = isQuoted || (filters && filters.wholeWord);

  // Tokenize: even indices = text, odd indices = tags.
  const tokens = html.split(/(<[^>]+>)/g);

  // Build plain text from text segments, tracking each char's token + position.
  const plainChars = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const seg = tokens[i];
    if (!seg) continue;
    for (let j = 0; j < seg.length; j++) plainChars.push(seg[j]);
  }
  const plainStr = plainChars.join('');

  // Find all match ranges in the plain text.
  const flags = caseSensitive ? 'g' : 'gi';
  const hlMask = new Array(plainStr.length).fill(false);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = wholeWord
      ? new RegExp(`(^|[^a-zA-Z'])(${escaped})(?=[^a-zA-Z']|$)`, flags)
      : new RegExp(`(${escaped})`, flags);
    let m;
    while ((m = re.exec(plainStr)) !== null) {
      const prefix = wholeWord ? m[1] : '';
      const termMatch = wholeWord ? m[2] : m[0];
      const start = m.index + prefix.length;
      for (let p = start; p < start + termMatch.length; p++) hlMask[p] = true;
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  if (!hlMask.some(Boolean)) return html;

  // Rebuild tokens: wrap highlighted runs within each text segment.
  let plainIdx = 0;
  for (let i = 0; i < tokens.length; i += 2) {
    const seg = tokens[i];
    if (!seg) { continue; }
    let segHasHl = false;
    for (let j = 0; j < seg.length; j++) {
      if (hlMask[plainIdx + j]) { segHasHl = true; break; }
    }
    if (segHasHl) {
      let newSeg = '';
      let k = 0;
      while (k < seg.length) {
        const isHl = hlMask[plainIdx + k];
        let run = '';
        while (k < seg.length && hlMask[plainIdx + k] === isHl) {
          run += seg[k];
          k++;
        }
        newSeg += isHl
          ? `<span style="background-color:#fef08a;color:inherit;">${run}</span>`
          : run;
      }
      tokens[i] = newSeg;
    }
    plainIdx += seg.length;
  }

  return tokens.join('');
}

// ── DOCX (Word-compatible HTML) — italics preserved ──
export async function exportDocx(items, query, filters, options = {}) {
  const titlePrefix = options.titlePrefix || 'KJB Search Results';
  const isReading = titlePrefix === 'KJB Reading';
  const showOcc = !isReading && !!query;
  const rows = splitBySections(items, showOcc ? { query, filters } : null).map(sec => {
    if (sec.isTestament) {
      const occText = showOcc ? `, ${sec.occCount} occurrence${sec.occCount !== 1 ? 's' : ''}` : '';
      return `<h2 style="font-family:Georgia,serif;font-size:15pt;margin:24pt 0 12pt 0;border-bottom:1px solid #ccc;padding-bottom:4pt;page-break-after:avoid;break-after:avoid;">${escapeHtml(sec.title.toUpperCase())} <span style="font-size:11pt;font-weight:normal;color:#666;">(${sec.items.length} verse${sec.items.length !== 1 ? 's' : ''}${occText})</span></h2>`;
    }
    const bookNameObj = sec.items[0]?.bookNameObj;
    const fullBookName = bookNameObj ? bookNameObj.name : sec.title;
    const bookVerseCount = sec.items.length;
    const bookOccText = showOcc && sec.occCount > bookVerseCount ? `, ${sec.occCount} occurrence${sec.occCount !== 1 ? 's' : ''}` : '';
    return `<h3 style="font-family:Georgia,serif;font-size:13pt;margin:18pt 0 8pt 0;">${escapeHtml(fullBookName)} <span style="font-size:11pt;font-weight:normal;color:#666;">(${bookVerseCount} verse${bookVerseCount !== 1 ? 's' : ''}${bookOccText})</span>:</h3>` +
      `<ul style="margin:0 0 12pt 0; padding-left: 20px;">` +
      sec.items.map((it, idx) => {
        const isSpecial = it.isColophon || it.isSubscript;
        const hasPilcrow = (it.text || '').includes('¶');
        let heading = '';
        if (hasPilcrow && idx > 0) {
          heading += `</ul><div style="height:12pt;"></div><ul style="margin:0 0 12pt 0; padding-left: 20px;">`;
        }
        if (it.heading) {
          heading += `</ul><div style="margin:18pt 0 8pt 0;font-family:Georgia,serif;font-size:14pt;font-weight:bold;text-align:center;page-break-after:avoid;">${escapeHtml(it.heading.charAt(0) + it.heading.slice(1).toLowerCase())}</div><ul style="margin:0 0 12pt 0; padding-left: 20px;">`;
        }
        const textHtml = bracketsToItalicHtml(it.text, true, isSpecial);
        let formattedText = isSpecial ? textHtml : `&ldquo;${textHtml}&rdquo;`;
        if (!isReading && query) {
          formattedText = highlightTermHtml(formattedText, query, filters);
        }
        return `${heading}<li style="margin:0 0 8pt 0;font-family:Georgia,serif;font-size:12pt;page-break-inside:avoid;break-inside:avoid;mso-pagination:none;${isSpecial ? 'list-style-type:none;text-align:center;color:#555;' : ''}">` +
        `${formattedText}<br/>` +
        `<span style="font-size:10pt;color:#555;">&mdash; ${escapeHtml(it.ref)} (KJB)</span>` +
        (it.url ? `<br/><a href="${escapeHtml(it.url)}" style="font-size:9pt;color:#2a5ac8;word-break:break-all;overflow-wrap:break-word;">${escapeHtml(it.url)}</a>` : '') +
        `</li>`;
      }).join('') + `</ul>`;
  }).join('');
  const headerHtml = isReading
    ? `<h1 style="font-family:Georgia,serif;font-size:24pt;font-weight:bold;text-align:center;margin-bottom:4pt;">${escapeHtml(options.bookName || query)}</h1>` +
      (options.chapterText ? `<p style="font-family:sans-serif;font-size:10pt;color:#555;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-bottom:20pt;">${escapeHtml(options.chapterText)}</p>` : '')
    : `<h2 style="font-family:Georgia,serif;">${escapeHtml(titlePrefix)}${options.showQuery ? ` — &ldquo;${escapeHtml(query)}&rdquo;` : ''}</h2>`;

  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>KJB Search</title></head><body>` +
    `${headerHtml}${!isReading ? summaryHtml(options.filterSummary) : ''}${rows}` +
    `<p style="font-size:10pt;color:#777;${isReading ? 'text-align:center;' : ''}">${items.length} verse${items.length !== 1 ? 's' : ''} — King James Bible</p></body></html>`;
  const blob = new Blob(['\uFEFF', html], { type: 'application/msword' });
  await downloadBlob(blob, `kjb-${sanitizeFilename(query)}${options.filenameSuffix || ''}${filterSuffix(filters)}.doc`);
}

// ── CSV (Excel-compatible) — opens cleanly without the .xls format warning.
// Brackets kept to mark italics. Quotes/commas/newlines are CSV-escaped.
function csvCell(s) {
  const v = (s || '').replace(/"/g, '""');
  return `"${v}"`;
}
export async function exportXls(items, query, filters, options = {}) {
  const isReading = options.titlePrefix === 'KJB Reading';
  const showOcc = !isReading && !!query;
  const header = `${csvCell('Testament')},${csvCell('Book')},${csvCell('Reference')},${csvCell('Text ([brackets] = italics)')}${showOcc ? ',' + csvCell('Occurrences') : ''}`;
  const rows = [];
  
  const old = items.filter(it => it.testament !== 'new');
  const neu = items.filter(it => it.testament === 'new');
  
  old.forEach(it => {
    const isSpecial = it.isColophon || it.isSubscript;
    const text = plainWithBrackets(it.text, isSpecial, true);
    const formattedText = (!isReading && query) ? highlightTermText(text, query, filters) : text;
    const occCell = showOcc ? ',' + csvCell(String(countTermOccurrences(it.text, query, filters))) : '';
    rows.push(`${csvCell('Old Testament')},${csvCell(it.bookName || it.book || '')},${csvCell(it.ref)},${csvCell(formattedText)}${occCell}`);
  });
  neu.forEach(it => {
    const isSpecial = it.isColophon || it.isSubscript;
    const text = plainWithBrackets(it.text, isSpecial, true);
    const formattedText = (!isReading && query) ? highlightTermText(text, query, filters) : text;
    const occCell = showOcc ? ',' + csvCell(String(countTermOccurrences(it.text, query, filters))) : '';
    rows.push(`${csvCell('New Testament')},${csvCell(it.bookName || it.book || '')},${csvCell(it.ref)},${csvCell(formattedText)}${occCell}`);
  });
  
  // Prepend an "Applied filters" block (label,value rows) above the table.
  const summaryRows = (options.filterSummary && options.filterSummary.length)
    ? [`${csvCell('Applied filters')},${csvCell('')}`,
       ...options.filterSummary.map(f => `${csvCell(f.label)},${csvCell(f.value)}`),
       ''] // blank spacer line
    : [];
  const csv = [...summaryRows, header, ...rows].join('\r\n');
  // Leading BOM so Excel detects UTF-8.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  await downloadBlob(blob, `kjb-${sanitizeFilename(query)}${options.filenameSuffix || ''}${filterSuffix(filters)}.csv`);
}

// ── PDF (jsPDF) — italics preserved via font style switching ──
export async function exportPdf(items, query, filters, options = {}) {
  const titlePrefix = options.titlePrefix || 'KJB Search Results';
  const isReading = titlePrefix === 'KJB Reading';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const marginTop = 56;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - marginX * 2;
  let y = marginTop;

  doc.setFont('times', 'bold');
  
  if (isReading) {
    doc.setFontSize(22);
    const bookTitle = options.bookName || query;
    const bookWidth = doc.getTextWidth(bookTitle);
    doc.text(bookTitle, (pageW - bookWidth) / 2, y);
    y += 20;
    
    if (options.chapterText) {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      const chapText = options.chapterText.toUpperCase();
      const chapWidth = doc.getTextWidth(chapText);
      doc.text(chapText, (pageW - chapWidth) / 2, y);
      doc.setTextColor(0);
      doc.setFont('times', 'bold');
      y += 10;
    }
  } else {
    doc.setFontSize(16);
    doc.text(`${titlePrefix}${options.showQuery ? ` — "${query}"` : ''}`, marginX, y);
  }
  y += 26;

  const lineH = 16;
  // Ensure there's room for `needed` pts before drawing; only then add a page.
  // (Adding pages eagerly *after* content caused a trailing blank page.)
  const ensureSpace = (needed) => {
    if (y + needed > pageH - 48) { doc.addPage(); y = marginTop; }
  };

  // Applied-filters summary block (non-reading exports only).
  if (!isReading && options.filterSummary && options.filterSummary.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text('APPLIED FILTERS', marginX, y);
    y += 6;
    doc.setDrawColor(210);
    doc.line(marginX, y, marginX + maxW, y);
    y += 12;
    const labelW = 130;
    options.filterSummary.forEach(f => {
      const valueLines = doc.splitTextToSize(f.value, maxW - labelW - 8);
      ensureSpace(lineH * valueLines.length);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(f.label, marginX, y);
      doc.setTextColor(0);
      valueLines.forEach((ln, li) => {
        doc.text(ln, marginX + labelW, y + li * (lineH - 2));
      });
      y += Math.max(lineH, valueLines.length * (lineH - 2)) + 2;
    });
    y += 12;
    doc.setTextColor(0);
  }
  // Pre-measure the total vertical height one verse entry (bulleted text +
  // reference line + optional link) will need, WITHOUT drawing anything —
  // mirrors the exact wrapping/line-height math in renderVerse below. This is
  // what lets an entry be treated as a single atomic block for pagination:
  // call this once, and if the result doesn't fit in the space left on the
  // page, move the page break to BEFORE the entry instead of letting
  // renderVerse's own per-line ensureSpace calls split it wherever the verse
  // text happens to wrap — which is how a verse's reference/link line ended
  // up stranded alone at the top of the next page while its quote stayed on
  // the page before.
  const measureVerseHeight = (text, url, isSpecial = false, keepPilcrow = false) => {
    const clean = isSpecial ? plainWithBrackets(text, true, keepPilcrow) : `\u201C${plainWithBrackets(text, false, keepPilcrow)}\u201D`;
    const runs = [];
    clean.replace(/\[([^\]]+)\]|([^[]+)/g, (m, inside, plain) => {
      if (inside !== undefined) runs.push({ str: inside, italic: true });
      else runs.push({ str: plain, italic: false });
      return m;
    });
    let lines = 1;
    let x = isSpecial ? marginX : marginX + 15;
    doc.setFontSize(11);
    runs.forEach(run => {
      doc.setFont('times', run.italic ? 'italic' : 'normal');
      const words = run.str.split(/(\s+)/);
      words.forEach(word => {
        if (!word) return;
        const w = doc.getTextWidth(word);
        if (x + w > marginX + maxW && word.trim()) {
          x = marginX + 15;
          lines++;
        }
        x += w;
      });
    });
    doc.setFont('times', 'normal');
    let height = lines * lineH; // verse-text lines, ending at the reference line's y
    height += lineH; // reference line itself
    if (url) {
      doc.setFontSize(9);
      const linkStartX = marginX + 15;
      const linkMaxW = pageW - marginX - linkStartX;
      const chunks = doc.splitTextToSize(url, linkMaxW);
      height += (lineH - 2) + Math.max(0, chunks.length - 1) * (lineH - 4);
    }
    height += lineH + 8; // trailing spacer before the next entry
    return height;
  };

  // Render a verse, switching between roman and italic for [bracketed] runs,
  // wrapping words within the page width.
  const renderVerse = (text, ref, url, isSpecial = false, keepPilcrow = false) => {
    // Atomic pagination: if the WHOLE entry fits on a fresh page but not in
    // what's left of the current one, break to a new page before drawing
    // anything for it. An entry too tall to ever fit a single page (rare —
    // a huge multi-verse passage) falls back to flowing across pages via the
    // per-line ensureSpace calls below, same as before.
    const availablePageHeight = pageH - marginTop - 48;
    const itemHeight = measureVerseHeight(text, url, isSpecial, keepPilcrow);
    if (itemHeight <= availablePageHeight && y + itemHeight > pageH - 48) {
      doc.addPage();
      y = marginTop;
    }
    const clean = isSpecial ? plainWithBrackets(text, true, keepPilcrow) : `\u201C${plainWithBrackets(text, false, keepPilcrow)}\u201D`;
    // Tokenise into {str, italic} runs by brackets
    const runs = [];
    clean.replace(/\[([^\]]+)\]|([^[]+)/g, (m, inside, plain) => {
      if (inside !== undefined) runs.push({ str: inside, italic: true });
      else runs.push({ str: plain, italic: false });
      return m;
    });

    let x = marginX + 15;
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    if (isSpecial) {
      doc.setTextColor(90); // Use grey for subscripts/colophons
      x = marginX; // Start from left edge (no bullet)
    } else {
      doc.setTextColor(0);
      doc.text("•", marginX, y);
    }
    
    // Build the highlight mask once across ALL runs so a multi-word term that
    // spans an italic/roman boundary is detected and highlighted correctly.
    const hlMask = (!isReading && query) ? buildRunsHighlightMask(runs, query, filters) : null;
    let plainCharOffset = 0;
    runs.forEach(run => {
      doc.setFont('times', run.italic ? 'italic' : 'normal');

      let subRuns;
      if (hlMask) {
        subRuns = [];
        const runStart = plainCharOffset;
        let k = 0;
        while (k < run.str.length) {
          const isHl = hlMask[runStart + k];
          let runText = '';
          while (k < run.str.length && hlMask[runStart + k] === isHl) {
            runText += run.str[k];
            k++;
          }
          subRuns.push({ text: runText, highlight: isHl });
        }
      } else {
        subRuns = [{ text: run.str, highlight: false }];
      }
      plainCharOffset += run.str.length;

      subRuns.forEach(sub => {
        // Split into words to allow wrapping
        const words = sub.text.split(/(\s+)/);
        words.forEach(word => {
          if (!word) return;
          const w = doc.getTextWidth(word);
          if (x + w > marginX + maxW && word.trim()) {
            x = marginX + 15;
            y += lineH;
            ensureSpace(lineH);
          }
          if (sub.highlight && word.trim()) {
            doc.setFillColor(254, 240, 138); // yellow-200
            doc.rect(x, y - 10, w, 13, 'F');
          }
          doc.text(word, x, y);
          x += w;
        });
      });
    });
    // Reference line
    y += lineH;
    ensureSpace(lineH);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(`— ${ref} (KJB)`, marginX + 15, y);
    // Clickable verse link — wrap long URLs so they never overflow the page.
    if (url) {
      y += lineH - 2;
      ensureSpace(lineH);
      doc.setTextColor(40, 90, 200);
      const linkStartX = marginX + 15;
      const linkMaxW = pageW - marginX - linkStartX;
      // Break the URL into chunks that each fit within linkMaxW.
      const chunks = doc.splitTextToSize(url, linkMaxW);
      chunks.forEach((chunk, ci) => {
        if (ci > 0) { y += lineH - 4; ensureSpace(lineH); }
        doc.textWithLink(chunk, linkStartX, y, { url });
      });
      doc.setTextColor(0);
    } else {
      doc.setTextColor(0);
    }
    y += lineH + 8;
  };

  const renderTestamentHeading = (title) => {
    y += 12;
    ensureSpace(lineH + 10);
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(0);
    doc.text(title, marginX, y);
    y += lineH + 6;
  };

  const renderStanzaHeading = (title) => {
    y += 12;
    ensureSpace(lineH + 10);
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0);
    const w = doc.getTextWidth(title);
    doc.text(title, (pageW - w) / 2, y);
    y += lineH + 6;
  };

  const renderBookHeading = (title) => {
    y += 8;
    ensureSpace(lineH + 6);
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(title, marginX, y);
    y += lineH + 6;
  };

  const showOcc = !isReading && !!query;
  splitBySections(items, showOcc ? { query, filters } : null).forEach(sec => {
    if (sec.isTestament) {
      const occText = showOcc ? `, ${sec.occCount} occurrence${sec.occCount !== 1 ? 's' : ''}` : '';
      renderTestamentHeading(`${sec.title.toUpperCase()} (${sec.items.length} verse${sec.items.length !== 1 ? 's' : ''}${occText})`);
    } else {
      const bookNameObj = sec.items[0]?.bookNameObj;
      const fullBookName = bookNameObj ? bookNameObj.name : sec.title;
      const bookOccText = showOcc && sec.occCount > sec.items.length ? ` (${sec.occCount} occurrences)` : '';
      renderBookHeading(`${fullBookName}:${bookOccText}`);
      sec.items.forEach((it, idx) => {
        const hasPilcrow = (it.text || '').includes('¶');
        if (hasPilcrow && idx > 0) {
          y += lineH;
          ensureSpace(lineH);
        }
        if (it.heading) {
          renderStanzaHeading(it.heading.charAt(0) + it.heading.slice(1).toLowerCase());
        }
        renderVerse(it.text, it.ref, it.url, it.isColophon || it.isSubscript, true);
      });
    }
  });

  const totalPages = doc.internal.getNumberOfPages();
  const now = new Date();
  const dateStr = now.toLocaleDateString() + ' at ' + now.toLocaleTimeString();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150);
    
    const pageText = `Page ${i} of ${totalPages}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, (pageW - pageTextWidth) / 2, pageH - 25);
    
    if (i === totalPages) {
      const leftText = `${items.length} verse${items.length !== 1 ? 's' : ''} — King James Bible`;
      doc.text(leftText, marginX, pageH - 25);
      
      const rightText = `Printed on ${dateStr}`;
      const rightWidth = doc.getTextWidth(rightText);
      doc.text(rightText, pageW - marginX - rightWidth, pageH - 25);
    }
  }

  await downloadBlob(doc.output('blob'), `kjb-${sanitizeFilename(query)}${options.filenameSuffix || ''}${filterSuffix(filters)}.pdf`);
}

// ── Print ──
export function exportPrint(items, query, filters, options = {}) {
  const titlePrefix = options.titlePrefix || 'KJB Search Results';
  const isReading = titlePrefix === 'KJB Reading';
  
  let rows = '';
  if (isReading) {
    const currentParagraphs = [];
    let currentBlock = [];
    let isFirstParagraph = true;

    items.forEach(it => {
      if (it.isEndMarker) {
        if (currentBlock.length > 0) {
          currentParagraphs.push(`<p style="margin:0 0 10pt 0; page-break-inside:avoid; break-inside:avoid;">${currentBlock.join('')}</p>`);
          isFirstParagraph = false;
          currentBlock = [];
        }
        currentParagraphs.push(`<div style="margin:28pt 0 10pt 0;font-family:Georgia,serif;font-size:14pt;font-weight:700;text-transform:uppercase;letter-spacing:0.35em;text-align:center;column-span:all;page-break-inside:avoid;break-inside:avoid;">${escapeHtml(it.text)}</div>`);
        return;
      }
      if (it.isColophon || it.isSubscript) {
        if (currentBlock.length > 0) {
          currentParagraphs.push(`<p style="margin:0 0 10pt 0; page-break-inside:avoid; break-inside:avoid;">${currentBlock.join('')}</p>`);
          isFirstParagraph = false;
          currentBlock = [];
        }
        let textHtml = bracketsToItalicHtml(it.text, true, true);
        currentParagraphs.push(`<div style="margin:14pt 0;font-family:Georgia,serif;font-size:12pt;line-height:1.6;color:#555;text-align:center;column-span:all;page-break-inside:avoid;break-inside:avoid;">${textHtml}</div>`);
        return;
      }

      if (it.heading) {
        if (currentBlock.length > 0) {
          currentParagraphs.push(`<p style="margin:0 0 10pt 0; page-break-inside:avoid; break-inside:avoid;">${currentBlock.join('')}</p>`);
          isFirstParagraph = false;
          currentBlock = [];
        }
        const headingLabel = it.heading.charAt(0) + it.heading.slice(1).toLowerCase();
        currentParagraphs.push(`<div style="margin:24pt 0 10pt 0;font-family:Georgia,serif;font-size:14pt;font-weight:bold;text-align:center;column-span:all;page-break-after:avoid;break-after:avoid;page-break-inside:avoid;break-inside:avoid;">${escapeHtml(headingLabel)}</div>`);
        isFirstParagraph = true;
      }

      const hasPilcrow = (it.text || '').includes('¶');
      let textHtml = bracketsToItalicHtml(it.text, true);
      textHtml = textHtml.replace(/¶\s*/g, `<span style="opacity:0.5;">&para;</span> `);
      
      if (options.paragraphMode) {
        if (hasPilcrow && currentBlock.length > 0) {
          currentParagraphs.push(`<p style="margin:0 0 10pt 0;">${currentBlock.join('')}</p>`);
          isFirstParagraph = false;
          currentBlock = [];
        }
      } else {
        if (hasPilcrow && currentParagraphs.length > 0 && currentBlock.length === 0 && !isFirstParagraph) {
          currentParagraphs.push(`<div style="height: 12pt;"></div>`);
        }
      }

      const verseHtml = `<span style="font-family:Georgia,serif;font-size:12pt;line-height:1.6;"><sup style="font-size:8pt;margin-right:2pt;color:#555;">${it.verse}</sup>${textHtml} </span>`;
      currentBlock.push(verseHtml);
      
      if (!options.paragraphMode) {
        currentParagraphs.push(`<p style="margin:0 0 6pt 0; page-break-inside:avoid; break-inside:avoid;">${currentBlock.join('')}</p>`);
        isFirstParagraph = false;
        currentBlock = [];
      }
    });

    if (currentBlock.length > 0) {
      currentParagraphs.push(`<p style="margin:0 0 10pt 0; page-break-inside:avoid; break-inside:avoid;">${currentBlock.join('')}</p>`);
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' at ' + now.toLocaleTimeString();
    currentParagraphs.push(`<div style="margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #eee; font-size: 10pt; color: #777; text-align: center; page-break-inside: avoid; break-inside: avoid; column-span: all;">${items.length} verse${items.length !== 1 ? 's' : ''} &mdash; King James Bible<br/>Printed on ${dateStr}</div>`);

    const content = currentParagraphs.join('');
    rows = `<div style="text-align:justify;margin-top:20px;${options.columnMode ? 'column-count:2;column-gap:1.5cm;column-rule:1px solid #ccc;' : 'display:block;'}">${content}</div>`;
  } else {
    const showOcc = !isReading && !!query;
    rows = splitBySections(items, showOcc ? { query, filters } : null).map(sec => {
      if (sec.isTestament) {
        const verseCount = sec.items.reduce((sum, item) => sum + (item.items ? item.items.length : 1), 0);
        const occText = showOcc ? `, ${sec.occCount} occurrence${sec.occCount !== 1 ? 's' : ''}` : '';
        return `<h2 style="font-family:Georgia,serif;font-size:16pt;margin:30pt 0 16pt 0;border-bottom:1px solid #ccc;padding-bottom:4pt;page-break-after:avoid;break-after:avoid;">${escapeHtml(sec.title.toUpperCase())} <span style="font-size:12pt;font-weight:normal;color:#666;">(${verseCount} verse${verseCount !== 1 ? 's' : ''}${occText})</span></h2>`;
      }
      
      const bookNameObj = sec.items[0]?.bookNameObj;
      const fullBookName = bookNameObj ? bookNameObj.name : sec.title;
      const bookVerseCount = sec.items.length;
      const bookOccText = showOcc && sec.occCount > bookVerseCount ? `, ${sec.occCount} occurrence${sec.occCount !== 1 ? 's' : ''}` : '';
      
      return `<div style="page-break-inside:avoid;"><h3 style="font-family:Georgia,serif;font-size:14pt;margin:20pt 0 10pt 0;">${escapeHtml(fullBookName)} <span style="font-size:11pt;font-weight:normal;color:#666;">(${bookVerseCount} verse${bookVerseCount !== 1 ? 's' : ''}${bookOccText})</span>:</h3>` +
        `<ul style="margin:0 0 14pt 0; padding-left: 20px;">` +
        sec.items.map((it, idx) => {
          const isSpecial = it.isColophon || it.isSubscript;
          const hasPilcrow = (it.text || '').includes('¶');
          let heading = '';
          if (hasPilcrow && idx > 0) {
            heading += `</ul><div style="height:12pt;"></div><ul style="margin:0 0 14pt 0; padding-left: 20px;">`;
          }
          if (it.heading) {
            heading += `</ul><div style="margin:18pt 0 8pt 0;font-family:Georgia,serif;font-size:14pt;font-weight:bold;text-align:center;page-break-after:avoid;">${escapeHtml(it.heading.charAt(0) + it.heading.slice(1).toLowerCase())}</div><ul style="margin:0 0 14pt 0; padding-left: 20px;">`;
          }
          const textHtml = bracketsToItalicHtml(it.text, true, isSpecial);
          let formattedText = isSpecial ? textHtml : `&ldquo;${textHtml}&rdquo;`;
          if (!isReading && query) {
            formattedText = highlightTermHtml(formattedText, query, filters);
          }
          return `${heading}<li style="margin:0 0 10pt 0;font-family:Georgia,serif;font-size:12pt;line-height:1.6;padding-left:4px;page-break-inside:avoid;${isSpecial ? 'list-style-type:none;text-align:center;color:#555;' : ''}">` +
          `${formattedText} ` +
          `<span style="font-size:10pt;color:#555;">&mdash; ${escapeHtml(it.ref)} (KJB)</span>` +
          `</li>`;
        }).join('') + `</ul></div>`;
    }).join('');
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString() + ' at ' + now.toLocaleTimeString();
  
  const headerHtml = isReading 
    ? `<h1 style="font-family:Georgia,serif;font-size:24pt;font-weight:900;margin-bottom:5pt;text-align:center;">${escapeHtml(options.bookName || query)}</h1>` +
      (options.chapterText ? `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:10pt;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-top:0;margin-bottom:25pt;text-align:center;">${escapeHtml(options.chapterText)}</p>` : '')
    : `<h1 style="font-family:Georgia,serif;font-size:20pt;margin-bottom:16pt;">${escapeHtml(titlePrefix)}${options.showQuery ? ` &mdash; &ldquo;${escapeHtml(query)}&rdquo;` : ''}</h1>` +
      summaryHtml(options.filterSummary);

  // Use a clean, generic title for the browser's print header so we avoid
  // showing hyphenated file names or "about:blank". When a filename suffix is
  // provided (Advanced Search), use a descriptive title so "Save as PDF"
  // suggests a filename that includes the active filters.
  const printTitle = options.filenameSuffix ? `${titlePrefix}${options.filenameSuffix}` : '\u200B';

  const footerHtml = isReading 
    ? '' 
    : `<div style="margin-top: 40pt; page-break-inside: avoid;"><p style="font-size:10pt;color:#777;border-top:1px solid #eee;padding-top:10pt;margin:0;">${items.length} verse${items.length !== 1 ? 's' : ''} &mdash; King James Bible<br/>Printed on ${dateStr}</p></div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(printTitle)}</title><style>@page { margin: 1.5cm; } body { margin: 0 !important; display: block !important; height: auto !important; position: static !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }</style></head><body style="padding:20px;max-width:800px;margin:0 auto;color:#000;">` +
    `${headerHtml}${rows}${footerHtml}</body></html>`;

  // Android's bare WebView has no print UI to respond to window.print() (see
  // nativePrint.js) -- try the real native path first; only fall through to
  // the hidden-iframe browser trick below when there's no native bridge.
  if (nativePrintHtml(html)) return;

  // Print via a hidden iframe so no new tab / about:blank page opens.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  // Rewrite the iframe URL to the clean public path so the browser's native
  // print footer shows a tidy URL instead of internal tracking params.
  try {
    const clean = cleanPrintUrl();
    if (clean && iframe.contentWindow?.history?.replaceState) {
      const u = new URL(clean);
      iframe.contentWindow.history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  } catch (e) {}

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {}
    cleanup();
  };

  // Wait for the iframe content (and fonts) to be ready before printing.
  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = cleanup;
    setTimeout(triggerPrint, 300);
  } else {
    cleanup();
  }
}

// Single entry point
export async function exportVerses(format, items, query, filters, options = {}) {
  switch (format) {
    case 'txt': return await exportTxt(items, query, filters, options);
    case 'docx': return await exportDocx(items, query, filters, options);
    case 'xls': return await exportXls(items, query, filters, options);
    case 'pdf': return await exportPdf(items, query, filters, options);
    case 'print': return exportPrint(items, query, filters, options);
    default: return await exportTxt(items, query, filters, options);
  }
}