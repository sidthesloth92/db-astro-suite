/** Static view chrome for a leaderboard board (presentation identity only). */
import type { Leaderboard, Scope } from './leaderboards.model';

/** The nine community leaderboard board ids. */
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

/** Themed backdrop motif ids (ported from the design). */
export type MotifId =
  | 'clock'
  | 'galaxy'
  | 'sensor'
  | 'equatorial'
  | 'blueprint'
  | 'calendar'
  | 'stack'
  | 'spectrum'
  | 'timeline';

/** Glyph ids for the leaderboard icon set (ported from the design). */
export type LeaderboardIconName =
  | 'clock'
  | 'target'
  | 'gear'
  | 'camera'
  | 'mount'
  | 'telescope'
  | 'calendar'
  | 'frames'
  | 'filter'
  | 'project';

/** Per-board presentation identity used to render tabs + the active board. */
export interface BoardView {
  id: BoardId;
  /** Short tab label. */
  short: string;
  /** Board heading. */
  title: string;
  /** One-line board description. */
  blurb: string;
  /** Accent hex (board identity colour). */
  accent: string;
  /** Accent as an "r,g,b" triple for rgba() backdrops. */
  accentRgb: string;
  /** Icon glyph id. */
  icon: LeaderboardIconName;
  /** Themed backdrop motif id. */
  motif: MotifId;
}

/** A selectable time-window scope option for the segmented control. */
export interface ScopeOption {
  id: Scope;
  label: string;
}

/** Load state for the active board fetch. */
export type BoardLoadState =
  | { status: 'loading' }
  | { status: 'loaded'; board: Leaderboard }
  | { status: 'error' };
