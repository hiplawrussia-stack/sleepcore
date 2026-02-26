/**
 * Device Storage Service Tests
 * ============================
 * Unit tests for offline-first device storage service.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: CLI-015 (offline mode)
 *
 * Coverage targets:
 * - Storage availability detection
 * - Breathing patterns CRUD
 * - User preferences CRUD
 * - Offline queue management
 * - Sync metadata
 * - localStorage fallback
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store mocks for callback-based API
let mockDeviceStorageData: Record<string, string> = {};
let mockDeviceStorage: {
  setItem: ReturnType<typeof vi.fn>;
  getItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} | null = null;

// Setup mock before tests
beforeEach(() => {
  mockDeviceStorageData = {};
  mockDeviceStorage = {
    setItem: vi.fn((key: string, value: string, callback?: (error: string | null) => void) => {
      mockDeviceStorageData[key] = value;
      callback?.(null);
      return mockDeviceStorage;
    }),
    getItem: vi.fn((key: string, callback: (error: string | null, value?: string) => void) => {
      callback(null, mockDeviceStorageData[key]);
      return mockDeviceStorage;
    }),
    removeItem: vi.fn((key: string, callback?: (error: string | null) => void) => {
      delete mockDeviceStorageData[key];
      callback?.(null);
      return mockDeviceStorage;
    }),
    clear: vi.fn((callback?: (error: string | null) => void) => {
      mockDeviceStorageData = {};
      callback?.(null);
      return mockDeviceStorage;
    }),
  };

  // Mock global Telegram object
  (globalThis as unknown as { Telegram: { WebApp: { DeviceStorage: typeof mockDeviceStorage } } }).Telegram = {
    WebApp: {
      DeviceStorage: mockDeviceStorage,
    },
  };

  // Mock localStorage
  const localStorageData: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => localStorageData[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageData[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageData[key];
    }),
    clear: vi.fn(() => {
      Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
    }),
  });

  // Mock window.matchMedia for reduced motion detection
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  delete (globalThis as unknown as { Telegram?: unknown }).Telegram;
});

// Import after mock setup
import type {
  DeviceStorageService,
  StoredBreathingPattern,
  UserPreferences,
} from '../../src/services/deviceStorage';

// Helper to create fresh service instance
async function createService(): Promise<DeviceStorageService> {
  // Clear module cache to get fresh instance
  vi.resetModules();
  const module = await import('../../src/services/deviceStorage');
  return module.deviceStorage;
}

describe('DeviceStorageService', () => {
  describe('Availability Detection', () => {
    it('should detect native DeviceStorage when available', async () => {
      const service = await createService();
      expect(service.isAvailable()).toBe(true);
      expect(service.getStorageType()).toBe('native');
    });

    it('should fall back to localStorage when DeviceStorage unavailable', async () => {
      delete (globalThis as unknown as { Telegram?: unknown }).Telegram;
      const service = await createService();
      expect(service.isAvailable()).toBe(false);
      expect(service.getStorageType()).toBe('localStorage');
    });
  });

  describe('Breathing Patterns', () => {
    const mockPattern: StoredBreathingPattern = {
      id: 'pattern-1',
      name: '4-7-8 Breathing',
      inhale: 4000,
      hold: 7000,
      exhale: 8000,
      cycles: 4,
      isFavorite: true,
      lastUsed: '2025-02-26T10:00:00Z',
    };

    it('should save breathing patterns', async () => {
      const service = await createService();
      const result = await service.saveBreathingPatterns([mockPattern]);
      expect(result).toBe(true);
    });

    it('should retrieve saved breathing patterns', async () => {
      const service = await createService();
      await service.saveBreathingPatterns([mockPattern]);
      const patterns = await service.getBreathingPatterns();

      expect(patterns).toHaveLength(1);
      expect(patterns![0].id).toBe('pattern-1');
      expect(patterns![0].name).toBe('4-7-8 Breathing');
    });

    it('should return null when no patterns saved', async () => {
      const service = await createService();
      const patterns = await service.getBreathingPatterns();
      expect(patterns).toBeNull();
    });

    it('should upsert new pattern', async () => {
      const service = await createService();
      await service.upsertPattern(mockPattern);
      const patterns = await service.getBreathingPatterns();

      expect(patterns).toHaveLength(1);
      expect(patterns![0].id).toBe('pattern-1');
    });

    it('should update existing pattern', async () => {
      const service = await createService();
      await service.saveBreathingPatterns([mockPattern]);

      const updatedPattern = { ...mockPattern, name: 'Updated Pattern' };
      await service.upsertPattern(updatedPattern);

      const patterns = await service.getBreathingPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns![0].name).toBe('Updated Pattern');
    });
  });

  describe('User Preferences', () => {
    const mockPrefs: UserPreferences = {
      hapticEnabled: true,
      soundEnabled: false,
      defaultPatternId: 'pattern-1',
      theme: 'dark',
      language: 'ru',
      reducedMotion: false,
    };

    it('should save user preferences', async () => {
      const service = await createService();
      const result = await service.saveUserPreferences(mockPrefs);
      expect(result).toBe(true);
    });

    it('should retrieve saved preferences', async () => {
      const service = await createService();
      await service.saveUserPreferences(mockPrefs);
      const prefs = await service.getUserPreferences();

      expect(prefs).not.toBeNull();
      expect(prefs!.hapticEnabled).toBe(true);
      expect(prefs!.theme).toBe('dark');
      expect(prefs!.language).toBe('ru');
    });

    it('should return null when no preferences saved', async () => {
      const service = await createService();
      const prefs = await service.getUserPreferences();
      expect(prefs).toBeNull();
    });

    it('should return sensible default preferences', async () => {
      const service = await createService();
      const defaults = service.getDefaultPreferences();

      expect(defaults.hapticEnabled).toBe(true);
      expect(defaults.soundEnabled).toBe(false);
      expect(defaults.theme).toBe('system');
      expect(typeof defaults.language).toBe('string');
    });
  });

  describe('Offline Queue', () => {
    it('should add item to offline queue', async () => {
      const service = await createService();

      const result = await service.addToOfflineQueue({
        type: 'breathing_session',
        data: { patternId: 'pattern-1', duration: 120 },
      });

      expect(result).toBe(true);
    });

    it('should retrieve offline queue', async () => {
      const service = await createService();

      await service.addToOfflineQueue({
        type: 'breathing_session',
        data: { patternId: 'pattern-1' },
      });

      const queue = await service.getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue![0].type).toBe('breathing_session');
      expect(queue![0].retryCount).toBe(0);
      expect(queue![0].id).toBeDefined();
      expect(queue![0].timestamp).toBeDefined();
    });

    it('should remove item from queue', async () => {
      const service = await createService();

      await service.addToOfflineQueue({
        type: 'breathing_session',
        data: {},
      });

      const queue = await service.getOfflineQueue();
      const itemId = queue![0].id;

      await service.removeFromOfflineQueue(itemId);

      const updatedQueue = await service.getOfflineQueue();
      expect(updatedQueue).toHaveLength(0);
    });

    it('should clear entire offline queue', async () => {
      const service = await createService();

      await service.addToOfflineQueue({ type: 'breathing_session', data: {} });
      await service.addToOfflineQueue({ type: 'preference_update', data: {} });

      await service.clearOfflineQueue();

      const queue = await service.getOfflineQueue();
      expect(queue).toBeNull();
    });
  });

  describe('Sync Metadata', () => {
    it('should save last sync time', async () => {
      const service = await createService();
      const now = new Date();

      const result = await service.setLastSyncTime(now);
      expect(result).toBe(true);
    });

    it('should retrieve last sync time', async () => {
      const service = await createService();
      const now = new Date();

      await service.setLastSyncTime(now);
      const lastSync = await service.getLastSyncTime();

      expect(lastSync).not.toBeNull();
      expect(lastSync!.getTime()).toBe(now.getTime());
    });

    it('should return null when no sync time saved', async () => {
      const service = await createService();
      const lastSync = await service.getLastSyncTime();
      expect(lastSync).toBeNull();
    });
  });

  describe('Clear All', () => {
    it('should clear all stored data', async () => {
      const service = await createService();

      // Store some data
      await service.saveBreathingPatterns([
        { id: '1', name: 'Test', inhale: 4, hold: 4, exhale: 4, cycles: 4, isFavorite: false },
      ]);
      await service.saveUserPreferences({
        hapticEnabled: true,
        soundEnabled: false,
        theme: 'dark',
        language: 'en',
        reducedMotion: false,
      });
      await service.addToOfflineQueue({ type: 'breathing_session', data: {} });
      await service.setLastSyncTime();

      // Clear all
      const result = await service.clearAll();
      expect(result).toBe(true);

      // Verify all cleared
      expect(await service.getBreathingPatterns()).toBeNull();
      expect(await service.getUserPreferences()).toBeNull();
      expect(await service.getOfflineQueue()).toBeNull();
      expect(await service.getLastSyncTime()).toBeNull();
    });
  });

  describe('localStorage Fallback', () => {
    it('should use localStorage when native storage unavailable', async () => {
      delete (globalThis as unknown as { Telegram?: unknown }).Telegram;
      const service = await createService();

      const pattern: StoredBreathingPattern = {
        id: 'fallback-1',
        name: 'Fallback Pattern',
        inhale: 4000,
        hold: 0,
        exhale: 4000,
        cycles: 5,
        isFavorite: false,
      };

      await service.saveBreathingPatterns([pattern]);
      expect(localStorage.setItem).toHaveBeenCalled();

      const patterns = await service.getBreathingPatterns();
      expect(patterns).toHaveLength(1);
    });
  });
});
