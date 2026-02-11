/**
 * Vitest Setup
 * ============
 * Global test setup for VK Mini App tests.
 */

import '@testing-library/jest-dom';

// Mock VK Bridge
vi.mock('@vkontakte/vk-bridge', () => {
  return {
    default: {
      send: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      supports: vi.fn().mockReturnValue(true),
      isWebView: vi.fn().mockReturnValue(true),
    },
  };
});

// Mock window.location
const mockLocation = {
  search: '',
  href: 'https://vk.sleepcore.ru',
  origin: 'https://vk.sleepcore.ru',
  pathname: '/',
  hash: '',
  protocol: 'https:',
  host: 'vk.sleepcore.ru',
  hostname: 'vk.sleepcore.ru',
  port: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
  writable: true,
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockLocation.search = '';
});
