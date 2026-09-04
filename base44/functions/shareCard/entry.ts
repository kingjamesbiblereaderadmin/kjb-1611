// KJB Share Card — generates a 1024×1024 SVG verse card image.
// Matches the client-side ShareCard layout: gradient background, logo,
// "VERSE OF THE DAY" header, auto-fitted verse text, reference, date badge,
// footer curve, and "KingJamesBibleReader.com" footer.
//
// Usage:
//   GET /functions/shareCard                      → today's daily verse (SVG)
//   GET /functions/shareCard?ref=John 3:16        → specific verse by reference
//   GET /functions/shareCard?book=John&chapter=3&verse=16
//   GET /functions/shareCard?download=1            → force download (Content-Disposition: attachment)
//   GET /functions/shareCard?format=json          → JSON { ref, text, date, imageUrl, svgUrl }
//
// Returns: image/svg+xml (default) or application/json (format=json)
//
// Discord bot usage (Node.js with sharp):
//   1. GET /functions/shareCard?format=json → { ref, text, imageUrl, svgUrl }
//   2. Fetch the SVG from svgUrl
//   3. Convert: sharp(Buffer.from(svg)).png().toBuffer()
//   4. Send the PNG as a Discord attachment + text as message content

// ── Bible data (same source as bibleApi / dailyVerseTxt) ──
import { ABBR_TO_NAME, BOOK_ORDER, TEXT_URL, loadBible, buildFlatList, verseFromRef, normalizeDateKey } from "../../shared/bibleData.ts";
const LOGO_URL = 'https://media.base44.com/images/public/6a05d76723afe58d80c589e8/8e738d108_cfb4bf781_Untitled.png';

// Daily verse-card gradient (one per weekday, matching dailyVerseTheme.js)
const VERSE_BACKGROUNDS = [
  { hex: ['#1d4ed8', '#9333ea'] },   // Sun
  { hex: ['#047857', '#0891b2'] },   // Mon
  { hex: ['#be123c', '#c026d3'] },   // Tue
  { hex: ['#d97706', '#dc2626'] },   // Wed
  { hex: ['#0e7490', '#2563eb'] },   // Thu
  { hex: ['#6d28d9', '#db2777'] },   // Fri
  { hex: ['#1e293b', '#5b21b6'] },   // Sat
];

// ── Card layout constants (matching ShareCard.jsx + shareCardSettings.js) ──
const CARD_SIZE = 1024;
const OUTER_PAD_TOP = 32;
const OUTER_PAD_BOTTOM = 40;
const OUTER_PAD_X = 40;
const HEADER_BLOCK_H = 76;
const DIVIDER_H = 6;
const HEADER_DIVIDER_GAP = 36;
const FOOTER_GAP_TOP = 16;
const FOOTER_GAP_BOTTOM = 26;
const FOOTER_CURVE_H = 32;
const FOOTER_TEXT_H = 46;
const BLOCKQUOTE_MAX_W = 944;
const BLOCKQUOTE_PAD_H = 24;

const TEXT_AREA_TOP = OUTER_PAD_TOP + HEADER_BLOCK_H + DIVIDER_H + HEADER_DIVIDER_GAP;
const TEXT_AREA_BOTTOM = CARD_SIZE - OUTER_PAD_BOTTOM - (FOOTER_CURVE_H + FOOTER_GAP_TOP + FOOTER_GAP_BOTTOM) - FOOTER_TEXT_H;
const AVAILABLE_HEIGHT = TEXT_AREA_BOTTOM - TEXT_AREA_TOP;
const AVAILABLE_WIDTH = BLOCKQUOTE_MAX_W - BLOCKQUOTE_PAD_H;

// ── Bible loading — imported from shared/bibleData.ts ──

// ── Text processing (matching formatDailyVerse.cleanVerseText) ──
function cleanVerseText(text = '') {
  return String(text)
    .replace(/(\p{L})\uFFFD/gu, "$1'")
    .replace(/\uFFFD/g, '¶')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainVerseText(text = '') {
  return cleanVerseText(text)
    .replace(/^<<[^>]*>>\s*/, '')
    .replace(/<<[^>]*>>\s*/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Verse lookup — verseFromRef imported from shared/bibleData.ts ──

// ── Daily verse (matching bibleApi algorithm with DB controls) ──
function getEasternDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
  return { y: get('year'), m: get('month'), d: get('day') };
}

// normalizeDateKey and buildFlatList — imported from shared/bibleData.ts

async function getDailyVerse(bible, b44) {
  const { y, m, d } = getEasternDate();
  const seed = y * 10000 + m * 100 + d;
  const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Load admin controls (pins + exclusions) from DB
  let extraExcluded = new Set();
  let pins = {};
  if (b44) {
    try {
      const rows = await b44.asServiceRole.entities.DailyVerseControl.list('-created_date', 2000);
      for (const r of rows || []) {
        if (r.kind === 'exclusion' && r.ref) extraExcluded.add(r.ref);
        else if (r.kind === 'pin' && r.ref && r.date) pins[normalizeDateKey(r.date)] = r.ref;
      }
    } catch (err) {
      console.warn('[shareCard] control load failed:', err?.message);
    }
  }

  // Check pinned verse for today
  if (pins[dateKey]) {
    const pinned = verseFromRef(bible, pins[dateKey]);
    if (pinned) return pinned;
  }

  const flat = buildFlatList(bible);
  if (!flat.length) return null;

  // Same hash + step-forward as bibleApi's pickForSeed
  const len = flat.length;
  let idx = ((seed * 2654435761) % len + len) % len;
  for (let i = 0; i < len; i++) {
    const item = flat[idx];
    const ref = `${item.bookName} ${item.chapterNum}:${item.verseObj.verse}`;
    if (!extraExcluded.has(ref)) {
      return verseFromRef(bible, ref);
    }
    idx = (idx + 1) % len;
  }
  return verseFromRef(bible, `${flat[idx].bookName} ${flat[idx].chapterNum}:${flat[idx].verseObj.verse}`);
}

// ── Logo (cached as base64 data URI for self-contained SVG) ──
let logoDataUri = null;

async function getLogo() {
  if (logoDataUri !== null) return logoDataUri;
  try {
    const res = await fetch(LOGO_URL);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    logoDataUri = `data:image/png;base64,${btoa(binary)}`;
  } catch {
    logoDataUri = '';
  }
  return logoDataUri;
}

// ── Colour helpers (matching ShareCard.jsx) ──
function darken(hex, amt = 0.45) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c * (1 - amt));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function lighten(hex, amt = 0.55) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

// ── Text width estimation (for word wrapping without canvas) ──
function estimateCharWidth(ch) {
  const code = ch.charCodeAt(0);
  if (ch === 'i' || ch === 'l' || ch === '.') return 0.27;
  if (ch === 'f' || ch === 't' || ch === 'r') return 0.35;
  if (ch === 'j') return 0.27;
  if (ch === 'm' || ch === 'w') return 0.80;
  if (ch === 'M' || ch === 'W') return 0.85;
  if (ch === 'I') return 0.28;
  if (ch === 'L' || ch === 'T') return 0.52;
  if (ch === 'O' || ch === 'Q' || ch === 'o' || ch === 'q' || ch === 'C' || ch === 'G') return 0.72;
  if (code >= 65 && code <= 90) return 0.65;
  if (code >= 97 && code <= 122) return 0.52;
  if (code >= 48 && code <= 57) return 0.55;
  if (ch === ' ') return 0.28;
  if (ch === ',') return 0.27;
  if (ch === ';' || ch === ':') return 0.27;
  if (ch === "'") return 0.22;
  if (ch === '"') return 0.40;
  if (ch === '—') return 0.55;
  if (ch === '-') return 0.33;
  if (ch === '¶') return 0.38;
  if (ch === '!') return 0.27;
  if (ch === '?') return 0.42;
  if (ch === '(' || ch === ')') return 0.33;
  if (ch === '[' || ch === ']') return 0.28;
  return 0.52;
}

function estimateTextWidth(text, fontSize) {
  let w = 0;
  for (const ch of text) {
    w += estimateCharWidth(ch) * fontSize;
  }
  return w * 1.08; // safety factor to avoid overflow
}

function wrapText(text, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (estimateTextWidth(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Binary search for largest font size that fits (matching ShareCard.computeFit)
function computeFitSize(text, maxWidth, maxHeight) {
  const maxSize = 160;
  const minSize = 15;
  const lineHeightMult = 1.6;

  for (let size = maxSize; size >= minSize; size -= 1) {
    const lines = wrapText(text, size, maxWidth);
    const verseBlockHeight = lines.length * size * lineHeightMult;
    const refBlockHeight = size * 0.95 + size * 0.52 * 1.2;
    const dateBlockHeight = size * 0.25 + size * 0.42 * 1.15 + size * 0.32;
    const total = verseBlockHeight + refBlockHeight + dateBlockHeight;
    if (total <= maxHeight - 10) {
      return { size, lines };
    }
  }
  return { size: minSize, lines: wrapText(text, minSize, maxWidth) };
}

// ── XML escaping ──
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── SVG generation ──
function buildSVG(verse, gradientHex, dateStr, logoUri) {
  const [c1, c2] = gradientHex;
  const dateBadgeBg = darken(c2, 0.45);
  const curveColorA = lighten(c2, 0.55);
  const curveColorB = lighten(c1, 0.55);

  const verseText = `"${plainVerseText(verse.text)}"`;
  const { size: fitSize, lines } = computeFitSize(verseText, AVAILABLE_WIDTH, AVAILABLE_HEIGHT);

  // Calculate content positions (centered vertically in text area)
  const verseBlockHeight = lines.length * fitSize * 1.6;
  const refBlockHeight = fitSize * 0.95 + fitSize * 0.52 * 1.2;
  const dateBlockHeight = fitSize * 0.25 + fitSize * 0.42 * 1.15 + fitSize * 0.32;
  const totalContentHeight = verseBlockHeight + refBlockHeight + dateBlockHeight;
  const contentStartY = TEXT_AREA_TOP + (AVAILABLE_HEIGHT - totalContentHeight) / 2;

  // Verse text lines (SVG <text> y = baseline)
  const lineHeight = fitSize * 1.6;
  const verseLines = lines.map((line, i) => {
    const y = contentStartY + i * lineHeight + fitSize;
    return `<text x="512" y="${y.toFixed(1)}" font-family="Merriweather, Georgia, serif" font-weight="700" font-size="${fitSize}" fill="#ffffff" text-anchor="middle" style="text-shadow: 0 3px 10px rgba(0,0,0,0.4)">${escapeXml(line)}</text>`;
  }).join('\n      ');

  // Reference
  const refFontSize = fitSize * 0.52;
  const refY = contentStartY + verseBlockHeight + fitSize * 0.95 + refFontSize;

  // Date badge
  const badgeFontSize = fitSize * 0.42;
  const badgePadV = fitSize * 0.16;
  const badgePadH = fitSize * 0.26;
  const badgeTextWidth = estimateTextWidth(dateStr, badgeFontSize) / 1.08; // un-apply safety factor for badge
  const badgeW = badgeTextWidth + badgePadH * 2;
  const badgeH = badgeFontSize * 1.15 + badgePadV * 2;
  const badgeY = refY + fitSize * 0.25;
  const badgeX = (CARD_SIZE - badgeW) / 2;
  const badgeTextY = badgeY + badgeH / 2 + badgeFontSize * 0.35;

  // Footer curve
  const curveY = TEXT_AREA_BOTTOM + FOOTER_GAP_TOP + 28; // baseline of curve path

  // Footer text
  const footerTextY = CARD_SIZE - OUTER_PAD_BOTTOM - FOOTER_TEXT_H + 38 * 0.8;

  // Header text position
  const headerTextY = OUTER_PAD_TOP + 52 + 4 + 30 * 0.8; // logo + margin + font ascent
  const headerRuleY = headerTextY - 15;

  // Logo
  const logoEl = logoUri
    ? `<image href="${logoUri}" x="${OUTER_PAD_X}" y="${OUTER_PAD_TOP}" width="52" height="52" />`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}" viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="white" stop-opacity="0.10" />
      <stop offset="22%" stop-color="white" stop-opacity="0" />
      <stop offset="60%" stop-color="white" stop-opacity="0" />
      <stop offset="78%" stop-color="white" stop-opacity="0.07" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="ruleLeft" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="white" stop-opacity="0.4" />
      <stop offset="100%" stop-color="white" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="ruleRight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="white" stop-opacity="0.85" />
      <stop offset="100%" stop-color="white" stop-opacity="0.4" />
    </linearGradient>
    <linearGradient id="divider" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="white" stop-opacity="0.15" />
      <stop offset="50%" stop-color="white" stop-opacity="1" />
      <stop offset="100%" stop-color="white" stop-opacity="0.15" />
    </linearGradient>
    <linearGradient id="footerCurve" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${curveColorA}" stop-opacity="0" />
      <stop offset="50%" stop-color="${curveColorB}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${curveColorA}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="url(#bg)" />
  <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="url(#overlay)" />

  <!-- Logo -->
  ${logoEl}

  <!-- Header rules + text -->
  <rect x="${OUTER_PAD_X}" y="${headerRuleY.toFixed(1)}" width="256" height="3" rx="1.5" fill="url(#ruleLeft)" />
  <text x="512" y="${headerTextY.toFixed(1)}" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="30" fill="#ffffff" text-anchor="middle" letter-spacing="4.8">VERSE OF THE DAY</text>
  <rect x="${OUTER_PAD_X + 256 + 24 + 384 + 24}" y="${headerRuleY.toFixed(1)}" width="256" height="3" rx="1.5" fill="url(#ruleRight)" />

  <!-- Verse text -->
      ${verseLines}

  <!-- Reference -->
  <text x="512" y="${refY.toFixed(1)}" font-family="Merriweather, Georgia, serif" font-weight="700" font-size="${refFontSize.toFixed(1)}" fill="#ffffff" text-anchor="middle" style="text-shadow: 0 2px 6px rgba(0,0,0,0.35)">— ${escapeXml(verse.ref)}</text>

  <!-- Date badge -->
  <rect x="${badgeX.toFixed(1)}" y="${badgeY.toFixed(1)}" width="${badgeW.toFixed(1)}" height="${badgeH.toFixed(1)}" rx="${(badgeH / 2).toFixed(1)}" fill="${dateBadgeBg}" />
  <text x="512" y="${badgeTextY.toFixed(1)}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${badgeFontSize.toFixed(1)}" fill="#ffffff" text-anchor="middle" letter-spacing="${(badgeFontSize * 0.04).toFixed(1)}">${escapeXml(dateStr)}</text>

  <!-- Footer curve -->
  <path d="M102 ${curveY.toFixed(1)} Q512 ${(curveY - 28).toFixed(1)} 922 ${curveY.toFixed(1)}" stroke="url(#footerCurve)" stroke-width="4" fill="none" stroke-linecap="round" />

  <!-- Footer text -->
  <text x="512" y="${footerTextY.toFixed(1)}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="38" fill="#ffffff" text-anchor="middle" letter-spacing="-0.4">KingJamesBibleReader.com</text>
</svg>`;
}

// ── Handler ──
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Parse verse params (query string or JSON body)
    let ref = params.get('ref');
    let book = params.get('book');
    let chapter = params.get('chapter');
    let verseNum = params.get('verse');
    const download = params.get('download') === '1';
    let format = (params.get('format') || 'svg').toLowerCase();

    if (!ref && !book && req.method === 'POST') {
      try {
        const body = await req.json();
        ref = body.ref;
        book = body.book;
        chapter = body.chapter;
        verseNum = body.verse;
        if (body.format && format === 'svg') format = String(body.format).toLowerCase();
      } catch {}
    }

    // Load Bible + logo in parallel
    const [bible, logoUri] = await Promise.all([loadBible(), getLogo()]);

    // Determine verse
    let verse;
    if (ref) {
      verse = verseFromRef(bible, ref);
    } else if (book && chapter) {
      const verses = bible[book]?.[chapter];
      if (verses && verses.length > 0) {
        const vNum = verseNum || verses[0].verse;
        verse = verseFromRef(bible, `${book} ${chapter}:${vNum}`);
      }
    } else {
      // Daily verse — use SDK to load admin controls (pins/exclusions)
      let b44 = null;
      try {
        const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.38');
        b44 = createClientFromRequest(req);
      } catch {}
      verse = await getDailyVerse(bible, b44);
    }

    if (!verse) {
      return Response.json({ error: 'Verse not found' }, { status: 404 });
    }

    // Get today's gradient (by weekday)
    const dayOfWeek = new Date().getDay();
    const gradient = VERSE_BACKGROUNDS[dayOfWeek].hex;

    // Format date as DD/MM/YYYY (matching ShareCard's en-GB format)
    const { y, m, d } = getEasternDate();
    const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

    // Build SVG
    const svg = buildSVG(verse, gradient, dateStr, logoUri);

    const baseFilename = `KJB_${verse.abbr}_${verse.chapter}_${verse.verse}`;
    const disposition = download ? 'attachment' : 'inline';

    // JSON format: verse text + image URLs (for Discord bots).
    // `description` combines verse text + ref into a single ready-to-use
    // string for the Discord embed body (the "box"), so bots can drop it
    // straight into embed.description without reformatting. Leading pilcrows
    // (¶) are stripped since they look odd in plain text context. [brackets]
    // for italics are kept so the bot can convert to markdown if desired.
    // imageWidth/imageHeight let the bot size the embed image correctly.
    if (format === 'json') {
      const baseUrl = `${url.origin}/functions/shareCard`;
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : (book ? `?book=${encodeURIComponent(book)}&chapter=${chapter}${verseNum ? `&verse=${verseNum}` : ''}` : '');
      const cleanText = verse.text.replace(/^¶\s*/, '');
      const description = `"${cleanText}"\n— ${verse.ref}`;
      const jsonResponse: any = {
        ref: verse.ref,
        text: verse.text,
        description,
        date: dateStr,
        imageUrl: `${baseUrl}${qs}`,
        svgUrl: `${baseUrl}${qs}`,
        imageFormat: 'svg',
        imageWidth: CARD_SIZE,
        imageHeight: CARD_SIZE,
      };
      if (verse.superscription) jsonResponse.superscription = verse.superscription;
      if (verse.colophon) jsonResponse.colophon = verse.colophon;
      return Response.json(jsonResponse, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // SVG (default)
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `${disposition}; filename="${baseFilename}.svg"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});