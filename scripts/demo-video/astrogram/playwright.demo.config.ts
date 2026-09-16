import { defineConfig } from "@playwright/test";
import path from "node:path";

import { APP_PORT, APP_URL } from "./capture/app.constants";
import { FORMATS, currentFormat } from "../engine/capture/formats";

/** Which cut is being captured. */
const FORMAT = currentFormat();

/**
 * Capture configuration for the Astrogram demo video.
 *
 * Deliberately separate from the repo's `playwright.config.ts`: this run is not
 * a test, it starts only the astrogram dev server rather than all five, and it
 * needs a viewport the test suite must never inherit.
 *
 * The server runs on its own port rather than the usual 4201 so a dev server
 * left running in another worktree is never silently reused — that would film
 * a different checkout's code.
 *
 * `hasTouch` is left off on purpose even for the phone layout: the shell is
 * chosen by width alone, and mouse events keep taps and drags predictable.
 */
export default defineConfig({
  testDir: "./capture",
  testMatch: /.*\.capture\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // One test renders a whole cut; frame-stepping ~2,700 frames takes minutes.
  timeout: 45 * 60 * 1000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    acceptDownloads: true,
    // "Copy caption" writes to the clipboard, which headless Chromium refuses
    // without the permission and the button then never shows its tick.
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: FORMATS[FORMAT].viewport,
    deviceScaleFactor: FORMATS[FORMAT].deviceScaleFactor,
  },
  projects: [{ name: FORMAT }],
  webServer: {
    command: `pnpm exec ng serve --port ${APP_PORT}`,
    url: APP_URL,
    cwd: path.resolve(__dirname, "../../../tools/astrogram"),
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
