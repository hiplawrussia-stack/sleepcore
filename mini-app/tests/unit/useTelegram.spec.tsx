/**
 * useTelegram Hook Tests
 * ======================
 * Unit tests for Telegram Mini App SDK React hook.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: INT-001 (Telegram integration)
 *
 * Coverage targets:
 * - Initial state setup
 * - Telegram SDK method delegation
 * - Theme change handling
 * - Callback stability
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Create mock values using vi.hoisted to avoid hoisting issues
const { mockUser, mockTelegram, mockThemeCallback } = vi.hoisted(() => {
  let themeChangeCallback: (() => void) | null = null;

  return {
    mockUser: {
      id: 123456789,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      languageCode: 'en',
      photoUrl: 'https://example.com/photo.jpg',
      isPremium: true,
    },
    mockThemeCallback: {
      set: (cb: () => void) => { themeChangeCallback = cb; },
      get: () => themeChangeCallback,
      call: () => { themeChangeCallback?.(); },
    },
    mockTelegram: {
      init: vi.fn(),
      getUser: vi.fn(),
      getColorScheme: vi.fn().mockReturnValue('dark'),
      getViewportHeight: vi.fn().mockReturnValue(700),
      onThemeChange: vi.fn(),
      isInTelegram: vi.fn().mockReturnValue(true),
      getPlatform: vi.fn().mockReturnValue('ios'),
      isIOS: vi.fn().mockReturnValue(true),
      isAndroid: vi.fn().mockReturnValue(false),
      isDesktop: vi.fn().mockReturnValue(false),
      // Performance detection (2025)
      getPerformanceClass: vi.fn().mockReturnValue('high'),
      shouldReduceAnimations: vi.fn().mockReturnValue(false),
      getAnimationDurationMultiplier: vi.fn().mockReturnValue(1.0),
      showMainButton: vi.fn(),
      hideMainButton: vi.fn(),
      showBackButton: vi.fn(),
      hideBackButton: vi.fn(),
      showAlert: vi.fn().mockResolvedValue(undefined),
      showConfirm: vi.fn().mockResolvedValue(true),
      openLink: vi.fn(),
      close: vi.fn(),
    },
  };
});

// Mock telegram service
vi.mock('../../src/services/telegram', () => ({
  telegram: mockTelegram,
}));

// Import after mocks
import { useTelegram } from '../../src/hooks/useTelegram';

describe('useTelegram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTelegram.getUser.mockReturnValue(mockUser);
    mockTelegram.getColorScheme.mockReturnValue('dark');
    mockTelegram.getViewportHeight.mockReturnValue(700);
    mockTelegram.onThemeChange.mockImplementation((cb: () => void) => {
      mockThemeCallback.set(cb);
    });
    // Re-set platform detection mocks after clearAllMocks
    mockTelegram.isInTelegram.mockReturnValue(true);
    mockTelegram.getPlatform.mockReturnValue('ios');
    mockTelegram.isIOS.mockReturnValue(true);
    mockTelegram.isAndroid.mockReturnValue(false);
    mockTelegram.isDesktop.mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize telegram SDK on mount', () => {
      renderHook(() => useTelegram());

      expect(mockTelegram.init).toHaveBeenCalled();
    });

    it('should get initial user data', () => {
      const { result } = renderHook(() => useTelegram());

      expect(mockTelegram.getUser).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
    });

    it('should get initial color scheme', () => {
      const { result } = renderHook(() => useTelegram());

      expect(mockTelegram.getColorScheme).toHaveBeenCalled();
      expect(result.current.colorScheme).toBe('dark');
    });

    it('should get initial viewport height', () => {
      const { result } = renderHook(() => useTelegram());

      expect(mockTelegram.getViewportHeight).toHaveBeenCalled();
      expect(result.current.viewportHeight).toBe(700);
    });

    it('should register theme change listener', () => {
      renderHook(() => useTelegram());

      expect(mockTelegram.onThemeChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('User Data', () => {
    it('should return null user when not in telegram', () => {
      mockTelegram.getUser.mockReturnValue(null);

      const { result } = renderHook(() => useTelegram());

      expect(result.current.user).toBeNull();
    });

    it('should return user data with all fields', () => {
      const { result } = renderHook(() => useTelegram());

      expect(result.current.user?.id).toBe(123456789);
      expect(result.current.user?.firstName).toBe('Test');
      expect(result.current.user?.lastName).toBe('User');
      expect(result.current.user?.username).toBe('testuser');
    });
  });

  describe('Platform Detection', () => {
    it('should return isInTelegram', () => {
      const { result } = renderHook(() => useTelegram());

      expect(result.current.isInTelegram).toBe(true);
    });

    it('should return platform name', () => {
      const { result } = renderHook(() => useTelegram());

      expect(result.current.platform).toBe('ios');
    });

    it('should detect iOS', () => {
      const { result } = renderHook(() => useTelegram());

      expect(result.current.isIOS).toBe(true);
      expect(result.current.isAndroid).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should detect Android', () => {
      mockTelegram.isIOS.mockReturnValue(false);
      mockTelegram.isAndroid.mockReturnValue(true);

      const { result } = renderHook(() => useTelegram());

      expect(result.current.isIOS).toBe(false);
      expect(result.current.isAndroid).toBe(true);
    });

    it('should detect desktop', () => {
      mockTelegram.isIOS.mockReturnValue(false);
      mockTelegram.isAndroid.mockReturnValue(false);
      mockTelegram.isDesktop.mockReturnValue(true);

      const { result } = renderHook(() => useTelegram());

      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('Theme Handling', () => {
    it('should update color scheme on theme change', async () => {
      mockTelegram.getColorScheme.mockReturnValue('dark');

      const { result } = renderHook(() => useTelegram());

      expect(result.current.colorScheme).toBe('dark');

      // Simulate theme change
      mockTelegram.getColorScheme.mockReturnValue('light');
      act(() => {
        mockThemeCallback.call();
      });

      await waitFor(() => {
        expect(result.current.colorScheme).toBe('light');
      });
    });
  });

  describe('Main Button', () => {
    it('should call showMainButton with text and callback', () => {
      const { result } = renderHook(() => useTelegram());
      const onClick = vi.fn();

      act(() => {
        result.current.showMainButton('Submit', onClick);
      });

      expect(mockTelegram.showMainButton).toHaveBeenCalledWith('Submit', onClick);
    });

    it('should call hideMainButton', () => {
      const { result } = renderHook(() => useTelegram());

      act(() => {
        result.current.hideMainButton();
      });

      expect(mockTelegram.hideMainButton).toHaveBeenCalled();
    });

    it('should return stable showMainButton callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.showMainButton;
      rerender();
      const second = result.current.showMainButton;

      expect(first).toBe(second);
    });
  });

  describe('Back Button', () => {
    it('should call showBackButton with callback', () => {
      const { result } = renderHook(() => useTelegram());
      const onClick = vi.fn();

      act(() => {
        result.current.showBackButton(onClick);
      });

      expect(mockTelegram.showBackButton).toHaveBeenCalledWith(onClick);
    });

    it('should call hideBackButton', () => {
      const { result } = renderHook(() => useTelegram());

      act(() => {
        result.current.hideBackButton();
      });

      expect(mockTelegram.hideBackButton).toHaveBeenCalled();
    });

    it('should return stable showBackButton callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.showBackButton;
      rerender();
      const second = result.current.showBackButton;

      expect(first).toBe(second);
    });
  });

  describe('Dialogs', () => {
    it('should call showAlert and return promise', async () => {
      const { result } = renderHook(() => useTelegram());

      await act(async () => {
        await result.current.showAlert('Test message');
      });

      expect(mockTelegram.showAlert).toHaveBeenCalledWith('Test message');
    });

    it('should call showConfirm and return boolean', async () => {
      mockTelegram.showConfirm.mockResolvedValue(true);
      const { result } = renderHook(() => useTelegram());

      let confirmed: boolean;
      await act(async () => {
        confirmed = await result.current.showConfirm('Confirm?');
      });

      expect(mockTelegram.showConfirm).toHaveBeenCalledWith('Confirm?');
      expect(confirmed!).toBe(true);
    });

    it('should return stable showAlert callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.showAlert;
      rerender();
      const second = result.current.showAlert;

      expect(first).toBe(second);
    });
  });

  describe('Navigation', () => {
    it('should call openLink with URL', () => {
      const { result } = renderHook(() => useTelegram());

      act(() => {
        result.current.openLink('https://example.com');
      });

      expect(mockTelegram.openLink).toHaveBeenCalledWith('https://example.com');
    });

    it('should call close', () => {
      const { result } = renderHook(() => useTelegram());

      act(() => {
        result.current.close();
      });

      expect(mockTelegram.close).toHaveBeenCalled();
    });

    it('should return stable openLink callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.openLink;
      rerender();
      const second = result.current.openLink;

      expect(first).toBe(second);
    });

    it('should return stable close callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.close;
      rerender();
      const second = result.current.close;

      expect(first).toBe(second);
    });
  });

  describe('Callback Stability', () => {
    it('should return stable hideMainButton callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.hideMainButton;
      rerender();
      const second = result.current.hideMainButton;

      expect(first).toBe(second);
    });

    it('should return stable hideBackButton callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.hideBackButton;
      rerender();
      const second = result.current.hideBackButton;

      expect(first).toBe(second);
    });

    it('should return stable showConfirm callback', () => {
      const { result, rerender } = renderHook(() => useTelegram());

      const first = result.current.showConfirm;
      rerender();
      const second = result.current.showConfirm;

      expect(first).toBe(second);
    });
  });
});
