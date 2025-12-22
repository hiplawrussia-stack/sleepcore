/**
 * SmartMemoryWindowEngine - Cognitive Consolidation System
 * =========================================================
 *
 * Leverages sleep-dependent memory consolidation to reinforce
 * CBT-I behavior changes through:
 * 1. Pre-sleep mental rehearsal (30-60 min before bed)
 * 2. Morning recall quiz (testing effect)
 * 3. Adaptive spaced repetition
 *
 * Scientific Foundation:
 * - Neuron 2025: cAMP oscillations during NREM optimize plasticity
 * - Science Advances: Rehearsal + sleep = long-term memory
 * - Robertson et al.: Intentional learning benefits from sleep
 * - Roediger & Karpicke: Testing effect enhances retention
 *
 * @packageDocumentation
 * @module @sleepcore/cognitive
 */

import {
  type ISleepRule,
  type IRuleConsolidationState,
  type IRehearsalSession,
  type IRecallQuestion,
  type IRecallAnswer,
  type IRecallSession,
  type IConsolidationAnalytics,
  type IAdaptiveLearningConfig,
  type IRehearsalEngine,
  type IRecallEngine,
  type IConsolidationAnalyticsEngine,
  type ISmartMemoryWindowEngine,
  type SleepRuleCategory,
  DEFAULT_ADAPTIVE_CONFIG,
} from '../interfaces/ICognitiveConsolidation';
import { SLEEP_RULES, getRuleById, getBeginnerRules } from '../data/SleepRules';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse time string to Date
 */
function parseTime(timeStr: string, referenceDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Rehearsal Engine Implementation
 */
export class RehearsalEngine implements IRehearsalEngine {
  private readonly config: IAdaptiveLearningConfig;

  constructor(config: IAdaptiveLearningConfig = DEFAULT_ADAPTIVE_CONFIG) {
    this.config = config;
  }

  /**
   * Select rules for tonight's rehearsal using adaptive algorithm
   */
  selectRulesForRehearsal(
    userId: string,
    consolidationStates: IRuleConsolidationState[],
    config: IAdaptiveLearningConfig = this.config
  ): ISleepRule[] {
    const stateMap = new Map(consolidationStates.map((s) => [s.ruleId, s]));

    // Priority 1: Rules that need review today (spaced repetition)
    const dueForReview = SLEEP_RULES.filter((rule) => {
      const state = stateMap.get(rule.id);
      if (!state) return false;
      if (state.isMastered) return false;
      if (!state.nextReviewAt) return true;
      return new Date(state.nextReviewAt) <= new Date();
    });

    // Priority 2: Rules with low consolidation scores
    const struggling = SLEEP_RULES.filter((rule) => {
      const state = stateMap.get(rule.id);
      if (!state) return false;
      if (state.isMastered) return false;
      return state.consolidationScore < 0.5 && state.rehearsalCount > 0;
    });

    // Priority 3: New rules not yet introduced
    const newRules = SLEEP_RULES.filter((rule) => {
      const state = stateMap.get(rule.id);
      return !state || state.rehearsalCount === 0;
    });

    // Build selection
    const selected: ISleepRule[] = [];
    const seen = new Set<string>();

    // Add due reviews first
    for (const rule of dueForReview) {
      if (selected.length >= config.maxRulesPerSession) break;
      if (!seen.has(rule.id)) {
        selected.push(rule);
        seen.add(rule.id);
      }
    }

    // Add struggling rules
    for (const rule of struggling) {
      if (selected.length >= config.maxRulesPerSession) break;
      if (!seen.has(rule.id)) {
        selected.push(rule);
        seen.add(rule.id);
      }
    }

    // Add new rules (start with easier ones)
    const sortedNew = newRules.sort((a, b) => a.difficulty - b.difficulty);
    for (const rule of sortedNew) {
      if (selected.length >= config.maxRulesPerSession) break;
      if (!seen.has(rule.id)) {
        selected.push(rule);
        seen.add(rule.id);
      }
    }

    // Ensure minimum rules
    if (selected.length < config.minRulesPerSession) {
      const beginnerRules = getBeginnerRules();
      for (const rule of beginnerRules) {
        if (selected.length >= config.minRulesPerSession) break;
        if (!seen.has(rule.id)) {
          selected.push(rule);
          seen.add(rule.id);
        }
      }
    }

    return selected;
  }

  /**
   * Generate immersive visualization script
   */
  generateVisualization(rule: ISleepRule): string {
    return (
      `🧠 *Ментальная репетиция*\n\n` +
      `Закройте глаза и представьте:\n\n` +
      `_${rule.visualizationPrompt}_\n\n` +
      `Удерживайте этот образ 30 секунд. Почувствуйте, как ваше тело ` +
      `и разум запоминают это состояние.`
    );
  }

  /**
   * Create complete rehearsal session
   */
  createRehearsalSession(
    userId: string,
    rules: ISleepRule[],
    plannedBedtime: string
  ): IRehearsalSession {
    const now = new Date();
    const bedtimeDate = parseTime(plannedBedtime, now);
    const minutesBeforeBed = Math.round(
      (bedtimeDate.getTime() - now.getTime()) / 60000
    );

    return {
      sessionId: generateId(),
      userId,
      timestamp: now,
      rules,
      plannedBedtime,
      minutesBeforeBed: Math.max(0, minutesBeforeBed),
      visualizationCompleted: false,
      intentionSet: false,
    };
  }

  /**
   * Format rehearsal for Telegram message
   */
  formatRehearsalMessage(session: IRehearsalSession): string {
    const lines: string[] = [
      `🌙 *Вечерняя репетиция сна*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `До сна: ~${session.minutesBeforeBed} мин`,
      ``,
      `📚 *Правила сна на сегодня:*`,
      ``,
    ];

    session.rules.forEach((rule, index) => {
      lines.push(`${index + 1}. *${rule.statement}*`);
      lines.push(`   _${rule.rationale}_`);
      lines.push(``);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(``);
    lines.push(`🧠 *Визуализация*`);
    lines.push(``);

    // Use first rule's visualization
    if (session.rules.length > 0) {
      lines.push(`_${session.rules[0].visualizationPrompt}_`);
    }

    lines.push(``);
    lines.push(`💡 *Установка намерения:*`);
    lines.push(`"Я запомню эти правила и проверю себя утром."`);

    return lines.join('\n');
  }

  /**
   * Set learning intention message
   */
  setLearningIntention(sessionId: string): string {
    return (
      `✨ *Намерение установлено*\n\n` +
      `Ваш мозг теперь знает, что эта информация важна ` +
      `и будет консолидировать её во время сна.\n\n` +
      `Спокойной ночи! 🌙\n\n` +
      `_Утром я спрошу, что вы запомнили._`
    );
  }
}

/**
 * Recall Engine Implementation
 */
export class RecallEngine implements IRecallEngine {
  /**
   * Generate quiz questions from rehearsal
   */
  generateQuiz(
    userId: string,
    rehearsalSession: IRehearsalSession,
    maxQuestions: number = 3
  ): IRecallQuestion[] {
    const questions: IRecallQuestion[] = [];

    const rules = rehearsalSession.rules.slice(0, maxQuestions);

    for (const rule of rules) {
      // Alternate question types
      const questionType = this.selectQuestionType(rule);

      questions.push(this.createQuestion(rule, questionType));
    }

    return questions;
  }

  /**
   * Select appropriate question type based on rule
   */
  private selectQuestionType(
    rule: ISleepRule
  ): 'free_recall' | 'recognition' | 'application' {
    // Harder rules get recognition (easier), easier rules get free recall
    if (rule.difficulty >= 4) return 'recognition';
    if (rule.difficulty <= 2) return 'free_recall';
    return 'application';
  }

  /**
   * Create question for a rule
   */
  private createQuestion(
    rule: ISleepRule,
    type: 'free_recall' | 'recognition' | 'application'
  ): IRecallQuestion {
    const questionId = generateId();

    switch (type) {
      case 'free_recall':
        return {
          questionId,
          ruleId: rule.id,
          type: 'free_recall',
          question: this.generateFreeRecallQuestion(rule),
          correctAnswers: [rule.statement],
        };

      case 'recognition':
        return {
          questionId,
          ruleId: rule.id,
          type: 'recognition',
          question: this.generateRecognitionQuestion(rule),
          options: this.generateOptions(rule),
          correctAnswers: [rule.statement],
        };

      case 'application':
        return {
          questionId,
          ruleId: rule.id,
          type: 'application',
          question: this.generateApplicationQuestion(rule),
          correctAnswers: this.getApplicationAnswers(rule),
        };
    }
  }

  /**
   * Generate free recall question
   */
  private generateFreeRecallQuestion(rule: ISleepRule): string {
    const categoryQuestions: Record<SleepRuleCategory, string> = {
      stimulus_control:
        'Какое правило о связи кровати и сна вы запомнили вчера?',
      sleep_restriction:
        'Что вы помните о правиле ограничения времени в постели?',
      sleep_hygiene: 'Какое правило гигиены сна мы обсуждали вчера вечером?',
      cognitive: 'Какую мысль о сне стоит помнить, когда тревожно?',
      relaxation: 'Какую технику расслабления вы практиковали вчера?',
    };

    return categoryQuestions[rule.category];
  }

  /**
   * Generate recognition question
   */
  private generateRecognitionQuestion(rule: ISleepRule): string {
    return 'Какое из этих правил мы обсуждали вчера вечером?';
  }

  /**
   * Generate options for recognition question
   */
  private generateOptions(rule: ISleepRule): string[] {
    const distractors = SLEEP_RULES.filter(
      (r) => r.id !== rule.id && r.category !== rule.category
    )
      .slice(0, 3)
      .map((r) => r.statement);

    const options = [rule.statement, ...distractors];

    // Shuffle
    return options.sort(() => Math.random() - 0.5);
  }

  /**
   * Generate application question
   */
  private generateApplicationQuestion(rule: ISleepRule): string {
    const scenarios: Record<SleepRuleCategory, string> = {
      stimulus_control:
        'Вы лежите в кровати 20 минут и не можете уснуть. Что делать по правилам?',
      sleep_restriction:
        'Ваша эффективность сна 75%. Что это означает и что делать?',
      sleep_hygiene:
        'Сейчас 16:00 и вы хотите кофе. Стоит ли пить? Почему?',
      cognitive:
        'Вы плохо спали и думаете "я не справлюсь завтра". Как переформулировать эту мысль?',
      relaxation:
        'Вы чувствуете напряжение перед сном. Какую технику использовать?',
    };

    return scenarios[rule.category];
  }

  /**
   * Get acceptable application answers
   */
  private getApplicationAnswers(rule: ISleepRule): string[] {
    // Keywords that indicate correct understanding
    const keywords: Record<SleepRuleCategory, string[]> = {
      stimulus_control: ['встать', 'выйти', 'уйти', 'другая комната'],
      sleep_restriction: ['низкая', 'сократить', 'меньше времени', 'эффективность'],
      sleep_hygiene: ['нет', 'не пить', 'кофеин', 'поздно'],
      cognitive: ['справлюсь', 'одна ночь', 'не катастрофа', 'восстановлюсь'],
      relaxation: ['дыхание', 'расслабление', 'мышцы', 'медитация'],
    };

    return keywords[rule.category];
  }

  /**
   * Evaluate user's answer
   */
  evaluateAnswer(question: IRecallQuestion, userResponse: string): IRecallAnswer {
    const response = userResponse.toLowerCase().trim();
    let isCorrect = false;
    let partialScore = 0;

    switch (question.type) {
      case 'free_recall':
        // Check for key concepts
        const rule = getRuleById(question.ruleId);
        if (rule) {
          const keyWords = rule.statement.toLowerCase().split(' ').filter((w) => w.length > 4);
          const matchedWords = keyWords.filter((w) => response.includes(w));
          partialScore = matchedWords.length / keyWords.length;
          isCorrect = partialScore >= 0.5;
        }
        break;

      case 'recognition':
        isCorrect = question.correctAnswers.some(
          (ans) => ans.toLowerCase() === response
        );
        partialScore = isCorrect ? 1 : 0;
        break;

      case 'application':
        // Check for keywords
        const hasKeyword = question.correctAnswers.some((keyword) =>
          response.includes(keyword.toLowerCase())
        );
        isCorrect = hasKeyword;
        partialScore = hasKeyword ? 1 : 0;
        break;
    }

    return {
      questionId: question.questionId,
      response: userResponse,
      isCorrect,
      partialScore,
      responseTimeSeconds: 0, // Set by caller
    };
  }

  /**
   * Create recall session from answers
   */
  createRecallSession(
    userId: string,
    rehearsalSessionId: string | null,
    questions: IRecallQuestion[],
    answers: IRecallAnswer[]
  ): IRecallSession {
    const totalScore =
      answers.reduce((sum, a) => sum + a.partialScore, 0) / answers.length;

    return {
      sessionId: generateId(),
      userId,
      timestamp: new Date(),
      rehearsalSessionId,
      questions,
      answers,
      overallScore: totalScore,
      completionTimeSeconds: answers.reduce((sum, a) => sum + a.responseTimeSeconds, 0),
    };
  }

  /**
   * Update consolidation states based on recall performance
   */
  updateConsolidationStates(
    currentStates: IRuleConsolidationState[],
    recallSession: IRecallSession
  ): IRuleConsolidationState[] {
    const stateMap = new Map(currentStates.map((s) => [s.ruleId, s]));
    const updatedStates: IRuleConsolidationState[] = [];

    for (const question of recallSession.questions) {
      const answer = recallSession.answers.find(
        (a) => a.questionId === question.questionId
      );
      if (!answer) continue;

      const currentState = stateMap.get(question.ruleId);
      const now = new Date();

      if (currentState) {
        // Update existing state
        const newSuccessful = answer.isCorrect
          ? currentState.successfulRecalls + 1
          : currentState.successfulRecalls;
        const newFailed = answer.isCorrect
          ? currentState.failedRecalls
          : currentState.failedRecalls + 1;
        const totalRecalls = newSuccessful + newFailed;
        const newScore = totalRecalls > 0 ? newSuccessful / totalRecalls : 0;
        const newStreak = answer.isCorrect ? currentState.streakDays + 1 : 0;

        updatedStates.push({
          ...currentState,
          successfulRecalls: newSuccessful,
          failedRecalls: newFailed,
          consolidationScore: newScore,
          lastRecallAt: now,
          streakDays: newStreak,
          isMastered: newScore >= 0.85 && newStreak >= 3,
          nextReviewAt: this.calculateNextReview(newScore, newStreak),
        });
      } else {
        // Create new state
        updatedStates.push({
          ruleId: question.ruleId,
          rehearsalCount: 1,
          successfulRecalls: answer.isCorrect ? 1 : 0,
          failedRecalls: answer.isCorrect ? 0 : 1,
          consolidationScore: answer.isCorrect ? 1 : 0,
          lastRehearsalAt: null,
          lastRecallAt: now,
          nextReviewAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          isMastered: false,
          streakDays: answer.isCorrect ? 1 : 0,
        });
      }
    }

    // Keep unchanged states
    for (const state of currentStates) {
      if (!updatedStates.find((s) => s.ruleId === state.ruleId)) {
        updatedStates.push(state);
      }
    }

    return updatedStates;
  }

  /**
   * Calculate next review date based on performance
   */
  private calculateNextReview(score: number, streak: number): Date {
    const now = new Date();
    const intervals = DEFAULT_ADAPTIVE_CONFIG.spacedRepetitionIntervals;

    // Use streak to determine interval index
    const intervalIndex = Math.min(streak, intervals.length - 1);
    let days = intervals[intervalIndex];

    // Adjust based on score
    if (score < 0.5) {
      days = 1; // Review tomorrow if struggling
    } else if (score < 0.7) {
      days = Math.max(1, Math.floor(days / 2)); // Earlier review
    }

    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Format quiz for Telegram
   */
  formatQuizMessage(question: IRecallQuestion): {
    text: string;
    keyboard?: { text: string; callbackData: string }[][];
  } {
    if (question.type === 'recognition' && question.options) {
      return {
        text: `☀️ *Утренний тест памяти*\n\n${question.question}`,
        keyboard: question.options.map((opt, i) => [
          {
            text: `${i + 1}. ${opt.substring(0, 50)}${opt.length > 50 ? '...' : ''}`,
            callbackData: `recall:${question.questionId}:${i}`,
          },
        ]),
      };
    }

    return {
      text:
        `☀️ *Утренний тест памяти*\n\n` +
        `${question.question}\n\n` +
        `_Напишите свой ответ:_`,
    };
  }
}

/**
 * Consolidation Analytics Engine Implementation
 */
export class ConsolidationAnalyticsEngine implements IConsolidationAnalyticsEngine {
  /**
   * Analyze consolidation for a period
   */
  analyzeConsolidation(
    userId: string,
    rehearsalSessions: IRehearsalSession[],
    recallSessions: IRecallSession[],
    periodDays: number
  ): IConsolidationAnalytics {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter sessions to period
    const periodRehearsals = rehearsalSessions.filter(
      (s) => s.timestamp >= periodStart
    );
    const periodRecalls = recallSessions.filter(
      (s) => s.timestamp >= periodStart
    );

    // Calculate average recall accuracy
    const avgRecallAccuracy =
      periodRecalls.length > 0
        ? periodRecalls.reduce((sum, s) => sum + s.overallScore, 0) /
          periodRecalls.length
        : 0;

    // Analyze by category
    const categoryScores = this.analyzeCategoryPerformance(periodRecalls);
    const strongCategories = Object.entries(categoryScores)
      .filter(([_, score]) => score >= 0.7)
      .map(([cat]) => cat as SleepRuleCategory);
    const weakCategories = Object.entries(categoryScores)
      .filter(([_, score]) => score < 0.5)
      .map(([cat]) => cat as SleepRuleCategory);

    // Determine trend
    const trend = this.calculateTrend(periodRecalls);

    // Count rule statuses (simplified)
    const ruleStats = {
      mastered: Math.round(SLEEP_RULES.length * avgRecallAccuracy * 0.3),
      consolidating: Math.round(SLEEP_RULES.length * 0.4),
      struggling: Math.round(SLEEP_RULES.length * (1 - avgRecallAccuracy) * 0.3),
      notStarted: Math.max(0, SLEEP_RULES.length - periodRehearsals.length),
    };

    return {
      userId,
      periodStart,
      periodEnd: now,
      overallProgress: avgRecallAccuracy,
      ruleStats,
      avgRecallAccuracy,
      trend,
      strongCategories,
      weakCategories,
      recommendations: this.generateRecommendations(avgRecallAccuracy, weakCategories),
    };
  }

  /**
   * Analyze performance by category
   */
  private analyzeCategoryPerformance(
    recallSessions: IRecallSession[]
  ): Record<SleepRuleCategory, number> {
    const categoryScores: Record<SleepRuleCategory, { total: number; count: number }> = {
      stimulus_control: { total: 0, count: 0 },
      sleep_restriction: { total: 0, count: 0 },
      sleep_hygiene: { total: 0, count: 0 },
      cognitive: { total: 0, count: 0 },
      relaxation: { total: 0, count: 0 },
    };

    for (const session of recallSessions) {
      for (let i = 0; i < session.questions.length; i++) {
        const question = session.questions[i];
        const answer = session.answers[i];
        const rule = getRuleById(question.ruleId);

        if (rule && answer) {
          categoryScores[rule.category].total += answer.partialScore;
          categoryScores[rule.category].count++;
        }
      }
    }

    const result: Record<SleepRuleCategory, number> = {} as any;
    for (const [cat, data] of Object.entries(categoryScores)) {
      result[cat as SleepRuleCategory] = data.count > 0 ? data.total / data.count : 0;
    }

    return result;
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(
    recallSessions: IRecallSession[]
  ): 'improving' | 'stable' | 'declining' {
    if (recallSessions.length < 3) return 'stable';

    const sorted = [...recallSessions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, s) => sum + s.overallScore, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, s) => sum + s.overallScore, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    avgScore: number,
    weakCategories: SleepRuleCategory[]
  ): string[] {
    const recommendations: string[] = [];

    if (avgScore < 0.5) {
      recommendations.push(
        'Попробуйте уменьшить количество правил за сессию до 2-3'
      );
      recommendations.push(
        'Используйте визуализацию перед сном — это усиливает консолидацию'
      );
    }

    if (weakCategories.includes('stimulus_control')) {
      recommendations.push(
        'Уделите внимание правилам стимульного контроля — они основа CBT-I'
      );
    }

    if (weakCategories.includes('cognitive')) {
      recommendations.push(
        'Когнитивные правила требуют практики — попробуйте записывать мысли'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Отличный прогресс! Продолжайте в том же духе.');
    }

    return recommendations;
  }

  /**
   * Get personalized recommendations
   */
  getRecommendations(
    analytics: IConsolidationAnalytics,
    consolidationStates: IRuleConsolidationState[]
  ): string[] {
    return analytics.recommendations;
  }

  /**
   * Calculate next review date
   */
  calculateNextReview(
    consolidationState: IRuleConsolidationState,
    config: IAdaptiveLearningConfig
  ): Date {
    const { consolidationScore, streakDays } = consolidationState;
    const intervals = config.spacedRepetitionIntervals;

    const intervalIndex = Math.min(streakDays, intervals.length - 1);
    let days = intervals[intervalIndex];

    if (consolidationScore < config.masteryThreshold) {
      days = Math.max(1, Math.floor(days * consolidationScore));
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Generate progress report
   */
  generateProgressReport(analytics: IConsolidationAnalytics): string {
    const trendEmoji = {
      improving: '📈',
      stable: '➡️',
      declining: '📉',
    };

    const lines: string[] = [
      `📊 *Отчёт о консолидации памяти*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📅 Период: ${analytics.periodStart.toLocaleDateString()} — ${analytics.periodEnd.toLocaleDateString()}`,
      ``,
      `🎯 *Общий прогресс:* ${Math.round(analytics.overallProgress * 100)}%`,
      `${trendEmoji[analytics.trend]} Тренд: ${analytics.trend === 'improving' ? 'улучшение' : analytics.trend === 'stable' ? 'стабильно' : 'снижение'}`,
      ``,
      `📚 *Правила:*`,
      `   ✅ Освоено: ${analytics.ruleStats.mastered}`,
      `   🔄 В процессе: ${analytics.ruleStats.consolidating}`,
      `   ⚠️ Требуют внимания: ${analytics.ruleStats.struggling}`,
      `   📝 Не начаты: ${analytics.ruleStats.notStarted}`,
      ``,
    ];

    if (analytics.strongCategories.length > 0) {
      lines.push(`💪 *Сильные темы:* ${analytics.strongCategories.join(', ')}`);
    }

    if (analytics.weakCategories.length > 0) {
      lines.push(`🎯 *Для проработки:* ${analytics.weakCategories.join(', ')}`);
    }

    lines.push(``);
    lines.push(`💡 *Рекомендации:*`);
    for (const rec of analytics.recommendations) {
      lines.push(`   • ${rec}`);
    }

    return lines.join('\n');
  }
}

/**
 * Main Smart Memory Window Engine
 */
export class SmartMemoryWindowEngine implements ISmartMemoryWindowEngine {
  readonly rehearsal: IRehearsalEngine;
  readonly recall: IRecallEngine;
  readonly analytics: IConsolidationAnalyticsEngine;

  // In-memory storage (would be replaced with database in production)
  private userStates: Map<string, IRuleConsolidationState[]> = new Map();
  private rehearsalSessions: Map<string, IRehearsalSession[]> = new Map();
  private recallSessions: Map<string, IRecallSession[]> = new Map();
  private lastRehearsal: Map<string, IRehearsalSession> = new Map();

  constructor(config?: IAdaptiveLearningConfig) {
    this.rehearsal = new RehearsalEngine(config);
    this.recall = new RecallEngine();
    this.analytics = new ConsolidationAnalyticsEngine();
  }

  /**
   * Initialize consolidation tracking for user
   */
  async initializeUser(userId: string): Promise<IRuleConsolidationState[]> {
    if (!this.userStates.has(userId)) {
      const initialStates: IRuleConsolidationState[] = SLEEP_RULES.map((rule) => ({
        ruleId: rule.id,
        rehearsalCount: 0,
        successfulRecalls: 0,
        failedRecalls: 0,
        consolidationScore: 0,
        lastRehearsalAt: null,
        lastRecallAt: null,
        nextReviewAt: null,
        isMastered: false,
        streakDays: 0,
      }));

      this.userStates.set(userId, initialStates);
      this.rehearsalSessions.set(userId, []);
      this.recallSessions.set(userId, []);
    }

    return this.userStates.get(userId)!;
  }

  /**
   * Get evening rehearsal content
   */
  async getEveningRehearsal(
    userId: string,
    bedtime: string
  ): Promise<IRehearsalSession> {
    const states = await this.initializeUser(userId);

    const rules = this.rehearsal.selectRulesForRehearsal(userId, states);
    const session = this.rehearsal.createRehearsalSession(userId, rules, bedtime);

    // Update states
    const updatedStates = states.map((state) => {
      const isInSession = rules.some((r) => r.id === state.ruleId);
      if (isInSession) {
        return {
          ...state,
          rehearsalCount: state.rehearsalCount + 1,
          lastRehearsalAt: new Date(),
        };
      }
      return state;
    });

    this.userStates.set(userId, updatedStates);
    this.lastRehearsal.set(userId, session);

    const sessions = this.rehearsalSessions.get(userId) || [];
    sessions.push(session);
    this.rehearsalSessions.set(userId, sessions);

    return session;
  }

  /**
   * Get morning recall quiz
   */
  async getMorningQuiz(userId: string): Promise<IRecallQuestion[]> {
    const lastSession = this.lastRehearsal.get(userId);

    if (!lastSession) {
      // No rehearsal last night — use random beginner rules
      const beginnerRules = getBeginnerRules().slice(0, 3);
      const mockSession: IRehearsalSession = {
        sessionId: 'mock',
        userId,
        timestamp: new Date(),
        rules: beginnerRules,
        plannedBedtime: '23:00',
        minutesBeforeBed: 0,
        visualizationCompleted: false,
        intentionSet: false,
      };
      return this.recall.generateQuiz(userId, mockSession);
    }

    return this.recall.generateQuiz(userId, lastSession);
  }

  /**
   * Process quiz answers
   */
  async processQuizAnswers(
    userId: string,
    answers: IRecallAnswer[]
  ): Promise<{
    recallSession: IRecallSession;
    updatedStates: IRuleConsolidationState[];
    feedback: string;
  }> {
    const lastSession = this.lastRehearsal.get(userId);
    const questions = await this.getMorningQuiz(userId);

    const recallSession = this.recall.createRecallSession(
      userId,
      lastSession?.sessionId || null,
      questions,
      answers
    );

    const currentStates = this.userStates.get(userId) || [];
    const updatedStates = this.recall.updateConsolidationStates(
      currentStates,
      recallSession
    );

    this.userStates.set(userId, updatedStates);

    const sessions = this.recallSessions.get(userId) || [];
    sessions.push(recallSession);
    this.recallSessions.set(userId, sessions);

    // Generate feedback
    const score = recallSession.overallScore;
    let feedback: string;

    if (score >= 0.8) {
      feedback =
        `🌟 *Отлично!* Вы вспомнили ${Math.round(score * 100)}% материала!\n\n` +
        `Ваш мозг успешно консолидировал новые правила сна во время ночного отдыха. ` +
        `Продолжайте применять их на практике.`;
    } else if (score >= 0.5) {
      feedback =
        `👍 *Хорошо!* Вы вспомнили ${Math.round(score * 100)}% материала.\n\n` +
        `Некоторые правила ещё закрепляются. Сегодня вечером мы повторим то, ` +
        `что вызвало затруднения.`;
    } else {
      feedback =
        `💪 *Есть над чем поработать!* Результат: ${Math.round(score * 100)}%\n\n` +
        `Не переживайте — консолидация памяти требует повторения. ` +
        `Вечером мы снова пройдём эти правила с визуализацией.`;
    }

    return { recallSession, updatedStates, feedback };
  }

  /**
   * Get user's consolidation progress
   */
  async getProgress(userId: string): Promise<IConsolidationAnalytics> {
    const rehearsals = this.rehearsalSessions.get(userId) || [];
    const recalls = this.recallSessions.get(userId) || [];

    return this.analytics.analyzeConsolidation(userId, rehearsals, recalls, 7);
  }

  /**
   * Check if user should receive rehearsal prompt
   */
  shouldPromptRehearsal(
    userId: string,
    currentTime: Date,
    bedtime: string
  ): boolean {
    const bedtimeDate = parseTime(bedtime, currentTime);
    const minutesUntilBed =
      (bedtimeDate.getTime() - currentTime.getTime()) / 60000;

    // Prompt 30-60 minutes before bed
    return minutesUntilBed >= 25 && minutesUntilBed <= 65;
  }

  /**
   * Check if user should receive morning quiz
   */
  shouldPromptMorningQuiz(
    userId: string,
    currentTime: Date,
    wakeTime: string
  ): boolean {
    const wakeDate = parseTime(wakeTime, currentTime);
    const minutesSinceWake =
      (currentTime.getTime() - wakeDate.getTime()) / 60000;

    // Prompt 15-60 minutes after wake
    return minutesSinceWake >= 15 && minutesSinceWake <= 60;
  }
}

/**
 * Create Smart Memory Window Engine
 */
export function createSmartMemoryWindowEngine(
  config?: IAdaptiveLearningConfig
): ISmartMemoryWindowEngine {
  return new SmartMemoryWindowEngine(config);
}
