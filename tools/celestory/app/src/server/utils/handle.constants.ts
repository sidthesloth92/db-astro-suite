/** Validation rules and reserved words for user-chosen story handles. */

/** Allowed handle pattern: 3–30 chars, lowercase alphanumeric + single hyphens. */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Minimum handle length. */
export const HANDLE_MIN_LENGTH = 3;

/** Maximum handle length. */
export const HANDLE_MAX_LENGTH = 30;

/** Handles that collide with app routes or are otherwise off-limits. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'api',
  'admin',
  'about',
  'app',
  'assets',
  'create',
  'delete',
  'favicon',
  'health',
  'help',
  'login',
  'logout',
  'manage',
  'preview',
  'privacy',
  'public',
  'settings',
  'stats',
  'stories',
  'story',
  'terms',
  'u',
  'wrapped',
]);
