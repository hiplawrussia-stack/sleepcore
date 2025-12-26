/**
 * ⏰ TEMPORAL ECHO ENGINE IMPLEMENTATION
 * ======================================
 * State Forecasting with Kalman Filter + EWMA
 *
 * Scientific Implementation:
 * - Kalman Filter for optimal state estimation (Applied Comp. Psychiatry, 2024)
 * - EWMA for trend detection
 * - Phase transition detection (dynamical systems theory)
 * - JITAI vulnerability window identification
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
import type { IStateVector } from '../state/interfaces/IStateVector';
import type { RiskLevel } from '../state/interfaces/IRiskState';
import type { EmotionType } from '../state/interfaces/IEmotionalState';
import type { ITemporalEchoEngine, PredictionHorizon, PredictionPoint, StateTrajectory, VulnerabilityWindow, CircadianProfile, EarlyWarningSignal, TemporalPattern, TemporalEngineConfig } from './ITemporalPrediction';
/**
 * Temporal Echo Engine Implementation
 */
export declare class TemporalEchoEngine implements ITemporalEchoEngine {
    private config;
    constructor(config?: Partial<TemporalEngineConfig>);
    /**
     * Generate state trajectory predictions
     */
    predictTrajectory(currentState: IStateVector, stateHistory: IStateVector[], horizons?: PredictionHorizon[]): Promise<StateTrajectory>;
    /**
     * Predict single time point
     */
    predictAtHorizon(currentState: IStateVector, horizon: PredictionHorizon): Promise<PredictionPoint>;
    /**
     * Detect vulnerability windows
     */
    detectVulnerabilityWindows(trajectory: StateTrajectory, options?: {
        minConfidence?: number;
        windowTypes?: VulnerabilityWindow['type'][];
    }): VulnerabilityWindow[];
    /**
     * Analyze circadian rhythm
     */
    analyzeCircadianRhythm(stateHistory: IStateVector[], minDays?: number): Promise<CircadianProfile | null>;
    /**
     * Detect early warning signals
     */
    detectEarlyWarnings(stateHistory: IStateVector[], windowSize?: number): EarlyWarningSignal[];
    /**
     * Detect temporal patterns
     */
    detectPatterns(stateHistory: IStateVector[]): TemporalPattern[];
    /**
     * Estimate time to specific state
     */
    estimateTimeToState(currentState: IStateVector, targetCondition: {
        riskLevel?: RiskLevel;
        minWellbeing?: number;
        emotionType?: EmotionType;
    }): Promise<{
        estimatedHours: number | null;
        confidence: number;
        pathway: string;
    }>;
    /**
     * Get optimal intervention timing
     */
    getOptimalInterventionTiming(currentState: IStateVector, interventionType: string): Promise<{
        optimalTime: Date;
        confidence: number;
        rationale: string;
        alternativeTimes: Date[];
    }>;
    /**
     * Extract time series from state history
     */
    private extractTimeSeries;
    /**
     * Apply Kalman filter update
     */
    private kalmanUpdate;
    /**
     * Calculate EWMA
     */
    private ewma;
    /**
     * Convert risk level to number (0-1)
     */
    private riskToNumber;
    /**
     * Convert number to risk level
     */
    private numberToRisk;
    /**
     * Get decay factor for prediction horizon
     */
    private getDecayFactor;
    /**
     * Predict value with decay toward mean
     */
    private predictWithDecay;
    /**
     * Calculate overall trend
     */
    private calculateOverallTrend;
    /**
     * Identify contributing factors
     */
    private identifyContributingFactors;
    /**
     * Get recommended interventions based on prediction
     */
    private getRecommendedInterventions;
    /**
     * Detect phase transitions
     */
    private detectPhaseTransitions;
    /**
     * Build risk trajectory summary
     */
    private buildRiskTrajectory;
    /**
     * Calculate optimal intervention windows from circadian profile
     */
    private calculateOptimalWindows;
    private average;
    private variance;
    private standardDeviation;
    private calculateAutocorrelation;
    private countSignChanges;
    private detectWeeklyPattern;
    private detectCircadianPattern;
}
/**
 * Export singleton factory
 */
export declare function createTemporalEchoEngine(config?: Partial<TemporalEngineConfig>): ITemporalEchoEngine;
//# sourceMappingURL=TemporalEchoEngine.d.ts.map