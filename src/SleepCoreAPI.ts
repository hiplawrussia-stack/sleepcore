/**
 * SleepCoreAPI - Main SleepCore Facade
 * =====================================
 * Unified API for SleepCore digital therapeutic platform.
 *
 * Provides access to:
 * - Sleep diary management
 * - CBT-I treatment engine (5 components)
 * - POMDP-based intervention optimization
 * - Progress tracking and analytics
 *
 * Built on CogniCore Engine for:
 * - Thompson Sampling intervention selection
 * - Kalman Filter state estimation
 * - Digital Twin sleep modeling
 *
 * @packageDocumentation
 * @module @sleepcore/app
 */

import { SleepDiaryService } from './diary/SleepDiaryService';
import { CBTIEngine } from './cbt-i/engines/CBTIEngine';
import {
  SleepCoreAdapter,
  createSleepCoreAdapter,
  type ISleepInterventionSelection,
  type ISleepInterventionExplanation,
  type IFullBeliefState,
} from './platform/SleepCoreAdapter';
// CogniCore Engine integration (POMDP belief state + Thompson Sampling optimization)
import {
  createBeliefUpdateEngine,
  createInterventionOptimizer,
} from '@cognicore/engine';
import type { SleepAction } from './platform/SleepCorePOMDP';
import { ThirdWaveCoordinator } from './third-wave/engines/ThirdWaveCoordinator';
import type {
  ISleepState,
  ISleepMetrics,
  ISleepDiaryEntry,
} from './sleep/interfaces/ISleepState';
import type {
  ICBTIPlan,
  ICBTIIntervention,
  RelaxationTechnique,
} from './cbt-i/interfaces/ICBTIComponents';
import type {
  IThirdWaveRecommendation,
  IMBTIPlan,
  IACTIPlan,
  IMCTPlan,
  MindfulnessPractice,
  IDefusionTechnique,
  IUnwantedExperience,
  SessionLevel,
  IWorryPattern,
  IMindfulnessSession,
  ISleepArousal,
} from './third-wave/interfaces/IThirdWaveTherapies';

// ============= NEW: Circadian & Cultural Adaptations =============
import {
  CircadianAI,
  type ChronotypeCategory,
  type IMEQResponse,
  type IMCTQResponse,
  type ICircadianAssessment,
  type IChronotherapyPlan,
} from './circadian';
import {
  TCMIntegratedCBTIEngine,
  AyurvedaYogaEngine,
  INSOMNIA_ACUPOINTS,
  type ITCMAssessment,
  type ITCMCBTIPlan,
  type IAyurvedicAssessment,
  type IYogaNidraProtocol,
  type IDinacharya,
  type IAyurvedicHerb,
  type IYogaNidraSafetyScreening,
  type IYogaNidraSafetyResult,
} from './cultural-adaptations';
import {
  EuropeanGuideline2023,
  type EvidenceGrade,
  type IGuidelineRecommendation,
  type ICBTIComponentEvidence,
  type IPharmacologicalEvidence,
} from './evidence-base';

// Phase 6: Wire orphaned services
import {
  metacognitiveEngineService,
} from './bot/services/MetacognitiveEngineService';
import {
  adaptivePersonaService,
} from './bot/services/AdaptivePersonaService';
import {
  proactiveIntelligenceService,
  type IProactiveInsight,
} from './bot/services/ProactiveIntelligenceService';

// Wave 1: SleepPrediction facade routing
import { sleepPredictionService } from './bot/services/SleepPredictionService';

// Wave 2: DigitalTwin, CausalInsights, CognitiveProgress, Arousal
import { digitalTwinService } from './bot/services/DigitalTwinService';
import { causalInsightsService } from './bot/services/CausalInsightsService';
import { cognitiveProgressReportService } from './bot/services/CognitiveProgressReportService';
import { arousalAssessmentService } from './bot/services/ArousalAssessmentService';

// Wave 3: Crisis Detection & Escalation (IEC 62304 Class C — accessor only)
import { crisisDetectionService } from './bot/services/CrisisDetectionService';
import { crisisEscalationService } from './bot/services/CrisisEscalationService';

// Wave 4: Gamification facade routing (P2-1 fix)
import { getGamificationEngine } from './bot/services/GamificationContext';

// Wave 5: Precision Phenotyping (Blanken 2019, PAT Ruan 2024)
import {
  PhenotypingService,
  type ISleepProfile,
  type ITherapyRecommendation as IPhenotypeTherapyRecommendation,
} from './sleep/services/PhenotypingService';
import type { IActigraphySession } from './sleep/interfaces/IActigraphy';
import type {
  IGamificationEngine,
  IGamificationResult,
  IPlayerProfile,
  IActiveQuestInfo,
  IStreakInfo,
  GamificationAction,
} from './modules/gamification/IGamificationEngine';
import type { IActiveQuest, IQuest } from './modules/quests/QuestService';
import type { IUserBadge, IBadge } from './modules/quests/BadgeService';

// Wave 6: AInsomnia Features (Seasonal, Activity Proxy, Anomaly Detection)
import {
  SeasonalEngine,
  type SeasonalContext,
  type LightRecommendation,
  type SeasonalTip,
  type SeasonalTIBAdjustment,
  type UserLocation,
} from './seasonal';
import {
  ActivityProxyEngine,
  type ActivityData,
  type EstimatedSleep,
  type ActivityPattern,
} from './activity';
import {
  AnomalyDetector,
  type BaselineStats,
  type AnomalyResult,
  type SleepSessionForAnomaly,
} from './anomaly';

/**
 * SleepCore user session
 */
/**
 * Baseline ISI assessment data
 * Recorded during onboarding (/start command)
 */
export interface IBaselineISI {
  readonly score: number;
  readonly severity: string;
  readonly date: Date;
  readonly answers: number[];
}

export interface ISleepCoreSession {
  readonly userId: string;
  readonly startDate: Date;
  readonly plan: ICBTIPlan | null;
  readonly mbtiPlan: IMBTIPlan | null;
  readonly actiPlan: IACTIPlan | null;
  readonly mctPlan: IMCTPlan | null;
  readonly isActive: boolean;

  /** Baseline ISI from onboarding assessment (Morin et al., 2011) */
  readonly baselineISI: IBaselineISI | null;

  // NEW: Circadian & Cultural Adaptations
  readonly circadianAssessment: ICircadianAssessment | null;
  readonly chronotherapyPlan: IChronotherapyPlan | null;
  readonly tcmAssessment: ITCMAssessment | null;
  readonly tcmPlan: ITCMCBTIPlan | null;
  readonly ayurvedicAssessment: IAyurvedicAssessment | null;

  /** Weekly snapshots of dysfunctional beliefs for cognitive progress tracking */
  readonly beliefHistory: import('./cbt-i/interfaces/ICBTIComponents').IDysfunctionalBelief[][];

  /** Sleep phenotype profile from PAT analysis (Blanken 2019, Ruan 2024) */
  readonly sleepProfile: ISleepProfile | null;
}

/**
 * Daily check-in data
 */
export interface IDailyCheckIn {
  /** User ID */
  userId: string;

  /** Date of check-in */
  date: string;

  /** Sleep diary entry */
  diaryEntry: ISleepDiaryEntry;

  /** Morning mood (1-5) */
  morningMood: number;

  /** Energy level (1-5) */
  energyLevel: number;

  /** Did user follow sleep window? */
  followedSleepWindow: boolean;

  /** Did user use relaxation? */
  usedRelaxation: boolean;

  /** Notes */
  notes?: string;
}

/**
 * Intervention result
 */
export interface IInterventionResult {
  /** The recommended intervention */
  intervention: ICBTIIntervention;

  /** Confidence score (0-1) */
  confidence: number;

  /** Alternative interventions */
  alternatives: ICBTIIntervention[];

  /** Explanation */
  rationale: string;
}

/**
 * Progress report
 */
export interface IProgressReport {
  /** Current ISI score */
  currentISI: number;

  /** ISI change from baseline */
  isiChange: number;

  /** Current sleep efficiency */
  currentSleepEfficiency: number;

  /** Sleep efficiency change */
  sleepEfficiencyChange: number;

  /** Treatment week */
  currentWeek: number;

  /** Overall adherence */
  overallAdherence: number;

  /** Key achievements */
  achievements: string[];

  /** Areas for improvement */
  improvements: string[];

  /** Treatment response status */
  responseStatus: 'responding' | 'partial' | 'non-responding';
}

/**
 * Main SleepCore API Class
 */
export class SleepCoreAPI {
  private readonly diaryService: SleepDiaryService;
  private readonly cbtiEngine: CBTIEngine;
  private readonly adapter: SleepCoreAdapter;
  private readonly thirdWave: ThirdWaveCoordinator;

  // NEW: Circadian & Cultural Adaptation Engines
  private readonly circadianAI: CircadianAI;
  private readonly tcmEngine: TCMIntegratedCBTIEngine;
  private readonly ayurvedaEngine: AyurvedaYogaEngine;
  private readonly guideline2023: EuropeanGuideline2023;

  // Wave 5: Precision Phenotyping (Blanken 2019, PAT Ruan 2024)
  private readonly phenotypingService: PhenotypingService;

  // Wave 6: AInsomnia Features (Seasonal, Activity Proxy, Anomaly Detection)
  private readonly seasonalEngine: SeasonalEngine;
  private readonly activityProxyEngine: ActivityProxyEngine;
  private readonly anomalyDetector: AnomalyDetector;
  private userLocations: Map<string, UserLocation>;

  private sessions: Map<string, ISleepCoreSession>;
  private sleepStates: Map<string, ISleepState[]>;

  /**
   * Optional database connection for admin/export features
   * Set via setDatabase() after construction
   */
  private _db: import('./infrastructure/database/interfaces/IDatabaseConnection').IDatabaseConnection | null = null;

  /**
   * Optional service hooks for ISI scheduling and proactive notifications.
   * Set via setServiceHooks() after construction in main.ts.
   *
   * Design: Callback-based to avoid circular dependency between
   * SleepCoreAPI (domain) and bot services (infrastructure).
   */
  private _onISIEnroll?: (userId: string, chatId: number, userName?: string, baselineISI?: number) => void;
  private _onNotificationRegister?: (userId: string, chatId: number, userName?: string) => void;

  /**
   * Crisis screening hook — delegates to CrisisDetectionService.
   * Returns crisis event if detected, null otherwise.
   *
   * IEC 62304 Class C / ISO 14971: Crisis detection must be
   * integrated into the main API facade for traceability.
   */
  private _onCrisisScreen?: (userId: string, text: string) => Promise<{
    isCrisis: boolean;
    severity?: string;
    action?: string;
  }>;

  /**
   * Get database connection (may be null)
   */
  get db(): import('./infrastructure/database/interfaces/IDatabaseConnection').IDatabaseConnection | null {
    return this._db;
  }

  /**
   * Set database connection for admin features
   */
  setDatabase(db: import('./infrastructure/database/interfaces/IDatabaseConnection').IDatabaseConnection): void {
    this._db = db;
  }

  /**
   * Set ISI scheduling hook
   * Called from main.ts after ISISchedulingService is created.
   * Enables enrollUser() calls from commands via SleepCoreAPI facade.
   */
  setISISchedulingHook(hook: (userId: string, chatId: number, userName?: string, baselineISI?: number) => void): void {
    this._onISIEnroll = hook;
  }

  /**
   * Set notification registration hook
   * Called from main.ts after ProactiveNotificationService is created.
   * Enables registerUser() calls from commands via SleepCoreAPI facade.
   */
  setNotificationHook(hook: (userId: string, chatId: number, userName?: string) => void): void {
    this._onNotificationRegister = hook;
  }

  /**
   * Enroll user in biweekly ISI assessment schedule.
   * Delegates to ISISchedulingService via callback hook.
   *
   * Called after ISI baseline completion in StartCommand.
   * Schedule: W0, W2, W4, W6, W8, W12 (Morin et al., 2011; Somryst protocol)
   *
   * @param userId - User ID
   * @param chatId - Telegram chat ID for sending assessment notifications
   * @param userName - Optional display name
   * @param baselineISI - Baseline ISI score (0-28)
   */
  enrollISISchedule(userId: string, chatId: number, userName?: string, baselineISI?: number): void {
    if (this._onISIEnroll) {
      this._onISIEnroll(userId, chatId, userName, baselineISI);
    }
  }

  /**
   * Register user for proactive notifications (diary reminders, re-engagement).
   * Delegates to ProactiveNotificationService via callback hook.
   *
   * Called after consent is given in StartCommand.
   * Research basis: Push notifications increase adherence P<.001 (JMIR 2025)
   *
   * @param userId - User ID
   * @param chatId - Telegram chat ID
   * @param userName - Optional display name
   */
  registerForNotifications(userId: string, chatId: number, userName?: string): void {
    if (this._onNotificationRegister) {
      this._onNotificationRegister(userId, chatId, userName);
    }
  }

  /**
   * Set crisis screening hook.
   * Called from main.ts after CrisisDetectionService is available.
   *
   * Per IEC 62304 Class C: Crisis detection must be traceable
   * through the main API facade.
   */
  setCrisisScreeningHook(hook: (userId: string, text: string) => Promise<{
    isCrisis: boolean;
    severity?: string;
    action?: string;
  }>): void {
    this._onCrisisScreen = hook;
  }

  /**
   * Screen user text for crisis indicators.
   * Delegates to CrisisDetectionService via callback hook.
   *
   * Should be called on free-text user input (diary notes, chat messages).
   * Returns null if hook not configured (graceful degradation).
   *
   * @param userId - User ID
   * @param text - User text to screen
   */
  async screenForCrisis(userId: string, text: string): Promise<{
    isCrisis: boolean;
    severity?: string;
    action?: string;
  } | null> {
    if (!this._onCrisisScreen) {
      return null;
    }
    try {
      return await this._onCrisisScreen(userId, text);
    } catch (error) {
      console.error('[SleepCoreAPI] Crisis screening error:', error);
      return null;
    }
  }

  constructor() {
    this.diaryService = new SleepDiaryService();
    // Disable CBTIEngine's internal adapter — SleepCoreAPI manages its own adapter
    // to avoid dual belief-state divergence (P1 fix: Thompson Sampling consistency)
    this.cbtiEngine = new CBTIEngine({ useCogniCore: false });

    // Initialize CogniCore Engine components for POMDP belief management
    // and Thompson Sampling intervention optimization
    const beliefEngine = createBeliefUpdateEngine();
    const interventionOptimizer = createInterventionOptimizer();

    this.adapter = createSleepCoreAdapter(
      { language: 'ru' },
      beliefEngine,
      interventionOptimizer
    );
    this.thirdWave = new ThirdWaveCoordinator();

    // NEW: Initialize Circadian & Cultural Adaptation Engines
    this.circadianAI = new CircadianAI();
    this.tcmEngine = new TCMIntegratedCBTIEngine();
    this.ayurvedaEngine = new AyurvedaYogaEngine();
    this.guideline2023 = new EuropeanGuideline2023();

    // Wave 5: Precision Phenotyping (Blanken 2019, PAT Ruan 2024)
    // Links to ThirdWaveCoordinator for phenotype-based therapy selection
    this.phenotypingService = new PhenotypingService();

    // Wave 6: AInsomnia Features (Seasonal, Activity Proxy, Anomaly Detection)
    this.seasonalEngine = new SeasonalEngine();
    this.activityProxyEngine = new ActivityProxyEngine();
    this.anomalyDetector = new AnomalyDetector();
    this.userLocations = new Map();

    this.sessions = new Map();
    this.sleepStates = new Map();
  }

  // ============= Session Management =============

  /**
   * Start a new therapy session for a user
   */
  startSession(userId: string): ISleepCoreSession {
    const session: ISleepCoreSession = {
      userId,
      startDate: new Date(),
      plan: null,
      mbtiPlan: null,
      actiPlan: null,
      mctPlan: null,
      isActive: true,
      baselineISI: null,
      // NEW: Circadian & Cultural Adaptations
      circadianAssessment: null,
      chronotherapyPlan: null,
      tcmAssessment: null,
      tcmPlan: null,
      ayurvedicAssessment: null,
      beliefHistory: [],
      // Wave 5: Phenotype profile (Blanken 2019, PAT Ruan 2024)
      sleepProfile: null,
    };

    this.sessions.set(userId, session);
    this.sleepStates.set(userId, []);

    return session;
  }

  /**
   * Get user's current session
   */
  getSession(userId: string): ISleepCoreSession | null {
    return this.sessions.get(userId) || null;
  }

  /**
   * Get user's sleep states history
   * @param userId - User ID
   * @param days - Optional: number of recent days to return (default: all)
   */
  getSleepStates(userId: string, days?: number): ISleepState[] {
    const allStates = this.sleepStates.get(userId) || [];
    if (days !== undefined && days > 0) {
      return allStates.slice(-days);
    }
    return allStates;
  }

  /**
   * End user's session
   */
  endSession(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, isActive: false });
    }
  }

  /**
   * Record ISI assessment result for a user
   *
   * Called after ISI-7 completion during onboarding (/start).
   * Stores baseline ISI in session for use in treatment planning.
   *
   * CLINICAL SAFETY: ISI >= 22 (severe) triggers specialist referral flag.
   * Per Bastien 2001, Morin 2011, Somryst K191716 labeling.
   * This is a RED LINE requirement (CLAUDE.md §2.1).
   *
   * @param userId - User ID
   * @param score - ISI total score (0-28)
   * @param severity - ISI severity classification
   * @param answers - Individual ISI item responses (7 items, 0-4 each)
   * @returns Assessment result with specialist referral flag
   */
  recordISIAssessment(
    userId: string,
    score: number,
    severity: string,
    answers: number[]
  ): { recorded: boolean; requiresSpecialistReferral: boolean } {
    const session = this.sessions.get(userId);
    if (!session) {
      return { recorded: false, requiresSpecialistReferral: score >= 22 };
    }

    const requiresSpecialistReferral = score >= 22;

    this.sessions.set(userId, {
      ...session,
      baselineISI: {
        score,
        severity,
        date: new Date(),
        answers,
      },
    });

    if (requiresSpecialistReferral) {
      console.warn(
        `[SleepCoreAPI] ISI >= 22 (score=${score}) for user ${userId}. ` +
        `SEVERE INSOMNIA — specialist referral required. ` +
        `(Bastien 2001, Morin 2011, European Guideline 2023)`
      );
    }

    return { recorded: true, requiresSpecialistReferral };
  }

  // ============= Sleep Diary =============

  /**
   * Add a sleep diary entry
   */
  addDiaryEntry(entry: ISleepDiaryEntry): ISleepMetrics {
    const metrics = this.diaryService.addEntry(entry);
    return metrics;
  }

  /**
   * Process a new diary entry with full treatment integration
   *
   * This is the MAIN entry point for diary data - it:
   * 1. Adds the diary entry
   * 2. Checks if baseline (7+ days) is complete
   * 3. Initializes treatment plan if ready
   * 4. Returns next intervention via Thompson Sampling
   *
   * CRITICAL: This method connects the diary → plan → intervention pipeline
   * that was previously missing (audit January 2026)
   *
   * @param entry - Sleep diary entry
   * @returns Processing result with metrics and optional intervention
   */
  /**
   * Process new diary entry result type
   * Extended in January 2026 to include third-wave therapy recommendations
   * for CBT-I non-responders (European Guideline 2023 stepped care model)
   */
  async processNewDiaryEntry(entry: ISleepDiaryEntry): Promise<{
    metrics: ISleepMetrics;
    entriesCount: number;
    planCreated: boolean;
    intervention: ICBTIIntervention | null;
    message: string;
    /** Third-wave therapy recommendation when CBT-I non-response detected */
    thirdWaveRecommendation: IThirdWaveRecommendation | null;
    /** True if non-response detected after Week 6 (ISI reduction < 8 points) */
    isNonResponding: boolean;
    /** Current treatment week (1-based) */
    currentWeek: number;
  }> {
    // Step 1: Add diary entry and calculate metrics
    const metrics = this.diaryService.addEntry(entry);

    // Step 2: Get all entries for this user
    const allEntries = this.diaryService.getEntries(entry.userId);
    const entriesCount = allEntries.length;

    // Step 3: Ensure session exists
    let session = this.sessions.get(entry.userId);
    if (!session) {
      session = this.startSession(entry.userId);
    }

    // Step 4: Build sleep state from diary entry
    const sleepState = this.buildSleepStateFromDiary(entry, metrics);

    // Store sleep state for this user
    const userStates = this.sleepStates.get(entry.userId) || [];
    userStates.push(sleepState);
    this.sleepStates.set(entry.userId, userStates);

    // Step 5: Check if we have enough data for treatment plan
    let planCreated = false;
    let intervention: ICBTIIntervention | null = null;
    let message: string;
    let thirdWaveRecommendation: IThirdWaveRecommendation | null = null;
    let isNonResponding = false;
    let currentWeek = 0;

    if (entriesCount < 7) {
      // Still collecting baseline data
      const remaining = 7 - entriesCount;
      message = `Запись сохранена. Ещё ${remaining} ${this.pluralize(remaining, 'день', 'дня', 'дней')} до начала терапии.`;
    } else if (!session.plan) {
      // We have 7+ entries but no plan - create it!
      try {
        // Get last 7 sleep states for baseline
        const baselineStates = userStates.slice(-7);
        await this.initializeTreatment(entry.userId, baselineStates);
        planCreated = true;
        currentWeek = 1;

        // Get first intervention
        intervention = await this.getNextIntervention(entry.userId);
        message = '🎉 Базовый период завершён! Ваш персональный план терапии готов.';
      } catch (error) {
        console.error('Failed to initialize treatment:', error);
        message = 'Запись сохранена. Возникла ошибка при создании плана терапии.';
      }
    } else {
      // Plan exists - get next intervention
      try {
        intervention = await this.getNextIntervention(entry.userId);
        currentWeek = session.plan.currentWeek;

        // Auto-update treatment plan weekly (every 7 diary entries after plan creation)
        // Spielman et al. 1987: weekly adjustment of sleep window is core SRT mechanism
        const planEntries = entriesCount - 7; // entries since plan creation
        if (planEntries > 0 && planEntries % 7 === 0) {
          this.updateTreatmentPlan(entry.userId);
        }

        // Check progress
        const progress = this.getProgressReport(entry.userId);
        if (progress) {
          currentWeek = progress.currentWeek;

          // Check for treatment completion (Week 8+ with remission)
          // ISI ≤ 7 = remission (Morin et al., 2011)
          const TREATMENT_COMPLETION_WEEK = 8;
          const ISI_REMISSION_CUTOFF = 7;

          if (
            progress.currentWeek >= TREATMENT_COMPLETION_WEEK &&
            progress.currentISI <= ISI_REMISSION_CUTOFF
          ) {
            this.endSession(entry.userId);
            message = `🎉 Поздравляем! Ваш ISI: ${progress.currentISI} — ремиссия бессонницы достигнута! ` +
              'Программа завершена. Продолжайте поддерживать здоровые привычки сна.';
          } else if (progress.responseStatus === 'responding') {
            message = `Запись сохранена. Вы на верном пути! ISI: ${progress.currentISI} (снижение на ${progress.isiChange})`;
          } else {
            // ===============================================================
            // CRITICAL FIX (January 2026 Audit):
            // Third-Wave Therapy Integration for CBT-I Non-Responders
            //
            // Scientific Basis:
            // - European Insomnia Guideline 2023: CBT-I first-line (Grade A)
            // - Non-response rate: 25-40% (PMC10002474)
            // - Stepped care: Week 6 evaluation (JCSM stepped care model)
            // - MBT-I for cognitive arousal: 70% → 21% reduction (Ong 2023)
            // - ACT-I for adherence issues: effective long-term (El Rafihi-Ferreira 2024)
            // - MCT for rumination: g=1.64 effect size (ScienceDirect 2025)
            //
            // Non-Response Criteria (Morin et al., 2011):
            // - ISI reduction < 8 points after 6+ weeks
            // - ISI >= 8 (not in remission)
            // ===============================================================
            const NON_RESPONSE_WEEK_THRESHOLD = 6;
            const ISI_RESPONSE_THRESHOLD = 8; // points reduction required
            const ISI_REMISSION_THRESHOLD = 8; // ISI < 8 = remission

            isNonResponding =
              progress.currentWeek >= NON_RESPONSE_WEEK_THRESHOLD &&
              progress.isiChange < ISI_RESPONSE_THRESHOLD &&
              progress.currentISI >= ISI_REMISSION_THRESHOLD;

            if (isNonResponding) {
              // Check if third-wave therapy is indicated
              if (this.isThirdWaveIndicated(entry.userId)) {
                thirdWaveRecommendation = this.recommendThirdWaveApproach(
                  entry.userId,
                  { failedCBTI: true, preferences: [] }
                );

                if (thirdWaveRecommendation && thirdWaveRecommendation.recommendedApproach !== 'none') {
                  message = this.buildThirdWaveMessage(progress, thirdWaveRecommendation);
                } else {
                  message = `Запись сохранена. Неделя ${progress.currentWeek}: ` +
                    'CBT-I требует больше времени. Рассмотрите консультацию со специалистом.';
                }
              } else {
                message = `Запись сохранена. Неделя ${progress.currentWeek}: ` +
                  'Продолжайте терапию. Рассмотрите консультацию со специалистом для коррекции плана.';
              }
            } else if (progress.responseStatus === 'partial') {
              message = `Запись сохранена. Частичный ответ на терапию (ISI снижение: ${progress.isiChange}). Продолжайте рекомендации.`;
            } else {
              message = 'Запись сохранена. Продолжайте следовать рекомендациям.';
            }
          }
        } else {
          message = 'Запись сохранена.';
        }
      } catch (error) {
        console.error('Failed to get intervention:', error);
        message = 'Запись сохранена.';
      }
    }

    // Phase 6: Proactive intelligence analysis (non-critical)
    try {
      const sleepHistory = this.sleepStates.get(entry.userId) || [];
      if (sleepHistory.length >= 3) {
        await proactiveIntelligenceService.runDailyAnalysis(entry.userId, sleepHistory);
      }
    } catch {
      // Non-critical: log and continue — diary entry is already saved
    }

    return {
      metrics,
      entriesCount,
      planCreated,
      intervention,
      message,
      thirdWaveRecommendation,
      isNonResponding,
      currentWeek,
    };
  }

  /**
   * Build user-facing message for third-wave therapy recommendation
   * Based on European Guideline 2023 stepped care model
   *
   * @private
   */
  private buildThirdWaveMessage(
    progress: IProgressReport,
    recommendation: IThirdWaveRecommendation
  ): string {
    const approachNames: Record<string, string> = {
      mbti: 'Терапия осознанности для бессонницы (MBT-I)',
      acti: 'Терапия принятия и ответственности (ACT-I)',
      mct: 'Метакогнитивная терапия (MCT)',
      hybrid: 'Комбинированный подход (MBT-I + ACT-I)',
      none: '',
    };

    const approachName = approachNames[recommendation.recommendedApproach] || 'альтернативный подход';

    return (
      `📊 Неделя ${progress.currentWeek}: CBT-I показывает ограниченный эффект ` +
      `(ISI снижение: ${progress.isiChange} баллов).\n\n` +
      `💡 Рекомендуется: ${approachName}.\n` +
      `${recommendation.rationale}\n\n` +
      'Используйте /therapy для перехода к новому методу.'
    );
  }

  /**
   * Build ISleepState from diary entry (simplified version)
   */
  private buildSleepStateFromDiary(entry: ISleepDiaryEntry, metrics: ISleepMetrics): ISleepState {
    const userId = entry.userId;
    const session = this.sessions.get(userId);

    // Use real baseline ISI if available (from onboarding assessment),
    // otherwise fall back to diary-based estimation
    let isiScore: number;
    if (session?.baselineISI) {
      isiScore = session.baselineISI.score;
    } else if (this.diaryService.getEntries(userId).length >= 7) {
      isiScore = this.estimateISI(userId);
    } else {
      isiScore = 15; // Default moderate if not enough data
    }

    const qualityMap: Record<string, number> = {
      very_poor: 1, poor: 2, fair: 3, good: 4, excellent: 5
    };
    const qualityNum = qualityMap[entry.subjectiveQuality] || 3;

    return {
      userId,
      timestamp: new Date(),
      date: entry.date,
      metrics,
      circadian: {
        chronotype: 'intermediate',
        circadianPhase: 0,
        phaseDeviation: 0,
        lightExposure: 0,
        estimatedMelatoninOnset: '21:00',
        socialJetLag: 0,
        isStable: true,
      },
      homeostasis: {
        sleepDebt: Math.max(0, 420 - metrics.totalSleepTime), // 7h target
        debtDuration: 1,
        homeostaticPressure: 0.5,
        optimalSleepDuration: 7.5,
        isRecoverable: true,
      },
      insomnia: {
        isiScore,
        severity: isiScore <= 7 ? 'none' : isiScore <= 14 ? 'subthreshold' : isiScore <= 21 ? 'moderate' : 'severe',
        subtype: metrics.sleepOnsetLatency > 30
          ? (metrics.wakeAfterSleepOnset > 30 ? 'mixed' : 'sleep_onset')
          : (metrics.wakeAfterSleepOnset > 30 ? 'sleep_maintenance' : 'none'),
        durationWeeks: 4,
        daytimeImpact: (5 - entry.morningAlertness) / 5,
        sleepDistress: (5 - qualityNum) / 5,
      },
      behaviors: {
        caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 8 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 30,
        exercise: { didExercise: false, durationMinutes: 0, hoursBeforeBed: 0 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: {
          temperatureCelsius: 18,
          isQuiet: true,
          isDark: true,
          isComfortable: true,
        },
      },
      cognitions: {
        dbasScore: 3,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: metrics.sleepOnsetLatency > 30 ? 0.6 : 0.3,
        preSleepArousal: metrics.sleepOnsetLatency > 30 ? 0.5 : 0.3,
        sleepSelfEfficacy: metrics.sleepEfficiency > 85 ? 0.8 : 0.5,
      },
      subjectiveQuality: entry.subjectiveQuality,
      morningAlertness: entry.morningAlertness / 5,
      daytimeSleepiness: (5 - entry.morningAlertness) / 5,
      sleepHealthScore: Math.round(metrics.sleepEfficiency * 0.8 + qualityNum * 4),
      trend: 'stable',
      dataQuality: 0.8,
      source: 'diary',
    };
  }

  /**
   * Helper for Russian pluralization
   */
  private pluralize(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
  }

  /**
   * Get weekly sleep summary
   */
  getWeeklySummary(userId: string, weekStart: string) {
    return this.diaryService.calculateWeeklySummary(userId, weekStart);
  }

  /**
   * Analyze sleep patterns
   */
  analyzePatterns(userId: string) {
    return this.diaryService.analyzePatterns(userId);
  }

  /**
   * Estimate ISI score from diary data
   */
  estimateISI(userId: string): number {
    return this.diaryService.estimateISI(userId);
  }

  // ============= CBT-I Treatment =============

  /**
   * Initialize CBT-I treatment plan
   * Requires at least 7 days of baseline sleep data
   *
   * Now uses SleepCoreAdapter with Thompson Sampling for intervention optimization.
   */
  async initializeTreatment(userId: string, baselineData: ISleepState[]): Promise<ICBTIPlan> {
    if (baselineData.length < 7) {
      throw new Error('Need at least 7 days of baseline sleep data');
    }

    const plan = this.cbtiEngine.initializePlan(userId, baselineData);

    // Update session with plan
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, plan });
    }

    // Initialize adapter with baseline data
    // The adapter builds beliefs incrementally through selectIntervention calls
    // Process baseline states to warm up the Thompson Sampling model
    for (const state of baselineData) {
      // Select intervention for each baseline state to populate beliefs
      await this.adapter.selectIntervention(state, userId);
    }

    return plan;
  }

  /**
   * Process daily check-in and get recommendations
   * Uses CogniCore Thompson Sampling via SleepCoreAdapter for personalized intervention selection.
   */
  async processDailyCheckIn(checkIn: IDailyCheckIn): Promise<IInterventionResult> {
    // Add diary entry
    const metrics = this.addDiaryEntry(checkIn.diaryEntry);

    // Get session and plan
    const session = this.sessions.get(checkIn.userId);
    if (!session?.plan) {
      throw new Error('No active treatment plan for user');
    }

    // Get current sleep state
    const currentState = this.buildSleepState(checkIn, metrics);

    // Store sleep state
    const userStates = this.sleepStates.get(checkIn.userId) || [];
    userStates.push(currentState);
    this.sleepStates.set(checkIn.userId, userStates);

    // Use SleepCoreAdapter with Thompson Sampling for unified action selection
    // P1 fix: single adapter avoids dual belief-state divergence
    const adapterSelection = await this.adapter.selectIntervention(currentState, checkIn.userId);

    // Record previous outcome if we have history (for Thompson Sampling learning)
    if (userStates.length > 1) {
      const previousState = userStates[userStates.length - 2];
      await this.adapter.recordOutcome(
        adapterSelection.action,
        previousState,
        currentState,
        checkIn.userId
      );
    }

    // Build ICBTIIntervention from adapter selection + CBTIEngine static fallback
    const staticIntervention = await this.cbtiEngine.getNextIntervention(session.plan, currentState);
    const intervention: ICBTIIntervention = {
      component: adapterSelection.component,
      action: adapterSelection.explanation,
      rationale: adapterSelection.explanation,
      priority: Math.round(adapterSelection.confidence * 5) || 1,
      timing: staticIntervention.timing,
      personalizationScore: adapterSelection.confidence,
    };

    return {
      intervention,
      confidence: adapterSelection.confidence,
      alternatives: adapterSelection.alternatives.map((alt) => ({
        ...intervention,
        rationale: `Альтернатива: ${alt.action}`,
      })).slice(0, 2),
      rationale: this.generateRationale(intervention, adapterSelection.action, currentState),
    };
  }

  /**
   * Get next recommended intervention
   * Now async due to CogniCore Thompson Sampling integration
   */
  async getNextIntervention(userId: string): Promise<ICBTIIntervention | null> {
    const session = this.sessions.get(userId);
    if (!session?.plan) return null;

    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const currentState = userStates[userStates.length - 1];

    // P1 fix: Use SleepCoreAdapter (Thompson Sampling) instead of CBTIEngine directly
    // This ensures belief state consistency with processDailyCheckIn()
    const adapterSelection = await this.adapter.selectIntervention(currentState, userId);
    const staticIntervention = await this.cbtiEngine.getNextIntervention(session.plan, currentState);

    return {
      component: adapterSelection.component,
      action: adapterSelection.explanation,
      rationale: adapterSelection.explanation,
      priority: Math.round(adapterSelection.confidence * 5) || 1,
      timing: staticIntervention.timing,
      personalizationScore: adapterSelection.confidence,
    };
  }

  /**
   * Get user's current Bayesian belief state from CogniCore adapter.
   *
   * Research basis (2025-2026):
   * - IntelligentPooling (HeartSteps v2): daily posterior updates enable
   *   adaptive Thompson Sampling in mHealth (PMC 2021, deployed in trial)
   * - Noxxea dCBT-I (JMIR Human Factors 2025): Bayesian computation
   *   (Pasteur Institute) for real-time therapeutic personalization
   * - van Genugten et al. 2025: JITAIs lack true between/within-user
   *   adaptivity — belief state injection addresses this gap
   *
   * @param userId - User ID
   * @returns Full belief state with emotional, cognitive, risk, and resource
   *          dimensions, or undefined if no belief state exists (< 7 diary entries)
   */
  getBeliefState(userId: string): IFullBeliefState | undefined {
    return this.adapter.getUserBelief(userId);
  }

  /**
   * Get Thompson Sampling intervention statistics for a user.
   * Exposes per-action attempt counts, average rewards, and confidence.
   *
   * @param userId - User ID
   * @returns Map of SleepAction → statistics
   */
  async getInterventionStats(userId: string): Promise<Map<string, {
    attempts: number;
    avgReward: number;
    confidence: number;
  }>> {
    return this.adapter.getInterventionStats(userId);
  }

  /**
   * Get explanation for an intervention selection
   * Uses CogniCore ExplainabilityService for SHAP-style feature attribution
   *
   * Research basis (2025-2026):
   * - Explainable AI improves patient trust (HIGH confidence)
   * - SHAP values preferred for healthcare transparency (Lundberg 2020)
   * - Counterfactual explanations improve understanding (HIGH confidence)
   *
   * @param userId - User ID
   * @param selection - The intervention selection to explain
   * @returns Detailed explanation with key factors, confidence, and actionable advice
   */
  async explainIntervention(
    userId: string,
    selection: ISleepInterventionSelection
  ): Promise<ISleepInterventionExplanation | null> {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const currentState = userStates[userStates.length - 1];
    return this.adapter.explainIntervention(selection, currentState);
  }

  /**
   * Get explanation for the current recommended intervention.
   * Convenience wrapper that selects the intervention and explains it in one call.
   * Uses CogniCore ExplainabilityService for SHAP-style feature attribution.
   */
  async explainCurrentIntervention(
    userId: string
  ): Promise<ISleepInterventionExplanation | null> {
    const session = this.sessions.get(userId);
    if (!session?.plan) return null;

    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const currentState = userStates[userStates.length - 1];
    const selection = await this.adapter.selectIntervention(currentState, userId);
    return this.adapter.explainIntervention(selection, currentState);
  }

  /**
   * Update treatment plan
   */
  updateTreatmentPlan(userId: string): ICBTIPlan | null {
    const session = this.sessions.get(userId);
    if (!session?.plan) return null;

    const recentStates = this.getRecentStates(userId, 7);
    if (recentStates.length < 5) return session.plan;

    const updatedPlan = this.cbtiEngine.updatePlan(session.plan, recentStates);

    // Update session
    this.sessions.set(userId, { ...session, plan: updatedPlan });

    return updatedPlan;
  }

  /**
   * Assess treatment response
   */
  assessResponse(userId: string) {
    const session = this.sessions.get(userId);
    if (!session?.plan) return null;

    return this.cbtiEngine.assessResponse(session.plan);
  }

  // ============= Stimulus Control (SCT) =============
  // Added January 2026: Direct access to Bootzin's SCT (1972)
  // Based on Furukawa 2024 JAMA NMA: SCT consistently effective for bed-sleep association

  /**
   * Get personalized stimulus control rules for user
   * Implements Bootzin's 6 rules (1972)
   *
   * Scientific basis (HIGH confidence):
   * - Bootzin (1972): Original SCT protocol
   * - Furukawa 2024 JAMA Psychiatry NMA: SCT effective as CBT-I component
   *
   * @param userId - User ID
   * @returns Personalized SCT rules or null if no sleep state data
   */
  getStimulusControlRules(userId: string): import('./cbt-i/interfaces/ICBTIComponents').IStimulusControlRules | null {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const lastState = userStates[userStates.length - 1];
    return this.cbtiEngine.getStimulusControlEngine().getRules(lastState);
  }

  /**
   * Generate leave-bed reminder based on minutes awake
   *
   * @param minutesAwake - Minutes spent awake in bed
   * @returns Reminder message with urgency level
   */
  getLeaveReminder(minutesAwake: number): string {
    return this.cbtiEngine.getStimulusControlEngine().generateLeaveReminder(minutesAwake);
  }

  /**
   * Track stimulus control adherence for a night
   *
   * @param userId - User ID
   * @returns Adherence report or null if no data
   */
  trackStimulusControlAdherence(
    userId: string
  ): import('./cbt-i/interfaces/ICBTIComponents').IStimulusControlAdherence | null {
    const session = this.sessions.get(userId);
    const userStates = this.sleepStates.get(userId) || [];

    if (!session?.plan?.activeComponents.stimulusControl || userStates.length === 0) {
      return null;
    }

    const lastState = userStates[userStates.length - 1];
    return this.cbtiEngine.getStimulusControlEngine().trackAdherence(
      session.plan.activeComponents.stimulusControl,
      lastState.metrics
    );
  }

  // ============= Sleep Hygiene Education (SHE) =============
  // Added January 2026: Direct access to Hauri's SHE (1977)
  // IMPORTANT: Not effective as standalone (Furukawa 2024), use as adjunct

  /**
   * Assess sleep hygiene from current sleep state
   *
   * Scientific basis (MEDIUM confidence):
   * - Hauri (1977): Sleep hygiene recommendations
   * - Furukawa 2024 JAMA NMA: NOT effective as standalone, adjunct only
   *
   * @param userId - User ID
   * @returns Assessment with scores and recommendations
   */
  assessSleepHygiene(userId: string): import('./cbt-i/interfaces/ICBTIComponents').ISleepHygieneAssessment | null {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const lastState = userStates[userStates.length - 1];
    return this.cbtiEngine.getSleepHygieneEngine().assess(lastState);
  }

  /**
   * Get educational content for sleep hygiene category
   *
   * @param category - Sleep hygiene category
   * @returns Educational content with tips and myths
   */
  getHygieneEducation(category: import('./cbt-i/interfaces/ICBTIComponents').SleepHygieneCategory): {
    title: string;
    content: string;
    tips: string[];
    myths: string[];
  } {
    return this.cbtiEngine.getSleepHygieneEngine().getEducationalContent(category);
  }

  /**
   * Track sleep hygiene improvement over time
   *
   * @param userId - User ID
   * @returns Improvement analysis or empty result if insufficient data
   */
  trackHygieneImprovement(userId: string): {
    improved: import('./cbt-i/interfaces/ICBTIComponents').SleepHygieneCategory[];
    declined: import('./cbt-i/interfaces/ICBTIComponents').SleepHygieneCategory[];
  } {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length < 2) {
      return { improved: [], declined: [] };
    }

    // Build assessment history from sleep states
    const assessmentHistory = userStates.map(state =>
      this.cbtiEngine.getSleepHygieneEngine().assess(state)
    );

    return this.cbtiEngine.getSleepHygieneEngine().trackImprovement(assessmentHistory);
  }

  // ============= Cognitive Restructuring (CR) =============
  // Added January 2026: Direct access to Beck/Morin cognitive model
  // Based on European Guideline 2023: CBT-I includes cognitive component

  /**
   * Identify dysfunctional beliefs about sleep from user text
   *
   * Scientific basis (HIGH confidence):
   * - Beck (1976): Cognitive Therapy and the Emotional Disorders
   * - Morin: Cognitive model of insomnia
   * - Harvey (2002): Cognitive model of insomnia
   *
   * @param userId - User ID
   * @param userText - Text input from user
   * @returns Array of identified dysfunctional beliefs with emotions
   */
  identifyCognitiveBeliefs(
    userId: string,
    userText: string
  ): import('./cbt-i/interfaces/ICBTIComponents').IDysfunctionalBelief[] {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) {
      // Create minimal state for belief identification
      return [];
    }

    const lastState = userStates[userStates.length - 1];
    const beliefs = this.cbtiEngine.getCognitiveRestructuringEngine().identifyBeliefs(userText, lastState);

    // Accumulate belief snapshots for cognitive progress tracking
    const session = this.sessions.get(userId);
    if (session && beliefs.length > 0) {
      const updatedHistory = [...session.beliefHistory, beliefs];
      this.sessions.set(userId, { ...session, beliefHistory: updatedHistory });
    }

    return beliefs;
  }

  /**
   * Generate Socratic questions for a dysfunctional belief
   *
   * @param belief - The dysfunctional belief to challenge
   * @returns Array of Socratic questions
   */
  getSocraticQuestions(
    belief: import('./cbt-i/interfaces/ICBTIComponents').IDysfunctionalBelief
  ): string[] {
    return this.cbtiEngine.getCognitiveRestructuringEngine().generateSocraticQuestions(belief);
  }

  /**
   * Generate alternative balanced thought for a belief
   *
   * @param belief - The dysfunctional belief
   * @param evidence - Evidence for and against the belief
   * @returns Alternative balanced thought
   */
  generateAlternativeThought(
    belief: import('./cbt-i/interfaces/ICBTIComponents').IDysfunctionalBelief,
    evidence: { for: string[]; against: string[] }
  ): string {
    return this.cbtiEngine.getCognitiveRestructuringEngine().generateAlternativeThought(belief, evidence);
  }

  /**
   * Design a behavioral experiment to test a belief
   *
   * @param belief - The belief to test
   * @returns Experiment design with hypothesis and predicted outcome
   */
  designBehavioralExperiment(
    belief: import('./cbt-i/interfaces/ICBTIComponents').IDysfunctionalBelief
  ): {
    hypothesis: string;
    experiment: string;
    predictedOutcome: string;
  } {
    return this.cbtiEngine.getCognitiveRestructuringEngine().designExperiment(belief);
  }

  /**
   * Generate cognitive progress report for user
   *
   * @param userId - User ID
   * @returns Progress report with markdown table or null if no data
   */
  getCognitiveProgressReport(
    userId: string
  ): import('./cbt-i/interfaces/ICBTIComponents').ICognitiveProgressReport | null {
    const session = this.sessions.get(userId);
    if (!session?.beliefHistory || session.beliefHistory.length === 0) return null;

    return this.cbtiEngine.getCognitiveRestructuringEngine().generateCognitiveProgressReport(
      session.beliefHistory, userId
    );
  }

  // ============= Relaxation =============
  // Enhanced January 2026: Direct RelaxationEngine integration
  // IMPORTANT: Not effective as standalone (Furukawa 2024), use as adjunct

  /**
   * Get recommended relaxation technique
   *
   * Enhanced to use RelaxationEngine's state-aware recommendation.
   *
   * Scientific basis (MEDIUM confidence):
   * - Furukawa 2024 JAMA NMA: NOT effective as standalone
   * - European Guideline 2023: Included as adjunct to CBT-I
   *
   * @param userId - User ID
   * @param context - Context for relaxation
   * @returns Technique with instructions and duration
   */
  getRelaxationRecommendation(
    userId: string,
    context: 'bedtime' | 'daytime' | 'wakeup' = 'bedtime'
  ): {
    technique: RelaxationTechnique;
    instructions: string[];
    duration: number;
  } {
    const userStates = this.sleepStates.get(userId) || [];
    const lastState = userStates[userStates.length - 1];

    // Use RelaxationEngine for state-aware recommendation
    if (lastState) {
      const relaxEngine = this.cbtiEngine.getRelaxationEngine();
      const technique = relaxEngine.recommendTechnique(lastState, context);
      const session = this.sessions.get(userId);

      // Determine user level from session progress
      const userLevel: 'beginner' | 'intermediate' | 'advanced' =
        session?.plan?.currentWeek && session.plan.currentWeek > 4 ? 'intermediate' :
        session?.plan?.currentWeek && session.plan.currentWeek > 7 ? 'advanced' :
        'beginner';

      const protocol = relaxEngine.getProtocol(userLevel, context);
      const instructions = relaxEngine.generateInstructions(technique, protocol.totalDuration);

      return {
        technique,
        instructions,
        duration: protocol.totalDuration,
      };
    }

    // Fallback for users without sleep state data
    const session = this.sessions.get(userId);
    const protocol = session?.plan?.activeComponents.relaxationProtocol;

    if (!protocol) {
      return {
        technique: 'diaphragmatic_breathing',
        instructions: [
          'Лягте или сядьте удобно.',
          'Положите руку на живот.',
          'Вдохните через нос на 4 счёта.',
          'Выдохните через рот на 6 счётов.',
          'Продолжайте 5-10 минут.',
        ],
        duration: 10,
      };
    }

    const technique = protocol.techniques[0] || 'diaphragmatic_breathing';

    return {
      technique,
      instructions: this.getRelaxationInstructions(technique),
      duration: protocol.totalDuration / protocol.techniques.length,
    };
  }

  /**
   * Get full relaxation protocol for user level and context
   *
   * @param userLevel - User's experience level
   * @param targetContext - When relaxation will be used
   * @returns Full relaxation protocol
   */
  getRelaxationProtocol(
    userLevel: 'beginner' | 'intermediate' | 'advanced',
    targetContext: 'bedtime' | 'daytime' | 'wakeup'
  ): import('./cbt-i/interfaces/ICBTIComponents').IRelaxationProtocol {
    return this.cbtiEngine.getRelaxationEngine().getProtocol(userLevel, targetContext);
  }

  /**
   * Get detailed instructions for a specific relaxation technique
   *
   * @param technique - The relaxation technique
   * @param duration - Target duration in minutes
   * @returns Step-by-step instructions
   */
  getRelaxationTechniqueInstructions(technique: RelaxationTechnique, duration: number): string[] {
    return this.cbtiEngine.getRelaxationEngine().generateInstructions(technique, duration);
  }

  // ============= Progress Tracking =============

  /**
   * Get comprehensive progress report
   */
  getProgressReport(userId: string): IProgressReport | null {
    const session = this.sessions.get(userId);
    if (!session?.plan) return null;

    const plan = session.plan;
    const recentStates = this.getRecentStates(userId, 7);

    // Calculate current metrics
    const currentSE = recentStates.length > 0
      ? recentStates.reduce((sum, s) => sum + s.metrics.sleepEfficiency, 0) / recentStates.length
      : 0;

    const currentISI = recentStates.length > 0
      ? recentStates[recentStates.length - 1].insomnia.isiScore
      : plan.progress.isiBaseline;

    // Generate weekly summary
    const weeklyStates = this.getRecentStates(userId, 7);
    const summary = weeklyStates.length >= 5
      ? this.cbtiEngine.generateWeeklySummary(plan, weeklyStates)
      : null;

    // Assess response
    const response = this.cbtiEngine.assessResponse(plan);

    return {
      currentISI,
      isiChange: plan.progress.isiBaseline - currentISI,
      currentSleepEfficiency: currentSE,
      sleepEfficiencyChange: currentSE - plan.progress.sleepEfficiencyBaseline,
      currentWeek: plan.currentWeek,
      overallAdherence: summary?.adherenceScore || 0,
      achievements: summary?.keyAchievements || [],
      improvements: summary?.nextWeekFocus || [],
      responseStatus: response.isResponding
        ? 'responding'
        : response.isiChange > 3
          ? 'partial'
          : 'non-responding',
    };
  }

  /**
   * Get sleep efficiency trend
   */
  getSleepEfficiencyTrend(userId: string, days: number = 14): number[] {
    const states = this.getRecentStates(userId, days);
    return states.map((s) => s.metrics.sleepEfficiency);
  }

  // ============= Third-Wave Therapies (MBT-I / ACT-I) =============

  /**
   * Check if third-wave therapy is recommended
   * Uses ThirdWaveCoordinator to analyze sleep state
   */
  recommendThirdWaveApproach(
    userId: string,
    treatmentHistory?: { failedCBTI: boolean; preferences: string[] }
  ): IThirdWaveRecommendation | null {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const lastState = userStates[userStates.length - 1];
    return this.thirdWave.recommendApproach(lastState, treatmentHistory);
  }

  /**
   * Check if third-wave is indicated for user
   */
  isThirdWaveIndicated(userId: string): boolean {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return false;

    const lastState = userStates[userStates.length - 1];
    return this.thirdWave.isThirdWaveIndicated(lastState);
  }

  /**
   * Initialize MBT-I treatment plan
   * Requires baseline assessment (7+ days)
   */
  initializeMBTI(
    userId: string,
    baselineData: ISleepState[],
    options?: { useBehavioralComponents: boolean }
  ): IMBTIPlan {
    if (baselineData.length < 7) {
      throw new Error('Need at least 7 days of baseline data for MBT-I');
    }

    const mbtiEngine = this.thirdWave.getMBTIEngine();
    const plan = mbtiEngine.initializePlan(userId, baselineData, options);

    // Update session
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, mbtiPlan: plan });
    }

    return plan;
  }

  /**
   * Initialize ACT-I treatment plan
   * Requires baseline assessment (7+ days)
   */
  initializeACTI(userId: string, baselineData: ISleepState[]): IACTIPlan {
    if (baselineData.length < 7) {
      throw new Error('Need at least 7 days of baseline data for ACT-I');
    }

    const actiEngine = this.thirdWave.getACTIEngine();
    const plan = actiEngine.initializePlan(userId, baselineData);

    // Update session
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, actiPlan: plan });
    }

    return plan;
  }

  /**
   * Initialize MCT (Metacognitive Therapy) treatment plan
   * Requires baseline assessment (7+ days)
   *
   * Scientific basis:
   * - Wells (2009): Metacognitive Therapy for Anxiety and Depression
   * - First RCT for insomnia: 57% remission (2025)
   * - Core techniques: ATT, Detached Mindfulness, Worry Postponement
   *
   * IMPORTANT: MCT-I is experimental. No digital protocols exist yet (as of 2025).
   * This implementation adapts Wells' face-to-face protocol for digital delivery.
   *
   * Contraindications:
   * - Active psychosis
   * - Severe depression with suicidal ideation
   * - Cognitive impairment affecting metacognitive capacity
   */
  initializeMCT(userId: string, baselineData: ISleepState[]): IMCTPlan {
    if (baselineData.length < 7) {
      throw new Error('Need at least 7 days of baseline data for MCT');
    }

    const mctEngine = this.thirdWave.getMCTEngine();
    const plan = mctEngine.initializePlan(userId, baselineData);

    // Update session
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, mctPlan: plan });
    }

    return plan;
  }

  /**
   * Get worry postponement exercise for MCT
   */
  getWorryPostponementExercise(
    userId: string,
    worryContent?: string
  ): {
    instructions: string[];
    postponeToTime: string;
    worryPeriodDuration: number;
    tips: string[];
  } | null {
    const session = this.sessions.get(userId);
    if (!session?.mctPlan) return null;

    const mctEngine = this.thirdWave.getMCTEngine();
    const pattern: IWorryPattern = {
      content: worryContent || 'sleep-related worry',
      context: 'pre_sleep',
      frequency: 1,
      duration: 30,
      controllability: 0.3,
      distress: 0.7,
      type: 'worry',
    };

    return mctEngine.getWorryPostponementExercise(pattern);
  }

  /**
   * Get detached mindfulness exercise for MCT
   */
  getDetachedMindfulnessExercise(
    trigger: 'racing_thoughts' | 'worry' | 'rumination' | 'sleep_anxiety'
  ): {
    instructions: string[];
    metaphor: string;
    duration: number;
  } {
    const mctEngine = this.thirdWave.getMCTEngine();
    return mctEngine.getDetachedMindfulnessExercise(trigger);
  }

  /**
   * Get ATT (Attention Training Technique) session
   */
  getATTSession(
    phase: 'selective' | 'switching' | 'divided' = 'selective',
    duration: number = 12
  ): {
    instructions: string[];
    audioUrl?: string;
    tips: string[];
  } {
    const mctEngine = this.thirdWave.getMCTEngine();
    return mctEngine.getATTSession(phase, duration);
  }

  /**
   * Get MCT session summary
   */
  getMCTSessionSummary(userId: string): {
    keyTakeaways: string[];
    homeExperiments: string[];
    nextSessionPreview: string;
    progressHighlights: string[];
  } | null {
    const session = this.sessions.get(userId);
    if (!session?.mctPlan) return null;

    const mctEngine = this.thirdWave.getMCTEngine();
    return mctEngine.generateSessionSummary(session.mctPlan);
  }

  // ============= Phase 6: Orphaned Service Access =============

  /**
   * Get MetacognitiveEngineService singleton
   * Provides access to MCT orchestration: WorryPostponement, ATT, DM, MCQ-30
   */
  getMetacognitiveEngine(): typeof metacognitiveEngineService {
    return metacognitiveEngineService;
  }

  /**
   * Adapt message tone via AdaptivePersonaService (MI + TTM)
   * Falls back to original message on error
   */
  async adaptMessageTone(userId: string, message: string): Promise<string> {
    try {
      const result = await adaptivePersonaService.adaptTone(userId, message);
      return result.adapted;
    } catch {
      return message;
    }
  }

  /**
   * Get pending proactive insights for user
   * Non-critical: returns empty array on error
   */
  getProactiveInsights(userId: string): IProactiveInsight[] {
    try {
      return proactiveIntelligenceService.getPendingInsights(userId);
    } catch {
      return [];
    }
  }

  // ============= Wave 1: SleepPrediction + ProactiveIntelligence + AdaptivePersona =============

  /**
   * Get SleepPredictionService singleton (Typed Accessor)
   * Provides PLRNN-based prediction, history, early warnings
   */
  getSleepPrediction(): typeof sleepPredictionService {
    return sleepPredictionService;
  }

  /**
   * Adapt message tone with auto-injected CogniCore belief state (Thin Wrapper)
   * Falls back to original message on error
   */
  async adaptMessageToneWithContext(
    userId: string,
    message: string,
    emotionalState?: Parameters<typeof adaptivePersonaService.adaptTone>[2]
  ): Promise<string> {
    try {
      const beliefState = this.getBeliefState?.(userId);
      const result = await adaptivePersonaService.adaptTone(
        userId,
        message,
        emotionalState,
        beliefState
      );
      return result.adapted;
    } catch {
      return message;
    }
  }

  /**
   * Run proactive daily analysis with auto-injected belief state (Thin Wrapper)
   */
  async runProactiveAnalysis(
    userId: string,
    sleepHistory: Parameters<typeof proactiveIntelligenceService.runDailyAnalysis>[1]
  ): ReturnType<typeof proactiveIntelligenceService.runDailyAnalysis> {
    const beliefState = this.getBeliefState?.(userId);
    return proactiveIntelligenceService.runDailyAnalysis(userId, sleepHistory, beliefState);
  }

  /**
   * Detect risk escalation in sleep data (Thin Wrapper)
   */
  async detectRiskEscalation(
    userId: string,
    sleepHistory: Parameters<typeof proactiveIntelligenceService.detectRiskEscalation>[1]
  ): ReturnType<typeof proactiveIntelligenceService.detectRiskEscalation> {
    return proactiveIntelligenceService.detectRiskEscalation(userId, sleepHistory);
  }

  // ============= Wave 2: DigitalTwin + CausalInsights + CognitiveProgress + Arousal =============

  /**
   * Get DigitalTwinService singleton (Typed Accessor)
   * Provides twin creation, trajectory prediction, scenario simulation, tipping point detection
   */
  getDigitalTwin(): typeof digitalTwinService {
    return digitalTwinService;
  }

  /**
   * Get CausalInsightsService singleton (Typed Accessor)
   * Provides causal graph discovery, personalized insights, intervention targets
   */
  getCausalInsights(): typeof causalInsightsService {
    return causalInsightsService;
  }

  /**
   * Generate weekly cognitive progress report (Thin Wrapper)
   */
  generateCognitiveProgressReport(
    userId: string,
    history: Parameters<typeof cognitiveProgressReportService.generateWeeklyReport>[1],
    week: Parameters<typeof cognitiveProgressReportService.generateWeeklyReport>[2]
  ): ReturnType<typeof cognitiveProgressReportService.generateWeeklyReport> {
    return cognitiveProgressReportService.generateWeeklyReport(userId, history, week);
  }

  /**
   * Estimate arousal profile from sleep history (Thin Wrapper)
   */
  estimateArousalProfile(
    sleepHistory: Parameters<typeof arousalAssessmentService.estimateArousalProfile>[0]
  ): ReturnType<typeof arousalAssessmentService.estimateArousalProfile> {
    return arousalAssessmentService.estimateArousalProfile(sleepHistory);
  }

  /**
   * Get HyperarousalAwareSRT engine for patients with high arousal
   *
   * Use for:
   * - PSAS cognitive ≥ 20 or somatic ≥ 14
   * - ISSD phenotype (TST < 6h)
   * - Bipolar disorder (TIB ≥ 6.5h per Harvey CBT-iBD)
   * - HRV indicating high sympathetic activation
   *
   * Research: Riemann 2024-2025, Spiegelhalder et al. 2024
   */
  getHyperarousalAwareSRTEngine() {
    return this.cbtiEngine.getHyperarousalAwareSRTEngine();
  }

  // ============= Wave 3: CrisisDetection + CrisisEscalation (IEC 62304 Class C) =============

  /**
   * Get CrisisDetectionService singleton (Typed Accessor)
   * SAFETY-CRITICAL: Returns module-level singleton. Never null.
   */
  getCrisisDetection(): typeof crisisDetectionService {
    return crisisDetectionService;
  }

  /**
   * Get CrisisEscalationService singleton (Typed Accessor)
   * SAFETY-CRITICAL: Returns module-level singleton. Never null.
   */
  getCrisisEscalation(): typeof crisisEscalationService {
    return crisisEscalationService;
  }

  /**
   * Get mindfulness practice for MBT-I
   */
  getMindfulnessPractice(
    userId: string,
    context: 'bedtime' | 'daytime' | 'night_awakening',
    duration: number = 15
  ): {
    practice: MindfulnessPractice;
    instructions: string[];
    audioUrl?: string;
  } | null {
    const session = this.sessions.get(userId);
    if (!session?.mbtiPlan) return null;

    const mbtiEngine = this.thirdWave.getMBTIEngine();
    return mbtiEngine.getPractice(session.mbtiPlan, context, duration);
  }

  /**
   * Get ACT-I defusion technique for unwanted experience
   */
  getDefusionTechnique(
    experience: IUnwantedExperience,
    userLevel: SessionLevel = 'beginner'
  ): IDefusionTechnique {
    const actiEngine = this.thirdWave.getACTIEngine();
    return actiEngine.getDefusionTechnique(experience, userLevel);
  }

  /**
   * Get acceptance exercise for sleep struggle
   */
  getAcceptanceExercise(
    struggle: 'cant_sleep' | 'anxious' | 'frustrated' | 'exhausted'
  ): {
    exercise: string;
    instructions: string[];
    metaphor: string;
  } {
    const actiEngine = this.thirdWave.getACTIEngine();
    return actiEngine.getAcceptanceExercise(struggle);
  }

  /**
   * Identify unwanted experiences from user text (ACT-I)
   */
  identifyUnwantedExperiences(
    userText: string,
    context: 'pre_sleep' | 'during_night' | 'morning' | 'daytime'
  ): IUnwantedExperience[] {
    const actiEngine = this.thirdWave.getACTIEngine();
    return actiEngine.identifyUnwantedExperiences(userText, context);
  }

  /**
   * Get MBT-I weekly summary
   */
  getMBTIWeeklySummary(userId: string): {
    practiceMinutes: number;
    practiceAdherence: number;
    arousalChange: { cognitive: number; somatic: number; sleepEffort: number };
    keyInsights: string[];
    nextWeekFocus: string[];
  } | null {
    const session = this.sessions.get(userId);
    if (!session?.mbtiPlan) return null;

    const mbtiEngine = this.thirdWave.getMBTIEngine();
    const summary = mbtiEngine.generateWeeklySummary(session.mbtiPlan);

    return {
      practiceMinutes: summary.practiceMinutes,
      practiceAdherence: summary.practiceAdherence,
      arousalChange: {
        cognitive: summary.arousalChange.cognitive,
        somatic: summary.arousalChange.somatic,
        sleepEffort: summary.arousalChange.sleepEffort,
      },
      keyInsights: summary.keyInsights,
      nextWeekFocus: summary.nextWeekFocus,
    };
  }

  /**
   * Record completed MBT-I practice session
   * Wraps MBTIEngine.recordPractice() and persists updated plan
   *
   * @param userId - User identifier
   * @param practiceSession - Completed mindfulness practice session data
   * @returns Updated MBT-I plan or null if no plan exists
   */
  recordMBTIPractice(
    userId: string,
    practiceSession: IMindfulnessSession
  ): IMBTIPlan | null {
    const session = this.sessions.get(userId);
    if (!session?.mbtiPlan) return null;

    const mbtiEngine = this.thirdWave.getMBTIEngine();
    const updatedPlan = mbtiEngine.recordPractice(session.mbtiPlan, practiceSession);
    this.sessions.set(userId, { ...session, mbtiPlan: updatedPlan });

    return updatedPlan;
  }

  /**
   * Assess current sleep arousal levels (cognitive, somatic, sleep effort)
   * Wraps MBTIEngine.assessArousal() using latest sleep state
   *
   * @param userId - User identifier
   * @returns Arousal assessment or null if no sleep states available
   */
  assessArousal(userId: string): ISleepArousal | null {
    const sleepStates = this.getSleepStates(userId);
    if (!sleepStates || sleepStates.length === 0) return null;

    const mbtiEngine = this.thirdWave.getMBTIEngine();
    const lastState = sleepStates[sleepStates.length - 1];
    return mbtiEngine.assessArousal(lastState);
  }

  /**
   * Get ACT-I session summary
   */
  getACTISessionSummary(userId: string): {
    keyTakeaways: string[];
    practiceExercises: string[];
    nextSessionPreview: string;
  } | null {
    const session = this.sessions.get(userId);
    if (!session?.actiPlan) return null;

    const actiEngine = this.thirdWave.getACTIEngine();
    return actiEngine.generateSessionSummary(session.actiPlan);
  }

  // ============= Wave 5: Precision Phenotyping (Blanken 2019, PAT Ruan 2024) =============

  /**
   * Generate comprehensive sleep profile from actigraphy data
   *
   * Scientific basis:
   * - Blanken et al., 2019: 5-class insomnia phenotype model (Lancet Psychiatry)
   * - Ruan et al., 2024: PAT (Pretrained Actigraphy Transformer)
   *
   * Returns ISleepProfile with:
   * - PAT-derived phenotype classification
   * - Risk assessment
   * - Therapy recommendations based on phenotype
   * - Circadian profile from actigraphy
   *
   * @param userId - User identifier
   * @param actigraphySession - Actigraphy data (3-7 days recommended)
   * @param supplementaryData - Optional ISI/DBAS scores for enhanced recommendations
   */
  async generateSleepProfile(
    userId: string,
    actigraphySession: IActigraphySession,
    supplementaryData?: {
      recentSleepMetrics?: ISleepMetrics[];
      isiScore?: number;
      dbasScore?: number;
    }
  ): Promise<ISleepProfile> {
    const profile = await this.phenotypingService.generateProfile(
      userId,
      actigraphySession,
      supplementaryData
    );

    // Store profile in session for later retrieval
    this.storeSleepProfile(userId, profile);

    return profile;
  }

  /**
   * Store a sleep profile in the user's session
   * Called automatically by generateSleepProfile()
   */
  storeSleepProfile(userId: string, profile: ISleepProfile): void {
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, sleepProfile: profile });
    }
  }

  /**
   * Get stored sleep profile for a user
   * Returns null if no profile has been generated yet
   */
  getSleepProfile(userId: string): ISleepProfile | null {
    const session = this.sessions.get(userId);
    return session?.sleepProfile ?? null;
  }

  /**
   * Get phenotype-based therapy recommendation integrated with ThirdWaveCoordinator
   *
   * Links Blanken phenotypes to third-wave therapy selection:
   * - Type 1 (Highly Distressed) → ACT-I priority (emotional regulation)
   * - Type 2 (Reward-Sensitive) → MBT-I priority (attention regulation)
   * - Type 3 (Reward-Insensitive) → Standard CBT-I + behavioral activation
   * - Type 4 (High-Reactive) → MCT priority (worry management)
   * - Type 5 (Low-Reactive) → Standard CBT-I first line
   *
   * @param userId - User identifier
   * @param profile - Sleep profile from generateSleepProfile()
   * @returns Therapy recommendation or null if insufficient sleep state data
   */
  getPhenotypeBasedTherapyRecommendation(
    userId: string,
    profile: ISleepProfile
  ): IThirdWaveRecommendation | null {
    const sleepStates = this.getSleepStates(userId);
    if (!sleepStates || sleepStates.length === 0) {
      // Cannot make therapy recommendation without sleep state history
      // User needs to complete at least 1 sleep diary entry first
      return null;
    }

    const lastState = sleepStates[sleepStates.length - 1];

    // Map phenotype to treatment history hints for ThirdWaveCoordinator
    const treatmentHistory = this.mapPhenotypeToTreatmentHints(profile);

    return this.thirdWave.recommendApproach(lastState, treatmentHistory);
  }

  /**
   * Map Blanken phenotype to treatment history hints
   * Used by ThirdWaveCoordinator for therapy selection
   *
   * Research basis (confidence: MEDIUM - no direct RCT):
   * - Blanken 2019 phenotypes map to psychological profiles
   * - ThirdWave engines target specific psychological mechanisms
   * - Mapping based on mechanism alignment, not direct evidence
   */
  private mapPhenotypeToTreatmentHints(
    profile: ISleepProfile
  ): { failedCBTI: boolean; preferences: string[] } {
    const preferences: string[] = [];
    const phenotypeClass = profile.phenotype.primaryPhenotype;

    // Map sleep phenotype patterns to therapy preferences
    // fragmented = Type 4 analog (high reactivity, worry)
    // irregular = Type 1 analog (distress, emotional dysregulation)
    // short_sleeper = Type 2/3 analog (reward sensitivity)
    if (phenotypeClass === 'fragmented') {
      preferences.push('mct', 'relaxation');
    } else if (phenotypeClass === 'irregular') {
      preferences.push('acti', 'emotional_regulation');
    } else if (phenotypeClass === 'short_sleeper') {
      preferences.push('mbti', 'attention_regulation');
    }

    // High distress indicators suggest third-wave priority
    const hasHighDistress = profile.riskAssessment.scores.anxietyRisk > 0.7 ||
                           profile.riskAssessment.scores.depressionRisk > 0.7;

    return {
      failedCBTI: hasHighDistress, // Consider standard CBT-I insufficient for high distress
      preferences,
    };
  }

  /**
   * Check if PhenotypingService is ready
   * PAT model requires async initialization
   */
  isPhenotypingReady(): boolean {
    return this.phenotypingService.isReady();
  }

  /**
   * Initialize PhenotypingService (loads PAT model)
   * Call before first use if async initialization needed
   */
  async initializePhenotyping(): Promise<void> {
    await this.phenotypingService.initialize();
  }

  // ============= Circadian AI (Chronotype & Circadian Personalization) =============

  /**
   * Get MEQ (Morningness-Eveningness Questionnaire) items
   * Russian-validated 19-item questionnaire (Horne & Ostberg, 1976)
   */
  getMEQQuestionnaire() {
    return this.circadianAI.getMEQQuestionnaire();
  }

  /**
   * Assess chronotype from MEQ responses
   * Returns comprehensive circadian assessment with personalized recommendations
   */
  assessChronotypeFromMEQ(
    userId: string,
    response: IMEQResponse
  ): ICircadianAssessment {
    const assessment = this.circadianAI.assessFromMEQ(response);

    // Update session with assessment
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, circadianAssessment: assessment });
    }

    return assessment;
  }

  /**
   * Store a pre-computed circadian assessment (e.g., MEQ + MCTQ enriched)
   * Used when the assessment is computed externally with additional data (social jetlag)
   */
  storeCircadianAssessment(
    userId: string,
    assessment: ICircadianAssessment
  ): void {
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, circadianAssessment: assessment });
    }
  }

  /**
   * Assess chronotype from MCTQ responses
   * Munich Chronotype Questionnaire - measures actual sleep behavior
   */
  assessChronotypeFromMCTQ(
    userId: string,
    response: IMCTQResponse
  ): ICircadianAssessment {
    const assessment = this.circadianAI.assessFromMCTQ(response);

    // Update session
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, circadianAssessment: assessment });
    }

    return assessment;
  }

  /**
   * Generate personalized chronotherapy plan
   * Integrates chronotype, social jetlag, and light exposure recommendations
   */
  generateChronotherapyPlan(userId: string): IChronotherapyPlan | null {
    const session = this.sessions.get(userId);
    if (!session?.circadianAssessment) return null;

    const userStates = this.sleepStates.get(userId) || [];
    const latestState = userStates.length > 0 ? userStates[userStates.length - 1] : undefined;

    const plan = this.circadianAI.generateChronotherapyPlan(
      userId,
      session.circadianAssessment,
      latestState
    );

    // Update session
    this.sessions.set(userId, { ...session, chronotherapyPlan: plan });

    return plan;
  }

  /**
   * Get user's chronotype category
   */
  getChronotype(userId: string): ChronotypeCategory | null {
    const session = this.sessions.get(userId);
    return session?.circadianAssessment?.chronotypeCategory || null;
  }

  /**
   * Get social jetlag analysis
   */
  getSocialJetlag(userId: string): {
    hours: number;
    severity: 'minimal' | 'mild' | 'moderate' | 'severe';
    recommendation: string;
  } | null {
    const session = this.sessions.get(userId);
    if (!session?.circadianAssessment) return null;

    const sj = session.circadianAssessment.socialJetlag;
    return {
      hours: sj,
      severity:
        sj < 1 ? 'minimal' : sj < 2 ? 'mild' : sj < 3 ? 'moderate' : 'severe',
      recommendation: this.getSocialJetlagRecommendation(sj),
    };
  }

  private getSocialJetlagRecommendation(hours: number): string {
    if (hours < 1) {
      return 'Ваш социальный джетлаг минимален. Продолжайте придерживаться регулярного расписания.';
    } else if (hours < 2) {
      return 'Умеренный социальный джетлаг. Старайтесь не отклоняться от графика более чем на 1 час в выходные.';
    } else if (hours < 3) {
      return 'Значительный социальный джетлаг. Рекомендуется постепенно выравнивать режим сна между буднями и выходными.';
    } else {
      return 'Выраженный социальный джетлаг требует коррекции. Рассмотрите хронотерапию и светотерапию.';
    }
  }

  // ============= TCM (Traditional Chinese Medicine) Integration =============

  /**
   * Assess TCM constitution and insomnia pattern
   * Based on Traditional Chinese Medicine differential diagnosis
   * Requires sleep state data for proper TCM pattern recognition
   */
  assessTCMProfile(userId: string): ITCMAssessment | null {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const latestState = userStates[userStates.length - 1];
    const assessment = this.tcmEngine.assessTCMProfile(latestState);

    // Update session
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, tcmAssessment: assessment });
    }

    return assessment;
  }

  /**
   * Create integrated TCM-CBT-I plan
   * Combines Western CBT-I with appropriate TCM modalities
   */
  createTCMIntegratedPlan(userId: string): ITCMCBTIPlan | null {
    const session = this.sessions.get(userId);
    if (!session?.tcmAssessment || !session?.plan) return null;

    const plan = this.tcmEngine.createIntegratedPlan(
      userId,
      session.plan,
      session.tcmAssessment
    );

    // Update session
    this.sessions.set(userId, { ...session, tcmPlan: plan });

    return plan;
  }

  /**
   * Get acupressure instructions based on TCM plan
   */
  getAcupressureInstructions(userId: string): string[] | null {
    const session = this.sessions.get(userId);
    if (!session?.tcmPlan) return null;

    return this.tcmEngine.getAcupressureInstructions(session.tcmPlan.acupoints);
  }

  // ============= Ayurveda & Yoga Integration =============

  /**
   * Assess Ayurvedic constitution (Prakriti) and imbalance (Vikriti)
   * Requires sleep state data for proper assessment
   */
  assessAyurvedicProfile(userId: string): IAyurvedicAssessment | null {
    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const latestState = userStates[userStates.length - 1];
    const assessment = this.ayurvedaEngine.assessAyurvedicProfile(latestState);

    // Update session
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, ayurvedicAssessment: assessment });
    }

    return assessment;
  }

  /**
   * Get Yoga Nidra protocol from assessment
   * Adapted for insomnia based on dosha type
   */
  getYogaNidraProtocol(userId: string): IYogaNidraProtocol | null {
    const session = this.sessions.get(userId);
    return session?.ayurvedicAssessment?.yogaNidraProtocol || null;
  }

  /**
   * Get Dinacharya (daily routine) recommendations
   * Personalized Ayurvedic daily schedule for sleep optimization
   */
  getDinacharya(userId: string): IDinacharya | null {
    const session = this.sessions.get(userId);
    return session?.ayurvedicAssessment?.dinacharya || null;
  }

  /**
   * Get Ayurvedic herbal recommendations for sleep
   */
  getAyurvedicHerbs(userId: string): readonly IAyurvedicHerb[] | null {
    const session = this.sessions.get(userId);
    return session?.ayurvedicAssessment?.herbs || null;
  }

  /**
   * Check Yoga Nidra safety based on screening answers
   *
   * Safety protocol based on:
   * - PubMed 39690521: Trauma-informed Yoga Nidra components
   * - PMC10714319: Yoga Nidra mental health contraindications
   *
   * @see CLAUDE.md §2.1 — Safety always comes first
   */
  checkYogaNidraSafety(
    screening: IYogaNidraSafetyScreening
  ): IYogaNidraSafetyResult {
    return this.ayurvedaEngine.checkYogaNidraSafety(screening);
  }

  /**
   * Get basic self-acupressure instructions for insomnia
   * Uses primary points (HT7, SP6) without requiring TCM assessment
   *
   * Evidence: Self-administered acupressure RCT (N=200, 2022)
   * - ISI reduction 2.89 points greater than control (p<0.001)
   * - Training: 2 sessions × 2 hours sufficient
   */
  getBasicAcupressureInstructions(): string[] {
    const primaryPoints = [
      this.tcmEngine.getAcupoints().find(p => p.code === 'HT7')!,
      this.tcmEngine.getAcupoints().find(p => p.code === 'SP6')!,
    ].filter(Boolean);

    return this.tcmEngine.getAcupressureInstructions(primaryPoints);
  }

  /**
   * Get Yoga Nidra basic protocol (without dosha assessment)
   * Standard 30-min Satyananda tradition protocol
   */
  getBasicYogaNidraProtocol(): IYogaNidraProtocol {
    return this.ayurvedaEngine.getYogaNidraProtocol();
  }

  /**
   * Get Yoga Nidra instructions for bedtime
   */
  getYogaNidraInstructions(): string[] {
    return this.ayurvedaEngine.getYogaNidraInstructions();
  }

  // ============= European Guideline 2023 (Evidence-Based Recommendations) =============

  /**
   * Get evidence-based treatment recommendations
   * Based on European Insomnia Guideline 2023
   */
  getTreatmentRecommendations(
    category?: 'diagnostic' | 'treatment' | 'pharmacological'
  ): IGuidelineRecommendation[] {
    return this.guideline2023.getRecommendations(category);
  }

  /**
   * Get NEW 2023 recommendations (updates from previous guidelines)
   */
  getNew2023Recommendations(): IGuidelineRecommendation[] {
    return this.guideline2023.getNew2023Recommendations();
  }

  /**
   * Get evidence for all CBT-I components
   */
  getCBTIComponentEvidence(): readonly ICBTIComponentEvidence[] {
    return this.guideline2023.getCBTIComponentEvidence();
  }

  /**
   * Get most effective CBT-I components ranked by effect size
   */
  getMostEffectiveCBTIComponents(): ICBTIComponentEvidence[] {
    return this.guideline2023.getMostEffectiveCBTIComponents();
  }

  /**
   * Check if treatment plan complies with dCBT-I criteria
   * Digital CBT-I implementation standards
   */
  checkDCBTICompliance(
    criteria: Record<string, boolean>
  ): {
    compliant: boolean;
    missingRequired: string[];
    missingOptional: string[];
  } {
    return this.guideline2023.checkDCBTICompliance(criteria);
  }

  /**
   * Get pharmacological evidence (for healthcare provider reference)
   * Note: For informational purposes only, not prescribing advice
   */
  getPharmacologicalEvidence(recommended?: boolean): IPharmacologicalEvidence[] {
    return this.guideline2023.getPharmacologicalEvidence(recommended);
  }

  /**
   * Get integrated recommendation considering all assessments
   * Combines circadian, cultural, and evidence-based factors
   */
  getIntegratedRecommendation(userId: string): {
    primaryApproach: string;
    secondaryApproaches: string[];
    culturalAdaptations: string[];
    evidenceLevel: EvidenceGrade;
    personalizationFactors: string[];
    weeklySchedule: Array<{ day: string; activities: string[] }>;
  } | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    const factors: string[] = [];
    const adaptations: string[] = [];
    const approaches: string[] = [];

    // Check circadian
    if (session.circadianAssessment) {
      factors.push(`Хронотип: ${session.circadianAssessment.chronotype}`);
      if (session.circadianAssessment.socialJetlag > 1) {
        approaches.push('Хронотерапия');
      }
    }

    // Check TCM
    if (session.tcmAssessment) {
      factors.push(`TCM паттерн: ${session.tcmAssessment.insomniaPattern}`);
      adaptations.push('Интеграция ТКМ (акупрессура, травы)');
    }

    // Check Ayurveda
    if (session.ayurvedicAssessment) {
      factors.push(`Доша: ${session.ayurvedicAssessment.prakriti}`);
      adaptations.push('Аюрведическая адаптация (диначарья, йога-нидра)');
    }

    // Primary approach is always CBT-I (Grade A evidence)
    return {
      primaryApproach: 'КПТ-И (когнитивно-поведенческая терапия инсомнии)',
      secondaryApproaches: approaches.length > 0 ? approaches : ['Терапии третьей волны (MBT-I, ACT-I)'],
      culturalAdaptations: adaptations,
      evidenceLevel: 'A' as EvidenceGrade,
      personalizationFactors: factors,
      weeklySchedule: this.generateWeeklySchedule(session),
    };
  }

  private generateWeeklySchedule(
    session: ISleepCoreSession
  ): Array<{ day: string; activities: string[] }> {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return days.map((day, i) => ({
      day,
      activities: this.getDayActivities(session, i),
    }));
  }

  private getDayActivities(session: ISleepCoreSession, dayIndex: number): string[] {
    const activities: string[] = ['Дневник сна (утро)', 'Ограничение сна'];

    if (dayIndex % 2 === 0) {
      activities.push('Когнитивная реструктуризация');
    }

    if (session.tcmAssessment && dayIndex % 3 === 0) {
      activities.push('Акупрессура');
    }

    if (session.ayurvedicAssessment) {
      activities.push('Йога-нидра (вечер)');
    }

    if (session.chronotherapyPlan) {
      activities.push('Светотерапия (утро)');
    }

    activities.push('Релаксация перед сном');

    return activities;
  }

  // ============= Private Helpers =============

  private getRecentStates(userId: string, days: number): ISleepState[] {
    const allStates = this.sleepStates.get(userId) || [];
    return allStates.slice(-days);
  }

  private buildSleepState(checkIn: IDailyCheckIn, metrics: ISleepMetrics): ISleepState {
    // Build a minimal ISleepState from check-in data
    // In production, would aggregate more data
    return {
      userId: checkIn.userId,
      timestamp: new Date(),
      date: checkIn.date,
      metrics,
      circadian: {
        chronotype: 'intermediate',
        circadianPhase: 0,
        phaseDeviation: 0,
        lightExposure: 0,
        estimatedMelatoninOnset: '21:00',
        socialJetLag: 0,
        isStable: true,
      },
      homeostasis: {
        sleepDebt: 0,
        debtDuration: 0,
        homeostaticPressure: 0.5,
        optimalSleepDuration: 7.5,
        isRecoverable: true,
      },
      insomnia: {
        isiScore: this.estimateISI(checkIn.userId),
        severity: 'moderate',
        subtype: 'mixed',
        durationWeeks: 4,
        daytimeImpact: 0.5,
        sleepDistress: 0.5,
      },
      behaviors: {
        caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 8 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 30,
        exercise: { didExercise: false, durationMinutes: 0, hoursBeforeBed: 0 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: {
          temperatureCelsius: 18,
          isQuiet: true,
          isDark: true,
          isComfortable: true,
        },
      },
      cognitions: {
        dbasScore: 3,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: 0.3,
        preSleepArousal: 0.3,
        sleepSelfEfficacy: 0.7,
      },
      subjectiveQuality: this.numberToQuality(checkIn.morningMood),
      morningAlertness: checkIn.energyLevel / 5,
      daytimeSleepiness: 0.3,
      sleepHealthScore: 70,
      trend: 'stable',
      dataQuality: 0.8,
      source: 'diary',
    };
  }

  // ===========================================================================
  // GAMIFICATION FACADE (P2-1 fix: Route through SleepCoreAPI instead of direct access)
  // ===========================================================================

  /**
   * Get gamification engine instance (lazy initialized)
   * @internal Used by facade methods below
   */
  private async getGamification(): Promise<IGamificationEngine> {
    return getGamificationEngine();
  }

  /**
   * Get player's complete gamification profile
   * Includes XP, level, badges, quests, streaks, evolution state
   *
   * @param userId - User ID (numeric)
   * @returns Complete player profile
   */
  async getPlayerProfile(userId: number): Promise<IPlayerProfile> {
    const engine = await this.getGamification();
    return engine.getPlayerProfile(userId);
  }

  /**
   * Record a gamification action and process effects
   * Main entry point for awarding XP, checking quests, badges, evolution
   *
   * @param userId - User ID (numeric)
   * @param action - Action type (diary_entry, voice_diary, etc.)
   * @param metadata - Additional action metadata
   * @returns Unified gamification result with all effects
   */
  async recordGamificationAction(
    userId: number,
    action: GamificationAction,
    metadata?: Record<string, unknown>
  ): Promise<IGamificationResult> {
    const engine = await this.getGamification();
    return engine.recordAction(userId, action, metadata);
  }

  /**
   * Record daily check-in for streak maintenance
   *
   * @param userId - User ID (numeric)
   * @returns Gamification result with streak updates
   */
  async recordDailyCheckIn(userId: number): Promise<IGamificationResult> {
    const engine = await this.getGamification();
    return engine.recordDailyCheckIn(userId);
  }

  /**
   * Get user's earned badges
   *
   * @param userId - User ID (numeric)
   * @returns Array of user badges with award dates
   */
  async getUserBadges(userId: number): Promise<IUserBadge[]> {
    const engine = await this.getGamification();
    return engine.getUserBadges(userId);
  }

  /**
   * Get all available badges in the system
   *
   * @returns Array of all badge definitions
   */
  async getAllBadges(): Promise<IBadge[]> {
    const engine = await this.getGamification();
    return engine.getAllBadges();
  }

  /**
   * Check if user has a specific badge
   *
   * @param userId - User ID (numeric)
   * @param badgeId - Badge ID to check
   * @returns True if user has the badge
   */
  async hasBadge(userId: number, badgeId: string): Promise<boolean> {
    const engine = await this.getGamification();
    return engine.hasBadge(userId, badgeId);
  }

  /**
   * Get user's active quests
   *
   * @param userId - User ID (numeric)
   * @returns Array of active quest info with progress
   */
  async getActiveQuests(userId: number): Promise<IActiveQuestInfo[]> {
    const engine = await this.getGamification();
    return engine.getActiveQuests(userId);
  }

  /**
   * Start a quest for user
   *
   * @param userId - User ID (numeric)
   * @param questId - Quest ID to start
   * @returns Active quest or null if quest not found/already active
   */
  async startQuest(userId: number, questId: string): Promise<IActiveQuest | null> {
    const engine = await this.getGamification();
    return engine.startQuest(userId, questId);
  }

  /**
   * Get available quests for user (not started, prerequisites met)
   *
   * @param userId - User ID (numeric)
   * @returns Array of available quests
   */
  async getAvailableQuests(userId: number): Promise<IQuest[]> {
    const engine = await this.getGamification();
    return engine.getAvailableQuests(userId);
  }

  /**
   * Get count of completed quests for user
   *
   * @param userId - User ID (numeric)
   * @returns Number of completed quests
   */
  async getCompletedQuestCount(userId: number): Promise<number> {
    const engine = await this.getGamification();
    return engine.getCompletedQuestCount(userId);
  }

  /**
   * Get user's XP and level status
   *
   * @param userId - User ID (numeric)
   * @returns XP status with level progress
   */
  async getXPStatus(userId: number): Promise<{
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    levelProgress: number;
  }> {
    const engine = await this.getGamification();
    return engine.getXPStatus(userId);
  }

  /**
   * Get user's streak information
   *
   * @param userId - User ID (numeric)
   * @returns Array of streak info
   */
  async getStreaks(userId: number): Promise<IStreakInfo[]> {
    const engine = await this.getGamification();
    return engine.getStreaks(userId);
  }

  /**
   * Get user's gamification settings
   *
   * @param userId - User ID (numeric)
   * @returns Settings including compassion mode, soft reset
   */
  async getGamificationSettings(userId: number): Promise<{
    compassionEnabled: boolean;
    softResetEnabled: boolean;
    softLimitMinutes: number;
    dailyLimitMinutes: number;
  }> {
    const engine = await this.getGamification();
    return engine.getSettings(userId);
  }

  /**
   * Update user's gamification settings
   *
   * @param userId - User ID (numeric)
   * @param settings - Settings to update
   */
  async updateGamificationSettings(
    userId: number,
    settings: Partial<{
      compassionEnabled: boolean;
      softResetEnabled: boolean;
      softLimitMinutes: number;
      dailyLimitMinutes: number;
    }>
  ): Promise<void> {
    const engine = await this.getGamification();
    return engine.updateSettings(userId, settings);
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private qualityToNumber(quality: string): number {
    const map: Record<string, number> = {
      very_poor: 1,
      poor: 2,
      fair: 3,
      good: 4,
      excellent: 5,
    };
    return map[quality] || 3;
  }

  private numberToQuality(num: number): 'very_poor' | 'poor' | 'fair' | 'good' | 'excellent' {
    if (num <= 1) return 'very_poor';
    if (num <= 2) return 'poor';
    if (num <= 3) return 'fair';
    if (num <= 4) return 'good';
    return 'excellent';
  }

  private generateRationale(
    intervention: ICBTIIntervention,
    pomdpAction: SleepAction,
    state: ISleepState
  ): string {
    let rationale = intervention.rationale;

    // Add POMDP-based context
    if (pomdpAction.startsWith('relaxation_')) {
      rationale += ' Алгоритм определил высокий уровень возбуждения.';
    } else if (pomdpAction === 'adjust_sleep_window') {
      rationale += ` Текущая эффективность сна: ${state.metrics.sleepEfficiency}%.`;
    } else if (pomdpAction === 'challenge_belief') {
      rationale += ' Обнаружены тревожные мысли о сне.';
    }

    return rationale;
  }

  private getRelaxationInstructions(technique: RelaxationTechnique): string[] {
    const instructions: Record<RelaxationTechnique, string[]> = {
      progressive_muscle_relaxation: [
        'Лягте удобно и закройте глаза.',
        'Напрягите мышцы стоп на 5 секунд, затем расслабьте.',
        'Продолжайте с икрами, бёдрами, животом, руками, плечами, лицом.',
        'Почувствуйте контраст между напряжением и расслаблением.',
      ],
      diaphragmatic_breathing: [
        'Положите руку на живот.',
        'Вдохните через нос на 4 счёта, живот поднимается.',
        'Задержите на 2 счёта.',
        'Выдохните через рот на 6 счётов.',
      ],
      body_scan: [
        'Закройте глаза и обратите внимание на дыхание.',
        'Медленно сканируйте тело сверху вниз.',
        'Отмечайте ощущения без осуждения.',
        'Расслабляйте каждую часть тела.',
      ],
      guided_imagery: [
        'Представьте спокойное место.',
        'Визуализируйте детали: цвета, звуки, запахи.',
        'Погрузитесь в ощущение покоя.',
        'Позвольте образу раствориться, когда почувствуете сонливость.',
      ],
      autogenic_training: [
        'Повторяйте: "Моя рука тяжёлая и тёплая".',
        'Переходите к другим частям тела.',
        'Завершите: "Я совершенно спокоен".',
      ],
      mindfulness_meditation: [
        'Наблюдайте за дыханием.',
        'Мысли приходят и уходят — не цепляйтесь.',
        'Мягко возвращайте внимание к дыханию.',
      ],
      cognitive_shuffle: [
        'Выберите слово (например, "ЯБЛОКО").',
        'Для каждой буквы придумывайте случайные образы.',
        'Я: якорь, яхта... Б: банан, берёза...',
        'Образы должны быть несвязанными.',
      ],
    };

    return instructions[technique] || ['Дышите медленно и глубоко.'];
  }

  // ============= Wave 6: AInsomnia Features =============
  // Seasonal Patterns, Activity Proxy, Anomaly Detection

  // ------------- Seasonal Patterns -------------

  /**
   * Set user location for seasonal calculations
   * Required for accurate SAD risk assessment and light recommendations
   *
   * @param userId - User identifier
   * @param location - User's location data
   */
  setUserLocation(userId: string, location: UserLocation): void {
    this.userLocations.set(userId, location);
  }

  /**
   * Get user location if set
   *
   * @param userId - User identifier
   * @returns User location or null
   */
  getUserLocation(userId: string): UserLocation | null {
    return this.userLocations.get(userId) || null;
  }

  /**
   * Get seasonal context for a user based on their location
   *
   * @param userId - User identifier
   * @param date - Optional date (defaults to now)
   * @returns Seasonal context or null if no location set
   */
  getSeasonalContext(userId: string, date?: Date): SeasonalContext | null {
    const location = this.userLocations.get(userId);
    if (!location) return null;

    return this.seasonalEngine.getSeasonalContext(
      location.latitude,
      date || new Date(),
      location.longitude
    );
  }

  /**
   * Get light therapy recommendation based on user's seasonal context
   *
   * @param userId - User identifier
   * @returns Light recommendation or null if no location set
   */
  getLightRecommendation(userId: string): LightRecommendation | null {
    const context = this.getSeasonalContext(userId);
    if (!context) return null;

    return this.seasonalEngine.getLightRecommendation(context);
  }

  /**
   * Get seasonal tips relevant to user's current context
   *
   * @param userId - User identifier
   * @param limit - Maximum number of tips (default: 3)
   * @returns Array of seasonal tips or empty array if no location
   */
  getSeasonalTips(userId: string, limit: number = 3): SeasonalTip[] {
    const context = this.getSeasonalContext(userId);
    if (!context) return [];

    return this.seasonalEngine.getSeasonalTips(context, limit);
  }

  /**
   * Get seasonal TIB adjustment suggestion
   * NOTE: Advisory only - SleepRestrictionEngine enforces MIN_TIB
   *
   * @param userId - User identifier
   * @returns TIB adjustment suggestion or null if no location
   */
  getSeasonalTIBAdjustment(userId: string): SeasonalTIBAdjustment | null {
    const context = this.getSeasonalContext(userId);
    if (!context) return null;

    return this.seasonalEngine.suggestTIBAdjustment(context);
  }

  /**
   * Get SeasonalEngine singleton (Typed Accessor)
   */
  getSeasonalEngine(): SeasonalEngine {
    return this.seasonalEngine;
  }

  // ------------- Activity Proxy -------------

  /**
   * Estimate sleep from activity data when wearable sleep tracking unavailable
   *
   * @param data - Activity data for a day
   * @returns Estimated sleep parameters
   */
  estimateSleepFromActivity(data: ActivityData): EstimatedSleep {
    return this.activityProxyEngine.estimateSleepFromActivity(data);
  }

  /**
   * Calculate activity pattern from multiple days of data
   *
   * @param multiDayData - Activity data for multiple days
   * @returns Activity pattern summary
   */
  calculateActivityPattern(multiDayData: ActivityData[]): ActivityPattern {
    return this.activityProxyEngine.calculateActivityPattern(multiDayData);
  }

  /**
   * Get ActivityProxyEngine singleton (Typed Accessor)
   */
  getActivityProxyEngine(): ActivityProxyEngine {
    return this.activityProxyEngine;
  }

  // ------------- Anomaly Detection -------------

  /**
   * Calculate baseline statistics from user's sleep history
   * Requires at least 7 sessions for reliable baseline
   *
   * @param userId - User identifier
   * @returns Baseline stats or null if insufficient data
   */
  calculateAnomalyBaseline(userId: string): BaselineStats | null {
    const sleepStates = this.getSleepStates(userId);
    if (!sleepStates || sleepStates.length < 7) return null;

    // Convert ISleepState[] to SleepSessionForAnomaly[]
    const sessions: SleepSessionForAnomaly[] = sleepStates.map((state) => ({
      date: state.timestamp || new Date(),
      tst: state.metrics.totalSleepTime,
      se: state.metrics.sleepEfficiency,
      sol: state.metrics.sleepOnsetLatency,
      waso: state.metrics.wakeAfterSleepOnset || 0,
    }));

    return this.anomalyDetector.calculateBaseline(sessions);
  }

  /**
   * Detect if a sleep session is anomalous compared to user's baseline
   *
   * @param userId - User identifier
   * @param session - Sleep session to analyze (defaults to latest)
   * @returns Anomaly result or null if insufficient baseline data
   */
  detectSleepAnomaly(
    userId: string,
    session?: SleepSessionForAnomaly
  ): AnomalyResult | null {
    const baseline = this.calculateAnomalyBaseline(userId);
    if (!baseline || !baseline.isReliable) return null;

    // If no session provided, use latest sleep state
    if (!session) {
      const sleepStates = this.getSleepStates(userId);
      if (!sleepStates || sleepStates.length === 0) return null;

      const latestState = sleepStates[sleepStates.length - 1];
      session = {
        date: latestState.timestamp || new Date(),
        tst: latestState.metrics.totalSleepTime,
        se: latestState.metrics.sleepEfficiency,
        sol: latestState.metrics.sleepOnsetLatency,
        waso: latestState.metrics.wakeAfterSleepOnset || 0,
      };
    }

    return this.anomalyDetector.detectAnomaly(session, baseline);
  }

  /**
   * Find all anomalies in user's recent sleep history
   *
   * @param userId - User identifier
   * @param days - Number of days to analyze (default: 7)
   * @returns Array of anomaly results
   */
  getRecentAnomalies(userId: string, days: number = 7): AnomalyResult[] {
    const sleepStates = this.getSleepStates(userId);
    if (!sleepStates || sleepStates.length < 7) return [];

    const baseline = this.calculateAnomalyBaseline(userId);
    if (!baseline || !baseline.isReliable) return [];

    // Get recent sessions
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const sessions: SleepSessionForAnomaly[] = sleepStates
      .filter((state) => {
        const stateDate = state.timestamp || new Date();
        return stateDate >= cutoffDate;
      })
      .map((state) => ({
        date: state.timestamp || new Date(),
        tst: state.metrics.totalSleepTime,
        se: state.metrics.sleepEfficiency,
        sol: state.metrics.sleepOnsetLatency,
        waso: state.metrics.wakeAfterSleepOnset || 0,
      }));

    return this.anomalyDetector.findAnomalies(sessions, baseline);
  }

  /**
   * Get AnomalyDetector singleton (Typed Accessor)
   */
  getAnomalyDetector(): AnomalyDetector {
    return this.anomalyDetector;
  }
}

// Export singleton instance
export const sleepCore = new SleepCoreAPI();
