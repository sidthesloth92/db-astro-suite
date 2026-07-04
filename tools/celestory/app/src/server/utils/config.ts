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

/** Frozen, process-wide server configuration. */
export const config: ServerConfig = Object.freeze({
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  publicBaseUrl:
    process.env['CELESTORY_PUBLIC_BASE_URL'] ?? 'http://localhost:5173',
  sessionSecret:
    process.env['CELESTORY_SESSION_SECRET'] ?? 'celestory-dev-session-secret',
});
