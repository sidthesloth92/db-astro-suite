/**
 * Phone orientation → where the back of the device points (for "point at the
 * sky" mode). Uses the W3C device-orientation angles (alpha, beta, gamma in
 * degrees, with alpha measured from north when absolute) and the screen
 * rotation, returning a compass heading and pitch of the −Z (back camera) axis.
 */
import { D2R, R2D } from './celestial.util';

/** Heading (° from north, eastward) and pitch (° above horizon) of the device's back axis. */
export interface DevicePointing {
  heading: number;
  pitch: number;
}

/**
 * Convert orientation angles to the back-camera pointing. `screenAngle` is the
 * screen rotation in degrees (0, 90, 180, 270) from `screen.orientation.angle`.
 */
export function orientationToPointing(alphaDeg: number, betaDeg: number, gammaDeg: number, screenAngle = 0): DevicePointing {
  const a = alphaDeg * D2R;
  const b = betaDeg * D2R;
  const g = gammaDeg * D2R;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  const cg = Math.cos(g);
  const sg = Math.sin(g);
  // Rotation matrix R = Rz(alpha) · Rx(beta) · Ry(gamma) (W3C), mapping device axes to
  // world axes where world x = east, y = north, z = up.
  // Device −Z axis (back of the phone) in world coordinates is the negated third column.
  const r13 = sa * sb * cg + ca * sg;
  const r23 = -ca * sb * cg + sa * sg;
  const r33 = cb * cg;
  const vx = -r13;
  const vy = -r23;
  const vz = -r33;
  // The W3C angles describe the device body, so the back axis does not depend on the
  // screen rotation; the parameter is accepted so callers can pass it uniformly.
  if (screenAngle !== 0 && !Number.isFinite(screenAngle)) {
    return { heading: 0, pitch: 0 };
  }
  const heading = (Math.atan2(vx, vy) * R2D + 360) % 360;
  const pitch = Math.asin(Math.max(-1, Math.min(1, vz))) * R2D;
  return { heading, pitch };
}
