import {
  SAMPLE_IS_NOT_SYNC,
  TFHD_BASE_DATA_OFFSET,
  TFHD_DEFAULT_BASE_IS_MOOF,
  TFHD_DEFAULT_DURATION,
  TFHD_DEFAULT_FLAGS,
  TFHD_DEFAULT_SIZE,
  TFHD_DESCRIPTION_INDEX,
  TRUN_COMPOSITION_OFFSETS,
  TRUN_DATA_OFFSET,
  TRUN_FIRST_SAMPLE_FLAGS,
  TRUN_SAMPLE_DURATIONS,
  TRUN_SAMPLE_FLAGS,
  TRUN_SAMPLE_SIZES,
} from '../constants/mp4.constant';
import { Mp4Box, Mp4Sample, Mp4SampleDefaults, Mp4SampleRun } from '../models/mp4-box.model';
import { childBoxes } from './mp4-box.util';

/** Bytes of version + flags at the front of every "full" box body. */
const FULL_BOX_HEADER_BYTES = 4;

/** The 24-bit flags of a full box. */
function flagsOf(view: DataView, box: Mp4Box): number {
  return view.getUint32(box.bodyStart) & 0xffffff;
}

/**
 * Reads the per-track sample defaults a fragmented file declares in
 * `moov/mvex/trex`.
 *
 * @param view - View over the `moov` box
 * @param moov - The `moov` box inside that view
 * @returns Defaults keyed by track id; empty when the file is not fragmented
 */
export function readTrackDefaults(view: DataView, moov: Mp4Box): Map<number, Mp4SampleDefaults> {
  const defaults = new Map<number, Mp4SampleDefaults>();
  const mvex = childBoxes(view, moov.bodyStart, moov.end).find((box) => box.type === 'mvex');
  if (!mvex) {
    return defaults;
  }
  for (const trex of childBoxes(view, mvex.bodyStart, mvex.end)) {
    const body = trex.bodyStart + FULL_BOX_HEADER_BYTES;
    if (trex.type !== 'trex' || body + 20 > trex.end) {
      continue;
    }
    defaults.set(view.getUint32(body), {
      descriptionIndex: view.getUint32(body + 4),
      duration: view.getUint32(body + 8),
      size: view.getUint32(body + 12),
      flags: view.getUint32(body + 16),
    });
  }
  return defaults;
}

/**
 * Lists the sample runs one movie fragment (`moof`) describes: which bytes
 * of the file are which track's samples, and each sample's size, duration
 * and keyframe status.
 *
 * @param view - View over the `moof` box alone
 * @param moof - The `moof` box inside that view
 * @param moofFileOffset - Where the `moof` box starts in the file
 * @param defaults - Per-track defaults from {@link readTrackDefaults}
 * @returns The runs in file order, or null when the fragment does not parse
 */
export function readFragmentRuns(
  view: DataView,
  moof: Mp4Box,
  moofFileOffset: number,
  defaults: ReadonlyMap<number, Mp4SampleDefaults>,
): Mp4SampleRun[] | null {
  const runs: Mp4SampleRun[] = [];
  // Where the previous track fragment's data ended: the base for one that names none.
  let previousEnd = moofFileOffset;
  for (const traf of childBoxes(view, moof.bodyStart, moof.end)) {
    if (traf.type !== 'traf') {
      continue;
    }
    const children = childBoxes(view, traf.bodyStart, traf.end);
    const tfhd = children.find((box) => box.type === 'tfhd');
    if (!tfhd || tfhd.bodyStart + 8 > tfhd.end) {
      return null;
    }
    const tfhdFlags = flagsOf(view, tfhd);
    const trackId = view.getUint32(tfhd.bodyStart + FULL_BOX_HEADER_BYTES);
    const trackDefaults = defaults.get(trackId);
    let cursor = tfhd.bodyStart + 8;
    const optional = (flag: number, fallback: number): number => {
      if ((tfhdFlags & flag) === 0 || cursor + 4 > tfhd.end) {
        return fallback;
      }
      cursor += 4;
      return view.getUint32(cursor - 4);
    };
    let base = (tfhdFlags & TFHD_DEFAULT_BASE_IS_MOOF) !== 0 ? moofFileOffset : previousEnd;
    if ((tfhdFlags & TFHD_BASE_DATA_OFFSET) !== 0) {
      if (cursor + 8 > tfhd.end) {
        return null;
      }
      base = Number(view.getBigUint64(cursor));
      cursor += 8;
    }
    const descriptionIndex = optional(TFHD_DESCRIPTION_INDEX, trackDefaults?.descriptionIndex ?? 1);
    const defaultDuration = optional(TFHD_DEFAULT_DURATION, trackDefaults?.duration ?? 0);
    const defaultSize = optional(TFHD_DEFAULT_SIZE, trackDefaults?.size ?? 0);
    const defaultFlags = optional(TFHD_DEFAULT_FLAGS, trackDefaults?.flags ?? 0);

    const tfdt = children.find((box) => box.type === 'tfdt');
    let decodeTime: number | null = null;
    if (tfdt && tfdt.bodyStart + 8 <= tfdt.end) {
      decodeTime =
        view.getUint8(tfdt.bodyStart) === 1 && tfdt.bodyStart + 12 <= tfdt.end
          ? Number(view.getBigUint64(tfdt.bodyStart + FULL_BOX_HEADER_BYTES))
          : view.getUint32(tfdt.bodyStart + FULL_BOX_HEADER_BYTES);
    }

    let dataEnd = base;
    for (const trun of children.filter((box) => box.type === 'trun')) {
      const flags = flagsOf(view, trun);
      const isSigned = view.getUint8(trun.bodyStart) !== 0;
      let at = trun.bodyStart + 8;
      if (at > trun.end) {
        return null;
      }
      const sampleCount = view.getUint32(trun.bodyStart + FULL_BOX_HEADER_BYTES);
      let offset = dataEnd;
      if ((flags & TRUN_DATA_OFFSET) !== 0) {
        offset = base + view.getInt32(at);
        at += 4;
      }
      let firstFlags: number | null = null;
      if ((flags & TRUN_FIRST_SAMPLE_FLAGS) !== 0) {
        firstFlags = view.getUint32(at);
        at += 4;
      }
      const fieldCount = [
        TRUN_SAMPLE_DURATIONS,
        TRUN_SAMPLE_SIZES,
        TRUN_SAMPLE_FLAGS,
        TRUN_COMPOSITION_OFFSETS,
      ].filter((flag) => (flags & flag) !== 0).length;
      if (at + sampleCount * fieldCount * 4 > trun.end) {
        return null;
      }
      const samples: Mp4Sample[] = [];
      let byteLength = 0;
      for (let i = 0; i < sampleCount; i++) {
        const next = (flag: number, fallback: number, signed = false): number => {
          if ((flags & flag) === 0) {
            return fallback;
          }
          at += 4;
          return signed ? view.getInt32(at - 4) : view.getUint32(at - 4);
        };
        const duration = next(TRUN_SAMPLE_DURATIONS, defaultDuration);
        const size = next(TRUN_SAMPLE_SIZES, defaultSize);
        const sampleFlags = next(
          TRUN_SAMPLE_FLAGS,
          i === 0 && firstFlags !== null ? firstFlags : defaultFlags,
        );
        const compositionOffset = next(TRUN_COMPOSITION_OFFSETS, 0, isSigned);
        samples.push({
          size,
          duration,
          compositionOffset,
          isSync: (sampleFlags & SAMPLE_IS_NOT_SYNC) === 0,
        });
        byteLength += size;
      }
      // Only the first run of a track fragment starts at the stated decode time.
      runs.push({ trackId, descriptionIndex, offset, decodeTime, samples });
      decodeTime = null;
      dataEnd = offset + byteLength;
    }
    previousEnd = dataEnd;
  }
  return runs;
}
