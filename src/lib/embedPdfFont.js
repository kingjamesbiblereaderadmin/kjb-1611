// Downloads TrueType font files and registers them with a jsPDF document so the
// exported PDF actually renders in the chosen face (cursive / dyslexic /
// legible). jsPDF only supports TrueType (.ttf) — .otf/.woff won't work.
//
// Returns the registered family name to pass to doc.setFont(family, style).
// If anything fails (offline, CDN down), returns the built-in `fallback` so the
// export still succeeds in a standard font.

// Convert an ArrayBuffer to base64 in chunks (avoids call-stack overflow on
// large fonts via String.fromCharCode(...hugeArray)).
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchFontBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}

/**
 * Embed the given font config into the jsPDF doc.
 * @param {jsPDF} doc
 * @param {object} font  An EXPORT_FONTS entry (may contain `.embed`).
 * @returns {Promise<string>} The font family name to use with doc.setFont().
 */
export async function embedPdfFont(doc, font) {
  const embed = font?.embed;
  if (!embed) return font?.pdf || 'times';

  const { family } = embed;
  const variants = [
    { style: 'normal', url: embed.normal },
    { style: 'bold', url: embed.bold },
    { style: 'italic', url: embed.italic },
  ].filter(v => v.url);

  try {
    let registeredNormal = false;
    for (const v of variants) {
      const b64 = await fetchFontBase64(v.url);
      const fileName = `${family}-${v.style}.ttf`;
      doc.addFileToVFS(fileName, b64);
      doc.addFont(fileName, family, v.style);
      if (v.style === 'normal') registeredNormal = true;
    }
    // jsPDF needs a 'normal' style to exist for the family; bail to fallback if
    // somehow only bold/italic were provided.
    if (!registeredNormal) return font.pdf || 'times';

    // Map any missing styles to the normal face so setFont(family, 'bold'/'italic')
    // never throws — it just reuses the embedded normal glyphs.
    const haveBold = variants.some(v => v.style === 'bold');
    const haveItalic = variants.some(v => v.style === 'italic');
    if (!haveBold) doc.addFont(`${family}-normal.ttf`, family, 'bold');
    if (!haveItalic) doc.addFont(`${family}-normal.ttf`, family, 'italic');

    return family;
  } catch (err) {
    console.error('Font embedding failed, using fallback:', err);
    return font.pdf || 'times';
  }
}