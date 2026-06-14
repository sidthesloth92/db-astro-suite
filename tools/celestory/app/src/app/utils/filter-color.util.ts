import { FILTER_FALLBACK, FILTER_META } from '../models/filter.constants';

/** Returns the signature colour for a filter display name (defaults to teal). */
export function filterColor(name: string): string {
  return FILTER_META[name]?.color ?? FILTER_FALLBACK;
}

/** Returns the display label for a filter name (echoes the name if unknown). */
export function filterLabel(name: string): string {
  return FILTER_META[name]?.label ?? name;
}
