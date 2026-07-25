/**
 * Server configuration, read once from the environment and frozen. Never read
 * process.env directly in route or service code — import from here instead.
 */

interface ServerConfig {
  /** Neon/Vercel Postgres connection string; empty if unconfigured. */
  readonly databaseUrl: string;
  /** Public origin used when minting shareable story URLs. */
  readonly publicBaseUrl: string;
  /**
   * HMAC secret used to sign owner management session tokens. Set
   * `CELESTORY_SESSION_SECRET` in production (Vercel); the dev fallback only
   * keeps local tokens self-consistent and must not be relied on for security.
   */
  readonly sessionSecret: string;
}

/** Dev-only HMAC fallback — forgeable by anyone reading this file. */
const DEV_SESSION_SECRET = 'celestory-dev-session-secret';

const sessionSecret =
  process.env['CELESTORY_SESSION_SECRET'] ?? DEV_SESSION_SECRET;

// Fail fast rather than serve forgeable owner-session tokens: a production
// process signing with the public dev fallback would let anyone mint a valid
// edit/delete session for any published profile.
if (process.env['NODE_ENV'] === 'production' && sessionSecret === DEV_SESSION_SECRET) {
  throw new Error(
    'CELESTORY_SESSION_SECRET must be set in production; the dev fallback signs forgeable session tokens.',
  );
}

/** Frozen, process-wide server configuration. */
export const config: ServerConfig = Object.freeze({
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  publicBaseUrl:
    process.env['CELESTORY_PUBLIC_BASE_URL'] ?? 'http://localhost:5173',
  sessionSecret,
});
