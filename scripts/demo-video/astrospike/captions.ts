/**
 * Every line that appears on screen, and the only place to change the wording.
 *
 * The beats say one id per control they drive; {@link CAPTION_FOR} groups those
 * into the lines the video shows, and consecutive beats under one line share a
 * single caption. The capture records which id was showing and when, never the
 * words, so editing here and re-rendering is enough — no re-capture, which
 * would otherwise cost half an hour to fix a typo.
 *
 * Format: `KICKER` then the separator then the sentence. The part before the
 * separator renders as a small cyan heading above the line; the separator
 * itself is never drawn. Keep dashes out of the sentence: the product owner
 * does not want them on screen.
 */
export const CAPTIONS = {
  chooseImage:
    "CHOOSE AN IMAGE — Choose your image and watch the spikes appear automatically.",
  adjust:
    "ADJUST TO YOUR LIKING — Make the look your own: adjust how many stars get spikes, their length, glow and brightness.",
  whichStars:
    "CHOOSE WHICH STARS SHINE — Click a star to remove its spikes. Click again to bring them back.",
  customizeStar:
    "CUSTOMIZE EACH STAR — Give individual stars a personal touch with their own settings.",
  shapeSpikes:
    "SHAPE YOUR SPIKES — Find your favourite look: rotate the spikes or switch between four and six arms.",
  seeDifference: "SEE THE DIFFERENCE — Drag the slider to see your transformation.",
  presets: "EXPLORE THE PRESETS — Explore presets, from bold JWST-inspired spikes to subtle accents.",
  exportImage: "EXPORT YOUR IMAGE — Save as PNG, JPEG or just the spikes.",
  diffusionIntro:
    "DIFFUSION FILTER EFFECT — Have a Milky Way image? Now you can add the diffusion filter effect.",
  refineGlow: "REFINE YOUR GLOW — Adjust its reach, colour, mist and brightness to suit your image.",
  compareOriginal: "COMPARE WITH THE ORIGINAL — See how your edit compares with the original.",
  saveCreation: "SAVE YOUR CREATION — Full resolution, same as the source.",
} as const;

/**
 * Which caption each beat's said id belongs to.
 *
 * Several beats share a line: the four spike sliders are one "adjust these"
 * caption, removing and restoring a star is one, and the four Diffusion
 * sliders are one. The beats still say their own id so the capture keeps a
 * precise record of what was on screen when.
 */
export const CAPTION_FOR = {
  private: "chooseImage",
  detected: "chooseImage",
  magnitude: "adjust",
  length: "adjust",
  glow: "adjust",
  brightness: "adjust",
  removeStars: "whichStars",
  addStars: "whichStars",
  tuneStar: "customizeStar",
  rotate: "shapeSpikes",
  arms6: "shapeSpikes",
  arms4: "shapeSpikes",
  compareSpikes: "seeDifference",
  jwst: "presets",
  subtle: "presets",
  exportOptions: "exportImage",
  wideField: "diffusionIntro",
  diffusion: "diffusionIntro",
  mwMagnitude: "refineGlow",
  mwGlow: "refineGlow",
  mwMist: "refineGlow",
  mwBrightness: "refineGlow",
  compare: "compareOriginal",
  exportShot: "saveCreation",
} as const satisfies Record<string, keyof typeof CAPTIONS>;

/** The id a beat says; the caption it lands in comes from {@link CAPTION_FOR}. */
export type CaptionId = keyof typeof CAPTION_FOR;
