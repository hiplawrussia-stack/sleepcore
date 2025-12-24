/**
 * useTelegram Hook
 * ================
 * React hook for accessing Telegram Mini App SDK features.
 */

import { useEffect, useState, useCallback } from 'react';
import { telegram, type TelegramUser } from '@/services/telegram';

interface UseTelegramReturn {
  user: TelegramUser | null;
  isInTelegram: boolean;
  colorScheme: 'light' | 'dark';
  platform: string;
  viewportHeight: number;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  close: () => void;
}

export const useTelegram = (): UseTelegramReturn => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    // Initialize Telegram SDK
    telegram.init();

    // Get initial values
    setUser(telegram.getUser());
    setColorScheme(telegram.getColorScheme());
    setViewportHeight(telegram.getViewportHeight());

    // Listen for theme changes
    telegram.onThemeChange(() => {
      setColorScheme(telegram.getColorScheme());
    });
  }, []);

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    telegram.showMainButton(text, onClick);
  }, []);

  const hideMainButton = useCallback(() => {
    telegram.hideMainButton();
  }, []);

  const showBackButton = useCallback((onClick: () => void) => {
    telegram.showBackButton(onClick);
  }, []);

  const hideBackButton = useCallback(() => {
    telegram.hideBackButton();
  }, []);

  const showAlert = useCallback((message: string) => {
    return telegram.showAlert(message);
  }, []);

  const showConfirm = useCallback((message: string) => {
    return telegram.showConfirm(message);
  }, []);

  const close = useCallback(() => {
    telegram.close();
  }, []);

  return {
    user,
    isInTelegram: telegram.isInTelegram(),
    colorScheme,
    platform: telegram.getPlatform(),
    viewportHeight,
    isIOS: telegram.isIOS(),
    isAndroid: telegram.isAndroid(),
    isDesktop: telegram.isDesktop(),
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    close,
  };
};

export default useTelegram;
