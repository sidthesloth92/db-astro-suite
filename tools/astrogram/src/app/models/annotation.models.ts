import { AnnotationStyle } from './annotation-settings.models';

export interface ImageAnnotation {
  id: string; // Target name or UUID
  xPercent: number; // Relative to *original* uncropped image width (0-100)
  yPercent: number; // Relative to *original* uncropped image height (0-100)
  radiusDb: number; // Size derived from local DB or SIMBAD (arcmin -> pixels based on WCS scale)
  label: string; // E.g., "M 42" or "Orion Nebula"
  visible: boolean; // Governed by UI filters
  source?: 'local' | 'simbad' | 'custom';
  catalog?: string; // 'M', 'C', 'NGC/IC', 'Sh2', 'ACO', 'HD', 'Star', etc.
  type?: string; // OpenNGC type code: 'G', 'PN', 'HII', 'GClus', 'Star', etc.
  name?: string;
  commonName?: string;
  magnitude?: number;
  /** All coincident designations for this position, best-name-first. */
  aliases?: AnnotationAlias[];
  /** Distinct human-readable category labels (e.g. "Galaxy", "Star"). */
  categories?: string[];
  /** Per-annotation visual overrides. Absent = inherit GlobalAnnotationSettings. */
  style?: AnnotationStyle;
}

/** One alternative designation for an annotation, shown in the detail pane. */
export interface AnnotationAlias {
  name: string;
  catalog?: string;
  type?: string;
  magnitude?: number | null;
}

export interface LocalAstroObject {
  id: string; // Common name equivalent to Astrometry output (e.g., M 42)
  name?: string; // Friendly name (e.g., Orion Nebula)
  type: string; // 'G', 'PN', 'EN', 'Star', etc.
  mag: number; // Visual magnitude
  sizeArcmin: number; // Size in arcminutes (for default radius scaling)
}
