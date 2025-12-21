/**
 * DiaryCommand Unit Tests
 * ========================
 * Tests for /diary command - 3-tap sleep diary entry.
 */

import { DiaryCommand, diaryCommand } from '../../../../src/bot/commands/DiaryCommand';
import {
  createMockContext,
  createMockSleepCoreAPI,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
  assertCallbackData,
} from './testHelpers';

describe('DiaryCommand', () => {
  let command: DiaryCommand;

  beforeEach(() => {
    command = new DiaryCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('diary');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('дневник');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('sleep');
      expect(command.aliases).toContain('log');
      expect(command.aliases).toContain('дневник');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });

    it('should define conversation steps', () => {
      expect(command.steps).toContain('intro');
      expect(command.steps).toContain('bedtime_hour');
      expect(command.steps).toContain('sleep_quality');
      expect(command.steps).toContain('summary');
    });
  });

  describe('execute()', () => {
    it('should show intro with date', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Дневник сна');
    });

    it('should offer quick entry options', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 2);
      assertCallbackData(result, 'diary:quick:');
    });

    it('should offer manual entry option', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      const buttons = result.keyboard!.flat();
      const manualButton = buttons.find(b => b.text.includes('вручную'));
      expect(manualButton).toBeDefined();
    });

    it('should include metadata with current step', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.metadata?.step).toBe('intro');
      expect(result.metadata?.date).toBeDefined();
    });
  });

  describe('handleStep()', () => {
    it('should handle intro step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'intro', { date: '2024-12-22' });

      assertSuccessWithMessage(result);
      assertHasKeyboard(result);
    });

    it('should handle bedtime_hour step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'bedtime_hour', { date: '2024-12-22' });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Шаг 1/3');
      assertContainsText(result, 'легли спать');
    });

    it('should show hour selection buttons', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'bedtime_hour', { date: '2024-12-22' });

      assertHasKeyboard(result, 3);
      assertCallbackData(result, 'diary:bedtime_hour:');
    });

    it('should handle bedtime_minute step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'bedtime_minute', {
        date: '2024-12-22',
        bedtimeHour: 23,
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, '23:__');
      assertCallbackData(result, 'diary:bedtime_min:');
    });

    it('should handle waketime_hour step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'waketime_hour', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 30,
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Шаг 2/3');
      assertContainsText(result, '23:30');
    });

    it('should handle waketime_minute step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'waketime_minute', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 30,
        waketimeHour: 7,
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, '07:__');
    });

    it('should handle sleep_quality step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'sleep_quality', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Шаг 3/3');
      assertContainsText(result, 'качество');
      assertCallbackData(result, 'diary:quality:');
    });

    it('should show time in bed duration', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'sleep_quality', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
      });

      // 8 hours in bed
      assertContainsText(result, '8');
    });

    it('should handle summary step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'summary', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 4,
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'сохранена');
    });

    it('should return error for unknown step', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'unknown', { date: '2024-12-22' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });
  });

  describe('handleCallback()', () => {
    it('should process quick entry callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'diary:quick:22-6', { date: '2024-12-22' });

      assertSuccessWithMessage(result);
      expect(result.metadata?.bedtimeHour).toBe(22);
      expect(result.metadata?.waketimeHour).toBe(6);
    });

    it('should process bedtime hour callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'diary:bedtime_hour:23', { date: '2024-12-22' });

      assertSuccessWithMessage(result);
      expect(result.metadata?.bedtimeHour).toBe(23);
      expect(result.metadata?.step).toBe('bedtime_minute');
    });

    it('should process bedtime minute callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'diary:bedtime_min:30', {
        date: '2024-12-22',
        bedtimeHour: 23,
      });

      expect(result.metadata?.bedtimeMinute).toBe(30);
      expect(result.metadata?.step).toBe('waketime_hour');
    });

    it('should process wake hour callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'diary:wake_hour:7', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
      });

      expect(result.metadata?.waketimeHour).toBe(7);
    });

    it('should process wake minute callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'diary:wake_min:15', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
      });

      expect(result.metadata?.waketimeMinute).toBe(15);
      expect(result.metadata?.step).toBe('sleep_quality');
    });

    it('should process quality callback and save entry', async () => {
      const mockSleepCore = createMockSleepCoreAPI();
      const ctx = createMockContext({ sleepCore: mockSleepCore });

      const result = await command.handleCallback(ctx, 'diary:quality:4', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
      });

      expect(result.metadata?.sleepQuality).toBe(4);
      expect(result.metadata?.step).toBe('summary');
      expect(mockSleepCore.addDiaryEntry).toHaveBeenCalled();
    });

    it('should reject invalid callback prefix', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'other:action', { date: '2024-12-22' });

      expect(result.success).toBe(false);
    });
  });

  describe('duration calculation', () => {
    it('should calculate duration correctly within same day', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'sleep_quality', {
        date: '2024-12-22',
        bedtimeHour: 1,
        bedtimeMinute: 0,
        waketimeHour: 8,
        waketimeMinute: 30,
      });

      // 7 hours 30 minutes
      assertContainsText(result, '7');
    });

    it('should handle crossing midnight correctly', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'sleep_quality', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
      });

      // 8 hours
      assertContainsText(result, '8');
    });
  });

  describe('quality rating', () => {
    it('should show quality buttons 1-5', async () => {
      const ctx = createMockContext();
      const result = await command.handleStep(ctx, 'sleep_quality', {
        date: '2024-12-22',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
      });

      const buttons = result.keyboard![0];
      expect(buttons.length).toBe(5);
      expect(buttons[0].callbackData).toBe('diary:quality:1');
      expect(buttons[4].callbackData).toBe('diary:quality:5');
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(diaryCommand).toBeInstanceOf(DiaryCommand);
      expect(diaryCommand.name).toBe('diary');
    });
  });
});
