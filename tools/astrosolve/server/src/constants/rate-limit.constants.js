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

/**
 * Per-route rate-limit override for `POST /api/v1/solve`.
 *
 * The bucket is the access key when one was supplied (so a key cannot
 * exceed its cap no matter how many IPs it rotates through), and falls
 * back to the caller's IP for anonymous traffic. The cap itself is
 * dynamic:
 *
 *   - Authenticated callers: `solveKeyRateLimitMax` (default 10/min).
 *     A legitimate operator re-running solves on the same key.
 *
 *   - Anonymous callers: `rateLimitMax` (default 2/min). Hyper-aggressive
 *     on purpose — every unauthenticated request is a multi-MB upload
 *     into a CPU-bound queue, so the floor is intentionally low.
 *
 * Because `@fastify/rate-limit` v10 replaces (rather than stacks) the
 * global config when a per-route override is set, this single override
 * encodes both intents at once.
 *
 * @type {Readonly<{ max: Function, timeWindow: string, keyGenerator: Function }>}
 */
export const SOLVE_KEY_RATE_LIMIT = Object.freeze({
  max: (req) =>
    req.headers["x-access-key"]
      ? config.solveKeyRateLimitMax
      : config.rateLimitMax,
  timeWindow: config.solveKeyRateLimitWindow,
  keyGenerator: (req) => req.headers["x-access-key"] || req.ip,
});
