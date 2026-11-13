import type { RingedPlanetGradientStop } from './ringed-planet-gradient-stop.model';

/**
 * The planet's designed body colour — the gradient's mid-tone and the theme's
 * default secondary colour. The picker colour takes its place, and the other
 * body tones below are derived from the picker the way they relate to it.
 */
export const RINGED_PLANET_BODY_BASE = '#8A5BC2';

/** The body gradient as designed: lit highlight, mid-tone, shade and limb. */
export const RINGED_PLANET_BODY_STOPS: readonly RingedPlanetGradientStop[] = [
  { offset: '0%', color: '#C9A6E8' },
  { offset: '42%', color: RINGED_PLANET_BODY_BASE },
  { offset: '78%', color: '#46256E' },
  { offset: '100%', color: '#1C0E33' },
];

/** The designed backdrop glow behind the planet, a shade of the body colour. */
export const RINGED_PLANET_GLOW = '#5A3282';
