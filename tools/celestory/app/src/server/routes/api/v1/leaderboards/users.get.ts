import { defineEventHandler, getQuery } from 'h3';
import { topUsers } from '../../../../utils/leaderboards';
import { parseLimit, parseUserMetric } from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Users leaderboard — top published profiles by the chosen metric
 * (`?metric=integration|frames|targets|nights|longevity|pioneer|diversity|recent`,
 * `?limit=`). Ranks published profiles only.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const metric = parseUserMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topUsers(metric, limit);
    return success('LEADERBOARD', 'Users leaderboard.', {
      board: 'users',
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
