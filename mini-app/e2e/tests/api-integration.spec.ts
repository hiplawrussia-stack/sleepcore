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
  // FIXME: These tests depend on runCompleteExercise which has Clock API issues
  // See breathing.spec.ts for details. Tracked in AUDIT_REPORT.md
  test.describe('Session Logging', () => {
    test.fixme('should log breathing session to API', async ({
      telegramPage,
      mockApi,
      capturedRequests,
    }) => {
      // Set up API mocks with correct endpoints
      await mockApi({
        pattern: '**/breathing/sessions',
        status: 201,
        response: { id: 'session-123', xpGain: 30 },
      });
      await mockApi({
        pattern: '**/user/evolution',
        status: 200,
        response: { evolved: false, currentStage: 'owlet' },
      });
      await mockApi({
        pattern: '**/breathing/stats',
        status: 200,
        response: { totalSessions: 5, totalMinutes: 10, streak: 2 },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.goto();

      // Run exercise with default pattern
      await breathingPage.runCompleteExercise(undefined, 3);

      // Verify session was logged
      const sessionRequests = capturedRequests.filter(
        (r) => r.url.includes('/breathing/sessions') && r.method === 'POST'
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
    test.fixme('should check evolution after session completion', async ({
      telegramPage,
      mockApi,
      capturedRequests,
    }) => {
      await mockApi({
        pattern: '**/breathing/sessions',
        status: 201,
        response: { id: 'session-123', xpGain: 100 },
      });
      await mockApi({
        pattern: '**/user/evolution',
        status: 200,
        response: { evolved: false, currentStage: 'owlet' },
      });
      await mockApi({
        pattern: '**/breathing/stats',
        status: 200,
        response: { totalSessions: 10, totalMinutes: 30, streak: 7 },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.goto();
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // Verify evolution check was called (endpoint is /user/evolution)
      const evolutionRequests = capturedRequests.filter((r) =>
        r.url.includes('/user/evolution')
      );
      expect(evolutionRequests.length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test.fixme('should handle 500 server error gracefully', async ({
      telegramPage,
      mockApi,
    }) => {
      await mockApi({
        pattern: '**/breathing/sessions',
        status: 500,
        response: { error: 'Internal Server Error' },
      });
      await mockApi({
        pattern: '**/user/evolution',
        status: 500,
        response: { error: 'Internal Server Error' },
      });
      await mockApi({
        pattern: '**/breathing/stats',
        status: 500,
        response: { error: 'Internal Server Error' },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.goto();
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // UI should still show completion despite API errors
      expect(await breathingPage.isCompleted()).toBe(true);
    });

    test.fixme('should handle 401 unauthorized gracefully', async ({
      telegramPage,
      mockApi,
    }) => {
      await mockApi({
        pattern: '**/breathing/sessions',
        status: 401,
        response: { error: 'Unauthorized' },
      });
      await mockApi({
        pattern: '**/user/evolution',
        status: 401,
        response: { error: 'Unauthorized' },
      });
      await mockApi({
        pattern: '**/breathing/stats',
        status: 401,
        response: { error: 'Unauthorized' },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.goto();
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // Exercise should complete locally even with auth error
      expect(await breathingPage.isCompleted()).toBe(true);
    });
  });

  test.describe('Data Sync', () => {
    test.fixme('should refresh stats after session', async ({
      telegramPage,
      mockApi,
      capturedRequests,
    }) => {
      await mockApi({
        pattern: '**/breathing/sessions',
        status: 201,
        response: { id: 'session-123', xpGain: 30 },
      });
      await mockApi({
        pattern: '**/evolution/check',
        status: 200,
        response: { evolved: false, currentStage: 'owlet' },
      });
      await mockApi({
        pattern: '**/breathing/stats',
        status: 200,
        response: { totalSessions: 10, totalMinutes: 25, streak: 5 },
      });

      const breathingPage = new BreathingPage(telegramPage);
      await breathingPage.goto();
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // Verify stats were refreshed
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
