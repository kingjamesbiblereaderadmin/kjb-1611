import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Delete the user's saved verses
    try {
      await base44.entities.SavedVerse.deleteMany({ created_by_id: user.id });
    } catch (err) {
      console.error('[deleteUserAccount] SavedVerse cleanup failed:', err?.message);
    }

    // Delete the user's settings
    try {
      await base44.entities.UserSetting.deleteMany({ created_by_id: user.id });
    } catch (err) {
      console.error('[deleteUserAccount] UserSetting cleanup failed:', err?.message);
    }

    // Delete the user's reading progress
    try {
      await base44.entities.ReadingProgress.deleteMany({ created_by_id: user.id });
    } catch (err) {
      console.error('[deleteUserAccount] ReadingProgress cleanup failed:', err?.message);
    }

    // Delete the user account itself (user-scoped: user deletes their own record)
    try {
      await base44.entities.User.delete(user.id);
    } catch (err) {
      console.error('[deleteUserAccount] User deletion failed:', err?.message);
      const msg = err?.message || '';
      if (msg.includes('owner')) {
        return Response.json({ error: 'The app owner account cannot be deleted.' }, { status: 403 });
      }
      return Response.json({ error: 'Failed to delete user account' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});