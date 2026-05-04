import Database from "better-sqlite3";
import config from "../config.js";
import { SqliteBaseDao } from "./sqlite-base.dao.js";
import { CatalogError } from "../models/errors.model.js";

/**
 * SQLite-backed implementation of the LocalCatalogDao interface contract.
 * Extends {@link SqliteBaseDao} for shared database lifecycle management.
 *
 * Use the static {@link SqliteLocalCatalogDao.create} factory for production.
 * Pass an in-memory `Database` to the constructor directly in tests.
 */
export class SqliteLocalCatalogDao extends SqliteBaseDao {
  /**
   * @param {Database} db - Open, read-only better-sqlite3 catalog database
   */
  constructor(db) {
    super(db);
  }

  /**
   * Opens the local celestial catalog SQLite database in read-only mode and
   * returns a ready-to-use dao instance.
   *
   * @returns {SqliteLocalCatalogDao}
   * @throws {CatalogError} If the database file is missing or cannot be opened
   */
  static create() {
    try {
      const db = new Database(config.localCatalogDbPath, {
        readonly: true,
        fileMustExist: true,
      });
      return new SqliteLocalCatalogDao(db);
    } catch (err) {
      throw new CatalogError(
        "local",
        `Failed to open local catalog DB at "${config.localCatalogDbPath}": ${err.message}`,
      );
    }
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

    return this.db.prepare(sql).all(...queryParams);
  }
}
