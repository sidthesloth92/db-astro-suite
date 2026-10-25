/** HTTP caching policies for public API responses. */

/**
 * Community aggregates (stats, leaderboard boards): browsers reuse for 1 min,
 * the Vercel CDN for 5 min, then serves stale for up to 1 h while revalidating.
 * Lets the Neon compute scale to zero between bursts of views; a new profile
 * shows up within ~5 minutes. Never use for per-user responses.
 */
export const PUBLIC_AGGREGATE_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=3600';
