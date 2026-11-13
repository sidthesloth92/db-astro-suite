/** One ISO-BMFF ("MP4") box located inside a byte buffer. */
export interface Mp4Box {
  /** Four-character box type, e.g. `moov`, `mvhd`, `mdhd`. */
  type: string;
  /** Offset of the first byte after the box's size/type header. */
  bodyStart: number;
  /** Offset one past the box's last byte. */
  end: number;
}

/** Time fields shared by the `mvhd` (movie) and `mdhd` (track media) header boxes. */
export interface Mp4TimeHeader {
  /** Units per second for this header's duration. */
  timescale: number;
  /** Duration in `timescale` units. */
  duration: number;
  /** Offset of the duration field, for rewriting it in place. */
  durationOffset: number;
  /** Width of the duration field: 4 (version 0) or 8 (version 1). */
  durationBytes: number;
}
