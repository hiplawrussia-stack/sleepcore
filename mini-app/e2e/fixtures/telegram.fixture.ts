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
 * Injects Telegram WebApp mock into the page
 */
async function injectTelegramMock(
  page: Page,
  user: MockTelegramUser = DEFAULT_USER,
  theme: MockThemeParams = DEFAULT_THEME
): Promise<void> {
  const initData = generateMockInitData(user);

  await page.addInitScript(({ initData, user, theme }) => {
    // Track MainButton state
    let mainButtonText = '';
    let mainButtonVisible = false;
    let mainButtonCallback: (() => void) | null = null;

    // Track BackButton state
    let backButtonVisible = false;
    let backButtonCallback: (() => void) | null = null;

    // Create mock WebApp object
    const mockWebApp = {
      // Basic info
      initData,
      initDataUnsafe: {
        user,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'test_hash',
      },
      version: '7.0',
      platform: 'tdesktop',
      colorScheme: 'dark' as const,
      themeParams: theme,
      isExpanded: true,
      viewportHeight: window.innerHeight,
      viewportStableHeight: window.innerHeight,
      headerColor: theme.bg_color,
      backgroundColor: theme.bg_color,

      // Ready state
      isReady: false,
      ready: function () {
        this.isReady = true;
        console.log('[TelegramMock] WebApp ready');
      },

      // Expand
      expand: function () {
        this.isExpanded = true;
        console.log('[TelegramMock] WebApp expanded');
      },

      // Close
      close: function () {
        console.log('[TelegramMock] WebApp close requested');
      },

      // MainButton
      MainButton: {
        text: '',
        color: theme.button_color,
        textColor: theme.button_text_color,
        isVisible: false,
        isActive: true,
        isProgressVisible: false,

        setText: function (text: string) {
          this.text = text;
          mainButtonText = text;
          console.log('[TelegramMock] MainButton text:', text);
          return this;
        },
        onClick: function (callback: () => void) {
          mainButtonCallback = callback;
          console.log('[TelegramMock] MainButton onClick registered');
          return this;
        },
        offClick: function (_callback: () => void) {
          mainButtonCallback = null;
          return this;
        },
        show: function () {
          this.isVisible = true;
          mainButtonVisible = true;
          console.log('[TelegramMock] MainButton shown:', mainButtonText);
          return this;
        },
        hide: function () {
          this.isVisible = false;
          mainButtonVisible = false;
          console.log('[TelegramMock] MainButton hidden');
          return this;
        },
        enable: function () {
          this.isActive = true;
          return this;
        },
        disable: function () {
          this.isActive = false;
          return this;
        },
        showProgress: function () {
          this.isProgressVisible = true;
          return this;
        },
        hideProgress: function () {
          this.isProgressVisible = false;
          return this;
        },
        setParams: function (params: { text?: string; color?: string; text_color?: string }) {
          if (params.text) this.setText(params.text);
          if (params.color) this.color = params.color;
          if (params.text_color) this.textColor = params.text_color;
          return this;
        },
      },

      // BackButton
      BackButton: {
        isVisible: false,
        onClick: function (callback: () => void) {
          backButtonCallback = callback;
          console.log('[TelegramMock] BackButton onClick registered');
          return this;
        },
        offClick: function (_callback: () => void) {
          backButtonCallback = null;
          return this;
        },
        show: function () {
          this.isVisible = true;
          backButtonVisible = true;
          console.log('[TelegramMock] BackButton shown');
          return this;
        },
        hide: function () {
          this.isVisible = false;
          backButtonVisible = false;
          console.log('[TelegramMock] BackButton hidden');
          return this;
        },
      },

      // Haptic feedback (mock)
      HapticFeedback: {
        impactOccurred: function (style: string) {
          console.log('[TelegramMock] Haptic impact:', style);
          return this;
        },
        notificationOccurred: function (type: string) {
          console.log('[TelegramMock] Haptic notification:', type);
          return this;
        },
        selectionChanged: function () {
          console.log('[TelegramMock] Haptic selection');
          return this;
        },
      },

      // Cloud storage (mock)
      CloudStorage: {
        setItem: function (key: string, value: string, callback?: (error: Error | null, success: boolean) => void) {
          try {
            localStorage.setItem(`tg_cloud_${key}`, value);
            callback?.(null, true);
          } catch (e) {
            callback?.(e as Error, false);
          }
        },
        getItem: function (key: string, callback: (error: Error | null, value: string | null) => void) {
          try {
            const value = localStorage.getItem(`tg_cloud_${key}`);
            callback(null, value);
          } catch (e) {
            callback(e as Error, null);
          }
        },
        getItems: function (keys: string[], callback: (error: Error | null, values: Record<string, string>) => void) {
          try {
            const values: Record<string, string> = {};
            keys.forEach(key => {
              const value = localStorage.getItem(`tg_cloud_${key}`);
              if (value) values[key] = value;
            });
            callback(null, values);
          } catch (e) {
            callback(e as Error, {});
          }
        },
        removeItem: function (key: string, callback?: (error: Error | null, success: boolean) => void) {
          try {
            localStorage.removeItem(`tg_cloud_${key}`);
            callback?.(null, true);
          } catch (e) {
            callback?.(e as Error, false);
          }
        },
        getKeys: function (callback: (error: Error | null, keys: string[]) => void) {
          try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith('tg_cloud_')) {
                keys.push(key.replace('tg_cloud_', ''));
              }
            }
            callback(null, keys);
          } catch (e) {
            callback(e as Error, []);
          }
        },
      },

      // Event handlers
      onEvent: function (eventType: string, callback: () => void) {
        console.log('[TelegramMock] Event registered:', eventType);
        document.addEventListener(`telegram:${eventType}`, callback);
      },
      offEvent: function (eventType: string, callback: () => void) {
        document.removeEventListener(`telegram:${eventType}`, callback);
      },

      // Request write access
      requestWriteAccess: function (callback?: (access: boolean) => void) {
        callback?.(true);
      },

      // Request contact
      requestContact: function (callback?: (contact: unknown) => void) {
        callback?.(null);
      },

      // Open link
      openLink: function (url: string, options?: { try_instant_view?: boolean }) {
        console.log('[TelegramMock] Open link:', url, options);
      },

      // Open Telegram link
      openTelegramLink: function (url: string) {
        console.log('[TelegramMock] Open Telegram link:', url);
      },

      // Show popup
      showPopup: function (params: { message: string }, callback?: (buttonId: string) => void) {
        console.log('[TelegramMock] Show popup:', params.message);
        callback?.('ok');
      },

      // Show alert
      showAlert: function (message: string, callback?: () => void) {
        console.log('[TelegramMock] Show alert:', message);
        callback?.();
      },

      // Show confirm
      showConfirm: function (message: string, callback?: (confirmed: boolean) => void) {
        console.log('[TelegramMock] Show confirm:', message);
        callback?.(true);
      },

      // Set header color
      setHeaderColor: function (color: string) {
        this.headerColor = color;
      },

      // Set background color
      setBackgroundColor: function (color: string) {
        this.backgroundColor = color;
      },

      // Enable/disable closing confirmation
      enableClosingConfirmation: function () {
        console.log('[TelegramMock] Closing confirmation enabled');
      },
      disableClosingConfirmation: function () {
        console.log('[TelegramMock] Closing confirmation disabled');
      },
    };

    // Expose to window
    (window as unknown as { Telegram: { WebApp: typeof mockWebApp } }).Telegram = {
      WebApp: mockWebApp,
    };

    // Expose helper functions for E2E tests
    (window as unknown as { __e2e_clickMainButton: () => void }).__e2e_clickMainButton = () => {
      if (mainButtonVisible && mainButtonCallback) {
        mainButtonCallback();
      }
    };

    (window as unknown as { __e2e_clickBackButton: () => void }).__e2e_clickBackButton = () => {
      if (backButtonVisible && backButtonCallback) {
        backButtonCallback();
      }
    };

    (window as unknown as { __e2e_getMainButtonState: () => { text: string; visible: boolean } }).__e2e_getMainButtonState = () => ({
      text: mainButtonText,
      visible: mainButtonVisible,
    });

    console.log('[TelegramMock] Injected successfully');
  }, { initData, user, theme });
}

/**
 * Extended test fixture with Telegram mock
 */
export const test = base.extend<{
  telegramPage: Page;
  telegramUser: MockTelegramUser;
}>({
  telegramUser: [DEFAULT_USER, { option: true }],

  // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture, not React hook
  telegramPage: async ({ page, telegramUser }, use) => {
    // Inject mock before navigation
    await injectTelegramMock(page, telegramUser);

    // Use the page
    await use(page);
  },
});

export { expect } from '@playwright/test';
