/**
 * Community leaderboard queries — one function per board, each returning the
 * uniform `LeaderboardEntry[]` shape. Leaderboards rank PUBLISHED profiles only
 * (the story_* child tables); the anonymous upload log holds no breakdown.
 *
 * Each query SELECTs `key`, `label`, `value` columns (plus camelCase-quoted meta
 * columns) so a single mapper builds every board's rows. Metric-driven sorts
 * branch in TS — column names/order cannot be safely parameterized.
 */
import { getDb } from './db';
import { MONTH_NAMES } from './leaderboards.constants';
import { classifyPalette } from './leaderboards.util';
import type { LeaderboardEntry } from './leaderboards.model';
import type {
  CategoryMetric,
  EquipmentKind,
  EquipmentMetric,
  FilterMetric,
  MonthView,
  ObjectMetric,
  SpecMetric,
  UserMetric,
} from './leaderboards.types';

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

/** Unit label for a users-board metric. */
function userUnit(metric: UserMetric): string {
  switch (metric) {
    case 'frames':
      return 'frames';
    case 'objects':
      return 'objects';
    case 'nights':
      return 'nights';
    case 'diversity':
      return 'categories';
    case 'longevity':
    case 'pioneer':
    case 'recent':
      return 'days';
    default:
      return 'seconds';
  }
}

/** Top published profiles ranked by the chosen user metric. */
export async function topUsers(
  metric: UserMetric,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  let rows: Array<Record<string, unknown>>;
  let metaKeys: readonly string[] = [];

  switch (metric) {
    case 'frames':
      rows = await sql`
        SELECT handle AS key, handle AS label, light_frame_count AS value
        FROM stories ORDER BY light_frame_count DESC NULLS LAST LIMIT ${limit}`;
      break;
    case 'objects':
      rows = await sql`
        SELECT handle AS key, handle AS label, object_count AS value
        FROM stories ORDER BY object_count DESC NULLS LAST LIMIT ${limit}`;
      break;
    case 'nights':
      rows = await sql`
        SELECT handle AS key, handle AS label, night_count AS value
        FROM stories ORDER BY night_count DESC NULLS LAST LIMIT ${limit}`;
      break;
    case 'longevity':
      metaKeys = ['firstLight', 'latestSession'];
      rows = await sql`
        SELECT handle AS key, handle AS label,
          (latest_session::date - first_light::date) AS value,
          to_char(first_light, 'YYYY-MM-DD') AS "firstLight",
          to_char(latest_session, 'YYYY-MM-DD') AS "latestSession"
        FROM stories
        WHERE first_light IS NOT NULL AND latest_session IS NOT NULL
        ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'pioneer':
      metaKeys = ['firstLight'];
      rows = await sql`
        SELECT handle AS key, handle AS label,
          (CURRENT_DATE - first_light::date) AS value,
          to_char(first_light, 'YYYY-MM-DD') AS "firstLight"
        FROM stories WHERE first_light IS NOT NULL
        ORDER BY first_light ASC LIMIT ${limit}`;
      break;
    case 'diversity':
      rows = await sql`
        SELECT s.handle AS key, s.handle AS label,
          COUNT(DISTINCT so.category) AS value
        FROM stories s JOIN story_objects so ON so.story_id = s.id
        GROUP BY s.handle ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'recent':
      metaKeys = ['publishedAt'];
      rows = await sql`
        SELECT handle AS key, handle AS label,
          (CURRENT_DATE - created_at::date) AS value,
          to_char(created_at, 'YYYY-MM-DD') AS "publishedAt"
        FROM stories ORDER BY created_at DESC LIMIT ${limit}`;
      break;
    default:
      rows = await sql`
        SELECT handle AS key, handle AS label, total_integration_seconds AS value
        FROM stories ORDER BY total_integration_seconds DESC NULLS LAST LIMIT ${limit}`;
  }

  return entriesFrom(rows, userUnit(metric), metaKeys);
}

/** Top imaged objects across the community, ranked by the chosen object metric. */
export async function topObjects(
  metric: ObjectMetric,
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
        SELECT object_id AS key, MAX(designation) AS label,
          COUNT(DISTINCT story_id) AS value,
          MAX(category) AS category, SUM(integration_seconds) AS seconds
        FROM story_objects WHERE object_id IS NOT NULL
        GROUP BY object_id ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'frames':
      unit = 'frames';
      rows = await sql`
        SELECT object_id AS key, MAX(designation) AS label,
          SUM(light_frame_count) AS value,
          MAX(category) AS category, COUNT(DISTINCT story_id) AS imagers
        FROM story_objects WHERE object_id IS NOT NULL
        GROUP BY object_id ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'deepest':
      metaKeys = ['category', 'handle'];
      rows = await sql`
        SELECT so.object_id AS key, so.designation AS label,
          so.integration_seconds AS value,
          so.category AS category, s.handle AS handle
        FROM story_objects so JOIN stories s ON s.id = so.story_id
        WHERE so.object_id IS NOT NULL
        ORDER BY so.integration_seconds DESC NULLS LAST LIMIT ${limit}`;
      break;
    case 'rarest':
      metaKeys = ['category'];
      rows = await sql`
        SELECT object_id AS key, MAX(designation) AS label,
          SUM(integration_seconds) AS value, MAX(category) AS category
        FROM story_objects WHERE object_id IS NOT NULL
        GROUP BY object_id HAVING COUNT(DISTINCT story_id) = 1
        ORDER BY value DESC LIMIT ${limit}`;
      break;
    case 'comets':
      unit = 'imagers';
      metaKeys = ['category', 'seconds'];
      rows = await sql`
        SELECT object_id AS key, MAX(designation) AS label,
          COUNT(DISTINCT story_id) AS value,
          MAX(category) AS category, SUM(integration_seconds) AS seconds
        FROM story_objects
        WHERE object_id IS NOT NULL
          AND (designation ~ '^[Cc]/[0-9]' OR designation ILIKE 'comet%')
        GROUP BY object_id ORDER BY value DESC, seconds DESC LIMIT ${limit}`;
      break;
    default:
      rows = await sql`
        SELECT object_id AS key, MAX(designation) AS label,
          SUM(integration_seconds) AS value,
          MAX(category) AS category, COUNT(DISTINCT story_id) AS imagers
        FROM story_objects WHERE object_id IS NOT NULL
        GROUP BY object_id ORDER BY value DESC LIMIT ${limit}`;
  }

  return entriesFrom(rows, unit, metaKeys);
}

/** Most popular object categories across the community. */
export async function topCategories(
  metric: CategoryMetric,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  if (metric === 'integration') {
    const rows = await sql`
      SELECT category AS key, category AS label,
        SUM(integration_seconds) AS value,
        COUNT(DISTINCT story_id) AS imagers, COUNT(*) AS objects
      FROM story_objects WHERE category IS NOT NULL AND category <> ''
      GROUP BY category ORDER BY value DESC LIMIT ${limit}`;
    return entriesFrom(rows, 'seconds', ['imagers', 'objects']);
  }
  const rows = await sql`
    SELECT category AS key, category AS label, COUNT(*) AS value,
      COUNT(DISTINCT story_id) AS imagers, SUM(integration_seconds) AS seconds
    FROM story_objects WHERE category IS NOT NULL AND category <> ''
    GROUP BY category ORDER BY value DESC LIMIT ${limit}`;
  return entriesFrom(rows, 'objects', ['imagers', 'seconds']);
}

/** Most popular cameras or telescopes, ranked by the chosen equipment metric. */
export async function topEquipment(
  kind: EquipmentKind,
  metric: EquipmentMetric,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  if (metric === 'users') {
    const rows = await sql`
      SELECT equipment_id AS key, MAX(display_name) AS label,
        COUNT(DISTINCT story_id) AS value, SUM(integration_seconds) AS seconds
      FROM story_equipment
      WHERE kind = ${kind} AND equipment_id IS NOT NULL AND equipment_id <> ''
      GROUP BY equipment_id ORDER BY value DESC LIMIT ${limit}`;
    return entriesFrom(rows, 'users', ['seconds']);
  }
  if (metric === 'frames') {
    const rows = await sql`
      SELECT equipment_id AS key, MAX(display_name) AS label,
        SUM(light_frame_count) AS value, COUNT(DISTINCT story_id) AS users
      FROM story_equipment
      WHERE kind = ${kind} AND equipment_id IS NOT NULL AND equipment_id <> ''
      GROUP BY equipment_id ORDER BY value DESC LIMIT ${limit}`;
    return entriesFrom(rows, 'frames', ['users']);
  }
  const rows = await sql`
    SELECT equipment_id AS key, MAX(display_name) AS label,
      SUM(integration_seconds) AS value,
      COUNT(DISTINCT story_id) AS users, SUM(light_frame_count) AS frames
    FROM story_equipment
    WHERE kind = ${kind} AND equipment_id IS NOT NULL AND equipment_id <> ''
    GROUP BY equipment_id ORDER BY value DESC LIMIT ${limit}`;
  return entriesFrom(rows, 'seconds', ['users', 'frames']);
}

/** Most popular telescope specs (focal length or focal ratio), by distinct imagers. */
export async function topSpecs(
  metric: SpecMetric,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  if (metric === 'fRatio') {
    const rows = await sql`
      SELECT ROUND(f_ratio::numeric, 1)::text AS key,
        ('f/' || ROUND(f_ratio::numeric, 1)::text) AS label,
        COUNT(DISTINCT story_id) AS value, SUM(integration_seconds) AS seconds
      FROM story_equipment WHERE kind = 'telescope' AND f_ratio IS NOT NULL
      GROUP BY ROUND(f_ratio::numeric, 1)
      ORDER BY value DESC, seconds DESC LIMIT ${limit}`;
    return entriesFrom(rows, 'users', ['seconds']);
  }
  const rows = await sql`
    SELECT focal_length_mm::text AS key,
      (focal_length_mm::text || 'mm') AS label,
      COUNT(DISTINCT story_id) AS value,
      SUM(integration_seconds) AS seconds, focal_length_mm AS "focalLengthMm"
    FROM story_equipment WHERE kind = 'telescope' AND focal_length_mm IS NOT NULL
    GROUP BY focal_length_mm ORDER BY value DESC, seconds DESC LIMIT ${limit}`;
  return entriesFrom(rows, 'users', ['seconds', 'focalLengthMm']);
}

/** Most-used filters, or the narrowband/broadband split (`palette`). */
export async function topFilters(
  metric: FilterMetric,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();

  if (metric === 'palette') {
    const rows: Array<Record<string, unknown>> = await sql`
      SELECT name, SUM(seconds) AS seconds, SUM(frames) AS frames
      FROM story_filters WHERE name IS NOT NULL AND name <> '' GROUP BY name`;
    const narrowband = { seconds: 0, frames: 0 };
    const broadband = { seconds: 0, frames: 0 };
    for (const row of rows) {
      const target =
        classifyPalette(String(row['name'] ?? '')) === 'narrowband'
          ? narrowband
          : broadband;
      target.seconds += num(row['seconds']);
      target.frames += num(row['frames']);
    }
    const ordered = [
      { key: 'narrowband', label: 'Narrowband', ...narrowband },
      { key: 'broadband', label: 'Broadband', ...broadband },
    ].sort((a, b) => b.seconds - a.seconds);
    return ordered.slice(0, limit).map((bucket, index) => ({
      rank: index + 1,
      key: bucket.key,
      label: bucket.label,
      value: bucket.seconds,
      unit: 'seconds',
      meta: { frames: bucket.frames },
    }));
  }

  if (metric === 'frames') {
    const rows = await sql`
      SELECT name AS key, name AS label, SUM(frames) AS value,
        SUM(seconds) AS seconds
      FROM story_filters WHERE name IS NOT NULL AND name <> ''
      GROUP BY name ORDER BY value DESC LIMIT ${limit}`;
    return entriesFrom(rows, 'frames', ['seconds']);
  }

  const rows = await sql`
    SELECT name AS key, name AS label, SUM(seconds) AS value,
      SUM(frames) AS frames
    FROM story_filters WHERE name IS NOT NULL AND name <> ''
    GROUP BY name ORDER BY value DESC LIMIT ${limit}`;
  return entriesFrom(rows, 'seconds', ['frames']);
}

/** Busiest months across the community — absolute (YYYY-MM) or seasonal (month
 * of year), optionally scoped to a single `year`. */
export async function busiestMonths(
  view: MonthView,
  year: number | null,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();

  if (view === 'seasonality') {
    const rows: Array<Record<string, unknown>> = await sql`
      SELECT EXTRACT(MONTH FROM month)::int AS month_num,
        SUM(integration_seconds) AS value, SUM(light_frame_count) AS frames
      FROM story_object_months
      WHERE month IS NOT NULL
        AND (${year}::int IS NULL OR EXTRACT(YEAR FROM month) = ${year})
      GROUP BY month_num ORDER BY value DESC LIMIT ${limit}`;
    return rows.map((row, index) => {
      const monthNum = num(row['month_num']);
      return {
        rank: index + 1,
        key: String(monthNum),
        label: MONTH_NAMES[monthNum] ?? String(monthNum),
        value: num(row['value']),
        unit: 'seconds',
        meta: { frames: num(row['frames']) },
      };
    });
  }

  const rows = await sql`
    SELECT to_char(month, 'YYYY-MM') AS key, to_char(month, 'Mon YYYY') AS label,
      SUM(integration_seconds) AS value, SUM(light_frame_count) AS frames
    FROM story_object_months
    WHERE month IS NOT NULL
      AND (${year}::int IS NULL OR EXTRACT(YEAR FROM month) = ${year})
    GROUP BY month ORDER BY value DESC LIMIT ${limit}`;
  return entriesFrom(rows, 'seconds', ['frames']);
}

/** Top objects within a given `YYYY-MM-01` month (defaults to the latest month
 * present when `month` is null). */
export async function topObjectsByMonth(
  month: string | null,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT object_id AS key, MAX(designation) AS label,
      SUM(integration_seconds) AS value, SUM(light_frame_count) AS frames,
      MAX(category) AS category, to_char(month, 'YYYY-MM') AS month
    FROM story_object_months
    WHERE object_id IS NOT NULL
      AND month = COALESCE(${month}::date, (SELECT MAX(month) FROM story_object_months))
    GROUP BY object_id, month ORDER BY value DESC LIMIT ${limit}`;
  return entriesFrom(rows, 'seconds', ['category', 'month', 'frames']);
}
