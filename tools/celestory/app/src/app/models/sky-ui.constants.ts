/** A light-pollution preset for the planetarium sky. */
export interface LightPollutionLevel {
  /** Button label. */
  label: string;
  /** Shader level 0..1. */
  value: number;
}

/** Light-pollution presets the user cycles through (roughly Bortle 2 / 4 / 6 / 8). */
export const LIGHT_POLLUTION_LEVELS: readonly LightPollutionLevel[] = [
  { label: 'Dark site', value: 0.08 },
  { label: 'Rural', value: 0.3 },
  { label: 'Suburban', value: 0.6 },
  { label: 'City', value: 1.0 },
];

/** Sun altitude (degrees) at or below which the sky counts as dark for the opening view. */
export const DARK_SKY_SUN_ALT_DEG = -18;

/** How far ahead (hours) the opening-view search scans for the darkest sky. */
export const DARK_SKY_SCAN_HOURS = 18;

/** Accept the earliest instant within this factor of the darkest sky luminance. */
export const DARK_SKY_TOLERANCE = 1.3;
