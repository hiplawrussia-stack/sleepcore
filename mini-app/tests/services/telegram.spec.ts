/**
 * Telegram Service Tests
 * ======================
 * Unit tests for Telegram Mini App SDK wrapper service.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: INT-001 (Telegram integration)
 *
 * Coverage targets:
 * - Initialization flow
 * - User data retrieval
 * - UI controls (MainButton, BackButton)
 * - Dialogs (alert, confirm, popup)
 * - Theme handling
 * - Platform detection
 * - Cloud storage operations
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebApp SDK before import - all functions defined inline
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'mock-init-data',
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
        photo_url: 'https://example.com/photo.jpg',
        is_premium: true,
      },
      auth_date: Math.floor(Date.now() / 1000),
    },
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    MainButton: {
      setText: vi.fn(),
      onClick: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      showProgress: vi.fn(),
      hideProgress: vi.fn(),
    },
    BackButton: {
      onClick: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    },
    CloudStorage: {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    },
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    showPopup: vi.fn(),
    colorScheme: 'dark',
    themeParams: {
      bgColor: '#0f172a',
      textColor: '#f8fafc',
    },
    onEvent: vi.fn(),
    platform: 'ios',
    viewportHeight: 700,
    viewportStableHeight: 680,
    sendData: vi.fn(),
    close: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
  },
}));

// Import after mock
import { telegram } from '../../src/services/telegram';
import WebApp from '@twa-dev/sdk';

// Get typed references to mocked functions
const mockMainButton = WebApp.MainButton as {
  setText: ReturnType<typeof vi.fn>;
  onClick: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  showProgress: ReturnType<typeof vi.fn>;
  hideProgress: ReturnType<typeof vi.fn>;
};

const mockBackButton = WebApp.BackButton as {
  onClick: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
};

const mockCloudStorage = WebApp.CloudStorage as {
  setItem: ReturnType<typeof vi.fn>;
  getItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

describe('TelegramService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize WebApp on init()', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      telegram.init();

      expect(WebApp.ready).toHaveBeenCalled();
      expect(WebApp.expand).toHaveBeenCalled();
      expect(WebApp.setHeaderColor).toHaveBeenCalledWith('#1e293b');
      expect(WebApp.setBackgroundColor).toHaveBeenCalledWith('#0f172a');
      expect(WebApp.enableClosingConfirmation).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[TelegramService] Initialized successfully');

      consoleSpy.mockRestore();
    });

    it('should not reinitialize if already initialized', () => {
      telegram.init();
      vi.clearAllMocks();

      telegram.init();

      // Should not call ready() again
      expect(WebApp.ready).not.toHaveBeenCalled();
    });
  });

  describe('isInTelegram', () => {
    it('should return true when initData is present', () => {
      expect(telegram.isInTelegram()).toBe(true);
    });
  });

  describe('User Data', () => {
    it('should return user data from initDataUnsafe', () => {
      const user = telegram.getUser();

      expect(user).toEqual({
        id: 123456789,
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        languageCode: 'en',
        photoUrl: 'https://example.com/photo.jpg',
        isPremium: true,
      });
    });

    it('should return initData string', () => {
      const initData = telegram.getInitData();

      expect(initData).toBe('mock-init-data');
    });

    it('should return initDataUnsafe', () => {
      const initDataUnsafe = telegram.getInitDataUnsafe();

      expect(initDataUnsafe?.user?.id).toBe(123456789);
    });
  });

  describe('Main Button', () => {
    it('should show main button with text and callback', () => {
      const onClick = vi.fn();

      telegram.showMainButton('Start', onClick);

      expect(mockMainButton.setText).toHaveBeenCalledWith('Start');
      expect(mockMainButton.onClick).toHaveBeenCalledWith(onClick);
      expect(mockMainButton.show).toHaveBeenCalled();
    });

    it('should hide main button', () => {
      telegram.hideMainButton();

      expect(mockMainButton.hide).toHaveBeenCalled();
    });

    it('should set main button loading state to true', () => {
      telegram.setMainButtonLoading(true);

      expect(mockMainButton.showProgress).toHaveBeenCalled();
    });

    it('should set main button loading state to false', () => {
      telegram.setMainButtonLoading(false);

      expect(mockMainButton.hideProgress).toHaveBeenCalled();
    });

    it('should update main button text', () => {
      telegram.updateMainButtonText('New Text');

      expect(mockMainButton.setText).toHaveBeenCalledWith('New Text');
    });
  });

  describe('Back Button', () => {
    it('should show back button with callback', () => {
      const onClick = vi.fn();

      telegram.showBackButton(onClick);

      expect(mockBackButton.onClick).toHaveBeenCalledWith(onClick);
      expect(mockBackButton.show).toHaveBeenCalled();
    });

    it('should hide back button', () => {
      telegram.hideBackButton();

      expect(mockBackButton.hide).toHaveBeenCalled();
    });
  });

  describe('Dialogs', () => {
    it('should show alert and resolve when closed', async () => {
      (WebApp.showAlert as ReturnType<typeof vi.fn>).mockImplementation(
        (message: string, callback: () => void) => {
          callback();
        }
      );

      await telegram.showAlert('Test message');

      expect(WebApp.showAlert).toHaveBeenCalledWith('Test message', expect.any(Function));
    });

    it('should show confirm and resolve with true when confirmed', async () => {
      (WebApp.showConfirm as ReturnType<typeof vi.fn>).mockImplementation(
        (message: string, callback: (confirmed: boolean) => void) => {
          callback(true);
        }
      );

      const result = await telegram.showConfirm('Confirm?');

      expect(result).toBe(true);
      expect(WebApp.showConfirm).toHaveBeenCalledWith('Confirm?', expect.any(Function));
    });

    it('should show confirm and resolve with false when cancelled', async () => {
      (WebApp.showConfirm as ReturnType<typeof vi.fn>).mockImplementation(
        (message: string, callback: (confirmed: boolean) => void) => {
          callback(false);
        }
      );

      const result = await telegram.showConfirm('Cancel?');

      expect(result).toBe(false);
    });

    it('should show popup and resolve with button id', async () => {
      (WebApp.showPopup as ReturnType<typeof vi.fn>).mockImplementation(
        (params: unknown, callback: (buttonId: string) => void) => {
          callback('ok');
        }
      );

      const result = await telegram.showPopup({
        title: 'Title',
        message: 'Message',
        buttons: [{ type: 'ok' }],
      });

      expect(result).toBe('ok');
    });

    it('should resolve with "close" when popup callback has no button id', async () => {
      (WebApp.showPopup as ReturnType<typeof vi.fn>).mockImplementation(
        (params: unknown, callback: (buttonId: string | null) => void) => {
          callback(null);
        }
      );

      const result = await telegram.showPopup({
        message: 'Message',
      });

      expect(result).toBe('close');
    });
  });

  describe('Theme', () => {
    it('should return color scheme', () => {
      const colorScheme = telegram.getColorScheme();

      expect(colorScheme).toBe('dark');
    });

    it('should return theme params', () => {
      const themeParams = telegram.getThemeParams();

      expect(themeParams).toEqual({
        bgColor: '#0f172a',
        textColor: '#f8fafc',
      });
    });

    it('should register theme change callback', () => {
      const callback = vi.fn();

      telegram.onThemeChange(callback);

      expect(WebApp.onEvent).toHaveBeenCalledWith('themeChanged', callback);
    });
  });

  describe('Platform Detection', () => {
    it('should return platform name', () => {
      expect(telegram.getPlatform()).toBe('ios');
    });

    it('should detect iOS platform', () => {
      expect(telegram.isIOS()).toBe(true);
    });

    it('should not detect Android when on iOS', () => {
      expect(telegram.isAndroid()).toBe(false);
    });

    it('should not detect desktop when on iOS', () => {
      expect(telegram.isDesktop()).toBe(false);
    });

    it('should return viewport height', () => {
      expect(telegram.getViewportHeight()).toBe(700);
    });

    it('should return stable viewport height', () => {
      expect(telegram.getViewportStableHeight()).toBe(680);
    });
  });

  describe('Data & Navigation', () => {
    it('should send data to bot', () => {
      telegram.sendData('test-data');

      expect(WebApp.sendData).toHaveBeenCalledWith('test-data');
    });

    it('should close mini app', () => {
      telegram.close();

      expect(WebApp.close).toHaveBeenCalled();
    });

    it('should open external link without options', () => {
      telegram.openLink('https://example.com');

      expect(WebApp.openLink).toHaveBeenCalledWith('https://example.com');
    });

    it('should open external link with instant view option', () => {
      telegram.openLink('https://example.com', { try_instant_view: true });

      expect(WebApp.openLink).toHaveBeenCalledWith('https://example.com', { try_instant_view: true });
    });

    it('should open Telegram link', () => {
      telegram.openTelegramLink('https://t.me/sleepcore_bot');

      expect(WebApp.openTelegramLink).toHaveBeenCalledWith('https://t.me/sleepcore_bot');
    });
  });

  describe('Cloud Storage', () => {
    it('should set storage item and resolve true on success', async () => {
      mockCloudStorage.setItem.mockImplementation(
        (key: string, value: string, callback: (error: Error | null) => void) => {
          callback(null);
        }
      );

      const result = await telegram.setStorageItem('key', 'value');

      expect(result).toBe(true);
      expect(mockCloudStorage.setItem).toHaveBeenCalledWith('key', 'value', expect.any(Function));
    });

    it('should set storage item and resolve false on error', async () => {
      mockCloudStorage.setItem.mockImplementation(
        (key: string, value: string, callback: (error: Error | null) => void) => {
          callback(new Error('Storage error'));
        }
      );

      const result = await telegram.setStorageItem('key', 'value');

      expect(result).toBe(false);
    });

    it('should get storage item and resolve value on success', async () => {
      mockCloudStorage.getItem.mockImplementation(
        (key: string, callback: (error: Error | null, value: string | null) => void) => {
          callback(null, 'stored-value');
        }
      );

      const result = await telegram.getStorageItem('key');

      expect(result).toBe('stored-value');
      expect(mockCloudStorage.getItem).toHaveBeenCalledWith('key', expect.any(Function));
    });

    it('should get storage item and resolve null on error', async () => {
      mockCloudStorage.getItem.mockImplementation(
        (key: string, callback: (error: Error | null, value: string | null) => void) => {
          callback(new Error('Storage error'), null);
        }
      );

      const result = await telegram.getStorageItem('key');

      expect(result).toBeNull();
    });

    it('should get storage item and resolve null for empty value', async () => {
      mockCloudStorage.getItem.mockImplementation(
        (key: string, callback: (error: Error | null, value: string | null) => void) => {
          callback(null, '');
        }
      );

      const result = await telegram.getStorageItem('key');

      expect(result).toBeNull();
    });

    it('should remove storage item and resolve true on success', async () => {
      mockCloudStorage.removeItem.mockImplementation(
        (key: string, callback: (error: Error | null) => void) => {
          callback(null);
        }
      );

      const result = await telegram.removeStorageItem('key');

      expect(result).toBe(true);
      expect(mockCloudStorage.removeItem).toHaveBeenCalledWith('key', expect.any(Function));
    });

    it('should remove storage item and resolve false on error', async () => {
      mockCloudStorage.removeItem.mockImplementation(
        (key: string, callback: (error: Error | null) => void) => {
          callback(new Error('Storage error'));
        }
      );

      const result = await telegram.removeStorageItem('key');

      expect(result).toBe(false);
    });
  });
});

describe('TelegramService - User Edge Cases', () => {
  it('should handle getUser when initDataUnsafe has no user', async () => {
    // Reset modules to get fresh instance
    vi.resetModules();

    // Mock with no user data
    vi.doMock('@twa-dev/sdk', () => ({
      default: {
        initData: '',
        initDataUnsafe: {},
        ready: vi.fn(),
        expand: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
        enableClosingConfirmation: vi.fn(),
        MainButton: {
          setText: vi.fn(),
          onClick: vi.fn(),
          show: vi.fn(),
          hide: vi.fn(),
          showProgress: vi.fn(),
          hideProgress: vi.fn(),
        },
        BackButton: {
          onClick: vi.fn(),
          show: vi.fn(),
          hide: vi.fn(),
        },
        CloudStorage: {
          setItem: vi.fn(),
          getItem: vi.fn(),
          removeItem: vi.fn(),
        },
        colorScheme: 'light',
        themeParams: {},
        platform: 'web',
        viewportHeight: 0,
        viewportStableHeight: 0,
      },
    }));

    // Import fresh instance
    const { telegram: freshTelegram } = await import('../../src/services/telegram');

    // Should return null for user
    expect(freshTelegram.getUser()).toBeNull();

    // Should return false for isInTelegram when no initData
    expect(freshTelegram.isInTelegram()).toBe(false);
  });
});
