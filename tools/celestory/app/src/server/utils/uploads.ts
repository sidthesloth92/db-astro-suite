/**
 * The anonymous upload event log. Each visualise/publish appends one compact
 * event (install anchor + three headline integers), deduped on
 * (installId, dataFingerprint). Community totals are replayed as the latest
 * event per owner. The profile id is never read from the client payload — it is
 * assigned only by the password-gated publish claim.
 */
import { getDb } from './db';
import { PingIdentityError } from './celestory.error';
import type { CommunityStats, LedgerUpload } from './story.model';

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
 * Validate an unknown request body into a LedgerUpload. Throws PingIdentityError
 * when the dedup identity (installId + dataFingerprint) is absent. Any
 * client-supplied profile id is deliberately ignored.
 */
export function parseUpload(raw: unknown): LedgerUpload {
  const record =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const installId = strField(record, 'installId');
  const dataFingerprint = strField(record, 'dataFingerprint');
  if (!installId || !dataFingerprint) {
    throw new PingIdentityError();
  }
  return {
    installId,
    dataFingerprint,
    totalIntegrationSeconds: intField(record, 'totalIntegrationSeconds'),
    lightFrameCount: intField(record, 'lightFrameCount'),
    objectCount: intField(record, 'objectCount'),
  };
}

/**
 * Append an upload event, deduped on (install_id, data_fingerprint). A repeat
 * upload of the same data from the same install is a no-op. profile_id is left
 * NULL — only the publish claim attaches a handle.
 */
export async function recordUpload(upload: LedgerUpload): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO ledger_uploads (
      install_id, data_fingerprint,
      total_integration_seconds, light_frame_count, object_count
    ) VALUES (
      ${upload.installId}, ${upload.dataFingerprint},
      ${upload.totalIntegrationSeconds}, ${upload.lightFrameCount}, ${upload.objectCount}
    )
    ON CONFLICT (install_id, data_fingerprint) DO NOTHING
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
    UPDATE ledger_uploads
    SET profile_id = ${handle}
    WHERE install_id = ${installId} AND profile_id IS NULL
  `;
}

/**
 * Replay the community totals: the latest event per owner
 * (COALESCE(profile_id, install_id)), summed. Idempotent and rebuildable —
 * adding frames and re-uploading replaces an owner's snapshot, never doubles it.
 */
export async function communityStats(): Promise<CommunityStats> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      COUNT(*)::int AS attempt_count,
      COALESCE(SUM(total_integration_seconds), 0)::bigint AS total_integration_seconds,
      COALESCE(SUM(object_count), 0)::int AS object_count,
      COALESCE(SUM(light_frame_count), 0)::int AS light_frame_count
    FROM (
      SELECT DISTINCT ON (COALESCE(profile_id, install_id))
        total_integration_seconds, object_count, light_frame_count
      FROM ledger_uploads
      ORDER BY COALESCE(profile_id, install_id), uploaded_at DESC
    ) latest
  `;
  const row = rows[0] as {
    attempt_count: number;
    total_integration_seconds: string | number;
    object_count: number;
    light_frame_count: number;
  };
  return {
    attemptCount: row.attempt_count,
    totalIntegrationSeconds: Number(row.total_integration_seconds),
    objectCount: row.object_count,
    lightFrameCount: row.light_frame_count,
  };
}
