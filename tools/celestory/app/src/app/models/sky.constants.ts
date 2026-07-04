import type { CameraState, SkyLocation } from './sky.types';

/** localStorage key for the persisted observer location. */
export const SKY_LOC_KEY = 'celestory.sky.loc.v1';

/** Default observer location (used until geolocation/manual entry). */
export const DEFAULT_SKY_LOCATION: SkyLocation = { lat: 40, lon: -74, label: null, status: 'default' };

/** Field-of-view bounds (degrees). */
export const FOV_MIN = 22;
export const FOV_MAX = 105;

/** Initial camera state — facing north, fully zoomed out. */
export function initialCamera(): CameraState {
  return { heading: 0, pitch: 42, fov: FOV_MAX, tHeading: 0, tPitch: 42, tFov: FOV_MAX };
}
