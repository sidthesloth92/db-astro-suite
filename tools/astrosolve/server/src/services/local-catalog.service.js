import { LocalCatalogDao } from "../dao/local-catalog.dao.js";
import { CatalogObject } from "../models/solve.model.js";
import { CatalogError } from "../models/errors.model.js";

/** Regex used to normalise OpenNGC compact names (e.g. NGC2023 → NGC 2023, IC0434 → IC 434). */
const NAME_NORMALISE_RE = /^(NGC|IC)0*(\d+)$/;

/**
 * Finds celestial objects within a given radius of the given coordinates using a
 * two-step conical search: a fast bounding-box SQL pre-filter followed by an
 * accurate spherical distance check.
 *
 * When `localCatalogDao` is `null` (local catalog not configured), returns an
 * empty array gracefully so the caller can fall back to remote catalog data.
 *
 * @param {LocalCatalogDao | null} localCatalogDao - DAO instance for the local catalog,
 *   or null if the local catalog is not configured
 * @param {Object} params - Search parameters
 * @param {number} params.ra - Right Ascension of the search center (degrees)
 * @param {number} params.dec - Declination of the search center (degrees)
 * @param {number} params.radiusDeg - Search radius in degrees
 * @param {number} [params.maxMagnitude=10] - Faintest magnitude to include
 * @param {string[]} [params.types=[]] - Object type codes to additionally include
 * @param {Object} params.log - Fastify-compatible structured logger
 * @returns {Promise<CatalogObject[]>} Matching celestial objects, or an empty array if the
 *   local catalog is unavailable
 */
export async function findObjectsInRadius(
  localCatalogDao,
  { ra, dec, radiusDeg, maxMagnitude = 10, types = [], log },
) {
  if (!localCatalogDao) {
    log.info("Local catalog DAO not configured — skipping local catalog query.");
    return [];
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
      if (cleanName && NAME_NORMALISE_RE.test(cleanName)) {
        cleanName = cleanName.replace(NAME_NORMALISE_RE, "$1 $2");
      }
      return new CatalogObject(
        cleanName,
        obj.type,
        obj.ra,
        obj.dec,
        obj.magnitude ?? null,
        "local",
        obj.catalog,
        obj.entryId,
        obj.commonName,
        obj.sizeArcmin ?? null,
      );
    });
}
