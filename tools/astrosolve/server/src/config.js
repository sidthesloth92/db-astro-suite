import { parsePositiveInteger } from "./utils/config.util.js";

/**
 * Centralised, validated configuration object.
 *
 * All environment variables are read once at import time and exposed as
 * a frozen object. Business logic must import `config` instead of
 * reading `process.env` directly.
 */
const config = Object.freeze({
  /** API server port. */
  port: parsePositiveInteger(process.env.ASTROSOLVE_PORT, 3000),

  /** API server host (0.0.0.0 for Docker). */
  host: process.env.ASTROSOLVE_HOST ?? "0.0.0.0",

  /** CORS origin — restrict in production via ASTROSOLVE_ORIGIN env var. */
  origin: (() => {
    const org = process.env.ASTROSOLVE_ORIGIN ?? "*";
    if (org.includes("localhost")) return "*";
    return org.includes(",") ? org.split(",").map((s) => s.trim()) : org;
  })(),

  /** Maximum concurrent plate-solve jobs. */
  queueConcurrency: parsePositiveInteger(
    process.env.ASTROSOLVE_QUEUE_CONCURRENCY,
    2,
  ),

  /** Maximum queued jobs before returning 503. */
  queueMaxSize: parsePositiveInteger(
    process.env.ASTROSOLVE_QUEUE_MAX_SIZE,
    10,
  ),
});

export default config;
