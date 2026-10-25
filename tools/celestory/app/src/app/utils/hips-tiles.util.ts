/**
 * GPU cache of survey tiles: requests tiles on demand through the injected
 * fetcher, uploads them as textures, limits concurrency, and evicts
 * least-recently-used tiles beyond the cache size.
 */
import { HIPS_CACHE_SIZE, HIPS_MAX_INFLIGHT } from '../models/hips.constants';
import type { HipsTileEntry, HipsTileFetcher } from '../models/hips.types';
import { createImageTexture } from './sky-gl.util';

export class HipsTileCache {
  private readonly entries = new Map<string, HipsTileEntry>();
  private inflight = 0;
  private frame = 0;
  private disposed = false;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly fetchTile: HipsTileFetcher,
  ) {}

  /** Call once per frame before `get` so LRU bookkeeping is meaningful. */
  beginFrame(): void {
    this.frame++;
  }

  /** The tile's texture if ready; otherwise schedules a download and returns null. */
  get(order: number, pix: number): WebGLTexture | null {
    const key = `${order}/${pix}`;
    let e = this.entries.get(key);
    if (!e) {
      e = { texture: null, loading: false, failed: false, lastUsed: this.frame };
      this.entries.set(key, e);
    }
    e.lastUsed = this.frame;
    if (e.texture) {
      return e.texture;
    }
    if (!e.loading && !e.failed && this.inflight < HIPS_MAX_INFLIGHT) {
      this.start(e, order, pix);
    }
    return null;
  }

  /** Number of tiles currently downloading. */
  get pending(): number {
    return this.inflight;
  }

  /** Evict least-recently-used tiles beyond the cache size (call after a frame). */
  trim(): void {
    if (this.entries.size <= HIPS_CACHE_SIZE) {
      return;
    }
    const victims = [...this.entries.entries()]
      .filter(([, e]) => !e.loading)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
      .slice(0, this.entries.size - HIPS_CACHE_SIZE);
    for (const [key, e] of victims) {
      if (e.texture) {
        this.gl.deleteTexture(e.texture);
      }
      this.entries.delete(key);
    }
  }

  /** Free every texture. */
  dispose(): void {
    this.disposed = true;
    for (const e of this.entries.values()) {
      if (e.texture) {
        this.gl.deleteTexture(e.texture);
      }
    }
    this.entries.clear();
  }

  private start(e: HipsTileEntry, order: number, pix: number): void {
    e.loading = true;
    this.inflight++;
    this.fetchTile(order, pix)
      .then((bitmap) => {
        if (this.disposed) {
          bitmap.close();
          return;
        }
        e.texture = createImageTexture(this.gl, bitmap, { mipmap: true, wrapHorizontal: false });
        bitmap.close();
      })
      .catch(() => {
        e.failed = true;
      })
      .finally(() => {
        e.loading = false;
        this.inflight--;
      });
  }
}
