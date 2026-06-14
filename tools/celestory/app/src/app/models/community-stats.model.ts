/**
 * Community aggregates powering the landing "Charted with Celestory so far"
 * counters. Mirrors the `/api/v1/stats` response — aggregate counts only,
 * never any individual ledger data.
 */
export interface CommunityStats {
  /** Distinct deduped upload attempts (install id + data fingerprint pairs). */
  attemptCount: number;
  totalIntegrationSeconds: number;
  objectCount: number;
  lightFrameCount: number;
}
