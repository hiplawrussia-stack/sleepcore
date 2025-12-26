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
export declare const COGNICORE_VERSION: {
    version: string;
    name: string;
    description: string;
    buildDate: string;
};
export type { EmotionType, EmotionTrend, VADDimensions, ScoredEmotion, EmotionPattern, RegulationEffectiveness, IEmotionalState, IEmotionalStateBuilder, IEmotionalStateFactory, IVADMapper, } from './state/interfaces/IEmotionalState';
export { DEFAULT_EMOTION_VAD, EMOTION_THERAPY_MAPPING, } from './state/interfaces/IEmotionalState';
export type { CognitiveTriad, CognitiveDistortionType, CognitiveDistortion, AttentionalBias, ThinkingStyle, BeliefUpdate, CoreBeliefPattern, CognitiveLoad, Metacognition, ICognitiveState, ICognitiveStateBuilder, ICognitiveStateFactory, ICognitiveDistortionDetector, } from './state/interfaces/ICognitiveState';
export { DISTORTION_PATTERNS, DISTORTION_INTERVENTIONS, } from './state/interfaces/ICognitiveState';
export type { ChangeStage, NarrativeRole, NarrativeMoment, NarrativeChapter, NarrativeTheme, StageTransition, INarrativeState, INarrativeStateBuilder, } from './state/interfaces/INarrativeState';
export type { RiskLevel, RiskTrajectory, RiskFactor, ProtectiveFactor, SafetyPlan, IRiskState, IRiskStateBuilder, } from './state/interfaces/IRiskState';
export type { PERMADimensions, CopingStrategy, CopingStrategyType, EnergyLevel, Resilience, SocialResources, IResourceState, IResourceStateBuilder, } from './state/interfaces/IResourceState';
export type { ObservationSource, StateQuality, BeliefState, StateTransition, TemporalPrediction, StateSummary, StateBasedRecommendation, IStateVector, IStateVectorBuilder, IStateVectorFactory, IStateVectorService, IStateVectorRepository, ComponentStatus, AgeGroup, } from './state/interfaces/IStateVector';
export { WELLBEING_WEIGHTS, INDEX_THRESHOLDS, getComponentStatus, } from './state/interfaces/IStateVector';
export type { Observation, BeliefUpdateResult, IBeliefUpdateEngine, } from './belief/IBeliefUpdate';
export type { VulnerabilityWindow, ITemporalEchoEngine, } from './temporal/ITemporalPrediction';
export type { TextAnalysisResult, TherapeuticInsight, SocraticQuestion, ABCDChain, DetectedDistortion, IDeepCognitiveMirror, } from './mirror/IDeepCognitiveMirror';
export type { IIntervention, IInterventionSelection, IInterventionOutcome, IContextualFeatures, IDecisionPoint, IInterventionOptimizer, } from './intervention/IInterventionOptimizer';
export type { SafetyLevel, ISafetyContext, ISafetyValidationResult, ICrisisDetectionResult, IHumanEscalationRequest, IEscalationDecision, IConstitutionalPrinciple, ISafetyInvariant, IModelCard, RiskLevel as SafetyRiskLevel, } from './safety/interfaces/ISafetyEnvelope';
export type { ICausalGraph, ICausalEdge, ICausalNode, IInterventionTarget, } from './causal/interfaces/ICausalGraph';
export type { ISHAPExplanation, ICounterfactualExplanation, IGlobalFeatureImportance, IFeatureAttribution, INarrativeExplanation, IExplainabilityService, } from './explainability/interfaces/IExplainability';
export type { IMetacognitiveState, } from './metacognition/interfaces/IMetacognitiveState';
export type { IMotivationalState, } from './motivation/interfaces/IMotivationalState';
export type { IIncomingMessage, IMessageAnalysis, IPipelineResult, MessageIntent, AgeGroup as PipelineAgeGroup, } from './pipeline/IMessagePipeline';
export type { IDigitalTwinState, ITwinStateVariable, IStateTrajectory, IScenario, IScenarioResult, ITippingPoint, IDigitalTwinService, } from './twin/interfaces/IDigitalTwin';
/**
 * Language supported by the engine
 */
export type SupportedLanguage = 'en' | 'ru';
/**
 * Domain vertical type (for extension)
 */
export type DomainVertical = 'addiction' | 'sleep' | 'pain' | 'anxiety' | 'depression' | 'custom';
//# sourceMappingURL=index.d.ts.map