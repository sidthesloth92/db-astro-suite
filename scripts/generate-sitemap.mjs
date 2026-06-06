/**
 * Generates the master sitemap.xml for DB Astro Suite from a single source of
 * truth. Run at build time (before the hub build) so `lastmod` is always the
 * current build date and never goes stale. The output is written to
 * `hub/public/sitemap.xml`, which the hub build copies into `dist/` — making it
 * available at https://dbastrosuite.com/sitemap.xml.
 *
 * Usage: node scripts/generate-sitemap.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ORIGIN = 'https://dbastrosuite.com';

/**
 * Every public URL the site exposes. Hub `/tool/*` pages are the SSR-prerendered
 * description/landing pages; `/astrogram/` and `/starwizz/` are the live tool apps.
 * Add new public routes here only.
 */
const ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/tool/starwizz', changefreq: 'monthly', priority: '0.7' },
  { path: '/tool/astrogram', changefreq: 'monthly', priority: '0.7' },
  { path: '/tool/sortronomy', changefreq: 'monthly', priority: '0.7' },
  { path: '/starwizz/', changefreq: 'weekly', priority: '0.8' },
  { path: '/astrogram/', changefreq: 'weekly', priority: '0.8' },
];

/**
 * Builds the sitemap XML string for the given ISO date.
 * @param {string} lastmod - YYYY-MM-DD build date applied to every URL.
 * @returns {string} The full sitemap.xml document.
 */
function buildSitemap(lastmod) {
  const urls = ROUTES.map(
    ({ path, changefreq, priority }) =>
      `  <url>\n` +
      `    <loc>${SITE_ORIGIN}${path}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${changefreq}</changefreq>\n` +
      `    <priority>${priority}</priority>\n` +
      `  </url>`,
  ).join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
}

const lastmod = new Date().toISOString().slice(0, 10);
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'hub',
  'public',
  'sitemap.xml',
);

writeFileSync(outputPath, buildSitemap(lastmod), 'utf8');
console.log(`Generated sitemap with ${ROUTES.length} URLs (lastmod=${lastmod}) → ${outputPath}`);
