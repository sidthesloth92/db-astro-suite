import {
  childBoxes,
  concatBytes,
  makeBox,
  readBox,
  readBoxHeader,
  uint32Bytes,
  withUintField,
} from './mp4-box.util';

/** A view over some bytes. */
function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

describe('mp4-box.util', () => {
  describe('makeBox', () => {
    it('should write the size, the type, then the body parts in order', () => {
      const box = makeBox('free', new Uint8Array([1, 2]), new Uint8Array([3]));

      expect(Array.from(box)).toEqual([0, 0, 0, 11, 0x66, 0x72, 0x65, 0x65, 1, 2, 3]);
    });
  });

  describe('readBox', () => {
    it('should report where a box starts, where its body starts and where it ends', () => {
      const bytes = concatBytes([new Uint8Array(5), makeBox('moov', new Uint8Array(20))]);

      expect(readBox(viewOf(bytes), 5, bytes.length)).toEqual({
        type: 'moov',
        start: 5,
        bodyStart: 13,
        end: 33,
      });
    });

    it('should read a box whose size is stored in 64 bits', () => {
      const bytes = concatBytes([uint32Bytes([1]), makeBox('mdat').subarray(4), uint32Bytes([0, 24]), new Uint8Array(8)]);

      expect(readBox(viewOf(bytes), 0, bytes.length)).toEqual({ type: 'mdat', start: 0, bodyStart: 16, end: 24 });
    });

    it('should treat a size of zero as running to the end of the container', () => {
      const bytes = concatBytes([uint32Bytes([0]), makeBox('mdat').subarray(4), new Uint8Array(30)]);

      expect(readBox(viewOf(bytes), 0, bytes.length)?.end).toBe(38);
    });

    it('should reject a box that claims to run past its container', () => {
      const bytes = makeBox('moov', new Uint8Array(20));

      expect(readBox(viewOf(bytes), 0, bytes.length - 1)).toBeNull();
      expect(readBox(viewOf(bytes), 24, bytes.length)).toBeNull();
    });
  });

  describe('readBoxHeader', () => {
    it('should read a header without needing the rest of the box', () => {
      const header = makeBox('mdat', new Uint8Array(500)).subarray(0, 16);

      expect(readBoxHeader(viewOf(header), 0)).toEqual({ type: 'mdat', headerBytes: 8, size: 508 });
    });

    it('should give up when the bytes end inside the header', () => {
      expect(readBoxHeader(viewOf(new Uint8Array(7)), 0)).toBeNull();
      expect(readBoxHeader(viewOf(concatBytes([uint32Bytes([1]), new Uint8Array(8)])), 0)).toBeNull();
    });
  });

  describe('childBoxes', () => {
    it('should list the boxes inside a container and stop at one that does not parse', () => {
      const parent = makeBox('moov', makeBox('mvhd', new Uint8Array(4)), makeBox('trak'), new Uint8Array([0, 0, 0, 99, 1, 2, 3, 4]));

      const children = childBoxes(viewOf(parent), 8, parent.length);

      expect(children.map((box) => box.type)).toEqual(['mvhd', 'trak']);
    });
  });

  describe('uint32Bytes', () => {
    it('should store each number in four bytes, most significant first', () => {
      expect(Array.from(uint32Bytes([1, 0x01020304]))).toEqual([0, 0, 0, 1, 1, 2, 3, 4]);
    });

    it('should store a negative number the way a signed field holds it', () => {
      expect(viewOf(uint32Bytes([-2])).getInt32(0)).toBe(-2);
    });
  });

  describe('withUintField', () => {
    it('should return a copy with the field changed and leave the original alone', () => {
      const original = new Uint8Array(12);

      const patched = withUintField(original, 4, 4, 0x0a0b0c0d);

      expect(Array.from(patched ?? [])).toEqual([0, 0, 0, 0, 0x0a, 0x0b, 0x0c, 0x0d, 0, 0, 0, 0]);
      expect(Array.from(original)).toEqual(new Array(12).fill(0));
    });

    it('should write an eight-byte field', () => {
      const patched = withUintField(new Uint8Array(8), 0, 8, 2 ** 40);

      expect(patched && viewOf(patched).getBigUint64(0)).toBe(BigInt(2 ** 40));
    });

    it('should refuse a value too large for a four-byte field', () => {
      expect(withUintField(new Uint8Array(8), 0, 4, 2 ** 32)).toBeNull();
    });
  });
});
