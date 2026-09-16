/**
 * Every line that appears on screen, and the only place to change the wording.
 *
 * The beats say one id per control they drive; {@link CAPTION_FOR} groups those
 * into the lines the video shows, and consecutive beats under one line share a
 * single caption. The capture records which id was showing and when, never the
 * words, so editing here and re-rendering is enough, with no re-capture, which
 * would otherwise cost half an hour to fix a typo.
 *
 * Format: `KICKER` then the separator then the sentence. The part before the
 * separator renders as a small cyan heading above the line; the separator
 * itself is never drawn. Keep dashes out of the sentence: the product owner
 * does not want them on screen.
 */
export const CAPTIONS = {
  createPost: "CREATE YOUR POST — Choose your theme, layout and dimensions.",
  objectInfo:
    "AUTO-FETCH OBJECT INFO — Enter your target's name and let Wikipedia fill in the background.",
  sessionDetails:
    "ADD YOUR SESSION DETAILS — Include your filters, exposure times and sky conditions to tell the story of your night.",
  saveSetup: "SAVE YOUR SETUP — Save your gear once and reuse it on every card.",
  findStyle:
    "FIND YOUR STYLE — Explore 29 themes to find a look that suits your image, from social layouts to detailed infographics.",
  readyToShare:
    "MAKE IT READY TO SHARE — Choose a feed, story or landscape format, with a caption generated from your image details.",
  discover:
    "DISCOVER WHAT'S IN YOUR IMAGE — Plate solve your image to identify and label catalogued objects with a click.",
  customizeLabels:
    "CUSTOMIZE YOUR LABELS — Choose which objects to label by catalog, type or magnitude. Change their style, move them around or give them your own names.",
  saveAndShare: "SAVE AND SHARE — Export your finished card as JPEG, PNG or WebP at full size.",
} as const;

/**
 * Which caption each id a beat says belongs to.
 *
 * The beats stay at one id per thing they demonstrate, which is the right grain
 * for the capture, while the video shows fewer, longer lines: the integration
 * table and the Bortle reading are one thought, so are the sizes and the
 * generated caption, the solve and its labelled result, and filtering labels
 * and restyling them. Grouping here rather than in the beats keeps the
 * capture's precise record of what was on screen when.
 */
export const CAPTION_FOR = {
  open: "createPost",
  details: "objectInfo",
  integration: "sessionDetails",
  bortle: "sessionDetails",
  colour: "createPost",
  rig: "saveSetup",
  themes: "findStyle",
  sizes: "readyToShare",
  caption: "readyToShare",
  solve: "discover",
  identified: "discover",
  filter: "customizeLabels",
  style: "customizeLabels",
  export: "saveAndShare",
} as const satisfies Record<string, keyof typeof CAPTIONS>;

/** The id a beat says; the caption it lands in comes from {@link CAPTION_FOR}. */
export type CaptionId = keyof typeof CAPTION_FOR;
