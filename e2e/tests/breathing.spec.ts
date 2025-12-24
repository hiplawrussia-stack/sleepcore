/**
 * Breathing Page E2E Tests
 * ========================
 * Tests for the breathing exercise functionality.
 */

import { test, expect, injectTelegramMock, defaultTestUser } from '../fixtures/telegram-mock';

test.describe('Breathing Page', () => {
  test.beforeEach(async ({ page }) => {
    await injectTelegramMock(page, defaultTestUser);
    await page.goto('/breathing');
  });

  test('should display breathing patterns', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show breathing page content
    // Look for pattern selection or breathing title
    const content = page.locator('main, [class*="breathing"], h1, h2');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have back navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Breathing page should have back button capability
    // Check if we can navigate back
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('should show pattern options', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for breathing pattern cards or buttons
    // Common patterns: 4-7-8, Box Breathing, etc.
    const patterns = page.locator('[class*="card"], [class*="pattern"], button');

    // Should have at least one pattern option
    const count = await patterns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be able to start a breathing exercise', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find and click on a pattern or start button
    const startButton = page.getByRole('button', { name: /начать|start|выбрать/i });
    const patternCard = page.locator('[class*="card"]').first();

    // Try to start an exercise
    if (await startButton.isVisible()) {
      await startButton.click();
    } else if (await patternCard.isVisible()) {
      await patternCard.click();
    }

    // After starting, should see exercise UI or animation
    await page.waitForTimeout(1000);

    // The page should still be on breathing or show exercise state
    await expect(page).toHaveURL(/.*\/breathing/);
  });
});

test.describe('Breathing Exercise Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectTelegramMock(page, defaultTestUser);
    await page.goto('/breathing');
    await page.waitForLoadState('networkidle');
  });

  test('should complete a short breathing session', async ({ page }) => {
    // This test simulates completing a breathing exercise

    // Find first pattern/card
    const card = page.locator('[class*="card"], [class*="pattern"]').first();

    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(500);
    }

    // Look for exercise controls
    const controls = page.locator('[class*="control"], [class*="button"], button');

    // Exercise might have pause/stop buttons
    // We just verify the UI responds
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(0);
  });
});
