/**
 * Telegram Mini App SDK Service
 * =============================
 * Wrapper for Telegram WebApp SDK with TypeScript support.
 * Provides unified interface for all Telegram Mini App features.
 */

import WebApp from '@twa-dev/sdk';

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
   * Open external link
   */
  openLink(url: string, options?: { try_instant_view?: boolean }): void {
    if (options) {
      this.webApp.openLink(url, options as Parameters<typeof this.webApp.openLink>[1]);
    } else {
      this.webApp.openLink(url);
    }
  }

  /**
   * Open Telegram link
   */
  openTelegramLink(url: string): void {
    this.webApp.openTelegramLink(url);
  }

  // ========== Cloud Storage ==========

  /**
   * Set item in cloud storage
   */
  async setStorageItem(key: string, value: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.webApp.CloudStorage.setItem(key, value, (error) => {
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
        resolve(!error);
      });
    });
  }
}

// Export singleton instance
export const telegram = new TelegramService();

// Export type for hook
export type { TelegramService };
