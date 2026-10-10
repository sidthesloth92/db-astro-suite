import { defineEventHandler, getHeader, getQuery, getRouterParam } from 'h3';
import { getDb } from '../../../../../../utils/db';
import { getBoardConfig, isBoardId } from '../../../../../../utils/leaderboards-boards';
import { presentEntry } from '../../../../../../utils/leaderboards-present';
import { meRow } from '../../../../../../utils/leaderboards-me';
import { parseScope } from '../../../../../../utils/leaderboards.util';
import { authorizeSession, extractBearer, readSession } from '../../../../../../utils/session-token';
import { success, toErrorResponse } from '../../../../../../utils/respond';
import { UnknownBoardError } from '../../../../../../utils/celestory.error';
import type { MeRow } from '../../../../../../utils/leaderboards-me.model';

/**
 * Authenticated personal row — `GET /api/v1/leaderboards/boards/:id/me?scope=`
 * with `Authorization: Bearer <owner-session>`. Returns the viewer's row for the
 * board (their rank on user boards; their top item + its community rank on item
 * boards), render-ready via the same presenter as the public board. Returns
 * `{ row: null }` for any unauthenticated/unauthorized caller or when the viewer
 * has no data in the scope — the page then shows the Publish CTA.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!isBoardId(id)) {
      throw new UnknownBoardError(String(id));
    }
    const config = getBoardConfig(id);
    const scope = parseScope(getQuery(event)['scope']);

    const token = extractBearer(getHeader(event, 'authorization'));
    const session = readSession(token);
    let row: MeRow | null = null;

    if (session) {
      const sql = getDb();
      const found = await sql`
        SELECT id FROM stories WHERE handle = ${session.handle} LIMIT 1
      `;
      const story = found[0] as { id: string } | undefined;
      if (story && authorizeSession(token, session.handle, story.id)) {
        const result = await meRow(id, scope, story.id, session.handle);
        if (result) {
          row = { ...presentEntry(config, result.entry), kind: result.kind };
        }
      }
    }

    return success('LEADERBOARD_ME', `${id} personal row.`, {
      board: id,
      scope,
      row,
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
