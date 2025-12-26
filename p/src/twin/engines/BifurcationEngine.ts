/**
 * Bifurcation Engine - Tipping Point Detection for Digital Twins
 *
 * Phase 6.3: Critical Transition Detection for Mental Health Digital Twins
 *
 * 2025 Research Integration:
 * - Enhanced Critical Slowing Down (CSD) indicators
 * - Detrended Fluctuation Analysis (DFA)
 * - Flickering detection between states
 * - Period doubling and blue sky bifurcation detection
 * - Multi-scale early warning signals
 * - Causal effect estimation for interventions
 *
 * Research basis:
 * - JAMA Psychiatry: "A Dynamical Systems View of Psychiatric Disorders"
 * - Nature: "Early warning signals for critical transitions"
 * - PMC: "Tipping points - predicting transitions to psychosis"
 * - Frontiers: "Anticipating Critical Transitions in Mental Health"
 *
 * © БФ "Другой путь", 2025
 */

import {
  IDigitalTwinState,
  ITippingPoint,
  IStabilityLandscape,
  IAttractorBasin,
  IStateTrajectory,
  ITippingPointDetectorService,
  IInterventionRecommendation,
  BifurcationType,
  AttractorType,
  ScenarioOutcome,
  generateTwinId,
} from '../interfaces/IDigitalTwin';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Early Warning Signal thresholds
 * Based on 2025 critical slowing down research
 */
const EWS_THRESHOLDS = {
  autocorrelation: {
    warning: 0.7,
    critical: 0.85,
  },
  variance: {
    warning: 1.5,     // Fold increase
    critical: 2.0,
  },
  crossCorrelation: {
    warning: 0.6,
    critical: 0.75,
  },
  recoveryRate: {
    warning: 0.3,
    critical: 0.15,
  },
  // 2025: Additional indicators
  dfaExponent: {
    warning: 0.75,    // Above 0.5 = long-range correlations
    critical: 0.9,
  },
  skewnessChange: {
    warning: 0.5,
    critical: 1.0,
  },
  flickeringThreshold: 0.3,
};

/**
 * Critical thresholds for mental health variables
 */
const VARIABLE_THRESHOLDS: Record<string, {
  crisis: number;
  recovery: number;
  direction: 'high' | 'low';
  weight: number;
}> = {
  emotion_anxiety: { crisis: 0.85, recovery: 0.3, direction: 'high', weight: 1.0 },
  emotion_sadness: { crisis: 0.85, recovery: 0.3, direction: 'high', weight: 1.0 },
  emotion_hopelessness: { crisis: 0.8, recovery: 0.25, direction: 'high', weight: 1.2 },
  cognition_rumination: { crisis: 0.8, recovery: 0.3, direction: 'high', weight: 0.9 },
  cognition_suicidal_ideation: { crisis: 0.5, recovery: 0.1, direction: 'high', weight: 2.0 },
  behavior_withdrawal: { crisis: 0.8, recovery: 0.3, direction: 'high', weight: 0.8 },
  behavior_substance_use: { crisis: 0.7, recovery: 0.2, direction: 'high', weight: 1.1 },
  physio_sleep_quality: { crisis: 0.2, recovery: 0.6, direction: 'low', weight: 0.9 },
  physio_energy: { crisis: 0.2, recovery: 0.5, direction: 'low', weight: 0.8 },
  social_engagement: { crisis: 0.2, recovery: 0.5, direction: 'low', weight: 0.7 },
};

/**
 * Intervention types by target variable
 */
const INTERVENTION_MAPPING: Record<string, IInterventionRecommendation[]> = {
  emotion_anxiety: [
    {
      interventionType: 'relaxation',
      targetVariable: 'emotion_anxiety',
      expectedEffect: -0.3,
      urgency: 'high',
      feasibility: 0.8,
      description: 'Progressive muscle relaxation or breathing exercises',
      descriptionRu: 'Прогрессивная мышечная релаксация или дыхательные упражнения',
    },
    {
      interventionType: 'cognitive_reframe',
      targetVariable: 'emotion_anxiety',
      expectedEffect: -0.25,
      urgency: 'medium',
      feasibility: 0.7,
      description: 'Cognitive restructuring of anxious thoughts',
      descriptionRu: 'Когнитивная реструктуризация тревожных мыслей',
    },
  ],
  emotion_sadness: [
    {
      interventionType: 'behavioral_activation',
      targetVariable: 'emotion_sadness',
      expectedEffect: -0.25,
      urgency: 'high',
      feasibility: 0.7,
      description: 'Scheduled pleasant activities',
      descriptionRu: 'Запланированные приятные активности',
    },
    {
      interventionType: 'social_support',
      targetVariable: 'emotion_sadness',
      expectedEffect: -0.2,
      urgency: 'medium',
      feasibility: 0.6,
      description: 'Reach out to supportive person',
      descriptionRu: 'Связаться с поддерживающим человеком',
    },
  ],
  cognition_rumination: [
    {
      interventionType: 'mindfulness',
      targetVariable: 'cognition_rumination',
      expectedEffect: -0.3,
      urgency: 'high',
      feasibility: 0.75,
      description: 'Mindfulness meditation to break rumination cycle',
      descriptionRu: 'Медитация осознанности для прерывания руминации',
    },
  ],
  cognition_suicidal_ideation: [
    {
      interventionType: 'crisis_intervention',
      targetVariable: 'cognition_suicidal_ideation',
      expectedEffect: -0.4,
      urgency: 'critical',
      feasibility: 0.9,
      description: 'Immediate crisis support and safety planning',
      descriptionRu: 'Немедленная кризисная поддержка и план безопасности',
    },
  ],
  physio_sleep_quality: [
    {
      interventionType: 'sleep_hygiene',
      targetVariable: 'physio_sleep_quality',
      expectedEffect: 0.25,
      urgency: 'medium',
      feasibility: 0.8,
      description: 'Sleep hygiene improvement protocol',
      descriptionRu: 'Протокол улучшения гигиены сна',
    },
  ],
};

// ============================================================================
// EARLY WARNING SIGNAL RESULT
// ============================================================================

interface IEarlyWarningSignals {
  // Standard CSD indicators
  autocorrelation: number;
  autocorrelationTrend: number;
  variance: number;
  varianceTrend: number;
  crossCorrelation: number;
  crossCorrelationTrend: number;
  recoveryRate: number;

  // 2025: Extended indicators
  dfaExponent: number;
  skewness: number;
  skewnessChange: number;
  flickeringScore: number;
  periodicityScore: number;

  // Composite
  compositeScore: number;
  criticalityLevel: 'low' | 'warning' | 'critical';
}

// ============================================================================
// BIFURCATION ENGINE
// ============================================================================

/**
 * Bifurcation Engine
 *
 * Detects approaching tipping points and critical transitions
 * in mental health trajectories using dynamical systems theory
 */
export class BifurcationEngine implements ITippingPointDetectorService {

  // ==========================================================================
  // TIPPING POINT DETECTION
  // ==========================================================================

  async detectTippingPoints(
    twin: IDigitalTwinState,
    stateHistory: IStateTrajectory
  ): Promise<ITippingPoint[]> {
    const tippingPoints: ITippingPoint[] = [];

    // Need sufficient history for analysis
    if (stateHistory.states.length < 7) {
      return [];
    }

    // Analyze each critical variable
    for (const [varId, threshold] of Object.entries(VARIABLE_THRESHOLDS)) {
      const twinVar = twin.variables.get(varId);
      if (!twinVar) continue;

      // Extract time series
      const timeSeries = this.extractTimeSeries(stateHistory, varId);
      if (timeSeries.length < 7) continue;

      // Calculate early warning signals
      const ews = this.calculateEarlyWarningSignals(timeSeries);

      // Determine if approaching tipping point
      const approach = this.assessApproach(ews, twinVar.value, threshold);

      if (approach.isApproaching) {
        // Classify bifurcation type
        const bifurcationType = this.classifyBifurcation(timeSeries, ews);

        // Estimate timing
        const timing = this.estimateTiming(timeSeries, ews, twinVar.value, threshold);

        // Find preventive interventions
        const interventions = this.findInterventions(varId, approach.urgency);

        const tippingPoint: ITippingPoint = {
          id: generateTwinId('TP'),
          timestamp: new Date(),
          detectedAt: new Date(),

          bifurcationType,
          criticalParameter: varId,
          criticalThreshold: threshold.direction === 'high' ? threshold.crisis : threshold.recovery,
          currentDistance: approach.distance,

          estimatedTimeToPoint: timing.days,
          confidenceInterval: timing.confidenceInterval,

          preTransitionState: this.classifyAttractor(twin),
          postTransitionState: this.predictPostTransition(bifurcationType, threshold),
          expectedOutcome: threshold.direction === 'high' ? 'crisis' : 'recovery',
          irreversibility: this.calculateIrreversibility(bifurcationType, ews),

          earlyWarningStrength: ews.compositeScore,
          autocorrelationIncrease: ews.autocorrelationTrend,
          varianceIncrease: ews.varianceTrend,
          crossCorrelationIncrease: ews.crossCorrelationTrend,

          // 2025: Extended indicators
          flickeringDetected: ews.flickeringScore > EWS_THRESHOLDS.flickeringThreshold,
          skewnessChange: ews.skewnessChange,
          detrended_fluctuation_exponent: ews.dfaExponent,

          interventionWindowDays: Math.max(0, timing.days - 2),
          preventionProbability: this.calculatePreventionProbability(timing.days, ews),
          recommendedInterventions: interventions,
        };

        tippingPoints.push(tippingPoint);
      }
    }

    // Sort by urgency
    return tippingPoints.sort((a, b) => a.estimatedTimeToPoint - b.estimatedTimeToPoint);
  }

  // ==========================================================================
  // STABILITY LANDSCAPE ANALYSIS
  // ==========================================================================

  async analyzeStabilityLandscape(twin: IDigitalTwinState): Promise<IStabilityLandscape> {
    // Identify potential attractors
    const attractors = this.identifyAttractors(twin);

    // Find current attractor
    const currentAttractor = this.findCurrentAttractor(twin, attractors);

    // Calculate basin position
    const basinPosition = this.calculateBasinPosition(twin, currentAttractor);

    // Determine topology
    const topology = attractors.length > 2 ? 'complex' :
                     attractors.length === 2 ? 'multistable' : 'simple';

    // Find transition path
    const transitionPath = this.findTransitionPath(attractors, currentAttractor);

    // 2025: Detect landscape dynamics
    const isChanging = twin.lyapunovExponent > -0.1;
    const changeRate = Math.abs(twin.lyapunovExponent);

    return {
      timestamp: new Date(),
      attractors,
      currentAttractor: currentAttractor?.attractorId || 'unknown',
      currentBasinPosition: basinPosition,
      landscapeTopology: topology,
      dominantTransitionPath: transitionPath,

      // 2025 extensions
      isLandscapeChanging: isChanging,
      landscapeChangeRate: changeRate,
      emergingAttractors: [],
      disappearingAttractors: [],
    };
  }

  // ==========================================================================
  // BIFURCATION TIMING PREDICTION
  // ==========================================================================

  async predictBifurcationTiming(
    tippingPoint: ITippingPoint,
    stateHistory: IStateTrajectory
  ): Promise<{
    estimatedDays: number;
    confidence: number;
    interventionWindow: number;
  }> {
    const timeSeries = this.extractTimeSeries(stateHistory, tippingPoint.criticalParameter);

    // Fit exponential approach
    const { rate, r2 } = this.fitExponentialApproach(timeSeries, tippingPoint.criticalThreshold);

    // Calculate time estimate
    const currentValue = timeSeries[timeSeries.length - 1];
    const distance = Math.abs(tippingPoint.criticalThreshold - currentValue);

    let estimatedDays: number;
    if (rate > 0) {
      estimatedDays = Math.log(distance / 0.01) / rate;
    } else {
      estimatedDays = 365;
    }

    // Confidence based on fit quality and EWS
    const confidence = Math.min(1, r2 * (tippingPoint.earlyWarningStrength + 0.5));

    // Intervention window
    const interventionWindow = Math.max(0, estimatedDays - 3);

    return {
      estimatedDays: Math.max(1, Math.round(estimatedDays)),
      confidence,
      interventionWindow: Math.round(interventionWindow),
    };
  }

  // ==========================================================================
  // DISTANCE TO TIPPING POINT
  // ==========================================================================

  async distanceToTippingPoint(
    twin: IDigitalTwinState,
    stateHistory: IStateTrajectory
  ): Promise<{
    distance: number;
    direction: string;
    velocity: number;
    timeToReach: number | null;
  }> {
    let minDistance = Infinity;
    let criticalVar = '';
    let velocity = 0;

    for (const [varId, threshold] of Object.entries(VARIABLE_THRESHOLDS)) {
      const twinVar = twin.variables.get(varId);
      if (!twinVar) continue;

      const criticalValue = threshold.direction === 'high' ? threshold.crisis : threshold.recovery;
      const dist = threshold.direction === 'high'
        ? criticalValue - twinVar.value
        : twinVar.value - criticalValue;

      // Weight by variable importance
      const weightedDist = dist / threshold.weight;

      if (weightedDist < minDistance && dist > 0) {
        minDistance = dist;
        criticalVar = varId;
        velocity = twinVar.velocity;
      }
    }

    // Normalize distance
    const normalizedDistance = Math.min(1, minDistance);

    // Calculate time to reach
    let timeToReach: number | null = null;
    if (velocity !== 0 && minDistance > 0) {
      const threshold = VARIABLE_THRESHOLDS[criticalVar];
      const isApproaching =
        (threshold?.direction === 'high' && velocity > 0) ||
        (threshold?.direction === 'low' && velocity < 0);

      if (isApproaching) {
        timeToReach = minDistance / Math.abs(velocity);
      }
    }

    return {
      distance: normalizedDistance,
      direction: criticalVar,
      velocity,
      timeToReach,
    };
  }

  // ==========================================================================
  // PREVENTIVE INTERVENTION
  // ==========================================================================

  async findPreventiveIntervention(
    tippingPoint: ITippingPoint,
    twin: IDigitalTwinState
  ): Promise<IInterventionRecommendation | null> {
    const interventions = this.findInterventions(
      tippingPoint.criticalParameter,
      tippingPoint.estimatedTimeToPoint < 3 ? 'critical' : 'high'
    );

    return interventions.length > 0 ? interventions[0] : null;
  }

  // ==========================================================================
  // PRIVATE: EARLY WARNING SIGNALS
  // ==========================================================================

  private extractTimeSeries(history: IStateTrajectory, varId: string): number[] {
    return history.states.map(state => state.variables.get(varId)?.value ?? 0);
  }

  private calculateEarlyWarningSignals(timeSeries: number[]): IEarlyWarningSignals {
    // Standard CSD indicators
    const autocorrelation = this.calculateAutocorrelation(timeSeries, 1);
    const variance = this.calculateVariance(timeSeries);
    const baselineVariance = this.calculateVariance(timeSeries.slice(0, Math.floor(timeSeries.length / 2)));
    const varianceRatio = baselineVariance > 0 ? variance / baselineVariance : 1;

    // Trends
    const firstHalf = timeSeries.slice(0, Math.floor(timeSeries.length / 2));
    const secondHalf = timeSeries.slice(Math.floor(timeSeries.length / 2));

    const autocorrelationTrend = this.calculateAutocorrelation(secondHalf, 1) -
                                  this.calculateAutocorrelation(firstHalf, 1);
    const varianceTrend = (this.calculateVariance(secondHalf) / (this.calculateVariance(firstHalf) + 0.001)) - 1;
    const crossCorrelation = Math.abs(autocorrelation) * 0.8;
    const crossCorrelationTrend = autocorrelationTrend * 0.7;

    // Recovery rate
    const recoveryRate = this.estimateRecoveryRate(timeSeries);

    // 2025: Extended indicators
    const dfaExponent = this.calculateDFA(timeSeries);
    const skewness = this.calculateSkewness(timeSeries);
    const skewnessFirst = this.calculateSkewness(firstHalf);
    const skewnessSecond = this.calculateSkewness(secondHalf);
    const skewnessChange = Math.abs(skewnessSecond - skewnessFirst);

    const flickeringScore = this.detectFlickering(timeSeries);
    const periodicityScore = this.detectPeriodicity(timeSeries);

    // Composite score
    const compositeScore = this.calculateCompositeScore(
      autocorrelation,
      varianceRatio,
      recoveryRate,
      dfaExponent,
      flickeringScore
    );

    // Criticality level
    let criticalityLevel: 'low' | 'warning' | 'critical' = 'low';
    if (compositeScore > 0.7 || autocorrelation > EWS_THRESHOLDS.autocorrelation.critical) {
      criticalityLevel = 'critical';
    } else if (compositeScore > 0.5 || autocorrelation > EWS_THRESHOLDS.autocorrelation.warning) {
      criticalityLevel = 'warning';
    }

    return {
      autocorrelation,
      autocorrelationTrend,
      variance: varianceRatio,
      varianceTrend,
      crossCorrelation,
      crossCorrelationTrend,
      recoveryRate,
      dfaExponent,
      skewness,
      skewnessChange,
      flickeringScore,
      periodicityScore,
      compositeScore,
      criticalityLevel,
    };
  }

  private calculateAutocorrelation(series: number[], lag: number): number {
    if (series.length <= lag) return 0;

    const n = series.length - lag;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (series[i] - mean) * (series[i + lag] - mean);
    }

    for (let i = 0; i < series.length; i++) {
      denominator += (series[i] - mean) ** 2;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVariance(series: number[]): number {
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    return series.reduce((sum, x) => sum + (x - mean) ** 2, 0) / series.length;
  }

  private calculateSkewness(series: number[]): number {
    const n = series.length;
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(this.calculateVariance(series));

    if (std === 0) return 0;

    return series.reduce((sum, x) => sum + Math.pow((x - mean) / std, 3), 0) / n;
  }

  private estimateRecoveryRate(series: number[]): number {
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const recoveryRates: number[] = [];

    for (let i = 1; i < series.length - 1; i++) {
      const deviation = Math.abs(series[i] - mean);
      if (deviation > 0.1) {
        const recovery = Math.abs(series[i + 1] - mean) / (deviation + 0.001);
        recoveryRates.push(1 - recovery);
      }
    }

    return recoveryRates.length > 0
      ? recoveryRates.reduce((a, b) => a + b, 0) / recoveryRates.length
      : 0.5;
  }

  /**
   * Detrended Fluctuation Analysis (DFA)
   * 2025: Detects long-range correlations
   */
  private calculateDFA(series: number[]): number {
    if (series.length < 16) return 0.5;

    // Cumulative sum (profile)
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const profile = series.map((_, i) =>
      series.slice(0, i + 1).reduce((sum, x) => sum + (x - mean), 0)
    );

    // Window sizes (log-spaced)
    const scales = [4, 8, 16];
    const fluctuations: number[] = [];

    for (const s of scales) {
      if (s > series.length / 4) continue;

      const numWindows = Math.floor(profile.length / s);
      let totalFluctuation = 0;

      for (let i = 0; i < numWindows; i++) {
        const window = profile.slice(i * s, (i + 1) * s);

        // Linear detrend
        const trend = this.linearFit(window);
        const detrended = window.map((y, x) => y - (trend.slope * x + trend.intercept));

        // RMS
        const rms = Math.sqrt(detrended.reduce((sum, d) => sum + d * d, 0) / s);
        totalFluctuation += rms;
      }

      fluctuations.push(totalFluctuation / numWindows);
    }

    // Fit log-log slope (DFA exponent)
    if (fluctuations.length < 2) return 0.5;

    const logScales = scales.slice(0, fluctuations.length).map(s => Math.log(s));
    const logFluc = fluctuations.map(f => Math.log(f + 0.001));

    const fit = this.linearFit(logFluc, logScales);
    return Math.max(0, Math.min(1.5, fit.slope));
  }

  /**
   * Detect flickering between states
   * 2025: Signature of approaching bifurcation
   */
  private detectFlickering(series: number[]): number {
    if (series.length < 10) return 0;

    // Find bimodal distribution
    const histogram = new Array(10).fill(0);
    for (const value of series) {
      const bin = Math.min(9, Math.floor(value * 10));
      histogram[bin]++;
    }

    // Find peaks
    const peaks: number[] = [];
    for (let i = 1; i < histogram.length - 1; i++) {
      if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1]) {
        peaks.push(i);
      }
    }

    if (peaks.length < 2) return 0;

    // Count transitions between modes
    const threshold = (peaks[0] + peaks[1]) / 2 / 10;
    let transitions = 0;

    for (let i = 1; i < series.length; i++) {
      if ((series[i - 1] < threshold && series[i] >= threshold) ||
          (series[i - 1] >= threshold && series[i] < threshold)) {
        transitions++;
      }
    }

    // Flickering score
    return Math.min(1, transitions / (series.length / 5));
  }

  /**
   * Detect periodicity (Hopf bifurcation signature)
   */
  private detectPeriodicity(series: number[]): number {
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    let crossings = 0;

    for (let i = 1; i < series.length; i++) {
      if ((series[i - 1] < mean && series[i] >= mean) ||
          (series[i - 1] >= mean && series[i] < mean)) {
        crossings++;
      }
    }

    const expectedCrossings = (series.length - 1) * 0.5;
    return Math.min(1, crossings / expectedCrossings);
  }

  private calculateCompositeScore(
    autocorrelation: number,
    varianceRatio: number,
    recoveryRate: number,
    dfaExponent: number,
    flickeringScore: number
  ): number {
    // Normalize each indicator
    const acScore = Math.min(1, Math.max(0, (autocorrelation - 0.5) / 0.5));
    const varScore = Math.min(1, Math.max(0, (varianceRatio - 1) / 2));
    const recScore = Math.min(1, Math.max(0, 1 - recoveryRate));
    const dfaScore = Math.min(1, Math.max(0, (dfaExponent - 0.5) / 0.5));

    // 2025: Include flickering
    return acScore * 0.3 + varScore * 0.25 + recScore * 0.2 + dfaScore * 0.15 + flickeringScore * 0.1;
  }

  // ==========================================================================
  // PRIVATE: BIFURCATION CLASSIFICATION
  // ==========================================================================

  private assessApproach(
    ews: IEarlyWarningSignals,
    currentValue: number,
    threshold: { crisis: number; recovery: number; direction: 'high' | 'low'; weight: number }
  ): { isApproaching: boolean; distance: number; urgency: 'low' | 'medium' | 'high' | 'critical' } {
    const criticalValue = threshold.direction === 'high' ? threshold.crisis : threshold.recovery;
    const distance = threshold.direction === 'high'
      ? criticalValue - currentValue
      : currentValue - criticalValue;

    // Check conditions
    const ewsWarning = ews.compositeScore > 0.5 ||
                       ews.autocorrelation > EWS_THRESHOLDS.autocorrelation.warning;
    const nearThreshold = distance < 0.3;
    const trendingTowards = threshold.direction === 'high'
      ? ews.varianceTrend > 0.1
      : ews.varianceTrend < -0.1;

    // 2025: Check flickering
    const flickeringWarning = ews.flickeringScore > EWS_THRESHOLDS.flickeringThreshold;

    const isApproaching = ewsWarning && (nearThreshold || trendingTowards || flickeringWarning);

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (distance < 0.1 && ews.compositeScore > 0.7) {
      urgency = 'critical';
    } else if (distance < 0.2 && ews.compositeScore > 0.5) {
      urgency = 'high';
    } else if (isApproaching) {
      urgency = 'medium';
    }

    return { isApproaching, distance, urgency };
  }

  private classifyBifurcation(timeSeries: number[], ews: IEarlyWarningSignals): BifurcationType {
    const oscillation = this.detectPeriodicity(timeSeries);
    const bistability = this.detectFlickering(timeSeries);

    // 2025: Period doubling detection
    if (oscillation > 0.6 && ews.periodicityScore > 0.5) {
      // Check for period doubling signature
      const periodDoubling = this.detectPeriodDoubling(timeSeries);
      if (periodDoubling > 0.4) return 'period_doubling';
      return 'hopf';
    }

    // Saddle-node
    if (ews.autocorrelationTrend > 0.2 && ews.varianceTrend > 0.3 && Math.abs(ews.skewness) > 0.5) {
      return 'saddle_node';
    }

    // Fold
    if (bistability > 0.4) {
      return 'fold_bifurcation';
    }

    // 2025: Blue sky (catastrophic transition)
    if (ews.compositeScore > 0.8 && ews.dfaExponent > 0.9) {
      return 'blue_sky';
    }

    // Transcritical
    if (ews.autocorrelationTrend > 0.1 && Math.abs(ews.skewness) < 0.3) {
      return 'transcritical';
    }

    // Pitchfork
    if (Math.abs(ews.skewness) > 0.8 && bistability > 0.3) {
      return 'pitchfork';
    }

    return 'unknown';
  }

  /**
   * Detect period doubling (route to chaos)
   */
  private detectPeriodDoubling(series: number[]): number {
    if (series.length < 16) return 0;

    // Calculate autocorrelation at different lags
    const ac1 = this.calculateAutocorrelation(series, 1);
    const ac2 = this.calculateAutocorrelation(series, 2);
    const ac4 = this.calculateAutocorrelation(series, 4);

    // Period doubling: stronger correlation at double periods
    if (ac2 > ac1 * 1.2 || ac4 > ac2 * 1.2) {
      return 0.6;
    }

    return 0;
  }

  // ==========================================================================
  // PRIVATE: TIMING AND PREDICTION
  // ==========================================================================

  private estimateTiming(
    timeSeries: number[],
    ews: IEarlyWarningSignals,
    currentValue: number,
    threshold: { crisis: number; recovery: number; direction: 'high' | 'low'; weight: number }
  ): { days: number; confidenceInterval: [number, number] } {
    const criticalValue = threshold.direction === 'high' ? threshold.crisis : threshold.recovery;
    const distance = Math.abs(criticalValue - currentValue);

    // Calculate trend
    const recentTrend = this.calculateTrend(timeSeries.slice(-7));

    let days: number;
    if (Math.abs(recentTrend) > 0.001) {
      const approachingRate = threshold.direction === 'high' ? recentTrend : -recentTrend;
      if (approachingRate > 0) {
        days = distance / approachingRate;
      } else {
        days = 365;
      }
    } else {
      days = ews.compositeScore > 0.5 ? 14 : 30;
    }

    days = Math.max(1, Math.min(365, days));

    // Confidence interval
    const uncertainty = Math.sqrt(ews.variance) * days;
    const lowerBound = Math.max(1, days - uncertainty);
    const upperBound = days + uncertainty;

    return {
      days,
      confidenceInterval: [lowerBound, upperBound] as [number, number],
    };
  }

  private calculateTrend(series: number[]): number {
    if (series.length < 2) return 0;

    const n = series.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = series.reduce((a, b) => a + b, 0);
    const sumXY = series.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private fitExponentialApproach(series: number[], threshold: number): { rate: number; r2: number } {
    if (series.length < 3) return { rate: 0, r2: 0 };

    const logDistances: number[] = [];
    const times: number[] = [];

    for (let i = 0; i < series.length; i++) {
      const distance = Math.abs(threshold - series[i]);
      if (distance > 0.01) {
        logDistances.push(Math.log(distance));
        times.push(i);
      }
    }

    if (logDistances.length < 2) return { rate: 0, r2: 0 };

    const fit = this.linearFit(logDistances, times);
    const rate = -fit.slope;

    // R² calculation
    const meanLogD = logDistances.reduce((a, b) => a + b, 0) / logDistances.length;
    const ssTotal = logDistances.reduce((sum, d) => sum + (d - meanLogD) ** 2, 0);
    const predictions = times.map(t => fit.intercept + fit.slope * t);
    const ssResidual = predictions.reduce((sum, pred, i) =>
      sum + (logDistances[i] - pred) ** 2, 0
    );
    const r2 = ssTotal > 0 ? Math.max(0, 1 - ssResidual / ssTotal) : 0;

    return { rate: Math.max(0, rate), r2 };
  }

  private linearFit(y: number[], x?: number[]): { slope: number; intercept: number } {
    const n = y.length;
    const xVals = x || Array.from({ length: n }, (_, i) => i);

    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = xVals.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  // ==========================================================================
  // PRIVATE: ATTRACTORS AND LANDSCAPE
  // ==========================================================================

  private classifyAttractor(twin: IDigitalTwinState): AttractorType {
    if (twin.lyapunovExponent > 0) return 'strange';
    if (twin.stability === 'stable') return 'point';
    if (twin.stability === 'metastable') return 'limit_cycle';
    if (twin.stability === 'transitioning') return 'quasi_periodic';
    return 'none';
  }

  private predictPostTransition(
    bifurcationType: BifurcationType,
    threshold: { crisis: number; recovery: number; direction: 'high' | 'low'; weight: number }
  ): AttractorType {
    if (threshold.direction === 'high') {
      // Transitioning to worse state
      if (bifurcationType === 'hopf' || bifurcationType === 'period_doubling') {
        return 'limit_cycle';
      }
      return 'strange';
    } else {
      // Transitioning to better state
      return 'point';
    }
  }

  private calculateIrreversibility(bifurcationType: BifurcationType, ews: IEarlyWarningSignals): number {
    const baseIrreversibility: Record<BifurcationType, number> = {
      saddle_node: 0.8,
      fold_bifurcation: 0.9,
      hopf: 0.3,
      transcritical: 0.5,
      pitchfork: 0.6,
      period_doubling: 0.4,
      blue_sky: 0.95,
      unknown: 0.5,
    };

    let irreversibility = baseIrreversibility[bifurcationType];
    irreversibility *= (0.5 + ews.compositeScore * 0.5);

    return Math.min(1, irreversibility);
  }

  private calculatePreventionProbability(days: number, ews: IEarlyWarningSignals): number {
    const timeFactor = Math.min(1, days / 14);
    const ewsFactor = 1 - ews.compositeScore;

    return timeFactor * 0.6 + ewsFactor * 0.4;
  }

  private identifyAttractors(twin: IDigitalTwinState): IAttractorBasin[] {
    return [
      {
        attractorId: 'healthy',
        attractorType: 'point',
        centerState: new Map([
          ['emotion_anxiety', 0.2],
          ['emotion_sadness', 0.2],
          ['physio_sleep_quality', 0.8],
          ['social_engagement', 0.7],
        ]),
        basinSize: 0.4,
        basinDepth: 0.6,
        escapeVelocity: 0.5,
        neighboringAttractors: ['stressed'],
      },
      {
        attractorId: 'stressed',
        attractorType: 'point',
        centerState: new Map([
          ['emotion_anxiety', 0.5],
          ['emotion_sadness', 0.4],
          ['physio_sleep_quality', 0.5],
          ['social_engagement', 0.5],
        ]),
        basinSize: 0.3,
        basinDepth: 0.4,
        escapeVelocity: 0.3,
        neighboringAttractors: ['healthy', 'crisis'],
      },
      {
        attractorId: 'crisis',
        attractorType: 'strange',
        centerState: new Map([
          ['emotion_anxiety', 0.85],
          ['emotion_sadness', 0.8],
          ['physio_sleep_quality', 0.2],
          ['social_engagement', 0.2],
        ]),
        basinSize: 0.3,
        basinDepth: 0.7,
        escapeVelocity: 0.8,
        neighboringAttractors: ['stressed'],
      },
    ];
  }

  private findCurrentAttractor(twin: IDigitalTwinState, attractors: IAttractorBasin[]): IAttractorBasin | null {
    let minDistance = Infinity;
    let closest: IAttractorBasin | null = null;

    for (const attractor of attractors) {
      let distance = 0;
      let count = 0;

      for (const [varId, centerValue] of Array.from(attractor.centerState)) {
        const twinVar = twin.variables.get(varId);
        if (twinVar) {
          distance += (twinVar.value - centerValue) ** 2;
          count++;
        }
      }

      distance = count > 0 ? Math.sqrt(distance / count) : Infinity;

      if (distance < minDistance) {
        minDistance = distance;
        closest = attractor;
      }
    }

    return closest;
  }

  private calculateBasinPosition(twin: IDigitalTwinState, attractor: IAttractorBasin | null): number[] {
    if (!attractor) return [0.5, 0.5];

    const position: number[] = [];
    for (const [varId, centerValue] of Array.from(attractor.centerState)) {
      const twinVar = twin.variables.get(varId);
      if (twinVar) {
        position.push(twinVar.value - centerValue);
      }
    }

    return position;
  }

  private findTransitionPath(attractors: IAttractorBasin[], current: IAttractorBasin | null): string[] {
    if (!current) return [];

    const path: string[] = [current.attractorId];
    const visited = new Set([current.attractorId]);

    let node = current;
    while (node.neighboringAttractors.length > 0) {
      const next = node.neighboringAttractors.find(n => !visited.has(n));
      if (!next) break;

      path.push(next);
      visited.add(next);

      const nextAttractor = attractors.find(a => a.attractorId === next);
      if (!nextAttractor) break;

      node = nextAttractor;
    }

    return path;
  }

  // ==========================================================================
  // PRIVATE: INTERVENTIONS
  // ==========================================================================

  private findInterventions(
    varId: string,
    urgency: 'low' | 'medium' | 'high' | 'critical'
  ): IInterventionRecommendation[] {
    const baseInterventions = INTERVENTION_MAPPING[varId] || [];

    return baseInterventions
      .map(int => ({
        ...int,
        urgency: urgency as 'low' | 'medium' | 'high' | 'critical',
      }))
      .sort((a, b) => Math.abs(b.expectedEffect) - Math.abs(a.expectedEffect));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const bifurcationEngine = new BifurcationEngine();
