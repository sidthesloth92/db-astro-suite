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
  open: "INFOGRAPHICS — Your photo, your data, one card.",
  details: "DETAILS — Name it. Wikipedia writes the rest.",
  integration: "INTEGRATION — Per filter, totalled on the card.",
  bortle: "BORTLE — The sky you shot under.",
  rig: "RIG PRESETS — Save your gear once. Reuse it.",
  themes: "29 THEMES — Social, celestial, infographic.",
  colour: "COLOUR — Match the accent to your image.",
  sizes: "ANY FORMAT — Feed, story or landscape.",
  caption: "CAPTION — Post text, written from your data.",
  solve: "PLATE SOLVE — Upload, solve, one click.",
  identified: "IDENTIFIED — Every catalogued object, labelled.",
  filter: "FILTER — By catalog, type and magnitude.",
  style: "STYLE — Restyle, drag or rename any label.",
  export: "EXPORT — JPEG, PNG or WebP, full size.",
} as const;

/** The id of a line in {@link CAPTIONS}. */
export type CaptionId = keyof typeof CAPTIONS;
