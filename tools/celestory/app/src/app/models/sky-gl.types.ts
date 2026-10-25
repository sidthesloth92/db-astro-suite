import type { PackedStarCatalog } from './star-catalog.model';

/** A compiled program plus its resolved uniform locations. */
export interface GlProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

/** A render target (framebuffer + colour texture) with its pixel size. */
export interface GlRenderTarget {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

/** A star catalogue uploaded to the GPU. */
export interface GlStarBuffer {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  catalog: PackedStarCatalog;
}

/** Which HDR colour format the device can render into. */
export type HdrMode = 'float16' | 'rgba8';

/** Per-frame view uniforms shared by every pass (framebuffer pixels, y up). */
export interface GlViewUniforms {
  /** Framebuffer size in device pixels. */
  width: number;
  height: number;
  /** Stereographic centre in device pixels. */
  centerX: number;
  centerY: number;
  /** Device pixels per stereographic plane unit. */
  scale: number;
}
