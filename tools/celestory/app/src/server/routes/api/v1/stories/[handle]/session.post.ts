import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../../utils/db';
import { normalizeHandle } from '../../../../../utils/handle';
import { verifyPassword } from '../../../../../utils/password';
import { signSession } from '../../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../../utils/respond';
import { BadPasswordError, StoryNotFoundError } from '../../../../../utils/celestory.error';

/**
 * Owner login — verify the profile password (scrypt) and, on success, mint a
 * stateless management session token. The client holds it in sessionStorage and
 * presents it (as a Bearer token) to edit or delete the profile. No password is
 * ever stored client-side.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
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
    if (!row.password_hash || !(await verifyPassword(password, row.password_hash))) {
      throw new BadPasswordError();
    }

    return success('SESSION_CREATED', 'Logged in.', { token: signSession(handle, row.id) });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
