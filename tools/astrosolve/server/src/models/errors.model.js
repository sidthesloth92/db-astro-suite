/**
 * Domain-specific error classes for the Astrosolve server.
 *
 * Every service-level failure should throw one of these typed errors
 * so that the route layer can map them to the correct HTTP status code
 * and structured response without fragile string-matching.
 */

/**
 * Base class for all Astrosolve domain errors.
 * Sets `this.name` automatically to the subclass constructor name.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * A typed error that carries an HTTP status code, used to distinguish
 * client-caused failures (4xx) from unexpected server errors (5xx).
 */
export class SolveError extends AppError {
  /**
   * @param {number} statusCode
   * @param {string} message
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when the Astrometry.net plate-solving process fails.
 * This covers CLI execution failures, missing WCS output, or
 * unparsable WCS data.
 *
 * Carries two optional payloads:
 * - `solveStats`: structured telemetry parsed from solve-field's stdout
 *   (duration, source count, scale guess) — copied into dedicated
 *   `solve_*` columns by the analytics hook.
 * - `diagnostics`: free-form context (command, exit code, signal,
 *   stdout/stderr tails, wcs-file existence, parse error) — JSON-encoded
 *   into the `solve_events.diagnostics` blob so a row alone is enough
 *   to reproduce / debug a failure later.
 */
export class AstrometryError extends AppError {
  /**
   * @param {string} message
   * @param {Object} [solveStats] - Partial solver telemetry extracted from stdout
   * @param {Object} [diagnostics] - Free-form failure context for the analytics blob
   */
  constructor(message, solveStats, diagnostics) {
    super(message);
    this.solveStats = solveStats ?? null;
    this.diagnostics = diagnostics ?? null;
  }
}

/**
 * Thrown when a catalog query (local SQLite or SIMBAD TAP) fails.
 * Carries an optional `source` field to distinguish which catalog errored.
 *
 * Optional `details` payload carries source-specific failure context:
 * - SIMBAD: HTTP status, axios error code, request URL, ADQL, response
 *   body tail.
 * - Local: DAO error class, error message, query params.
 * The route handler folds this into `request.analytics.diagnostics` for
 * the `solve_events` JSON blob.
 */
export class CatalogError extends AppError {
  /**
   * @param {string} source - The catalog that failed ('local' | 'simbad')
   * @param {string} message
   * @param {Object} [details] - Source-specific failure context
   */
  constructor(source, message, details) {
    super(message);
    this.source = source;
    this.details = details ?? null;
  }
}

/**
 * Thrown when an access key operation fails — e.g. username already exists,
 * key not found, or a database error during key validation.
 */
export class AccessKeyError extends AppError {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
  }
}
