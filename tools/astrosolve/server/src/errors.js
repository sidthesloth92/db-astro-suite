/**
 * Domain-specific error classes for the Astrosolve server.
 *
 * Every service-level failure should throw one of these typed errors
 * so that the route layer can map them to the correct HTTP status code
 * and structured response without fragile string-matching.
 */

/**
 * A typed error that carries an HTTP status code, used to distinguish
 * client-caused failures (4xx) from unexpected server errors (5xx).
 */
export class SolveError extends Error {
  /** @param {number} statusCode @param {string} message */
  constructor(statusCode, message) {
    super(message);
    this.name = "SolveError";
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when the Astrometry.net plate-solving process fails.
 * This covers CLI execution failures, missing WCS output, or
 * unparsable WCS data.
 */
export class AstrometryError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "AstrometryError";
  }
}

/**
 * Thrown when a catalog query (local SQLite or SIMBAD TAP) fails.
 * Carries an optional `source` field to distinguish which catalog errored.
 */
export class CatalogError extends Error {
  /**
   * @param {string} source - The catalog that failed ('local' | 'simbad')
   * @param {string} message
   */
  constructor(source, message) {
    super(message);
    this.name = "CatalogError";
    this.source = source;
  }
}
