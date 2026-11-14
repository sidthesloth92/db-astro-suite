import { Mp4SampleRun } from '../models/mp4-box.model';
import { concatBytes, makeBox, uint32Bytes } from './mp4-box.util';

/**
 * Durations of a track's samples, in order, in the track's timescale.
 *
 * A fragment cannot know how long its last sample lasts, so recorders write
 * a guess there (Chrome writes one 30 fps frame, twice the real length at
 * 60 fps). The next fragment's decode time says when that sample really
 * ended, so it wins over the guess. Only the final sample of the file keeps
 * its declared duration.
 *
 * @param runs - One track's sample runs, in file order
 * @returns One duration per sample
 */
export function sampleDurations(runs: readonly Mp4SampleRun[]): number[] {
  const durations: number[] = [];
  // Decode time at which the next sample starts.
  let clock = 0;
  for (const run of runs) {
    if (run.decodeTime !== null) {
      const last = durations.length - 1;
      const lastStart = last >= 0 ? clock - durations[last] : run.decodeTime;
      if (last >= 0 && run.decodeTime > lastStart) {
        durations[last] = run.decodeTime - lastStart;
      }
      if (last < 0 || run.decodeTime > lastStart) {
        clock = run.decodeTime;
      }
    }
    for (const sample of run.samples) {
      durations.push(sample.duration);
      clock += sample.duration;
    }
  }
  return durations;
}

/**
 * Collapses a list into `[count, value]` pairs of equal neighbours, the way
 * MP4 time tables store them.
 *
 * @param values - The values, in order
 * @returns Flat list: count, value, count, value, ...
 */
function runLengths(values: readonly number[]): number[] {
  const pairs: number[] = [];
  for (const value of values) {
    if (pairs.length > 0 && pairs[pairs.length - 1] === value) {
      pairs[pairs.length - 2]++;
    } else {
      pairs.push(1, value);
    }
  }
  return pairs;
}

/** A full box: version and flags, an entry count, then the entries as 32-bit integers. */
function tableBox(
  type: string,
  version: number,
  entryCount: number,
  entries: readonly number[],
): Uint8Array<ArrayBuffer> {
  return makeBox(type, uint32Bytes([version << 24, entryCount]), uint32Bytes(entries));
}

/**
 * Builds the sample tables of an ordinary (non-fragmented) track: when each
 * sample plays (`stts`, `ctts`), which are keyframes (`stss`), how big each
 * is (`stsz`) and where its chunk sits in the file (`stsc`, `stco`/`co64`).
 * Every run becomes one chunk.
 *
 * @param runs - One track's sample runs, in file order; none may be empty
 * @param durations - One duration per sample, from {@link sampleDurations}
 * @param chunkOffsets - File offset of each run's data in the rewritten file
 * @param hasWideOffsets - Write 64-bit chunk offsets (files over 4 GB)
 * @returns The boxes, ready to follow `stsd` inside `stbl`
 */
export function buildSampleTables(
  runs: readonly Mp4SampleRun[],
  durations: readonly number[],
  chunkOffsets: readonly number[],
  hasWideOffsets: boolean,
): Uint8Array<ArrayBuffer>[] {
  const samples = runs.flatMap((run) => run.samples);
  const boxes: Uint8Array<ArrayBuffer>[] = [];

  const timing = runLengths(durations);
  boxes.push(tableBox('stts', 0, timing.length / 2, timing));

  if (samples.some((sample) => sample.compositionOffset !== 0)) {
    const offsets = runLengths(samples.map((sample) => sample.compositionOffset));
    // Version 1 stores the offsets signed; version 0 readers expect none below zero.
    const version = samples.some((sample) => sample.compositionOffset < 0) ? 1 : 0;
    boxes.push(tableBox('ctts', version, offsets.length / 2, offsets));
  }

  if (samples.some((sample) => !sample.isSync)) {
    const keyframes = samples.flatMap((sample, index) => (sample.isSync ? [index + 1] : []));
    boxes.push(tableBox('stss', 0, keyframes.length, keyframes));
  }

  // One entry per stretch of chunks that hold the same number of samples.
  const chunkRuns: number[] = [];
  runs.forEach((run, index) => {
    const end = chunkRuns.length;
    const isSame =
      end > 0 &&
      chunkRuns[end - 2] === run.samples.length &&
      chunkRuns[end - 1] === run.descriptionIndex;
    if (!isSame) {
      chunkRuns.push(index + 1, run.samples.length, run.descriptionIndex);
    }
  });
  boxes.push(tableBox('stsc', 0, chunkRuns.length / 3, chunkRuns));

  const sizes = samples.map((sample) => sample.size);
  boxes.push(makeBox('stsz', uint32Bytes([0, 0, samples.length]), uint32Bytes(sizes)));

  if (hasWideOffsets) {
    const wide = new Uint8Array(chunkOffsets.length * 8);
    const view = new DataView(wide.buffer);
    chunkOffsets.forEach((offset, index) => view.setBigUint64(index * 8, BigInt(offset)));
    boxes.push(makeBox('co64', uint32Bytes([0, chunkOffsets.length]), wide));
  } else {
    boxes.push(tableBox('stco', 0, chunkOffsets.length, chunkOffsets));
  }
  return boxes;
}

/**
 * Total duration of a track in its own timescale.
 *
 * @param durations - One duration per sample
 * @returns Their sum
 */
export function totalDuration(durations: readonly number[]): number {
  return durations.reduce((total, duration) => total + duration, 0);
}

/**
 * Bytes a run's samples take in the file.
 *
 * @param run - The run
 * @returns The sum of its sample sizes
 */
export function runByteLength(run: Mp4SampleRun): number {
  return run.samples.reduce((total, sample) => total + sample.size, 0);
}

/**
 * Joins sample-table boxes into the body of an `stbl` box, after the sample
 * description that says how to decode the samples.
 *
 * @param stsd - The track's `stsd` box, copied from the recording
 * @param tables - Boxes from {@link buildSampleTables}
 * @returns The `stbl` box
 */
export function makeSampleTableBox(
  stsd: Uint8Array,
  tables: readonly Uint8Array[],
): Uint8Array<ArrayBuffer> {
  return makeBox('stbl', concatBytes([stsd, ...tables]));
}
