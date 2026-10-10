/**
 * String-literal unions describing the per-board ranking options for the
 * community leaderboards API. Kept separate from the row/response models per the
 * file-naming conventions.
 */

/** Ranking metric for the users board (`/leaderboards/users`). */
export type UserMetric =
  | 'integration'
  | 'frames'
  | 'targets'
  | 'nights'
  | 'longevity'
  | 'pioneer'
  | 'diversity'
  | 'recent';

/** Ranking metric for the targets board (`/leaderboards/targets`). */
export type TargetMetric =
  | 'integration'
  | 'imagers'
  | 'frames'
  | 'deepest'
  | 'rarest'
  | 'comets';

/** Ranking metric for the categories board (`/leaderboards/categories`). */
export type CategoryMetric = 'integration' | 'targets';

/** Ranking metric for the equipment board (`/leaderboards/equipment`). */
export type EquipmentMetric = 'integration' | 'users' | 'frames';

/** Which kind of gear the equipment board ranks. */
export type EquipmentKind = 'camera' | 'telescope' | 'mount';

/** Time window applied to a board: all-time, current calendar year, or month. */
export type Scope = 'all' | 'year' | 'month';

/** Ranking metric for the telescope-specs board (`/leaderboards/specs`). */
export type SpecMetric = 'focalLength' | 'fRatio';

/** Ranking metric for the filters board (`/leaderboards/filters`). */
export type FilterMetric = 'seconds' | 'frames' | 'palette';

/** Aggregation view for the months board (`/leaderboards/months`). */
export type MonthView = 'absolute' | 'seasonality';

/** Narrowband / broadband bucket for the filter palette board. */
export type Palette = 'narrowband' | 'broadband';
