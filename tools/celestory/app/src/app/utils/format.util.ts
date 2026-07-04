import type { DurationPart } from '../models/duration.model';

/** Formats a duration in seconds as "186h 46m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Decomposes a duration in seconds into years/months/days/hours/minutes parts
 * (month ≈ 30 days, year = 365 days). Drops leading zero units and keeps every
 * unit from the first non-zero down to minutes, e.g. 3,771,840s →
 * `[1mo, 13d, 15h, 44m]`. Always returns at least one part.
 */
export function formatDurationParts(totalSeconds: number): DurationPart[] {
  let s = Math.max(0, Math.round(totalSeconds));
  const minute = 60;
  const hour = 3600;
  const day = 86_400;
  const month = 2_592_000;
  const year = 31_536_000;
  const years = Math.floor(s / year);
  s -= years * year;
  const months = Math.floor(s / month);
  s -= months * month;
  const days = Math.floor(s / day);
  s -= days * day;
  const hours = Math.floor(s / hour);
  s -= hours * hour;
  const minutes = Math.floor(s / minute);
  const all: DurationPart[] = [
    { value: years, unit: 'y' },
    { value: months, unit: 'mo' },
    { value: days, unit: 'd' },
    { value: hours, unit: 'h' },
    { value: minutes, unit: 'm' },
  ];
  const firstIdx = all.findIndex((p) => p.value > 0);
  return firstIdx === -1 ? [{ value: 0, unit: 'm' }] : all.slice(firstIdx);
}

/** Thousands-separated integer, e.g. 2619 → "2,619". */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Whole hours from seconds, e.g. 612.4h → "612". */
export function formatHours(totalSeconds: number): string {
  return formatCount(totalSeconds / 3600);
}

/** Compact human-readable count, e.g. 1284000 → "1.3M", 86400 → "86K", 412 → "412". */
export function formatCompact(value: number): string {
  const n = Math.round(value);
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}K`;
  }
  return String(n);
}
