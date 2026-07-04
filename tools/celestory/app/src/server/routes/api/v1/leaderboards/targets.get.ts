import { defineEventHandler, getQuery } from 'h3';
import { topTargets } from '../../../../utils/leaderboards';
import { parseLimit, parseTargetMetric } from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Targets leaderboard — most imaged targets across the community
 * (`?metric=integration|imagers|frames|deepest|rarest|comets`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const metric = parseTargetMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topTargets(metric, limit);
    return success('LEADERBOARD', 'Targets leaderboard.', {
      board: 'targets',
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
