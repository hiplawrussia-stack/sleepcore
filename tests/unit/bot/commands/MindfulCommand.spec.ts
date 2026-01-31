/**
 * MindfulCommand Unit Tests
 * ==========================
 * Tests for /mindful command - MBT-I/ACT-I practices.
 */

import { MindfulCommand, mindfulCommand } from '../../../../src/bot/commands/MindfulCommand';
import {
  createMockContext,
  createMockSleepCoreAPI,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('MindfulCommand', () => {
  let command: MindfulCommand;

  beforeEach(() => {
    command = new MindfulCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('mindful');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('осознанности');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('mindfulness');
      expect(command.aliases).toContain('meditation');
      expect(command.aliases).toContain('осознанность');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBeFalsy();
    });
  });

  describe('execute() without args', () => {
    it('should show practice selection menu', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'осознанности');
    });

    it('should offer multiple practices', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have at least 1 keyboard row (dynamic content)
      assertHasKeyboard(result, 1);
    });

    it('should show practice list from ContentService', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should show mindfulness practices from ContentService
      expect(result.message).toMatch(/Практик|мин/i);
    });

    it('should use mindful callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertCallbackData(result, 'mindful:');
    });
  });

  describe('execute() with practice args', () => {
    it('should show grounding practice by ID', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      assertSuccessWithMessage(result);
      // Should show the practice content
      expect(result.message).toMatch(/заземл|5-4-3-2-1|чувств/i);
    });

    it('should show body scan practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'mindful-body-scan-001');

      assertSuccessWithMessage(result);
      // Should show body scan content
      expect(result.message?.length).toBeGreaterThan(50);
    });

    it('should include duration in menu', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Duration is shown as "X мин" in menu
      expect(result.message).toMatch(/\d+\s*мин/i);
    });

    it('should offer navigation after practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      assertHasKeyboard(result);
    });

    it('should show menu for unknown practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'unknown');

      assertSuccessWithMessage(result);
      assertHasKeyboard(result);
    });
  });

  describe('practice content', () => {
    it('should have step-by-step instructions when showing practice', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      // Should have numbered steps (Шаг 1, Шаг 2, etc.)
      expect(result.message).toMatch(/Шаг\s*\d|шаг|ВИДИШЬ|ПОТРОГАТЬ/i);
    });

    it('should include mindfulness guidance', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx, 'grounding-54321-001');

      // Should have helpful guidance (more than 100 chars)
      expect(result.message?.length).toBeGreaterThan(100);
    });
  });

  describe('handleCallback - completion with MBT-I wiring', () => {
    it('should call recordMBTIPractice when mbtiPlan exists', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          mbtiPlan: { currentWeek: 2, practiceLog: [] },
        }),
        recordMBTIPractice: jest.fn().mockReturnValue(null),
        assessArousal: jest.fn().mockReturnValue({
          cognitive: 0.6,
          somatic: 0.4,
          sleepEffort: 0.3,
        }),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      const result = await command.handleCallback(ctx, 'mindful:done:grounding-54321-001', {});

      assertSuccessWithMessage(result);
      expect(mockSleepCore.recordMBTIPractice).toHaveBeenCalledWith(
        ctx.userId,
        expect.objectContaining({
          completed: true,
          practice: expect.any(String),
          duration: expect.any(Number),
        })
      );
    });

    it('should NOT call recordMBTIPractice when mbtiPlan is null', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          mbtiPlan: null,
        }),
        recordMBTIPractice: jest.fn(),
        assessArousal: jest.fn().mockReturnValue(null),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      await command.handleCallback(ctx, 'mindful:done:grounding-54321-001', {});

      expect(mockSleepCore.recordMBTIPractice).not.toHaveBeenCalled();
    });

    it('should show arousal info when cognitive arousal > 0.5', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          mbtiPlan: { currentWeek: 2, practiceLog: [] },
        }),
        recordMBTIPractice: jest.fn().mockReturnValue(null),
        assessArousal: jest.fn().mockReturnValue({
          cognitive: 0.7,
          somatic: 0.4,
          sleepEffort: 0.3,
        }),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      const result = await command.handleCallback(ctx, 'mindful:done:grounding-54321-001', {});

      expect(result.message).toContain('Когнитивное возбуждение: 70%');
      expect(result.message).toContain('Ong et al., 2014');
    });

    it('should use assessArousal for pre-arousal in practice session', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          mbtiPlan: { currentWeek: 2, practiceLog: [] },
        }),
        recordMBTIPractice: jest.fn().mockReturnValue(null),
        assessArousal: jest.fn().mockReturnValue({
          cognitive: 0.8,
          somatic: 0.6,
          sleepEffort: 0.3,
        }),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      await command.handleCallback(ctx, 'mindful:done:grounding-54321-001', {});

      expect(mockSleepCore.recordMBTIPractice).toHaveBeenCalledWith(
        ctx.userId,
        expect.objectContaining({
          preArousalLevel: 0.7, // (0.8 + 0.6) / 2
          postArousalLevel: expect.closeTo(0.49, 1), // 0.7 * 0.7
        })
      );
    });
  });

  describe('mapContentToPractice', () => {
    it('should map body_scan content ID correctly', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          mbtiPlan: { currentWeek: 1, practiceLog: [] },
        }),
        recordMBTIPractice: jest.fn().mockReturnValue(null),
        assessArousal: jest.fn().mockReturnValue(null),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      await command.handleCallback(ctx, 'mindful:done:mindful-body-scan-001', {});

      expect(mockSleepCore.recordMBTIPractice).toHaveBeenCalledWith(
        ctx.userId,
        expect.objectContaining({ practice: 'body_scan' })
      );
    });

    it('should fallback to breath_awareness for unknown content IDs', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          mbtiPlan: { currentWeek: 1, practiceLog: [] },
        }),
        recordMBTIPractice: jest.fn().mockReturnValue(null),
        assessArousal: jest.fn().mockReturnValue(null),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      await command.handleCallback(ctx, 'mindful:done:grounding-54321-001', {});

      expect(mockSleepCore.recordMBTIPractice).toHaveBeenCalledWith(
        ctx.userId,
        expect.objectContaining({ practice: 'breath_awareness' })
      );
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(mindfulCommand).toBeInstanceOf(MindfulCommand);
      expect(mindfulCommand.name).toBe('mindful');
    });
  });
});
