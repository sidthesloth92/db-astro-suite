import { Mp4SampleDefaults, Mp4SampleRun } from '../models/mp4-box.model';
import { makeBox, readBox, uint32Bytes } from './mp4-box.util';
import { readFragmentRuns, readTrackDefaults } from './mp4-fragment.util';

/** Where the fixture fragments sit in their imaginary file. */
const MOOF_AT = 5000;
/** Sample flags of a frame that is not a keyframe. */
const NOT_SYNC = 0x01010000;
/** Sample flags of a keyframe. */
const SYNC = 0x02000000;

/** Reads the runs of a `moof` built from the given track fragments. */
function runsOf(
  trafs: Uint8Array[],
  defaults: ReadonlyMap<number, Mp4SampleDefaults> = new Map(),
): Mp4SampleRun[] | null {
  const moof = makeBox('moof', makeBox('mfhd', uint32Bytes([0, 1])), ...trafs);
  const view = new DataView(moof.buffer);
  const box = readBox(view, 0, moof.length);
  return box ? readFragmentRuns(view, box, MOOF_AT, defaults) : null;
}

describe('mp4-fragment.util', () => {
  describe('readTrackDefaults', () => {
    it('should read each track’s defaults from the movie-extends box', () => {
      const moov = makeBox(
        'moov',
        makeBox('mvhd', new Uint8Array(100)),
        makeBox('mvex', makeBox('trex', uint32Bytes([0, 2, 1, 500, 0, NOT_SYNC]))),
      );
      const view = new DataView(moov.buffer);
      const box = readBox(view, 0, moov.length);

      const defaults = box ? readTrackDefaults(view, box) : new Map<number, Mp4SampleDefaults>();

      expect(defaults.get(2)).toEqual({ descriptionIndex: 1, duration: 500, size: 0, flags: NOT_SYNC });
    });

    it('should find none in a file that is not fragmented', () => {
      const moov = makeBox('moov', makeBox('mvhd', new Uint8Array(100)));
      const view = new DataView(moov.buffer);
      const box = readBox(view, 0, moov.length);

      expect(box && readTrackDefaults(view, box).size).toBe(0);
    });
  });

  describe('readFragmentRuns', () => {
    it('should read a fragment laid out the way Chrome writes one', () => {
      const runs = runsOf([
        makeBox(
          'traf',
          makeBox('tfhd', uint32Bytes([0x020020, 1, NOT_SYNC])),
          makeBox('tfdt', uint32Bytes([0x01000000, 0, 9000])),
          makeBox('trun', uint32Bytes([0x01000305, 3, 912, SYNC, 500, 7000, 490, 300, 999, 450])),
        ),
      ]);

      expect(runs).toEqual([
        {
          trackId: 1,
          descriptionIndex: 1,
          offset: MOOF_AT + 912,
          decodeTime: 9000,
          samples: [
            { size: 7000, duration: 500, compositionOffset: 0, isSync: true },
            { size: 300, duration: 490, compositionOffset: 0, isSync: false },
            { size: 450, duration: 999, compositionOffset: 0, isSync: false },
          ],
        },
      ]);
    });

    it('should fall back to the track fragment’s defaults, then the movie’s', () => {
      const movieDefaults = new Map([[1, { descriptionIndex: 3, duration: 111, size: 222, flags: NOT_SYNC }]]);

      const runs = runsOf(
        [
          makeBox(
            'traf',
            // Default duration given here; size, flags and description come from the movie.
            makeBox('tfhd', uint32Bytes([0x020008, 1, 600])),
            makeBox('trun', uint32Bytes([0x000001, 2, 100])),
          ),
        ],
        movieDefaults,
      );

      expect(runs?.[0].descriptionIndex).toBe(3);
      expect(runs?.[0].decodeTime).toBeNull();
      expect(runs?.[0].samples).toEqual([
        { size: 222, duration: 600, compositionOffset: 0, isSync: false },
        { size: 222, duration: 600, compositionOffset: 0, isSync: false },
      ]);
    });

    it('should read per-frame flags and signed composition offsets', () => {
      const runs = runsOf([
        makeBox(
          'traf',
          makeBox('tfhd', uint32Bytes([0x020000, 1])),
          makeBox('trun', uint32Bytes([0x01000f01, 2, 64, 500, 10, SYNC, 1000, 500, 20, NOT_SYNC, -500])),
        ),
      ]);

      expect(runs?.[0].samples).toEqual([
        { size: 10, duration: 500, compositionOffset: 1000, isSync: true },
        { size: 20, duration: 500, compositionOffset: -500, isSync: false },
      ]);
    });

    it('should count data offsets from a stated file offset when the fragment gives one', () => {
      const runs = runsOf([
        makeBox(
          'traf',
          makeBox('tfhd', uint32Bytes([0x000001, 1, 0, 70000])),
          makeBox('trun', uint32Bytes([0x000201, 1, 16, 40])),
        ),
      ]);

      expect(runs?.[0].offset).toBe(70016);
    });

    it('should place a second run, and a second track, straight after the data before it', () => {
      const runs = runsOf([
        makeBox(
          'traf',
          makeBox('tfhd', uint32Bytes([0x000000, 1])),
          makeBox('trun', uint32Bytes([0x000201, 2, 200, 30, 50])),
          makeBox('trun', uint32Bytes([0x000200, 1, 25])),
        ),
        makeBox('traf', makeBox('tfhd', uint32Bytes([0x000000, 2])), makeBox('trun', uint32Bytes([0x000200, 1, 9]))),
      ]);

      expect(runs?.map((run) => [run.trackId, run.offset])).toEqual([
        [1, MOOF_AT + 200],
        [1, MOOF_AT + 280],
        [2, MOOF_AT + 305],
      ]);
    });

    it('should read a 32-bit decode time', () => {
      const runs = runsOf([
        makeBox(
          'traf',
          makeBox('tfhd', uint32Bytes([0x020000, 1])),
          makeBox('tfdt', uint32Bytes([0, 4321])),
          makeBox('trun', uint32Bytes([0x000201, 1, 16, 40])),
        ),
      ]);

      expect(runs?.[0].decodeTime).toBe(4321);
    });

    it('should reject a run that lists more frames than it has room for', () => {
      const runs = runsOf([
        makeBox(
          'traf',
          makeBox('tfhd', uint32Bytes([0x020000, 1])),
          makeBox('trun', uint32Bytes([0x000301, 50, 16, 500, 40])),
        ),
      ]);

      expect(runs).toBeNull();
    });

    it('should reject a track fragment with no header', () => {
      expect(runsOf([makeBox('traf', makeBox('trun', uint32Bytes([0x000201, 1, 16, 40])))])).toBeNull();
    });
  });
});
