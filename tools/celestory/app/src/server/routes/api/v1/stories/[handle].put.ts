import { defineEventHandler, getHeader, getRouterParam, readBody } from 'h3';
import { getDb } from '../../../../utils/db';
import { config } from '../../../../utils/config';
import { normalizeHandle } from '../../../../utils/handle';
import { validateLedger } from '../../../../utils/ledger-validate';
import { extractRows } from '../../../../utils/extract';
import { verifyPassword } from '../../../../utils/password';
import { authorizeSession, extractBearer, signSession } from '../../../../utils/session-token';
import { recordUpload, claimUploads } from '../../../../utils/uploads';
import { success, toErrorResponse } from '../../../../utils/respond';
import { BadPasswordError, StoryNotFoundError } from '../../../../utils/celestory.error';

/**
 * ③ Update — re-publish an existing handle with a fresh ledger. Authorized by a
 * management session token (logged-in owner) OR the profile password (landing
 * re-upload flow); then replaces the ledger + recomputed totals and rebuilds
 * the child rows in a single transaction. The handle is unchanged; a fresh
 * session token is returned so the owner stays logged in.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const body = await readBody<{ ledger?: unknown; password?: unknown }>(event);
    const password = typeof body?.password === 'string' ? body.password : '';
    const token = extractBearer(getHeader(event, 'authorization'));
    const ledger = validateLedger(body?.ledger);
    const rows = extractRows(ledger);
    const ledgerJson = JSON.stringify(body?.ledger);

    const sql = getDb();
    const found = await sql`
      SELECT id, password_hash FROM stories WHERE handle = ${handle} LIMIT 1
    `;
    if (found.length === 0) {
      throw new StoryNotFoundError(handle);
    }
    const row = found[0] as { id: string; password_hash: string | null };
    // A valid owner session token authorizes the edit; otherwise fall back to
    // the profile password (used by the landing re-upload flow).
    const viaSession = authorizeSession(token, handle, row.id);
    if (!viaSession && (!row.password_hash || !(await verifyPassword(password, row.password_hash)))) {
      throw new BadPasswordError();
    }

    const storyId = row.id;
    const { totals } = rows;
    await sql`
      UPDATE stories SET
        ledger_json = ${ledgerJson},
        total_integration_seconds = ${totals.totalIntegrationSeconds},
        object_count = ${totals.objectCount},
        night_count = ${totals.nightCount},
        light_frame_count = ${totals.lightFrameCount},
        first_light = ${totals.firstLight},
        latest_session = ${totals.latestSession}
      WHERE id = ${storyId}
    `;

    // Rebuild child rows: clear the old, insert the new, atomically.
    const rebuild = [
      sql`DELETE FROM story_objects WHERE story_id = ${storyId}`,
      sql`DELETE FROM story_equipment WHERE story_id = ${storyId}`,
      sql`DELETE FROM story_filters WHERE story_id = ${storyId}`,
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
    ];
    await sql.transaction(rebuild);

    // Log the re-publish as an upload event and (re)claim this install's
    // anonymous events under the handle, so a re-publish from a new install
    // folds its totals under the profile. Best-effort: the profile is already
    // updated, so a bookkeeping failure must never fail the update (mirrors the
    // create path).
    if (ledger.installId && ledger.dataFingerprint) {
      try {
        await recordUpload({
          installId: ledger.installId,
          dataFingerprint: ledger.dataFingerprint,
          totalIntegrationSeconds: totals.totalIntegrationSeconds,
          lightFrameCount: totals.lightFrameCount,
          objectCount: totals.objectCount,
        });
        await claimUploads(ledger.installId, handle);
      } catch (bookkeepingError) {
        // Surfaced in the function logs; never propagated to the client.
        console.error('update upload bookkeeping failed (non-fatal):', bookkeepingError);
      }
    }

    const url = `${config.publicBaseUrl.replace(/\/$/, '')}/user/${handle}`;
    return success('STORY_UPDATED', 'Your Celestory was updated.', {
      url,
      handle,
      token: signSession(handle, storyId),
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
