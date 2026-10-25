import type { CameraBasis, Vec3 } from './sky.types';
import type { SkyViewport } from './sky-projection.types';
import type { Mat3 } from '../utils/sky-frame.util';

/** Everything the WebGL renderer needs for one frame (computed by the host each frame). */
export interface SkyFrameInput {
  /** CSS-pixel viewport + vertical FOV. */
  view: SkyViewport;
  /** Device pixel ratio used for the backing store. */
  dpr: number;
  /** Camera orientation. */
  basis: CameraBasis;
  /** Equatorial (J2000) → ENU rotation for the observer + instant. */
  eqToEnu: Mat3;
  /** Sun direction, ENU unit vector. */
  sunEnu: Vec3;
  /** Moon direction, ENU unit vector. */
  moonEnu: Vec3;
  /** Illuminated fraction of the Moon (0..1). */
  moonIlluminated: number;
  /** Apparent diameter of the Moon in degrees. */
  moonDiameterDeg: number;
  /** Ecliptic north pole, ENU unit vector. */
  eclipticPoleEnu: Vec3;
  /** Naked-eye planets to draw as bright points. */
  planets: PlanetFrame[];
  /** Seconds, for scintillation. */
  timeSeconds: number;
  /** Faintest magnitude to draw. */
  limitMag: number;
  /** Light pollution level 0..1. */
  lightPollution: number;
}

/** A planet for one frame: direction, brightness, colour. */
export interface PlanetFrame {
  name: string;
  /** J2000 equatorial unit vector (the star pass precesses and rotates it). */
  unit: Vec3;
  /** Visual magnitude. */
  magnitude: number;
  /** Colour index for the star LUT. */
  bv: number;
}

/** Tunable look parameters (art-directed; defaults in sky-render.constants). */
export interface SkyLook {
  /**
   * Always render a dark, night-adapted sky regardless of the Sun and Moon (the
   * planetarium's job is to showcase the user's targets, not to simulate daylight).
   * When false, the full day/twilight/moonlight simulation runs.
   */
  alwaysNight: boolean;
  /** Exposure under a fully dark sky (maps the airglow floor to a faint, deep tone). */
  nightExposure: number;
  /** How strongly exposure tracks sky luminance (1 = perfect adaptation, 0 = none). */
  exposureExponent: number;
  /** Milky Way texture gain (texture units → cd/m²). */
  milkyWayGain: number;
  /** Star flux gain (a V = 0 star → this many cd/m²-equivalent units of flux). */
  starGain: number;
  /** Airglow zenith luminance (cd/m²). */
  airglow: number;
  /** Zodiacal light peak luminance (cd/m²). */
  zodiacal: number;
  /** Bloom mix strength. */
  bloomStrength: number;
  /** Vignette strength 0..1. */
  vignette: number;
  /** Multiplier on sunlight scattering (debug / art). */
  sunGain: number;
  /** Multiplier on moonlight scattering (debug / art). */
  moonGain: number;
  /** Survey tile background level to subtract (sRGB 0..1). */
  surveyBlack: number;
  /** Survey linear value → cd/m². */
  surveyGain: number;
}
