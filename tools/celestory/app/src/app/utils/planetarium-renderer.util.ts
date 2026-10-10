/**
 * Planetarium canvas renderer. Owns the requestAnimationFrame loop, camera
 * easing, DPR sizing, and all sky drawing (Milky Way clouds, dust lanes,
 * hydrogen-alpha regions, galaxies, field + named stars, constellation figures,
 * celestial equator, meridian, horizon, compass, alt/az graticule, zenith) plus
 * positioning the DOM target markers. Browser-only: instantiate inside
 * `afterNextRender`. Ported from the Celestory planetarium design.
 */
import { BRAND_CYAN, BRAND_PINK } from '../models/brand.constants';
import { FOV_MAX, FOV_MIN } from '../models/sky.constants';
import { CONSTELLATIONS, EXTRA_STARS } from '../models/sky-catalog.constants';
import type {
  CameraState,
  ProjectedSky,
  ScreenPoint,
  SkyLocation,
  SkyTarget,
  SkyVec,
} from '../models/sky.types';
import {
  altAzToVec,
  camBasis,
  camToScreen,
  D2R,
  generateSky,
  raDecToAltAz,
  raDecToVec,
  toCam,
} from './celestial.util';

/** Live state the renderer reads each frame, provided by the host component. */
export interface PlanetariumState {
  /** Current observer location. */
  location: () => SkyLocation;
  /** The instant the sky is drawn for. */
  now: () => Date;
  /** Whether the coordinate graticule is shown. */
  showGrid: () => boolean;
  /** User targets to plot (with current alt/az). */
  targets: () => SkyTarget[];
  /** The DOM marker elements, index-aligned to targets. */
  markerEls: () => (HTMLElement | null)[];
}

/** Convert a `#rrggbb` hex to an `rgba()` string at the given alpha. */
function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export class PlanetariumRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private size = { w: 1, h: 1, dpr: 1 };
  private readonly cam: CameraState;
  private readonly gen = generateSky();
  private sky: ProjectedSky | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly state: PlanetariumState,
    cam: CameraState,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }
    this.ctx = ctx;
    this.cam = cam;
  }

  /** Set the rendered viewport size + device-pixel-ratio backing store. */
  resize(width: number, height: number, dpr: number): void {
    this.size = { w: width, h: height, dpr };
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /** Recompute the projected backdrop + constellations for the observer + instant. */
  recomputeSky(): void {
    const loc = this.state.location();
    const now = this.state.now();
    const vecs = (list: ReadonlyArray<{ ra: number; dec: number; mag?: number; c?: [number, number, number]; ang?: number; a?: number; ang2?: number; rot?: number }>): SkyVec[] =>
      list.map((s) => ({
        v: raDecToVec(s.ra, s.dec, loc.lat, loc.lon, now),
        mag: s.mag,
        c: s.c,
        ang: s.ang,
        a: s.a,
        ang2: s.ang2,
        rot: s.rot,
      }));
    const cons = CONSTELLATIONS.map((con) => ({
      name: con.name,
      stars: con.stars.map((s) => ({ name: s[0], mag: s[3], v: raDecToVec(s[1], s[2], loc.lat, loc.lon, now) })),
      seg: con.seg,
    }));
    const loose = EXTRA_STARS.map((s) => ({ name: s[0], mag: s[3], v: raDecToVec(s[1], s[2], loc.lat, loc.lon, now) }));
    this.sky = {
      cons,
      loose,
      field: vecs(this.gen.field),
      milky: vecs(this.gen.milky),
      clouds: vecs(this.gen.clouds),
      galaxies: vecs(this.gen.galaxies),
      dust: vecs(this.gen.dust),
      ha: vecs(this.gen.ha),
    };
  }

  /** Start the render loop. */
  start(): void {
    if (!this.sky) {
      this.recomputeSky();
    }
    const loop = (): void => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Stop the render loop. */
  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** Pan the camera by a pointer delta (px). */
  pan(dx: number, dy: number): void {
    const k = this.cam.fov / this.size.h;
    this.cam.tHeading = (this.cam.tHeading - dx * k + 360) % 360;
    this.cam.tPitch = Math.max(-88, Math.min(88, this.cam.tPitch + dy * k));
  }

  /** Zoom by a multiplicative factor (e.g. wheel/pinch). */
  zoomBy(factor: number): void {
    this.cam.tFov = Math.max(FOV_MIN, Math.min(FOV_MAX, this.cam.tFov * factor));
  }

  /** Step zoom in (dir < 0) or out (dir >= 0). */
  zoomStep(dir: number): void {
    this.zoomBy(dir < 0 ? 0.82 : 1.22);
  }

  /** Reset the view: face north, pitch to the pole altitude (= latitude), zoom out. */
  reset(): void {
    const lat = this.state.location().lat;
    this.cam.tHeading = 0;
    this.cam.tPitch = Math.max(-80, Math.min(80, lat));
    this.cam.tFov = FOV_MAX;
  }

  /** Snap the camera to face a target (used by lookAt). */
  lookAt(alt: number, az: number): void {
    this.cam.tHeading = az;
    this.cam.tPitch = Math.max(-60, Math.min(80, alt));
    this.cam.tFov = Math.min(this.cam.tFov, 55);
  }

  private draw(): void {
    const sky = this.sky;
    if (!sky) {
      return;
    }
    const { ctx } = this;
    const { w: W, h: H, dpr } = this.size;
    const cam = this.cam;
    const loc = this.state.location();
    const now = this.state.now();

    const angLerp = (a: number, b: number, t: number): number => {
      const d = ((b - a + 540) % 360) - 180;
      return a + d * t;
    };
    cam.heading = (angLerp(cam.heading, cam.tHeading, 0.16) + 360) % 360;
    cam.pitch += (cam.tPitch - cam.pitch) * 0.16;
    cam.fov += (cam.tFov - cam.fov) * 0.16;
    const basis = camBasis(cam.heading, cam.pitch);
    const focal = H / 2 / Math.tan((cam.fov * D2R) / 2);
    const t = performance.now() * 0.001;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#0a0a18');
    bg.addColorStop(0.6, '#060610');
    bg.addColorStop(1, '#04040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const EPS = 0.02;
    const segScreen = (va: SkyVec['v'], vb: SkyVec['v']): [ScreenPoint, ScreenPoint] | null => {
      let a = toCam(va, basis);
      let b = toCam(vb, basis);
      if (a.cz <= EPS && b.cz <= EPS) {
        return null;
      }
      if (a.cz <= EPS) {
        const k = (EPS - a.cz) / (b.cz - a.cz);
        a = { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, cz: EPS };
      } else if (b.cz <= EPS) {
        const k = (EPS - b.cz) / (a.cz - b.cz);
        b = { cx: b.cx + (a.cx - b.cx) * k, cy: b.cy + (a.cy - b.cy) * k, cz: EPS };
      }
      return [camToScreen(a, focal, W, H), camToScreen(b, focal, W, H)];
    };
    const vecAt = (altDeg: number, azDeg: number): SkyVec['v'] => altAzToVec(altDeg, azDeg);
    const drawCircle = (points: SkyVec['v'][], style: string, width: number, dash?: number[]): void => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      for (let i = 0; i < points.length - 1; i++) {
        const sc = segScreen(points[i], points[i + 1]);
        if (!sc) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(sc[0].x, sc[0].y);
        ctx.lineTo(sc[1].x, sc[1].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };

    // celestial equator (dec=0) — brand pink
    const eqPts: SkyVec['v'][] = [];
    for (let ra = 0; ra <= 360; ra += 4) {
      const aa = raDecToAltAz(ra, 0, loc.lat, loc.lon, now);
      eqPts.push(vecAt(aa.alt, aa.az));
    }
    drawCircle(eqPts, hexA(BRAND_PINK, 0.34), 1.2, [5, 6]);

    // meridian (az 0 & 180)
    const merA: SkyVec['v'][] = [];
    const merB: SkyVec['v'][] = [];
    for (let al = -88; al <= 88; al += 4) {
      merA.push(vecAt(al, 0));
      merB.push(vecAt(al, 180));
    }
    drawCircle(merA, 'rgba(120,150,210,0.22)', 1, [2, 7]);
    drawCircle(merB, 'rgba(120,150,210,0.22)', 1, [2, 7]);

    // warm diffuse star clouds (galactic band) — additive
    ctx.globalCompositeOperation = 'lighter';
    for (const cl of sky.clouds) {
      const c = toCam(cl.v, basis);
      if (c.cz <= EPS) continue;
      const p = camToScreen(c, focal, W, H);
      const rr = Math.max(10, focal * (cl.ang ?? 0));
      if (p.x < -rr || p.x > W + rr || p.y < -rr || p.y > H + rr) continue;
      const col = cl.c || [232, 222, 200];
      const al = (cl.a ?? 0) * 0.4 * (cl.v.z < 0 ? 0.6 : 1) * Math.min(1, c.cz + 0.25);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${al.toFixed(3)})`);
      g.addColorStop(0.55, `rgba(${col[0]},${col[1]},${col[2]},${(al * 0.4).toFixed(3)})`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, 6.283);
      ctx.fill();
    }
    // dark dust lanes (Great Rift)
    ctx.globalCompositeOperation = 'source-over';
    for (const d of sky.dust) {
      const c = toCam(d.v, basis);
      if (c.cz <= EPS) continue;
      const p = camToScreen(c, focal, W, H);
      const rr = Math.max(8, focal * (d.ang ?? 0));
      if (p.x < -rr || p.x > W + rr || p.y < -rr || p.y > H + rr) continue;
      const al = (d.a ?? 0) * (d.v.z < 0 ? 0.6 : 1) * Math.min(1, c.cz + 0.2);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, `rgba(5,4,10,${al.toFixed(3)})`);
      g.addColorStop(1, 'rgba(5,4,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, 6.283);
      ctx.fill();
    }
    // hydrogen-alpha regions — additive deep red
    ctx.globalCompositeOperation = 'lighter';
    for (const h of sky.ha) {
      const c = toCam(h.v, basis);
      if (c.cz <= EPS) continue;
      const below = h.v.z < 0;
      const p = camToScreen(c, focal, W, H);
      const rr = Math.max(7, focal * (h.ang ?? 0));
      if (p.x < -rr || p.x > W + rr || p.y < -rr || p.y > H + rr) continue;
      const al = (below ? (h.a ?? 0) * 0.5 : (h.a ?? 0)) * 0.5 * Math.min(1, c.cz + 0.25);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, `rgba(255,72,98,${al.toFixed(3)})`);
      g.addColorStop(0.5, `rgba(228,40,76,${(al * 0.5).toFixed(3)})`);
      g.addColorStop(1, 'rgba(228,40,76,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, 6.283);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // galaxy / Magellanic smudges
    for (const gx of sky.galaxies) {
      const c = toCam(gx.v, basis);
      if (c.cz <= EPS) continue;
      const p = camToScreen(c, focal, W, H);
      const rr = Math.max(7, focal * (gx.ang ?? 0));
      if (p.x < -rr || p.x > W + rr || p.y < -rr || p.y > H + rr) continue;
      const below = gx.v.z < 0;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(gx.rot || 0);
      ctx.scale(1, (gx.ang2 || (gx.ang ?? 0) * 0.5) / (gx.ang ?? 1));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
      const al = below ? 0.04 : (gx.a ?? 0);
      g.addColorStop(0, `rgba(226,232,255,${al.toFixed(3)})`);
      g.addColorStop(0.5, `rgba(200,212,250,${(al * 0.45).toFixed(3)})`);
      g.addColorStop(1, 'rgba(200,212,250,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
    // dense faint field + Milky Way stars (fast tiny marks)
    const drawField = (list: SkyVec[]): void => {
      for (const st of list) {
        const c = toCam(st.v, basis);
        if (c.cz <= EPS) continue;
        const p = camToScreen(c, focal, W, H);
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
        const below = st.v.z < 0;
        const mag = st.mag ?? 5;
        const sz = Math.max(0.5, 2.3 - mag * 0.32);
        let al = (below ? 0.16 : 0.92) * Math.max(0.15, 1.15 - mag * 0.13);
        if (mag > 5.4) al *= 0.8;
        const col = st.c || [232, 238, 255];
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${al.toFixed(2)})`;
        if (sz < 1.1) {
          ctx.fillRect(p.x, p.y, 1, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz, 0, 6.283);
          ctx.fill();
        }
      }
    };
    drawField(sky.milky);
    drawField(sky.field);

    // constellation figures
    ctx.lineWidth = 1.1;
    ctx.setLineDash([]);
    for (const con of sky.cons) {
      for (const pair of con.seg) {
        const sa = con.stars[pair[0]];
        const sb = con.stars[pair[1]];
        if (!sa || !sb) continue;
        const below = sa.v.z < 0 && sb.v.z < 0;
        const sc = segScreen(sa.v, sb.v);
        if (!sc) continue;
        ctx.strokeStyle = below ? 'rgba(120,130,160,0.10)' : 'rgba(120,200,230,0.26)';
        ctx.beginPath();
        ctx.moveTo(sc[0].x, sc[0].y);
        ctx.lineTo(sc[1].x, sc[1].y);
        ctx.stroke();
      }
    }

    // stars (with twinkle + labels for the brightest)
    const drawStar = (st: { name: string; mag: number; v: SkyVec['v'] }): void => {
      const c = toCam(st.v, basis);
      if (c.cz <= EPS) return;
      const p = camToScreen(c, focal, W, H);
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) return;
      const below = st.v.z < 0;
      const r = Math.max(0.5, 2.7 - st.mag * 0.42);
      const tw = 0.78 + 0.22 * Math.sin(t * 1.6 + st.v.x * 9 + st.v.y * 7);
      const alpha = (below ? 0.22 : 0.95) * tw;
      if (r > 1.6 && !below) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.4);
        g.addColorStop(0, `rgba(220,232,255,${(0.5 * tw).toFixed(2)})`);
        g.addColorStop(1, 'rgba(220,232,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.4, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = below ? `rgba(150,160,185,${alpha.toFixed(2)})` : `rgba(244,248,255,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.283);
      ctx.fill();
      if (st.mag < 1.2 && !below) {
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(190,205,235,0.55)';
        ctx.fillText(st.name, p.x + r + 4, p.y + 3);
      }
    };
    for (const con of sky.cons) {
      for (const st of con.stars) drawStar(st);
    }
    for (const st of sky.loose) drawStar(st);

    // horizon (alt=0) — brand cyan, bright + soft glow
    const horiz: SkyVec['v'][] = [];
    for (let az = 0; az <= 360; az += 3) horiz.push(vecAt(0, az));
    drawCircle(horiz, hexA(BRAND_CYAN, 0.85), 2, []);
    drawCircle(horiz, hexA(BRAND_CYAN, 0.18), 7, []);

    // compass + cardinal labels
    const dirs: [string, number][] = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    for (const d of dirs) {
      const c = toCam(vecAt(0, d[1]), basis);
      if (c.cz <= EPS) continue;
      const p = camToScreen(c, focal, W, H);
      const major = d[0].length === 1;
      ctx.font = `${major ? '700 15px' : '600 11px'} "Orbitron","Outfit",sans-serif`;
      ctx.fillStyle = major ? hexA(BRAND_CYAN, 0.95) : hexA(BRAND_CYAN, 0.5);
      ctx.textAlign = 'center';
      ctx.fillText(d[0], p.x, p.y - 9);
      ctx.fillStyle = hexA(BRAND_CYAN, 0.8);
      ctx.beginPath();
      ctx.arc(p.x, p.y, major ? 3 : 1.8, 0, 6.283);
      ctx.fill();
      ctx.textAlign = 'left';
    }

    // alt-azimuth graticule
    if (this.state.showGrid()) {
      for (let az = 0; az < 360; az += 30) {
        const pts: SkyVec['v'][] = [];
        for (let al = -86; al <= 86; al += 3) pts.push(vecAt(al, az));
        const major = az % 90 === 0;
        drawCircle(pts, major ? 'rgba(130,190,245,0.7)' : 'rgba(130,190,245,0.42)', major ? 2.4 : 1.8, []);
        const lc = toCam(vecAt(6, az), basis);
        if (lc.cz > EPS) {
          const lp = camToScreen(lc, focal, W, H);
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(150,196,240,0.5)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${az}°`, lp.x, lp.y);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }
      for (const al of [-60, -30, 30, 60]) {
        const pts: SkyVec['v'][] = [];
        for (let az = 0; az <= 360; az += 4) pts.push(vecAt(al, az));
        drawCircle(pts, al < 0 ? 'rgba(130,190,245,0.3)' : 'rgba(130,190,245,0.5)', 1.8, al < 0 ? [4, 7] : []);
        const lc = toCam(vecAt(al, 0), basis);
        if (lc.cz > EPS) {
          const lp = camToScreen(lc, focal, W, H);
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(150,196,240,0.55)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${al}°`, lp.x, lp.y);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }
    // zenith marker
    const zc = toCam(vecAt(89.9, 0), basis);
    if (zc.cz > EPS) {
      const zp = camToScreen(zc, focal, W, H);
      ctx.strokeStyle = 'rgba(150,160,200,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(zp.x, zp.y, 5, 0, 6.283);
      ctx.moveTo(zp.x - 9, zp.y);
      ctx.lineTo(zp.x + 9, zp.y);
      ctx.moveTo(zp.x, zp.y - 9);
      ctx.lineTo(zp.x, zp.y + 9);
      ctx.stroke();
    }

    // position DOM markers
    const tgs = this.state.targets();
    const els = this.state.markerEls();
    for (let i = 0; i < tgs.length; i++) {
      const el = els[i];
      if (!el) continue;
      const c = toCam(tgs[i].v, basis);
      if (c.cz <= EPS) {
        el.style.display = 'none';
        continue;
      }
      const p = camToScreen(c, focal, W, H);
      if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.classList.toggle('below', tgs[i].v.z < 0);
      const sc = Math.max(0.7, Math.min(1.25, 72 / cam.fov));
      el.style.setProperty('--mscale', sc.toFixed(3));
    }
  }
}
