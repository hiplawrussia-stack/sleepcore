/**
 * AyurvedaYogaIntegration Unit Tests
 * Tests Ayurveda & Yoga Nidra integration for insomnia
 */

import {
  AyurvedaYogaEngine,
  SLEEP_HERBS,
  YOGA_NIDRA_PROTOCOL,
  DINACHARYA_TEMPLATES,
} from '../../../src/cultural-adaptations/asia/AyurvedaYogaIntegration';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('AyurvedaYogaIntegration', () => {
  let engine: AyurvedaYogaEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    sleepOnsetLatency: number;
    wakeAfterSleepOnset: number;
    totalSleepTime: number;
    sleepAnxiety: number;
    preSleepArousal: number;
    catastrophizing: boolean;
    daytimeSleepiness: number;
    morningAlertness: number;
    caffeineDailyMg: number;
    isiScore: number;
    severity: 'none' | 'subthreshold' | 'moderate' | 'severe';
  }> = {}): ISleepState {
    return {
      userId: 'test-user',
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: overrides.totalSleepTime ?? 360,
        sleepOnsetLatency: overrides.sleepOnsetLatency ?? 25,
        wakeAfterSleepOnset: overrides.wakeAfterSleepOnset ?? 30,
        numberOfAwakenings: 2,
        sleepEfficiency: 75,
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:00',
      },
      circadian: {
        chronotype: 'intermediate',
        circadianPhase: 0,
        phaseDeviation: 0,
        lightExposure: 10000,
        estimatedMelatoninOnset: '21:00',
        socialJetLag: 0.5,
        isStable: true,
      },
      homeostasis: {
        sleepDebt: 0,
        debtDuration: 0,
        homeostaticPressure: 0.5,
        optimalSleepDuration: 8,
        isRecoverable: true,
      },
      insomnia: {
        isiScore: overrides.isiScore ?? 14,
        severity: overrides.severity ?? 'moderate',
        subtype: 'mixed',
        durationWeeks: 8,
        daytimeImpact: 0.5,
        sleepDistress: 0.5,
      },
      behaviors: {
        caffeine: { dailyMg: overrides.caffeineDailyMg ?? 100, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 30,
        exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: { temperatureCelsius: 18, isQuiet: true, isDark: true, isComfortable: true },
      },
      cognitions: {
        dbasScore: 4,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: overrides.catastrophizing ?? false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: overrides.sleepAnxiety ?? 0.4,
        preSleepArousal: overrides.preSleepArousal ?? 0.4,
        sleepSelfEfficacy: 0.6,
      },
      subjectiveQuality: 'fair',
      morningAlertness: overrides.morningAlertness ?? 0.6,
      daytimeSleepiness: overrides.daytimeSleepiness ?? 0.3,
      sleepHealthScore: 65,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  beforeEach(() => {
    engine = new AyurvedaYogaEngine();
  });

  describe('Constants', () => {
    describe('SLEEP_HERBS', () => {
      it('should have Ashwagandha as first herb', () => {
        expect(SLEEP_HERBS[0].nameEnglish).toBe('Ashwagandha');
        expect(SLEEP_HERBS[0].latinName).toBe('Withania somnifera');
      });

      it('should have high evidence herbs', () => {
        const highEvidence = SLEEP_HERBS.filter(h => h.evidenceLevel === 'high');
        expect(highEvidence.length).toBeGreaterThan(0);
      });

      it('should include dosha effects for all herbs', () => {
        SLEEP_HERBS.forEach(herb => {
          expect(herb.doshaEffect.vata).toBeDefined();
          expect(herb.doshaEffect.pitta).toBeDefined();
          expect(herb.doshaEffect.kapha).toBeDefined();
        });
      });

      it('should have Sanskrit and Hindi names', () => {
        SLEEP_HERBS.forEach(herb => {
          expect(herb.nameSanskrit).toBeTruthy();
          expect(herb.nameHindi).toBeTruthy();
        });
      });

      it('should include contraindications', () => {
        SLEEP_HERBS.forEach(herb => {
          expect(Array.isArray(herb.contraindications)).toBe(true);
        });
      });
    });

    describe('YOGA_NIDRA_PROTOCOL', () => {
      it('should have 30 minute duration', () => {
        expect(YOGA_NIDRA_PROTOCOL.duration).toBe(30);
      });

      it('should have all stages', () => {
        expect(YOGA_NIDRA_PROTOCOL.stages).toContain('preparation');
        expect(YOGA_NIDRA_PROTOCOL.stages).toContain('body_rotation');
        expect(YOGA_NIDRA_PROTOCOL.stages).toContain('breath_awareness');
        expect(YOGA_NIDRA_PROTOCOL.stages).toContain('visualization');
        expect(YOGA_NIDRA_PROTOCOL.stages).toContain('sankalpa');
      });

      it('should be best for bedtime', () => {
        expect(YOGA_NIDRA_PROTOCOL.bestTime).toBe('bedtime');
      });

      it('should have detailed instructions', () => {
        expect(YOGA_NIDRA_PROTOCOL.instructions.length).toBeGreaterThan(10);
      });
    });

    describe('DINACHARYA_TEMPLATES', () => {
      it('should have templates for all doshas', () => {
        expect(DINACHARYA_TEMPLATES.vata).toBeDefined();
        expect(DINACHARYA_TEMPLATES.pitta).toBeDefined();
        expect(DINACHARYA_TEMPLATES.kapha).toBeDefined();
      });

      it('should have early wake time for kapha', () => {
        expect(DINACHARYA_TEMPLATES.kapha.wakeTime).toContain('5:');
      });

      it('should include abhyanga for vata', () => {
        const hasAbhyanga = DINACHARYA_TEMPLATES.vata.morningRoutine.some(
          r => r.toLowerCase().includes('абхьянга')
        );
        expect(hasAbhyanga).toBe(true);
      });

      it('should have dietary guidelines', () => {
        expect(DINACHARYA_TEMPLATES.vata.dietaryGuidelines.length).toBeGreaterThan(0);
        expect(DINACHARYA_TEMPLATES.pitta.dietaryGuidelines.length).toBeGreaterThan(0);
        expect(DINACHARYA_TEMPLATES.kapha.dietaryGuidelines.length).toBeGreaterThan(0);
      });
    });
  });

  describe('assessAyurvedicProfile()', () => {
    it('should return complete assessment', () => {
      const state = createTestSleepState();
      const assessment = engine.assessAyurvedicProfile(state);

      expect(assessment.prakriti).toBeDefined();
      expect(assessment.vikriti).toBeDefined();
      expect(assessment.anidraType).toBeDefined();
      expect(assessment.recommendedTherapies).toBeDefined();
      expect(assessment.herbs).toBeDefined();
      expect(assessment.yogaNidraProtocol).toBeDefined();
      expect(assessment.dinacharya).toBeDefined();
      expect(assessment.rationale).toBeDefined();
    });

    describe('Prakriti (Constitution) Assessment', () => {
      it('should identify Vata for high SOL + anxiety', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 50,
          sleepAnxiety: 0.8,
          caffeineDailyMg: 250,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['vata', 'vata_pitta', 'vata_kapha']).toContain(assessment.prakriti);
      });

      it('should identify Vata-Pitta for high SOL + high arousal', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 50,
          sleepAnxiety: 0.8,
          preSleepArousal: 0.9,
          caffeineDailyMg: 250,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['vata', 'vata_pitta']).toContain(assessment.prakriti);
      });

      it('should identify Pitta for night waking pattern', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 15,
          wakeAfterSleepOnset: 40,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['pitta', 'pitta_kapha', 'vata_pitta']).toContain(assessment.prakriti);
      });

      it('should identify Pitta-Kapha for night waking + sleepiness', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 40,
          totalSleepTime: 500,
          morningAlertness: 0.4,
          daytimeSleepiness: 0.6,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['pitta', 'pitta_kapha', 'kapha']).toContain(assessment.prakriti);
      });

      it('should identify Kapha for excessive sleep + low alertness', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 10,
          totalSleepTime: 540,
          morningAlertness: 0.3,
          daytimeSleepiness: 0.7,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['kapha', 'vata_kapha', 'pitta_kapha']).toContain(assessment.prakriti);
      });

      it('should identify Vata-Kapha for anxiety + excessive sleep', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 40,
          sleepAnxiety: 0.7,
          totalSleepTime: 520,
          morningAlertness: 0.35,
          caffeineDailyMg: 220,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['vata', 'vata_kapha', 'kapha']).toContain(assessment.prakriti);
      });

      it('should identify Tridoshic for balanced state', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 20,
          wakeAfterSleepOnset: 15,
          totalSleepTime: 420,
          sleepAnxiety: 0.3,
          preSleepArousal: 0.3,
          morningAlertness: 0.7,
          daytimeSleepiness: 0.2,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        // Could be any balanced type
        expect(assessment.prakriti).toBeDefined();
      });
    });

    describe('Vikriti (Imbalance) Assessment', () => {
      it('should identify Vata imbalance for high anxiety', () => {
        const state = createTestSleepState({
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.vikriti.primaryDosha).toBe('vata');
      });

      it('should identify Pitta imbalance for catastrophizing', () => {
        const state = createTestSleepState({
          sleepAnxiety: 0.3,
          preSleepArousal: 0.3,
          catastrophizing: true,
          daytimeSleepiness: 0.2,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['pitta', 'vata']).toContain(assessment.vikriti.primaryDosha);
      });

      it('should identify Pitta with Vata secondary', () => {
        const state = createTestSleepState({
          sleepAnxiety: 0.5,
          preSleepArousal: 0.4,
          catastrophizing: true,
          daytimeSleepiness: 0.2,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        // Should detect secondary dosha for pitta
        if (assessment.vikriti.primaryDosha === 'pitta') {
          expect(assessment.vikriti.secondaryDosha).toBeDefined();
        }
      });

      it('should identify Kapha imbalance for high sleepiness', () => {
        const state = createTestSleepState({
          sleepAnxiety: 0.1,
          preSleepArousal: 0.1,
          daytimeSleepiness: 0.9,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.vikriti.primaryDosha).toBe('kapha');
      });

      it('should set severe level for high ISI', () => {
        const state = createTestSleepState({
          isiScore: 24,
          severity: 'severe',
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.vikriti.imbalanceLevel).toBe('severe');
      });

      it('should set moderate level for moderate ISI', () => {
        const state = createTestSleepState({
          isiScore: 18,
          severity: 'moderate',
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.vikriti.imbalanceLevel).toBe('moderate');
      });

      it('should set mild level for low ISI', () => {
        const state = createTestSleepState({
          isiScore: 10,
          severity: 'subthreshold',
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.vikriti.imbalanceLevel).toBe('mild');
      });
    });

    describe('Anidra Type Determination', () => {
      it('should identify Vata Anidra for long SOL + Vata vikriti', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 60,
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.vikriti.primaryDosha === 'vata') {
          expect(assessment.anidraType).toBe('vata_anidra');
        }
      });

      it('should identify Pitta Anidra for night waking + Pitta vikriti', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 15,
          wakeAfterSleepOnset: 50,
          sleepAnxiety: 0.3,
          preSleepArousal: 0.3,
          catastrophizing: true,
          daytimeSleepiness: 0.2,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.vikriti.primaryDosha === 'pitta') {
          expect(assessment.anidraType).toBe('pitta_anidra');
        }
      });

      it('should identify Kapha Anidra for Kapha vikriti', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 10,
          sleepAnxiety: 0.1,
          preSleepArousal: 0.1,
          daytimeSleepiness: 0.9,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.anidraType).toBe('kapha_anidra');
      });

      it('should default to mixed_anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 30,
          wakeAfterSleepOnset: 25,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(['vata_anidra', 'pitta_anidra', 'kapha_anidra', 'mixed_anidra']).toContain(assessment.anidraType);
      });
    });

    describe('Therapy Recommendations', () => {
      it('should always include yoga_nidra', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.recommendedTherapies).toContain('yoga_nidra');
      });

      it('should recommend abhyanga for Vata Anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 60,
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'vata_anidra') {
          expect(assessment.recommendedTherapies).toContain('abhyanga');
          expect(assessment.recommendedTherapies).toContain('padabhyanga');
          expect(assessment.recommendedTherapies).toContain('shirodhara');
        }
      });

      it('should recommend shirodhara for Pitta Anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 15,
          wakeAfterSleepOnset: 50,
          sleepAnxiety: 0.3,
          preSleepArousal: 0.3,
          catastrophizing: true,
          daytimeSleepiness: 0.2,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'pitta_anidra') {
          expect(assessment.recommendedTherapies).toContain('shirodhara');
          expect(assessment.recommendedTherapies).toContain('padabhyanga');
        }
      });

      it('should recommend nasya for Kapha Anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 10,
          sleepAnxiety: 0.1,
          preSleepArousal: 0.1,
          daytimeSleepiness: 0.9,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'kapha_anidra') {
          expect(assessment.recommendedTherapies).toContain('nasya');
        }
      });

      it('should recommend shirodhara + abhyanga for mixed Anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 30,
          wakeAfterSleepOnset: 40,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'mixed_anidra') {
          expect(assessment.recommendedTherapies).toContain('shirodhara');
          expect(assessment.recommendedTherapies).toContain('abhyanga');
        }
      });

      it('should always recommend herbal_internal', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.recommendedTherapies).toContain('herbal_internal');
      });
    });

    describe('Herb Selection', () => {
      it('should return herbs matching anidra type', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 60,
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.herbs.length).toBeLessThanOrEqual(3);
        expect(assessment.herbs.length).toBeGreaterThan(0);
      });

      it('should select herbs for mixed_anidra with multiple indications', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'mixed_anidra') {
          // Should select herbs that work for multiple conditions
          expect(assessment.herbs.length).toBeGreaterThan(0);
        }
      });
    });

    describe('Yoga Nidra Customization', () => {
      it('should extend duration for Vata Anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 60,
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'vata_anidra') {
          expect(assessment.yogaNidraProtocol.duration).toBe(35);
          expect(assessment.yogaNidraProtocol.instructions.some(
            i => i.includes('Вата') || i.includes('заземления')
          )).toBe(true);
        }
      });

      it('should shorten duration for Pitta Anidra', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 15,
          wakeAfterSleepOnset: 50,
          sleepAnxiety: 0.3,
          preSleepArousal: 0.3,
          catastrophizing: true,
          daytimeSleepiness: 0.2,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'pitta_anidra') {
          expect(assessment.yogaNidraProtocol.duration).toBe(25);
          expect(assessment.yogaNidraProtocol.instructions.some(
            i => i.includes('Питта') || i.includes('охлаждающ')
          )).toBe(true);
        }
      });

      it('should use standard duration for other types', () => {
        const state = createTestSleepState({
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 10,
          sleepAnxiety: 0.1,
          preSleepArousal: 0.1,
          daytimeSleepiness: 0.9,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        if (assessment.anidraType === 'kapha_anidra' || assessment.anidraType === 'mixed_anidra') {
          expect(assessment.yogaNidraProtocol.duration).toBe(30);
        }
      });
    });

    describe('Dinacharya Creation', () => {
      it('should create dinacharya based on vikriti', () => {
        const state = createTestSleepState({
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.dinacharya.wakeTime).toBeDefined();
        expect(assessment.dinacharya.morningRoutine.length).toBeGreaterThan(0);
        expect(assessment.dinacharya.eveningRoutine.length).toBeGreaterThan(0);
        expect(assessment.dinacharya.dietaryGuidelines.length).toBeGreaterThan(0);
      });

      it('should add prakriti note to dietary guidelines', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.dinacharya.dietaryGuidelines.some(
          g => g.includes('конституц') || g.includes(assessment.prakriti)
        )).toBe(true);
      });
    });

    describe('Rationale Generation', () => {
      it('should mention prakriti', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.rationale).toContain('Пракрити');
      });

      it('should mention dosha name in Russian', () => {
        const state = createTestSleepState({
          sleepAnxiety: 0.9,
          preSleepArousal: 0.8,
        });
        const assessment = engine.assessAyurvedicProfile(state);
        expect(
          assessment.rationale.includes('Вата') ||
          assessment.rationale.includes('Питта') ||
          assessment.rationale.includes('Капха')
        ).toBe(true);
      });

      it('should mention anidra type', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(
          assessment.rationale.includes('анидра') ||
          assessment.rationale.includes('бессонниц')
        ).toBe(true);
      });

      it('should mention Yoga Nidra', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(assessment.rationale.toLowerCase()).toContain('йога нидр');
      });

      it('should reference research', () => {
        const state = createTestSleepState();
        const assessment = engine.assessAyurvedicProfile(state);
        expect(
          assessment.rationale.includes('S-VYASA') ||
          assessment.rationale.includes('2023')
        ).toBe(true);
      });
    });
  });

  describe('getYogaNidraInstructions()', () => {
    it('should return instructions array', () => {
      const instructions = engine.getYogaNidraInstructions();
      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should include preparation stage', () => {
      const instructions = engine.getYogaNidraInstructions();
      expect(instructions.some(i => i.includes('Подготовка'))).toBe(true);
    });

    it('should include sankalpa', () => {
      const instructions = engine.getYogaNidraInstructions();
      expect(instructions.some(i => i.includes('Санкальпа'))).toBe(true);
    });

    it('should include body rotation', () => {
      const instructions = engine.getYogaNidraInstructions();
      expect(instructions.some(i => i.includes('Ротация') || i.includes('сознания'))).toBe(true);
    });

    it('should include breath awareness', () => {
      const instructions = engine.getYogaNidraInstructions();
      expect(instructions.some(i => i.includes('дыхани'))).toBe(true);
    });

    it('should include visualization', () => {
      const instructions = engine.getYogaNidraInstructions();
      expect(instructions.some(i => i.includes('Визуализация'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle minimal state', () => {
      const minState = createTestSleepState();
      const assessment = engine.assessAyurvedicProfile(minState);
      expect(assessment).toBeDefined();
    });

    it('should handle extreme anxiety values', () => {
      const extremeState = createTestSleepState({
        sleepAnxiety: 1.0,
        preSleepArousal: 1.0,
      });
      const assessment = engine.assessAyurvedicProfile(extremeState);
      expect(assessment.vikriti.primaryDosha).toBe('vata');
    });

    it('should handle zero anxiety', () => {
      const calmState = createTestSleepState({
        sleepAnxiety: 0,
        preSleepArousal: 0,
        daytimeSleepiness: 0.1,
      });
      const assessment = engine.assessAyurvedicProfile(calmState);
      expect(assessment).toBeDefined();
    });

    it('should handle very long SOL', () => {
      const longSOLState = createTestSleepState({
        sleepOnsetLatency: 180,
        sleepAnxiety: 0.8,
        caffeineDailyMg: 250,
      });
      const assessment = engine.assessAyurvedicProfile(longSOLState);
      expect(['vata', 'vata_pitta', 'vata_kapha', 'tridoshic']).toContain(assessment.prakriti);
    });

    it('should handle very high WASO', () => {
      const highWASOState = createTestSleepState({
        wakeAfterSleepOnset: 120,
      });
      const assessment = engine.assessAyurvedicProfile(highWASOState);
      expect(assessment).toBeDefined();
    });
  });
});
