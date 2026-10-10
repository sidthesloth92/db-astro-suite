/**
 * Client models for the community leaderboards. The board facade returns
 * render-ready entries — the frontend paints them verbatim (only numeric
 * formatting is applied client-side).
 */

/** Time window applied to a board. */
export type Scope = 'all' | 'year' | 'month';

/** One render-ready leaderboard row from the board facade. */
export interface LeaderboardEntry {
  rank: number;
  label: string;
  /** Optional sub line (e.g. a designation or telescope spec). */
  sub?: string;
  /** Optional tag chip (category / sub-type / palette), already formatted. */
  tag?: string;
  /** The value, already in `unit` terms (no client conversion). */
  value: number;
  /** Display unit label, e.g. `h`, `rigs`, `imagers`, `frames`. */
  unit: string;
}

/** A board's render-ready payload. */
export interface Leaderboard {
  board: string;
  scope: Scope;
  entries: LeaderboardEntry[];
}
