import { ImageAnnotation } from '../models/annotation.models';
import {
  NAMED_CATALOG_TAGS,
  NAMED_DESIGNATION_PATTERNS,
} from './annotation-named.constants';

/**
 * Whether an annotation has a real, human-recognisable catalogue designation
 * (Messier/NGC/IC/Caldwell/Sharpless/Abell + named DSOs, or HD/HIP/HR/Bayer
 * stars). Anonymous survey sources — Gaia/2MASS/TYC field stars, bracketed or
 * coordinate-only IDs, and PGC/UGC/MCG galaxies with no catalogue alias — return
 * `false`. Drives the "Named objects only" declutter filter.
 *
 * Identity-only: it does not consider magnitude (the star magnitude slider is
 * applied separately).
 */
export function isNamedAnnotation(ann: ImageAnnotation): boolean {
  if (ann.commonName?.trim()) {
    return true;
  }

  const catalog = ann.catalog?.toUpperCase().trim();
  if (catalog && NAMED_CATALOG_TAGS.has(catalog)) {
    return true;
  }

  const candidates = [ann.name, ann.label, ...(ann.aliases?.map((a) => a.name) ?? [])];
  return candidates.some((raw) => {
    const value = raw?.toUpperCase().trim();
    if (!value) {
      return false;
    }
    return NAMED_DESIGNATION_PATTERNS.some((pattern) => pattern.test(value));
  });
}
