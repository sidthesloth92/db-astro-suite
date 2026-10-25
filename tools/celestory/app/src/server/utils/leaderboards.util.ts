/**
 * Pure parsers/classifiers for the leaderboards query params. Kept out of the
 * route files so the handlers stay declarative (no const/helper logic in
 * routes, per the file-naming conventions).
 */
import {
  DEFAULT_LIMIT,
  DEFAULT_SCOPE,
  MAX_LIMIT,
  NARROWBAND_FILTER_FRAGMENTS,
  SCOPES,
} from './leaderboards.constants';
import type { Palette, Scope } from './leaderboards.types';

/** First string value of a query field (h3 may hand back string | string[]). */
function firstString(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }
  return typeof value === 'string' ? value : '';
}

/** Pick a value from an allowed set, falling back to a default on any miss. */
function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = firstString(value).trim();
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** Clamp the `limit` query param into [1, MAX_LIMIT], defaulting to DEFAULT_LIMIT. */
export function parseLimit(value: unknown): number {
  const n = Number.parseInt(firstString(value), 10);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(n, MAX_LIMIT);
}

/** Parse the time-window scope (all | year | month). */
export function parseScope(value: unknown): Scope {
  return pick(value, SCOPES, DEFAULT_SCOPE);
}

/** Normalize a filter name for palette classification: greek lines → latin,
 * lowercased, alphanumerics only (so "Hα" → "ha", "OIII" → "oiii"). */
function normalizeFilterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/α/g, 'a')
    .replace(/β/g, 'b')
    .replace(/γ/g, 'g')
    .replace(/[^a-z0-9]/g, '');
}

/** Classify a filter name as narrowband or broadband for the palette board. */
export function classifyPalette(name: string): Palette {
  const norm = normalizeFilterName(name);
  if (!norm) {
    return 'broadband';
  }
  return NARROWBAND_FILTER_FRAGMENTS.some((fragment) => norm.includes(fragment))
    ? 'narrowband'
    : 'broadband';
}
