/**
 * Draws the deep-sky survey: picks the HiPS order for the current pixel scale,
 * finds the visible cells, builds a small projected mesh per tile and draws
 * each tile that the cache has ready. Reports how complete the coverage is so
 * the Milky Way map can stay visible until tiles arrive.
 */
import { HIPS_MESH_DIVISIONS, HIPS_MESH_DIVISIONS_LOW_ORDER, HIPS_SURVEY } from '../models/hips.constants';
import type { GlProgram } from '../models/sky-gl.types';
import type { StereographicParams } from '../models/sky-projection.types';
import type { CameraBasis, Vec3 } from '../models/sky.types';
import { SURVEY_FRAG, SURVEY_VERT } from '../models/sky-shaders-survey.constants';
import { SkyRendererUnavailableError } from '../models/sky-assets.error';
import { toCam } from './celestial.util';
import { cellPointToVec } from './healpix.util';
import type { HipsTileCache } from './hips-tiles.util';
import { orderForPixelScale, visibleCells } from './hips-visibility.util';
import { createProgram } from './sky-gl.util';
import { type Mat3, mat3MulVec, mat3Transpose } from './sky-frame.util';
import { projectStereo, radiansPerPixel } from './sky-projection.util';

/** Inputs for one survey draw. */
export interface SurveyDrawInput {
  /** Stereographic params in device pixels. */
  params: StereographicParams;
  /** Device pixel ratio (CSS→device). */
  dpr: number;
  /** Camera basis (ENU). */
  basis: CameraBasis;
  /** J2000 → ENU (with precession). */
  eqToEnu: Mat3;
  /** Vertical FOV in degrees. */
  fovDeg: number;
  /** Framebuffer size. */
  width: number;
  height: number;
  /** Exposure and fade weight. */
  exposure: number;
  weight: number;
}

/** Fraction of visible tiles that were drawn (1 = full coverage). */
export interface SurveyDrawResult {
  coverage: number;
  tilesDrawn: number;
}

export class SkySurveyPass {
  private readonly program: GlProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly ibo: WebGLBuffer;
  private indexCountFor = new Map<number, number>();

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = createProgram(gl, SURVEY_VERT, SURVEY_FRAG, ['u_res', 'u_tile', 'u_black', 'u_gain', 'u_exposure', 'u_weight'], 'survey');
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    if (!vao || !vbo || !ibo) {
      throw new SkyRendererUnavailableError('could not allocate survey buffers');
    }
    this.vao = vao;
    this.vbo = vbo;
    this.ibo = ibo;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const pxLoc = gl.getAttribLocation(this.program.program, 'a_px');
    const uvLoc = gl.getAttribLocation(this.program.program, 'a_uv');
    gl.enableVertexAttribArray(pxLoc);
    gl.vertexAttribPointer(pxLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bindVertexArray(null);
  }

  /** Draw the survey into the currently bound HDR target (additive blending expected). */
  draw(cache: HipsTileCache, input: SurveyDrawInput, black: number, gain: number): SurveyDrawResult {
    const gl = this.gl;
    const degPerPx = (radiansPerPixel(input.params) * 180) / Math.PI;
    const order = orderForPixelScale(degPerPx);
    const enuToEq = mat3Transpose(input.eqToEnu);
    const axisEq = mat3MulVec(enuToEq, input.basis.fwd);
    const halfDiag = ((input.fovDeg / 2) * Math.PI) / 180 * Math.hypot(1, input.width / input.height);
    const cells = visibleCells(order, axisEq, halfDiag);
    if (cells.length === 0) {
      return { coverage: 1, tilesDrawn: 0 };
    }
    const n = order <= HIPS_SURVEY.minOrder ? HIPS_MESH_DIVISIONS_LOW_ORDER : HIPS_MESH_DIVISIONS;
    this.ensureIndices(n);
    const indexCount = this.indexCountFor.get(n) ?? 0;
    const verts = new Float32Array((n + 1) * (n + 1) * 4);

    gl.useProgram(this.program.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.program.uniforms['u_res'], input.width, input.height);
    gl.uniform1f(this.program.uniforms['u_black'], black);
    gl.uniform1f(this.program.uniforms['u_gain'], gain);
    gl.uniform1f(this.program.uniforms['u_exposure'], input.exposure);
    gl.uniform1f(this.program.uniforms['u_weight'], input.weight);
    gl.uniform1i(this.program.uniforms['u_tile'], 0);
    gl.activeTexture(gl.TEXTURE0);

    cache.beginFrame();
    let drawn = 0;
    let wanted = 0;
    for (const pix of cells) {
      // Build the mesh first: skip tiles that fall entirely off screen or behind the camera.
      let visible = false;
      let behind = false;
      let k = 0;
      for (let j = 0; j <= n; j++) {
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          const v = j / n;
          const eq = cellPointToVec(order, pix, u, v);
          const enu = mat3MulVec(input.eqToEnu, eq);
          const c = toCam(enu, input.basis);
          if (c.cz < -0.3) {
            behind = true;
          }
          const p = projectStereo(c, input.params) ?? { x: -1e5, y: -1e5 };
          // Tile image: x runs along the cell's v axis, y (down) along u.
          verts[k++] = p.x;
          verts[k++] = p.y;
          verts[k++] = v;
          verts[k++] = u;
          if (p.x >= 0 && p.x <= input.width && p.y >= 0 && p.y <= input.height) {
            visible = true;
          }
        }
      }
      if (behind || !visible) {
        // Tiles straddling the screen edge are still needed when any vertex is inside;
        // tiles with no vertex inside are skipped (edge cases handled by the cone padding).
        continue;
      }
      wanted++;
      const tex = cache.get(order, pix);
      if (!tex) {
        continue;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
      drawn++;
    }
    gl.bindVertexArray(null);
    cache.trim();
    return { coverage: wanted === 0 ? 1 : drawn / wanted, tilesDrawn: drawn };
  }

  /** Free GPU resources. */
  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.vbo);
    gl.deleteBuffer(this.ibo);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program.program);
  }

  private ensureIndices(n: number): void {
    if (this.indexCountFor.has(n)) {
      // Re-upload: the index buffer holds one subdivision at a time.
    }
    const idx = new Uint16Array(n * n * 6);
    let k = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        idx[k++] = a;
        idx[k++] = b;
        idx[k++] = c;
        idx[k++] = b;
        idx[k++] = d;
        idx[k++] = c;
      }
    }
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.indexCountFor = new Map([[n, idx.length]]);
  }
}

/** Unit vector helper exported for tests. */
export function unitVec(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
