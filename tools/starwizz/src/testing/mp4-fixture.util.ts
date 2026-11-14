import { Mp4Box } from '../app/models/mp4-box.model';
import { childBoxes, concatBytes, makeBox, uint32Bytes } from '../app/utils/mp4-box.util';

/** One frame to put in a fixture recording. */
export interface FixtureSample {
  /** Size of the frame's data in bytes. */
  size: number;
  /** Duration the fragment declares for it, in the track timescale. */
  duration: number;
}

/** One movie fragment of a fixture recording. Its first frame is the only keyframe. */
export interface FixtureFragment {
  /** Decode time of the fragment's first frame, in the track timescale. */
  decodeTime: number;
  /** The fragment's frames. */
  samples: FixtureSample[];
}

/** What a fixture recording's header claims, which browsers get wrong in several ways. */
export interface FixtureHeader {
  /** Duration in `mvhd` and `tkhd`, in milliseconds. */
  movieDuration: number;
  /** Duration in `mdhd`, in the track timescale. */
  mediaDuration: number;
}

/** A fixture recording and the frame data that went into it. */
export interface FixtureRecording {
  /** The whole file. */
  bytes: Uint8Array<ArrayBuffer>;
  /** Each frame's data, in order. Every frame has its own byte pattern. */
  frames: Uint8Array<ArrayBuffer>[];
}

/** What an ordinary (non-fragmented) MP4 with one track says about itself. */
export interface PlainMp4 {
  /** Top-level box types in file order. */
  boxTypes: string[];
  /** The `ftyp` box's compatible brands. */
  brands: string[];
  /** Box types found anywhere inside `moov`. */
  moovBoxTypes: string[];
  /** `mvhd` duration in seconds. */
  movieSeconds: number;
  /** `tkhd` duration in seconds (movie timescale). */
  trackSeconds: number;
  /** `mdhd` duration in seconds. */
  mediaSeconds: number;
  /** Each frame's duration, in the track timescale. */
  durations: number[];
  /** 1-based numbers of the keyframes, or null when every frame is one. */
  keyframes: number[] | null;
  /** Each frame's data as read from where the sample tables say it is. */
  frames: Uint8Array[];
}

/** Track timescale of fixture recordings: Chrome's, 30000 units per second. */
export const FIXTURE_TIMESCALE = 30000;

/** A version-1 `mvhd` / `mdhd` body: 64-bit times, then timescale and duration. */
function timeHeader(timescale: number, duration: number, trailingBytes: number): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(4 + 8 + 8 + 4 + 8 + trailingBytes);
  const view = new DataView(body.buffer);
  view.setUint8(0, 1);
  view.setUint32(20, timescale);
  view.setBigUint64(24, BigInt(duration));
  return body;
}

/** A version-1 `tkhd` body for track 1. */
function trackHeader(duration: number): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(4 + 8 + 8 + 4 + 4 + 8 + 60);
  const view = new DataView(body.buffer);
  view.setUint32(0, 0x01000003);
  view.setUint32(20, 1);
  view.setBigUint64(28, BigInt(duration));
  return body;
}

/** The four bytes of a four-character code. */
function fourCc(code: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(code, (char) => char.charCodeAt(0));
}

/**
 * Builds a fragmented MP4 laid out the way Chrome's MediaRecorder writes one:
 * `ftyp`, a `moov` with empty sample tables and an `mvex`, then a
 * `moof` + `mdat` pair per fragment. Spec-only.
 *
 * @param fragments - The fragments and their frames
 * @param header - The durations the header claims
 */
export function fragmentedMp4(fragments: readonly FixtureFragment[], header: FixtureHeader): FixtureRecording {
  const empty = uint32Bytes([0, 0]);
  const stbl = makeBox(
    'stbl',
    makeBox('stsc', empty),
    makeBox('stts', empty),
    makeBox('stsz', uint32Bytes([0, 0, 0])),
    makeBox('stco', empty),
    makeBox('stsd', uint32Bytes([0, 1]), makeBox('avc1', new Uint8Array(78))),
  );
  const mdia = makeBox(
    'mdia',
    makeBox('mdhd', timeHeader(FIXTURE_TIMESCALE, header.mediaDuration, 4)),
    makeBox('hdlr', uint32Bytes([0, 0]), fourCc('vide'), new Uint8Array(13)),
    makeBox('minf', makeBox('vmhd', new Uint8Array(12)), makeBox('dinf', new Uint8Array(8)), stbl),
  );
  const moov = makeBox(
    'moov',
    makeBox('mvhd', timeHeader(1000, header.movieDuration, 80)),
    makeBox('trak', makeBox('tkhd', trackHeader(header.movieDuration)), mdia),
    makeBox('mvex', makeBox('trex', uint32Bytes([0, 1, 1, 0, 0, 0]))),
  );
  const brands = ['isom', 'iso6', 'iso2', 'avc1', 'mp41'].map(fourCc);
  const parts: Uint8Array[] = [makeBox('ftyp', fourCc('isom'), uint32Bytes([0x200]), ...brands), moov];
  const frames: Uint8Array<ArrayBuffer>[] = [];

  fragments.forEach((fragment, index) => {
    const data = fragment.samples.map((sample) => {
      // Every frame gets its own byte value, so a misplaced frame cannot go unnoticed.
      const frame = new Uint8Array(sample.size).fill((frames.length % 250) + 1);
      frames.push(frame);
      return frame;
    });
    const rows = fragment.samples.flatMap((sample) => [sample.duration, sample.size]);
    const tfdt = new Uint8Array(12);
    new DataView(tfdt.buffer).setUint32(0, 0x01000000);
    new DataView(tfdt.buffer).setBigUint64(4, BigInt(fragment.decodeTime));
    const moofWith = (dataOffset: number): Uint8Array<ArrayBuffer> =>
      makeBox(
        'moof',
        makeBox('mfhd', uint32Bytes([0, index + 1])),
        makeBox(
          'traf',
          // Offsets count from the moof; frames are not keyframes unless the run says so.
          makeBox('tfhd', uint32Bytes([0x020020, 1, 0x01010000])),
          makeBox('tfdt', tfdt),
          // Data offset, first-sample flags (a keyframe), then a duration and size per frame.
          makeBox(
            'trun',
            uint32Bytes([0x01000305, fragment.samples.length, dataOffset, 0x02000000, ...rows]),
          ),
        ),
      );
    // The frames start right after the moof and the 8-byte header of the mdat that follows it.
    const moof = moofWith(moofWith(0).length + 8);
    parts.push(moof, makeBox('mdat', ...data));
  });
  return { bytes: concatBytes(parts), frames };
}

/** The first box of a type among some boxes; throws when there is none, which fails the spec. */
function need(boxes: readonly Mp4Box[], type: string): Mp4Box {
  const box = boxes.find((candidate) => candidate.type === type);
  if (!box) {
    throw new Error(`no ${type} box`);
  }
  return box;
}

/** Every box type inside a container, depth first. */
function typesInside(view: DataView, box: Mp4Box): string[] {
  const containers = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex', 'edts'];
  return childBoxes(view, box.bodyStart, box.end).flatMap((child) =>
    containers.includes(child.type) ? [child.type, ...typesInside(view, child)] : [child.type],
  );
}

/**
 * Reads an ordinary one-track MP4 the way a player would: durations from the
 * headers, and every frame from where the sample tables say it sits. Spec-only.
 *
 * @param bytes - The whole file
 */
export function readPlainMp4(bytes: Uint8Array): PlainMp4 {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const top = childBoxes(view, 0, bytes.length);
  const moov = need(top, 'moov');
  const moovChildren = childBoxes(view, moov.bodyStart, moov.end);
  const trakChildren = childBoxes(view, need(moovChildren, 'trak').bodyStart, need(moovChildren, 'trak').end);
  const mdia = need(trakChildren, 'mdia');
  const mdiaChildren = childBoxes(view, mdia.bodyStart, mdia.end);
  const minf = need(mdiaChildren, 'minf');
  const stbl = need(childBoxes(view, minf.bodyStart, minf.end), 'stbl');
  const tables = childBoxes(view, stbl.bodyStart, stbl.end);
  const numbers = (type: string): number[] => {
    const box = need(tables, type);
    const out: number[] = [];
    for (let at = box.bodyStart + 4; at + 4 <= box.end; at += 4) {
      out.push(view.getUint32(at));
    }
    return out;
  };

  const mvhd = need(moovChildren, 'mvhd').bodyStart;
  const mdhd = need(mdiaChildren, 'mdhd').bodyStart;
  const stts = numbers('stts').slice(1);
  const durations: number[] = [];
  for (let i = 0; i < stts.length; i += 2) {
    durations.push(...new Array<number>(stts[i]).fill(stts[i + 1]));
  }
  const sizes = numbers('stsz').slice(2);
  const stsc = numbers('stsc').slice(1);
  const stco = numbers('stco').slice(1);
  const frames: Uint8Array[] = [];
  stco.forEach((chunkOffset, chunk) => {
    // The stsc entry in force is the last one whose first chunk is at or before this chunk.
    let perChunk = 0;
    for (let i = 0; i < stsc.length; i += 3) {
      if (stsc[i] <= chunk + 1) {
        perChunk = stsc[i + 1];
      }
    }
    let at = chunkOffset;
    for (let i = 0; i < perChunk; i++) {
      const size = sizes[frames.length];
      frames.push(bytes.subarray(at, at + size));
      at += size;
    }
  });
  const ftyp = need(top, 'ftyp');
  const brands: string[] = [];
  for (let at = ftyp.bodyStart + 8; at + 4 <= ftyp.end; at += 4) {
    brands.push(String.fromCharCode(...bytes.subarray(at, at + 4)));
  }
  return {
    boxTypes: top.map((box) => box.type),
    brands,
    moovBoxTypes: typesInside(view, moov),
    movieSeconds: Number(view.getBigUint64(mvhd + 24)) / view.getUint32(mvhd + 20),
    trackSeconds: Number(view.getBigUint64(need(trakChildren, 'tkhd').bodyStart + 28)) / view.getUint32(mvhd + 20),
    mediaSeconds: Number(view.getBigUint64(mdhd + 24)) / view.getUint32(mdhd + 20),
    durations,
    keyframes: tables.some((box) => box.type === 'stss') ? numbers('stss').slice(1) : null,
    frames,
  };
}
