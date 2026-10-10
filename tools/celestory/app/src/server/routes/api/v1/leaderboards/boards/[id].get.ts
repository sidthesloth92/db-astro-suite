import { defineEventHandler, getQuery, getRouterParam } from 'h3';
import { getBoardConfig, isBoardId } from '../../../../../utils/leaderboards-boards';
import { presentBoard } from '../../../../../utils/leaderboards-present';
import { parseLimit, parseScope } from '../../../../../utils/leaderboards.util';
import { success, toErrorResponse } from '../../../../../utils/respond';
import { UnknownBoardError } from '../../../../../utils/celestory.error';

/**
 * Board facade — `GET /api/v1/leaderboards/boards/:id?scope=&limit=`. Resolves
 * the board id to its server-side query + display config, runs the scope-aware
 * query, and returns render-ready entries the frontend paints verbatim.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!isBoardId(id)) {
      throw new UnknownBoardError(String(id));
    }
    const config = getBoardConfig(id);
    const query = getQuery(event);
    const scope = parseScope(query['scope']);
    const limit = parseLimit(query['limit']);
    const entries = await config.query(scope, limit);
    return success('LEADERBOARD', `${id} leaderboard.`, {
      board: id,
      scope,
      entries: presentBoard(config, entries),
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
