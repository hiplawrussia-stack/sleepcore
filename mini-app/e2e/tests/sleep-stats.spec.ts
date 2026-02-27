/**
 * Sleep Stats E2E Tests
 * =====================
 * Tests for sleep data visualization from wearables.
 *
 * IEC 62304 Compliance:
 * - Data display verification per §5.7
 * - Traceability: DATA-001, WEAR-001
 *
 * @module @sleepcore/mini-app/e2e
 */

import { test, expect } from '../fixtures/telegram.fixture';
import { SleepPage, HomePage } from '../pages';

test.describe('Sleep Stats Page', () => {
  test.describe('Data Display', () => {
    test('should display page title and subtitle', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const title = await sleepPage.getTitle();
      expect(title).toContain('Статистика сна');

      const subtitle = await sleepPage.getSubtitle();
      expect(subtitle).toContain('7');
    });

    test('should display average sleep time metric', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const avgTst = await sleepPage.getAvgSleepTime();
      expect(avgTst).toBeTruthy();
      // Should contain hours/minutes format
      expect(avgTst).toMatch(/\d+/);
    });

    test('should display sleep efficiency metric', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const se = await sleepPage.getSleepEfficiency();
      expect(se).toBeTruthy();
      // Should contain percentage
      expect(se).toContain('%');
    });

    test('should display sleep stages visualization', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      expect(await sleepPage.hasSleepStages()).toBe(true);

      const stages = await sleepPage.getSleepStages();
      // At least one stage should have a value
      expect(stages.deep || stages.rem || stages.light).toBeTruthy();
    });

    test('should display HRV metric when available', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      if (await sleepPage.hasHrvMetric()) {
        const hrv = await sleepPage.getHrvValue();
        expect(hrv).toContain('ms');
      }
    });

    test('should display SpO2 metric when available', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      if (await sleepPage.hasSpo2Metric()) {
        const spo2 = await sleepPage.getSpo2Value();
        expect(spo2).toContain('%');
      }
    });

    test('should display session history', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const sessionCount = await sleepPage.getSessionCount();
      expect(sessionCount).toBeGreaterThan(0);
    });

    test('should display session row with correct data', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const sessionData = await sleepPage.getSessionData(0);
      expect(sessionData).not.toBeNull();

      if (sessionData) {
        expect(sessionData.tst).toBeTruthy();
      }
    });

    test('should display last sync time', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const syncTime = await sleepPage.getLastSyncTime();
      if (syncTime) {
        expect(syncTime).toContain('Синхронизировано');
      }
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no data', async ({ telegramPage }) => {
      // Clear existing routes and set up empty response mocks
      await telegramPage.unroute('**/sleep/stats');
      await telegramPage.unroute('**/sleep/sessions*');

      await telegramPage.route('**/sleep/stats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            avgSleepEfficiency: null,
            avgTotalSleepTime: null,
            avgTimeInBed: null,
            avgSleepOnsetLatency: null,
            avgWaso: null,
            avgAwakenings: null,
            avgStageDeep: null,
            avgStageRem: null,
            avgStageLight: null,
            avgHrvRmssd: null,
            avgRestingHeartRate: null,
            avgSpo2: null,
            minSpo2: null,
            seTrend: null,
            tstTrend: null,
            totalSessions: 0,
            sessionsThisWeek: 0,
            lastSyncAt: null,
          }),
        });
      });

      await telegramPage.route('**/sleep/sessions*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ sessions: [], total: 0, hasMore: false }),
        });
      });

      const sleepPage = new SleepPage(telegramPage);
      await sleepPage.goto();

      expect(await sleepPage.isEmptyState()).toBe(true);
    });

    test('empty state should show setup instructions', async ({ telegramPage }) => {
      // Clear existing routes and set up empty response mocks
      await telegramPage.unroute('**/sleep/stats');
      await telegramPage.unroute('**/sleep/sessions*');

      await telegramPage.route('**/sleep/stats', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            avgSleepEfficiency: null,
            avgTotalSleepTime: null,
            avgTimeInBed: null,
            avgSleepOnsetLatency: null,
            avgWaso: null,
            avgAwakenings: null,
            avgStageDeep: null,
            avgStageRem: null,
            avgStageLight: null,
            avgHrvRmssd: null,
            avgRestingHeartRate: null,
            avgSpo2: null,
            minSpo2: null,
            seTrend: null,
            tstTrend: null,
            totalSessions: 0,
            sessionsThisWeek: 0,
            lastSyncAt: null,
          }),
        });
      });

      await telegramPage.route('**/sleep/sessions*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ sessions: [], total: 0, hasMore: false }),
        });
      });

      const sleepPage = new SleepPage(telegramPage);
      await sleepPage.goto();

      // Wait for empty state to render
      await telegramPage.waitForSelector('text=Нет данных о сне', { timeout: 5000 });

      // Should show instruction to connect companion app
      const emptyState = telegramPage.locator('text=Нет данных о сне').locator('..').locator('..');
      const emptyText = await emptyState.textContent();
      expect(emptyText).toContain('/link');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to sleep stats from home page', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);
      const sleepPage = new SleepPage(telegramPage);

      await homePage.goto();

      // Click on sleep stats card
      await telegramPage.locator('text=Статистика сна').first().click();
      await sleepPage.waitForLoad();

      // Should be on sleep page
      expect(await sleepPage.hasData() || await sleepPage.isEmptyState()).toBe(true);
    });

    test('should navigate back to home via back button', async ({ telegramPage }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();
      await sleepPage.goBack();

      // Should be on home page
      expect(telegramPage.url()).toContain('/');
    });
  });

  test.describe('API Integration', () => {
    test('should call sleep stats API', async ({ telegramPage, capturedRequests }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const statsCalls = capturedRequests.filter(r =>
        r.url.includes('/sleep/stats')
      );
      expect(statsCalls.length).toBeGreaterThan(0);
    });

    test('should call sleep sessions API', async ({ telegramPage, capturedRequests }) => {
      const sleepPage = new SleepPage(telegramPage);

      await sleepPage.goto();

      const sessionsCalls = capturedRequests.filter(r =>
        r.url.includes('/sleep/sessions')
      );
      expect(sessionsCalls.length).toBeGreaterThan(0);
    });
  });

  test.describe('Loading State', () => {
    test('should show loading skeleton initially', async ({ telegramPage }) => {
      // Set up slow response
      await telegramPage.route('**/sleep/stats', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            avgSleepEfficiency: 85,
            avgTotalSleepTime: 420,
            sessionsThisWeek: 3,
          }),
        });
      });

      const sleepPage = new SleepPage(telegramPage);

      // Navigate without waiting for load
      await telegramPage.goto('/sleep');

      // Should show loading state
      const isLoading = await sleepPage.isLoading();
      expect(isLoading).toBe(true);
    });
  });
});

test.describe('Sleep Stats - Accessibility', () => {
  test('session cards should have aria labels', async ({ telegramPage }) => {
    const sleepPage = new SleepPage(telegramPage);

    await sleepPage.goto();

    const sessions = await telegramPage.locator('[aria-label*="сна за"]').all();
    expect(sessions.length).toBeGreaterThan(0);
  });

  test('metric icons should be hidden from screen readers', async ({ telegramPage }) => {
    const sleepPage = new SleepPage(telegramPage);

    await sleepPage.goto();

    // Emoji icons should have aria-hidden
    const hiddenIcons = await telegramPage.locator('[aria-hidden="true"]').all();
    expect(hiddenIcons.length).toBeGreaterThan(0);
  });
});
