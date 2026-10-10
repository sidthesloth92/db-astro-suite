/**
 * Resolve the absolute origin (`https://host`) for building canonical + og:image
 * URLs. Order: AnalogJS's SSR `BASE_URL` (computed from the request, populated in
 * dev and prod server rendering), then the browser's `window.location.origin`,
 * then a configured `VITE_CELESTORY_BASE_URL` fallback.
 */
export function resolveOrigin(baseUrl: string | null): string {
  if (baseUrl) {
    return baseUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const configured = String(import.meta.env['VITE_CELESTORY_BASE_URL'] ?? '').trim();
  return configured ? configured.replace(/\/+$/, '') : '';
}
