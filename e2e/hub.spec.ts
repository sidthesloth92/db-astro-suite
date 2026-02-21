import { test, expect } from '@playwright/test';

test('Hub homepage visual test', async ({ page }) => {
  await page.goto('http://localhost:5173/db-astro-suite/');
  await expect(page).toHaveScreenshot('hub-homepage.png', { fullPage: true });
});
