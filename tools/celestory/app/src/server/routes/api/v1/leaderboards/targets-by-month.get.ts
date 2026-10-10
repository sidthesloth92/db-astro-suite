import { defineEventHandler, getQuery } from 'h3';
import { topTargetsByMonth } from '../../../../utils/leaderboards';
import { parseLimit, parseMonth } from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Top targets within a month — most photographed targets in a given `YYYY-MM`
 * (`?month=`, defaults to the latest month present; `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const month = parseMonth(query['month']);
    const limit = parseLimit(query['limit']);
    const entries = await topTargetsByMonth(month, limit);
    return success('LEADERBOARD', 'Top targets by month.', {
      board: 'targets-by-month',
      metric: 'integration',
      month,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
