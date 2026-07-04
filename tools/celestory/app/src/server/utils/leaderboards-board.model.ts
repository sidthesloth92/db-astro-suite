/**
 * Models for the leaderboard board facade. A board id maps (server-side) to a
 * query + display configuration; the presenter turns canonical query rows into
 * render-ready entries the frontend paints verbatim.
 */
import type { LeaderboardEntry } from './leaderboards.model';
import type { Scope } from './leaderboards.types';

/** The nine community leaderboard boards, by stable id. */
export type BoardId =
  | 'hours'
  | 'frames'
  | 'project'
  | 'target'
  | 'cameras'
  | 'mounts'
  | 'telescopes'
  | 'month'
  | 'filter';

/** How the presenter transforms a board's raw `value` for display. */
export type ValueTransform = 'hours' | 'none';

/** Where the presenter sources an entry's tag chip. */
export type TagSource = 'category' | 'subtype' | 'palette' | 'none';

/** Where the presenter sources an entry's sub line. */
export type SubSource = 'designation' | 'spec' | 'none';

/** Static + behavioural config for one board (the registry value). */
export interface BoardConfig {
  id: BoardId;
  /** Display unit label shown beside the value (e.g. 'h', 'rigs', 'imagers'). */
  unit: string;
  /** Raw→display value transform. */
  transform: ValueTransform;
  /** Tag chip source. */
  tag: TagSource;
  /** Sub line source. */
  sub: SubSource;
  /** Scope-aware query returning canonical entries. */
  query: (scope: Scope, limit: number) => Promise<LeaderboardEntry[]>;
}

/** A render-ready leaderboard row — painted as-is by the frontend. */
export interface RenderEntry {
  rank: number;
  label: string;
  sub?: string;
  tag?: string;
  value: number;
  unit: string;
}

/** The render-ready board payload returned by the facade endpoint. */
export interface RenderedBoard {
  board: BoardId;
  scope: Scope;
  entries: RenderEntry[];
}
