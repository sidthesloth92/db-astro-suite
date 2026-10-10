import { defineEventHandler, getHeader, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../utils/db';
import { normalizeHandle } from '../../../../utils/handle';
import { verifyPassword } from '../../../../utils/password';
import { authorizeSession, extractBearer } from '../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../utils/respond';
import { BadPasswordError, SessionInvalidError, StoryNotFoundError } from '../../../../utils/celestory.error';

/**
 * Delete — a destructive action confirmed with the profile password. A profile
 * that has a password MUST re-confirm it (the owner session token alone is not
 * enough); legacy profiles without one fall back to the session token. Bound to
 * this exact story instance; hard deletes the story (child rows cascade) and
 * frees the handle for reuse.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const token = extractBearer(getHeader(event, 'authorization'));
    const body = await readBody<{ password?: unknown }>(event);
    const password = typeof body?.password === 'string' ? body.password : '';

    const sql = getDb();
    const rows = await sql`
      SELECT id, password_hash FROM stories WHERE handle = ${handle} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new StoryNotFoundError(handle);
    }

    const row = rows[0] as { id: string; password_hash: string | null };
    if (row.password_hash) {
      // Profiles with a password must re-confirm it to delete — the owner
      // session token alone is not sufficient for this destructive action.
      if (!(await verifyPassword(password, row.password_hash))) {
        throw new BadPasswordError();
      }
    } else if (!authorizeSession(token, handle, row.id)) {
      // Legacy profiles without a password fall back to the session token.
      throw new SessionInvalidError();
    }

    await sql`DELETE FROM stories WHERE id = ${row.id}`;

    return success('STORY_DELETED', 'Your Celestory was deleted.', { handle });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
