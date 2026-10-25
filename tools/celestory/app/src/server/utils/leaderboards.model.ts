/**
 * Domain model for one ranked leaderboard row, shared by the board queries and
 * the leaderboards Open Graph card.
 */

/** One ranked row in a leaderboard — uniform across all boards. */
export interface LeaderboardEntry {
  /** 1-based rank within the board. */
  rank: number;
  /** Stable identifier for the ranked subject (handle, target/equipment id,
   * filter name, focal length, month key, …). */
  key: string;
  /** Human-readable label for display. */
  label: string;
  /** The ranking value in `unit` terms. */
  value: number;
  /** What `value` measures: `seconds | frames | targets | imagers | users |
   * nights | days | categories`. */
  unit: string;
  /** Optional board-specific context (designation, category, kind, handle, …). */
  meta?: Record<string, string | number>;
}
