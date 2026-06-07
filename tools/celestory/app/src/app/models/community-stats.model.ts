/**
 * Community aggregates powering the landing "Charted with Celestory so far"
 * counters. Mirrors the `/api/v1/stats` response — aggregate counts only,
 * never any individual ledger data.
 */
export interface CommunityStats {
  storyCount: number;
  totalIntegrationSeconds: number;
  objectCount: number;
  nightCount: number;
  lightFrameCount: number;
}
