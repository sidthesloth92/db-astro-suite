/**
 * Lower-cased words that say what kind of object a name is rather than which
 * one ("Nebula", "Galaxy", "Complex"). A two-tier hero starts its smaller line
 * at the first of these, so the proper name before it stays whole
 * ("North America" over "Nebula Complex").
 */
export const HERO_DESCRIPTOR_WORDS: ReadonlySet<string> = new Set([
  'nebula',
  'nebulae',
  'nebulosity',
  'galaxy',
  'galaxies',
  'cluster',
  'clusters',
  'complex',
  'remnant',
  'supernova',
  'cloud',
  'clouds',
  'group',
  'region',
  'triplet',
  'quintet',
  'loop',
  'planetary',
  'reflection',
  'emission',
  'dark',
  'globular',
]);
