/**
 * Annotation Style Models
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  GlobalAnnotationSettings  ← baseline visual theme for ALL      │
 *  │  AnnotationStyle           ← per-annotation overrides           │
 *  │  Cascade: global → per-annotation (undefined = fall to global)  │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 *  fontFamily is a first-class model field even though the UI picker
 *  is not yet built. The rendering engine already consumes it, so
 *  adding a font-picker later requires ONLY a UI control — no model
 *  or service changes.
 */

/**
 * Per-annotation style overrides. Every field is optional.
 * Absent (undefined) means "inherit from GlobalAnnotationSettings".
 */
export interface AnnotationStyle {
  /** Circle border colour. Overrides global circleColor. */
  color?: string;
  /** Circle border thickness in px. Overrides global thickness. */
  thickness?: number;
  /** Absolute radius in px. When set, replaces the WCS-derived radiusDb. */
  radiusOverride?: number;
  /** Circle opacity 0.0–1.0. Overrides global circleOpacity. */
  opacity?: number;
  /** Label text colour. Overrides global labelColor. */
  labelColor?: string;
  /** Label opacity 0.0–1.0. Overrides global labelOpacity. */
  labelOpacity?: number;
  /** Per-annotation label visibility toggle. Overrides global showLabels. */
  showLabel?: boolean;
  /** Replace the displayed label text (e.g. "Orion Nebula" instead of "M 42"). */
  customLabel?: string;
  // ── future slots (model ready, no UI yet) ────────────────────────
  fontSize?: number;
  // fontFamily?: string;
}

/** Global visual settings applied to every annotation on the map. */
export interface GlobalAnnotationSettings {
  /** Circle border colour (hex / rgb / named). Default '#00f3ff'. */
  color: string;
  /** Circle border thickness in px. Default 2. */
  thickness: number;
  /** Circle opacity (0.0–1.0). Default 0.85. */
  circleOpacity: number;
  /** Label text colour. Default '#00f3ff'. */
  labelColor: string;
  /** Label font size in rem. Default 0.65. */
  fontSize: number;
  /** Label opacity (0.0–1.0). Default 0.85. */
  labelOpacity: number;
  /**
   * Label font family.
   * Already consumed by the renderer — add a UI picker later without
   * touching the model or service.
   */
  fontFamily: string;
}

export const DEFAULT_GLOBAL_ANNOTATION_SETTINGS: GlobalAnnotationSettings = {
  color: '#00f3ff',
  thickness: 2,
  circleOpacity: 0.85,
  labelColor: '#00f3ff',
  fontSize: 0.65,
  labelOpacity: 0.85,
  fontFamily: 'monospace',
};
