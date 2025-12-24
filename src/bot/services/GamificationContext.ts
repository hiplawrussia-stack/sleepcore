/**
 * GamificationContext - Gamification Service Locator
 * ====================================================
 * Provides access to GamificationEngine from bot commands.
 * Implements lazy initialization for efficient resource usage.
 *
 * Research basis (Sprint 6-7):
 * - Facade Pattern for unified gamification access
 * - Service Locator for decoupled command architecture
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import { EventEmitter } from 'events';
import type { IGamificationEngine } from '../../modules/gamification';
import { GamificationEngine } from '../../modules/gamification';
import { GamificationRepository } from '../../infrastructure/database/repositories/GamificationRepository';
import { SQLiteConnection } from '../../infrastructure/database/sqlite/SQLiteConnection';
import { SQLiteMigration } from '../../infrastructure/database/sqlite/SQLiteMigration';
import { MIGRATIONS } from '../../infrastructure/database/migrations';

/**
 * GamificationContext singleton
 * Manages GamificationEngine lifecycle and provides access to commands
 */
class GamificationContextClass {
  private engine: IGamificationEngine | null = null;
  private db: SQLiteConnection | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private initialized = false;
  private initializing: Promise<void> | null = null;

  /**
   * Initialize the gamification context
   * @param dbPath - Path to SQLite database (default: database/gamification.db)
   */
  async initialize(dbPath: string = 'database/gamification.db'): Promise<void> {
    if (this.initialized) return;

    // Prevent concurrent initialization
    if (this.initializing) {
      await this.initializing;
      return;
    }

    this.initializing = this.doInitialize(dbPath);
    await this.initializing;
    this.initializing = null;
  }

  private async doInitialize(dbPath: string): Promise<void> {
    try {
      // Create database connection
      this.db = new SQLiteConnection({
        type: 'sqlite',
        connectionString: dbPath,
        verbose: false,
      });
      await this.db.connect();

      // Run migrations
      const migration = new SQLiteMigration(this.db);
      await migration.initialize();
      await migration.migrate([...MIGRATIONS]);

      // Create repository and engine
      const repository = new GamificationRepository(this.db);
      this.engine = new GamificationEngine(repository, this.eventEmitter);

      this.initialized = true;
      console.log('[GamificationContext] Initialized successfully');
    } catch (error) {
      console.error('[GamificationContext] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get the GamificationEngine instance
   * @throws Error if not initialized
   */
  getEngine(): IGamificationEngine {
    if (!this.engine) {
      throw new Error('GamificationContext not initialized. Call initialize() first.');
    }
    return this.engine;
  }

  /**
   * Get event emitter for gamification events
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * Check if context is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    this.engine = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const gamificationContext = new GamificationContextClass();

/**
 * Get GamificationEngine with lazy initialization
 * Safe to use in commands - will initialize on first access
 */
export async function getGamificationEngine(): Promise<IGamificationEngine> {
  if (!gamificationContext.isInitialized()) {
    await gamificationContext.initialize();
  }
  return gamificationContext.getEngine();
}
