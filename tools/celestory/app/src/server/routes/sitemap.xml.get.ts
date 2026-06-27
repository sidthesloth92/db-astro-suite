import { defineEventHandler, setHeader } from 'h3';
import { getDb } from '../utils/db';
import { requestOrigin } from '../utils/request-origin.util';
import { buildSitemapXml, toLastmod, type SitemapUrl } from '../utils/sitemap.util';

/**
 * `GET /sitemap.xml` — the static marketing pages plus every published profile
 * (every `stories` row is publicly reachable at `/user/<handle>`; there is no
 * visibility column). Falls back to the static set if the DB query fails so the
 * sitemap never 500s and crawler discovery keeps working.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400');
  const origin = requestOrigin(event);

  const urls: SitemapUrl[] = [
    { loc: `${origin}/` },
    { loc: `${origin}/leaderboards` },
    { loc: `${origin}/demo` },
    { loc: `${origin}/contact` },
  ];

  try {
    const sql = getDb();
    // The Neon driver returns untyped rows; the SELECT pins the shape we read.
    const rows = (await sql`
      SELECT handle, created_at FROM stories ORDER BY created_at DESC
    `) as Array<{ handle: string; created_at: string }>;
    for (const row of rows) {
      urls.push({
        loc: `${origin}/user/${encodeURIComponent(row.handle)}`,
        lastmod: toLastmod(row.created_at),
      });
    }
  } catch {
    // Keep the static sitemap — never break crawler discovery on a DB hiccup.
  }

  return buildSitemapXml(urls);
});
