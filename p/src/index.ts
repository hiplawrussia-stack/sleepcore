/**
 * @cognicore/engine
 * =================
 * World's First Universal POMDP-based Cognitive State Engine
 * for Digital Therapeutics (DTx)
 *
 * @packageDocumentation
 * @module @cognicore/engine
 *
 * БФ "Другой путь" | CogniCore Engine v1.0 | 2025
 */

// =============================================================================
// VERSION INFO
// =============================================================================

export const COGNICORE_VERSION = {
  version: '1.0.0-alpha.1',
  name: '@cognicore/engine',
  description: 'POMDP-based Cognitive State Engine for Digital Therapeutics',
  buildDate: '2025-12-20',
};

// =============================================================================
// CORE STATE INTERFACES (Phase 1: Interfaces only)
// =============================================================================

// Emotional State
export type {
  EmotionType,
  EmotionTrend,
  VADDimensions,
  ScoredEmotion,
  EmotionPattern,
  RegulationEffectiveness,
  IEmotionalState,
  IEmotionalStateBuilder,
  IEmotionalStateFactory,
  IVADMapper,
} from './state/interfaces/IEmotionalState';

export {
  DEFAULT_EMOTION_VAD,
  EMOTION_THERAPY_MAPPING,
} from './state/interfaces/IEmotionalState';

// Cognitive State
export type {
  CognitiveTriad,
  CognitiveDistortionType,
  CognitiveDistortion,
  AttentionalBias,
  ThinkingStyle,
  BeliefUpdate,
  CoreBeliefPattern,
  CognitiveLoad,
  Metacognition,
  ICognitiveState,
  ICognitiveStateBuilder,
  ICognitiveStateFactory,
  ICognitiveDistortionDetector,
} from './state/interfaces/ICognitiveState';

export {
  DISTORTION_PATTERNS,
  DISTORTION_INTERVENTIONS,
} from './state/interfaces/ICognitiveState';

// Narrative State
export type {
  ChangeStage,
  NarrativeRole,
  NarrativeMoment,
  NarrativeChapter,
  NarrativeTheme,
  StageTransition,
  INarrativeState,
  INarrativeStateBuilder,
} from './state/interfaces/INarrativeState';

// Risk State
export type {
  RiskLevel,
  RiskTrajectory,
  RiskFactor,
  ProtectiveFactor,
  SafetyPlan,
  IRiskState,
  IRiskStateBuilder,
} from './state/interfaces/IRiskState';

// Resource State
export type {
  PERMADimensions,
  CopingStrategy,
  CopingStrategyType,
  EnergyLevel,
  Resilience,
  SocialResources,
  IResourceState,
  IResourceStateBuilder,
} from './state/interfaces/IResourceState';

// State Vector (Main)
export type {
  ObservationSource,
  StateQuality,
  BeliefState,
  StateTransition,
  TemporalPrediction,
  StateSummary,
  StateBasedRecommendation,
  IStateVector,
  IStateVectorBuilder,
  IStateVectorFactory,
  IStateVectorService,
  IStateVectorRepository,
  ComponentStatus,
  AgeGroup,
} from './state/interfaces/IStateVector';

export {
  WELLBEING_WEIGHTS,
  INDEX_THRESHOLDS,
  getComponentStatus,
} from './state/interfaces/IStateVector';

// =============================================================================
// BELIEF UPDATE ENGINE
// =============================================================================

export type {
  Observation,
  BeliefUpdateResult,
  IBeliefUpdateEngine,
} from './belief/IBeliefUpdate';

// =============================================================================
// TEMPORAL ENGINE
// =============================================================================

export type {
  VulnerabilityWindow,
  ITemporalEchoEngine,
} from './temporal/ITemporalPrediction';

// =============================================================================
// COGNITIVE MIRROR
// =============================================================================

export type {
  TextAnalysisResult,
  TherapeuticInsight,
  SocraticQuestion,
  ABCDChain,
  DetectedDistortion,
  IDeepCognitiveMirror,
} from './mirror/IDeepCognitiveMirror';

// =============================================================================
// INTERVENTION OPTIMIZER
// =============================================================================

export type {
  IIntervention,
  IInterventionSelection,
  IInterventionOutcome,
  IContextualFeatures,
  IDecisionPoint,
  IInterventionOptimizer,
} from './intervention/IInterventionOptimizer';

// =============================================================================
// SAFETY ENVELOPE
// =============================================================================

export type {
  SafetyLevel,
  ISafetyContext,
  ISafetyValidationResult,
  ICrisisDetectionResult,
  IHumanEscalationRequest,
  IEscalationDecision,
  IConstitutionalPrinciple,
  ISafetyInvariant,
  IModelCard,
  RiskLevel as SafetyRiskLevel,
} from './safety/interfaces/ISafetyEnvelope';

// =============================================================================
// CAUSAL INFERENCE
// =============================================================================

export type {
  ICausalGraph,
  ICausalEdge,
  ICausalNode,
  IInterventionTarget,
} from './causal/interfaces/ICausalGraph';

// =============================================================================
// EXPLAINABILITY
// =============================================================================

export type {
  ISHAPExplanation,
  ICounterfactualExplanation,
  IGlobalFeatureImportance,
  IFeatureAttribution,
  INarrativeExplanation,
  IExplainabilityService,
} from './explainability/interfaces/IExplainability';

// =============================================================================
// METACOGNITION
// =============================================================================

export type {
  IMetacognitiveState,
} from './metacognition/interfaces/IMetacognitiveState';

// =============================================================================
// MOTIVATION (MI)
// =============================================================================

export type {
  IMotivationalState,
} from './motivation/interfaces/IMotivationalState';

// =============================================================================
// PIPELINE
// =============================================================================

export type {
  IIncomingMessage,
  IMessageAnalysis,
  IPipelineResult,
  MessageIntent,
  AgeGroup as PipelineAgeGroup,
} from './pipeline/IMessagePipeline';

// =============================================================================
// DIGITAL TWIN
// =============================================================================

export type {
  IDigitalTwinState,
  ITwinStateVariable,
  IStateTrajectory,
  IScenario,
  IScenarioResult,
  ITippingPoint,
  IDigitalTwinService,
} from './twin/interfaces/IDigitalTwin';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Language supported by the engine
 */
export type SupportedLanguage = 'en' | 'ru';

/**
 * Domain vertical type (for extension)
 */
export type DomainVertical =
  | 'addiction'    // БАЙТ - digital addiction
  | 'sleep'        // SleepCore - insomnia/CBT-I
  | 'pain'         // PainCore - chronic pain
  | 'anxiety'      // AnxietyCore - GAD
  | 'depression'   // DepressionCore - MDD
  | 'custom';      // Custom domain
