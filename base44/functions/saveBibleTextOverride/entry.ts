// Admin-only writer for BibleTextOverride records (shared verse corrections).
// Direct client-side writes hit RLS "permission denied" even for admins in some
// sessions, so writes go through here: verify the caller is an admin, then use
// the service role (which bypasses client RLS).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { op } = body;

    // Require a logged-in admin session. No bypass key.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Strict input validation for all service-role writes to prevent injection
    // of oversized or malformed data that could corrupt global Bible text.
    const isValidId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 100;
    const isValidText = (v) => typeof v === 'string' && v.length > 0 && v.length <= 10000;
    const isValidNote = (v) => v === undefined || (typeof v === 'string' && v.length <= 500);

    if (op === 'create') {
      const { book, chapter, verse, text, note } = body;
      // verse may be 0 (subscript) or -1 (colophon), so check for null/undefined
      // rather than falsiness.
      if (typeof book !== 'string' || book.length === 0 || book.length > 50) {
        return Response.json({ error: 'Invalid book' }, { status: 400 });
      }
      const chNum = Number(chapter);
      if (!Number.isInteger(chNum) || chNum < 1 || chNum > 200) {
        return Response.json({ error: 'Invalid chapter' }, { status: 400 });
      }
      const vNum = Number(verse);
      if (!Number.isInteger(vNum) || vNum < -1 || vNum > 200) {
        return Response.json({ error: 'Invalid verse' }, { status: 400 });
      }
      if (!isValidText(text)) {
        return Response.json({ error: 'Invalid text' }, { status: 400 });
      }
      if (!isValidNote(note)) {
        return Response.json({ error: 'Invalid note' }, { status: 400 });
      }
      const payload = { book, chapter: chNum, verse: vNum, text };
      if (note) payload.note = note;
      const saved = await base44.asServiceRole.entities.BibleTextOverride.create(payload);
      return Response.json({ success: true, record: saved });
    }

    if (op === 'update') {
      const { id, text } = body;
      if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
      if (!isValidText(text)) return Response.json({ error: 'Invalid text' }, { status: 400 });
      const saved = await base44.asServiceRole.entities.BibleTextOverride.update(id, { text });
      return Response.json({ success: true, record: saved });
    }

    if (op === 'delete') {
      const { id } = body;
      if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
      await base44.asServiceRole.entities.BibleTextOverride.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown op' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});