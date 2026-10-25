import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../../utils/db';
import { normalizeHandle } from '../../../../../utils/handle';
import { verifyPassword } from '../../../../../utils/password';
import { signSession } from '../../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../../utils/respond';
import { BadPasswordError, StoryNotFoundError } from '../../../../../utils/celestory.error';
import { consumeRateLimit, handleSubject } from '../../../../../utils/rate-limit';
import { LOGIN_FAILURE_LIMIT } from '../../../../../utils/rate-limit.constants';

/**
 * Owner login — verify the profile password (scrypt) and, on success, mint a
 * stateless management session token. The client holds it in sessionStorage and
 * presents it (as a Bearer token) to edit or delete the profile. No password is
 * ever stored client-side. Wrong passwords count against the handle's
 * login-failure limit (counted up front so parallel guesses can't slip under
 * it; refunded when the password is right or the attempt fails for another
 * reason). Once it's used up, attempts are refused until the window resets.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const attempt = await consumeRateLimit(LOGIN_FAILURE_LIMIT, handleSubject(handle));

    let row: { id: string; password_hash: string | null };
    try {
      const body = await readBody<{ password?: unknown }>(event);
      const password = typeof body?.password === 'string' ? body.password : '';

      const sql = getDb();
      const rows = await sql`
        SELECT id, password_hash FROM stories WHERE handle = ${handle} LIMIT 1
      `;
      if (rows.length === 0) {
        throw new StoryNotFoundError(handle);
      }

      row = rows[0] as { id: string; password_hash: string | null };
      if (!row.password_hash || !(await verifyPassword(password, row.password_hash))) {
        throw new BadPasswordError();
      }
    } catch (error) {
      // Only a wrong password keeps the counted hit.
      if (!(error instanceof BadPasswordError)) {
        await attempt.refund();
      }
      throw error;
    }
    await attempt.refund();

    return success('SESSION_CREATED', 'Logged in.', { token: signSession(handle, row.id) });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
