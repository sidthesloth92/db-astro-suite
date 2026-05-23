/**
 * Typed response models for the POST /api/v1/solve endpoint.
 *
 * Every response body shipped from the route handler is constructed as one of
 * these classes so the API contract `{ code, message, details }` is enforced
 * in a single place rather than reconstructed ad-hoc at every reply site.
 *
 * The route serialises an instance directly via `reply.send(...)`; Fastify
 * calls `JSON.stringify`, which in turn invokes each class's `toJSON()`.
 */

/**
 * Successful plate-solve response. Carries the merged catalog + WCS metadata
 * and an optional list of non-fatal warnings (e.g. SIMBAD unavailable).
 */
export class SolveSuccessResponse {
  /**
   * @param {Object} metadata - SolveMetadata produced by processSolveRequest
   * @param {Object[]} objects - Merged + deduplicated catalog objects
   * @param {string[]} [warnings] - Optional non-fatal warnings; omitted from
   *   the serialised payload when empty/absent.
   */
  constructor(metadata, objects, warnings) {
    this.code = "SOLVE_SUCCESS";
    this.message = "Plate solve completed successfully.";
    this.metadata = metadata;
    this.objects = objects;
    this.warnings = warnings;
  }

  /**
   * @returns {{code: string, message: string, details: Object}}
   */
  toJSON() {
    const details = {
      metadata: this.metadata,
      objects: this.objects,
      ...(this.warnings?.length ? { warnings: this.warnings } : {}),
    };
    return {
      code: this.code,
      message: this.message,
      details,
    };
  }
}

/**
 * Error response for the solve endpoint. Used for VALIDATION_ERROR,
 * SOLVE_FAILED, SERVER_BUSY, and any future error code with no extra
 * payload beyond `{ code, message, details: {} }`.
 */
export class SolveErrorResponse {
  /**
   * @param {string} code - API error code (e.g. "VALIDATION_ERROR")
   * @param {string} message - Human-readable error message
   */
  constructor(code, message) {
    this.code = code;
    this.message = message;
  }

  /**
   * @returns {{code: string, message: string, details: Object}}
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: {},
    };
  }
}
