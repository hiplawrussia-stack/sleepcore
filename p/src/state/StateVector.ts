/**
 * 🧬 STATE VECTOR IMPLEMENTATION
 * ==============================
 * Complete State Vector with Immutable Builder Pattern
 *
 * Design Principles:
 * - Immutable state (all readonly)
 * - Builder pattern for construction
 * - Factory for complex creation scenarios
 * - Type-safe with full TypeScript support
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IStateVector,
  IStateVectorBuilder,
  BeliefState,
  StateQuality,
  StateTransition,
  TemporalPrediction,
  StateSummary,
  StateBasedRecommendation,
  ObservationSource,
  WELLBEING_WEIGHTS,
  getComponentStatus,
} from './interfaces/IStateVector';
import type { IEmotionalState, ScoredEmotion, VADDimensions, EmotionTrend } from './interfaces/IEmotionalState';
import type { ICognitiveState, CognitiveTriad, AttentionalBias, ThinkingStyle, CognitiveLoad, Metacognition } from './interfaces/ICognitiveState';
import type { INarrativeState, ChangeStage, NarrativeRole, NarrativeMomentum } from './interfaces/INarrativeState';
import type { IRiskState, RiskLevel, RiskTrajectory, SafetyPlan, SupportNetwork, LethalMeansAssessment } from './interfaces/IRiskState';
import type { IResourceState, PERMADimensions, EnergyLevel, CognitiveCapacity, SelfEfficacy, Resilience, TimeResources, HopeOptimism, SocialResources } from './interfaces/IResourceState';

/**
 * Default Emotional State
 */
function createDefaultEmotionalState(): IEmotionalState {
  return {
    primary: { emotion: 'neutral', confidence: 0.5, intensity: 0.3 },
    secondary: [],
    intensity: 0.3,
    vad: { valence: 0, arousal: 0, dominance: 0.5 },
    trend: 'stable',
    volatility: 0.3,
    patterns: [],
    effectiveStrategies: [],
    timestamp: new Date(),
    confidence: 0.5,
    source: 'behavioral_inference',
    dataQuality: 0.5,
  };
}

/**
 * Default Cognitive State
 */
function createDefaultCognitiveState(): ICognitiveState {
  return {
    coreBeliefs: {
      selfView: 0,
      worldView: 0,
      futureView: 0,
      confidence: { self: 0.5, world: 0.5, future: 0.5 },
    },
    activeDistortions: [],
    distortionIntensity: 0,
    beliefUncertainty: 0.5,
    attentionalBias: 'neutral',
    thinkingStyle: {
      analyticalVsIntuitive: 0.5,
      abstractVsConcrete: 0.5,
      locusOfControl: 'balanced',
      flexibility: 0.5,
    },
    coreBeliefPatterns: [],
    cognitiveLoad: {
      current: 0.3,
      factors: [],
      availableResources: 0.7,
    },
    metacognition: {
      selfAwareness: 0.5,
      defusion: 0.5,
      changeBeliefs: 0.5,
      metaWorry: 0.3,
    },
    recentUpdates: [],
    timestamp: new Date(),
    confidence: 0.5,
    dataQuality: 0.5,
  };
}

/**
 * Default Narrative State
 */
function createDefaultNarrativeState(): INarrativeState {
  const now = new Date();
  return {
    stage: 'precontemplation',
    daysInCurrentStage: 0,
    stageHistory: [{ stage: 'precontemplation', enteredAt: now, duration: 0 }],
    role: 'explorer',
    roleHistory: [{ role: 'explorer', startedAt: now }],
    progressPercent: 0,
    breakthroughs: [],
    setbacks: [],
    momentum: {
      direction: 0,
      velocity: 0.3,
      stability: 0.5,
      accelerators: [],
      barriers: [],
    },
    chapters: [],
    currentChapter: {
      id: uuidv4(),
      title: 'Начало',
      startDate: now,
      dominantStage: 'precontemplation',
      dominantRole: 'explorer',
      keyMoments: [],
      overallTone: 'neutral',
    },
    themes: [],
    values: {
      identified: [],
      meaningSource: 'mixed',
      purposeClarity: 0.3,
    },
    projections: [],
    possibleTransitions: [],
    timestamp: now,
    confidence: 0.5,
    dataQuality: 0.5,
  };
}

/**
 * Default Risk State
 */
function createDefaultRiskState(): IRiskState {
  return {
    level: 'none',
    confidence: 0.8,
    trajectory: 'stable',
    riskFactors: [],
    protectiveFactors: [],
    earlyWarnings: [],
    categoryRisks: {
      self_harm: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      suicidal_ideation: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      substance_use: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      behavioral: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      relational: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      emotional_crisis: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      digital_addiction: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      social_isolation: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      academic_crisis: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
      family_crisis: { level: 'none', confidence: 0.8, lastAssessed: new Date() },
    },
    safetyPlan: {
      exists: false,
      completeness: 0,
      components: [],
    },
    supportNetwork: {
      size: 0,
      quality: 0.5,
      accessibility: 0.5,
      diversity: 0.3,
      primarySupports: [],
    },
    lethalMeans: {
      assessed: false,
      accessToMeans: 'unknown',
      meansRestrictionDiscussed: false,
      safetyStepsCompleted: [],
    },
    crisisHistory: [],
    effectiveInterventions: [],
    predictions: [],
    daysSinceLastCrisis: null,
    stabilizationPhase: 'stable',
    timestamp: new Date(),
    dataQuality: 0.5,
    assessmentMethod: 'automated',
  };
}

/**
 * Default Resource State
 */
function createDefaultResourceState(): IResourceState {
  return {
    perma: {
      positiveEmotion: 0.5,
      engagement: 0.5,
      relationships: 0.5,
      meaning: 0.5,
      accomplishment: 0.5,
    },
    permaScore: 0.5,
    copingStrategies: [],
    effectiveStrategies: [],
    energy: {
      current: 0.6,
      baseline: 0.6,
      trend: 'stable',
      factors: [],
    },
    cognitiveCapacity: {
      available: 0.7,
      currentLoad: 0.3,
      optimal: 0.8,
      loadSources: [],
    },
    selfEfficacy: {
      general: 0.5,
      domains: {},
      masteryExperiences: [],
    },
    resilience: {
      score: 0.5,
      components: {
        adaptability: 0.5,
        persistence: 0.5,
        optimism: 0.5,
        selfRegulation: 0.5,
        socialSupport: 0.5,
      },
      recoveryHistory: [],
    },
    socialResources: {
      network: {
        size: 0,
        qualityScore: 0.5,
        diversityScore: 0.3,
        accessibilityScore: 0.5,
      },
      supportTypes: {
        emotional: 0.5,
        instrumental: 0.5,
        informational: 0.5,
        companionship: 0.5,
      },
      keyRelationships: [],
      isolationRisk: 0.3,
    },
    timeResources: {
      perceived: 0.5,
      selfCareTime: 'adequate',
      pressure: 0.3,
      balance: {
        work_life: 0.5,
        rest_activity: 0.5,
        solitude_social: 0.5,
      },
    },
    hopeOptimism: {
      hope: {
        agency: 0.5,
        pathways: 0.5,
        overall: 0.5,
      },
      optimism: {
        generalExpectancy: 0.5,
        explanatoryStyle: 'mixed',
      },
      futureOrientation: {
        clarity: 0.5,
        motivation: 0.5,
        confidence: 0.5,
      },
    },
    depletionWarnings: [],
    strengths: [],
    overallAvailability: 0.6,
    timestamp: new Date(),
    confidence: 0.5,
    dataQuality: 0.5,
  };
}

/**
 * Immutable State Vector Implementation
 */
export class StateVector implements IStateVector {
  readonly id: string;
  readonly userId: string | number;
  readonly timestamp: Date;

  readonly emotional: IEmotionalState;
  readonly cognitive: ICognitiveState;
  readonly narrative: INarrativeState;
  readonly risk: IRiskState;
  readonly resources: IResourceState;

  readonly belief: BeliefState;
  readonly quality: StateQuality;
  readonly recentTransitions: StateTransition[];
  readonly predictions: TemporalPrediction[];
  readonly summary: StateSummary;
  readonly recommendations: StateBasedRecommendation[];

  readonly wellbeingIndex: number;
  readonly stabilityIndex: number;
  readonly resilienceIndex: number;
  readonly interventionUrgency: number;

  private constructor(params: {
    id: string;
    userId: string | number;
    timestamp: Date;
    emotional: IEmotionalState;
    cognitive: ICognitiveState;
    narrative: INarrativeState;
    risk: IRiskState;
    resources: IResourceState;
    belief: BeliefState;
    quality: StateQuality;
    recentTransitions: StateTransition[];
    predictions: TemporalPrediction[];
    summary: StateSummary;
    recommendations: StateBasedRecommendation[];
    wellbeingIndex: number;
    stabilityIndex: number;
    resilienceIndex: number;
    interventionUrgency: number;
  }) {
    this.id = params.id;
    this.userId = params.userId;
    this.timestamp = params.timestamp;
    this.emotional = params.emotional;
    this.cognitive = params.cognitive;
    this.narrative = params.narrative;
    this.risk = params.risk;
    this.resources = params.resources;
    this.belief = params.belief;
    this.quality = params.quality;
    this.recentTransitions = params.recentTransitions;
    this.predictions = params.predictions;
    this.summary = params.summary;
    this.recommendations = params.recommendations;
    this.wellbeingIndex = params.wellbeingIndex;
    this.stabilityIndex = params.stabilityIndex;
    this.resilienceIndex = params.resilienceIndex;
    this.interventionUrgency = params.interventionUrgency;
  }

  /**
   * Create a builder for new StateVector
   */
  static builder(): StateVectorBuilder {
    return new StateVectorBuilder();
  }

  /**
   * Create initial state for new user
   */
  static createInitial(userId: string | number): StateVector {
    return StateVector.builder()
      .setUserId(userId)
      .setEmotionalState(createDefaultEmotionalState())
      .setCognitiveState(createDefaultCognitiveState())
      .setNarrativeState(createDefaultNarrativeState())
      .setRiskState(createDefaultRiskState())
      .setResourceState(createDefaultResourceState())
      .build();
  }

  /**
   * Create a copy with updates (immutable update pattern)
   */
  with(updates: Partial<{
    emotional: IEmotionalState;
    cognitive: ICognitiveState;
    narrative: INarrativeState;
    risk: IRiskState;
    resources: IResourceState;
  }>): StateVector {
    const builder = StateVector.builder()
      .setUserId(this.userId)
      .setEmotionalState(updates.emotional ?? this.emotional)
      .setCognitiveState(updates.cognitive ?? this.cognitive)
      .setNarrativeState(updates.narrative ?? this.narrative)
      .setRiskState(updates.risk ?? this.risk)
      .setResourceState(updates.resources ?? this.resources);

    // Copy transitions and add new one
    this.recentTransitions.forEach(t => builder.addTransition(t));
    this.predictions.forEach(p => builder.addPrediction(p));
    this.recommendations.forEach(r => builder.addRecommendation(r));

    return builder.build();
  }
}

/**
 * State Vector Builder Implementation
 */
class StateVectorBuilder implements IStateVectorBuilder {
  private userId: string | number = '';
  private emotional: IEmotionalState = createDefaultEmotionalState();
  private cognitive: ICognitiveState = createDefaultCognitiveState();
  private narrative: INarrativeState = createDefaultNarrativeState();
  private risk: IRiskState = createDefaultRiskState();
  private resources: IResourceState = createDefaultResourceState();
  private belief: BeliefState | null = null;
  private transitions: StateTransition[] = [];
  private predictions: TemporalPrediction[] = [];
  private recommendations: StateBasedRecommendation[] = [];

  setUserId(userId: string | number): this {
    this.userId = userId;
    return this;
  }

  setEmotionalState(state: IEmotionalState): this {
    this.emotional = state;
    return this;
  }

  setCognitiveState(state: ICognitiveState): this {
    this.cognitive = state;
    return this;
  }

  setNarrativeState(state: INarrativeState): this {
    this.narrative = state;
    return this;
  }

  setRiskState(state: IRiskState): this {
    this.risk = state;
    return this;
  }

  setResourceState(state: IResourceState): this {
    this.resources = state;
    return this;
  }

  setBelief(belief: BeliefState): this {
    this.belief = belief;
    return this;
  }

  addTransition(transition: StateTransition): this {
    this.transitions.push(transition);
    return this;
  }

  addPrediction(prediction: TemporalPrediction): this {
    this.predictions.push(prediction);
    return this;
  }

  addRecommendation(recommendation: StateBasedRecommendation): this {
    this.recommendations.push(recommendation);
    return this;
  }

  build(): StateVector {
    const timestamp = new Date();

    // Calculate quality
    const quality = this.calculateQuality();

    // Calculate indices
    const wellbeingIndex = this.calculateWellbeingIndex();
    const stabilityIndex = this.calculateStabilityIndex();
    const resilienceIndex = this.calculateResilienceIndex();
    const interventionUrgency = this.calculateInterventionUrgency();

    // Generate summary
    const summary = this.generateSummary(wellbeingIndex);

    // Create belief state if not provided
    const belief = this.belief ?? {
      confidence: quality.overall,
      entropy: 1 - quality.overall,
      lastObservation: {
        source: 'inference' as ObservationSource,
        timestamp,
        informationGain: 0,
      },
      observationCount: 1,
    };

    return new (StateVector as any)({
      id: uuidv4(),
      userId: this.userId,
      timestamp,
      emotional: this.emotional,
      cognitive: this.cognitive,
      narrative: this.narrative,
      risk: this.risk,
      resources: this.resources,
      belief,
      quality,
      recentTransitions: this.transitions.slice(-10), // Keep last 10
      predictions: this.predictions,
      summary,
      recommendations: this.recommendations,
      wellbeingIndex,
      stabilityIndex,
      resilienceIndex,
      interventionUrgency,
    });
  }

  private calculateQuality(): StateQuality {
    const components = {
      emotional: this.emotional.dataQuality,
      cognitive: this.cognitive.dataQuality,
      narrative: this.narrative.dataQuality,
      risk: this.risk.dataQuality,
      resources: this.resources.dataQuality,
    };

    const overall = (
      components.emotional +
      components.cognitive +
      components.narrative +
      components.risk +
      components.resources
    ) / 5;

    const now = Date.now();
    const staleness = {
      emotional: (now - this.emotional.timestamp.getTime()) / 1000,
      cognitive: (now - this.cognitive.timestamp.getTime()) / 1000,
      narrative: (now - this.narrative.timestamp.getTime()) / 1000,
      risk: (now - this.risk.timestamp.getTime()) / 1000,
      resources: (now - this.resources.timestamp.getTime()) / 1000,
    };

    return {
      overall,
      components,
      staleness,
      sufficient: overall > 0.4,
    };
  }

  private calculateWellbeingIndex(): number {
    // Emotional contribution (normalized VAD)
    const emotionalScore = (
      (this.emotional.vad.valence + 1) / 2 * 0.4 +  // Valence most important
      (this.emotional.vad.dominance + 1) / 2 * 0.3 +
      (1 - this.emotional.intensity * (this.emotional.vad.valence < 0 ? 1 : 0)) * 0.3
    );

    // Cognitive contribution
    const cognitiveScore = (
      (this.cognitive.coreBeliefs.selfView + 1) / 2 * 0.4 +
      (this.cognitive.coreBeliefs.futureView + 1) / 2 * 0.3 +
      (1 - this.cognitive.distortionIntensity) * 0.3
    );

    // Narrative contribution
    const stageProgress: Record<string, number> = {
      precontemplation: 0.1,
      contemplation: 0.3,
      preparation: 0.5,
      action: 0.7,
      maintenance: 0.9,
      relapse: 0.2,
    };
    const narrativeScore = stageProgress[this.narrative.stage] ?? 0.5;

    // Risk contribution (inverse - lower risk = higher wellbeing)
    const riskScores: Record<RiskLevel, number> = {
      none: 1.0,
      low: 0.8,
      medium: 0.5,
      high: 0.2,
      critical: 0.0,
    };
    const riskScore = riskScores[this.risk.level] ?? 0.5;

    // Resources contribution (PERMA)
    const resourceScore = this.resources.permaScore;

    // Weighted combination
    const index = (
      emotionalScore * 0.25 +
      cognitiveScore * 0.20 +
      narrativeScore * 0.15 +
      riskScore * 0.20 +
      resourceScore * 0.20
    ) * 100;

    return Math.round(Math.max(0, Math.min(100, index)));
  }

  private calculateStabilityIndex(): number {
    // Emotional volatility
    const emotionalStability = 1 - this.emotional.volatility;

    // Cognitive stability (less distortions = more stable)
    const cognitiveStability = 1 - this.cognitive.distortionIntensity;

    // Narrative momentum stability
    const narrativeStability = this.narrative.momentum.stability;

    // Risk trajectory
    const riskStability = this.risk.trajectory === 'stable' ? 1.0 :
      this.risk.trajectory === 'improving' ? 0.8 :
      this.risk.trajectory === 'declining' ? 0.3 : 0.2;

    // Resource energy trend
    const resourceStability = this.resources.energy.trend === 'stable' ? 1.0 :
      this.resources.energy.trend === 'restoring' ? 0.8 : 0.4;

    const index = (
      emotionalStability * 0.25 +
      cognitiveStability * 0.20 +
      narrativeStability * 0.20 +
      riskStability * 0.20 +
      resourceStability * 0.15
    ) * 100;

    return Math.round(Math.max(0, Math.min(100, index)));
  }

  private calculateResilienceIndex(): number {
    return Math.round(this.resources.resilience.score * 100);
  }

  private calculateInterventionUrgency(): number {
    // Risk-driven urgency
    const riskUrgency: Record<RiskLevel, number> = {
      critical: 100,
      high: 80,
      medium: 50,
      low: 20,
      none: 0,
    };

    // Emotional urgency (negative valence + high arousal = urgent)
    const emotionalUrgency = this.emotional.vad.valence < 0 ?
      ((Math.abs(this.emotional.vad.valence) + this.emotional.vad.arousal) / 2) * 100 : 0;

    // Cognitive urgency (high distortion intensity)
    const cognitiveUrgency = this.cognitive.distortionIntensity * 70;

    // Resource depletion urgency
    const resourceUrgency = (1 - this.resources.overallAvailability) * 60;

    // Take maximum urgency
    const urgency = Math.max(
      riskUrgency[this.risk.level] ?? 0,
      emotionalUrgency,
      cognitiveUrgency,
      resourceUrgency
    );

    return Math.round(Math.max(0, Math.min(100, urgency)));
  }

  private generateSummary(wellbeingIndex: number): StateSummary {
    const insights: string[] = [];
    const concerns: string[] = [];
    const positives: string[] = [];
    const focusAreas: string[] = [];

    // Emotional insights
    if (this.emotional.vad.valence > 0.3) {
      positives.push('Позитивный эмоциональный фон');
    } else if (this.emotional.vad.valence < -0.3) {
      concerns.push('Негативное эмоциональное состояние');
      focusAreas.push('Эмоциональная регуляция');
    }

    // Cognitive insights
    if (this.cognitive.distortionIntensity > 0.5) {
      insights.push(`Обнаружены когнитивные искажения`);
      focusAreas.push('Когнитивная работа');
    }

    // Narrative insights
    if (this.narrative.momentum.direction > 0.3) {
      positives.push('Положительная динамика изменений');
    } else if (this.narrative.momentum.direction < -0.3) {
      concerns.push('Замедление или откат прогресса');
    }

    // Risk insights
    if (this.risk.level !== 'none') {
      concerns.push(`Уровень риска: ${this.risk.level}`);
      focusAreas.push('Безопасность');
    }

    // Resource insights
    if (this.resources.energy.current < 0.3) {
      concerns.push('Низкий уровень энергии');
      focusAreas.push('Восстановление ресурсов');
    }
    if (this.resources.permaScore > 0.7) {
      positives.push('Высокий уровень благополучия (PERMA)');
    }

    // Brief summary
    let brief: string;
    if (wellbeingIndex >= 80) {
      brief = 'Отличное общее состояние';
    } else if (wellbeingIndex >= 60) {
      brief = 'Хорошее состояние с некоторыми областями для внимания';
    } else if (wellbeingIndex >= 40) {
      brief = 'Умеренное состояние, есть области требующие поддержки';
    } else if (wellbeingIndex >= 20) {
      brief = 'Сниженное состояние, рекомендуется активная поддержка';
    } else {
      brief = 'Критическое состояние, требуется немедленная помощь';
    }

    return {
      brief,
      insights,
      concerns,
      positives,
      focusAreas,
      wellbeingScore: wellbeingIndex,
    };
  }
}
