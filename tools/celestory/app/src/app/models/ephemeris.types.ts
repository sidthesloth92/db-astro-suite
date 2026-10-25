import type { RaDec, Vec3 } from './sky.types';

/** Apparent geocentric/topocentric position of a solar-system body. */
export interface BodyPosition extends RaDec {
  /** Equatorial unit vector (J2000-ish, equinox of date ignored at this precision). */
  unit: Vec3;
  /** Distance from the observer in astronomical units (sun, planets) or km (moon). */
  distance: number;
}

/** A planet's apparent position + brightness. */
export interface PlanetPosition extends BodyPosition {
  /** Planet name. */
  name: string;
  /** Visual magnitude. */
  magnitude: number;
  /** Approximate colour index for rendering. */
  bv: number;
}

/** Moon appearance for the given instant. */
export interface MoonAppearance {
  /** Illuminated fraction of the disc, 0..1. */
  illuminated: number;
  /** Phase angle in degrees (0 = full, 180 = new). */
  phaseAngle: number;
  /** Position angle of the bright limb, degrees east of celestial north. */
  brightLimbAngle: number;
  /** Apparent angular diameter in degrees. */
  diameterDeg: number;
}
