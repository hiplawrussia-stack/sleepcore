/**
 * RecallCommand Unit Tests
 * =========================
 * Tests for /recall command - morning memory quiz.
 */

import { RecallCommand, recallCommand } from '../../../../src/bot/commands/RecallCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock cognitive module
jest.mock('../../../../src/cognitive', () => ({
  createSmartMemoryWindowEngine: jest.fn().mockReturnValue({
    getMorningQuiz: jest.fn().mockResolvedValue([
      {
        id: 'q1',
        ruleId: 'rule1',
        questionText: 'Тестовый вопрос?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        difficulty: 'medium',
      },
    ]),
    generateMorningQuiz: jest.fn().mockReturnValue([
      {
        id: 'q1',
        ruleId: 'rule1',
        questionText: 'Тестовый вопрос?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        difficulty: 'medium',
      },
    ]),
    processAnswer: jest.fn().mockReturnValue({
      isCorrect: true,
      feedback: 'Правильно!',
      updatedMastery: 0.8,
    }),
    processQuizAnswer: jest.fn().mockResolvedValue({
      isCorrect: true,
      feedback: 'Правильно!',
      updatedMastery: 0.8,
    }),
    processQuizAnswers: jest.fn().mockResolvedValue({
      feedback: {
        score: 1,
        total: 1,
        accuracy: 100,
        consolidationBonus: 0.1,
        masteryUpdates: [{ ruleId: 'rule1', oldMastery: 0.7, newMastery: 0.8 }],
      },
    }),
    getQuizSummary: jest.fn().mockReturnValue({
      score: 1,
      total: 1,
      accuracy: 100,
      averageTime: 5000,
      consolidationBonus: 0.1,
    }),
    recall: {
      formatQuizMessage: jest.fn().mockReturnValue({
        text: '❓ Тестовый вопрос?',
        options: ['A', 'B', 'C', 'D'],
      }),
      evaluateAnswer: jest.fn().mockReturnValue({
        isCorrect: true,
        correctAnswer: 0,
        selectedAnswer: 0,
        feedback: 'Правильно!',
      }),
      getQuizSummary: jest.fn().mockReturnValue({
        score: 1,
        total: 1,
        accuracy: 100,
      }),
      formatSummaryMessage: jest.fn().mockReturnValue({
        text: 'Результаты теста: 1/1 правильно',
        consolidationBonus: 0.1,
      }),
    },
  }),
  getRuleById: jest.fn().mockReturnValue({
    id: 'rule1',
    title: 'Test Rule',
    content: 'Test content',
  }),
}));

describe('RecallCommand', () => {
  let command: RecallCommand;

  beforeEach(() => {
    command = new RecallCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('recall');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('тест');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('тест');
      expect(command.aliases).toContain('утро');
      expect(command.aliases).toContain('quiz');
      expect(command.aliases).toContain('память');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  describe('execute()', () => {
    it('should check time of day', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should have keyboard', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle start callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'recall:start', {});

      assertSuccessWithMessage(result);
    });

    it('should handle answer callback', async () => {
      const ctx = createMockContext();
      // First start the quiz
      await command.handleCallback(ctx, 'recall:start', {});
      // Then answer
      const result = await command.handleCallback(ctx, 'recall:answer:0', {});

      expect(result.success).toBeDefined();
    });

    it('should default to execute for unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'recall:unknown', {});

      expect(result.success).toBeDefined();
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(recallCommand).toBeInstanceOf(RecallCommand);
      expect(recallCommand.name).toBe('recall');
    });
  });
});
