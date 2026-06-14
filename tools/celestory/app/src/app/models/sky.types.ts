import type { LedgerObject } from './ledger.model';

/** An RGB colour triple used for canvas star/cloud tinting. */
export type RgbColor = [number, number, number];

/** A catalogue star tuple: [name, raDeg, decDeg, magnitude]. */
export type StarTuple = readonly [name: string, ra: number, dec: number, mag: number];

/** A named constellation with its bright stars and stick-figure line segments. */
export interface ConstellationCatalog {
  /** Constellation name. */
  name: string;
  /** Bright stars, as [name, raDeg, decDeg, mag] tuples. */
  stars: StarTuple[];
  /** Line segments as index pairs into `stars`. */
  seg: number[][];
}

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

/** A raw procedurally-generated sky point in equatorial coords (pre-projection). */
export interface SkyRawPoint {
  ra: number;
  dec: number;
  /** Stellar magnitude (field / milky stars). */
  mag?: number;
  /** RGB tint. */
  c?: RgbColor;
  /** Angular radius factor (clouds / dust / ha / galaxies). */
  ang?: number;
  /** Alpha (clouds / dust / ha). */
  a?: number;
  /** Secondary angular radius (galaxy minor axis). */
  ang2?: number;
  /** Rotation in radians (galaxy). */
  rot?: number;
}

/** A projected sky sprite carrying its ENU vector plus the raw point's attributes. */
export interface SkyVec {
  v: EnuVector;
  mag?: number;
  c?: RgbColor;
  ang?: number;
  a?: number;
  ang2?: number;
  rot?: number;
}

/** The procedurally-generated sky, grouped by layer (equatorial coords). */
export interface GeneratedSky {
  field: SkyRawPoint[];
  milky: SkyRawPoint[];
  clouds: SkyRawPoint[];
  galaxies: SkyRawPoint[];
  dust: SkyRawPoint[];
  ha: SkyRawPoint[];
}

/** A projected catalogue star. */
export interface ProjectedStar {
  name: string;
  mag: number;
  v: EnuVector;
}

/** A projected constellation figure. */
export interface ProjectedConstellation {
  name: string;
  stars: ProjectedStar[];
  seg: number[][];
}

/** The full projected sky for an observer + instant. */
export interface ProjectedSky {
  cons: ProjectedConstellation[];
  loose: ProjectedStar[];
  field: SkyVec[];
  milky: SkyVec[];
  clouds: SkyVec[];
  galaxies: SkyVec[];
  dust: SkyVec[];
  ha: SkyVec[];
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

/** A user target plotted in the planetarium (object + its current alt/az + ENU vector). */
export interface SkyTarget {
  obj: LedgerObject;
  v: EnuVector;
  alt: number;
  az: number;
}
