/**
 * ATTService Tests
 * ================
 *
 * Tests for MCT Attention Training Technique (ATT) service implementation.
 * Validates session management, progress tracking, tips generation,
 * CSD integration, and edge cases.
 *
 * @packageDocumentation
 */

import {
  ATTService,
  attService,
  createATTService,
  DEFAULT_ATT_CONFIG,
  type IATTConfig,
  type IATTProgress,
} from '../ATTService';

describe('ATTService', () => {
  let service: ATTService;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    service = new ATTService();
  });

  afterEach(() => {
    service.resetUserData(testUserId);
  });

  // ==========================================================================
  // Constructor and Default Config
  // ==========================================================================
  describe('Constructor and Default Config', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.selectiveDuration).toBe(300);
      expect(config.switchingDuration).toBe(300);
      expect(config.dividedDuration).toBe(120);
      expect(config.minSounds).toBe(6);
      expect(config.targetSessionsPerDay).toBe(2);
      expect(config.minProgramWeeks).toBe(4);
      expect(config.switchInterval).toBe(15);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<IATTConfig> = {
        selectiveDuration: 600,
        dividedDuration: 180,
        minSounds: 8,
      };

      const customService = new ATTService(customConfig);
      const config = customService.getConfig();

      expect(config.selectiveDuration).toBe(600);
      expect(config.dividedDuration).toBe(180);
      expect(config.minSounds).toBe(8);
      // Default values still apply
      expect(config.enabled).toBe(true);
      expect(config.switchingDuration).toBe(300);
      expect(config.targetSessionsPerDay).toBe(2);
    });

    it('should export DEFAULT_ATT_CONFIG', () => {
      expect(DEFAULT_ATT_CONFIG).toBeDefined();
      expect(DEFAULT_ATT_CONFIG.enabled).toBe(true);
      expect(DEFAULT_ATT_CONFIG.selectiveDuration).toBe(300);
      expect(DEFAULT_ATT_CONFIG.switchingDuration).toBe(300);
      expect(DEFAULT_ATT_CONFIG.dividedDuration).toBe(120);
    });

    it('should calculate total duration from config', () => {
      const totalDuration = service.getTotalDuration();
      expect(totalDuration).toBe(300 + 300 + 120); // 720 seconds = 12 minutes
    });

    it('should calculate total duration with custom config', () => {
      const customService = new ATTService({
        selectiveDuration: 400,
        switchingDuration: 400,
        dividedDuration: 200,
      });
      expect(customService.getTotalDuration()).toBe(1000);
    });
  });

  // ==========================================================================
  // startProgram() and isProgramActive()
  // ==========================================================================
  describe('startProgram() and isProgramActive()', () => {
    it('should start a program for a new user', () => {
      expect(service.isProgramActive(testUserId)).toBe(false);

      const startDate = service.startProgram(testUserId);

      expect(startDate).toBeInstanceOf(Date);
      expect(service.isProgramActive(testUserId)).toBe(true);
    });

    it('should not overwrite existing start date on second call', () => {
      const firstDate = service.startProgram(testUserId);

      // Small delay to ensure a different Date.now() if it were recreated
      const secondDate = service.startProgram(testUserId);

      expect(firstDate.getTime()).toBe(secondDate.getTime());
    });

    it('should return false for unknown user', () => {
      expect(service.isProgramActive('unknown_user_xyz')).toBe(false);
    });

    it('should track multiple users independently', () => {
      const userId2 = 'user_test_456';

      service.startProgram(testUserId);
      expect(service.isProgramActive(testUserId)).toBe(true);
      expect(service.isProgramActive(userId2)).toBe(false);

      service.startProgram(userId2);
      expect(service.isProgramActive(userId2)).toBe(true);

      service.resetUserData(userId2);
    });
  });

  // ==========================================================================
  // startSession()
  // ==========================================================================
  describe('startSession()', () => {
    it('should start a session with morning context', () => {
      const session = service.startSession(testUserId, 'morning');

      expect(session.id).toMatch(/^att_\d+_/);
      expect(session.userId).toBe(testUserId);
      expect(session.timestamp).toBeInstanceOf(Date);
      expect(session.duration).toBe(0);
      expect(session.phasesCompleted).toEqual([]);
      expect(session.completed).toBe(false);
      expect(session.context).toBe('morning');
    });

    it('should start a session with afternoon context', () => {
      const session = service.startSession(testUserId, 'afternoon');
      expect(session.context).toBe('afternoon');
    });

    it('should start a session with evening context', () => {
      const session = service.startSession(testUserId, 'evening');
      expect(session.context).toBe('evening');
    });

    it('should auto-start the program if not started', () => {
      expect(service.isProgramActive(testUserId)).toBe(false);

      service.startSession(testUserId, 'morning');

      expect(service.isProgramActive(testUserId)).toBe(true);
    });

    it('should not reset program start date if already started', () => {
      const startDate = service.startProgram(testUserId);
      service.startSession(testUserId, 'morning');

      const progress = service.getProgress(testUserId);
      expect(progress.startDate.getTime()).toBe(startDate.getTime());
    });

    it('should generate unique session ids', () => {
      const session1 = service.startSession(testUserId, 'morning');
      const session2 = service.startSession(testUserId, 'afternoon');

      expect(session1.id).not.toBe(session2.id);
    });
  });

  // ==========================================================================
  // completeSession()
  // ==========================================================================
  describe('completeSession()', () => {
    it('should complete a session with all three phases', () => {
      const started = service.startSession(testUserId, 'morning');
      const completed = service.completeSession(
        testUserId,
        started.id,
        ['selective', 'switching', 'divided'],
        8,
        5,
        3,
        'Good session'
      );

      expect(completed.id).toBe(started.id);
      expect(completed.userId).toBe(testUserId);
      expect(completed.completed).toBe(true);
      expect(completed.phasesCompleted).toEqual(['selective', 'switching', 'divided']);
      expect(completed.attentionRating).toBe(8);
      expect(completed.difficultyRating).toBe(5);
      expect(completed.distractionsCount).toBe(3);
      expect(completed.notes).toBe('Good session');
      expect(completed.duration).toBe(720); // 300 + 300 + 120
    });

    it('should mark as incomplete when not all phases completed', () => {
      const started = service.startSession(testUserId, 'afternoon');
      const completed = service.completeSession(
        testUserId,
        started.id,
        ['selective', 'switching'],
        6,
        4
      );

      expect(completed.completed).toBe(false);
      expect(completed.phasesCompleted).toEqual(['selective', 'switching']);
      expect(completed.duration).toBe(600); // 300 + 300
    });

    it('should handle session with only selective phase', () => {
      const started = service.startSession(testUserId, 'morning');
      const completed = service.completeSession(
        testUserId,
        started.id,
        ['selective']
      );

      expect(completed.completed).toBe(false);
      expect(completed.duration).toBe(300);
    });

    it('should handle session with no phases (empty array)', () => {
      const started = service.startSession(testUserId, 'morning');
      const completed = service.completeSession(
        testUserId,
        started.id,
        []
      );

      expect(completed.completed).toBe(false);
      expect(completed.duration).toBe(0);
    });

    it('should accept optional ratings as undefined', () => {
      const started = service.startSession(testUserId, 'morning');
      const completed = service.completeSession(
        testUserId,
        started.id,
        ['selective', 'switching', 'divided']
      );

      expect(completed.completed).toBe(true);
      expect(completed.attentionRating).toBeUndefined();
      expect(completed.difficultyRating).toBeUndefined();
      expect(completed.distractionsCount).toBeUndefined();
      expect(completed.notes).toBeUndefined();
    });

    it('should add session to user session history', () => {
      const started = service.startSession(testUserId, 'morning');
      service.completeSession(
        testUserId,
        started.id,
        ['selective', 'switching', 'divided'],
        7
      );

      const history = service.getSessionHistory(testUserId);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(started.id);
    });

    it('should accumulate multiple sessions', () => {
      for (let i = 0; i < 3; i++) {
        const started = service.startSession(testUserId, 'morning');
        service.completeSession(
          testUserId,
          started.id,
          ['selective', 'switching', 'divided'],
          5 + i
        );
      }

      const history = service.getSessionHistory(testUserId);
      expect(history).toHaveLength(3);
    });
  });

  // ==========================================================================
  // getProgress()
  // ==========================================================================
  describe('getProgress()', () => {
    it('should return default progress for new user', () => {
      const progress = service.getProgress(testUserId);

      expect(progress.userId).toBe(testUserId);
      expect(progress.totalSessions).toBe(0);
      expect(progress.currentStreak).toBe(0);
      expect(progress.bestStreak).toBe(0);
      expect(progress.avgAttentionRating).toBe(0);
      expect(progress.avgDifficultyRating).toBe(0);
      expect(progress.sessionsThisWeek).toBe(0);
      expect(progress.targetSessionsPerWeek).toBe(14); // 2 per day * 7
      expect(progress.trend).toBe('stable');
      expect(progress.weekNumber).toBe(1);
      expect(progress.startDate).toBeInstanceOf(Date);
    });

    it('should count only completed sessions in totalSessions', () => {
      // Complete session (all 3 phases)
      const s1 = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s1.id, ['selective', 'switching', 'divided'], 7);

      // Incomplete session (only 2 phases)
      const s2 = service.startSession(testUserId, 'afternoon');
      service.completeSession(testUserId, s2.id, ['selective', 'switching'], 5);

      const progress = service.getProgress(testUserId);
      expect(progress.totalSessions).toBe(1); // Only the complete one
    });

    it('should calculate average attention rating from completed sessions', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      const s1 = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s1.id, phases, 6);

      const s2 = service.startSession(testUserId, 'afternoon');
      service.completeSession(testUserId, s2.id, phases, 8);

      const progress = service.getProgress(testUserId);
      expect(progress.avgAttentionRating).toBe(7); // (6 + 8) / 2
    });

    it('should calculate average difficulty rating', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      const s1 = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s1.id, phases, 7, 4);

      const s2 = service.startSession(testUserId, 'afternoon');
      service.completeSession(testUserId, s2.id, phases, 8, 6);

      const progress = service.getProgress(testUserId);
      expect(progress.avgDifficultyRating).toBe(5); // (4 + 6) / 2
    });

    it('should calculate target sessions per week based on config', () => {
      const customService = new ATTService({ targetSessionsPerDay: 3 });
      const progress = customService.getProgress(testUserId);
      expect(progress.targetSessionsPerWeek).toBe(21); // 3 * 7
    });

    it('should count sessions this week', () => {
      // Complete a session now (should count for this week)
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];
      const s1 = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s1.id, phases, 7);

      const progress = service.getProgress(testUserId);
      expect(progress.sessionsThisWeek).toBeGreaterThanOrEqual(1);
    });

    it('should return week 1 for newly started program', () => {
      service.startProgram(testUserId);
      const progress = service.getProgress(testUserId);
      expect(progress.weekNumber).toBe(1);
    });
  });

  // ==========================================================================
  // getTips()
  // ==========================================================================
  describe('getTips()', () => {
    it('should return adherence tips when sessions are low', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 3,
        currentStreak: 1,
        bestStreak: 1,
        avgAttentionRating: 5,
        avgDifficultyRating: 5,
        sessionsThisWeek: 3, // Less than 50% of 14
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 2,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.some(t => t.includes('дважды в день'))).toBe(true);
    });

    it('should return difficulty tips when difficulty is high', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 10,
        currentStreak: 3,
        bestStreak: 5,
        avgAttentionRating: 6,
        avgDifficultyRating: 8, // > 7
        sessionsThisWeek: 10,
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 2,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.some(t => t.includes('нормально') || t.includes('коротких'))).toBe(true);
    });

    it('should return attention tips when attention is low after many sessions', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 10, // > 7
        currentStreak: 3,
        bestStreak: 5,
        avgAttentionRating: 4, // < 5
        avgDifficultyRating: 5,
        sessionsThisWeek: 10,
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 2,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.some(t => t.includes('тихом') || t.includes('звуков'))).toBe(true);
    });

    it('should return week 1 tips during first week', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 2,
        currentStreak: 1,
        bestStreak: 1,
        avgAttentionRating: 5,
        avgDifficultyRating: 5,
        sessionsThisWeek: 10,
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 1,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.some(t => t.includes('Первая неделя'))).toBe(true);
    });

    it('should return congratulation tip for week 4+ with improving trend', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 40,
        currentStreak: 10,
        bestStreak: 10,
        avgAttentionRating: 8,
        avgDifficultyRating: 3,
        sessionsThisWeek: 12,
        targetSessionsPerWeek: 14,
        trend: 'improving',
        weekNumber: 4,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.some(t => t.includes('прогресс'))).toBe(true);
    });

    it('should return streak tip for 7+ day streak', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 20,
        currentStreak: 10, // >= 7
        bestStreak: 10,
        avgAttentionRating: 7,
        avgDifficultyRating: 4,
        sessionsThisWeek: 12,
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 3,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.some(t => t.includes('10 дней подряд'))).toBe(true);
    });

    it('should return at most 3 tips', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 10,
        currentStreak: 10,
        bestStreak: 10,
        avgAttentionRating: 3,
        avgDifficultyRating: 9,
        sessionsThisWeek: 2,
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 1,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips.length).toBeLessThanOrEqual(3);
    });

    it('should return empty tips array when no conditions met', () => {
      const progress: IATTProgress = {
        userId: testUserId,
        totalSessions: 5,
        currentStreak: 3,
        bestStreak: 5,
        avgAttentionRating: 7,
        avgDifficultyRating: 5,
        sessionsThisWeek: 10,
        targetSessionsPerWeek: 14,
        trend: 'stable',
        weekNumber: 2,
        startDate: new Date(),
      };

      const tips = service.getTips(progress);
      expect(tips).toEqual([]);
    });
  });

  // ==========================================================================
  // getSessionHistory()
  // ==========================================================================
  describe('getSessionHistory()', () => {
    it('should return empty array for new user', () => {
      const history = service.getSessionHistory(testUserId);
      expect(history).toEqual([]);
    });

    it('should return sessions sorted by timestamp descending', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 3; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 5 + i);
      }

      const history = service.getSessionHistory(testUserId);
      expect(history).toHaveLength(3);

      for (let i = 0; i < history.length - 1; i++) {
        expect(new Date(history[i].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(history[i + 1].timestamp).getTime());
      }
    });

    it('should respect limit parameter', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 5; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 6);
      }

      const limited = service.getSessionHistory(testUserId, 2);
      expect(limited).toHaveLength(2);
    });

    it('should return all sessions when limit exceeds total', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 3; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 7);
      }

      const history = service.getSessionHistory(testUserId, 100);
      expect(history).toHaveLength(3);
    });

    it('should return all sessions when no limit specified', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 4; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 7);
      }

      const history = service.getSessionHistory(testUserId);
      expect(history).toHaveLength(4);
    });
  });

  // ==========================================================================
  // getCSDIntegrationData()
  // ==========================================================================
  describe('getCSDIntegrationData()', () => {
    it('should return unavailable when fewer than 7 sessions', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 5; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 7);
      }

      const data = service.getCSDIntegrationData(testUserId);

      expect(data.available).toBe(false);
      expect(data.attentionControl).toBe(0);
      expect(data.adherence).toBe(0);
      expect(data.trend).toBe('stable');
    });

    it('should return unavailable for unknown user', () => {
      const data = service.getCSDIntegrationData('unknown_user');

      expect(data.available).toBe(false);
      expect(data.attentionControl).toBe(0);
      expect(data.adherence).toBe(0);
      expect(data.trend).toBe('stable');
    });

    it('should return available data when 7+ sessions exist', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 8; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 8, 4);
      }

      const data = service.getCSDIntegrationData(testUserId);

      expect(data.available).toBe(true);
      expect(data.attentionControl).toBe(0.8); // 8 / 10
      expect(data.adherence).toBeGreaterThan(0);
      expect(['improving', 'stable', 'declining']).toContain(data.trend);
    });

    it('should normalize attention control to 0-1 range', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 10; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 10, 5);
      }

      const data = service.getCSDIntegrationData(testUserId);

      expect(data.attentionControl).toBeLessThanOrEqual(1);
      expect(data.attentionControl).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // recordPartialSession()
  // ==========================================================================
  describe('recordPartialSession()', () => {
    it('should record a partial session', () => {
      service.startProgram(testUserId);
      const partial = service.recordPartialSession(
        testUserId,
        ['selective'],
        'Interrupted by phone call'
      );

      expect(partial.id).toMatch(/^att_partial_\d+$/);
      expect(partial.userId).toBe(testUserId);
      expect(partial.completed).toBe(false);
      expect(partial.phasesCompleted).toEqual(['selective']);
      expect(partial.duration).toBe(300);
      expect(partial.notes).toBe('Interrupted by phone call');
    });

    it('should add partial session to history', () => {
      service.startProgram(testUserId);
      service.recordPartialSession(testUserId, ['selective', 'switching']);

      const history = service.getSessionHistory(testUserId);
      expect(history).toHaveLength(1);
      expect(history[0].completed).toBe(false);
    });
  });

  // ==========================================================================
  // Instructions and Guidance
  // ==========================================================================
  describe('Instructions and Guidance', () => {
    it('should return preparation instructions', () => {
      const instructions = service.getPreparationInstructions();

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('Подготовка');
      expect(instructions.join('\n')).toContain('ОТКРЫТЫМИ');
      expect(instructions.join('\n')).toContain('6-9');
    });

    it('should return selective phase instructions', () => {
      const instructions = service.getPhaseInstructions('selective');

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('Избирательное внимание');
    });

    it('should return switching phase instructions', () => {
      const instructions = service.getPhaseInstructions('switching');

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('Переключение внимания');
    });

    it('should return divided phase instructions', () => {
      const instructions = service.getPhaseInstructions('divided');

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('Разделённое внимание');
    });

    it('should return audio script', () => {
      const script = service.getAudioScript();

      expect(script.length).toBeGreaterThan(0);
      expect(script[0].phase).toBe('selective');
      expect(script[0].timeOffset).toBe(0);
      expect(script[0].textRu).toBeTruthy();
    });

    it('should return a copy of audio script (immutability)', () => {
      const script1 = service.getAudioScript();
      const script2 = service.getAudioScript();

      expect(script1).not.toBe(script2);
      expect(script1).toEqual(script2);
    });

    it('should return sleep application guidance', () => {
      const guidance = service.getSleepApplicationGuidance();

      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance[0]).toContain('ATT');
      expect(guidance.join('\n')).toContain('НЕ практикуйте');
    });
  });

  // ==========================================================================
  // Trend Calculation
  // ==========================================================================
  describe('Trend Calculation', () => {
    it('should return stable trend with fewer than 4 completed rated sessions', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      for (let i = 0; i < 3; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 5);
      }

      const progress = service.getProgress(testUserId);
      expect(progress.trend).toBe('stable');
    });

    it('should detect improving trend', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      // First half: low ratings
      for (let i = 0; i < 4; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 3);
      }

      // Second half: high ratings
      for (let i = 0; i < 4; i++) {
        const s = service.startSession(testUserId, 'afternoon');
        service.completeSession(testUserId, s.id, phases, 8);
      }

      const progress = service.getProgress(testUserId);
      expect(progress.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      // First half: high ratings
      for (let i = 0; i < 4; i++) {
        const s = service.startSession(testUserId, 'morning');
        service.completeSession(testUserId, s.id, phases, 8);
      }

      // Second half: low ratings
      for (let i = 0; i < 4; i++) {
        const s = service.startSession(testUserId, 'afternoon');
        service.completeSession(testUserId, s.id, phases, 3);
      }

      const progress = service.getProgress(testUserId);
      expect(progress.trend).toBe('declining');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle completing a session before starting a program', () => {
      // completeSession works even without explicit startProgram
      const session = service.startSession(testUserId, 'morning');
      const completed = service.completeSession(
        testUserId,
        session.id,
        ['selective', 'switching', 'divided'],
        7
      );

      expect(completed.completed).toBe(true);
      expect(service.isProgramActive(testUserId)).toBe(true);
    });

    it('should handle empty userId', () => {
      const session = service.startSession('', 'morning');
      expect(session.userId).toBe('');

      const completed = service.completeSession(
        '',
        session.id,
        ['selective', 'switching', 'divided'],
        5
      );
      expect(completed.userId).toBe('');
    });

    it('should handle getProgress for user with no sessions', () => {
      const progress = service.getProgress('nonexistent_user');

      expect(progress.totalSessions).toBe(0);
      expect(progress.currentStreak).toBe(0);
      expect(progress.bestStreak).toBe(0);
      expect(progress.avgAttentionRating).toBe(0);
      expect(progress.avgDifficultyRating).toBe(0);
      expect(progress.sessionsThisWeek).toBe(0);
    });

    it('should handle getSessionHistory for unknown user', () => {
      const history = service.getSessionHistory('nonexistent_user');
      expect(history).toEqual([]);
    });

    it('should handle getCSDIntegrationData for unknown user', () => {
      const data = service.getCSDIntegrationData('nonexistent_user');
      expect(data.available).toBe(false);
    });

    it('should reset user data completely', () => {
      service.startProgram(testUserId);
      const s = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s.id, ['selective', 'switching', 'divided'], 7);

      expect(service.isProgramActive(testUserId)).toBe(true);
      expect(service.getSessionHistory(testUserId)).toHaveLength(1);

      service.resetUserData(testUserId);

      expect(service.isProgramActive(testUserId)).toBe(false);
      expect(service.getSessionHistory(testUserId)).toEqual([]);
      expect(service.getProgress(testUserId).totalSessions).toBe(0);
    });

    it('should handle resetting data for unknown user without error', () => {
      expect(() => service.resetUserData('unknown_user')).not.toThrow();
    });

    it('should handle sessions without attention ratings in averages', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];

      // Session without ratings
      const s1 = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s1.id, phases);

      // Session with ratings
      const s2 = service.startSession(testUserId, 'afternoon');
      service.completeSession(testUserId, s2.id, phases, 8, 6);

      const progress = service.getProgress(testUserId);
      expect(progress.avgAttentionRating).toBe(8); // Only rated session counts
      expect(progress.avgDifficultyRating).toBe(6);
    });
  });

  // ==========================================================================
  // Streak Calculation
  // ==========================================================================
  describe('Streak Calculation', () => {
    it('should have zero streak with no sessions', () => {
      const progress = service.getProgress(testUserId);
      expect(progress.currentStreak).toBe(0);
      expect(progress.bestStreak).toBe(0);
    });

    it('should count current streak for session completed today', () => {
      const phases: ('selective' | 'switching' | 'divided')[] = ['selective', 'switching', 'divided'];
      const s = service.startSession(testUserId, 'morning');
      service.completeSession(testUserId, s.id, phases, 7);

      const progress = service.getProgress(testUserId);
      // Session is today, so current streak should be at least 1
      expect(progress.currentStreak).toBeGreaterThanOrEqual(1);
      expect(progress.bestStreak).toBeGreaterThanOrEqual(1);
    });

    it('should not count incomplete sessions in streak', () => {
      // Only record partial sessions (not completed)
      service.startProgram(testUserId);
      service.recordPartialSession(testUserId, ['selective']);

      const progress = service.getProgress(testUserId);
      expect(progress.currentStreak).toBe(0);
      expect(progress.bestStreak).toBe(0);
    });
  });

  // ==========================================================================
  // Factory and Singleton
  // ==========================================================================
  describe('Factory and Singleton', () => {
    it('should create service via factory', () => {
      const created = createATTService({ dividedDuration: 180 });

      expect(created).toBeInstanceOf(ATTService);
      expect(created.getConfig().dividedDuration).toBe(180);
    });

    it('should create service via factory with no args', () => {
      const created = createATTService();

      expect(created).toBeInstanceOf(ATTService);
      expect(created.getConfig()).toEqual(DEFAULT_ATT_CONFIG);
    });

    it('should export singleton instance', () => {
      expect(attService).toBeInstanceOf(ATTService);
    });

    it('should be able to use singleton', () => {
      const session = attService.startSession('singleton_user', 'morning');
      expect(session.userId).toBe('singleton_user');
      attService.resetUserData('singleton_user');
    });
  });
});
