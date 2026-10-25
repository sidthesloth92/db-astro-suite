/**
 * Thin WebGL2 helpers for the planetarium: context creation with capability
 * checks, program compilation, render targets and texture uploads. No scene
 * knowledge lives here.
 */
import { SkyRendererUnavailableError } from '../models/sky-assets.error';
import type { GlProgram, GlRenderTarget, HdrMode } from '../models/sky-gl.types';

/** Create a WebGL2 context tuned for an opaque, non-premultiplied HDR pipeline. */
export function createSkyGl(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    throw new SkyRendererUnavailableError('WebGL2 is not available on this device');
  }
  return gl;
}

/** Detect the best HDR render-target format the device supports. */
export function detectHdrMode(gl: WebGL2RenderingContext): HdrMode {
  if (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')) {
    return 'float16';
  }
  return 'rgba8';
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string, name: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new SkyRendererUnavailableError(`${name}: could not allocate shader`);
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '';
    gl.deleteShader(shader);
    throw new SkyRendererUnavailableError(`${name}: shader compile failed: ${log}`);
  }
  return shader;
}

/** Compile + link a program and resolve the named uniforms. */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: readonly string[],
  name: string,
): GlProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource, `${name}.vert`);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, `${name}.frag`);
  const program = gl.createProgram();
  if (!program) {
    throw new SkyRendererUnavailableError(`${name}: could not allocate program`);
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? '';
    gl.deleteProgram(program);
    throw new SkyRendererUnavailableError(`${name}: program link failed: ${log}`);
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const u of uniformNames) {
    uniforms[u] = gl.getUniformLocation(program, u);
  }
  return { program, uniforms };
}

/** Allocate a colour render target in the given HDR mode (linear filtering, clamped). */
export function createRenderTarget(gl: WebGL2RenderingContext, width: number, height: number, mode: HdrMode): GlRenderTarget {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) {
    throw new SkyRendererUnavailableError('could not allocate render target');
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (mode === 'float16') {
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
  } else {
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw new SkyRendererUnavailableError(`render target incomplete (${mode}, status ${status})`);
  }
  return { framebuffer, texture, width, height };
}

/** Free a render target's GPU resources. */
export function deleteRenderTarget(gl: WebGL2RenderingContext, target: GlRenderTarget): void {
  gl.deleteFramebuffer(target.framebuffer);
  gl.deleteTexture(target.texture);
}

/** Upload an image as an RGB8 texture (optionally mipmapped; horizontal wrap for equirect maps). */
export function createImageTexture(
  gl: WebGL2RenderingContext,
  image: ImageBitmap | HTMLImageElement,
  options: { mipmap: boolean; wrapHorizontal: boolean },
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new SkyRendererUnavailableError('could not allocate texture');
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrapHorizontal ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (options.mipmap) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) {
      const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
    }
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

/** Upload a 1D-style RGB float LUT as a `width × 1` RGB32F texture (nearest/linear sampling). */
export function createLutTexture(gl: WebGL2RenderingContext, rgb: Float32Array, width: number): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new SkyRendererUnavailableError('could not allocate LUT texture');
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, width, 1, 0, gl.RGB, gl.FLOAT, rgb);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

/** Draw a full-screen triangle (the vertex shader derives positions from gl_VertexID). */
export function drawFullscreen(gl: WebGL2RenderingContext): void {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
