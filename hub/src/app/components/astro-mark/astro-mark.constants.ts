/**
 * Geometry + palette for the Astrogram brand mark (phone-post constellation).
 * Ported verbatim from the design prototype. These are logo illustration data
 * (fixed brand gradient colours), not themeable UI tokens.
 */

/** Constellation node coordinates, expressed in the 140×140 viewBox. */
export const AG_P: readonly (readonly [number, number])[] = [
  [44, 40],
  [92, 32],
  [108, 70],
  [74, 68],
  [40, 86],
  [96, 104],
  [60, 108],
];

/** Edges connecting `AG_P` nodes by index. */
export const AG_L: readonly (readonly [number, number])[] = [
  [0, 3],
  [1, 3],
  [3, 2],
  [2, 5],
  [3, 4],
  [4, 6],
  [6, 5],
];

/** Indices of the "big" (tagged) constellation nodes. */
export const AG_BIG: readonly number[] = [3, 1];

/** Astrogram mark palette — brand illustration colours (not theme tokens). */
export const AG_PAL = {
  /** Diagonal gradient stops (blue → purple → pink). */
  g: ['#4f7cff', '#a855f7', '#ff2a7b'],
  /** Vertical gradient stops for the phone frame (pink → purple → blue). */
  gv: ['#ff2a7b', '#a855f7', '#4f7cff'],
  /** Cyan accent used for the tagged constellation ring. */
  tag: '#19e6dd',
  /** Pink fill for the Instagram heart glyph. */
  heart: '#ff2a7b',
  /** Purple halo behind plain constellation nodes. */
  spark: '#a855f7',
} as const;
