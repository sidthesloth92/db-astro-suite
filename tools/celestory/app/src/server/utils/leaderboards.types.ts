/**
 * String-literal unions describing the per-board ranking options for the
 * community leaderboards API. Kept separate from the row/response models per the
 * file-naming conventions.
 */

/** Ranking metric for the all-time target ranking (leaderboards OG card). */
export type TargetMetric =
  | 'integration'
  | 'imagers'
  | 'frames'
  | 'deepest'
  | 'rarest'
  | 'comets';

/** Which kind of gear the equipment board ranks. */
export type EquipmentKind = 'camera' | 'telescope' | 'mount';

/** Time window applied to a board: all-time, current calendar year, or month. */
export type Scope = 'all' | 'year' | 'month';

/** Narrowband / broadband bucket for the filter palette board. */
export type Palette = 'narrowband' | 'broadband';
