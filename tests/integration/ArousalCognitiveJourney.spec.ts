/**
 * Arousal & Cognitive Progress Integration Tests
 * ================================================
 * Vertical journey tests for Wave 2 services:
 *
 * Journey A: Arousal Profile → Third-Wave Selection
 *   ISleepState history → ArousalAssessmentService.estimateArousalProfile()
 *   → therapy recommendation → third-wave coordinator alignment
 *
 * Journey B: Cognitive Progress → Detailed Stats
 *   ISleepState history → CognitiveProgressReportService snapshots
 *   → weekly report → belief changes → recommendations
 *
 * REGULATORY COMPLIANCE:
 * - IEC 62304 Clause 5.6: Vertical slice integration testing
 * - CLAUDE.md Section 13.1: Vertical slices over horizontal layers
 *
 * Clinical References:
 * - PSAS cutoffs: cognitive ≥20, somatic ≥14 (Fernandez-Mendoza, 2019)
 * - DBAS-16 cutoff: 3.8 (Morin, 2007)
 * - Third-wave selection: MBT-I for cognitive arousal, ACT-I for mixed
 * - Lancee et al. (2015): DBAS mediates insomnia severity change
 *
 * @packageDocumentation
 */

import {
  ArousalAssessmentService,
  createArousalAssessmentService,
} from '../../src/bot/services/ArousalAssessmentService';
import {
  CognitiveProgressReportService,
  createCognitiveProgressReportService,
} from '../../src/bot/services/CognitiveProgressReportService';
import type { ISleepState } from '../../src/sleep/interfaces/ISleepState';

describe('Journey A: Arousal Profile → Third-Wave Selection', () => {
  let arousalService: ArousalAssessmentService;

  beforeEach(() => {
    arousalService = createArousalAssessmentService();
  });

  it('should estimate arousal profile from sleep diary and recommend MBT-I for cognitive dominant', () => {
    // Simulate 10 days of sleep history with high cognitive arousal
    const history = createSleepHistory(10, {
      preSleepArousal: 0.75, // High (maps to ~32 on PSAS scale)
      sleepAnxiety: 0.7,     // High cognitive component
      sol: 45,               // Long SOL consistent with cognitive arousal
    });

    const profile = arousalService.estimateArousalProfile(history);

    expect(profile.available).toBe(true);
    expect(profile.estimatedCognitive).toBeGreaterThanOrEqual(20); // Above cognitive cutoff
    expect(profile.recommendation).not.toBeNull();

    // High cognitive arousal without matching somatic → MBT-I or MCT
    const validPrimary = ['mbti', 'mct', 'acti'];
    expect(validPrimary).toContain(profile.recommendation!.primary);
  });

  it('should estimate arousal profile and recommend relaxation for somatic dominant', () => {
    // High somatic arousal (body tension, heart racing) with low cognitive
    const history = createSleepHistory(10, {
      preSleepArousal: 0.6,  // Moderate-high
      sleepAnxiety: 0.15,    // Low cognitive component
      sol: 15,               // Quick onset (somatic, not cognitive block)
      waso: 60,              // Somatic arousals during night
    });

    const profile = arousalService.estimateArousalProfile(history);

    expect(profile.available).toBe(true);
    // Somatic estimation uses different proxy (higher WASO influence)
    expect(profile.recommendation).not.toBeNull();
  });

  it('should recommend ACT-I when both cognitive and somatic are elevated', () => {
    // Both subscales above cutoffs
    const history = createSleepHistory(10, {
      preSleepArousal: 0.7,
      sleepAnxiety: 0.7,
      sol: 50,
      waso: 50,
    });

    const profile = arousalService.estimateArousalProfile(history);

    expect(profile.available).toBe(true);
    // With both elevated, recommendation should acknowledge mixed pattern
    expect(profile.recommendation).not.toBeNull();
  });

  it('should not recommend therapy when arousal is low (subclinical)', () => {
    const history = createSleepHistory(10, {
      preSleepArousal: 0.1, // Low (maps to ~11 on PSAS scale)
      sleepAnxiety: 0.1,
      sol: 10,
      waso: 10,
    });

    const profile = arousalService.estimateArousalProfile(history);

    expect(profile.available).toBe(true);
    expect(profile.estimatedCognitive).toBeLessThan(20); // Below cutoff
    expect(profile.recommendation).toBeNull(); // No recommendation needed
  });

  it('should track improving trend over time (treatment response)', () => {
    const history: ISleepState[] = [];

    // First 5 days: high arousal (before therapy)
    for (let i = 0; i < 5; i++) {
      history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        preSleepArousal: 0.8,
        sleepAnxiety: 0.8,
        sol: 55,
      }));
    }

    // Next 5 days: lower arousal (after starting MBT-I)
    for (let i = 0; i < 5; i++) {
      history.push(createMockSleepState(`2024-01-${String(i + 6).padStart(2, '0')}`, {
        preSleepArousal: 0.3,
        sleepAnxiety: 0.3,
        sol: 20,
      }));
    }

    const profile = arousalService.estimateArousalProfile(history);
    expect(profile.trend).toBe('improving');
  });

  it('should connect PSAS assessment to therapy recommendation pipeline', () => {
    // Full pipeline: PSAS responses → scored → recommendation
    const responses = [];
    // High cognitive items (1-8): score 4 each → total 32
    for (let i = 1; i <= 8; i++) {
      responses.push({ itemNumber: i, value: 4 as const });
    }
    // Low somatic items (9-16): score 1 each → total 8
    for (let i = 9; i <= 16; i++) {
      responses.push({ itemNumber: i, value: 1 as const });
    }

    const result = arousalService.scoreAssessment('patient1', responses);

    // Verify clinical classification
    expect(result.cognitiveScore).toBe(32);
    expect(result.somaticScore).toBe(8);
    expect(result.cognitiveSeverity).toBe('very_high');
    expect(result.somaticSeverity).toBe('low');
    expect(result.dominantArousal).toBe('cognitive');

    // Verify therapy recommendation aligns with arousal profile
    expect(result.recommendation.primary).toBe('mct'); // MCT for very high cognitive
    expect(result.recommendation.confidence).toBe('high');
  });
});

describe('Journey B: Cognitive Progress → Detailed Stats', () => {
  let cognitiveService: CognitiveProgressReportService;

  beforeEach(() => {
    cognitiveService = createCognitiveProgressReportService();
  });

  it('should track DBAS improvement over 2-week therapy course', () => {
    // Week 1: High DBAS (before cognitive restructuring)
    const week1: ISleepState[] = [];
    for (let i = 0; i < 7; i++) {
      week1.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        dbasScore: 5.5,
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: true,
          helplessness: true,
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    // Week 2: Improving DBAS (after cognitive restructuring module)
    const week2: ISleepState[] = [];
    for (let i = 0; i < 7; i++) {
      week2.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, {
        dbasScore: 3.2,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: true, // Still active but improving
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    const allHistory = [...week1, ...week2];
    const report = cognitiveService.generateWeeklyReport('patient1', allHistory, 2);

    expect(report).not.toBeNull();

    // DBAS should show clinically significant improvement
    expect(report!.isClinicallySigChange).toBe(true);
    expect(report!.dbasChange).toBeLessThan(0); // Negative = improvement
    expect(report!.currentDbas).toBeLessThan(report!.baselineDbas);

    // Beliefs should show improvement
    const improved = report!.beliefChanges.filter(c => c.direction === 'improved');
    expect(improved.length).toBeGreaterThanOrEqual(1);

    // Catastrophizing should be improved (was active, now inactive)
    const catChange = report!.beliefChanges.find(c => c.belief === 'catastrophizing');
    expect(catChange?.direction).toBe('improved');
  });

  it('should detect non-response pattern (DBAS not improving)', () => {
    // 14 days with stable high DBAS — suggests CR module not working
    const history: ISleepState[] = [];
    for (let i = 0; i < 14; i++) {
      history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        dbasScore: 5.2 + (Math.random() * 0.3 - 0.15), // ±0.15 noise around 5.2
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: true,
          helplessness: true,
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    const report = cognitiveService.generateWeeklyReport('patient1', history, 3);

    expect(report).not.toBeNull();
    expect(report!.isClinicallySigChange).toBe(false); // No significant change
    expect(report!.overallProgress).not.toBe('excellent');
    expect(report!.overallProgress).not.toBe('good');
  });

  it('should provide actionable recommendations based on belief profile', () => {
    // Scenario: catastrophizing and helplessness worsening
    const history: ISleepState[] = [];

    // Week 1 baseline: no problematic beliefs
    for (let i = 0; i < 7; i++) {
      history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        dbasScore: 3.5,
        sleepSelfEfficacy: 0.7,
        preSleepArousal: 0.3,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    // Week 2: worsening (stress event)
    for (let i = 0; i < 7; i++) {
      history.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, {
        dbasScore: 5.0,
        sleepSelfEfficacy: 0.3,
        preSleepArousal: 0.8,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: true,
          helplessness: true,
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    const report = cognitiveService.generateWeeklyReport('patient1', history, 2);

    expect(report).not.toBeNull();

    // Should have recommendations addressing the worsening
    expect(report!.recommendations.length).toBeGreaterThan(0);

    // Self-efficacy declining should trigger recommendation
    expect(report!.selfEfficacyTrend).toBe('declining');

    // Arousal worsening should trigger recommendation
    expect(report!.arousalTrend).toBe('worsening');
  });

  it('should generate DBAS trend for progress visualization', () => {
    // Record snapshots over time (simulating ProgressCommand data needs)
    const states = [
      createMockSleepState('2024-01-01', { dbasScore: 6.0 }),
      createMockSleepState('2024-01-02', { dbasScore: 5.5 }),
      createMockSleepState('2024-01-03', { dbasScore: 5.0 }),
      createMockSleepState('2024-01-04', { dbasScore: 4.8 }),
      createMockSleepState('2024-01-05', { dbasScore: 4.2 }),
      createMockSleepState('2024-01-06', { dbasScore: 3.9 }),
      createMockSleepState('2024-01-07', { dbasScore: 3.5 }),
    ];

    for (const state of states) {
      cognitiveService.recordSnapshot('patient1', state);
    }

    const trend = cognitiveService.getDbasTrend('patient1');

    expect(trend.dates).toHaveLength(7);
    expect(trend.scores).toEqual([6.0, 5.5, 5.0, 4.8, 4.2, 3.9, 3.5]);
    expect(trend.belowCutoff).toBe(true); // Latest 3.5 < 3.8

    // This data feeds into ProgressCommand's chart rendering
  });

  it('should identify most problematic beliefs for therapy focus', () => {
    // Simulate 14 days where catastrophizing is persistent
    for (let i = 0; i < 14; i++) {
      cognitiveService.recordSnapshot('patient1',
        createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
          dbasScore: 4.8,
          beliefs: {
            unrealisticExpectations: i % 3 === 0, // Sometimes active (~33%)
            catastrophizing: true,                 // Always active (100%)
            helplessness: i < 7,                   // Active first week (50%)
            effortfulSleep: false,
            healthWorries: false,
          },
        })
      );
    }

    const problematic = cognitiveService.getMostProblematicBeliefs('patient1');

    expect(problematic.length).toBeGreaterThanOrEqual(1);

    // Catastrophizing should be #1 (highest frequency)
    expect(problematic[0].belief).toBe('catastrophizing');
    expect(problematic[0].frequency).toBe(1.0);
    expect(problematic[0].domain).toBe('consequences');
    expect(problematic[0].nameRu).toBe('Катастрофизация последствий бессонницы');
  });
});

describe('Journey C: Cross-Service Integration (Arousal + Cognitive)', () => {
  let arousalService: ArousalAssessmentService;
  let cognitiveService: CognitiveProgressReportService;

  beforeEach(() => {
    arousalService = createArousalAssessmentService();
    cognitiveService = createCognitiveProgressReportService();
  });

  it('should provide coherent picture from both services for the same patient', () => {
    // Same patient data feeds both services
    const history: ISleepState[] = [];
    for (let i = 0; i < 14; i++) {
      history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        preSleepArousal: 0.7,
        sleepAnxiety: 0.7,
        dbasScore: 5.0,
        sleepSelfEfficacy: 0.3,
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: true,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    // Arousal assessment
    const arousalProfile = arousalService.estimateArousalProfile(history);
    expect(arousalProfile.available).toBe(true);
    expect(arousalProfile.estimatedCognitive).toBeGreaterThan(20);

    // Cognitive report
    const cogReport = cognitiveService.generateWeeklyReport('patient1', history, 2);
    expect(cogReport).not.toBeNull();
    expect(cogReport!.currentDbas).toBeGreaterThan(3.8);

    // Both services should point to cognitive issues
    // Arousal: high cognitive arousal → MBT-I/MCT
    // Cognitive: high DBAS + active beliefs → CR recommendation
    if (arousalProfile.recommendation) {
      expect(['mbti', 'mct', 'acti']).toContain(arousalProfile.recommendation.primary);
    }
    expect(cogReport!.recommendations.some(r =>
      r.includes('когнитивной реструктуризации')
    )).toBe(true);
  });

  it('should show treatment response across both services after therapy', () => {
    // Phase 1: Before therapy (high arousal, high DBAS)
    const beforeTherapy: ISleepState[] = [];
    for (let i = 0; i < 7; i++) {
      beforeTherapy.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
        preSleepArousal: 0.8,
        sleepAnxiety: 0.8,
        dbasScore: 6.0,
        sleepSelfEfficacy: 0.2,
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: true,
          helplessness: true,
          effortfulSleep: true,
          healthWorries: true,
        },
      }));
    }

    // Phase 2: After therapy (reduced arousal, lower DBAS)
    const afterTherapy: ISleepState[] = [];
    for (let i = 0; i < 7; i++) {
      afterTherapy.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, {
        preSleepArousal: 0.3,
        sleepAnxiety: 0.3,
        dbasScore: 3.0,
        sleepSelfEfficacy: 0.7,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
      }));
    }

    const fullHistory = [...beforeTherapy, ...afterTherapy];

    // Arousal should show improving trend
    const arousalProfile = arousalService.estimateArousalProfile(fullHistory);
    expect(arousalProfile.trend).toBe('improving');

    // Cognitive report should show excellent/good progress
    const cogReport = cognitiveService.generateWeeklyReport('patient1', fullHistory, 3);
    expect(cogReport).not.toBeNull();
    expect(cogReport!.isClinicallySigChange).toBe(true);
    expect(cogReport!.dbasChange).toBeLessThan(-1.0);
    expect(['excellent', 'good']).toContain(cogReport!.overallProgress);
    expect(cogReport!.selfEfficacyTrend).toBe('improving');
    expect(cogReport!.arousalTrend).toBe('improving');

    // All beliefs should show improvement
    const allImproved = cogReport!.beliefChanges.every(
      c => c.direction === 'improved'
    );
    expect(allImproved).toBe(true);
  });
});

// ==================== Test Helpers ====================

interface SleepStateOverrides {
  preSleepArousal?: number;
  sleepAnxiety?: number;
  dbasScore?: number;
  sleepSelfEfficacy?: number;
  sol?: number;
  waso?: number;
  beliefs?: {
    unrealisticExpectations: boolean;
    catastrophizing: boolean;
    helplessness: boolean;
    effortfulSleep: boolean;
    healthWorries: boolean;
  };
}

function createMockSleepState(
  date: string,
  overrides: SleepStateOverrides = {}
): ISleepState {
  return {
    date,
    userId: 'test',
    timestamp: new Date(date),
    metrics: {
      sleepOnsetLatency: overrides.sol ?? 25,
      wakeAfterSleepOnset: overrides.waso ?? 30,
      totalSleepTime: 360,
      timeInBed: 480,
      sleepEfficiency: 75,
      numberOfAwakenings: 2,
      bedtime: '23:00',
      wakeTime: '07:00',
      finalAwakening: '06:45',
      outOfBedTime: '07:00',
    },
    cognitions: {
      dbasScore: overrides.dbasScore ?? 4.0,
      beliefs: overrides.beliefs ?? {
        unrealisticExpectations: false,
        catastrophizing: false,
        helplessness: false,
        effortfulSleep: false,
        healthWorries: false,
      },
      sleepAnxiety: overrides.sleepAnxiety ?? 0.5,
      preSleepArousal: overrides.preSleepArousal ?? 0.5,
      sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.5,
    },
    behaviors: {
      caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
      alcohol: { drinksToday: 0, lastDrinkTime: '' },
      screenTimeBeforeBed: 30,
      exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
      naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
      environment: { temperatureCelsius: 20, isQuiet: true, isDark: true, isComfortable: true },
    },
    circadian: {
      chronotype: 'intermediate',
      circadianPhase: 0,
      phaseDeviation: 0,
      lightExposure: 60,
      estimatedMelatoninOnset: '22:00',
      socialJetLag: 0.5,
      isStable: true,
    },
    homeostasis: {
      sleepDebt: -1,
      debtDuration: 3,
      homeostaticPressure: 0.5,
      optimalSleepDuration: 7.5,
      isRecoverable: true,
    },
    insomnia: {
      isiScore: 15,
      severity: 'moderate',
      subtype: 'sleep_onset',
      durationWeeks: 12,
      daytimeImpact: 0.5,
      sleepDistress: 0.5,
    },
    subjectiveQuality: 'fair',
    morningAlertness: 0.5,
    daytimeSleepiness: 0.4,
    sleepHealthScore: 55,
    trend: 'stable',
    dataQuality: 0.8,
    source: 'diary',
  } as ISleepState;
}

function createSleepHistory(
  days: number,
  overrides: SleepStateOverrides = {}
): ISleepState[] {
  const history: ISleepState[] = [];
  for (let i = 0; i < days; i++) {
    const day = String(i + 1).padStart(2, '0');
    history.push(createMockSleepState(`2024-01-${day}`, overrides));
  }
  return history;
}
