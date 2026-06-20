import { defineEventHandler, getQuery } from 'h3';
import { topSpecs } from '../../../../utils/leaderboards';
import { parseLimit, parseSpecMetric } from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Optic-specs leaderboard — most popular focal lengths or focal ratios across
 * the community, by distinct imagers (`?metric=focalLength|fRatio`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const metric = parseSpecMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topSpecs(metric, limit);
    return success('LEADERBOARD', 'Optic specs leaderboard.', {
      board: 'specs',
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
