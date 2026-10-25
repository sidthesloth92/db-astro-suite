import { defineEventHandler, getHeader, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../utils/db';
import { normalizeHandle } from '../../../../utils/handle';
import { authorizeSession, extractBearer } from '../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../utils/respond';
import {
  NameInvalidError,
  SessionInvalidError,
  StoryNotFoundError,
} from '../../../../utils/celestory.error';
import { consumeRateLimit, handleSubject } from '../../../../utils/rate-limit';
import { NAME_EDIT_LIMIT } from '../../../../utils/rate-limit.constants';
import { observerWithName } from '../../../../../app/utils/observer-name.util';
import {
  MAX_DISPLAY_NAME_LENGTH,
  OBSERVER_PLACE_SEPARATOR,
} from '../../../../../app/models/observer.constants';

/**
 * Rename — the logged-in owner sets the display name shown on their profile.
 * Changes only the name part of the stored story's `observer` line (any
 * "— Place" part is kept); leaderboard rows are untouched. Authorized by the
 * owner session token, checked before the rate limit so strangers can't use up
 * the owner's allowance; failed updates are refunded.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const token = extractBearer(getHeader(event, 'authorization'));
    const body = await readBody<{ name?: unknown }>(event);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new NameInvalidError(`Names are 1–${MAX_DISPLAY_NAME_LENGTH} characters.`);
    }
    if (name.includes(OBSERVER_PLACE_SEPARATOR)) {
      throw new NameInvalidError(`Names can’t contain “${OBSERVER_PLACE_SEPARATOR}”.`);
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, story_json::jsonb->>'observer' AS observer
      FROM stories WHERE handle = ${handle} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new StoryNotFoundError(handle);
    }
    const row = rows[0] as { id: string; observer: string | null };
    if (!authorizeSession(token, handle, row.id)) {
      throw new SessionInvalidError();
    }

    const renameHit = await consumeRateLimit(NAME_EDIT_LIMIT, handleSubject(handle));
    const observer = observerWithName(row.observer ?? '', name);
    try {
      await sql`
        UPDATE stories
        SET story_json = jsonb_set(story_json::jsonb, '{observer}', to_jsonb(${observer}::text))::text
        WHERE id = ${row.id}
      `;
    } catch (error) {
      await renameHit.refund();
      throw error;
    }

    return success('NAME_UPDATED', 'Your name was updated.', { name, observer });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
