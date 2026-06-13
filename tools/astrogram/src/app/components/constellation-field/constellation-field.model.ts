/** A drifting background star in the living constellation field. */
export interface FieldPoint {
  /** Current position (px, CSS space). */
  x: number;
  y: number;
  /** Velocity per ~16ms (px). */
  vx: number;
  vy: number;
  /** Core radius (px). */
  r: number;
  /** Twinkle phase (radians). */
  tw: number;
  /** Twinkle speed multiplier. */
  tws: number;
  /** Parallax depth, 0.3–1 (nearer = faster, brighter). */
  depth: number;
}

/** A tagged anchor star — radial glow + 4-point sparkle + pulsing reticle. */
export interface TaggedStar {
  /** Current position (px, CSS space). */
  x: number;
  y: number;
  /** Velocity per ~16ms (px). */
  vx: number;
  vy: number;
  /** Reticle pulse phase (radians). */
  pulse: number;
  /** Reticle / glow colour (hex). */
  color: string;
}
