/**
 * CognitiveRestructuringEngine Unit Tests
 * Tests cognitive therapy techniques implementation
 */

import { CognitiveRestructuringEngine } from '../../../src/cbt-i/engines/CognitiveRestructuringEngine';
import type { IDysfunctionalBelief, SleepRelatedEmotion } from '../../../src/cbt-i/interfaces/ICBTIComponents';
import type { ISleepState } from '../../../src/sleep/interfaces/ISleepState';

describe('CognitiveRestructuringEngine', () => {
  let engine: CognitiveRestructuringEngine;

  // Factory for test sleep state
  function createTestSleepState(overrides: Partial<{
    unrealisticExpectations: boolean;
    catastrophizing: boolean;
    helplessness: boolean;
  }> = {}): ISleepState {
    return {
      userId: 'test-user',
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      metrics: {
        timeInBed: 480,
        totalSleepTime: 400,
        sleepOnsetLatency: 30,
        wakeAfterSleepOnset: 30,
        numberOfAwakenings: 2,
        sleepEfficiency: 83,
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
        isiScore: 12,
        severity: 'subthreshold',
        subtype: 'sleep_onset',
        durationWeeks: 4,
        daytimeImpact: 0.3,
        sleepDistress: 0.3,
      },
      behaviors: {
        caffeine: { dailyMg: 100, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
        alcohol: { drinksToday: 0, lastDrinkTime: '' },
        screenTimeBeforeBed: 30,
        exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
        naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
        environment: { temperatureCelsius: 19, isQuiet: true, isDark: true, isComfortable: true },
      },
      cognitions: {
        dbasScore: 5,
        beliefs: {
          unrealisticExpectations: overrides.unrealisticExpectations ?? false,
          catastrophizing: overrides.catastrophizing ?? false,
          helplessness: overrides.helplessness ?? false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: 0.3,
        preSleepArousal: 0.4,
        sleepSelfEfficacy: 0.7,
      },
      subjectiveQuality: 'fair',
      morningAlertness: 0.6,
      daytimeSleepiness: 0.3,
      sleepHealthScore: 70,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  beforeEach(() => {
    engine = new CognitiveRestructuringEngine();
  });

  describe('identifyBeliefs()', () => {
    it('should identify expectations beliefs from keywords', () => {
      const sleepState = createTestSleepState();
      const text = 'Мне нужно спать 8 часов, иначе я не смогу работать';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.length).toBeGreaterThan(0);
      expect(beliefs[0].category).toBe('expectations');
    });

    it('should identify consequences beliefs', () => {
      const sleepState = createTestSleepState();
      const text = 'Бессонница разрушит моё здоровье, это катастрофа';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.category === 'consequences')).toBe(true);
    });

    it('should identify control beliefs', () => {
      const sleepState = createTestSleepState();
      const text = 'Я не могу контролировать сон, ничего не помогает';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.category === 'control')).toBe(true);
    });

    it('should identify medication beliefs', () => {
      const sleepState = createTestSleepState();
      const text = 'Без снотворного я не могу уснуть, мне нужны таблетки';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.category === 'medication')).toBe(true);
    });

    it('should identify causes beliefs', () => {
      const sleepState = createTestSleepState();
      const text = 'Это гены, наследственность, стресс на работе';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.category === 'causes')).toBe(true);
    });

    it('should return empty array for neutral text', () => {
      const sleepState = createTestSleepState();
      const text = 'Сегодня хорошая погода';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.length).toBe(0);
    });

    it('should increase intensity with more matching keywords', () => {
      const sleepState = createTestSleepState();
      const text1 = 'Нужно спать 8 часов';
      const text2 = 'Нужно спать 8 часов минимум обязательно';

      const beliefs1 = engine.identifyBeliefs(text1, sleepState);
      const beliefs2 = engine.identifyBeliefs(text2, sleepState);

      if (beliefs1.length > 0 && beliefs2.length > 0) {
        expect(beliefs2[0].intensity).toBeGreaterThanOrEqual(beliefs1[0].intensity);
      }
    });

    it('should consider existing beliefs from sleep state', () => {
      const stateWithBeliefs = createTestSleepState({
        unrealisticExpectations: true,
        catastrophizing: true,
      });
      const text = 'Мне нужно спать 8 часов';

      const beliefs = engine.identifyBeliefs(text, stateWithBeliefs);

      expect(beliefs.length).toBeGreaterThan(0);
      expect(beliefs[0].intensity).toBeGreaterThanOrEqual(0.7);
    });

    it('should set default frequency', () => {
      const sleepState = createTestSleepState();
      const text = 'Мне нужно спать 8 часов';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      if (beliefs.length > 0) {
        expect(beliefs[0].frequency).toBe(0.5);
      }
    });
  });

  describe('generateSocraticQuestions()', () => {
    it('should generate questions for expectations category', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test1',
        category: 'expectations',
        belief: 'Мне нужно спать 8 часов',
        intensity: 0.7,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const questions = engine.generateSocraticQuestions(belief);

      expect(questions.length).toBeGreaterThanOrEqual(3);
      expect(questions.every(q => typeof q === 'string')).toBe(true);
    });

    it('should generate 4 questions for high intensity beliefs', () => {
      const highIntensityBelief: IDysfunctionalBelief = {
        id: 'test2',
        category: 'consequences',
        belief: 'Test belief',
        intensity: 0.9,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const questions = engine.generateSocraticQuestions(highIntensityBelief);

      expect(questions.length).toBe(4);
    });

    it('should generate 3 questions for lower intensity beliefs', () => {
      const lowIntensityBelief: IDysfunctionalBelief = {
        id: 'test3',
        category: 'control',
        belief: 'Test belief',
        intensity: 0.5,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const questions = engine.generateSocraticQuestions(lowIntensityBelief);

      expect(questions.length).toBe(3);
    });

    it('should generate Russian-language questions', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test4',
        category: 'medication',
        belief: 'Test belief',
        intensity: 0.6,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const questions = engine.generateSocraticQuestions(belief);

      const hasCyrillic = questions.some(q => /[а-яёА-ЯЁ]/.test(q));
      expect(hasCyrillic).toBe(true);
    });
  });

  describe('generateAlternativeThought()', () => {
    it('should generate alternative thought without evidence', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test5',
        category: 'expectations',
        belief: 'Test belief',
        intensity: 0.6,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const alternative = engine.generateAlternativeThought(belief, { for: [], against: [] });

      expect(alternative).toBeDefined();
      expect(alternative.length).toBeGreaterThan(0);
    });

    it('should personalize with user evidence against', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test6',
        category: 'consequences',
        belief: 'Test belief',
        intensity: 0.6,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const userEvidence = 'Вчера я плохо спал, но всё равно закончил проект';
      const alternative = engine.generateAlternativeThought(belief, {
        for: [],
        against: [userEvidence],
      });

      expect(alternative).toContain(userEvidence);
    });

    it('should return category-appropriate alternatives', () => {
      const categories: IDysfunctionalBelief['category'][] = [
        'expectations', 'consequences', 'control', 'medication', 'causes'
      ];

      for (const category of categories) {
        const belief: IDysfunctionalBelief = {
          id: `test_${category}`,
          category,
          belief: 'Test belief',
          intensity: 0.6,
          frequency: 0.5,
          evidenceFor: [],
          evidenceAgainst: [],
          alternativeThought: '',
          isActive: true,
        };

        const alternative = engine.generateAlternativeThought(belief, { for: [], against: [] });
        expect(alternative.length).toBeGreaterThan(0);
      }
    });
  });

  describe('designExperiment()', () => {
    const categories: IDysfunctionalBelief['category'][] = [
      'expectations', 'consequences', 'control', 'medication', 'causes'
    ];

    it.each(categories)('should design experiment for %s category', (category) => {
      const belief: IDysfunctionalBelief = {
        id: `exp_${category}`,
        category,
        belief: 'Test belief',
        intensity: 0.6,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const experiment = engine.designExperiment(belief);

      expect(experiment).toHaveProperty('hypothesis');
      expect(experiment).toHaveProperty('experiment');
      expect(experiment).toHaveProperty('predictedOutcome');
      expect(experiment.hypothesis.length).toBeGreaterThan(0);
      expect(experiment.experiment.length).toBeGreaterThan(0);
    });

    it('should return default experiment for unknown category', () => {
      const belief = {
        id: 'unknown',
        category: 'unknown' as IDysfunctionalBelief['category'],
        belief: 'Custom belief text',
        intensity: 0.6,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const experiment = engine.designExperiment(belief);

      expect(experiment.hypothesis).toBe('Custom belief text');
    });
  });

  describe('calculateImprovement()', () => {
    it('should return zero for insufficient history', () => {
      const result = engine.calculateImprovement([]);

      expect(result.dbasReduction).toBe(0);
      expect(result.topImprovedBeliefs).toEqual([]);
    });

    it('should return zero for single week history', () => {
      const singleWeek: IDysfunctionalBelief[][] = [[
        {
          id: 'b1',
          category: 'expectations',
          belief: 'Test belief',
          intensity: 0.8,
          frequency: 0.5,
          evidenceFor: [],
          evidenceAgainst: [],
          alternativeThought: '',
          isActive: true,
        }
      ]];

      const result = engine.calculateImprovement(singleWeek);

      expect(result.dbasReduction).toBe(0);
    });

    it('should calculate improvement over time', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        // Week 1 - high intensity
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Belief A',
            intensity: 0.9,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: '',
            isActive: true,
          }
        ],
        // Week 4 - lower intensity
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Belief A',
            intensity: 0.4,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: ['Evidence 1'],
            alternativeThought: 'Alternative',
            isActive: true,
          }
        ]
      ];

      const result = engine.calculateImprovement(beliefHistory);

      expect(result.dbasReduction).toBe(0.5); // 0.9 - 0.4
      expect(result.topImprovedBeliefs).toContain('Belief A');
    });

    it('should identify top improved beliefs', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          { id: 'b1', category: 'expectations', belief: 'Belief A', intensity: 0.9, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
          { id: 'b2', category: 'consequences', belief: 'Belief B', intensity: 0.7, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
          { id: 'b3', category: 'control', belief: 'Belief C', intensity: 0.8, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
        ],
        [
          { id: 'b1', category: 'expectations', belief: 'Belief A', intensity: 0.3, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
          { id: 'b2', category: 'consequences', belief: 'Belief B', intensity: 0.5, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
          { id: 'b3', category: 'control', belief: 'Belief C', intensity: 0.7, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
        ]
      ];

      const result = engine.calculateImprovement(beliefHistory);

      expect(result.topImprovedBeliefs.length).toBeLessThanOrEqual(3);
      // Belief A improved most (0.6), then Belief B (0.2), then Belief C (0.1)
      expect(result.topImprovedBeliefs[0]).toBe('Belief A');
    });

    it('should calculate emotional improvement metrics', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Belief A',
            intensity: 0.8,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: '',
            isActive: true,
            emotion: 'anxiety',
            emotionIntensity: 0.9,
          }
        ],
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Belief A',
            intensity: 0.4,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: 'Alternative thought',
            isActive: true,
            emotion: 'anxiety',
            emotionIntensity: 0.5,
            emotionIntensityAfter: 0.4,
          }
        ]
      ];

      const result = engine.calculateImprovement(beliefHistory);

      expect(result.emotionalImprovement).toBeDefined();
      expect(result.emotionalImprovement.avgEmotionReduction).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // EMOTION TRACKING TESTS (Beck's CBT Model Integration)
  // ============================================================================

  describe('Emotion Detection in identifyBeliefs()', () => {
    it('should detect anxiety emotion from keywords', () => {
      const sleepState = createTestSleepState();
      const text = 'Я очень тревожусь и волнуюсь что не высплюсь';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.length).toBeGreaterThan(0);
      expect(beliefs[0].emotion).toBe('anxiety');
    });

    it('should detect frustration emotion from keywords', () => {
      const sleepState = createTestSleepState();
      const text = 'Мне надоело не спать, это гены и наследственность';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.emotion === 'frustration')).toBe(true);
    });

    it('should detect hopelessness emotion from keywords', () => {
      const sleepState = createTestSleepState();
      const text = 'Это безнадёжно, я не могу контролировать сон, ничего не помогает';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.emotion === 'hopelessness')).toBe(true);
    });

    it('should detect fear emotion from keywords', () => {
      const sleepState = createTestSleepState();
      const text = 'Боюсь что бессонница разрушит моё здоровье';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.some(b => b.emotion === 'fear')).toBe(true);
    });

    it('should infer emotion from category when no keywords present', () => {
      const sleepState = createTestSleepState();
      const text = 'Мне нужно спать 8 часов минимум';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.length).toBeGreaterThan(0);
      expect(beliefs[0].emotion).toBeDefined();
      // expectations category -> anxiety
      expect(beliefs[0].emotion).toBe('anxiety');
    });

    it('should include emotionIntensity in identified beliefs', () => {
      const sleepState = createTestSleepState();
      const text = 'Мне нужно спать 8 часов';

      const beliefs = engine.identifyBeliefs(text, sleepState);

      expect(beliefs.length).toBeGreaterThan(0);
      expect(beliefs[0].emotionIntensity).toBeDefined();
      expect(beliefs[0].emotionIntensity).toBeGreaterThanOrEqual(0);
      expect(beliefs[0].emotionIntensity).toBeLessThanOrEqual(1);
    });

    it('should increase emotion intensity with intensity modifiers', () => {
      const sleepState = createTestSleepState();
      const textNormal = 'Мне нужно спать 8 часов';
      const textIntense = 'Мне очень сильно нужно спать 8 часов';

      const beliefsNormal = engine.identifyBeliefs(textNormal, sleepState);
      const beliefsIntense = engine.identifyBeliefs(textIntense, sleepState);

      if (beliefsNormal.length > 0 && beliefsIntense.length > 0) {
        expect(beliefsIntense[0].emotionIntensity!).toBeGreaterThan(beliefsNormal[0].emotionIntensity!);
      }
    });
  });

  describe('inferEmotionFromBelief()', () => {
    it('should infer anxiety from expectations category', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test',
        category: 'expectations',
        belief: 'Test belief',
        intensity: 0.5,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const emotion = engine.inferEmotionFromBelief(belief);

      expect(emotion).toBe('anxiety');
    });

    it('should infer fear from consequences category', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test',
        category: 'consequences',
        belief: 'Test belief',
        intensity: 0.5,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const emotion = engine.inferEmotionFromBelief(belief);

      expect(emotion).toBe('fear');
    });

    it('should infer hopelessness from control category', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test',
        category: 'control',
        belief: 'Test belief',
        intensity: 0.5,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const emotion = engine.inferEmotionFromBelief(belief);

      expect(emotion).toBe('hopelessness');
    });

    it('should infer frustration from causes category', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test',
        category: 'causes',
        belief: 'Test belief',
        intensity: 0.5,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const emotion = engine.inferEmotionFromBelief(belief);

      expect(emotion).toBe('frustration');
    });

    it('should detect emotion from belief text keywords', () => {
      const belief: IDysfunctionalBelief = {
        id: 'test',
        category: 'expectations',
        belief: 'Я боюсь что не высплюсь',
        intensity: 0.5,
        frequency: 0.5,
        evidenceFor: [],
        evidenceAgainst: [],
        alternativeThought: '',
        isActive: true,
      };

      const emotion = engine.inferEmotionFromBelief(belief);

      // "боюсь" keyword -> fear (overrides category-based inference)
      expect(emotion).toBe('fear');
    });
  });

  describe('generateCognitiveProgressReport()', () => {
    it('should generate report with empty history', () => {
      const report = engine.generateCognitiveProgressReport([], 'test-user');

      expect(report.userId).toBe('test-user');
      expect(report.rows).toEqual([]);
      expect(report.summary.totalBeliefs).toBe(0);
    });

    it('should generate report with belief history', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Мне нужно спать 8 часов',
            intensity: 0.8,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: '',
            isActive: true,
            emotion: 'anxiety',
            emotionIntensity: 0.9,
          }
        ],
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Мне нужно спать 8 часов',
            intensity: 0.4,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: ['Вчера спал 6 часов и был продуктивен'],
            alternativeThought: 'Мой организм адаптируется',
            isActive: true,
            emotion: 'anxiety',
            emotionIntensity: 0.5,
            emotionIntensityAfter: 0.4,
          }
        ]
      ];

      const report = engine.generateCognitiveProgressReport(beliefHistory, 'user-123');

      expect(report.userId).toBe('user-123');
      expect(report.rows.length).toBe(1);
      expect(report.summary.totalBeliefs).toBe(1);
    });

    it('should include correct summary statistics', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          { id: 'b1', category: 'expectations', belief: 'Belief A', intensity: 0.9, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true, emotion: 'anxiety' as SleepRelatedEmotion, emotionIntensity: 0.9 },
          { id: 'b2', category: 'consequences', belief: 'Belief B', intensity: 0.8, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true, emotion: 'fear' as SleepRelatedEmotion, emotionIntensity: 0.85 },
        ],
        [
          { id: 'b1', category: 'expectations', belief: 'Belief A', intensity: 0.3, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: 'Alternative A', isActive: true, emotion: 'anxiety' as SleepRelatedEmotion, emotionIntensity: 0.4 },
          { id: 'b2', category: 'consequences', belief: 'Belief B', intensity: 0.7, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true, emotion: 'fear' as SleepRelatedEmotion, emotionIntensity: 0.75 },
        ]
      ];

      const report = engine.generateCognitiveProgressReport(beliefHistory);

      expect(report.summary.totalBeliefs).toBe(2);
      // Belief A reduced by 0.6 (>0.2), Belief B reduced by 0.1 (<0.2)
      expect(report.summary.successfulRestructurings).toBe(1);
      expect(report.summary.successRate).toBe(50);
    });

    it('should identify dominant emotion and category', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          { id: 'b1', category: 'expectations', belief: 'Belief A', intensity: 0.8, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true, emotion: 'anxiety' as SleepRelatedEmotion, emotionIntensity: 0.8 },
          { id: 'b2', category: 'expectations', belief: 'Belief B', intensity: 0.7, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true, emotion: 'anxiety' as SleepRelatedEmotion, emotionIntensity: 0.7 },
          { id: 'b3', category: 'control', belief: 'Belief C', intensity: 0.6, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true, emotion: 'hopelessness' as SleepRelatedEmotion, emotionIntensity: 0.6 },
        ],
        [
          { id: 'b1', category: 'expectations', belief: 'Belief A', intensity: 0.4, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
          { id: 'b2', category: 'expectations', belief: 'Belief B', intensity: 0.3, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
          { id: 'b3', category: 'control', belief: 'Belief C', intensity: 0.5, frequency: 0.5, evidenceFor: [], evidenceAgainst: [], alternativeThought: '', isActive: true },
        ]
      ];

      const report = engine.generateCognitiveProgressReport(beliefHistory);

      expect(report.summary.dominantEmotion).toBe('anxiety');
      expect(report.summary.dominantCategory).toBe('expectations');
    });

    it('should generate valid markdown table', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Мне нужно спать 8 часов',
            intensity: 0.8,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: '',
            isActive: true,
            emotion: 'anxiety',
            emotionIntensity: 0.8,
          }
        ],
        [
          {
            id: 'b1',
            category: 'expectations',
            belief: 'Мне нужно спать 8 часов',
            intensity: 0.3,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: 'Мой организм адаптируется',
            isActive: true,
            emotion: 'anxiety',
            emotionIntensity: 0.4,
          }
        ]
      ];

      const report = engine.generateCognitiveProgressReport(beliefHistory);
      const markdown = report.toMarkdownTable();

      expect(markdown).toContain('## Отчёт о когнитивном прогрессе');
      expect(markdown).toContain('### Сводка');
      expect(markdown).toContain('### Детализация');
      expect(markdown).toContain('| Убеждение | Эмоция | До | После | Альтернативная мысль | Успех |');
      expect(markdown).toContain('Тревога'); // Russian label for anxiety
      expect(markdown).toContain('✓'); // Success marker
    });

    it('should include row details with emotion intensity', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          {
            id: 'b1',
            category: 'consequences',
            belief: 'Бессонница разрушит здоровье',
            intensity: 0.9,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: '',
            isActive: true,
            emotion: 'fear',
            emotionIntensity: 0.85,
          }
        ],
        [
          {
            id: 'b1',
            category: 'consequences',
            belief: 'Бессонница разрушит здоровье',
            intensity: 0.4,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: 'Тело восстанавливается',
            isActive: true,
            emotion: 'fear',
            emotionIntensity: 0.4,
            emotionIntensityAfter: 0.3,
          }
        ]
      ];

      const report = engine.generateCognitiveProgressReport(beliefHistory);

      expect(report.rows.length).toBe(1);
      expect(report.rows[0].emotion).toBe('fear');
      expect(report.rows[0].emotionIntensityBefore).toBe(85); // 0.85 * 100
      expect(report.rows[0].beliefIntensityBefore).toBe(90); // 0.9 * 100
      expect(report.rows[0].beliefIntensityAfter).toBe(40); // 0.4 * 100
      expect(report.rows[0].restructuringSuccess).toBe(true);
    });

    it('should handle beliefs without explicit emotion', () => {
      const beliefHistory: IDysfunctionalBelief[][] = [
        [
          {
            id: 'b1',
            category: 'control',
            belief: 'Я не контролирую сон',
            intensity: 0.7,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: '',
            isActive: true,
            // No emotion field - should be inferred
          }
        ],
        [
          {
            id: 'b1',
            category: 'control',
            belief: 'Я не контролирую сон',
            intensity: 0.3,
            frequency: 0.5,
            evidenceFor: [],
            evidenceAgainst: [],
            alternativeThought: 'У меня есть некоторое влияние',
            isActive: true,
          }
        ]
      ];

      const report = engine.generateCognitiveProgressReport(beliefHistory);

      expect(report.rows.length).toBe(1);
      // control category -> hopelessness
      expect(report.rows[0].emotion).toBe('hopelessness');
    });
  });
});
