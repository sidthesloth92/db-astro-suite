/**
 * Canonical public location of the Celestory app. Published profiles live at
 * `https://<PUBLIC_PROFILE_HOST>/user/<handle>`. Single source of truth so the
 * publish modal, share cards and profile banners all agree on the URL.
 */

/** Public host where published Celestory profiles live (no scheme). */
export const PUBLIC_PROFILE_HOST = 'celestory.dbastrosuite.com';

/** Full canonical origin (with scheme) for published profiles. */
export const PUBLIC_PROFILE_ORIGIN = `https://${PUBLIC_PROFILE_HOST}`;

/** Builds the display URL (no scheme) for a published profile handle. */
export function profileDisplayUrl(handle: string): string {
  return handle ? `${PUBLIC_PROFILE_HOST}/user/${handle}` : PUBLIC_PROFILE_HOST;
}

/** Builds the full canonical URL (with scheme) for a published profile handle. */
export function profileUrl(handle: string): string {
  return handle ? `${PUBLIC_PROFILE_ORIGIN}/user/${handle}` : PUBLIC_PROFILE_ORIGIN;
}
