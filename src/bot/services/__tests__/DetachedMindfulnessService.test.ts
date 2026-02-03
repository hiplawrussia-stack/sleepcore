/**
 * DetachedMindfulnessService Tests
 * =================================
 *
 * Tests for MCT Detached Mindfulness exercise management.
 * Validates exercise access, session management, skill assessment,
 * guidance generation, and CSD integration.
 *
 * @packageDocumentation
 */

import {
  DetachedMindfulnessService,
  detachedMindfulnessService,
  createDetachedMindfulnessService,
  DEFAULT_DM_CONFIG,
  DM_EXERCISES,
  type IDMConfig,
  type DMExerciseType,
  type IDMSessionRecord,
} from '../DetachedMindfulnessService';

describe('DetachedMindfulnessService', () => {
  let service: DetachedMindfulnessService;
  const testUserId = 'user_test_dm_123';

  beforeEach(() => {
    service = new DetachedMindfulnessService();
  });

  afterEach(() => {
    service.resetUserData(testUserId);
  });

  // ==========================================================================
  // Constructor and Configuration
  // ==========================================================================
  describe('Constructor with default config', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.masteryThreshold).toBe(5);
      expect(config.masteryRatingThreshold).toBe(7);
      expect(config.minSessionsForAssessment).toBe(3);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<IDMConfig> = {
        masteryThreshold: 10,
        masteryRatingThreshold: 8,
      };

      const customService = new DetachedMindfulnessService(customConfig);
      const config = customService.getConfig();

      expect(config.masteryThreshold).toBe(10);
      expect(config.masteryRatingThreshold).toBe(8);
      // Default values still apply
      expect(config.enabled).toBe(true);
      expect(config.minSessionsForAssessment).toBe(3);
    });

    it('should export DEFAULT_DM_CONFIG', () => {
      expect(DEFAULT_DM_CONFIG).toBeDefined();
      expect(DEFAULT_DM_CONFIG.enabled).toBe(true);
      expect(DEFAULT_DM_CONFIG.masteryThreshold).toBe(5);
      expect(DEFAULT_DM_CONFIG.masteryRatingThreshold).toBe(7);
      expect(DEFAULT_DM_CONFIG.minSessionsForAssessment).toBe(3);
    });
  });

  // ==========================================================================
  // getExercises()
  // ==========================================================================
  describe('getExercises()', () => {
    it('should return 8 exercises', () => {
      const exercises = service.getExercises();
      expect(exercises).toHaveLength(8);
    });

    it('should return a copy (not a reference to internal array)', () => {
      const exercises1 = service.getExercises();
      const exercises2 = service.getExercises();
      expect(exercises1).not.toBe(exercises2);
      expect(exercises1).toEqual(exercises2);
    });

    it('should contain all expected exercise types', () => {
      const exercises = service.getExercises();
      const types = exercises.map(e => e.type);

      expect(types).toContain('tiger');
      expect(types).toContain('clouds');
      expect(types).toContain('leaves_river');
      expect(types).toContain('train_station');
      expect(types).toContain('radio');
      expect(types).toContain('quick_dm');
      expect(types).toContain('labeling');
      expect(types).toContain('free_association');
    });

    it('should have correct difficulty distribution', () => {
      const exercises = service.getExercises();
      const beginner = exercises.filter(e => e.difficulty === 'beginner');
      const intermediate = exercises.filter(e => e.difficulty === 'intermediate');
      const advanced = exercises.filter(e => e.difficulty === 'advanced');

      expect(beginner.length).toBe(3);
      expect(intermediate.length).toBe(3);
      expect(advanced.length).toBe(2);
    });

    it('should have required fields on all exercises', () => {
      const exercises = service.getExercises();

      for (const ex of exercises) {
        expect(ex.type).toBeDefined();
        expect(ex.nameRu).toBeDefined();
        expect(ex.nameEn).toBeDefined();
        expect(ex.duration).toBeGreaterThan(0);
        expect(ex.difficulty).toBeDefined();
        expect(ex.bestFor.length).toBeGreaterThan(0);
        expect(ex.instructionsRu.length).toBeGreaterThan(0);
        expect(ex.keyInsightRu).toBeDefined();
        expect(ex.reflectionQuestionsRu.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // getExercise()
  // ==========================================================================
  describe('getExercise()', () => {
    it('should return exercise for valid type', () => {
      const tiger = service.getExercise('tiger');

      expect(tiger).toBeDefined();
      expect(tiger!.type).toBe('tiger');
      expect(tiger!.nameRu).toBe('Упражнение "Тигр"');
      expect(tiger!.nameEn).toBe('Tiger Exercise');
      expect(tiger!.difficulty).toBe('beginner');
      expect(tiger!.duration).toBe(3);
    });

    it('should return exercise for each valid type', () => {
      const types: DMExerciseType[] = [
        'tiger', 'clouds', 'leaves_river', 'train_station',
        'radio', 'quick_dm', 'labeling', 'free_association',
      ];

      for (const type of types) {
        const exercise = service.getExercise(type);
        expect(exercise).toBeDefined();
        expect(exercise!.type).toBe(type);
      }
    });

    it('should return undefined for invalid type', () => {
      const result = service.getExercise('nonexistent' as DMExerciseType);
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // getExercisesByDifficulty()
  // ==========================================================================
  describe('getExercisesByDifficulty()', () => {
    it('should return beginner exercises', () => {
      const exercises = service.getExercisesByDifficulty('beginner');
      expect(exercises.length).toBe(3);
      expect(exercises.every(e => e.difficulty === 'beginner')).toBe(true);
    });

    it('should return intermediate exercises', () => {
      const exercises = service.getExercisesByDifficulty('intermediate');
      expect(exercises.length).toBe(3);
      expect(exercises.every(e => e.difficulty === 'intermediate')).toBe(true);
    });

    it('should return advanced exercises', () => {
      const exercises = service.getExercisesByDifficulty('advanced');
      expect(exercises.length).toBe(2);
      expect(exercises.every(e => e.difficulty === 'advanced')).toBe(true);
    });
  });

  // ==========================================================================
  // getRecommendedExercise()
  // ==========================================================================
  describe('getRecommendedExercise()', () => {
    it('should recommend tiger exercise for new user', () => {
      const recommended = service.getRecommendedExercise(testUserId);

      expect(recommended.type).toBe('tiger');
    });

    it('should recommend clouds for worry trigger', () => {
      // Need at least one session so it does not short-circuit to tiger
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 5);

      const recommended = service.getRecommendedExercise(testUserId, 'worry');
      expect(recommended.type).toBe('clouds');
    });

    it('should recommend leaves_river for rumination trigger', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 5);

      const recommended = service.getRecommendedExercise(testUserId, 'rumination');
      expect(recommended.type).toBe('leaves_river');
    });

    it('should recommend train_station for racing_thoughts trigger', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 5);

      const recommended = service.getRecommendedExercise(testUserId, 'racing_thoughts');
      expect(recommended.type).toBe('train_station');
    });

    it('should recommend quick_dm for sleep_anxiety trigger', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 5);

      const recommended = service.getRecommendedExercise(testUserId, 'sleep_anxiety');
      expect(recommended.type).toBe('quick_dm');
    });

    it('should recommend based on skill level for practice trigger', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 5);

      const recommended = service.getRecommendedExercise(testUserId, 'practice');
      // Should not be undefined and should be a valid exercise
      expect(recommended).toBeDefined();
      expect(recommended.type).toBeDefined();
    });

    it('should recommend least practiced exercise at appropriate level', () => {
      // Complete tiger multiple times so it is no longer least practiced among beginners
      for (let i = 0; i < 3; i++) {
        service.completeSession(testUserId, `dm_tiger_${i}`, 'tiger', 180, 'daytime', 5);
      }

      const recommended = service.getRecommendedExercise(testUserId);
      // Should recommend a different beginner exercise (clouds or leaves_river)
      expect(recommended.type).not.toBe('tiger');
    });

    it('should recommend tiger for new user even with trigger', () => {
      // New user has no sessions, so tiger is always recommended
      const recommended = service.getRecommendedExercise(testUserId, 'worry');
      expect(recommended.type).toBe('tiger');
    });
  });

  // ==========================================================================
  // startSession()
  // ==========================================================================
  describe('startSession()', () => {
    it('should create a session record with correct structure', () => {
      const session = service.startSession(testUserId, 'tiger', 'daytime', 'practice');

      expect(session.id).toMatch(/^dm_\d+_/);
      expect(session.userId).toBe(testUserId);
      expect(session.exerciseType).toBe('tiger');
      expect(session.timestamp).toBeInstanceOf(Date);
      expect(session.duration).toBe(0);
      expect(session.completed).toBe(false);
      expect(session.context).toBe('daytime');
      expect(session.trigger).toBe('practice');
    });

    it('should handle all context types', () => {
      const contexts: IDMSessionRecord['context'][] = ['daytime', 'pre_sleep', 'during_night', 'on_demand'];

      for (const context of contexts) {
        const session = service.startSession(testUserId, 'clouds', context);
        expect(session.context).toBe(context);
      }
    });

    it('should handle session without trigger', () => {
      const session = service.startSession(testUserId, 'tiger', 'daytime');

      expect(session.trigger).toBeUndefined();
    });

    it('should generate unique session IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const session = service.startSession(testUserId, 'tiger', 'daytime');
        ids.add(session.id);
      }
      expect(ids.size).toBe(10);
    });
  });

  // ==========================================================================
  // completeSession()
  // ==========================================================================
  describe('completeSession()', () => {
    it('should complete session with rating', () => {
      const session = service.completeSession(
        testUserId,
        'dm_test_1',
        'tiger',
        180,
        'daytime',
        8,
        'I felt calm',
        'practice'
      );

      expect(session.id).toBe('dm_test_1');
      expect(session.userId).toBe(testUserId);
      expect(session.exerciseType).toBe('tiger');
      expect(session.duration).toBe(180);
      expect(session.completed).toBe(true);
      expect(session.context).toBe('daytime');
      expect(session.detachmentRating).toBe(8);
      expect(session.userReflection).toBe('I felt calm');
      expect(session.trigger).toBe('practice');
      expect(session.timestamp).toBeInstanceOf(Date);
    });

    it('should complete session without optional params', () => {
      const session = service.completeSession(
        testUserId,
        'dm_test_2',
        'clouds',
        120,
        'pre_sleep'
      );

      expect(session.completed).toBe(true);
      expect(session.detachmentRating).toBeUndefined();
      expect(session.userReflection).toBeUndefined();
      expect(session.trigger).toBeUndefined();
    });

    it('should store session in history', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 7);
      service.completeSession(testUserId, 'dm_2', 'clouds', 200, 'pre_sleep', 8);

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(2);
    });

    it('should handle various detachment ratings', () => {
      const ratings = [0, 1, 5, 7, 10];

      for (let i = 0; i < ratings.length; i++) {
        service.completeSession(
          testUserId,
          `dm_rate_${i}`,
          'tiger',
          180,
          'daytime',
          ratings[i]
        );
      }

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(5);
    });
  });

  // ==========================================================================
  // recordIncompleteSession()
  // ==========================================================================
  describe('recordIncompleteSession()', () => {
    it('should record incomplete session', () => {
      const session = service.recordIncompleteSession(
        testUserId,
        'tiger',
        60,
        'daytime'
      );

      expect(session.id).toMatch(/^dm_incomplete_\d+$/);
      expect(session.completed).toBe(false);
      expect(session.duration).toBe(60);
      expect(session.exerciseType).toBe('tiger');
    });

    it('should store incomplete session in history', () => {
      service.recordIncompleteSession(testUserId, 'tiger', 30, 'during_night');

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(1);
      expect(history[0].completed).toBe(false);
    });
  });

  // ==========================================================================
  // getSkillLevel()
  // ==========================================================================
  describe('getSkillLevel()', () => {
    it('should return zero skill for new user', () => {
      const skill = service.getSkillLevel(testUserId);

      expect(skill.overall).toBe(0);
      expect(skill.sessionsCompleted).toBe(0);
      expect(skill.avgDetachmentRating).toBe(0);
      expect(skill.masteredExercises).toEqual([]);
      expect(skill.recommendedExercise).toBe('tiger');
      expect(skill.trend).toBe('stable');
    });

    it('should increase skill after sessions', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 6);
      service.completeSession(testUserId, 'dm_2', 'clouds', 180, 'daytime', 7);
      service.completeSession(testUserId, 'dm_3', 'leaves_river', 180, 'daytime', 8);

      const skill = service.getSkillLevel(testUserId);

      expect(skill.overall).toBeGreaterThan(0);
      expect(skill.sessionsCompleted).toBe(3);
      expect(skill.avgDetachmentRating).toBe(7);
    });

    it('should track mastered exercises', () => {
      // Complete tiger 5 times with rating >= 7 (mastery threshold)
      for (let i = 0; i < 5; i++) {
        service.completeSession(testUserId, `dm_tiger_${i}`, 'tiger', 180, 'daytime', 8);
      }

      const skill = service.getSkillLevel(testUserId);

      expect(skill.masteredExercises).toContain('tiger');
    });

    it('should not count exercises below mastery rating as mastered', () => {
      // Complete tiger 5 times but with low rating
      for (let i = 0; i < 5; i++) {
        service.completeSession(testUserId, `dm_tiger_${i}`, 'tiger', 180, 'daytime', 3);
      }

      const skill = service.getSkillLevel(testUserId);

      expect(skill.masteredExercises).not.toContain('tiger');
    });

    it('should not count exercises below mastery threshold count as mastered', () => {
      // Complete tiger only 3 times (threshold is 5)
      for (let i = 0; i < 3; i++) {
        service.completeSession(testUserId, `dm_tiger_${i}`, 'tiger', 180, 'daytime', 9);
      }

      const skill = service.getSkillLevel(testUserId);

      expect(skill.masteredExercises).not.toContain('tiger');
    });

    it('should detect improving trend', () => {
      // Older sessions with low ratings
      for (let i = 0; i < 4; i++) {
        service.completeSession(testUserId, `dm_old_${i}`, 'tiger', 180, 'daytime', 3);
      }
      // Recent sessions with high ratings
      for (let i = 0; i < 4; i++) {
        service.completeSession(testUserId, `dm_new_${i}`, 'tiger', 180, 'daytime', 9);
      }

      const skill = service.getSkillLevel(testUserId);

      expect(skill.trend).toBe('improving');
    });

    it('should detect needs_practice trend', () => {
      // Older sessions with high ratings
      for (let i = 0; i < 4; i++) {
        service.completeSession(testUserId, `dm_old_${i}`, 'tiger', 180, 'daytime', 9);
      }
      // Recent sessions with low ratings
      for (let i = 0; i < 4; i++) {
        service.completeSession(testUserId, `dm_new_${i}`, 'tiger', 180, 'daytime', 3);
      }

      const skill = service.getSkillLevel(testUserId);

      expect(skill.trend).toBe('needs_practice');
    });

    it('should cap overall skill at 1', () => {
      // Many sessions with perfect ratings and mastered exercises
      for (const type of ['tiger', 'clouds', 'leaves_river', 'train_station', 'radio', 'quick_dm', 'labeling', 'free_association'] as DMExerciseType[]) {
        for (let i = 0; i < 10; i++) {
          service.completeSession(testUserId, `dm_${type}_${i}`, type, 300, 'daytime', 10);
        }
      }

      const skill = service.getSkillLevel(testUserId);

      expect(skill.overall).toBeLessThanOrEqual(1);
    });

    it('should not count incomplete sessions towards skill', () => {
      service.recordIncompleteSession(testUserId, 'tiger', 30, 'daytime');
      service.recordIncompleteSession(testUserId, 'clouds', 20, 'daytime');

      const skill = service.getSkillLevel(testUserId);

      expect(skill.sessionsCompleted).toBe(0);
    });
  });

  // ==========================================================================
  // getCorePrinciples()
  // ==========================================================================
  describe('getCorePrinciples()', () => {
    it('should return array of strings', () => {
      const principles = service.getCorePrinciples();

      expect(Array.isArray(principles)).toBe(true);
      expect(principles.length).toBeGreaterThan(0);
      expect(principles.every(p => typeof p === 'string')).toBe(true);
    });

    it('should contain key DM concepts', () => {
      const principles = service.getCorePrinciples();
      const joined = principles.join('\n');

      expect(joined).toContain('НЕ');
      expect(joined).toContain('Медитация');
      expect(joined).toContain('Наблюдение');
      expect(joined).toContain('бездействия');
      expect(joined).toContain('Мета-осознание');
    });

    it('should distinguish what DM is and is not', () => {
      const principles = service.getCorePrinciples();
      const joined = principles.join('\n');

      // What DM is NOT
      expect(joined).toContain('Медитация или релаксация');
      expect(joined).toContain('Подавление мыслей');

      // What DM IS
      expect(joined).toContain('Наблюдение за мыслями без вмешательства');
      expect(joined).toContain('Позволение мыслям быть');
    });
  });

  // ==========================================================================
  // getSleepContextGuidance()
  // ==========================================================================
  describe('getSleepContextGuidance()', () => {
    it('should return array of strings', () => {
      const guidance = service.getSleepContextGuidance();

      expect(Array.isArray(guidance)).toBe(true);
      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance.every(g => typeof g === 'string')).toBe(true);
    });

    it('should cover pre-sleep, night, and morning contexts', () => {
      const guidance = service.getSleepContextGuidance();
      const joined = guidance.join('\n');

      expect(joined).toContain('Перед сном');
      expect(joined).toContain('Ночью');
      expect(joined).toContain('Утром');
    });

    it('should reference DM techniques', () => {
      const guidance = service.getSleepContextGuidance();
      const joined = guidance.join('\n');

      expect(joined).toContain('облака');
      expect(joined).toContain('радио');
      expect(joined).toContain('маркируйте');
    });
  });

  // ==========================================================================
  // getTipsForTrigger()
  // ==========================================================================
  describe('getTipsForTrigger()', () => {
    it('should return tips for worry trigger', () => {
      const tips = service.getTipsForTrigger('worry');

      expect(tips.length).toBe(3);
      expect(tips[0]).toContain('Беспокойство');
      expect(tips.join('\n')).toContain('будущем');
    });

    it('should return tips for rumination trigger', () => {
      const tips = service.getTipsForTrigger('rumination');

      expect(tips.length).toBe(3);
      expect(tips[0]).toContain('Руминация');
      expect(tips.join('\n')).toContain('лист');
    });

    it('should return tips for racing_thoughts trigger', () => {
      const tips = service.getTipsForTrigger('racing_thoughts');

      expect(tips.length).toBe(3);
      expect(tips[0]).toContain('Много мыслей');
    });

    it('should return tips for sleep_anxiety trigger', () => {
      const tips = service.getTipsForTrigger('sleep_anxiety');

      expect(tips.length).toBe(3);
      expect(tips[0]).toContain('Тревога о сне');
      expect(tips.join('\n')).toContain('радио');
    });

    it('should return default tips for practice trigger', () => {
      const tips = service.getTipsForTrigger('practice');

      expect(tips.length).toBe(3);
      expect(tips[0]).toContain('Мысли');
    });

    it('should return default tips for undefined trigger', () => {
      const tips = service.getTipsForTrigger(undefined);

      expect(tips.length).toBe(3);
      expect(tips[0]).toContain('Мысли');
    });
  });

  // ==========================================================================
  // getHistory()
  // ==========================================================================
  describe('getHistory()', () => {
    it('should return empty array for new user', () => {
      const history = service.getHistory(testUserId);
      expect(history).toEqual([]);
    });

    it('should return sessions sorted by timestamp descending', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 5);
      service.completeSession(testUserId, 'dm_2', 'clouds', 200, 'pre_sleep', 6);
      service.completeSession(testUserId, 'dm_3', 'leaves_river', 220, 'during_night', 7);

      const history = service.getHistory(testUserId);

      expect(history).toHaveLength(3);
      // Most recent first
      for (let i = 0; i < history.length - 1; i++) {
        const current = new Date(history[i].timestamp).getTime();
        const next = new Date(history[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        service.completeSession(testUserId, `dm_${i}`, 'tiger', 180, 'daytime', 5);
      }

      const history = service.getHistory(testUserId, 3);
      expect(history).toHaveLength(3);
    });

    it('should return all sessions when limit is not specified', () => {
      for (let i = 0; i < 5; i++) {
        service.completeSession(testUserId, `dm_${i}`, 'tiger', 180, 'daytime', 5);
      }

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(5);
    });

    it('should include both completed and incomplete sessions', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 7);
      service.recordIncompleteSession(testUserId, 'clouds', 60, 'pre_sleep');

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(2);

      const completedCount = history.filter(s => s.completed).length;
      const incompleteCount = history.filter(s => !s.completed).length;
      expect(completedCount).toBe(1);
      expect(incompleteCount).toBe(1);
    });
  });

  // ==========================================================================
  // getExerciseStatistics()
  // ==========================================================================
  describe('getExerciseStatistics()', () => {
    it('should return stats for all exercise types', () => {
      const stats = service.getExerciseStatistics(testUserId);
      expect(stats.size).toBe(8);
    });

    it('should return zero stats for new user', () => {
      const stats = service.getExerciseStatistics(testUserId);

      for (const [, stat] of stats) {
        expect(stat.sessionsCompleted).toBe(0);
        expect(stat.avgRating).toBe(0);
        expect(stat.lastPracticed).toBeUndefined();
      }
    });

    it('should calculate per-exercise stats correctly', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 6);
      service.completeSession(testUserId, 'dm_2', 'tiger', 200, 'daytime', 8);
      service.completeSession(testUserId, 'dm_3', 'clouds', 150, 'pre_sleep', 9);

      const stats = service.getExerciseStatistics(testUserId);

      const tigerStats = stats.get('tiger')!;
      expect(tigerStats.sessionsCompleted).toBe(2);
      expect(tigerStats.avgRating).toBe(7); // (6 + 8) / 2
      expect(tigerStats.lastPracticed).toBeInstanceOf(Date);

      const cloudsStats = stats.get('clouds')!;
      expect(cloudsStats.sessionsCompleted).toBe(1);
      expect(cloudsStats.avgRating).toBe(9);
    });
  });

  // ==========================================================================
  // getCSDIntegrationData()
  // ==========================================================================
  describe('getCSDIntegrationData()', () => {
    it('should return unavailable for new user', () => {
      const data = service.getCSDIntegrationData(testUserId);

      expect(data.available).toBe(false);
      expect(data.detachmentSkill).toBe(0);
      expect(data.recentPractice).toBe(false);
      expect(data.trend).toBe('stable');
    });

    it('should return unavailable when sessions below minimum', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 7);
      service.completeSession(testUserId, 'dm_2', 'clouds', 180, 'daytime', 8);

      const data = service.getCSDIntegrationData(testUserId);
      // Default minSessionsForAssessment is 3
      expect(data.available).toBe(false);
    });

    it('should return available after enough sessions', () => {
      for (let i = 0; i < 3; i++) {
        service.completeSession(testUserId, `dm_${i}`, 'tiger', 180, 'daytime', 7);
      }

      const data = service.getCSDIntegrationData(testUserId);

      expect(data.available).toBe(true);
      expect(data.detachmentSkill).toBeGreaterThan(0);
      expect(data.recentPractice).toBe(true);
      expect(['improving', 'stable', 'needs_practice']).toContain(data.trend);
    });

    it('should detect recent practice within last 7 days', () => {
      for (let i = 0; i < 3; i++) {
        service.completeSession(testUserId, `dm_${i}`, 'tiger', 180, 'daytime', 7);
      }

      const data = service.getCSDIntegrationData(testUserId);
      expect(data.recentPractice).toBe(true);
    });

    it('should respect custom minSessionsForAssessment', () => {
      const customService = new DetachedMindfulnessService({ minSessionsForAssessment: 1 });

      customService.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 7);

      const data = customService.getCSDIntegrationData(testUserId);
      expect(data.available).toBe(true);
    });
  });

  // ==========================================================================
  // resetUserData()
  // ==========================================================================
  describe('resetUserData()', () => {
    it('should clear all user sessions', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 7);
      service.completeSession(testUserId, 'dm_2', 'clouds', 200, 'pre_sleep', 8);

      service.resetUserData(testUserId);

      const history = service.getHistory(testUserId);
      expect(history).toHaveLength(0);
    });

    it('should not affect other users', () => {
      const otherUser = 'other_user_456';
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime', 7);
      service.completeSession(otherUser, 'dm_2', 'clouds', 200, 'pre_sleep', 8);

      service.resetUserData(testUserId);

      expect(service.getHistory(testUserId)).toHaveLength(0);
      expect(service.getHistory(otherUser)).toHaveLength(1);

      // Cleanup
      service.resetUserData(otherUser);
    });
  });

  // ==========================================================================
  // Factory and Singleton
  // ==========================================================================
  describe('Factory and Singleton', () => {
    it('should create service via factory', () => {
      const created = createDetachedMindfulnessService({ masteryThreshold: 10 });

      expect(created).toBeInstanceOf(DetachedMindfulnessService);
      expect(created.getConfig().masteryThreshold).toBe(10);
    });

    it('should create service via factory with no args', () => {
      const created = createDetachedMindfulnessService();

      expect(created).toBeInstanceOf(DetachedMindfulnessService);
      expect(created.getConfig().masteryThreshold).toBe(5);
    });

    it('should export singleton instance', () => {
      expect(detachedMindfulnessService).toBeInstanceOf(DetachedMindfulnessService);
    });

    it('should be usable via singleton', () => {
      const exercises = detachedMindfulnessService.getExercises();
      expect(exercises).toHaveLength(8);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty user id', () => {
      const session = service.startSession('', 'tiger', 'daytime');
      expect(session.userId).toBe('');
    });

    it('should handle skill level for user with only incomplete sessions', () => {
      service.recordIncompleteSession(testUserId, 'tiger', 30, 'daytime');
      service.recordIncompleteSession(testUserId, 'clouds', 20, 'daytime');

      const skill = service.getSkillLevel(testUserId);
      expect(skill.sessionsCompleted).toBe(0);
      expect(skill.avgDetachmentRating).toBe(0);
      expect(skill.masteredExercises).toEqual([]);
    });

    it('should handle sessions without detachment rating for avg calculation', () => {
      service.completeSession(testUserId, 'dm_1', 'tiger', 180, 'daytime');
      service.completeSession(testUserId, 'dm_2', 'clouds', 180, 'daytime');

      const skill = service.getSkillLevel(testUserId);
      expect(skill.avgDetachmentRating).toBe(0);
    });

    it('should handle getHistory for nonexistent user', () => {
      const history = service.getHistory('nonexistent_user');
      expect(history).toEqual([]);
    });

    it('should handle getCSDIntegrationData for nonexistent user', () => {
      const data = service.getCSDIntegrationData('nonexistent_user');
      expect(data.available).toBe(false);
    });

    it('should export DM_EXERCISES constant', () => {
      expect(DM_EXERCISES).toBeDefined();
      expect(DM_EXERCISES).toHaveLength(8);
    });

    it('should handle concurrent session completions', () => {
      const promises = Array(5).fill(null).map((_, i) =>
        Promise.resolve(
          service.completeSession(testUserId, `dm_concurrent_${i}`, 'tiger', 180, 'daytime', 5 + i)
        )
      );

      Promise.all(promises).then(results => {
        expect(results.length).toBe(5);
        expect(new Set(results.map(r => r.id)).size).toBe(5);
      });
    });
  });
});
