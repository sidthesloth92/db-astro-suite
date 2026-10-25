import type { SkyLook } from './sky-render.types';

/**
 * The sky is rendered in physical luminance units (cd/m²): dark-sky airglow
 * ≈ 0.00025, full-moon sky ≈ 0.008, civil-twilight end ≈ 3, noon zenith ≈ 3000.
 * Exposure is applied inside the sky/star passes so day values fit a half-float
 * buffer; the composite pass only tone-maps.
 */
export const DEFAULT_SKY_LOOK: SkyLook = {
  alwaysNight: true,
  nightExposure: 30,
  exposureExponent: 0.85,
  milkyWayGain: 0.09,
  starGain: 1.4,
  airglow: 0.00025,
  zodiacal: 0.00014,
  bloomStrength: 0.12,
  vignette: 0.22,
  sunGain: 1,
  moonGain: 0.35,
  surveyBlack: 0.08,
  surveyGain: 0.016,
};

/** Sun "intensity" that yields ~3000 cd/m² at a noon zenith with the shader's scattering model. */
export const SUN_INTENSITY = 3.7e5;

/** Full Moon / Sun illuminance ratio. */
export const MOON_SUN_RATIO = 2.5e-6;

/** Adaptation exponent under dark and moonlit skies (daylight uses `exposureExponent`). */
export const NIGHT_ADAPTATION = 0.6;

/** Night-sky luminance floor used by the exposure curve (cd/m²). */
export const NIGHT_LUMINANCE = 0.0003;

/** Exposed-value clamp applied before bloom (stops the Sun's disc flooding the frame). */
export const BLOOM_CLAMP = 40;

/** Number of bloom mip levels (each half the previous size, starting at half resolution). */
export const BLOOM_LEVELS = 5;

/** Width of the B−V → colour LUT. */
export const STAR_COLOR_LUT_WIDTH = 256;

/** Limiting magnitude as a function of FOV: [fovDeg, limitMag] breakpoints (interpolated). */
export const LIMIT_MAG_BY_FOV: ReadonlyArray<readonly [number, number]> = [
  [150, 6.3],
  [90, 6.8],
  [60, 7.6],
  [30, 9.0],
  [15, 10.2],
  [5, 11.0],
  [1, 11.5],
];

/** FOV (degrees) below which the Tycho-2 catalogue is loaded. */
export const TYCHO_LOAD_FOV = 60;
