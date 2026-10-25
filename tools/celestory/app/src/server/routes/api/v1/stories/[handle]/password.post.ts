import { defineEventHandler, getHeader, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../../utils/db';
import { normalizeHandle } from '../../../../../utils/handle';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../../../../../utils/password';
import { authorizeSession, extractBearer, signSession } from '../../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../../utils/respond';
import {
  BadPasswordError,
  InvalidPasswordError,
  SessionInvalidError,
  StoryNotFoundError,
} from '../../../../../utils/celestory.error';
import { consumeRateLimit, handleSubject } from '../../../../../utils/rate-limit';
import { LOGIN_FAILURE_LIMIT } from '../../../../../utils/rate-limit.constants';

/**
 * Change password — the logged-in owner replaces the profile password by
 * confirming the current one. A wrong current password counts against the
 * handle's login-failure limit (shared with login/delete); a correct one is
 * refunded. Returns a fresh owner token. Sessions on other devices stay valid
 * until they expire (tokens are stateless).
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const token = extractBearer(getHeader(event, 'authorization'));
    const body = await readBody<{ currentPassword?: unknown; newPassword?: unknown }>(event);
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new InvalidPasswordError();
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, password_hash FROM stories WHERE handle = ${handle} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new StoryNotFoundError(handle);
    }
    const row = rows[0] as { id: string; password_hash: string | null };
    if (!authorizeSession(token, handle, row.id)) {
      throw new SessionInvalidError();
    }

    const attempt = await consumeRateLimit(LOGIN_FAILURE_LIMIT, handleSubject(handle));
    if (!row.password_hash || !(await verifyPassword(currentPassword, row.password_hash))) {
      throw new BadPasswordError();
    }
    await attempt.refund();

    await sql`UPDATE stories SET password_hash = ${await hashPassword(newPassword)} WHERE id = ${row.id}`;

    return success('PASSWORD_CHANGED', 'Your password was changed.', {
      token: signSession(handle, row.id),
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
