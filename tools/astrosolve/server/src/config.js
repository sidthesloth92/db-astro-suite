import { parsePositiveInteger } from "./utils/config.util.js";

/**
 * Centralised, validated configuration object.
 *
 * All environment variables are read once at import time and exposed as
 * a frozen object. Business logic must import `config` instead of
 * reading `process.env` directly.
 */
const config = Object.freeze({
  /** CORS origin — restrict in production via ASTROSOLVE_ORIGIN env var. */
  origin: process.env.ASTROSOLVE_ORIGIN ?? "*",

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
