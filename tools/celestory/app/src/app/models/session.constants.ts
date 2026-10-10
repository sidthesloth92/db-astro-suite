/** Storage keys for the client-side Celestory owner session + identity. */

/**
 * Owner session: handle + management token. Stored in `sessionStorage` so owner
 * mode survives a page refresh within the same tab but clears when the tab is
 * closed or the URL is opened fresh.
 */
export const OWNER_SESSION_KEY = 'celestory.owner.v1';

/** Editable viewer identity (display name + handle), shared across the app (localStorage). */
export const IDENTITY_KEY = 'celestory.identity.v1';
