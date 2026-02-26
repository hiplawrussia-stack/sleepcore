/**
 * Accessibility E2E Tests
 * =======================
 * Tests for WCAG 2.2 AA compliance and accessibility features.
 *
 * IEC 62304 Compliance:
 * - Accessibility verification as part of usability testing
 * - User safety: Ensuring all users can operate the medical device
 *
 * Uses @axe-core/playwright for automated WCAG 2.2 AA checks.
 *
 * @module @sleepcore/mini-app/e2e
 */

import { test, expect } from '../fixtures/telegram.fixture';
import AxeBuilder from '@axe-core/playwright';
import { HomePage, BreathingPage, ProfilePage } from '../pages';

/**
 * WCAG 2.2 AA Automated Tests (axe-core)
 * These tests run automated accessibility checks on each page.
 */
test.describe('WCAG 2.2 AA Compliance', () => {
  test('Home page should have no critical accessibility violations', async ({
    telegramPage,
  }) => {
    await telegramPage.goto('/');
    await telegramPage.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: telegramPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations on Home:', JSON.stringify(results.violations, null, 2));
    }

    // Allow some violations for MVP, but track them
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Breathing page should have no critical accessibility violations', async ({
    telegramPage,
  }) => {
    await telegramPage.goto('/breathing');
    await telegramPage.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: telegramPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    if (results.violations.length > 0) {
      console.log('Accessibility violations on Breathing:', JSON.stringify(results.violations, null, 2));
    }

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Profile page should have no critical accessibility violations', async ({
    telegramPage,
  }) => {
    await telegramPage.goto('/profile');
    await telegramPage.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: telegramPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    if (results.violations.length > 0) {
      console.log('Accessibility violations on Profile:', JSON.stringify(results.violations, null, 2));
    }

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });
});

test.describe('Accessibility', () => {
  test.describe('Color Contrast', () => {
    test('should have visible text on dark background', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Check that main text elements are visible
      await expect(homePage.greeting).toBeVisible();

      // Get computed color of greeting
      const greetingColor = await homePage.greeting.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Should be a light color (RGB values > 128)
      const colorMatch = greetingColor.match(/\d+/g);
      if (colorMatch) {
        const [r, g, b] = colorMatch.map(Number);
        // At least one channel should be bright for light text
        expect(Math.max(r, g, b)).toBeGreaterThan(128);
      }
    });
  });

  test.describe('Touch Targets', () => {
    test('should have adequate touch target sizes for mobile', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Check bottom nav touch targets (should be at least 44x44px per WCAG)
      const navLinks = await homePage.bottomNav.locator('a').all();

      for (const link of navLinks) {
        const box = await link.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
    });

    test('should have adequate button sizes on breathing page', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      // Check cycle selector buttons (3, 5, 7, 10)
      const cycleButtons = await telegramPage
        .locator('button')
        .filter({ hasText: /^[357]$|^10$/ })
        .all();

      for (const button of cycleButtons) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(40);
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Tab to first focusable element
      await telegramPage.keyboard.press('Tab');

      // Check that focused element has visual indication
      const focusedElement = telegramPage.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have alt text for meaningful images', async ({ telegramPage }) => {
      const profilePage = new ProfilePage(telegramPage);

      await profilePage.goto();

      // Check for any img elements (emojis are text, so mainly checking custom images)
      const images = await telegramPage.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Either has alt text or is marked as decorative
        const hasAltText = alt && alt.length > 0;
        const isDecorative = role === 'presentation' || alt === '';

        expect(hasAltText || isDecorative).toBe(true);
      }
    });

    test('should have semantic headings', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Should have at least one h1
      const h1Elements = await telegramPage.locator('h1').count();
      expect(h1Elements).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preference', async ({ telegramPage }) => {
      // Set reduced motion preference
      await telegramPage.emulateMedia({ reducedMotion: 'reduce' });

      const homePage = new HomePage(telegramPage);
      await homePage.goto();

      // Page should still function correctly
      await expect(homePage.greeting).toBeVisible();
    });
  });

  test.describe('Text Sizing', () => {
    test('should be readable with default text size', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Check minimum font size (should be at least 14px for body text)
      const greetingFontSize = await homePage.greeting.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });

      expect(greetingFontSize).toBeGreaterThanOrEqual(14);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicator during page transitions', async ({ telegramPage }) => {
      // Navigate to profile (which has data loading)
      await telegramPage.goto('/profile');

      // Either loading skeleton or content should be visible immediately
      const hasContent = await telegramPage.locator('.animate-pulse, h1').first().isVisible();
      expect(hasContent).toBe(true);
    });
  });

  test.describe('Error States', () => {
    test('should handle offline state gracefully', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Simulate offline
      await telegramPage.context().setOffline(true);

      // App should still be usable (offline-first)
      await expect(homePage.greeting).toBeVisible();

      // Restore online state
      await telegramPage.context().setOffline(false);
    });
  });
});

test.describe('Mobile Usability', () => {
  test.describe('Viewport', () => {
    test('should adapt to mobile viewport', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Content should fit within viewport (no horizontal scroll)
      const bodyWidth = await telegramPage.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await telegramPage.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });

  test.describe('Safe Areas', () => {
    test('should have safe area padding on bottom nav', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Check that bottom nav has safe-area class
      const navClass = await homePage.bottomNav.getAttribute('class');
      expect(navClass).toContain('safe-area-bottom');
    });
  });

  test.describe('Touch Gestures', () => {
    test('should respond to tap on cards', async ({ telegramPage }, testInfo) => {
      // Skip on Desktop Chrome - no touch support
      test.skip(testInfo.project.name === 'Desktop Chrome', 'Touch gestures require mobile device');

      const homePage = new HomePage(telegramPage);

      await homePage.goto();

      // Tap on start breathing card should navigate
      await homePage.startBreathingCard.tap();

      // Should navigate to breathing page
      const breathingPage = new BreathingPage(telegramPage);
      expect(await breathingPage.isPatternSelectorVisible()).toBe(true);
    });
  });
});
