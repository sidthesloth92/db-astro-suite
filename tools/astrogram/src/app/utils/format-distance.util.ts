/** Rounds to a single decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Rounds to 3 significant figures so large light-year counts stay legible. */
function round3sig(value: number): number {
  if (value < 1000) {
    return Math.round(value);
  }
  const factor = Math.pow(10, Math.floor(Math.log10(value)) - 2);
  return Math.round(value / factor) * factor;
}

/**
 * Formats a distance in light-years into a compact label using three units:
 * plain **ly** below a million (comma-grouped, rounded to 3 significant
 * figures), **Mly** (million ly), and **Bly** (billion ly). Returns an empty
 * string for a missing or non-positive value so callers can bind it directly.
 *
 * @param ly Distance in light-years.
 */
export function formatLightYears(ly: number | null | undefined): string {
  if (ly == null || !Number.isFinite(ly) || ly <= 0) {
    return '';
  }
  if (ly < 1_000_000) {
    return `${round3sig(ly).toLocaleString('en-US')} ly`;
  }
  if (ly < 1_000_000_000) {
    return `${round1(ly / 1_000_000)} Mly`;
  }
  return `${round1(ly / 1_000_000_000)} Bly`;
}
