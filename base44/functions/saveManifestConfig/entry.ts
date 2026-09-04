// Admin-only writer for the PWA ManifestConfig entity. Client-side creates hit
// RLS edge cases in some sessions, so writes go through here: we verify the
// caller is an admin, then write with the service role (bypassing client RLS).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { icons, screenshots, revert } = body;

    // Require a logged-in admin session. No bypass key.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Revert: remove the custom config so the manifest falls back to defaults.
    if (revert) {
      const rows = await base44.asServiceRole.entities.ManifestConfig.list('-updated_date', 50);
      for (const r of rows) await base44.asServiceRole.entities.ManifestConfig.delete(r.id);
      return Response.json({ success: true, reverted: true });
    }

    // Merge onto the latest existing config so saving icons alone doesn't wipe
    // screenshots (and vice versa).
    const existing = await base44.asServiceRole.entities.ManifestConfig.list('-updated_date', 1);
    const current = existing && existing[0];

    const payload = {
      icons: Array.isArray(icons) ? icons : (current?.icons || []),
      screenshots: Array.isArray(screenshots) ? screenshots : (current?.screenshots || []),
    };

    let saved;
    if (current) {
      saved = await base44.asServiceRole.entities.ManifestConfig.update(current.id, payload);
    } else {
      saved = await base44.asServiceRole.entities.ManifestConfig.create(payload);
    }

    return Response.json({ success: true, config: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});