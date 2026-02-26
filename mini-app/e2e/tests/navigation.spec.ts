/**
 * Navigation E2E Tests
 * ====================
 * Tests for app navigation and routing.
 *
 * IEC 62304 Compliance:
 * - System verification per §5.7
 * - Traceability: UX-001, UX-002
 *
 * @module @sleepcore/mini-app/e2e
 */

import { test, expect } from '../fixtures/telegram.fixture';
import { HomePage, BreathingPage, ProfilePage } from '../pages';

test.describe('Navigation', () => {
  test.describe('Bottom Navigation', () => {
    test('should navigate between all pages', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);
      const profilePage = new ProfilePage(telegramPage);

      // Start at home
      await homePage.goto();
      await expect(homePage.greeting).toBeVisible();

      // Navigate to profile
      await homePage.navigateTo('profile');
      await expect(profilePage.userName).toBeVisible();

      // Navigate back to home
      await profilePage.navigateTo('home');
      await expect(homePage.greeting).toBeVisible();

      // Navigate to breathing
      await homePage.navigateTo('breathing');
      const breathingPage = new BreathingPage(telegramPage);
      expect(await breathingPage.isPatternSelectorVisible()).toBe(true);
    });

    test('should highlight active navigation item', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Check home is active
      const homeLink = homePage.bottomNav.locator('a[href="/"]');
      await expect(homeLink).toHaveClass(/text-primary-400/);

      // Navigate to profile
      await homePage.navigateTo('profile');

      // Check profile is now active
      const profileLink = homePage.bottomNav.locator('a[href="/profile"]');
      await expect(profileLink).toHaveClass(/text-primary-400/);
    });

    test('should hide bottom nav on breathing page', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      // Bottom nav should not be visible
      await expect(breathingPage.bottomNav).toBeHidden();
    });
  });

  test.describe('Back Button', () => {
    test('should navigate back from breathing page', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);
      const breathingPage = new BreathingPage(telegramPage);

      // Go to home first
      await homePage.goto();

      // Navigate to breathing
      await homePage.clickStartBreathing();

      // Verify we're on breathing page
      expect(await breathingPage.isPatternSelectorVisible()).toBe(true);

      // Click back button
      await breathingPage.clickBackButton();

      // Should be back on home
      await expect(homePage.greeting).toBeVisible();
    });

    test('should navigate back from profile page', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);
      const profilePage = new ProfilePage(telegramPage);

      await profilePage.goto();
      await profilePage.clickBackButton();

      await expect(homePage.greeting).toBeVisible();
    });
  });

  test.describe('Deep Linking', () => {
    test('should open breathing page with pattern parameter', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      // Navigate with pattern parameter
      await breathingPage.goto('box');

      // Pattern selector should show box breathing (Квадратное дыхание) selected
      const selectedPattern = await breathingPage.getSelectedPatternName();
      expect(selectedPattern.toLowerCase()).toContain('квадратное');
    });

    test('should fallback to default pattern for invalid parameter', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      // Navigate with invalid pattern
      await breathingPage.goto('invalid-pattern-123');

      // Should fallback to 4-7-8 (default)
      const selectedPattern = await breathingPage.getSelectedPatternName();
      expect(selectedPattern).toContain('4-7-8');
    });

    test('should redirect unknown routes to home', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      // Navigate to unknown route
      await telegramPage.goto('/unknown-page-123');

      // Should be redirected to home
      await expect(homePage.greeting).toBeVisible();
    });
  });
});
