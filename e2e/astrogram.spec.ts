import { test, expect } from '@playwright/test';

test.describe('Astrogram Layout & Interactivity Visual Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4201/db-astro-suite/astrogram/');
    await expect(page.locator('.form-container').first()).toBeVisible();
    await expect(page.locator('dba-ag-card-preview').first()).toBeVisible();
  });

  test('Default card form visual test', async ({ page }) => {
    // Snapshot the entire viewport initially
    await expect(page).toHaveScreenshot('astrogram-app-default.png', {
      timeout: 15000,
      fullPage: true
    });
  });

  test('Card Settings interaction and Aspect Ratio test', async ({ page }) => {
    // Expand Card Settings
    await page.locator('.accordion-header').filter({ hasText: 'Card Settings' }).click();
    
    // Wait for the CSS transition grid-template-rows animation to settle
    await page.waitForTimeout(600);

    // Change aspect ratio to 4:5 to test state and reactivity
    await page.locator('select').first().selectOption('4:5');

    // Slight delay for UI to settle
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('astrogram-app-aspect-ratio.png', {
      timeout: 15000,
      fullPage: true
    });
  });

  const accordionsToTest = [
    { title: '⚙️ Card Settings', filename: 'card-settings' },
    { title: '📸 Image Details', filename: 'image-details' },
    { title: '⏱️ Integration', filename: 'integration' },
    { title: '🔭 Equipment', filename: 'equipment' },
    { title: '💻 Software', filename: 'software' },
    { title: '🏙️ Bortle Scale', filename: 'bortle-scale' }
  ];

  for (const accordion of accordionsToTest) {
    test(`Expand ${accordion.filename} accordion visual test`, async ({ page }) => {
      // Find the accordion button and click it to expand
      // We use filter({ hasText }) instead of getByRole({ name }) because emoji characters
      // can sometimes fail to match strictly across macOS/Linux rendering differences in headless mode.
      await page.locator('.accordion-header').filter({ hasText: accordion.title }).click();
      
      // Wait for the CSS transition grid-template-rows animation to settle
      await page.waitForTimeout(600);

      await expect(page).toHaveScreenshot(`astrogram-app-expanded-${accordion.filename}.png`, {
        timeout: 15000,
        fullPage: true
      });
    });
  }
});
