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
   * endpoint. Defaults to 2. Configure via ASTROSOLVE_RATE_LIMIT_MAX.
   *
   * The solve endpoint is hyper-aggressive on purpose: every request is a
   * multi-MB upload that triggers seconds of CPU-bound work, so even a small
   * number of unauthenticated callers can saturate the queue.
   */
  rateLimitMax: parsePositiveInteger(process.env.ASTROSOLVE_RATE_LIMIT_MAX, 2),

  /**
   * Rate-limit time window for the solve endpoint (e.g. "1 minute", "30 seconds").
   * Defaults to "1 minute". Configure via ASTROSOLVE_RATE_LIMIT_WINDOW.
   */
  rateLimitWindow: process.env.ASTROSOLVE_RATE_LIMIT_WINDOW ?? "1 minute",

  /**
   * Per-access-key rate limit on the solve endpoint, stacked on top of the
   * per-IP limit. Closes the IP-rotation / NAT / VPN loophole — a single
   * access key cannot exceed this even from many different IPs. Defaults
   * to 10. Configure via ASTROSOLVE_SOLVE_KEY_RATE_LIMIT_MAX.
   */
  solveKeyRateLimitMax: parsePositiveInteger(
    process.env.ASTROSOLVE_SOLVE_KEY_RATE_LIMIT_MAX,
    10,
  ),

  /**
   * Time window for the per-access-key solve rate limit. Defaults to
   * "1 minute". Configure via ASTROSOLVE_SOLVE_KEY_RATE_LIMIT_WINDOW.
   */
  solveKeyRateLimitWindow:
    process.env.ASTROSOLVE_SOLVE_KEY_RATE_LIMIT_WINDOW ?? "1 minute",

  /**
   * Maximum number of requests per IP per minute allowed on the health check
   * endpoint (GET /). Defaults to 30. Configure via ASTROSOLVE_HEALTH_RATE_LIMIT_MAX.
   */
  healthRateLimitMax: parsePositiveInteger(
    process.env.ASTROSOLVE_HEALTH_RATE_LIMIT_MAX,
    30,
  ),

  /**
   * Rate-limit time window for the health check endpoint (GET /).
   * Defaults to "1 minute". Configure via ASTROSOLVE_HEALTH_RATE_LIMIT_WINDOW.
   */
  healthRateLimitWindow:
    process.env.ASTROSOLVE_HEALTH_RATE_LIMIT_WINDOW ?? "1 minute",

  /**
   * Pino log level. Valid values: 'trace', 'debug', 'info', 'warn', 'error',
   * 'fatal', 'silent'. Defaults to 'info'. Configure via ASTROSOLVE_LOG_LEVEL.
   */
  logLevel: process.env.ASTROSOLVE_LOG_LEVEL ?? "info",

  /**
   * Absolute path to the uploads directory for incoming images.
   */
  uploadsDir: path.join(DATA_DIR, "uploads"),

  /**
   * Maximum upload size in bytes for POST /api/v1/solve, enforced both by
   * Fastify multipart limits and surfaced via GET /api/v1/limits so the
   * client can prevalidate. Defaults to 10 MB. Configure via
   * ASTROSOLVE_UPLOAD_MAX_BYTES.
   */
  uploadMaxBytes: parsePositiveInteger(
    process.env.ASTROSOLVE_UPLOAD_MAX_BYTES,
    10 * 1024 * 1024,
  ),

  /**
   * Minimum allowed image dimension (px) on either axis. Below this, plate
   * solving has too few resolvable stars to succeed. Defaults to 1000.
   * Configure via ASTROSOLVE_UPLOAD_MIN_DIMENSION.
   */
  uploadMinDimension: parsePositiveInteger(
    process.env.ASTROSOLVE_UPLOAD_MIN_DIMENSION,
    1000,
  ),

  /**
   * Maximum allowed image dimension (px) on either axis. Defends against
   * decompression bombs and pathological inputs — solve-field downsamples
   * but image decoding still has to run first. Defaults to 8000.
   * Configure via ASTROSOLVE_UPLOAD_MAX_DIMENSION.
   */
  uploadMaxDimension: parsePositiveInteger(
    process.env.ASTROSOLVE_UPLOAD_MAX_DIMENSION,
    8000,
  ),

  /**
   * Allowed file extensions for upload (lowercase, dot-prefixed). Defaults
   * to JPEG/PNG. Configure via ASTROSOLVE_UPLOAD_ALLOWED_EXTENSIONS as a
   * comma-separated list (e.g. ".jpg,.jpeg,.png").
   */
  uploadAllowedExtensions: (() => {
    const raw = process.env.ASTROSOLVE_UPLOAD_ALLOWED_EXTENSIONS;
    if (!raw) return [".jpg", ".jpeg", ".png"];
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
      .map((s) => (s.startsWith(".") ? s : `.${s}`));
  })(),

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
