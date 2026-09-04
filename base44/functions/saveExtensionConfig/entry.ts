// Admin-only writer for the ExtensionConfig entity (the download links shown
// on the /extension page). Client-side creates hit RLS edge cases in some
// sessions, so writes go through here: verify the caller is an admin, then
// write with the service role (bypassing client RLS).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { chrome, edge, firefox, opera, version, show_instructions, hero_icon, mockups, revert } = body;

    // Require a logged-in admin session. No bypass key.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Revert: remove the custom config so /extension falls back to defaults.
    if (revert) {
      const rows = await base44.asServiceRole.entities.ExtensionConfig.list('-updated_date', 50);
      for (const r of rows) await base44.asServiceRole.entities.ExtensionConfig.delete(r.id);
      return Response.json({ success: true, reverted: true });
    }

    const existing = await base44.asServiceRole.entities.ExtensionConfig.list('-updated_date', 1);
    const current = existing && existing[0];

    const payload = {
      chrome: typeof chrome === 'string' ? chrome : (current?.chrome || ''),
      edge: typeof edge === 'string' ? edge : (current?.edge || ''),
      firefox: typeof firefox === 'string' ? firefox : (current?.firefox || ''),
      opera: typeof opera === 'string' ? opera : (current?.opera || ''),
      version: typeof version === 'string' ? version : (current?.version || ''),
      show_instructions: typeof show_instructions === 'boolean' ? show_instructions : (typeof current?.show_instructions === 'boolean' ? current.show_instructions : true),
      hero_icon: typeof hero_icon === 'string' ? hero_icon : (current?.hero_icon || ''),
      mockups: Array.isArray(mockups) ? mockups : (current?.mockups || []),
    };

    let saved;
    if (current) {
      saved = await base44.asServiceRole.entities.ExtensionConfig.update(current.id, payload);
    } else {
      saved = await base44.asServiceRole.entities.ExtensionConfig.create(payload);
    }

    return Response.json({ success: true, config: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});