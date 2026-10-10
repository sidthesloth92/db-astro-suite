/**
 * Pure parsers/classifiers for the leaderboards query params. Kept out of the
 * route files so the handlers stay declarative (no const/helper logic in
 * routes, per the file-naming conventions).
 */
import {
  CATEGORY_METRICS,
  DEFAULT_CATEGORY_METRIC,
  DEFAULT_EQUIPMENT_KIND,
  DEFAULT_EQUIPMENT_METRIC,
  DEFAULT_FILTER_METRIC,
  DEFAULT_LIMIT,
  DEFAULT_MONTH_VIEW,
  DEFAULT_SCOPE,
  DEFAULT_SPEC_METRIC,
  DEFAULT_TARGET_METRIC,
  DEFAULT_USER_METRIC,
  EQUIPMENT_KINDS,
  EQUIPMENT_METRICS,
  FILTER_METRICS,
  MAX_LIMIT,
  MONTH_VIEWS,
  NARROWBAND_FILTER_FRAGMENTS,
  SCOPES,
  SPEC_METRICS,
  TARGET_METRICS,
  USER_METRICS,
} from './leaderboards.constants';
import type {
  CategoryMetric,
  EquipmentKind,
  EquipmentMetric,
  FilterMetric,
  MonthView,
  Palette,
  Scope,
  SpecMetric,
  TargetMetric,
  UserMetric,
} from './leaderboards.types';

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

/** Parse the users-board metric. */
export function parseUserMetric(value: unknown): UserMetric {
  return pick(value, USER_METRICS, DEFAULT_USER_METRIC);
}

/** Parse the targets-board metric. */
export function parseTargetMetric(value: unknown): TargetMetric {
  return pick(value, TARGET_METRICS, DEFAULT_TARGET_METRIC);
}

/** Parse the categories-board metric. */
export function parseCategoryMetric(value: unknown): CategoryMetric {
  return pick(value, CATEGORY_METRICS, DEFAULT_CATEGORY_METRIC);
}

/** Parse the equipment-board metric. */
export function parseEquipmentMetric(value: unknown): EquipmentMetric {
  return pick(value, EQUIPMENT_METRICS, DEFAULT_EQUIPMENT_METRIC);
}

/** Parse the equipment kind filter (camera | telescope). */
export function parseEquipmentKind(value: unknown): EquipmentKind {
  return pick(value, EQUIPMENT_KINDS, DEFAULT_EQUIPMENT_KIND);
}

/** Parse the specs-board metric. */
export function parseSpecMetric(value: unknown): SpecMetric {
  return pick(value, SPEC_METRICS, DEFAULT_SPEC_METRIC);
}

/** Parse the filters-board metric. */
export function parseFilterMetric(value: unknown): FilterMetric {
  return pick(value, FILTER_METRICS, DEFAULT_FILTER_METRIC);
}

/** Parse the months-board view (absolute | seasonality). */
export function parseMonthView(value: unknown): MonthView {
  return pick(value, MONTH_VIEWS, DEFAULT_MONTH_VIEW);
}

/** Parse the time-window scope (all | year | month). */
export function parseScope(value: unknown): Scope {
  return pick(value, SCOPES, DEFAULT_SCOPE);
}

/** Parse a 4-digit year filter, or null (= all years) when absent/invalid. */
export function parseYear(value: unknown): number | null {
  const n = Number.parseInt(firstString(value), 10);
  return Number.isInteger(n) && n >= 1900 && n <= 9999 ? n : null;
}

/** Parse a `YYYY-MM` param into a first-of-month `YYYY-MM-01`, or null. */
export function parseMonth(value: unknown): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(firstString(value).trim());
  if (!match) {
    return null;
  }
  const month = Number.parseInt(match[2], 10);
  if (month < 1 || month > 12) {
    return null;
  }
  return `${match[1]}-${match[2]}-01`;
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
