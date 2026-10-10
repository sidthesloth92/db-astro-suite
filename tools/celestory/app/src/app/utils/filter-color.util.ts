import { FILTER_FALLBACK, FILTER_FALLBACK_PALETTE, FILTER_META } from '../models/filter.constants';

/**
 * Assigns each unrecognised filter name in `names` its own colour from the
 * fallback palette, so no two filters in one view share a colour. Assignment is
 * deterministic (unknown names sorted alphabetically), so the same set of
 * names always yields the same colours — across components, SSR, and reloads.
 * Build the map from the story-wide filter list so subsets (target cards,
 * session pills) stay consistent with the summary chart.
 */
export function filterColorMap(names: readonly string[]): ReadonlyMap<string, string> {
  const unknown = [...new Set(names.filter((n) => !(n in FILTER_META)))].sort((a, b) =>
    a.localeCompare(b),
  );
  return new Map(
    unknown.map((n, i) => [n, FILTER_FALLBACK_PALETTE[i % FILTER_FALLBACK_PALETTE.length]]),
  );
}

/**
 * Returns the signature colour for a filter display name. Unknown names
 * resolve through `colors` (see filterColorMap); without a map they fall back
 * to the default mint.
 */
export function filterColor(name: string, colors?: ReadonlyMap<string, string>): string {
  return FILTER_META[name]?.color ?? colors?.get(name) ?? FILTER_FALLBACK;
}

/** Returns the display label for a filter name (echoes the name if unknown). */
export function filterLabel(name: string): string {
  return FILTER_META[name]?.label ?? name;
}
