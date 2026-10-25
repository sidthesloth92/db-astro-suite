/**
 * Picks the instant the planetarium should open on. Scans the coming night for
 * the darkest sky, counting both the Sun and the Moon, and returns the earliest
 * moment that is nearly as dark as the best one (so a Moon that sets at 3 AM
 * sends you to 3 AM, but a sky that is already good at 10 PM keeps 10 PM).
 * The current time is kept when it already qualifies.
 */
import { DARK_SKY_SUN_ALT_DEG, DARK_SKY_SCAN_HOURS, DARK_SKY_TOLERANCE } from '../models/sky-ui.constants';
import { MOON_SUN_RATIO, NIGHT_LUMINANCE, SUN_INTENSITY } from '../models/sky-render.constants';
import type { DarkSkyChoice } from '../models/sky-ui.types';
import { D2R } from './celestial.util';
import { moonAppearance, moonPosition, sunPosition } from './ephemeris.util';
import { moonZenithLuminance } from './sky-exposure.util';
import { equatorialToEnuMatrix, mat3MulVec } from './sky-frame.util';
import { zenithLuminance } from './sky-scatter.util';

/** Sun altitude in degrees for an observer and instant. */
export function sunAltitudeDeg(date: Date, latDeg: number, lonDeg: number): number {
  const enu = mat3MulVec(equatorialToEnuMatrix(latDeg, lonDeg, date), sunPosition(date).unit);
  return Math.asin(Math.max(-1, Math.min(1, enu.z))) / D2R;
}

/** True when the Sun is below the astronomical-darkness threshold at `date`. */
export function isDarkSky(date: Date, latDeg: number, lonDeg: number): boolean {
  return sunAltitudeDeg(date, latDeg, lonDeg) <= DARK_SKY_SUN_ALT_DEG;
}

/** Zenith sky luminance (cd/m²) from Sun (+ Moon when `includeMoon`) + night floor at `date`. */
export function skyLuminanceAt(date: Date, latDeg: number, lonDeg: number, includeMoon = true): { total: number; moon: number; sunAlt: number } {
  const m = equatorialToEnuMatrix(latDeg, lonDeg, date);
  const sunEnu = mat3MulVec(m, sunPosition(date).unit);
  const sunAlt = Math.asin(Math.max(-1, Math.min(1, sunEnu.z))) / D2R;
  let moon = 0;
  if (includeMoon) {
    const moonEnu = mat3MulVec(m, moonPosition(date, latDeg, lonDeg).unit);
    const gate = Math.max(0, Math.min(1, (moonEnu.z + 0.02) / 0.1));
    const moonI = SUN_INTENSITY * MOON_SUN_RATIO * moonAppearance(date, latDeg, lonDeg).illuminated * gate;
    moon = moonZenithLuminance(moonEnu, moonI);
  }
  return { total: zenithLuminance(sunAlt) + moon + NIGHT_LUMINANCE, moon, sunAlt };
}

/**
 * The darkest usable instant of the coming night (see module doc). With
 * `includeMoon` false only the Sun counts, i.e. the end of astronomical twilight.
 */
export function darkestSkyTime(now: Date, latDeg: number, lonDeg: number, includeMoon = true): DarkSkyChoice {
  const start = now.getTime();
  const stepMs = 10 * 60 * 1000;
  const samples: { t: number; total: number; moon: number; sunAlt: number }[] = [];
  for (let t = start; t <= start + DARK_SKY_SCAN_HOURS * 3600 * 1000; t += stepMs) {
    samples.push({ t, ...skyLuminanceAt(new Date(t), latDeg, lonDeg, includeMoon) });
  }
  const best = samples.reduce((a, b) => (b.total < a.total ? b : a));
  const limit = best.total * DARK_SKY_TOLERANCE;
  const first = samples.find((s) => s.total <= limit) ?? best;
  const current = samples[0];
  if (current.total <= limit) {
    return { time: now, moved: false, reason: 'now' };
  }
  // Refine to the minute inside the chosen 10-minute step.
  let t = first.t;
  while (t - 60000 > start && skyLuminanceAt(new Date(t - 60000), latDeg, lonDeg, includeMoon).total <= limit) {
    t -= 60000;
  }
  const chosen = skyLuminanceAt(new Date(t), latDeg, lonDeg, includeMoon);
  let reason: DarkSkyChoice['reason'] = 'midnight';
  if (chosen.moon < current.moon / 2 && current.moon > NIGHT_LUMINANCE) {
    reason = 'moonset';
  } else if (current.sunAlt > -12 && chosen.sunAlt <= -12) {
    reason = 'dusk';
  }
  return { time: new Date(t), moved: true, reason };
}
