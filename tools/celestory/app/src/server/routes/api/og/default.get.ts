import { defineEventHandler, getQuery, setHeader } from 'h3';
import { brandCardPng } from '../../../og/og-card';

/**
 * Generic brand Open Graph image — `GET /api/og/default?variant=` → a 1200×630
 * PNG for the landing and leaderboards links. `variant=leaderboards` tweaks the
 * copy.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'image/png');
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=604800');
  const variant = String(getQuery(event)['variant'] ?? '');
  if (variant === 'leaderboards') {
    return brandCardPng({
      eyebrow: 'Community',
      hero: 'Leaderboards',
      sub: 'Ranked by photons, not popularity.',
    });
  }
  return brandCardPng({
    eyebrow: 'Astrophotography journey',
    hero: 'Charted.',
    sub: 'Every target, every filter, every photon.',
  });
});
