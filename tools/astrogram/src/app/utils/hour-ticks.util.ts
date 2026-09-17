/** Tick spacings, in hours, an hour axis may use — each easy to read at a glance. */
export const HOUR_TICK_STEPS: readonly number[] = [0.5, 1, 2, 3, 4, 6, 12, 24];

/** Most intervals an hour axis is divided into before a coarser step is used. */
export const MAX_HOUR_TICK_INTERVALS = 5;

/**
 * Hour marks for an axis spanning `totalHours`, starting at 0, on the finest
 * readable step that keeps the axis to at most five intervals. A 10h 20m
 * session gets 0, 2, 4, 6, 8, 10; a 14h 30m one gets 0, 3, 6, 9, 12.
 *
 * @param totalHours Length of the axis in hours.
 */
export function hourTicksFor(totalHours: number): number[] {
  if (!(totalHours > 0)) return [];
  const step =
    HOUR_TICK_STEPS.find((s) => Math.floor(totalHours / s) <= MAX_HOUR_TICK_INTERVALS) ??
    HOUR_TICK_STEPS[HOUR_TICK_STEPS.length - 1];
  const count = Math.floor(totalHours / step + 1e-9);
  return Array.from({ length: count + 1 }, (_unused, i) => i * step);
}
