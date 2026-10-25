import { defineEventHandler, getHeader, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../utils/db';
import { config } from '../../../../utils/config';
import { normalizeHandle } from '../../../../utils/handle';
import { authorizeSession, extractBearer, signSession } from '../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../utils/respond';
import { isUniqueViolation } from '../../../../utils/pg-error';
import {
  HandleTakenError,
  NameInvalidError,
  SessionInvalidError,
  StoryNotFoundError,
} from '../../../../utils/celestory.error';
import { consumeRateLimit, handleSubject, storySubject } from '../../../../utils/rate-limit';
import { HANDLE_CHANGE_LIMIT, NAME_EDIT_LIMIT } from '../../../../utils/rate-limit.constants';
import type { RateReservation } from '../../../../utils/rate-limit.model';
import { observerName, observerWithName } from '../../../../../app/utils/observer-name.util';
import {
  MAX_DISPLAY_NAME_LENGTH,
  OBSERVER_PLACE_SEPARATOR,
} from '../../../../../app/models/observer.constants';

/**
 * Edit profile — the logged-in owner changes the display name and/or the
 * handle. Authorized by the owner session token (checked before any rate
 * limit, so strangers can't use up the owner's allowance).
 * - Name: replaces the name part of the stored `observer` line ("— Place"
 *   kept); leaderboard rows are untouched. Limited per handle.
 * - Handle: moves the profile to a new URL. The old handle is released (old
 *   links stop working; anyone may claim it). The upload log's link to the
 *   handle moves in the same transaction so community stats don't double
 *   count. Limited to 2 per day per profile (keyed by id, so renaming can't
 *   reset it). Returns a fresh owner token for the new handle.
 * Failed updates are refunded.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const token = extractBearer(getHeader(event, 'authorization'));
    const body = await readBody<{ name?: unknown; newHandle?: unknown }>(event);

    const wantsName = typeof body?.name === 'string';
    const name = wantsName ? (body.name as string).trim() : '';
    if (wantsName && (!name || name.length > MAX_DISPLAY_NAME_LENGTH)) {
      throw new NameInvalidError(`Names are 1–${MAX_DISPLAY_NAME_LENGTH} characters.`);
    }
    if (wantsName && name.includes(OBSERVER_PLACE_SEPARATOR)) {
      throw new NameInvalidError(`Names can’t contain “${OBSERVER_PLACE_SEPARATOR}”.`);
    }
    const newHandle =
      body?.newHandle === undefined ? handle : normalizeHandle(body.newHandle);
    const changesHandle = newHandle !== handle;

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
    const observer = wantsName ? observerWithName(row.observer ?? '', name) : (row.observer ?? '');

    const hits: RateReservation[] = [];
    if (changesHandle) {
      hits.push(await consumeRateLimit(HANDLE_CHANGE_LIMIT, storySubject(row.id)));
    } else if (wantsName) {
      hits.push(await consumeRateLimit(NAME_EDIT_LIMIT, handleSubject(handle)));
    }

    try {
      const statements = [];
      if (wantsName) {
        statements.push(sql`
          UPDATE stories
          SET story_json = jsonb_set(story_json::jsonb, '{observer}', to_jsonb(${observer}::text))::text
          WHERE id = ${row.id}
        `);
      }
      if (changesHandle) {
        statements.push(
          sql`UPDATE stories SET handle = ${newHandle} WHERE id = ${row.id}`,
          sql`UPDATE story_uploads SET profile_id = ${newHandle} WHERE profile_id = ${handle}`,
        );
      }
      if (statements.length > 0) {
        await sql.transaction(statements);
      }
    } catch (error) {
      await Promise.all(hits.map((hit) => hit.refund()));
      if (isUniqueViolation(error)) {
        throw new HandleTakenError(newHandle);
      }
      throw error;
    }

    return success('PROFILE_UPDATED', 'Your profile was updated.', {
      handle: newHandle,
      name: observerName(observer),
      observer,
      url: `${config.publicBaseUrl.replace(/\/$/, '')}/user/${newHandle}`,
      token: changesHandle ? signSession(newHandle, row.id) : token,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
