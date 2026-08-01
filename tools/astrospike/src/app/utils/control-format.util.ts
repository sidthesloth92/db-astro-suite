import { EditorControlKey } from '../models/editor-controls.model';
import { sliceCountForValue } from './stars-cut.util';

/**
 * Formats an editor slider's raw value for the readout shown next to its
 * label.
 *
 * Each control speaks its own unit:
 * - `stars` — the resolved star count, because the raw 0–1 value is
 *   meaningless to the user. The "of N" total is a separate, dimmer part; see
 *   {@link formatControlSuffix}.
 * - `rotation` — whole degrees (`"15°"`).
 * - `chroma` / `diffusion` — a plain 0–1 amount (`"0"`, `"0.45"`), since each
 *   is a blend rather than a multiple of anything.
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
      return `${sliceCountForValue(value, totalStars)}`;
    case 'rotation':
      return `${Math.round(value)}°`;
    case 'chroma':
    case 'diffusion':
      return `${Math.round(value * 100) / 100}`;
    case 'length':
    case 'brightness':
      return `${Math.round(value * 100) / 100}×`;
  }
}

/**
 * The dimmer trailing part of a control's readout, or an empty string when it
 * has none.
 *
 * Only the star cut has one: it reads as a count against a total, and rendering
 * the total in the same weight as the count makes the pair hard to scan.
 *
 * @param key The control being formatted.
 * @param totalStars Number of detected stars.
 */
export function formatControlSuffix(key: EditorControlKey, totalStars: number): string {
  return key === 'stars' ? `of ${totalStars}` : '';
}
