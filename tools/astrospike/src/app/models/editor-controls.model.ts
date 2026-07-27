/**
 * Identifier of one of the editor's adjustment sliders.
 */
export type EditorControlKey = 'stars' | 'length' | 'brightness' | 'rotation';

/**
 * Static metadata describing a single editor slider: its label, range,
 * step, and initial value.
 */
export interface ControlMetadata {
  /** User-visible control name. */
  label: string;
  /** One-line user-facing description of what the control does. */
  description: string;
  /** Minimum slider value. */
  min: number;
  /** Maximum slider value. */
  max: number;
  /** Slider step increment. */
  step: number;
  /** Initial (default) value. */
  initial: number;
  /** Optional number of decimal places for displaying the value. */
  precision?: number;
}
