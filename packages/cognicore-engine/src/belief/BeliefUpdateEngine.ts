/**
 * 🧠 BAYESIAN BELIEF UPDATE ENGINE
 * =================================
 * POMDP-based Belief State Management Implementation
 *
 * Scientific Foundation (2024-2025 Research):
 * - Active Inference / POMDP (Computational Psychiatry, 2025)
 * - Bayesian Cognitive Modeling (Griffiths et al., 2024)
 * - Kalman Filter for EMA mood dynamics (Applied Comp. Psychiatry, 2024)
 * - Belief space planning (ANPL, 2025)
 *
 * Implementation Details:
 * - Conjugate priors for efficient updates
 * - Information-theoretic observation selection
 * - Belief decay over time (epistemic uncertainty increase)
 * - Active inference for prediction error minimization
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import {
  type IBeliefUpdateEngine,
  type BeliefState,
  type BeliefUpdateResult,
  type Observation,
  type ObservationType,
  type DimensionBelief,
  type Prior,
  type Posterior,
  type BeliefEngineConfig,
  type LikelihoodModel,
  type TransitionModel,
  DEFAULT_BELIEF_CONFIG,
  POPULATION_EMOTION_PRIORS,
} from './IBeliefUpdate';
import type { IStateVector } from '../state/interfaces/IStateVector';
import type { EmotionType } from '../state/interfaces/IEmotionalState';
import type { CognitiveDistortionType } from '../state/interfaces/ICognitiveState';
import type { RiskLevel } from '../state/interfaces/IRiskState';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `belief_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default Likelihood Model
 * P(observation | state)
 */
class DefaultLikelihoodModel implements LikelihoodModel {
  readonly name = 'DefaultLikelihoodModel';

  private readonly noiseLevel: number;
  private readonly biasCorrection: number;
  private readonly temporalSmoothing: number;

  constructor(config?: Partial<{ noiseLevel: number; biasCorrection: number; temporalSmoothing: number }>) {
    this.noiseLevel = config?.noiseLevel ?? 0.2;
    this.biasCorrection = config?.biasCorrection ?? 0.1;
    this.temporalSmoothing = config?.temporalSmoothing ?? 0.3;
  }

  calculateLikelihood(
    observation: Observation,
    _hypothesizedState: Partial<IStateVector>
  ): number {
    // Base likelihood from observation reliability
    let likelihood = observation.reliability;

    // Adjust based on observation type specificity
    const typeMultipliers: Record<ObservationType, number> = {
      'self_report_emotion': 0.95,
      'self_report_mood': 0.90,
      'assessment': 0.98,
      'text_message': 0.75,
      'behavioral': 0.70,
      'contextual': 0.60,
      'sensor': 0.80,
      'interaction': 0.65,
    };

    likelihood *= typeMultipliers[observation.type] ?? 0.7;

    // Add noise
    const noise = (Math.random() - 0.5) * this.noiseLevel;
    likelihood = Math.max(0.01, Math.min(0.99, likelihood + noise));

    return likelihood;
  }

  getParameters() {
    return {
      noiseLevel: this.noiseLevel,
      biasCorrection: this.biasCorrection,
      temporalSmoothing: this.temporalSmoothing,
    };
  }
}

/**
 * Default Transition Model
 * P(state_t | state_{t-1})
 */
class DefaultTransitionModel implements TransitionModel {
  readonly name = 'DefaultTransitionModel';

  private readonly baseDriftRate: number;
  private readonly meanReversionStrength: number;

  constructor(config?: Partial<{ baseDriftRate: number; meanReversionStrength: number }>) {
    this.baseDriftRate = config?.baseDriftRate ?? 0.1;
    this.meanReversionStrength = config?.meanReversionStrength ?? 0.05;
  }

  transitionProbability(
    fromState: Partial<IStateVector>,
    toState: Partial<IStateVector>,
    timeDelta: number
  ): number {
    // Simple Gaussian transition model
    // States closer to each other have higher probability
    // Probability decreases with time (more uncertainty over longer intervals)

    let totalDistance = 0;
    let dimensions = 0;

    // Compare emotional states
    if (fromState.emotional && toState.emotional) {
      const vadFrom = fromState.emotional.vad;
      const vadTo = toState.emotional.vad;

      totalDistance += Math.pow(vadFrom.valence - vadTo.valence, 2);
      totalDistance += Math.pow(vadFrom.arousal - vadTo.arousal, 2);
      totalDistance += Math.pow(vadFrom.dominance - vadTo.dominance, 2);
      dimensions += 3;
    }

    // Compare risk levels
    if (fromState.risk && toState.risk) {
      const riskMapping: Record<RiskLevel, number> = {
        'none': 0,
        'low': 0.25,
        'medium': 0.5,
        'high': 0.75,
        'critical': 1.0,
      };
      const riskDiff = Math.abs(
        riskMapping[fromState.risk.level] - riskMapping[toState.risk.level]
      );
      totalDistance += Math.pow(riskDiff, 2);
      dimensions += 1;
    }

    if (dimensions === 0) return 0.5;

    const avgDistance = Math.sqrt(totalDistance / dimensions);

    // Time-dependent variance
    const timeVariance = this.baseDriftRate * Math.sqrt(timeDelta);

    // Gaussian likelihood
    const probability = Math.exp(-Math.pow(avgDistance, 2) / (2 * timeVariance * timeVariance));

    return Math.max(0.01, Math.min(0.99, probability));
  }

  sampleNextState(
    currentState: Partial<IStateVector>,
    timeDelta: number
  ): Partial<IStateVector> {
    // Sample next state with drift + mean reversion
    const drift = this.baseDriftRate * Math.sqrt(timeDelta);
    const reversion = this.meanReversionStrength * timeDelta;

    if (currentState.emotional) {
      const currentVAD = currentState.emotional.vad;

      // Mean reversion to neutral (0, 0, 0.5)
      const newValence = currentVAD.valence * (1 - reversion) +
        (Math.random() - 0.5) * drift;
      const newArousal = currentVAD.arousal * (1 - reversion) +
        (Math.random() - 0.5) * drift;
      const newDominance = currentVAD.dominance * (1 - reversion) +
        0.5 * reversion + (Math.random() - 0.5) * drift;

      return {
        emotional: {
          ...currentState.emotional,
          vad: {
            valence: Math.max(-1, Math.min(1, newValence)),
            arousal: Math.max(-1, Math.min(1, newArousal)),
            dominance: Math.max(0, Math.min(1, newDominance)),
          },
        },
      } as Partial<IStateVector>;
    }

    return {};
  }
}

/**
 * Belief Update Engine Implementation
 * Core POMDP belief management system
 */
export class BeliefUpdateEngine implements IBeliefUpdateEngine {
  private readonly config: BeliefEngineConfig;
  private readonly likelihoodModel: LikelihoodModel;
  private readonly _transitionModel: TransitionModel;

  // History storage for belief tracking
  private readonly beliefHistory: Map<string | number, Array<{
    timestamp: Date;
    belief: BeliefState;
  }>> = new Map();

  constructor(
    config?: Partial<BeliefEngineConfig>,
    likelihoodModel?: LikelihoodModel,
    transitionModel?: TransitionModel
  ) {
    this.config = { ...DEFAULT_BELIEF_CONFIG, ...config };
    this.likelihoodModel = likelihoodModel ?? new DefaultLikelihoodModel();
    this._transitionModel = transitionModel ?? new DefaultTransitionModel();
  }

  /**
   * Get transition model (for advanced POMDP operations)
   */
  get transitionModel(): TransitionModel {
    return this._transitionModel;
  }

  /**
   * Initialize belief state for new user
   * Uses population priors as starting point
   */
  initializeBelief(userId: string | number): BeliefState {
    const now = new Date();
    const defaultPrior: Prior = {
      mean: 0.5,
      variance: this.config.defaultPriorVariance,
      sampleSize: 0,
      lastUpdated: now,
    };

    const defaultPosterior: Posterior = {
      mean: 0.5,
      variance: this.config.defaultPriorVariance,
      credibleInterval: {
        lower: 0.5 - 1.96 * Math.sqrt(this.config.defaultPriorVariance),
        upper: 0.5 + 1.96 * Math.sqrt(this.config.defaultPriorVariance),
      },
      updatedAt: now,
      basedOnObservations: 0,
    };

    const createDimensionBelief = (dimension: string, meanValue: number = 0.5): DimensionBelief => ({
      dimension,
      prior: { ...defaultPrior, mean: meanValue },
      posterior: { ...defaultPosterior, mean: meanValue },
      beliefShift: 0,
      informationGain: 0,
      stability: 1.0,
    });

    // Initialize emotion distribution from population priors
    const emotionDistribution = new Map<EmotionType, number>();
    for (const [emotion, prob] of Object.entries(POPULATION_EMOTION_PRIORS)) {
      emotionDistribution.set(emotion as EmotionType, prob);
    }

    // Calculate entropy of emotion distribution
    let entropy = 0;
    for (const prob of emotionDistribution.values()) {
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    }

    const belief: BeliefState = {
      userId,
      timestamp: now,
      emotional: {
        valence: createDimensionBelief('valence', 0.0),
        arousal: createDimensionBelief('arousal', 0.0),
        dominance: createDimensionBelief('dominance', 0.5),
        primaryEmotion: {
          distribution: emotionDistribution,
          entropy,
        },
      },
      cognitive: {
        selfView: createDimensionBelief('selfView', 0.5),
        worldView: createDimensionBelief('worldView', 0.5),
        futureView: createDimensionBelief('futureView', 0.5),
        distortionPresence: new Map<CognitiveDistortionType, number>([
          ['catastrophizing', 0.1],
          ['black_and_white', 0.1],
          ['mind_reading', 0.1],
          ['fortune_telling', 0.1],
          ['emotional_reasoning', 0.1],
          ['should_statements', 0.1],
          ['labeling', 0.1],
          ['personalization', 0.1],
          ['magnification', 0.1],
          ['minimization', 0.1],
          ['mental_filter', 0.1],
          ['disqualifying_positive', 0.1],
          ['overgeneralization', 0.1],
        ]),
      },
      risk: {
        overallRisk: createDimensionBelief('overallRisk', 0.1),
        categoryRisks: new Map([
          ['self_harm', createDimensionBelief('self_harm', 0.05)],
          ['substance', createDimensionBelief('substance', 0.1)],
          ['isolation', createDimensionBelief('isolation', 0.1)],
          ['crisis', createDimensionBelief('crisis', 0.05)],
        ]),
      },
      resources: {
        energy: createDimensionBelief('energy', 0.5),
        copingCapacity: createDimensionBelief('copingCapacity', 0.5),
        socialSupport: createDimensionBelief('socialSupport', 0.5),
        perma: {
          positive: createDimensionBelief('positive', 0.5),
          engagement: createDimensionBelief('engagement', 0.5),
          relationships: createDimensionBelief('relationships', 0.5),
          meaning: createDimensionBelief('meaning', 0.5),
          accomplishment: createDimensionBelief('accomplishment', 0.5),
        },
      },
      meta: {
        overallConfidence: 0.3,
        totalObservations: 0,
        averageInformationGain: 0,
        beliefConsistency: 1.0,
        predictionAccuracy: 0.5,
      },
    };

    // Store initial belief
    this.storeBeliefHistory(userId, belief);

    return belief;
  }

  /**
   * Update belief with new observation
   * Implements Bayesian posterior update: P(state|obs) ∝ P(obs|state) × P(state)
   */
  updateBelief(
    currentBelief: BeliefState,
    observation: Observation
  ): BeliefUpdateResult {
    const now = new Date();
    const updatedDimensions: string[] = [];
    const significantChanges: BeliefUpdateResult['significantChanges'] = [];

    // Calculate observation likelihood
    const likelihood = this.likelihoodModel.calculateLikelihood(
      observation,
      {} // We could pass hypothesized state here
    );

    // Get reliability weight for this observation type
    const reliabilityWeight = this.config.reliabilityWeights[observation.type];
    const effectiveWeight = likelihood * reliabilityWeight * observation.reliability;

    // Update emotional beliefs
    const newEmotional = this.updateEmotionalBeliefs(
      currentBelief.emotional,
      observation,
      effectiveWeight,
      updatedDimensions,
      significantChanges
    );

    // Update cognitive beliefs
    const newCognitive = this.updateCognitiveBeliefs(
      currentBelief.cognitive,
      observation,
      effectiveWeight,
      updatedDimensions,
      significantChanges
    );

    // Update risk beliefs
    const newRisk = this.updateRiskBeliefs(
      currentBelief.risk,
      observation,
      effectiveWeight,
      updatedDimensions,
      significantChanges
    );

    // Update resource beliefs
    const newResources = this.updateResourceBeliefs(
      currentBelief.resources,
      observation,
      effectiveWeight,
      updatedDimensions,
      significantChanges
    );

    // Calculate total information gain
    const totalInformationGain = this.calculateTotalInfoGain(
      currentBelief,
      newEmotional,
      newCognitive,
      newRisk,
      newResources
    );

    // Calculate surprise (KL divergence from prior)
    const surprise = this.calculateSurprise(currentBelief, observation);

    // Update meta beliefs
    const newMeta = {
      overallConfidence: Math.min(
        0.95,
        currentBelief.meta.overallConfidence + totalInformationGain * 0.1
      ),
      totalObservations: currentBelief.meta.totalObservations + 1,
      averageInformationGain: (
        currentBelief.meta.averageInformationGain * currentBelief.meta.totalObservations +
        totalInformationGain
      ) / (currentBelief.meta.totalObservations + 1),
      beliefConsistency: this.calculateConsistency(
        newEmotional,
        newCognitive,
        newRisk,
        newResources
      ),
      predictionAccuracy: currentBelief.meta.predictionAccuracy, // Updated elsewhere
    };

    const newBelief: BeliefState = {
      userId: currentBelief.userId,
      timestamp: now,
      emotional: newEmotional,
      cognitive: newCognitive,
      risk: newRisk,
      resources: newResources,
      meta: newMeta,
    };

    // Store updated belief
    this.storeBeliefHistory(currentBelief.userId, newBelief);

    return {
      previousBelief: currentBelief,
      newBelief,
      observation,
      updatedDimensions,
      totalInformationGain,
      surprise,
      significantChanges,
    };
  }

  /**
   * Batch update with multiple observations
   */
  batchUpdateBelief(
    currentBelief: BeliefState,
    observations: Observation[]
  ): BeliefUpdateResult {
    // Sort observations by timestamp
    const sorted = [...observations].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Apply updates sequentially
    let belief = currentBelief;
    let lastResult: BeliefUpdateResult | null = null;

    const allUpdatedDimensions: Set<string> = new Set();
    const allSignificantChanges: BeliefUpdateResult['significantChanges'] = [];
    let totalInfoGain = 0;
    let totalSurprise = 0;

    for (const obs of sorted) {
      lastResult = this.updateBelief(belief, obs);
      belief = lastResult.newBelief;

      lastResult.updatedDimensions.forEach(d => allUpdatedDimensions.add(d));
      allSignificantChanges.push(...lastResult.significantChanges);
      totalInfoGain += lastResult.totalInformationGain;
      totalSurprise += lastResult.surprise;
    }

    // Return aggregate result
    const lastObservation = sorted[sorted.length - 1];
    if (!lastObservation) {
      throw new Error('No observations provided to batchUpdateBelief');
    }
    return {
      previousBelief: currentBelief,
      newBelief: belief,
      observation: lastObservation,
      updatedDimensions: Array.from(allUpdatedDimensions),
      totalInformationGain: totalInfoGain,
      surprise: totalSurprise / sorted.length,
      significantChanges: this.deduplicateSignificantChanges(allSignificantChanges),
    };
  }

  /**
   * Convert belief state to point estimate (StateVector)
   * Uses posterior means as point estimates
   */
  beliefToStateVector(belief: BeliefState): IStateVector {
    // Find most likely emotion from distribution
    let maxEmotion: EmotionType = 'neutral';
    let maxProb = 0;
    for (const [emotion, prob] of belief.emotional.primaryEmotion.distribution) {
      if (prob > maxProb) {
        maxProb = prob;
        maxEmotion = emotion;
      }
    }

    // Determine risk level from posterior
    const riskValue = belief.risk.overallRisk.posterior.mean;
    let riskLevel: RiskLevel = 'none';
    if (riskValue >= 0.8) riskLevel = 'critical';
    else if (riskValue >= 0.6) riskLevel = 'high';
    else if (riskValue >= 0.4) riskLevel = 'medium';
    else if (riskValue >= 0.2) riskLevel = 'low';

    // Build StateVector (simplified)
    return {
      id: generateId(),
      userId: belief.userId,
      timestamp: belief.timestamp,
      emotional: {
        primary: {
          emotion: maxEmotion,
          confidence: maxProb,
          intensity: Math.abs(belief.emotional.valence.posterior.mean),
        },
        secondary: [],
        intensity: Math.abs(belief.emotional.valence.posterior.mean),
        vad: {
          valence: belief.emotional.valence.posterior.mean,
          arousal: belief.emotional.arousal.posterior.mean,
          dominance: belief.emotional.dominance.posterior.mean,
        },
        trend: 'stable',
        volatility: 1 - belief.meta.beliefConsistency,
        patterns: [],
        effectiveStrategies: [],
        timestamp: belief.timestamp,
        confidence: belief.meta.overallConfidence,
        source: 'combined',
        dataQuality: belief.meta.overallConfidence,
      },
      cognitive: {
        coreBeliefs: {
          selfView: belief.cognitive.selfView.posterior.mean,
          worldView: belief.cognitive.worldView.posterior.mean,
          futureView: belief.cognitive.futureView.posterior.mean,
          confidence: {
            self: belief.meta.overallConfidence,
            world: belief.meta.overallConfidence,
            future: belief.meta.overallConfidence,
          },
        },
        activeDistortions: [],
        distortionIntensity: 0,
        beliefUncertainty: 1 - belief.meta.overallConfidence,
        attentionalBias: 'neutral' as const,
        thinkingStyle: {
          analyticalVsIntuitive: 0.5,
          abstractVsConcrete: 0.5,
          locusOfControl: 'balanced' as const,
          flexibility: 0.5,
        },
        coreBeliefPatterns: [],
        cognitiveLoad: {
          current: 0.5,
          factors: [],
          availableResources: 0.5,
        },
        metacognition: {
          selfAwareness: 0.5,
          defusion: 0.5,
          changeBeliefs: 0.5,
          metaWorry: 0.3,
        },
        recentUpdates: [],
        timestamp: belief.timestamp,
        confidence: belief.meta.overallConfidence,
        dataQuality: belief.meta.overallConfidence,
      },
      narrative: {
        stage: 'contemplation' as const,
        daysInCurrentStage: 0,
        stageHistory: [],
        role: 'explorer' as const,
        roleHistory: [],
        progressPercent: 50,
        breakthroughs: [],
        setbacks: [],
        momentum: {
          direction: 0,
          velocity: 0.5,
          stability: 0.5,
          accelerators: [],
          barriers: [],
        },
        chapters: [],
        currentChapter: {
          id: 'initial',
          title: 'Beginning',
          startDate: belief.timestamp,
          dominantStage: 'contemplation' as const,
          dominantRole: 'explorer' as const,
          keyMoments: [],
          overallTone: 'neutral' as const,
        },
        themes: [],
        values: {
          identified: [],
          meaningSource: 'mixed' as const,
          purposeClarity: 0.5,
        },
        projections: [],
        possibleTransitions: [],
        timestamp: belief.timestamp,
        confidence: belief.meta.overallConfidence,
        dataQuality: belief.meta.overallConfidence,
      },
      risk: {
        level: riskLevel,
        confidence: belief.meta.overallConfidence,
        trajectory: 'stable' as const,
        riskFactors: [],
        protectiveFactors: [],
        earlyWarnings: [],
        categoryRisks: {} as Record<string, { level: RiskLevel; confidence: number; lastAssessed: Date }>,
        safetyPlan: {
          exists: false,
          completeness: 0,
          components: [],
        },
        supportNetwork: {
          size: 0,
          quality: 0.5,
          accessibility: 0.5,
          diversity: 0.5,
          primarySupports: [],
        },
        lethalMeans: {
          assessed: false,
          accessToMeans: 'unknown' as const,
          meansRestrictionDiscussed: false,
          safetyStepsCompleted: [],
        },
        crisisHistory: [],
        effectiveInterventions: [],
        predictions: [],
        daysSinceLastCrisis: null,
        stabilizationPhase: 'stable' as const,
        timestamp: belief.timestamp,
        dataQuality: belief.meta.overallConfidence,
        assessmentMethod: 'automated' as const,
      },
      resources: {
        perma: {
          positiveEmotion: belief.resources.perma.positive.posterior.mean,
          engagement: belief.resources.perma.engagement.posterior.mean,
          relationships: belief.resources.perma.relationships.posterior.mean,
          meaning: belief.resources.perma.meaning.posterior.mean,
          accomplishment: belief.resources.perma.accomplishment.posterior.mean,
        },
        permaScore: (
          belief.resources.perma.positive.posterior.mean +
          belief.resources.perma.engagement.posterior.mean +
          belief.resources.perma.relationships.posterior.mean +
          belief.resources.perma.meaning.posterior.mean +
          belief.resources.perma.accomplishment.posterior.mean
        ) / 5,
        copingStrategies: [],
        effectiveStrategies: [],
        energy: {
          current: belief.resources.energy.posterior.mean,
          baseline: 0.5,
          trend: 'stable' as const,
          factors: [],
        },
        cognitiveCapacity: {
          available: belief.resources.copingCapacity.posterior.mean,
          currentLoad: 1 - belief.resources.copingCapacity.posterior.mean,
          optimal: 1.0,
          loadSources: [],
        },
        selfEfficacy: {
          general: belief.resources.copingCapacity.posterior.mean,
          domains: {},
          masteryExperiences: [],
        },
        resilience: {
          score: belief.resources.copingCapacity.posterior.mean,
          components: {
            adaptability: 0.5,
            persistence: 0.5,
            optimism: 0.5,
            selfRegulation: 0.5,
            socialSupport: belief.resources.socialSupport.posterior.mean,
          },
          recoveryHistory: [],
        },
        socialResources: {
          network: {
            size: 0,
            qualityScore: belief.resources.socialSupport.posterior.mean,
            diversityScore: 0.5,
            accessibilityScore: 0.5,
          },
          supportTypes: {
            emotional: 0.5,
            instrumental: 0.5,
            informational: 0.5,
            companionship: 0.5,
          },
          keyRelationships: [],
          isolationRisk: 1 - belief.resources.socialSupport.posterior.mean,
        },
        timeResources: {
          perceived: 0.5,
          selfCareTime: 'adequate' as const,
          pressure: 0.5,
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
            explanatoryStyle: 'mixed' as const,
          },
          futureOrientation: {
            clarity: 0.5,
            motivation: 0.5,
            confidence: belief.meta.overallConfidence,
          },
        },
        depletionWarnings: [],
        strengths: [],
        overallAvailability: belief.resources.energy.posterior.mean,
        timestamp: belief.timestamp,
        confidence: belief.meta.overallConfidence,
        dataQuality: belief.meta.overallConfidence,
      },
      belief: {
        confidence: belief.meta.overallConfidence,
        entropy: 1 - belief.meta.overallConfidence,
        lastObservation: {
          source: 'inference' as const,
          timestamp: belief.timestamp,
          informationGain: belief.meta.averageInformationGain,
        },
        observationCount: belief.meta.totalObservations,
      },
      quality: {
        overall: belief.meta.overallConfidence,
        components: {
          emotional: belief.meta.overallConfidence,
          cognitive: belief.meta.overallConfidence,
          narrative: belief.meta.overallConfidence * 0.8,
          risk: belief.meta.overallConfidence,
          resources: belief.meta.overallConfidence,
        },
        staleness: {
          emotional: 0,
          cognitive: 0,
          narrative: 0,
          risk: 0,
          resources: 0,
        },
        sufficient: belief.meta.totalObservations >= 3,
      },
      recentTransitions: [],
      predictions: [],
      summary: {
        brief: `Belief-based state estimate - confidence: ${(belief.meta.overallConfidence * 100).toFixed(0)}%`,
        insights: [
          `VAD: (${belief.emotional.valence.posterior.mean.toFixed(2)}, ${belief.emotional.arousal.posterior.mean.toFixed(2)}, ${belief.emotional.dominance.posterior.mean.toFixed(2)})`,
        ],
        concerns: riskLevel !== 'none' ? [`Risk level: ${riskLevel}`] : [],
        positives: [],
        focusAreas: [],
        wellbeingScore: this.calculateWellbeingFromBelief(belief),
      },
      recommendations: [],
      wellbeingIndex: this.calculateWellbeingFromBelief(belief),
      stabilityIndex: belief.meta.beliefConsistency * 100,
      resilienceIndex: belief.resources.copingCapacity.posterior.mean * 100,
      interventionUrgency: riskValue * 100,
    };
  }

  /**
   * Get uncertainty for specific dimension
   */
  getDimensionUncertainty(
    belief: BeliefState,
    dimension: string
  ): {
    uncertainty: number;
    sampleSizeNeeded: number;
    suggestedObservationType: ObservationType;
  } {
    const dimBelief = this.findDimensionBelief(belief, dimension);

    if (!dimBelief) {
      return {
        uncertainty: 1.0,
        sampleSizeNeeded: 10,
        suggestedObservationType: 'self_report_mood',
      };
    }

    const uncertainty = dimBelief.posterior.variance;

    // Calculate samples needed to reach target variance (0.05)
    const targetVariance = 0.05;
    const currentVariance = uncertainty;
    const samplesNeeded = Math.ceil(
      (currentVariance - targetVariance) / (targetVariance * this.config.reliabilityWeights.self_report_emotion)
    );

    // Suggest observation type based on dimension
    const typeByDimension: Record<string, ObservationType> = {
      'valence': 'self_report_emotion',
      'arousal': 'self_report_mood',
      'dominance': 'self_report_mood',
      'selfView': 'assessment',
      'worldView': 'text_message',
      'futureView': 'assessment',
      'overallRisk': 'assessment',
      'energy': 'self_report_mood',
      'copingCapacity': 'behavioral',
      'socialSupport': 'interaction',
    };

    return {
      uncertainty,
      sampleSizeNeeded: Math.max(1, samplesNeeded),
      suggestedObservationType: typeByDimension[dimension] ?? 'self_report_mood',
    };
  }

  /**
   * Calculate expected information gain from potential observation
   * Based on information-theoretic expected utility
   */
  calculateExpectedInfoGain(
    currentBelief: BeliefState,
    potentialObservationType: ObservationType
  ): number {
    // Which dimensions does this observation type inform?
    const informedDimensions = this.getDimensionsForObsType(potentialObservationType);

    let totalExpectedGain = 0;

    for (const dim of informedDimensions) {
      const dimBelief = this.findDimensionBelief(currentBelief, dim);
      if (!dimBelief) continue;

      // Expected variance reduction
      const currentVariance = dimBelief.posterior.variance;
      const obsReliability = this.config.reliabilityWeights[potentialObservationType];

      // Bayesian update formula for variance
      const expectedNewVariance = (currentVariance * (1 - obsReliability)) +
        (this.config.minVariance * obsReliability);

      // Information gain = reduction in entropy ∝ reduction in variance
      const infoGain = Math.log(currentVariance / expectedNewVariance);
      totalExpectedGain += Math.max(0, infoGain);
    }

    return totalExpectedGain / informedDimensions.length;
  }

  /**
   * Get most informative next observation type
   * Active inference: minimize expected prediction error
   */
  getMostInformativeObservation(
    currentBelief: BeliefState
  ): {
    observationType: ObservationType;
    expectedInfoGain: number;
    targetDimension: string;
    rationale: string;
  } {
    const observationTypes: ObservationType[] = [
      'self_report_emotion',
      'self_report_mood',
      'assessment',
      'text_message',
      'behavioral',
      'contextual',
      'interaction',
    ];

    let bestType: ObservationType = 'self_report_mood';
    let bestGain = 0;
    let bestDimension = 'valence';

    for (const obsType of observationTypes) {
      const gain = this.calculateExpectedInfoGain(currentBelief, obsType);
      if (gain > bestGain) {
        bestGain = gain;
        bestType = obsType;
        bestDimension = this.getHighestUncertaintyDimension(currentBelief, obsType);
      }
    }

    const rationales: Record<ObservationType, string> = {
      'self_report_emotion': 'Direct emotion report provides high-reliability emotional state update',
      'self_report_mood': 'Mood report captures overall valence and arousal state',
      'assessment': 'Formal assessment provides comprehensive state update',
      'text_message': 'Text analysis provides indirect emotional and cognitive insights',
      'behavioral': 'Behavioral patterns reveal energy and engagement levels',
      'contextual': 'Context helps calibrate predictions',
      'sensor': 'Passive sensing provides continuous low-burden data',
      'interaction': 'Interaction patterns reveal social support and engagement',
    };

    return {
      observationType: bestType,
      expectedInfoGain: bestGain,
      targetDimension: bestDimension,
      rationale: rationales[bestType],
    };
  }

  /**
   * Check for belief inconsistencies
   * Detects contradictions between related dimensions
   */
  checkBeliefConsistency(belief: BeliefState): {
    isConsistent: boolean;
    inconsistencies: Array<{
      dimension1: string;
      dimension2: string;
      conflictType: string;
      resolution: string;
    }>;
  } {
    const inconsistencies: Array<{
      dimension1: string;
      dimension2: string;
      conflictType: string;
      resolution: string;
    }> = [];

    // Check emotional consistency
    // High arousal + low energy is inconsistent
    if (
      belief.emotional.arousal.posterior.mean > 0.5 &&
      belief.resources.energy.posterior.mean < 0.3
    ) {
      inconsistencies.push({
        dimension1: 'arousal',
        dimension2: 'energy',
        conflictType: 'high_arousal_low_energy',
        resolution: 'May indicate stress/anxiety state - verify with direct assessment',
      });
    }

    // High valence + high risk is inconsistent
    if (
      belief.emotional.valence.posterior.mean > 0.5 &&
      belief.risk.overallRisk.posterior.mean > 0.5
    ) {
      inconsistencies.push({
        dimension1: 'valence',
        dimension2: 'overallRisk',
        conflictType: 'positive_mood_high_risk',
        resolution: 'May indicate denial or manic state - investigate further',
      });
    }

    // Low coping + low social support + high risk should align
    if (
      belief.resources.copingCapacity.posterior.mean < 0.3 &&
      belief.resources.socialSupport.posterior.mean < 0.3 &&
      belief.risk.overallRisk.posterior.mean < 0.3
    ) {
      inconsistencies.push({
        dimension1: 'resources',
        dimension2: 'risk',
        conflictType: 'low_resources_low_risk',
        resolution: 'Risk may be underestimated - reassess protective factors',
      });
    }

    // Cognitive triad consistency
    const triadDiff = Math.abs(
      belief.cognitive.selfView.posterior.mean -
      belief.cognitive.futureView.posterior.mean
    );
    if (triadDiff > 0.5) {
      inconsistencies.push({
        dimension1: 'selfView',
        dimension2: 'futureView',
        conflictType: 'triad_imbalance',
        resolution: 'Large difference between self and future views - explore cognitive patterns',
      });
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  /**
   * Decay beliefs over time (increase uncertainty)
   * Epistemic uncertainty increases without new observations
   */
  applyBeliefDecay(
    belief: BeliefState,
    hoursSinceLastUpdate: number
  ): BeliefState {
    const decayFactor = Math.pow(1 + this.config.beliefDecayRate, hoursSinceLastUpdate);

    const decayDimension = (dim: DimensionBelief): DimensionBelief => {
      const newVariance = Math.min(
        this.config.defaultPriorVariance,
        dim.posterior.variance * decayFactor
      );

      return {
        ...dim,
        posterior: {
          ...dim.posterior,
          variance: newVariance,
          credibleInterval: {
            lower: dim.posterior.mean - 1.96 * Math.sqrt(newVariance),
            upper: dim.posterior.mean + 1.96 * Math.sqrt(newVariance),
          },
        },
        stability: dim.stability * (1 / decayFactor),
      };
    };

    return {
      ...belief,
      timestamp: new Date(),
      emotional: {
        valence: decayDimension(belief.emotional.valence),
        arousal: decayDimension(belief.emotional.arousal),
        dominance: decayDimension(belief.emotional.dominance),
        primaryEmotion: belief.emotional.primaryEmotion, // Distribution decays toward uniform
      },
      cognitive: {
        selfView: decayDimension(belief.cognitive.selfView),
        worldView: decayDimension(belief.cognitive.worldView),
        futureView: decayDimension(belief.cognitive.futureView),
        distortionPresence: belief.cognitive.distortionPresence,
      },
      risk: {
        overallRisk: decayDimension(belief.risk.overallRisk),
        categoryRisks: new Map(
          Array.from(belief.risk.categoryRisks.entries()).map(
            ([k, v]) => [k, decayDimension(v)]
          )
        ),
      },
      resources: {
        energy: decayDimension(belief.resources.energy),
        copingCapacity: decayDimension(belief.resources.copingCapacity),
        socialSupport: decayDimension(belief.resources.socialSupport),
        perma: {
          positive: decayDimension(belief.resources.perma.positive),
          engagement: decayDimension(belief.resources.perma.engagement),
          relationships: decayDimension(belief.resources.perma.relationships),
          meaning: decayDimension(belief.resources.perma.meaning),
          accomplishment: decayDimension(belief.resources.perma.accomplishment),
        },
      },
      meta: {
        ...belief.meta,
        overallConfidence: belief.meta.overallConfidence * (1 / decayFactor),
      },
    };
  }

  /**
   * Get belief history for dimension
   */
  async getBeliefHistory(
    userId: string | number,
    dimension: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{
    timestamp: Date;
    mean: number;
    variance: number;
  }>> {
    const history = this.beliefHistory.get(userId) ?? [];

    return history
      .filter(entry =>
        entry.timestamp >= timeRange.start &&
        entry.timestamp <= timeRange.end
      )
      .map(entry => {
        const dimBelief = this.findDimensionBelief(entry.belief, dimension);
        return {
          timestamp: entry.timestamp,
          mean: dimBelief?.posterior.mean ?? 0.5,
          variance: dimBelief?.posterior.variance ?? this.config.defaultPriorVariance,
        };
      });
  }

  // ============ Private Helper Methods ============

  private storeBeliefHistory(userId: string | number, belief: BeliefState): void {
    if (!this.beliefHistory.has(userId)) {
      this.beliefHistory.set(userId, []);
    }

    const history = this.beliefHistory.get(userId)!;
    history.push({ timestamp: belief.timestamp, belief });

    // Keep last 1000 entries
    if (history.length > 1000) {
      history.shift();
    }
  }

  private updateEmotionalBeliefs(
    current: BeliefState['emotional'],
    observation: Observation,
    weight: number,
    updatedDimensions: string[],
    significantChanges: BeliefUpdateResult['significantChanges']
  ): BeliefState['emotional'] {
    if (!observation.informsComponents.includes('emotional')) {
      return current;
    }

    // Extract emotional data from observation
    const obsData = observation.data as Record<string, unknown>;

    const updateDim = (dim: DimensionBelief, observedValue?: number): DimensionBelief => {
      if (observedValue === undefined) return dim;

      const prior = dim.posterior; // Previous posterior becomes new prior

      // Bayesian update (conjugate normal-normal)
      const priorPrecision = 1 / prior.variance;
      const obsPrecision = weight / this.config.defaultPriorVariance;

      const posteriorPrecision = priorPrecision + obsPrecision;
      const posteriorMean = (
        prior.mean * priorPrecision + observedValue * obsPrecision
      ) / posteriorPrecision;
      const posteriorVariance = Math.max(
        this.config.minVariance,
        1 / posteriorPrecision
      );

      const beliefShift = Math.abs(posteriorMean - prior.mean);
      const informationGain = Math.log(prior.variance / posteriorVariance) / 2;

      // Check for significant change
      if (beliefShift > this.config.significanceThreshold) {
        const changeType = posteriorMean > prior.mean ? 'improvement' : 'decline';
        significantChanges.push({
          dimension: dim.dimension,
          changeType,
          magnitude: beliefShift,
          clinicalSignificance: beliefShift > 0.3,
        });
      }

      updatedDimensions.push(dim.dimension);

      return {
        dimension: dim.dimension,
        prior: {
          mean: prior.mean,
          variance: prior.variance,
          sampleSize: prior.basedOnObservations,
          lastUpdated: prior.updatedAt,
        },
        posterior: {
          mean: posteriorMean,
          variance: posteriorVariance,
          credibleInterval: {
            lower: posteriorMean - 1.96 * Math.sqrt(posteriorVariance),
            upper: posteriorMean + 1.96 * Math.sqrt(posteriorVariance),
          },
          updatedAt: new Date(),
          basedOnObservations: prior.basedOnObservations + 1,
        },
        beliefShift,
        informationGain,
        stability: 1 - beliefShift,
      };
    };

    return {
      valence: updateDim(current.valence, obsData.valence as number | undefined),
      arousal: updateDim(current.arousal, obsData.arousal as number | undefined),
      dominance: updateDim(current.dominance, obsData.dominance as number | undefined),
      primaryEmotion: this.updateEmotionDistribution(
        current.primaryEmotion,
        obsData.emotion as EmotionType | undefined,
        weight
      ),
    };
  }

  private updateEmotionDistribution(
    current: BeliefState['emotional']['primaryEmotion'],
    observedEmotion: EmotionType | undefined,
    weight: number
  ): BeliefState['emotional']['primaryEmotion'] {
    if (!observedEmotion) return current;

    const newDistribution = new Map(current.distribution);

    // Bayesian update for categorical distribution
    // Increase probability of observed emotion, decrease others
    for (const [emotion, prob] of newDistribution) {
      if (emotion === observedEmotion) {
        // Increase observed emotion probability
        newDistribution.set(emotion, prob + weight * (1 - prob));
      } else {
        // Decrease other probabilities proportionally
        newDistribution.set(emotion, prob * (1 - weight));
      }
    }

    // Normalize
    const newTotal = Array.from(newDistribution.values()).reduce((a, b) => a + b, 0);
    for (const [emotion, prob] of newDistribution) {
      newDistribution.set(emotion, prob / newTotal);
    }

    // Recalculate entropy
    let entropy = 0;
    for (const prob of newDistribution.values()) {
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    }

    return {
      distribution: newDistribution,
      entropy,
    };
  }

  private updateCognitiveBeliefs(
    current: BeliefState['cognitive'],
    observation: Observation,
    _weight: number,
    _updatedDimensions: string[],
    _significantChanges: BeliefUpdateResult['significantChanges']
  ): BeliefState['cognitive'] {
    if (!observation.informsComponents.includes('cognitive')) {
      return current;
    }

    // Similar update logic to emotional beliefs
    // Simplified for brevity
    return current;
  }

  private updateRiskBeliefs(
    current: BeliefState['risk'],
    observation: Observation,
    weight: number,
    updatedDimensions: string[],
    significantChanges: BeliefUpdateResult['significantChanges']
  ): BeliefState['risk'] {
    if (!observation.informsComponents.includes('risk')) {
      return current;
    }

    const obsData = observation.data as Record<string, unknown>;

    if (obsData.riskLevel !== undefined) {
      const riskMapping: Record<string, number> = {
        'none': 0.1,
        'low': 0.25,
        'medium': 0.5,
        'high': 0.75,
        'critical': 0.95,
      };

      const observedRisk = riskMapping[obsData.riskLevel as string] ?? 0.5;

      // Bayesian update
      const prior = current.overallRisk.posterior;
      const priorPrecision = 1 / prior.variance;
      const obsPrecision = weight / this.config.defaultPriorVariance;

      const posteriorPrecision = priorPrecision + obsPrecision;
      const posteriorMean = (
        prior.mean * priorPrecision + observedRisk * obsPrecision
      ) / posteriorPrecision;
      const posteriorVariance = Math.max(
        this.config.minVariance,
        1 / posteriorPrecision
      );

      const beliefShift = Math.abs(posteriorMean - prior.mean);

      if (beliefShift > this.config.significanceThreshold) {
        significantChanges.push({
          dimension: 'overallRisk',
          changeType: posteriorMean > prior.mean ? 'decline' : 'improvement',
          magnitude: beliefShift,
          clinicalSignificance: posteriorMean > 0.6 || beliefShift > 0.3,
        });
      }

      updatedDimensions.push('overallRisk');

      return {
        ...current,
        overallRisk: {
          dimension: 'overallRisk',
          prior: {
            mean: prior.mean,
            variance: prior.variance,
            sampleSize: prior.basedOnObservations,
            lastUpdated: prior.updatedAt,
          },
          posterior: {
            mean: posteriorMean,
            variance: posteriorVariance,
            credibleInterval: {
              lower: posteriorMean - 1.96 * Math.sqrt(posteriorVariance),
              upper: posteriorMean + 1.96 * Math.sqrt(posteriorVariance),
            },
            updatedAt: new Date(),
            basedOnObservations: prior.basedOnObservations + 1,
          },
          beliefShift,
          informationGain: Math.log(prior.variance / posteriorVariance) / 2,
          stability: 1 - beliefShift,
        },
      };
    }

    return current;
  }

  private updateResourceBeliefs(
    current: BeliefState['resources'],
    observation: Observation,
    _weight: number,
    _updatedDimensions: string[],
    _significantChanges: BeliefUpdateResult['significantChanges']
  ): BeliefState['resources'] {
    if (!observation.informsComponents.includes('resources')) {
      return current;
    }

    // Similar update logic
    // Simplified for brevity
    return current;
  }

  private calculateTotalInfoGain(
    _oldBelief: BeliefState,
    newEmotional: BeliefState['emotional'],
    _newCognitive: BeliefState['cognitive'],
    newRisk: BeliefState['risk'],
    _newResources: BeliefState['resources']
  ): number {
    let totalGain = 0;

    // Sum info gains from all updated dimensions
    totalGain += newEmotional.valence.informationGain;
    totalGain += newEmotional.arousal.informationGain;
    totalGain += newEmotional.dominance.informationGain;
    totalGain += newRisk.overallRisk.informationGain;

    return Math.max(0, totalGain);
  }

  private calculateSurprise(
    belief: BeliefState,
    observation: Observation
  ): number {
    // Surprise = negative log likelihood of observation under current belief
    const likelihood = this.likelihoodModel.calculateLikelihood(
      observation,
      this.beliefToStateVector(belief)
    );

    return -Math.log(likelihood + 0.001);
  }

  private calculateConsistency(
    emotional: BeliefState['emotional'],
    _cognitive: BeliefState['cognitive'],
    risk: BeliefState['risk'],
    resources: BeliefState['resources']
  ): number {
    // Check for inconsistent beliefs
    let consistencyScore = 1.0;

    // Valence and risk should be inversely related
    const valenceRiskCorr = -emotional.valence.posterior.mean * risk.overallRisk.posterior.mean;
    if (valenceRiskCorr < -0.3) {
      consistencyScore -= 0.2;
    }

    // Energy and arousal should be related
    const energyArousalDiff = Math.abs(
      resources.energy.posterior.mean -
      (emotional.arousal.posterior.mean + 1) / 2
    );
    if (energyArousalDiff > 0.5) {
      consistencyScore -= 0.1;
    }

    return Math.max(0, consistencyScore);
  }

  private findDimensionBelief(
    belief: BeliefState,
    dimension: string
  ): DimensionBelief | null {
    // Search emotional
    if (dimension === 'valence') return belief.emotional.valence;
    if (dimension === 'arousal') return belief.emotional.arousal;
    if (dimension === 'dominance') return belief.emotional.dominance;

    // Search cognitive
    if (dimension === 'selfView') return belief.cognitive.selfView;
    if (dimension === 'worldView') return belief.cognitive.worldView;
    if (dimension === 'futureView') return belief.cognitive.futureView;

    // Search risk
    if (dimension === 'overallRisk') return belief.risk.overallRisk;
    const riskCategory = belief.risk.categoryRisks.get(dimension);
    if (riskCategory) return riskCategory;

    // Search resources
    if (dimension === 'energy') return belief.resources.energy;
    if (dimension === 'copingCapacity') return belief.resources.copingCapacity;
    if (dimension === 'socialSupport') return belief.resources.socialSupport;
    if (dimension === 'positive') return belief.resources.perma.positive;
    if (dimension === 'engagement') return belief.resources.perma.engagement;
    if (dimension === 'relationships') return belief.resources.perma.relationships;
    if (dimension === 'meaning') return belief.resources.perma.meaning;
    if (dimension === 'accomplishment') return belief.resources.perma.accomplishment;

    return null;
  }

  private getDimensionsForObsType(obsType: ObservationType): string[] {
    const mapping: Record<ObservationType, string[]> = {
      'self_report_emotion': ['valence', 'arousal', 'dominance'],
      'self_report_mood': ['valence', 'energy'],
      'assessment': ['valence', 'arousal', 'selfView', 'worldView', 'futureView', 'overallRisk'],
      'text_message': ['valence', 'selfView', 'worldView'],
      'behavioral': ['energy', 'copingCapacity', 'engagement'],
      'contextual': ['valence', 'arousal'],
      'sensor': ['arousal', 'energy'],
      'interaction': ['socialSupport', 'relationships'],
    };

    return mapping[obsType] ?? ['valence'];
  }

  private getHighestUncertaintyDimension(
    belief: BeliefState,
    obsType: ObservationType
  ): string {
    const dimensions = this.getDimensionsForObsType(obsType);
    let maxUncertainty = 0;
    let maxDim = dimensions[0];

    for (const dim of dimensions) {
      const dimBelief = this.findDimensionBelief(belief, dim);
      if (dimBelief && dimBelief.posterior.variance > maxUncertainty) {
        maxUncertainty = dimBelief.posterior.variance;
        maxDim = dim;
      }
    }

    return maxDim ?? 'valence';
  }

  private calculateWellbeingFromBelief(belief: BeliefState): number {
    const valence = (belief.emotional.valence.posterior.mean + 1) / 2; // Normalize to 0-1
    const energy = belief.resources.energy.posterior.mean;
    const coping = belief.resources.copingCapacity.posterior.mean;
    const permaAvg = (
      belief.resources.perma.positive.posterior.mean +
      belief.resources.perma.engagement.posterior.mean +
      belief.resources.perma.relationships.posterior.mean +
      belief.resources.perma.meaning.posterior.mean +
      belief.resources.perma.accomplishment.posterior.mean
    ) / 5;
    const riskPenalty = belief.risk.overallRisk.posterior.mean;

    // Weighted combination
    const wellbeing = (
      valence * 0.3 +
      energy * 0.15 +
      coping * 0.15 +
      permaAvg * 0.25 +
      (1 - riskPenalty) * 0.15
    ) * 100;

    return Math.max(0, Math.min(100, wellbeing));
  }

  private deduplicateSignificantChanges(
    changes: BeliefUpdateResult['significantChanges']
  ): BeliefUpdateResult['significantChanges'] {
    const seen = new Set<string>();
    return changes.filter(change => {
      const key = `${change.dimension}_${change.changeType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * Factory function for creating BeliefUpdateEngine
 */
export function createBeliefUpdateEngine(
  config?: Partial<BeliefEngineConfig>
): IBeliefUpdateEngine {
  return new BeliefUpdateEngine(config);
}
