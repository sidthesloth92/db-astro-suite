import { H264LevelSpec } from '../models/h264-level.model';

/**
 * H.264 level limits (ITU-T H.264 Table A-1), ascending. Only the columns the
 * ladder builder needs: decoder/encoder throughput (macroblocks per second),
 * frame size (macroblocks), and the Baseline/Main max bitrate — High profile
 * allows 1.25×, so validating against the base column is conservative for
 * every rung.
 */
export const H264_LEVELS: readonly H264LevelSpec[] = [
  { levelHex: '1E', maxMacroblocksPerSecond: 40_500, maxFrameSizeMacroblocks: 1_620, maxVideoBitsPerSecond: 10_000_000 }, // 3.0
  { levelHex: '1F', maxMacroblocksPerSecond: 108_000, maxFrameSizeMacroblocks: 3_600, maxVideoBitsPerSecond: 14_000_000 }, // 3.1
  { levelHex: '20', maxMacroblocksPerSecond: 216_000, maxFrameSizeMacroblocks: 5_120, maxVideoBitsPerSecond: 20_000_000 }, // 3.2
  { levelHex: '28', maxMacroblocksPerSecond: 245_760, maxFrameSizeMacroblocks: 8_192, maxVideoBitsPerSecond: 20_000_000 }, // 4.0
  { levelHex: '29', maxMacroblocksPerSecond: 245_760, maxFrameSizeMacroblocks: 8_192, maxVideoBitsPerSecond: 50_000_000 }, // 4.1
  { levelHex: '2A', maxMacroblocksPerSecond: 522_240, maxFrameSizeMacroblocks: 8_704, maxVideoBitsPerSecond: 50_000_000 }, // 4.2
  { levelHex: '32', maxMacroblocksPerSecond: 589_824, maxFrameSizeMacroblocks: 22_080, maxVideoBitsPerSecond: 135_000_000 }, // 5.0
  { levelHex: '33', maxMacroblocksPerSecond: 983_040, maxFrameSizeMacroblocks: 36_864, maxVideoBitsPerSecond: 240_000_000 }, // 5.1
  { levelHex: '34', maxMacroblocksPerSecond: 2_073_600, maxFrameSizeMacroblocks: 36_864, maxVideoBitsPerSecond: 240_000_000 }, // 5.2
];

/**
 * Computes the minimum H.264 level (as the codec-string hex byte, e.g. '2A'
 * for Level 4.2) able to carry the given resolution, frame rate, and bitrate.
 * Requesting the *minimum sufficient* level matters on Android: budget
 * hardware encoders cap at low levels, and `MediaRecorder.isTypeSupported()`
 * does not validate level support — over-asking (e.g. a blanket Level 5.2)
 * makes recording fail at runtime on those devices.
 *
 * @param width - Output width in pixels
 * @param height - Output height in pixels
 * @param fps - Capture frame rate
 * @param bitsPerSecond - Encoder bitrate budget
 * @returns The two-digit uppercase level hex byte, or null when even the
 *   highest table level cannot carry the configuration
 */
export function computeH264LevelHex(
  width: number,
  height: number,
  fps: number,
  bitsPerSecond: number,
): string | null {
  const frameMacroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  const macroblocksPerSecond = frameMacroblocks * fps;
  const level = H264_LEVELS.find(
    (spec) =>
      macroblocksPerSecond <= spec.maxMacroblocksPerSecond &&
      frameMacroblocks <= spec.maxFrameSizeMacroblocks &&
      bitsPerSecond <= spec.maxVideoBitsPerSecond,
  );
  return level?.levelHex ?? null;
}

/**
 * Builds the MediaRecorder MIME-type preference ladder for a recording, best
 * first: H.264 High → Main → Constrained Baseline (all at the minimum
 * sufficient level for the configuration), then container-only MP4, then
 * VP9 WebM, then plain WebM as the universal fallback. No audio codec is
 * requested — the canvas capture stream has no audio track.
 *
 * @param width - Output width in pixels
 * @param height - Output height in pixels
 * @param fps - Capture frame rate
 * @param bitsPerSecond - Encoder bitrate budget
 * @returns MIME types in preference order
 */
export function buildRecordingMimeLadder(
  width: number,
  height: number,
  fps: number,
  bitsPerSecond: number,
): readonly string[] {
  const levelHex = computeH264LevelHex(width, height, fps, bitsPerSecond);
  const avcRungs =
    levelHex === null
      ? []
      : [
          `video/mp4;codecs=avc1.6400${levelHex}`, // High profile
          `video/mp4;codecs=avc1.4D40${levelHex}`, // Main profile
          `video/mp4;codecs=avc1.42E0${levelHex}`, // Constrained Baseline
        ];
  return [...avcRungs, 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
}
