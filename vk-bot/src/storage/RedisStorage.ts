/**
 * Redis Session Storage for VK Bot
 * =================================
 * Implements ISessionStorage interface from @vk-io/session
 * for persistent session storage using Redis.
 *
 * Features:
 * - Persistent sessions across bot restarts
 * - Automatic TTL expiration (24 hours default)
 * - Sliding TTL (extends on touch)
 * - Graceful error handling
 *
 * Based on 2025 best practices:
 * - Uses ioredis for performance (auto-pipelining)
 * - Atomic SET with EX option
 * - JSON serialization for complex objects
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/storage
 */

import Redis from 'ioredis';

/**
 * ISessionStorage interface from @vk-io/session
 * Defined here to avoid import issues
 */
export interface ISessionStorage {
  get(key: string): Promise<object | undefined>;
  set(key: string, value: object): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  touch(key: string): Promise<void>;
}

/**
 * Redis storage configuration options
 */
export interface RedisStorageOptions {
  /**
   * Redis connection URL (e.g., redis://localhost:6379)
   * If not provided, uses REDIS_URL environment variable
   */
  url?: string;

  /**
   * Key prefix for all session keys
   * @default 'vk-session:'
   */
  keyPrefix?: string;

  /**
   * Session TTL in seconds
   * @default 86400 (24 hours)
   */
  ttl?: number;

  /**
   * Existing Redis client instance (optional)
   * If provided, url is ignored
   */
  client?: Redis;
}

/**
 * Redis-based session storage for @vk-io/session
 *
 * Usage:
 * ```typescript
 * const storage = new RedisStorage({
 *   url: 'redis://localhost:6379',
 *   keyPrefix: 'vk-session:',
 *   ttl: 86400
 * });
 *
 * const sessionManager = new SessionManager({
 *   storage,
 *   getStorageKey: (ctx) => `user_${ctx.senderId}`
 * });
 * ```
 */
export class RedisStorage implements ISessionStorage {
  private client: Redis;
  private keyPrefix: string;
  private ttl: number;
  private isExternalClient: boolean;

  constructor(options: RedisStorageOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? 'vk-session:';
    this.ttl = options.ttl ?? 86400; // 24 hours default
    this.isExternalClient = !!options.client;

    if (options.client) {
      this.client = options.client;
    } else {
      const url = options.url || process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = new Redis(url, {
        // Connection options
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 10) {
            console.error('[RedisStorage] Max retries reached, giving up');
            return null;
          }
          // Exponential backoff: 100ms, 200ms, 400ms, ...
          return Math.min(times * 100, 3000);
        },
        // Enable auto-pipelining for better performance
        enableAutoPipelining: true,
        // Reconnect on error
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
          return targetErrors.some(e => err.message.includes(e));
        },
      });

      // Log connection events
      this.client.on('connect', () => {
        console.log('[RedisStorage] Connected to Redis');
      });

      this.client.on('error', (err) => {
        console.error('[RedisStorage] Redis error:', err.message);
      });

      this.client.on('close', () => {
        console.log('[RedisStorage] Redis connection closed');
      });
    }
  }

  /**
   * Build full Redis key with prefix
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get session data by key
   * Returns undefined if key doesn't exist or on error
   */
  async get(key: string): Promise<object | undefined> {
    try {
      const fullKey = this.buildKey(key);
      const data = await this.client.get(fullKey);

      if (!data) {
        return undefined;
      }

      return JSON.parse(data) as object;
    } catch (error) {
      console.error('[RedisStorage] Error getting session:', error);
      return undefined;
    }
  }

  /**
   * Set session data with TTL
   * Uses atomic SET with EX option (best practice)
   */
  async set(key: string, value: object): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const serialized = JSON.stringify(value);

      // SET with EX is atomic - no race conditions
      const result = await this.client.set(fullKey, serialized, 'EX', this.ttl);

      return result === 'OK';
    } catch (error) {
      console.error('[RedisStorage] Error setting session:', error);
      return false;
    }
  }

  /**
   * Delete session by key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.client.del(fullKey);

      return result > 0;
    } catch (error) {
      console.error('[RedisStorage] Error deleting session:', error);
      return false;
    }
  }

  /**
   * Touch session to extend TTL (sliding expiration)
   * Called on every user interaction
   */
  async touch(key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      await this.client.expire(fullKey, this.ttl);
    } catch (error) {
      console.error('[RedisStorage] Error touching session:', error);
    }
  }

  /**
   * Check if Redis connection is ready
   */
  isReady(): boolean {
    return this.client.status === 'ready';
  }

  /**
   * Close Redis connection
   * Call this on graceful shutdown
   */
  async close(): Promise<void> {
    if (!this.isExternalClient) {
      await this.client.quit();
      console.log('[RedisStorage] Redis connection closed gracefully');
    }
  }

  /**
   * Get underlying Redis client
   * Use for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}

/**
 * Create Redis storage with environment-based configuration
 * Gracefully falls back to memory storage if Redis unavailable
 */
export function createRedisStorage(options?: RedisStorageOptions): RedisStorage | null {
  const redisUrl = options?.url || process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[RedisStorage] REDIS_URL not set, sessions will use in-memory storage');
    return null;
  }

  try {
    return new RedisStorage(options);
  } catch (error) {
    console.error('[RedisStorage] Failed to create Redis storage:', error);
    return null;
  }
}
