/**
 * The anonymous upload event log. Each visualise/publish appends one compact
 * event (install anchor + three headline integers) — append-only, never deduped
 * on insert. Community totals replay each claimed owner once (their latest
 * snapshot) plus every anonymous upload. The profile id is never read from the
 * client payload — it is assigned only by the password-gated publish claim.
 */
import { getDb } from './db';
import { PingIdentityError, PingInvalidError } from './celestory.error';
import { MAX_TARGETS } from './story.constants';
import {
  DATA_FINGERPRINT_PATTERN,
  INSTALL_ID_PATTERN,
  MAX_PING_INTEGRATION_SECONDS,
  MAX_PING_LIGHT_FRAMES,
} from './uploads.constants';
import type { CommunityStats, StoryUpload } from './story.model';

/** Read a finite, non-negative integer from a record field, defaulting to 0. */
function intField(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}

/** Read a trimmed string from a record field, defaulting to ''. */
function strField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate an unknown request body into a StoryUpload. Throws PingIdentityError
 * when the upload identity (installId + dataFingerprint) is absent, and
 * PingInvalidError when it isn't in the CLI's format or a total is beyond any
 * real library (so scripted pings can't push the community counters around).
 * Any client-supplied profile id is deliberately ignored.
 */
export function parseUpload(raw: unknown): StoryUpload {
  const record =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const installId = strField(record, 'installId');
  const dataFingerprint = strField(record, 'dataFingerprint');
  if (!installId || !dataFingerprint) {
    throw new PingIdentityError();
  }
  if (!INSTALL_ID_PATTERN.test(installId) || !DATA_FINGERPRINT_PATTERN.test(dataFingerprint)) {
    throw new PingInvalidError('Upload identity is not in the Celestory CLI format.');
  }
  const upload: StoryUpload = {
    installId,
    dataFingerprint,
    totalIntegrationSeconds: intField(record, 'totalIntegrationSeconds'),
    lightFrameCount: intField(record, 'lightFrameCount'),
    targetCount: intField(record, 'targetCount'),
  };
  if (
    upload.totalIntegrationSeconds > MAX_PING_INTEGRATION_SECONDS ||
    upload.lightFrameCount > MAX_PING_LIGHT_FRAMES ||
    upload.targetCount > MAX_TARGETS
  ) {
    throw new PingInvalidError('Upload totals are out of range.');
  }
  return upload;
}

/**
 * Append an upload event — one row per upload, never deduped here. An
 * unauthenticated visualise/upload always counts (a repeat of the same file
 * included). profile_id is left NULL; only the publish claim attaches a handle,
 * and the latest-per-owner replay then collapses an authenticated owner's rows
 * so they are not double-counted.
 */
export async function recordUpload(upload: StoryUpload): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO story_uploads (
      install_id, data_fingerprint,
      total_integration_seconds, light_frame_count, target_count
    ) VALUES (
      ${upload.installId}, ${upload.dataFingerprint},
      ${upload.totalIntegrationSeconds}, ${upload.lightFrameCount}, ${upload.targetCount}
    )
  `;
}

/**
 * Claim an install's anonymous upload events under a published handle. Called
 * only from the password-gated publish flow, so attribution can never be forged
 * from the raw upload payload. install_id is preserved for audit.
 */
export async function claimUploads(installId: string, handle: string): Promise<void> {
  if (!installId || !handle) {
    return;
  }
  const sql = getDb();
  await sql`
    UPDATE story_uploads
    SET profile_id = ${handle}
    WHERE install_id = ${installId} AND profile_id IS NULL
  `;
}

/**
 * Replay the community totals from the upload log. The "counted set" is every
 * claimed owner once (their latest snapshot — authenticated users are never
 * double-counted) plus every anonymous upload (each unauthenticated upload is
 * its own journey). `chartedCount` is the counted-set row count; the hour/target/
 * frame totals are its sums. `liveCount` is the published-profile count, read
 * separately from `stories`. No per-user story data is read.
 */
export async function communityStats(): Promise<CommunityStats> {
  const sql = getDb();
  const rows = await sql`
    WITH counted AS (
      SELECT total_integration_seconds, target_count, light_frame_count
      FROM (
        SELECT DISTINCT ON (profile_id)
          total_integration_seconds, target_count, light_frame_count
        FROM story_uploads
        WHERE profile_id IS NOT NULL
        ORDER BY profile_id, uploaded_at DESC
      ) claimed
      UNION ALL
      SELECT total_integration_seconds, target_count, light_frame_count
      FROM story_uploads
      WHERE profile_id IS NULL
    )
    SELECT
      COUNT(*)::int AS charted_count,
      COALESCE(SUM(total_integration_seconds), 0)::bigint AS total_integration_seconds,
      COALESCE(SUM(target_count), 0)::bigint AS target_count,
      COALESCE(SUM(light_frame_count), 0)::bigint AS light_frame_count
    FROM counted
  `;
  const live = await sql`SELECT COUNT(*)::int AS live_count FROM stories`;
  // Sums are bigint (an ::int cast would overflow and fail the whole query on
  // large community totals); the driver returns bigint as a string.
  const row = rows[0] as {
    charted_count: number;
    total_integration_seconds: string | number;
    target_count: string | number;
    light_frame_count: string | number;
  };
  const liveRow = live[0] as { live_count: number };
  return {
    chartedCount: row.charted_count,
    liveCount: liveRow.live_count,
    totalIntegrationSeconds: Number(row.total_integration_seconds),
    targetCount: Number(row.target_count),
    lightFrameCount: Number(row.light_frame_count),
  };
}
