/**
 * Frame exposure from sky luminance: an adapted eye / auto-exposing camera.
 * `exposure = night × (L0 / (L + L0))^k`, where L is the zenith luminance
 * (cd/m²) lit by the Sun and the Moon, and L0 the night floor. k < 1 leaves
 * bright skies slightly brighter than night so gradients stay visible.
 */
import { NIGHT_ADAPTATION, NIGHT_LUMINANCE } from '../models/sky-render.constants';
import type { SkyLook } from '../models/sky-render.types';
import type { Vec3 } from '../models/sky.types';
import { luminance, scatterRgb, zenithLuminance } from './sky-scatter.util';

/** Zenith luminance (cd/m²) contributed by moonlight for a moon direction + intensity. */
export function moonZenithLuminance(moonEnu: Vec3, moonIntensity: number): number {
  if (moonIntensity <= 0 || moonEnu.z <= 0) {
    return 0;
  }
  return luminance(scatterRgb({ x: 0, y: 0, z: 1 }, moonEnu, 4, 2)) * moonIntensity;
}

/**
 * Adaptation strength for a zenith luminance: weak at night (so a moonlit sky
 * still reads brighter than a dark one), approaching `look.exposureExponent`
 * in daylight (so noon stays within range).
 */
export function adaptationExponent(luminance: number, look: SkyLook): number {
  // Weak only for dark and moonlit skies (≲ 0.006 cd/m²); twilight and day adapt fully.
  const x = Math.log10(Math.max(luminance, 1e-6));
  const t = Math.max(0, Math.min(1, (x + 2.2) / 1.2));
  const s = t * t * (3 - 2 * t);
  return NIGHT_ADAPTATION + (look.exposureExponent - NIGHT_ADAPTATION) * s;
}

/** Exposure multiplier for the current Sun altitude (degrees) and Moon lighting. */
export function exposureForSky(sunAltDeg: number, moonEnu: Vec3, moonIntensity: number, look: SkyLook): number {
  const l = zenithLuminance(sunAltDeg) + moonZenithLuminance(moonEnu, moonIntensity);
  const ratio = NIGHT_LUMINANCE / (l + NIGHT_LUMINANCE);
  return look.nightExposure * Math.pow(ratio, adaptationExponent(l, look));
}
