import {
  MP4_FRAGMENT_BRANDS,
  MP4_MAX_INDEX_BOX_BYTES,
  MP4_SCAN_WINDOW_BYTES,
  MP4_UINT32_MAX,
} from '../constants/mp4.constant';
import { BlobWindow } from '../models/blob-window.model';
import {
  Mp4Box,
  Mp4ChunkPlan,
  Mp4FragmentIndex,
  Mp4FragmentedLayout,
  Mp4PlainTrack,
  Mp4SampleRun,
} from '../models/mp4-box.model';
import {
  childBoxes,
  concatBytes,
  makeBox,
  readBox,
  readBoxHeader,
  readTimeHeader,
  uint32Bytes,
  withUintField,
} from './mp4-box.util';
import { readFragmentRuns, readTrackDefaults } from './mp4-fragment.util';
import {
  buildSampleTables,
  makeSampleTableBox,
  runByteLength,
  sampleDurations,
  totalDuration,
} from './mp4-sample-table.util';

/**
 * Reads what is needed to rewrite a fragmented MP4: its `ftyp` and `moov`
 * boxes and where every sample of every fragment sits. Only the boxes that
 * index the file are read; the media data (most of the file) is skipped.
 *
 * @param blob - The recording
 * @returns The layout, or null when the blob is not a fragmented MP4 this code understands
 */
export async function readFragmentedLayout(blob: Blob): Promise<Mp4FragmentedLayout | null> {
  const reader = new BlobWindow(blob, MP4_SCAN_WINDOW_BYTES);
  let ftyp: Uint8Array<ArrayBuffer> | null = null;
  let moov: Uint8Array<ArrayBuffer> | null = null;
  const moofs: Mp4FragmentIndex[] = [];
  let offset = 0;
  while (offset < blob.size) {
    const head = await reader.bytes(offset, offset + 16);
    const header = readBoxHeader(new DataView(head.buffer), 0);
    const size = header?.size === 0 ? blob.size - offset : (header?.size ?? 0);
    if (!header || size < header.headerBytes || offset + size > blob.size) {
      return null;
    }
    if (header.type === 'ftyp' || header.type === 'moov' || header.type === 'moof') {
      if (size > MP4_MAX_INDEX_BOX_BYTES) {
        return null;
      }
      const bytes = await reader.bytes(offset, offset + size);
      if (header.type === 'moof') {
        moofs.push({ offset, bytes });
      } else if (header.type === 'moov') {
        moov = bytes;
      } else {
        ftyp = bytes;
      }
    }
    offset += size;
  }
  if (!moov || moofs.length === 0) {
    return null;
  }
  const moovView = new DataView(moov.buffer);
  const moovBox = readBox(moovView, 0, moov.length);
  if (!moovBox) {
    return null;
  }
  const defaults = readTrackDefaults(moovView, moovBox);

  const runs: Mp4SampleRun[] = [];
  for (const moof of moofs) {
    const view = new DataView(moof.bytes.buffer);
    const moofBox = readBox(view, 0, moof.bytes.length);
    const fragment = moofBox ? readFragmentRuns(view, moofBox, moof.offset, defaults) : null;
    if (!fragment) {
      return null;
    }
    runs.push(...fragment.filter((run) => run.samples.length > 0));
  }
  const isInsideFile = runs.every(
    (run) => run.offset >= 0 && run.offset + runByteLength(run) <= blob.size,
  );
  return runs.length > 0 && isInsideFile ? { ftyp, moov, runs } : null;
}

/** A copy of one box's bytes, header included. */
function copyOf(bytes: Uint8Array, box: Mp4Box): Uint8Array<ArrayBuffer> {
  return bytes.slice(box.start, box.end);
}

/**
 * Rewrites an `ftyp` box without the brands that promise movie fragments.
 *
 * @param ftyp - The recording's `ftyp` box
 * @returns An `ftyp` box for an ordinary MP4
 */
function plainFileType(ftyp: Uint8Array): Uint8Array<ArrayBuffer> {
  // Body: major brand (4), minor version (4), then compatible brands (4 each).
  const brands: Uint8Array[] = [];
  for (let offset = 16; offset + 4 <= ftyp.length; offset += 4) {
    const brand = String.fromCharCode(...ftyp.subarray(offset, offset + 4));
    if (!MP4_FRAGMENT_BRANDS.includes(brand)) {
      brands.push(ftyp.subarray(offset, offset + 4));
    }
  }
  return makeBox('ftyp', ftyp.subarray(8, 16), ...brands);
}

/**
 * Rebuilds one `trak` box as an ordinary track: real durations in its
 * headers and sample tables that list every sample.
 *
 * @param moov - The recording's `moov` box
 * @param view - View over `moov`
 * @param trak - The `trak` box inside it
 * @param movieTimescale - The movie's timescale, for the track header's duration
 * @param plan - Where every sample run of the recording goes in the rewritten file
 * @returns The new track, or null when the original does not parse
 */
function plainTrack(
  moov: Uint8Array,
  view: DataView,
  trak: Mp4Box,
  movieTimescale: number,
  plan: Mp4ChunkPlan,
): Mp4PlainTrack | null {
  const trakChildren = childBoxes(view, trak.bodyStart, trak.end);
  const tkhd = trakChildren.find((box) => box.type === 'tkhd');
  const mdia = trakChildren.find((box) => box.type === 'mdia');
  const mdiaChildren = mdia ? childBoxes(view, mdia.bodyStart, mdia.end) : [];
  const mdhd = mdiaChildren.find((box) => box.type === 'mdhd');
  const minf = mdiaChildren.find((box) => box.type === 'minf');
  const minfChildren = minf ? childBoxes(view, minf.bodyStart, minf.end) : [];
  const stbl = minfChildren.find((box) => box.type === 'stbl');
  const stsd = stbl
    ? childBoxes(view, stbl.bodyStart, stbl.end).find((box) => box.type === 'stsd')
    : undefined;
  const media = mdhd ? readTimeHeader(view, mdhd) : null;
  if (!tkhd || !mdhd || !stsd || !media || media.timescale === 0) {
    return null;
  }
  // tkhd: version+flags, two timestamps (4 or 8 bytes each), track id, 4 reserved, duration.
  const isWideHeader = view.getUint8(tkhd.bodyStart) === 1;
  const trackIdOffset = tkhd.bodyStart + (isWideHeader ? 20 : 12);
  if (trackIdOffset + 8 + (isWideHeader ? 8 : 4) > tkhd.end) {
    return null;
  }
  const trackId = view.getUint32(trackIdOffset);

  const isOwn = plan.runs.map((run) => run.trackId === trackId);
  const ownRuns = plan.runs.filter((_, index) => isOwn[index]);
  const durations = sampleDurations(ownRuns);
  const mediaDuration = totalDuration(durations);
  const duration = Math.round((mediaDuration * movieTimescale) / media.timescale);

  const newTkhd = withUintField(
    copyOf(moov, tkhd),
    trackIdOffset + 8 - tkhd.start,
    isWideHeader ? 8 : 4,
    duration,
  );
  const newMdhd = withUintField(
    copyOf(moov, mdhd),
    media.durationOffset - mdhd.start,
    media.durationBytes,
    mediaDuration,
  );
  if (!newTkhd || !newMdhd) {
    return null;
  }
  const tables = buildSampleTables(
    ownRuns,
    durations,
    plan.chunkOffsets.filter((_, index) => isOwn[index]),
    plan.hasWideOffsets,
  );
  const newStbl = makeSampleTableBox(copyOf(moov, stsd), tables);
  const newMinf = makeBox(
    'minf',
    ...minfChildren.map((box) => (box.type === 'stbl' ? newStbl : copyOf(moov, box))),
  );
  const newMdia = makeBox(
    'mdia',
    ...mdiaChildren.map((box) => {
      if (box.type === 'mdhd') {
        return newMdhd;
      }
      return box.type === 'minf' ? newMinf : copyOf(moov, box);
    }),
  );
  // An edit list written for fragments no longer describes the track, so `edts` is dropped.
  const box = makeBox(
    'trak',
    ...trakChildren
      .filter((child) => child.type !== 'edts')
      .map((child) => {
        if (child.type === 'tkhd') {
          return newTkhd;
        }
        return child.type === 'mdia' ? newMdia : copyOf(moov, child);
      }),
  );
  return { box, duration };
}

/**
 * Rebuilds a fragmented file's `moov` box as an ordinary one: no `mvex`,
 * real durations, and sample tables in every track.
 *
 * @param moov - The recording's `moov` box
 * @param plan - Where every sample run of the recording goes in the rewritten file
 * @returns The new `moov` box, or null when the original does not parse
 */
export function plainMovieBox(
  moov: Uint8Array,
  plan: Mp4ChunkPlan,
): Uint8Array<ArrayBuffer> | null {
  const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
  const moovBox = readBox(view, 0, moov.length);
  const children = moovBox ? childBoxes(view, moovBox.bodyStart, moovBox.end) : [];
  const mvhd = children.find((box) => box.type === 'mvhd');
  const movie = mvhd ? readTimeHeader(view, mvhd) : null;
  if (!mvhd || !movie || movie.timescale === 0) {
    return null;
  }

  const tracks = new Map<Mp4Box, Uint8Array<ArrayBuffer>>();
  let movieDuration = 0;
  for (const trak of children.filter((box) => box.type === 'trak')) {
    const track = plainTrack(moov, view, trak, movie.timescale, plan);
    if (!track) {
      return null;
    }
    tracks.set(trak, track.box);
    movieDuration = Math.max(movieDuration, track.duration);
  }
  const newMvhd = withUintField(
    copyOf(moov, mvhd),
    movie.durationOffset - mvhd.start,
    movie.durationBytes,
    movieDuration,
  );
  if (!newMvhd || tracks.size === 0) {
    return null;
  }
  return makeBox(
    'moov',
    ...children
      .filter((box) => box.type !== 'mvex')
      .map((box) => (box === mvhd ? newMvhd : (tracks.get(box) ?? copyOf(moov, box)))),
  );
}

/**
 * Builds the header of the `mdat` box that holds all the media data, with a
 * 64-bit size when the data does not fit a 32-bit one.
 *
 * @param dataBytes - Bytes of media data that follow the header
 * @returns The 8 or 16 header bytes
 */
function mediaDataHeader(dataBytes: number): Uint8Array<ArrayBuffer> {
  const narrow = withUintField(makeBox('mdat'), 0, 4, dataBytes + 8);
  if (narrow) {
    return narrow;
  }
  // A size field of 1 says the real size follows the type as a 64-bit integer.
  const wide = concatBytes([uint32Bytes([1]), makeBox('mdat').subarray(4), new Uint8Array(8)]);
  new DataView(wide.buffer).setBigUint64(8, BigInt(dataBytes + 16));
  return wide;
}

/**
 * Builds everything that precedes the media data in the rewritten file:
 * `ftyp`, the new `moov`, and the header of the single `mdat` box.
 *
 * @param layout - The recording's layout
 * @returns The head bytes, or null when the recording's `moov` does not parse
 */
export function plainFileHead(layout: Mp4FragmentedLayout): Uint8Array<ArrayBuffer> | null {
  const ftyp = layout.ftyp ? plainFileType(layout.ftyp) : new Uint8Array(0);
  const dataBytes = layout.runs.reduce((total, run) => total + runByteLength(run), 0);
  const mdatHeader = mediaDataHeader(dataBytes);

  // The moov box's length does not depend on the offsets it lists, only on how wide they are,
  // so it is built once to learn where the media data will start and again with real offsets.
  const build = (dataStart: number, hasWideOffsets: boolean): Uint8Array<ArrayBuffer> | null => {
    let next = dataStart;
    const chunkOffsets = layout.runs.map((run) => {
      const offset = next;
      next += runByteLength(run);
      return offset;
    });
    return plainMovieBox(layout.moov, { runs: layout.runs, chunkOffsets, hasWideOffsets });
  };
  const headLength = (moov: Uint8Array): number => ftyp.length + moov.length + mdatHeader.length;
  const narrow = build(0, false);
  if (!narrow) {
    return null;
  }
  const hasWideOffsets = headLength(narrow) + dataBytes > MP4_UINT32_MAX;
  const sized = hasWideOffsets ? build(0, true) : narrow;
  const moov = sized ? build(headLength(sized), hasWideOffsets) : null;
  return moov ? concatBytes([ftyp, moov, mdatHeader]) : null;
}

/**
 * Rewrites a fragmented MP4 recording as an ordinary MP4: one index at the
 * front that lists every frame, then the frames. Nothing is re-encoded and
 * the frames themselves are reused by reference, not copied.
 *
 * Browsers record MP4 in fragments, with durations in the file header that
 * apps read differently. Apple's software adds the header's track duration
 * to the fragments, so a clip whose header states its real length reads as
 * twice as long, with the second half frozen on the last frame. Android's
 * media index reads only the header. An ordinary MP4 has one duration and
 * every reader agrees on it.
 *
 * @param blob - The recording
 * @returns The rewritten file, or null when the blob is not a fragmented MP4 this code understands
 */
export async function flattenMp4Blob(blob: Blob): Promise<Blob | null> {
  const layout = await readFragmentedLayout(blob);
  const head = layout ? plainFileHead(layout) : null;
  if (!layout || !head) {
    return null;
  }
  const media = layout.runs.map((run) => blob.slice(run.offset, run.offset + runByteLength(run)));
  return new Blob([head, ...media], { type: blob.type });
}
