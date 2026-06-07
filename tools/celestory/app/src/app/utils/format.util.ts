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
