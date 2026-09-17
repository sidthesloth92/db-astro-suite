/** Spacing, in chart units, between neighbouring ion streaks at the nucleus. */
export const COMET_STREAK_STEP = 16;

/**
 * Widest offset, in chart units, of an ion streak either side of the tail's
 * centre line. Seven bands at the full step fanned out as far as the title,
 * the last streaks starting well below the nucleus as loose dashes.
 */
export const COMET_STREAK_MAX_SPREAD = 20;

/**
 * Shortest ion streak, in chart units. A band with a few percent of the night
 * drew a dash shorter than the nucleus glow, which read as a stray tick.
 */
export const COMET_STREAK_MIN_LENGTH = 40;

/** Streak length, in chart units, for a band holding the whole night. */
export const COMET_STREAK_FULL_LENGTH = 260;

/**
 * Vertical offset of an ion streak from the tail's centre line: neighbours sit
 * `COMET_STREAK_STEP` apart around the centre, closing up when many bands would
 * fan out past `COMET_STREAK_MAX_SPREAD`. Three bands keep the design's
 * -16 / 0 / 16.
 *
 * @param index The band's position in the integration list.
 * @param count How many bands are drawn.
 */
export function cometStreakOffset(index: number, count: number): number {
  if (count <= 1) return 0;
  const step = Math.min(COMET_STREAK_STEP, (COMET_STREAK_MAX_SPREAD * 2) / (count - 1));
  return (index - (count - 1) / 2) * step;
}

/**
 * Dash length, in chart units, of a band's ion streak: proportional to its
 * share of the night, never shorter than `COMET_STREAK_MIN_LENGTH`.
 *
 * @param share The band's fraction of the total integration, 0–1.
 */
export function cometStreakLength(share: number): number {
  return Math.max(share * COMET_STREAK_FULL_LENGTH, COMET_STREAK_MIN_LENGTH);
}
