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

  describe('MCT Session Delivery', () => {
    /**
     * MCT tests use mocked SleepCoreAPI since MCT methods require
     * initialized MCT plan which needs specific setup.
     */
    function createMCTMockContext(overrides: Partial<Record<string, unknown>> = {}): ISleepCoreContext {
      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          currentPhase: 'treatment',
          weekNumber: 7,
          mctPlan: { startDate: '2026-01-30', currentSession: 1, totalSessions: 8 },
        }),
        isThirdWaveIndicated: jest.fn().mockReturnValue(true),
        recommendThirdWaveApproach: jest.fn().mockReturnValue(null),
        getSleepStates: jest.fn().mockReturnValue(Array(7).fill({ date: '2026-01-30' })),
        initializeMCT: jest.fn().mockReturnValue({
          startDate: '2026-01-30',
          currentSession: 1,
          totalSessions: 8,
        }),
        getWorryPostponementExercise: jest.fn().mockReturnValue({
          instructions: ['Заметьте мысль', 'Отложите на позже', 'Запишите', 'Вернитесь к делу'],
          postponeToTime: '18:00',
          worryPeriodDuration: 15,
          tips: ['Фиксированное время', 'Ограничьте 15 мин'],
        }),
        getDetachedMindfulnessExercise: jest.fn().mockReturnValue({
          instructions: ['Займите положение', 'Наблюдайте за мыслями', 'Не контролируйте'],
          metaphor: 'Мысли как облака в небе.',
          duration: 10,
        }),
        getATTSession: jest.fn().mockReturnValue({
          instructions: ['Сосредоточьтесь на звуке', 'Удерживайте внимание', 'Замечайте отвлечения'],
          tips: ['Начинайте с 5 минут', 'Практикуйте в тишине'],
        }),
        getMCTSessionSummary: jest.fn().mockReturnValue({
          keyTakeaways: ['Мысли — не факты', 'Беспокойство можно отложить'],
          homeExperiments: ['Откладывание 3 раза в день'],
          nextSessionPreview: 'Углублённая осознанность',
          progressHighlights: ['Освоена техника откладывания'],
        }),
        getProgressReport: jest.fn().mockReturnValue(null),
        estimateISI: jest.fn().mockReturnValue(0),
        ...overrides,
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    describe('mct_hub callback', () => {
      it('should show MCT session hub with exercise buttons', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_hub',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Метакогнитивная терапия');
        expect(result.message).toContain('Откладывание беспокойства');
        expect(result.message).toContain('Отстранённая осознанность');
        expect(result.message).toContain('Тренировка внимания');

        // Verify exercise buttons exist
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:mct_worry');
        expect(allCallbacks).toContain('therapy:mct_dm');
        expect(allCallbacks).toContain('therapy:mct_att_selective');
        expect(allCallbacks).toContain('therapy:mct_att_switching');
        expect(allCallbacks).toContain('therapy:mct_att_divided');
        expect(allCallbacks).toContain('therapy:mct_summary');
      });

      it('should show hub even without MCT summary', async () => {
        const ctx = createMCTMockContext({
          getMCTSessionSummary: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_hub',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Метакогнитивная терапия');
      });

      it('should fail without session', async () => {
        const ctx = createMCTMockContext({
          getSession: jest.fn().mockReturnValue(null),
          getMCTSessionSummary: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_hub',
          {}
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Сессия не найдена');
      });
    });

    describe('mct_worry callback', () => {
      it('should show worry postponement exercise', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_worry',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Откладывание беспокойства');
        expect(result.message).toContain('Wells');
        expect(result.message).toContain('18:00');
        expect(result.message).toContain('15 минут');
        expect(ctx.sleepCore.getWorryPostponementExercise).toHaveBeenCalledWith('test-user-123');
      });

      it('should show error when no MCT plan exists', async () => {
        const ctx = createMCTMockContext({
          getWorryPostponementExercise: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_worry',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('План MCT не найден');
      });
    });

    describe('mct_dm callback', () => {
      it('should show detached mindfulness exercise', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_dm',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Отстранённая осознанность');
        expect(result.message).toContain('Wells');
        expect(result.message).toContain('облака');
        expect(result.message).toContain('10 минут');
        expect(ctx.sleepCore.getDetachedMindfulnessExercise).toHaveBeenCalledWith('racing_thoughts');
      });
    });

    describe('mct_att callbacks', () => {
      it('should show ATT selective attention session', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_att_selective',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Тренировка внимания');
        expect(result.message).toContain('Избирательное внимание');
        expect(result.message).toContain('Wells');
        expect(result.message).toContain('текстовые инструкции');
      });

      it('should show ATT switching session', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_att_switching',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Переключение внимания');
      });

      it('should show ATT divided attention session', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_att_divided',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Распределённое внимание');
      });

      it('should call getATTSession with correct phase', async () => {
        const ctx = createMCTMockContext();
        await therapyCommand.handleCallback(ctx, 'therapy:mct_att_selective', {});
        expect(ctx.sleepCore.getATTSession).toHaveBeenCalledWith('selective');

        await therapyCommand.handleCallback(ctx, 'therapy:mct_att_switching', {});
        expect(ctx.sleepCore.getATTSession).toHaveBeenCalledWith('switching');

        await therapyCommand.handleCallback(ctx, 'therapy:mct_att_divided', {});
        expect(ctx.sleepCore.getATTSession).toHaveBeenCalledWith('divided');
      });
    });

    describe('mct_summary callback', () => {
      it('should show MCT session summary', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_summary',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Итоги сессии MCT');
        expect(result.message).toContain('Мысли — не факты');
        expect(result.message).toContain('Откладывание 3 раза в день');
        expect(result.message).toContain('Углублённая осознанность');
        expect(result.message).toContain('Освоена техника откладывания');
        expect(ctx.sleepCore.getMCTSessionSummary).toHaveBeenCalledWith('test-user-123');
      });

      it('should show error when no MCT plan exists', async () => {
        const ctx = createMCTMockContext({
          getMCTSessionSummary: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mct_summary',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Итоги сессии недоступны');
      });
    });

    describe('MCT initialization redirect', () => {
      it('should show MCT hub button after MCT initialization', async () => {
        const ctx = createMCTMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:start_mct',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('План');
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:mct_hub');
      });
    });
  });

  describe('Evidence Base Integration', () => {
    /**
     * Evidence tests use mocked SleepCoreAPI since evidence methods
     * return structured data from EuropeanInsomnia2023.
     */
    function createEvidenceMockContext(): ISleepCoreContext {
      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          currentPhase: 'treatment',
          weekNumber: 2,
        }),
        getTreatmentRecommendations: jest.fn().mockReturnValue([
          {
            id: 'rec_cbti',
            category: 'treatment',
            text: 'CBT-I is recommended as first-line treatment',
            textRu: 'КПТ-И рекомендуется как терапия первой линии',
            evidenceGrade: 'A',
            strength: 'strong',
            isNew2023: false,
            source: 'Riemann et al., 2023',
          },
          {
            id: 'rec_dcbti',
            category: 'treatment',
            text: 'Digital CBT-I is effective',
            textRu: 'Цифровая КПТ-И эффективна',
            evidenceGrade: 'A',
            strength: 'strong',
            isNew2023: true,
            source: 'Riemann et al., 2023',
          },
        ]),
        getNew2023Recommendations: jest.fn().mockReturnValue([
          {
            id: 'new_dcbti',
            category: 'treatment',
            text: 'Digital CBT-I recommended',
            textRu: 'Цифровая КПТ-И рекомендуется как альтернатива очной терапии',
            evidenceGrade: 'A',
            strength: 'strong',
            isNew2023: true,
            source: 'Riemann et al., 2023',
          },
          {
            id: 'new_pharma',
            category: 'pharmacological',
            text: 'Pharmacological update',
            textRu: 'Обновление фармакологических рекомендаций',
            evidenceGrade: 'B',
            strength: 'conditional',
            isNew2023: true,
            source: 'Riemann et al., 2023',
          },
        ]),
        getCBTIComponentEvidence: jest.fn().mockReturnValue([
          {
            component: 'multicomponent_cbti',
            effectSize: 0.84,
            effectSizeCI: [0.72, 0.96],
            nStudies: 87,
            nParticipants: 9475,
            quality: 'high',
            recommendation: 'Strongly recommended',
          },
          {
            component: 'sleep_restriction',
            effectSize: 0.45,
            effectSizeCI: [0.29, 0.61],
            nStudies: 12,
            nParticipants: 890,
            quality: 'high',
            recommendation: 'Recommended',
          },
        ]),
        getMostEffectiveCBTIComponents: jest.fn().mockReturnValue([
          {
            component: 'multicomponent_cbti',
            effectSize: 0.84,
            effectSizeCI: [0.72, 0.96],
            nStudies: 87,
            nParticipants: 9475,
            quality: 'high',
            recommendation: 'Strongly recommended',
          },
          {
            component: 'sleep_restriction',
            effectSize: 0.45,
            effectSizeCI: [0.29, 0.61],
            nStudies: 12,
            nParticipants: 890,
            quality: 'high',
            recommendation: 'Recommended',
          },
          {
            component: 'stimulus_control',
            effectSize: 0.41,
            effectSizeCI: [0.25, 0.57],
            nStudies: 10,
            nParticipants: 750,
            quality: 'moderate',
            recommendation: 'Recommended',
          },
          {
            component: 'cognitive_restructuring',
            effectSize: 0.32,
            effectSizeCI: [0.18, 0.46],
            nStudies: 8,
            nParticipants: 620,
            quality: 'moderate',
            recommendation: 'Recommended',
          },
        ]),
        getProgressReport: jest.fn().mockReturnValue(null),
        estimateISI: jest.fn().mockReturnValue(0),
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    describe('evidence_overview callback', () => {
      it('should show evidence overview with treatment recommendations', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_overview',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Доказательная база КПТ-И');
        expect(result.message).toContain('European Insomnia Guideline 2023');
        expect(result.message).toContain('Grade A');
        expect(result.message).toContain('КПТ-И рекомендуется');
        expect(ctx.sleepCore.getTreatmentRecommendations).toHaveBeenCalledWith('treatment');
      });

      it('should show navigation to component evidence and new 2023', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_overview',
          {}
        );

        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:evidence_components');
        expect(allCallbacks).toContain('therapy:evidence_new2023');
        expect(allCallbacks).toContain('therapy:menu');
      });

      it('should have step metadata evidence_overview', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_overview',
          {}
        );

        expect(result.metadata?.step).toBe('evidence_overview');
      });
    });

    describe('evidence_components callback', () => {
      it('should show CBT-I component evidence with effect sizes', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_components',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Эффективность компонентов КПТ-И');
        expect(result.message).toContain('Cohen');
        expect(result.message).toContain('0.84');
        expect(result.message).toContain('Мультикомпонентная КПТ-И');
        expect(result.message).toContain('Ограничение сна');
        expect(ctx.sleepCore.getMostEffectiveCBTIComponents).toHaveBeenCalled();
        expect(ctx.sleepCore.getCBTIComponentEvidence).toHaveBeenCalled();
      });

      it('should display study counts and participant numbers', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_components',
          {}
        );

        expect(result.message).toContain('87');
        // toLocaleString() may format as "9,475" or "9 475" depending on locale
        expect(result.message).toMatch(/9[,.\s]?475/);
      });

      it('should have step metadata evidence_components', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_components',
          {}
        );

        expect(result.metadata?.step).toBe('evidence_components');
      });
    });

    describe('evidence_new2023 callback', () => {
      it('should show new 2023 guideline recommendations', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_new2023',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Обновления European Insomnia Guideline 2023');
        expect(result.message).toContain('Цифровая КПТ-И');
        expect(ctx.sleepCore.getNew2023Recommendations).toHaveBeenCalled();
      });

      it('should filter out pharmacological recommendations', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_new2023',
          {}
        );

        expect(result.message).not.toContain('фармакологических');
        expect(result.message).not.toContain('Обновление фармакологических');
      });

      it('should have step metadata evidence_new2023', async () => {
        const ctx = createEvidenceMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:evidence_new2023',
          {}
        );

        expect(result.metadata?.step).toBe('evidence_new2023');
      });
    });

    describe('evidence in therapy menu', () => {
      it('should include evidence button in therapy menu', async () => {
        const ctx = createMockContext({ hasSession: true });
        const result = await therapyCommand.execute(ctx);

        expect(result.success).toBe(true);
        const allCallbacks = result.keyboard?.flat().map(btn => btn.callbackData) || [];
        expect(allCallbacks).toContain('therapy:evidence_overview');
      });
    });
  });

  describe('Weekly SRT Review', () => {
    /**
     * Weekly review tests use mocked SleepCoreAPI since updateTreatmentPlan
     * requires initialized plan with sleep states.
     *
     * Scientific basis: Spielman et al. 1987 — weekly TIB adjustment
     */
    function createWeeklyReviewMockContext(overrides: Partial<Record<string, unknown>> = {}): ISleepCoreContext {
      const basePlan = {
        userId: 'test-user-123',
        startDate: '2026-01-01',
        currentPhase: 'treatment',
        currentWeek: 3,
        totalWeeks: 8,
        activeComponents: {
          sleepRestriction: {
            prescribedTIB: 330,
            prescribedBedtime: '00:30',
            prescribedWakeTime: '06:00',
            efficiencyThreshold: 85,
            minimumTIB: 300,
            adjustmentIncrement: 15,
          },
          stimulusControl: {},
          cognitiveTargets: [],
          hygieneRecommendations: [],
          relaxationProtocol: {},
        },
        progress: {
          isiBaseline: 18,
          sleepEfficiencyBaseline: 72,
        },
      };

      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          currentPhase: 'treatment',
          weekNumber: 3,
          plan: basePlan,
        }),
        getProgressReport: jest.fn().mockReturnValue({
          currentISI: 12,
          isiChange: 6,
          currentSleepEfficiency: 92,
          sleepEfficiencyChange: 20,
          currentWeek: 3,
          overallAdherence: 0.85,
          achievements: [],
          improvements: [],
          responseStatus: 'responding',
        }),
        updateTreatmentPlan: jest.fn().mockReturnValue({
          ...basePlan,
          currentWeek: 3,
          activeComponents: {
            ...basePlan.activeComponents,
            sleepRestriction: {
              ...basePlan.activeComponents.sleepRestriction,
              prescribedTIB: 345,
              prescribedBedtime: '00:15',
            },
          },
        }),
        isThirdWaveIndicated: jest.fn().mockReturnValue(false),
        estimateISI: jest.fn().mockReturnValue(0),
        ...overrides,
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    it('should call updateTreatmentPlan and show weekly review', async () => {
      const ctx = createWeeklyReviewMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Еженедельный обзор SRT');
      expect(result.message).toContain('Неделя 3');
      expect(ctx.sleepCore.updateTreatmentPlan).toHaveBeenCalledWith('test-user-123');
    });

    it('should show TIB increase when SE >= 90%', async () => {
      const ctx = createWeeklyReviewMockContext();
      // Default mock: SE=92%, oldTIB=330, newTIB=345
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Увеличение');
      expect(result.message).toContain('15 мин');
      expect(result.message).toContain('SE ≥ 90%');
    });

    it('should show TIB decrease when SE < 85%', async () => {
      const ctx = createWeeklyReviewMockContext({
        getProgressReport: jest.fn().mockReturnValue({
          currentISI: 15,
          isiChange: 3,
          currentSleepEfficiency: 78,
          sleepEfficiencyChange: 6,
          currentWeek: 3,
          overallAdherence: 0.7,
          achievements: [],
          improvements: [],
          responseStatus: 'partial',
        }),
        updateTreatmentPlan: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          currentWeek: 3,
          activeComponents: {
            sleepRestriction: {
              prescribedTIB: 345,
              prescribedBedtime: '00:15',
              prescribedWakeTime: '06:00',
              efficiencyThreshold: 85,
              minimumTIB: 300,
              adjustmentIncrement: 15,
            },
            stimulusControl: {},
            cognitiveTargets: [],
            hygieneRecommendations: [],
            relaxationProtocol: {},
          },
        }),
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          plan: {
            activeComponents: {
              sleepRestriction: {
                prescribedTIB: 360,
                prescribedBedtime: '00:00',
                prescribedWakeTime: '06:00',
              },
            },
          },
        }),
      });

      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Уменьшение');
      expect(result.message).toContain('SE < 85%');
    });

    it('should show no change when SE is 85-89%', async () => {
      const ctx = createWeeklyReviewMockContext({
        getProgressReport: jest.fn().mockReturnValue({
          currentISI: 13,
          isiChange: 5,
          currentSleepEfficiency: 87,
          sleepEfficiencyChange: 15,
          currentWeek: 3,
          overallAdherence: 0.8,
          achievements: [],
          improvements: [],
          responseStatus: 'responding',
        }),
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          plan: {
            activeComponents: {
              sleepRestriction: {
                prescribedTIB: 330,
                prescribedBedtime: '00:30',
                prescribedWakeTime: '06:00',
              },
            },
          },
        }),
        updateTreatmentPlan: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          currentWeek: 3,
          activeComponents: {
            sleepRestriction: {
              prescribedTIB: 330,
              prescribedBedtime: '00:30',
              prescribedWakeTime: '06:00',
            },
            stimulusControl: {},
            cognitiveTargets: [],
            hygieneRecommendations: [],
            relaxationProtocol: {},
          },
        }),
      });

      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Без изменений');
      expect(result.message).toContain('SE 85-89%');
    });

    it('should show safety warning when TIB < 360 min', async () => {
      const ctx = createWeeklyReviewMockContext({
        updateTreatmentPlan: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          currentWeek: 3,
          activeComponents: {
            sleepRestriction: {
              prescribedTIB: 315,
              prescribedBedtime: '00:45',
              prescribedWakeTime: '06:00',
            },
            stimulusControl: {},
            cognitiveTargets: [],
            hygieneRecommendations: [],
            relaxationProtocol: {},
          },
        }),
      });

      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Окно сна < 6 часов');
      expect(result.message).toContain('рулём');
    });

    it('should not show safety warning when TIB >= 360 min', async () => {
      const ctx = createWeeklyReviewMockContext({
        updateTreatmentPlan: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          currentWeek: 3,
          activeComponents: {
            sleepRestriction: {
              prescribedTIB: 390,
              prescribedBedtime: '23:30',
              prescribedWakeTime: '06:00',
            },
            stimulusControl: {},
            cognitiveTargets: [],
            hygieneRecommendations: [],
            relaxationProtocol: {},
          },
        }),
      });

      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('Окно сна < 6 часов');
    });

    it('should show error when no plan exists', async () => {
      const ctx = createWeeklyReviewMockContext({
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          plan: null,
        }),
      });

      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('План лечения не найден');
    });

    it('should show insufficient data when updateTreatmentPlan returns null', async () => {
      const ctx = createWeeklyReviewMockContext({
        updateTreatmentPlan: jest.fn().mockReturnValue(null),
      });

      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });

    it('should have step metadata weekly_review', async () => {
      const ctx = createWeeklyReviewMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.metadata?.step).toBe('weekly_review');
    });

    it('should reference Spielman protocol', async () => {
      const ctx = createWeeklyReviewMockContext();
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:weekly_review',
        {}
      );

      expect(result.message).toContain('Spielman');
    });
  });

  describe('Weekly SRT Review Button in Menu', () => {
    function createMenuMockContext(weekNumber: number, hasPlan: boolean): ISleepCoreContext {
      const plan = hasPlan ? {
        userId: 'test-user-123',
        currentWeek: weekNumber,
        activeComponents: { sleepRestriction: { prescribedTIB: 330 } },
      } : null;

      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user-123',
          currentPhase: 'treatment',
          therapyWeek: weekNumber,
          plan,
        }),
        isThirdWaveIndicated: jest.fn().mockReturnValue(false),
        getProgressReport: jest.fn().mockReturnValue(null),
        estimateISI: jest.fn().mockReturnValue(0),
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    it('should show SRT review button when week >= 2 and plan exists', async () => {
      const ctx = createMenuMockContext(3, true);
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:menu',
        {}
      );

      expect(result.success).toBe(true);
      const allCallbacks = result.keyboard?.flat().map(btn => btn.callbackData) || [];
      expect(allCallbacks).toContain('therapy:weekly_review');
    });

    it('should NOT show SRT review button when week < 2', async () => {
      const ctx = createMenuMockContext(1, true);
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:menu',
        {}
      );

      expect(result.success).toBe(true);
      const allCallbacks = result.keyboard?.flat().map(btn => btn.callbackData) || [];
      expect(allCallbacks).not.toContain('therapy:weekly_review');
    });

    it('should NOT show SRT review button when no plan exists', async () => {
      const ctx = createMenuMockContext(3, false);
      const result = await therapyCommand.handleCallback(
        ctx,
        'therapy:menu',
        {}
      );

      expect(result.success).toBe(true);
      const allCallbacks = result.keyboard?.flat().map(btn => btn.callbackData) || [];
      expect(allCallbacks).not.toContain('therapy:weekly_review');
    });
  });

  describe('ACT-I Session Delivery', () => {
    /**
     * ACT-I tests use mocked SleepCoreAPI since ACT-I methods require
     * initialized ACT-I plan which needs specific setup.
     */
    function createACTIMockContext(overrides: Partial<Record<string, unknown>> = {}): ISleepCoreContext {
      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          currentPhase: 'treatment',
          weekNumber: 7,
          actiPlan: { startDate: '2026-01-30', currentSession: 1, totalSessions: 6 },
        }),
        isThirdWaveIndicated: jest.fn().mockReturnValue(true),
        recommendThirdWaveApproach: jest.fn().mockReturnValue(null),
        getSleepStates: jest.fn().mockReturnValue(Array(7).fill({ date: '2026-01-30' })),
        initializeACTI: jest.fn().mockReturnValue({
          startDate: '2026-01-30',
          currentSession: 1,
          totalSessions: 6,
        }),
        getAcceptanceExercise: jest.fn().mockReturnValue({
          exercise: 'Готовность к бодрствованию',
          instructions: [
            'Лягте в постель и закройте глаза',
            'Заметьте желание заснуть',
            'Скажите себе: «Я готов бодрствовать»',
            'Наблюдайте за ощущениями без борьбы',
            'Позвольте сну прийти самому',
          ],
          metaphor: 'Зыбучие пески: чем больше боретесь, тем глубже увязаете.',
        }),
        getDefusionTechnique: jest.fn().mockReturnValue({
          id: 'def_notice',
          name: 'Я замечаю мысль...',
          description: 'Добавьте «Я замечаю мысль, что...» перед тревожной мыслью',
          instructions: [
            'Сформулируйте тревожную мысль',
            'Добавьте «Я замечаю мысль, что...»',
            'Произнесите полную фразу',
            'Заметьте изменение в отношении к мысли',
          ],
          targetExperiences: ['thought'],
          difficulty: 'beginner',
          duration: 2,
        }),
        identifyUnwantedExperiences: jest.fn().mockReturnValue([
          { id: 'exp_1', type: 'thought', content: 'Я не смогу уснуть', distress: 0.6, frequency: 0.7, fusionLevel: 0.7 },
          { id: 'exp_2', type: 'feeling', content: 'Тревога о сне', distress: 0.7, frequency: 0.5, fusionLevel: 0.5 },
        ]),
        getACTISessionSummary: jest.fn().mockReturnValue({
          keyTakeaways: ['Борьба с бессонницей усиливает её', 'Готовность — это не желание бодрствовать'],
          practiceExercises: ['Заметить все попытки контролировать сон', 'Практиковать «Я замечаю мысль...»'],
          nextSessionPreview: 'Следующая сессия: Мысли — это только мысли',
        }),
        getProgressReport: jest.fn().mockReturnValue(null),
        estimateISI: jest.fn().mockReturnValue(0),
        ...overrides,
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    describe('acti_hub callback', () => {
      it('should show ACT-I session hub with exercise buttons', async () => {
        const ctx = createACTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_hub',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Терапия принятия и ответственности');
        expect(result.message).toContain('Упражнение на принятие');
        expect(result.message).toContain('Техника дефузии');
        expect(result.message).toContain('Исследование переживаний');

        // Verify exercise buttons exist
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:acti_acceptance');
        expect(allCallbacks).toContain('therapy:acti_defusion');
        expect(allCallbacks).toContain('therapy:acti_experiences');
        expect(allCallbacks).toContain('therapy:acti_summary');
      });

      it('should show hub even without ACT-I summary', async () => {
        const ctx = createACTIMockContext({
          getACTISessionSummary: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_hub',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Терапия принятия и ответственности');
      });

      it('should fail when session is not found', async () => {
        const ctx = createACTIMockContext({
          getSession: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_hub',
          {}
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Сессия не найдена');
      });
    });

    describe('acti_acceptance callback', () => {
      it('should show acceptance exercise with metaphor and instructions', async () => {
        const ctx = createACTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_acceptance',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Упражнение на принятие');
        expect(result.message).toContain('Готовность к бодрствованию');
        expect(result.message).toContain('Зыбучие пески');
        expect(result.message).toContain('Лягте в постель');

        // Verify navigation
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:acti_hub');
        expect(allCallbacks).toContain('therapy:acti_summary');
      });

      it('should show fallback when exercise is not available', async () => {
        const ctx = createACTIMockContext({
          getAcceptanceExercise: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_acceptance',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('План ACT-I не найден');
      });
    });

    describe('acti_defusion callback', () => {
      it('should show defusion technique with instructions and metadata', async () => {
        const ctx = createACTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_defusion',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Техника дефузии');
        expect(result.message).toContain('Я замечаю мысль');
        expect(result.message).toContain('Сформулируйте тревожную мысль');
        expect(result.message).toContain('2 мин');
        expect(result.message).toContain('Начальный');

        // Verify navigation
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:acti_hub');
      });

      it('should show fallback when technique is not available', async () => {
        const ctx = createACTIMockContext({
          getDefusionTechnique: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_defusion',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Техника дефузии недоступна');
      });
    });

    describe('acti_experiences callback', () => {
      it('should show unwanted experiences with distress levels', async () => {
        const ctx = createACTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_experiences',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Исследование переживаний');
        expect(result.message).toContain('Я не смогу уснуть');
        expect(result.message).toContain('Тревога о сне');
        expect(result.message).toContain('60%');
        expect(result.message).toContain('70%');

        // Verify reflection questions
        expect(result.message).toContain('Что вы пробовали');
        expect(result.message).toContain('Помогло ли это');

        // Verify navigation offers exercise buttons
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:acti_acceptance');
        expect(allCallbacks).toContain('therapy:acti_defusion');
        expect(allCallbacks).toContain('therapy:acti_hub');
      });

      it('should handle empty experiences list', async () => {
        const ctx = createACTIMockContext({
          identifyUnwantedExperiences: jest.fn().mockReturnValue([]),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_experiences',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Нет идентифицированных переживаний');
      });
    });

    describe('acti_summary callback', () => {
      it('should show session summary with takeaways and exercises', async () => {
        const ctx = createACTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_summary',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Итоги сессии ACT-I');
        expect(result.message).toContain('Борьба с бессонницей усиливает её');
        expect(result.message).toContain('Заметить все попытки контролировать сон');
        expect(result.message).toContain('Следующая сессия: Мысли — это только мысли');

        // Verify navigation
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:acti_hub');
        expect(allCallbacks).toContain('therapy:menu');
      });

      it('should show fallback when summary is not available', async () => {
        const ctx = createACTIMockContext({
          getACTISessionSummary: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:acti_summary',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Итоги сессии недоступны');
      });
    });
  });

  // ==================== MBT-I Delivery Tests ====================

  describe('MBT-I Delivery Pipeline', () => {
    function createMBTIMockContext(overrides: Partial<Record<string, unknown>> = {}): ISleepCoreContext {
      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          currentPhase: 'treatment',
          weekNumber: 3,
          mbtiPlan: { startDate: '2026-01-30', currentWeek: 3, totalWeeks: 8, dailyPracticeTarget: 20 },
        }),
        isThirdWaveIndicated: jest.fn().mockReturnValue(true),
        recommendThirdWaveApproach: jest.fn().mockReturnValue(null),
        getSleepStates: jest.fn().mockReturnValue(Array(7).fill({ date: '2026-01-30' })),
        initializeMBTI: jest.fn().mockReturnValue({
          startDate: '2026-01-30',
          currentWeek: 1,
          totalWeeks: 8,
          dailyPracticeTarget: 20,
        }),
        getMindfulnessPractice: jest.fn().mockReturnValue({
          practice: 'body_scan',
          instructions: [
            'Лягте на спину, руки вдоль тела.',
            'Закройте глаза и сделайте несколько глубоких вдохов.',
            'Направьте внимание на пальцы ног.',
            'Медленно поднимайтесь выше: стопы, голени, колени...',
          ],
          audioUrl: undefined,
        }),
        getMBTIWeeklySummary: jest.fn().mockReturnValue({
          practiceMinutes: 85,
          practiceAdherence: 0.61,
          arousalChange: {
            cognitive: 0.15,
            somatic: 0.08,
            sleepEffort: 0.12,
          },
          keyInsights: ['Заметное снижение когнитивного возбуждения'],
          nextWeekFocus: ['Тема недели: Принятие бессонницы', 'Основная практика: Открытое осознавание'],
        }),
        recordMBTIPractice: jest.fn().mockReturnValue({
          startDate: '2026-01-30',
          currentWeek: 3,
          totalWeeks: 8,
        }),
        assessArousal: jest.fn().mockReturnValue({
          cognitive: 0.6,
          somatic: 0.4,
          sleepEffort: 0.7,
          sleepWorry: 0.5,
          rumination: 0.5,
        }),
        getProgressReport: jest.fn().mockReturnValue(null),
        estimateISI: jest.fn().mockReturnValue(0),
        ...overrides,
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    describe('mbti_hub callback', () => {
      it('should show MBT-I session hub with practice buttons', async () => {
        const ctx = createMBTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_hub',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Осознанная терапия бессонницы');
        expect(result.message).toContain('Практика медитации');
        expect(result.message).toContain('Еженедельный обзор');

        // Verify practice buttons
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:mbti_practice');
        expect(allCallbacks).toContain('therapy:mbti_summary');
        expect(allCallbacks).toContain('therapy:menu');
      });

      it('should display weekly stats when summary available', async () => {
        const ctx = createMBTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_hub',
          {}
        );

        expect(result.message).toContain('85 мин');
        expect(result.message).toContain('61%');
        expect(result.message).toContain('снижение когнитивного возбуждения');
      });

      it('should return error when no session', async () => {
        const ctx = createMBTIMockContext({
          getSession: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_hub',
          {}
        );

        expect(result.success).toBe(false);
        expect(result.message).toContain('Сессия не найдена');
      });
    });

    describe('mbti_practice callback', () => {
      it('should show mindfulness practice with instructions', async () => {
        const ctx = createMBTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_practice',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Сканирование тела');
        expect(result.message).toContain('Лягте на спину');
        expect(result.message).toContain('Ong, 2017');

        // Verify navigation back to hub
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:mbti_hub');
      });

      it('should show fallback when no MBT-I plan', async () => {
        const ctx = createMBTIMockContext({
          getMindfulnessPractice: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_practice',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('План MBT-I не найден');
      });
    });

    describe('mbti_summary callback', () => {
      it('should show weekly summary with arousal changes and insights', async () => {
        const ctx = createMBTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_summary',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Еженедельный обзор MBT-I');
        expect(result.message).toContain('85 мин');
        expect(result.message).toContain('61%');
        expect(result.message).toContain('Когнитивное');
        expect(result.message).toContain('Соматическое');
        expect(result.message).toContain('Усилие сна');
        expect(result.message).toContain('снижение когнитивного возбуждения');
        expect(result.message).toContain('Принятие бессонницы');

        // Verify navigation
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:mbti_practice');
        expect(allCallbacks).toContain('therapy:mbti_hub');
        expect(allCallbacks).toContain('therapy:menu');
      });

      it('should show fallback when summary is not available', async () => {
        const ctx = createMBTIMockContext({
          getMBTIWeeklySummary: jest.fn().mockReturnValue(null),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_summary',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Еженедельный обзор недоступен');
      });

      it('should show correct adherence status for high adherence', async () => {
        const ctx = createMBTIMockContext({
          getMBTIWeeklySummary: jest.fn().mockReturnValue({
            practiceMinutes: 140,
            practiceAdherence: 0.85,
            arousalChange: { cognitive: 0.2, somatic: 0.1, sleepEffort: 0.15 },
            keyInsights: ['Отличная регулярность практики'],
            nextWeekFocus: ['Тема недели: Интеграция практик'],
          }),
        });
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:mbti_summary',
          {}
        );

        expect(result.message).toContain('85%');
        expect(result.message).toContain('Отлично');
      });
    });

    describe('MBT-I hub button after initialization', () => {
      it('should include mbti hub button after init', async () => {
        const ctx = createMBTIMockContext();
        const result = await therapyCommand.handleCallback(
          ctx,
          'therapy:start_mbti',
          {}
        );

        expect(result.success).toBe(true);
        const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
        expect(allCallbacks).toContain('therapy:mbti_hub');
      });
    });
  });

  // ==================== Phase 5a: Cognitive Therapy Callbacks ====================

  describe('Phase 5a: behavioral_experiment callback', () => {
    function createCognitiveMockContext(overrides: Partial<Record<string, unknown>> = {}): ISleepCoreContext {
      const mockSleepCore = {
        getSession: jest.fn().mockReturnValue({
          userId: 'test-user',
          currentPhase: 'treatment',
          weekNumber: 5,
        }),
        identifyCognitiveBeliefs: jest.fn().mockReturnValue([{
          id: 'belief-1',
          category: 'consequences',
          belief: 'Если я не высплюсь, я не смогу работать',
          intensity: 0.8,
          frequency: 0.6,
          evidenceFor: [],
          evidenceAgainst: [],
          alternativeThought: '',
          isActive: true,
        }]),
        designBehavioralExperiment: jest.fn().mockReturnValue({
          hypothesis: 'Если я сплю < 7 часов, мои рабочие показатели снизятся',
          experiment: 'Отследите свою продуктивность в день после <7ч сна и >7ч сна',
          predictedOutcome: 'Реальная продуктивность будет выше ожидаемой',
        }),
        getSocraticQuestions: jest.fn().mockReturnValue([
          'Были ли случаи, когда вы плохо спали, но хорошо работали?',
          'Как вы оцениваете свою работу объективно?',
          'Что самое худшее, что может случиться?',
        ]),
        getProgressReport: jest.fn().mockReturnValue(null),
        estimateISI: jest.fn().mockReturnValue(0),
        ...overrides,
      } as unknown as SleepCoreAPI;

      return {
        userId: 'test-user-123',
        chatId: 12345,
        displayName: 'Test User',
        languageCode: 'ru',
        sleepCore: mockSleepCore,
      } as unknown as ISleepCoreContext;
    }

    it('should show experiment design with hypothesis', async () => {
      const ctx = createCognitiveMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Поведенческий эксперимент');
      expect(result.message).toContain('Гипотеза');
      expect(result.message).toContain('Эксперимент');
      expect(result.message).toContain('Ожидаемый результат');
    });

    it('should display belief and its category', async () => {
      const ctx = createCognitiveMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      expect(result.message).toContain('Если я не высплюсь');
      expect(result.message).toContain('Последствия бессонницы');
    });

    it('should display Socratic questions', async () => {
      const ctx = createCognitiveMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      expect(result.message).toContain('Вопросы для размышления');
      expect(result.message).toContain('Были ли случаи');
    });

    it('should show scientific attribution (Harvey, Morin)', async () => {
      const ctx = createCognitiveMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      expect(result.message).toContain('Harvey');
      expect(result.message).toContain('Morin');
    });

    it('should have navigation buttons', async () => {
      const ctx = createCognitiveMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
      expect(allCallbacks).toContain('therapy:cognitive_progress');
      expect(allCallbacks).toContain('therapy:menu');
    });

    it('should handle no session gracefully', async () => {
      const ctx = createCognitiveMockContext({
        getSession: jest.fn().mockReturnValue(null),
      });
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия не найдена');
    });

    it('should handle no beliefs gracefully', async () => {
      const ctx = createCognitiveMockContext({
        identifyCognitiveBeliefs: jest.fn().mockReturnValue([]),
      });
      const result = await therapyCommand.handleCallback(ctx, 'therapy:behavioral_experiment', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });
  });

  describe('Phase 5a: hygiene_education callback', () => {
    it('should show category menu when no category specified', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:hygiene_education', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Гигиена сна');
      expect(result.message).toContain('Hauri');
      // Should have 8 categories + back button
      expect(result.keyboard!.length).toBeGreaterThanOrEqual(9);
    });

    it('should show educational content for caffeine category', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:hygiene_education:caffeine', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Рекомендации');
      expect(result.message).toContain('мифы');
    });

    it('should show educational content for environment category', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:hygiene_education:environment', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Рекомендации');
    });

    it('should show category menu for invalid category', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:hygiene_education:invalid', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Выберите тему');
    });

    it('should have navigation back to other topics', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:hygiene_education:caffeine', {});

      const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
      expect(allCallbacks).toContain('therapy:hygiene_education');
      expect(allCallbacks).toContain('therapy:menu');
    });
  });

  describe('Phase 5a: cognitive_progress callback', () => {
    it('should show insufficient data message (getCognitiveProgressReport returns null)', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:cognitive_progress', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
      expect(result.message).toContain('Core 5');
    });

    it('should offer behavioral experiment button', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:cognitive_progress', {});

      const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
      expect(allCallbacks).toContain('therapy:behavioral_experiment');
      expect(allCallbacks).toContain('therapy:menu');
    });
  });

  // ==================== Phase 5b: Extended Evidence Callbacks ====================

  describe('Phase 5b: evidence_pharma callback', () => {
    it('should show pharmacological evidence', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_pharma', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Фармакологическая');
      expect(result.message).toContain('European Insomnia Guideline 2023');
    });

    it('should include safety disclaimer', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_pharma', {});

      expect(result.message).toContain('решение о медикаментах принимает врач');
    });

    it('should have navigation buttons', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_pharma', {});

      const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
      expect(allCallbacks).toContain('therapy:evidence_overview');
      expect(allCallbacks).toContain('therapy:menu');
    });
  });

  describe('Phase 5b: evidence_dcbti callback', () => {
    it('should show dCBT-I compliance status', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_dcbti', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('dCBT-I');
      expect(result.message).toContain('Espie');
    });

    it('should list regulatory analogues', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_dcbti', {});

      expect(result.message).toContain('Somryst');
      expect(result.message).toContain('SleepioRx');
      expect(result.message).toContain('Somnio');
    });

    it('should have navigation buttons', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_dcbti', {});

      const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
      expect(allCallbacks).toContain('therapy:evidence_overview');
      expect(allCallbacks).toContain('therapy:menu');
    });
  });

  describe('Phase 5b: evidence_integrated callback', () => {
    it('should show integrated recommendation', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_integrated', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Интегрированная рекомендация');
    });

    it('should show primary approach as CBT-I', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_integrated', {});

      expect(result.message).toContain('КПТ-И');
      expect(result.message).toContain('Grade A');
    });

    it('should handle no session', async () => {
      const ctx = createMockContext({ hasSession: false });
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_integrated', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });
  });

  // ==================== Phase 5b: Evidence overview buttons ====================

  describe('Phase 5b: evidence_overview buttons', () => {
    it('should include pharmacology, dCBT-I and integrated buttons', async () => {
      const ctx = createMockContext();
      const result = await therapyCommand.handleCallback(ctx, 'therapy:evidence_overview', {});

      const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
      expect(allCallbacks).toContain('therapy:evidence_pharma');
      expect(allCallbacks).toContain('therapy:evidence_dcbti');
      expect(allCallbacks).toContain('therapy:evidence_integrated');
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
