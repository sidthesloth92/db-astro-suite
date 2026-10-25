/**
 * CPU port of the sky shader's single-scattering integral (Nishita-style,
 * Rayleigh + Mie, spherical atmosphere). Used to derive the frame exposure
 * from the sky's zenith luminance and for unit tests of the calibration.
 */
import { SUN_INTENSITY } from '../models/sky-render.constants';
import type { SkyFrameInput, SkyLook } from '../models/sky-render.types';
import type { Vec3 } from '../models/sky.types';
import { D2R } from './celestial.util';

const R_EARTH = 6371e3;
const R_ATMO = 6471e3;
const BETA_R: [number, number, number] = [5.8e-6, 13.5e-6, 33.1e-6];
const BETA_M = 21e-6;
const H_R = 8000;
const H_M = 1200;
const MIE_G = 0.76;

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function raySphere(o: Vec3, d: Vec3, r: number): number {
  const b = dot(o, d);
  const c = dot(o, o) - r * r;
  const disc = b * b - c;
  return disc < 0 ? -1 : -b + Math.sqrt(disc);
}

function hitsEarth(o: Vec3, d: Vec3): boolean {
  const b = dot(o, d);
  if (b >= 0) return false;
  const c = dot(o, o) - R_EARTH * R_EARTH;
  return b * b - c > 0;
}

/** Scattered radiance (RGB, per unit light intensity) along `dir` for light from `light`. */
export function scatterRgb(dir: Vec3, light: Vec3, steps = 8, lightSteps = 4): [number, number, number] {
  const origin: Vec3 = { x: 0, y: 0, z: R_EARTH + 2 };
  let tmax = raySphere(origin, dir, R_ATMO);
  if (dir.z < 0) {
    const tg = raySphere(origin, dir, R_EARTH);
    if (tg > 0) tmax = Math.min(tmax, tg);
  }
  const seg = tmax / steps;
  const mu = dot(dir, light);
  const phaseR = (3 / (16 * Math.PI)) * (1 + mu * mu);
  const g2 = MIE_G * MIE_G;
  const phaseM = ((3 / (8 * Math.PI)) * ((1 - g2) * (1 + mu * mu))) / ((2 + g2) * Math.pow(1 + g2 - 2 * MIE_G * mu, 1.5));
  const sumR = [0, 0, 0];
  const sumM = [0, 0, 0];
  let odR = 0;
  let odM = 0;
  let t = seg * 0.5;
  for (let i = 0; i < steps; i++) {
    const p: Vec3 = { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
    const h = Math.hypot(p.x, p.y, p.z) - R_EARTH;
    const hr = Math.exp(-h / H_R) * seg;
    const hm = Math.exp(-h / H_M) * seg;
    odR += hr;
    odM += hm;
    if (!hitsEarth(p, light)) {
      const tl = raySphere(p, light, R_ATMO);
      const lseg = tl / lightSteps;
      let odlR = 0;
      let odlM = 0;
      let tt = lseg * 0.5;
      for (let j = 0; j < lightSteps; j++) {
        const hq = Math.hypot(p.x + light.x * tt, p.y + light.y * tt, p.z + light.z * tt) - R_EARTH;
        odlR += Math.exp(-hq / H_R) * lseg;
        odlM += Math.exp(-hq / H_M) * lseg;
        tt += lseg;
      }
      for (let c = 0; c < 3; c++) {
        const tau = BETA_R[c] * (odR + odlR) + BETA_M * 1.1 * (odM + odlM);
        const att = Math.exp(-tau);
        sumR[c] += att * hr;
        sumM[c] += att * hm;
      }
    }
    t += seg;
  }
  return [0, 1, 2].map((c) => sumR[c] * BETA_R[c] * phaseR + sumM[c] * BETA_M * phaseM) as [number, number, number];
}

/** Photometric luminance of an RGB radiance triple. */
export function luminance(rgb: [number, number, number]): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Residual twilight glow (cd/m²) from multiple scattering, which single
 * scattering cannot produce once the sun is more than ~10° down. Smoothly
 * fades to nothing by astronomical twilight.
 */
export function twilightGlow(sunAltDeg: number): number {
  if (sunAltDeg > -3) return 0;
  const g = 0.35 * Math.exp((sunAltDeg + 6) / 1.7);
  const fadeIn = Math.min(1, (-3 - sunAltDeg) / 3);
  return Math.min(3.5, g) * fadeIn;
}

/** Sunlit sky luminance at the zenith (cd/m²) for a sun altitude, plus twilight residual. */
export function zenithLuminance(sunAltDeg: number): number {
  const sun: Vec3 = { x: 0, y: Math.cos(sunAltDeg * D2R), z: Math.sin(sunAltDeg * D2R) };
  const single = luminance(scatterRgb({ x: 0, y: 0, z: 1 }, sun)) * SUN_INTENSITY;
  return single + twilightGlow(sunAltDeg) * 0.3;
}

/**
 * Exposed RGB light falling on the ground: hemispheric sky light from the Sun and
 * Moon (sampled at a few sky directions) plus airglow, times exposure and a
 * ground albedo. Used by the ground pass so terrain brightness follows the sky.
 */
export function groundLight(input: SkyFrameInput, moonIntensity: number, exposure: number, look: SkyLook): [number, number, number] {
  const dirs: Vec3[] = [
    { x: 0, y: 0, z: 1 },
    { x: 0.7, y: 0, z: 0.714 },
    { x: -0.7, y: 0, z: 0.714 },
    { x: 0, y: 0.7, z: 0.714 },
    { x: 0, y: -0.7, z: 0.714 },
  ];
  const acc = [0, 0, 0];
  for (const d of dirs) {
    const sun = scatterRgb(d, input.sunEnu, 4, 2);
    for (let c = 0; c < 3; c++) acc[c] += sun[c] * SUN_INTENSITY * look.sunGain;
    if (moonIntensity > 0 && input.moonEnu.z > 0) {
      const moon = scatterRgb(d, input.moonEnu, 4, 2);
      for (let c = 0; c < 3; c++) acc[c] += moon[c] * moonIntensity;
    }
  }
  const tw = twilightGlow(Math.asin(Math.max(-1, Math.min(1, input.sunEnu.z))) / D2R) * look.sunGain;
  const air = look.airglow;
  return [
    ((acc[0] / dirs.length + tw * 0.55 + air * 0.6) * exposure * 0.06),
    ((acc[1] / dirs.length + tw * 0.62 + air * 0.72) * exposure * 0.06),
    ((acc[2] / dirs.length + tw * 0.9 + air * 0.95) * exposure * 0.06),
  ];
}
