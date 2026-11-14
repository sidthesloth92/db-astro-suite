/**
 * Parses a raw seconds string from a free-text input into a whole number of
 * seconds, clamped into [min, max]. Non-numeric input falls back to the
 * provided default — the micro input emits raw strings and enforces no
 * min/max of its own.
 *
 * @param raw - Raw input string (may be empty or non-numeric)
 * @param min - Smallest accepted value
 * @param max - Largest accepted value
 * @param fallback - Value used when the input does not parse to a number
 * @returns The clamped whole-second value
 */
export function clampSecondsInput(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return fallback;
  }
  const parsed = Math.floor(Number(trimmed));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}
