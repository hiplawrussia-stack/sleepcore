/**
 * /recall Command - Morning Memory Quiz
 * ======================================
 * Morning recall test to measure sleep-dependent memory consolidation.
 *
 * Scientific Foundation (2025):
 * - Testing effect: retrieval practice > restudying
 * - Sleep consolidation verification
 * - Adaptive spaced repetition based on results
 *
 * Usage:
 * - /recall - Start morning quiz
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import {
  createSmartMemoryWindowEngine,
  type ISmartMemoryWindowEngine,
  type IRecallQuestion,
  type IRecallAnswer,
  getRuleById,
} from '../../cognitive';

/**
 * Quiz state for a user
 */
interface QuizState {
  questions: IRecallQuestion[];
  currentIndex: number;
  answers: IRecallAnswer[];
  startTime: Date;
  questionStartTime: Date;
}

/**
 * /recall Command Implementation
 */
export class RecallCommand implements ICommand {
  readonly name = 'recall';
  readonly description = 'Утренний тест памяти';
  readonly aliases = ['тест', 'утро', 'quiz', 'память'];
  readonly requiresSession = false;

  private engine: ISmartMemoryWindowEngine;

  // Store active quiz states
  private quizStates: Map<string, QuizState> = new Map();

  constructor() {
    this.engine = createSmartMemoryWindowEngine();
  }

  /**
   * Execute recall command
   */
  async execute(
    ctx: ISleepCoreContext,
    _args?: string
  ): Promise<ICommandResult> {
    const userId = ctx.userId;

    // Check if it's morning
    const hour = new Date().getHours();

    if (hour < 5 || hour > 14) {
      return {
        success: true,
        message: this.formatWrongTimeMessage(hour),
        keyboard: [[
          { text: '📝 Всё равно начать', callbackData: 'recall:start' },
        ]],
      };
    }

    return this.startQuiz(userId);
  }

  /**
   * Start quiz session
   */
  private async startQuiz(userId: string): Promise<ICommandResult> {
    const questions = await this.engine.getMorningQuiz(userId);

    if (questions.length === 0) {
      return {
        success: true,
        message:
          '📚 *Нет вопросов для теста*\n\n' +
          'Сначала пройдите вечернюю репетицию (/rehearsal), ' +
          'чтобы дать мозгу материал для консолидации.',
        keyboard: [[
          { text: '🌙 К репетиции', callbackData: 'rehearsal:force' },
        ]],
      };
    }

    const now = new Date();
    this.quizStates.set(userId, {
      questions,
      currentIndex: 0,
      answers: [],
      startTime: now,
      questionStartTime: now,
    });

    return this.showQuestion(userId, 0);
  }

  /**
   * Show a question
   */
  private async showQuestion(userId: string, index: number): Promise<ICommandResult> {
    const state = this.quizStates.get(userId);

    if (!state || index >= state.questions.length) {
      return await this.finishQuiz(userId);
    }

    const question = state.questions[index];
    const formatted = this.engine.recall.formatQuizMessage(question);

    // Update question start time
    state.questionStartTime = new Date();
    this.quizStates.set(userId, state);

    const keyboard: IInlineButton[][] = [];

    if (question.type === 'recognition' && question.options) {
      // Multiple choice
      question.options.forEach((opt, i) => {
        keyboard.push([
          {
            text: `${i + 1}. ${opt.length > 45 ? opt.substring(0, 45) + '...' : opt}`,
            callbackData: `recall:answer:${index}:${i}`,
          },
        ]);
      });
    } else {
      // Free text - show hint button
      keyboard.push([
        { text: '💡 Подсказка', callbackData: `recall:hint:${index}` },
      ]);
      keyboard.push([
        { text: '❓ Не помню', callbackData: `recall:skip:${index}` },
      ]);
    }

    return {
      success: true,
      message:
        `☀️ *Утренний тест памяти*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📝 Вопрос ${index + 1}/${state.questions.length}\n\n` +
        `${question.question}\n\n` +
        (question.type === 'free_recall'
          ? '_Напишите ответ или выберите действие:_'
          : '_Выберите правильный ответ:_'),
      keyboard,
    };
  }

  /**
   * Handle callback queries
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    data: string,
    _state: Record<string, unknown>
  ): Promise<ICommandResult> {
    const userId = ctx.userId;
    const parts = data.split(':');
    const action = parts[1];

    switch (action) {
      case 'start':
        return this.startQuiz(userId);

      case 'answer':
        return this.processAnswer(
          userId,
          parseInt(parts[2], 10),
          parseInt(parts[3], 10)
        );

      case 'hint':
        return this.showHint(userId, parseInt(parts[2], 10));

      case 'skip':
        return this.skipQuestion(userId, parseInt(parts[2], 10));

      case 'next':
        return this.showQuestion(userId, parseInt(parts[2], 10));

      case 'finish':
        return this.finishQuiz(userId);

      default:
        return {
          success: false,
          error: 'Неизвестное действие',
        };
    }
  }

  /**
   * Handle text answer for free recall
   */
  async handleTextAnswer(
    userId: string,
    text: string
  ): Promise<ICommandResult | null> {
    const state = this.quizStates.get(userId);

    if (!state) {
      return null; // No active quiz
    }

    const question = state.questions[state.currentIndex];

    if (question.type !== 'free_recall' && question.type !== 'application') {
      return null; // Not expecting text
    }

    const responseTime = Math.round(
      (Date.now() - state.questionStartTime.getTime()) / 1000
    );

    const answer = this.engine.recall.evaluateAnswer(question, text);
    const answerWithTime: IRecallAnswer = {
      ...answer,
      responseTimeSeconds: responseTime,
    };

    state.answers.push(answerWithTime);
    state.currentIndex++;
    this.quizStates.set(userId, state);

    // Show feedback and next question
    const feedback = answer.isCorrect
      ? '✅ *Правильно!*\n\n'
      : `❌ *Не совсем.*\n\n_Правильный ответ:_\n${question.correctAnswers[0]}\n\n`;

    if (state.currentIndex >= state.questions.length) {
      const result = await this.generateResults(userId);
      return {
        success: true,
        message: feedback + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' + result.message,
        keyboard: result.keyboard,
      };
    }

    return {
      success: true,
      message: feedback + 'Следующий вопрос...',
      keyboard: [[
        {
          text: '➡️ Далее',
          callbackData: `recall:next:${state.currentIndex}`,
        },
      ]],
    };
  }

  /**
   * Process recognition answer
   */
  private async processAnswer(
    userId: string,
    questionIndex: number,
    optionIndex: number
  ): Promise<ICommandResult> {
    const state = this.quizStates.get(userId);

    if (!state || questionIndex !== state.currentIndex) {
      return {
        success: false,
        error: 'Вопрос устарел. Начните тест заново.',
      };
    }

    const question = state.questions[questionIndex];
    const selectedOption = question.options?.[optionIndex] || '';

    const responseTime = Math.round(
      (Date.now() - state.questionStartTime.getTime()) / 1000
    );

    const answer = this.engine.recall.evaluateAnswer(question, selectedOption);
    const answerWithTime: IRecallAnswer = {
      ...answer,
      responseTimeSeconds: responseTime,
    };

    state.answers.push(answerWithTime);
    state.currentIndex++;
    this.quizStates.set(userId, state);

    // Show feedback
    const feedback = answer.isCorrect
      ? '✅ *Правильно!* Отлично запомнили!\n\n'
      : `❌ *Не совсем.*\n\n_Правильный ответ:_\n${question.correctAnswers[0]}\n\n`;

    if (state.currentIndex >= state.questions.length) {
      return await this.finishQuiz(userId, feedback);
    }

    return {
      success: true,
      message: feedback,
      keyboard: [[
        {
          text: '➡️ Следующий вопрос',
          callbackData: `recall:next:${state.currentIndex}`,
        },
      ]],
    };
  }

  /**
   * Show hint
   */
  private showHint(userId: string, questionIndex: number): ICommandResult {
    const state = this.quizStates.get(userId);

    if (!state) {
      return { success: false, error: 'Тест не найден' };
    }

    const question = state.questions[questionIndex];
    const rule = getRuleById(question.ruleId);

    const hint = rule
      ? `💡 *Подсказка:*\n\n_Категория: ${this.getCategoryName(rule.category)}_\n\n_${rule.rationale}_`
      : '💡 Подумайте о правилах, которые обсуждали вчера вечером.';

    return {
      success: true,
      message: hint + '\n\n_Напишите ваш ответ или нажмите "Не помню":_',
      keyboard: [[
        { text: '❓ Не помню', callbackData: `recall:skip:${questionIndex}` },
      ]],
    };
  }

  /**
   * Skip question
   */
  private async skipQuestion(userId: string, questionIndex: number): Promise<ICommandResult> {
    const state = this.quizStates.get(userId);

    if (!state) {
      return { success: false, error: 'Тест не найден' };
    }

    const question = state.questions[questionIndex];
    const responseTime = Math.round(
      (Date.now() - state.questionStartTime.getTime()) / 1000
    );

    const answer: IRecallAnswer = {
      questionId: question.questionId,
      response: '',
      isCorrect: false,
      partialScore: 0,
      responseTimeSeconds: responseTime,
    };

    state.answers.push(answer);
    state.currentIndex++;
    this.quizStates.set(userId, state);

    const feedback = `📌 *Правильный ответ:*\n_${question.correctAnswers[0]}_\n\nВечером мы повторим это правило.\n\n`;

    if (state.currentIndex >= state.questions.length) {
      return await this.finishQuiz(userId, feedback);
    }

    return {
      success: true,
      message: feedback,
      keyboard: [[
        {
          text: '➡️ Следующий вопрос',
          callbackData: `recall:next:${state.currentIndex}`,
        },
      ]],
    };
  }

  /**
   * Finish quiz and show results
   */
  private async finishQuiz(
    userId: string,
    prefix: string = ''
  ): Promise<ICommandResult> {
    const result = await this.generateResults(userId);

    return {
      success: true,
      message: prefix + result.message,
      keyboard: result.keyboard,
    };
  }

  /**
   * Generate results
   */
  private async generateResults(userId: string): Promise<{
    message: string;
    keyboard: IInlineButton[][];
  }> {
    const state = this.quizStates.get(userId);

    if (!state) {
      return {
        message: 'Результаты не найдены.',
        keyboard: [],
      };
    }

    // Process answers
    const { feedback } = await this.engine.processQuizAnswers(
      userId,
      state.answers
    );

    // Calculate stats
    const correct = state.answers.filter((a) => a.isCorrect).length;
    const total = state.answers.length;
    const percentage = Math.round((correct / total) * 100);

    // Determine emoji
    const emoji = percentage >= 80 ? '🌟' : percentage >= 50 ? '👍' : '💪';

    const totalTime = Math.round(
      (Date.now() - state.startTime.getTime()) / 1000
    );

    // Clean up state
    this.quizStates.delete(userId);

    const message =
      `${emoji} *Результаты теста*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📊 *Правильно:* ${correct}/${total} (${percentage}%)\n` +
      `⏱ *Время:* ${totalTime} сек\n\n` +
      feedback +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Сегодня вечером — новая репетиция!_`;

    return {
      message,
      keyboard: [
        [{ text: '📊 Полный прогресс', callbackData: 'rehearsal:progress' }],
        [{ text: '📖 Дневник сна', callbackData: 'diary:start' }],
      ],
    };
  }

  /**
   * Format wrong time message
   */
  private formatWrongTimeMessage(hour: number): string {
    if (hour < 5) {
      return (
        '🌙 *Ещё ночь!*\n\n' +
        'Лучшее время для теста — утром после пробуждения ' +
        '(через 15-60 минут).\n\n' +
        'Сейчас лучше спать. Консолидация памяти происходит во сне!\n\n' +
        '_Или нажмите кнопку, чтобы начать тест сейчас._'
      );
    } else {
      return (
        '🌆 *Уже вечер*\n\n' +
        'Утренний тест лучше работает сразу после пробуждения, ' +
        'когда консолидированные воспоминания ещё "свежие".\n\n' +
        'Сейчас лучше:\n' +
        '• /rehearsal — вечерняя репетиция\n' +
        '• /relax — расслабление перед сном\n\n' +
        '_Или нажмите кнопку, чтобы начать тест сейчас._'
      );
    }
  }

  /**
   * Get category display name
   */
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      stimulus_control: 'Стимульный контроль',
      sleep_restriction: 'Ограничение сна',
      sleep_hygiene: 'Гигиена сна',
      cognitive: 'Когнитивные техники',
      relaxation: 'Релаксация',
    };
    return names[category] || category;
  }
}

/**
 * Command instance
 */
export const recallCommand = new RecallCommand();
