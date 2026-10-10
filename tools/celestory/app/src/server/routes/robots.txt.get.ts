import { defineEventHandler, setHeader } from 'h3';
import { requestOrigin } from '../utils/request-origin.util';

/**
 * `GET /robots.txt` — allow crawling of the public pages, keep the private
 * preview, the dev OG gallery and the JSON API out of the index, and point
 * crawlers at the sitemap on whatever host the request arrived on.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400');
  const origin = requestOrigin(event);
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /preview',
    'Disallow: /dev/',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
});
