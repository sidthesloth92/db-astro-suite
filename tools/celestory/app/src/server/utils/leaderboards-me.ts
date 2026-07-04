/**
 * Personal-row queries for the authenticated viewer. For user boards this is the
 * viewer's own rank; for item boards it is the viewer's top item (their #1
 * target / main rig / top filter / best month) and that item's community rank.
 * Returns a canonical entry + kind; the route runs it through the same presenter
 * as the public board so the row renders identically. Returns null when the
 * viewer has no data in the scope (the page then shows the Publish CTA).
 */
import { getDb } from './db';
import { MONTH_NAMES } from './leaderboards.constants';
import type { LeaderboardEntry } from './leaderboards.model';
import type { BoardId } from './leaderboards-board.model';
import type { MeResult } from './leaderboards-me.model';
import type { EquipmentKind, Scope } from './leaderboards.types';

/** Coerce a possibly-stringified SQL numeric/bigint into a JS number. */
function num(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

/** Top published profiles metric (integration|frames): the viewer's value + rank. */
async function meUserMetric(
  metric: 'integration' | 'frames',
  scope: Scope,
  storyId: string,
  handle: string,
): Promise<MeResult | null> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> =
    metric === 'frames'
      ? await sql`
          WITH totals AS (
            SELECT story_id, SUM(light_frame_count) AS v,
              RANK() OVER (ORDER BY SUM(light_frame_count) DESC) AS rnk
            FROM story_target_months
            WHERE (
              ${scope} = 'all'
              OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
              OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
            )
            GROUP BY story_id
          )
          SELECT v, rnk FROM totals WHERE story_id = ${storyId}`
      : await sql`
          WITH totals AS (
            SELECT story_id, SUM(integration_seconds) AS v,
              RANK() OVER (ORDER BY SUM(integration_seconds) DESC) AS rnk
            FROM story_target_months
            WHERE (
              ${scope} = 'all'
              OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
              OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
            )
            GROUP BY story_id
          )
          SELECT v, rnk FROM totals WHERE story_id = ${storyId}`;
  if (rows.length === 0) {
    return null;
  }
  const value = num(rows[0]['v']);
  if (!value) {
    return null;
  }
  return {
    kind: 'user',
    entry: {
      rank: num(rows[0]['rnk']),
      key: storyId,
      label: handle,
      value,
      unit: metric === 'frames' ? 'frames' : 'seconds',
    },
  };
}

/** Longest single-target project: the viewer's deepest target effort + its rank. */
async function meProject(
  scope: Scope,
  storyId: string,
  handle: string,
): Promise<MeResult | null> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    WITH efforts AS (
      SELECT story_id, target_id, MAX(designation) AS designation,
        MAX(category) AS category, SUM(integration_seconds) AS v,
        RANK() OVER (ORDER BY SUM(integration_seconds) DESC) AS rnk
      FROM story_target_months
      WHERE target_id IS NOT NULL AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY story_id, target_id
    )
    SELECT v, rnk, designation, category FROM efforts
    WHERE story_id = ${storyId} ORDER BY v DESC LIMIT 1`;
  if (rows.length === 0) {
    return null;
  }
  const value = num(rows[0]['v']);
  if (!value) {
    return null;
  }
  return {
    kind: 'user',
    entry: {
      rank: num(rows[0]['rnk']),
      key: storyId,
      label: handle,
      value,
      unit: 'seconds',
      meta: {
        designation: String(rows[0]['designation'] ?? ''),
        category: String(rows[0]['category'] ?? ''),
      },
    },
  };
}

/** Most-imaged targets: the viewer's #1 target + that target's community rank. */
async function meTarget(scope: Scope, storyId: string): Promise<MeResult | null> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    WITH mine AS (
      SELECT target_id, MAX(designation) AS designation, MAX(category) AS category,
        SUM(integration_seconds) AS v
      FROM story_target_months
      WHERE story_id = ${storyId} AND target_id IS NOT NULL AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY target_id ORDER BY v DESC LIMIT 1
    ),
    community AS (
      SELECT target_id, COUNT(DISTINCT story_id) AS imagers,
        RANK() OVER (ORDER BY COUNT(DISTINCT story_id) DESC) AS rnk
      FROM story_target_months
      WHERE target_id IS NOT NULL AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY target_id
    )
    SELECT m.designation AS label, m.category AS category,
      c.imagers AS value, c.rnk AS rank
    FROM mine m JOIN community c ON c.target_id = m.target_id LIMIT 1`;
  if (rows.length === 0) {
    return null;
  }
  return {
    kind: 'item',
    entry: {
      rank: num(rows[0]['rank']),
      key: String(rows[0]['label'] ?? ''),
      label: String(rows[0]['label'] ?? ''),
      value: num(rows[0]['value']),
      unit: 'imagers',
      meta: { category: String(rows[0]['category'] ?? '') },
    },
  };
}

/** Equipment: the viewer's main gear of the kind + that gear's community rank. */
async function meEquipment(
  kind: EquipmentKind,
  scope: Scope,
  storyId: string,
): Promise<MeResult | null> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    WITH mine AS (
      SELECT em.equipment_id AS equipment_id, SUM(em.integration_seconds) AS v
      FROM story_equipment_months em
      JOIN story_equipment se
        ON se.story_id = em.story_id AND se.equipment_id = em.equipment_id
      WHERE em.story_id = ${storyId} AND se.kind = ${kind} AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND em.month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND em.month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY em.equipment_id ORDER BY v DESC LIMIT 1
    ),
    community AS (
      SELECT em.equipment_id AS equipment_id,
        COUNT(DISTINCT em.story_id) AS users,
        RANK() OVER (ORDER BY COUNT(DISTINCT em.story_id) DESC) AS rnk
      FROM story_equipment_months em
      JOIN story_equipment se
        ON se.story_id = em.story_id AND se.equipment_id = em.equipment_id
      WHERE se.kind = ${kind} AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND em.month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND em.month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY em.equipment_id
    )
    SELECT se.display_name AS label, se.subtype AS subtype,
      se.focal_length_mm AS "focalLengthMm", se.f_ratio AS "fRatio",
      c.users AS value, c.rnk AS rank
    FROM mine m
    JOIN community c ON c.equipment_id = m.equipment_id
    JOIN story_equipment se
      ON se.equipment_id = m.equipment_id AND se.story_id = ${storyId}
    LIMIT 1`;
  if (rows.length === 0) {
    return null;
  }
  const meta: Record<string, string | number> = {};
  if (rows[0]['subtype']) meta['subtype'] = String(rows[0]['subtype']);
  if (rows[0]['focalLengthMm'] !== null && rows[0]['focalLengthMm'] !== undefined) {
    meta['focalLengthMm'] = num(rows[0]['focalLengthMm']);
  }
  if (rows[0]['fRatio'] !== null && rows[0]['fRatio'] !== undefined) {
    meta['fRatio'] = num(rows[0]['fRatio']);
  }
  return {
    kind: 'item',
    entry: {
      rank: num(rows[0]['rank']),
      key: String(rows[0]['label'] ?? ''),
      label: String(rows[0]['label'] ?? ''),
      value: num(rows[0]['value']),
      unit: 'users',
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    },
  };
}

/** Filters: the viewer's most-used filter + that filter's community rank. */
async function meFilter(scope: Scope, storyId: string): Promise<MeResult | null> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    WITH mine AS (
      SELECT name, SUM(seconds) AS v
      FROM story_filter_months
      WHERE story_id = ${storyId} AND name IS NOT NULL AND name <> '' AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY name ORDER BY v DESC LIMIT 1
    ),
    community AS (
      SELECT name, SUM(seconds) AS s,
        RANK() OVER (ORDER BY SUM(seconds) DESC) AS rnk
      FROM story_filter_months
      WHERE name IS NOT NULL AND name <> '' AND (
        ${scope} = 'all'
        OR (${scope} = 'year' AND month >= date_trunc('year', CURRENT_DATE))
        OR (${scope} = 'month' AND month >= date_trunc('month', CURRENT_DATE))
      )
      GROUP BY name
    )
    SELECT m.name AS label, c.s AS value, c.rnk AS rank
    FROM mine m JOIN community c ON c.name = m.name LIMIT 1`;
  if (rows.length === 0) {
    return null;
  }
  return {
    kind: 'item',
    entry: {
      rank: num(rows[0]['rank']),
      key: String(rows[0]['label'] ?? ''),
      label: String(rows[0]['label'] ?? ''),
      value: num(rows[0]['value']),
      unit: 'seconds',
    },
  };
}

/** Best months: the viewer's best month-of-year + that month's community rank. */
async function meMonth(scope: Scope, storyId: string): Promise<MeResult | null> {
  const sql = getDb();
  const rows: Array<Record<string, unknown>> = await sql`
    WITH mine AS (
      SELECT EXTRACT(MONTH FROM month)::int AS mnum, SUM(integration_seconds) AS v
      FROM story_target_months
      WHERE story_id = ${storyId} AND month IS NOT NULL AND (
        ${scope} = 'all'
        OR EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
      GROUP BY mnum ORDER BY v DESC LIMIT 1
    ),
    community AS (
      SELECT EXTRACT(MONTH FROM month)::int AS mnum, SUM(integration_seconds) AS s,
        RANK() OVER (ORDER BY SUM(integration_seconds) DESC) AS rnk
      FROM story_target_months
      WHERE month IS NOT NULL AND (
        ${scope} = 'all'
        OR EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM CURRENT_DATE)
      )
      GROUP BY mnum
    )
    SELECT m.mnum AS mnum, c.s AS value, c.rnk AS rank
    FROM mine m JOIN community c ON c.mnum = m.mnum LIMIT 1`;
  if (rows.length === 0) {
    return null;
  }
  const mnum = num(rows[0]['mnum']);
  return {
    kind: 'item',
    entry: {
      rank: num(rows[0]['rank']),
      key: String(mnum),
      label: MONTH_NAMES[mnum] ?? String(mnum),
      value: num(rows[0]['value']),
      unit: 'seconds',
    },
  };
}

/** Dispatch the personal-row query for a board. */
export function meRow(
  boardId: BoardId,
  scope: Scope,
  storyId: string,
  handle: string,
): Promise<MeResult | null> {
  switch (boardId) {
    case 'hours':
      return meUserMetric('integration', scope, storyId, handle);
    case 'frames':
      return meUserMetric('frames', scope, storyId, handle);
    case 'project':
      return meProject(scope, storyId, handle);
    case 'target':
      return meTarget(scope, storyId);
    case 'cameras':
      return meEquipment('camera', scope, storyId);
    case 'mounts':
      return meEquipment('mount', scope, storyId);
    case 'telescopes':
      return meEquipment('telescope', scope, storyId);
    case 'month':
      return meMonth(scope, storyId);
    case 'filter':
      return meFilter(scope, storyId);
  }
}
