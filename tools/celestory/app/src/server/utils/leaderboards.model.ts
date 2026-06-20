/**
 * Domain models for the community leaderboards API. Every per-board endpoint
 * returns the same uniform `Leaderboard` shape so the (future) UI can render any
 * board with one component.
 */

/** One ranked row in a leaderboard — uniform across all boards. */
export interface LeaderboardEntry {
  /** 1-based rank within the board. */
  rank: number;
  /** Stable identifier for the ranked subject (handle, object/equipment id,
   * filter name, focal length, month key, …). */
  key: string;
  /** Human-readable label for display. */
  label: string;
  /** The ranking value in `unit` terms. */
  value: number;
  /** What `value` measures: `seconds | frames | objects | imagers | users |
   * nights | days | categories`. */
  unit: string;
  /** Optional board-specific context (designation, category, kind, handle, …). */
  meta?: Record<string, string | number>;
}

/** A single leaderboard: which board, the metric applied, and the ranked rows. */
export interface Leaderboard {
  /** Board identifier, e.g. `users`, `objects`, `equipment`, `months`. */
  board: string;
  /** The ranking metric (or view) that produced these rows. */
  metric: string;
  /** Ranked entries, best first. */
  entries: LeaderboardEntry[];
}
