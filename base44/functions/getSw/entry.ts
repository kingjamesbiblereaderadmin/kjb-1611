import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
  try {
    // Derive the app origin from the platform-set "base44-api-url" header
    // rather than the client-controlled "Origin" header. This header is
    // injected by the Base44 platform's routing layer based on the actual
    // app being served — not a value the browser/client can freely set.
    const apiUrl = req.headers.get('base44-api-url');
    if (!apiUrl) return Response.json({ error: 'Missing app URL' }, { status: 400 });

    const url = new URL(apiUrl + '/sw.js');

    // Strict validation: only allow https and trusted Base44 domains (exact
    // match or proper subdomain with a dot separator — not substring
    // lookalikes like "fakebase44.app"). This is a defence-in-depth check
    // even though the header is platform-set.
    if (url.protocol !== 'https:') {
      return Response.json({ error: 'Untrusted origin' }, { status: 403 });
    }
    if (!/^(.+\.)?base44\.(app|com)$/i.test(url.hostname)) {
      return Response.json({ error: 'Untrusted origin' }, { status: 403 });
    }

    const text = await fetch(url.href).then(r => r.text());
    return Response.json({
      chunk1: text.substring(0, 1500)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});