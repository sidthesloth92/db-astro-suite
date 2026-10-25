/** Date/time + playback-rate labels for the planetarium time controls. */

/** "Sat, Oct 24 · 06:42 PM" in the user's locale. */
export function formatSkyTime(date: Date): string {
  const d = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const t = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${d} · ${t}`;
}

/** Label for a playback rate: Live, Paused, or "1 min/s". */
export function formatSkyRate(rate: number, isLive: boolean): string {
  if (rate === 0) return 'Paused';
  if (isLive) return 'Live';
  if (rate === 1) return '1×';
  if (rate < 3600) return `${Math.round(rate / 60)} min/s`;
  return `${Math.round(rate / 3600)} h/s`;
}
