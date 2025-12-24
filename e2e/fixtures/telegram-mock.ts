/**
 * Telegram Mock Fixture
 * =====================
 * Mocks Telegram WebApp SDK for E2E testing.
 * Generates valid-looking initData for authentication.
 */

import { test as base, Page } from '@playwright/test';
import * as crypto from 'crypto';

// Test user data
export interface TestUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
}

// Default test user
export const defaultTestUser: TestUser = {
  id: 12345678,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  language_code: 'ru',
  is_premium: false,
};

/**
 * Generate mock initData for testing
 * Note: This won't pass real Telegram validation,
 * but our test API accepts it with a special test token
 */
export function generateMockInitData(user: TestUser): string {
  const authDate = Math.floor(Date.now() / 1000);

  const params = new URLSearchParams({
    user: JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium,
    }),
    auth_date: authDate.toString(),
    hash: generateMockHash(user, authDate),
  });

  return params.toString();
}

/**
 * Generate mock hash (for testing only)
 */
function generateMockHash(user: TestUser, authDate: number): string {
  const dataCheckString = [
    `auth_date=${authDate}`,
    `user=${JSON.stringify(user)}`,
  ].sort().join('\n');

  // Use a test secret for generating hash
  const secretKey = crypto.createHmac('sha256', 'WebAppData')
    .update('test:bot:token')
    .digest();

  return crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
}

/**
 * Inject Telegram WebApp mock into page
 */
export async function injectTelegramMock(page: Page, user: TestUser = defaultTestUser): Promise<void> {
  const initData = generateMockInitData(user);

  await page.addInitScript((data) => {
    const { initData, user } = data;

    // Mock Telegram WebApp
    (window as any).Telegram = {
      WebApp: {
        initData,
        initDataUnsafe: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            is_premium: user.is_premium,
          },
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'mock_hash',
        },
        version: '7.0',
        platform: 'web',
        colorScheme: 'dark',
        themeParams: {
          bg_color: '#1e293b',
          text_color: '#f1f5f9',
          hint_color: '#94a3b8',
          link_color: '#818cf8',
          button_color: '#6366f1',
          button_text_color: '#ffffff',
          secondary_bg_color: '#0f172a',
        },
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        isExpanded: true,

        // Methods
        ready: () => console.log('[Mock] WebApp.ready()'),
        expand: () => console.log('[Mock] WebApp.expand()'),
        close: () => console.log('[Mock] WebApp.close()'),
        setHeaderColor: (color: string) => console.log('[Mock] setHeaderColor:', color),
        setBackgroundColor: (color: string) => console.log('[Mock] setBackgroundColor:', color),
        enableClosingConfirmation: () => {},
        disableClosingConfirmation: () => {},
        onEvent: () => {},
        offEvent: () => {},

        // Main Button
        MainButton: {
          text: '',
          color: '#6366f1',
          textColor: '#ffffff',
          isVisible: false,
          isActive: true,
          isProgressVisible: false,
          setText: function(text: string) { this.text = text; },
          onClick: () => {},
          offClick: () => {},
          show: function() { this.isVisible = true; },
          hide: function() { this.isVisible = false; },
          enable: function() { this.isActive = true; },
          disable: function() { this.isActive = false; },
          showProgress: function() { this.isProgressVisible = true; },
          hideProgress: function() { this.isProgressVisible = false; },
        },

        // Back Button
        BackButton: {
          isVisible: false,
          onClick: () => {},
          offClick: () => {},
          show: function() { this.isVisible = true; },
          hide: function() { this.isVisible = false; },
        },

        // Haptic Feedback
        HapticFeedback: {
          impactOccurred: (style: string) => console.log('[Mock] Haptic impact:', style),
          notificationOccurred: (type: string) => console.log('[Mock] Haptic notification:', type),
          selectionChanged: () => console.log('[Mock] Haptic selection'),
        },

        // Cloud Storage (using localStorage)
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: any) => void) => {
            localStorage.setItem(`tg_cloud_${key}`, value);
            callback?.(null);
          },
          getItem: (key: string, callback?: (error: any, value?: string) => void) => {
            const value = localStorage.getItem(`tg_cloud_${key}`);
            callback?.(null, value || undefined);
          },
          removeItem: (key: string, callback?: (error: any) => void) => {
            localStorage.removeItem(`tg_cloud_${key}`);
            callback?.(null);
          },
          getItems: (keys: string[], callback?: (error: any, values?: Record<string, string>) => void) => {
            const values: Record<string, string> = {};
            keys.forEach(key => {
              const value = localStorage.getItem(`tg_cloud_${key}`);
              if (value) values[key] = value;
            });
            callback?.(null, values);
          },
          getKeys: (callback?: (error: any, keys?: string[]) => void) => {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith('tg_cloud_')) {
                keys.push(key.replace('tg_cloud_', ''));
              }
            }
            callback?.(null, keys);
          },
        },

        // Dialogs
        showAlert: (message: string, callback?: () => void) => {
          console.log('[Mock] Alert:', message);
          callback?.();
        },
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
          console.log('[Mock] Confirm:', message);
          callback?.(true);
        },
        showPopup: (params: any, callback?: (buttonId: string) => void) => {
          console.log('[Mock] Popup:', params);
          callback?.('ok');
        },

        // Navigation
        openLink: (url: string) => console.log('[Mock] openLink:', url),
        openTelegramLink: (url: string) => console.log('[Mock] openTelegramLink:', url),
        sendData: (data: string) => console.log('[Mock] sendData:', data),
      },
    };

    console.log('[E2E] Telegram WebApp mock injected');
  }, { initData, user });
}

// Extended test fixture with Telegram mock
export const test = base.extend<{ telegramPage: Page }>({
  telegramPage: async ({ page }, use) => {
    await injectTelegramMock(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
