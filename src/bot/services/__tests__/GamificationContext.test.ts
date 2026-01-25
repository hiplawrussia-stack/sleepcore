/**
 * GamificationContext Tests
 * =========================
 *
 * Tests for gamification service locator.
 * Validates lazy initialization, singleton behavior, and database lifecycle.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';

// Mock SQLiteConnection
jest.mock('../../../infrastructure/database/sqlite/SQLiteConnection', () => ({
  SQLiteConnection: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(undefined),
    all: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock SQLiteMigration
jest.mock('../../../infrastructure/database/sqlite/SQLiteMigration', () => ({
  SQLiteMigration: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    migrate: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock GamificationRepository
jest.mock('../../../infrastructure/database/repositories/GamificationRepository', () => ({
  GamificationRepository: jest.fn().mockImplementation(() => ({
    getUser: jest.fn().mockResolvedValue(null),
    saveUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock GamificationEngine
const mockGamificationEngine = {
  recordActivity: jest.fn().mockResolvedValue({ success: true }),
  getUserStats: jest.fn().mockResolvedValue({ totalPoints: 0, level: 1 }),
  getAvailableAchievements: jest.fn().mockResolvedValue([]),
};

jest.mock('../../../modules/gamification', () => ({
  GamificationEngine: jest.fn().mockImplementation(() => mockGamificationEngine),
}));

// Import after mocks
import { gamificationContext, getGamificationEngine } from '../GamificationContext';

describe('GamificationContext', () => {
  beforeEach(() => {
    // Reset the singleton state between tests
    // Using any to access private properties for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gamificationContext as any).engine = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gamificationContext as any).db = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gamificationContext as any).initialized = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gamificationContext as any).initializing = null;
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should initialize context successfully', async () => {
      await gamificationContext.initialize('test.db');

      expect(gamificationContext.isInitialized()).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      await gamificationContext.initialize('test.db');
      await gamificationContext.initialize('test.db');

      // SQLiteConnection should only be instantiated once
      const { SQLiteConnection } = require('../../../infrastructure/database/sqlite/SQLiteConnection');
      expect(SQLiteConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent initialization', async () => {
      // Start multiple initializations
      const init1 = gamificationContext.initialize('test.db');
      const init2 = gamificationContext.initialize('test.db');
      const init3 = gamificationContext.initialize('test.db');

      await Promise.all([init1, init2, init3]);

      expect(gamificationContext.isInitialized()).toBe(true);
      // Should only create one connection
      const { SQLiteConnection } = require('../../../infrastructure/database/sqlite/SQLiteConnection');
      expect(SQLiteConnection).toHaveBeenCalledTimes(1);
    });

    it('should use default database path', async () => {
      await gamificationContext.initialize();

      const { SQLiteConnection } = require('../../../infrastructure/database/sqlite/SQLiteConnection');
      expect(SQLiteConnection).toHaveBeenCalledWith({
        type: 'sqlite',
        connectionString: 'database/gamification.db',
        verbose: false,
      });
    });

    it('should throw error on initialization failure', async () => {
      const { SQLiteConnection } = require('../../../infrastructure/database/sqlite/SQLiteConnection');
      SQLiteConnection.mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
      }));

      await expect(gamificationContext.initialize('failing.db')).rejects.toThrow('Connection failed');
      expect(gamificationContext.isInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // Get Engine
  // ==========================================================================
  describe('Get Engine', () => {
    it('should return engine after initialization', async () => {
      await gamificationContext.initialize('test.db');

      const engine = gamificationContext.getEngine();

      expect(engine).toBeDefined();
    });

    it('should throw error if not initialized', () => {
      expect(() => gamificationContext.getEngine()).toThrow(
        'GamificationContext not initialized. Call initialize() first.'
      );
    });
  });

  // ==========================================================================
  // Event Emitter
  // ==========================================================================
  describe('Event Emitter', () => {
    it('should return event emitter', () => {
      const emitter = gamificationContext.getEventEmitter();

      expect(emitter).toBeInstanceOf(EventEmitter);
    });

    it('should return the same event emitter instance', () => {
      const emitter1 = gamificationContext.getEventEmitter();
      const emitter2 = gamificationContext.getEventEmitter();

      expect(emitter1).toBe(emitter2);
    });
  });

  // ==========================================================================
  // Initialization State
  // ==========================================================================
  describe('Initialization State', () => {
    it('should return false when not initialized', () => {
      expect(gamificationContext.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await gamificationContext.initialize('test.db');

      expect(gamificationContext.isInitialized()).toBe(true);
    });
  });

  // ==========================================================================
  // Close
  // ==========================================================================
  describe('Close', () => {
    it('should close database connection', async () => {
      await gamificationContext.initialize('test.db');
      await gamificationContext.close();

      expect(gamificationContext.isInitialized()).toBe(false);
    });

    it('should handle close when not initialized', async () => {
      await expect(gamificationContext.close()).resolves.not.toThrow();
    });

    it('should allow re-initialization after close', async () => {
      await gamificationContext.initialize('test.db');
      await gamificationContext.close();
      await gamificationContext.initialize('test2.db');

      expect(gamificationContext.isInitialized()).toBe(true);
    });
  });

  // ==========================================================================
  // getGamificationEngine Helper
  // ==========================================================================
  describe('getGamificationEngine Helper', () => {
    it('should initialize and return engine', async () => {
      const engine = await getGamificationEngine();

      expect(engine).toBeDefined();
      expect(gamificationContext.isInitialized()).toBe(true);
    });

    it('should return existing engine if already initialized', async () => {
      await gamificationContext.initialize('test.db');

      const engine = await getGamificationEngine();

      expect(engine).toBeDefined();
    });
  });
});
