/**
 * RehearsalCommand Unit Tests
 * ===========================
 * Tests for /rehearsal command - pre-sleep mental rehearsal.
 */

import { RehearsalCommand } from '../../../../src/bot/commands/RehearsalCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
} from './testHelpers';

// Mock cognitive module
jest.mock('../../../../src/cognitive', () => ({
  createSmartMemoryWindowEngine: jest.fn().mockReturnValue({
    getEveningRehearsal: jest.fn().mockResolvedValue({
      userId: 'test-user',
      bedtime: '23:00',
      rules: [
        {
          id: 'rule1',
          title: 'Stimulus Control',
          visualization: 'Imagine your bed only for sleep...',
        },
        {
          id: 'rule2',
          title: 'Sleep Restriction',
          visualization: 'Visualize waking at the same time...',
        },
      ],
      intention: null,
      completed: false,
    }),
    recordVisualizationComplete: jest.fn().mockResolvedValue(undefined),
    setIntention: jest.fn().mockResolvedValue({
      intention: 'Sleep well tonight',
      set: true,
    }),
    getProgress: jest.fn().mockResolvedValue({
      totalRehearsals: 10,
      streak: 5,
      rulesVisualized: 20,
      averageTime: 8,
    }),
    analytics: {
      generateProgressReport: jest.fn().mockReturnValue({
        summary: 'Great progress!',
        streak: 5,
        totalSessions: 10,
        recommendations: ['Keep up the good work'],
      }),
    },
  }),
}));

describe('RehearsalCommand', () => {
  let command: RehearsalCommand;

  beforeEach(() => {
    command = new RehearsalCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('rehearsal');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('репетиция');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('репетиция');
      expect(command.aliases).toContain('вечер');
      expect(command.aliases).toContain('memory');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  describe('execute()', () => {
    it('should show rehearsal options', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should have keyboard with actions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
    });

    it('should parse bedtime from args', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, '22:30');

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle force callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'rehearsal:force', {});

      assertSuccessWithMessage(result);
    });

    it('should handle visualize callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'rehearsal:visualize:0', {});

      expect(result).toBeDefined();
    });

    it('should handle next_viz callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'rehearsal:next_viz:0', {});

      expect(result).toBeDefined();
    });

    it('should handle intention callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'rehearsal:intention', {});

      expect(result).toBeDefined();
    });

    it('should handle progress callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'rehearsal:progress', {});

      expect(result).toBeDefined();
    });

    it('should return error for unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'rehearsal:unknown', {});

      expect(result.success).toBe(false);
    });
  });

  describe('time-of-day awareness', () => {
    it('should handle early hours (before 18:00)', async () => {
      // The command checks if hour is 18-23, otherwise shows early message
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Result should still be successful, may show different message
      assertSuccessWithMessage(result);
    });
  });
});
