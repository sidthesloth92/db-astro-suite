/**
 * Low-precision solar-system ephemeris for the planetarium (Meeus /
 * Montenbruck-Pfleger series): Sun to ~1′, Moon to a few arcminutes including
 * topocentric parallax. Good enough for where things appear in the sky; not
 * for predicting occultations.
 */
import type { BodyPosition, MoonAppearance } from '../models/ephemeris.types';
import type { Vec3 } from '../models/sky.types';
import { D2R, julianDate, lst, R2D } from './celestial.util';

const ARCSEC = Math.PI / 648000;

function frac(x: number): number {
  return x - Math.floor(x);
}

/** Mean obliquity of the ecliptic (degrees) at Julian date. */
export function obliquityDeg(jd: number): number {
  const n = jd - 2451545.0;
  return 23.439 - 0.0000004 * n;
}

/** Ecliptic (λ, β in radians) → equatorial unit vector for obliquity ε (radians). */
export function eclipticToEquatorial(lambda: number, beta: number, eps: number): Vec3 {
  const cb = Math.cos(beta);
  const x = cb * Math.cos(lambda);
  const y = cb * Math.sin(lambda);
  const z = Math.sin(beta);
  return { x, y: y * Math.cos(eps) - z * Math.sin(eps), z: y * Math.sin(eps) + z * Math.cos(eps) };
}

function unitToRaDec(u: Vec3): { ra: number; dec: number } {
  let ra = Math.atan2(u.y, u.x) * R2D;
  if (ra < 0) ra += 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, u.z))) * R2D };
}

/** Apparent geocentric position of the Sun. */
export function sunPosition(date: Date): BodyPosition {
  const jd = julianDate(date);
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * D2R;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R;
  const eps = obliquityDeg(jd) * D2R;
  const unit = eclipticToEquatorial(lambda, 0, eps);
  const distance = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  return { ...unitToRaDec(unit), unit, distance };
}

/** Geocentric ecliptic longitude/latitude (radians) and distance (km) of the Moon. */
function moonEcliptic(jd: number): { lambda: number; beta: number; distanceKm: number } {
  const T = (jd - 2451545.0) / 36525;
  const L0 = frac(0.606433 + 1336.855225 * T);
  const l = 2 * Math.PI * frac(0.374897 + 1325.55241 * T);
  const ls = 2 * Math.PI * frac(0.993133 + 99.997361 * T);
  const D = 2 * Math.PI * frac(0.827361 + 1236.853086 * T);
  const F = 2 * Math.PI * frac(0.259086 + 1342.227825 * T);
  const dL =
    22640 * Math.sin(l) -
    4586 * Math.sin(l - 2 * D) +
    2370 * Math.sin(2 * D) +
    769 * Math.sin(2 * l) -
    668 * Math.sin(ls) -
    412 * Math.sin(2 * F) -
    212 * Math.sin(2 * l - 2 * D) -
    206 * Math.sin(l + ls - 2 * D) +
    192 * Math.sin(l + 2 * D) -
    165 * Math.sin(ls - 2 * D) -
    125 * Math.sin(D) -
    110 * Math.sin(l + ls) +
    148 * Math.sin(l - ls) -
    55 * Math.sin(2 * F - 2 * D);
  const S = F + (dL + 412 * Math.sin(2 * F) + 541 * Math.sin(ls)) * ARCSEC;
  const h = F - 2 * D;
  const N =
    -526 * Math.sin(h) +
    44 * Math.sin(l + h) -
    31 * Math.sin(-l + h) -
    23 * Math.sin(ls + h) +
    11 * Math.sin(-ls + h) -
    25 * Math.sin(-2 * l + F) +
    21 * Math.sin(-l + F);
  const lambda = 2 * Math.PI * frac(L0 + dL / 1296000);
  const beta = (18520 * Math.sin(S) + N) * ARCSEC;
  const distanceKm =
    385000.56 - 20905.355 * Math.cos(l) - 3699.111 * Math.cos(2 * D - l) - 2955.968 * Math.cos(2 * D) - 569.925 * Math.cos(2 * l);
  return { lambda, beta, distanceKm };
}

/**
 * Topocentric position of the Moon for an observer at lat/lon (degrees).
 * Parallax matters here: up to ~1° near the horizon.
 */
export function moonPosition(date: Date, latDeg: number, lonDeg: number): BodyPosition {
  const jd = julianDate(date);
  const eps = obliquityDeg(jd) * D2R;
  const { lambda, beta, distanceKm } = moonEcliptic(jd);
  const geo = eclipticToEquatorial(lambda, beta, eps);
  // Observer position in the equatorial frame (km), spherical Earth.
  const theta = lst(date, lonDeg) * D2R;
  const phi = latDeg * D2R;
  const rObs = 6378.137;
  const obs = { x: rObs * Math.cos(phi) * Math.cos(theta), y: rObs * Math.cos(phi) * Math.sin(theta), z: rObs * Math.sin(phi) };
  const topo = { x: geo.x * distanceKm - obs.x, y: geo.y * distanceKm - obs.y, z: geo.z * distanceKm - obs.z };
  const d = Math.hypot(topo.x, topo.y, topo.z);
  const unit = { x: topo.x / d, y: topo.y / d, z: topo.z / d };
  return { ...unitToRaDec(unit), unit, distance: d };
}

/** Illumination, phase angle, bright-limb position angle and apparent size of the Moon. */
export function moonAppearance(date: Date, latDeg: number, lonDeg: number): MoonAppearance {
  const sun = sunPosition(date);
  const moon = moonPosition(date, latDeg, lonDeg);
  const cosE = sun.unit.x * moon.unit.x + sun.unit.y * moon.unit.y + sun.unit.z * moon.unit.z;
  const elongation = Math.acos(Math.max(-1, Math.min(1, cosE)));
  // Phase angle ≈ 180° − elongation (sun far away relative to the moon).
  const phaseAngle = Math.PI - elongation;
  const illuminated = (1 + Math.cos(phaseAngle)) / 2;
  // Position angle of the bright limb (Meeus 48.5).
  const a0 = sun.ra * D2R;
  const d0 = sun.dec * D2R;
  const a = moon.ra * D2R;
  const d = moon.dec * D2R;
  const chi = Math.atan2(Math.cos(d0) * Math.sin(a0 - a), Math.sin(d0) * Math.cos(d) - Math.cos(d0) * Math.sin(d) * Math.cos(a0 - a));
  let brightLimbAngle = chi * R2D;
  if (brightLimbAngle < 0) brightLimbAngle += 360;
  const diameterDeg = (2 * Math.atan(1737.4 / moon.distance)) * R2D;
  return { illuminated, phaseAngle: phaseAngle * R2D, brightLimbAngle, diameterDeg };
}

/** Unit vector of the ecliptic north pole in the equatorial frame at `date`. */
export function eclipticPoleUnit(date: Date): Vec3 {
  const eps = obliquityDeg(julianDate(date)) * D2R;
  return { x: 0, y: -Math.sin(eps), z: Math.cos(eps) };
}
