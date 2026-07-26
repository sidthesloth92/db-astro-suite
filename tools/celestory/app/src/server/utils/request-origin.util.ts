import { getRequestHost, getRequestProtocol, type H3Event } from 'h3';

/**
 * Absolute origin (`scheme://host`) for the current request — e.g.
 * `https://celestory.vercel.app`. Honours the `x-forwarded-*` headers Vercel
 * sets, so `robots.txt` / `sitemap.xml` / canonical URLs work on any domain
 * without a hardcoded base.
 */
export function requestOrigin(event: H3Event): string {
  const host = getRequestHost(event, { xForwardedHost: true });
  const proto = getRequestProtocol(event, { xForwardedProto: true });
  return `${proto}://${host}`;
}
