/**
 * Limits, allowed metric sets, and classification data for the community
 * leaderboards. Plain compile-time constants — never inline these in the query,
 * util, or route files.
 */
import type {
  CategoryMetric,
  EquipmentKind,
  EquipmentMetric,
  FilterMetric,
  MonthView,
  ObjectMetric,
  SpecMetric,
  UserMetric,
} from './leaderboards.types';

/** Default number of ranked rows returned when `limit` is absent/invalid. */
export const DEFAULT_LIMIT = 10;

/** Hard cap on `limit` to bound query work and payload size. */
export const MAX_LIMIT = 50;

export const USER_METRICS: readonly UserMetric[] = [
  'integration',
  'frames',
  'objects',
  'nights',
  'longevity',
  'pioneer',
  'diversity',
  'recent',
];
export const DEFAULT_USER_METRIC: UserMetric = 'integration';

export const OBJECT_METRICS: readonly ObjectMetric[] = [
  'integration',
  'imagers',
  'frames',
  'deepest',
  'rarest',
  'comets',
];
export const DEFAULT_OBJECT_METRIC: ObjectMetric = 'integration';

export const CATEGORY_METRICS: readonly CategoryMetric[] = [
  'integration',
  'objects',
];
export const DEFAULT_CATEGORY_METRIC: CategoryMetric = 'objects';

export const EQUIPMENT_METRICS: readonly EquipmentMetric[] = [
  'integration',
  'users',
  'frames',
];
export const DEFAULT_EQUIPMENT_METRIC: EquipmentMetric = 'integration';

export const EQUIPMENT_KINDS: readonly EquipmentKind[] = ['camera', 'telescope'];
export const DEFAULT_EQUIPMENT_KIND: EquipmentKind = 'camera';

export const SPEC_METRICS: readonly SpecMetric[] = ['focalLength', 'fRatio'];
export const DEFAULT_SPEC_METRIC: SpecMetric = 'focalLength';

export const FILTER_METRICS: readonly FilterMetric[] = [
  'seconds',
  'frames',
  'palette',
];
export const DEFAULT_FILTER_METRIC: FilterMetric = 'seconds';

export const MONTH_VIEWS: readonly MonthView[] = ['absolute', 'seasonality'];
export const DEFAULT_MONTH_VIEW: MonthView = 'absolute';

/** Short month names indexed 1..12 (index 0 unused) for seasonality labels. */
export const MONTH_NAMES: readonly string[] = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Normalized filter-name fragments treated as narrowband for the palette board.
 * A filter whose normalized name (lowercased, alphanumerics only) contains any
 * of these is narrowband; everything else is broadband. Covers the common mono
 * lines plus dual/tri-band one-shot filters seen in the data (e.g. SV220, D2).
 */
export const NARROWBAND_FILTER_FRAGMENTS: readonly string[] = [
  'ha',
  'halpha',
  'oiii',
  'o3',
  'sii',
  's2',
  'nii',
  'n2',
  'sho',
  'hoo',
  'hso',
  'dual',
  'duo',
  'tri',
  'nb',
  'sv220',
  'd2',
  'lextreme',
  'lenhance',
  'lultimate',
  'altp',
];
