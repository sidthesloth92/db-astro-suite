import {
  FIXTURE_TIMESCALE,
  FixtureFragment,
  fragmentedMp4,
  readPlainMp4,
} from '../../testing/mp4-fixture.util';
import { flattenMp4Blob } from './mp4-flatten.util';

/** A 60 fps frame in the fixture's timescale. */
const FRAME = FIXTURE_TIMESCALE / 60;
/** What Chrome writes as the duration of a fragment's last frame: one 30 fps frame. */
const GUESS = 999;

/** Three fragments of four frames each, as Chrome lays a 60 fps recording out. */
const FRAGMENTS: FixtureFragment[] = [0, 1, 2].map((index) => ({
  decodeTime: index * 4 * FRAME,
  samples: [
    { size: 900 + index, duration: FRAME },
    { size: 40, duration: FRAME },
    { size: 55 + index, duration: FRAME },
    { size: 61, duration: GUESS },
  ],
}));
/** Real length of the fixture clip in seconds: eleven frames, then the last one's guess. */
const CLIP_SECONDS = (11 * FRAME + GUESS) / FIXTURE_TIMESCALE;
/** The header Chrome writes and Starwizz used to correct: every field states the full length. */
const FULL_HEADER = { movieDuration: 200, mediaDuration: 6000 };

/** Rewrites a fixture recording and reads the result back. */
async function flattened(recording: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const flat = await flattenMp4Blob(new Blob([recording], { type: 'video/mp4' }));
  if (!flat) {
    throw new Error('expected the recording to be rewritten');
  }
  return new Uint8Array(await flat.arrayBuffer());
}

describe('flattenMp4Blob', () => {
  it('should turn a fragmented recording into one index followed by one block of frames', async () => {
    const plain = readPlainMp4(await flattened(fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes));

    expect(plain.boxTypes).toEqual(['ftyp', 'moov', 'mdat']);
    expect(plain.moovBoxTypes).not.toContain('mvex');
    expect(plain.brands).toEqual(['isom', 'iso2', 'avc1', 'mp41']);
  });

  it('should keep every frame, byte for byte and in order', async () => {
    const recording = fragmentedMp4(FRAGMENTS, FULL_HEADER);

    const plain = readPlainMp4(await flattened(recording.bytes));

    expect(plain.frames.length).toBe(12);
    plain.frames.forEach((frame, index) => {
      expect(frame).withContext(`frame ${index + 1}`).toEqual(recording.frames[index]);
    });
  });

  it('should state the clip’s real length once, in every header', async () => {
    const plain = readPlainMp4(await flattened(fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes));

    expect(plain.mediaSeconds).toBeCloseTo(CLIP_SECONDS, 4);
    expect(plain.trackSeconds).toBeCloseTo(CLIP_SECONDS, 2);
    expect(plain.movieSeconds).toBeCloseTo(CLIP_SECONDS, 2);
  });

  it('should state the same length whatever the recording’s own header claimed', async () => {
    // Chrome with a timeslice: zero. Chrome without: milliseconds as track units. Corrected: full.
    const headers = [{ movieDuration: 0, mediaDuration: 0 }, { movieDuration: 200, mediaDuration: 200 }, FULL_HEADER];

    for (const header of headers) {
      const plain = readPlainMp4(await flattened(fragmentedMp4(FRAGMENTS, header).bytes));
      expect(plain.mediaSeconds).withContext(JSON.stringify(header)).toBeCloseTo(CLIP_SECONDS, 4);
      expect(plain.movieSeconds).withContext(JSON.stringify(header)).toBeCloseTo(CLIP_SECONDS, 2);
    }
  });

  it('should time each fragment’s last frame by when the next fragment starts', async () => {
    const plain = readPlainMp4(await flattened(fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes));

    // Only the very last frame keeps the recorder's guess.
    expect(plain.durations).toEqual([...new Array<number>(11).fill(FRAME), GUESS]);
  });

  it('should mark the first frame of each fragment as a keyframe', async () => {
    const plain = readPlainMp4(await flattened(fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes));

    expect(plain.keyframes).toEqual([1, 5, 9]);
  });

  it('should keep the blob’s type', async () => {
    const recording = fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes;

    const flat = await flattenMp4Blob(new Blob([recording], { type: 'video/mp4' }));

    expect(flat?.type).toBe('video/mp4');
  });

  it('should leave alone a file that has no fragments', async () => {
    const recording = fragmentedMp4([], FULL_HEADER).bytes;

    expect(await flattenMp4Blob(new Blob([recording]))).toBeNull();
  });

  it('should leave alone data that is not an MP4', async () => {
    expect(await flattenMp4Blob(new Blob([new Uint8Array(4096)]))).toBeNull();
    expect(await flattenMp4Blob(new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4, 5])]))).toBeNull();
    expect(await flattenMp4Blob(new Blob([]))).toBeNull();
  });

  it('should leave alone a recording that is cut off part way through', async () => {
    const recording = fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes;

    expect(await flattenMp4Blob(new Blob([recording.slice(0, recording.length - 30)]))).toBeNull();
  });

  it('should leave alone a recording whose fragment points outside the file', async () => {
    const recording = fragmentedMp4(FRAGMENTS, FULL_HEADER).bytes;
    // Push the last fragment's data offset far past the end of the file.
    const text = Array.from(recording, (byte) => String.fromCharCode(byte)).join('');
    const trun = text.lastIndexOf('trun');
    const broken = recording.slice();
    new DataView(broken.buffer).setUint32(trun + 4 + 8, 0x00ffffff);

    expect(await flattenMp4Blob(new Blob([broken]))).toBeNull();
  });
});
