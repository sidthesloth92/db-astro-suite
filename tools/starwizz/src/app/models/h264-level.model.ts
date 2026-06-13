/**
 * One row of the H.264 level-limits table (ITU-T H.264 Table A-1) consumed by
 * the recording MIME-ladder builder.
 */
export interface H264LevelSpec {
  /** Two-digit uppercase level byte for codec strings (e.g. '2A' = Level 4.2). */
  levelHex: string;
  /** MaxMBPS — maximum macroblock processing rate (macroblocks/second). */
  maxMacroblocksPerSecond: number;
  /** MaxFS — maximum frame size in macroblocks. */
  maxFrameSizeMacroblocks: number;
  /** MaxBR (Baseline/Main column) converted to bits/second. */
  maxVideoBitsPerSecond: number;
}
