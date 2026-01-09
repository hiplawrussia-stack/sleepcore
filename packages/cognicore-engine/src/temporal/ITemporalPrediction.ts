/**
 * ⏰ TEMPORAL PREDICTION INTERFACES
 * ==================================
 * Temporal Echo Engine - State Forecasting System
 *
 * Scientific Foundation (2024-2025 Research):
 * - Kalman Filter for mood dynamics (Applied Comp. Psychiatry Lab, 2024)
 * - JITAI frameworks for vulnerability windows (Frontiers Digital Health, 2025)
 * - Nonlinear state-space models (medRxiv, 2025)
 * - Transformer-based emotion forecasting (JMIR, 2025)
 * - EMA + passive sensing prediction (JMIR, 2025)
 *
 * Prediction Horizons:
 * - 6h: Immediate intervention window
 * - 12h: Short-term planning
 * - 24h: Daily rhythm prediction
 * - 72h: Multi-day trajectory
 * - 1w: Weekly pattern analysis
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import type { IStateVector } from '../state/interfaces/IStateVector';
import type { RiskLevel } from '../state/interfaces/IRiskState';
import type { EmotionType } from '../state/interfaces/IEmotionalState';

/**
 * Prediction time horizons
 * Based on JITAI research optimal intervention windows
 */
export type PredictionHorizon = '6h' | '12h' | '24h' | '72h' | '1w';

/**
 * Confidence level for predictions
 */
export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * Trend direction
 */
export type TrendDirection = 'improving' | 'stable' | 'declining' | 'volatile' | 'unknown';

/**
 * Phase transition types (nonlinear dynamics)
 * Based on medRxiv 2025 research on psychological phase transitions
 */
export type PhaseTransition =
  | 'none'                    // Stable state
  | 'crisis_approaching'      // Moving toward crisis
  | 'recovery_beginning'      // Starting to improve
  | 'relapse_warning'         // Risk of returning to worse state
  | 'breakthrough_imminent'   // Positive shift approaching
  | 'mood_shift'             // Significant mood change
  | 'stability_achieved';     // Entering stable period

/**
 * Vulnerability window (JITAI concept)
 * Optimal time for intervention delivery
 */
export interface VulnerabilityWindow {
  readonly id: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly type: 'high_risk' | 'receptive' | 'opportunity' | 'critical';
  readonly confidence: number;         // 0.0 - 1.0
  readonly predictedState: {
    readonly riskLevel: RiskLevel;
    readonly emotionalValence: number; // -1 to +1
    readonly cognitiveLoad: number;    // 0 to 1
  };
  readonly recommendedInterventionTypes: string[];
  readonly triggerFactors: string[];
}

/**
 * Temporal pattern detected in data
 */
export interface TemporalPattern {
  readonly id: string;
  readonly name: string;
  readonly type: 'circadian' | 'weekly' | 'monthly' | 'seasonal' | 'event_triggered' | 'random';
  readonly description: string;
  readonly confidence: number;
  readonly period?: number;           // Period in hours (for cyclic patterns)
  readonly peakTimes?: string[];      // Times of day when pattern peaks
  readonly associatedFactors: string[];
  readonly therapeuticImplications: string[];
}

/**
 * Single prediction point
 */
export interface PredictionPoint {
  readonly timestamp: Date;
  readonly horizon: PredictionHorizon;

  /**
   * Predicted values (0.0 - 1.0 normalized)
   */
  readonly predicted: {
    readonly wellbeingIndex: number;
    readonly riskLevel: RiskLevel;
    readonly emotionalValence: number;   // -1 to +1
    readonly emotionalArousal: number;   // -1 to +1
    readonly cognitiveLoad: number;      // 0 to 1
    readonly resourceAvailability: number; // 0 to 1
  };

  /**
   * Confidence interval (95%)
   */
  readonly confidenceInterval: {
    readonly lower: number;
    readonly upper: number;
  };

  /**
   * Overall prediction confidence
   */
  readonly confidence: number;

  /**
   * Factors contributing to prediction
   */
  readonly contributingFactors: Array<{
    readonly factor: string;
    readonly weight: number;
    readonly direction: 'positive' | 'negative' | 'neutral';
  }>;
}

/**
 * State trajectory (sequence of predictions)
 */
export interface StateTrajectory {
  readonly userId: string | number;
  readonly generatedAt: Date;
  readonly basedOnState: string;       // StateVector ID

  /**
   * Prediction points for each horizon
   */
  readonly predictions: Map<PredictionHorizon, PredictionPoint>;

  /**
   * Overall trend
   */
  readonly overallTrend: TrendDirection;

  /**
   * Detected phase transitions
   */
  readonly phaseTransitions: Array<{
    readonly type: PhaseTransition;
    readonly predictedTime: Date;
    readonly confidence: number;
    readonly preventable: boolean;
    readonly preventionActions: string[];
  }>;

  /**
   * Vulnerability windows
   */
  readonly vulnerabilityWindows: VulnerabilityWindow[];

  /**
   * Detected temporal patterns
   */
  readonly patterns: TemporalPattern[];

  /**
   * Risk trajectory summary
   */
  readonly riskTrajectory: {
    readonly current: RiskLevel;
    readonly predicted6h: RiskLevel;
    readonly predicted24h: RiskLevel;
    readonly predicted72h: RiskLevel;
    readonly trend: TrendDirection;
    readonly peakRiskTime?: Date;
    readonly lowestRiskTime?: Date;
  };
}

/**
 * Early warning signal
 * Based on dynamical systems theory
 */
export interface EarlyWarningSignal {
  readonly id: string;
  readonly type: 'critical_slowing' | 'increased_variance' | 'increased_autocorrelation' | 'flickering';
  readonly detectedAt: Date;
  readonly strength: number;           // 0.0 - 1.0
  readonly possibleTransition: PhaseTransition;
  readonly timeToTransition?: number;  // Estimated hours
  readonly confidence: number;
  readonly description: string;
  readonly recommendedActions: string[];
}

/**
 * Circadian rhythm analysis
 */
export interface CircadianProfile {
  readonly userId: string | number;
  readonly analyzedFrom: Date;
  readonly analyzedTo: Date;

  /**
   * Hour-by-hour typical state (0-23)
   */
  readonly hourlyProfile: Array<{
    readonly hour: number;
    readonly avgWellbeing: number;
    readonly avgRisk: number;
    readonly avgEnergy: number;
    readonly variability: number;
    readonly sampleCount: number;
  }>;

  /**
   * Peak and trough times
   */
  readonly peaks: {
    readonly bestMoodTime: number;      // Hour (0-23)
    readonly worstMoodTime: number;
    readonly highestEnergyTime: number;
    readonly lowestEnergyTime: number;
  };

  /**
   * Optimal intervention times
   */
  readonly optimalInterventionWindows: Array<{
    readonly startHour: number;
    readonly endHour: number;
    readonly interventionType: string;
    readonly rationale: string;
  }>;
}

/**
 * Temporal Echo Engine Interface
 */
export interface ITemporalEchoEngine {
  /**
   * Generate state trajectory predictions
   */
  predictTrajectory(
    currentState: IStateVector,
    stateHistory: IStateVector[],
    horizons?: PredictionHorizon[]
  ): Promise<StateTrajectory>;

  /**
   * Predict single time point
   */
  predictAtHorizon(
    currentState: IStateVector,
    horizon: PredictionHorizon
  ): Promise<PredictionPoint>;

  /**
   * Detect vulnerability windows
   */
  detectVulnerabilityWindows(
    trajectory: StateTrajectory,
    options?: {
      minConfidence?: number;
      windowTypes?: VulnerabilityWindow['type'][];
    }
  ): VulnerabilityWindow[];

  /**
   * Analyze circadian patterns
   */
  analyzeCircadianRhythm(
    stateHistory: IStateVector[],
    minDays?: number
  ): Promise<CircadianProfile | null>;

  /**
   * Detect early warning signals
   */
  detectEarlyWarnings(
    stateHistory: IStateVector[],
    windowSize?: number
  ): EarlyWarningSignal[];

  /**
   * Detect temporal patterns
   */
  detectPatterns(
    stateHistory: IStateVector[]
  ): TemporalPattern[];

  /**
   * Estimate time to specific state
   */
  estimateTimeToState(
    currentState: IStateVector,
    targetCondition: {
      riskLevel?: RiskLevel;
      minWellbeing?: number;
      emotionType?: EmotionType;
    }
  ): Promise<{
    estimatedHours: number | null;
    confidence: number;
    pathway: string;
  }>;

  /**
   * Get optimal intervention timing
   */
  getOptimalInterventionTiming(
    currentState: IStateVector,
    interventionType: string
  ): Promise<{
    optimalTime: Date;
    confidence: number;
    rationale: string;
    alternativeTimes: Date[];
  }>;
}

/**
 * Smoothing methods for time series
 */
export type SmoothingMethod =
  | 'kalman'              // Kalman filter (recommended for mood)
  | 'ewma'                // Exponential Weighted Moving Average
  | 'double_exponential'  // Holt's method (trend)
  | 'triple_exponential'  // Holt-Winters (seasonality)
  | 'moving_average';     // Simple moving average

/**
 * Configuration for Temporal Echo Engine
 */
export interface TemporalEngineConfig {
  /**
   * Minimum state history for predictions
   */
  readonly minHistorySize: number;

  /**
   * Default smoothing method
   */
  readonly smoothingMethod: SmoothingMethod;

  /**
   * Kalman filter parameters
   */
  readonly kalmanParams: {
    readonly processNoise: number;      // Q: state transition noise
    readonly measurementNoise: number;  // R: observation noise
    readonly initialUncertainty: number; // P0: initial covariance
  };

  /**
   * EWMA alpha (smoothing factor)
   * Higher = more weight to recent observations
   */
  readonly ewmaAlpha: number;

  /**
   * Confidence threshold for predictions
   */
  readonly confidenceThreshold: number;

  /**
   * Enable nonlinear dynamics detection
   */
  readonly detectNonlinearDynamics: boolean;

  /**
   * Circadian analysis minimum days
   */
  readonly circadianMinDays: number;
}

/**
 * Default configuration
 */
export const DEFAULT_TEMPORAL_CONFIG: TemporalEngineConfig = {
  minHistorySize: 5,
  smoothingMethod: 'kalman',
  kalmanParams: {
    processNoise: 0.1,
    measurementNoise: 0.3,
    initialUncertainty: 1.0,
  },
  ewmaAlpha: 0.3,
  confidenceThreshold: 0.6,
  detectNonlinearDynamics: true,
  circadianMinDays: 7,
};

/**
 * Horizon to hours mapping
 */
export const HORIZON_HOURS: Record<PredictionHorizon, number> = {
  '6h': 6,
  '12h': 12,
  '24h': 24,
  '72h': 72,
  '1w': 168,
};
