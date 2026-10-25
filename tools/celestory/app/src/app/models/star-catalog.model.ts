/**
 * A packed star catalogue as produced by `scripts/build-sky-assets.mjs`.
 *
 * File layout (little-endian): `"STR1"`, `uint32 count`, then `count` records of
 * 8 bytes: `int16 x, y, z` (J2000 equatorial unit vector × 32767),
 * `uint8 mag` (`round((V + 2) × 10)`), `int8 bv` (`round((B−V) × 50)`).
 * Records are sorted by magnitude ascending, so the first N are the brightest N.
 */
export interface PackedStarCatalog {
  /** Number of star records. */
  count: number;
  /** The raw interleaved records (count × 8 bytes), ready for a GPU vertex buffer. */
  records: ArrayBuffer;
}

/** Byte size of one packed star record. */
export const STAR_RECORD_BYTES = 8;

/** Byte size of the packed catalogue header. */
export const STAR_HEADER_BYTES = 8;

/** One decoded star record (for tests, labels and picking). */
export interface DecodedStar {
  /** J2000 equatorial unit vector components. */
  x: number;
  y: number;
  z: number;
  /** Johnson V magnitude. */
  mag: number;
  /** B−V colour index. */
  bv: number;
}
