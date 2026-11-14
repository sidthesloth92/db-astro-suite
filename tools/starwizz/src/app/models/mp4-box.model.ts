/** One ISO-BMFF ("MP4") box located inside a byte buffer. */
export interface Mp4Box {
  /** Four-character box type, e.g. `moov`, `mvhd`, `mdhd`. */
  type: string;
  /** Offset of the box's first byte (its size field). */
  start: number;
  /** Offset of the first byte after the box's size/type header. */
  bodyStart: number;
  /** Offset one past the box's last byte. */
  end: number;
}

/** The size/type header at the front of a box, before its extents are checked. */
export interface Mp4BoxHeader {
  /** Four-character box type. */
  type: string;
  /** Bytes taken by the header: 8, or 16 with a 64-bit size. */
  headerBytes: number;
  /** Declared size of the whole box in bytes; 0 means "to the end of the file". */
  size: number;
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

/** What a fragmented file's `trex` box says a track's samples default to. */
export interface Mp4SampleDefaults {
  /** Index of the sample description (codec setup) the samples use. */
  descriptionIndex: number;
  /** Sample duration in the track's timescale. */
  duration: number;
  /** Sample size in bytes. */
  size: number;
  /** Sample flags; bit 16 set means "not a keyframe". */
  flags: number;
}

/** One media sample (a video frame) as a fragment describes it. */
export interface Mp4Sample {
  /** Size in bytes. */
  size: number;
  /** Duration in the track's timescale, as the fragment declares it. */
  duration: number;
  /** Presentation time minus decode time, in the track's timescale. */
  compositionOffset: number;
  /** True when the sample is a keyframe. */
  isSync: boolean;
}

/** A run of samples stored back to back in the file: one track's share of one fragment. */
export interface Mp4SampleRun {
  /** Track the samples belong to. */
  trackId: number;
  /** Index of the sample description (codec setup) the samples use. */
  descriptionIndex: number;
  /** File offset of the first sample's first byte. */
  offset: number;
  /** Decode time of the first sample in the track's timescale, when the fragment states it. */
  decodeTime: number | null;
  /** The samples, in file order. */
  samples: Mp4Sample[];
}

/** One movie fragment's index box, read out of a recording. */
export interface Mp4FragmentIndex {
  /** Where the `moof` box starts in the file. */
  offset: number;
  /** The `moof` box. */
  bytes: Uint8Array<ArrayBuffer>;
}

/** The parts of a fragmented MP4 needed to rewrite it as an ordinary one. */
export interface Mp4FragmentedLayout {
  /** The `ftyp` box, when the file has one. */
  ftyp: Uint8Array<ArrayBuffer> | null;
  /** The `moov` box. */
  moov: Uint8Array<ArrayBuffer>;
  /** Every sample run of every track, in file order. */
  runs: Mp4SampleRun[];
}

/** Where the sample runs of a recording go when it is rewritten as an ordinary MP4. */
export interface Mp4ChunkPlan {
  /** Every sample run of every track, in file order. Each becomes one chunk. */
  runs: readonly Mp4SampleRun[];
  /** File offset of each run's data in the rewritten file, in the same order. */
  chunkOffsets: readonly number[];
  /** True when the offsets need 64 bits (files over 4 GB). */
  hasWideOffsets: boolean;
}

/** One track rebuilt for an ordinary MP4. */
export interface Mp4PlainTrack {
  /** The new `trak` box. */
  box: Uint8Array<ArrayBuffer>;
  /** The track's duration in the movie timescale. */
  duration: number;
}
