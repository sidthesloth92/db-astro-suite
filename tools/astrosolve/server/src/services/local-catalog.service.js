import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import pino from "pino";
import { CatalogError } from "../errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(
  __dirname,
  "../../data/local-catalog/celestial.sqlite",
);

const logger = pino({ name: "local-catalog" });

/**
 * Initialize connection to the celestial SQLite database.
 */
let db;
let dbInitError = null;
try {
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
} catch (err) {
  dbInitError = new CatalogError(
    "local",
    "Local catalog database is not available. Run 'npm run init-db' first and ensure data/local-catalog/celestial.sqlite exists.",
  );
  dbInitError.cause = err;
  logger.error(dbInitError.message);
}

/**
 * Finds celestial objects within a given radius using a conical search.
 * This function uses a fast bounding-box filter followed by a spherical distance check.
 *
 * @param {Object} params - Search parameters { ra, dec, radiusDeg, maxMagnitude, types }
 * @returns {Array} List of matching celestial objects
 */
export function queryLocalCatalog({
  ra,
  dec,
  radiusDeg,
  maxMagnitude = 10,
  types = [],
}) {
  if (!db)
    throw dbInitError ?? new CatalogError("local", "Local catalog database is not available.");

  const cosDec = Math.cos((dec * Math.PI) / 180.0);

  // 1. Calculate bounding box for fast initial filter
  const raDelta = radiusDeg / Math.max(0.01, cosDec);
  const minRA = ra - raDelta;
  const maxRA = ra + raDelta;
  const minDec = dec - radiusDeg;
  const maxDec = dec + radiusDeg;

  // 2. Build Query with Dynamic Types
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

  const query = db.prepare(sql);

  // 3. Execute bounding-box query
  const candidates = query.all(...queryParams);

  // 4. Refine with accurate spherical distance check (Conical)
  const results = candidates
    .filter((obj) => {
      const dRA = (obj.ra - ra) * cosDec;
      const dDec = obj.dec - dec;
      const distSq = dRA * dRA + dDec * dDec;
      return distSq <= radiusDeg * radiusDeg;
    })
    .map((obj) => {
      // Clean OpenNGC syntax like IC0434 -> IC 434 and NGC2023 -> NGC 2023
      let cleanName = obj.name;
      if (cleanName && cleanName.match(/^(NGC|IC)0*(\d+)$/)) {
        cleanName = cleanName.replace(/^(NGC|IC)0*(\d+)$/, "$1 $2");
      }
      return {
        ...obj,
        name: cleanName,
        source: "local",
      };
    });

  return results;
}
