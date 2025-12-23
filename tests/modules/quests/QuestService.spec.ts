/**
 * QuestService Unit Tests
 * =======================
 *
 * Tests for gamification quest system.
 */

import { QuestService, DEFAULT_QUESTS, IQuest } from '../../../src/modules/quests/QuestService';

describe('QuestService', () => {
  let service: QuestService;

  beforeEach(() => {
    service = new QuestService();
  });

  describe('constructor', () => {
    it('should load default quests', () => {
      const quests = service.getAllQuests();
      expect(quests.length).toBe(DEFAULT_QUESTS.length);
      expect(quests.length).toBe(10);
    });

    it('should accept custom quests', () => {
      const customQuest: IQuest = {
        id: 'custom_quest',
        title: 'Custom Quest',
        description: 'Test quest',
        icon: '🎯',
        category: 'sleep',
        difficulty: 'easy',
        durationDays: 7,
        progressType: 'cumulative',
        targetMetric: 'custom_metric',
        targetValue: 5,
        reward: { xp: 50 },
      };

      const serviceWithCustom = new QuestService([customQuest]);
      expect(serviceWithCustom.getQuest('custom_quest')).toBeDefined();
      expect(serviceWithCustom.getAllQuests().length).toBe(DEFAULT_QUESTS.length + 1);
    });
  });

  describe('getAvailableQuests', () => {
    it('should return available quests for new user', () => {
      const available = service.getAvailableQuests('user123');
      expect(available.length).toBeLessThanOrEqual(5);
      expect(available.length).toBeGreaterThan(0);
    });

    it('should exclude active quests', () => {
      service.startQuest('user123', 'diary_streak_7');
      const available = service.getAvailableQuests('user123');
      expect(available.find((q) => q.id === 'diary_streak_7')).toBeUndefined();
    });

    it('should exclude completed quests', () => {
      // Start and complete a quest
      service.startQuest('user123', 'diary_streak_7');
      for (let i = 0; i < 7; i++) {
        service.updateProgress('user123', 'diary_entries');
      }

      const available = service.getAvailableQuests('user123');
      expect(available.find((q) => q.id === 'diary_streak_7')).toBeUndefined();
    });
  });

  describe('startQuest', () => {
    it('should start a quest successfully', () => {
      const activeQuest = service.startQuest('user123', 'diary_streak_7');

      expect(activeQuest).toBeDefined();
      expect(activeQuest!.questId).toBe('diary_streak_7');
      expect(activeQuest!.userId).toBe('user123');
      expect(activeQuest!.status).toBe('active');
      expect(activeQuest!.progress.currentValue).toBe(0);
    });

    it('should return null for non-existent quest', () => {
      const result = service.startQuest('user123', 'non_existent');
      expect(result).toBeNull();
    });

    it('should prevent starting same quest twice', () => {
      service.startQuest('user123', 'diary_streak_7');
      const second = service.startQuest('user123', 'diary_streak_7');
      expect(second).toBeNull();
    });

    it('should limit active quests to 3', () => {
      service.startQuest('user123', 'diary_streak_7');
      service.startQuest('user123', 'digital_detox_3d');
      service.startQuest('user123', 'voice_diary_5');

      const fourth = service.startQuest('user123', 'sleep_7h_5d');
      expect(fourth).toBeNull();
    });

    it('should prevent starting completed quest', () => {
      // Complete a quest first
      service.startQuest('user123', 'diary_streak_7');
      for (let i = 0; i < 7; i++) {
        service.updateProgress('user123', 'diary_entries');
      }

      const restart = service.startQuest('user123', 'diary_streak_7');
      expect(restart).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should update streak progress', () => {
      service.startQuest('user123', 'diary_streak_7');

      // Day 1
      service.updateProgress('user123', 'diary_entries');
      const active = service.getActiveQuests('user123')[0];
      expect(active.progress.currentValue).toBe(1);
      expect(active.progress.consecutiveDays).toBe(1);
    });

    it('should update cumulative progress', () => {
      service.startQuest('user123', 'voice_diary_5');

      service.updateProgress('user123', 'voice_entries');
      service.updateProgress('user123', 'voice_entries');

      const active = service.getActiveQuests('user123')[0];
      expect(active.progress.currentValue).toBe(2);
    });

    it('should not update for different metric', () => {
      service.startQuest('user123', 'diary_streak_7');
      service.updateProgress('user123', 'wrong_metric');

      const active = service.getActiveQuests('user123')[0];
      expect(active.progress.currentValue).toBe(0);
    });

    it('should complete quest when target reached', () => {
      service.startQuest('user123', 'voice_diary_5');

      for (let i = 0; i < 5; i++) {
        const results = service.updateProgress('user123', 'voice_entries');
        if (i === 4) {
          expect(results.length).toBe(1);
          expect(results[0].completed).toBe(true);
          expect(results[0].quest.id).toBe('voice_diary_5');
          expect(results[0].reward).toBeDefined();
        }
      }

      // Should be in completed list
      const completed = service.getCompletedQuestIds('user123');
      expect(completed).toContain('voice_diary_5');
    });

    it('should return celebration message on completion', () => {
      service.startQuest('user123', 'voice_diary_5');

      let lastResult;
      for (let i = 0; i < 5; i++) {
        const results = service.updateProgress('user123', 'voice_entries');
        if (results.length > 0) lastResult = results[0];
      }

      expect(lastResult!.celebrationMessage).toBeDefined();
      expect(lastResult!.celebrationMessage!.length).toBeGreaterThan(0);
    });
  });

  describe('streak progress', () => {
    it('should not count multiple updates on same day', () => {
      service.startQuest('user123', 'diary_streak_7');

      service.updateProgress('user123', 'diary_entries');
      service.updateProgress('user123', 'diary_entries');
      service.updateProgress('user123', 'diary_entries');

      const active = service.getActiveQuests('user123')[0];
      expect(active.progress.currentValue).toBe(1); // Still just 1
    });
  });

  describe('getProgressPercentage', () => {
    it('should calculate progress percentage', () => {
      service.startQuest('user123', 'voice_diary_5');
      service.updateProgress('user123', 'voice_entries');
      service.updateProgress('user123', 'voice_entries');

      const active = service.getActiveQuests('user123')[0];
      const percentage = service.getProgressPercentage(active);
      expect(percentage).toBe(40); // 2/5 = 40%
    });

    it('should cap at 100%', () => {
      service.startQuest('user123', 'voice_diary_5');
      for (let i = 0; i < 10; i++) {
        service.updateProgress('user123', 'voice_entries');
      }

      // Quest is completed and removed, but if we could check...
      // This test verifies the cap logic exists
      const activeQuest = {
        id: 'test',
        odzyskuestId: 'test',
        userId: 'user123',
        questId: 'test',
        startedAt: new Date(),
        expiresAt: new Date(),
        status: 'active' as const,
        progress: {
          currentValue: 10,
          targetValue: 5,
          consecutiveDays: 0,
          lastUpdateDate: '',
          history: [],
        },
      };

      const percentage = service.getProgressPercentage(activeQuest);
      expect(percentage).toBe(100);
    });
  });

  describe('getDaysRemaining', () => {
    it('should calculate days remaining', () => {
      const activeQuest = service.startQuest('user123', 'diary_streak_7')!;
      const remaining = service.getDaysRemaining(activeQuest);

      // Should be close to 7 days (might be 6 depending on timing)
      expect(remaining).toBeGreaterThanOrEqual(6);
      expect(remaining).toBeLessThanOrEqual(7);
    });

    it('should return 0 for expired quest', () => {
      const expiredQuest = {
        id: 'test',
        odzyskuestId: 'test',
        userId: 'user123',
        questId: 'test',
        startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1000),
        status: 'active' as const,
        progress: {
          currentValue: 0,
          targetValue: 5,
          consecutiveDays: 0,
          lastUpdateDate: '',
          history: [],
        },
      };

      const remaining = service.getDaysRemaining(expiredQuest);
      expect(remaining).toBe(0);
    });
  });

  describe('formatQuestMessage', () => {
    it('should format quest message', () => {
      const quest = service.getQuest('diary_streak_7')!;
      const message = service.formatQuestMessage(quest);

      expect(message).toContain(quest.title);
      expect(message).toContain(quest.description);
      expect(message).toContain('Легко');
      expect(message).toContain('7 дней');
      expect(message).toContain('75 XP');
    });

    it('should include progress for active quest', () => {
      const activeQuest = service.startQuest('user123', 'diary_streak_7')!;
      service.updateProgress('user123', 'diary_entries');

      const quest = service.getQuest('diary_streak_7')!;
      const updatedActive = service.getActiveQuests('user123')[0];
      const message = service.formatQuestMessage(quest, updatedActive);

      expect(message).toContain('Прогресс');
      expect(message).toContain('Осталось');
    });
  });

  describe('GDPR compliance', () => {
    it('should clear user data', () => {
      service.startQuest('user123', 'diary_streak_7');
      service.updateProgress('user123', 'diary_entries');

      service.clearUserData('user123');

      expect(service.getActiveQuests('user123')).toHaveLength(0);
      expect(service.getCompletedQuestIds('user123')).toHaveLength(0);
    });

    it('should export user data', () => {
      service.startQuest('user123', 'diary_streak_7');
      service.updateProgress('user123', 'diary_entries');

      const exported = service.exportUserData('user123');

      expect(exported.activeQuests.length).toBeGreaterThan(0);
      expect(Array.isArray(exported.completedQuestIds)).toBe(true);
    });
  });
});
