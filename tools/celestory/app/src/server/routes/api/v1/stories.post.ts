import { randomUUID } from 'node:crypto';
import { defineEventHandler, readBody } from 'h3';
import { getDb } from '../../../utils/db';
import { config } from '../../../utils/config';
import { normalizeHandle } from '../../../utils/handle';
import { validateStory } from '../../../utils/story-validate';
import { extractRows } from '../../../utils/extract';
import { signSession } from '../../../utils/session-token';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../../../utils/password';
import { isUniqueViolation } from '../../../utils/pg-error';
import { recordUpload, claimUploads } from '../../../utils/uploads';
import { success, toErrorResponse } from '../../../utils/respond';
import { HandleTakenError, InvalidPasswordError } from '../../../utils/celestory.error';
import type { ExtractedRows } from '../../../utils/story.model';

/**
 * Persist the story row plus its child rows in a single transaction. The id is
 * generated up front so the parent + all children batch atomically — a failure
 * (including a duplicate handle) rolls everything back, so a failed publish can
 * never leave an orphan story row that makes a retry report "handle taken".
 */
async function persistStory(
  handle: string,
  passwordHash: string,
  storyJson: string,
  rows: ExtractedRows,
): Promise<string> {
  const sql = getDb();
  const { totals } = rows;
  const storyId = randomUUID();

  await sql.transaction([
    sql`
      INSERT INTO stories (
        id, handle, password_hash, story_json,
        total_integration_seconds, target_count, night_count,
        light_frame_count, first_light, latest_session
      ) VALUES (
        ${storyId}, ${handle}, ${passwordHash}, ${storyJson},
        ${totals.totalIntegrationSeconds}, ${totals.targetCount}, ${totals.nightCount},
        ${totals.lightFrameCount}, ${totals.firstLight}, ${totals.latestSession}
      )`,
    ...rows.targets.map(
      (o) => sql`
        INSERT INTO story_targets (
          story_id, target_id, designation, category,
          integration_seconds, light_frame_count, night_count
        ) VALUES (
          ${storyId}, ${o.targetId}, ${o.designation}, ${o.category},
          ${o.integrationSeconds}, ${o.lightFrameCount}, ${o.nightCount}
        )`,
    ),
    ...rows.equipment.map(
      (e) => sql`
        INSERT INTO story_equipment (
          story_id, equipment_id, kind, subtype, display_name, normalized_key,
          integration_seconds, light_frame_count, focal_length_mm, f_ratio
        ) VALUES (
          ${storyId}, ${e.equipmentId}, ${e.kind}, ${e.subtype}, ${e.displayName}, ${e.normalizedKey},
          ${e.integrationSeconds}, ${e.lightFrameCount}, ${e.focalLengthMm}, ${e.fRatio}
        )`,
    ),
    ...rows.filters.map(
      (f) => sql`
        INSERT INTO story_filters (
          story_id, name, seconds, frames
        ) VALUES (
          ${storyId}, ${f.name}, ${f.seconds}, ${f.frames}
        )`,
    ),
    ...rows.targetMonths.map(
      (m) => sql`
        INSERT INTO story_target_months (
          story_id, target_id, designation, category,
          month, integration_seconds, light_frame_count
        ) VALUES (
          ${storyId}, ${m.targetId}, ${m.designation}, ${m.category},
          ${m.month}, ${m.integrationSeconds}, ${m.lightFrameCount}
        )`,
    ),
    ...rows.filterMonths.map(
      (m) => sql`
        INSERT INTO story_filter_months (
          story_id, name, month, seconds, frames
        ) VALUES (
          ${storyId}, ${m.name}, ${m.month}, ${m.seconds}, ${m.frames}
        )`,
    ),
    ...rows.equipmentMonths.map(
      (m) => sql`
        INSERT INTO story_equipment_months (
          story_id, equipment_id, month, integration_seconds, light_frame_count
        ) VALUES (
          ${storyId}, ${m.equipmentId}, ${m.month}, ${m.integrationSeconds}, ${m.lightFrameCount}
        )`,
    ),
  ]);

  return storyId;
}

/**
 * ② Create — validate the uploaded story, claim the handle (password-protected),
 * persist the story and its child rows, and return the shareable URL plus a
 * management session token so the publisher lands directly in owner mode.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ story?: unknown; handle?: unknown; password?: unknown }>(event);
    const handle = normalizeHandle(body?.handle);
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new InvalidPasswordError();
    }
    const story = validateStory(body?.story);
    const rows = extractRows(story);

    const passwordHash = await hashPassword(password);
    const storyJson = JSON.stringify(body?.story);

    let storyId: string;
    try {
      storyId = await persistStory(handle, passwordHash, storyJson, rows);
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        throw new HandleTakenError(handle);
      }
      throw dbError;
    }

    // Append the publish as an upload event (the log is append-only), then
    // claim this install's anonymous events under the handle so their totals
    // fold under the profile without double-counting.
    // Identity is absent on manual/legacy storys. Best-effort: the profile is
    // already persisted, so a bookkeeping failure must not fail the publish
    // (which would orphan the story and break a retry as "handle taken").
    if (story.installId && story.dataFingerprint) {
      try {
        await recordUpload({
          installId: story.installId,
          dataFingerprint: story.dataFingerprint,
          totalIntegrationSeconds: rows.totals.totalIntegrationSeconds,
          lightFrameCount: rows.totals.lightFrameCount,
          targetCount: rows.totals.targetCount,
        });
        await claimUploads(story.installId, handle);
      } catch (bookkeepingError) {
        // Surfaced in the function logs; never propagated to the client.
        console.error('publish upload bookkeeping failed (non-fatal):', bookkeepingError);
      }
    }

    const url = `${config.publicBaseUrl.replace(/\/$/, '')}/user/${handle}`;
    return success('STORY_CREATED', 'Your Celestory is live.', {
      url,
      handle,
      token: signSession(handle, storyId),
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
