/**
 * ProactiveIntelligenceService - JITAI-Powered Proactive Insights
 * ================================================================
 * Provides Just-In-Time Adaptive Interventions based on user data.
 *
 * Research basis (2025-2026):
 * - PMC Meta-analysis: JITAI effect g=0.15 (p=0.003)
 * - JITAI-Twins Framework (MassAITC 2025)
 * - Reinforcement Learning for mHealth (arXiv 2512.08950)
 * - Agentic AI in Healthcare (Frontiers 2025)
 *
 * Key features:
 * - Daily analysis with personalized insights
 * - Pattern change detection
 * - Risk escalation detection
 * - Optimal intervention timing
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { ISleepState, ISleepMetrics } from '../../sleep/interfaces/ISleepState';
import { sleepPredictionService, type ISleepPrediction } from './SleepPredictionService';
import { digitalTwinService } from './DigitalTwinService';
import { causalInsightsService } from './CausalInsightsService';

// ==================== Interfaces ====================

/**
 * Proactive insight generated from analysis
 */
export interface IProactiveInsight {
  /** Unique ID */
  id: string;

  /** Insight type */
  type: 'pattern_change' | 'risk_alert' | 'opportunity' | 'milestone' | 'tip';

  /** Priority (1 = highest) */
  priority: number;

  /** Title */
  title: string;
  titleRu: string;

  /** Message */
  message: string;
  messageRu: string;

  /** Recommended action */
  action?: {
    type: 'command' | 'reminder' | 'notification';
    command?: string;
    text?: string;
  };

  /** Confidence (0-1) */
  confidence: number;

  /** Urgency level */
  urgency: 'immediate' | 'today' | 'this_week' | 'low';

  /** Timestamp when generated */
  generatedAt: Date;

  /** Expiry time (insights are time-sensitive) */
  expiresAt: Date;
}

/**
 * Pattern alert when user behavior changes
 */
export interface IPatternAlert {
  /** Alert type */
  type: 'improvement' | 'deterioration' | 'instability' | 'new_pattern';

  /** Affected metric */
  metric: string;

  /** Previous value/pattern */
  previous: number | string;

  /** Current value/pattern */
  current: number | string;

  /** Change magnitude */
  changeMagnitude: number;

  /** Significance level */
  significance: number;

  /** Localized description */
  descriptionRu: string;
}

/**
 * Risk alert for escalation
 */
export interface IRiskAlert {
  /** Risk type */
  type: 'sleep_deterioration' | 'mental_health' | 'treatment_dropout' | 'adverse_event';

  /** Severity */
  severity: 'low' | 'moderate' | 'high' | 'critical';

  /** Risk score (0-1) */
  riskScore: number;

  /** Contributing factors */
  factors: string[];

  /** Recommended escalation */
  escalation: 'none' | 'monitor' | 'notify_admin' | 'immediate_action';

  /** Localized message */
  messageRu: string;
}

/**
 * Optimal timing recommendation
 */
export interface IOptimalTiming {
  /** Recommended time */
  time: Date;

  /** Time window (minutes) */
  windowMinutes: number;

  /** Confidence (0-1) */
  confidence: number;

  /** Reason for timing */
  reason: string;

  /** Context factors considered */
  factors: string[];
}

/**
 * Daily analysis result
 */
export interface IDailyAnalysis {
  /** User ID */
  userId: string;

  /** Analysis date */
  date: Date;

  /** Generated insights */
  insights: IProactiveInsight[];

  /** Pattern alerts */
  patternAlerts: IPatternAlert[];

  /** Risk alerts */
  riskAlerts: IRiskAlert[];

  /** Optimal intervention times */
  optimalTimings: IOptimalTiming[];

  /** Summary */
  summary: {
    overallTrend: 'improving' | 'stable' | 'declining';
    riskLevel: 'low' | 'moderate' | 'high';
    engagementScore: number;
    priorityAction: string | null;
  };
}

// ==================== Configuration ====================

/**
 * Default configuration
 */
export interface IProactiveIntelligenceConfig {
  /** Enable proactive insights */
  enabled: boolean;

  /** Minimum days of data for analysis */
  minDataDays: number;

  /** Maximum insights per day */
  maxInsightsPerDay: number;

  /** Pattern change threshold */
  patternChangeThreshold: number;

  /** Risk escalation threshold */
  riskEscalationThreshold: number;

  /** Optimal timing preferences */
  timing: {
    morningWindowStart: number; // hour
    morningWindowEnd: number;
    eveningWindowStart: number;
    eveningWindowEnd: number;
  };
}

export const DEFAULT_PROACTIVE_CONFIG: IProactiveIntelligenceConfig = {
  enabled: true,
  minDataDays: 3,
  maxInsightsPerDay: 3,
  patternChangeThreshold: 0.15, // 15% change triggers alert
  riskEscalationThreshold: 0.6,
  timing: {
    morningWindowStart: 7,
    morningWindowEnd: 9,
    eveningWindowStart: 19,
    eveningWindowEnd: 21,
  },
};

// ==================== Service Implementation ====================

/**
 * Proactive Intelligence Service
 * Implements JITAI-style proactive interventions
 */
export class ProactiveIntelligenceService {
  private config: IProactiveIntelligenceConfig;
  private userAnalysisCache: Map<string, { date: Date; analysis: IDailyAnalysis }> = new Map();
  private userInsightHistory: Map<string, IProactiveInsight[]> = new Map();

  constructor(config: Partial<IProactiveIntelligenceConfig> = {}) {
    this.config = { ...DEFAULT_PROACTIVE_CONFIG, ...config };
  }

  // ==================== Public API ====================

  /**
   * Run daily analysis for a user
   */
  async runDailyAnalysis(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IDailyAnalysis> {
    // Check cache
    const cached = this.userAnalysisCache.get(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (cached && cached.date.getTime() === today.getTime()) {
      return cached.analysis;
    }

    // Validate data
    if (sleepHistory.length < this.config.minDataDays) {
      return this.createEmptyAnalysis(userId);
    }

    // Run analysis components
    const [insights, patternAlerts, riskAlerts, optimalTimings] = await Promise.all([
      this.generateInsights(userId, sleepHistory),
      this.detectPatternChanges(userId, sleepHistory),
      this.detectRiskAlerts(userId, sleepHistory),
      this.findOptimalInterventionTimes(userId, sleepHistory),
    ]);

    // Create summary
    const summary = this.createSummary(insights, patternAlerts, riskAlerts);

    const analysis: IDailyAnalysis = {
      userId,
      date: today,
      insights: insights.slice(0, this.config.maxInsightsPerDay),
      patternAlerts,
      riskAlerts,
      optimalTimings,
      summary,
    };

    // Cache result
    this.userAnalysisCache.set(userId, { date: today, analysis });

    return analysis;
  }

  /**
   * Detect pattern changes in user data
   */
  async detectPatternChange(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IPatternAlert | null> {
    const alerts = await this.detectPatternChanges(userId, sleepHistory);
    return alerts.length > 0 ? alerts[0] : null;
  }

  /**
   * Detect risk escalation
   */
  async detectRiskEscalation(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IRiskAlert | null> {
    const alerts = await this.detectRiskAlerts(userId, sleepHistory);
    return alerts.length > 0 ? alerts[0] : null;
  }

  /**
   * Find optimal intervention time
   */
  async findOptimalInterventionTime(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<Date> {
    const timings = await this.findOptimalInterventionTimes(userId, sleepHistory);
    if (timings.length > 0) {
      return timings[0].time;
    }

    // Default to evening window
    const now = new Date();
    now.setHours(this.config.timing.eveningWindowStart, 0, 0, 0);
    return now;
  }

  /**
   * Get pending insights for user
   */
  getPendingInsights(userId: string): IProactiveInsight[] {
    const insights = this.userInsightHistory.get(userId) || [];
    const now = new Date();

    return insights.filter(i => i.expiresAt > now);
  }

  /**
   * Mark insight as delivered
   */
  markInsightDelivered(userId: string, insightId: string): void {
    const insights = this.userInsightHistory.get(userId) || [];
    const index = insights.findIndex(i => i.id === insightId);
    if (index !== -1) {
      insights.splice(index, 1);
      this.userInsightHistory.set(userId, insights);
    }
  }

  // ==================== Private Methods ====================

  private async generateInsights(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IProactiveInsight[]> {
    const insights: IProactiveInsight[] = [];
    const now = new Date();

    // 1. Check for milestones
    const milestoneInsight = this.checkMilestones(userId, sleepHistory);
    if (milestoneInsight) {
      insights.push(milestoneInsight);
    }

    // 2. Check for opportunities
    const opportunityInsight = await this.checkOpportunities(userId, sleepHistory);
    if (opportunityInsight) {
      insights.push(opportunityInsight);
    }

    // 3. Generate tips based on patterns
    const tipInsight = await this.generatePersonalizedTip(userId, sleepHistory);
    if (tipInsight) {
      insights.push(tipInsight);
    }

    // 4. Check predictions for proactive alerts
    const predictionInsight = await this.checkPredictions(userId, sleepHistory);
    if (predictionInsight) {
      insights.push(predictionInsight);
    }

    // Sort by priority
    return insights.sort((a, b) => a.priority - b.priority);
  }

  private checkMilestones(
    userId: string,
    sleepHistory: ISleepState[]
  ): IProactiveInsight | null {
    const now = new Date();

    // Check for 7-day streak
    if (sleepHistory.length === 7) {
      return {
        id: `milestone-7days-${userId}-${now.getTime()}`,
        type: 'milestone',
        priority: 1,
        title: '7-Day Streak!',
        titleRu: '7 дней дневника!',
        message: 'You\'ve completed a full week of sleep diary!',
        messageRu: 'Ты вёл дневник целую неделю! Это отличный результат — теперь у нас достаточно данных для точного анализа.',
        action: {
          type: 'command',
          command: '/predict',
          text: 'Посмотреть прогноз',
        },
        confidence: 1.0,
        urgency: 'today',
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    // Check for 14-day streak
    if (sleepHistory.length === 14) {
      return {
        id: `milestone-14days-${userId}-${now.getTime()}`,
        type: 'milestone',
        priority: 1,
        title: '14-Day Milestone!',
        titleRu: '14 дней — каузальный анализ доступен!',
        message: 'Two weeks of data enables causal analysis!',
        messageRu: 'Две недели данных! Теперь я могу рассказать, почему именно ты плохо спишь.',
        action: {
          type: 'command',
          command: '/insights',
          text: 'Узнать причины',
        },
        confidence: 1.0,
        urgency: 'today',
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    // Check for SE improvement
    if (sleepHistory.length >= 7) {
      const recentSE = this.calculateAverageSE(sleepHistory.slice(-7));
      const previousSE = sleepHistory.length >= 14
        ? this.calculateAverageSE(sleepHistory.slice(-14, -7))
        : null;

      if (previousSE && recentSE - previousSE >= 0.1) {
        return {
          id: `milestone-se-improvement-${userId}-${now.getTime()}`,
          type: 'milestone',
          priority: 2,
          title: 'Sleep Efficiency Improved!',
          titleRu: 'Эффективность сна выросла!',
          message: `Your SE improved by ${((recentSE - previousSE) * 100).toFixed(0)}%!`,
          messageRu: `Твоя эффективность сна выросла на ${((recentSE - previousSE) * 100).toFixed(0)}% за последнюю неделю! Это отличный прогресс.`,
          confidence: 0.9,
          urgency: 'today',
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        };
      }
    }

    return null;
  }

  private async checkOpportunities(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IProactiveInsight | null> {
    const now = new Date();

    // Check if weekend (opportunity for consistent wake time)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend
      const recentWakeTimes = sleepHistory.slice(-5).map(s => s.metrics.wakeTime).filter((t): t is string => t !== undefined);
      const avgWakeTime = this.calculateAverageTimeFromStrings(recentWakeTimes);

      if (avgWakeTime) {
        return {
          id: `opportunity-weekend-wake-${userId}-${now.getTime()}`,
          type: 'opportunity',
          priority: 2,
          title: 'Weekend Consistency Opportunity',
          titleRu: 'Выходные — шанс закрепить режим!',
          message: 'Maintain your wake time on weekends',
          messageRu: `Сегодня выходной, но постарайся проснуться около ${avgWakeTime}. Стабильный режим — ключ к хорошему сну!`,
          action: {
            type: 'reminder',
            text: 'Напоминание на утро',
          },
          confidence: 0.8,
          urgency: 'today',
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
        };
      }
    }

    return null;
  }

  private async generatePersonalizedTip(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IProactiveInsight | null> {
    if (sleepHistory.length < 7) return null;

    const now = new Date();

    // Analyze recent patterns
    const recentHistory = sleepHistory.slice(-7);
    const avgSOL = this.calculateAverageSOL(recentHistory);
    const avgWASO = this.calculateAverageWASO(recentHistory);
    const avgSE = this.calculateAverageSE(recentHistory);

    // Generate tip based on biggest issue
    if (avgSOL > 30) {
      return {
        id: `tip-sol-${userId}-${now.getTime()}`,
        type: 'tip',
        priority: 3,
        title: 'Sleep Onset Tip',
        titleRu: 'Совет: время засыпания',
        message: 'Your sleep onset latency is high',
        messageRu: `Ты засыпаешь в среднем за ${avgSOL.toFixed(0)} минут. Попробуй технику 4-7-8 дыхания или PMR перед сном — это может сократить время засыпания.`,
        action: {
          type: 'command',
          command: '/relax',
          text: 'Техники релаксации',
        },
        confidence: 0.75,
        urgency: 'this_week',
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      };
    }

    if (avgWASO > 30) {
      return {
        id: `tip-waso-${userId}-${now.getTime()}`,
        type: 'tip',
        priority: 3,
        title: 'Night Awakening Tip',
        titleRu: 'Совет: ночные пробуждения',
        message: 'Your WASO is elevated',
        messageRu: `Ты проводишь в среднем ${avgWASO.toFixed(0)} минут без сна ночью. Если не можешь заснуть 15+ минут — выйди из кровати и займись чем-то спокойным.`,
        action: {
          type: 'command',
          command: '/therapy',
          text: 'Подробнее о правилах',
        },
        confidence: 0.75,
        urgency: 'this_week',
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      };
    }

    return null;
  }

  private async checkPredictions(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IProactiveInsight | null> {
    if (sleepHistory.length < 7) return null;

    const now = new Date();

    try {
      const prediction = await sleepPredictionService.predict(userId, 'medium');

      if (prediction && prediction.deteriorationRisk > 0.5) {
        return {
          id: `risk-prediction-${userId}-${now.getTime()}`,
          type: 'risk_alert',
          priority: 1,
          title: 'Predicted Sleep Decline',
          titleRu: 'Прогноз: возможное ухудшение',
          message: 'Model predicts potential sleep deterioration',
          messageRu: `Модель предсказывает возможное ухудшение сна в ближайшие дни (риск ${(prediction.deteriorationRisk * 100).toFixed(0)}%). Рекомендуется усилить соблюдение режима.`,
          action: {
            type: 'command',
            command: '/predict',
            text: 'Подробный прогноз',
          },
          confidence: prediction.predictedSleepEfficiency.confidence,
          urgency: 'immediate',
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        };
      }

      if (prediction && prediction.trend === 'improving') {
        return {
          id: `trend-improving-${userId}-${now.getTime()}`,
          type: 'opportunity',
          priority: 3,
          title: 'Positive Trend Detected',
          titleRu: 'Тренд улучшения!',
          message: 'Your sleep is trending upward',
          messageRu: 'Модель видит устойчивый тренд улучшения. Продолжай следовать программе — результаты уже заметны!',
          confidence: prediction.predictedSleepEfficiency.confidence,
          urgency: 'this_week',
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        };
      }
    } catch {
      // Prediction failed, skip this insight
    }

    return null;
  }

  private async detectPatternChanges(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IPatternAlert[]> {
    const alerts: IPatternAlert[] = [];

    if (sleepHistory.length < 14) return alerts;

    const recentWeek = sleepHistory.slice(-7);
    const previousWeek = sleepHistory.slice(-14, -7);

    // Compare SE
    const recentSE = this.calculateAverageSE(recentWeek);
    const previousSE = this.calculateAverageSE(previousWeek);
    const seChange = recentSE - previousSE;

    if (Math.abs(seChange) >= this.config.patternChangeThreshold) {
      alerts.push({
        type: seChange > 0 ? 'improvement' : 'deterioration',
        metric: 'sleepEfficiency',
        previous: previousSE,
        current: recentSE,
        changeMagnitude: Math.abs(seChange),
        significance: Math.min(1, Math.abs(seChange) / 0.2),
        descriptionRu: seChange > 0
          ? `Эффективность сна улучшилась на ${(seChange * 100).toFixed(0)}%`
          : `Эффективность сна снизилась на ${(Math.abs(seChange) * 100).toFixed(0)}%`,
      });
    }

    // Compare SOL
    const recentSOL = this.calculateAverageSOL(recentWeek);
    const previousSOL = this.calculateAverageSOL(previousWeek);
    const solChange = recentSOL - previousSOL;

    if (Math.abs(solChange) >= 10) { // 10 minutes threshold
      alerts.push({
        type: solChange < 0 ? 'improvement' : 'deterioration',
        metric: 'sleepOnsetLatency',
        previous: previousSOL,
        current: recentSOL,
        changeMagnitude: Math.abs(solChange),
        significance: Math.min(1, Math.abs(solChange) / 20),
        descriptionRu: solChange < 0
          ? `Время засыпания сократилось на ${Math.abs(solChange).toFixed(0)} минут`
          : `Время засыпания увеличилось на ${solChange.toFixed(0)} минут`,
      });
    }

    return alerts;
  }

  private async detectRiskAlerts(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IRiskAlert[]> {
    const alerts: IRiskAlert[] = [];

    if (sleepHistory.length < 7) return alerts;

    const recentWeek = sleepHistory.slice(-7);
    const avgSE = this.calculateAverageSE(recentWeek);

    // Check for severe sleep deterioration
    if (avgSE < 0.6) {
      alerts.push({
        type: 'sleep_deterioration',
        severity: avgSE < 0.5 ? 'high' : 'moderate',
        riskScore: 1 - avgSE,
        factors: ['low_sleep_efficiency', 'potential_treatment_non_response'],
        escalation: avgSE < 0.5 ? 'notify_admin' : 'monitor',
        messageRu: `Эффективность сна критически низкая (${(avgSE * 100).toFixed(0)}%). Рекомендуется консультация специалиста.`,
      });
    }

    // Check for treatment dropout risk
    const daysSinceLastEntry = this.daysSinceLastEntry(sleepHistory);
    if (daysSinceLastEntry >= 3) {
      alerts.push({
        type: 'treatment_dropout',
        severity: daysSinceLastEntry >= 7 ? 'high' : 'moderate',
        riskScore: Math.min(1, daysSinceLastEntry / 7),
        factors: ['missing_diary_entries', 'potential_disengagement'],
        escalation: daysSinceLastEntry >= 7 ? 'notify_admin' : 'monitor',
        messageRu: `Дневник не заполнялся ${daysSinceLastEntry} дней. Возможен риск прекращения терапии.`,
      });
    }

    return alerts;
  }

  private async findOptimalInterventionTimes(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<IOptimalTiming[]> {
    const timings: IOptimalTiming[] = [];
    const now = new Date();

    // Morning intervention (reminder to log sleep)
    const morningTime = new Date(now);
    morningTime.setHours(this.config.timing.morningWindowStart, 30, 0, 0);

    if (morningTime > now) {
      timings.push({
        time: morningTime,
        windowMinutes: 90,
        confidence: 0.85,
        reason: 'Morning reminder for sleep diary',
        factors: ['optimal_recall', 'routine_establishment'],
      });
    }

    // Evening intervention (relaxation reminder)
    const eveningTime = new Date(now);
    eveningTime.setHours(this.config.timing.eveningWindowStart, 0, 0, 0);

    if (eveningTime > now) {
      // Adjust based on user's typical bedtime
      const avgBedtime = this.calculateAverageBedtime(sleepHistory);
      if (avgBedtime) {
        eveningTime.setHours(Math.max(18, avgBedtime - 2), 0, 0, 0);
      }

      timings.push({
        time: eveningTime,
        windowMinutes: 60,
        confidence: 0.8,
        reason: 'Evening relaxation preparation',
        factors: ['pre_sleep_routine', 'wind_down_period'],
      });
    }

    return timings;
  }

  private createSummary(
    insights: IProactiveInsight[],
    patternAlerts: IPatternAlert[],
    riskAlerts: IRiskAlert[]
  ): IDailyAnalysis['summary'] {
    // Determine overall trend
    const improvements = patternAlerts.filter(a => a.type === 'improvement').length;
    const deteriorations = patternAlerts.filter(a => a.type === 'deterioration').length;

    let overallTrend: 'improving' | 'stable' | 'declining';
    if (improvements > deteriorations) {
      overallTrend = 'improving';
    } else if (deteriorations > improvements) {
      overallTrend = 'declining';
    } else {
      overallTrend = 'stable';
    }

    // Determine risk level
    const maxRisk = riskAlerts.reduce((max, a) => Math.max(max, a.riskScore), 0);
    let riskLevel: 'low' | 'moderate' | 'high';
    if (maxRisk >= 0.7) {
      riskLevel = 'high';
    } else if (maxRisk >= 0.4) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'low';
    }

    // Calculate engagement score
    const engagementScore = Math.min(1, insights.length * 0.3 + (1 - maxRisk) * 0.7);

    // Find priority action
    const priorityInsight = insights.find(i => i.urgency === 'immediate' || i.urgency === 'today');
    const priorityAction = priorityInsight?.action?.command || null;

    return {
      overallTrend,
      riskLevel,
      engagementScore,
      priorityAction,
    };
  }

  private createEmptyAnalysis(userId: string): IDailyAnalysis {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      userId,
      date: now,
      insights: [],
      patternAlerts: [],
      riskAlerts: [],
      optimalTimings: [],
      summary: {
        overallTrend: 'stable',
        riskLevel: 'low',
        engagementScore: 0.5,
        priorityAction: null,
      },
    };
  }

  // ==================== Utility Methods ====================

  private calculateAverageSE(history: ISleepState[]): number {
    if (history.length === 0) return 0;
    const values = history.map(s => s.metrics?.sleepEfficiency || 0);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateAverageSOL(history: ISleepState[]): number {
    if (history.length === 0) return 0;
    const values = history.map(s => s.metrics?.sleepOnsetLatency || 0);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateAverageWASO(history: ISleepState[]): number {
    if (history.length === 0) return 0;
    const values = history.map(s => s.metrics?.wakeAfterSleepOnset || 0);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateAverageTime(times: (Date | undefined)[]): string | null {
    const validTimes = times.filter((t): t is Date => t !== undefined);
    if (validTimes.length === 0) return null;

    const avgMinutes = validTimes
      .map(t => t.getHours() * 60 + t.getMinutes())
      .reduce((a, b) => a + b, 0) / validTimes.length;

    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.round(avgMinutes % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private calculateAverageTimeFromStrings(times: string[]): string | null {
    if (times.length === 0) return null;

    const avgMinutes = times
      .map(t => {
        const [hourStr, minStr] = t.split(':');
        return parseInt(hourStr, 10) * 60 + parseInt(minStr || '0', 10);
      })
      .reduce((a, b) => a + b, 0) / times.length;

    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.round(avgMinutes % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private calculateAverageBedtime(history: ISleepState[]): number | null {
    const bedtimes = history.slice(-7).map(s => s.metrics.bedtime).filter((t): t is string => t !== undefined);
    if (bedtimes.length === 0) return null;

    const avgHour = bedtimes
      .map(t => {
        // bedtime is a string like "23:00" or "01:30"
        const [hourStr] = t.split(':');
        let hour = parseInt(hourStr, 10);
        if (hour < 12) hour += 24; // Handle after-midnight bedtimes
        return hour;
      })
      .reduce((a, b) => a + b, 0) / bedtimes.length;

    return avgHour >= 24 ? avgHour - 24 : avgHour;
  }

  private daysSinceLastEntry(history: ISleepState[]): number {
    if (history.length === 0) return Infinity;

    const lastEntry = history[history.length - 1];
    // lastEntry.date is a string like "YYYY-MM-DD", convert to Date
    const lastDate = lastEntry.date ? new Date(lastEntry.date) : new Date();
    const now = new Date();

    const diffMs = now.getTime() - lastDate.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}

// ==================== Factory & Singleton ====================

export function createProactiveIntelligenceService(
  config?: Partial<IProactiveIntelligenceConfig>
): ProactiveIntelligenceService {
  return new ProactiveIntelligenceService(config);
}

export const proactiveIntelligenceService = createProactiveIntelligenceService();
