/**
 * TherapyCommand Unit Tests
 * =========================
 * Tests for /therapy command - 6-core CBT-I sessions.
 *
 * Coverage targets:
 * - execute(): Menu display, session requirements
 * - handleStep(): All 7 step handlers
 * - handleCallback(): All callback actions
 * - Edge cases: Locked sessions, missing data
 */

import { TherapyCommand, therapyCommand } from '../../../../src/bot/commands/TherapyCommand';
import type { ISleepCoreContext, ICommandResult } from '../../../../src/bot/commands/interfaces/ICommand';
import { SleepCoreAPI } from '../../../../src/SleepCoreAPI';

// ==================== Test Setup ====================

/**
 * Create mock ISleepCoreContext
 */
function createMockContext(overrides: Partial<{
  userId: string;
  displayName: string;
  hasSession: boolean;
  sessionData: Record<string, unknown>;
}> = {}): ISleepCoreContext {
  const {
    userId = 'test-user-123',
    displayName = 'Test User',
    hasSession = true,
    sessionData = { therapyWeek: 1 },
  } = overrides;

  const sleepCore = new SleepCoreAPI();
  if (hasSession) {
    sleepCore.startSession(userId);
    // Extend session with therapy data
    const session = sleepCore.getSession(userId);
    if (session) {
      Object.assign(session, sessionData);
    }
  }

  return {
    userId,
    chatId: 12345,
    displayName,
    languageCode: 'ru',
    sleepCore,
  } as ISleepCoreContext;
}

// ==================== Tests ====================

describe('TherapyCommand', () => {
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(therapyCommand.name).toBe('therapy');
    });

    it('should have description in Russian', () => {
      expect(therapyCommand.description).toContain('КПТ-И');
    });

    it('should have aliases', () => {
      expect(therapyCommand.aliases).toContain('session');
      expect(therapyCommand.aliases).toContain('терапия');
      expect(therapyCommand.aliases).toContain('сессия');
    });

    it('should require session', () => {
      expect(therapyCommand.requiresSession).toBe(true);
    });

    it('should have 7 steps', () => {
      expect(therapyCommand.steps).toHaveLength(7);
      expect(therapyCommand.steps).toContain('menu');
      expect(therapyCommand.steps).toContain('core_intro');
      expect(therapyCommand.steps).toContain('core_content');
      expect(therapyCommand.steps).toContain('core_exercise');
      expect(therapyCommand.steps).toContain('core_homework');
      expect(therapyCommand.steps).toContain('core_complete');
      expect(therapyCommand.steps).toContain('progress_review');
    });
  });

  describe('execute()', () => {
    it('should show no session message when user has no session', async () => {
      const ctx = createMockContext({ hasSession: false });
      const result = await therapyCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия не найдена');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard?.[0]?.[0]?.text).toContain('Начать программу');
    });

    it('should show therapy menu when user has session', async () => {
      const ctx = createMockContext({ hasSession: true });
      const result = await therapyCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('6-недельная программа КПТ-И');
      expect(result.message).toContain('Core 1');
      expect(result.message).toContain('Core 6');
      expect(result.keyboard).toBeDefined();
    });

    it('should show user progress in menu', async () => {
      const ctx = createMockContext({
        hasSession: true,
        sessionData: { therapyWeek: 3 },
      });
      const result = await therapyCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Неделя 3 из 8');
    });
  });

  describe('handleStep() - Menu', () => {
    it('should display all 6 core sessions', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Core 1');
      expect(result.message).toContain('Core 2');
      expect(result.message).toContain('Core 3');
      expect(result.message).toContain('Core 4');
      expect(result.message).toContain('Core 5');
      expect(result.message).toContain('Core 6');
    });

    it('should show locked status for future sessions', async () => {
      const ctx = createMockContext({
        sessionData: { therapyWeek: 1 },
      });
      const result = await therapyCommand.handleStep(ctx, 'menu', {});

      expect(result.success).toBe(true);
      // Week 1 user should see Core 1 unlocked, others locked
      expect(result.keyboard).toBeDefined();
      // First button should be for Core 1 (unlocked)
      expect(result.keyboard?.[0]?.[0]?.callbackData).toContain('start_core:overview');
      // Later buttons should be locked
      const lockedButtons = result.keyboard?.filter((row) =>
        row[0]?.callbackData?.includes('locked')
      );
      expect(lockedButtons?.length).toBeGreaterThan(0);
    });

    it('should include progress overview button', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'menu', {});

      const progressButton = result.keyboard?.find((row) =>
        row[0]?.callbackData?.includes('progress')
      );
      expect(progressButton).toBeDefined();
    });
  });

  describe('handleStep() - Core Intro', () => {
    it('should show core introduction with objectives', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_intro', {
        currentCore: 'overview',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Core 1');
      expect(result.message).toContain('Обзор программы');
      expect(result.message).toContain('Цели сессии');
      expect(result.message).toContain('Длительность');
    });

    it('should show correct objectives for Sleep Restriction core', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_intro', {
        currentCore: 'sleep_behavior_1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Core 2');
      expect(result.message).toContain('Ограничение сна');
      expect(result.message).toContain('SRT');
    });

    it('should have navigation buttons', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_intro', {
        currentCore: 'overview',
      });

      expect(result.keyboard).toBeDefined();
      const startButton = result.keyboard?.find((row) =>
        row[0]?.text?.includes('Начать сессию')
      );
      const backButton = result.keyboard?.find((row) =>
        row[0]?.text?.includes('Назад')
      );
      expect(startButton).toBeDefined();
      expect(backButton).toBeDefined();
    });
  });

  describe('handleStep() - Core Content', () => {
    it('should show detailed content for overview core', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_content', {
        currentCore: 'overview',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('инсомния');
      expect(result.message).toContain('3P-модель');
      expect(result.message).toContain('Spielman');
    });

    it('should show SRT content for sleep_behavior_1', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_content', {
        currentCore: 'sleep_behavior_1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ограничение сна');
      expect(result.message).toContain('TIB');
      expect(result.message).toContain('5.5 час');
      expect(result.message).toContain('Bootzin');
    });

    it('should show cognitive content for sleep_thoughts', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_content', {
        currentCore: 'sleep_thoughts',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Когнитивная');
      expect(result.message).toContain('Катастрофизация');
      expect(result.message).toContain('реструктуризации');
    });

    it('should show relapse prevention for problem_prevention', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_content', {
        currentCore: 'problem_prevention',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('рецидива');
      expect(result.message).toContain('триггеры');
    });
  });

  describe('handleStep() - Core Exercise', () => {
    it('should show 3P analysis exercise for overview', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_exercise', {
        currentCore: 'overview',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практическое упражнение');
      expect(result.message).toContain('3P');
      expect(result.message).toContain('Predisposing');
    });

    it('should show TIB calculation for sleep_behavior_1', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_exercise', {
        currentCore: 'sleep_behavior_1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('окна сна');
      expect(result.message).toContain('TST');
      expect(result.message).toContain('Отбой');
      expect(result.message).toContain('Подъём');
    });

    it('should show SE calculation for sleep_behavior_2', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_exercise', {
        currentCore: 'sleep_behavior_2',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('SE');
      expect(result.message).toContain('Формула');
    });

    it('should show bedroom audit for sleep_education', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_exercise', {
        currentCore: 'sleep_education',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Аудит спальни');
      expect(result.message).toContain('Температура');
    });

    it('should have completed/later buttons', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_exercise', {
        currentCore: 'overview',
      });

      const completedButton = result.keyboard?.find((row) =>
        row[0]?.text?.includes('Выполнено')
      );
      const laterButton = result.keyboard?.find((row) =>
        row[0]?.text?.includes('потом')
      );
      expect(completedButton).toBeDefined();
      expect(laterButton).toBeDefined();
    });
  });

  describe('handleStep() - Core Homework', () => {
    it('should show homework assignments', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_homework', {
        currentCore: 'overview',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Домашнее задание');
      expect(result.message).toContain('diary');
      expect(result.message).toContain('неделю');
    });

    it('should mention next session timing', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_homework', {
        currentCore: 'sleep_behavior_1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('7 дней');
    });

    it('should have complete session button', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_homework', {
        currentCore: 'overview',
      });

      const completeButton = result.keyboard?.find((row) =>
        row[0]?.text?.includes('Завершить')
      );
      expect(completeButton).toBeDefined();
    });
  });

  describe('handleStep() - Core Complete', () => {
    it('should show completion message', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_complete', {
        currentCore: 'overview',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия завершена');
      expect(result.message).toContain('Core 1');
      expect(result.message).toContain('✅');
    });

    it('should show next session info', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_complete', {
        currentCore: 'overview',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Следующая сессия');
      expect(result.message).toContain('Core 2');
    });

    it('should show congratulations for last core', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_complete', {
        currentCore: 'problem_prevention',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Поздравляем');
      expect(result.message).toContain('завершили');
    });

    it('should include progress percentage', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_complete', {
        currentCore: 'sleep_behavior_2', // Core 3
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('/6');
    });

    it('should record completion timestamp in metadata', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_complete', {
        currentCore: 'overview',
      });

      expect(result.metadata?.completedCore).toBe('overview');
      expect(result.metadata?.completedAt).toBeDefined();
    });
  });

  describe('handleStep() - Progress Review', () => {
    it('should show progress summary', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'progress_review', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Обзор прогресса');
      expect(result.message).toContain('Терапевтические сессии');
    });

    it('should show ISI trend', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'progress_review', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('ISI');
    });

    it('should show clinical goals', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'progress_review', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('ISI < 7');
      expect(result.message).toContain('SE ≥ 85%');
      expect(result.message).toContain('SOL < 20');
      expect(result.message).toContain('WASO < 30');
    });

    it('should have navigation buttons', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'progress_review', {});

      const sessionsButton = result.keyboard?.find((row) =>
        row[0]?.callbackData?.includes('menu')
      );
      const isiButton = result.keyboard?.find((row) =>
        row[0]?.text?.includes('ISI')
      );
      expect(sessionsButton).toBeDefined();
      expect(isiButton).toBeDefined();
    });
  });

  describe('handleCallback()', () => {
    it('should handle start_core callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:start_core:overview',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Core 1');
      expect(result.metadata?.currentCore).toBe('overview');
    });

    it('should handle continue callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:continue',
        { currentCore: 'overview' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Содержание сессии');
    });

    it('should handle exercise callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:exercise',
        { currentCore: 'overview' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практическое упражнение');
    });

    it('should handle homework callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:homework',
        { currentCore: 'overview' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Домашнее задание');
    });

    it('should handle complete callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:complete',
        { currentCore: 'overview' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия завершена');
    });

    it('should handle menu callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:menu',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('6-недельная программа');
    });

    it('should handle progress callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:progress',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Обзор прогресса');
    });

    it('should handle locked callback', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:locked:sleep_behavior_2',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('заблокирована');
    });

    it('should reject invalid callback prefix', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'invalid:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should handle unknown action', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should require core ID for start_core', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:start_core',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Core ID required');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown step', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'unknown_step', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });

    it('should handle missing core in core_intro', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_intro', {
        currentCore: 'invalid_core',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Core not found');
    });

    it('should handle missing core in core_content', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleStep(ctx, 'core_content', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Core not found');
    });
  });

  describe('6-Core CBT-I Content Validation', () => {
    const cores = [
      'overview',
      'sleep_behavior_1',
      'sleep_behavior_2',
      'sleep_education',
      'sleep_thoughts',
      'problem_prevention',
    ] as const;

    cores.forEach((coreId, index) => {
      it(`should have complete content for Core ${index + 1}: ${coreId}`, async () => {
        const ctx = createMockContext();

        // Test intro
        const intro = await therapyCommand.handleStep(ctx, 'core_intro', {
          currentCore: coreId,
        });
        expect(intro.success).toBe(true);
        expect(intro.message?.length).toBeGreaterThan(100);

        // Test content
        const content = await therapyCommand.handleStep(ctx, 'core_content', {
          currentCore: coreId,
        });
        expect(content.success).toBe(true);
        expect(content.message?.length).toBeGreaterThan(200);

        // Test exercise
        const exercise = await therapyCommand.handleStep(ctx, 'core_exercise', {
          currentCore: coreId,
        });
        expect(exercise.success).toBe(true);
        expect(exercise.message?.length).toBeGreaterThan(100);

        // Test homework
        const homework = await therapyCommand.handleStep(ctx, 'core_homework', {
          currentCore: coreId,
        });
        expect(homework.success).toBe(true);
        expect(homework.message?.length).toBeGreaterThan(100);

        // Test complete
        const complete = await therapyCommand.handleStep(ctx, 'core_complete', {
          currentCore: coreId,
        });
        expect(complete.success).toBe(true);
      });
    });
  });

  describe('Clinical Safety - Minimum TIB', () => {
    it('should mention 5.5 hour minimum in sleep_behavior_1', async () => {
      const ctx = createMockContext();
      const content = await therapyCommand.handleStep(ctx, 'core_content', {
        currentCore: 'sleep_behavior_1',
      });

      expect(content.message).toContain('5.5');
    });

    it('should reference safety floor in exercise', async () => {
      const ctx = createMockContext();
      const exercise = await therapyCommand.handleStep(ctx, 'core_exercise', {
        currentCore: 'sleep_behavior_1',
      });

      expect(exercise.message).toMatch(/5\.5|минимум/i);
    });
  });
});
