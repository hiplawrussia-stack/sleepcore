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
