/**
 * Planetarium overlay + frame loop. Owns requestAnimationFrame, advances the
 * camera and simulated time, drives the WebGL sky, then draws the restrained
 * line/label layer on a transparent 2D canvas: graticule, equator / ecliptic /
 * meridian, constellation figures + names, star names, cardinal points, and
 * positions the DOM target markers. Browser-only.
 */
import { BRAND_PINK } from '../models/brand.constants';
import type { SkyOverlayState } from '../models/sky-overlay.types';
import type { SkyViewport, StereographicParams } from '../models/sky-projection.types';
import type { CameraBasis, Vec3 } from '../models/sky.types';
import type { SkyGlRenderer } from './sky-gl-renderer.util';
import type { SkyCamera } from './sky-camera.util';
import type { SkyTimeStore } from '../services/sky-time-store.service';
import { altAzToVec, camBasis, D2R, toCam } from './celestial.util';
import { eclipticPoleUnit } from './ephemeris.util';
import { equatorialToEnuMatrix, mat3MulVec, raDecToUnit } from './sky-frame.util';
import { buildSkyFrameInput } from './sky-frame-input.util';
import { projectStereo, stereographicParams } from './sky-projection.util';
import { placeLabel, type LabelBox } from './label-layout.util';
import { drawMeteor, MeteorSimulation } from './meteor.util';

const LINE_GRID = 'rgba(150, 180, 230, 0.13)';
const LINE_GRID_MAJOR = 'rgba(150, 180, 230, 0.2)';
const LINE_CONSTELLATION = 'rgba(160, 200, 245, 0.22)';
const TEXT_DIM = 'rgba(190, 205, 235, 0.45)';
const TEXT_CARDINAL = 'rgba(200, 220, 255, 0.7)';
const TEXT_CONSTELLATION = 'rgba(190, 205, 240, 0.34)';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
const FONT_DISPLAY = '"Outfit", "Inter", system-ui, sans-serif';

export class SkyOverlayRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastT = 0;
  private size = { w: 1, h: 1, dpr: 1 };
  private requestedDpr = 1;
  /** Backing resolution of the WebGL sky; lowered on slow devices (text stays at full DPR). */
  private glDpr = 0;
  private slowFrames = 0;
  private frameCount = 0;
  private placed: LabelBox[] = [];
  private readonly meteors = new MeteorSimulation(Math.random, performance.now() / 1000);
  private readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly state: SkyOverlayState,
    private readonly camera: SkyCamera,
    private readonly time: SkyTimeStore,
    private gl: SkyGlRenderer | null,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    this.ctx = ctx;
  }

  /** Attach (or replace) the WebGL sky. */
  setGl(gl: SkyGlRenderer | null): void {
    this.gl = gl;
    if (gl) {
      gl.resize(this.size.w, this.size.h, this.glDpr || this.size.dpr);
    }
  }

  /** Set the rendered viewport size + device-pixel-ratio. */
  resize(width: number, height: number, dpr: number): void {
    this.requestedDpr = dpr;
    this.size = { w: width, h: height, dpr };
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.glDpr = Math.min(dpr, this.glDpr || dpr);
    this.gl?.resize(width, height, this.glDpr);
  }

  /** Current projection parameters (CSS px) for the eased camera. */
  params(): StereographicParams {
    return stereographicParams(this.viewport());
  }

  /** Current viewport (CSS px + eased FOV). */
  viewport(): SkyViewport {
    return { width: this.size.w, height: this.size.h, fovDeg: this.camera.state.fov };
  }

  /** Start the frame loop. */
  start(): void {
    this.lastT = performance.now();
    const loop = (t: number): void => {
      const dt = Math.min(0.1, Math.max(0.001, (t - this.lastT) / 1000));
      this.lastT = t;
      this.frame(dt, t / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Stop the frame loop. */
  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /**
   * Drop the WebGL backing resolution a notch only when frames are clearly and
   * persistently slow (< 20 fps), never below 75% of native, and never the text canvas.
   * Isolated stalls (tile decodes, shader compiles) must not trigger it.
   */
  private governFrameRate(dt: number): void {
    this.frameCount++;
    if (this.frameCount < 180) {
      return; /* let shaders compile and assets upload */
    }
    if (dt > 0.05) {
      this.slowFrames++;
    } else {
      this.slowFrames = Math.max(0, this.slowFrames - 2);
    }
    const floor = Math.max(1, this.requestedDpr * 0.75);
    if (this.slowFrames > 90 && this.glDpr > floor) {
      this.slowFrames = 0;
      this.glDpr = Math.max(floor, this.glDpr - 0.25);
      this.gl?.resize(this.size.w, this.size.h, this.glDpr);
      console.info(`[planetarium] slow frames: sky resolution lowered to ${this.glDpr.toFixed(2)}× (text stays sharp)`);
    }
  }

  /** Fire a shooting star now, through the view centre by default (dev tooling). */
  triggerMeteor(at?: { altDeg: number; azDeg: number }): void {
    const c = this.camera.state;
    this.meteors.trigger(performance.now() / 1000, at ?? { altDeg: Math.max(10, c.pitch), azDeg: c.heading });
  }

  /** The shooting star in flight, if any (dev tooling). */
  get currentMeteor(): { t0: number; duration: number; now: number } | null {
    const m = this.meteors.current[this.meteors.current.length - 1];
    return m ? { t0: m.t0, duration: m.duration, now: performance.now() / 1000 } : null;
  }

  /** Current WebGL backing resolution (device pixels per CSS pixel). */
  get skyDpr(): number {
    return this.glDpr || this.size.dpr;
  }

  private frame(dt: number, seconds: number): void {
    this.governFrameRate(dt);
    this.camera.update(dt);
    this.time.tick();
    const now = this.time.now();
    const loc = this.state.location();
    const cam = this.camera.state;
    const basis = camBasis(cam.heading, cam.pitch);
    const view = this.viewport();
    const params = stereographicParams(view);
    const eqToEnu = equatorialToEnuMatrix(loc.lat, loc.lon, now);

    if (this.gl) {
      this.gl.render(buildSkyFrameInput(view, this.glDpr || this.size.dpr, basis, loc, now, seconds, this.state.lightPollution()));
    }

    const { ctx } = this;
    const { w: W, h: H, dpr } = this.size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    this.placed = [];
    const toggles = this.state.toggles();
    const project = (v: Vec3): { x: number; y: number } | null => projectStereo(toCam(v, basis), params);

    if (!this.reducedMotion) {
      this.meteors.update(seconds);
      for (const meteor of this.meteors.current) {
        drawMeteor(ctx, meteor, seconds, project);
      }
    }
    if (toggles.grid) {
      this.drawGrid(project, basis, params, eqToEnu, now);
    }
    if (toggles.constellations) {
      this.drawConstellations(project, eqToEnu, view);
    }
    this.drawCardinals(project);
    if (toggles.labels) {
      this.drawStarNames(project, eqToEnu, view);
    }
    this.placeMarkers(basis, params, view);
  }

  /** Stroke a polyline of ENU unit vectors, breaking where it leaves the view. */
  private strokePath(project: (v: Vec3) => { x: number; y: number } | null, points: Vec3[], style: string, width: number, dash: number[] = []): void {
    const { ctx } = this;
    const { w: W, h: H } = this.size;
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let pen = false;
    let prev: { x: number; y: number } | null = null;
    for (const v of points) {
      const p = v.z < -0.004 ? null : project(v); /* nothing below the horizon */
      const onScreen = !!p && p.x > -W && p.x < 2 * W && p.y > -H && p.y < 2 * H;
      if (!p || !onScreen) {
        pen = false;
        prev = null;
        continue;
      }
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > Math.max(W, H)) {
        pen = false;
      }
      if (!pen) {
        ctx.moveTo(p.x, p.y);
        pen = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
      prev = p;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawGrid(
    project: (v: Vec3) => { x: number; y: number } | null,
    basis: CameraBasis,
    params: StereographicParams,
    eqToEnu: Float32Array,
    now: Date,
  ): void {
    const { ctx } = this;
    // alt/az graticule (above the horizon only)
    for (let az = 0; az < 360; az += 15) {
      const pts: Vec3[] = [];
      for (let al = 0; al <= 90; al += 2) pts.push(altAzToVec(al, az));
      this.strokePath(project, pts, az % 90 === 0 ? LINE_GRID_MAJOR : LINE_GRID, 1);
    }
    for (const al of [15, 30, 45, 60, 75]) {
      const pts: Vec3[] = [];
      for (let az = 0; az <= 360; az += 2) pts.push(altAzToVec(al, az));
      this.strokePath(project, pts, LINE_GRID, 1);
      const p = project(altAzToVec(al, this.camera.state.heading));
      if (p) {
        ctx.font = `500 10px ${FONT_MONO}`;
        ctx.fillStyle = TEXT_DIM;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${al}°`, p.x + 4, p.y - 2);
      }
    }
    // celestial equator
    const eq: Vec3[] = [];
    for (let ra = 0; ra <= 360; ra += 2) eq.push(mat3MulVec(eqToEnu, raDecToUnit(ra, 0)));
    this.strokePath(project, eq, hexA(BRAND_PINK, 0.28), 1, [6, 6]);
    // ecliptic: great circle perpendicular to the ecliptic pole
    const pole = mat3MulVec(eqToEnu, eclipticPoleUnit(now));
    const a = normalize(cross(pole, Math.abs(pole.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }));
    const b = cross(pole, a);
    const ecl: Vec3[] = [];
    for (let t = 0; t <= 360; t += 2) {
      const r = t * D2R;
      ecl.push({ x: a.x * Math.cos(r) + b.x * Math.sin(r), y: a.y * Math.cos(r) + b.y * Math.sin(r), z: a.z * Math.cos(r) + b.z * Math.sin(r) });
    }
    this.strokePath(project, ecl, 'rgba(240, 200, 120, 0.26)', 1, [2, 7]);
    // meridian
    const mer: Vec3[] = [];
    for (let al = 0; al <= 180; al += 2) mer.push(altAzToVec(al <= 90 ? al : 180 - al, al <= 90 ? 0 : 180));
    this.strokePath(project, mer, 'rgba(150, 180, 230, 0.2)', 1, [1, 6]);
    // zenith
    const z = projectStereo(toCam({ x: 0, y: 0, z: 1 }, basis), params);
    if (z) {
      ctx.strokeStyle = 'rgba(180, 195, 230, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(z.x - 6, z.y);
      ctx.lineTo(z.x + 6, z.y);
      ctx.moveTo(z.x, z.y - 6);
      ctx.lineTo(z.x, z.y + 6);
      ctx.stroke();
    }
  }

  private drawConstellations(project: (v: Vec3) => { x: number; y: number } | null, eqToEnu: Float32Array, view: SkyViewport): void {
    const catalog = this.state.catalog();
    if (!catalog) return;
    const { ctx } = this;
    for (const con of catalog.constellations) {
      for (const line of con.lines) {
        this.strokePath(
          project,
          line.map(([ra, dec]) => mat3MulVec(eqToEnu, raDecToUnit(ra, dec))),
          LINE_CONSTELLATION,
          1,
        );
      }
    }
    if (view.fovDeg > 125) return;
    ctx.font = `500 11px ${FONT_DISPLAY}`;
    ctx.fillStyle = TEXT_CONSTELLATION;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const con of catalog.constellations) {
      const v = mat3MulVec(eqToEnu, raDecToUnit(con.centre[0], con.centre[1]));
      if (v.z < 0.02) continue;
      const p = project(v);
      if (!p || p.x < 0 || p.x > view.width || p.y < 0 || p.y > view.height) continue;
      const text = con.name.toUpperCase();
      const w = ctx.measureText(text).width + 8;
      const box = placeLabel(this.placed, p.x - w / 2, p.y - 7, w, 14);
      if (!box) continue;
      ctx.save();
      ctx.letterSpacing = '0.18em';
      ctx.fillText(text, box.x + w / 2, box.y + 7);
      ctx.restore();
    }
  }

  private drawStarNames(project: (v: Vec3) => { x: number; y: number } | null, eqToEnu: Float32Array, view: SkyViewport): void {
    const catalog = this.state.catalog();
    if (!catalog) return;
    const { ctx } = this;
    const fov = view.fovDeg;
    const maxMag = fov > 100 ? 1.2 : fov > 60 ? 2.0 : fov > 30 ? 2.8 : fov > 12 ? 4.0 : 6.0;
    const showBayer = fov < 30;
    ctx.font = `400 11px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const s of catalog.stars) {
      if (s.mag > maxMag) break;
      const text = s.name || (showBayer && s.bayer ? `${s.bayer} ${s.con}` : '');
      if (!text) continue;
      const v = mat3MulVec(eqToEnu, raDecToUnit(s.ra, s.dec));
      if (v.z < 0) continue;
      const p = project(v);
      if (!p || p.x < -40 || p.x > view.width + 40 || p.y < -20 || p.y > view.height + 20) continue;
      const w = ctx.measureText(text).width + 6;
      const box = placeLabel(this.placed, p.x + 9, p.y - 7, w, 14);
      if (!box) continue;
      ctx.fillStyle = s.name ? 'rgba(210, 222, 245, 0.62)' : TEXT_DIM;
      ctx.fillText(text, box.x + 3, box.y + 7);
    }
  }

  private drawCardinals(project: (v: Vec3) => { x: number; y: number } | null): void {
    const { ctx } = this;
    const dirs: [string, number][] = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    for (const [label, az] of dirs) {
      const p = project(altAzToVec(1.6, az));
      if (!p) continue;
      const major = label.length === 1;
      ctx.font = `${major ? '600 13px' : '500 10px'} ${FONT_DISPLAY}`;
      ctx.fillStyle = major ? TEXT_CARDINAL : TEXT_DIM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.save();
      ctx.letterSpacing = '0.12em';
      ctx.fillText(label, p.x, p.y);
      ctx.restore();
    }
  }

  private placeMarkers(basis: CameraBasis, params: StereographicParams, view: SkyViewport): void {
    const tgs = this.state.targets();
    const els = this.state.markerEls();
    for (let i = 0; i < tgs.length; i++) {
      const el = els[i];
      if (!el) continue;
      const p = projectStereo(toCam(tgs[i].v, basis), params);
      if (!p || p.x < -80 || p.x > view.width + 80 || p.y < -80 || p.y > view.height + 80) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.classList.toggle('below', tgs[i].v.z < 0);
      const sc = Math.max(0.8, Math.min(1.2, 70 / view.fovDeg));
      el.style.setProperty('--mscale', sc.toFixed(3));
    }
  }
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
