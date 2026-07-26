/**
 * One-off backfill: populate the per-month rollup tables (story_filter_months,
 * story_equipment_months) for every already-published story, by re-running the
 * extractor over its stored story_json. Idempotent — clears and rebuilds each
 * story's rollup rows. Run once after applying the new schema DDL.
 *
 * Usage (from tools/celestory/app):
 *   node --env-file=.env.local --import tsx scripts/backfill-month-rollups.ts
 *
 * Equipment sub-type tags only appear for stories re-published with the updated
 * CLI; this backfill restores time-window data for all existing stories.
 */
import { getDb } from '../src/server/utils/db';
import { extractRows } from '../src/server/utils/extract';
import { validateStory } from '../src/server/utils/story-validate';

async function main(): Promise<void> {
  const sql = getDb();
  const stories = (await sql`SELECT id, handle, story_json FROM stories`) as Array<{
    id: string;
    handle: string;
    story_json: string;
  }>;

  // eslint-disable-next-line no-console
  console.log(`Backfilling month rollups for ${stories.length} stories…`);
  let ok = 0;
  let failed = 0;

  for (const story of stories) {
    try {
      const parsed: unknown = JSON.parse(story.story_json);
      const rows = extractRows(validateStory(parsed));
      await sql.transaction([
        sql`DELETE FROM story_filter_months WHERE story_id = ${story.id}`,
        sql`DELETE FROM story_equipment_months WHERE story_id = ${story.id}`,
        ...rows.filterMonths.map(
          (m) => sql`
            INSERT INTO story_filter_months (story_id, name, month, seconds, frames)
            VALUES (${story.id}, ${m.name}, ${m.month}, ${m.seconds}, ${m.frames})`,
        ),
        ...rows.equipmentMonths.map(
          (m) => sql`
            INSERT INTO story_equipment_months (story_id, equipment_id, month, integration_seconds, light_frame_count)
            VALUES (${story.id}, ${m.equipmentId}, ${m.month}, ${m.integrationSeconds}, ${m.lightFrameCount})`,
        ),
      ]);
      ok += 1;
    } catch (error) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`  ✗ ${story.handle} (${story.id}):`, error);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. ${ok} backfilled, ${failed} failed.`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Backfill failed:', error);
  process.exit(1);
});
