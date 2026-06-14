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
};

/** Canonical render order for filters. */
export const FILTER_ORDER: readonly string[] = ['Hα', 'SII', 'OIII', 'L', 'R', 'G', 'B', 'RGB'];

/** Fallback colour for an unrecognised filter name. */
export const FILTER_FALLBACK = '#7af2c8';
