import type { StoryTarget } from './story.model';

/** A 3D vector. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** An East-North-Up unit vector, optionally carrying its source alt/az (deg). */
export interface EnuVector extends Vec3 {
  /** Altitude in degrees (when derived from alt/az). */
  alt?: number;
  /** Azimuth in degrees (when derived from alt/az). */
  az?: number;
}

/** Horizontal coordinates in degrees. */
export interface AltAz {
  alt: number;
  az: number;
}

/** Equatorial coordinates in degrees (J2000). */
export interface RaDec {
  ra: number;
  dec: number;
}

/** Camera orientation: heading + pitch (deg) and field-of-view (deg), with eased targets. */
export interface CameraState {
  heading: number;
  pitch: number;
  fov: number;
  tHeading: number;
  tPitch: number;
  tFov: number;
}

/** Camera basis vectors (forward / right / up). */
export interface CameraBasis {
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
}

/** A point in camera space; cz > 0 means in front of the camera. */
export interface CamPoint {
  cx: number;
  cy: number;
  cz: number;
}

/** A 2D screen-space point. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** Geolocation acquisition status for the planetarium location bar. */
export type SkyLocationStatus = 'default' | 'saved' | 'locating' | 'ok' | 'denied' | 'manual';

/** Observer location used to project the sky. */
export interface SkyLocation {
  lat: number;
  lon: number;
  label: string | null;
  status: SkyLocationStatus;
}

/** A user target plotted in the planetarium (target + its current alt/az + ENU vector). */
export interface SkyTarget {
  target: StoryTarget;
  v: EnuVector;
  alt: number;
  az: number;
}
