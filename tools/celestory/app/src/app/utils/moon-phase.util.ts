/**
 * Lunar phase from a calendar date — pure synodic-cycle math, no coordinates.
 * Counts days since a known new moon and folds them over the mean synodic month.
 * Accurate to ~1 day of phase (the true month varies ±~6h), which is ample for a
 * "which moon was up that night" indicator.
 */

/** Mean synodic month (new moon → new moon), in days. */
const SYNODIC_MONTH = 29.530588853;

/** Reference new-moon instant: 2000-01-06 18:14 UTC, as a Unix-ms epoch. */
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

/** A Moon state: cycle phase (0 = new, 0.5 = full) and illuminated fraction. */
export interface MoonState {
  /** Position in the lunar cycle, 0..1 (0/1 = new, 0.5 = full). */
  phase: number;
  /** Illuminated fraction of the disk, 0..1. */
  illum: number;
}

/** Computes the Moon's cycle phase + illuminated fraction for the given date. */
export function moonIllumination(date: Date | string): MoonState {
  const ms = typeof date === 'string' ? Date.parse(date) : date.getTime();
  if (Number.isNaN(ms)) {
    return { phase: 0, illum: 0 };
  }
  const days = (ms - NEW_MOON_EPOCH_MS) / 86400000;
  let phase = (days % SYNODIC_MONTH) / SYNODIC_MONTH;
  if (phase < 0) {
    phase += 1;
  }
  return { phase, illum: (1 - Math.cos(2 * Math.PI * phase)) / 2 };
}

/** The eight named lunar phases, indexed new → full → new. */
const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
] as const;

/** The named phase (8-way) for a cycle phase 0..1. */
export function moonPhaseName(phase: number): string {
  return MOON_PHASE_NAMES[Math.round(phase * 8) % 8];
}

/** A single moon glyph for one date, drawn in a 24×24 box (centre 12,12, r 9). */
export interface MoonGlyph {
  /** Rendering mode: empty disk, full disk, or a lit partial path. */
  mode: 'new' | 'full' | 'partial';
  /** SVG path for the lit area (only set when `mode === 'partial'`). */
  d: string;
  /** Human-readable phase name (e.g. "Waxing Gibbous"). */
  name: string;
}

/** Builds the moon-glyph geometry + phase name for a given date. */
export function moonGlyphFor(date: Date | string): MoonGlyph {
  const { phase } = moonIllumination(date);
  const name = moonPhaseName(phase);
  const r = 9;
  const cx = 12;
  const cy = 12;
  if (phase <= 0.02 || phase >= 0.98) {
    return { mode: 'new', d: '', name };
  }
  if (phase >= 0.48 && phase <= 0.52) {
    return { mode: 'full', d: '', name };
  }
  const rx = Math.abs(r * Math.cos(Math.PI * phase));
  const sweep = phase < 0.5 ? 0 : 1;
  const d = `M${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
  return { mode: 'partial', d, name };
}
