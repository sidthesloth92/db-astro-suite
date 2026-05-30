/**
 * Raw data access for the local celestial catalog SQLite database.
 *
 * This module executes spatial region queries against the catalog using its
 * spatial index. Refinement (exact spherical-distance check, name
 * normalisation) is handled by the service layer.
 */

/**
 * Abstract base DAO for local catalog queries.
 * Concrete implementations (e.g. SqliteLocalCatalogDao) must override all methods.
 */
export class LocalCatalogDao {
  /**
   * Queries celestial objects within a cone (center + radius), applying
   * two-tier inclusion (all DSOs plus the brightest stars, each capped) and
   * handling RA wraparound at the 0/360° seam. Returns a bounding-box
   * prefilter for the service layer to refine conically.
   *
   * @param {Object} params - Region query parameters
   * @param {number} params.ra - Right Ascension of the search center (degrees)
   * @param {number} params.dec - Declination of the search center (degrees)
   * @param {number} params.radiusDeg - Search radius (half-diagonal) in degrees
   * @param {string[]} [params.types] - Object type codes to additionally include
   * @returns {Array<Object>} Raw rows from the `objects` table
   */
  // eslint-disable-next-line no-unused-vars
  queryObjectsInRegion(params) {
    throw new Error("Not implemented");
  }
}
