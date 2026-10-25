/** A tile's GPU state in the survey cache. */
export interface HipsTileEntry {
  /** Uploaded texture, once decoded. */
  texture: WebGLTexture | null;
  /** True while downloading. */
  loading: boolean;
  /** Set when the download failed (no retry this session). */
  failed: boolean;
  /** Frame counter of the last use (for LRU eviction). */
  lastUsed: number;
}

/** Function that downloads + decodes one tile. */
export type HipsTileFetcher = (order: number, pix: number) => Promise<ImageBitmap>;
