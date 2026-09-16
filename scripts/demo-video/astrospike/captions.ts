/**
 * Every line that appears on screen, and the only place to change the wording.
 *
 * The beats reference these by id, so the capture records *which* line was
 * showing and when, never the words themselves. Editing the text here and
 * re-rendering is enough — there is no need to re-capture, which would
 * otherwise cost half an hour to fix a typo.
 *
 * Format: `KICKER — sentence`. The part before the dash renders as a small
 * cyan heading above the line. Keep the sentence under about 45 characters so
 * it never runs past two lines.
 */
export const CAPTIONS = {
  private: "PRIVATE — Your image never leaves the browser.",
  detected: "DETECTED — Stars found for you, automatically.",
  magnitude: "MAGNITUDE — How many stars get spikes.",
  length: "LENGTH — Scales every arm.",
  glow: "GLOW — A halo on the brightest stars.",
  brightness: "BRIGHTNESS — How hard they burn.",
  removeStars: "PER STAR — Click a star to remove it.",
  addStars: "ADD — Click again to bring one back.",
  tuneStar: "CUSTOMISE — Tune one star on its own.",
  arms6: "SIX ARMS — The JWST look, on any preset.",
  arms4: "FOUR ARMS — The classic spider-vane cross.",
  jwst: "PRESETS — JWST: the six-armed signature.",
  subtle: "SUBTLE — A faint accent that stays natural.",
  rotate: "ROTATE — Turn the whole pattern.",
  compareSpikes: "BEFORE & AFTER — Drag to see the difference.",
  wideField: "WIDE FIELD — Spikes are the wrong tool here.",
  diffusion: "DIFFUSION — No spikes. Just glow.",
  mwMagnitude: "REACH — How deep into the field it glows.",
  mwGlow: "GLOW — Halos in each star's own colour.",
  mwMist: "MIST — A haze through the brightest light.",
  mwBrightness: "BRIGHTNESS — How hard the halos burn.",
  compare: "COMPARE — Against the untouched original.",
  exportOptions: "EXPORT — PNG, JPEG, or the spikes alone.",
  exportShot: "SAVE — Full resolution, same as the source.",
} as const;

/** The id of a line in {@link CAPTIONS}. */
export type CaptionId = keyof typeof CAPTIONS;
