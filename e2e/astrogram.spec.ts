import { test, expect } from '@playwright/test';

test('Astrogram card form visual test', async ({ page }) => {
  await page.goto('http://localhost:4201/db-astro-suite/astrogram/');
  // Wait for the form container and the preview card
  await expect(page.locator('.form-container').first()).toBeVisible();
  await expect(page.locator('ac-card-preview').first()).toBeVisible();
  
  // Snapshot the entire viewport
  await expect(page).toHaveScreenshot('astrogram-app.png', {
      timeout: 15000,
      fullPage: true
  });
});
