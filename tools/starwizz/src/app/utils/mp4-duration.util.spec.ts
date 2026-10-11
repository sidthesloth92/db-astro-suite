import { repairMp4BlobDuration, repairMp4MediaDuration } from './mp4-duration.util';

/** Builds an ISO-BMFF box: 32-bit size, four-character type, then the body. */
function box(type: string, ...body: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const size = 8 + body.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, size);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  let offset = 8;
  for (const part of body) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Body of a version-0 `mvhd` / `mdhd`: version+flags, two timestamps, timescale, duration. */
function timeHeaderV0(timescale: number, duration: number): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(4 + 4 + 4 + 4 + 4 + 8);
  const view = new DataView(body.buffer);
  view.setUint32(12, timescale);
  view.setUint32(16, duration);
  return body;
}

/** Body of a version-1 `mvhd` / `mdhd` with 64-bit timestamps and duration. */
function timeHeaderV1(timescale: number, duration: number): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(4 + 8 + 8 + 4 + 8 + 8);
  const view = new DataView(body.buffer);
  view.setUint8(0, 1);
  view.setUint32(20, timescale);
  view.setBigUint64(24, BigInt(duration));
  return body;
}

/** Assembles `ftyp` + `moov` (one video track) followed by a stand-in for the media data. */
function mp4Head(mvhd: Uint8Array, mdhd: Uint8Array): Uint8Array<ArrayBuffer> {
  const moov = box('moov', box('mvhd', mvhd), box('trak', box('tkhd', new Uint8Array(84)), box('mdia', box('mdhd', mdhd))));
  const ftyp = box('ftyp', new Uint8Array(28));
  const mdat = box('mdat', new Uint8Array(64).fill(7));
  const out = new Uint8Array(ftyp.length + moov.length + mdat.length);
  out.set(ftyp, 0);
  out.set(moov, ftyp.length);
  out.set(mdat, ftyp.length + moov.length);
  return out;
}

/** Reads the track media duration back out of a head built by {@link mp4Head}. */
function readMdhdDuration(head: Uint8Array, isVersion1 = false): number {
  const text = Array.from(head, (byte) => String.fromCharCode(byte)).join('');
  const bodyStart = text.indexOf('mdhd') + 4;
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  return isVersion1 ? Number(view.getBigUint64(bodyStart + 24)) : view.getUint32(bodyStart + 16);
}

describe('mp4-duration.util', () => {
  describe('repairMp4MediaDuration', () => {
    it('should rescale a track duration Chrome wrote in milliseconds to the track timescale', () => {
      // What Chrome writes for a 30 s clip: movie 30012 ms, track "30012" at 30000 units/s (= 1 s).
      const head = mp4Head(timeHeaderV0(1000, 30012), timeHeaderV0(30000, 30012));

      const repaired = repairMp4MediaDuration(head);

      expect(repaired && readMdhdDuration(repaired)).toBe(900_360); // 30.012 s at 30000 units/s
    });

    it('should not modify the bytes it was given', () => {
      const head = mp4Head(timeHeaderV0(1000, 30012), timeHeaderV0(30000, 30012));
      const original = head.slice();

      repairMp4MediaDuration(head);

      expect(head).toEqual(original);
    });

    it('should change nothing but the duration field', () => {
      const head = mp4Head(timeHeaderV0(1000, 30012), timeHeaderV0(30000, 30012));

      const repaired = repairMp4MediaDuration(head);
      if (!repaired) {
        fail('expected a repaired copy');
        return;
      }

      const differing = Array.from(head.keys()).filter((i) => head[i] !== repaired[i]);
      expect(repaired.length).toBe(head.length);
      expect(differing.length).toBeLessThanOrEqual(4);
    });

    it('should repair 64-bit (version 1) headers', () => {
      const head = mp4Head(timeHeaderV1(1000, 30012), timeHeaderV1(60000, 30012));

      const repaired = repairMp4MediaDuration(head);

      expect(repaired && readMdhdDuration(repaired, true)).toBe(1_800_720);
    });

    it('should leave a file alone when the track duration already matches', () => {
      const head = mp4Head(timeHeaderV0(1000, 30012), timeHeaderV0(30000, 900_360));

      expect(repairMp4MediaDuration(head)).toBeNull();
    });

    it('should leave a file alone when the movie has no duration to copy from', () => {
      const head = mp4Head(timeHeaderV0(1000, 0), timeHeaderV0(30000, 1712));

      expect(repairMp4MediaDuration(head)).toBeNull();
    });

    it('should ignore data that is not an MP4', () => {
      expect(repairMp4MediaDuration(new Uint8Array(4096))).toBeNull();
      expect(repairMp4MediaDuration(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4, 5]))).toBeNull();
      expect(repairMp4MediaDuration(new Uint8Array(0))).toBeNull();
    });

    it('should ignore a moov box that is cut off', () => {
      const head = mp4Head(timeHeaderV0(1000, 30012), timeHeaderV0(30000, 30012));

      expect(repairMp4MediaDuration(head.slice(0, 80))).toBeNull();
    });
  });

  describe('repairMp4BlobDuration', () => {
    it('should return a same-size, same-type blob with the track duration corrected', async () => {
      const head = mp4Head(timeHeaderV0(1000, 30012), timeHeaderV0(30000, 30012));
      const blob = new Blob([head], { type: 'video/mp4' });

      const repaired = await repairMp4BlobDuration(blob);

      const bytes = new Uint8Array(await repaired.arrayBuffer());
      expect(repaired.size).toBe(blob.size);
      expect(repaired.type).toBe('video/mp4');
      expect(readMdhdDuration(bytes)).toBe(900_360);
      // The media data after the header is carried over untouched.
      expect(Array.from(bytes.slice(-64))).toEqual(new Array(64).fill(7));
    });

    it('should hand back the very same blob when no repair is needed', async () => {
      const blob = new Blob([new Uint8Array(2048)], { type: 'video/mp4' });

      expect(await repairMp4BlobDuration(blob)).toBe(blob);
    });
  });
});
