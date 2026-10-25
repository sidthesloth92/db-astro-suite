/**
 * Occasional shooting stars: spawn timing, geometry (a short great-circle arc
 * above the horizon) and the per-frame streak drawing on the 2D overlay.
 * Meteors live in the horizon frame (they are atmospheric), so they do not
 * rotate with the sky.
 */
import {
  METEOR_ALT_DEG,
  METEOR_DURATION_S,
  METEOR_LENGTH_DEG,
  METEOR_MAX_ACTIVE,
  METEOR_MEAN_INTERVAL_S,
  METEOR_MIN_GAP_S,
  METEOR_TRAIL_FRACTION,
} from '../models/meteor.constants';
import type { Meteor, MeteorRandom } from '../models/meteor.types';
import type { Vec3 } from '../models/sky.types';
import { altAzToVec, D2R } from './celestial.util';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Spherical interpolation between two unit vectors. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const d = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(d);
  if (omega < 1e-6) {
    return a;
  }
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  return { x: wa * a.x + wb * b.x, y: wa * a.y + wb * b.y, z: wa * a.z + wb * b.z };
}

/** Build a random meteor whose path midpoint sits above the horizon (or at `at`, for tooling). */
export function makeMeteor(now: number, rng: MeteorRandom, at?: { altDeg: number; azDeg: number }): Meteor {
  const alt = at ? at.altDeg : lerp(METEOR_ALT_DEG[0], METEOR_ALT_DEG[1], rng());
  const az = at ? at.azDeg : rng() * 360;
  const mid = altAzToVec(alt, az);
  // Direction of travel: random bearing in the local tangent plane, biased downward
  // (meteors seen from the ground mostly appear to fall).
  const east: Vec3 = { x: Math.cos(az * D2R), y: -Math.sin(az * D2R), z: 0 };
  const north: Vec3 = { x: mid.y * east.z - mid.z * east.y, y: mid.z * east.x - mid.x * east.z, z: mid.x * east.y - mid.y * east.x };
  const bearing = (rng() - 0.5) * Math.PI * 1.6 + Math.PI; // around "down"
  const dir: Vec3 = {
    x: east.x * Math.sin(bearing) + north.x * Math.cos(bearing),
    y: east.y * Math.sin(bearing) + north.y * Math.cos(bearing),
    z: east.z * Math.sin(bearing) + north.z * Math.cos(bearing),
  };
  const halfLen = (lerp(METEOR_LENGTH_DEG[0], METEOR_LENGTH_DEG[1], rng()) / 2) * D2R;
  const endpoint = (sign: number): Vec3 => {
    const c = Math.cos(halfLen);
    const s = Math.sin(halfLen) * sign;
    const v = { x: mid.x * c + dir.x * s, y: mid.y * c + dir.y * s, z: mid.z * c + dir.z * s };
    const l = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  };
  return {
    from: endpoint(-1),
    to: endpoint(1),
    t0: now,
    duration: lerp(METEOR_DURATION_S[0], METEOR_DURATION_S[1], rng()),
    brightness: 0.45 + 0.55 * rng() * rng(),
    hue: rng(),
  };
}

/** Spawn scheduler + meteors in flight. */
export class MeteorSimulation {
  private active: Meteor[] = [];
  private nextAt: number;

  constructor(
    private readonly rng: MeteorRandom = Math.random,
    now = 0,
  ) {
    this.nextAt = now + this.gap();
  }

  /** Meteors currently in flight (oldest first). */
  get current(): readonly Meteor[] {
    return this.active;
  }

  /** Advance to time `now` (seconds): expire finished meteors, spawn the next when due. */
  update(now: number): void {
    this.active = this.active.filter((m) => now - m.t0 <= m.duration);
    if (now >= this.nextAt) {
      if (this.active.length < METEOR_MAX_ACTIVE) {
        this.active = [...this.active, makeMeteor(now, this.rng)];
      }
      this.nextAt = now + this.gap();
    }
  }

  /** Force one now, optionally through a given alt/az (dev tooling / tests). */
  trigger(now: number, at?: { altDeg: number; azDeg: number }): void {
    this.active = [...this.active.slice(-(METEOR_MAX_ACTIVE - 1)), makeMeteor(now, this.rng, at)];
  }

  private gap(): number {
    // Exponential inter-arrival with a floor so two never follow immediately.
    const u = Math.max(1e-6, this.rng());
    return METEOR_MIN_GAP_S + -Math.log(u) * (METEOR_MEAN_INTERVAL_S - METEOR_MIN_GAP_S);
  }
}

/**
 * Draw the active meteor as a glowing streak: a bright head and a trail that
 * fades along `METEOR_TRAIL_FRACTION` of the path, with an overall fade-out.
 */
export function drawMeteor(
  ctx: CanvasRenderingContext2D,
  meteor: Meteor,
  now: number,
  project: (v: Vec3) => { x: number; y: number } | null,
): void {
  const f = (now - meteor.t0) / meteor.duration;
  if (f < 0 || f > 1) {
    return;
  }
  const fade = Math.min(1, f / 0.12) * (1 - Math.max(0, (f - 0.6) / 0.4) ** 1.5);
  const headT = f;
  const tailT = Math.max(0, f - METEOR_TRAIL_FRACTION);
  const steps = 14;
  const pts: { x: number; y: number; k: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const t = tailT + (headT - tailT) * k;
    const p = project(slerp(meteor.from, meteor.to, t));
    if (!p) {
      return;
    }
    pts.push({ ...p, k });
  }
  const head = pts[pts.length - 1];
  const warm = [255, 236, 200];
  const cool = [200, 222, 255];
  const c = warm.map((w, i) => Math.round(w + (cool[i] - w) * meteor.hue));
  const b = meteor.brightness * fade;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const p = pts[i];
    const w = 0.8 + 2.2 * p.k * b;
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.85 * b * p.k * p.k).toFixed(3)})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  const r = 4 + 9 * b;
  const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r);
  g.addColorStop(0, `rgba(255,255,255,${(0.9 * b).toFixed(3)})`);
  g.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${(0.5 * b).toFixed(3)})`);
  g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
