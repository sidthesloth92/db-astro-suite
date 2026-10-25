import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../../utils/db';
import { normalizeHandle } from '../../../../../utils/handle';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../../../../../utils/password';
import { signSession } from '../../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../../utils/respond';
import {
  InvalidPasswordError,
  RecoveryCodeIncorrectError,
  StoryNotFoundError,
} from '../../../../../utils/celestory.error';
import { consumeRateLimit, handleSubject } from '../../../../../utils/rate-limit';
import { RECOVERY_LIMIT } from '../../../../../utils/rate-limit.constants';
import {
  formatRecoveryCode,
  generateRecoveryCode,
  normalizeRecoveryCode,
} from '../../../../../utils/recovery-code.util';

/**
 * Forgot password — reset a profile's password with its one-time recovery
 * code. On success the password is replaced, the code is rotated (the old one
 * stops working; the new one is returned once), and an owner session token is
 * minted so the owner lands logged in. Attempts count against the handle's
 * recovery limit (separate from the login limit, so a login lockout never
 * blocks recovery); a correct code is refunded.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const attempt = await consumeRateLimit(RECOVERY_LIMIT, handleSubject(handle));

    let storyId: string;
    let newCode: string;
    try {
      const body = await readBody<{ code?: unknown; newPassword?: unknown }>(event);
      const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new InvalidPasswordError();
      }
      const code = normalizeRecoveryCode(body?.code);

      const sql = getDb();
      const rows = await sql`
        SELECT id, recovery_hash FROM stories WHERE handle = ${handle} LIMIT 1
      `;
      if (rows.length === 0) {
        throw new StoryNotFoundError(handle);
      }
      const row = rows[0] as { id: string; recovery_hash: string | null };
      if (!code || !row.recovery_hash || !(await verifyPassword(code, row.recovery_hash))) {
        throw new RecoveryCodeIncorrectError();
      }

      newCode = generateRecoveryCode();
      const [passwordHash, recoveryHash] = await Promise.all([
        hashPassword(newPassword),
        hashPassword(newCode),
      ]);
      // Swap only if the code is still the one we verified, so two concurrent
      // requests can't both use the same code.
      const updated = await sql`
        UPDATE stories SET password_hash = ${passwordHash}, recovery_hash = ${recoveryHash}
        WHERE id = ${row.id} AND recovery_hash = ${row.recovery_hash}
        RETURNING id
      `;
      if (updated.length === 0) {
        throw new RecoveryCodeIncorrectError();
      }
      storyId = row.id;
    } catch (error) {
      // Only a wrong code keeps the counted attempt.
      if (!(error instanceof RecoveryCodeIncorrectError)) {
        await attempt.refund();
      }
      throw error;
    }
    await attempt.refund();

    return success('PASSWORD_RESET', 'Your password was reset.', {
      token: signSession(handle, storyId),
      recoveryCode: formatRecoveryCode(newCode),
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
