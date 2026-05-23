/**
 * Abstract base DAO for solve event analytics persistence.
 * Concrete implementations (e.g. SqliteSolveEventDao) must override all methods.
 */
export class SolveEventDao {
  /**
   * Inserts a single solve event row.
   *
   * @param {Object} event - Object whose keys match the columns in `solve_events`.
   *   Missing keys are stored as NULL. `outcome`, `http_status`, `response_code`,
   *   `request_id`, and `total_duration_ms` are required by the schema.
   * @returns {void}
   */
  // eslint-disable-next-line no-unused-vars
  insertEvent(event) {
    throw new Error("Not implemented");
  }

  /**
   * Returns the most recent N rows, newest first.
   *
   * @param {number} limit
   * @returns {Object[]}
   */
  // eslint-disable-next-line no-unused-vars
  listRecent(limit) {
    throw new Error("Not implemented");
  }

  /**
   * Returns rows filtered by created_at >= since, newest first.
   *
   * @param {string} since - SQLite datetime string (e.g. "2025-01-01 00:00:00")
   * @returns {Object[]}
   */
  // eslint-disable-next-line no-unused-vars
  listSince(since) {
    throw new Error("Not implemented");
  }

  /**
   * Returns the most recent N rows whose outcome is not 'success'.
   *
   * @param {number} limit
   * @returns {Object[]}
   */
  // eslint-disable-next-line no-unused-vars
  listRecentFailures(limit) {
    throw new Error("Not implemented");
  }

  /**
   * Returns an iterator over all rows (used for CSV export).
   *
   * @returns {Iterable<Object>}
   */
  iterateAll() {
    throw new Error("Not implemented");
  }
}
