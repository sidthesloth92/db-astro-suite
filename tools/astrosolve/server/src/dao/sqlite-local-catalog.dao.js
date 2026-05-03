import { LocalCatalogDao } from "./local-catalog.dao.js";

/**
 * SQLite-backed implementation of {@link LocalCatalogDao}.
 */
export class SqliteLocalCatalogDao extends LocalCatalogDao {
  #db;

  /**
   * @param db - Open, read-only better-sqlite3 catalog database
   */
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
