/**
 * MetacognitiveEngineService Tests (Sprint 7 - MCT Module)
 * ========================================================
 *
 * Comprehensive tests for the MCT module including:
 * - WorryPostponementService
 * - ATTService
 * - MCQ30AssessmentService
 * - DetachedMindfulnessService
 * - MetacognitiveEngineService (integration)
 */

import {
  MetacognitiveEngineService,
  createMetacognitiveEngineService,
  metacognitiveEngineService,
  DEFAULT_MCT_ENGINE_CONFIG,
} from '../MetacognitiveEngineService';

import {
  WorryPostponementService,
  createWorryPostponementService,
  worryPostponementService,
} from '../WorryPostponementService';

import {
  ATTService,
  createATTService,
  attService,
  type ATTPhase,
} from '../ATTService';

import {
  MCQ30AssessmentService,
  createMCQ30AssessmentService,
  MCQ30_ITEMS,
  MCQ30_SUBSCALES,
  type IMCQ30Response,
} from '../MCQ30AssessmentService';

import {
  DetachedMindfulnessService,
  createDetachedMindfulnessService,
  detachedMindfulnessService,
  DM_EXERCISES,
  type DMExerciseType,
} from '../DetachedMindfulnessService';

// ============================================================================
// WORRY POSTPONEMENT SERVICE TESTS
// ============================================================================

describe('WorryPostponementService', () => {
  let service: WorryPostponementService;

  beforeEach(() => {
    service = createWorryPostponementService();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.defaultDuration).toBe(20);
      expect(config.minHoursBeforeBed).toBe(3);
      expect(config.maxHoursBeforeBed).toBe(6);
      expect(config.enabled).toBe(true);
    });

    it('should allow custom configuration', () => {
      const customService = createWorryPostponementService({
        defaultDuration: 25,
        minHoursBeforeBed: 4,
      });
      const config = customService.getConfig();
      expect(config.defaultDuration).toBe(25);
      expect(config.minHoursBeforeBed).toBe(4);
    });
  });

  describe('Worry Time Settings', () => {
    it('should setup worry time', () => {
      const settings = service.setupWorryTime('user1', '18:00', 20);

      expect(settings.userId).toBe('user1');
      expect(settings.scheduledTime).toBe('18:00');
      expect(settings.duration).toBe(20);
    });

    it('should retrieve worry time settings', () => {
      service.setupWorryTime('user1', '19:00', 25);
      const settings = service.getWorryTimeSettings('user1');

      expect(settings).not.toBeNull();
      expect(settings!.scheduledTime).toBe('19:00');
      expect(settings!.duration).toBe(25);
    });

    it('should return null for unknown user', () => {
      const settings = service.getWorryTimeSettings('unknownUser');
      expect(settings).toBeNull();
    });

    it('should suggest worry times based on bedtime', () => {
      const suggestions = service.suggestWorryTime(23); // 11 PM bedtime
      expect(suggestions.length).toBeGreaterThan(0);
      // Should suggest times around 18:00-19:00 (4-5 hours before 23:00)
      expect(suggestions.some(s => s.includes('18') || s.includes('19'))).toBe(true);
    });
  });

  describe('Worry Recording', () => {
    it('should record a worry', () => {
      const worry = service.recordWorry('user1', 'Test worry', 'daytime', 5);

      expect(worry.id).toMatch(/^worry_/);
      expect(worry.userId).toBe('user1');
      expect(worry.content).toBe('Test worry');
      expect(worry.context).toBe('daytime');
      expect(worry.distressLevel).toBe(5);
      expect(worry.processed).toBe(false);
    });

    it('should get today\'s worries', () => {
      service.recordWorry('user1', 'Worry 1', 'daytime', 3);
      service.recordWorry('user1', 'Worry 2', 'pre_sleep', 5);

      const worries = service.getTodaysWorries('user1');
      expect(worries.length).toBe(2);
    });

    it('should not mix users\' worries', () => {
      service.recordWorry('user1', 'User1 worry', 'daytime', 3);
      service.recordWorry('user2', 'User2 worry', 'daytime', 5);

      const user1Worries = service.getTodaysWorries('user1');
      const user2Worries = service.getTodaysWorries('user2');

      expect(user1Worries.length).toBe(1);
      expect(user2Worries.length).toBe(1);
      expect(user1Worries[0].content).toBe('User1 worry');
    });

    it('should check daily limit', () => {
      // Record many worries
      for (let i = 0; i < 15; i++) {
        service.recordWorry('user1', `Worry ${i}`, 'daytime', 5);
      }

      expect(service.hasReachedDailyLimit('user1')).toBe(true);
    });
  });

  describe('Worry Sessions', () => {
    beforeEach(() => {
      service.setupWorryTime('user1', '18:00', 20);
      service.recordWorry('user1', 'Test worry 1', 'daytime', 5);
      service.recordWorry('user1', 'Test worry 2', 'daytime', 7);
    });

    it('should start a worry session', () => {
      const session = service.startWorrySession('user1');

      expect(session.id).toMatch(/^ws_/);
      expect(session.userId).toBe('user1');
      expect(session.completed).toBe(false);
    });

    it('should complete a worry session', () => {
      service.startWorrySession('user1');
      const completed = service.completeWorrySession('user1', 7, 4, 'Session notes');

      expect(completed).not.toBeNull();
      expect(completed!.completed).toBe(true);
      expect(completed!.distressBefore).toBe(7);
      expect(completed!.distressAfter).toBe(4);
      expect(completed!.notes).toBe('Session notes');
    });

    it('should process individual worries', () => {
      service.startWorrySession('user1');
      const worries = service.getTodaysWorries('user1');

      const processed = service.processWorry(
        'user1',
        worries[0].id,
        'solvable',
        'Make a plan',
        3
      );

      expect(processed).not.toBeNull();
      expect(processed!.processed).toBe(true);
      expect(processed!.category).toBe('solvable');
      expect(processed!.actionPlan).toBe('Make a plan');
      expect(processed!.distressAfter).toBe(3);
    });
  });

  describe('Instructions', () => {
    it('should provide postponement instructions', () => {
      const instructions = service.getPostponementInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should provide night protocol instructions', () => {
      const instructions = service.getNightProtocolInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should provide worry time instructions', () => {
      const instructions = service.getWorryTimeInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', () => {
      service.setupWorryTime('user1', '18:00', 20);
      service.recordWorry('user1', 'Worry 1', 'daytime', 5);
      service.recordWorry('user1', 'Worry 2', 'daytime', 8);
      service.startWorrySession('user1');
      service.completeWorrySession('user1', 7, 3);

      const stats = service.getStatistics('user1');

      expect(stats.totalWorries).toBe(2);
      expect(stats.sessionsCompleted).toBe(1);
    });
  });

  describe('CSD Integration', () => {
    it('should return unavailable for users without sufficient data', () => {
      const csdData = service.getCSDIntegrationData('unknownUser');
      expect(csdData.available).toBe(false);
    });
  });

  describe('Singleton', () => {
    it('should export singleton instance', () => {
      expect(worryPostponementService).toBeDefined();
      expect(worryPostponementService).toBeInstanceOf(WorryPostponementService);
    });
  });
});

// ============================================================================
// ATT SERVICE TESTS
// ============================================================================

describe('ATTService', () => {
  let service: ATTService;

  beforeEach(() => {
    service = createATTService();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.selectiveDuration).toBe(300);
      expect(config.switchingDuration).toBe(300);
      expect(config.dividedDuration).toBe(120);
      expect(config.minSounds).toBe(6);
    });
  });

  describe('Session Management', () => {
    it('should start an ATT session', () => {
      const session = service.startSession('user1', 'morning');

      expect(session.id).toMatch(/^att_/);
      expect(session.userId).toBe('user1');
      expect(session.context).toBe('morning');
      expect(session.completed).toBe(false);
    });

    it('should complete an ATT session', () => {
      const started = service.startSession('user1', 'morning');
      const completed = service.completeSession(
        'user1',
        started.id,
        ['selective', 'switching', 'divided'],
        6,  // attention rating
        4,  // difficulty rating
        2,  // distractions
        'Good session'
      );

      expect(completed.completed).toBe(true);
      expect(completed.phasesCompleted).toHaveLength(3);
      expect(completed.attentionRating).toBe(6);
      expect(completed.difficultyRating).toBe(4);
    });

    it('should allow partial session', () => {
      const partial = service.recordPartialSession(
        'user1',
        ['selective'],
        'Interrupted'
      );

      expect(partial.completed).toBe(false);
      expect(partial.phasesCompleted).toHaveLength(1);
    });
  });

  describe('Instructions', () => {
    it('should provide preparation instructions', () => {
      const instructions = service.getPreparationInstructions();

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
    });

    it('should provide phase instructions', () => {
      const phases: ATTPhase[] = ['selective', 'switching', 'divided'];

      phases.forEach(phase => {
        const instructions = service.getPhaseInstructions(phase);
        expect(Array.isArray(instructions)).toBe(true);
        expect(instructions.length).toBeGreaterThan(0);
      });
    });

    it('should provide audio script', () => {
      const script = service.getAudioScript();

      expect(Array.isArray(script)).toBe(true);
      expect(script.length).toBeGreaterThan(0);
      expect(script[0].phase).toBeDefined();
      expect(script[0].textRu).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress', () => {
      // Complete a few sessions
      const session1 = service.startSession('user1', 'morning');
      service.completeSession('user1', session1.id, ['selective', 'switching', 'divided'], 6, 4);

      const session2 = service.startSession('user1', 'evening');
      service.completeSession('user1', session2.id, ['selective', 'switching', 'divided'], 7, 3);

      const progress = service.getProgress('user1');

      expect(progress.totalSessions).toBe(2);
      expect(progress.targetSessionsPerWeek).toBe(14); // 2x daily * 7 days
    });

    it('should activate program on first session', () => {
      expect(service.isProgramActive('user1')).toBe(false);

      const session = service.startSession('user1', 'morning');
      service.completeSession('user1', session.id, ['selective'], 5, 5);

      expect(service.isProgramActive('user1')).toBe(true);
    });
  });

  describe('CSD Integration', () => {
    it('should return unavailable for users without sessions', () => {
      const csdData = service.getCSDIntegrationData('unknownUser');
      expect(csdData.available).toBe(false);
    });
  });

  describe('Singleton', () => {
    it('should export singleton instance', () => {
      expect(attService).toBeDefined();
      expect(attService).toBeInstanceOf(ATTService);
    });
  });
});

// ============================================================================
// MCQ-30 ASSESSMENT SERVICE TESTS
// ============================================================================

describe('MCQ30AssessmentService', () => {
  let service: MCQ30AssessmentService;

  beforeEach(() => {
    service = createMCQ30AssessmentService();
  });

  describe('MCQ-30 Items', () => {
    it('should have 30 items', () => {
      expect(MCQ30_ITEMS.length).toBe(30);
    });

    it('should have Russian text for all items', () => {
      MCQ30_ITEMS.forEach(item => {
        expect(item.textRu).toBeDefined();
        expect(item.textRu.length).toBeGreaterThan(0);
      });
    });

    it('should have subscale assignments for all items', () => {
      MCQ30_ITEMS.forEach(item => {
        expect(item.subscale).toBeDefined();
        expect(['positive_beliefs', 'uncontrollability', 'cognitive_confidence', 'need_to_control', 'cognitive_self_consciousness'])
          .toContain(item.subscale);
      });
    });
  });

  describe('MCQ-30 Subscales', () => {
    it('should define 5 subscales', () => {
      expect(MCQ30_SUBSCALES.length).toBe(5);
    });

    it('should have 6 items per subscale', () => {
      MCQ30_SUBSCALES.forEach(subscale => {
        expect(subscale.items.length).toBe(6);
      });
    });

    it('should cover all 30 items across subscales', () => {
      const allItems = MCQ30_SUBSCALES.flatMap(s => s.items);
      expect(allItems.length).toBe(30);

      // Check no duplicates
      const uniqueItems = new Set(allItems);
      expect(uniqueItems.size).toBe(30);
    });
  });

  describe('Assessment Scoring', () => {
    it('should score assessment correctly', () => {
      // Create responses (all moderate - value 2)
      const responses: IMCQ30Response[] = MCQ30_ITEMS.map(item => ({
        itemNumber: item.number,
        value: 2 as const,
      }));

      const result = service.scoreAssessment('user1', responses);

      expect(result.userId).toBe('user1');
      expect(result.totalScore).toBe(60); // 30 items * 2
    });

    it('should calculate subscale scores', () => {
      const responses: IMCQ30Response[] = MCQ30_ITEMS.map(item => ({
        itemNumber: item.number,
        value: 3 as const, // High score
      }));

      const result = service.scoreAssessment('user1', responses);

      // Check subscale scores are calculated
      expect(result.subscaleScores).toBeDefined();
      expect(result.subscaleScores.positive_beliefs).toBe(18); // 6 items * 3
    });

    it('should generate interpretation', () => {
      const responses: IMCQ30Response[] = MCQ30_ITEMS.map(item => ({
        itemNumber: item.number,
        value: 2 as const,
      }));

      const result = service.scoreAssessment('user1', responses);

      expect(result.interpretation).toBeDefined();
      expect(result.interpretation.overall).toMatch(/low|moderate|high|very_high/);
      expect(result.interpretation.summaryRu).toBeDefined();
      expect(result.interpretation.recommendations).toBeDefined();
      expect(Array.isArray(result.interpretation.recommendations)).toBe(true);
    });
  });

  describe('Assessment Tracking', () => {
    it('should track assessment history', () => {
      const responses: IMCQ30Response[] = MCQ30_ITEMS.map(item => ({
        itemNumber: item.number,
        value: 2 as const,
      }));

      service.scoreAssessment('user1', responses);
      service.scoreAssessment('user1', responses);

      const history = service.getHistory('user1');
      expect(history.length).toBe(2);
    });

    it('should get latest assessment', () => {
      const responses: IMCQ30Response[] = MCQ30_ITEMS.map(item => ({
        itemNumber: item.number,
        value: 3 as const,
      }));

      service.scoreAssessment('user1', responses);

      const latest = service.getLatestAssessment('user1');
      expect(latest).not.toBeNull();
      expect(latest!.totalScore).toBe(90); // 30 * 3
    });

    it('should check if assessment is due', () => {
      // New user - assessment due
      expect(service.isAssessmentDue('newUser')).toBe(true);
    });
  });

  describe('CSD Integration', () => {
    it('should provide metacognitive risk for CSD', () => {
      const responses: IMCQ30Response[] = MCQ30_ITEMS.map(item => ({
        itemNumber: item.number,
        value: 3 as const, // Moderate-high
      }));

      service.scoreAssessment('user1', responses);

      const csdData = service.getMetacognitiveRiskForCSD('user1');

      expect(csdData.available).toBe(true);
      expect(csdData.overallRisk).toBeGreaterThan(0);
      expect(csdData.overallRisk).toBeLessThanOrEqual(1);
    });

    it('should return unavailable for users without assessments', () => {
      const csdData = service.getMetacognitiveRiskForCSD('unknownUser');
      expect(csdData.available).toBe(false);
    });
  });
});

// ============================================================================
// DETACHED MINDFULNESS SERVICE TESTS
// ============================================================================

describe('DetachedMindfulnessService', () => {
  let service: DetachedMindfulnessService;

  beforeEach(() => {
    service = createDetachedMindfulnessService();
  });

  describe('DM Exercises', () => {
    it('should define at least 8 exercises', () => {
      expect(DM_EXERCISES.length).toBeGreaterThanOrEqual(8);
    });

    it('should have Russian names and instructions', () => {
      DM_EXERCISES.forEach(exercise => {
        expect(exercise.nameRu).toBeDefined();
        expect(exercise.nameRu.length).toBeGreaterThan(0);
        expect(exercise.instructionsRu).toBeDefined();
        expect(exercise.instructionsRu.length).toBeGreaterThan(0);
      });
    });

    it('should have difficulty levels', () => {
      DM_EXERCISES.forEach(exercise => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.difficulty);
      });
    });

    it('should include core MCT exercises', () => {
      const types = DM_EXERCISES.map(e => e.type);
      expect(types).toContain('tiger');
      expect(types).toContain('clouds');
      expect(types).toContain('train_station');
      expect(types).toContain('radio');
    });
  });

  describe('Exercise Access', () => {
    it('should get exercise by type', () => {
      const tiger = service.getExercise('tiger');
      expect(tiger).toBeDefined();
      expect(tiger!.type).toBe('tiger');
    });

    it('should get exercises by difficulty', () => {
      const beginner = service.getExercisesByDifficulty('beginner');
      expect(beginner.length).toBeGreaterThan(0);
      beginner.forEach(e => {
        expect(e.difficulty).toBe('beginner');
      });
    });

    it('should recommend exercise for user', () => {
      const recommended = service.getRecommendedExercise('user1');
      expect(recommended).toBeDefined();
      expect(DM_EXERCISES.some(e => e.type === recommended!.type)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should start DM session', () => {
      const session = service.startSession('user1', 'tiger', 'daytime', 'practice');

      expect(session.id).toMatch(/^dm_/);
      expect(session.userId).toBe('user1');
      expect(session.exerciseType).toBe('tiger');
      expect(session.completed).toBe(false);
    });

    it('should complete DM session', () => {
      const started = service.startSession('user1', 'clouds', 'daytime', 'worry');
      const completed = service.completeSession(
        'user1',
        started.id,
        'clouds', // exerciseType
        180, // duration in seconds
        'daytime', // context
        7, // detachment rating
        'Found it helpful' // userReflection
      );

      expect(completed.completed).toBe(true);
      expect(completed.detachmentRating).toBe(7);
      expect(completed.userReflection).toBe('Found it helpful');
    });

    it('should get session history', () => {
      const s1 = service.startSession('user1', 'tiger', 'daytime', 'practice');
      service.completeSession('user1', s1.id, 'tiger', 180, 'daytime', 6);

      const s2 = service.startSession('user1', 'clouds', 'daytime', 'practice');
      service.completeSession('user1', s2.id, 'clouds', 180, 'daytime', 7);

      const history = service.getHistory('user1');
      expect(history.length).toBe(2);
    });
  });

  describe('Skill Tracking', () => {
    it('should track skill level', () => {
      // Complete multiple sessions
      const exercises: DMExerciseType[] = ['tiger', 'clouds', 'tiger', 'clouds', 'tiger'];
      exercises.forEach(type => {
        const session = service.startSession('user1', type, 'daytime', 'practice');
        service.completeSession('user1', session.id, type, 180, 'daytime', 8);
      });

      const skill = service.getSkillLevel('user1');

      expect(skill.overall).toBeGreaterThan(0);
      expect(skill.sessionsCompleted).toBe(5);
    });

    it('should provide recommended next exercise', () => {
      const skill = service.getSkillLevel('user1');
      expect(skill.recommendedExercise).toBeDefined();
    });
  });

  describe('Trigger-Based Tips', () => {
    it('should provide tips for triggers', () => {
      const triggers = ['sleep_anxiety', 'worry', 'rumination', 'racing_thoughts'] as const;

      triggers.forEach(trigger => {
        const tips = service.getTipsForTrigger(trigger);
        expect(Array.isArray(tips)).toBe(true);
        expect(tips.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CSD Integration', () => {
    it('should return unavailable for users without sessions', () => {
      const csdData = service.getCSDIntegrationData('unknownUser');
      expect(csdData.available).toBe(false);
    });
  });

  describe('Singleton', () => {
    it('should export singleton instance', () => {
      expect(detachedMindfulnessService).toBeDefined();
      expect(detachedMindfulnessService).toBeInstanceOf(DetachedMindfulnessService);
    });
  });
});

// ============================================================================
// METACOGNITIVE ENGINE SERVICE TESTS (INTEGRATION)
// ============================================================================

describe('MetacognitiveEngineService', () => {
  let service: MetacognitiveEngineService;

  beforeEach(() => {
    service = createMetacognitiveEngineService();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.introductionWeek).toBe(5);
      expect(config.minISIForMCT).toBe(8);
      expect(config.enableForNonResponders).toBe(true);
    });

    it('should allow custom configuration', () => {
      const customService = createMetacognitiveEngineService({
        introductionWeek: 4,
        minISIForMCT: 10,
      });

      const config = customService.getConfig();
      expect(config.introductionWeek).toBe(4);
      expect(config.minISIForMCT).toBe(10);
    });
  });

  describe('Component Services', () => {
    it('should provide access to WorryPostponementService', () => {
      const worryService = service.getWorryService();
      expect(worryService).toBeDefined();
      expect(worryService).toBeInstanceOf(WorryPostponementService);
    });

    it('should provide access to ATTService', () => {
      const attServiceInst = service.getATTService();
      expect(attServiceInst).toBeDefined();
      expect(attServiceInst).toBeInstanceOf(ATTService);
    });

    it('should provide access to MCQ30AssessmentService', () => {
      const mcq30ServiceInst = service.getMCQ30Service();
      expect(mcq30ServiceInst).toBeDefined();
      expect(mcq30ServiceInst).toBeInstanceOf(MCQ30AssessmentService);
    });

    it('should provide access to DetachedMindfulnessService', () => {
      const dmServiceInst = service.getDMService();
      expect(dmServiceInst).toBeDefined();
      expect(dmServiceInst).toBeInstanceOf(DetachedMindfulnessService);
    });
  });

  describe('User Management', () => {
    it('should activate MCT for user', () => {
      expect(service.isMCTActive('user1')).toBe(false);

      service.activateMCT('user1');

      expect(service.isMCTActive('user1')).toBe(true);
    });

    it('should deactivate MCT for user', () => {
      service.activateMCT('user1');
      service.deactivateMCT('user1');

      expect(service.isMCTActive('user1')).toBe(false);
    });

    it('should not duplicate activation', () => {
      service.activateMCT('user1');
      const firstStatus = service.getMCTStatus('user1');

      service.activateMCT('user1'); // Second call
      const secondStatus = service.getMCTStatus('user1');

      expect(firstStatus.weekNumber).toBe(secondStatus.weekNumber);
    });
  });

  describe('MCT Status', () => {
    it('should return inactive status for new user', () => {
      const status = service.getMCTStatus('newUser');

      expect(status.active).toBe(false);
      expect(status.weekNumber).toBe(0);
    });

    it('should return comprehensive status for active user', () => {
      service.activateMCT('user1');

      const status = service.getMCTStatus('user1');

      expect(status.active).toBe(true);
      expect(status.weekNumber).toBeGreaterThanOrEqual(1);
      expect(status.components).toBeDefined();
      expect(status.components.worryPostponement).toBeDefined();
      expect(status.components.att).toBeDefined();
      expect(status.components.mcq30).toBeDefined();
      expect(status.components.detachedMindfulness).toBeDefined();
      expect(status.dailyRecommendations).toBeDefined();
    });
  });

  describe('Trigger Handling', () => {
    it('should handle worry_reported trigger', () => {
      const response = service.handleTrigger('user1', 'worry_reported', {
        userText: 'Test worry',
        isNight: false,
        distressLevel: 5,
      });

      expect(response.type).toBeDefined();
      expect(response.messageRu).toBeDefined();
      expect(response.suggestedActions).toBeDefined();
    });

    it('should handle night worry differently', () => {
      const response = service.handleTrigger('user1', 'worry_reported', {
        userText: 'Night worry',
        isNight: true,
        distressLevel: 7,
      });

      expect(response.type).toBe('guidance');
      expect(response.instructionsRu).toBeDefined();
      expect(response.instructionsRu!.length).toBeGreaterThan(0);
    });

    it('should handle rumination_detected trigger', () => {
      const response = service.handleTrigger('user1', 'rumination_detected');

      expect(response.type).toBe('exercise');
      expect(response.exercise).toBeDefined();
      expect(response.exercise!.type).toBe('detached_mindfulness');
    });

    it('should handle sleep_anxiety trigger', () => {
      const response = service.handleTrigger('user1', 'sleep_anxiety');

      expect(response.type).toBe('exercise');
      expect(response.suggestedActions.some(a => a.action === 'dm')).toBe(true);
    });

    it('should handle racing_thoughts trigger', () => {
      const response = service.handleTrigger('user1', 'racing_thoughts');

      expect(response.type).toBe('exercise');
    });

    it('should handle nighttime_awakening trigger', () => {
      const response = service.handleTrigger('user1', 'nighttime_awakening');

      expect(response.type).toBe('guidance');
      expect(response.instructionsRu).toBeDefined();
    });

    it('should handle scheduled_worry_time trigger', () => {
      service.getWorryService().setupWorryTime('user1', '18:00', 20);
      service.getWorryService().recordWorry('user1', 'Test worry', 'daytime', 5);

      const response = service.handleTrigger('user1', 'scheduled_worry_time');

      expect(response.type).toBe('reminder');
    });

    it('should handle scheduled_att trigger', () => {
      const response = service.handleTrigger('user1', 'scheduled_att');

      expect(response.type).toBe('reminder');
      expect(response.exercise).toBeDefined();
      expect(response.exercise!.type).toBe('att');
    });

    it('should handle user_request trigger', () => {
      service.activateMCT('user1');
      const response = service.handleTrigger('user1', 'user_request');

      expect(response.type).toBe('guidance');
      expect(response.suggestedActions.length).toBe(4);
    });

    it('should auto-activate MCT on trigger', () => {
      expect(service.isMCTActive('newUser')).toBe(false);

      service.handleTrigger('newUser', 'worry_reported', { userText: 'Test' });

      expect(service.isMCTActive('newUser')).toBe(true);
    });
  });

  describe('MCT Suggestion Logic', () => {
    it('should suggest MCT for high rumination', () => {
      const result = service.shouldSuggestMCT(15, 2, true, true);

      expect(result.suggest).toBe(true);
      expect(result.reason.toLowerCase()).toContain('румин');
    });

    it('should suggest MCT for CBT-I non-responders', () => {
      const result = service.shouldSuggestMCT(18, 4, false, false);

      expect(result.suggest).toBe(true);
    });

    it('should suggest MCT at week 5+', () => {
      const result = service.shouldSuggestMCT(10, 5, false, true);

      expect(result.suggest).toBe(true);
    });

    it('should not suggest MCT early in program', () => {
      const result = service.shouldSuggestMCT(12, 2, false, true);

      expect(result.suggest).toBe(false);
    });
  });

  describe('CSD Integration', () => {
    it('should return unavailable for users without MCT activity', () => {
      const csdData = service.getCSDIntegrationData('unknownUser');

      expect(csdData.available).toBe(false);
    });
  });

  describe('Onboarding', () => {
    it('should provide onboarding messages', () => {
      const messages = service.getOnboardingMessages();

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(m => m.includes('MCT') || m.includes('Метакогнитив'))).toBe(true);
    });
  });

  describe('User Data Reset', () => {
    it('should reset all user data', () => {
      service.activateMCT('user1');
      service.getWorryService().setupWorryTime('user1', '18:00', 20);
      service.getWorryService().recordWorry('user1', 'Test', 'daytime', 5);

      service.resetUserData('user1');

      expect(service.isMCTActive('user1')).toBe(false);
      expect(service.getWorryService().getWorryTimeSettings('user1')).toBeNull();
    });
  });

  describe('Singleton', () => {
    it('should export singleton instance', () => {
      expect(metacognitiveEngineService).toBeDefined();
      expect(metacognitiveEngineService).toBeInstanceOf(MetacognitiveEngineService);
    });

    it('should export default config', () => {
      expect(DEFAULT_MCT_ENGINE_CONFIG).toBeDefined();
      expect(DEFAULT_MCT_ENGINE_CONFIG.enabled).toBe(true);
    });
  });
});
