/**
 * Approximate positions and brightness of the naked-eye planets from JPL
 * Keplerian elements (valid 1800–2050, accuracy a few arcminutes). Enough to
 * place Venus or Jupiter where the eye finds them; not for occultations.
 */
import { EARTH_ELEMENTS, PLANET_ELEMENTS, type PlanetElements } from '../models/planet-elements.constants';
import type { PlanetPosition } from '../models/ephemeris.types';
import type { Vec3 } from '../models/sky.types';
import { D2R, julianDate, R2D } from './celestial.util';
import { obliquityDeg } from './ephemeris.util';

function solveKepler(meanAnomalyRad: number, e: number): number {
  let E = meanAnomalyRad + e * Math.sin(meanAnomalyRad);
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - meanAnomalyRad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/** Heliocentric ecliptic (J2000) position in au for a body's elements at Julian centuries T. */
export function heliocentricEcliptic(el: PlanetElements, T: number): Vec3 {
  const a = el.base[0] + el.rate[0] * T;
  const e = el.base[1] + el.rate[1] * T;
  const I = (el.base[2] + el.rate[2] * T) * D2R;
  const L = el.base[3] + el.rate[3] * T;
  const varpi = el.base[4] + el.rate[4] * T;
  const Omega = (el.base[5] + el.rate[5] * T) * D2R;
  const omega = varpi * D2R - Omega;
  let M = (L - varpi) % 360;
  if (M > 180) M -= 360;
  if (M < -180) M += 360;
  const E = solveKepler(M * D2R, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(omega);
  const sw = Math.sin(omega);
  const cO = Math.cos(Omega);
  const sO = Math.sin(Omega);
  const cI = Math.cos(I);
  const sI = Math.sin(I);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp,
  };
}

/** Saturn's ring-plane pole, J2000 equatorial unit vector (RA 40.589°, Dec 83.537°). */
const SATURN_POLE: Vec3 = {
  x: Math.cos(83.537 * D2R) * Math.cos(40.589 * D2R),
  y: Math.cos(83.537 * D2R) * Math.sin(40.589 * D2R),
  z: Math.sin(83.537 * D2R),
};

function visualMagnitude(name: string, r: number, delta: number, phaseDeg: number, unit: Vec3): number {
  const d = 5 * Math.log10(r * delta);
  const i = phaseDeg;
  switch (name) {
    case 'Mercury':
      return -0.42 + d + 0.038 * i - 0.000273 * i * i + 0.000002 * i * i * i;
    case 'Venus':
      return -4.4 + d + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i * i * i;
    case 'Mars':
      return -1.52 + d + 0.016 * i;
    case 'Jupiter':
      return -9.4 + d + 0.005 * i;
    case 'Saturn': {
      // Ring contribution from the Saturnicentric latitude of the Earth (Meeus 41.4).
      const sinB = -(SATURN_POLE.x * unit.x + SATURN_POLE.y * unit.y + SATURN_POLE.z * unit.z);
      return -8.88 + d + 0.044 * i - 2.6 * Math.abs(sinB) + 1.25 * sinB * sinB;
    }
    default:
      return d;
  }
}

/** Geocentric equatorial positions + magnitudes of the naked-eye planets at `date`. */
export function planetPositions(date: Date): PlanetPosition[] {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525;
  const eps = obliquityDeg(jd) * D2R;
  const earth = heliocentricEcliptic(EARTH_ELEMENTS, T);
  const rEarth = Math.hypot(earth.x, earth.y, earth.z);
  return PLANET_ELEMENTS.map((el) => {
    const p = heliocentricEcliptic(el, T);
    const r = Math.hypot(p.x, p.y, p.z);
    const g = { x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z };
    const delta = Math.hypot(g.x, g.y, g.z);
    // Ecliptic → equatorial.
    const unit = {
      x: g.x / delta,
      y: (g.y * Math.cos(eps) - g.z * Math.sin(eps)) / delta,
      z: (g.y * Math.sin(eps) + g.z * Math.cos(eps)) / delta,
    };
    let ra = Math.atan2(unit.y, unit.x) * R2D;
    if (ra < 0) ra += 360;
    const dec = Math.asin(Math.max(-1, Math.min(1, unit.z))) * R2D;
    const cosPhase = (r * r + delta * delta - rEarth * rEarth) / (2 * r * delta);
    const phaseDeg = Math.acos(Math.max(-1, Math.min(1, cosPhase))) * R2D;
    return { name: el.name, ra, dec, unit, distance: delta, magnitude: visualMagnitude(el.name, r, delta, phaseDeg, unit), bv: el.bv };
  });
}
