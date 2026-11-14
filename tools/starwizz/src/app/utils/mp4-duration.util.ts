import { MP4_HEADER_PROBE_BYTES } from '../constants/recording.constant';
import { childBoxes, readTimeHeader } from './mp4-box.util';

/**
 * Makes every track's media duration (`mdhd`) agree with the movie duration
 * (`mvhd`) in the head of an MP4 file.
 *
 * Chrome's MediaRecorder writes the right movie duration but stores the
 * track's media duration in milliseconds while declaring a different track
 * timescale, so a 30 s clip claims a 1 s track. Android's media index reads
 * that field: the gallery lists the clip as one second long and Instagram
 * imports only its start.
 *
 * @param head - The first bytes of the file (must contain the whole `moov`)
 * @returns A corrected copy of `head`, or null when nothing needs changing
 *   (not an MP4, `moov` not within `head`, no movie duration, or already consistent)
 */
export function repairMp4MediaDuration(head: Uint8Array): Uint8Array<ArrayBuffer> | null {
  // slice() copies into a fresh ArrayBuffer, so the caller's bytes are never touched.
  const patched = head.slice();
  const view = new DataView(patched.buffer);
  const moov = childBoxes(view, 0, patched.byteLength).find((box) => box.type === 'moov');
  if (!moov) {
    return null;
  }
  const moovChildren = childBoxes(view, moov.bodyStart, moov.end);
  const mvhdBox = moovChildren.find((box) => box.type === 'mvhd');
  const movie = mvhdBox ? readTimeHeader(view, mvhdBox) : null;
  if (!movie || movie.duration === 0 || movie.timescale === 0) {
    return null;
  }

  let hasChanged = false;
  for (const trak of moovChildren.filter((box) => box.type === 'trak')) {
    const mdia = childBoxes(view, trak.bodyStart, trak.end).find((box) => box.type === 'mdia');
    const mdhdBox = mdia
      ? childBoxes(view, mdia.bodyStart, mdia.end).find((box) => box.type === 'mdhd')
      : undefined;
    const media = mdhdBox ? readTimeHeader(view, mdhdBox) : null;
    if (!media || media.timescale === 0) {
      continue;
    }
    const expected = Math.round((movie.duration * media.timescale) / movie.timescale);
    // Rounding between timescales can differ by a tick; anything larger is wrong.
    if (Math.abs(media.duration - expected) <= 1) {
      continue;
    }
    if (media.durationBytes === 8) {
      view.setBigUint64(media.durationOffset, BigInt(expected));
    } else if (expected <= 0xffffffff) {
      view.setUint32(media.durationOffset, expected);
    } else {
      continue;
    }
    hasChanged = true;
  }
  return hasChanged ? patched : null;
}

/**
 * Applies {@link repairMp4MediaDuration} to a recorded MP4 blob. Only the
 * file head is read; the (large) rest of the blob is reused by reference.
 *
 * @param blob - The recorded MP4
 * @returns A blob with consistent durations, or the same blob when no repair was needed
 */
export async function repairMp4BlobDuration(blob: Blob): Promise<Blob> {
  const headBytes = Math.min(blob.size, MP4_HEADER_PROBE_BYTES);
  const head = new Uint8Array(await blob.slice(0, headBytes).arrayBuffer());
  const patchedHead = repairMp4MediaDuration(head);
  if (!patchedHead) {
    return blob;
  }
  return new Blob([patchedHead, blob.slice(headBytes)], { type: blob.type });
}
