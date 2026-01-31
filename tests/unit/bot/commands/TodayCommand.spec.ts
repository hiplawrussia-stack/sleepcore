/**
 * TodayCommand Unit Tests
 * ========================
 * Tests for /today command - daily CBT-I intervention.
 */

import { TodayCommand, todayCommand } from '../../../../src/bot/commands/TodayCommand';
import {
  createMockContext,
  createMockContextNoSession,
  createMockContextNoIntervention,
  createMockSleepCoreAPI,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

describe('TodayCommand', () => {
  let command: TodayCommand;

  beforeEach(() => {
    command = new TodayCommand();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('today');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('Задание');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('daily');
      expect(command.aliases).toContain('task');
      expect(command.aliases).toContain('сегодня');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });
  });

  describe('execute()', () => {
    it('should show intervention when session and intervention available', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Задание на сегодня');
      assertHasKeyboard(result);
    });

    it('should show no session message when session is missing', async () => {
      const ctx = createMockContextNoSession();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Сессия не найдена');
    });

    it('should show no intervention message when intervention is missing', async () => {
      const ctx = createMockContextNoIntervention();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'данных');
    });

    it('should display component name for sleep restriction', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Default mock returns sleep_restriction
      assertContainsText(result, 'Ограничение сна');
    });

    it('should display action instructions', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Что делать');
    });

    it('should display rationale', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock rationale
      assertContainsText(result, 'Оптимизация');
    });

    it('should display priority stars', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Priority 3 = 3 stars
      expect(result.message).toMatch(/⭐/);
    });

    it('should display timing label', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Mock timing is 'tonight'
      assertContainsText(result, 'Сегодня вечером');
    });

    it('should offer action buttons', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 3);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.text.includes('Выполнено'))).toBe(true);
      expect(buttons.some(b => b.text.includes('Нужна помощь'))).toBe(true);
    });

    it('should store intervention in metadata', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.metadata?.lastIntervention).toBeDefined();
    });
  });

  describe('component icons', () => {
    it('should use bed icon for sleep_restriction', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.message).toMatch(/🛏/);
    });
  });

  describe('no session handling', () => {
    it('should suggest starting program', async () => {
      const ctx = createMockContextNoSession();
      const result = await command.execute(ctx);

      assertContainsText(result, '/start');
    });

    it('should offer start and diary buttons', async () => {
      const ctx = createMockContextNoSession();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 2);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.text.includes('Начать'))).toBe(true);
      expect(buttons.some(b => b.text.includes('Записать'))).toBe(true);
    });
  });

  describe('no intervention handling', () => {
    it('should explain minimum 7 days required', async () => {
      const ctx = createMockContextNoIntervention();
      const result = await command.execute(ctx);

      assertContainsText(result, '7 дней');
    });

    it('should suggest alternative activities', async () => {
      const ctx = createMockContextNoIntervention();
      const result = await command.execute(ctx);

      assertContainsText(result, '/diary');
      assertContainsText(result, '/relax');
    });
  });

  describe('handleCallback()', () => {
    describe('today:done', () => {
      it('should record adherence via trackStimulusControlAdherence', async () => {
        const mockSleepCore = createMockSleepCoreAPI({
          trackStimulusControlAdherence: jest.fn().mockReturnValue({
            overallAdherence: 0.87,
            components: {},
          }),
        });
        const ctx = createMockContext({ sleepCore: mockSleepCore });
        const result = await command.handleCallback(ctx, 'today:done', {});

        assertSuccessWithMessage(result);
        expect(mockSleepCore.trackStimulusControlAdherence).toHaveBeenCalledWith('test-user-123');
      });

      it('should display adherence score when available', async () => {
        const mockSleepCore = createMockSleepCoreAPI({
          trackStimulusControlAdherence: jest.fn().mockReturnValue({
            overallAdherence: 0.87,
            components: {},
          }),
        });
        const ctx = createMockContext({ sleepCore: mockSleepCore });
        const result = await command.handleCallback(ctx, 'today:done', {});

        assertContainsText(result, '87%');
      });

      it('should work when adherence tracking returns null', async () => {
        const mockSleepCore = createMockSleepCoreAPI({
          trackStimulusControlAdherence: jest.fn().mockReturnValue(null),
        });
        const ctx = createMockContext({ sleepCore: mockSleepCore });
        const result = await command.handleCallback(ctx, 'today:done', {});

        assertSuccessWithMessage(result);
        assertContainsText(result, 'Отлично');
      });

      it('should set interventionCompleted metadata', async () => {
        const mockSleepCore = createMockSleepCoreAPI({
          trackStimulusControlAdherence: jest.fn().mockReturnValue(null),
        });
        const ctx = createMockContext({ sleepCore: mockSleepCore });
        const result = await command.handleCallback(ctx, 'today:done', {});

        expect(result.metadata?.interventionCompleted).toBe(true);
      });

      it('should offer diary and progress buttons', async () => {
        const mockSleepCore = createMockSleepCoreAPI({
          trackStimulusControlAdherence: jest.fn().mockReturnValue(null),
        });
        const ctx = createMockContext({ sleepCore: mockSleepCore });
        const result = await command.handleCallback(ctx, 'today:done', {});

        assertHasKeyboard(result);
        const buttons = result.keyboard!.flat();
        expect(buttons.some(b => b.callbackData === 'diary:start')).toBe(true);
        expect(buttons.some(b => b.callbackData === 'progress:show')).toBe(true);
      });
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(todayCommand).toBeInstanceOf(TodayCommand);
      expect(todayCommand.name).toBe('today');
    });
  });
});
