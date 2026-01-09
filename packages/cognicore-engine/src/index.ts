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
  version: '2.0.0-alpha.1',
  name: '@cognicore/engine',
  description: 'POMDP-based Cognitive State Engine for Digital Therapeutics with Nonlinear Dynamics',
  buildDate: '2025-12-28',
  phase: 'Phase 1 - Nonlinear Core',
  features: [
    'PLRNN for nonlinear psychological dynamics',
    'KalmanFormer hybrid architecture',
    'Voice biomarker analysis',
    'Multimodal fusion (text + voice)',
    'Early warning signal detection',
  ],
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

// Phase 1 Integration: BeliefStateAdapter
// Bridges BeliefUpdateEngine with PLRNN/KalmanFormer nonlinear engines
export {
  BeliefStateAdapter,
  createBeliefStateAdapter,
  beliefStateToObservation,
  beliefStateToUncertainty,
  beliefStateToPLRNNState,
  beliefStateToKalmanFormerState,
  plrnnStateToBeliefUpdate,
  kalmanFormerStateToBeliefUpdate,
  mergeHybridPredictions,
  DIMENSION_MAPPING,
  DIMENSION_INDEX,
} from './belief/BeliefStateAdapter';

export type { IHybridPrediction } from './belief/BeliefStateAdapter';

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

// =============================================================================
// PHASE 1: NONLINEAR DYNAMICS ENGINE (2025)
// =============================================================================

// PLRNN Engine - Piecewise Linear RNN for nonlinear psychological dynamics
export type {
  IPLRNNEngine,
  IPLRNNConfig,
  IPLRNNState,
  IPLRNNPrediction,
  IPLRNNWeights,
  IPLRNNTrainingSample,
  IPLRNNTrainingResult,
  ICausalNetwork,
  ICausalNode as IPLRNNCausalNode,
  ICausalEdge as IPLRNNCausalEdge,
  IEarlyWarningSignal,
  IInterventionSimulation,
  PLRNNEngineFactory,
} from './temporal/interfaces/IPLRNNEngine';

export {
  PLRNNEngine,
  createPLRNNEngine,
  DEFAULT_PLRNN_CONFIG,
} from './temporal/engines/PLRNNEngine';

// KalmanFormer Engine - Hybrid Kalman + Transformer architecture
export type {
  IKalmanFormerEngine,
  IKalmanFormerConfig,
  IKalmanFormerState,
  IKalmanFormerPrediction,
  IKalmanFormerWeights,
  IKalmanFormerTrainingSample,
  IAttentionWeights,
  KalmanFormerEngineFactory,
} from './temporal/interfaces/IKalmanFormer';

export {
  KalmanFormerEngine,
  createKalmanFormerEngine,
  DEFAULT_KALMANFORMER_CONFIG,
} from './temporal/engines/KalmanFormerEngine';

// Voice Input Adapter - Acoustic analysis & multimodal fusion
export type {
  IVoiceInputAdapter,
  IVoiceAdapterConfig,
  IVoiceProcessingResult,
  IAcousticFeatures,
  IProsodyFeatures,
  IVoiceEmotionEstimate,
  ITextAnalysis,
  IMultimodalFusion,
  VoiceInputAdapterFactory,
} from './voice/interfaces/IVoiceAdapter';

export {
  VoiceInputAdapter,
  createVoiceInputAdapter,
  DEFAULT_VOICE_CONFIG,
} from './voice/VoiceInputAdapter';
