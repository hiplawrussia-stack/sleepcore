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
import { SleepCorePOMDP, type ISleepObservation, type SleepAction } from './platform/SleepCorePOMDP';
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
  MindfulnessPractice,
  IDefusionTechnique,
  IUnwantedExperience,
  SessionLevel,
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
  type ITCMAssessment,
  type ITCMCBTIPlan,
  type IAyurvedicAssessment,
  type IYogaNidraProtocol,
  type IDinacharya,
  type IAyurvedicHerb,
} from './cultural-adaptations';
import {
  EuropeanGuideline2023,
  type EvidenceGrade,
  type IGuidelineRecommendation,
  type ICBTIComponentEvidence,
  type IPharmacologicalEvidence,
} from './evidence-base';

/**
 * SleepCore user session
 */
export interface ISleepCoreSession {
  readonly userId: string;
  readonly startDate: Date;
  readonly plan: ICBTIPlan | null;
  readonly mbtiPlan: IMBTIPlan | null;
  readonly actiPlan: IACTIPlan | null;
  readonly isActive: boolean;

  // NEW: Circadian & Cultural Adaptations
  readonly circadianAssessment: ICircadianAssessment | null;
  readonly chronotherapyPlan: IChronotherapyPlan | null;
  readonly tcmAssessment: ITCMAssessment | null;
  readonly tcmPlan: ITCMCBTIPlan | null;
  readonly ayurvedicAssessment: IAyurvedicAssessment | null;
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
  private readonly pomdp: SleepCorePOMDP;
  private readonly thirdWave: ThirdWaveCoordinator;

  // NEW: Circadian & Cultural Adaptation Engines
  private readonly circadianAI: CircadianAI;
  private readonly tcmEngine: TCMIntegratedCBTIEngine;
  private readonly ayurvedaEngine: AyurvedaYogaEngine;
  private readonly guideline2023: EuropeanGuideline2023;

  private sessions: Map<string, ISleepCoreSession>;
  private sleepStates: Map<string, ISleepState[]>;

  constructor() {
    this.diaryService = new SleepDiaryService();
    this.cbtiEngine = new CBTIEngine();
    this.pomdp = new SleepCorePOMDP();
    this.thirdWave = new ThirdWaveCoordinator();

    // NEW: Initialize Circadian & Cultural Adaptation Engines
    this.circadianAI = new CircadianAI();
    this.tcmEngine = new TCMIntegratedCBTIEngine();
    this.ayurvedaEngine = new AyurvedaYogaEngine();
    this.guideline2023 = new EuropeanGuideline2023();

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
      isActive: true,
      // NEW: Circadian & Cultural Adaptations
      circadianAssessment: null,
      chronotherapyPlan: null,
      tcmAssessment: null,
      tcmPlan: null,
      ayurvedicAssessment: null,
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
   * End user's session
   */
  endSession(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, isActive: false });
    }
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
   */
  initializeTreatment(userId: string, baselineData: ISleepState[]): ICBTIPlan {
    if (baselineData.length < 7) {
      throw new Error('Need at least 7 days of baseline sleep data');
    }

    const plan = this.cbtiEngine.initializePlan(userId, baselineData);

    // Update session with plan
    const session = this.sessions.get(userId);
    if (session) {
      this.sessions.set(userId, { ...session, plan });
    }

    // Initialize POMDP with baseline
    for (const state of baselineData) {
      this.pomdp.updateBelief({
        source: state.source,
        metrics: state.metrics,
        subjectiveQuality: this.qualityToNumber(state.subjectiveQuality),
        followedPrescription: true,
        morningMood: state.morningAlertness * 5,
        timestamp: state.timestamp,
      });
    }

    return plan;
  }

  /**
   * Process daily check-in and get recommendations
   */
  processDailyCheckIn(checkIn: IDailyCheckIn): IInterventionResult {
    // Add diary entry
    const metrics = this.addDiaryEntry(checkIn.diaryEntry);

    // Create observation for POMDP
    const observation: ISleepObservation = {
      source: 'diary',
      metrics,
      subjectiveQuality: checkIn.morningMood,
      followedPrescription: checkIn.followedSleepWindow,
      morningMood: checkIn.morningMood,
      timestamp: new Date(),
    };

    // Update POMDP belief
    this.pomdp.updateBelief(observation);

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

    // Get CBT-I intervention
    const intervention = this.cbtiEngine.getNextIntervention(session.plan, currentState);

    // Use POMDP to select action
    const pomdpAction = this.pomdp.selectAction(
      this.pomdp.sleepStateToPomdpState(currentState)
    );

    // Calculate confidence based on action stats
    const actionStats = this.pomdp.getActionStats().get(pomdpAction);
    const confidence = actionStats
      ? actionStats.alpha / (actionStats.alpha + actionStats.beta)
      : 0.5;

    return {
      intervention,
      confidence,
      alternatives: [], // Could generate alternatives here
      rationale: this.generateRationale(intervention, pomdpAction, currentState),
    };
  }

  /**
   * Get next recommended intervention
   */
  getNextIntervention(userId: string): ICBTIIntervention | null {
    const session = this.sessions.get(userId);
    if (!session?.plan) return null;

    const userStates = this.sleepStates.get(userId) || [];
    if (userStates.length === 0) return null;

    const currentState = userStates[userStates.length - 1];
    return this.cbtiEngine.getNextIntervention(session.plan, currentState);
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

  // ============= Relaxation =============

  /**
   * Get recommended relaxation technique
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

    // Get from CBT-I engine's relaxation component
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
}

// Export singleton instance
export const sleepCore = new SleepCoreAPI();
