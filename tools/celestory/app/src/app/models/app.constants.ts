/**
 * Public location of the Celestory app. Published profiles live at
 * `<origin>/user/<handle>`. The origin follows wherever the app is actually
 * served (any Vercel preview/production domain) in the browser, and falls back
 * to the canonical domain during SSR. Single source of truth so the publish
 * modal, share cards and profile banners all agree on the URL.
 */

/** Canonical public host (no scheme) — the SSR fallback when `location` is absent. */
export const PUBLIC_PROFILE_HOST = 'celestory.dbastrosuite.com';

/** Canonical full origin (with scheme) — the SSR fallback. */
export const PUBLIC_PROFILE_ORIGIN = `https://${PUBLIC_PROFILE_HOST}`;

/** The app's current origin (browser), or the canonical origin during SSR. */
export function appOrigin(): string {
  return typeof location !== 'undefined' ? location.origin : PUBLIC_PROFILE_ORIGIN;
}

/** The app's current host with no scheme (browser), or the canonical host during SSR. */
export function appHost(): string {
  return appOrigin().replace(/^https?:\/\//, '');
}

/** Display URL (no scheme) for a published profile handle, on the current origin. */
export function profileDisplayUrl(handle: string): string {
  return handle ? `${appHost()}/user/${handle}` : appHost();
}

/** Full URL (with scheme) for a published profile handle, on the current origin. */
export function profileUrl(handle: string): string {
  return handle ? `${appOrigin()}/user/${handle}` : appOrigin();
}
