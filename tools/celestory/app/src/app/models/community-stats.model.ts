/**
 * Community aggregates powering the landing "Charted with Celestory so far"
 * counters. Mirrors the `/api/v1/stats` response — aggregate counts only,
 * never any individual ledger data.
 */
export interface CommunityStats {
  /**
   * Distinct owners (install id or claimed handle) who have charted a journey —
   * the "Astrophotographers" counter. The stats endpoint already dedupes to the
   * latest snapshot per owner, so this is a head-count, not a raw attempt total.
   */
  attemptCount: number;
  totalIntegrationSeconds: number;
  objectCount: number;
  lightFrameCount: number;
}
