import path from "node:path";

/** Port the capture's own Astrogram dev server listens on. */
export const APP_PORT = 4211;

/** Where the studio is served. */
export const APP_URL = `http://localhost:${APP_PORT}/astrogram/`;

/** Repository root. */
export const REPO_ROOT = path.resolve(__dirname, "../../../..");

/** The sample photograph the app opens with, uploaded again for the solve. */
export const ROSETTE_IMAGE = path.join(REPO_ROOT, "tools/astrogram/public/assets/img/rosette.jpg");

/** The recorded solve response the capture replays (see `record-solve.mjs`). */
export const SOLVE_FIXTURE = path.resolve(__dirname, "../fixtures/rosette-solve.json");

/**
 * A hand-written stand-in used until a real solve has been recorded.
 *
 * Its WCS only approximates the Rosette frame and its field stars are invented,
 * so labels will not sit exactly on the objects. The render stamps the stellar
 * map half "PLACEHOLDER SOLVE" whenever this file was used.
 */
export const SOLVE_PLACEHOLDER = path.resolve(__dirname, "../fixtures/rosette-solve.placeholder.json");

/** localStorage key the app keeps rig presets under. */
export const PRESETS_STORAGE_KEY = "astrogram_equipment_presets";

/** localStorage key the app keeps the Astrosolve access key under. */
export const ACCESS_KEY_STORAGE_KEY = "astrosolve_access_key";

/**
 * Stands in for an access key.
 *
 * The app refuses to send a solve without one and opens its key modal instead,
 * but the request never reaches a server here — it is answered from the
 * fixture — so any value gets the flow past that check.
 */
export const PLACEHOLDER_ACCESS_KEY = "demo-capture";

/** The rig the video switches to: the one the app ships as its sample. */
export const HOME_RIG = "Home observatory";

/** The rig the video opens with, so switching presets visibly changes the card. */
export const TRAVEL_RIG = "Travel rig";

/** Rig presets seeded into storage before the app boots. */
export const SEEDED_PRESETS = {
  [TRAVEL_RIG]: {
    equipment: [
      { icon: "🔭", label: "Telescope", value: "William Optics RedCat 51" },
      { icon: "📷", label: "Camera", value: "ZWO ASI2600MC Pro" },
      { icon: "🏗️", label: "Mount", value: "ZWO AM3" },
      { icon: "🌈", label: "Filters", value: "Optolong L-eXtreme" },
    ],
    software: [
      { icon: "💻", label: "Computer", name: "ASIAIR" },
      { icon: "⚙️", label: "Editing", name: "Siril" },
    ],
  },
  [HOME_RIG]: {
    equipment: [
      { icon: "🔭", label: "Telescope", value: "Askar 103 APO" },
      { icon: "📷", label: "Camera", value: "ZWO ASI2600MM Air" },
      { icon: "🏗️", label: "Mount", value: "Sky-Watcher Wave 150i" },
      { icon: "🎯", label: "Guide Scope and Camera", value: "SVBony SV106 60mm+ ASI120MM Mini" },
      { icon: "🌈", label: "Filters", value: "Astronomik MaxFR 6nm SHO" },
    ],
    software: [
      { icon: "💻", label: "Computer", name: "ASIAIR" },
      { icon: "⚙️", label: "Editing", name: "PixInsight + Photoshop" },
      { icon: "✨", label: "Processing", name: "Seti Astro Suite" },
    ],
  },
} as const;
