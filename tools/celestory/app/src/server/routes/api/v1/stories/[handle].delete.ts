import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../utils/db';
import { normalizeHandle } from '../../../../utils/handle';
import { verifyKey } from '../../../../utils/key';
import { success, toErrorResponse } from '../../../../utils/respond';
import {
  InvalidKeyError,
  StoryNotFoundError,
} from '../../../../utils/celestory.error';

/**
 * Paste-key delete — verify sha256(key) against the stored hash, then hard
 * delete the story (child rows cascade) and free the handle for reuse.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const body = await readBody<{ key?: unknown }>(event);
    const presentedKey = typeof body?.key === 'string' ? body.key : '';

    const sql = getDb();
    const rows = await sql`
      SELECT id, key_hash FROM stories WHERE handle = ${handle} LIMIT 1
    `;

    if (rows.length === 0) {
      throw new StoryNotFoundError(handle);
    }

    const row = rows[0] as { id: string; key_hash: string };
    if (!presentedKey || !verifyKey(presentedKey, row.key_hash)) {
      throw new InvalidKeyError();
    }

    await sql`DELETE FROM stories WHERE id = ${row.id}`;

    return success('STORY_DELETED', 'Your Celestory was deleted.', { handle });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
