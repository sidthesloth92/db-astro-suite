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
