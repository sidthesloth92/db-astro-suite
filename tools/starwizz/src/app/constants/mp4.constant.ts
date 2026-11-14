// Flag bits and limits of the ISO base media file format ("MP4"), as far as recorded clips use
// them. Names follow ISO/IEC 14496-12.

/** `tfhd` flag: the track fragment states the file offset its data offsets count from. */
export const TFHD_BASE_DATA_OFFSET = 0x000001;
/** `tfhd` flag: a sample description index is present. */
export const TFHD_DESCRIPTION_INDEX = 0x000002;
/** `tfhd` flag: a default sample duration is present. */
export const TFHD_DEFAULT_DURATION = 0x000008;
/** `tfhd` flag: a default sample size is present. */
export const TFHD_DEFAULT_SIZE = 0x000010;
/** `tfhd` flag: default sample flags are present. */
export const TFHD_DEFAULT_FLAGS = 0x000020;
/** `tfhd` flag: data offsets count from the start of the enclosing `moof`. */
export const TFHD_DEFAULT_BASE_IS_MOOF = 0x020000;

/** `trun` flag: the run states where its data starts. */
export const TRUN_DATA_OFFSET = 0x000001;
/** `trun` flag: the first sample has flags of its own. */
export const TRUN_FIRST_SAMPLE_FLAGS = 0x000004;
/** `trun` flag: every sample states its duration. */
export const TRUN_SAMPLE_DURATIONS = 0x000100;
/** `trun` flag: every sample states its size. */
export const TRUN_SAMPLE_SIZES = 0x000200;
/** `trun` flag: every sample states its flags. */
export const TRUN_SAMPLE_FLAGS = 0x000400;
/** `trun` flag: every sample states its composition time offset. */
export const TRUN_COMPOSITION_OFFSETS = 0x000800;

/** Sample flag bit that marks a sample as not a keyframe. */
export const SAMPLE_IS_NOT_SYNC = 0x00010000;

/**
 * `ftyp` brands that promise movie fragments or the features that come with them. They are
 * dropped when a recording is rewritten as an ordinary MP4.
 */
export const MP4_FRAGMENT_BRANDS: readonly string[] = [
  'iso5',
  'iso6',
  'msdh',
  'msix',
  'dash',
  'cmfc',
];

/**
 * Largest `moov` or `moof` box (bytes) that is read into memory. A recording's are a few
 * kilobytes; anything near this size is not one of ours.
 */
export const MP4_MAX_INDEX_BOX_BYTES = 16 * 1024 * 1024;

/**
 * Bytes fetched at once while walking a recording's boxes. Large enough to take in a fragment's
 * index (about 1 kB per hundred frames) and the header of the media data that follows it.
 */
export const MP4_SCAN_WINDOW_BYTES = 16 * 1024;

/** Largest value a 32-bit box field can hold. */
export const MP4_UINT32_MAX = 0xffffffff;
