/**
 * Pan/zoom view state for the stellar-map preview.
 *
 * `zoom` is a scalar multiplier (1 = fit). `panXPct` / `panYPct` are CSS
 * `translate` percentages relative to the layer's own (untransformed) box —
 * using percentages keeps the transform independent of the surrounding
 * `--scale-factor` mobile scale and of the device pixel ratio.
 */
export interface ViewState {
  /** Zoom multiplier; 1 = fit-to-card, clamped to `[MIN_ZOOM, MAX_ZOOM]`. */
  readonly zoom: number;
  /** Horizontal pan as a percentage of the layer width (≤ 0). */
  readonly panXPct: number;
  /** Vertical pan as a percentage of the layer height (≤ 0). */
  readonly panYPct: number;
}
