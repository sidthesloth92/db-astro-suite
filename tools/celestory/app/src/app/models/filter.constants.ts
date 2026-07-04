/**
 * Astrophotography filter signature colours and metadata, keyed by the display
 * name the CLI emits (Hα, OIII, …). These are real emission/broadband colours
 * (data-viz colours, not brand theme tokens) so each filter reads true.
 */

/** One filter's display metadata. */
export interface FilterMeta {
  /** Display label. */
  label: string;
  /** Signature colour. */
  color: string;
  /** Long description (wavelength / band). */
  long: string;
}

/** Filter metadata by display name. */
export const FILTER_META: Readonly<Record<string, FilterMeta>> = {
  'Hα': { label: 'Hα', color: '#ff4d6d', long: 'Hydrogen-α · 656nm' },
  SII: { label: 'SII', color: '#c01f3a', long: 'Sulfur-II · 672nm' },
  OIII: { label: 'OIII', color: '#22d3c5', long: 'Oxygen-III · 500nm' },
  L: { label: 'L', color: '#e9edf4', long: 'Luminance' },
  R: { label: 'R', color: '#f0533f', long: 'Red' },
  G: { label: 'G', color: '#46cf7c', long: 'Green' },
  B: { label: 'B', color: '#4d8df0', long: 'Blue' },
  RGB: { label: 'RGB', color: '#00e5ff', long: 'One-shot colour' },
  OSC: { label: 'OSC', color: '#00e5ff', long: 'One-shot colour (Bayer)' },
  'No Filter': { label: 'No Filter', color: '#9ca3af', long: 'No filter in the light path' },
};

/** Canonical render order for filters. */
export const FILTER_ORDER: readonly string[] = [
  'Hα',
  'SII',
  'OIII',
  'L',
  'R',
  'G',
  'B',
  'RGB',
  'OSC',
  'No Filter',
];

/** Fallback colour for an unrecognised filter name. */
export const FILTER_FALLBACK = '#7af2c8';

/**
 * Fallback palette for unrecognised filter names (brand dual-bands like
 * SV220, D2, L-eXtreme, …). Assigned deterministically per story so no two
 * filters share a colour; curated to stay distinct from the signature colours
 * above. The first entry is the legacy single-fallback mint.
 */
export const FILTER_FALLBACK_PALETTE: readonly string[] = [
  '#7af2c8', // mint
  '#c084fc', // violet
  '#fbbf24', // amber
  '#f472b6', // orchid
  '#818cf8', // periwinkle
  '#a3e635', // lime
  '#38bdf8', // sky
  '#fb923c', // orange
];
