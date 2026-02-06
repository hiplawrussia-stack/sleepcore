/**
 * CognitiveProgressReportService (Wave 2 - DBAS-16-Inspired Monitoring)
 * ======================================================================
 * Session-by-session monitoring of dysfunctional beliefs about sleep,
 * belief change tracking, and weekly cognitive progress reports.
 *
 * Research Foundation:
 * - Morin et al. (2007): DBAS-16 — shortened version, 16 items, 0-10 scale
 *   Average score >3.8 = clinically significant dysfunctional beliefs
 * - Espie et al. (2014): CBT-I for DBAS, effect g=-0.90
 * - Edinger & Carney (2015): Session-by-session belief monitoring in CBT-I
 * - Lancee et al. (2015): DBAS mediates insomnia severity change
 *
 * Key DBAS-16 Domains (Morin, 2007):
 * 1. Consequences of insomnia (items 5,11,12,14,16)
 * 2. Worry/helplessness (items 1,3,9,10)
 * 3. Sleep expectations (items 2,7,8)
 * 4. Medication use (items 4,6,13,15)
 *
 * Integration:
 * - Uses ISleepState.cognitions.dbasScore as primary metric
 * - Uses ISleepState.cognitions.beliefs for specific belief tracking
 * - Provides weekly reports for ProgressCommand integration
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { ISleepState, ISleepCognitions } from '../../sleep/interfaces/ISleepState';
import type { ServiceStateRepository } from '../../infrastructure/database/repositories/ServiceStateRepository';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * DBAS belief domain
 */
export type BeliefDomain =
  | 'consequences'       // "Insomnia is ruining my health"
  | 'worry_helplessness' // "I have no control over my sleep"
  | 'expectations'       // "I need 8 hours to function"
  | 'medication';        // Beliefs about sleep medication

/**
 * Specific tracked belief from ISleepCognitions.beliefs
 */
export type TrackedBelief = keyof ISleepCognitions['beliefs'];

/**
 * Belief change direction
 */
export type BeliefChangeDirection = 'improved' | 'unchanged' | 'worsened';

/**
 * Single session belief snapshot
 */
export interface IBeliefSnapshot {
  readonly date: string;
  readonly dbasScore: number;
  readonly sleepAnxiety: number;
  readonly sleepSelfEfficacy: number;
  readonly activeBeliefs: TrackedBelief[];
  readonly preSleepArousal: number;
}

/**
 * Belief change between two snapshots
 */
export interface IBeliefChange {
  readonly belief: TrackedBelief;
  readonly nameRu: string;
  readonly direction: BeliefChangeDirection;
  readonly wasActive: boolean;
  readonly isActive: boolean;
}

/**
 * Weekly cognitive progress report
 */
export interface ICognitiveProgressReport {
  readonly userId: string;
  readonly weekNumber: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currentDbas: number;
  readonly baselineDbas: number;
  readonly dbasChange: number;
  readonly dbasChangePercent: number;
  readonly isClinicallySigChange: boolean;
  readonly beliefChanges: IBeliefChange[];
  readonly selfEfficacyTrend: 'improving' | 'stable' | 'declining' | 'worsening';
  readonly arousalTrend: 'improving' | 'stable' | 'declining' | 'worsening';
  readonly summaryRu: string;
  readonly recommendations: string[];
  readonly overallProgress: 'excellent' | 'good' | 'moderate' | 'minimal' | 'none';
}

/**
 * Service configuration
 */
export interface ICognitiveProgressConfig {
  readonly enabled: boolean;
  /** DBAS clinical cutoff (Morin, 2007) */
  readonly dbasClinicalCutoff: number;
  /** Clinically significant DBAS change */
  readonly clinicallySignificantChange: number;
  /** Minimum snapshots for trend analysis */
  readonly minSnapshotsForTrend: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_COGNITIVE_PROGRESS_CONFIG: ICognitiveProgressConfig = {
  enabled: true,
  dbasClinicalCutoff: 3.8,
  clinicallySignificantChange: 1.0,
  minSnapshotsForTrend: 3,
};

/**
 * Belief name mapping for Russian display
 */
const BELIEF_NAMES_RU: Record<TrackedBelief, string> = {
  unrealisticExpectations: 'Нереалистичные ожидания о сне',
  catastrophizing: 'Катастрофизация последствий бессонницы',
  helplessness: 'Беспомощность в отношении сна',
  effortfulSleep: 'Попытки контролировать сон',
  healthWorries: 'Беспокойство о влиянии на здоровье',
};

/**
 * Belief → DBAS domain mapping
 */
const BELIEF_TO_DOMAIN: Record<TrackedBelief, BeliefDomain> = {
  unrealisticExpectations: 'expectations',
  catastrophizing: 'consequences',
  helplessness: 'worry_helplessness',
  effortfulSleep: 'expectations',
  healthWorries: 'consequences',
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * CognitiveProgressReportService
 *
 * Tracks dysfunctional sleep beliefs session-by-session and generates
 * weekly cognitive progress reports based on DBAS-16 methodology.
 */
export class CognitiveProgressReportService {
  private readonly config: ICognitiveProgressConfig;
  private readonly snapshots: Map<string, IBeliefSnapshot[]> = new Map();
  private stateRepo?: ServiceStateRepository;
  private static readonly SERVICE_NAME = 'cognitive_progress';

  constructor(config: Partial<ICognitiveProgressConfig> = {}) {
    this.config = { ...DEFAULT_COGNITIVE_PROGRESS_CONFIG, ...config };
  }

  /**
   * Set repository for persistence (write-through + hydration)
   */
  async setRepository(repo: ServiceStateRepository): Promise<void> {
    this.stateRepo = repo;
    await this.hydrateFromDB();
  }

  /**
   * Hydrate in-memory Map from database
   */
  private async hydrateFromDB(): Promise<void> {
    if (!this.stateRepo) return;
    try {
      const allStates = await this.stateRepo.getAllForService(CognitiveProgressReportService.SERVICE_NAME);
      for (const { userId, state } of allStates) {
        const snapshots = state as IBeliefSnapshot[];
        if (Array.isArray(snapshots)) {
          this.snapshots.set(userId, snapshots);
        }
      }
      console.log(`[CognitiveProgress] Hydrated ${allStates.length} user snapshot histories from DB`);
    } catch (err) {
      console.error('[CognitiveProgress] DB hydration failed:', err);
    }
  }

  /**
   * Persist user snapshots to database (write-through)
   */
  private async persistToDB(userId: string): Promise<void> {
    if (!this.stateRepo) return;
    try {
      const history = this.snapshots.get(userId) ?? [];
      await this.stateRepo.set(userId, CognitiveProgressReportService.SERVICE_NAME, history);
    } catch (err) {
      console.error(`[CognitiveProgress] Failed to persist for ${userId}:`, err);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): ICognitiveProgressConfig {
    return this.config;
  }

  // ==========================================================================
  // SNAPSHOT RECORDING
  // ==========================================================================

  /**
   * Record a belief snapshot from current sleep state.
   * Should be called after each diary entry or therapy session.
   */
  recordSnapshot(userId: string, state: ISleepState): IBeliefSnapshot {
    const activeBeliefs: TrackedBelief[] = [];
    const beliefs = state.cognitions.beliefs;
    if (beliefs.unrealisticExpectations) activeBeliefs.push('unrealisticExpectations');
    if (beliefs.catastrophizing) activeBeliefs.push('catastrophizing');
    if (beliefs.helplessness) activeBeliefs.push('helplessness');
    if (beliefs.effortfulSleep) activeBeliefs.push('effortfulSleep');
    if (beliefs.healthWorries) activeBeliefs.push('healthWorries');

    const snapshot: IBeliefSnapshot = {
      date: state.date,
      dbasScore: state.cognitions.dbasScore,
      sleepAnxiety: state.cognitions.sleepAnxiety,
      sleepSelfEfficacy: state.cognitions.sleepSelfEfficacy,
      activeBeliefs,
      preSleepArousal: state.cognitions.preSleepArousal,
    };

    const history = this.snapshots.get(userId) ?? [];
    history.push(snapshot);
    this.snapshots.set(userId, history);

    // Write-through to database
    void this.persistToDB(userId);

    return snapshot;
  }

  /**
   * Record snapshots from sleep history in bulk
   */
  recordFromHistory(userId: string, sleepHistory: ISleepState[]): void {
    for (const state of sleepHistory) {
      this.recordSnapshot(userId, state);
    }
  }

  // ==========================================================================
  // PROGRESS REPORTS
  // ==========================================================================

  /**
   * Generate weekly cognitive progress report.
   *
   * @param userId - User ID
   * @param sleepHistory - Recent sleep history (≥7 days recommended)
   * @param weekNumber - Current week in therapy program
   */
  generateWeeklyReport(
    userId: string,
    sleepHistory: ISleepState[],
    weekNumber: number
  ): ICognitiveProgressReport | null {
    if (sleepHistory.length < 3) {
      return null;
    }

    // Ensure snapshots are recorded
    const existingSnapshots = this.snapshots.get(userId) ?? [];
    if (existingSnapshots.length < sleepHistory.length) {
      this.recordFromHistory(userId, sleepHistory);
    }

    const snapshots = this.snapshots.get(userId) ?? [];
    if (snapshots.length < this.config.minSnapshotsForTrend) {
      return null;
    }

    // Current period (last 7 days or available)
    const recentSnapshots = snapshots.slice(-7);
    const baselineSnapshots = snapshots.slice(0, Math.min(7, snapshots.length));

    const currentDbas = this.avgField(recentSnapshots, 'dbasScore');
    const baselineDbas = this.avgField(baselineSnapshots, 'dbasScore');
    const dbasChange = currentDbas - baselineDbas;
    const dbasChangePercent = baselineDbas > 0
      ? (dbasChange / baselineDbas) * 100
      : 0;

    const isClinicallySigChange =
      Math.abs(dbasChange) >= this.config.clinicallySignificantChange;

    // Belief changes
    const beliefChanges = this.analyzeBeliefChanges(baselineSnapshots, recentSnapshots);

    // Trends
    const selfEfficacyTrend = this.calculateFieldTrend(snapshots, 'sleepSelfEfficacy', true);
    const arousalTrend = this.calculateFieldTrend(snapshots, 'preSleepArousal', false);

    // Overall progress
    const overallProgress = this.assessOverallProgress(
      dbasChange, isClinicallySigChange, beliefChanges, selfEfficacyTrend
    );

    // Summary and recommendations
    const summaryRu = this.generateSummary(
      currentDbas, dbasChange, isClinicallySigChange, beliefChanges, overallProgress
    );
    const recommendations = this.generateRecommendations(
      currentDbas, beliefChanges, selfEfficacyTrend, arousalTrend
    );

    const periodStart = recentSnapshots[0]?.date ?? '';
    const periodEnd = recentSnapshots[recentSnapshots.length - 1]?.date ?? '';

    return {
      userId,
      weekNumber,
      periodStart,
      periodEnd,
      currentDbas: Math.round(currentDbas * 10) / 10,
      baselineDbas: Math.round(baselineDbas * 10) / 10,
      dbasChange: Math.round(dbasChange * 10) / 10,
      dbasChangePercent: Math.round(dbasChangePercent),
      isClinicallySigChange,
      beliefChanges,
      selfEfficacyTrend,
      arousalTrend,
      summaryRu,
      recommendations,
      overallProgress,
    };
  }

  /**
   * Get belief snapshot history
   */
  getSnapshotHistory(userId: string): IBeliefSnapshot[] {
    return this.snapshots.get(userId) ?? [];
  }

  /**
   * Get DBAS score trend
   */
  getDbasTrend(userId: string): {
    dates: string[];
    scores: number[];
    belowCutoff: boolean;
  } {
    const snapshots = this.snapshots.get(userId) ?? [];
    const latest = snapshots[snapshots.length - 1];

    return {
      dates: snapshots.map(s => s.date),
      scores: snapshots.map(s => s.dbasScore),
      belowCutoff: latest ? latest.dbasScore < this.config.dbasClinicalCutoff : false,
    };
  }

  /**
   * Get most problematic beliefs for a user
   */
  getMostProblematicBeliefs(userId: string): Array<{
    belief: TrackedBelief;
    nameRu: string;
    domain: BeliefDomain;
    frequency: number;
  }> {
    const snapshots = this.snapshots.get(userId) ?? [];
    if (snapshots.length === 0) return [];

    const recentSnapshots = snapshots.slice(-14);
    const beliefCounts: Record<string, number> = {};

    for (const snapshot of recentSnapshots) {
      for (const belief of snapshot.activeBeliefs) {
        beliefCounts[belief] = (beliefCounts[belief] ?? 0) + 1;
      }
    }

    return Object.entries(beliefCounts)
      .map(([belief, count]) => ({
        belief: belief as TrackedBelief,
        nameRu: BELIEF_NAMES_RU[belief as TrackedBelief],
        domain: BELIEF_TO_DOMAIN[belief as TrackedBelief],
        frequency: count / recentSnapshots.length,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Reset user data
   */
  resetUserData(userId: string): void {
    this.snapshots.delete(userId);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private avgField(snapshots: IBeliefSnapshot[], field: keyof IBeliefSnapshot): number {
    if (snapshots.length === 0) return 0;
    const values = snapshots.map(s => s[field] as number);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private analyzeBeliefChanges(
    baselineSnapshots: IBeliefSnapshot[],
    recentSnapshots: IBeliefSnapshot[]
  ): IBeliefChange[] {
    const allBeliefs: TrackedBelief[] = [
      'unrealisticExpectations', 'catastrophizing', 'helplessness',
      'effortfulSleep', 'healthWorries',
    ];

    const changes: IBeliefChange[] = [];

    for (const belief of allBeliefs) {
      const baselineFreq = baselineSnapshots.filter(
        s => s.activeBeliefs.includes(belief)
      ).length / Math.max(1, baselineSnapshots.length);

      const recentFreq = recentSnapshots.filter(
        s => s.activeBeliefs.includes(belief)
      ).length / Math.max(1, recentSnapshots.length);

      const wasActive = baselineFreq > 0.3;
      const isActive = recentFreq > 0.3;

      let direction: BeliefChangeDirection = 'unchanged';
      if (wasActive && !isActive) direction = 'improved';
      else if (!wasActive && isActive) direction = 'worsened';
      else if (recentFreq < baselineFreq - 0.2) direction = 'improved';
      else if (recentFreq > baselineFreq + 0.2) direction = 'worsened';

      if (wasActive || isActive) {
        changes.push({
          belief,
          nameRu: BELIEF_NAMES_RU[belief],
          direction,
          wasActive,
          isActive,
        });
      }
    }

    return changes;
  }

  private calculateFieldTrend(
    snapshots: IBeliefSnapshot[],
    field: 'sleepSelfEfficacy' | 'preSleepArousal',
    higherIsBetter: boolean
  ): 'improving' | 'stable' | 'declining' | 'worsening' {
    if (snapshots.length < this.config.minSnapshotsForTrend) return 'stable';

    const half = Math.floor(snapshots.length / 2);
    const firstHalf = snapshots.slice(0, half);
    const secondHalf = snapshots.slice(half);

    const avgFirst = this.avgField(firstHalf, field);
    const avgSecond = this.avgField(secondHalf, field);

    const change = avgSecond - avgFirst;
    const threshold = 0.1;

    if (higherIsBetter) {
      if (change > threshold) return 'improving';
      if (change < -threshold) return 'declining';
    } else {
      if (change < -threshold) return 'improving';
      if (change > threshold) return 'worsening';
    }
    return 'stable';
  }

  private assessOverallProgress(
    dbasChange: number,
    isClinicallySig: boolean,
    beliefChanges: IBeliefChange[],
    selfEfficacyTrend: string
  ): ICognitiveProgressReport['overallProgress'] {
    const improvedBeliefs = beliefChanges.filter(c => c.direction === 'improved').length;
    const worsenedBeliefs = beliefChanges.filter(c => c.direction === 'worsened').length;

    if (isClinicallySig && dbasChange < 0 && selfEfficacyTrend === 'improving') {
      return 'excellent';
    }
    if (dbasChange < -0.5 || (improvedBeliefs >= 2 && worsenedBeliefs === 0)) {
      return 'good';
    }
    if (dbasChange < 0 || improvedBeliefs > worsenedBeliefs) {
      return 'moderate';
    }
    if (Math.abs(dbasChange) < 0.3 && improvedBeliefs === worsenedBeliefs) {
      return 'minimal';
    }
    return 'none';
  }

  private generateSummary(
    currentDbas: number,
    dbasChange: number,
    isClinicallySig: boolean,
    beliefChanges: IBeliefChange[],
    overallProgress: ICognitiveProgressReport['overallProgress']
  ): string {
    const parts: string[] = [];

    // DBAS status
    const belowCutoff = currentDbas < this.config.dbasClinicalCutoff;
    if (belowCutoff) {
      parts.push('Ваши убеждения о сне находятся в нормальном диапазоне.');
    } else {
      parts.push(`Уровень дисфункциональных убеждений о сне: ${currentDbas.toFixed(1)} (порог: ${this.config.dbasClinicalCutoff}).`);
    }

    // Change description
    if (isClinicallySig) {
      if (dbasChange < 0) {
        parts.push('Отмечено клинически значимое улучшение когнитивных показателей.');
      } else {
        parts.push('Зафиксировано клинически значимое ухудшение — рекомендуется внимание к когнитивной работе.');
      }
    }

    // Belief changes
    const improved = beliefChanges.filter(c => c.direction === 'improved');
    const worsened = beliefChanges.filter(c => c.direction === 'worsened');

    if (improved.length > 0) {
      parts.push(`Улучшение: ${improved.map(c => c.nameRu.toLowerCase()).join(', ')}.`);
    }
    if (worsened.length > 0) {
      parts.push(`Требует внимания: ${worsened.map(c => c.nameRu.toLowerCase()).join(', ')}.`);
    }

    // Overall assessment
    const progressLabels: Record<string, string> = {
      excellent: 'Прогресс отличный.',
      good: 'Хороший прогресс.',
      moderate: 'Умеренный прогресс.',
      minimal: 'Минимальные изменения.',
      none: 'Пока без существенных изменений.',
    };
    parts.push(progressLabels[overallProgress]);

    return parts.join(' ');
  }

  private generateRecommendations(
    currentDbas: number,
    beliefChanges: IBeliefChange[],
    selfEfficacyTrend: string,
    arousalTrend: string
  ): string[] {
    const recommendations: string[] = [];

    // High DBAS
    if (currentDbas >= this.config.dbasClinicalCutoff) {
      recommendations.push(
        'Продолжайте работу с модулем когнитивной реструктуризации в терапии.'
      );
    }

    // Specific belief recommendations
    const activeWorsened = beliefChanges.filter(c => c.isActive && c.direction === 'worsened');
    for (const change of activeWorsened.slice(0, 2)) {
      switch (change.belief) {
        case 'catastrophizing':
          recommendations.push(
            'Попробуйте технику декатастрофизации: "Что самое худшее может случиться? Насколько это вероятно?"'
          );
          break;
        case 'helplessness':
          recommendations.push(
            'Запишите 3 вещи, которые вы контролируете в своём сне — это поможет снизить чувство беспомощности.'
          );
          break;
        case 'unrealisticExpectations':
          recommendations.push(
            'Нормальная потребность в сне варьируется от 6 до 9 часов. Не все нуждаются в 8.'
          );
          break;
        case 'effortfulSleep':
          recommendations.push(
            'Парадокс сна: чем больше вы стараетесь уснуть, тем сложнее это сделать. Попробуйте отпустить контроль.'
          );
          break;
        case 'healthWorries':
          recommendations.push(
            'Организм более устойчив к плохому сну, чем кажется. Одна ночь без сна не навредит здоровью.'
          );
          break;
      }
    }

    // Self-efficacy
    if (selfEfficacyTrend === 'declining') {
      recommendations.push(
        'Ваша уверенность в способности хорошо спать снижается. Отмечайте каждый маленький успех.'
      );
    }

    // Arousal
    if (arousalTrend === 'worsening') {
      recommendations.push(
        'Уровень возбуждения перед сном растёт. Рассмотрите техники релаксации или отстранённую осознанность.'
      );
    }

    // If nothing specific
    if (recommendations.length === 0) {
      recommendations.push(
        'Продолжайте текущую практику — ваши когнитивные показатели стабильны.'
      );
    }

    return recommendations.slice(0, 4);
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

/**
 * Create CognitiveProgressReportService instance
 */
export function createCognitiveProgressReportService(
  config?: Partial<ICognitiveProgressConfig>
): CognitiveProgressReportService {
  return new CognitiveProgressReportService(config);
}

/**
 * Singleton instance
 */
export const cognitiveProgressReportService = new CognitiveProgressReportService();
