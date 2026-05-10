/**
 * Shared rate-limit configuration constants.
 *
 * Built once from the startup config object so that route files stay
 * clean and all rate-limit tuning lives in a single place.
 */

import config from "../config.js";

/**
 * Rate-limit options applied globally to the solve endpoint.
 *
 * @type {Readonly<{ max: number, timeWindow: string }>}
 */
export const SOLVE_RATE_LIMIT = Object.freeze({
  max: config.rateLimitMax,
  timeWindow: config.rateLimitWindow,
});

/**
 * Per-route rate-limit options for the health-check endpoint (`GET /`).
 * Uses a higher threshold than the solve endpoint so that uptime probes
 * and monitoring tools are not inadvertently blocked.
 *
 * @type {Readonly<{ max: number, timeWindow: string }>}
 */
export const HEALTH_RATE_LIMIT = Object.freeze({
  max: config.healthRateLimitMax,
  timeWindow: config.healthRateLimitWindow,
});
