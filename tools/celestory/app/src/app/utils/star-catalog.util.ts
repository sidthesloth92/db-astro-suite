/**
 * Reader for the packed star catalogue format (see `star-catalog.model.ts`).
 * Pure functions: validation + record decoding. Fetching lives in the sky asset
 * service.
 */
import {
  type DecodedStar,
  type PackedStarCatalog,
  STAR_HEADER_BYTES,
  STAR_RECORD_BYTES,
} from '../models/star-catalog.model';
import { StarCatalogFormatError } from '../models/sky-assets.error';

/** Validate a fetched catalogue buffer and expose its records. */
export function parseStarCatalog(buffer: ArrayBuffer): PackedStarCatalog {
  if (buffer.byteLength < STAR_HEADER_BYTES) {
    throw new StarCatalogFormatError('file shorter than header');
  }
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'STR1') {
    throw new StarCatalogFormatError(`bad magic "${magic}"`);
  }
  const count = view.getUint32(4, true);
  const expected = STAR_HEADER_BYTES + count * STAR_RECORD_BYTES;
  if (buffer.byteLength < expected) {
    throw new StarCatalogFormatError(`expected ${expected} bytes for ${count} stars, got ${buffer.byteLength}`);
  }
  return { count, records: buffer.slice(STAR_HEADER_BYTES, expected) };
}

/** Decode record `i` of a parsed catalogue. */
export function decodeStar(cat: PackedStarCatalog, i: number): DecodedStar {
  const v = new DataView(cat.records, i * STAR_RECORD_BYTES, STAR_RECORD_BYTES);
  return {
    x: v.getInt16(0, true) / 32767,
    y: v.getInt16(2, true) / 32767,
    z: v.getInt16(4, true) / 32767,
    mag: v.getUint8(6) / 10 - 2,
    bv: v.getInt8(7) / 50,
  };
}

/**
 * Number of leading records with magnitude ≤ `limit` (records are sorted by
 * magnitude). Binary search; used to draw only stars above the limiting magnitude.
 */
export function countBrighterThan(cat: PackedStarCatalog, limit: number): number {
  const encoded = Math.round((limit + 2) * 10);
  const bytes = new Uint8Array(cat.records);
  let lo = 0;
  let hi = cat.count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (bytes[mid * STAR_RECORD_BYTES + 6] <= encoded) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
