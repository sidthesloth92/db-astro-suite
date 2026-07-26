import { defineEventHandler, getQuery } from 'h3';
import { topFilters } from '../../../../utils/leaderboards';
import { parseFilterMetric, parseLimit } from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Filters leaderboard — most-used filters by seconds/frames, or the
 * narrowband/broadband split (`?metric=seconds|frames|palette`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const metric = parseFilterMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topFilters(metric, limit);
    return success('LEADERBOARD', 'Filters leaderboard.', {
      board: 'filters',
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
