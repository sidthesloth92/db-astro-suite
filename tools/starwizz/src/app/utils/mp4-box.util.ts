import { Mp4Box, Mp4BoxHeader, Mp4TimeHeader } from '../models/mp4-box.model';

/** Byte length of a box's `size` + `type` header (a 64-bit `largesize` adds 8 more). */
const BOX_HEADER_BYTES = 8;

/**
 * Reads the size/type header of the box that starts at `offset`.
 *
 * @param view - View over the bytes
 * @param offset - Where the box starts
 * @returns The header, or null when the view ends before the header does
 */
export function readBoxHeader(view: DataView, offset: number): Mp4BoxHeader | null {
  if (offset + BOX_HEADER_BYTES > view.byteLength) {
    return null;
  }
  const size32 = view.getUint32(offset);
  const type = String.fromCharCode(
    view.getUint8(offset + 4),
    view.getUint8(offset + 5),
    view.getUint8(offset + 6),
    view.getUint8(offset + 7),
  );
  if (size32 !== 1) {
    return { type, headerBytes: BOX_HEADER_BYTES, size: size32 };
  }
  if (offset + 16 > view.byteLength) {
    return null;
  }
  return { type, headerBytes: 16, size: Number(view.getBigUint64(offset + 8)) };
}

/**
 * Reads the box that starts at `offset`, or null when it does not fit
 * inside `[offset, end)` (truncated or not ISO-BMFF at all).
 *
 * @param view - View over the file head
 * @param offset - Where the box starts
 * @param end - End of the enclosing container
 * @returns The box's type and extents, or null
 */
export function readBox(view: DataView, offset: number, end: number): Mp4Box | null {
  if (offset + BOX_HEADER_BYTES > end) {
    return null;
  }
  const header = readBoxHeader(view, offset);
  if (!header) {
    return null;
  }
  // A size of 0 means "extends to the end of the file".
  const size = header.size === 0 ? end - offset : header.size;
  if (size < header.headerBytes || offset + size > end) {
    return null;
  }
  return {
    type: header.type,
    start: offset,
    bodyStart: offset + header.headerBytes,
    end: offset + size,
  };
}

/**
 * Lists the direct child boxes of a container.
 *
 * @param view - View over the file head
 * @param start - First byte of the container's body
 * @param end - End of the container
 * @returns The children, stopping at the first box that does not parse
 */
export function childBoxes(view: DataView, start: number, end: number): Mp4Box[] {
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
export function readTimeHeader(view: DataView, box: Mp4Box): Mp4TimeHeader | null {
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
 * Joins byte arrays end to end into a new array.
 *
 * @param parts - The arrays, in order
 * @returns One array holding all of them
 */
export function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Builds a box: 32-bit size, four-character type, then the body.
 *
 * @param type - Four-character box type
 * @param body - The parts of the body, in order
 * @returns The whole box
 */
export function makeBox(type: string, ...body: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(BOX_HEADER_BYTES);
  const size = BOX_HEADER_BYTES + body.reduce((total, part) => total + part.length, 0);
  new DataView(header.buffer).setUint32(0, size);
  for (let i = 0; i < 4; i++) {
    header[4 + i] = type.charCodeAt(i);
  }
  return concatBytes([header, ...body]);
}

/**
 * Packs numbers as big-endian unsigned 32-bit integers. Negative values are
 * stored in two's complement, which is how signed 32-bit fields are written.
 *
 * @param values - The numbers, in order
 * @returns Four bytes per number
 */
export function uint32Bytes(values: readonly number[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(values.length * 4);
  const view = new DataView(out.buffer);
  values.forEach((value, index) => view.setUint32(index * 4, value >>> 0));
  return out;
}

/**
 * Returns a copy of some bytes with one big-endian unsigned integer field
 * overwritten.
 *
 * @param bytes - The bytes to copy (never modified)
 * @param offset - Where the field starts
 * @param byteCount - Width of the field: 4 or 8
 * @param value - The value to store
 * @returns The patched copy, or null when the value does not fit a 4-byte field
 */
export function withUintField(
  bytes: Uint8Array,
  offset: number,
  byteCount: number,
  value: number,
): Uint8Array<ArrayBuffer> | null {
  const patched = bytes.slice();
  const view = new DataView(patched.buffer);
  if (byteCount === 8) {
    view.setBigUint64(offset, BigInt(value));
  } else if (value <= 0xffffffff) {
    view.setUint32(offset, value);
  } else {
    return null;
  }
  return patched;
}
