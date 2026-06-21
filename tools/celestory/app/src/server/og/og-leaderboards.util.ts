/**
 * Assembles the community-wide OG card models (landing + leaderboards) from the
 * existing community-stats and leaderboard queries. Hit at unfurl time, behind
 * the route's CDN cache; the route falls back to a static card on any error.
 */
import { getDb } from '../utils/db';
import { communityStats } from '../utils/uploads';
import { topObjects } from '../utils/leaderboards';
import type { OgLandingModel, OgLeaderboardsModel } from './og-card.model';

/** Rounded integration hours as a bare number string (the card adds "h"). */
function hoursNum(seconds: number): string {
  return Math.round((seconds || 0) / 3600).toLocaleString('en-US');
}

/** Thousands-separated integer label. */
function countLabel(n: number): string {
  return Number(n || 0).toLocaleString('en-US');
}

/** Distinct community-wide target count (sum of per-story counts double-counts). */
async function distinctTargets(): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(DISTINCT object_id)::int AS n FROM story_objects WHERE object_id IS NOT NULL`;
  return Number((rows[0] as { n: number } | undefined)?.n ?? 0);
}

/** Landing card model — community headline totals. */
export async function loadLandingOgModel(): Promise<OgLandingModel> {
  const stats = await communityStats();
  return {
    hours: hoursNum(stats.totalIntegrationSeconds),
    astronomers: countLabel(stats.chartedCount),
    frames: countLabel(stats.lightFrameCount),
  };
}

/** Leaderboards card model — community totals + top / most-imaged target. */
export async function loadLeaderboardsOgModel(): Promise<OgLeaderboardsModel> {
  const [stats, targets, top, imaged] = await Promise.all([
    communityStats(),
    distinctTargets(),
    topObjects('integration', 1),
    topObjects('frames', 1),
  ]);
  return {
    hours: hoursNum(stats.totalIntegrationSeconds),
    astronomers: countLabel(stats.chartedCount),
    targets: countLabel(targets),
    frames: countLabel(stats.lightFrameCount),
    topTarget: top[0]?.label || '—',
    mostImaged: imaged[0]?.label || '—',
  };
}
