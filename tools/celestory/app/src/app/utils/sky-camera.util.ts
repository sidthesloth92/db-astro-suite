/**
 * Look-around camera for the planetarium: heading / pitch / FOV with
 * time-based easing toward targets, fling inertia after a drag, and
 * zoom-at-cursor that keeps the sky point under the pointer fixed.
 */
import { FOV_MAX, FOV_MIN } from '../models/sky.constants';
import type { CameraState, Vec3 } from '../models/sky.types';
import type { StereographicParams } from '../models/sky-projection.types';
import { camBasis, D2R, R2D, toCam } from './celestial.util';
import { projectStereo, radiansPerPixel, unprojectStereo } from './sky-projection.util';

/** Easing rate (1/s): higher snaps faster. */
const EASE_RATE = 10;
/** Inertia decay rate (1/s). */
const FLING_DECAY = 4.5;

export class SkyCamera {
  private velHeading = 0;
  private velPitch = 0;

  constructor(private readonly cam: CameraState) {}

  /** Current eased state (read-only view). */
  get state(): Readonly<CameraState> {
    return this.cam;
  }

  /** Advance easing + inertia by `dt` seconds. */
  update(dt: number): void {
    const c = this.cam;
    if (this.velHeading !== 0 || this.velPitch !== 0) {
      c.tHeading = (c.tHeading + this.velHeading * dt + 360) % 360;
      c.tPitch = Math.max(-89, Math.min(89, c.tPitch + this.velPitch * dt));
      const decay = Math.exp(-FLING_DECAY * dt);
      this.velHeading *= decay;
      this.velPitch *= decay;
      if (Math.abs(this.velHeading) < 0.05 && Math.abs(this.velPitch) < 0.05) {
        this.velHeading = 0;
        this.velPitch = 0;
      }
    }
    const k = 1 - Math.exp(-EASE_RATE * dt);
    const dh = ((c.tHeading - c.heading + 540) % 360) - 180;
    c.heading = (c.heading + dh * k + 360) % 360;
    c.pitch += (c.tPitch - c.pitch) * k;
    c.fov += (c.tFov - c.fov) * k;
  }

  /** Drag by a pointer delta in CSS pixels. */
  pan(dxPx: number, dyPx: number, params: StereographicParams): void {
    const c = this.cam;
    const degPerPx = radiansPerPixel(params) * R2D;
    const cosP = Math.max(0.25, Math.cos(c.tPitch * D2R));
    c.tHeading = (c.tHeading - (dxPx * degPerPx) / cosP + 360) % 360;
    c.tPitch = Math.max(-89, Math.min(89, c.tPitch + dyPx * degPerPx));
    this.velHeading = 0;
    this.velPitch = 0;
  }

  /** Release a drag with a pointer velocity (CSS px/s) to coast. */
  fling(vxPx: number, vyPx: number, params: StereographicParams): void {
    const degPerPx = radiansPerPixel(params) * R2D;
    const cosP = Math.max(0.25, Math.cos(this.cam.tPitch * D2R));
    this.velHeading = (-vxPx * degPerPx) / cosP;
    this.velPitch = vyPx * degPerPx;
  }

  /** Stop any inertia. */
  stop(): void {
    this.velHeading = 0;
    this.velPitch = 0;
  }

  /**
   * Zoom by a factor keeping the sky under `cursor` (CSS px) fixed. `params`
   * describes the current projection; `height` is the viewport height.
   */
  zoomAt(factor: number, cursor: { x: number; y: number } | null, params: StereographicParams, height: number): void {
    const c = this.cam;
    // Work entirely in target state: the eased FOV lags the target, and mixing the two
    // makes every wheel tick "correct" a phantom offset (the view slides sideways).
    const startParams: StereographicParams = { ...params, scale: height / 2 / (2 * Math.tan((c.tFov * D2R) / 4)) };
    const before = cursor ? this.enuAt(cursor, startParams, c.tHeading, c.tPitch) : null;
    c.tFov = Math.max(FOV_MIN, Math.min(FOV_MAX, c.tFov * factor));
    if (!before || !cursor) {
      return;
    }
    // Re-aim so `before` projects back onto the cursor (a few Newton-style passes).
    const nextParams: StereographicParams = { ...params, scale: height / 2 / (2 * Math.tan((c.tFov * D2R) / 4)) };
    for (let i = 0; i < 8; i++) {
      const basis = camBasis(c.tHeading, c.tPitch);
      const p = projectStereo(toCam(before, basis), nextParams);
      if (!p) {
        return;
      }
      const dx = p.x - cursor.x;
      const dy = p.y - cursor.y;
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        return;
      }
      const degPerPx = radiansPerPixel(nextParams) * R2D;
      const cosP = Math.max(0.25, Math.cos(c.tPitch * D2R));
      c.tHeading = (c.tHeading + (dx * degPerPx) / cosP + 360) % 360;
      c.tPitch = Math.max(-89, Math.min(89, c.tPitch - dy * degPerPx));
    }
  }

  /** Aim at an alt/az (degrees), optionally narrowing the FOV. */
  lookAt(altDeg: number, azDeg: number, fovDeg?: number): void {
    const c = this.cam;
    c.tHeading = (azDeg + 360) % 360;
    c.tPitch = Math.max(-89, Math.min(89, altDeg));
    if (fovDeg !== undefined) {
      c.tFov = Math.max(FOV_MIN, Math.min(FOV_MAX, fovDeg));
    }
    this.stop();
  }

  /** Snap targets instantly (no easing). */
  snap(): void {
    const c = this.cam;
    c.heading = c.tHeading;
    c.pitch = c.tPitch;
    c.fov = c.tFov;
  }

  /** ENU direction under a screen point for the given target orientation. */
  private enuAt(cursor: { x: number; y: number }, params: StereographicParams, headingDeg: number, pitchDeg: number): Vec3 {
    const cp = unprojectStereo(cursor.x, cursor.y, params);
    const b = camBasis(headingDeg, pitchDeg);
    return {
      x: b.right.x * cp.cx + b.up.x * cp.cy + b.fwd.x * cp.cz,
      y: b.right.y * cp.cx + b.up.y * cp.cy + b.fwd.y * cp.cz,
      z: b.right.z * cp.cx + b.up.z * cp.cy + b.fwd.z * cp.cz,
    };
  }
}
