import { CatalogError } from "../models/errors.model.js";
import { LocalCatalogDao } from "../dao/local-catalog.dao.js";
import { CatalogObject } from "../models/solve.model.js";

/**
 * Finds celestial objects within a given radius of the given coordinates using a
 * two-step conical search: a fast bounding-box SQL pre-filter followed by an
 * accurate spherical distance check.
 *
 * @param {LocalCatalogDao} localCatalogDao - DAO instance for the local catalog
 * @param {Object} params - Search parameters
 * @param {number} params.ra - Right Ascension of the search center (degrees)
 * @param {number} params.dec - Declination of the search center (degrees)
 * @param {number} params.radiusDeg - Search radius in degrees
 * @param {number} [params.maxMagnitude=10] - Faintest magnitude to include
 * @param {string[]} [params.types=[]] - Object type codes to additionally include
 * @param {Object} params.log - Fastify-compatible structured logger
 * @returns {CatalogObject[]} Matching celestial objects
 * @throws {CatalogError} If the DAO is not provided
 */
export function queryLocalCatalog(
  localCatalogDao,
  { ra, dec, radiusDeg, maxMagnitude = 10, types = [], log },
) {
  if (!localCatalogDao) {
    throw new CatalogError("local", "Local catalog database is not available.");
  }

  const cosDec = Math.cos((dec * Math.PI) / 180.0);

  // Calculate bounding box for fast initial filter
  const raDelta = radiusDeg / Math.max(0.01, cosDec);
  const minRA = ra - raDelta;
  const maxRA = ra + raDelta;
  const minDec = dec - radiusDeg;
  const maxDec = dec + radiusDeg;

  const candidates = localCatalogDao.queryObjectsByBoundingBox({
    minRA,
    maxRA,
    minDec,
    maxDec,
    maxMagnitude,
    types,
  });

  // Refine with accurate spherical distance check (conical)
  return candidates
    .filter((obj) => {
      const dRA = (obj.ra - ra) * cosDec;
      const dDec = obj.dec - dec;
      return dRA * dRA + dDec * dDec <= radiusDeg * radiusDeg;
    })
    .map((obj) => {
      // Normalise OpenNGC syntax: IC0434 → IC 434, NGC2023 → NGC 2023
      let cleanName = obj.name;
      if (cleanName && cleanName.match(/^(NGC|IC)0*(\d+)$/)) {
        cleanName = cleanName.replace(/^(NGC|IC)0*(\d+)$/, "$1 $2");
      }
      return { ...obj, name: cleanName, source: "local" };
    });
}
