/**
 * Limits, allowed scopes, labels, and classification data for the community
 * leaderboards. Plain compile-time constants — never inline these in the query,
 * util, or route files.
 */
import type { Scope } from './leaderboards.types';

/** Default number of ranked rows returned when `limit` is absent/invalid. */
export const DEFAULT_LIMIT = 10;

/** Hard cap on `limit` to bound query work and payload size. */
export const MAX_LIMIT = 50;

/** Allowed time-window scopes for any board. */
export const SCOPES: readonly Scope[] = ['all', 'year', 'month'];
export const DEFAULT_SCOPE: Scope = 'all';

/** Render-ready tag labels for equipment sub-types (server maps these, not the UI). */
export const SUBTYPE_LABELS: Readonly<Record<string, string>> = {
  mono: 'Mono',
  colour: 'Colour',
  color: 'Colour',
  dslr: 'DSLR',
  harmonic: 'Harmonic',
  equatorial: 'Equatorial',
  tracker: 'Tracker',
  refractor: 'Refractor',
  sct: 'SCT',
  newtonian: 'Newtonian',
  maksutov: 'Maksutov',
  astrograph: 'Astrograph',
};

/** Render-ready tag labels for the filter palette buckets. */
export const PALETTE_LABELS: Readonly<Record<string, string>> = {
  narrowband: 'Narrowband',
  broadband: 'Broadband',
};

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
