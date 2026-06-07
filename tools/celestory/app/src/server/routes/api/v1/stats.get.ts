import { defineEventHandler } from 'h3';
import { getDb } from '../../../utils/db';
import { success, toErrorResponse } from '../../../utils/respond';
import type { CommunityStats } from '../../../utils/story.model';

/**
 * Community aggregates for the landing page: participating astrophotographers
 * and total community integration, computed on the fly from the stories table.
 */
export default defineEventHandler(async (event) => {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        COUNT(*)::int AS story_count,
        COALESCE(SUM(total_integration_seconds), 0)::bigint AS total_integration_seconds,
        COALESCE(SUM(object_count), 0)::int AS object_count,
        COALESCE(SUM(night_count), 0)::int AS night_count,
        COALESCE(SUM(light_frame_count), 0)::int AS light_frame_count
      FROM stories
    `;

    const row = rows[0] as {
      story_count: number;
      total_integration_seconds: string | number;
      object_count: number;
      night_count: number;
      light_frame_count: number;
    };

    const stats: CommunityStats = {
      storyCount: row.story_count,
      totalIntegrationSeconds: Number(row.total_integration_seconds),
      objectCount: row.object_count,
      nightCount: row.night_count,
      lightFrameCount: row.light_frame_count,
    };

    return success('COMMUNITY_STATS', 'Community statistics.', { ...stats });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
