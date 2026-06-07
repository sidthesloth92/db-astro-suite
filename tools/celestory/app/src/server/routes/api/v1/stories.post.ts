import { defineEventHandler, readBody } from 'h3';
import { getDb } from '../../../utils/db';
import { config } from '../../../utils/config';
import { normalizeHandle } from '../../../utils/handle';
import { validateLedger } from '../../../utils/ledger-validate';
import { extractRows } from '../../../utils/extract';
import { generateKey, hashKey } from '../../../utils/key';
import { isUniqueViolation } from '../../../utils/pg-error';
import { success, toErrorResponse } from '../../../utils/respond';
import { HandleTakenError } from '../../../utils/celestory.error';
import type { ExtractedRows } from '../../../utils/story.model';

/** Persist the story row plus its child rows; returns the new story id. */
async function persistStory(
  handle: string,
  keyHash: string,
  ledgerJson: string,
  rows: ExtractedRows,
): Promise<string> {
  const sql = getDb();
  const { totals } = rows;

  const inserted = await sql`
    INSERT INTO stories (
      handle, key_hash, ledger_json,
      total_integration_seconds, object_count, night_count,
      light_frame_count, first_light, latest_session
    ) VALUES (
      ${handle}, ${keyHash}, ${ledgerJson},
      ${totals.totalIntegrationSeconds}, ${totals.objectCount}, ${totals.nightCount},
      ${totals.lightFrameCount}, ${totals.firstLight}, ${totals.latestSession}
    )
    RETURNING id
  `;
  const storyId = String((inserted[0] as { id: string }).id);

  const childQueries = [
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

  if (childQueries.length > 0) {
    await sql.transaction(childQueries);
  }

  return storyId;
}

/**
 * ② Create — validate the uploaded ledger, mint a unique handle + one-time
 * key, persist the story and its child rows, and return the shareable URL.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ ledger?: unknown; handle?: unknown }>(event);
    const handle = normalizeHandle(body?.handle);
    const ledger = validateLedger(body?.ledger);
    const rows = extractRows(ledger);

    const key = generateKey();
    const keyHash = hashKey(key);
    const ledgerJson = JSON.stringify(body?.ledger);

    try {
      await persistStory(handle, keyHash, ledgerJson, rows);
    } catch (dbError) {
      if (isUniqueViolation(dbError)) {
        throw new HandleTakenError(handle);
      }
      throw dbError;
    }

    const url = `${config.publicBaseUrl.replace(/\/$/, '')}/${handle}`;
    return success('STORY_CREATED', 'Your Celestory is live.', {
      url,
      handle,
      key,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
