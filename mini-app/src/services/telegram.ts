/**
 * Telegram Mini App SDK Service
 * =============================
 * Wrapper for Telegram WebApp SDK with TypeScript support.
 * Provides unified interface for all Telegram Mini App features.
 *
 * Security:
 * - URL validation via protocol allowlist (OWASP recommended)
 * - Blocks javascript:, data:, vbscript: protocols
 *
 * @see CLAUDE.md §1 - Security Priority
 */

import WebApp from '@twa-dev/sdk';
import { validateUrl, validateTelegramUrl, type UrlValidationResult } from '@/utils/url';
import { captureException, addBreadcrumb } from '@/services/sentry';

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  isPremium?: boolean;
}

export interface ThemeParams {
  bgColor?: string;
  textColor?: string;
  hintColor?: string;
  linkColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  secondaryBgColor?: string;
}

class TelegramService {
  private webApp: typeof WebApp;
  private isInitialized = false;

  constructor() {
    this.webApp = WebApp;
  }

  /**
   * Initialize the Mini App
   * Should be called as early as possible
   */
  init(): void {
    if (this.isInitialized) return;

    try {
      this.webApp.ready();
      this.webApp.expand();

      // Set SleepCore dark theme colors
      this.webApp.setHeaderColor('#1e293b');
      this.webApp.setBackgroundColor('#0f172a');

      // Enable closing confirmation for active sessions
      this.webApp.enableClosingConfirmation();

      this.isInitialized = true;
      console.log('[TelegramService] Initialized successfully');
    } catch (error) {
      console.warn('[TelegramService] Failed to initialize:', error);

      // Log to Sentry with context for debugging
      captureException(error instanceof Error ? error : new Error(String(error)), {
        category: 'telegram',
        tags: {
          component: 'TelegramService',
          action: 'init',
        },
        extra: {
          platform: this.webApp.platform,
          version: this.webApp.version,
          hasInitData: Boolean(this.webApp.initData),
        },
      });
    }
  }

  /**
   * Check if running inside Telegram
   */
  isInTelegram(): boolean {
    return Boolean(this.webApp.initData);
  }

  /**
   * Get current user information
   */
  getUser(): TelegramUser | null {
    const user = this.webApp.initDataUnsafe?.user;
    if (!user) return null;

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      photoUrl: user.photo_url,
      isPremium: user.is_premium,
    };
  }

  /**
   * Get init data for backend verification
   */
  getInitData(): string {
    return this.webApp.initData;
  }

  /**
   * Get init data hash for verification
   */
  getInitDataUnsafe() {
    return this.webApp.initDataUnsafe;
  }

  // ========== UI Controls ==========

  /**
   * Show main button at the bottom
   */
  showMainButton(text: string, onClick: () => void): void {
    this.webApp.MainButton.setText(text);
    this.webApp.MainButton.onClick(onClick);
    this.webApp.MainButton.show();
  }

  /**
   * Hide main button
   */
  hideMainButton(): void {
    this.webApp.MainButton.hide();
  }

  /**
   * Set main button loading state
   */
  setMainButtonLoading(loading: boolean): void {
    if (loading) {
      this.webApp.MainButton.showProgress();
    } else {
      this.webApp.MainButton.hideProgress();
    }
  }

  /**
   * Update main button text
   */
  updateMainButtonText(text: string): void {
    this.webApp.MainButton.setText(text);
  }

  /**
   * Show back button
   */
  showBackButton(onClick: () => void): void {
    this.webApp.BackButton.onClick(onClick);
    this.webApp.BackButton.show();
  }

  /**
   * Hide back button
   */
  hideBackButton(): void {
    this.webApp.BackButton.hide();
  }

  // ========== Dialogs ==========

  /**
   * Show alert dialog
   */
  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      this.webApp.showAlert(message, resolve);
    });
  }

  /**
   * Show confirm dialog
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.webApp.showConfirm(message, resolve);
    });
  }

  /**
   * Show popup with custom buttons
   */
  showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type: 'ok' | 'close' | 'cancel' | 'default' | 'destructive';
      text?: string;
    }>;
  }): Promise<string> {
    return new Promise((resolve) => {
      this.webApp.showPopup(params as Parameters<typeof this.webApp.showPopup>[0], (buttonId) => resolve(buttonId || 'close'));
    });
  }

  // ========== Theme ==========

  /**
   * Get current color scheme
   */
  getColorScheme(): 'light' | 'dark' {
    return this.webApp.colorScheme;
  }

  /**
   * Get theme parameters
   */
  getThemeParams() {
    return this.webApp.themeParams;
  }

  /**
   * Listen for theme changes
   */
  onThemeChange(callback: () => void): void {
    this.webApp.onEvent('themeChanged', callback);
  }

  // ========== Platform Info ==========

  /**
   * Get platform name
   */
  getPlatform(): string {
    return this.webApp.platform;
  }

  /**
   * Check if iOS
   */
  isIOS(): boolean {
    return this.webApp.platform === 'ios';
  }

  /**
   * Check if Android
   */
  isAndroid(): boolean {
    return this.webApp.platform === 'android';
  }

  /**
   * Check if desktop
   */
  isDesktop(): boolean {
    return ['macos', 'windows', 'linux'].includes(this.webApp.platform);
  }

  /**
   * Get viewport height
   */
  getViewportHeight(): number {
    return this.webApp.viewportHeight;
  }

  /**
   * Get stable viewport height
   */
  getViewportStableHeight(): number {
    return this.webApp.viewportStableHeight;
  }

  // ========== Data & Navigation ==========

  /**
   * Send data to bot
   */
  sendData(data: string): void {
    this.webApp.sendData(data);
  }

  /**
   * Close the Mini App
   */
  close(): void {
    this.webApp.close();
  }

  /**
   * Open external link with URL validation
   *
   * Security: Validates URL against protocol allowlist before opening.
   * Blocks javascript:, data:, vbscript: and other dangerous protocols.
   *
   * @param url - URL to open (must be https:, http:, tg:, mailto:, or tel:)
   * @param options - Telegram openLink options
   * @returns Validation result (for error handling)
   *
   * @example
   * ```ts
   * telegram.openLink('https://example.com'); // Opens
   * telegram.openLink('javascript:alert(1)'); // Blocked, logs warning
   * ```
   */
  openLink(url: string, options?: { try_instant_view?: boolean }): UrlValidationResult {
    const validation = validateUrl(url);

    if (!validation.isValid) {
      console.warn(
        '[TelegramService] Blocked unsafe URL:',
        validation.reason,
        '| Protocol:', validation.protocol || 'unknown'
      );

      // Security monitoring: Log blocked URL attempts (no PHI in URL)
      addBreadcrumb('security', 'Blocked unsafe URL attempt', {
        reason: validation.reason,
        protocol: validation.protocol || 'unknown',
        urlLength: url.length,
      });

      return validation;
    }

    if (options) {
      this.webApp.openLink(url, options as Parameters<typeof this.webApp.openLink>[1]);
    } else {
      this.webApp.openLink(url);
    }

    return validation;
  }

  /**
   * Open Telegram link with validation
   *
   * Security: Only allows https: (t.me, telegram.me, telegram.org) and tg: protocols.
   *
   * @param url - Telegram URL to open
   * @returns Validation result
   *
   * @example
   * ```ts
   * telegram.openTelegramLink('https://t.me/SleepCore_Bot'); // Opens
   * telegram.openTelegramLink('https://evil.com'); // Blocked
   * ```
   */
  openTelegramLink(url: string): UrlValidationResult {
    const validation = validateTelegramUrl(url);

    if (!validation.isValid) {
      console.warn(
        '[TelegramService] Blocked unsafe Telegram URL:',
        validation.reason,
        '| Protocol:', validation.protocol || 'unknown'
      );

      // Security monitoring: Log blocked Telegram URL attempts
      addBreadcrumb('security', 'Blocked unsafe Telegram URL attempt', {
        reason: validation.reason,
        protocol: validation.protocol || 'unknown',
        urlLength: url.length,
      });

      return validation;
    }

    this.webApp.openTelegramLink(url);
    return validation;
  }

  // ========== Performance Detection ==========

  /**
   * Device performance classes based on Telegram WebApp capabilities
   * @see https://core.telegram.org/bots/webapps (2025 updates)
   */
  private performanceClass: 'low' | 'medium' | 'high' | null = null;

  /**
   * Get device performance class
   * Used to adjust animations and effects for low-end devices
   *
   * Detection heuristics (2025 best practice):
   * - iOS: Generally high performance
   * - Android: Check memory/CPU if available, fallback to viewport size
   * - Desktop: Always high performance
   * - Web: Medium by default
   *
   * @returns 'low' | 'medium' | 'high'
   */
  getPerformanceClass(): 'low' | 'medium' | 'high' {
    if (this.performanceClass) return this.performanceClass;

    // Desktop is always high performance
    if (this.isDesktop()) {
      this.performanceClass = 'high';
      return 'high';
    }

    // iOS devices are generally high performance
    if (this.isIOS()) {
      this.performanceClass = 'high';
      return 'high';
    }

    // For Android, use viewport and memory heuristics
    if (this.isAndroid()) {
      // Check device memory if available (Navigator.deviceMemory)
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (memory !== undefined) {
        if (memory <= 2) {
          this.performanceClass = 'low';
          return 'low';
        }
        if (memory <= 4) {
          this.performanceClass = 'medium';
          return 'medium';
        }
        this.performanceClass = 'high';
        return 'high';
      }

      // Fallback: use viewport height as proxy (smaller = likely lower-end)
      const viewportHeight = this.getViewportStableHeight();
      if (viewportHeight < 600) {
        this.performanceClass = 'low';
        return 'low';
      }
      if (viewportHeight < 800) {
        this.performanceClass = 'medium';
        return 'medium';
      }
    }

    // Default to medium for unknown platforms
    this.performanceClass = 'medium';
    return 'medium';
  }

  /**
   * Check if animations should be reduced
   * Based on device performance and user preferences
   */
  shouldReduceAnimations(): boolean {
    // Check user preference first (prefers-reduced-motion)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }

    // Reduce for low-performance devices
    return this.getPerformanceClass() === 'low';
  }

  /**
   * Get recommended animation duration multiplier
   * Low-end devices get faster (shorter) animations
   */
  getAnimationDurationMultiplier(): number {
    const performanceClass = this.getPerformanceClass();
    switch (performanceClass) {
      case 'low':
        return 0.5; // Half duration
      case 'medium':
        return 0.75; // 75% duration
      case 'high':
      default:
        return 1.0; // Full duration
    }
  }

  // ========== Cloud Storage ==========

  /**
   * Set item in cloud storage
   */
  async setStorageItem(key: string, value: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.webApp.CloudStorage.setItem(key, value, (error) => {
        if (error) {
          console.warn('[TelegramService] CloudStorage.setItem failed:', error);
          captureException(new Error(`CloudStorage.setItem failed: ${error}`), {
            category: 'storage',
            tags: { component: 'TelegramService', action: 'setStorageItem' },
            extra: { key, valueLength: value.length },
          });
        }
        resolve(!error);
      });
    });
  }

  /**
   * Get item from cloud storage
   */
  async getStorageItem(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.webApp.CloudStorage.getItem(key, (error, value) => {
        if (error) {
          console.warn('[TelegramService] CloudStorage.getItem failed:', error);
          captureException(new Error(`CloudStorage.getItem failed: ${error}`), {
            category: 'storage',
            tags: { component: 'TelegramService', action: 'getStorageItem' },
            extra: { key },
          });
        }
        resolve(error ? null : value || null);
      });
    });
  }

  /**
   * Remove item from cloud storage
   */
  async removeStorageItem(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.webApp.CloudStorage.removeItem(key, (error) => {
        if (error) {
          console.warn('[TelegramService] CloudStorage.removeItem failed:', error);
          captureException(new Error(`CloudStorage.removeItem failed: ${error}`), {
            category: 'storage',
            tags: { component: 'TelegramService', action: 'removeStorageItem' },
            extra: { key },
          });
        }
        resolve(!error);
      });
    });
  }
}

// Export singleton instance
export const telegram = new TelegramService();

// Export type for hook
export type { TelegramService };
