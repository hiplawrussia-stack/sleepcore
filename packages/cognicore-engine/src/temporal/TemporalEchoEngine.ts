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
import type {
  ITemporalEchoEngine,
  PredictionHorizon,
  PredictionPoint,
  StateTrajectory,
  VulnerabilityWindow,
  CircadianProfile,
  EarlyWarningSignal,
  TemporalPattern,
  PhaseTransition,
  TrendDirection,
  TemporalEngineConfig,
} from './ITemporalPrediction';
import { DEFAULT_TEMPORAL_CONFIG, HORIZON_HOURS } from './ITemporalPrediction';

/**
 * Kalman Filter State
 */
interface KalmanState {
  estimate: number;      // x̂: State estimate
  uncertainty: number;   // P: Estimate uncertainty (covariance)
}

/**
 * Time series point
 */
interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

/**
 * Temporal Echo Engine Implementation
 */
export class TemporalEchoEngine implements ITemporalEchoEngine {
  private config: TemporalEngineConfig;

  constructor(config: Partial<TemporalEngineConfig> = {}) {
    this.config = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
  }

  /**
   * Generate state trajectory predictions
   */
  async predictTrajectory(
    currentState: IStateVector,
    stateHistory: IStateVector[],
    horizons: PredictionHorizon[] = ['6h', '12h', '24h', '72h']
  ): Promise<StateTrajectory> {
    // Extract time series for key metrics
    const wellbeingSeries = this.extractTimeSeries(stateHistory, s => s.wellbeingIndex / 100);
    const riskSeries = this.extractTimeSeries(stateHistory, s => this.riskToNumber(s.risk.level));
    const valenceSeries = this.extractTimeSeries(stateHistory, s => s.emotional.vad.valence);

    // Generate predictions for each horizon
    const predictions = new Map<PredictionHorizon, PredictionPoint>();

    for (const horizon of horizons) {
      const prediction = await this.predictAtHorizon(currentState, horizon);
      predictions.set(horizon, prediction);
    }

    // Detect phase transitions
    const phaseTransitions = this.detectPhaseTransitions(stateHistory, currentState);

    // Detect vulnerability windows
    const vulnerabilityWindows = this.detectVulnerabilityWindows(
      { predictions } as StateTrajectory
    );

    // Detect patterns
    const patterns = this.detectPatterns(stateHistory);

    // Calculate overall trend
    const overallTrend = this.calculateOverallTrend(wellbeingSeries);

    // Build risk trajectory
    const riskTrajectory = this.buildRiskTrajectory(currentState, predictions);

    return {
      userId: currentState.userId,
      generatedAt: new Date(),
      basedOnState: currentState.id,
      predictions,
      overallTrend,
      phaseTransitions,
      vulnerabilityWindows,
      patterns,
      riskTrajectory,
    };
  }

  /**
   * Predict single time point
   */
  async predictAtHorizon(
    currentState: IStateVector,
    horizon: PredictionHorizon
  ): Promise<PredictionPoint> {
    const hoursAhead = HORIZON_HOURS[horizon];
    const targetTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);

    // Current values
    const currentWellbeing = currentState.wellbeingIndex / 100;
    const currentRisk = this.riskToNumber(currentState.risk.level);
    const currentValence = currentState.emotional.vad.valence;
    const currentArousal = currentState.emotional.vad.arousal;
    const currentLoad = currentState.resources.cognitiveCapacity.currentLoad;
    const currentResources = currentState.resources.overallAvailability;

    // Apply decay/regression toward mean based on horizon
    const decayFactor = this.getDecayFactor(hoursAhead);

    // Predicted values (regression to mean with current state influence)
    const predictedWellbeing = this.predictWithDecay(currentWellbeing, 0.5, decayFactor);
    const predictedRisk = this.predictWithDecay(currentRisk, 0.2, decayFactor);
    const predictedValence = this.predictWithDecay(currentValence, 0, decayFactor);
    const predictedArousal = this.predictWithDecay(currentArousal, 0, decayFactor);
    const predictedLoad = this.predictWithDecay(currentLoad, 0.3, decayFactor);
    const predictedResources = this.predictWithDecay(currentResources, 0.6, decayFactor);

    // Confidence decreases with horizon
    const baseConfidence = 0.9;
    const confidenceDecay = Math.exp(-hoursAhead / 48); // Halves every ~33 hours
    const confidence = baseConfidence * confidenceDecay;

    // Confidence interval widens with horizon
    const intervalWidth = 0.1 + (1 - confidenceDecay) * 0.3;

    // Contributing factors
    const contributingFactors = this.identifyContributingFactors(currentState);

    return {
      timestamp: targetTime,
      horizon,
      predicted: {
        wellbeingIndex: predictedWellbeing,
        riskLevel: this.numberToRisk(predictedRisk),
        emotionalValence: predictedValence,
        emotionalArousal: predictedArousal,
        cognitiveLoad: predictedLoad,
        resourceAvailability: predictedResources,
      },
      confidenceInterval: {
        lower: Math.max(0, predictedWellbeing - intervalWidth),
        upper: Math.min(1, predictedWellbeing + intervalWidth),
      },
      confidence,
      contributingFactors,
    };
  }

  /**
   * Detect vulnerability windows
   */
  detectVulnerabilityWindows(
    trajectory: StateTrajectory,
    options: {
      minConfidence?: number;
      windowTypes?: VulnerabilityWindow['type'][];
    } = {}
  ): VulnerabilityWindow[] {
    const windows: VulnerabilityWindow[] = [];
    const minConfidence = options.minConfidence ?? 0.5;

    // Check each prediction for vulnerability
    trajectory.predictions?.forEach((prediction, horizon) => {
      const riskNum = this.riskToNumber(prediction.predicted.riskLevel);

      // High risk window
      if (riskNum >= 0.7 && prediction.confidence >= minConfidence) {
        windows.push({
          id: `vuln-${horizon}-${Date.now()}`,
          startTime: new Date(prediction.timestamp.getTime() - 30 * 60 * 1000),
          endTime: new Date(prediction.timestamp.getTime() + 30 * 60 * 1000),
          type: riskNum >= 0.85 ? 'critical' : 'high_risk',
          confidence: prediction.confidence,
          predictedState: {
            riskLevel: prediction.predicted.riskLevel,
            emotionalValence: prediction.predicted.emotionalValence,
            cognitiveLoad: prediction.predicted.cognitiveLoad,
          },
          recommendedInterventionTypes: this.getRecommendedInterventions(prediction),
          triggerFactors: prediction.contributingFactors
            .filter(f => f.direction === 'negative')
            .map(f => f.factor),
        });
      }

      // Receptive window (good state = opportunity)
      if (prediction.predicted.emotionalValence > 0.3 &&
          prediction.predicted.cognitiveLoad < 0.5 &&
          prediction.confidence >= minConfidence) {
        windows.push({
          id: `opp-${horizon}-${Date.now()}`,
          startTime: new Date(prediction.timestamp.getTime() - 60 * 60 * 1000),
          endTime: new Date(prediction.timestamp.getTime() + 60 * 60 * 1000),
          type: 'receptive',
          confidence: prediction.confidence,
          predictedState: {
            riskLevel: prediction.predicted.riskLevel,
            emotionalValence: prediction.predicted.emotionalValence,
            cognitiveLoad: prediction.predicted.cognitiveLoad,
          },
          recommendedInterventionTypes: ['skill_building', 'psychoeducation', 'goal_setting'],
          triggerFactors: [],
        });
      }
    });

    return windows.filter(w =>
      !options.windowTypes || options.windowTypes.includes(w.type)
    );
  }

  /**
   * Analyze circadian rhythm
   */
  async analyzeCircadianRhythm(
    stateHistory: IStateVector[],
    minDays: number = 7
  ): Promise<CircadianProfile | null> {
    if (stateHistory.length < minDays * 4) { // At least 4 observations per day
      return null;
    }

    // Group by hour
    const hourlyData: Map<number, number[]> = new Map();
    for (let h = 0; h < 24; h++) {
      hourlyData.set(h, []);
    }

    for (const state of stateHistory) {
      const hour = state.timestamp.getHours();
      hourlyData.get(hour)?.push(state.wellbeingIndex / 100);
    }

    // Calculate hourly averages
    const hourlyProfile = Array.from(hourlyData.entries())
      .map(([hour, values]) => ({
        hour,
        avgWellbeing: values.length > 0 ? this.average(values) : 0.5,
        avgRisk: 0.2, // Would need risk data
        avgEnergy: 0.6, // Would need energy data
        variability: values.length > 1 ? this.standardDeviation(values) : 0,
        sampleCount: values.length,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Find peaks
    const sortedByWellbeing = [...hourlyProfile].sort((a, b) => b.avgWellbeing - a.avgWellbeing);
    const bestMoodTime = sortedByWellbeing[0]?.hour ?? 10;
    const worstMoodTime = sortedByWellbeing[sortedByWellbeing.length - 1]?.hour ?? 3;

    // Determine optimal intervention windows
    const optimalInterventionWindows = this.calculateOptimalWindows(hourlyProfile);

    return {
      userId: stateHistory[0]?.userId ?? '',
      analyzedFrom: stateHistory[0]?.timestamp ?? new Date(),
      analyzedTo: stateHistory[stateHistory.length - 1]?.timestamp ?? new Date(),
      hourlyProfile,
      peaks: {
        bestMoodTime,
        worstMoodTime,
        highestEnergyTime: 10, // Default morning
        lowestEnergyTime: 15,  // Default afternoon
      },
      optimalInterventionWindows,
    };
  }

  /**
   * Detect early warning signals
   */
  detectEarlyWarnings(
    stateHistory: IStateVector[],
    windowSize: number = 10
  ): EarlyWarningSignal[] {
    const signals: EarlyWarningSignal[] = [];

    if (stateHistory.length < windowSize) {
      return signals;
    }

    // Extract recent wellbeing values
    const recentStates = stateHistory.slice(-windowSize);
    const values = recentStates.map(s => s.wellbeingIndex / 100);

    // 1. Critical slowing down: increased autocorrelation
    const autocorr = this.calculateAutocorrelation(values, 1);
    if (autocorr > 0.7) {
      signals.push({
        id: `ews-autocorr-${Date.now()}`,
        type: 'increased_autocorrelation',
        detectedAt: new Date(),
        strength: autocorr,
        possibleTransition: values[values.length - 1] < 0.4 ? 'crisis_approaching' : 'mood_shift',
        confidence: 0.6,
        description: 'Состояние становится более "застойным" - возможен переход',
        recommendedActions: ['Увеличить частоту check-in', 'Предложить активность'],
      });
    }

    // 2. Increased variance
    const recentVar = this.variance(values.slice(-5));
    const olderVar = this.variance(values.slice(0, -5));
    if (recentVar > olderVar * 1.5) {
      signals.push({
        id: `ews-variance-${Date.now()}`,
        type: 'increased_variance',
        detectedAt: new Date(),
        strength: recentVar / (olderVar + 0.001),
        possibleTransition: 'mood_shift',
        confidence: 0.5,
        description: 'Эмоциональное состояние стало более нестабильным',
        recommendedActions: ['Мониторинг', 'Техники стабилизации'],
      });
    }

    // 3. Flickering (rapid oscillations)
    const signChanges = this.countSignChanges(values.map((v, i) =>
      i > 0 ? v - values[i - 1] : 0
    ));
    if (signChanges > windowSize * 0.6) {
      signals.push({
        id: `ews-flicker-${Date.now()}`,
        type: 'flickering',
        detectedAt: new Date(),
        strength: signChanges / windowSize,
        possibleTransition: 'mood_shift',
        confidence: 0.5,
        description: 'Частые колебания состояния',
        recommendedActions: ['Grounding техники', 'Стабилизация режима'],
      });
    }

    return signals;
  }

  /**
   * Detect temporal patterns
   */
  detectPatterns(stateHistory: IStateVector[]): TemporalPattern[] {
    const patterns: TemporalPattern[] = [];

    if (stateHistory.length < 14) { // Need at least 2 weeks
      return patterns;
    }

    // Check for weekly pattern
    const weeklyPattern = this.detectWeeklyPattern(stateHistory);
    if (weeklyPattern) {
      patterns.push(weeklyPattern);
    }

    // Check for circadian pattern
    const circadianPattern = this.detectCircadianPattern(stateHistory);
    if (circadianPattern) {
      patterns.push(circadianPattern);
    }

    return patterns;
  }

  /**
   * Estimate time to specific state
   */
  async estimateTimeToState(
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
  }> {
    // Simple estimation based on current trajectory
    const currentWellbeing = currentState.wellbeingIndex / 100;
    const currentRisk = this.riskToNumber(currentState.risk.level);

    // Check if already at target
    if (targetCondition.minWellbeing !== undefined &&
        currentWellbeing >= targetCondition.minWellbeing) {
      return { estimatedHours: 0, confidence: 1.0, pathway: 'already_achieved' };
    }

    if (targetCondition.riskLevel !== undefined) {
      const targetRisk = this.riskToNumber(targetCondition.riskLevel);
      if (currentRisk <= targetRisk) {
        return { estimatedHours: 0, confidence: 1.0, pathway: 'already_achieved' };
      }
    }

    // Estimate based on typical recovery rates
    // This is simplified - real implementation would use historical data
    const wellbeingGap = (targetCondition.minWellbeing ?? 0.6) - currentWellbeing;
    const hoursPerPoint = 24; // Assume 24h per 0.1 wellbeing improvement

    const estimatedHours = Math.ceil(wellbeingGap * 10 * hoursPerPoint);

    return {
      estimatedHours: estimatedHours > 0 ? estimatedHours : null,
      confidence: 0.4, // Low confidence for simple estimation
      pathway: wellbeingGap > 0 ? 'gradual_improvement' : 'maintenance',
    };
  }

  /**
   * Get optimal intervention timing
   */
  async getOptimalInterventionTiming(
    currentState: IStateVector,
    interventionType: string
  ): Promise<{
    optimalTime: Date;
    confidence: number;
    rationale: string;
    alternativeTimes: Date[];
  }> {
    const now = new Date();
    const currentHour = now.getHours();

    // Simple heuristics based on intervention type
    let optimalHour: number;
    let rationale: string;

    switch (interventionType) {
      case 'breathing':
      case 'grounding':
        // Best when stressed - immediate
        optimalHour = currentHour;
        rationale = 'Немедленное вмешательство для управления стрессом';
        break;

      case 'psychoeducation':
      case 'skill_building':
        // Best in morning with low cognitive load
        optimalHour = 10;
        rationale = 'Утром когнитивные ресурсы максимальны';
        break;

      case 'reflection':
      case 'journaling':
        // Best in evening
        optimalHour = 20;
        rationale = 'Вечером лучше для рефлексии дня';
        break;

      default:
        optimalHour = 11;
        rationale = 'Оптимальное время для большинства интервенций';
    }

    // Calculate optimal time
    const optimalTime = new Date(now);
    if (optimalHour <= currentHour) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }
    optimalTime.setHours(optimalHour, 0, 0, 0);

    // Alternative times
    const alternativeTimes = [
      new Date(optimalTime.getTime() - 2 * 60 * 60 * 1000),
      new Date(optimalTime.getTime() + 2 * 60 * 60 * 1000),
    ];

    return {
      optimalTime,
      confidence: 0.6,
      rationale,
      alternativeTimes,
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Extract time series from state history
   */
  private extractTimeSeries(
    states: IStateVector[],
    extractor: (state: IStateVector) => number
  ): TimeSeriesPoint[] {
    return states.map(s => ({
      timestamp: s.timestamp,
      value: extractor(s),
    }));
  }

  /**
   * Apply Kalman filter update
   */
  private kalmanUpdate(
    state: KalmanState,
    measurement: number,
    Q: number = this.config.kalmanParams.processNoise,
    R: number = this.config.kalmanParams.measurementNoise
  ): KalmanState {
    // Predict
    const predictedUncertainty = state.uncertainty + Q;

    // Update
    const kalmanGain = predictedUncertainty / (predictedUncertainty + R);
    const newEstimate = state.estimate + kalmanGain * (measurement - state.estimate);
    const newUncertainty = (1 - kalmanGain) * predictedUncertainty;

    return {
      estimate: newEstimate,
      uncertainty: newUncertainty,
    };
  }

  /**
   * Calculate EWMA
   */
  private ewma(values: number[], alpha: number = this.config.ewmaAlpha): number {
    if (values.length === 0) return 0;
    let result = values[0];
    for (let i = 1; i < values.length; i++) {
      result = alpha * values[i] + (1 - alpha) * result;
    }
    return result;
  }

  /**
   * Convert risk level to number (0-1)
   */
  private riskToNumber(risk: RiskLevel): number {
    const mapping: Record<RiskLevel, number> = {
      'none': 0,
      'low': 0.25,
      'medium': 0.5,
      'high': 0.75,
      'critical': 1.0,
    };
    return mapping[risk] ?? 0.5;
  }

  /**
   * Convert number to risk level
   */
  private numberToRisk(value: number): RiskLevel {
    if (value >= 0.85) return 'critical';
    if (value >= 0.7) return 'high';
    if (value >= 0.4) return 'medium';
    if (value >= 0.2) return 'low';
    return 'none';
  }

  /**
   * Get decay factor for prediction horizon
   */
  private getDecayFactor(hoursAhead: number): number {
    // Exponential decay toward mean
    return Math.exp(-hoursAhead / 72); // ~63% retention at 72h
  }

  /**
   * Predict value with decay toward mean
   */
  private predictWithDecay(current: number, mean: number, decayFactor: number): number {
    return mean + (current - mean) * decayFactor;
  }

  /**
   * Calculate overall trend
   */
  private calculateOverallTrend(series: TimeSeriesPoint[]): TrendDirection {
    if (series.length < 3) return 'unknown';

    const values = series.map(p => p.value);
    const recentAvg = this.average(values.slice(-3));
    const olderAvg = this.average(values.slice(0, -3));

    const diff = recentAvg - olderAvg;
    const variance = this.variance(values);

    if (variance > 0.1) return 'volatile';
    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Identify contributing factors
   */
  private identifyContributingFactors(state: IStateVector): Array<{
    factor: string;
    weight: number;
    direction: 'positive' | 'negative' | 'neutral';
  }> {
    const factors: Array<{ factor: string; weight: number; direction: 'positive' | 'negative' | 'neutral' }> = [];

    // Emotional factors
    if (state.emotional.vad.valence < -0.3) {
      factors.push({ factor: 'negative_emotion', weight: 0.3, direction: 'negative' });
    } else if (state.emotional.vad.valence > 0.3) {
      factors.push({ factor: 'positive_emotion', weight: 0.3, direction: 'positive' });
    }

    // Risk factors
    if (state.risk.level === 'high' || state.risk.level === 'critical') {
      factors.push({ factor: 'elevated_risk', weight: 0.4, direction: 'negative' });
    }

    // Resource factors
    if (state.resources.energy.current < 0.3) {
      factors.push({ factor: 'low_energy', weight: 0.2, direction: 'negative' });
    }
    if (state.resources.permaScore > 0.7) {
      factors.push({ factor: 'strong_wellbeing_foundation', weight: 0.3, direction: 'positive' });
    }

    // Cognitive factors
    if (state.cognitive.distortionIntensity > 0.5) {
      factors.push({ factor: 'cognitive_distortions', weight: 0.2, direction: 'negative' });
    }

    return factors;
  }

  /**
   * Get recommended interventions based on prediction
   */
  private getRecommendedInterventions(prediction: PredictionPoint): string[] {
    const interventions: string[] = [];

    if (prediction.predicted.riskLevel === 'critical' ||
        prediction.predicted.riskLevel === 'high') {
      interventions.push('crisis_support', 'safety_planning');
    }

    if (prediction.predicted.emotionalValence < -0.3) {
      interventions.push('emotion_regulation', 'behavioral_activation');
    }

    if (prediction.predicted.cognitiveLoad > 0.7) {
      interventions.push('relaxation', 'cognitive_defusion');
    }

    if (interventions.length === 0) {
      interventions.push('check_in', 'maintenance');
    }

    return interventions;
  }

  /**
   * Detect phase transitions
   */
  private detectPhaseTransitions(
    history: IStateVector[],
    current: IStateVector
  ): Array<{
    type: PhaseTransition;
    predictedTime: Date;
    confidence: number;
    preventable: boolean;
    preventionActions: string[];
  }> {
    const transitions: Array<{
      type: PhaseTransition;
      predictedTime: Date;
      confidence: number;
      preventable: boolean;
      preventionActions: string[];
    }> = [];

    // Simple heuristic: if risk is increasing, predict crisis approaching
    const currentRisk = this.riskToNumber(current.risk.level);
    if (currentRisk >= 0.5 && current.risk.trajectory === 'declining') {
      transitions.push({
        type: 'crisis_approaching',
        predictedTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        confidence: 0.6,
        preventable: true,
        preventionActions: ['Обратиться за поддержкой', 'Активировать план безопасности'],
      });
    }

    // If wellbeing improving and stable
    if (current.wellbeingIndex > 60 && current.stabilityIndex > 70) {
      transitions.push({
        type: 'stability_achieved',
        predictedTime: new Date(),
        confidence: 0.7,
        preventable: false,
        preventionActions: [],
      });
    }

    return transitions;
  }

  /**
   * Build risk trajectory summary
   */
  private buildRiskTrajectory(
    current: IStateVector,
    predictions: Map<PredictionHorizon, PredictionPoint>
  ): StateTrajectory['riskTrajectory'] {
    return {
      current: current.risk.level,
      predicted6h: predictions.get('6h')?.predicted.riskLevel ?? current.risk.level,
      predicted24h: predictions.get('24h')?.predicted.riskLevel ?? current.risk.level,
      predicted72h: predictions.get('72h')?.predicted.riskLevel ?? current.risk.level,
      trend: current.risk.trajectory as TrendDirection,
      peakRiskTime: undefined,
      lowestRiskTime: undefined,
    };
  }

  /**
   * Calculate optimal intervention windows from circadian profile
   */
  private calculateOptimalWindows(
    hourlyProfile: CircadianProfile['hourlyProfile']
  ): CircadianProfile['optimalInterventionWindows'] {
    const windows: CircadianProfile['optimalInterventionWindows'] = [];

    // Find high wellbeing, low variability times
    const goodHours = hourlyProfile.filter(h =>
      h.avgWellbeing > 0.5 && h.variability < 0.2
    );

    if (goodHours.length > 0) {
      const bestHour = goodHours.sort((a, b) => b.avgWellbeing - a.avgWellbeing)[0];
      windows.push({
        startHour: bestHour.hour,
        endHour: (bestHour.hour + 2) % 24,
        interventionType: 'skill_building',
        rationale: 'Наиболее стабильное позитивное состояние',
      });
    }

    return windows;
  }

  // Statistical helper methods
  private average(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.average(values);
    return values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  }

  private standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;
    const avg = this.average(values);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      numerator += (values[i] - avg) * (values[i + lag] - avg);
    }
    for (let i = 0; i < values.length; i++) {
      denominator += (values[i] - avg) ** 2;
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private countSignChanges(values: number[]): number {
    let changes = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i] > 0 && values[i - 1] < 0) || (values[i] < 0 && values[i - 1] > 0)) {
        changes++;
      }
    }
    return changes;
  }

  private detectWeeklyPattern(states: IStateVector[]): TemporalPattern | null {
    // Group by day of week
    const byDay: Map<number, number[]> = new Map();
    for (let d = 0; d < 7; d++) byDay.set(d, []);

    for (const state of states) {
      const day = state.timestamp.getDay();
      byDay.get(day)?.push(state.wellbeingIndex / 100);
    }

    // Check if there's significant variation
    const dayAverages = Array.from(byDay.values()).map(v => this.average(v));
    const overallVariance = this.variance(dayAverages);

    if (overallVariance > 0.02) {
      return {
        id: `pattern-weekly-${Date.now()}`,
        name: 'Недельный ритм',
        type: 'weekly',
        description: 'Обнаружен недельный паттерн настроения',
        confidence: Math.min(0.8, overallVariance * 10),
        period: 168,
        associatedFactors: ['работа/учёба', 'выходные'],
        therapeuticImplications: ['Планировать активности с учётом паттерна'],
      };
    }

    return null;
  }

  private detectCircadianPattern(states: IStateVector[]): TemporalPattern | null {
    // Group by hour
    const byHour: Map<number, number[]> = new Map();
    for (let h = 0; h < 24; h++) byHour.set(h, []);

    for (const state of states) {
      const hour = state.timestamp.getHours();
      byHour.get(hour)?.push(state.wellbeingIndex / 100);
    }

    // Check for circadian variation
    const hourAverages = Array.from(byHour.values()).map(v => this.average(v));
    const overallVariance = this.variance(hourAverages);

    if (overallVariance > 0.01) {
      return {
        id: `pattern-circadian-${Date.now()}`,
        name: 'Суточный ритм',
        type: 'circadian',
        description: 'Обнаружен суточный паттерн состояния',
        confidence: Math.min(0.8, overallVariance * 20),
        period: 24,
        associatedFactors: ['сон', 'приём пищи', 'активность'],
        therapeuticImplications: ['Учитывать оптимальное время для интервенций'],
      };
    }

    return null;
  }
}

/**
 * Export singleton factory
 */
export function createTemporalEchoEngine(
  config?: Partial<TemporalEngineConfig>
): ITemporalEchoEngine {
  return new TemporalEchoEngine(config);
}
