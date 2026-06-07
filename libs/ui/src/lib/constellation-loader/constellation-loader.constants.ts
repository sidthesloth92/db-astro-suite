/**
 * Geometry, palette and animation timings for the constellation loader — the
 * brand constellation (identical to the Astrogram phone-post mark) that draws
 * itself in as a plate-solving / loading indicator.
 *
 * The node coordinates are fixed geometry; the colours bind to the shared
 * theme tokens (see {@link CL_COLORS}) so the loader follows the active theme.
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

/**
 * Loader colours, bound to the shared theme tokens so the loader follows the
 * active theme. Emitted into the SVG via inline `style` (presentation
 * attributes can't resolve `var()`); `url(#grad)` strokes inherit the gradient.
 */
export const CL_COLORS = {
  /** Connecting-line / orbit gradient start — themed blue. */
  gradientFrom: 'var(--db-color-neon-blue)',
  /** Connecting-line / orbit gradient end — themed pink. */
  gradientTo: 'var(--db-color-neon-pink)',
  /** Tagged-node reticle ring — themed cyan. */
  reticle: 'var(--db-color-cyan)',
  /** Soft halo behind plain nodes — themed pink. */
  halo: 'var(--db-color-neon-pink)',
  /** Star cores + sparkles. */
  star: '#ffffff',
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
