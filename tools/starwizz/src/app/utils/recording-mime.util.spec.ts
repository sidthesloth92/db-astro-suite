import { buildRecordingMimeLadder, computeH264LevelHex } from './recording-mime.util';

describe('recording-mime.util', () => {
  describe('computeH264LevelHex', () => {
    it('should map every output format to its minimum sufficient level', () => {
      // [width, height, fps, bps, expected level hex]
      const cases: [number, number, number, number, string][] = [
        [1080, 1920, 60, 12_441_600, '2A'], // reels @60 → L4.2 (489,600 MB/s)
        [1080, 1920, 30, 4_354_560, '28'], // reels @30 → L4.0
        [1080, 1350, 60, 8_751_600, '2A'], // ig-portrait @60 → L4.2
        [1080, 1350, 30, 3_062_340, '28'], // ig-portrait @30 — MB/s fits L3.2, MaxFS (5,780 > 5,120) forces L4.0
        [1080, 1080, 30, 2_449_440, '20'], // ig-post @30 → L3.2
        [1280, 720, 60, 5_529_600, '20'], // 720p @60 → exactly at the L3.2 MB/s limit
        [1280, 720, 30, 4_000_000, '1F'], // 720p @30 → L3.1
        [1920, 1080, 60, 12_441_600, '2A'], // 1080p @60 → L4.2
        [3840, 2160, 60, 49_766_400, '34'], // 4K @60 → L5.2
        [3840, 2160, 30, 17_418_240, '33'], // 4K @30 → L5.1
      ];
      for (const [w, h, fps, bps, expected] of cases) {
        expect(computeH264LevelHex(w, h, fps, bps))
          .withContext(`${w}x${h}@${fps} ${bps}bps`)
          .toBe(expected);
      }
    });

    it('should bump the level when the bitrate exceeds the lower level cap', () => {
      // 720p@30 fits L3.1 by throughput, but 19 Mbps > L3.1's 14 Mbps cap → L3.2.
      expect(computeH264LevelHex(1280, 720, 30, 19_000_000)).toBe('20');
    });

    it('should return null when no level can carry the configuration', () => {
      // 8K@60 exceeds L5.2's macroblock throughput.
      expect(computeH264LevelHex(7680, 4320, 60, 80_000_000)).toBeNull();
    });
  });

  describe('buildRecordingMimeLadder', () => {
    it('should order rungs High → Main → Constrained Baseline → mp4 → vp9 → webm', () => {
      expect(buildRecordingMimeLadder(1080, 1920, 60, 12_441_600)).toEqual([
        'video/mp4;codecs=avc1.64002A',
        'video/mp4;codecs=avc1.4D402A',
        'video/mp4;codecs=avc1.42E02A',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm',
      ]);
    });

    it('should request only Level 5.x for 4K output', () => {
      const ladder = buildRecordingMimeLadder(3840, 2160, 60, 49_766_400);
      expect(ladder[0]).toBe('video/mp4;codecs=avc1.640034');
    });

    it('should skip the avc1 rungs when no level fits', () => {
      expect(buildRecordingMimeLadder(7680, 4320, 60, 80_000_000)).toEqual([
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm',
      ]);
    });
  });
});
