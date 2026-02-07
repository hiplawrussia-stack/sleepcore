/**
 * Cognitive Commands Integration Tests
 * =====================================
 * Tests the full flow for cognitive bot commands:
 * - RecallCommand - Morning memory quiz
 * - RehearsalCommand - Pre-sleep mental rehearsal
 * - SmartTipsCommand - Context-aware content recommendations
 * - WhatIfCommand - Counterfactual sleep scenarios
 *
 * P2-1 Finding: These commands need integration tests
 *
 * @packageDocumentation
 */

import { SleepCoreAPI } from '../../src/SleepCoreAPI';
import { StartCommand } from '../../src/bot/commands/StartCommand';
import { RecallCommand } from '../../src/bot/commands/RecallCommand';
import { RehearsalCommand } from '../../src/bot/commands/RehearsalCommand';
import { SmartTipsCommand } from '../../src/bot/commands/SmartTipsCommand';
import { WhatIfCommand } from '../../src/bot/commands/WhatIfCommand';
import type { ISleepCoreContext } from '../../src/bot/commands/interfaces/ICommand';

/**
 * Create a realistic context backed by a real SleepCoreAPI instance
 */
function createIntegrationContext(
  sleepCore: SleepCoreAPI,
  userId: string
): ISleepCoreContext {
  return {
    userId,
    chatId: 12345,
    displayName: 'Test Patient',
    languageCode: 'ru',
    sleepCore,
    from: { id: 123, is_bot: false, first_name: 'Test' },
    chat: { id: 12345, type: 'private' },
    message: {
      message_id: 1,
      date: Date.now() / 1000,
      chat: { id: 12345, type: 'private' },
      text: '/test',
    },
    reply: jest.fn(),
    editMessageText: jest.fn(),
    answerCallbackQuery: jest.fn(),
  } as unknown as ISleepCoreContext;
}

/**
 * Create a session with baseline diary entries
 */
async function createBaselineSession(
  sleepCore: SleepCoreAPI,
  startCommand: StartCommand,
  ctx: ISleepCoreContext,
  userId: string,
  entries: number = 7
): Promise<void> {
  await startCommand.execute(ctx);
  await startCommand.handleStep(ctx, 'isi_result', {
    isiAnswers: [2, 3, 2, 2, 3, 2, 2], // score = 16 (moderate)
  });

  for (let i = entries; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    await sleepCore.processNewDiaryEntry({
      userId,
      date: date.toISOString().split('T')[0],
      bedtime: '23:00',
      lightsOffTime: '23:00',
      sleepOnsetLatency: 25,
      numberOfAwakenings: 2,
      wakeAfterSleepOnset: 35,
      finalAwakening: '07:00',
      outOfBedTime: '07:00',
      subjectiveQuality: 'fair',
      morningAlertness: 3,
    });
  }
}

describe('CognitiveCommandsIntegration', () => {
  let sleepCore: SleepCoreAPI;
  let startCommand: StartCommand;
  const baseUserId = 'cognitive-test-user';
  let testCounter = 0;

  beforeEach(() => {
    sleepCore = new SleepCoreAPI();
    startCommand = new StartCommand();
    testCounter++;
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to generate unique user ID
  const getUniqueUserId = (prefix: string) => `${baseUserId}-${prefix}-${testCounter}`;

  // =========================================================================
  // RECALL COMMAND TESTS
  // =========================================================================
  describe('RecallCommand Integration', () => {
    let recallCommand: RecallCommand;

    beforeEach(() => {
      recallCommand = new RecallCommand();
    });

    it('should return wrong time message when called outside morning hours (5-14)', async () => {
      const userId = getUniqueUserId('recall-night');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return night time (2 AM)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);

      const result = await recallCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('ночь');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard?.[0]?.[0]?.callbackData).toBe('recall:start');
    });

    it('should return wrong time message for evening hours', async () => {
      const userId = getUniqueUserId('recall-evening');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return evening (20:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);

      const result = await recallCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('вечер');
      expect(result.message).toContain('/rehearsal');
    });

    it('should start quiz or show no questions in morning hours', async () => {
      const userId = getUniqueUserId('recall-morning');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return morning (9 AM)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);

      const result = await recallCommand.execute(ctx);

      expect(result.success).toBe(true);
      // Should either have questions or say no questions
      expect(result.message).toBeDefined();
    });

    it('should handle start callback to force quiz start', async () => {
      const userId = getUniqueUserId('recall-start');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await recallCommand.handleCallback(ctx, 'recall:start', {});

      expect(result.success).toBe(true);
      // Either shows questions or no questions message
      expect(result.message).toBeDefined();
    });

    it('should handle hint callback', async () => {
      const userId = getUniqueUserId('recall-hint');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await recallCommand.handleCallback(ctx, 'recall:hint:0', {});

      // Should return hint or error if no quiz
      expect(result).toBeDefined();
    });

    it('should handle skip callback', async () => {
      const userId = getUniqueUserId('recall-skip');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await recallCommand.handleCallback(ctx, 'recall:skip:0', {});

      // Should return result or error if no quiz
      expect(result).toBeDefined();
    });

    it('should handle unknown callback action with error', async () => {
      const userId = getUniqueUserId('recall-unknown');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await recallCommand.handleCallback(ctx, 'recall:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Неизвестное действие');
    });

    it('should return null when handleTextAnswer called without active quiz', async () => {
      const userId = getUniqueUserId('recall-notext');
      const result = await recallCommand.handleTextAnswer(userId, 'some answer');

      expect(result).toBeNull();
    });

    it('should handle finish callback', async () => {
      const userId = getUniqueUserId('recall-finish');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await recallCommand.handleCallback(ctx, 'recall:finish', {});

      // Should return finish result or error
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // REHEARSAL COMMAND TESTS
  // =========================================================================
  describe('RehearsalCommand Integration', () => {
    let rehearsalCommand: RehearsalCommand;

    beforeEach(() => {
      rehearsalCommand = new RehearsalCommand();
    });

    it('should return early message when called before evening hours (18-23)', async () => {
      const userId = getUniqueUserId('rehearsal-early');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return afternoon (14:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

      const result = await rehearsalCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('рано');
      expect(result.keyboard?.[0]?.[0]?.callbackData).toBe('rehearsal:force');
    });

    it('should return early message when called very late', async () => {
      const userId = getUniqueUserId('rehearsal-late');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return very late/early (24 == 0)
      // The command checks (hour < 18 || hour > 23), so 0 (midnight) should trigger early message
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(0);

      const result = await rehearsalCommand.execute(ctx);

      expect(result.success).toBe(true);
      // Should show early message since hour < 18
      expect(result.message).toContain('рано');
    });

    it('should start rehearsal session during evening hours', async () => {
      const userId = getUniqueUserId('rehearsal-evening');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return evening (21:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(21);

      const result = await rehearsalCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Вечерняя репетиция');
      expect(result.message).toContain('Правила на сегодня');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard?.flat().some(btn => btn.callbackData?.includes('visualize'))).toBe(true);
    });

    it('should parse bedtime argument correctly', async () => {
      const userId = getUniqueUserId('rehearsal-bedtime');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return evening
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(21);

      const result = await rehearsalCommand.execute(ctx, '22:30');

      expect(result.success).toBe(true);
      expect(result.message).toContain('До сна');
    });

    it('should handle force callback to start rehearsal', async () => {
      const userId = getUniqueUserId('rehearsal-force');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Вечерняя репетиция');
    });

    it('should handle visualize callback', async () => {
      const userId = getUniqueUserId('rehearsal-visualize');
      const ctx = createIntegrationContext(sleepCore, userId);

      // First start a rehearsal
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});

      // Then request visualization
      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:visualize:0', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Правило');
    });

    it('should handle next_viz callback to advance visualization', async () => {
      const userId = getUniqueUserId('rehearsal-nextviz');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Start rehearsal
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});

      // Advance visualization
      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:next_viz:0', {});

      expect(result.success).toBe(true);
    });

    it('should handle intention callback to complete rehearsal', async () => {
      const userId = getUniqueUserId('rehearsal-intention');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Start rehearsal
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});

      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:intention', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Намерение установлено');
      expect(result.message).toContain('Спокойной ночи');
      expect(result.message).toContain('/recall');
    });

    it('should handle progress callback to show analytics', async () => {
      const userId = getUniqueUserId('rehearsal-progress');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:progress', {});

      expect(result.success).toBe(true);
      // Progress report should be generated
      expect(result.message).toBeDefined();
    });

    it('should handle unknown callback action with error', async () => {
      const userId = getUniqueUserId('rehearsal-unknown');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Неизвестное действие');
    });

    it('should show all visualizations done when index exceeds rules', async () => {
      const userId = getUniqueUserId('rehearsal-alldone');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Start rehearsal
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});

      // Request visualization with very high index
      const result = await rehearsalCommand.handleCallback(ctx, 'rehearsal:visualize:999', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('визуализации пройдены');
    });
  });

  // =========================================================================
  // SMART TIPS COMMAND TESTS
  // =========================================================================
  describe('SmartTipsCommand Integration', () => {
    let smartTipsCommand: SmartTipsCommand;

    beforeEach(() => {
      smartTipsCommand = new SmartTipsCommand();
    });

    it('should return recommendations based on time of day', async () => {
      const userId = getUniqueUserId('tips-time');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      // Should have greeting based on time of day
      expect(result.message).toMatch(/Добр(ое|ый|ая)|Доброй|Нет/);
    });

    it('should parse emotional state from arguments', async () => {
      const userId = getUniqueUserId('tips-emotion');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.execute(ctx, 'тревога');

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle different emotional states', async () => {
      const userId = getUniqueUserId('tips-stress');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.execute(ctx, 'стресс');

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle menu callback to show recommendations', async () => {
      const userId = getUniqueUserId('tips-menu');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle show callback for specific content', async () => {
      const userId = getUniqueUserId('tips-show');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:show:breathing-4-7-8', {});

      // Either shows content or returns not found error
      expect(result).toBeDefined();
    });

    it('should handle filter quick callback', async () => {
      const userId = getUniqueUserId('tips-filterquick');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:filter:quick', {});

      expect(result.success).toBe(true);
      // Should show quick techniques or empty message
      expect(result.message).toBeDefined();
    });

    it('should handle filter sleep callback', async () => {
      const userId = getUniqueUserId('tips-filtersleep');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:filter:sleep', {});

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle filter with unknown type', async () => {
      const userId = getUniqueUserId('tips-filterunknown');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:filter:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('фильтр');
    });

    it('should handle done callback to complete content', async () => {
      const userId = getUniqueUserId('tips-done');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:done:breathing-4-7-8', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('завершена');
      expect(result.message).toContain('XP');
    });

    it('should handle timer callback to start practice timer', async () => {
      const userId = getUniqueUserId('tips-timer');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:timer:breathing-4-7-8:5', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Таймер запущен');
      expect(result.message).toContain('5 минут');
    });

    it('should handle unknown callback action with error', async () => {
      const userId = getUniqueUserId('tips-unknown');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.handleCallback(ctx, 'tips:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Неизвестное действие');
    });

    it('should show crisis tip for crisis emotional state', async () => {
      const userId = getUniqueUserId('tips-crisis');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await smartTipsCommand.execute(ctx, 'кризис');

      expect(result.success).toBe(true);
      expect(result.message).toContain('/sos');
    });

    it('should handle insomnia at night with specific tip', async () => {
      const userId = getUniqueUserId('tips-insomnia');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Mock getHours to return night
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);

      const result = await smartTipsCommand.execute(ctx, 'бессонница');

      expect(result.success).toBe(true);
      expect(result.message).toContain('часы');
    });
  });

  // =========================================================================
  // WHATIF COMMAND TESTS
  // =========================================================================
  describe('WhatIfCommand Integration', () => {
    let whatIfCommand: WhatIfCommand;

    beforeEach(() => {
      whatIfCommand = new WhatIfCommand();
    });

    it('should show insufficient data message when twin not ready', async () => {
      const userId = getUniqueUserId('whatif-nodata');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('больше данных');
      expect(result.message).toContain('минимум 3');
      expect(result.keyboard?.flat().some(btn => btn.callbackData?.includes('diary'))).toBe(true);
    });

    it('should show main menu when digital twin is ready', async () => {
      const userId = getUniqueUserId('whatif-ready');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Create baseline with enough entries
      await createBaselineSession(sleepCore, startCommand, ctx, userId, 7);

      // Update digital twin with observations
      const digitalTwin = sleepCore.getDigitalTwin();
      for (let i = 0; i < 5; i++) {
        await digitalTwin.updateTwin(userId, {
          sleepEfficiency: 75 + i,
          sleepOnsetLatency: 25 - i,
          wakeAfterSleepOnset: 40 - i * 2,
          totalSleepTime: 380 + i * 10,
          numberOfAwakenings: 2,
          timeInBed: 480,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:00',
        });
      }

      const result = await whatIfCommand.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Что если');
      expect(result.keyboard).toBeDefined();
      // Should have category buttons
      expect(result.keyboard?.flat().some(btn => btn.callbackData?.includes('category'))).toBe(true);
    });

    it('should handle menu callback to show main menu', async () => {
      const userId = getUniqueUserId('whatif-menu');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should handle category callback to show scenarios', async () => {
      const userId = getUniqueUserId('whatif-category');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:category:timing', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Время сна');
      expect(result.keyboard?.flat().some(btn => btn.callbackData?.includes('scenario'))).toBe(true);
    });

    it('should handle category with invalid category key', async () => {
      const userId = getUniqueUserId('whatif-catinvalid');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:category:invalid', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найдена');
    });

    it('should handle scenario callback to simulate', async () => {
      const userId = getUniqueUserId('whatif-scenario');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Prepare twin
      const digitalTwin = sleepCore.getDigitalTwin();
      for (let i = 0; i < 5; i++) {
        await digitalTwin.updateTwin(userId, {
          sleepEfficiency: 75,
          sleepOnsetLatency: 25,
          wakeAfterSleepOnset: 40,
          totalSleepTime: 380,
          numberOfAwakenings: 2,
          timeInBed: 480,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:00',
        });
      }

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:scenario:earlier_bedtime', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('раннее');
    });

    it('should handle scenario with invalid scenario key', async () => {
      const userId = getUniqueUserId('whatif-sceninvalid');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Prepare twin
      const digitalTwin = sleepCore.getDigitalTwin();
      for (let i = 0; i < 5; i++) {
        await digitalTwin.updateTwin(userId, {
          sleepEfficiency: 75,
          sleepOnsetLatency: 25,
          wakeAfterSleepOnset: 40,
          totalSleepTime: 380,
          numberOfAwakenings: 2,
          timeInBed: 480,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:00',
        });
      }

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:scenario:invalid_scenario', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });

    it('should handle compare menu callback', async () => {
      const userId = getUniqueUserId('whatif-compare');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:compare:menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сравнение');
    });

    it('should handle compare add callback', async () => {
      const userId = getUniqueUserId('whatif-compadd');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:compare:add:earlier_bedtime', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Первый');
      expect(result.message).toContain('второй');
    });

    it('should handle compare run callback with two scenarios', async () => {
      const userId = getUniqueUserId('whatif-comprun');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Prepare twin
      const digitalTwin = sleepCore.getDigitalTwin();
      for (let i = 0; i < 5; i++) {
        await digitalTwin.updateTwin(userId, {
          sleepEfficiency: 75,
          sleepOnsetLatency: 25,
          wakeAfterSleepOnset: 40,
          totalSleepTime: 380,
          numberOfAwakenings: 2,
          timeInBed: 480,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:00',
        });
      }

      const result = await whatIfCommand.handleCallback(
        ctx,
        'whatif:compare:run:earlier_bedtime:later_bedtime',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сравнение');
      expect(result.message).toContain('Лучший');
    });

    it('should handle twin status callback', async () => {
      const userId = getUniqueUserId('whatif-twin');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:twin:status', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Digital Twin');
      expect(result.message).toContain('Статус');
    });

    it('should handle apply callback to show guidance', async () => {
      const userId = getUniqueUserId('whatif-apply');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:apply:earlier_bedtime', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Применить');
      expect(result.message).toContain('План действий');
    });

    it('should handle apply with invalid scenario', async () => {
      const userId = getUniqueUserId('whatif-appinvalid');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:apply:invalid', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });

    it('should handle unknown callback action with error', async () => {
      const userId = getUniqueUserId('whatif-unknown');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Неизвестное действие');
    });

    it('should parse scenario from argument', async () => {
      const userId = getUniqueUserId('whatif-parsearg');
      const ctx = createIntegrationContext(sleepCore, userId);

      // Prepare twin
      const digitalTwin = sleepCore.getDigitalTwin();
      for (let i = 0; i < 5; i++) {
        await digitalTwin.updateTwin(userId, {
          sleepEfficiency: 75,
          sleepOnsetLatency: 25,
          wakeAfterSleepOnset: 40,
          totalSleepTime: 380,
          numberOfAwakenings: 2,
          timeInBed: 480,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:00',
        });
      }

      const result = await whatIfCommand.execute(ctx, 'раньше');

      expect(result.success).toBe(true);
      // Should simulate earlier_bedtime scenario
      expect(result.message).toContain('раннее');
    });

    it('should handle behavior category', async () => {
      const userId = getUniqueUserId('whatif-behavior');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:category:behavior', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Поведение');
    });

    it('should handle relaxation category', async () => {
      const userId = getUniqueUserId('whatif-relax');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:category:relaxation', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Расслабление');
    });

    it('should handle cognitive category', async () => {
      const userId = getUniqueUserId('whatif-cognitive');
      const ctx = createIntegrationContext(sleepCore, userId);

      const result = await whatIfCommand.handleCallback(ctx, 'whatif:category:cognitive', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Работа с мыслями');
    });
  });

  // =========================================================================
  // CROSS-COMMAND INTEGRATION TESTS
  // =========================================================================
  describe('Cross-Command Integration', () => {
    it('should support rehearsal -> recall flow', async () => {
      const userId = getUniqueUserId('flow-rehearsal-recall');
      const ctx = createIntegrationContext(sleepCore, userId);
      const rehearsalCommand = new RehearsalCommand();
      const recallCommand = new RecallCommand();

      // Evening: Do rehearsal
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:intention', {});

      // Morning: Try recall
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);

      const result = await recallCommand.execute(ctx);

      expect(result.success).toBe(true);
      // Should have questions or no questions message
      expect(result.message).toBeDefined();
    });

    it('should support whatif -> smart_tips flow', async () => {
      const userId = getUniqueUserId('flow-whatif-tips');
      const ctx = createIntegrationContext(sleepCore, userId);
      const whatIfCommand = new WhatIfCommand();
      const smartTipsCommand = new SmartTipsCommand();

      // Prepare twin
      const digitalTwin = sleepCore.getDigitalTwin();
      for (let i = 0; i < 5; i++) {
        await digitalTwin.updateTwin(userId, {
          sleepEfficiency: 75,
          sleepOnsetLatency: 25,
          wakeAfterSleepOnset: 40,
          totalSleepTime: 380,
          numberOfAwakenings: 2,
          timeInBed: 480,
          bedtime: '23:00',
          wakeTime: '07:00',
          finalAwakening: '06:45',
          outOfBedTime: '07:00',
        });
      }

      // User explores PMR scenario in whatif
      const whatifResult = await whatIfCommand.handleCallback(ctx, 'whatif:scenario:pmr_practice', {});
      expect(whatifResult.success).toBe(true);

      // User decides to try relaxation tips
      const tipsResult = await smartTipsCommand.execute(ctx, 'stress');
      expect(tipsResult.success).toBe(true);
    });

    it('should support full memory consolidation cycle', async () => {
      const userId = getUniqueUserId('flow-memory');
      const ctx = createIntegrationContext(sleepCore, userId);
      const rehearsalCommand = new RehearsalCommand();
      const recallCommand = new RecallCommand();

      // Step 1: Evening rehearsal
      const rehearsalResult = await rehearsalCommand.handleCallback(ctx, 'rehearsal:force', {});
      expect(rehearsalResult.success).toBe(true);
      expect(rehearsalResult.message).toContain('Правила');

      // Step 2: Complete visualization
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:visualize:0', {});
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:visualize:1', {});
      await rehearsalCommand.handleCallback(ctx, 'rehearsal:visualize:2', {});

      // Step 3: Set intention
      const intentionResult = await rehearsalCommand.handleCallback(ctx, 'rehearsal:intention', {});
      expect(intentionResult.success).toBe(true);

      // Step 4: Morning recall (simulated)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      const recallResult = await recallCommand.execute(ctx);
      expect(recallResult.success).toBe(true);
    });
  });
});
