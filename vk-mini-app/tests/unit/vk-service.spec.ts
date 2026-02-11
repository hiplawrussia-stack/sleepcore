/**
 * VK Service Unit Tests
 * =====================
 * Tests for the VK Bridge service wrapper.
 *
 * Test Coverage:
 * - init() - Bridge initialization
 * - isInVK() - Detection of VK environment
 * - getLaunchParams() - Launch params parsing
 * - getUser() - User info fetching
 * - UI methods (showAlert, close, etc.)
 * - Haptic feedback
 * - Clipboard and share
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bridge from '@vkontakte/vk-bridge';

// Re-import after mocking
let vkService: typeof import('@/services/vk').vk;

describe('VK Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset module state by re-importing
    vi.resetModules();
    const module = await import('@/services/vk');
    vkService = module.vk;

    // Reset window.location.search
    (window.location as any).search = '';
  });

  describe('init', () => {
    it('should initialize VK Bridge', async () => {
      await vkService.init();

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppInit');
    });

    it('should only initialize once', async () => {
      await vkService.init();
      await vkService.init();

      // Should only be called once
      expect(bridge.send).toHaveBeenCalledTimes(1);
    });

    it('should parse launch params on init', async () => {
      (window.location as any).search =
        '?vk_user_id=123456789&vk_app_id=12345&vk_language=ru&sign=abc123';

      await vkService.init();

      const params = vkService.getLaunchParams();
      expect(params?.vk_user_id).toBe(123456789);
      expect(params?.vk_app_id).toBe(12345);
      expect(params?.vk_language).toBe('ru');
    });

    it('should throw on bridge init failure', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Bridge init failed')
      );

      await expect(vkService.init()).rejects.toThrow('Bridge init failed');
    });
  });

  describe('isInVK', () => {
    it('should return true when vk_user_id is present', () => {
      (window.location as any).search = '?vk_user_id=123';

      expect(vkService.isInVK()).toBe(true);
    });

    it('should return true when sign is present', () => {
      (window.location as any).search = '?sign=abc123';

      expect(vkService.isInVK()).toBe(true);
    });

    it('should return false when no VK params', () => {
      (window.location as any).search = '?foo=bar';

      expect(vkService.isInVK()).toBe(false);
    });

    it('should return false for empty search', () => {
      (window.location as any).search = '';

      expect(vkService.isInVK()).toBe(false);
    });
  });

  describe('getLaunchParams', () => {
    it('should return null before init', () => {
      expect(vkService.getLaunchParams()).toBeNull();
    });

    it('should parse all vk_* params', async () => {
      (window.location as any).search =
        '?vk_user_id=123&vk_app_id=456&vk_platform=mobile_android&vk_language=en&vk_ts=1700000000&sign=signature';

      await vkService.init();

      const params = vkService.getLaunchParams();
      expect(params).toMatchObject({
        vk_user_id: 123,
        vk_app_id: 456,
        vk_platform: 'mobile_android',
        vk_language: 'en',
        vk_ts: 1700000000,
        sign: 'signature',
      });
    });

    it('should ignore non-vk params', async () => {
      (window.location as any).search =
        '?vk_user_id=123&other_param=value&sign=abc';

      await vkService.init();

      const params = vkService.getLaunchParams();
      expect(params?.vk_user_id).toBe(123);
      expect((params as any)?.other_param).toBeUndefined();
    });
  });

  describe('getLaunchParamsString', () => {
    it('should return URL search string without leading ?', () => {
      (window.location as any).search = '?vk_user_id=123&sign=abc';

      const result = vkService.getLaunchParamsString();

      expect(result).toBe('vk_user_id=123&sign=abc');
    });

    it('should return empty string for empty search', () => {
      (window.location as any).search = '';

      const result = vkService.getLaunchParamsString();

      expect(result).toBe('');
    });
  });

  describe('getUser', () => {
    it('should call VKWebAppGetUserInfo', async () => {
      const mockUser = {
        id: 123,
        first_name: 'Иван',
        last_name: 'Петров',
      };
      (bridge.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

      const user = await vkService.getUser();

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppGetUserInfo');
      expect(user).toEqual(mockUser);
    });

    it('should return null on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Failed')
      );

      const user = await vkService.getUser();

      expect(user).toBeNull();
    });
  });

  describe('showAlert', () => {
    it('should call VKWebAppAlert', async () => {
      await vkService.showAlert('Test message');

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppAlert', {
        message: 'Test message',
      });
    });

    it('should fallback to window.alert on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await vkService.showAlert('Test message');

      expect(alertSpy).toHaveBeenCalledWith('Test message');
    });
  });

  describe('close', () => {
    it('should call VKWebAppClose', async () => {
      await vkService.close();

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppClose', {
        status: 'success',
      });
    });

    it('should fallback to history.back on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );

      await vkService.close();

      expect(window.history.back).toHaveBeenCalled();
    });
  });

  describe('setSwipeBackEnabled', () => {
    it('should enable swipe back', async () => {
      await vkService.setSwipeBackEnabled(true);

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppEnableSwipeBack');
    });

    it('should disable swipe back', async () => {
      await vkService.setSwipeBackEnabled(false);

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppDisableSwipeBack');
    });

    it('should not throw on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );

      await expect(vkService.setSwipeBackEnabled(true)).resolves.toBeUndefined();
    });
  });

  describe('hapticFeedback', () => {
    it('should send impact feedback', async () => {
      await vkService.hapticFeedback('impact', 'medium');

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppTapticImpactOccurred', {
        style: 'medium',
      });
    });

    it('should use light style as default for impact', async () => {
      await vkService.hapticFeedback('impact');

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppTapticImpactOccurred', {
        style: 'light',
      });
    });

    it('should send notification feedback', async () => {
      await vkService.hapticFeedback('notification', 'success');

      expect(bridge.send).toHaveBeenCalledWith(
        'VKWebAppTapticNotificationOccurred',
        { type: 'success' }
      );
    });

    it('should send selection change feedback', async () => {
      await vkService.hapticFeedback('selection_change');

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppTapticSelectionChanged');
    });

    it('should not throw on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );

      await expect(vkService.hapticFeedback('impact')).resolves.toBeUndefined();
    });
  });

  describe('copyToClipboard', () => {
    it('should call VKWebAppCopyText', async () => {
      const result = await vkService.copyToClipboard('Test text');

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppCopyText', {
        text: 'Test text',
      });
      expect(result).toBe(true);
    });

    it('should fallback to navigator.clipboard', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );

      const result = await vkService.copyToClipboard('Test text');

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text');
      expect(result).toBe(true);
    });

    it('should return false when both methods fail', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Clipboard not available')
      );

      const result = await vkService.copyToClipboard('Test text');

      expect(result).toBe(false);
    });
  });

  describe('share', () => {
    it('should call VKWebAppShare', async () => {
      await vkService.share('https://example.com');

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppShare', {
        link: 'https://example.com',
      });
    });

    it('should fallback to window.open', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not supported')
      );
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      await vkService.share('https://example.com');

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('vk.com/share.php'),
        '_blank'
      );
    });
  });

  describe('addToFavorites', () => {
    it('should return true on success', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        result: true,
      });

      const result = await vkService.addToFavorites();

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppAddToFavorites');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('User declined')
      );

      const result = await vkService.addToFavorites();

      expect(result).toBe(false);
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return true on success', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        result: true,
      });

      const result = await vkService.requestNotificationPermission();

      expect(bridge.send).toHaveBeenCalledWith('VKWebAppAllowNotifications');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      (bridge.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('User declined')
      );

      const result = await vkService.requestNotificationPermission();

      expect(result).toBe(false);
    });
  });

  describe('getPlatform', () => {
    it('should return platform from launch params', async () => {
      (window.location as any).search = '?vk_user_id=123&vk_platform=mobile_android&sign=abc';

      await vkService.init();

      expect(vkService.getPlatform()).toBe('mobile_android');
    });

    it('should return unknown when no params', () => {
      expect(vkService.getPlatform()).toBe('unknown');
    });
  });

  describe('getLanguageCode', () => {
    it('should return language from launch params', async () => {
      (window.location as any).search = '?vk_user_id=123&vk_language=en&sign=abc';

      await vkService.init();

      expect(vkService.getLanguageCode()).toBe('en');
    });

    it('should return ru as default', () => {
      expect(vkService.getLanguageCode()).toBe('ru');
    });
  });
});
