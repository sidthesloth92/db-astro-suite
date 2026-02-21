import { test, expect } from '@playwright/test';

test('Starwizz app visual test', async ({ page }) => {
  await page.goto('http://localhost:4200/db-astro-suite/starwizz/');
  await expect(page.locator('sw-control-panel').first()).toBeVisible();
  
  // The WebGL canvas has randomly generated stars which will break pixel-to-pixel comparison.
  // We explicitly mask out the canvas so our test only asserts the UI controls are stable.
  await expect(page).toHaveScreenshot('starwizz-app.png', {
    mask: [page.locator('canvas')],
    fullPage: true,
    timeout: 15000
  });
});
