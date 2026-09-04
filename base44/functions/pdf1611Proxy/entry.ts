// Byte-range proxy for the 1611 facsimile PDF, hosted as a GitHub release
// asset (public repo, ~186MB — too big for GitHub's git-blob size limits, so
// it's a release asset rather than a tracked file). Release assets don't
// send CORS headers, which blocks pdf.js's cross-origin range-request
// fetches from the app's own domain — this function re-serves the same
// bytes with permissive CORS so the browser will allow it. It streams the
// upstream response straight through rather than buffering, so it stays
// cheap regardless of file size.
const ORIGIN_URL = "https://github.com/kingjamesbiblereaderadmin/kjb-1611/releases/download/1611-pdf/1611_The_Authorized_King_James_Bible_text.pdf";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const range = req.headers.get("Range");
    const upstream = await fetch(ORIGIN_URL, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: range ? { Range: range } : {},
      redirect: "follow",
    });

    const headers = new Headers(CORS_HEADERS);
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"]) {
      const v = upstream.headers.get(key);
      if (v) headers.set(key, v);
    }
    if (!headers.has("content-type")) headers.set("content-type", "application/pdf");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }
});
