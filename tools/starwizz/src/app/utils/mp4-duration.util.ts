import { MP4_HEADER_PROBE_BYTES } from '../constants/recording.constant';
import { Mp4Box, Mp4TimeHeader } from '../models/mp4-box.model';

/** Byte length of a box's `size` + `type` header (a 64-bit `largesize` adds 8 more). */
const BOX_HEADER_BYTES = 8;

/**
 * Reads the box that starts at `offset`, or null when it does not fit
 * inside `[offset, end)` (truncated or not ISO-BMFF at all).
 *
 * @param view - View over the file head
 * @param offset - Where the box starts
 * @param end - End of the enclosing container
 * @returns The box's type and extents, or null
 */
function readBox(view: DataView, offset: number, end: number): Mp4Box | null {
  if (offset + BOX_HEADER_BYTES > end) {
    return null;
  }
  const size32 = view.getUint32(offset);
  const type = String.fromCharCode(
    view.getUint8(offset + 4),
    view.getUint8(offset + 5),
    view.getUint8(offset + 6),
    view.getUint8(offset + 7),
  );
  let headerBytes = BOX_HEADER_BYTES;
  let size = size32;
  if (size32 === 1) {
    if (offset + 16 > end) {
      return null;
    }
    size = Number(view.getBigUint64(offset + 8));
    headerBytes = 16;
  } else if (size32 === 0) {
    size = end - offset; // "extends to the end of the file"
  }
  if (size < headerBytes || offset + size > end) {
    return null;
  }
  return { type, bodyStart: offset + headerBytes, end: offset + size };
}

/**
 * Lists the direct child boxes of a container.
 *
 * @param view - View over the file head
 * @param start - First byte of the container's body
 * @param end - End of the container
 * @returns The children, stopping at the first box that does not parse
 */
function childBoxes(view: DataView, start: number, end: number): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let offset = start;
  while (offset < end) {
    const box = readBox(view, offset, end);
    if (!box) {
      break;
    }
    boxes.push(box);
    offset = box.end;
  }
  return boxes;
}

/**
 * Reads the timescale and duration of an `mvhd` or `mdhd` box (they share
 * a layout), and where the duration is stored so it can be rewritten.
 *
 * @param view - View over the file head
 * @param box - The `mvhd` / `mdhd` box
 * @returns The header's time fields, or null when the box is too short
 */
function readTimeHeader(view: DataView, box: Mp4Box): Mp4TimeHeader | null {
  const isVersion1 = view.getUint8(box.bodyStart) === 1;
  // version(1) + flags(3), then creation + modification times (4 or 8 bytes each).
  const timescaleOffset = box.bodyStart + 4 + (isVersion1 ? 16 : 8);
  const durationOffset = timescaleOffset + 4;
  const durationBytes = isVersion1 ? 8 : 4;
  if (durationOffset + durationBytes > box.end) {
    return null;
  }
  return {
    timescale: view.getUint32(timescaleOffset),
    duration: isVersion1
      ? Number(view.getBigUint64(durationOffset))
      : view.getUint32(durationOffset),
    durationOffset,
    durationBytes,
  };
}

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
