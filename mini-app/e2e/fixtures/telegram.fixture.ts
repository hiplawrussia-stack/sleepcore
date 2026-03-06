/**
 * Telegram WebApp Mock Fixture
 * ============================
 * Provides mock implementation of Telegram WebApp API for E2E testing.
 * Enables testing Mini-App flows outside of Telegram environment.
 *
 * IEC 62304 Compliance:
 * - Test environment isolation per §5.7.3
 * - Controlled test conditions
 *
 * @module @sleepcore/mini-app/e2e
 */

/* eslint-disable react-hooks/rules-of-hooks */
// Note: Playwright fixtures use `use()` function which is not a React hook

import { test as base, type Page } from '@playwright/test';

/**
 * Mock Telegram user data
 */
export interface MockTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Default test user
 */
const DEFAULT_USER: MockTelegramUser = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  language_code: 'ru',
  is_premium: false,
};

/**
 * Generates mock initData string (simplified, not cryptographically valid)
 * For E2E testing purposes only - backend should accept test tokens in dev mode
 */
function generateMockInitData(user: MockTelegramUser): string {
  const userData = encodeURIComponent(JSON.stringify(user));
  const authDate = Math.floor(Date.now() / 1000);
  const hash = 'test_hash_for_e2e_testing';

  return `user=${userData}&auth_date=${authDate}&hash=${hash}`;
}

/**
 * API request capture for verification
 */
export interface CapturedRequest {
  url: string;
  method: string;
  body: unknown;
  timestamp: number;
}

/**
 * API mock configuration
 */
export interface ApiMockConfig {
  /** Glob pattern to match API URLs */
  pattern: string;
  /** Response status code */
  status?: number;
  /** Response body */
  response?: unknown;
  /** Capture requests for verification */
  capture?: boolean;
}

/**
 * Generate Telegram WebApp URL hash parameters
 * This is how Telegram passes init data to Mini Apps
 */
function generateTelegramHash(user: MockTelegramUser, initData: string): string {
  // Theme parameters that Telegram sends
  const themeParams = JSON.stringify({
    bg_color: '#1c1c1e',
    text_color: '#ffffff',
    hint_color: '#98989e',
    link_color: '#007aff',
    button_color: '#007aff',
    button_text_color: '#ffffff',
    secondary_bg_color: '#2c2c2e',
  });

  const params = new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: '7.0',
    tgWebAppPlatform: 'tdesktop',
    tgWebAppThemeParams: themeParams,
  });

  return params.toString();
}

/**
 * Extended test fixture with Telegram mock and API helpers
 */
export const test = base.extend<{
  telegramPage: Page;
  telegramUser: MockTelegramUser;
  /** Captured API requests for verification */
  capturedRequests: CapturedRequest[];
  /** Set up API mock with optional request capture */
  mockApi: (config: ApiMockConfig) => Promise<void>;
  /** Get URL with Telegram hash for navigation */
  getTelegramUrl: (path: string) => string;
}>({
  telegramUser: [DEFAULT_USER, { option: true }],

  // Shared captured requests array
  // eslint-disable-next-line no-empty-pattern
  capturedRequests: async ({}, use) => {
    const requests: CapturedRequest[] = [];
    await use(requests);
  },

  // URL generator with Telegram hash
  getTelegramUrl: async ({ telegramUser }, use) => {
    const initData = generateMockInitData(telegramUser);
    const hash = generateTelegramHash(telegramUser, initData);

    const getTelegramUrl = (path: string) => {
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${normalizedPath}#${hash}`;
    };

    await use(getTelegramUrl);
  },

  // API mocking helper
   
  mockApi: async ({ telegramPage, capturedRequests }, use) => {
    const mockApi = async (config: ApiMockConfig) => {
      await telegramPage.route(config.pattern, async (route) => {
        const request = route.request();

        // Capture request if enabled
        if (config.capture !== false) {
          let body: unknown = null;
          try {
            body = request.postDataJSON();
          } catch {
            body = request.postData();
          }

          capturedRequests.push({
            url: request.url(),
            method: request.method(),
            body,
            timestamp: Date.now(),
          });
        }

        // Fulfill with mock response
        await route.fulfill({
          status: config.status ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(config.response ?? { success: true }),
        });
      });
    };

    await use(mockApi);
  },

   
  telegramPage: async ({ page, telegramUser, capturedRequests }, use) => {
    // Forward browser console to Node.js for debugging
    // This helps diagnose issues where React component behavior differs from expectations
    page.on('console', msg => {
      const text = msg.text();
      // Forward all relevant logs for debugging
      if (text.includes('[Breathing]') ||
          text.includes('[E2E]') ||
          text.includes('Speed') ||
          text.includes('speed') ||
          text.includes('Triggering') ||
          text.includes('MainButton') ||
          text.includes('runPhase') ||
          text.includes('getSpeed')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    // Also capture browser errors
    page.on('pageerror', error => {
      console.log(`[BROWSER ERROR] ${error.message}`);
    });

    // Generate init data for URL hash
    const mockInitData = generateMockInitData(telegramUser);
    const telegramHash = generateTelegramHash(telegramUser, mockInitData);

    // Set language in localStorage and E2E speed multiplier BEFORE navigation
    await page.addInitScript(({ languageCode }) => {
      localStorage.setItem('sleepcore_language', languageCode);
      // E2E speed multiplier for breathing tests (100x faster)
      (window as unknown as { __E2E_SPEED_MULTIPLIER__: number }).__E2E_SPEED_MULTIPLIER__ = 100;
      console.log('[E2E] Speed multiplier set to 100x');
    }, { languageCode: telegramUser.language_code || 'ru' });

    // Set up default API mocks that all tests need
    // Tests can override these with more specific mocks if needed
    const defaultMocks = [
      {
        pattern: '**/auth/telegram',
        response: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 3600,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            telegramId: telegramUser.id,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            evolutionStage: 'owlet',
            xp: 150,
            level: 2,
            streak: 3,
          },
        },
      },
      {
        pattern: '**/user/profile',
        response: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          telegramId: telegramUser.id,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          evolutionStage: 'owlet',
          xp: 150,
          level: 2,
          streak: 3,
          badges: ['first_session'],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-02-26T00:00:00.000Z',
        },
      },
      {
        pattern: '**/user/evolution',
        response: {
          currentStage: 'owlet',
          stageName: 'Совёнок',
          stageEmoji: '🐣',
          daysActive: 7,
          progress: 50,
          nextStage: 'young_owl',
          daysToNext: 7,
        },
      },
      {
        pattern: '**/breathing/stats',
        response: {
          totalSessions: 10,
          totalMinutes: 25,
          currentStreak: 3,
          longestStreak: 7,
          favoritePattern: '478',
          weeklyProgress: [2, 1, 2, 1, 2, 1, 1],
          lastSessionAt: '2025-02-25T20:00:00.000Z',
        },
      },
      {
        pattern: '**/user/quests',
        response: { quests: [] },
      },
      {
        pattern: '**/breathing/session',
        response: { id: 'session-123', xpGain: 30 },
        status: 201,
      },
      {
        pattern: '**/sleep/stats',
        response: {
          avgSleepEfficiency: 85.5,
          avgTotalSleepTime: 420,
          avgTimeInBed: 480,
          avgSleepOnsetLatency: 15,
          avgWaso: 25,
          avgAwakenings: 2.3,
          avgStageDeep: 18,
          avgStageRem: 22,
          avgStageLight: 55,
          avgHrvRmssd: 45,
          avgRestingHeartRate: 58,
          avgSpo2: 96.5,
          minSpo2: 92,
          seTrend: 'improving',
          tstTrend: 'stable',
          totalSessions: 14,
          sessionsThisWeek: 5,
          lastSyncAt: '2025-02-26T08:30:00.000Z',
        },
      },
      {
        pattern: '**/sleep/sessions*',
        response: {
          sessions: [
            {
              id: 'session-1',
              date: '2025-02-26',
              startTime: '2025-02-25T23:00:00.000Z',
              endTime: '2025-02-26T07:00:00.000Z',
              source: 'health_connect',
              tst: 420,
              tib: 480,
              se: 87.5,
              waso: 20,
              sol: 12,
              awakenings: 2,
              stageWake: 5,
              stageLight: 55,
              stageDeep: 18,
              stageRem: 22,
              hrvMeanRmssd: 48,
              spo2Mean: 97,
              spo2Min: 93,
              restingHeartRate: 56,
            },
            {
              id: 'session-2',
              date: '2025-02-25',
              startTime: '2025-02-24T23:30:00.000Z',
              endTime: '2025-02-25T06:45:00.000Z',
              source: 'health_connect',
              tst: 395,
              tib: 435,
              se: 90.8,
              waso: 15,
              sol: 10,
              awakenings: 1,
              stageWake: 4,
              stageLight: 52,
              stageDeep: 20,
              stageRem: 24,
              hrvMeanRmssd: 52,
              spo2Mean: 96,
              spo2Min: 92,
              restingHeartRate: 58,
            },
            {
              id: 'session-3',
              date: '2025-02-24',
              startTime: '2025-02-23T22:45:00.000Z',
              endTime: '2025-02-24T06:30:00.000Z',
              source: 'health_connect',
              tst: 435,
              tib: 465,
              se: 93.5,
              waso: 10,
              sol: 8,
              awakenings: 1,
              stageWake: 3,
              stageLight: 54,
              stageDeep: 19,
              stageRem: 24,
              hrvMeanRmssd: 50,
              spo2Mean: 97,
              spo2Min: 94,
              restingHeartRate: 57,
            },
          ],
          total: 5,
          hasMore: true,
        },
      },
      // ========== Additional API mocks for 100% coverage ==========
      // Auth me endpoint (verify current user)
      {
        pattern: '**/auth/me',
        response: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          telegramId: telegramUser.id,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          evolutionStage: 'owlet',
          xp: 150,
          level: 2,
        },
      },
      // Breathing history with pagination
      {
        pattern: '**/breathing/history*',
        response: {
          sessions: [
            {
              id: 'breathing-1',
              patternId: '478',
              patternName: '4-7-8 Дыхание',
              cycles: 3,
              duration: 180,
              completedAt: '2025-02-26T20:00:00.000Z',
              xpGained: 15,
            },
            {
              id: 'breathing-2',
              patternId: 'box',
              patternName: 'Квадратное дыхание',
              cycles: 4,
              duration: 240,
              completedAt: '2025-02-25T21:30:00.000Z',
              xpGained: 20,
            },
          ],
          hasMore: false,
        },
      },
      // Leaderboard weekly
      {
        pattern: '**/leaderboard/weekly',
        response: {
          entries: [
            {
              rank: 1,
              displayName: 'Мастер сна',
              isAnonymous: false,
              totalSessions: 50,
              totalMinutes: 500,
              streak: 15,
              evolutionStage: 'wise_owl',
              isCurrentUser: false,
            },
            {
              rank: 2,
              displayName: telegramUser.first_name,
              isAnonymous: false,
              totalSessions: 10,
              totalMinutes: 25,
              streak: 3,
              evolutionStage: 'owlet',
              isCurrentUser: true,
            },
          ],
          settings: {
            isOptedIn: true,
            showAnonymously: false,
          },
        },
      },
      // Leaderboard opt-in
      {
        pattern: '**/leaderboard/opt-in',
        status: 200,
        response: { success: true },
      },
      // Leaderboard opt-out
      {
        pattern: '**/leaderboard/opt-out',
        status: 200,
        response: { success: true },
      },
      // User badges
      {
        pattern: '**/user/badges',
        response: {
          badges: ['first_session', 'week_streak'],
        },
      },
      // Sync push (offline changes)
      {
        pattern: '**/sync/push',
        status: 200,
        response: {
          results: [],
          serverTime: Date.now(),
        },
      },
      // Sync changes (pull server changes)
      {
        pattern: '**/sync/changes*',
        response: {
          changes: [],
          serverTime: Date.now(),
        },
      },
      // GDPR data deletion
      {
        pattern: '**/user/data',
        status: 200,
        response: {
          deleted: true,
          message: 'All user data deleted successfully',
        },
      },
      // Health check
      {
        pattern: '**/health',
        response: {
          status: 'healthy',
          version: '1.0.0',
          uptime: 3600,
          checks: {
            database: 'ok',
            initialized: true,
          },
          timestamp: Date.now(),
        },
      },
      // Liveness check
      {
        pattern: '**/health/live',
        response: {
          status: 'ok',
        },
      },
    ];

    for (const mock of defaultMocks) {
      await page.route(mock.pattern, async (route) => {
        const request = route.request();
        let body: unknown = null;
        try {
          body = request.postDataJSON();
        } catch {
          body = request.postData();
        }

        capturedRequests.push({
          url: request.url(),
          method: request.method(),
          body,
          timestamp: Date.now(),
        });

        await route.fulfill({
          status: mock.status ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(mock.response),
        });
      });
    }

    // Add E2E helpers that work with @twa-dev/sdk internal state
    await page.addInitScript(() => {
      // E2E helpers - these access the SDK's internal event system
      (window as unknown as { __e2e_clickMainButton: () => void }).__e2e_clickMainButton = () => {
        // The SDK registers a receiver for 'main_button_pressed' event
        const receiver = (window as unknown as { TelegramGameProxy_receiveEvent?: (type: string) => void }).TelegramGameProxy_receiveEvent;
        if (receiver) {
          console.log('[E2E] Triggering main_button_pressed via TelegramGameProxy_receiveEvent');
          receiver('main_button_pressed');
        } else {
          // Fallback: try to access MainButton callback directly
          const tg = (window as unknown as { Telegram?: { WebApp?: { MainButton?: { _callback?: () => void } } } }).Telegram;
          if (tg?.WebApp?.MainButton?._callback) {
            console.log('[E2E] Triggering MainButton via direct callback');
            tg.WebApp.MainButton._callback();
          } else {
            console.warn('[E2E] Cannot trigger MainButton - no receiver or callback found');
          }
        }
      };

      (window as unknown as { __e2e_clickBackButton: () => void }).__e2e_clickBackButton = () => {
        const receiver = (window as unknown as { TelegramGameProxy_receiveEvent?: (type: string) => void }).TelegramGameProxy_receiveEvent;
        if (receiver) {
          console.log('[E2E] Triggering back_button_pressed via TelegramGameProxy_receiveEvent');
          receiver('back_button_pressed');
        } else {
          const tg = (window as unknown as { Telegram?: { WebApp?: { BackButton?: { _callback?: () => void } } } }).Telegram;
          if (tg?.WebApp?.BackButton?._callback) {
            console.log('[E2E] Triggering BackButton via direct callback');
            tg.WebApp.BackButton._callback();
          } else {
            console.warn('[E2E] Cannot trigger BackButton - no receiver or callback found');
          }
        }
      };

      (window as unknown as { __e2e_getMainButtonState: () => { text: string; visible: boolean } }).__e2e_getMainButtonState = () => {
        const tg = (window as unknown as { Telegram?: { WebApp?: { MainButton?: { text: string; isVisible: boolean } } } }).Telegram;
        return {
          text: tg?.WebApp?.MainButton?.text || '',
          visible: tg?.WebApp?.MainButton?.isVisible || false,
        };
      };

      (window as unknown as { __e2e_getTelegramState: () => unknown }).__e2e_getTelegramState = () => {
        const tg = (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram;
        if (!tg?.WebApp) return { error: 'Telegram.WebApp not found' };

        const webApp = tg.WebApp as {
          initData?: string;
          initDataUnsafe?: { user?: unknown };
          version?: string;
          platform?: string;
        };

        return {
          hasWebApp: true,
          initData: webApp.initData?.substring(0, 100) || 'EMPTY',
          initDataUnsafeUser: webApp.initDataUnsafe?.user,
          version: webApp.version,
          platform: webApp.platform,
        };
      };
    });

    // Override page.goto to automatically add Telegram hash
    const originalGoto = page.goto.bind(page);
    page.goto = async (url: string, options?) => {
      // If URL doesn't have a hash and is a relative path, add Telegram hash
      if (!url.includes('#') && (url.startsWith('/') || !url.includes('://'))) {
        url = `${url}#${telegramHash}`;
        console.log('[E2E] Added Telegram hash to URL:', url.substring(0, 100));
      }
      return originalGoto(url, options);
    };

    // Use the page
    await use(page);
  },
});

export { expect } from '@playwright/test';
