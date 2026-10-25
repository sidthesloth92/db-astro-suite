/**
 * The site's public origin. In production `VITE_CELESTORY_BASE_URL` pins it
 * (e.g. https://celestory.dbastrosuite.com), so canonical links, og:url /
 * og:image and copied profile links never point at a preview or *.vercel.app
 * host. When it isn't set (local dev), the origin follows the request.
 */

/** The configured public origin (no trailing slash), or '' when not set. */
export function configuredOrigin(): string {
  return String(import.meta.env['VITE_CELESTORY_BASE_URL'] ?? '').trim().replace(/\/+$/, '');
}

/**
 * Pick the public origin: the configured one, then the SSR request origin,
 * then the browser's. Pure (inputs passed in) so the precedence is testable.
 */
export function pickOrigin(configured: string, requestOrigin: string | null, browserOrigin: string): string {
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (requestOrigin) {
    return requestOrigin.replace(/\/+$/, '');
  }
  return browserOrigin;
}

/**
 * Resolve the absolute origin (`https://host`) for building canonical + og:image
 * URLs. Order: the configured origin, then AnalogJS's SSR `BASE_URL` (computed
 * from the request), then the browser's `window.location.origin`.
 */
export function resolveOrigin(baseUrl: string | null): string {
  const browserOrigin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  return pickOrigin(configuredOrigin(), baseUrl, browserOrigin);
}
