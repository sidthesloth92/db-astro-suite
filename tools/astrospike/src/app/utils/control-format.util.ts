import { EditorControlKey } from '../models/editor-controls.model';
import { sliceCountForValue } from './stars-cut.util';

/**
 * Formats an editor slider's raw value for the readout shown next to its
 * label.
 *
 * Each control speaks its own unit:
 * - `stars` — the resolved star count against the detection total
 *   (`"24 of 68"`), because the raw 0–1 value is meaningless to the user.
 * - `rotation` — whole degrees (`"15°"`).
 * - `diffusion` — a plain 0–1 amount (`"0"`, `"0.45"`), since it is a blend
 *   between two looks rather than a multiple of anything.
 * - `length` / `brightness` — a multiplier rounded to two decimals with
 *   trailing zeros dropped (`"1.4×"`, `"1.05×"`, `"1×"`).
 *
 * @param key The control being formatted.
 * @param value The control's current raw slider value.
 * @param totalStars Number of detected stars, used only by `stars`.
 * @returns The display string for the control's readout.
 */
export function formatControlValue(
  key: EditorControlKey,
  value: number,
  totalStars: number,
): string {
  switch (key) {
    case 'stars':
      return `${sliceCountForValue(value, totalStars)} of ${totalStars}`;
    case 'rotation':
      return `${Math.round(value)}°`;
    case 'diffusion':
      return `${Math.round(value * 100) / 100}`;
    case 'length':
    case 'brightness':
      return `${Math.round(value * 100) / 100}×`;
  }
}
