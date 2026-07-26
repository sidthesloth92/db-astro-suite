import { defineEventHandler, getQuery, setHeader } from 'h3';
import { brandCardPng, landingCardPng, leaderboardsCardPng } from '../../../og/og-card';
import { loadLandingOgModel, loadLeaderboardsOgModel } from '../../../og/og-leaderboards.util';

/** Static brand fallback if the community queries fail — never break an unfurl. */
const BRAND_FALLBACK = {
  eyebrow: 'Astrophotography journey',
  hero: 'Charted.',
  sub: 'Every target, every filter, every photon.',
};

/**
 * Community Open Graph image — `GET /api/og/default?variant=` → a 1200×630 PNG.
 * The default is the landing card; `variant=leaderboards` renders the
 * leaderboards card. Both pull live community totals (behind the CDN cache) and
 * fall back to a static brand card on any error.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'image/png');
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=604800');
  const variant = String(getQuery(event)['variant'] ?? '');
  try {
    if (variant === 'leaderboards') {
      return await leaderboardsCardPng(await loadLeaderboardsOgModel());
    }
    return await landingCardPng(await loadLandingOgModel());
  } catch {
    return await brandCardPng(BRAND_FALLBACK);
  }
});
