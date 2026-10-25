/**
 * All-time community target ranking, returning the uniform `LeaderboardEntry[]`
 * shape. Used by the leaderboards Open Graph card; the leaderboards page itself
 * is served by the scope-aware board queries in `leaderboards-scoped.ts`.
 * Ranks PUBLISHED profiles only (the story_* child tables).
 *
 * The query SELECTs `key`, `label`, `value` columns (plus camelCase-quoted meta
 * columns) so a single mapper builds the rows. Metric-driven sorts branch in TS
 * — column names/order cannot be safely parameterized.
 */
import { getDb } from './db';
import type { LeaderboardEntry } from './leaderboards.model';
import type { TargetMetric } from './leaderboards.types';

/** Coerce a possibly-stringified SQL numeric/bigint into a JS number. */
function num(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

/** Coerce a meta column value: numeric strings → number, everything else → string. */
function coerceMeta(value: unknown): string | number {
  if (typeof value === 'number') {
    return value;
  }
  const text = String(value);
  const parsed = Number(text);
  return text !== '' && Number.isFinite(parsed) ? parsed : text;
}

/** Build a ranked entry from a SQL row that exposes key/label/value (+ meta cols). */
function buildEntry(
  row: Record<string, unknown>,
  rank: number,
  unit: string,
  metaKeys: readonly string[],
): LeaderboardEntry {
  const entry: LeaderboardEntry = {
    rank,
    key: String(row['key'] ?? ''),
    label: String(row['label'] ?? ''),
    value: num(row['value']),
    unit,
  };
  const meta: Record<string, string | number> = {};
  for (const metaKey of metaKeys) {
    const raw = row[metaKey];
    if (raw !== null && raw !== undefined) {
      meta[metaKey] = coerceMeta(raw);
    }
  }
  if (Object.keys(meta).length > 0) {
    entry.meta = meta;
  }
  return entry;
}

/** Map an ordered set of key/label/value rows into ranked leaderboard entries. */
function entriesFrom(
  rows: Array<Record<string, unknown>>,
  unit: string,
  metaKeys: readonly string[] = [],
): LeaderboardEntry[] {
  return rows.map((row, index) => buildEntry(row, index + 1, unit, metaKeys));
}

/** Top imaged targets across the community, ranked by the chosen target metric. */
export async function topTargets(
  metric: TargetMetric,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  let rows: Array<Record<string, unknown>>;
  let unit = 'seconds';
  let metaKeys: readonly string[] = ['category', 'imagers'];

  switch (metric) {
    case 'imagers':
      unit = 'imagers';
      metaKeys = ['category', 'seconds'];
      rows = await sql`
        SELECT target_id AS key, MAX(designation) AS label,
          COUNT(DISTINCT story_id) AS value,
          MAX(category) AS category, SUM(integration_seconds) AS seconds
        FROM story_targets WHERE target_id IS NOT NULL
        GROUP BY target_id ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'frames':
      unit = 'frames';
      rows = await sql`
        SELECT target_id AS key, MAX(designation) AS label,
          SUM(light_frame_count) AS value,
          MAX(category) AS category, COUNT(DISTINCT story_id) AS imagers
        FROM story_targets WHERE target_id IS NOT NULL
        GROUP BY target_id ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'deepest':
      metaKeys = ['category', 'handle'];
      rows = await sql`
        SELECT so.target_id AS key, so.designation AS label,
          so.integration_seconds AS value,
          so.category AS category, s.handle AS handle
        FROM story_targets so JOIN stories s ON s.id = so.story_id
        WHERE so.target_id IS NOT NULL
        ORDER BY so.integration_seconds DESC NULLS LAST LIMIT ${limit}`;
      break;
    case 'rarest':
      metaKeys = ['category'];
      rows = await sql`
        SELECT target_id AS key, MAX(designation) AS label,
          SUM(integration_seconds) AS value, MAX(category) AS category
        FROM story_targets WHERE target_id IS NOT NULL
        GROUP BY target_id HAVING COUNT(DISTINCT story_id) = 1
        ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'comets':
      unit = 'imagers';
      metaKeys = ['category', 'seconds'];
      rows = await sql`
        SELECT target_id AS key, MAX(designation) AS label,
          COUNT(DISTINCT story_id) AS value,
          MAX(category) AS category, SUM(integration_seconds) AS seconds
        FROM story_targets
        WHERE target_id IS NOT NULL
          AND (designation ~ '^[Cc]/[0-9]' OR designation ILIKE 'comet%')
        GROUP BY target_id ORDER BY value DESC, seconds DESC LIMIT ${limit}`;
      break;
    default:
      rows = await sql`
        SELECT target_id AS key, MAX(designation) AS label,
          SUM(integration_seconds) AS value,
          MAX(category) AS category, COUNT(DISTINCT story_id) AS imagers
        FROM story_targets WHERE target_id IS NOT NULL
        GROUP BY target_id ORDER BY value DESC LIMIT ${limit}`;
  }

  return entriesFrom(rows, unit, metaKeys);
}
