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
 * Strategy: Mock the FULL window.Telegram.WebApp BEFORE the SDK loads.
 * The @twa-dev/sdk will use our mock instead of trying to connect to Telegram.
 */
async function injectTelegramMock(
  page: Page,
  user: MockTelegramUser = DEFAULT_USER,
  theme: MockThemeParams = DEFAULT_THEME
): Promise<void> {
  const initData = generateMockInitData(user);

  // Inject COMPLETE Telegram WebApp mock BEFORE any scripts load
  await page.addInitScript(({ initData, user, theme }) => {
    // Event system for SDK event handling
    const eventListeners: Record<string, Array<(...args: unknown[]) => void>> = {};

    const addEventListener = (event: string, callback: (...args: unknown[]) => void) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(callback);
      console.log('[TelegramMock] Event listener added:', event, 'total:', eventListeners[event].length);
    };

    const removeEventListener = (event: string, callback: (...args: unknown[]) => void) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
      }
    };

    const dispatchEvent = (event: string, ...args: unknown[]) => {
      console.log('[TelegramMock] Dispatching event:', event, 'listeners:', eventListeners[event]?.length ?? 0);
      if (eventListeners[event]) {
        eventListeners[event].forEach(cb => {
          try {
            cb(...args);
          } catch (e) {
            console.error('[TelegramMock] Event handler error:', e);
          }
        });
      }
    };

    // Track button callbacks for E2E testing (legacy, might still be used)
    let mainButtonCallback: (() => void) | null = null;
    let backButtonCallback: (() => void) | null = null;

    // Create MainButton mock
    const MainButton = {
      text: '',
      color: theme.button_color,
      textColor: theme.button_text_color,
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText(text: string) {
        this.text = text;
        console.log('[TelegramMock] MainButton.setText:', text);
        return this;
      },
      onClick(cb: () => void) {
        mainButtonCallback = cb;
        console.log('[TelegramMock] MainButton.onClick registered');
        return this;
      },
      offClick(cb?: () => void) {
        if (!cb || mainButtonCallback === cb) {
          mainButtonCallback = null;
        }
        return this;
      },
      show() {
        this.isVisible = true;
        console.log('[TelegramMock] MainButton.show()');
        return this;
      },
      hide() {
        this.isVisible = false;
        return this;
      },
      enable() {
        this.isActive = true;
        return this;
      },
      disable() {
        this.isActive = false;
        return this;
      },
      showProgress(leaveActive?: boolean) {
        this.isProgressVisible = true;
        if (!leaveActive) this.isActive = false;
        return this;
      },
      hideProgress() {
        this.isProgressVisible = false;
        this.isActive = true;
        return this;
      },
      setParams(params: Record<string, unknown>) {
        Object.assign(this, params);
        return this;
      },
    };

    // Create BackButton mock
    const BackButton = {
      isVisible: false,
      onClick(cb: () => void) {
        backButtonCallback = cb;
        console.log('[TelegramMock] BackButton.onClick registered');
        return this;
      },
      offClick(cb?: () => void) {
        if (!cb || backButtonCallback === cb) {
          backButtonCallback = null;
        }
        return this;
      },
      show() {
        this.isVisible = true;
        return this;
      },
      hide() {
        this.isVisible = false;
        return this;
      },
    };

    // Create HapticFeedback mock
    const HapticFeedback = {
      impactOccurred(style: string) {
        console.log('[TelegramMock] HapticFeedback.impactOccurred:', style);
        return this;
      },
      notificationOccurred(type: string) {
        console.log('[TelegramMock] HapticFeedback.notificationOccurred:', type);
        return this;
      },
      selectionChanged() {
        console.log('[TelegramMock] HapticFeedback.selectionChanged');
        return this;
      },
    };

    // Create CloudStorage mock
    const CloudStorage = {
      _data: {} as Record<string, string>,
      setItem(key: string, value: string, callback?: (error: Error | null) => void) {
        this._data[key] = value;
        callback?.(null);
      },
      getItem(key: string, callback?: (error: Error | null, value?: string) => void) {
        callback?.(null, this._data[key]);
      },
      getItems(keys: string[], callback?: (error: Error | null, values?: Record<string, string>) => void) {
        const result: Record<string, string> = {};
        keys.forEach(k => { if (this._data[k]) result[k] = this._data[k]; });
        callback?.(null, result);
      },
      removeItem(key: string, callback?: (error: Error | null) => void) {
        delete this._data[key];
        callback?.(null);
      },
      removeItems(keys: string[], callback?: (error: Error | null) => void) {
        keys.forEach(k => delete this._data[k]);
        callback?.(null);
      },
      getKeys(callback?: (error: Error | null, keys?: string[]) => void) {
        callback?.(null, Object.keys(this._data));
      },
    };

    // Full WebApp mock
    const WebApp = {
      initData: initData,
      initDataUnsafe: {
        user: user,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'test_hash_for_e2e',
        query_id: 'test_query_id',
      },
      version: '7.0',
      platform: 'tdesktop',
      colorScheme: 'dark' as const,
      themeParams: theme,
      isExpanded: true,
      viewportHeight: 800,
      viewportStableHeight: 800,
      headerColor: '#1e293b',
      backgroundColor: '#0f172a',
      isClosingConfirmationEnabled: false,
      MainButton,
      BackButton,
      HapticFeedback,
      CloudStorage,
      ready() { console.log('[TelegramMock] WebApp.ready()'); },
      expand() { console.log('[TelegramMock] WebApp.expand()'); },
      close() { console.log('[TelegramMock] WebApp.close()'); },
      enableClosingConfirmation() { this.isClosingConfirmationEnabled = true; },
      disableClosingConfirmation() { this.isClosingConfirmationEnabled = false; },
      setHeaderColor(color: string) { this.headerColor = color; },
      setBackgroundColor(color: string) { this.backgroundColor = color; },
      showAlert(message: string, callback?: () => void) {
        console.log('[TelegramMock] showAlert:', message);
        callback?.();
      },
      showConfirm(message: string, callback?: (ok: boolean) => void) {
        console.log('[TelegramMock] showConfirm:', message);
        callback?.(true);
      },
      showPopup(params: unknown, callback?: (buttonId: string) => void) {
        console.log('[TelegramMock] showPopup:', params);
        callback?.('ok');
      },
      openLink(url: string) { console.log('[TelegramMock] openLink:', url); },
      openTelegramLink(url: string) { console.log('[TelegramMock] openTelegramLink:', url); },
      sendData(data: string) { console.log('[TelegramMock] sendData:', data); },
      onEvent(event: string, callback: (...args: unknown[]) => void) {
        console.log('[TelegramMock] onEvent:', event);
        addEventListener(event, callback);
      },
      offEvent(event: string, callback: (...args: unknown[]) => void) {
        console.log('[TelegramMock] offEvent:', event);
        removeEventListener(event, callback);
      },
      isVersionAtLeast(version: string) { return true; },
    };

    // WebView event handlers (SDK uses these for receiving events from Telegram)
    const webViewEventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

    const receiveWebViewEvent = (eventType: string, eventData?: unknown) => {
      console.log('[TelegramMock] receiveWebViewEvent:', eventType, eventData);
      if (webViewEventHandlers[eventType]) {
        webViewEventHandlers[eventType].forEach(cb => {
          try {
            cb(eventData);
          } catch (e) {
            console.error('[TelegramMock] WebView event handler error:', e);
          }
        });
      }
    };

    const onWebViewEvent = (eventType: string, callback: (...args: unknown[]) => void) => {
      if (!webViewEventHandlers[eventType]) {
        webViewEventHandlers[eventType] = [];
      }
      webViewEventHandlers[eventType].push(callback);
      console.log('[TelegramMock] onWebViewEvent:', eventType, 'total:', webViewEventHandlers[eventType].length);
    };

    const offWebViewEvent = (eventType: string, callback: (...args: unknown[]) => void) => {
      if (webViewEventHandlers[eventType]) {
        webViewEventHandlers[eventType] = webViewEventHandlers[eventType].filter(cb => cb !== callback);
      }
    };

    // Create WebView mock (SDK uses this for receiving events from Telegram)
    const WebView = {
      receiveEvent: (eventType: string, eventData?: unknown) => {
        console.log('[TelegramMock] WebView.receiveEvent:', eventType, eventData);
        receiveWebViewEvent(eventType, eventData);
      },
      onEvent: onWebViewEvent,
      offEvent: offWebViewEvent,
      postEvent: (eventType: string, callback?: () => void, eventData?: string) => {
        console.log('[TelegramMock] WebView.postEvent:', eventType);
        callback?.();
      },
    };

    // Install mock on window.Telegram (both WebApp and WebView)
    (window as unknown as { Telegram: { WebApp: typeof WebApp; WebView: typeof WebView } }).Telegram = { WebApp, WebView };

    // Also set TelegramGameProxy_receiveEvent for compatibility
    (window as unknown as { TelegramGameProxy_receiveEvent: typeof receiveWebViewEvent }).TelegramGameProxy_receiveEvent = receiveWebViewEvent;

    // Mock TelegramWebviewProxy for postEvent - the SDK uses this for communication
    (window as unknown as { TelegramWebviewProxy: { postEvent: (eventType: string, eventData: string) => void } }).TelegramWebviewProxy = {
      postEvent: (eventType: string, eventData: string) => {
        console.log('[TelegramMock] postEvent:', eventType, eventData);

        // Parse postEvent calls to sync MainButton state
        if (eventType === 'web_app_setup_main_button') {
          try {
            const data = JSON.parse(eventData);
            MainButton.isVisible = data.is_visible ?? MainButton.isVisible;
            MainButton.text = data.text ?? MainButton.text;
            MainButton.isActive = data.is_active ?? MainButton.isActive;
            MainButton.isProgressVisible = data.is_progress_visible ?? MainButton.isProgressVisible;
            console.log('[TelegramMock] MainButton synced:', { text: MainButton.text, visible: MainButton.isVisible });
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Handle main button click registration via postEvent
        if (eventType === 'web_app_setup_main_button') {
          // The SDK registers click handlers via onClick method, which we already intercept
        }
      },
    };

    // E2E helper functions - exposed globally for Playwright
    (window as unknown as { __e2e_clickMainButton: () => void }).__e2e_clickMainButton = () => {
      if (MainButton.isVisible) {
        console.log('[TelegramMock] E2E: Clicking MainButton');
        // The SDK exposes its internal receiveEvent as TelegramGameProxy_receiveEvent
        // This is how native Telegram sends events to the WebApp
        const sdkReceive = (window as unknown as { TelegramGameProxy_receiveEvent?: (type: string, data?: unknown) => void }).TelegramGameProxy_receiveEvent;
        if (sdkReceive) {
          console.log('[TelegramMock] E2E: Using SDK TelegramGameProxy_receiveEvent');
          sdkReceive('main_button_pressed');
        } else {
          // Fallback to our mock's event system
          console.log('[TelegramMock] E2E: Using mock receiveWebViewEvent');
          receiveWebViewEvent('mainButtonClicked');
        }
        // Also try via WebApp.onEvent listeners
        dispatchEvent('main_button_pressed');
        // Also call legacy callback if registered
        if (mainButtonCallback) {
          mainButtonCallback();
        }
      } else {
        console.log('[TelegramMock] E2E: MainButton not clickable:', {
          isVisible: MainButton.isVisible,
          hasCallback: !!mainButtonCallback,
          webViewListeners: webViewEventHandlers['mainButtonClicked']?.length ?? 0
        });
      }
    };

    (window as unknown as { __e2e_clickBackButton: () => void }).__e2e_clickBackButton = () => {
      if (BackButton.isVisible) {
        console.log('[TelegramMock] E2E: Clicking BackButton');
        // The SDK exposes its internal receiveEvent as TelegramGameProxy_receiveEvent
        const sdkReceive = (window as unknown as { TelegramGameProxy_receiveEvent?: (type: string, data?: unknown) => void }).TelegramGameProxy_receiveEvent;
        if (sdkReceive) {
          console.log('[TelegramMock] E2E: Using SDK TelegramGameProxy_receiveEvent');
          sdkReceive('back_button_pressed');
        } else {
          // Fallback to our mock's event system
          console.log('[TelegramMock] E2E: Using mock receiveWebViewEvent');
          receiveWebViewEvent('backButtonClicked');
        }
        // Also try via WebApp.onEvent listeners
        dispatchEvent('back_button_pressed');
        // Also call legacy callback if registered
        if (backButtonCallback) {
          backButtonCallback();
        }
      } else {
        console.log('[TelegramMock] E2E: BackButton not visible');
      }
    };

    (window as unknown as { __e2e_getMainButtonState: () => { text: string; visible: boolean } }).__e2e_getMainButtonState = () => ({
      text: MainButton.text,
      visible: MainButton.isVisible,
    });

    console.log('[TelegramMock] Full WebApp mock installed, user:', user.first_name);
  }, { initData, user, theme });
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
    // Set language in localStorage BEFORE navigation to ensure i18n uses Russian
    // This is needed because i18n might initialize before Telegram mock is fully read
    await page.addInitScript(({ languageCode }) => {
      localStorage.setItem('sleepcore_language', languageCode);
    }, { languageCode: telegramUser.language_code || 'ru' });

    // Inject COMPLETE Telegram WebApp mock BEFORE navigation
    // This ensures SDK uses our mock from the start
    await injectTelegramMock(page, telegramUser);

    // Use the page
    await use(page);
  },
});

export { expect } from '@playwright/test';
