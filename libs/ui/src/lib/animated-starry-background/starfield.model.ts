/** A single ambient star painted on the star-field canvas (twinkles + drifts). */
export interface Star {
  /** Current x position in CSS pixels. */
  x: number;
  /** y position in CSS pixels. */
  y: number;
  /** Radius in CSS pixels. */
  r: number;
  /** Base brightness, 0–1, before the twinkle modulation. */
  base: number;
  /** Twinkle phase offset, so stars pulse out of sync. */
  phase: number;
  /** Twinkle speed multiplier. */
  speed: number;
  /** Horizontal drift per frame in CSS pixels. */
  drift: number;
  /** Resolved star colour (white, cyan or pink). */
  color: string;
}

/**
 * A node in a constellation — either a glowing "feature" sparkle-star or a dim
 * minor dot. Each node gently oscillates around its home position.
 */
export interface ConstellationNode {
  /** Rest position the node oscillates around. */
  homeX: number;
  /** Rest position the node oscillates around. */
  homeY: number;
  /** Oscillation amplitude in px. */
  ampX: number;
  /** Oscillation amplitude in px. */
  ampY: number;
  /** Oscillation phase offset. */
  phaseX: number;
  /** Oscillation phase offset. */
  phaseY: number;
  /** Current position, recomputed each frame from the oscillation. */
  x: number;
  /** Current position, recomputed each frame. */
  y: number;
  /** Feature stars carry an "r, g, b" glow tuple; dim minor dots are null. */
  glow: string | null;
  /** Feature stars drawn with a glowing ring outline (the pink ones). */
  ring: boolean;
  /** Pulse phase offset for the glow + sparkle. */
  pulsePhase: number;
  /** Pulse speed multiplier. */
  pulseSpeed: number;
  /** Base radius in CSS pixels. */
  radius: number;
}

/** A constellation: nodes plus the index pairs joined by lines, in one hue. */
export interface Constellation {
  /** The nodes that make up this cluster. */
  nodes: ConstellationNode[];
  /** Index pairs into `nodes` to connect with a faint line. */
  edges: ReadonlyArray<readonly [number, number]>;
  /** "r, g, b" tuple for this cluster's connecting lines. */
  line: string;
}
