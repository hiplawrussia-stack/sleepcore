/**
 * RecallCommand Tests
 * ====================
 *
 * IEC 62304 Class B - Memory consolidation testing
 *
 * Tests verify:
 * - Morning time window enforcement
 * - Quiz session management
 * - Recognition and free recall questions
 * - Answer processing and scoring
 * - Hint and skip functionality
 * - Results generation
 *
 * @packageDocumentation
 */

// Mock functions must be declared before jest.mock for hoisting
const mockGetMorningQuiz = jest.fn();
const mockProcessQuizAnswers = jest.fn();
const mockFormatQuizMessage = jest.fn();
const mockEvaluateAnswer = jest.fn();
const mockGetRuleById = jest.fn();

import { RecallCommand, recallCommand } from '../RecallCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock cognitive module
jest.mock('../../../cognitive', () => ({
  createSmartMemoryWindowEngine: () => ({
    getMorningQuiz: mockGetMorningQuiz,
    processQuizAnswers: mockProcessQuizAnswers,
    recall: {
      formatQuizMessage: mockFormatQuizMessage,
      evaluateAnswer: mockEvaluateAnswer,
    },
  }),
  getRuleById: mockGetRuleById,
}));

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    celebrate: (text: string) => `🎉 ${text}`,
    remind: (text: string) => `⏰ ${text}`,
    respondToEmotion: (emotion: string) => ({
      text: emotion === 'hopeful' ? 'Неплохо!' : 'Не расстраивайся!',
    }),
  },
}));

// Mock questions
const mockRecognitionQuestion = {
  questionId: 'q1',
  ruleId: 'rule1',
  type: 'recognition',
  question: 'Что делать, если не можешь заснуть?',
  options: [
    'Встать и выйти из спальни',
    'Лежать и ждать',
    'Включить телевизор',
    'Выпить кофе',
  ],
  correctAnswers: ['Встать и выйти из спальни'],
};

const mockFreeRecallQuestion = {
  questionId: 'q2',
  ruleId: 'rule2',
  type: 'free_recall',
  question: 'Назовите главное правило стимульного контроля.',
  correctAnswers: ['Кровать только для сна'],
};

const mockApplicationQuestion = {
  questionId: 'q3',
  ruleId: 'rule3',
  type: 'application',
  question: 'Что бы вы сделали в этой ситуации?',
  correctAnswers: ['Встать и заняться спокойным делом'],
};

describe('RecallCommand', () => {
  let command: RecallCommand;
  let mockContext: ISleepCoreContext;

  beforeEach(() => {
    command = new RecallCommand();
    jest.clearAllMocks();

    // Setup default mock returns
    mockGetMorningQuiz.mockResolvedValue([mockRecognitionQuestion, mockFreeRecallQuestion]);
    mockProcessQuizAnswers.mockResolvedValue({
      feedback: 'Отличная работа!',
      strengthenedRules: ['rule1'],
      weakRules: [],
    });
    mockFormatQuizMessage.mockReturnValue('Formatted question');
    mockEvaluateAnswer.mockReturnValue({
      questionId: 'q1',
      response: 'answer',
      isCorrect: true,
      partialScore: 1,
    });
    mockGetRuleById.mockReturnValue({
      id: 'rule1',
      category: 'stimulus_control',
      rationale: 'Bed is for sleep only',
    });

    // Create mock context
    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {},
    } as unknown as ISleepCoreContext;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to mock time
  const mockTime = (hour: number) => {
    jest.useFakeTimers();
    const mockDate = new Date('2026-02-06T00:00:00');
    mockDate.setHours(hour);
    jest.setSystemTime(mockDate);
  };

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('recall');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('памяти');
    });

    it('should have memory-related aliases', () => {
      expect(command.aliases).toContain('тест');
      expect(command.aliases).toContain('quiz');
      expect(command.aliases).toContain('память');
      expect(command.aliases).toContain('утро');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  // ==========================================================================
  // TIME WINDOW ENFORCEMENT
  // ==========================================================================
  describe('Time Window Enforcement', () => {
    it('should start quiz during morning hours (5-14)', async () => {
      mockTime(9); // 9 AM

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockGetMorningQuiz).toHaveBeenCalled();
    });

    it('should show night message before 5 AM', async () => {
      mockTime(3); // 3 AM

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('ночь');
      expect(result.message).toContain('Консолидация');
    });

    it('should show evening message after 14:00', async () => {
      mockTime(18); // 6 PM

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('вечер');
      expect(result.message).toContain('/rehearsal');
    });

    it('should allow starting quiz anyway with button', async () => {
      mockTime(18);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find(b => b.callbackData === 'recall:start');
      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('начать');
    });

    it('should accept 5 AM as morning', async () => {
      mockTime(5);

      const result = await command.execute(mockContext);

      expect(mockGetMorningQuiz).toHaveBeenCalled();
    });

    it('should accept 14:00 as morning', async () => {
      mockTime(14);

      const result = await command.execute(mockContext);

      expect(mockGetMorningQuiz).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // QUIZ START
  // ==========================================================================
  describe('Quiz Start', () => {
    beforeEach(() => {
      mockTime(9);
    });

    it('should start quiz and show first question', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Утренний тест');
      expect(result.message).toContain('Вопрос 1/2');
    });

    it('should show no questions message when quiz empty', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([]);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Нет вопросов');
      expect(result.message).toContain('/rehearsal');
    });

    it('should include link to rehearsal when no questions', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'rehearsal:force')).toBe(true);
    });

    it('should start quiz via callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'recall:start',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockGetMorningQuiz).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // RECOGNITION QUESTIONS (MULTIPLE CHOICE)
  // ==========================================================================
  describe('Recognition Questions', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockRecognitionQuestion]);
    });

    it('should show question with options', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain(mockRecognitionQuestion.question);
      expect(result.message).toContain('Выбери правильный ответ');
    });

    it('should have answer buttons for each option', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.length).toBe(4);
      expect(buttons[0].callbackData).toBe('recall:answer:0:0');
      expect(buttons[1].callbackData).toBe('recall:answer:0:1');
    });

    it('should truncate long options in buttons', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([{
        ...mockRecognitionQuestion,
        options: ['This is a very long option text that should be truncated because it exceeds the limit'],
      }]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons[0].text).toContain('...');
    });

    it('should process correct answer', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Правильно');
    });

    it('should process incorrect answer', async () => {
      mockEvaluateAnswer.mockReturnValueOnce({
        questionId: 'q1',
        response: 'wrong',
        isCorrect: false,
        partialScore: 0,
      });

      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:1',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Не совсем');
      expect(result.message).toContain('Правильный ответ');
    });

    it('should reject stale question', async () => {
      // Don't start quiz, just try to answer
      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('устарел');
    });
  });

  // ==========================================================================
  // FREE RECALL QUESTIONS
  // ==========================================================================
  describe('Free Recall Questions', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockFreeRecallQuestion]);
    });

    it('should show hint and skip buttons for free recall', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData?.includes('recall:hint'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('recall:skip'))).toBe(true);
    });

    it('should show text input prompt', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Напиши ответ');
    });

    it('should process text answer', async () => {
      await command.execute(mockContext);

      const result = await command.handleTextAnswer('12345', 'Кровать только для сна');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });

    it('should return null if no active quiz', async () => {
      const result = await command.handleTextAnswer('12345', 'some answer');

      expect(result).toBeNull();
    });

    it('should return null for recognition question type', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockRecognitionQuestion]);
      await command.execute(mockContext);

      const result = await command.handleTextAnswer('12345', 'some answer');

      expect(result).toBeNull();
    });

    it('should handle application questions as text', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockApplicationQuestion]);
      await command.execute(mockContext);

      const result = await command.handleTextAnswer('12345', 'My answer');

      expect(result).not.toBeNull();
    });
  });

  // ==========================================================================
  // HINT FUNCTIONALITY
  // ==========================================================================
  describe('Hint Functionality', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockFreeRecallQuestion]);
    });

    it('should show hint on callback', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Подсказка');
    });

    it('should show rule category in hint', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Стимульный контроль');
    });

    it('should show rule rationale in hint', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Bed is for sleep only');
    });

    it('should show fallback hint when rule not found', async () => {
      mockGetRuleById.mockReturnValueOnce(null);
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('вчера вечером');
    });

    it('should still have skip button after hint', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData?.includes('recall:skip'))).toBe(true);
    });

    it('should return error if quiz not found', async () => {
      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // SKIP FUNCTIONALITY
  // ==========================================================================
  describe('Skip Functionality', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockFreeRecallQuestion, mockRecognitionQuestion]);
    });

    it('should skip question on callback', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:skip:0',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should show correct answer when skipping', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:skip:0',
        {}
      );

      expect(result.message).toContain('Правильный ответ');
      expect(result.message).toContain(mockFreeRecallQuestion.correctAnswers[0]);
    });

    it('should mention evening review', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:skip:0',
        {}
      );

      expect(result.message).toContain('Вечером');
    });

    it('should have next question button', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:skip:0',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'recall:next:1')).toBe(true);
    });

    it('should return error if quiz not found', async () => {
      const result = await command.handleCallback(
        mockContext,
        'recall:skip:0',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  describe('Navigation', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockRecognitionQuestion, mockFreeRecallQuestion]);
    });

    it('should navigate to next question', async () => {
      await command.execute(mockContext);
      await command.handleCallback(mockContext, 'recall:answer:0:0', {});

      const result = await command.handleCallback(
        mockContext,
        'recall:next:1',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Вопрос 2/2');
    });

    it('should finish quiz when out of questions', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockRecognitionQuestion]);
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      // Should show results (last question answered)
      expect(result.message).toContain('Результаты');
    });

    it('should handle finish callback', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:finish',
        {}
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // RESULTS
  // ==========================================================================
  describe('Results', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockRecognitionQuestion]);
    });

    it('should show results after last question', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('Результаты');
    });

    it('should show correct/total count', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('1/1');
    });

    it('should show percentage', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('100%');
    });

    it('should show time taken', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('сек');
    });

    it('should include feedback from engine', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('Отличная работа!');
    });

    it('should remind about evening rehearsal', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('вечером');
    });

    it('should celebrate high scores (>=80%)', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.message).toContain('🎉');
    });

    it('should encourage on medium scores (50-79%)', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockRecognitionQuestion, mockFreeRecallQuestion]);
      mockEvaluateAnswer
        .mockReturnValueOnce({ questionId: 'q1', isCorrect: true, partialScore: 1 })
        .mockReturnValueOnce({ questionId: 'q2', isCorrect: false, partialScore: 0 });

      await command.execute(mockContext);
      await command.handleCallback(mockContext, 'recall:answer:0:0', {});
      await command.handleCallback(mockContext, 'recall:next:1', {});

      const result = await command.handleCallback(
        mockContext,
        'recall:skip:1',
        {}
      );

      expect(result.message).toContain('Неплохо');
    });

    it('should have progress and diary buttons', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.some(b => b.callbackData === 'rehearsal:progress')).toBe(true);
      expect(buttons.some(b => b.callbackData === 'diary:start')).toBe(true);
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    beforeEach(() => {
      mockTime(9);
    });

    it('should handle start callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'recall:start',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle answer callback', async () => {
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle hint callback', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockFreeRecallQuestion]);
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle skip callback', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockFreeRecallQuestion]);
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:skip:0',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle next callback', async () => {
      await command.execute(mockContext);
      await command.handleCallback(mockContext, 'recall:answer:0:0', {});

      const result = await command.handleCallback(
        mockContext,
        'recall:next:1',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle finish callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'recall:finish',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should return error for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'recall:unknown',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестное');
    });
  });

  // ==========================================================================
  // CATEGORY NAMES
  // ==========================================================================
  describe('Category Names', () => {
    beforeEach(async () => {
      mockTime(9);
      mockGetMorningQuiz.mockResolvedValue([mockFreeRecallQuestion]);
    });

    it('should translate stimulus_control category', async () => {
      mockGetRuleById.mockReturnValue({
        category: 'stimulus_control',
        rationale: 'Test',
      });
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Стимульный контроль');
    });

    it('should translate sleep_restriction category', async () => {
      mockGetRuleById.mockReturnValue({
        category: 'sleep_restriction',
        rationale: 'Test',
      });
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Ограничение сна');
    });

    it('should translate sleep_hygiene category', async () => {
      mockGetRuleById.mockReturnValue({
        category: 'sleep_hygiene',
        rationale: 'Test',
      });
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Гигиена сна');
    });

    it('should translate cognitive category', async () => {
      mockGetRuleById.mockReturnValue({
        category: 'cognitive',
        rationale: 'Test',
      });
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Когнитивные техники');
    });

    it('should translate relaxation category', async () => {
      mockGetRuleById.mockReturnValue({
        category: 'relaxation',
        rationale: 'Test',
      });
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('Релаксация');
    });

    it('should fallback to raw category name if unknown', async () => {
      mockGetRuleById.mockReturnValue({
        category: 'unknown_category',
        rationale: 'Test',
      });
      await command.execute(mockContext);

      const result = await command.handleCallback(
        mockContext,
        'recall:hint:0',
        {}
      );

      expect(result.message).toContain('unknown_category');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockTime(9);
    });

    it('should handle engine error on quiz start', async () => {
      mockGetMorningQuiz.mockRejectedValueOnce(new Error('Engine error'));

      await expect(command.execute(mockContext)).rejects.toThrow('Engine error');
    });

    it('should handle empty state gracefully in results', async () => {
      // Call finish without starting quiz
      const result = await command.handleCallback(
        mockContext,
        'recall:finish',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('не найдены');
    });
  });

  // ==========================================================================
  // QUIZ STATE MANAGEMENT
  // ==========================================================================
  describe('Quiz State Management', () => {
    beforeEach(() => {
      mockTime(9);
    });

    it('should track quiz state per user', async () => {
      // Start quiz for user 1
      await command.execute(mockContext);

      // Start quiz for user 2
      const context2 = { ...mockContext, userId: '67890' } as unknown as ISleepCoreContext;
      await command.execute(context2);

      // Both should be independent
      const result1 = await command.handleCallback(
        mockContext,
        'recall:answer:0:0',
        {}
      );
      expect(result1.success).toBe(true);
    });

    it('should clean up state after quiz completion', async () => {
      mockGetMorningQuiz.mockResolvedValueOnce([mockRecognitionQuestion]);
      await command.execute(mockContext);
      await command.handleCallback(mockContext, 'recall:answer:0:0', {});

      // State should be cleaned up
      const result = await command.handleTextAnswer('12345', 'test');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(recallCommand).toBeInstanceOf(RecallCommand);
    });

    it('should have correct name', () => {
      expect(recallCommand.name).toBe('recall');
    });
  });
});
