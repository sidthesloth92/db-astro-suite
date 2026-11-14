import { BlobWindow } from './blob-window.model';

/** A blob of the bytes 0, 1, 2, ... and a count of how often its storage is read. */
function countedBlob(length: number): { blob: Blob; fetches: () => number } {
  const blob = new Blob([Uint8Array.from({ length }, (_, index) => index % 256)]);
  let fetches = 0;
  const slice = blob.slice.bind(blob);
  spyOn(blob, 'slice').and.callFake((start?: number, end?: number) => {
    fetches++;
    return slice(start, end);
  });
  return { blob, fetches: () => fetches };
}

describe('BlobWindow', () => {
  it('should return exactly the bytes asked for', async () => {
    const { blob } = countedBlob(1000);
    const reader = new BlobWindow(blob, 64);

    expect(Array.from(await reader.bytes(10, 14))).toEqual([10, 11, 12, 13]);
    expect(Array.from(await reader.bytes(300, 303))).toEqual([44, 45, 46]);
  });

  it('should answer reads that sit close together from one trip to the blob', async () => {
    const { blob, fetches } = countedBlob(1000);
    const reader = new BlobWindow(blob, 64);

    await reader.bytes(100, 108);
    await reader.bytes(108, 150);
    await reader.bytes(120, 164);

    expect(fetches()).toBe(1);
  });

  it('should go back to the blob for a read outside what it holds', async () => {
    const { blob, fetches } = countedBlob(1000);
    const reader = new BlobWindow(blob, 64);

    await reader.bytes(100, 108);
    await reader.bytes(500, 508);
    await reader.bytes(90, 98);

    expect(fetches()).toBe(3);
  });

  it('should fetch all of a read larger than its window', async () => {
    const { blob } = countedBlob(1000);
    const reader = new BlobWindow(blob, 64);

    const bytes = await reader.bytes(200, 600);

    expect(bytes.length).toBe(400);
    expect(bytes[399]).toBe(599 % 256);
  });

  it('should clip a read at the end of the blob', async () => {
    const { blob } = countedBlob(100);
    const reader = new BlobWindow(blob, 64);

    expect((await reader.bytes(90, 200)).length).toBe(10);
    expect((await reader.bytes(100, 116)).length).toBe(0);
    expect(reader.size).toBe(100);
  });

  it('should hand out copies, so a caller cannot disturb later reads', async () => {
    const { blob } = countedBlob(100);
    const reader = new BlobWindow(blob, 64);

    (await reader.bytes(0, 4)).fill(255);

    expect(Array.from(await reader.bytes(0, 4))).toEqual([0, 1, 2, 3]);
  });
});
