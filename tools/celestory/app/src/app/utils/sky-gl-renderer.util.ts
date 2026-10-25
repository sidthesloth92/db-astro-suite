/**
 * WebGL2 HDR sky renderer. Owns GPU resources and runs the per-frame pass
 * chain: sky (Milky Way + atmosphere) → stars (additive point sprites) →
 * ground silhouette → bloom chain → composite/tonemap to the canvas.
 * Browser-only; the host drives it from its own animation loop.
 */
import { BLOOM_CLAMP, BLOOM_LEVELS, DEFAULT_SKY_LOOK, MOON_SUN_RATIO, STAR_COLOR_LUT_WIDTH, SUN_INTENSITY } from '../models/sky-render.constants';
import type { Vec3 } from '../models/sky.types';
import { exposureForSky, moonZenithLuminance } from './sky-exposure.util';
import { groundLight, twilightGlow, zenithLuminance } from './sky-scatter.util';
import type { SkyFrameInput, SkyLook } from '../models/sky-render.types';
import type { GlProgram, GlRenderTarget, GlStarBuffer, HdrMode } from '../models/sky-gl.types';
import { FULLSCREEN_VERT } from '../models/sky-shaders-common.constants';
import { SKY_FRAG } from '../models/sky-shaders-sky.constants';
import { STARS_FRAG, STARS_VERT } from '../models/sky-shaders-stars.constants';
import { BLIT_FRAG, BLOOM_DOWN_FRAG, BLOOM_UP_FRAG, COMPOSITE_FRAG, GROUND_FRAG } from '../models/sky-shaders-post.constants';
import { BODY_VERT, MOON_FRAG, SUN_FRAG } from '../models/sky-shaders-bodies.constants';
import { HIPS_FADE_END_FOV, HIPS_FADE_START_FOV } from '../models/hips.constants';
import type { HipsTileCache } from './hips-tiles.util';
import { SkySurveyPass } from './sky-survey-pass.util';
import { type PackedStarCatalog, STAR_RECORD_BYTES } from '../models/star-catalog.model';
import { SkyRendererUnavailableError } from '../models/sky-assets.error';
import { createImageTexture, createLutTexture, createProgram, createRenderTarget, createSkyGl, deleteRenderTarget, detectHdrMode, drawFullscreen } from './sky-gl.util';
import { cameraMatrix, mat3Mul, mat3Transpose } from './sky-frame.util';
import { stereographicParams } from './sky-projection.util';
import { buildStarColorLut } from './star-color.util';
import { magnitudeGammaForFov } from './sky-frame-input.util';
import { countBrighterThan } from './star-catalog.util';
import { D2R } from './celestial.util';

const VIEW_UNIFORMS = ['u_res', 'u_center', 'u_scale'];
/** Bytes per planet record (float32 × 5). */
const PLANET_RECORD_BYTES = 20;

export class SkyGlRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly hdrMode: HdrMode;
  private readonly maxPointSize: number;
  private readonly emptyVao: WebGLVertexArrayObject;
  private readonly skyProgram: GlProgram;
  private readonly starsProgram: GlProgram;
  private readonly groundProgram: GlProgram;
  private readonly bloomDownProgram: GlProgram;
  private readonly bloomUpProgram: GlProgram;
  private readonly compositeProgram: GlProgram;
  private readonly moonProgram: GlProgram;
  private readonly sunProgram: GlProgram;
  private readonly blitProgram: GlProgram;
  private skyHalf: GlRenderTarget | null = null;
  private readonly colorLut: WebGLTexture;
  private readonly planetBuffer: GlStarBuffer;
  private moonTexture: WebGLTexture | null = null;
  private survey: SkySurveyPass | null = null;
  private surveyCache: HipsTileCache | null = null;
  private surveyCoverage = 0;
  /** Whether the deep-sky survey layer is enabled. */
  surveyEnabled = true;
  private readonly groundSeed = Math.random();

  private milkyWay: WebGLTexture | null = null;
  private milkyWayWidth = 1;
  private stars: GlStarBuffer[] = [];
  private hdrA: GlRenderTarget | null = null;
  private hdrB: GlRenderTarget | null = null;
  private bloomMips: GlRenderTarget[] = [];
  private width = 1;
  private height = 1;

  /** Look parameters (mutable for live tuning). */
  look: SkyLook = { ...DEFAULT_SKY_LOOK };
  /** Last frame's photometry (for dev tooling). */
  debug = { exposure: 0, sunAltDeg: 0, moonI: 0, moonZenith: 0, sunZenith: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = createSkyGl(canvas);
    this.gl = gl;
    this.hdrMode = detectHdrMode(gl);
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array;
    this.maxPointSize = range[1];
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new SkyRendererUnavailableError('could not allocate vertex array');
    }
    this.emptyVao = vao;
    this.skyProgram = createProgram(gl, FULLSCREEN_VERT, SKY_FRAG, [
      ...VIEW_UNIFORMS,
      'u_camToEnu',
      'u_enuToEq',
      'u_milky',
      'u_milkyLod',
      'u_milkyGain',
      'u_sunEnu',
      'u_sunI',
      'u_moonEnu',
      'u_moonI',
      'u_eclPoleEnu',
      'u_lightPollution',
      'u_airglow',
      'u_zodiacal',
      'u_twilight',
      'u_exposure',
      'u_milkyFade',
    ], 'sky');
    this.starsProgram = createProgram(gl, STARS_VERT, STARS_FRAG, [
      ...VIEW_UNIFORMS,
      'u_eqToEnu',
      'u_enuToCam',
      'u_time',
      'u_starGain',
      'u_limitMag',
      'u_magGamma',
      'u_sizeScale',
      'u_exposure',
      'u_colorLut',
      'u_maxPoint',
    ], 'stars');
    this.groundProgram = createProgram(gl, FULLSCREEN_VERT, GROUND_FRAG, [...VIEW_UNIFORMS, 'u_camToEnu', 'u_sky', 'u_seed', 'u_groundLight'], 'ground');
    this.bloomDownProgram = createProgram(gl, FULLSCREEN_VERT, BLOOM_DOWN_FRAG, ['u_src', 'u_texel', 'u_clamp'], 'bloomDown');
    this.bloomUpProgram = createProgram(gl, FULLSCREEN_VERT, BLOOM_UP_FRAG, ['u_src', 'u_texel', 'u_dst', 'u_radius'], 'bloomUp');
    this.compositeProgram = createProgram(gl, FULLSCREEN_VERT, COMPOSITE_FRAG, [...VIEW_UNIFORMS, 'u_hdr', 'u_bloom', 'u_exposure', 'u_bloomStrength', 'u_vignette'], 'composite');
    const bodyUniforms = [...VIEW_UNIFORMS, 'u_enuToCam', 'u_dirEnu', 'u_angRadius', 'u_minRadiusPx', 'u_spriteScale', 'u_brightness'];
    this.moonProgram = createProgram(gl, BODY_VERT, MOON_FRAG, [...bodyUniforms, 'u_moonTex', 'u_sunEnu', 'u_poleEnu', 'u_camRight', 'u_camUp'], 'moon');
    this.sunProgram = createProgram(gl, BODY_VERT, SUN_FRAG, bodyUniforms, 'sun');
    this.blitProgram = createProgram(gl, FULLSCREEN_VERT, BLIT_FRAG, ['u_src', 'u_dst'], 'blit');
    this.colorLut = createLutTexture(gl, buildStarColorLut(STAR_COLOR_LUT_WIDTH), STAR_COLOR_LUT_WIDTH);
    this.planetBuffer = this.createPlanetBuffer();
  }

  /** Dynamic float-attribute buffer for the planets, drawn with the star program. */
  private createPlanetBuffer(): GlStarBuffer {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) {
      throw new SkyRendererUnavailableError('could not allocate planet buffer');
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, PLANET_RECORD_BYTES * 8, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(this.starsProgram.program, 'a_pos');
    const magLoc = gl.getAttribLocation(this.starsProgram.program, 'a_mag');
    const bvLoc = gl.getAttribLocation(this.starsProgram.program, 'a_bv');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, PLANET_RECORD_BYTES, 0);
    gl.enableVertexAttribArray(magLoc);
    gl.vertexAttribPointer(magLoc, 1, gl.FLOAT, false, PLANET_RECORD_BYTES, 12);
    gl.enableVertexAttribArray(bvLoc);
    gl.vertexAttribPointer(bvLoc, 1, gl.FLOAT, false, PLANET_RECORD_BYTES, 16);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return { vao, buffer, catalog: { count: 0, records: new ArrayBuffer(0) } };
  }

  /** Attach the deep-sky survey tile cache (created by the host with its fetcher). */
  setSurvey(cache: HipsTileCache | null): void {
    this.surveyCache = cache;
    if (cache && !this.survey) {
      this.survey = new SkySurveyPass(this.gl);
    }
  }

  /** Install the Moon colour map. */
  setMoon(image: ImageBitmap): void {
    if (this.moonTexture) {
      this.gl.deleteTexture(this.moonTexture);
    }
    this.moonTexture = createImageTexture(this.gl, image, { mipmap: true, wrapHorizontal: true });
  }

  /** The WebGL context (for helpers such as the tile cache). */
  get context(): WebGL2RenderingContext {
    return this.gl;
  }

  /** Whether the device renders into a half-float buffer (true HDR bloom). */
  get isHdr(): boolean {
    return this.hdrMode === 'float16';
  }

  /** Largest texture the device accepts (decides 4k vs 8k Milky Way). */
  get maxTextureSize(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  /** Install (or replace) the Milky Way equirect map. */
  setMilkyWay(image: ImageBitmap): void {
    const gl = this.gl;
    if (this.milkyWay) {
      gl.deleteTexture(this.milkyWay);
    }
    this.milkyWay = createImageTexture(gl, image, { mipmap: true, wrapHorizontal: true });
    this.milkyWayWidth = image.width;
  }

  /** Add a packed star catalogue (Hipparcos first, Tycho-2 later). */
  addStars(catalog: PackedStarCatalog): void {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) {
      throw new SkyRendererUnavailableError('could not allocate star buffers');
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, catalog.records, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.starsProgram.program, 'a_pos');
    const magLoc = gl.getAttribLocation(this.starsProgram.program, 'a_mag');
    const bvLoc = gl.getAttribLocation(this.starsProgram.program, 'a_bv');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.SHORT, true, STAR_RECORD_BYTES, 0);
    gl.enableVertexAttribArray(magLoc);
    gl.vertexAttribPointer(magLoc, 1, gl.UNSIGNED_BYTE, true, STAR_RECORD_BYTES, 6);
    gl.enableVertexAttribArray(bvLoc);
    gl.vertexAttribPointer(bvLoc, 1, gl.BYTE, true, STAR_RECORD_BYTES, 7);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.stars = [...this.stars, { vao, buffer, catalog }];
  }

  /** Resize the backing store + render targets (CSS px × dpr). */
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (w === this.width && h === this.height && this.hdrA) {
      return;
    }
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.releaseTargets();
    const gl = this.gl;
    this.hdrA = createRenderTarget(gl, w, h, this.hdrMode);
    this.hdrB = createRenderTarget(gl, w, h, this.hdrMode);
    // The sky background is smooth: render it at half resolution and lift it (4× cheaper).
    this.skyHalf = createRenderTarget(gl, Math.max(1, w >> 1), Math.max(1, h >> 1), this.hdrMode);
    let mw = Math.max(1, w >> 1);
    let mh = Math.max(1, h >> 1);
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      this.bloomMips.push(createRenderTarget(gl, mw, mh, this.hdrMode));
      mw = Math.max(1, mw >> 1);
      mh = Math.max(1, mh >> 1);
    }
  }

  /** Draw one frame. */
  render(input: SkyFrameInput): void {
    const gl = this.gl;
    if (!this.hdrA || !this.hdrB || !this.milkyWay) {
      return;
    }
    const params = stereographicParams(input.view);
    const dpr = input.dpr;
    const centerX = params.cx * dpr;
    const centerY = params.cy * dpr;
    const scale = params.scale * dpr;
    const enuToCam = cameraMatrix(input.basis);
    const camToEnu = mat3Transpose(enuToCam);
    const enuToEq = mat3Transpose(input.eqToEnu);
    const sunAltDeg = Math.asin(Math.max(-1, Math.min(1, input.sunEnu.z))) / D2R;
    const moonAltGate = Math.max(0, Math.min(1, (input.moonEnu.z + 0.02) / 0.1));
    const night = this.look.alwaysNight;
    // Scattering intensities for the sky: zero in always-night mode (the Moon disc still draws).
    const moonI = night ? 0 : SUN_INTENSITY * MOON_SUN_RATIO * input.moonIlluminated * moonAltGate * this.look.moonGain;
    const sunI = night ? 0 : SUN_INTENSITY * this.look.sunGain;
    const twilight = night ? 0 : twilightGlow(sunAltDeg) * this.look.sunGain;
    const exposure = night ? this.look.nightExposure : exposureForSky(sunAltDeg, input.moonEnu, moonI, this.look);
    this.debug = { exposure, sunAltDeg, moonI, moonZenith: moonZenithLuminance(input.moonEnu, moonI), sunZenith: zenithLuminance(sunAltDeg) };

    const setView = (p: GlProgram): void => {
      gl.uniform2f(p.uniforms['u_res'], this.width, this.height);
      gl.uniform2f(p.uniforms['u_center'], centerX, centerY);
      gl.uniform1f(p.uniforms['u_scale'], scale);
    };

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.emptyVao);

    // --- sky pass → half-res target ---
    const half = this.skyHalf;
    if (!half) {
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, half.framebuffer);
    gl.viewport(0, 0, half.width, half.height);
    gl.disable(gl.BLEND);
    const sky = this.skyProgram;
    gl.useProgram(sky.program);
    const hs = half.width / this.width;
    gl.uniform2f(sky.uniforms['u_res'], half.width, half.height);
    gl.uniform2f(sky.uniforms['u_center'], centerX * hs, centerY * hs);
    gl.uniform1f(sky.uniforms['u_scale'], scale * hs);
    gl.uniformMatrix3fv(sky.uniforms['u_camToEnu'], false, camToEnu);
    gl.uniformMatrix3fv(sky.uniforms['u_enuToEq'], false, enuToEq);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.milkyWay);
    gl.uniform1i(sky.uniforms['u_milky'], 0);
    const radPerPx = 2 / scale; /* the sky pass renders at half resolution */
    // The map carries faint Gaia stars: crisp when minified (fine star grain), but under
    // magnification they would read as blobs, so blur progressively with magnification.
    const m = Math.log2((2 * Math.PI) / (radPerPx * this.milkyWayWidth)); // log2(screen px per texel)
    // Floor of 1.6: the map's faint-star grain must never read as (blurry) stars at wide zoom.
    const lod = Math.max(1.6, -m + Math.max(0, Math.min(7, 1 + 2.2 * m)));
    gl.uniform1f(sky.uniforms['u_milkyLod'], lod);
    gl.uniform1f(sky.uniforms['u_milkyGain'], this.look.milkyWayGain);
    gl.uniform3f(sky.uniforms['u_sunEnu'], input.sunEnu.x, input.sunEnu.y, input.sunEnu.z);
    gl.uniform1f(sky.uniforms['u_sunI'], sunI);
    gl.uniform3f(sky.uniforms['u_moonEnu'], input.moonEnu.x, input.moonEnu.y, input.moonEnu.z);
    gl.uniform1f(sky.uniforms['u_moonI'], moonI);
    gl.uniform3f(sky.uniforms['u_eclPoleEnu'], input.eclipticPoleEnu.x, input.eclipticPoleEnu.y, input.eclipticPoleEnu.z);
    gl.uniform1f(sky.uniforms['u_lightPollution'], input.lightPollution);
    gl.uniform1f(sky.uniforms['u_airglow'], this.look.airglow);
    gl.uniform1f(sky.uniforms['u_zodiacal'], this.look.zodiacal);
    gl.uniform1f(sky.uniforms['u_twilight'], twilight);
    gl.uniform1f(sky.uniforms['u_exposure'], exposure);
    // Survey weight: fades in as the view narrows, but only once its tiles have arrived.
    const fovT = Math.max(0, Math.min(1, (HIPS_FADE_START_FOV - input.view.fovDeg) / (HIPS_FADE_START_FOV - HIPS_FADE_END_FOV)));
    const surveyWanted = this.surveyEnabled && this.survey && this.surveyCache ? fovT * fovT * (3 - 2 * fovT) : 0;
    const surveyWeight = surveyWanted * this.surveyCoverage;
    gl.uniform1f(sky.uniforms['u_milkyFade'], 1 - surveyWeight);
    drawFullscreen(gl);

    // --- lift the sky to full resolution → A ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdrA.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    const blit = this.blitProgram;
    gl.useProgram(blit.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, half.texture);
    gl.uniform1i(blit.uniforms['u_src'], 0);
    gl.uniform2f(blit.uniforms['u_dst'], 1 / this.width, 1 / this.height);
    drawFullscreen(gl);

    // --- deep-sky survey (additive) → A ---
    if (surveyWanted > 0 && this.survey && this.surveyCache) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const result = this.survey.draw(
        this.surveyCache,
        { params: { cx: centerX, cy: centerY, scale }, dpr, basis: input.basis, eqToEnu: input.eqToEnu, fovDeg: input.view.fovDeg, width: this.width, height: this.height, exposure, weight: surveyWeight > 0 ? surveyWanted : 0 },
        this.look.surveyBlack,
        this.look.surveyGain,
      );
      gl.disable(gl.BLEND);
      // Ease coverage so tiles fade in rather than pop.
      this.surveyCoverage += (result.coverage - this.surveyCoverage) * 0.08;
      gl.bindVertexArray(this.emptyVao);
    } else {
      this.surveyCoverage += (0 - this.surveyCoverage) * 0.1;
    }

    // --- stars (additive) → A ---
    if (this.stars.length > 0) {
      const st = this.starsProgram;
      gl.useProgram(st.program);
      setView(st);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniformMatrix3fv(st.uniforms['u_eqToEnu'], false, input.eqToEnu);
      gl.uniformMatrix3fv(st.uniforms['u_enuToCam'], false, enuToCam);
      gl.uniform1f(st.uniforms['u_time'], input.timeSeconds);
      gl.uniform1f(st.uniforms['u_starGain'], this.look.starGain);
      gl.uniform1f(st.uniforms['u_limitMag'], input.limitMag);
      gl.uniform1f(st.uniforms['u_magGamma'], magnitudeGammaForFov(input.view.fovDeg));
      gl.uniform1f(st.uniforms['u_sizeScale'], dpr);
      gl.uniform1f(st.uniforms['u_exposure'], exposure);
      gl.uniform1f(st.uniforms['u_maxPoint'], this.maxPointSize);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.colorLut);
      gl.uniform1i(st.uniforms['u_colorLut'], 1);
      for (const sb of this.stars) {
        const count = countBrighterThan(sb.catalog, input.limitMag + 0.5);
        if (count === 0) continue;
        gl.bindVertexArray(sb.vao);
        gl.drawArrays(gl.POINTS, 0, count);
      }
      // planets: same PSF, float records encoded like the packed catalogue
      if (input.planets.length > 0) {
        const rec = new Float32Array(input.planets.length * 5);
        input.planets.forEach((p, i) => {
          rec[i * 5] = p.unit.x;
          rec[i * 5 + 1] = p.unit.y;
          rec[i * 5 + 2] = p.unit.z;
          rec[i * 5 + 3] = (p.magnitude + 2) / 25.5;
          rec[i * 5 + 4] = (p.bv * 50) / 127;
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, this.planetBuffer.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, rec);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(this.planetBuffer.vao);
        gl.drawArrays(gl.POINTS, 0, input.planets.length);
      }
      gl.bindVertexArray(this.emptyVao);
      gl.disable(gl.BLEND);
    }

    // --- Sun + Moon discs (alpha-blended over sky + stars) ---
    this.drawBodies(input, enuToCam, exposure, centerX, centerY, scale);

    // --- ground: A → B ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.hdrB.framebuffer);
    const gr = this.groundProgram;
    gl.useProgram(gr.program);
    setView(gr);
    gl.uniformMatrix3fv(gr.uniforms['u_camToEnu'], false, camToEnu);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.hdrA.texture);
    gl.uniform1i(gr.uniforms['u_sky'], 0);
    gl.uniform1f(gr.uniforms['u_seed'], this.groundSeed);
    const gl3 = groundLight(input, moonI, exposure, night ? { ...this.look, sunGain: 0 } : this.look);
    gl.uniform3f(gr.uniforms['u_groundLight'], gl3[0], gl3[1], gl3[2]);
    drawFullscreen(gl);

    // --- bloom chain from B ---
    let src: GlRenderTarget = this.hdrB;
    const down = this.bloomDownProgram;
    gl.useProgram(down.program);
    for (let i = 0; i < this.bloomMips.length; i++) {
      const mip = this.bloomMips[i];
      gl.bindFramebuffer(gl.FRAMEBUFFER, mip.framebuffer);
      gl.viewport(0, 0, mip.width, mip.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.texture);
      gl.uniform1i(down.uniforms['u_src'], 0);
      gl.uniform2f(down.uniforms['u_texel'], 1 / src.width, 1 / src.height);
      // Clamp the first level so the Sun's disc cannot flood the whole frame with bloom.
      gl.uniform1f(down.uniforms['u_clamp'], i === 0 ? BLOOM_CLAMP : 1e9);
      drawFullscreen(gl);
      src = mip;
    }
    const up = this.bloomUpProgram;
    gl.useProgram(up.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.bloomMips.length - 1; i > 0; i--) {
      const from = this.bloomMips[i];
      const to = this.bloomMips[i - 1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.framebuffer);
      gl.viewport(0, 0, to.width, to.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.uniform1i(up.uniforms['u_src'], 0);
      gl.uniform2f(up.uniforms['u_texel'], 1 / from.width, 1 / from.height);
      gl.uniform2f(up.uniforms['u_dst'], 1 / to.width, 1 / to.height);
      gl.uniform1f(up.uniforms['u_radius'], 1.2);
      drawFullscreen(gl);
    }
    gl.disable(gl.BLEND);

    // --- composite → canvas ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    const comp = this.compositeProgram;
    gl.useProgram(comp.program);
    setView(comp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.hdrB.texture);
    gl.uniform1i(comp.uniforms['u_hdr'], 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomMips[0].texture);
    gl.uniform1i(comp.uniforms['u_bloom'], 1);
    gl.uniform1f(comp.uniforms['u_exposure'], 1.0);
    gl.uniform1f(comp.uniforms['u_bloomStrength'], this.look.bloomStrength);
    gl.uniform1f(comp.uniforms['u_vignette'], this.look.vignette);
    drawFullscreen(gl);
    gl.bindVertexArray(null);
  }

  private drawBodies(input: SkyFrameInput, enuToCam: Float32Array, exposure: number, centerX: number, centerY: number, scale: number): void {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const minRadius = 5 * input.dpr;
    const setCommon = (p: GlProgram, dir: Vec3, angRadius: number, spriteScale: number, brightness: number): void => {
      gl.useProgram(p.program);
      gl.uniform2f(p.uniforms['u_res'], this.width, this.height);
      gl.uniform2f(p.uniforms['u_center'], centerX, centerY);
      gl.uniform1f(p.uniforms['u_scale'], scale);
      gl.uniformMatrix3fv(p.uniforms['u_enuToCam'], false, enuToCam);
      gl.uniform3f(p.uniforms['u_dirEnu'], dir.x, dir.y, dir.z);
      gl.uniform1f(p.uniforms['u_angRadius'], angRadius);
      gl.uniform1f(p.uniforms['u_minRadiusPx'], minRadius);
      gl.uniform1f(p.uniforms['u_spriteScale'], spriteScale);
      gl.uniform1f(p.uniforms['u_brightness'], brightness);
    };
    if (!this.look.alwaysNight && input.sunEnu.z > -0.02) {
      // The disc itself is far beyond the display range; the sky pass already carries its glare.
      setCommon(this.sunProgram, input.sunEnu, (0.533 / 2) * D2R, 1.05, 60);
      gl.drawArrays(gl.POINTS, 0, 1);
    }
    if (this.moonTexture && input.moonEnu.z > -0.02) {
      const m = this.moonProgram;
      // Lit surface ≈ 2500 cd/m² physically; shown at a readable local level that still blooms.
      const brightness = Math.min(1.6, Math.max(0.9, 2500 * exposure * 0.0004));
      setCommon(m, input.moonEnu, (input.moonDiameterDeg / 2) * D2R, 1.05, brightness);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.moonTexture);
      gl.uniform1i(m.uniforms['u_moonTex'], 2);
      gl.uniform3f(m.uniforms['u_sunEnu'], input.sunEnu.x, input.sunEnu.y, input.sunEnu.z);
      gl.uniform3f(m.uniforms['u_poleEnu'], input.eclipticPoleEnu.x, input.eclipticPoleEnu.y, input.eclipticPoleEnu.z);
      gl.uniform3f(m.uniforms['u_camRight'], input.basis.right.x, input.basis.right.y, input.basis.right.z);
      gl.uniform3f(m.uniforms['u_camUp'], input.basis.up.x, input.basis.up.y, input.basis.up.z);
      gl.drawArrays(gl.POINTS, 0, 1);
    }
    gl.disable(gl.BLEND);
  }

  /** Release all GPU resources. */
  dispose(): void {
    const gl = this.gl;
    this.releaseTargets();
    for (const sb of this.stars) {
      gl.deleteVertexArray(sb.vao);
      gl.deleteBuffer(sb.buffer);
    }
    this.stars = [];
    if (this.milkyWay) {
      gl.deleteTexture(this.milkyWay);
      this.milkyWay = null;
    }
    gl.deleteTexture(this.colorLut);
    if (this.moonTexture) gl.deleteTexture(this.moonTexture);
    this.survey?.dispose();
    gl.deleteVertexArray(this.planetBuffer.vao);
    gl.deleteBuffer(this.planetBuffer.buffer);
    gl.deleteVertexArray(this.emptyVao);
    for (const p of [this.skyProgram, this.starsProgram, this.groundProgram, this.bloomDownProgram, this.bloomUpProgram, this.compositeProgram, this.moonProgram, this.sunProgram, this.blitProgram]) {
      gl.deleteProgram(p.program);
    }
  }

  private releaseTargets(): void {
    const gl = this.gl;
    if (this.hdrA) deleteRenderTarget(gl, this.hdrA);
    if (this.hdrB) deleteRenderTarget(gl, this.hdrB);
    if (this.skyHalf) deleteRenderTarget(gl, this.skyHalf);
    this.skyHalf = null;
    for (const m of this.bloomMips) deleteRenderTarget(gl, m);
    this.hdrA = null;
    this.hdrB = null;
    this.bloomMips = [];
  }
}
