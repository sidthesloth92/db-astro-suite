import { defineEventHandler, getQuery, getRouterParam, setHeader } from 'h3';
import { getDb } from '../../../../utils/db';
import { normalizeHandle } from '../../../../utils/handle';
import { brandCardPng, equipmentCardPng, profileCardPng, targetCardPng } from '../../../../og/og-card';
import {
  toEquipmentOgModel,
  toProfileOgModel,
  toTargetOgModel,
} from '../../../../og/og-story.util';
import type { Story } from '../../../../utils/story.types';

/** Brand-card fallback copy — used whenever a handle/target/equipment isn't found. */
const BRAND_FALLBACK = {
  eyebrow: 'Astrophotography journey',
  hero: 'Charted.',
  sub: 'Your journey under the stars.',
};

/**
 * Per-profile Open Graph image — `GET /api/og/user/:handle` → a 1200×630 PNG for
 * social-link unfurling. With `?target=<id>` or `?equipment=<id>` it renders that
 * target's / gear's card instead of the profile card. Always returns an image
 * (falls back to the profile, then the brand card) so a link never breaks.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'image/png');
  setHeader(
    event,
    'cache-control',
    'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
  );
  try {
    const handle = normalizeHandle(getRouterParam(event, 'handle'));
    const query = getQuery(event);
    const targetId = typeof query['target'] === 'string' ? query['target'] : '';
    const equipmentId = typeof query['equipment'] === 'string' ? query['equipment'] : '';
    const sql = getDb();

    const rows = await sql`SELECT story_json FROM stories WHERE handle = ${handle} LIMIT 1`;
    if (rows.length === 0) {
      return await brandCardPng(BRAND_FALLBACK);
    }
    const story = JSON.parse((rows[0] as { story_json: string }).story_json) as Story;

    if (targetId) {
      const model = toTargetOgModel(story, handle, targetId);
      if (model) {
        return await targetCardPng(model);
      }
    } else if (equipmentId) {
      const model = toEquipmentOgModel(story, handle, equipmentId);
      if (model) {
        return await equipmentCardPng(model);
      }
    }

    // Profile card — also the fallback when a target/equipment id is unknown.
    return await profileCardPng(toProfileOgModel(story, handle));
  } catch {
    // Never fail an unfurl — fall back to the brand card.
    return await brandCardPng(BRAND_FALLBACK);
  }
});
