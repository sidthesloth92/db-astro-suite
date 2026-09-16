import { defineConfig } from "@playwright/test";
import path from "node:path";

import { FORMATS, currentFormat } from "../engine/capture/formats";

/** Which cut is being captured. */
const FORMAT = currentFormat();

/**
 * Capture configuration for the AstroSpike demo video.
 *
 * Deliberately separate from the repo's `playwright.config.ts`: this run is not
 * a test, it starts only the astrospike dev server rather than all five, and it
 * needs a viewport the test suite must never inherit.
 *
 * `hasTouch` is left off on purpose even for the phone layout: the shell is
 * chosen by width alone, and mouse events keep hover, double-click and drag
 * behaving predictably.
 */
export default defineConfig({
  testDir: "./capture",
  testMatch: /.*\.capture\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // One test renders a whole cut; frame-stepping ~3,500 frames takes minutes.
  timeout: 45 * 60 * 1000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4202",
    acceptDownloads: true,
    viewport: FORMATS[FORMAT].viewport,
    deviceScaleFactor: FORMATS[FORMAT].deviceScaleFactor,
  },
  projects: [{ name: FORMAT }],
  webServer: {
    command: "pnpm dev:astrospike",
    url: "http://localhost:4202/astrospike/",
    cwd: path.resolve(__dirname, "../../.."),
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
