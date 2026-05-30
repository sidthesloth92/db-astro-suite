import Database from "better-sqlite3";
import config from "../config.js";
import { SqliteBaseDao } from "./sqlite-base.dao.js";
import { CatalogError } from "../models/errors.model.js";
import {
  DSO_RESULT_CAP,
  STAR_RESULT_CAP,
} from "../constants/catalog.constants.js";
import {
  starMagnitudeCutoff,
  decBounds,
  raRanges,
} from "../utils/catalog-query.util.js";

const SELECT_COLUMNS =
  "catalog, entryId, name, commonName, type, ra, dec, magnitude, sizeArcmin";

/**
 * SQLite-backed implementation of the LocalCatalogDao interface contract.
 * Extends {@link SqliteBaseDao} for shared database lifecycle management.
 *
 * Use the static {@link SqliteLocalCatalogDao.create} factory for production.
 * Pass an in-memory `Database` to the constructor directly in tests.
 */
export class SqliteLocalCatalogDao extends SqliteBaseDao {
  /** Whether an R-tree spatial index (`objects_rtree`) is present. */
  #hasRtree;

  /**
   * @param {Database} db - Open better-sqlite3 catalog database
   */
  constructor(db) {
    super(db);
    this.#hasRtree = this.#detectRtree();
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
   * Queries celestial objects within a cone using the spatial index, applying
   * two-tier inclusion: all deep-sky objects in the field (capped) plus the
   * brightest stars down to a field-size-aware magnitude cutoff (capped,
   * brightest first). Handles RA wraparound at the 0/360° seam by issuing one
   * query per non-wrapping RA range.
   *
   * The returned rows are a bounding-box prefilter; the service refines them
   * with an exact spherical-distance (conical) check.
   *
   * @param {Object} params
   * @param {number} params.ra - Right Ascension of the search center (degrees)
   * @param {number} params.dec - Declination of the search center (degrees)
   * @param {number} params.radiusDeg - Search radius (half-diagonal) in degrees
   * @param {string[]} [params.types] - Object type codes to additionally include
   * @returns {Array<Object>} Raw rows from the `objects` table
   */
  queryObjectsInRegion({ ra, dec, radiusDeg, types = [] }) {
    const { minDec, maxDec } = decBounds(dec, radiusDeg);
    const ranges = raRanges(ra, dec, radiusDeg);
    const starCutoff = starMagnitudeCutoff(radiusDeg);

    const dsoRows = [];
    const starRows = [];
    for (const { minRA, maxRA } of ranges) {
      dsoRows.push(...this.#queryDsos({ minRA, maxRA, minDec, maxDec, types }));
      starRows.push(
        ...this.#queryStars({ minRA, maxRA, minDec, maxDec, starCutoff }),
      );
    }

    // Stars come back brightest-first per range; re-sort the merged set so the
    // global cap keeps the brightest across both ranges, then cap each tier.
    starRows.sort((a, b) => (a.magnitude ?? Infinity) - (b.magnitude ?? Infinity));
    return [
      ...dsoRows.slice(0, DSO_RESULT_CAP),
      ...starRows.slice(0, STAR_RESULT_CAP),
    ];
  }

  /**
   * Returns all deep-sky objects (type other than the stellar literal 'Star')
   * inside the bounding box, plus any explicitly requested types/catalogs.
   *
   * @param {{minRA:number,maxRA:number,minDec:number,maxDec:number,types:string[]}} box
   * @returns {Array<Object>}
   */
  #queryDsos({ minRA, maxRA, minDec, maxDec, types }) {
    const { spatialClause, spatialParams } = this.#spatialPrefilter({
      minRA,
      maxRA,
      minDec,
      maxDec,
    });

    let typeClause = "o.type <> 'Star'";
    const params = [...spatialParams];
    // The `types` extension widens *DSO* inclusion; pure stars already have
    // their own (magnitude-capped) tier, so 'Star' is stripped to avoid a row
    // matching both tiers and being returned twice.
    const dsoTypes = (types ?? []).filter((t) => t !== "Star");
    if (dsoTypes.length > 0) {
      const placeholders = dsoTypes.map(() => "?").join(",");
      typeClause = `(o.type <> 'Star' OR o.type IN (${placeholders}) OR o.catalog IN (${placeholders}))`;
      params.push(...dsoTypes, ...dsoTypes);
    }

    const sql = `
      SELECT ${this.#selectList()}
      FROM objects o${this.#rtreeJoin()}
      WHERE ${spatialClause}
        AND ${typeClause}
      LIMIT ${DSO_RESULT_CAP}
    `;
    return this.db.prepare(sql).all(...params);
  }

  /**
   * Returns stars (stellar literal 'Star') inside the bounding box no fainter
   * than the cutoff, brightest first, capped.
   *
   * @param {{minRA:number,maxRA:number,minDec:number,maxDec:number,starCutoff:number}} box
   * @returns {Array<Object>}
   */
  #queryStars({ minRA, maxRA, minDec, maxDec, starCutoff }) {
    const { spatialClause, spatialParams } = this.#spatialPrefilter({
      minRA,
      maxRA,
      minDec,
      maxDec,
    });

    const sql = `
      SELECT ${this.#selectList()}
      FROM objects o${this.#rtreeJoin()}
      WHERE ${spatialClause}
        AND o.type = 'Star'
        AND o.magnitude IS NOT NULL
        AND o.magnitude <= ?
      ORDER BY o.magnitude ASC
      LIMIT ${STAR_RESULT_CAP}
    `;
    return this.db.prepare(sql).all(...spatialParams, starCutoff);
  }

  /**
   * Builds the spatial-prefilter SQL fragment and its bind params, using the
   * R-tree index when present and falling back to a bounded range scan on the
   * `objects` table otherwise. Both forms select the same set of rows.
   *
   * @param {{minRA:number,maxRA:number,minDec:number,maxDec:number}} box
   * @returns {{ spatialClause: string, spatialParams: number[] }}
   */
  #spatialPrefilter({ minRA, maxRA, minDec, maxDec }) {
    if (this.#hasRtree) {
      // R-tree stores a (degenerate, for point objects) bounding box per id;
      // overlap test selects every object whose box intersects the query box.
      return {
        spatialClause:
          "r.maxRA >= ? AND r.minRA <= ? AND r.maxDec >= ? AND r.minDec <= ?",
        spatialParams: [minRA, maxRA, minDec, maxDec],
      };
    }
    return {
      spatialClause: "o.ra BETWEEN ? AND ? AND o.dec BETWEEN ? AND ?",
      spatialParams: [minRA, maxRA, minDec, maxDec],
    };
  }

  /**
   * @returns {string} The qualified column list for the objects alias.
   */
  #selectList() {
    return SELECT_COLUMNS.split(", ")
      .map((c) => `o.${c}`)
      .join(", ");
  }

  /**
   * @returns {string} The R-tree JOIN clause, or empty when no R-tree exists.
   */
  #rtreeJoin() {
    return this.#hasRtree ? " JOIN objects_rtree r ON r.id = o.id" : "";
  }

  /**
   * Detects whether the `objects_rtree` virtual table exists in this database.
   *
   * @returns {boolean}
   */
  #detectRtree() {
    const row = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'objects_rtree'",
      )
      .get();
    return row != null;
  }
}
