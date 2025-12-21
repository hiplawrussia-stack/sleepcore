/**
 * Test Helpers for Bot Command Tests
 * ===================================
 * Provides mock factories and utilities for testing bot commands.
 */

import type { ISleepCoreContext, ICommandResult } from '../../../../src/bot/commands/interfaces/ICommand';
import type { SleepCoreAPI } from '../../../../src/SleepCoreAPI';

/**
 * Create a mock SleepCoreAPI
 */
export function createMockSleepCoreAPI(overrides: Partial<SleepCoreAPI> = {}): SleepCoreAPI {
  return {
    startSession: jest.fn().mockReturnValue({
      userId: 'test-user',
      startedAt: new Date(),
      currentPhase: 'assessment',
      weekNumber: 1,
      isiScore: 15,
      isiSeverity: 'moderate',
    }),
    getSession: jest.fn().mockReturnValue({
      userId: 'test-user',
      startedAt: new Date(),
      currentPhase: 'treatment',
      weekNumber: 2,
      isiScore: 12,
      isiSeverity: 'subthreshold',
    }),
    addDiaryEntry: jest.fn().mockReturnValue(true),
    getNextIntervention: jest.fn().mockReturnValue({
      component: 'sleep_restriction',
      action: 'Ложитесь спать в 23:00, вставайте в 06:30',
      rationale: 'Оптимизация времени в постели для повышения эффективности сна',
      priority: 3,
      timing: 'tonight',
      personalizationScore: 0.85,
    }),
    getRelaxationRecommendation: jest.fn().mockReturnValue({
      technique: 'pmr',
      name: 'Прогрессивная мышечная релаксация',
      duration: 15,
      instructions: ['Напрягите мышцы ног', 'Расслабьте мышцы ног'],
    }),
    getMindfulnessPractice: jest.fn().mockReturnValue({
      type: 'body_scan',
      name: 'Сканирование тела',
      duration: 10,
      guidance: ['Сфокусируйтесь на дыхании', 'Обратите внимание на ощущения в теле'],
    }),
    getProgressReport: jest.fn().mockReturnValue({
      currentISI: 12,
      isiChange: -3,
      currentSleepEfficiency: 82,
      sleepEfficiencyChange: 5,
      currentWeek: 2,
      overallAdherence: 85,
      achievements: ['7 дней дневника подряд', 'Улучшение SE на 5%'],
      improvements: ['Продолжайте ограничение сна'],
      responseStatus: 'responding',
    }),
    getSleepEfficiencyTrend: jest.fn().mockReturnValue([78, 80, 82, 81, 85, 84, 86]),
    ...overrides,
  } as unknown as SleepCoreAPI;
}

/**
 * Create a mock ISleepCoreContext
 */
export function createMockContext(overrides: Partial<ISleepCoreContext> = {}): ISleepCoreContext {
  const mockSleepCore = createMockSleepCoreAPI();

  return {
    userId: 'test-user-123',
    chatId: 12345,
    displayName: 'Test User',
    languageCode: 'ru',
    sleepCore: mockSleepCore,
    from: {
      id: 123,
      is_bot: false,
      first_name: 'Test',
    },
    chat: {
      id: 12345,
      type: 'private',
    },
    message: {
      message_id: 1,
      date: Date.now() / 1000,
      chat: { id: 12345, type: 'private' },
      text: '/test',
    },
    reply: jest.fn(),
    editMessageText: jest.fn(),
    answerCallbackQuery: jest.fn(),
    ...overrides,
  } as unknown as ISleepCoreContext;
}

/**
 * Create a mock context with no session
 */
export function createMockContextNoSession(): ISleepCoreContext {
  const mockSleepCore = createMockSleepCoreAPI({
    getSession: jest.fn().mockReturnValue(null),
  });

  return createMockContext({ sleepCore: mockSleepCore });
}

/**
 * Create a mock context with no intervention available
 */
export function createMockContextNoIntervention(): ISleepCoreContext {
  const mockSleepCore = createMockSleepCoreAPI({
    getNextIntervention: jest.fn().mockReturnValue(null),
  });

  return createMockContext({ sleepCore: mockSleepCore });
}

/**
 * Assert that result is successful with a message
 */
export function assertSuccessWithMessage(result: ICommandResult): void {
  expect(result.success).toBe(true);
  expect(result.message).toBeDefined();
  expect(result.message!.length).toBeGreaterThan(0);
}

/**
 * Assert that result has keyboard buttons
 */
export function assertHasKeyboard(result: ICommandResult, minRows = 1): void {
  expect(result.keyboard).toBeDefined();
  expect(result.keyboard!.length).toBeGreaterThanOrEqual(minRows);
}

/**
 * Assert that result contains specific text
 */
export function assertContainsText(result: ICommandResult, text: string): void {
  expect(result.message).toContain(text);
}

/**
 * Assert callback data format
 */
export function assertCallbackData(
  result: ICommandResult,
  prefix: string
): void {
  expect(result.keyboard).toBeDefined();
  const allCallbacks = result.keyboard!.flat().map(btn => btn.callbackData);
  const matchingCallbacks = allCallbacks.filter(cb => cb?.startsWith(prefix));
  expect(matchingCallbacks.length).toBeGreaterThan(0);
}
