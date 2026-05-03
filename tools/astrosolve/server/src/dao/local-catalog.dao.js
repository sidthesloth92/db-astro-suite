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

/**
 * SQLite-backed implementation of {@link LocalCatalogDao}.
 */
export class SqliteLocalCatalogDao extends LocalCatalogDao {
  /** @type {import('better-sqlite3').Database} */
  #db;

  /** @param {import('better-sqlite3').Database} db - Open, read-only catalog database */
  constructor(db) {
    super();
    this.#db = db;
  }

  /**
   * @param {Object} params
   * @param {number} params.minRA
   * @param {number} params.maxRA
   * @param {number} params.minDec
   * @param {number} params.maxDec
   * @param {number} params.maxMagnitude
   * @param {string[]} params.types
   * @returns {Array<Object>}
   */
  queryObjectsByBoundingBox({ minRA, maxRA, minDec, maxDec, maxMagnitude, types }) {
    let sql = `
      SELECT catalog, entryId, name, commonName, type, ra, dec, magnitude, sizeArcmin
      FROM objects
      WHERE (ra BETWEEN ? AND ?)
        AND (dec BETWEEN ? AND ?)
        AND (magnitude <= ? OR catalog = 'NGC/IC' OR catalog = 'Sh2' OR catalog = 'ACO')
    `;

    const queryParams = [minRA, maxRA, minDec, maxDec, maxMagnitude];

    if (types && types.length > 0) {
      const placeholders = types.map(() => "?").join(",");
      sql += ` AND (type IN (${placeholders}) OR catalog IN (${placeholders}))`;
      queryParams.push(...types, ...types);
    }

    return this.#db.prepare(sql).all(...queryParams);
  }
}
