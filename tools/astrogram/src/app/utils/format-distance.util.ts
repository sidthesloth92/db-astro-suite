/** Rounds to a single decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Formats a distance in light-years into a compact, auto-scaled label
 * (`ly` → `kly` → `Mly` → `Gly`). Returns an empty string for a missing or
 * non-positive value so callers can bind it directly.
 *
 * @param ly Distance in light-years.
 */
export function formatLightYears(ly: number | null | undefined): string {
  if (ly == null || !Number.isFinite(ly) || ly <= 0) {
    return '';
  }
  if (ly < 1_000) {
    return `${Math.round(ly)} ly`;
  }
  if (ly < 1_000_000) {
    return `${round1(ly / 1_000)} kly`;
  }
  if (ly < 1_000_000_000) {
    return `${round1(ly / 1_000_000)} Mly`;
  }
  return `${round1(ly / 1_000_000_000)} Gly`;
}
