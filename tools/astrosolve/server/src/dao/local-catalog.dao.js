/**
 * Raw data access for the local celestial catalog SQLite database.
 *
 * This module executes bounding-box pre-filter queries against the catalog.
 * Refinement (spherical distance check, name normalisation) is handled by
 * the service layer.
 */

/**
 * Abstract base DAO for local catalog queries.
 * Concrete implementations (e.g. SqliteLocalCatalogDao) must override all methods.
 */
export class LocalCatalogDao {
  /**
   * Queries celestial objects within an RA/Dec bounding box.
   *
   * @param {Object} params - Bounding-box query parameters
   * @param {number} params.minRA - Minimum Right Ascension (degrees)
   * @param {number} params.maxRA - Maximum Right Ascension (degrees)
   * @param {number} params.minDec - Minimum Declination (degrees)
   * @param {number} params.maxDec - Maximum Declination (degrees)
   * @param {number} params.maxMagnitude - Faintest magnitude to include (lower = brighter)
   * @param {string[]} params.types - Object type codes to additionally include (empty = no type filter)
   * @returns {Array<Object>} Raw rows from the `objects` table
   */
  // eslint-disable-next-line no-unused-vars
  queryObjectsByBoundingBox(params) {
    throw new Error("Not implemented");
  }
}
