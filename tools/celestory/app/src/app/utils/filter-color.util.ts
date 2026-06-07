/** Canonical astrophotography filter → display colour (matches the share-card palette). */
const FILTER_COLORS: Readonly<Record<string, string>> = {
  'Hα': '#e8536b',
  Ha: '#e8536b',
  SII: '#b5384a',
  S2: '#b5384a',
  OIII: '#3fd0a8',
  O3: '#3fd0a8',
  L: '#e9eef3',
  Lum: '#e9eef3',
  R: '#e8703f',
  G: '#5fbf6b',
  B: '#5784e8',
};

/** Returns the brand colour for a filter name, defaulting to the teal accent. */
export function filterColor(name: string): string {
  return FILTER_COLORS[name] ?? '#7af2c8';
}
