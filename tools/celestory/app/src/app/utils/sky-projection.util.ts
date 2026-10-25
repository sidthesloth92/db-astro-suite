/**
 * Stereographic sky projection shared by the WebGL sky, the 2D overlay and the
 * DOM marker placement. Stereographic is conformal: stars stay round and wide
 * fields (up to ~150°) do not stretch at the edges the way a perspective
 * (gnomonic) projection does.
 *
 * Camera space: `cx` right, `cy` up, `cz` forward (unit vector). Plane coords
 * are `X = 2·cx / (1 + cz)`, `Y = 2·cy / (1 + cz)`, i.e. projection from the
 * antipode of the view axis onto the tangent plane at the view axis.
 */
import type { CamPoint, ScreenPoint } from '../models/sky.types';
import type { SkyViewport, StereographicParams } from '../models/sky-projection.types';
import { D2R } from './celestial.util';

/** Points with `cz` at or below this are behind the usable hemisphere and are culled. */
export const STEREO_MIN_CZ = -0.85;

/** Derive projection parameters so the vertical FOV spans the viewport height. */
export function stereographicParams(vp: SkyViewport): StereographicParams {
  const halfFov = (vp.fovDeg * D2R) / 2;
  // A direction at angle θ from the axis lands at plane radius 2·tan(θ/2).
  const scale = vp.height / 2 / (2 * Math.tan(halfFov / 2));
  return { cx: vp.width / 2, cy: vp.height / 2, scale };
}

/** Project a camera-space unit vector to screen pixels, or null when culled. */
export function projectStereo(c: CamPoint, p: StereographicParams): ScreenPoint | null {
  if (c.cz <= STEREO_MIN_CZ) {
    return null;
  }
  const k = 2 / (1 + c.cz);
  return { x: p.cx + p.scale * k * c.cx, y: p.cy - p.scale * k * c.cy };
}

/** Inverse: screen pixels → camera-space unit vector (always defined). */
export function unprojectStereo(x: number, y: number, p: StereographicParams): CamPoint {
  const X = (x - p.cx) / p.scale;
  const Y = (p.cy - y) / p.scale;
  const r2 = X * X + Y * Y;
  const cz = (4 - r2) / (4 + r2);
  const h = (1 + cz) / 2;
  return { cx: X * h, cy: Y * h, cz };
}

/** Radians of sky per screen pixel at the view centre (for pan speed). */
export function radiansPerPixel(p: StereographicParams): number {
  return 1 / p.scale;
}
