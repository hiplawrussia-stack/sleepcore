/**
 * Main Entry Point
 * ================
 * Application bootstrap with React 18 and strict mode.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/global.css';

// Environment-based Telegram mock for development
const isDevelopment = import.meta.env.DEV;

if (isDevelopment && !window.Telegram?.WebApp) {
  console.log('[SleepCore] Running in development mode - mocking Telegram environment');

  // Mock Telegram WebApp for local development
  (window as any).Telegram = {
    WebApp: {
      initData: 'mock_init_data',
      initDataUnsafe: {
        user: {
          id: 12345678,
          first_name: 'Dev',
          last_name: 'User',
          username: 'devuser',
          language_code: 'ru',
        },
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
      ready: () => console.log('[Mock] WebApp.ready()'),
      expand: () => console.log('[Mock] WebApp.expand()'),
      close: () => console.log('[Mock] WebApp.close()'),
      setHeaderColor: (color: string) => console.log('[Mock] setHeaderColor:', color),
      setBackgroundColor: (color: string) => console.log('[Mock] setBackgroundColor:', color),
      enableClosingConfirmation: () => console.log('[Mock] enableClosingConfirmation()'),
      onEvent: () => {},
      offEvent: () => {},
      MainButton: {
        text: '',
        color: '#6366f1',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        setText: (text: string) => {
          console.log('[Mock] MainButton.setText:', text);
        },
        onClick: (_callback: () => void) => {
          console.log('[Mock] MainButton.onClick registered');
        },
        offClick: () => {},
        show: () => console.log('[Mock] MainButton.show()'),
        hide: () => console.log('[Mock] MainButton.hide()'),
        showProgress: () => console.log('[Mock] MainButton.showProgress()'),
        hideProgress: () => console.log('[Mock] MainButton.hideProgress()'),
      },
      BackButton: {
        isVisible: false,
        onClick: (_callback: () => void) => {
          console.log('[Mock] BackButton.onClick registered');
        },
        offClick: () => {},
        show: () => console.log('[Mock] BackButton.show()'),
        hide: () => console.log('[Mock] BackButton.hide()'),
      },
      HapticFeedback: {
        impactOccurred: (style: string) => console.log('[Mock] Haptic impact:', style),
        notificationOccurred: (type: string) => console.log('[Mock] Haptic notification:', type),
        selectionChanged: () => console.log('[Mock] Haptic selection'),
      },
      CloudStorage: {
        setItem: (key: string, value: string, callback?: (error: any) => void) => {
          localStorage.setItem(`tg_${key}`, value);
          callback?.(null);
        },
        getItem: (key: string, callback?: (error: any, value?: string) => void) => {
          const value = localStorage.getItem(`tg_${key}`);
          callback?.(null, value || undefined);
        },
        removeItem: (key: string, callback?: (error: any) => void) => {
          localStorage.removeItem(`tg_${key}`);
          callback?.(null);
        },
      },
      showAlert: (message: string, callback?: () => void) => {
        alert(message);
        callback?.();
      },
      showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
        const confirmed = confirm(message);
        callback?.(confirmed);
      },
      showPopup: (params: any, callback?: (buttonId: string) => void) => {
        alert(params.message);
        callback?.('ok');
      },
      openLink: (url: string) => window.open(url, '_blank'),
      openTelegramLink: (url: string) => window.open(url, '_blank'),
      sendData: (data: string) => console.log('[Mock] sendData:', data),
    },
  };
}

// Create root and render
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
