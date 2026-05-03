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
