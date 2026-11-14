/**
 * Reads stretches of a blob a window at a time, so reads that sit close
 * together cost one trip to the blob's storage instead of one each.
 *
 * Each trip is asynchronous and waits its turn behind the animation the app
 * is drawing, so a file index made of many small boxes is slow to walk one
 * box at a time. The boxes cluster (a fragment's index sits right before its
 * media data), which is what makes a window pay off.
 */
export class BlobWindow {
  private windowStart = 0;
  private window = new Uint8Array(0);

  /**
   * @param blob - The blob to read from
   * @param windowBytes - How much is fetched at once, when a read asks for less
   */
  constructor(
    private readonly blob: Blob,
    private readonly windowBytes: number,
  ) {}

  /** Size of the blob in bytes. */
  get size(): number {
    return this.blob.size;
  }

  /**
   * Reads `[start, end)`, clipped to the end of the blob.
   *
   * @param start - First byte wanted
   * @param end - One past the last byte wanted
   * @returns A copy of those bytes
   */
  async bytes(start: number, end: number): Promise<Uint8Array<ArrayBuffer>> {
    const stop = Math.min(end, this.blob.size);
    const isInWindow = start >= this.windowStart && stop <= this.windowStart + this.window.length;
    if (!isInWindow) {
      const fetchEnd = Math.min(this.blob.size, Math.max(stop, start + this.windowBytes));
      this.window = new Uint8Array(await this.blob.slice(start, fetchEnd).arrayBuffer());
      this.windowStart = start;
    }
    return this.window.slice(start - this.windowStart, Math.max(start, stop) - this.windowStart);
  }
}
