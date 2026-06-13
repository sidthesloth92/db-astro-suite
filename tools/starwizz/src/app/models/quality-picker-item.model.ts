import { RecordingPreset } from './recording.model';

/**
 * One row in the mobile record-button quality popup: a recording preset
 * with its short label and the estimated file size for the current format.
 */
export interface QualityPickerItem {
  /** Preset applied (and recording started with) when this row is tapped. */
  preset: RecordingPreset;
  /** Compact pill label (e.g. "Social"). */
  label: string;
  /** Estimated size in MB for a full-length clip at the current format. */
  sizeMb: number;
  /** Whether this is the recommended default preset (visually highlighted). */
  isRecommended: boolean;
}
