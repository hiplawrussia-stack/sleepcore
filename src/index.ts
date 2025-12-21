/**
 * @sleepcore/app - AI-Powered CBT-I Digital Therapeutic
 * ======================================================
 *
 * SleepCore is a digital therapeutic platform for treating
 * chronic insomnia using Cognitive Behavioral Therapy for
 * Insomnia (CBT-I) enhanced with AI/ML optimization.
 *
 * Built on CogniCore Engine, SleepCore leverages:
 * - POMDP framework for optimal intervention selection
 * - Thompson Sampling for personalized treatment
 * - Kalman Filter for sleep state estimation
 * - Digital Twin for predictive modeling
 *
 * Key Features:
 * - 5-component CBT-I: SRT, SCT, CR, SHE, RT
 * - Smart sleep diary with pattern analysis
 * - Real-time intervention optimization
 * - Progress tracking and analytics
 *
 * @packageDocumentation
 * @module @sleepcore/app
 */

// ============= Main API =============
export { SleepCoreAPI, sleepCore } from './SleepCoreAPI';
export type {
  ISleepCoreSession,
  IDailyCheckIn,
  IInterventionResult,
  IProgressReport,
} from './SleepCoreAPI';

// ============= Sleep Interfaces =============
export type {
  ISleepState,
  ISleepStateVector,
  ISleepMetrics,
  ISleepArchitecture,
  ICircadianState,
  ISleepHomeostasis,
  IInsomniaSeverity,
  ISleepBehaviors,
  ISleepCognitions,
  ISleepDiaryEntry,
  IWearableSleepData,
  ISleepStateBuilder,
  ISleepStateFactory,
  SleepStage,
  Chronotype,
  InsomniaSubtype,
  SleepQualityRating,
} from './sleep/interfaces/ISleepState';

export {
  calculateSleepEfficiency,
  getInsomniaSeverity,
  calculateSleepHealthScore,
} from './sleep/interfaces/ISleepState';

// ============= CBT-I Interfaces =============
export type {
  CBTIComponent,
  CBTIPhase,
  IntensityLevel,
  ISleepRestrictionPrescription,
  ISleepRestrictionRules,
  ISleepRestrictionEngine,
  IStimulusControlRules,
  IStimulusControlAdherence,
  IStimulusControlEngine,
  IDysfunctionalBelief,
  ICognitiveSession,
  ICognitiveRestructuringEngine,
  SleepHygieneCategory,
  ISleepHygieneRecommendation,
  ISleepHygieneAssessment,
  ISleepHygieneEngine,
  RelaxationTechnique,
  IRelaxationSession,
  IRelaxationProtocol,
  IRelaxationEngine,
  ICBTIPlan,
  ICBTIIntervention,
  ICBTIEngine,
} from './cbt-i/interfaces/ICBTIComponents';

// ============= CBT-I Engines =============
export { CBTIEngine } from './cbt-i/engines/CBTIEngine';
export { SleepRestrictionEngine } from './cbt-i/engines/SleepRestrictionEngine';
export { StimulusControlEngine } from './cbt-i/engines/StimulusControlEngine';
export { CognitiveRestructuringEngine } from './cbt-i/engines/CognitiveRestructuringEngine';
export { SleepHygieneEngine } from './cbt-i/engines/SleepHygieneEngine';
export { RelaxationEngine } from './cbt-i/engines/RelaxationEngine';

// ============= Sleep Diary =============
export { SleepDiaryService } from './diary/SleepDiaryService';
export type {
  IWeeklySleepSummary,
  ISleepPatternAnalysis,
} from './diary/SleepDiaryService';

// ============= Platform (POMDP) =============
export { SleepCorePOMDP } from './platform/SleepCorePOMDP';
export type {
  ISleepPOMDPState,
  ISleepObservation,
  IActionStats,
  ISleepPOMDPConfig,
  SleepAction,
} from './platform/SleepCorePOMDP';

// ============= Third-Wave Therapies (NEW) =============
// MBT-I: Mindfulness-Based Therapy for Insomnia (Ong, 2014)
// ACT-I: Acceptance and Commitment Therapy for Insomnia (Meadows, 2014)
export { MBTIEngine } from './third-wave/engines/MBTIEngine';
export { ACTIEngine } from './third-wave/engines/ACTIEngine';
export { ThirdWaveCoordinator, thirdWaveCoordinator } from './third-wave/engines/ThirdWaveCoordinator';

export type {
  // Shared types
  MindfulnessPractice,
  ACTProcess,
  SessionLevel,
  TherapyModality,
  ThirdWaveApproach,
  IThirdWaveRecommendation,
  IThirdWaveCoordinator,

  // MBT-I types
  IMBTISession,
  IMindfulnessSession,
  ISleepArousal,
  IMBTIPlan,
  IMBTIEngine,

  // ACT-I types
  IUnwantedExperience,
  IDefusionTechnique,
  IValuesAssessment,
  ICommittedAction,
  IACTISession,
  IACTIPlan,
  IACTIEngine,
} from './third-wave/interfaces/IThirdWaveTherapies';

// ============= Assessment Instruments (NEW) =============
// ISI (Insomnia Severity Index) - Russian Validated Version
export {
  ISIAssessment,
  isiAssessment,
  ISI_ITEMS,
  ISI_CUTOFFS,
  ISI_MCID,
  ISI_RESPONSE_THRESHOLD,
  ISI_REMISSION_CUTOFF,
  ISI_RUSSIAN_PSYCHOMETRICS,
  ISI_RUSSIAN_NORMS,
} from './assessment';

export type {
  ISIItemScore,
  ISISeverity,
  IISIResponse,
  IISIResult,
  IISIItem,
  IISINormativeData,
} from './assessment';

// ============= Cultural Adaptations (NEW) =============
// TCM (Traditional Chinese Medicine) Integration
export {
  TCMIntegratedCBTIEngine,
  tcmCBTIEngine,
  INSOMNIA_ACUPOINTS,
  HERBAL_FORMULAS,
  TAI_CHI_PROTOCOL,
  QIGONG_PROTOCOL,
} from './cultural-adaptations';

export type {
  TCMConstitution,
  TCMInsomniaPattern,
  TCMTherapyType,
  IntegrationMode,
  IAcupoint,
  IHerbalFormula,
  IMindBodyProtocol,
  ITCMAssessment,
  ITCMCBTIPlan,
} from './cultural-adaptations';

// Ayurveda & Yoga Integration
export {
  AyurvedaYogaEngine,
  ayurvedaYogaEngine,
  SLEEP_HERBS,
  YOGA_NIDRA_PROTOCOL,
  DINACHARYA_TEMPLATES,
} from './cultural-adaptations';

export type {
  Dosha,
  Prakriti,
  IVikriti,
  AnidraType,
  YogaNidraStage,
  AyurvedicTherapy,
  IAyurvedicHerb,
  IYogaNidraProtocol,
  IDinacharya,
  IAyurvedicAssessment,
} from './cultural-adaptations';

// ============= Evidence Base (NEW) =============
// European Insomnia Guideline 2023
export {
  EuropeanGuideline2023,
  europeanGuideline2023,
  DIAGNOSTIC_RECOMMENDATIONS,
  TREATMENT_RECOMMENDATIONS,
  PHARMACOLOGICAL_RECOMMENDATIONS,
  CBTI_COMPONENT_EVIDENCE,
  PHARMACOLOGICAL_EVIDENCE,
  DCBTI_CRITERIA,
} from './evidence-base';

export type {
  EvidenceGrade,
  RecommendationStrength,
  TreatmentCategory,
  IGuidelineRecommendation,
  ICBTIComponentEvidence,
  IPharmacologicalEvidence,
  IDCBTICriteria,
} from './evidence-base';

// ============= Circadian AI (NEW) =============
export {
  CircadianAI,
  circadianAI,
  MEQ_ITEMS,
  MEQ_THRESHOLDS,
  SOCIAL_JETLAG_THRESHOLDS,
} from './circadian';

export type {
  ChronotypeCategory,
  IMEQResponse,
  IMCTQResponse,
  ICircadianAssessment,
  IChronotherapyPlan,
} from './circadian';

// ============= Version Info =============
export const VERSION = '1.0.0-alpha.4';
export const PLATFORM = 'sleepcore';
export const BUILD_DATE = new Date().toISOString().split('T')[0];

/**
 * Quick start example:
 *
 * ```typescript
 * import { sleepCore, type ISleepDiaryEntry } from '@sleepcore/app';
 *
 * // Start session
 * const session = sleepCore.startSession('user123');
 *
 * // Add diary entries for 7 days (baseline)
 * for (const entry of baselineEntries) {
 *   sleepCore.addDiaryEntry(entry);
 * }
 *
 * // Initialize treatment
 * const plan = sleepCore.initializeTreatment('user123', baselineStates);
 *
 * // Daily check-in
 * const result = sleepCore.processDailyCheckIn({
 *   userId: 'user123',
 *   date: '2025-01-15',
 *   diaryEntry: todayEntry,
 *   morningMood: 4,
 *   energyLevel: 3,
 *   followedSleepWindow: true,
 *   usedRelaxation: true,
 * });
 *
 * console.log(result.intervention.action);
 * // "Придерживайтесь назначенного времени сна..."
 *
 * // Get progress
 * const progress = sleepCore.getProgressReport('user123');
 * console.log(`ISI: ${progress.currentISI} (Δ${progress.isiChange})`);
 * ```
 */
