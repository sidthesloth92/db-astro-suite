/**
 * Geometry, palette and animation timings for the constellation loader — the
 * brand constellation (identical to the Astrogram phone-post mark) that draws
 * itself in as a plate-solving / loading indicator.
 *
 * The node coordinates and gradient stops are fixed brand-illustration data
 * (the logo's own colours), NOT themeable UI tokens — kept here so the loader
 * stays pixel-faithful to the mark.
 */

/** Constellation node coordinates, expressed in the 140×140 viewBox. */
export const CL_NODES: readonly (readonly [number, number])[] = [
  [44, 40],
  [92, 32],
  [108, 70],
  [74, 68],
  [40, 86],
  [96, 104],
  [60, 108],
];

/** Edges connecting `CL_NODES` by index (drawn in order). */
export const CL_EDGES: readonly (readonly [number, number])[] = [
  [0, 3],
  [1, 3],
  [3, 2],
  [2, 5],
  [3, 4],
  [4, 6],
  [6, 5],
];

/** Indices of the "big" tagged nodes — sparkle + cyan reticle ring. */
export const CL_BIG: readonly number[] = [3, 1];

/** Brand-illustration palette (gradient stops + cyan accent), not theme tokens. */
export const CL_PALETTE = {
  /** Diagonal gradient start (blue). */
  blue: '#4f7cff',
  /** Diagonal gradient mid (purple) — also the small-node halo. */
  purple: '#a855f7',
  /** Diagonal gradient end (pink). */
  pink: '#ff2a7b',
  /** Cyan reticle ring on the tagged nodes. */
  cyan: '#19e6dd',
} as const;

/** Number of decorative twinkle stars that pop in once the net is drawn. */
export const CL_STAR_COUNT = 16;

/**
 * Stable gradient id. Identical across every loader instance — duplicate ids
 * are harmless here (all gradients are visually identical, and `url(#id)`
 * resolves to the first match) and keep SSR/CSR markup deterministic.
 */
export const CL_GRADIENT_ID = 'dba-cl-grad';

/** Draw-in animation timings (milliseconds). Ported from the motion prototype. */
export const CL_TIMING = {
  /** Per-edge line-draw duration. */
  lineDuration: 520,
  /** Delay between successive edge draws. */
  lineStagger: 120,
  /** Per-node pop-in duration. */
  nodeDuration: 380,
  /** Delay between successive node pop-ins. */
  nodeStagger: 85,
  /** Per-star twinkle-in duration. */
  starDuration: 520,
  /** Delay between successive star twinkles. */
  starStagger: 46,
  /** Reticle-ring breathing-pulse duration (loops forever). */
  ringDuration: 1600,
  /** Extra tail before the whole sequence restarts. */
  loopTailPadding: 1400,
} as const;
