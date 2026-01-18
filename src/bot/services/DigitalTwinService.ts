/**
 * 🧬 DIGITAL TWIN SERVICE
 * =======================
 * Patient Digital Twin for personalized sleep modeling and simulation.
 *
 * Research Foundation (2025-2026):
 * - NASEM: Digital twin must be personalized, dynamically updated, predictive
 * - npj Digital Medicine: Twin-based expansion for strategy simulation
 * - PNAS: Critical Slowing Down for transition detection
 *
 * Architecture:
 * - Wraps SleepPredictionService (PLRNN) for trajectory prediction
 * - Implements scenario simulation via PLRNN intervention modeling
 * - Provides tipping point detection through variance analysis
 * - Maintains personalized state history for each user
 *
 * © БФ "Другой путь", 2025-2026
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import {
  sleepPredictionService,
  type ISleepPrediction,
  type ISleepEarlyWarning,
  type ISleepHistoryEntry,
} from './SleepPredictionService';

import type { ISleepMetrics } from '../../sleep/interfaces/ISleepState';
import type { SleepAction } from '../../platform/SleepCorePOMDP';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Digital Twin state for a user
 */
export interface IDigitalTwin {
  /** User ID */
  readonly userId: string;

  /** Twin creation timestamp */
  readonly createdAt: Date;

  /** Last update timestamp */
  readonly lastUpdatedAt: Date;

  /** Number of observations used to train twin */
  readonly observationCount: number;

  /** Current state quality (0-1) */
  readonly stateQuality: number;

  /** Whether twin has sufficient data for predictions */
  readonly isReady: boolean;

  /** Current sleep metrics snapshot */
  readonly currentMetrics: ISleepMetrics | null;

  /** Current trend */
  readonly trend: 'improving' | 'stable' | 'declining' | 'critical';

  /** Risk level */
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

/**
 * Trajectory prediction result
 */
export interface ITrajectory {
  /** User ID */
  readonly userId: string;

  /** Prediction horizon in days */
  readonly horizonDays: number;

  /** Daily predictions */
  readonly dailyPredictions: Array<{
    readonly date: Date;
    readonly sleepEfficiency: number;
    readonly confidence: number;
    readonly trend: 'up' | 'down' | 'stable';
  }>;

  /** Overall trend */
  readonly overallTrend: 'improving' | 'stable' | 'declining' | 'critical';

  /** Predicted final sleep efficiency */
  readonly predictedFinalSE: number;

  /** Confidence in prediction (0-1) */
  readonly confidence: number;
}

/**
 * Tipping point detection result
 * Based on Critical Slowing Down (CSD) theory
 */
export interface ITippingPoint {
  /** Type of potential transition */
  readonly type: 'improvement' | 'deterioration' | 'relapse';

  /** Probability of transition (0-1) */
  readonly probability: number;

  /** Estimated days until transition */
  readonly estimatedDays: number | null;

  /** Severity if deterioration */
  readonly severity: 'low' | 'moderate' | 'high' | 'critical';

  /** Warning indicators detected */
  readonly indicators: Array<{
    readonly name: string;
    readonly nameRu: string;
    readonly value: number;
    readonly threshold: number;
    readonly status: 'normal' | 'warning' | 'critical';
  }>;

  /** Recommendation */
  readonly recommendation: string;
  readonly recommendationRu: string;
}

/**
 * Scenario definition for simulation
 */
export interface IScenario {
  /** Scenario name */
  readonly name: string;

  /** Scenario description */
  readonly description: string;

  /** Intervention to simulate */
  readonly intervention: SleepAction;

  /** Duration in days */
  readonly durationDays: number;

  /** Adherence level (0-1) */
  readonly adherenceLevel: number;
}

/**
 * Simulation result
 */
export interface ISimulationResult {
  /** Scenario simulated */
  readonly scenario: IScenario;

  /** Predicted outcome */
  readonly predictedOutcome: {
    readonly sleepEfficiency: number;
    readonly sleepEfficiencyChange: number;
    readonly trend: 'improving' | 'stable' | 'declining';
  };

  /** Confidence in simulation (0-1) */
  readonly confidence: number;

  /** Key factors affecting outcome */
  readonly keyFactors: string[];

  /** Recommendations based on simulation */
  readonly recommendations: string[];
}

/**
 * Scenario comparison result
 */
export interface IComparisonResult {
  /** Scenarios compared */
  readonly scenarios: IScenario[];

  /** Results for each scenario */
  readonly results: ISimulationResult[];

  /** Best scenario recommendation */
  readonly bestScenario: IScenario;

  /** Explanation for recommendation */
  readonly explanation: string;
  readonly explanationRu: string;
}

// ============================================================================
// DIGITAL TWIN SERVICE
// ============================================================================

/**
 * Digital Twin Service
 * Provides patient simulation and prediction capabilities
 */
export class DigitalTwinService {
  private twins: Map<string, IDigitalTwin> = new Map();

  // ==========================================================================
  // TWIN LIFECYCLE
  // ==========================================================================

  /**
   * Create or get digital twin for user
   */
  async createTwin(userId: string): Promise<IDigitalTwin> {
    // Check if twin already exists
    const existingTwin = this.twins.get(userId);
    if (existingTwin) {
      return existingTwin;
    }

    // Get history from prediction service
    const history = sleepPredictionService.getHistory(userId);
    const currentState = sleepPredictionService.getCurrentState(userId);

    // Calculate state quality based on data availability
    const stateQuality = this.calculateStateQuality(history.length);

    // Get current metrics from latest history entry
    const currentMetrics = history.length > 0
      ? history[history.length - 1].metrics
      : null;

    // Determine trend from prediction
    const prediction = sleepPredictionService.predict(userId, 'short');
    const trend = prediction?.trend ?? 'stable';
    const riskLevel = this.getRiskLevel(prediction?.deteriorationRisk ?? 0);

    const twin: IDigitalTwin = {
      userId,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      observationCount: history.length,
      stateQuality,
      isReady: history.length >= 3,
      currentMetrics,
      trend,
      riskLevel,
    };

    this.twins.set(userId, twin);
    return twin;
  }

  /**
   * Update twin with new observation
   */
  async updateTwin(
    userId: string,
    metrics: ISleepMetrics,
    subjectiveQuality: number = 0.5
  ): Promise<IDigitalTwin> {
    // Add entry to prediction service
    const entry: ISleepHistoryEntry = {
      userId,
      date: new Date(),
      metrics,
      subjectiveQuality,
    };

    sleepPredictionService.addSleepEntry(entry);

    // Recreate twin with updated data
    this.twins.delete(userId);
    return this.createTwin(userId);
  }

  /**
   * Get existing twin
   */
  getTwin(userId: string): IDigitalTwin | null {
    return this.twins.get(userId) ?? null;
  }

  // ==========================================================================
  // TRAJECTORY PREDICTION
  // ==========================================================================

  /**
   * Predict sleep trajectory for user
   */
  async predictTrajectory(userId: string, days: number = 7): Promise<ITrajectory | null> {
    // Ensure twin exists
    const twin = await this.createTwin(userId);
    if (!twin.isReady) {
      return null;
    }

    // Get prediction from PLRNN
    const horizon = days <= 3 ? 'short' : days <= 5 ? 'medium' : 'long';
    const prediction = sleepPredictionService.predict(userId, horizon);

    if (!prediction) {
      return null;
    }

    // Map to trajectory format
    const dailyPredictions = prediction.sleepEfficiencyTrajectory.slice(0, days).map((point, idx) => {
      const prevSE = idx > 0
        ? prediction.sleepEfficiencyTrajectory[idx - 1].predicted
        : twin.currentMetrics?.sleepEfficiency ?? point.predicted;

      const change = point.predicted - prevSE;
      const trend: 'up' | 'down' | 'stable' =
        change > 2 ? 'up' : change < -2 ? 'down' : 'stable';

      return {
        date: point.date,
        sleepEfficiency: point.predicted,
        confidence: prediction.predictedSleepEfficiency.confidence,
        trend,
      };
    });

    return {
      userId,
      horizonDays: days,
      dailyPredictions,
      overallTrend: prediction.trend,
      predictedFinalSE: prediction.predictedSleepEfficiency.value,
      confidence: prediction.predictedSleepEfficiency.confidence,
    };
  }

  // ==========================================================================
  // TIPPING POINT DETECTION
  // ==========================================================================

  /**
   * Detect potential tipping points using CSD indicators
   * Based on Critical Slowing Down theory (Scheffer et al., PNAS 2014)
   */
  async detectTippingPoints(userId: string): Promise<ITippingPoint[]> {
    const twin = await this.createTwin(userId);
    if (!twin.isReady) {
      return [];
    }

    const prediction = sleepPredictionService.predict(userId, 'medium');
    if (!prediction) {
      return [];
    }

    const tippingPoints: ITippingPoint[] = [];

    // Analyze early warnings for potential transitions
    for (const warning of prediction.earlyWarnings) {
      if (warning.strength > 0.5) {
        const tippingPoint = this.warningToTippingPoint(warning, prediction);
        tippingPoints.push(tippingPoint);
      }
    }

    // Check for improvement tipping point (positive transition)
    if (prediction.trend === 'improving' && prediction.predictedSleepEfficiency.value > 85) {
      tippingPoints.push({
        type: 'improvement',
        probability: Math.min(0.9, prediction.predictedSleepEfficiency.confidence),
        estimatedDays: 7,
        severity: 'low',
        indicators: [{
          name: 'Sleep Efficiency Trend',
          nameRu: 'Тренд эффективности сна',
          value: prediction.predictedSleepEfficiency.value,
          threshold: 85,
          status: 'normal',
        }],
        recommendation: 'Continue current protocol - approaching remission',
        recommendationRu: 'Продолжайте текущий протокол — приближается ремиссия',
      });
    }

    // Check for relapse risk based on variance
    const history = sleepPredictionService.getHistory(userId);
    if (history.length >= 14) {
      const recentSE = history.slice(-7).map(h => h.metrics.sleepEfficiency);
      const variance = this.calculateVariance(recentSE);
      const historicalVariance = this.calculateVariance(
        history.slice(-14, -7).map(h => h.metrics.sleepEfficiency)
      );

      if (variance > historicalVariance * 1.5 && variance > 50) {
        tippingPoints.push({
          type: 'relapse',
          probability: Math.min(0.8, variance / 100),
          estimatedDays: null,
          severity: variance > 80 ? 'high' : 'moderate',
          indicators: [{
            name: 'Sleep Variability',
            nameRu: 'Вариабельность сна',
            value: variance,
            threshold: historicalVariance * 1.5,
            status: variance > 80 ? 'critical' : 'warning',
          }],
          recommendation: 'Increased sleep variability detected - consider intensifying adherence',
          recommendationRu: 'Повышенная нестабильность сна — рекомендуется усилить приверженность',
        });
      }
    }

    return tippingPoints;
  }

  // ==========================================================================
  // SCENARIO SIMULATION
  // ==========================================================================

  /**
   * Simulate intervention effect
   */
  async simulateIntervention(
    userId: string,
    intervention: SleepAction,
    durationDays: number = 7
  ): Promise<ISimulationResult | null> {
    const scenario: IScenario = {
      name: this.getInterventionName(intervention),
      description: this.getInterventionDescription(intervention),
      intervention,
      durationDays,
      adherenceLevel: 0.8,
    };

    return this.simulateScenario(userId, scenario);
  }

  /**
   * Simulate a scenario
   */
  async simulateScenario(
    userId: string,
    scenario: IScenario
  ): Promise<ISimulationResult | null> {
    const twin = await this.createTwin(userId);
    if (!twin.isReady || !twin.currentMetrics) {
      return null;
    }

    // Use PLRNN intervention simulation
    const simulation = sleepPredictionService.simulateIntervention(
      userId,
      'sleepEfficiency',
      this.interventionToDirection(scenario.intervention),
      scenario.adherenceLevel * 0.1 // Magnitude based on adherence
    );

    if (!simulation) {
      // Fallback to heuristic estimation
      return this.heuristicSimulation(twin, scenario);
    }

    const predictedSE = simulation.predictedOutcome.sleepEfficiency * 100;
    const currentSE = twin.currentMetrics.sleepEfficiency;
    const change = predictedSE - currentSE;

    return {
      scenario,
      predictedOutcome: {
        sleepEfficiency: Math.round(predictedSE),
        sleepEfficiencyChange: Math.round(change),
        trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
      },
      confidence: simulation.confidence,
      keyFactors: this.getInterventionFactors(scenario.intervention),
      recommendations: this.getSimulationRecommendations(change, scenario),
    };
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    userId: string,
    scenarios: IScenario[]
  ): Promise<IComparisonResult | null> {
    if (scenarios.length === 0) {
      return null;
    }

    const results: ISimulationResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.simulateScenario(userId, scenario);
      if (result) {
        results.push(result);
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Find best scenario by predicted SE improvement
    const bestResult = results.reduce((best, current) =>
      current.predictedOutcome.sleepEfficiencyChange > best.predictedOutcome.sleepEfficiencyChange
        ? current
        : best
    );

    return {
      scenarios,
      results,
      bestScenario: bestResult.scenario,
      explanation: `${bestResult.scenario.name} shows the best predicted improvement (+${bestResult.predictedOutcome.sleepEfficiencyChange}% SE)`,
      explanationRu: `${bestResult.scenario.name} показывает лучший прогнозируемый результат (+${bestResult.predictedOutcome.sleepEfficiencyChange}% SE)`,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private calculateStateQuality(historyLength: number): number {
    if (historyLength === 0) return 0;
    if (historyLength < 3) return 0.3;
    if (historyLength < 7) return 0.5;
    if (historyLength < 14) return 0.7;
    if (historyLength < 30) return 0.85;
    return 0.95;
  }

  private getRiskLevel(deteriorationRisk: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (deteriorationRisk >= 0.7) return 'critical';
    if (deteriorationRisk >= 0.5) return 'high';
    if (deteriorationRisk >= 0.3) return 'moderate';
    return 'low';
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (values.length - 1);
  }

  private warningToTippingPoint(
    warning: ISleepEarlyWarning,
    prediction: ISleepPrediction
  ): ITippingPoint {
    return {
      type: 'deterioration',
      probability: warning.strength,
      estimatedDays: warning.estimatedDaysToCritical,
      severity: warning.severity,
      indicators: [{
        name: warning.metric,
        nameRu: this.translateMetric(warning.metric),
        value: warning.strength * 100,
        threshold: 50,
        status: warning.severity === 'critical' ? 'critical' :
                warning.severity === 'high' ? 'warning' : 'normal',
      }],
      recommendation: warning.recommendation,
      recommendationRu: warning.messageRu,
    };
  }

  private translateMetric(metric: string): string {
    const translations: Record<string, string> = {
      'sleepEfficiency': 'Эффективность сна',
      'sleepOnsetLatency': 'Время засыпания',
      'wakeAfterSleepOnset': 'Пробуждения ночью',
      'totalSleepTime': 'Общее время сна',
      'sleepQuality': 'Качество сна',
    };
    return translations[metric] ?? metric;
  }

  private getInterventionName(intervention: SleepAction): string {
    const names: Record<SleepAction, string> = {
      'adjust_sleep_window': 'Sleep Window Adjustment',
      'enforce_wake_time': 'Wake Time Enforcement',
      'leave_bed_reminder': 'Leave Bed Reminder',
      'bed_restriction': 'Bed Restriction',
      'challenge_belief': 'Cognitive Challenge',
      'behavioral_experiment': 'Behavioral Experiment',
      'caffeine_education': 'Caffeine Education',
      'environment_advice': 'Environment Optimization',
      'relaxation_pmr': 'Progressive Muscle Relaxation',
      'relaxation_breathing': 'Breathing Exercises',
      'relaxation_imagery': 'Guided Imagery',
      'no_intervention': 'No Change',
    };
    return names[intervention] ?? intervention;
  }

  private getInterventionDescription(intervention: SleepAction): string {
    const descriptions: Record<SleepAction, string> = {
      'adjust_sleep_window': 'Adjust sleep and wake times to optimize sleep efficiency',
      'enforce_wake_time': 'Maintain consistent wake time regardless of sleep quality',
      'leave_bed_reminder': 'Leave bed if unable to sleep within 20 minutes',
      'bed_restriction': 'Restrict time in bed to actual sleep time',
      'challenge_belief': 'Challenge unhelpful beliefs about sleep',
      'behavioral_experiment': 'Test assumptions about sleep through experiments',
      'caffeine_education': 'Reduce caffeine consumption, especially after noon',
      'environment_advice': 'Optimize bedroom environment for sleep',
      'relaxation_pmr': 'Practice progressive muscle relaxation before bed',
      'relaxation_breathing': 'Use breathing exercises to reduce arousal',
      'relaxation_imagery': 'Use guided imagery for relaxation',
      'no_intervention': 'Continue current approach',
    };
    return descriptions[intervention] ?? 'Unknown intervention';
  }

  private interventionToDirection(intervention: SleepAction): 'increase' | 'decrease' | 'stabilize' {
    const directions: Record<SleepAction, 'increase' | 'decrease' | 'stabilize'> = {
      'adjust_sleep_window': 'increase',
      'enforce_wake_time': 'stabilize',
      'leave_bed_reminder': 'increase',
      'bed_restriction': 'increase',
      'challenge_belief': 'increase',
      'behavioral_experiment': 'increase',
      'caffeine_education': 'increase',
      'environment_advice': 'increase',
      'relaxation_pmr': 'increase',
      'relaxation_breathing': 'increase',
      'relaxation_imagery': 'increase',
      'no_intervention': 'stabilize',
    };
    return directions[intervention] ?? 'stabilize';
  }

  private getInterventionFactors(intervention: SleepAction): string[] {
    const factors: Record<SleepAction, string[]> = {
      'adjust_sleep_window': ['Time in bed', 'Sleep pressure', 'Circadian alignment'],
      'enforce_wake_time': ['Circadian rhythm', 'Sleep drive consistency'],
      'leave_bed_reminder': ['Bed-sleep association', 'Conditioned arousal'],
      'bed_restriction': ['Sleep efficiency', 'Time in bed ratio'],
      'challenge_belief': ['Cognitive distortions', 'Sleep-related anxiety'],
      'behavioral_experiment': ['Belief flexibility', 'Evidence gathering'],
      'caffeine_education': ['Caffeine half-life', 'Adenosine receptors'],
      'environment_advice': ['Light exposure', 'Temperature', 'Noise'],
      'relaxation_pmr': ['Muscle tension', 'Physiological arousal'],
      'relaxation_breathing': ['Autonomic balance', 'Heart rate variability'],
      'relaxation_imagery': ['Cognitive arousal', 'Pre-sleep worry'],
      'no_intervention': ['Current stability'],
    };
    return factors[intervention] ?? ['Unknown factors'];
  }

  private getSimulationRecommendations(change: number, scenario: IScenario): string[] {
    const recommendations: string[] = [];

    if (change > 10) {
      recommendations.push(`${scenario.name} shows strong potential - consider prioritizing`);
    } else if (change > 5) {
      recommendations.push(`${scenario.name} shows moderate improvement potential`);
    } else if (change > 0) {
      recommendations.push(`${scenario.name} may provide slight benefit`);
    } else if (change < -5) {
      recommendations.push(`${scenario.name} may not be suitable at this time`);
    }

    if (scenario.adherenceLevel < 0.7) {
      recommendations.push('Improving adherence could enhance outcomes');
    }

    return recommendations;
  }

  private heuristicSimulation(twin: IDigitalTwin, scenario: IScenario): ISimulationResult {
    // Fallback heuristic when PLRNN simulation unavailable
    const currentSE = twin.currentMetrics?.sleepEfficiency ?? 75;

    // Base improvement estimate by intervention type
    const improvementRates: Record<SleepAction, number> = {
      'adjust_sleep_window': 8,
      'enforce_wake_time': 5,
      'leave_bed_reminder': 4,
      'bed_restriction': 10,
      'challenge_belief': 3,
      'behavioral_experiment': 4,
      'caffeine_education': 2,
      'environment_advice': 2,
      'relaxation_pmr': 3,
      'relaxation_breathing': 2,
      'relaxation_imagery': 2,
      'no_intervention': 0,
    };

    const baseImprovement = improvementRates[scenario.intervention] ?? 0;
    const adjustedImprovement = baseImprovement * scenario.adherenceLevel;
    const predictedSE = Math.min(95, currentSE + adjustedImprovement);

    return {
      scenario,
      predictedOutcome: {
        sleepEfficiency: Math.round(predictedSE),
        sleepEfficiencyChange: Math.round(adjustedImprovement),
        trend: adjustedImprovement > 5 ? 'improving' : adjustedImprovement > 0 ? 'stable' : 'declining',
      },
      confidence: 0.5, // Lower confidence for heuristic
      keyFactors: this.getInterventionFactors(scenario.intervention),
      recommendations: this.getSimulationRecommendations(adjustedImprovement, scenario),
    };
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get service statistics
   */
  getStats(): {
    activeTwins: number;
    averageObservations: number;
    readyTwins: number;
  } {
    let totalObservations = 0;
    let readyCount = 0;

    for (const twin of this.twins.values()) {
      totalObservations += twin.observationCount;
      if (twin.isReady) readyCount++;
    }

    return {
      activeTwins: this.twins.size,
      averageObservations: this.twins.size > 0 ? totalObservations / this.twins.size : 0,
      readyTwins: readyCount,
    };
  }
}

// ============================================================================
// FACTORY & EXPORTS
// ============================================================================

/**
 * Create digital twin service
 */
export function createDigitalTwinService(): DigitalTwinService {
  return new DigitalTwinService();
}

/**
 * Singleton instance
 */
export const digitalTwinService = createDigitalTwinService();
