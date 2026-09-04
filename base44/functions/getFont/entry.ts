// Serves OpenDyslexic font files from a same-origin endpoint so the browser's
// @font-face request succeeds without a cross-origin CDN dependency (jsDelivr
// was intermittently slow/unreachable, causing Comic Sans fallback).
// The service worker caches these responses (cache-first) for offline use.

const FONT_URLS: Record<string, string> = {
  regular: 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff',
  bold: 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff',
  italic: 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Italic.woff',
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const font = url.searchParams.get('font') || 'regular';
    const targetUrl = FONT_URLS[font];
    if (!targetUrl) {
      return Response.json({ error: 'Invalid font. Use ?font=regular|bold|italic' }, { status: 400 });
    }
    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      return Response.json({ error: 'Font fetch failed' }, { status: 502 });
    }
    const buf = await resp.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'font/woff',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});