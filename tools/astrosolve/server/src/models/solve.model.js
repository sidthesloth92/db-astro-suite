/**
 * Domain model classes and JSDoc type definitions for the Astrosolve domain.
 *
 * These classes are the primary contract between the service layer and the
 * route layer. The JSDoc `@typedef` annotations are retained for IDE support.
 */

/**
 * Metadata produced by the Astrometry.net plate-solve step.
 */
export class SolveMetadata {
  /**
   * @param {number} ra - Right Ascension of the image center in degrees
   * @param {number} dec - Declination of the image center in degrees
   * @param {number | null} scale - Image scale derived from the CD matrix (degrees/pixel)
   * @param {string} wcs - Raw WCS FITS header string produced by solve-field
   * @param {number} radius_searched - Catalog search radius in degrees
   */
  constructor(ra, dec, scale, wcs, radius_searched) {
    this.ra = ra;
    this.dec = dec;
    this.scale = scale;
    this.wcs = wcs;
    this.radius_searched = radius_searched;
  }
}

/**
 * One designation contributing to a merged celestial object — i.e. how a
 * single sky position is identified across catalogs (e.g. the same star as
 * "Navi", "HD 5394", and "Gaia DR3 ...").
 *
 * @typedef {Object} ObjectAlias
 * @property {string} name - The designation/name from this catalog
 * @property {string} type - Object type code for this entry
 * @property {number | null} magnitude - Magnitude from this entry (null if unknown)
 * @property {'local' | 'simbad'} source - Which service provided it
 * @property {string} [catalog] - Catalog tag (e.g. "Named", "PGC", "Gaia")
 */

/**
 * A single celestial object returned by a catalog query (local or SIMBAD).
 *
 * After merging, an object may represent several coincident catalog entries:
 * `aliases` lists every contributing designation and `categories` the distinct
 * human-readable type labels, so the UI can let the user pick which name to
 * show and see what the object is.
 */
export class CatalogObject {
  /**
   * @param {string} name - Primary identifier (e.g. "NGC 224", "Sirius")
   * @param {string} type - SIMBAD object type code (e.g. "*", "G", "PN")
   * @param {number} ra - Right Ascension in degrees
   * @param {number} dec - Declination in degrees
   * @param {number | null} magnitude - Visual magnitude (null if unknown)
   * @param {'local' | 'simbad'} source - Which catalog provided this record
   * @param {string} [catalog] - Local catalog name (e.g. "Named", "HIP", "TYC")
   * @param {string} [entryId] - Catalog-specific entry ID
   * @param {string} [commonName] - Human-readable common name if available
   * @param {number | null} [sizeArcmin] - Angular size in arcminutes if known
   * @param {ObjectAlias[]} [aliases] - All coincident designations (incl. this one)
   * @param {string[]} [categories] - Distinct human-readable category labels
   */
  constructor(
    name,
    type,
    ra,
    dec,
    magnitude,
    source,
    catalog,
    entryId,
    commonName,
    sizeArcmin,
    aliases,
    categories,
  ) {
    this.name = name;
    this.type = type;
    this.ra = ra;
    this.dec = dec;
    this.magnitude = magnitude;
    this.source = source;
    this.catalog = catalog;
    this.entryId = entryId;
    this.commonName = commonName;
    this.sizeArcmin = sizeArcmin;
    this.aliases = aliases;
    this.categories = categories;
  }
}

/**
 * The aggregated result returned by `processSolveRequest`.
 */
export class SolveResult {
  /**
   * @param {SolveMetadata} metadata - Astrometric solution metadata
   * @param {CatalogObject[]} objects - Merged list of celestial objects in the field
   * @param {string[]} warnings - Non-fatal warnings (e.g. SIMBAD unavailable)
   */
  constructor(metadata, objects, warnings) {
    this.metadata = metadata;
    this.objects = objects;
    this.warnings = warnings;
  }
}
