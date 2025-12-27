/**
 * Test Setup
 * ==========
 * Global test configuration for React Testing Library.
 */

import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Telegram WebApp SDK
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test-init-data',
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'ru',
      },
    },
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    MainButton: {
      text: '',
      color: '',
      textColor: '',
      isVisible: false,
      isActive: true,
      isProgressVisible: false,
      setText: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      showProgress: vi.fn(),
      hideProgress: vi.fn(),
    },
    BackButton: {
      isVisible: false,
      onClick: vi.fn(),
      offClick: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    },
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    CloudStorage: {
      setItem: vi.fn(),
      getItem: vi.fn(),
      getItems: vi.fn(),
      removeItem: vi.fn(),
      removeItems: vi.fn(),
      getKeys: vi.fn(),
    },
    themeParams: {
      bg_color: '#1e1e1e',
      text_color: '#ffffff',
      hint_color: '#aaaaaa',
      link_color: '#8b5cf6',
      button_color: '#8b5cf6',
      button_text_color: '#ffffff',
    },
    colorScheme: 'dark',
    isExpanded: true,
    viewportHeight: 600,
    viewportStableHeight: 600,
    platform: 'ios',
    version: '7.0',
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Reset localStorage before each test
afterEach(() => {
  localStorageMock.clear();
});
