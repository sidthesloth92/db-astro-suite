import path from "path";
import { fileURLToPath } from "url";
import { parsePositiveInteger } from "./utils/app.util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the top-level data directory (one level above `src/`).
 */
const DATA_DIR = path.join(__dirname, "../data");

/**
 * Centralised, validated configuration object.
 *
 * All environment variables are read once at import time and exposed as
 * a frozen object. Business logic must import `config` instead of
 * reading `process.env` directly.
 */
const config = Object.freeze({
  /**
   * API server port.
   */
  port: parsePositiveInteger(process.env.ASTROSOLVE_PORT, 3000),

  /**
   * API server host (0.0.0.0 for Docker).
   */
  host: process.env.ASTROSOLVE_HOST ?? "0.0.0.0",

  /**
   * CORS allowed origin(s). Set ASTROSOLVE_ORIGIN to restrict to a specific
   * origin in production (e.g. https://yourapp.com). Comma-separate multiple origins.
   * If ASTROSOLVE_ORIGIN contains 'localhost', all origins are allowed (dev mode).
   * If ASTROSOLVE_ORIGIN is absent, no cross-origin requests are allowed.
   */
  origin: (() => {
    const org = process.env.ASTROSOLVE_ORIGIN;
    if (!org) return false;
    if (org.includes("localhost")) return "*";
    return org.includes(",") ? org.split(",").map((s) => s.trim()) : org;
  })(),

  /**
   * Maximum concurrent plate-solve jobs.
   */
  queueConcurrency: parsePositiveInteger(
    process.env.ASTROSOLVE_QUEUE_CONCURRENCY,
    2,
  ),

  /**
   * Maximum queued jobs before returning 503.
   */
  queueMaxSize: parsePositiveInteger(process.env.ASTROSOLVE_QUEUE_MAX_SIZE, 10),

  /**
   * When true, POST /api/v1/solve requires a valid x-access-key header.
   * Defaults to true. Only set to false if SOLVE_API_KEY_REQUIRED is explicitly
   * set to the string "false" in the environment.
   */
  solveApiKeyRequired: process.env.SOLVE_API_KEY_REQUIRED !== "false",

  /**
   * When true, Fastify trusts X-Forwarded-For headers from the upstream
   * proxy (e.g. Cloudflare). This is required so that rate limiting uses
   * the real client IP rather than the proxy IP.
   * Set ASTROSOLVE_TRUST_PROXY=true in production when behind Cloudflare.
   */
  trustProxy: process.env.ASTROSOLVE_TRUST_PROXY === "true",

  /**
   * Maximum number of requests per IP per rate-limit window for the solve
   * endpoint. Defaults to 5. Configure via ASTROSOLVE_RATE_LIMIT_MAX.
   */
  rateLimitMax: parsePositiveInteger(process.env.ASTROSOLVE_RATE_LIMIT_MAX, 5),

  /**
   * Rate-limit time window for the solve endpoint (e.g. "1 minute", "30 seconds").
   * Defaults to "1 minute". Configure via ASTROSOLVE_RATE_LIMIT_WINDOW.
   */
  rateLimitWindow: process.env.ASTROSOLVE_RATE_LIMIT_WINDOW ?? "1 minute",

  /**
   * Maximum number of requests per IP per minute allowed on the health check
   * endpoint (GET /). Defaults to 30. Configure via ASTROSOLVE_HEALTH_RATE_LIMIT_MAX.
   */
  healthRateLimitMax: parsePositiveInteger(
    process.env.ASTROSOLVE_HEALTH_RATE_LIMIT_MAX,
    30,
  ),

  /**
   * Absolute path to the uploads directory for incoming images.
   */
  uploadsDir: path.join(DATA_DIR, "uploads"),

  /**
   * Absolute path to the access-keys SQLite database.
   */
  accessKeysDbPath: path.join(DATA_DIR, "astrosolve.sqlite"),

  /**
   * Absolute path to the local celestial catalog SQLite database.
   */
  localCatalogDbPath: path.join(DATA_DIR, "local-catalog/celestial.sqlite"),
});

export default config;
