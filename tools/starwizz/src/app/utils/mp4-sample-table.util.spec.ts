import { Mp4Sample, Mp4SampleRun } from '../models/mp4-box.model';
import { childBoxes } from './mp4-box.util';
import {
  buildSampleTables,
  runByteLength,
  sampleDurations,
  totalDuration,
} from './mp4-sample-table.util';

/** A frame with the given duration; the other fields default to an ordinary small frame. */
function frame(duration: number, overrides: Partial<Mp4Sample> = {}): Mp4Sample {
  return { size: 10, duration, compositionOffset: 0, isSync: false, ...overrides };
}

/** A run of frames for track 1. */
function run(decodeTime: number | null, samples: Mp4Sample[]): Mp4SampleRun {
  return { trackId: 1, descriptionIndex: 1, offset: 0, decodeTime, samples };
}

/** The 32-bit numbers of each table box, after its version and flags, keyed by box type. */
function tablesOf(boxes: readonly Uint8Array[]): Record<string, number[]> {
  const tables: Record<string, number[]> = {};
  for (const bytes of boxes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const [box] = childBoxes(view, 0, bytes.length);
    const numbers: number[] = [];
    for (let at = box.bodyStart + 4; at + 4 <= box.end; at += 4) {
      numbers.push(view.getUint32(at));
    }
    tables[box.type] = numbers;
  }
  return tables;
}

describe('mp4-sample-table.util', () => {
  describe('sampleDurations', () => {
    it('should replace a fragment’s last duration with the time until the next fragment starts', () => {
      const runs = [run(0, [frame(500), frame(999)]), run(1000, [frame(500), frame(999)])];

      expect(sampleDurations(runs)).toEqual([500, 500, 500, 999]);
    });

    it('should keep the declared durations when fragments state no decode time', () => {
      const runs = [run(null, [frame(500), frame(999)]), run(null, [frame(500)])];

      expect(sampleDurations(runs)).toEqual([500, 999, 500]);
    });

    it('should ignore a decode time that does not move forward', () => {
      const runs = [run(0, [frame(500), frame(999)]), run(400, [frame(500)])];

      expect(sampleDurations(runs)).toEqual([500, 999, 500]);
    });

    it('should hold a frame for as long as a gap before the next fragment lasts', () => {
      const runs = [run(0, [frame(500), frame(500)]), run(9000, [frame(500)])];

      expect(sampleDurations(runs)).toEqual([500, 8500, 500]);
    });

    it('should not shift frames when the first fragment starts later than zero', () => {
      const runs = [run(3000, [frame(500), frame(999)]), run(4000, [frame(500)])];

      expect(sampleDurations(runs)).toEqual([500, 500, 500]);
    });
  });

  describe('buildSampleTables', () => {
    const keyframe = { isSync: true };

    it('should store frame times as runs of equal durations', () => {
      const runs = [run(0, [frame(500), frame(500), frame(510), frame(500)])];

      const tables = tablesOf(buildSampleTables(runs, sampleDurations(runs), [100], false));

      expect(tables['stts']).toEqual([3, 2, 500, 1, 510, 1, 500]);
    });

    it('should list every frame’s size and one chunk per run', () => {
      const runs = [
        run(0, [frame(500, { size: 70 }), frame(500, { size: 8 })]),
        run(1000, [frame(500, { size: 60 }), frame(500, { size: 9 })]),
        run(2000, [frame(500, { size: 50 })]),
      ];

      const tables = tablesOf(buildSampleTables(runs, sampleDurations(runs), [400, 478, 547], false));

      expect(tables['stsz']).toEqual([0, 5, 70, 8, 60, 9, 50]);
      expect(tables['stco']).toEqual([3, 400, 478, 547]);
      // Chunks 1 and 2 hold two frames each, chunk 3 holds one.
      expect(tables['stsc']).toEqual([2, 1, 2, 1, 3, 1, 1]);
    });

    it('should list the keyframes when only some frames are keyframes', () => {
      const runs = [run(0, [frame(500, keyframe), frame(500), frame(500), frame(500, keyframe)])];

      const tables = tablesOf(buildSampleTables(runs, sampleDurations(runs), [100], false));

      expect(tables['stss']).toEqual([2, 1, 4]);
    });

    it('should leave the keyframe list out when every frame is a keyframe', () => {
      const runs = [run(0, [frame(500, keyframe), frame(500, keyframe)])];

      const tables = tablesOf(buildSampleTables(runs, sampleDurations(runs), [100], false));

      expect(Object.keys(tables)).toEqual(['stts', 'stsc', 'stsz', 'stco']);
    });

    it('should store composition offsets only when frames have them, signed when one is negative', () => {
      const reordered = [run(0, [frame(500, { compositionOffset: 1000 }), frame(500, { compositionOffset: -500 })])];
      const boxes = buildSampleTables(reordered, sampleDurations(reordered), [100], false);
      const ctts = boxes[1];

      expect(String.fromCharCode(...ctts.subarray(4, 8))).toBe('ctts');
      expect(ctts[8]).withContext('version').toBe(1);
      const view = new DataView(ctts.buffer);
      expect([view.getUint32(16), view.getInt32(20), view.getUint32(24), view.getInt32(28)]).toEqual([1, 1000, 1, -500]);
    });

    it('should write 64-bit chunk offsets for a file too large for 32-bit ones', () => {
      const runs = [run(0, [frame(500)])];
      const far = 2 ** 33 + 7;

      const boxes = buildSampleTables(runs, sampleDurations(runs), [far], true);
      const co64 = boxes[boxes.length - 1];

      expect(String.fromCharCode(...co64.subarray(4, 8))).toBe('co64');
      expect(new DataView(co64.buffer).getBigUint64(16)).toBe(BigInt(far));
    });
  });

  describe('totals', () => {
    it('should add up a track’s durations and a run’s bytes', () => {
      expect(totalDuration([500, 500, 999])).toBe(1999);
      expect(runByteLength(run(0, [frame(1, { size: 70 }), frame(1, { size: 8 })]))).toBe(78);
    });
  });
});
