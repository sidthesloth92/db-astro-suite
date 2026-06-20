/**
 * Community aggregates powering the landing "Charted with Celestory so far"
 * counters. Mirrors the `/api/v1/stats` response — aggregate counts only,
 * never any individual ledger data.
 */
export interface CommunityStats {
  /**
   * Celestories charted — every resolved upload (visualise or publish): each
   * claimed owner counted once at their latest snapshot, plus every anonymous
   * upload as its own journey.
   */
  chartedCount: number;
  /** Online, live published profiles ("Live Celestories"). */
  liveCount: number;
  totalIntegrationSeconds: number;
  objectCount: number;
  lightFrameCount: number;
}
