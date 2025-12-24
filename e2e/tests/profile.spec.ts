/**
 * Profile Page E2E Tests
 * ======================
 * Tests for user profile and stats display.
 */

import { test, expect, injectTelegramMock, defaultTestUser } from '../fixtures/telegram-mock';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await injectTelegramMock(page, defaultTestUser);
    await page.goto('/profile');
  });

  test('should display user profile', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show profile content or loading state
    const content = page.locator('[class*="profile"], main, h1');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show user name from Telegram', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should display the test user's name
    const userName = page.getByText(new RegExp(defaultTestUser.first_name, 'i'));
    await expect(userName.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display evolution status', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show evolution-related content (owl emoji or stage name)
    const evolutionContent = page.locator('[class*="evolution"], [class*="card"]');

    // Look for owl emoji or stage text
    const owlEmoji = page.getByText(/🐣|🦉|Совёнок|сова/);

    // Either evolution card or owl reference should be visible
    const hasEvolution = await evolutionContent.first().isVisible().catch(() => false);
    const hasOwl = await owlEmoji.first().isVisible().catch(() => false);

    expect(hasEvolution || hasOwl).toBeTruthy();
  });

  test('should display stats grid', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show statistics cards
    const statsLabels = [
      /сессий|sessions/i,
      /время|time|минут/i,
      /streak/i,
    ];

    // At least one stat label should be visible
    let foundStats = false;
    for (const label of statsLabels) {
      const element = page.getByText(label);
      if (await element.first().isVisible().catch(() => false)) {
        foundStats = true;
        break;
      }
    }

    expect(foundStats).toBeTruthy();
  });

  test('should have settings section', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show settings header
    const settingsHeader = page.getByText(/настройки|settings/i);
    await expect(settingsHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have haptics toggle', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show vibration/haptics setting
    const hapticsLabel = page.getByText(/вибрация|haptic/i);
    await expect(hapticsLabel.first()).toBeVisible({ timeout: 10000 });

    // Should have a toggle button
    const toggle = page.locator('[class*="toggle"], button[class*="rounded-full"]');
    expect(await toggle.count()).toBeGreaterThan(0);
  });

  test('should navigate back to home', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click home in navigation
    await page.getByText('Главная').click();

    // Should navigate to home
    await expect(page).toHaveURL('/');
  });
});

test.describe('Profile Data Loading', () => {
  test('should show loading state initially', async ({ page }) => {
    await injectTelegramMock(page, defaultTestUser);

    // Navigate without waiting
    await page.goto('/profile', { waitUntil: 'commit' });

    // Should show loading indicator or skeleton
    const loadingIndicator = page.locator('[class*="animate-pulse"], [class*="loading"], [class*="skeleton"]');

    // Either loading state or content should be visible quickly
    await page.waitForTimeout(500);

    const isLoading = await loadingIndicator.first().isVisible().catch(() => false);
    const hasContent = await page.getByText(defaultTestUser.first_name).first().isVisible().catch(() => false);

    // One of these should be true
    expect(isLoading || hasContent).toBeTruthy();
  });

  test('should display XP and level', async ({ page }) => {
    await injectTelegramMock(page, defaultTestUser);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Should show XP or level information
    const xpContent = page.getByText(/XP|уровень|level/i);
    await expect(xpContent.first()).toBeVisible({ timeout: 10000 });
  });
});
