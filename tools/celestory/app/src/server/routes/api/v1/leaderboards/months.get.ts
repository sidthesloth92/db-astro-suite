import { defineEventHandler, getQuery } from 'h3';
import { busiestMonths } from '../../../../utils/leaderboards';
import {
  parseLimit,
  parseMonthView,
  parseYear,
} from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Months leaderboard — busiest months across the community, either absolute
 * (YYYY-MM) or seasonal (month of year), optionally scoped to a single year
 * (`?view=absolute|seasonality`, `?year=`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const view = parseMonthView(query['view']);
    const year = parseYear(query['year']);
    const limit = parseLimit(query['limit']);
    const entries = await busiestMonths(view, year, limit);
    return success('LEADERBOARD', 'Months leaderboard.', {
      board: 'months',
      metric: view,
      year,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
