/**
 * Sitemap serialization helpers. Pure string/date functions so the route handler
 * stays thin and the XML shape is unit-testable in isolation.
 */

/** A single `<url>` entry in the sitemap. */
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

/** XML-escape a value for safe inclusion in a `<loc>` element. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Coerce a DB timestamp to a W3C `YYYY-MM-DD` lastmod, or undefined if unparseable. */
export function toLastmod(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/** Serialize sitemap entries into a `urlset` XML document. */
export function buildSitemapXml(urls: SitemapUrl[]): string {
  const body = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
