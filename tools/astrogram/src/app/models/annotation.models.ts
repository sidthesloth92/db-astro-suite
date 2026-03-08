export interface ImageAnnotation {
  id: string; // Target name or UUID
  xPercent: number; // Relative to *original* uncropped image width (0-100)
  yPercent: number; // Relative to *original* uncropped image height (0-100)
  radiusDb: number; // Size derived from local DB or SIMBAD (arcmin -> pixels based on WCS scale)
  label: string; // E.g., "M 42" or "Orion Nebula"
  visible: boolean; // Governed by UI filters
  source?: 'local' | 'simbad';
  type?: string;
  name?: string;
  commonName?: string;
}

export interface LocalAstroObject {
  id: string; // Common name equivalent to Astrometry output (e.g., M 42)
  name?: string; // Friendly name (e.g., Orion Nebula)
  type: string; // 'G', 'PN', 'EN', 'Star', etc.
  mag: number; // Visual magnitude
  sizeArcmin: number; // Size in arcminutes (for default radius scaling)
}
