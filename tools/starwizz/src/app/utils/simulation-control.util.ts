import { CONTROLS } from '../constants/simulation.constant';
import { ControlKey } from '../models/simulation.model';
import { turnArrow } from './turn-arrow.util';

/**
 * The value shown beside a 2D slider's label. Most are plain numbers. Rotation works both ways
 * from the middle, so it reads as a speed with an arrow for the way the view turns, or "Off" in
 * the middle.
 *
 * @param value - The slider's current value
 */
export function formatControlValue(control: ControlKey, value: number): string {
  const precision = CONTROLS[control].precision ?? 0;
  if (control !== 'rotationRate') {
    return value.toFixed(precision);
  }
  if (value === 0) {
    return 'Off';
  }
  return `${Math.abs(value).toFixed(precision)} ${turnArrow(value)}`;
}
