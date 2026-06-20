import { defineEventHandler, getQuery } from 'h3';
import { topEquipment } from '../../../../utils/leaderboards';
import {
  parseEquipmentKind,
  parseEquipmentMetric,
  parseLimit,
} from '../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../utils/respond';

/**
 * Equipment leaderboard — most popular cameras or telescopes across the community
 * (`?kind=camera|telescope`, `?metric=integration|users|frames`, `?limit=`).
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const kind = parseEquipmentKind(query['kind']);
    const metric = parseEquipmentMetric(query['metric']);
    const limit = parseLimit(query['limit']);
    const entries = await topEquipment(kind, metric, limit);
    return success('LEADERBOARD', 'Equipment leaderboard.', {
      board: 'equipment',
      kind,
      metric,
      entries,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
