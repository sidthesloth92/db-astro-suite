/**
 * The control values the editor remembers on entering the Glow preset, so
 * that leaving it for a spike preset restores exactly the look that preset
 * had before the detour. Entering the mode zeroes Length and seeds the Glow
 * amount; Brightness is remembered too because the mode invites the user to
 * push it while the halos are the only thing on screen.
 */
export interface GlowModeSnapshot {
  /** Length control value before the mode zeroed it. */
  length: number;
  /** Glow amount (the `diffusion` control key) before the mode seeded it. */
  diffusion: number;
  /** Brightness control value before the mode. */
  brightness: number;
}
