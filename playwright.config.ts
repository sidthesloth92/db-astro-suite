import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
    },
  },
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm dev:astrogram",
      url: "http://localhost:4201",
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
    {
      command: "pnpm dev:hub",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
    {
      command: "pnpm dev:starwizz",
      url: "http://localhost:4200",
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
    {
      // Dedicated test instance on port 3001 (separate from the Docker server on
      // 3000) so the test can open the same host-filesystem DB file directly.
      command:
        "SOLVE_API_KEY_REQUIRED=true ASTROSOLVE_PORT=3001 pnpm start:astrosolve",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
    },
  ],
});
