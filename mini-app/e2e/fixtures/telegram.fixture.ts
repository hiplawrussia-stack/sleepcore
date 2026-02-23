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
 * Mock Telegram WebApp theme parameters
 */
export interface MockThemeParams {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
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
 * Default dark theme (matches Telegram dark mode)
 */
const DEFAULT_THEME: MockThemeParams = {
  bg_color: '#1c1c1e',
  text_color: '#ffffff',
  hint_color: '#98989e',
  link_color: '#007aff',
  button_color: '#007aff',
  button_text_color: '#ffffff',
  secondary_bg_color: '#2c2c2e',
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
 * Injects Telegram WebApp mock into the page.
 *
 * Strategy: The @twa-dev/sdk overwrites window.Telegram.WebApp when it loads.
 * Instead of fighting this, we:
 * 1. Inject initData BEFORE the SDK loads (so SDK parses it correctly)
 * 2. After page load, wrap the SDK's MainButton/BackButton to track state
 */
async function injectTelegramMock(
  page: Page,
  user: MockTelegramUser = DEFAULT_USER,
  theme: MockThemeParams = DEFAULT_THEME
): Promise<void> {
  const initData = generateMockInitData(user);

  // Step 1: Inject initData and user data BEFORE the page/SDK loads
  // This allows the SDK to parse initData correctly
  await page.addInitScript(({ initData, user }) => {
    // Create minimal Telegram object with initData
    // The SDK will check for initData to determine if running in Telegram
    (window as unknown as {
      __tg_initData: string;
      __tg_initDataUser: typeof user;
    }).__tg_initData = initData;
    (window as unknown as { __tg_initDataUser: typeof user }).__tg_initDataUser = user;

    // We need to mock the postEvent mechanism since we're not in Telegram
    // The SDK uses this to communicate with Telegram client
    (window as unknown as { TelegramWebviewProxy: { postEvent: (eventType: string, eventData: string) => void } }).TelegramWebviewProxy = {
      postEvent: (eventType: string, eventData: string) => {
        console.log('[TelegramMock] postEvent:', eventType, eventData);
      },
    };

    console.log('[TelegramMock] Pre-init data injected');
  }, { initData, user });

  // Step 2: After page loads, wrap the SDK's WebApp to track state
  // This is done via page.evaluate after navigation
}

/**
 * Wraps the Telegram WebApp SDK's MainButton/BackButton after page load
 * to enable E2E testing of button interactions
 */
async function wrapTelegramWebApp(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Wait a tick for SDK to initialize
    const checkAndWrap = () => {
      const webApp = (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp as {
        MainButton?: {
          text: string;
          isVisible: boolean;
          setText: (text: string) => unknown;
          onClick: (cb: () => void) => unknown;
          offClick: (cb: () => void) => unknown;
          show: () => unknown;
          hide: () => unknown;
        };
        BackButton?: {
          isVisible: boolean;
          onClick: (cb: () => void) => unknown;
          offClick: (cb: () => void) => unknown;
          show: () => unknown;
          hide: () => unknown;
        };
        initData?: string;
        initDataUnsafe?: { user?: unknown };
      } | undefined;

      if (!webApp) {
        console.log('[TelegramMock] WebApp not found, retrying...');
        setTimeout(checkAndWrap, 50);
        return;
      }

      // Track state for E2E helpers
      let mainButtonCallback: (() => void) | null = null;
      let backButtonCallback: (() => void) | null = null;

      // Store original methods
      const originalMainButton = webApp.MainButton;
      const originalBackButton = webApp.BackButton;

      if (originalMainButton) {
        const origOnClick = originalMainButton.onClick.bind(originalMainButton);
        const origOffClick = originalMainButton.offClick.bind(originalMainButton);

        originalMainButton.onClick = function(cb: () => void) {
          mainButtonCallback = cb;
          console.log('[TelegramMock] MainButton onClick registered');
          return origOnClick(cb);
        };

        originalMainButton.offClick = function(cb: () => void) {
          if (mainButtonCallback === cb) {
            mainButtonCallback = null;
          }
          return origOffClick(cb);
        };
      }

      if (originalBackButton) {
        const origOnClick = originalBackButton.onClick.bind(originalBackButton);
        const origOffClick = originalBackButton.offClick.bind(originalBackButton);

        originalBackButton.onClick = function(cb: () => void) {
          backButtonCallback = cb;
          console.log('[TelegramMock] BackButton onClick registered');
          return origOnClick(cb);
        };

        originalBackButton.offClick = function(cb: () => void) {
          if (backButtonCallback === cb) {
            backButtonCallback = null;
          }
          return origOffClick(cb);
        };
      }

      // E2E helper functions
      (window as unknown as { __e2e_clickMainButton: () => void }).__e2e_clickMainButton = () => {
        if (originalMainButton?.isVisible && mainButtonCallback) {
          console.log('[TelegramMock] Clicking MainButton');
          mainButtonCallback();
        } else {
          console.log('[TelegramMock] MainButton not clickable:', {
            isVisible: originalMainButton?.isVisible,
            hasCallback: !!mainButtonCallback
          });
        }
      };

      (window as unknown as { __e2e_clickBackButton: () => void }).__e2e_clickBackButton = () => {
        if (originalBackButton?.isVisible && backButtonCallback) {
          console.log('[TelegramMock] Clicking BackButton');
          backButtonCallback();
        }
      };

      (window as unknown as { __e2e_getMainButtonState: () => { text: string; visible: boolean } }).__e2e_getMainButtonState = () => ({
        text: originalMainButton?.text || '',
        visible: originalMainButton?.isVisible || false,
      });

      console.log('[TelegramMock] WebApp wrapped successfully');
    };

    // Start checking
    checkAndWrap();
  });
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
 * Extended test fixture with Telegram mock and API helpers
 */
export const test = base.extend<{
  telegramPage: Page;
  telegramUser: MockTelegramUser;
  /** Captured API requests for verification */
  capturedRequests: CapturedRequest[];
  /** Set up API mock with optional request capture */
  mockApi: (config: ApiMockConfig) => Promise<void>;
}>({
  telegramUser: [DEFAULT_USER, { option: true }],

  // Shared captured requests array
  capturedRequests: async ({}, use) => {
    const requests: CapturedRequest[] = [];
    await use(requests);
  },

  // API mocking helper
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture
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

  // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture, not React hook
  telegramPage: async ({ page, telegramUser }, use) => {
    // Inject mock data before navigation (for SDK to parse initData)
    await injectTelegramMock(page, telegramUser);

    // Intercept all navigations to wrap WebApp after load
    page.on('load', async () => {
      await wrapTelegramWebApp(page);
    });

    // Use the page
    await use(page);
  },
});

export { expect } from '@playwright/test';
