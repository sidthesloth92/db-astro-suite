import {
  BACKDROP_GRID_SEGMENTS,
  SCENE_FAR,
  SCENE_NEAR,
  STAR_DYNAMIC_STRIDE,
  STAR_STATIC_STRIDE,
} from '../constants/scene3d.constant';
import {
  BACKDROP_FRAGMENT_SHADER,
  BACKDROP_VERTEX_SHADER,
  STAR_FRAGMENT_SHADER,
  STAR_VERTEX_SHADER,
} from '../constants/scene3d-shader.constant';
import { multiplyMat4, perspectiveFromTangents, viewFromPosition } from '../utils/mat4.util';
import { LiftedScene } from './lifted-scene.model';
import { ParallaxRendererError } from './parallax-renderer.error';
import { FrameView, PhotoReach, ScenePose } from './scene-pose.model';
import { StarVolume } from './star-volume.model';

/** What one drawn frame needs besides the scene and its stars. */
export interface ParallaxFrame {
  /** Camera pose. */
  pose: ScenePose;
  /** The resting lens. */
  view: FrameView;
  /** Nebula relief, as a fraction of the backdrop distance. */
  relief: number;
}

/**
 * @class ParallaxRenderer
 * @description
 * Draws the 3D scene with WebGL2: the starless backdrop as a depth-displaced grid, then the
 * stars as additive camera-facing quads. Owns every GPU resource and rebuilds them if the
 * browser drops and restores the graphics context.
 *
 * The backdrop can be made larger than the photo ({@link setBackdropReach}). Past the photo's
 * edge it repeats the photo mirrored, so a frame that turns its corners past the edge sees the
 * picture carry on instead of a black wedge.
 */
export class ParallaxRenderer {
  private readonly gl: WebGL2RenderingContext;
  private backdropProgram: WebGLProgram | null = null;
  private starProgram: WebGLProgram | null = null;
  private backdropArray: WebGLVertexArrayObject | null = null;
  private starArray: WebGLVertexArrayObject | null = null;
  private dynamicBuffer: WebGLBuffer | null = null;
  private staticBuffer: WebGLBuffer | null = null;
  private cornerBuffer: WebGLBuffer | null = null;
  private gridBuffer: WebGLBuffer | null = null;
  private gridIndexBuffer: WebGLBuffer | null = null;
  private textures: WebGLTexture[] = [];
  private gridIndexCount = 0;
  private scene: LiftedScene | null = null;
  private stars: StarVolume | null = null;
  /** How far the backdrop extends from the photo's centre; 1 each way is the photo itself. */
  private backdropReach: PhotoReach = { x: 1, y: 1 };
  private readonly uniforms = new Map<string, WebGLUniformLocation | null>();
  private readonly onLost = (event: Event): void => event.preventDefault();
  private readonly onRestored = (): void => {
    try {
      this.rebuild();
    } catch (error) {
      // The restored context could not be set up again: tell the owner instead of leaving
      // a black canvas that still looks ready.
      this.onFailure(error);
    }
  };

  /** True when this browser can create a WebGL2 context at all. */
  static isSupported(): boolean {
    return document.createElement('canvas').getContext('webgl2') !== null;
  }

  /**
   * @param canvas - Canvas to draw into; its backing-store size is the output size
   * @param onFailure - Called if the scene cannot be rebuilt after the browser restores a
   *   lost graphics context
   * @throws ParallaxRendererError when WebGL2 is unavailable or a shader does not build
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onFailure: (error: unknown) => void = () => undefined,
  ) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
    if (gl === null) {
      throw new ParallaxRendererError('This browser does not support WebGL2.');
    }
    this.gl = gl;
    this.buildPrograms();
    // Only once setup has succeeded: a failed constructor must leave nothing attached.
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
  }

  /** Uploads a lifted scene: backdrop textures, depth map, star atlas and the backdrop grid. */
  setScene(scene: LiftedScene): void {
    this.scene = scene;
    const gl = this.gl;
    for (const texture of this.textures) gl.deleteTexture(texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    // The three backdrop layers repeat mirrored past the photo's edge; the star atlas does not.
    this.textures = [
      this.createTexture(scene.starless, scene.width, scene.height, gl.RGBA8, gl.RGBA, gl.MIRRORED_REPEAT),
      this.createTexture(scene.photo, scene.width, scene.height, gl.RGBA8, gl.RGBA, gl.MIRRORED_REPEAT),
      this.createTexture(scene.cloudDepth, scene.width, scene.height, gl.R8, gl.RED, gl.MIRRORED_REPEAT),
      this.createTexture(scene.atlas, scene.atlasWidth, scene.atlasHeight, gl.RGBA8, gl.RGBA, gl.CLAMP_TO_EDGE),
    ];
    this.buildGrid(scene.width / scene.height);
  }

  /**
   * Sets how far the backdrop extends from the photo's centre, for a frame that turns its
   * corners past the photo's edge. Anything below 1 is treated as 1: the backdrop is never
   * smaller than the photo.
   */
  setBackdropReach(reach: PhotoReach): void {
    const next = { x: Math.max(1, reach.x), y: Math.max(1, reach.y) };
    if (next.x === this.backdropReach.x && next.y === this.backdropReach.y) return;
    this.backdropReach = next;
    if (this.scene !== null) this.buildGrid(this.scene.width / this.scene.height);
  }

  /** Forgets the scene and its stars and blanks the canvas, for when the photo is cleared. */
  clearScene(): void {
    const gl = this.gl;
    for (const texture of this.textures) gl.deleteTexture(texture);
    this.textures = [];
    this.scene = null;
    this.stars = null;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /** Uploads a star volume's fixed looks and makes room for its per-frame data. */
  setStars(stars: StarVolume): void {
    this.stars = stars;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, stars.staticData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, stars.dynamicData.byteLength, gl.DYNAMIC_DRAW);
  }

  /** Draws one frame. Does nothing until a scene has been set. */
  render(frame: ParallaxFrame): void {
    const gl = this.gl;
    if (this.scene === null || gl.isContextLost()) return;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    const { pose, view } = frame;
    const projection = perspectiveFromTangents(
      view.tanX * pose.tanScale,
      view.tanY * pose.tanScale,
      SCENE_NEAR,
      SCENE_FAR,
    );
    const viewMatrix = viewFromPosition(pose.position.x, pose.position.y, pose.position.z, pose.roll);
    this.textures.forEach((texture, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    });

    gl.disable(gl.BLEND);
    gl.useProgram(this.backdropProgram);
    gl.uniformMatrix4fv(this.uniform('backdrop.uViewProjection'), false, multiplyMat4(projection, viewMatrix));
    gl.uniform1f(this.uniform('backdrop.uRelief'), frame.relief);
    gl.uniform1f(this.uniform('backdrop.uAspect'), view.imageAspect);
    gl.uniform1f(this.uniform('backdrop.uPhotoMix'), pose.photoMix);
    gl.uniform1i(this.uniform('backdrop.uStarless'), 0);
    gl.uniform1i(this.uniform('backdrop.uPhoto'), 1);
    gl.uniform1i(this.uniform('backdrop.uDepth'), 2);
    gl.bindVertexArray(this.backdropArray);
    gl.drawElements(gl.TRIANGLES, this.gridIndexCount, gl.UNSIGNED_INT, 0);

    const stars = this.stars;
    if (stars !== null && stars.count > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.starProgram);
      gl.uniformMatrix4fv(this.uniform('star.uView'), false, viewMatrix);
      gl.uniformMatrix4fv(this.uniform('star.uProjection'), false, projection);
      gl.uniform1i(this.uniform('star.uAtlas'), 3);
      gl.uniform1f(this.uniform('star.uSharp'), stars.sharp ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, stars.dynamicData);
      gl.bindVertexArray(this.starArray);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, stars.count);
    }
    gl.bindVertexArray(null);
  }

  /** Releases every GPU resource and detaches the context listeners. */
  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    const gl = this.gl;
    for (const texture of this.textures) gl.deleteTexture(texture);
    this.textures = [];
    gl.deleteProgram(this.backdropProgram);
    gl.deleteProgram(this.starProgram);
    gl.deleteVertexArray(this.backdropArray);
    gl.deleteVertexArray(this.starArray);
    for (const buffer of [
      this.dynamicBuffer,
      this.staticBuffer,
      this.cornerBuffer,
      this.gridBuffer,
      this.gridIndexBuffer,
    ]) {
      gl.deleteBuffer(buffer);
    }
    this.scene = null;
    this.stars = null;
    // Give the context back now: browsers cap how many can be alive, and switching between
    // 2D and 3D makes a new one each time.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /** After the browser restores a lost context, every resource has to be created again. */
  private rebuild(): void {
    this.textures = [];
    this.cornerBuffer = null;
    this.gridBuffer = null;
    this.gridIndexBuffer = null;
    this.backdropArray = null;
    this.uniforms.clear();
    this.buildPrograms();
    if (this.scene !== null) this.setScene(this.scene);
    if (this.stars !== null) this.setStars(this.stars);
  }

  private buildPrograms(): void {
    const gl = this.gl;
    this.backdropProgram = this.link(BACKDROP_VERTEX_SHADER, BACKDROP_FRAGMENT_SHADER);
    this.starProgram = this.link(STAR_VERTEX_SHADER, STAR_FRAGMENT_SHADER);
    for (const name of ['uViewProjection', 'uRelief', 'uAspect', 'uPhotoMix', 'uStarless', 'uPhoto', 'uDepth']) {
      this.uniforms.set(`backdrop.${name}`, gl.getUniformLocation(this.backdropProgram, name));
    }
    for (const name of ['uView', 'uProjection', 'uAtlas', 'uSharp']) {
      this.uniforms.set(`star.${name}`, gl.getUniformLocation(this.starProgram, name));
    }
    this.dynamicBuffer = gl.createBuffer();
    this.staticBuffer = gl.createBuffer();
    this.buildStarArray();
  }

  /** Wires the star quad: four shared corners plus per-star dynamic and static attributes. */
  private buildStarArray(): void {
    const gl = this.gl;
    const program = this.starProgram;
    if (program === null) return;
    this.starArray = gl.createVertexArray();
    gl.bindVertexArray(this.starArray);

    this.cornerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const corner = gl.getAttribLocation(program, 'aCorner');
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

    const perStar = (buffer: WebGLBuffer | null, stride: number, layout: [string, number][]): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      let offset = 0;
      for (const [name, size] of layout) {
        const location = gl.getAttribLocation(program, name);
        if (location >= 0) {
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride * 4, offset * 4);
          gl.vertexAttribDivisor(location, 1);
        }
        offset += size;
      }
    };
    perStar(this.dynamicBuffer, STAR_DYNAMIC_STRIDE, [['aPosition', 3], ['aHalf', 2], ['aAlpha', 1]]);
    perStar(this.staticBuffer, STAR_STATIC_STRIDE, [
      ['aRect', 4],
      ['aColor', 3],
      ['aAmp', 1],
      ['aSpike', 1],
      ['aExtent', 1],
      ['aKind', 1],
    ]);
    gl.bindVertexArray(null);
  }

  /**
   * Builds the backdrop grid, finer along the photo's longer side. A backdrop that reaches
   * past the photo gets more of the same squares, so the photo itself is drawn as finely as ever.
   */
  private buildGrid(aspect: number): void {
    const gl = this.gl;
    const program = this.backdropProgram;
    if (program === null) return;
    const reach = this.backdropReach;
    const across = aspect >= 1 ? BACKDROP_GRID_SEGMENTS : Math.max(2, Math.round(BACKDROP_GRID_SEGMENTS * aspect));
    const down = aspect >= 1 ? Math.max(2, Math.round(BACKDROP_GRID_SEGMENTS / aspect)) : BACKDROP_GRID_SEGMENTS;
    const columns = Math.ceil(across * reach.x);
    const rows = Math.ceil(down * reach.y);

    // Texture coordinates run past 0..1 where the backdrop is wider than the photo.
    const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
    for (let r = 0, i = 0; r <= rows; r++) {
      for (let c = 0; c <= columns; c++) {
        uvs[i++] = 0.5 + (c / columns - 0.5) * reach.x;
        uvs[i++] = 0.5 + (r / rows - 0.5) * reach.y;
      }
    }
    const indices = new Uint32Array(columns * rows * 6);
    for (let r = 0, i = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const a = r * (columns + 1) + c;
        const b = a + columns + 1;
        indices.set([a, b, a + 1, a + 1, b, b + 1], i);
        i += 6;
      }
    }
    this.gridIndexCount = indices.length;

    gl.deleteVertexArray(this.backdropArray);
    gl.deleteBuffer(this.gridBuffer);
    gl.deleteBuffer(this.gridIndexBuffer);
    this.backdropArray = gl.createVertexArray();
    this.gridBuffer = gl.createBuffer();
    this.gridIndexBuffer = gl.createBuffer();
    gl.bindVertexArray(this.backdropArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const uv = gl.getAttribLocation(program, 'aUv');
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.gridIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  private createTexture(
    data: ArrayBufferView,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    wrap: number,
  ): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return texture;
  }

  private link(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type);
      if (shader === null) throw new ParallaxRendererError('Could not create a shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new ParallaxRendererError(`Shader failed to compile: ${gl.getShaderInfoLog(shader) ?? ''}`);
      }
      gl.attachShader(program, shader);
      // Flagged for deletion now; the driver frees it once the program no longer needs it.
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new ParallaxRendererError(`Shaders failed to link: ${gl.getProgramInfoLog(program) ?? ''}`);
    }
    return program;
  }

  private uniform(name: string): WebGLUniformLocation | null {
    return this.uniforms.get(name) ?? null;
  }
}
