/**
 * HyperarousalAwareSRT Tests
 * ==========================
 * Tests for Hyperarousal-Aware Sleep Restriction Therapy.
 */

import {
  HyperarousalAwareSRT,
  createHyperarousalAwareSRT,
  DEFAULT_HYPERAROUSAL_SRT_CONFIG,
  type ISRTScreeningResult,
} from '../HyperarousalAwareSRT';
import type { ISleepMetrics } from '../../../sleep/interfaces/ISleepState';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockSleepMetrics(overrides: Partial<ISleepMetrics> = {}): ISleepMetrics {
  return {
    totalSleepTime: 360, // 6 hours
    sleepEfficiency: 80,
    sleepOnsetLatency: 30,
    wakeAfterSleepOnset: 45,
    timeInBed: 450,
    bedtime: '23:00',
    wakeTime: '07:00',
    finalAwakening: '06:45',
    outOfBedTime: '07:00',
    numberOfAwakenings: 3,
    ...overrides,
  };
}

function createSleepHistory(
  count: number,
  avgTST: number = 360,
  avgSOL: number = 30
): ISleepMetrics[] {
  return Array.from({ length: count }, () =>
    createMockSleepMetrics({
      totalSleepTime: avgTST + Math.random() * 30 - 15, // ±15 min variance
      sleepOnsetLatency: avgSOL + Math.random() * 10 - 5,
    })
  );
}

// ============================================================================
// SCREENING TESTS
// ============================================================================

describe('HyperarousalAwareSRT', () => {
  let srt: HyperarousalAwareSRT;

  beforeEach(() => {
    srt = createHyperarousalAwareSRT();
  });

  describe('screenForEligibility', () => {
    it('should approve healthy patients without contraindications', () => {
      const result = srt.screenForEligibility({
        hasBipolar: false,
        hasEpilepsy: false,
        hasParasomnia: false,
        hasSleepApnea: false,
      });

      expect(result.eligible).toBe(true);
      expect(result.contraindications).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.minimumTIB).toBe(300); // 5 hours
    });

    it('should reject patients with epilepsy (absolute contraindication)', () => {
      const result = srt.screenForEligibility({
        hasEpilepsy: true,
      });

      expect(result.eligible).toBe(false);
      expect(result.contraindications).toContain('epilepsy');
    });

    it('should reject patients with parasomnia (absolute contraindication)', () => {
      const result = srt.screenForEligibility({
        hasParasomnia: true,
      });

      expect(result.eligible).toBe(false);
      expect(result.contraindications).toContain('parasomnia');
    });

    it('should reject patients with untreated sleep apnea', () => {
      const result = srt.screenForEligibility({
        hasSleepApnea: true,
        isSleepApneaTreated: false,
      });

      expect(result.eligible).toBe(false);
      expect(result.contraindications).toContain('untreated_sleep_apnea');
    });

    it('should allow treated sleep apnea', () => {
      const result = srt.screenForEligibility({
        hasSleepApnea: true,
        isSleepApneaTreated: true,
      });

      expect(result.eligible).toBe(true);
      expect(result.contraindications).not.toContain('untreated_sleep_apnea');
    });

    it('should approve bipolar with TIB ≥ 6.5h modification per Harvey CBT-iBD', () => {
      const result = srt.screenForEligibility({
        hasBipolar: true,
      });

      expect(result.eligible).toBe(true);
      expect(result.contraindications).toContain('bipolar_disorder');
      expect(result.minimumTIB).toBe(390); // 6.5 hours
      expect(result.modifications).toContainEqual(
        expect.objectContaining({
          type: 'minimum_tib',
          value: 390,
          source: expect.stringContaining('Harvey'),
        })
      );
    });

    it('should flag safety-critical occupations', () => {
      const result = srt.screenForEligibility(
        { hasBipolar: false },
        { isSafetyCritical: true, involvesDriving: true, involvesHeavyMachinery: false }
      );

      expect(result.eligible).toBe(true);
      expect(result.contraindications).toContain('safety_critical_occupation');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should add conservative adjustment for fall risk', () => {
      const result = srt.screenForEligibility({
        hasFallRisk: true,
      });

      expect(result.eligible).toBe(true);
      expect(result.modifications).toContainEqual(
        expect.objectContaining({
          type: 'adjustment_step',
          value: DEFAULT_HYPERAROUSAL_SRT_CONFIG.conservativeAdjustmentStep,
        })
      );
    });

    it('should have high confidence with complete screening', () => {
      const result = srt.screenForEligibility({
        hasBipolar: false,
        hasEpilepsy: false,
        hasParasomnia: false,
        hasSleepApnea: false,
        hasFallRisk: false,
        hasSevereCondition: false,
      });

      expect(result.confidence).toBe('high');
    });

    it('should have low confidence with minimal screening', () => {
      const result = srt.screenForEligibility({});

      expect(result.confidence).toBe('low');
    });
  });

  // ==========================================================================
  // HYPERAROUSAL PROFILING TESTS
  // ==========================================================================

  describe('createHyperarousalProfile', () => {
    it('should detect ISSD phenotype for TST < 6 hours', () => {
      const sleepHistory = createSleepHistory(7, 300); // 5 hours avg

      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      expect(profile.phenotype).toBe('ISSD');
      expect(profile.averageTST).toBeLessThan(360);
    });

    it('should detect INSD phenotype for TST ≥ 6 hours', () => {
      const sleepHistory = createSleepHistory(7, 420); // 7 hours avg

      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      expect(profile.phenotype).toBe('INSD');
      expect(profile.averageTST).toBeGreaterThanOrEqual(360);
    });

    it('should use PSAS scores when provided', () => {
      // cognitive=32, somatic=14 → normalized: 32/20=1.6 vs 14/14=1.0, diff=0.6>0.2 → cognitive
      const psasScores = { cognitive: 32, somatic: 14 };

      const profile = srt.createHyperarousalProfile(psasScores);

      expect(profile.cognitiveScore).toBe(32);
      expect(profile.somaticScore).toBe(14);
      expect(profile.dominantType).toBe('cognitive');
    });

    it('should classify high arousal correctly', () => {
      const psasScores = { cognitive: 32, somatic: 28 }; // Total = 60

      const profile = srt.createHyperarousalProfile(psasScores);

      expect(profile.level).toBe('very_high');
      expect(profile.recommendation).toBe('conservative');
    });

    it('should classify moderate arousal correctly', () => {
      const psasScores = { cognitive: 20, somatic: 16 }; // Total = 36

      const profile = srt.createHyperarousalProfile(psasScores);

      expect(profile.level).toBe('moderate');
    });

    it('should classify low arousal correctly', () => {
      const psasScores = { cognitive: 12, somatic: 10 }; // Total = 22

      const profile = srt.createHyperarousalProfile(psasScores);

      expect(profile.level).toBe('low');
      expect(profile.recommendation).toBe('standard');
    });

    it('should incorporate HRV data', () => {
      const hrvData = { rmssd: 20, avgHR: 72 }; // Low RMSSD = high arousal

      const profile = srt.createHyperarousalProfile(undefined, undefined, hrvData);

      expect(profile.hrvEstimate).toBeDefined();
      expect(profile.hrvEstimate!.rmssd).toBe(20);
      expect(profile.hrvEstimate!.normalizedArousal).toBeGreaterThan(0.5);
    });

    it('should adjust arousal level based on HRV discrepancy', () => {
      const psasScores = { cognitive: 12, somatic: 10 }; // Low PSAS
      const hrvData = { rmssd: 15, avgHR: 78 }; // Low RMSSD = high sympathetic

      const profile = srt.createHyperarousalProfile(psasScores, undefined, hrvData);

      // HRV should bump the level up
      expect(profile.level).toBe('moderate');
    });

    it('should estimate arousal from sleep metrics when PSAS unavailable', () => {
      // High SOL = likely cognitive arousal
      const sleepHistory = createSleepHistory(7, 360, 60); // 60 min SOL

      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      expect(profile.cognitiveScore).toBeGreaterThan(16);
    });

    it('should recommend conservative approach for ISSD + high arousal', () => {
      const psasScores = { cognitive: 26, somatic: 20 };
      const sleepHistory = createSleepHistory(7, 300); // ISSD

      const profile = srt.createHyperarousalProfile(psasScores, sleepHistory);

      expect(profile.phenotype).toBe('ISSD');
      expect(profile.level).toBe('high');
      expect(profile.recommendation).toBe('conservative');
    });
  });

  // ==========================================================================
  // PRESCRIPTION TESTS
  // ==========================================================================

  describe('calculateInitialWindow', () => {
    it('should throw error for ineligible patients', () => {
      const sleepHistory = createSleepHistory(7);
      const screening: ISRTScreeningResult = {
        eligible: false,
        contraindications: ['epilepsy'],
        modifications: [],
        warnings: [],
        minimumTIB: 300,
        confidence: 'high',
      };
      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      expect(() => {
        srt.calculateInitialWindow(sleepHistory, '07:00', screening, profile);
      }).toThrow('not eligible');
    });

    it('should apply bipolar minimum TIB', () => {
      const sleepHistory = createSleepHistory(7, 300); // 5 hours TST
      const screening = srt.screenForEligibility({ hasBipolar: true });
      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      expect(prescription.prescribedTIB).toBeGreaterThanOrEqual(390);
      expect(prescription.minimumTIB).toBe(390);
    });

    it('should add complementary therapies for high arousal', () => {
      const sleepHistory = createSleepHistory(7);
      const psasScores = { cognitive: 30, somatic: 18 };
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(psasScores, sleepHistory);

      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      expect(prescription.complementaryTherapies).toContain('mbti');
    });

    it('should add somatic therapies for somatic arousal', () => {
      const sleepHistory = createSleepHistory(7);
      // cognitive=12, somatic=35 → total=47 (high), somNorm=2.5 > cogNorm=0.6 → somatic dominant
      const psasScores = { cognitive: 12, somatic: 35 };
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(psasScores, sleepHistory);

      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      expect(prescription.complementaryTherapies).toContain('relaxation_pmr');
    });

    it('should include ISSD warnings for short sleep phenotype', () => {
      const sleepHistory = createSleepHistory(7, 280); // Very short
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      expect(prescription.safetyWarnings.some(w => w.includes('ISSD'))).toBe(true);
    });

    it('should use conservative adjustment step for very high arousal', () => {
      const sleepHistory = createSleepHistory(7);
      const psasScores = { cognitive: 35, somatic: 30 }; // Very high
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(psasScores, sleepHistory);

      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      expect(prescription.adjustmentIncrement).toBe(
        DEFAULT_HYPERAROUSAL_SRT_CONFIG.conservativeAdjustmentStep
      );
    });

    it('should include hyperarousal profile in prescription', () => {
      const sleepHistory = createSleepHistory(7);
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);

      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      expect(prescription.hyperarousalProfile).toBeDefined();
      expect(prescription.hyperarousalProfile!.phenotype).toBe(profile.phenotype);
    });
  });

  // ==========================================================================
  // ADJUSTMENT TESTS
  // ==========================================================================

  describe('evaluateAndAdjust', () => {
    it('should respect minimum TIB during adjustments', () => {
      const sleepHistory = createSleepHistory(7, 360);
      const screening = srt.screenForEligibility({ hasBipolar: true });
      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);
      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      // Low efficiency metrics that would normally trigger TIB decrease
      const lowEfficiencyMetrics = createSleepHistory(7, 360).map(m => ({
        ...m,
        sleepEfficiency: 70, // Below 85% threshold
      }));

      const adjusted = srt.evaluateAndAdjust(prescription, lowEfficiencyMetrics);

      expect(adjusted.prescribedTIB).toBeGreaterThanOrEqual(390); // Bipolar minimum
    });

    it('should limit TIB decrease for very high arousal', () => {
      const sleepHistory = createSleepHistory(7, 400);
      const psasScores = { cognitive: 35, somatic: 28 }; // Very high
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(psasScores, sleepHistory);
      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      const lowEfficiencyMetrics = createSleepHistory(7, 360).map(m => ({
        ...m,
        sleepEfficiency: 65, // Very low
      }));

      const adjusted = srt.evaluateAndAdjust(prescription, lowEfficiencyMetrics);

      // Should not decrease more than adjustment step
      const maxDecrease = prescription.adjustmentIncrement;
      expect(prescription.prescribedTIB - adjusted.prescribedTIB).toBeLessThanOrEqual(
        maxDecrease
      );
    });

    it('should increment week counter', () => {
      const sleepHistory = createSleepHistory(7);
      const screening = srt.screenForEligibility({});
      const profile = srt.createHyperarousalProfile(undefined, sleepHistory);
      const prescription = srt.calculateInitialWindow(
        sleepHistory,
        '07:00',
        screening,
        profile
      );

      const adjusted = srt.evaluateAndAdjust(prescription, sleepHistory);

      expect(adjusted.currentWeek).toBe(prescription.currentWeek + 1);
    });
  });

  // ==========================================================================
  // PHENOTYPE RECOMMENDATIONS TESTS
  // ==========================================================================

  describe('getPhenotypeRecommendations', () => {
    it('should recommend biological support for ISSD', () => {
      const recs = srt.getPhenotypeRecommendations('ISSD');

      expect(recs.primaryApproach).toContain('biological');
      expect(recs.warnings.some(w => w.includes('HPA'))).toBe(true);
    });

    it('should recommend cognitive focus for INSD', () => {
      const recs = srt.getPhenotypeRecommendations('INSD');

      expect(recs.complementaryInterventions).toContain('MBT-I (Mindfulness-Based Therapy for Insomnia)');
      expect(recs.expectedResponse).toContain('Good');
    });

    it('should request more data for unknown phenotype', () => {
      const recs = srt.getPhenotypeRecommendations('unknown');

      expect(recs.warnings.some(w => w.includes('Insufficient'))).toBe(true);
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('configuration', () => {
    it('should use default config', () => {
      const config = srt.getConfig();

      expect(config.issdThresholdMinutes).toBe(360);
      expect(config.bipolarMinimumTIB).toBe(390);
    });

    it('should accept custom config', () => {
      const customSrt = createHyperarousalAwareSRT({
        issdThresholdMinutes: 330, // 5.5 hours
        bipolarMinimumTIB: 420, // 7 hours
      });

      const config = customSrt.getConfig();

      expect(config.issdThresholdMinutes).toBe(330);
      expect(config.bipolarMinimumTIB).toBe(420);
    });
  });
});
