/**
 * Vitest Setup
 * ============
 * Global test setup for VK Mini App tests.
 * Includes mocks for VK Bridge, VKUI components, and browser APIs.
 */

import '@testing-library/jest-dom';

// =============================================================================
// VK Bridge Mock
// =============================================================================

// Default mock responses for VK Bridge methods
const vkBridgeMockResponses: Record<string, unknown> = {
  VKWebAppInit: { result: true },
  VKWebAppGetUserInfo: {
    id: 123456,
    first_name: 'Иван',
    last_name: 'Иванов',
    photo_100: 'https://vk.com/images/camera_100.png',
    photo_200: 'https://vk.com/images/camera_200.png',
  },
  VKWebAppGetLaunchParams: {
    vk_user_id: 123456,
    vk_app_id: 12345678,
    vk_platform: 'desktop_web',
    vk_language: 'ru',
    sign: 'test_sign',
  },
  VKWebAppShowStoryBox: { result: true },
  VKWebAppShare: { result: true },
  VKWebAppShowAlert: { result: true },
  VKWebAppCopyText: { result: true },
  VKWebAppGetAuthToken: { access_token: 'test_token', scope: '' },
  VKWebAppStorageGet: { keys: [] },
  VKWebAppStorageSet: { result: true },
};

const vkBridgeMock = {
  send: vi.fn((method: string) => {
    return Promise.resolve(vkBridgeMockResponses[method] || { result: true });
  }),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  supports: vi.fn().mockReturnValue(true),
  isWebView: vi.fn().mockReturnValue(true),
  isIframe: vi.fn().mockReturnValue(true),
  isEmbedded: vi.fn().mockReturnValue(true),
  isStandalone: vi.fn().mockReturnValue(false),
};

vi.mock('@vkontakte/vk-bridge', () => {
  return {
    default: vkBridgeMock,
  };
});

// Export for test customization
export { vkBridgeMock, vkBridgeMockResponses };

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

// =============================================================================
// ResizeObserver Mock (required for VKUI animations)
// =============================================================================

class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// =============================================================================
// IntersectionObserver Mock (required for lazy loading)
// =============================================================================

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.options = options;
  }

  root = null;
  rootMargin = '';
  thresholds = [0];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// =============================================================================
// localStorage Mock
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// sessionStorage mock (same implementation)
Object.defineProperty(window, 'sessionStorage', {
  value: { ...localStorageMock },
  writable: true,
});

// =============================================================================
// matchMedia Mock (required for VKUI adaptive components)
// =============================================================================

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

// =============================================================================
// requestAnimationFrame Mock
// =============================================================================

global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 0);
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// =============================================================================
// scrollTo Mock
// =============================================================================

window.scrollTo = vi.fn();
Element.prototype.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// =============================================================================
// Reset mocks before each test
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockLocation.search = '';
  localStorageMock.clear();
});
