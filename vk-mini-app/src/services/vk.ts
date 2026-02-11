/**
 * VK Bridge Service
 * =================
 * Wrapper for VK Bridge SDK.
 * Provides typed interface for VK Mini Apps API.
 *
 * Maps to Telegram WebApp SDK equivalents:
 * - VKWebAppInit → WebApp.ready()
 * - VKWebAppGetUserInfo → WebApp.getUser()
 * - Launch params → initData
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/services
 */

import bridge from '@vkontakte/vk-bridge';

/**
 * VK user info (similar to Telegram user)
 */
export interface VKUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
  photo_200?: string;
  sex?: 0 | 1 | 2;
  timezone?: number;
}

/**
 * VK launch parameters for authentication
 */
export interface VKLaunchParams {
  vk_user_id: number;
  vk_app_id: number;
  vk_is_app_user: number;
  vk_are_notifications_enabled: number;
  vk_language: string;
  vk_ref: string;
  vk_access_token_settings: string;
  vk_group_id?: number;
  vk_viewer_group_role?: string;
  vk_platform: string;
  vk_is_favorite: number;
  vk_ts: number;
  sign: string;
}

/**
 * Story sticker options
 */
export interface StorySticker {
  sticker_type: 'renderable' | 'native';
  sticker: {
    content_type: 'image' | 'gif';
    blob?: string;
    url?: string;
    transform?: {
      translation_x?: number;
      translation_y?: number;
      rotation?: number;
      scale?: number;
    };
  };
}

/**
 * Story box options for VKWebAppShowStoryBox
 */
export interface StoryBoxOptions {
  background_type: 'image' | 'video' | 'none';
  blob?: string;
  url?: string;
  stickers?: StorySticker[];
  attachment?: {
    text: 'open' | 'learn_more' | 'view' | 'go_to' | 'install';
    type: 'url' | 'photo' | 'video';
    url?: string;
    owner_id?: number;
    id?: number;
  };
  locked?: boolean;
}

/**
 * VK Bridge service singleton
 */
class VKService {
  private initialized = false;
  private launchParams: VKLaunchParams | null = null;

  /**
   * Initialize VK Bridge (equivalent to WebApp.ready())
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await bridge.send('VKWebAppInit');
      this.initialized = true;
      this.parseLaunchParams();
      console.log('[VK] Bridge initialized');
    } catch (error) {
      console.error('[VK] Bridge init failed:', error);
      throw error;
    }
  }

  /**
   * Parse launch params from URL
   */
  private parseLaunchParams(): void {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const params: Partial<VKLaunchParams> = {};

      // Parse all vk_* parameters
      for (const [key, value] of searchParams.entries()) {
        if (key.startsWith('vk_') || key === 'sign') {
          (params as Record<string, unknown>)[key] = value;
        }
      }

      // Convert numeric fields
      if (params.vk_user_id) {
        params.vk_user_id = parseInt(String(params.vk_user_id), 10);
      }
      if (params.vk_app_id) {
        params.vk_app_id = parseInt(String(params.vk_app_id), 10);
      }
      if (params.vk_ts) {
        params.vk_ts = parseInt(String(params.vk_ts), 10);
      }

      this.launchParams = params as VKLaunchParams;
    } catch (error) {
      console.error('[VK] Failed to parse launch params:', error);
    }
  }

  /**
   * Check if running inside VK app
   */
  isInVK(): boolean {
    // Check for VK launch params in URL
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.has('vk_user_id') || searchParams.has('sign');
  }

  /**
   * Get launch params for authentication
   */
  getLaunchParams(): VKLaunchParams | null {
    return this.launchParams;
  }

  /**
   * Get launch params as URL query string (for API auth)
   */
  getLaunchParamsString(): string {
    return window.location.search.slice(1);
  }

  /**
   * Get user info from VK (equivalent to WebApp.getUser())
   */
  async getUser(): Promise<VKUser | null> {
    try {
      const result = await bridge.send('VKWebAppGetUserInfo');
      return result as VKUser;
    } catch (error) {
      console.error('[VK] Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Show native alert (equivalent to WebApp.showAlert())
   * Note: VK Bridge doesn't have a native alert API, using browser alert
   */
  showAlert(message: string): void {
    window.alert(message);
  }

  /**
   * Close mini app
   */
  async close(): Promise<void> {
    try {
      await bridge.send('VKWebAppClose', { status: 'success' });
    } catch {
      // Fallback: navigate back
      window.history.back();
    }
  }

  /**
   * Enable/disable swipe back gesture
   */
  async setSwipeBackEnabled(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await bridge.send('VKWebAppEnableSwipeBack');
      } else {
        await bridge.send('VKWebAppDisableSwipeBack');
      }
    } catch {
      // Not supported in this platform
    }
  }

  /**
   * Request haptic feedback
   */
  async hapticFeedback(
    type: 'impact' | 'notification' | 'selection_change',
    style?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
  ): Promise<void> {
    try {
      if (type === 'impact') {
        const impactStyle = (style === 'light' || style === 'medium' || style === 'heavy')
          ? style
          : 'light';
        await bridge.send('VKWebAppTapticImpactOccurred', {
          style: impactStyle,
        });
      } else if (type === 'notification') {
        const notificationType = (style === 'success' || style === 'warning' || style === 'error')
          ? style
          : 'success';
        await bridge.send('VKWebAppTapticNotificationOccurred', {
          type: notificationType,
        });
      } else {
        await bridge.send('VKWebAppTapticSelectionChanged');
      }
    } catch {
      // Haptics not supported
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await bridge.send('VKWebAppCopyText', { text });
      return true;
    } catch {
      // Fallback to navigator.clipboard
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Share content
   */
  async share(link: string): Promise<void> {
    try {
      await bridge.send('VKWebAppShare', { link });
    } catch {
      // Fallback: open share URL in new tab
      window.open(
        `https://vk.com/share.php?url=${encodeURIComponent(link)}`,
        '_blank'
      );
    }
  }

  /**
   * Show story editor box
   * @see https://dev.vk.com/bridge/VKWebAppShowStoryBox
   */
  async showStoryBox(options: StoryBoxOptions): Promise<{ result: boolean }> {
    try {
      await bridge.send('VKWebAppShowStoryBox', options as never);
      return { result: true };
    } catch (error) {
      console.error('[VK] Story box failed:', error);
      throw error;
    }
  }

  /**
   * Post story to wall
   */
  async postToWall(message: string, attachments?: string): Promise<boolean> {
    try {
      await bridge.send('VKWebAppShowWallPostBox', {
        message,
        attachments,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add app to favorites
   */
  async addToFavorites(): Promise<boolean> {
    try {
      const result = await bridge.send('VKWebAppAddToFavorites');
      return result.result === true;
    } catch {
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      const result = await bridge.send('VKWebAppAllowNotifications');
      return result.result === true;
    } catch {
      return false;
    }
  }

  /**
   * Get platform info
   */
  getPlatform(): string {
    return this.launchParams?.vk_platform || 'unknown';
  }

  /**
   * Get language code
   */
  getLanguageCode(): string {
    return this.launchParams?.vk_language || 'ru';
  }
}

/**
 * VK service singleton instance
 */
export const vk = new VKService();

export default vk;
