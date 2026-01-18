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

// ==================== Critical Slowing Down (CSD) ====================
// Research basis: Smit et al. 2025 - EWS preceded recurrence in 32.9% of participants
// Method: Track autocorrelation (AR1) and variance in moving windows

/**
 * Critical Slowing Down indicators for early warning
 * Based on dynamical systems theory (PNAS, Clinical Psychological Science 2025)
 */
export interface ICriticalSlowingDown {
  /** Autocorrelation coefficient (AR1) - increasing = slowing down */
  autocorrelation: number;

  /** Rolling variance - increasing = destabilization */
  variance: number;

  /** Rate of change in autocorrelation */
  autocorrelationTrend: number;

  /** Rate of change in variance */
  varianceTrend: number;

  /** Combined CSD indicator (0-1) */
  csdIndex: number;

  /** Whether early warning threshold exceeded */
  isWarning: boolean;

  /** Estimated days to transition (null if not detectable) */
  estimatedDaysToTransition: number | null;
}

/**
 * Thompson Sampling state for personalized message selection
 * Research basis: DIAMANTE trial 2024, IntelligentPooling (PMC 8494236)
 */
export interface IThompsonSamplingState {
  /** Insight type */
  insightType: IProactiveInsight['type'];

  /** Number of times shown (α + β in Beta distribution) */
  impressions: number;

  /** Number of positive engagements (α in Beta distribution) */
  engagements: number;

  /** Sampled probability (for current decision) */
  sampledProbability?: number;
}

/**
 * User engagement tracking for anti-fatigue
 * Research basis: JMIR 2023 - 3.5x engagement increase with tailored timing
 */
export interface IEngagementTracking {
  /** User ID */
  userId: string;

  /** Insights delivered today */
  insightsDeliveredToday: number;

  /** Last insight delivery time */
  lastInsightTime: Date | null;

  /** Thompson Sampling states per insight type */
  thompsonStates: Map<IProactiveInsight['type'], IThompsonSamplingState>;

  /** Historical engagement by hour of day */
  hourlyEngagement: number[];

  /** Notifications user has interacted with (for learning) */
  interactionHistory: Array<{
    insightId: string;
    type: IProactiveInsight['type'];
    deliveredAt: Date;
    interactedAt: Date | null;
    interactionType: 'clicked' | 'dismissed' | 'ignored' | null;
  }>;
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

  /** Critical Slowing Down configuration */
  csd: {
    /** Window size for CSD calculation (days) */
    windowSize: number;
    /** Minimum data points for CSD */
    minDataPoints: number;
    /** Autocorrelation warning threshold */
    autocorrelationThreshold: number;
    /** Variance increase warning threshold (multiplier) */
    varianceThreshold: number;
  };

  /** Thompson Sampling configuration */
  thompsonSampling: {
    /** Enable Thompson Sampling for message selection */
    enabled: boolean;
    /** Initial alpha (prior successes) */
    priorAlpha: number;
    /** Initial beta (prior failures) */
    priorBeta: number;
    /** Exploration bonus for new insight types */
    explorationBonus: number;
  };

  /** Anti-fatigue configuration */
  antiFatigue: {
    /** Minimum hours between insights */
    minHoursBetweenInsights: number;
    /** Maximum insights per week */
    maxInsightsPerWeek: number;
    /** Cool-down after ignored insight (hours) */
    cooldownAfterIgnore: number;
  };
}

export const DEFAULT_PROACTIVE_CONFIG: IProactiveIntelligenceConfig = {
  enabled: true,
  minDataDays: 3,
  maxInsightsPerDay: 3, // Research: alert fatigue starts at 3+ (PMC 5466696)
  patternChangeThreshold: 0.15, // 15% change triggers alert
  riskEscalationThreshold: 0.6,
  timing: {
    morningWindowStart: 7,
    morningWindowEnd: 9,
    eveningWindowStart: 19, // Research: 17:00-20:00 golden hour (JMIR 2023)
    eveningWindowEnd: 21,
  },
  csd: {
    windowSize: 7, // 7-day rolling window
    minDataPoints: 14, // Research: need 14+ days for CSD (Smit et al. 2025)
    autocorrelationThreshold: 0.7, // High AR1 = slowing down
    varianceThreshold: 1.5, // 50% variance increase = warning
  },
  thompsonSampling: {
    enabled: true,
    priorAlpha: 1, // Uniform prior
    priorBeta: 1,
    explorationBonus: 0.1,
  },
  antiFatigue: {
    minHoursBetweenInsights: 4, // At least 4 hours between proactive messages
    maxInsightsPerWeek: 14, // ~2 per day average
    cooldownAfterIgnore: 24, // 24 hours cooldown if user ignores
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

  // ==================== Critical Slowing Down (EWS) ====================
  // Research: Smit et al. 2025 - EWS preceded recurrence in 32.9% of participants
  // Method: Track autocorrelation (AR1) and variance in moving windows

  /**
   * Calculate Critical Slowing Down indicators for early warning
   * Based on dynamical systems theory (Scheffer et al., van de Leemput et al.)
   *
   * @param sleepHistory - Sleep state history (needs 14+ days)
   * @param metric - Which metric to analyze (default: sleepEfficiency)
   * @returns CSD indicators or null if insufficient data
   */
  calculateCriticalSlowingDown(
    sleepHistory: ISleepState[],
    metric: 'sleepEfficiency' | 'sleepOnsetLatency' | 'wakeAfterSleepOnset' = 'sleepEfficiency'
  ): ICriticalSlowingDown | null {
    const { csd } = this.config;

    // Need minimum data points
    if (sleepHistory.length < csd.minDataPoints) {
      return null;
    }

    // Extract metric values
    const values = sleepHistory.map(s => {
      switch (metric) {
        case 'sleepEfficiency':
          return s.metrics?.sleepEfficiency || 0;
        case 'sleepOnsetLatency':
          return s.metrics?.sleepOnsetLatency || 0;
        case 'wakeAfterSleepOnset':
          return s.metrics?.wakeAfterSleepOnset || 0;
      }
    });

    // Calculate rolling autocorrelation and variance
    const windowSize = csd.windowSize;
    const autocorrelations: number[] = [];
    const variances: number[] = [];

    for (let i = windowSize; i <= values.length; i++) {
      const window = values.slice(i - windowSize, i);
      autocorrelations.push(this.calculateAutocorrelation(window));
      variances.push(this.calculateVariance(window));
    }

    if (autocorrelations.length < 2) {
      return null;
    }

    // Current values
    const currentAutocorrelation = autocorrelations[autocorrelations.length - 1];
    const currentVariance = variances[variances.length - 1];

    // Calculate trends (rate of change)
    const autocorrelationTrend = this.calculateTrend(autocorrelations);
    const varianceTrend = this.calculateTrend(variances);

    // Baseline variance (first window)
    const baselineVariance = variances[0];
    const varianceRatio = baselineVariance > 0 ? currentVariance / baselineVariance : 1;

    // Combined CSD index (0-1)
    // Higher = more warning signs
    const autocorrelationScore = Math.min(1, Math.max(0, currentAutocorrelation / csd.autocorrelationThreshold));
    const varianceScore = Math.min(1, Math.max(0, (varianceRatio - 1) / (csd.varianceThreshold - 1)));
    const trendScore = Math.min(1, Math.max(0, (autocorrelationTrend + varianceTrend) / 0.1));

    const csdIndex = (autocorrelationScore * 0.4 + varianceScore * 0.4 + trendScore * 0.2);

    // Warning threshold
    const isWarning = currentAutocorrelation >= csd.autocorrelationThreshold ||
                      varianceRatio >= csd.varianceThreshold ||
                      csdIndex >= 0.7;

    // Estimate days to transition (if trend is positive)
    let estimatedDaysToTransition: number | null = null;
    if (autocorrelationTrend > 0.01 && currentAutocorrelation < 1) {
      // Linear extrapolation to AR1 = 1 (critical point)
      const daysToAR1 = (1 - currentAutocorrelation) / autocorrelationTrend;
      if (daysToAR1 > 0 && daysToAR1 < 30) {
        estimatedDaysToTransition = Math.round(daysToAR1);
      }
    }

    return {
      autocorrelation: currentAutocorrelation,
      variance: currentVariance,
      autocorrelationTrend,
      varianceTrend,
      csdIndex,
      isWarning,
      estimatedDaysToTransition,
    };
  }

  /**
   * Calculate lag-1 autocorrelation (AR1) for a time series
   */
  private calculateAutocorrelation(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - 1; i++) {
      numerator += (values[i] - mean) * (values[i + 1] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += (values[i] - mean) ** 2;
    }

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Calculate variance of a time series
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const squaredDiffs = values.map(v => (v - mean) ** 2);

    return squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
  }

  /**
   * Calculate linear trend (slope) of a time series
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  // ==================== Thompson Sampling ====================
  // Research: DIAMANTE trial 2024, IntelligentPooling (PMC 8494236)

  /** User engagement tracking storage */
  private engagementTracking: Map<string, IEngagementTracking> = new Map();

  /**
   * Get or create engagement tracking for user
   */
  getEngagementTracking(userId: string): IEngagementTracking {
    let tracking = this.engagementTracking.get(userId);

    if (!tracking) {
      // Initialize with default Thompson Sampling states
      const thompsonStates = new Map<IProactiveInsight['type'], IThompsonSamplingState>();
      const insightTypes: IProactiveInsight['type'][] = ['pattern_change', 'risk_alert', 'opportunity', 'milestone', 'tip'];

      for (const type of insightTypes) {
        thompsonStates.set(type, {
          insightType: type,
          impressions: this.config.thompsonSampling.priorAlpha + this.config.thompsonSampling.priorBeta,
          engagements: this.config.thompsonSampling.priorAlpha,
        });
      }

      tracking = {
        userId,
        insightsDeliveredToday: 0,
        lastInsightTime: null,
        thompsonStates,
        hourlyEngagement: new Array(24).fill(0),
        interactionHistory: [],
      };

      this.engagementTracking.set(userId, tracking);
    }

    return tracking;
  }

  /**
   * Sample insight type using Thompson Sampling
   * Returns the insight type with highest sampled probability
   */
  sampleInsightTypeThompson(userId: string, availableTypes: IProactiveInsight['type'][]): IProactiveInsight['type'] {
    if (!this.config.thompsonSampling.enabled || availableTypes.length === 0) {
      return availableTypes[0] || 'tip';
    }

    const tracking = this.getEngagementTracking(userId);
    let bestType = availableTypes[0];
    let bestSample = -1;

    for (const type of availableTypes) {
      const state = tracking.thompsonStates.get(type);
      if (!state) continue;

      // Sample from Beta distribution
      // Using approximation: Beta(α, β) ≈ α / (α + β) + noise
      const alpha = state.engagements + this.config.thompsonSampling.priorAlpha;
      const beta = (state.impressions - state.engagements) + this.config.thompsonSampling.priorBeta;

      // Thompson Sampling: sample from Beta(alpha, beta)
      const sample = this.sampleBeta(alpha, beta);

      // Add exploration bonus for under-sampled types
      const explorationBonus = state.impressions < 10
        ? this.config.thompsonSampling.explorationBonus * (10 - state.impressions) / 10
        : 0;

      const adjustedSample = sample + explorationBonus;

      if (adjustedSample > bestSample) {
        bestSample = adjustedSample;
        bestType = type;
      }

      // Store sampled probability for debugging
      state.sampledProbability = sample;
    }

    return bestType;
  }

  /**
   * Sample from Beta distribution using Jöhnk's algorithm
   */
  private sampleBeta(alpha: number, beta: number): number {
    // For simplicity, use approximation for small alpha/beta
    // Real implementation would use gamma function sampling

    if (alpha <= 0 || beta <= 0) return 0.5;

    // Simple approximation using uniform samples
    // More accurate: use jStat or similar library
    const samples = 10;
    let sum = 0;

    for (let i = 0; i < samples; i++) {
      // Generate approximate beta sample using ratio of gammas
      // Simplified: use mean + noise
      const mean = alpha / (alpha + beta);
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
      const noise = (Math.random() - 0.5) * 2 * Math.sqrt(variance);
      sum += Math.max(0, Math.min(1, mean + noise));
    }

    return sum / samples;
  }

  /**
   * Record user interaction with an insight
   */
  recordInsightInteraction(
    userId: string,
    insightId: string,
    insightType: IProactiveInsight['type'],
    interactionType: 'clicked' | 'dismissed' | 'ignored'
  ): void {
    const tracking = this.getEngagementTracking(userId);

    // Update Thompson Sampling state
    const state = tracking.thompsonStates.get(insightType);
    if (state) {
      state.impressions++;
      if (interactionType === 'clicked') {
        state.engagements++;
      }
    }

    // Update hourly engagement
    const hour = new Date().getHours();
    if (interactionType === 'clicked') {
      tracking.hourlyEngagement[hour]++;
    }

    // Add to interaction history
    tracking.interactionHistory.push({
      insightId,
      type: insightType,
      deliveredAt: new Date(),
      interactedAt: interactionType !== 'ignored' ? new Date() : null,
      interactionType,
    });

    // Keep only last 100 interactions
    if (tracking.interactionHistory.length > 100) {
      tracking.interactionHistory = tracking.interactionHistory.slice(-100);
    }
  }

  /**
   * Check if anti-fatigue allows sending insight now
   */
  canSendInsight(userId: string): { allowed: boolean; reason?: string } {
    const tracking = this.getEngagementTracking(userId);
    const now = new Date();
    const { antiFatigue } = this.config;

    // Check max per day
    if (tracking.insightsDeliveredToday >= this.config.maxInsightsPerDay) {
      return { allowed: false, reason: 'max_daily_limit' };
    }

    // Check minimum time between insights
    if (tracking.lastInsightTime) {
      const hoursSinceLast = (now.getTime() - tracking.lastInsightTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < antiFatigue.minHoursBetweenInsights) {
        return { allowed: false, reason: 'too_soon' };
      }
    }

    // Check cooldown after ignored insights
    const recentIgnored = tracking.interactionHistory
      .filter(h => h.interactionType === 'ignored')
      .filter(h => {
        const hoursSince = (now.getTime() - h.deliveredAt.getTime()) / (1000 * 60 * 60);
        return hoursSince < antiFatigue.cooldownAfterIgnore;
      });

    if (recentIgnored.length > 0) {
      return { allowed: false, reason: 'cooldown_after_ignore' };
    }

    return { allowed: true };
  }

  /**
   * Mark insight as delivered (for anti-fatigue tracking)
   */
  markInsightSent(userId: string, insightId: string): void {
    const tracking = this.getEngagementTracking(userId);
    tracking.insightsDeliveredToday++;
    tracking.lastInsightTime = new Date();
  }

  /**
   * Reset daily counters (call at midnight)
   */
  resetDailyCounters(): void {
    for (const tracking of this.engagementTracking.values()) {
      tracking.insightsDeliveredToday = 0;
    }
  }

  /**
   * Get optimal hour for sending insights to user
   * Based on historical engagement data
   */
  getOptimalInsightHour(userId: string): number {
    const tracking = this.getEngagementTracking(userId);

    // Find hour with highest engagement
    let bestHour = 19; // Default: evening (research shows 17:00-20:00 is golden hour)
    let bestEngagement = -1;

    for (let hour = 0; hour < 24; hour++) {
      if (tracking.hourlyEngagement[hour] > bestEngagement) {
        bestEngagement = tracking.hourlyEngagement[hour];
        bestHour = hour;
      }
    }

    // If no data, use research-backed default (evening)
    if (bestEngagement === 0) {
      return 19;
    }

    return bestHour;
  }

  // ==================== Enhanced Risk Detection with CSD ====================

  /**
   * Detect risk alerts with Critical Slowing Down indicators
   * Enhanced version that incorporates EWS
   */
  async detectRiskAlertsWithCSD(
    userId: string,
    sleepHistory: ISleepState[]
  ): Promise<{ alerts: IRiskAlert[]; csd: ICriticalSlowingDown | null }> {
    const alerts = await this.detectRiskAlerts(userId, sleepHistory);
    const csd = this.calculateCriticalSlowingDown(sleepHistory);

    // Add CSD-based alert if warning
    if (csd?.isWarning) {
      const severity: IRiskAlert['severity'] = csd.csdIndex >= 0.8 ? 'high' : 'moderate';
      const escalation: IRiskAlert['escalation'] = csd.csdIndex >= 0.8 ? 'notify_admin' : 'monitor';

      const csdAlert: IRiskAlert = {
        type: 'sleep_deterioration',
        severity,
        riskScore: csd.csdIndex,
        factors: [
          `high_autocorrelation_${csd.autocorrelation.toFixed(2)}`,
          `variance_increase_${((csd.variance / this.calculateVariance(sleepHistory.slice(0, 7).map(s => s.metrics?.sleepEfficiency || 0)) - 1) * 100).toFixed(0)}%`,
          csd.estimatedDaysToTransition ? `estimated_transition_${csd.estimatedDaysToTransition}_days` : 'trend_increasing',
        ],
        escalation,
        messageRu: csd.estimatedDaysToTransition
          ? `⚠️ Ранние сигналы предупреждения: система обнаружила признаки нестабильности сна. Возможный переход к ухудшению через ${csd.estimatedDaysToTransition} дней.`
          : `⚠️ Ранние сигналы предупреждения: повышенная нестабильность показателей сна. Рекомендуется усилить соблюдение режима.`,
      };

      // Insert CSD alert at the beginning (high priority)
      alerts.unshift(csdAlert);
    }

    return { alerts, csd };
  }
}

// ==================== Factory & Singleton ====================

export function createProactiveIntelligenceService(
  config?: Partial<IProactiveIntelligenceConfig>
): ProactiveIntelligenceService {
  return new ProactiveIntelligenceService(config);
}

export const proactiveIntelligenceService = createProactiveIntelligenceService();
