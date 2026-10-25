import type { Vec3 } from './sky.types';

/** One shooting star in flight. */
export interface Meteor {
  /** Start of the path (ENU unit vector). */
  from: Vec3;
  /** End of the path (ENU unit vector). */
  to: Vec3;
  /** Time (seconds, renderer clock) it appeared. */
  t0: number;
  /** Total flight time in seconds. */
  duration: number;
  /** Peak brightness 0..1 (controls width and glow). */
  brightness: number;
  /** Warm (0) … cool (1) colour. */
  hue: number;
}

/** Source of randomness for the meteor simulation (injectable for tests). */
export type MeteorRandom = () => number;
