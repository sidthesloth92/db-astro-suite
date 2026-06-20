/**
 * Scope-aware leaderboard queries for the board facade. Each reads from the
 * per-month rollup tables (story_object_months / story_filter_months /
 * story_equipment_months) so a single board can be sliced All-time / This year /
 * This month. They return the canonical `LeaderboardEntry` shape (raw seconds in
 * `value`, context in `meta`); the presenter converts these to render-ready rows.
 *
 * The Neon HTTP client does not compose nested SQL fragments, so the scope window
 * is expressed inline as a parameterized 3-branch condition on the `month` column
 * (mirroring the existing year-param pattern), evaluated against CURRENT_DATE.
 */
import { getDb } from './db';
import { MONTH_NAMES } from './leaderboards.constants';
import type { LeaderboardEntry } from './leaderboards.model';
import type { EquipmentKind, Scope } from './leaderboards.types';

/** Coerce a possibly-stringified SQL numeric/bigint into a JS number. */
function num(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

/** Build a ranked entry list from ordered key/label/value rows. */
function rank(
  rows: Array<Record<string, unknown>>,
  unit: string,
  meta: (row: Record<string, unknown>) => Record<string, string | number> | undefined,
): LeaderboardEntry[] {
  return rows.map((row, index) => {
    const entry: LeaderboardEntry = {
      rank: index + 1,
      key: String(row['key'] ?? ''),
      label: String(row['label'] ?? ''),
      value: num(row['value']),
      unit,
    };
    const m = meta(row);
    if (m && Object.keys(m).length > 0) {
      entry.meta = m;
    }
    return entry;
  });
}

/** Top published profiles by integration seconds within the scope. */
export async function scopedUserIntegration(
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT s.handle AS key, s.handle AS label,
      SUM(som.integration_seconds) AS value
    FROM story_object_months som JOIN stories s ON s.id = som.story_id
    WHERE (
      ${scope} = 'all'
      OR (${scope} = 'year' AND som.month >= date_trunc('year', CURRENT_DATE))
      OR (${scope} = 'month' AND som.month >= date_trunc('month', CURRENT_DATE))
    )
    GROUP BY s.handle ORDER BY value DESC NULLS LAST LIMIT ${limit}`;
  return rank(rows, 'seconds', () => undefined);
}

/** Top published profiles by light-frame count within the scope. */
export async function scopedUserFrames(
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT s.handle AS key, s.handle AS label,
      SUM(som.light_frame_count) AS value
    FROM story_object_months som JOIN stories s ON s.id = som.story_id
    WHERE (
      ${scope} = 'all'
      OR (${scope} = 'year' AND som.month >= date_trunc('year', CURRENT_DATE))
      OR (${scope} = 'month' AND som.month >= date_trunc('month', CURRENT_DATE))
    )
    GROUP BY s.handle ORDER BY value DESC NULLS LAST LIMIT ${limit}`;
  return rank(rows, 'frames', () => undefined);
}

/** Longest single-target projects: most integration poured into one object by
 * one profile, within the scope (each row is a profile+object effort). */
export async function scopedProjects(
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT s.handle AS key, s.handle AS label,
      MAX(som.designation) AS designation, MAX(som.category) AS category,
      SUM(som.integration_seconds) AS value
    FROM story_object_months som JOIN stories s ON s.id = som.story_id
    WHERE som.object_id IS NOT NULL AND (
      ${scope} = 'all'
      OR (${scope} = 'year' AND som.month >= date_trunc('year', CURRENT_DATE))
      OR (${scope} = 'month' AND som.month >= date_trunc('month', CURRENT_DATE))
    )
    GROUP BY s.handle, som.object_id ORDER BY value DESC NULLS LAST LIMIT ${limit}`;
  return rank(rows, 'seconds', (row) => ({
    designation: String(row['designation'] ?? ''),
    category: String(row['category'] ?? ''),
  }));
}

/** Most-imaged targets by distinct imagers within the scope. */
export async function scopedObjects(
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT som.object_id AS key, MAX(som.designation) AS label,
      COUNT(DISTINCT som.story_id) AS value,
      MAX(som.category) AS category, SUM(som.integration_seconds) AS seconds
    FROM story_object_months som
    WHERE som.object_id IS NOT NULL AND (
      ${scope} = 'all'
      OR (${scope} = 'year' AND som.month >= date_trunc('year', CURRENT_DATE))
      OR (${scope} = 'month' AND som.month >= date_trunc('month', CURRENT_DATE))
    )
    GROUP BY som.object_id ORDER BY value DESC LIMIT ${limit}`;
  return rank(rows, 'imagers', (row) => ({
    category: String(row['category'] ?? ''),
    seconds: num(row['seconds']),
  }));
}

/** Most-used equipment of a kind by distinct profiles within the scope. */
export async function scopedEquipment(
  kind: EquipmentKind,
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT se.equipment_id AS key, MAX(se.display_name) AS label,
      COUNT(DISTINCT em.story_id) AS value,
      MAX(se.subtype) AS subtype,
      MAX(se.focal_length_mm) AS "focalLengthMm", MAX(se.f_ratio) AS "fRatio",
      SUM(em.integration_seconds) AS seconds
    FROM story_equipment_months em
    JOIN story_equipment se
      ON se.story_id = em.story_id AND se.equipment_id = em.equipment_id
    WHERE se.kind = ${kind}
      AND em.equipment_id IS NOT NULL AND em.equipment_id <> ''
      AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND em.month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND em.month >= date_trunc('month', CURRENT_DATE))
      )
    GROUP BY se.equipment_id ORDER BY value DESC LIMIT ${limit}`;
  return rank(rows, 'users', (row) => {
    const meta: Record<string, string | number> = { seconds: num(row['seconds']) };
    if (row['subtype']) meta['subtype'] = String(row['subtype']);
    if (row['focalLengthMm'] !== null && row['focalLengthMm'] !== undefined) {
      meta['focalLengthMm'] = num(row['focalLengthMm']);
    }
    if (row['fRatio'] !== null && row['fRatio'] !== undefined) {
      meta['fRatio'] = num(row['fRatio']);
    }
    return meta;
  });
}

/** Busiest months of the year (seasonality); scope narrows to the current year. */
export async function scopedMonths(
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT EXTRACT(MONTH FROM month)::int AS month_num,
      SUM(integration_seconds) AS value, SUM(light_frame_count) AS frames
    FROM story_object_months
    WHERE month IS NOT NULL AND (
      ${scope} = 'all'
      OR EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM CURRENT_DATE)
    )
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

/** Most-used filters by integration seconds within the scope. */
export async function scopedFilters(
  scope: Scope,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    SELECT name AS key, name AS label, SUM(seconds) AS value, SUM(frames) AS frames
    FROM story_filter_months
    WHERE name IS NOT NULL AND name <> '' AND (
      ${scope} = 'all'
      OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
      OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
    )
    GROUP BY name ORDER BY value DESC LIMIT ${limit}`;
  return rank(rows, 'seconds', (row) => ({ frames: num(row['frames']) }));
}
