import { defineEventHandler, getQuery } from 'h3';
import { topObjects } from '../../../../utils/leaderboards';
import { parseLimit, parseObjectMetric } from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Objects leaderboard — most imaged targets across the community
 * (`?metric=integration|imagers|frames|deepest|rarest|comets`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const metric = parseObjectMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topObjects(metric, limit);
    return success('LEADERBOARD', 'Objects leaderboard.', {
      board: 'objects',
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
