/**
 * ProgressCommand Unit Tests
 * ===========================
 * Tests for /progress command - weekly progress report.
 */

import { ProgressCommand, progressCommand } from '../../../../src/bot/commands/ProgressCommand';
import {
  createMockContext,
  createMockContextNoSession,
  createMockSleepCoreAPI,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

describe('ProgressCommand', () => {
  let command: ProgressCommand;

  beforeEach(() => {
    command = new ProgressCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('progress');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('прогресс');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('stats');
      expect(command.aliases).toContain('report');
      expect(command.aliases).toContain('прогресс');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });
  });

  describe('execute()', () => {
    it('should show progress report when session available', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'отчёт');
    });

    it('should show no session message when session is missing', async () => {
      const ctx = createMockContextNoSession();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Сессия');
    });

    it('should display week number', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock returns week 2
      assertContainsText(result, '2');
    });

    it('should display sleep efficiency', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock returns 82%
      assertContainsText(result, '82');
    });

    it('should display ISI score', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock returns ISI 12
      assertContainsText(result, '12');
    });

    it('should display ISI change', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock returns -3 change (improvement, shown as ↑ since lower is better)
      expect(result.message).toMatch(/[↓↑→]|3/);
    });

    it('should display adherence', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock returns 85% adherence
      assertContainsText(result, '85');
    });

    it('should display achievements', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Достижения');
    });

    it('should display response status', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock returns 'responding' status
      expect(result.message).toMatch(/🟢|Отличный|ответ/i);
    });

    it('should offer action buttons', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
    });
  });

  describe('sleep efficiency visualization', () => {
    it('should show progress bar or percentage', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should contain percentage or visual indicator
      expect(result.message).toMatch(/%|█|░/);
    });

    it('should show trend chart', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Should have day labels
      expect(result.message).toMatch(/Пн|Вт|Ср|Чт|Пт|Сб|Вс/);
    });
  });

  describe('no progress data handling', () => {
    it('should handle missing progress report', async () => {
      const mockSleepCore = createMockSleepCoreAPI({
        getProgressReport: jest.fn().mockReturnValue(null),
      });
      const ctx = createMockContext({ sleepCore: mockSleepCore });
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      // Should show insufficient data message
      assertContainsText(result, 'данных');
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(progressCommand).toBeInstanceOf(ProgressCommand);
      expect(progressCommand.name).toBe('progress');
    });
  });
});
