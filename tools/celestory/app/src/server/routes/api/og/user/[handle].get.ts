import { defineEventHandler, getRouterParam, setHeader } from 'h3';
import { getDb } from '../../../../utils/db';
import { normalizeHandle } from '../../../../utils/handle';
import { brandCardPng, profileCardPng } from '../../../../og/og-card';

/**
 * Per-profile Open Graph image — `GET /api/og/user/:handle` → a 1200×630 PNG
 * rendered from the profile's headline stats, for social-link unfurling. Always
 * returns an image (falls back to the brand card) so a shared link never breaks.
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
    const sql = getDb();
    const rows = await sql`
      SELECT handle, total_integration_seconds, object_count, night_count, light_frame_count
      FROM stories WHERE handle = ${handle} LIMIT 1`;
    if (rows.length === 0) {
      return await brandCardPng({
        eyebrow: 'Astrophotography journey',
        hero: 'Charted.',
        sub: 'Your journey under the stars.',
      });
    }
    const row = rows[0] as {
      handle: string;
      total_integration_seconds: number | string | null;
      object_count: number | null;
      night_count: number | null;
      light_frame_count: number | null;
    };
    const hours = Math.round(Number(row.total_integration_seconds ?? 0) / 3600);
    return await profileCardPng({
      handle: row.handle,
      hours: hours.toLocaleString('en-US'),
      objects: Number(row.object_count ?? 0).toLocaleString('en-US'),
      nights: Number(row.night_count ?? 0).toLocaleString('en-US'),
      frames: Number(row.light_frame_count ?? 0).toLocaleString('en-US'),
    });
  } catch {
    // Never fail an unfurl — fall back to the brand card.
    return await brandCardPng({
      eyebrow: 'Astrophotography journey',
      hero: 'Charted.',
      sub: 'Your journey under the stars.',
    });
  }
});
