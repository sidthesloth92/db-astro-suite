import { defineEventHandler, getQuery } from 'h3';
import { topCategories } from '../../../../utils/leaderboards';
import {
  parseCategoryMetric,
  parseLimit,
} from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Categories leaderboard — most popular target categories across the community
 * (`?metric=targets|integration`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const metric = parseCategoryMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topCategories(metric, limit);
    return success('LEADERBOARD', 'Categories leaderboard.', {
      board: 'categories',
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
