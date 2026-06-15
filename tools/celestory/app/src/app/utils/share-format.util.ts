/**
 * Formatting + date helpers shared by the share-card renderer, ported from the
 * Celestory design source so the cards format numbers, hours and dates exactly
 * as the reference does. Pure functions — no DOM access.
 */
import { NIGHT_SECONDS } from '../models/share-render.constants';
import type { ShareFilterKey } from '../models/share-model.model';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Coerces a value to a finite number, defaulting to 0. */
function num(v: number): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

/** Formats seconds as "12h 04m". */
export function fmtHM(seconds: number): string {
  const s = Math.max(0, Math.round(num(seconds)));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Formats seconds as decimal hours, e.g. "12.4". */
export function fmtHours(seconds: number): string {
  return (num(seconds) / 3600).toFixed(1);
}

/** Formats seconds as "clear nights" (8h each), e.g. "5.2". */
export function fmtNights(seconds: number): string {
  return (num(seconds) / NIGHT_SECONDS).toFixed(1);
}

/** Thousands-separated integer. */
export function fmtInt(v: number): string {
  return Math.round(num(v)).toLocaleString('en-US');
}

/** Parses a date string (or Date) to a Date, or null when invalid. */
export function parseDate(d: string | Date | null | undefined): Date | null {
  if (!d) {
    return null;
  }
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Formats a date as "Jan 5, 2025" (or "Jan 5" when `opts === 'short'`). */
export function fmtDate(d: string | Date | null | undefined, opts?: 'short'): string {
  const dt = parseDate(d);
  if (!dt) {
    return '—';
  }
  const day = dt.getUTCDate();
  const mon = MONTHS[dt.getUTCMonth()];
  const yr = dt.getUTCFullYear();
  return opts === 'short' ? `${mon} ${day}` : `${mon} ${day}, ${yr}`;
}

/** Formats a first→latest range, collapsing the year when both fall in it. */
export function fmtRange(a: string | Date | null | undefined, b: string | Date | null | undefined): string {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da && !db) {
    return '—';
  }
  if (!db) {
    return fmtDate(da);
  }
  if (!da) {
    return fmtDate(db);
  }
  const sameYear = da.getUTCFullYear() === db.getUTCFullYear();
  const left = sameYear ? `${MONTHS[da.getUTCMonth()]} ${da.getUTCDate()}` : fmtDate(da);
  return `${left} → ${fmtDate(db)}`;
}

/** A UTC day-key (YYYY-MM-DD) for grouping sessions by night, or null. */
export function dayKey(d: string | Date | null | undefined): string | null {
  const dt = parseDate(d);
  return dt ? dt.toISOString().slice(0, 10) : null;
}

/** Whole days between two dates (rounded), or 0 when either is invalid. */
export function daysBetween(a: string | Date | null | undefined, b: string | Date | null | undefined): number {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) {
    return 0;
  }
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/** A single year label, or "2023–24" for a range. */
export function yearLabel(firstLight: string, latestSession: string): string {
  const a = parseDate(firstLight);
  const b = parseDate(latestSession);
  const d = a ?? b;
  if (!d) {
    return '';
  }
  const y1 = d.getUTCFullYear();
  const y2 = (b ?? a)!.getUTCFullYear();
  return y1 === y2 ? String(y1) : `${y1}–${String(y2).slice(2)}`;
}

/** Map of ledger filter display names to canonical share-card filter keys. */
const NAME_TO_KEY: Readonly<Record<string, ShareFilterKey>> = {
  'Hα': 'Ha',
  Ha: 'Ha',
  Halpha: 'Ha',
  H: 'Ha',
  SII: 'SII',
  S2: 'SII',
  OIII: 'OIII',
  O3: 'OIII',
  L: 'L',
  Lum: 'L',
  R: 'R',
  Red: 'R',
  G: 'G',
  Green: 'G',
  B: 'B',
  Blue: 'B',
  RGB: 'RGB',
};

/** Maps a ledger filter display name to a canonical share-card key, or null. */
export function filterKeyOf(name: string): ShareFilterKey | null {
  return NAME_TO_KEY[name] ?? NAME_TO_KEY[name?.trim()] ?? null;
}
