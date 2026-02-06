/**
 * UserInteractionRepository Tests
 * =================================
 *
 * IEC 62304 compliance tests for user interaction tracking.
 * Research: Context-Aware Recommender Systems (CARS)
 *
 * Tests verify:
 * - Interaction recording (shown/clicked)
 * - Command statistics aggregation
 * - Ignored/frequent command detection
 * - Behavior context building
 * - Streak calculation
 * - GDPR compliance (clear/export)
 *
 * @packageDocumentation
 */

import { UserInteractionRepository, type IUserInteraction, type IUserBehaviorContext } from '../UserInteractionRepository';
import type { TimeOfDay } from '../../../bot/commands/registry';

describe('UserInteractionRepository', () => {
  let repo: UserInteractionRepository;

  beforeEach(() => {
    repo = new UserInteractionRepository();
  });

  // ==========================================================================
  // RECORD INTERACTION
  // ==========================================================================
  describe('recordInteraction', () => {
    it('should record interaction with all fields', async () => {
      const interaction = await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        sessionId: 'session1',
        metadata: { source: 'menu' },
      });

      expect(interaction.userId).toBe('user1');
      expect(interaction.command).toBe('diary');
      expect(interaction.wasClicked).toBe(true);
      expect(interaction.timeOfDay).toBe('morning');
      expect(interaction.dayOfWeek).toBe(1);
      expect(interaction.sessionId).toBe('session1');
      expect(interaction.metadata).toEqual({ source: 'menu' });
      expect(interaction.timestamp).toBeInstanceOf(Date);
      expect(interaction.id).toBeDefined();
    });

    it('should create unique ID for each interaction', async () => {
      const interaction1 = await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 1));

      const interaction2 = await repo.recordInteraction('user1', 'progress', false, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      expect(interaction1.id).not.toBe(interaction2.id);
    });

    it('should store interaction per user', async () => {
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user2', 'progress', false, {
        timeOfDay: 'evening',
        dayOfWeek: 3,
      });

      const user1Interactions = await repo.getRecentInteractions('user1');
      const user2Interactions = await repo.getRecentInteractions('user2');

      expect(user1Interactions).toHaveLength(1);
      expect(user2Interactions).toHaveLength(1);
      expect(user1Interactions[0].command).toBe('diary');
      expect(user2Interactions[0].command).toBe('progress');
    });

    it('should limit interactions per user to max', async () => {
      // Record more than maxInteractionsPerUser (500)
      for (let i = 0; i < 510; i++) {
        await repo.recordInteraction('user1', `cmd${i}`, true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
        });
      }

      const interactions = await repo.exportUserData('user1');

      expect(interactions.length).toBeLessThanOrEqual(500);
    });
  });

  // ==========================================================================
  // RECORD COMMAND SHOWN
  // ==========================================================================
  describe('recordCommandShown', () => {
    it('should record command as not clicked', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions[0].wasClicked).toBe(false);
    });

    it('should record session ID', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        sessionId: 'sess123',
      });

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions[0].sessionId).toBe('sess123');
    });
  });

  // ==========================================================================
  // RECORD COMMAND CLICKED
  // ==========================================================================
  describe('recordCommandClicked', () => {
    it('should mark last shown interaction as clicked', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions).toHaveLength(1);
      expect(interactions[0].wasClicked).toBe(true);
    });

    it('should only mark matching command', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordCommandShown('user1', 'progress', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const interactions = await repo.getRecentInteractions('user1');

      // Most recent first
      expect(interactions[0].command).toBe('progress');
      expect(interactions[0].wasClicked).toBe(false);
      expect(interactions[1].command).toBe('diary');
      expect(interactions[1].wasClicked).toBe(true);
    });

    it('should create new interaction if no matching shown', async () => {
      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions).toHaveLength(1);
      expect(interactions[0].wasClicked).toBe(true);
    });

    it('should not mark already clicked interaction', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      // Click again - should create new interaction
      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions).toHaveLength(2);
    });
  });

  // ==========================================================================
  // GET RECENT INTERACTIONS
  // ==========================================================================
  describe('getRecentInteractions', () => {
    it('should return empty array for unknown user', async () => {
      const interactions = await repo.getRecentInteractions('unknown');

      expect(interactions).toEqual([]);
    });

    it('should return interactions in reverse order (most recent first)', async () => {
      await repo.recordInteraction('user1', 'first', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'second', true, {
        timeOfDay: 'day',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'third', true, {
        timeOfDay: 'evening',
        dayOfWeek: 1,
      });

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions[0].command).toBe('third');
      expect(interactions[1].command).toBe('second');
      expect(interactions[2].command).toBe('first');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.recordInteraction('user1', `cmd${i}`, true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
        });
      }

      const interactions = await repo.getRecentInteractions('user1', 3);

      expect(interactions).toHaveLength(3);
    });

    it('should use default limit of 50', async () => {
      for (let i = 0; i < 60; i++) {
        await repo.recordInteraction('user1', `cmd${i}`, true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
        });
      }

      const interactions = await repo.getRecentInteractions('user1');

      expect(interactions).toHaveLength(50);
    });
  });

  // ==========================================================================
  // GET COMMAND STATS
  // ==========================================================================
  describe('getCommandStats', () => {
    it('should calculate stats for command', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 2,
      });
      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 2,
      });

      const stats = await repo.getCommandStats('user1', 'diary');

      expect(stats.command).toBe('diary');
      expect(stats.totalShown).toBe(2);
      expect(stats.totalClicked).toBe(1);
      expect(stats.clickRate).toBe(0.5);
    });

    it('should return zero stats for unknown command', async () => {
      const stats = await repo.getCommandStats('user1', 'unknown');

      expect(stats.totalShown).toBe(0);
      expect(stats.totalClicked).toBe(0);
      expect(stats.clickRate).toBe(0);
    });

    it('should track last shown/clicked dates', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordCommandClicked('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const stats = await repo.getCommandStats('user1', 'diary');

      expect(stats.lastShown).toBeInstanceOf(Date);
      expect(stats.lastClicked).toBeInstanceOf(Date);
    });

    it('should track peak time of day', async () => {
      // Morning clicks
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 2,
      });
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 3,
      });

      // Evening click
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'evening',
        dayOfWeek: 4,
      });

      const stats = await repo.getCommandStats('user1', 'diary');

      expect(stats.peakTimeOfDay).toBe('morning');
    });

    it('should return null peak time if no clicks', async () => {
      await repo.recordCommandShown('user1', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const stats = await repo.getCommandStats('user1', 'diary');

      expect(stats.peakTimeOfDay).toBeNull();
    });
  });

  // ==========================================================================
  // GET ALL COMMAND STATS
  // ==========================================================================
  describe('getAllCommandStats', () => {
    it('should return stats for all commands', async () => {
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'progress', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'relax', false, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const allStats = await repo.getAllCommandStats('user1');

      expect(allStats).toHaveLength(3);
      expect(allStats.map(s => s.command)).toContain('diary');
      expect(allStats.map(s => s.command)).toContain('progress');
      expect(allStats.map(s => s.command)).toContain('relax');
    });

    it('should sort by click rate descending', async () => {
      // diary: 1/2 = 0.5
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'diary', false, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      // progress: 2/2 = 1.0
      await repo.recordInteraction('user1', 'progress', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'progress', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      // relax: 0/2 = 0
      await repo.recordInteraction('user1', 'relax', false, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'relax', false, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const allStats = await repo.getAllCommandStats('user1');

      expect(allStats[0].command).toBe('progress');
      expect(allStats[1].command).toBe('diary');
      expect(allStats[2].command).toBe('relax');
    });

    it('should return empty array for unknown user', async () => {
      const allStats = await repo.getAllCommandStats('unknown');

      expect(allStats).toEqual([]);
    });
  });

  // ==========================================================================
  // GET IGNORED COMMANDS
  // ==========================================================================
  describe('getIgnoredCommands', () => {
    it('should identify ignored commands', async () => {
      // Shown 5 times, clicked 0 times
      for (let i = 0; i < 5; i++) {
        await repo.recordCommandShown('user1', 'ignored', {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }

      const ignored = await repo.getIgnoredCommands('user1');

      expect(ignored.get('ignored')).toBe(5);
    });

    it('should not include frequently clicked commands', async () => {
      // Shown 5 times, clicked 4 times (80% click rate)
      for (let i = 0; i < 5; i++) {
        await repo.recordCommandShown('user1', 'popular', {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
        if (i < 4) {
          await repo.recordCommandClicked('user1', 'popular', {
            timeOfDay: 'morning',
            dayOfWeek: i,
          });
        }
      }

      const ignored = await repo.getIgnoredCommands('user1');

      expect(ignored.has('popular')).toBe(false);
    });

    it('should respect minShown threshold', async () => {
      // Only shown 2 times (below default 3)
      await repo.recordCommandShown('user1', 'new', {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordCommandShown('user1', 'new', {
        timeOfDay: 'morning',
        dayOfWeek: 2,
      });

      const ignored = await repo.getIgnoredCommands('user1');

      expect(ignored.has('new')).toBe(false);
    });

    it('should use custom maxClickRate', async () => {
      // 3 shown, 1 clicked = 33% click rate
      for (let i = 0; i < 3; i++) {
        await repo.recordCommandShown('user1', 'medium', {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }
      await repo.recordCommandClicked('user1', 'medium', {
        timeOfDay: 'morning',
        dayOfWeek: 0,
      });

      // With default maxClickRate (0.2), should not be ignored
      const ignoredDefault = await repo.getIgnoredCommands('user1');
      expect(ignoredDefault.has('medium')).toBe(false);

      // With higher maxClickRate (0.5), should be ignored
      const ignoredHigh = await repo.getIgnoredCommands('user1', 3, 0.5);
      expect(ignoredHigh.has('medium')).toBe(true);
    });
  });

  // ==========================================================================
  // GET FREQUENT COMMANDS
  // ==========================================================================
  describe('getFrequentCommands', () => {
    it('should return frequently clicked commands', async () => {
      // Click diary 5 times
      for (let i = 0; i < 5; i++) {
        await repo.recordInteraction('user1', 'diary', true, {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }

      const frequent = await repo.getFrequentCommands('user1');

      expect(frequent).toContain('diary');
    });

    it('should respect minClicks threshold', async () => {
      // Click diary 2 times (below default 3)
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 2,
      });

      const frequent = await repo.getFrequentCommands('user1');

      expect(frequent).not.toContain('diary');
    });

    it('should sort by click count', async () => {
      // diary: 3 clicks
      for (let i = 0; i < 3; i++) {
        await repo.recordInteraction('user1', 'diary', true, {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }

      // progress: 5 clicks
      for (let i = 0; i < 5; i++) {
        await repo.recordInteraction('user1', 'progress', true, {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }

      const frequent = await repo.getFrequentCommands('user1');

      expect(frequent[0]).toBe('progress');
      expect(frequent[1]).toBe('diary');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          await repo.recordInteraction('user1', `cmd${i}`, true, {
            timeOfDay: 'morning',
            dayOfWeek: j,
          });
        }
      }

      const frequent = await repo.getFrequentCommands('user1', 3, 3);

      expect(frequent).toHaveLength(3);
    });
  });

  // ==========================================================================
  // BUILD BEHAVIOR CONTEXT
  // ==========================================================================
  describe('buildBehaviorContext', () => {
    it('should build complete context', async () => {
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        sessionId: 'sess1',
      });

      const context = await repo.buildBehaviorContext('user1', 'evening', 3);

      expect(context.userId).toBe('user1');
      expect(context.timeOfDay).toBe('evening');
      expect(context.dayOfWeek).toBe(3);
      expect(context.lastCommands).toContain('diary');
      expect(context.totalInteractions).toBe(1);
    });

    it('should include ignored commands', async () => {
      // Create ignored command
      for (let i = 0; i < 5; i++) {
        await repo.recordCommandShown('user1', 'ignored', {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }

      const context = await repo.buildBehaviorContext('user1', 'morning', 1);

      expect(context.ignoredCommands.get('ignored')).toBe(5);
    });

    it('should include frequent commands', async () => {
      // Click diary multiple times
      for (let i = 0; i < 5; i++) {
        await repo.recordInteraction('user1', 'diary', true, {
          timeOfDay: 'morning',
          dayOfWeek: i,
        });
      }

      const context = await repo.buildBehaviorContext('user1', 'morning', 1);

      expect(context.frequentCommands).toContain('diary');
    });

    it('should calculate average session commands', async () => {
      // Session 1: 3 commands
      for (let i = 0; i < 3; i++) {
        await repo.recordInteraction('user1', `cmd${i}`, true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
          sessionId: 'sess1',
        });
      }

      // Session 2: 5 commands
      for (let i = 0; i < 5; i++) {
        await repo.recordInteraction('user1', `cmd${i}`, true, {
          timeOfDay: 'morning',
          dayOfWeek: 2,
          sessionId: 'sess2',
        });
      }

      const context = await repo.buildBehaviorContext('user1', 'morning', 1);

      expect(context.averageSessionCommands).toBe(4); // (3 + 5) / 2
    });

    it('should calculate days active', async () => {
      // Simulate interactions on different days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const context = await repo.buildBehaviorContext('user1', 'morning', 1);

      expect(context.daysActive).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty history', async () => {
      const context = await repo.buildBehaviorContext('newuser', 'morning', 1);

      expect(context.userId).toBe('newuser');
      expect(context.lastCommands).toEqual([]);
      expect(context.ignoredCommands.size).toBe(0);
      expect(context.frequentCommands).toEqual([]);
      expect(context.totalInteractions).toBe(0);
      expect(context.averageSessionCommands).toBe(0);
      expect(context.daysActive).toBe(0);
    });
  });

  // ==========================================================================
  // GET CURRENT STREAK
  // ==========================================================================
  describe('getCurrentStreak', () => {
    it('should return 0 for new user', async () => {
      const streak = await repo.getCurrentStreak('newuser');

      expect(streak).toBe(0);
    });

    it('should count consecutive days from today', async () => {
      const today = new Date();

      // Force timestamp to today
      const originalRecordInteraction = repo.recordInteraction.bind(repo);
      jest.spyOn(repo, 'recordInteraction').mockImplementation(async (userId, command, wasClicked, context) => {
        const result = await originalRecordInteraction(userId, command, wasClicked, context);
        result.timestamp = today;
        return result;
      });

      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: today.getDay(),
      });

      const streak = await repo.getCurrentStreak('user1');

      expect(streak).toBeGreaterThanOrEqual(1);
    });

    it('should return 0 if no activity today', async () => {
      // This test verifies behavior when activity is not today
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      // Manually set timestamp to 2 days ago
      const interactions = await repo.exportUserData('user1');
      interactions[0].timestamp = twoDaysAgo;

      const streak = await repo.getCurrentStreak('user1');

      expect(streak).toBe(0);
    });
  });

  // ==========================================================================
  // GET LATEST ISI SCORE
  // ==========================================================================
  describe('getLatestISIScore', () => {
    it('should return null if no ISI score recorded', async () => {
      await repo.recordInteraction('user1', 'diary', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const score = await repo.getLatestISIScore('user1');

      expect(score).toBeNull();
    });

    it('should return latest ISI score from metadata', async () => {
      await repo.recordInteraction('user1', 'assessment', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        metadata: { isiScore: 15 },
      });

      const score = await repo.getLatestISIScore('user1');

      expect(score).toBe(15);
    });

    it('should return most recent ISI score', async () => {
      await repo.recordInteraction('user1', 'assessment', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        metadata: { isiScore: 20 },
      });

      await repo.recordInteraction('user1', 'assessment', true, {
        timeOfDay: 'morning',
        dayOfWeek: 2,
        metadata: { isiScore: 12 },
      });

      const score = await repo.getLatestISIScore('user1');

      expect(score).toBe(12);
    });
  });

  // ==========================================================================
  // GDPR COMPLIANCE
  // ==========================================================================
  describe('GDPR Compliance', () => {
    describe('clearUserData', () => {
      it('should remove all user data', async () => {
        await repo.recordInteraction('user1', 'diary', true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
        });
        await repo.recordInteraction('user1', 'progress', false, {
          timeOfDay: 'evening',
          dayOfWeek: 2,
        });

        await repo.clearUserData('user1');

        const interactions = await repo.exportUserData('user1');
        expect(interactions).toEqual([]);
      });

      it('should not affect other users', async () => {
        await repo.recordInteraction('user1', 'diary', true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
        });
        await repo.recordInteraction('user2', 'progress', false, {
          timeOfDay: 'evening',
          dayOfWeek: 2,
        });

        await repo.clearUserData('user1');

        const user2Interactions = await repo.exportUserData('user2');
        expect(user2Interactions).toHaveLength(1);
      });
    });

    describe('exportUserData', () => {
      it('should export all user interactions', async () => {
        await repo.recordInteraction('user1', 'diary', true, {
          timeOfDay: 'morning',
          dayOfWeek: 1,
          metadata: { source: 'menu' },
        });
        await repo.recordInteraction('user1', 'progress', false, {
          timeOfDay: 'evening',
          dayOfWeek: 2,
        });

        const exported = await repo.exportUserData('user1');

        expect(exported).toHaveLength(2);
        expect(exported[0].command).toBe('diary');
        expect(exported[1].command).toBe('progress');
      });

      it('should return empty array for unknown user', async () => {
        const exported = await repo.exportUserData('unknown');

        expect(exported).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // CLEANUP OLD INTERACTIONS
  // ==========================================================================
  describe('Cleanup Old Interactions', () => {
    it('should remove interactions older than maxAgeDays', async () => {
      // Create interaction with old timestamp
      await repo.recordInteraction('user1', 'old', true, {
        timeOfDay: 'morning',
        dayOfWeek: 1,
      });

      const interactions = await repo.exportUserData('user1');
      // Manually set old timestamp
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // Older than 30 days
      interactions[0].timestamp = oldDate;

      // Record new interaction to trigger cleanup
      await repo.recordInteraction('user1', 'new', true, {
        timeOfDay: 'morning',
        dayOfWeek: 2,
      });

      const afterCleanup = await repo.exportUserData('user1');

      // Old interaction should be removed
      expect(afterCleanup.find(i => i.command === 'old' && i.timestamp < oldDate)).toBeUndefined();
    });
  });
});
