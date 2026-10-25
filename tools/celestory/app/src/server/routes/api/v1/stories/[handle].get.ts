import { defineEventHandler, getRouterParam } from 'h3';
import { getDb } from '../../../../utils/db';
import { normalizeHandle } from '../../../../utils/handle';
import { success, toErrorResponse } from '../../../../utils/respond';
import { StoryNotFoundError } from '../../../../utils/celestory.error';
import { toStoredStory } from '../../../../utils/stored-story.util';

/**
 * Return the stored story blob for a handle so the portfolio page can render
 * it. The blob is the source of truth; denormalized columns are for stats.
 * Private fields are stripped on the way out too, so rows saved before
 * stripping existed never expose them.
 */
export default defineEventHandler(async (event) => {
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const sql = getDb();

    const rows = await sql`
      SELECT handle, story_json, created_at
      FROM stories
      WHERE handle = ${handle}
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new StoryNotFoundError(handle);
    }

    const row = rows[0] as {
      handle: string;
      story_json: string;
      created_at: string;
    };

    return success('STORY_FOUND', 'Story found.', {
      handle: row.handle,
      createdAt: row.created_at,
      story: toStoredStory(JSON.parse(row.story_json) as unknown),
    });
  } catch (error) {
    return toErrorResponse(event, error);
  }
});
