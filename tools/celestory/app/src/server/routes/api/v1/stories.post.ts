import { randomUUID } from 'node:crypto';
import { defineEventHandler, readBody } from 'h3';
import { getDb } from '../../../utils/db';
import { config } from '../../../utils/config';
import { normalizeHandle } from '../../../utils/handle';
import { validateLedger } from '../../../utils/ledger-validate';
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
  ledgerJson: string,
  rows: ExtractedRows,
): Promise<string> {
  const sql = getDb();
  const { totals } = rows;
  const storyId = randomUUID();

  await sql.transaction([
    sql`
      INSERT INTO stories (
        id, handle, password_hash, ledger_json,
        total_integration_seconds, object_count, night_count,
        light_frame_count, first_light, latest_session
      ) VALUES (
        ${storyId}, ${handle}, ${passwordHash}, ${ledgerJson},
        ${totals.totalIntegrationSeconds}, ${totals.objectCount}, ${totals.nightCount},
        ${totals.lightFrameCount}, ${totals.firstLight}, ${totals.latestSession}
      )`,
    ...rows.objects.map(
      (o) => sql`
        INSERT INTO story_objects (
          story_id, object_id, designation, category,
          integration_seconds, light_frame_count, night_count
        ) VALUES (
          ${storyId}, ${o.objectId}, ${o.designation}, ${o.category},
          ${o.integrationSeconds}, ${o.lightFrameCount}, ${o.nightCount}
        )`,
    ),
    ...rows.equipment.map(
      (e) => sql`
        INSERT INTO story_equipment (
          story_id, kind, display_name, normalized_key, integration_seconds
        ) VALUES (
          ${storyId}, ${e.kind}, ${e.displayName}, ${e.normalizedKey}, ${e.integrationSeconds}
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
  ]);

  return storyId;
}

/**
 * ② Create — validate the uploaded ledger, claim the handle (password-protected),
 * persist the story and its child rows, and return the shareable URL plus a
 * management session token so the publisher lands directly in owner mode.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ ledger?: unknown; handle?: unknown; password?: unknown }>(event);
    const handle = normalizeHandle(body?.handle);
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new InvalidPasswordError();
    }
    const ledger = validateLedger(body?.ledger);
    const rows = extractRows(ledger);

    const passwordHash = await hashPassword(password);
    const ledgerJson = JSON.stringify(body?.ledger);

    let storyId: string;
    try {
      storyId = await persistStory(handle, passwordHash, ledgerJson, rows);
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        throw new HandleTakenError(handle);
      }
      throw dbError;
    }

    // Append the publish as an upload event (no-op if already logged during a
    // prior visualise), then claim this install's anonymous events under the
    // handle so their totals fold under the profile without double-counting.
    // Identity is absent on manual/legacy ledgers. Best-effort: the profile is
    // already persisted, so a bookkeeping failure must not fail the publish
    // (which would orphan the story and break a retry as "handle taken").
    if (ledger.installId && ledger.dataFingerprint) {
      try {
        await recordUpload({
          installId: ledger.installId,
          dataFingerprint: ledger.dataFingerprint,
          totalIntegrationSeconds: rows.totals.totalIntegrationSeconds,
          lightFrameCount: rows.totals.lightFrameCount,
          objectCount: rows.totals.objectCount,
        });
        await claimUploads(ledger.installId, handle);
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
