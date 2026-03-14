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
  /** CSS colour string. Overrides global colour for this annotation. */
  color?: string;
  /** Border thickness in px. Overrides global thickness. */
  thickness?: number;
  /** Absolute radius in px. When set, replaces the WCS-derived radiusDb. */
  radiusOverride?: number;
  /** Per-annotation label visibility toggle. Overrides global showLabels. */
  showLabel?: boolean;
  /** Replace the displayed label text (e.g. "Orion Nebula" instead of "M 42"). */
  customLabel?: string;
  /** Opacity 0.0–1.0. Overrides global opacity for this annotation only. */
  opacity?: number;
  // ── future slots (model ready, no UI yet) ────────────────────────
  // fontFamily?: string;
  // fontSize?: number;
}

/** Global visual settings applied to every annotation on the map. */
export interface GlobalAnnotationSettings {
  /** Annotation circle colour (hex / rgb / named). Default '#00f3ff'. */
  color: string;
  /** Circle border thickness in px. Default 2. */
  thickness: number;
  /** Label font size in rem. Default 0.65. */
  fontSize: number;
  /**
   * Label font family.
   * Already consumed by the renderer — add a UI picker later without
   * touching the model or service.
   */
  fontFamily: string;
  /** Master opacity for all annotations (0.0–1.0). Default 0.85. */
  opacity: number;
  /** Show annotation labels globally. Individual annotations can still  override via AnnotationStyle.showLabel. Default true. */
  showLabels: boolean;
}

export const DEFAULT_GLOBAL_ANNOTATION_SETTINGS: GlobalAnnotationSettings = {
  color: '#00f3ff',
  thickness: 2,
  fontSize: 0.65,
  fontFamily: 'monospace',
  opacity: 0.85,
  showLabels: true,
};
