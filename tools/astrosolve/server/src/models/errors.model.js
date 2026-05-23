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
 * Carries an optional `solveStats` payload — partial telemetry parsed
 * from solve-field's stdout before it gave up (duration, source count,
 * scale guess, etc). Lets analytics record *why* a solve failed instead
 * of just *that* it failed.
 */
export class AstrometryError extends AppError {
  /**
   * @param {string} message
   * @param {Object} [solveStats] - Partial solver telemetry extracted from stdout
   */
  constructor(message, solveStats) {
    super(message);
    this.solveStats = solveStats ?? null;
  }
}

/**
 * Thrown when a catalog query (local SQLite or SIMBAD TAP) fails.
 * Carries an optional `source` field to distinguish which catalog errored.
 */
export class CatalogError extends AppError {
  /**
   * @param {string} source - The catalog that failed ('local' | 'simbad')
   * @param {string} message
   */
  constructor(source, message) {
    super(message);
    this.source = source;
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
