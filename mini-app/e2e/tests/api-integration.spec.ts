/**
 * API Integration E2E Tests
 * =========================
 * Tests for API integration, error handling, and data flow.
 *
 * IEC 62304 Compliance:
 * - Integration verification per §5.7
 * - Traceability: INT-001, INT-002, ERR-001
 *
 * @module @sleepcore/mini-app/e2e
 */

import { test, expect } from '../fixtures/telegram.fixture';
import { BreathingPage, HomePage, ProfilePage } from '../pages';

test.describe('API Integration', () => {
  // Uses E2E speed multiplier (100x) - exercises complete in ~1 second

  test.describe('Session Logging', () => {
    test('should log breathing session to API', async ({
      telegramPage,
      capturedRequests,
    }) => {
      const breathingPage = new BreathingPage(telegramPage);

      // Run exercise with default pattern
      await breathingPage.runCompleteExercise(undefined, 3);

      // Verify session was logged
      const sessionRequests = capturedRequests.filter(
        (r) => r.url.includes('/breathing/session') && r.method === 'POST'
      );
      expect(sessionRequests.length).toBeGreaterThan(0);

      // Verify request body has required fields
      const body = sessionRequests[0].body as {
        patternId: string;
        cycles: number;
        duration: number;
      };
      expect(body.patternId).toBeTruthy();
      expect(body.cycles).toBe(3);
      expect(body.duration).toBeGreaterThan(0);
    });
  });

  test.describe('Evolution System', () => {
    test('should fetch evolution data on profile page', async ({
      telegramPage,
      capturedRequests,
    }) => {
      const profilePage = new ProfilePage(telegramPage);
      await profilePage.goto();

      // Wait for API calls to complete
      await telegramPage.waitForTimeout(1000);

      // Verify evolution endpoint was called
      const evolutionRequests = capturedRequests.filter((r) =>
        r.url.includes('/user/evolution')
      );
      expect(evolutionRequests.length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 500 server error gracefully', async ({
      telegramPage,
      mockApi,
    }) => {
      // Override default mocks with error responses
      await mockApi({
        pattern: '**/breathing/session',
        status: 500,
        response: { error: 'Internal Server Error' },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // UI should still show completion despite API errors
      expect(await breathingPage.isCompleted()).toBe(true);
    });

    test('should handle 401 unauthorized gracefully', async ({
      telegramPage,
      mockApi,
    }) => {
      await mockApi({
        pattern: '**/breathing/session',
        status: 401,
        response: { error: 'Unauthorized' },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // Exercise should complete locally even with auth error
      expect(await breathingPage.isCompleted()).toBe(true);
    });
  });

  test.describe('Data Sync', () => {
    test('should call stats endpoint on profile page', async ({
      telegramPage,
      capturedRequests,
    }) => {
      const profilePage = new ProfilePage(telegramPage);
      await profilePage.goto();

      // Wait for initial data fetch
      await telegramPage.waitForTimeout(1000);

      // Verify stats were fetched (profile page shows breathing stats)
      const statsRequests = capturedRequests.filter((r) =>
        r.url.includes('/breathing/stats')
      );
      expect(statsRequests.length).toBeGreaterThan(0);
    });
  });
});

test.describe('Profile Page Integration', () => {
  test('should display profile page with settings', async ({ telegramPage }) => {
    const profilePage = new ProfilePage(telegramPage);
    await profilePage.goto();

    // Profile page should render with settings section
    await expect(
      telegramPage.locator('h3').filter({ hasText: /настройки|settings/i })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Home Page Integration', () => {
  test('should display home page', async ({ telegramPage }) => {
    const homePage = new HomePage(telegramPage);
    await homePage.goto();

    // Home page should render with breathing card
    const breathingCard = telegramPage.locator('button').filter({ hasText: /дыхани|breath/i });
    await expect(breathingCard).toBeVisible({ timeout: 5000 });
  });
});
