/**
 * Bot Services Module
 * ===================
 * Exports for bot-related services.
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

// ==================== Proactive Notifications ====================
export {
  ProactiveNotificationService,
  createProactiveNotificationService,
} from './ProactiveNotificationService';

export type {
  INotificationPreferences,
  IUserNotificationData,
  INotificationJob,
} from './ProactiveNotificationService';

// ==================== Sentiment Analysis (Emotion-Aware UI) ====================
export {
  SentimentAnalysisService,
  sentimentAnalysis,
} from './SentimentAnalysisService';

export type { ISentimentResult, IAnalysisContext } from './SentimentAnalysisService';

// ==================== Reply Keyboard (Thumb-Zone UX) ====================
export {
  ReplyKeyboardService,
  replyKeyboard,
} from './ReplyKeyboardService';

export type {
  IReplyButton,
  IKeyboardLayout,
  IKeyboardContext,
} from './ReplyKeyboardService';

// ==================== Streak Counter (Forgiveness-First) ====================
export {
  StreakService,
  streakService,
} from './StreakService';

export type {
  IStreakData,
  IStreakMilestone,
  IStreakUpdateResult,
  IStreakConfig,
  IDailyActivity,
} from './StreakService';

// ==================== Progress Visualization ====================
export {
  ProgressVisualizationService,
  progressVisualization,
} from './ProgressVisualizationService';

export type {
  IProgressBarConfig,
  ITherapyProgress,
  IProgressSummary,
  ProgressBarStyle,
} from './ProgressVisualizationService';

// ==================== Emoji Slider (Wysa-Style Mood Tracking) ====================
export {
  EmojiSliderService,
  emojiSlider,
} from './EmojiSliderService';

export type {
  MoodLevel,
  SleepQualityLevel,
  IMoodScaleItem,
  ISleepScaleItem,
  IMoodFactor,
  IMoodEntry,
  ISleepEntry,
  IMoodHistory,
  IMoodAnalysis,
} from './EmojiSliderService';

// ==================== Hub Menu (Hub-and-Spoke Navigation) ====================
export {
  HubMenuService,
  hubMenu,
} from './HubMenuService';

export type {
  IMenuSection,
  IMenuCommand,
  IHubMenuLayout,
} from './HubMenuService';

// ==================== Onboarding Tracking (Funnel Analytics) ====================
export {
  OnboardingTrackingService,
  onboardingTracker,
} from './OnboardingTrackingService';

export type {
  OnboardingStep,
  IStepCompletion,
  IOnboardingProgress,
  IFunnelAnalytics,
  IOnboardingEvent,
} from './OnboardingTrackingService';

// ==================== Daily Greeting (Mood-Integrated) ====================
export {
  DailyGreetingService,
  dailyGreeting,
} from './DailyGreetingService';

export type {
  TimeOfDay,
  IGreetingContext,
  IDailyGreeting,
  MoodPromptStyle,
} from './DailyGreetingService';

// ==================== Year in Pixels (Daylio-Style Visualization) ====================
export {
  YearInPixelsService,
  yearInPixels,
} from './YearInPixelsService';

export type {
  PixelStyle,
  ViewMode,
  IPixelData,
  IMonthStats,
  IYearStats,
} from './YearInPixelsService';

// ==================== Adaptive Keyboard (Personalized UI) ====================
export {
  buildAdaptiveHubKeyboard,
  recordHubInteraction,
  getAdaptiveLayout,
} from './HubMenuService';

// ==================== Gamification Context (Sprint 7) ====================
export {
  gamificationContext,
  getGamificationEngine,
} from './GamificationContext';

// ==================== ISI Scheduling (Phase 1.3) ====================
export {
  ISISchedulingService,
  createISISchedulingService,
} from './ISISchedulingService';

// ==================== Admin Dashboard (Phase 1.3) ====================
export {
  AdminDashboardService,
  createAdminDashboardService,
} from './AdminDashboardService';

export type {
  UserRole,
  AdminAction,
  IDashboardMetrics,
  IUserSummary,
  IAdminAuditEntry,
} from './AdminDashboardService';

// ==================== Adverse Event Reporting (Phase 1.3) ====================
export {
  AdverseEventService,
  createAdverseEventService,
  DTX_AE_CATEGORIES,
} from './AdverseEventService';

export type {
  AESeverity,
  SeriousnessCriteria,
  AEOutcome,
  CausalityAssessment,
  Expectedness,
  ActionTaken,
  ReportStatus,
  ICIOMSMinimumData,
  IAdverseEventReport,
  ISafetyAlert,
} from './AdverseEventService';

// ==================== Anonymized Data Export (Phase 1.3) ====================
export {
  AnonymizedDataExportService,
  createAnonymizedDataExportService,
  DEFAULT_EXPORT_CONFIG,
} from './AnonymizedDataExportService';

export type {
  AnonymizationLevel,
  ExportFormat,
  DateTransformation,
  AgeTransformation,
  IExportConfig,
  IAnonymizedParticipant,
  IAnonymizedISI,
  IAnonymizedDiaryEntry,
  IAnonymizedAdverseEvent,
  IAnonymizedDataset,
  IExportAuditEntry,
} from './AnonymizedDataExportService';

// ==================== Crisis Detection (Phase 1.4 Safety) ====================
export {
  CrisisDetectionService,
  createCrisisDetectionService,
  crisisDetectionService,
  DEFAULT_CRISIS_SERVICE_CONFIG,
} from './CrisisDetectionService';

export type {
  CrisisAction,
  ICrisisEvent,
  ICrisisResponse,
  ICrisisDetectionServiceConfig,
} from './CrisisDetectionService';

// ==================== Crisis Escalation (Phase 1.4 Safety) ====================
export {
  CrisisEscalationService,
  createCrisisEscalationService,
  crisisEscalationService,
  DEFAULT_ESCALATION_CONFIG,
  SAFETY_PLAN_STEPS,
} from './CrisisEscalationService';

export type {
  EscalationLevel,
  IAdminNotification,
  ISafetyPlanStep,
  IUserSafetyPlan,
  ICrisisEscalationConfig,
} from './CrisisEscalationService';

// ==================== Sleep Prediction (Phase 2.1 PLRNN) ====================
export {
  SleepPredictionService,
  createSleepPredictionService,
  sleepPredictionService, // Sprint 1: Singleton instance for runtime
  DEFAULT_SLEEP_PREDICTION_CONFIG,
  SLEEP_DIMENSION_MAPPING,
} from './SleepPredictionService';

export type {
  ISleepPredictionConfig,
  ISleepHistoryEntry,
  ISleepPrediction,
  ISleepEarlyWarning,
} from './SleepPredictionService';

// ==================== Digital Twin (Sprint 2) ====================
export {
  DigitalTwinService,
  createDigitalTwinService,
  digitalTwinService,
} from './DigitalTwinService';

export type {
  IDigitalTwin,
  ITrajectory,
  ITippingPoint,
  IScenario,
  ISimulationResult,
  IComparisonResult,
} from './DigitalTwinService';

// ==================== Constitutional AI Middleware (Sprint 2) ====================
export {
  ConstitutionalMiddleware,
  createConstitutionalMiddleware,
  constitutionalMiddleware,
  DEFAULT_CONSTITUTIONAL_CONFIG,
} from '../middleware/ConstitutionalMiddleware';

export type {
  ConstitutionalPrinciple,
  ViolationSeverity,
  IConstitutionalCheck,
  IConstitutionalConfig,
} from '../middleware/ConstitutionalMiddleware';

// ==================== Causal Insights (Sprint 3) ====================
export {
  CausalInsightsService,
  createCausalInsightsService,
  causalInsightsService,
  DOMAIN_KNOWLEDGE_EDGES,
} from './CausalInsightsService';

export type {
  ICausalFactor,
  ICausalEdge,
  ICausalGraph,
  IPersonalizedInsight,
  IInterventionTarget,
  ICausalInsightsConfig,
} from './CausalInsightsService';

// ==================== Proactive Intelligence (Sprint 4-5) ====================
export {
  ProactiveIntelligenceService,
  createProactiveIntelligenceService,
  proactiveIntelligenceService,
  DEFAULT_PROACTIVE_CONFIG,
} from './ProactiveIntelligenceService';

export type {
  IProactiveInsight,
  IDailyAnalysis,
  IPatternAlert,
  IRiskAlert,
  IProactiveIntelligenceConfig,
  // Sprint 5: Critical Slowing Down & Thompson Sampling
  ICriticalSlowingDown,
  IThompsonSamplingState,
  IEngagementTracking,
  IOptimalTiming,
} from './ProactiveIntelligenceService';

// ==================== Adaptive Persona (Sprint 4) ====================
export {
  AdaptivePersonaService,
  createAdaptivePersonaService,
  adaptivePersonaService,
} from './AdaptivePersonaService';

export type {
  ChangeStage,
  MIStrategy,
  IEmotionalState,
  IAdaptedMessage,
  ICommunicationProfile,
} from './AdaptivePersonaService';

// ==================== Voice Biomarkers (Sprint 6) ====================
export {
  VoiceBiomarkerService,
  createVoiceBiomarkerService,
  voiceBiomarkerService,
  DEFAULT_VOICE_BIOMARKER_CONFIG,
} from './VoiceBiomarkerService';

export type {
  IAcousticFeatures,
  IVoiceBiomarkerResult,
  IFeatureDeviation,
  IVoiceInterpretation,
  IRecordingQuality,
  IVoiceBaseline,
  IVoiceBiomarkerConfig,
} from './VoiceBiomarkerService';

// ==================== Metacognitive Therapy (Sprint 7) ====================
export {
  WorryPostponementService,
  worryPostponementService,
} from './WorryPostponementService';

export type {
  IWorryEntry,
  IWorryTimeSettings,
  IWorrySession,
  IWorryStatistics,
  IWorryPostponementConfig,
} from './WorryPostponementService';

export {
  ATTService,
  attService,
  createATTService,
  DEFAULT_ATT_CONFIG,
} from './ATTService';

export type {
  ATTPhase,
  IATTAudioInstruction,
  IATTSessionRecord,
  IATTProgress,
  IATTConfig,
} from './ATTService';

export {
  MCQ30AssessmentService,
  mcq30AssessmentService,
  createMCQ30AssessmentService,
  MCQ30_ITEMS,
  MCQ30_SUBSCALES,
  MCQ30_RESPONSE_OPTIONS,
  DEFAULT_MCQ30_CONFIG,
} from './MCQ30AssessmentService';

export type {
  MCQ30Subscale,
  IMCQ30Item,
  ISubscaleInfo,
  IMCQ30Response,
  IMCQ30Result,
  IMCQ30Config,
} from './MCQ30AssessmentService';

export {
  DetachedMindfulnessService,
  detachedMindfulnessService,
  createDetachedMindfulnessService,
  DM_EXERCISES,
  DEFAULT_DM_CONFIG,
} from './DetachedMindfulnessService';

export type {
  DMExerciseType,
  IDMExercise,
  IDMSessionRecord,
  IDMSkillLevel,
  IDMConfig,
} from './DetachedMindfulnessService';

export {
  MetacognitiveEngineService,
  metacognitiveEngineService,
} from './MetacognitiveEngineService';

export type {
  MCTTrigger,
  IMCTResponse,
  IMCTStatus,
  IMCTCSDData,
} from './MetacognitiveEngineService';

// ==================== Modules Re-export ====================
export * from '../../modules';
