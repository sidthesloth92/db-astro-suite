/** Discrete brand tint a starfield particle can take. */
export type StarColor = 'pink' | 'cyan' | 'white';

/** A single particle in the warp starfield simulation. */
export interface Star {
  /** Horizontal offset from centre (device pixels). */
  x: number;
  /** Vertical offset from centre (device pixels). */
  y: number;
  /** Current depth — decreases toward the viewer each frame. */
  z: number;
  /** Previous-frame depth, used to draw the warp streak. */
  pz: number;
  /** Brand tint marker, resolved to a concrete colour at draw time. */
  c: StarColor;
}

/** A transient shooting-star streak (warp mode only). */
export interface Shooter {
  /** Current x position (device pixels). */
  x: number;
  /** Current y position (device pixels). */
  y: number;
  /** Horizontal velocity. */
  vx: number;
  /** Vertical velocity. */
  vy: number;
  /** Remaining life in [0, 1]; the streak fades as this drops. */
  life: number;
}
