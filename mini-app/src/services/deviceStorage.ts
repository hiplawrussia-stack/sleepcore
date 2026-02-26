/**
 * Device Storage Service
 * ======================
 * Persistent local storage for offline-first breathing patterns.
 * Uses Telegram Bot API 9.0+ DeviceStorage (5 MB per user).
 *
 * Graceful degradation:
 * - Bot API 9.0+: Native DeviceStorage
 * - Fallback: localStorage with prefix
 *
 * IEC 62304 Compliance:
 * - §5.5.3: Software unit verification
 * - Traceability: CLI-015 (offline mode)
 *
 * @see https://core.telegram.org/bots/webapps#devicestorage
 * @module @sleepcore/mini-app/services
 */

// Type definitions for Bot API 9.0 DeviceStorage
// @twa-dev/sdk@8.0.2 doesn't include these yet
interface TelegramDeviceStorage {
  setItem(
    key: string,
    value: string,
    callback?: (error: string | null) => void
  ): TelegramDeviceStorage;
  getItem(
    key: string,
    callback: (error: string | null, value?: string) => void
  ): TelegramDeviceStorage;
  removeItem(
    key: string,
    callback?: (error: string | null) => void
  ): TelegramDeviceStorage;
  clear(callback?: (error: string | null) => void): TelegramDeviceStorage;
}

interface TelegramWebAppExtended {
  DeviceStorage?: TelegramDeviceStorage;
  version?: string;
}

// Storage keys with prefix to avoid collisions
const STORAGE_PREFIX = 'sleepcore_';
const KEYS = {
  BREATHING_PATTERNS: `${STORAGE_PREFIX}breathing_patterns`,
  USER_PREFERENCES: `${STORAGE_PREFIX}user_preferences`,
  OFFLINE_QUEUE: `${STORAGE_PREFIX}offline_queue`,
  LAST_SYNC: `${STORAGE_PREFIX}last_sync`,
} as const;

// Types for stored data
export interface StoredBreathingPattern {
  id: string;
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfterExhale?: number;
  cycles: number;
  isFavorite: boolean;
  lastUsed?: string; // ISO date
}

export interface UserPreferences {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  defaultPatternId?: string;
  theme: 'system' | 'dark' | 'light';
  language: string;
  reducedMotion: boolean;
}

export interface OfflineQueueItem {
  id: string;
  type: 'breathing_session' | 'preference_update';
  data: unknown;
  timestamp: string; // ISO date
  retryCount: number;
}

/**
 * Device Storage Service
 * Provides offline-first storage with Telegram DeviceStorage fallback to localStorage
 */
class DeviceStorageService {
  private storage: TelegramDeviceStorage | null = null;
  private isNativeAvailable = false;

  constructor() {
    this.detectStorage();
  }

  /**
   * Detect if native Telegram DeviceStorage is available
   * Requires Bot API 9.0+ (April 2025)
   */
  private detectStorage(): void {
    try {
      const webApp = (window as Window & { Telegram?: { WebApp?: TelegramWebAppExtended } })
        .Telegram?.WebApp;

      if (webApp?.DeviceStorage) {
        this.storage = webApp.DeviceStorage;
        this.isNativeAvailable = true;
        console.log('[DeviceStorage] Native Telegram storage available');
      } else {
        console.log('[DeviceStorage] Using localStorage fallback');
      }
    } catch {
      console.warn('[DeviceStorage] Detection failed, using localStorage');
    }
  }

  /**
   * Check if native DeviceStorage is available
   */
  isAvailable(): boolean {
    return this.isNativeAvailable;
  }

  /**
   * Get storage type for debugging
   */
  getStorageType(): 'native' | 'localStorage' {
    return this.isNativeAvailable ? 'native' : 'localStorage';
  }

  // ========== Low-level Storage Operations ==========

  /**
   * Set item in storage (native or localStorage)
   */
  private async setItem(key: string, value: string): Promise<boolean> {
    if (this.isNativeAvailable && this.storage) {
      return new Promise((resolve) => {
        this.storage!.setItem(key, value, (error) => {
          if (error) {
            console.warn('[DeviceStorage] Native setItem error:', error);
            // Fallback to localStorage on error
            this.fallbackSetItem(key, value);
          }
          resolve(!error);
        });
      });
    }

    return this.fallbackSetItem(key, value);
  }

  /**
   * Get item from storage (native or localStorage)
   */
  private async getItem(key: string): Promise<string | null> {
    if (this.isNativeAvailable && this.storage) {
      return new Promise((resolve) => {
        this.storage!.getItem(key, (error, value) => {
          if (error) {
            console.warn('[DeviceStorage] Native getItem error:', error);
            // Fallback to localStorage on error
            resolve(this.fallbackGetItem(key));
            return;
          }
          resolve(value ?? null);
        });
      });
    }

    return this.fallbackGetItem(key);
  }

  /**
   * Remove item from storage
   */
  private async removeItem(key: string): Promise<boolean> {
    if (this.isNativeAvailable && this.storage) {
      return new Promise((resolve) => {
        this.storage!.removeItem(key, (error) => {
          if (error) {
            console.warn('[DeviceStorage] Native removeItem error:', error);
            this.fallbackRemoveItem(key);
          }
          resolve(!error);
        });
      });
    }

    return this.fallbackRemoveItem(key);
  }

  // ========== localStorage Fallback ==========

  private fallbackSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('[DeviceStorage] localStorage setItem error:', e);
      return false;
    }
  }

  private fallbackGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('[DeviceStorage] localStorage getItem error:', e);
      return null;
    }
  }

  private fallbackRemoveItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  // ========== Breathing Patterns ==========

  /**
   * Save breathing patterns for offline use
   */
  async saveBreathingPatterns(patterns: StoredBreathingPattern[]): Promise<boolean> {
    try {
      const json = JSON.stringify(patterns);
      return await this.setItem(KEYS.BREATHING_PATTERNS, json);
    } catch (e) {
      console.error('[DeviceStorage] Failed to save patterns:', e);
      return false;
    }
  }

  /**
   * Get saved breathing patterns
   */
  async getBreathingPatterns(): Promise<StoredBreathingPattern[] | null> {
    try {
      const json = await this.getItem(KEYS.BREATHING_PATTERNS);
      if (!json) return null;
      return JSON.parse(json) as StoredBreathingPattern[];
    } catch (e) {
      console.error('[DeviceStorage] Failed to get patterns:', e);
      return null;
    }
  }

  /**
   * Add or update a single pattern
   */
  async upsertPattern(pattern: StoredBreathingPattern): Promise<boolean> {
    const patterns = (await this.getBreathingPatterns()) ?? [];
    const index = patterns.findIndex((p) => p.id === pattern.id);

    if (index >= 0) {
      patterns[index] = pattern;
    } else {
      patterns.push(pattern);
    }

    return this.saveBreathingPatterns(patterns);
  }

  // ========== User Preferences ==========

  /**
   * Save user preferences
   */
  async saveUserPreferences(prefs: UserPreferences): Promise<boolean> {
    try {
      const json = JSON.stringify(prefs);
      return await this.setItem(KEYS.USER_PREFERENCES, json);
    } catch (e) {
      console.error('[DeviceStorage] Failed to save preferences:', e);
      return false;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const json = await this.getItem(KEYS.USER_PREFERENCES);
      if (!json) return null;
      return JSON.parse(json) as UserPreferences;
    } catch (e) {
      console.error('[DeviceStorage] Failed to get preferences:', e);
      return null;
    }
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences(): UserPreferences {
    return {
      hapticEnabled: true,
      soundEnabled: false,
      theme: 'system',
      language: navigator.language.split('-')[0] || 'en',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  }

  // ========== Offline Queue ==========

  /**
   * Add item to offline sync queue
   */
  async addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<boolean> {
    const queue = (await this.getOfflineQueue()) ?? [];

    const newItem: OfflineQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(newItem);
    return this.saveOfflineQueue(queue);
  }

  /**
   * Get offline sync queue
   */
  async getOfflineQueue(): Promise<OfflineQueueItem[] | null> {
    try {
      const json = await this.getItem(KEYS.OFFLINE_QUEUE);
      if (!json) return null;
      return JSON.parse(json) as OfflineQueueItem[];
    } catch (e) {
      console.error('[DeviceStorage] Failed to get offline queue:', e);
      return null;
    }
  }

  /**
   * Save offline queue
   */
  private async saveOfflineQueue(queue: OfflineQueueItem[]): Promise<boolean> {
    try {
      const json = JSON.stringify(queue);
      return await this.setItem(KEYS.OFFLINE_QUEUE, json);
    } catch (e) {
      console.error('[DeviceStorage] Failed to save offline queue:', e);
      return false;
    }
  }

  /**
   * Remove item from offline queue (after successful sync)
   */
  async removeFromOfflineQueue(itemId: string): Promise<boolean> {
    const queue = (await this.getOfflineQueue()) ?? [];
    const filtered = queue.filter((item) => item.id !== itemId);
    return this.saveOfflineQueue(filtered);
  }

  /**
   * Clear entire offline queue
   */
  async clearOfflineQueue(): Promise<boolean> {
    return this.removeItem(KEYS.OFFLINE_QUEUE);
  }

  // ========== Sync Metadata ==========

  /**
   * Save last sync timestamp
   */
  async setLastSyncTime(timestamp: Date = new Date()): Promise<boolean> {
    return this.setItem(KEYS.LAST_SYNC, timestamp.toISOString());
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    const iso = await this.getItem(KEYS.LAST_SYNC);
    if (!iso) return null;
    return new Date(iso);
  }

  // ========== Clear All ==========

  /**
   * Clear all SleepCore data from device storage
   * Warning: This is destructive!
   */
  async clearAll(): Promise<boolean> {
    const results = await Promise.all([
      this.removeItem(KEYS.BREATHING_PATTERNS),
      this.removeItem(KEYS.USER_PREFERENCES),
      this.removeItem(KEYS.OFFLINE_QUEUE),
      this.removeItem(KEYS.LAST_SYNC),
    ]);

    return results.every(Boolean);
  }
}

// Export singleton instance
export const deviceStorage = new DeviceStorageService();

// Export type for testing
export type { DeviceStorageService };
