/**
 * Metadata produced by the Astrometry.net plate-solve step.
 */
export interface SolveMetadata {
  ra: number;
  dec: number;
  scale: number;
  wcs: string;
  radius_searched: number;
}

/**
 * One designation contributing to a merged object — how a single sky position
 * is identified across catalogs (e.g. "Navi" / "HD 5394" / "Gaia DR3 ...").
 */
export interface ObjectAlias {
  name: string;
  type: string;
  magnitude: number | null;
  source: 'local' | 'simbad';
  catalog?: string;
}

/**
 * A single celestial object returned by the plate-solve catalog query.
 */
export interface CatalogObject {
  name: string;
  type: string;
  ra: number;
  dec: number;
  magnitude: number;
  source: 'local' | 'simbad';
  catalog?: string;
  entryId?: string;
  commonName?: string;
  sizeArcmin?: number | null;
  /** Distance to the object in light-years, when known. */
  distanceLy?: number | null;
  /** All coincident designations for this position, best-name-first. */
  aliases?: ObjectAlias[];
  /** Distinct human-readable category labels (e.g. "Galaxy", "Star"). */
  categories?: string[];
}

/**
 * Domain model returned by `AstrosolveService.solveImage()`.
 * This is the unwrapped `details` payload — components work directly with this shape.
 */
export interface AstroSolveResponse {
  metadata: SolveMetadata;
  objects: CatalogObject[];
  warnings?: string[];
}

/**
 * Raw response body returned by POST /api/v1/solve on success (API contract shape).
 */
export interface AstroSolveApiResponse {
  code: string;
  message: string;
  details: AstroSolveResponse;
}
