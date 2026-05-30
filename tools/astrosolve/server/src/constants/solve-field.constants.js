/**
 * Constants governing how the solve-field command is constructed: the
 * field-of-view presets the client can request, the scale ranges each
 * preset narrows the blind solve to, the adaptive downsample thresholds,
 * and the solve depth schedule.
 *
 * Narrowing the scale range lets solve-field skip index files that can't
 * possibly match the frame, which is the single biggest lever on solve
 * time. `AUTO` keeps the full blind range so an unknown field still solves.
 */

/**
 * Field-of-view presets the client may send as `fov_preset`. Labels in the
 * UI map focal-length ranges to these tiers; the server only cares about the
 * preset key. AUTO is the safe default when the client sends nothing or an
 * unrecognised value.
 */
export const FOV_PRESET = Object.freeze({
  AUTO: "auto",
  WIDE: "wide",
  MEDIUM: "medium",
  NARROW: "narrow",
});

/**
 * The set of accepted preset values, for validation.
 */
export const FOV_PRESET_VALUES = Object.freeze(Object.values(FOV_PRESET));

/**
 * Per-preset blind-solve scale range in `degwidth` units (the angular width
 * of the whole field, in degrees). solve-field is restricted to indices that
 * can match a field in `[low, high]`.
 *
 * AUTO mirrors the original blind range (0.1–34°) so behaviour is unchanged
 * when no preset is supplied. The tiers overlap deliberately at their edges
 * so a focal length sitting on a boundary still solves under either choice.
 *
 *  - WIDE   ~135–300mm  → very wide fields (several degrees to tens of degrees)
 *  - MEDIUM ~300–900mm  → a few degrees down to ~1°
 *  - NARROW 900mm+      → sub-degree fields
 */
export const FOV_SCALE_RANGES = Object.freeze({
  [FOV_PRESET.AUTO]: Object.freeze({ low: 0.1, high: 34.0 }),
  [FOV_PRESET.WIDE]: Object.freeze({ low: 3.0, high: 34.0 }),
  [FOV_PRESET.MEDIUM]: Object.freeze({ low: 0.7, high: 5.0 }),
  [FOV_PRESET.NARROW]: Object.freeze({ low: 0.1, high: 1.2 }),
});

/**
 * Adaptive downsample: large images carry enough resolved stars to survive
 * an aggressive 4× downsample (far fewer pixels → much faster source
 * extraction), while near-minimum-resolution inputs keep the gentler 2× so
 * the solve does not lose the stars it needs. The threshold is the larger
 * image dimension in pixels.
 */
export const DOWNSAMPLE = Object.freeze({
  /** Largest image dimension (px) at or above which the aggressive factor applies. */
  LARGE_IMAGE_MIN_DIM_PX: 3000,
  /** Downsample factor for large images. */
  LARGE_FACTOR: 4,
  /** Downsample factor for small images. */
  SMALL_FACTOR: 2,
});

/**
 * solve-field `--depth` schedule. Solving in increasing batches of source
 * stars lets an easy field finish on the first (cheap) pass instead of
 * extracting and matching every source up front.
 */
export const SOLVE_DEPTH = "20,40,60";
