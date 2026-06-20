/**
 * String-literal unions describing the per-board ranking options for the
 * community leaderboards API. Kept separate from the row/response models per the
 * file-naming conventions.
 */

/** Ranking metric for the users board (`/leaderboards/users`). */
export type UserMetric =
  | 'integration'
  | 'frames'
  | 'objects'
  | 'nights'
  | 'longevity'
  | 'pioneer'
  | 'diversity'
  | 'recent';

/** Ranking metric for the objects board (`/leaderboards/objects`). */
export type ObjectMetric =
  | 'integration'
  | 'imagers'
  | 'frames'
  | 'deepest'
  | 'rarest'
  | 'comets';

/** Ranking metric for the categories board (`/leaderboards/categories`). */
export type CategoryMetric = 'integration' | 'objects';

/** Ranking metric for the equipment board (`/leaderboards/equipment`). */
export type EquipmentMetric = 'integration' | 'users' | 'frames';

/** Which kind of gear the equipment board ranks. */
export type EquipmentKind = 'camera' | 'optic';

/** Ranking metric for the optic-specs board (`/leaderboards/specs`). */
export type SpecMetric = 'focalLength' | 'fRatio';

/** Ranking metric for the filters board (`/leaderboards/filters`). */
export type FilterMetric = 'seconds' | 'frames' | 'palette';

/** Aggregation view for the months board (`/leaderboards/months`). */
export type MonthView = 'absolute' | 'seasonality';

/** Narrowband / broadband bucket for the filter palette board. */
export type Palette = 'narrowband' | 'broadband';
