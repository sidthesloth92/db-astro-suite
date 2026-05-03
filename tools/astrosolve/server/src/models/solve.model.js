/**
 * JSDoc type definitions for the Astrosolve domain model.
 *
 * These types describe the shape of data flowing between the service layer
 * and the route layer. They are used for documentation and IDE support only.
 */

/**
 * Metadata produced by the Astrometry.net plate-solve step.
 *
 * @typedef {Object} SolveMetadata
 * @property {number} ra - Right Ascension of the image center in degrees
 * @property {number} dec - Declination of the image center in degrees
 * @property {number | null} scale - Image scale derived from the CD matrix (degrees/pixel)
 * @property {string} wcs - Raw WCS FITS header string produced by solve-field
 * @property {number} radius_searched - Catalog search radius in degrees
 */

/**
 * A single celestial object returned by a catalog query (local or SIMBAD).
 *
 * @typedef {Object} CatalogObject
 * @property {string} name - Primary identifier (e.g. "NGC 224", "Sirius")
 * @property {string} type - SIMBAD object type code (e.g. "*", "G", "PN")
 * @property {number} ra - Right Ascension in degrees
 * @property {number} dec - Declination in degrees
 * @property {number | null} magnitude - Visual magnitude (null if unknown)
 * @property {'local' | 'simbad'} source - Which catalog provided this record
 * @property {string} [catalog] - Local catalog name (e.g. "Named", "HIP", "TYC")
 * @property {string} [entryId] - Catalog-specific entry ID
 * @property {string} [commonName] - Human-readable common name if available
 * @property {number | null} [sizeArcmin] - Angular size in arcminutes if known
 */

/**
 * The aggregated result returned by `processSolveRequest`.
 *
 * @typedef {Object} SolveResult
 * @property {SolveMetadata} metadata - Astrometric solution metadata
 * @property {CatalogObject[]} objects - Merged list of celestial objects in the field
 * @property {string[]} warnings - Non-fatal warnings (e.g. SIMBAD unavailable)
 */
