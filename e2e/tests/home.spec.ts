/**
 * Home Page E2E Tests
 * ===================
 * Tests for the main home page.
 */

import { test, expect, injectTelegramMock, defaultTestUser } from '../fixtures/telegram-mock';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await injectTelegramMock(page, defaultTestUser);
    await page.goto('/');
  });

  test('should display home page with greeting', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show either greeting or loading indicator
    const greeting = page.getByText(/Привет|Загрузка/);
    await expect(greeting.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have bottom navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check bottom navigation exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check navigation items
    await expect(page.getByText('Главная')).toBeVisible();
    await expect(page.getByText('Дыхание')).toBeVisible();
    await expect(page.getByText('Профиль')).toBeVisible();
  });

  test('should navigate to breathing page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click on breathing nav item
    await page.getByText('Дыхание').click();

    // Should navigate to breathing page
    await expect(page).toHaveURL(/.*\/breathing/);
  });

  test('should navigate to profile page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click on profile nav item
    await page.getByText('Профиль').click();

    // Should navigate to profile page
    await expect(page).toHaveURL(/.*\/profile/);
  });
});
