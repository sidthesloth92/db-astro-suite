/**
 * Builds the per-frame input for the WebGL sky from observer, instant and
 * camera: equatorial→ENU rotation, sun/moon/ecliptic directions, limiting
 * magnitude for the field of view.
 */
import { LIMIT_MAG_BY_FOV } from '../models/sky-render.constants';
import type { SkyFrameInput } from '../models/sky-render.types';
import type { SkyViewport } from '../models/sky-projection.types';
import type { CameraBasis, SkyLocation } from '../models/sky.types';
import { eclipticPoleUnit, moonAppearance, moonPosition, sunPosition } from './ephemeris.util';
import { planetPositions } from './planet-ephemeris.util';
import { equatorialToEnuMatrix, j2000ToEnuMatrix, mat3MulVec } from './sky-frame.util';

/** Limiting magnitude for a vertical FOV (degrees), interpolated from the breakpoints. */
export function limitMagForFov(fovDeg: number): number {
  const table = LIMIT_MAG_BY_FOV;
  if (fovDeg >= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [f0, m0] = table[i - 1];
    const [f1, m1] = table[i];
    if (fovDeg >= f1) {
      const t = (f0 - fovDeg) / (f0 - f1);
      return m0 + (m1 - m0) * t;
    }
  }
  return table[table.length - 1][1];
}

/**
 * Photographic compression of the magnitude scale: 1 is physical; lower values
 * lift faint stars. Naked-eye-like when zoomed out, telescope-like when zoomed in.
 */
export function magnitudeGammaForFov(fovDeg: number): number {
  const t = Math.max(0, Math.min(1, (100 - fovDeg) / 90));
  const s = t * t * (3 - 2 * t);
  return 0.76 + (0.6 - 0.76) * s;
}

/** Assemble the WebGL frame input. */
export function buildSkyFrameInput(
  view: SkyViewport,
  dpr: number,
  basis: CameraBasis,
  location: SkyLocation,
  now: Date,
  timeSeconds: number,
  lightPollution: number,
): SkyFrameInput {
  // Catalogue stars + planet elements are J2000 (precessed to date); the Sun/Moon
  // series are already equinox-of-date.
  const eqToEnu = j2000ToEnuMatrix(location.lat, location.lon, now);
  const ofDateToEnu = equatorialToEnuMatrix(location.lat, location.lon, now);
  const sun = sunPosition(now);
  const moon = moonPosition(now, location.lat, location.lon);
  const moonLook = moonAppearance(now, location.lat, location.lon);
  const planets = planetPositions(now).map((p) => ({ name: p.name, unit: p.unit, magnitude: p.magnitude, bv: p.bv }));
  return {
    view,
    dpr,
    basis,
    eqToEnu,
    sunEnu: mat3MulVec(ofDateToEnu, sun.unit),
    moonEnu: mat3MulVec(ofDateToEnu, moon.unit),
    moonIlluminated: moonLook.illuminated,
    moonDiameterDeg: moonLook.diameterDeg,
    eclipticPoleEnu: mat3MulVec(ofDateToEnu, eclipticPoleUnit(now)),
    planets,
    timeSeconds,
    limitMag: limitMagForFov(view.fovDeg),
    lightPollution,
  };
}
