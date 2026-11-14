import { SCENE3D_CONTROLS } from '../constants/scene3d.constant';
import { Scene3dControlKey } from '../models/scene3d-settings.model';

/**
 * The value shown beside a 3D slider's label. Most are plain numbers. Rotation works both ways
 * from the middle, so it reads as degrees per second with an arrow for the way the view turns,
 * or "Off" in the middle.
 *
 * @param value - The slider's current value
 */
export function formatSceneControlValue(control: Scene3dControlKey, value: number): string {
  const precision = SCENE3D_CONTROLS[control].precision;
  if (control !== 'rotation') {
    return value.toFixed(precision);
  }
  if (value === 0) {
    return 'Off';
  }
  return `${Math.abs(value).toFixed(precision)}°/s ${value > 0 ? '↻' : '↺'}`;
}
