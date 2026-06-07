/** Formats a duration in seconds as "186h 46m". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
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
