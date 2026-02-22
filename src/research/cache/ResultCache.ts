/**
 * @fileoverview Research Result Cache
 * @module research/cache/ResultCache
 * @description Кэширование результатов поиска для оптимизации
 *
 * Функции:
 * - TTL-based caching
 * - Query normalization for cache keys
 * - LRU eviction when full
 * - Cache statistics
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { IResearchQuery, IResearchResult, ResearchSource } from '../types';

/**
 * Cache entry
 */
interface ICacheEntry {
  /** Cached results */
  results: IResearchResult[];

  /** When cached */
  cachedAt: Date;

  /** Expires at */
  expiresAt: Date;

  /** Hit count */
  hitCount: number;

  /** Last accessed */
  lastAccessedAt: Date;

  /** Source query hash */
  queryHash: string;
}

/**
 * Cache statistics
 */
export interface ICacheStats {
  /** Total entries */
  totalEntries: number;

  /** Total hits */
  totalHits: number;

  /** Total misses */
  totalMisses: number;

  /** Hit rate (0-1) */
  hitRate: number;

  /** Total cached results */
  totalCachedResults: number;

  /** Memory estimate (bytes) */
  estimatedMemoryBytes: number;

  /** Oldest entry age (ms) */
  oldestEntryAge: number;

  /** Most accessed query */
  mostAccessedQuery: string | null;
}

/**
 * Cache configuration
 */
interface ICacheConfig {
  /** Maximum entries */
  maxEntries: number;

  /** Default TTL in milliseconds */
  defaultTTLMs: number;

  /** TTL by source (some sources update more frequently) */
  ttlBySource?: Partial<Record<ResearchSource, number>>;

  /** Enable LRU eviction */
  enableLRU: boolean;

  /** Persist to disk (future) */
  persistToDisk: boolean;
}

const DEFAULT_CONFIG: ICacheConfig = {
  maxEntries: 1000,
  defaultTTLMs: 60 * 60 * 1000, // 1 hour
  ttlBySource: {
    [ResearchSource.NEWS]: 15 * 60 * 1000, // 15 minutes for news
    [ResearchSource.PUBMED]: 24 * 60 * 60 * 1000, // 24 hours for PubMed
    [ResearchSource.SEMANTIC_SCHOLAR]: 12 * 60 * 60 * 1000, // 12 hours
    [ResearchSource.OPENALEX]: 12 * 60 * 60 * 1000, // 12 hours
    [ResearchSource.ARXIV]: 6 * 60 * 60 * 1000, // 6 hours for preprints
  },
  enableLRU: true,
  persistToDisk: false,
};

/**
 * Research Result Cache
 *
 * Provides caching layer for search results to:
 * - Reduce API calls to external sources
 * - Speed up repeated queries
 * - Enable offline-first patterns
 */
export class ResultCache {
  private cache: Map<string, ICacheEntry>;
  private config: ICacheConfig;
  private stats: {
    hits: number;
    misses: number;
  };

  constructor(config: Partial<ICacheConfig> = {}) {
    this.cache = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cached results for query
   */
  get(query: IResearchQuery, source: ResearchSource): IResearchResult[] | null {
    const key = this.generateCacheKey(query, source);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.hitCount++;
    entry.lastAccessedAt = new Date();
    this.stats.hits++;

    return entry.results;
  }

  /**
   * Cache results for query
   */
  set(
    query: IResearchQuery,
    source: ResearchSource,
    results: IResearchResult[]
  ): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      this.evict();
    }

    const key = this.generateCacheKey(query, source);
    const ttl = this.getTTL(source);
    const now = new Date();

    const entry: ICacheEntry = {
      results,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      hitCount: 0,
      lastAccessedAt: now,
      queryHash: key,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if query is cached (without updating stats)
   */
  has(query: IResearchQuery, source: ResearchSource): boolean {
    const key = this.generateCacheKey(query, source);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache for query
   */
  invalidate(query: IResearchQuery, source: ResearchSource): boolean {
    const key = this.generateCacheKey(query, source);
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries for a source
   */
  invalidateSource(source: ResearchSource): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (key.startsWith(`${source}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): ICacheStats {
    const now = new Date();
    let totalResults = 0;
    let oldestAge = 0;
    let mostAccessedQuery: string | null = null;
    let maxHits = 0;

    for (const entry of Array.from(this.cache.values())) {
      totalResults += entry.results.length;

      const age = now.getTime() - entry.cachedAt.getTime();
      if (age > oldestAge) {
        oldestAge = age;
      }

      if (entry.hitCount > maxHits) {
        maxHits = entry.hitCount;
        mostAccessedQuery = entry.queryHash;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      totalCachedResults: totalResults,
      estimatedMemoryBytes: this.estimateMemoryUsage(),
      oldestEntryAge: oldestAge,
      mostAccessedQuery,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Generate cache key from query
   */
  private generateCacheKey(query: IResearchQuery, source: ResearchSource): string {
    // Normalize query for consistent caching
    const normalized = {
      topic: query.topic.toLowerCase().trim(),
      keywords: [...query.keywords].sort().map(k => k.toLowerCase()),
      dateFrom: query.dateRange.from.toISOString().split('T')[0],
      dateTo: query.dateRange.to.toISOString().split('T')[0],
      categories: query.categories ? [...query.categories].sort() : [],
      maxResults: query.maxResultsPerSource || 50,
    };

    const queryString = JSON.stringify(normalized);
    const hash = this.simpleHash(queryString);

    return `${source}:${hash}`;
  }

  /**
   * Simple string hash (djb2)
   */
  private simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get TTL for source
   */
  private getTTL(source: ResearchSource): number {
    if (this.config.ttlBySource && this.config.ttlBySource[source]) {
      return this.config.ttlBySource[source]!;
    }
    return this.config.defaultTTLMs;
  }

  /**
   * Evict entries when at capacity
   */
  private evict(): void {
    if (!this.config.enableLRU) {
      // Simple: remove oldest
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
      return;
    }

    // LRU: remove least recently used
    let oldestKey: string | null = null;
    let oldestAccess = new Date();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let bytes = 0;

    for (const entry of Array.from(this.cache.values())) {
      // Rough estimate: JSON stringify length * 2 (UTF-16)
      bytes += JSON.stringify(entry.results).length * 2;
      bytes += 200; // Entry overhead
    }

    return bytes;
  }
}

/**
 * Singleton instance for global caching
 */
export const resultCache = new ResultCache();
