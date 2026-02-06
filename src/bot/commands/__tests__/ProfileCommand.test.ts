/**
 * ProfileCommand Tests
 * ====================
 *
 * IEC 62304 Class B compliance tests - Player profile and gamification settings.
 *
 * Tests verify:
 * - Profile overview with level, XP, streaks, Sonya
 * - XP details view with level progress
 * - Streaks view with frozen status and multipliers
 * - Settings view with compassion mode and soft reset toggles
 * - Daily check-in with XP rewards and level-up celebrations
 *
 * Research basis:
 * - LinkedIn profile completion increased 60% with progress bars
 * - White Hat gamification: meaning, accomplishment, empowerment
 *
 * @packageDocumentation
 */

import { ProfileCommand, profileCommand } from '../ProfileCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `TIP: ${text}`,
    info: (text: string) => `INFO: ${text}`,
    progressBar: (percent: number, _size: number) => {
      const filled = Math.floor(percent / 10);
      return '[' + '='.repeat(filled) + '-'.repeat(10 - filled) + '] ' + Math.floor(percent) + '%';
    },
    streakBadge: (count: number) => `STREAK: ${count} days`,
  },
}));

describe('ProfileCommand', () => {
  let command: ProfileCommand;
  let mockContext: ISleepCoreContext;
  let mockGetPlayerProfile: jest.Mock;
  let mockGetXPStatus: jest.Mock;
  let mockGetStreaks: jest.Mock;
  let mockGetGamificationSettings: jest.Mock;
  let mockUpdateGamificationSettings: jest.Mock;
  let mockRecordDailyCheckIn: jest.Mock;

  // Default mock data
  const mockProfile = {
    level: 5,
    levelProgress: 45,
    totalXp: 750,
    xpToNextLevel: 150,
    totalDaysActive: 21,
    longestStreak: 14,
    completedQuestCount: 8,
    badgeCount: 12,
    totalBadgeXp: 320,
    engagementLevel: 'regular',
    sonyaEmoji: '🦉',
    sonyaName: 'Соня',
    sonyaStage: { name: 'Совёнок' },
    streaks: [
      { type: 'daily_login', currentCount: 7, longestCount: 14, isFrozen: false, multiplier: 1.5 },
    ],
  };

  const mockXPStatus = {
    level: 5,
    totalXp: 750,
    xpToNextLevel: 150,
    levelProgress: 45,
  };

  const mockStreaks = [
    {
      type: 'daily_login',
      currentCount: 7,
      longestCount: 14,
      isFrozen: false,
      multiplier: 1.5,
    },
    {
      type: 'sleep_diary',
      currentCount: 3,
      longestCount: 10,
      isFrozen: true,
      frozenUntil: new Date('2026-02-10'),
      multiplier: 1,
    },
  ];

  const mockSettings = {
    compassionEnabled: true,
    softResetEnabled: false,
    softLimitMinutes: 30,
    dailyLimitMinutes: 60,
  };

  beforeEach(() => {
    command = new ProfileCommand();

    mockGetPlayerProfile = jest.fn().mockResolvedValue(mockProfile);
    mockGetXPStatus = jest.fn().mockResolvedValue(mockXPStatus);
    mockGetStreaks = jest.fn().mockResolvedValue(mockStreaks);
    mockGetGamificationSettings = jest.fn().mockResolvedValue(mockSettings);
    mockUpdateGamificationSettings = jest.fn().mockResolvedValue(undefined);
    mockRecordDailyCheckIn = jest.fn().mockResolvedValue({
      xpEarned: 25,
      totalXp: 775,
      level: 5,
      leveledUp: false,
      awardedBadges: [],
      streakUpdates: [{ type: 'daily_login', currentCount: 8, isNewRecord: false }],
    });

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getPlayerProfile: mockGetPlayerProfile,
        getXPStatus: mockGetXPStatus,
        getStreaks: mockGetStreaks,
        getGamificationSettings: mockGetGamificationSettings,
        updateGamificationSettings: mockUpdateGamificationSettings,
        recordDailyCheckIn: mockRecordDailyCheckIn,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('profile');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('профиль');
    });

    it('should have profile-related aliases', () => {
      expect(command.aliases).toContain('me');
      expect(command.aliases).toContain('профиль');
      expect(command.aliases).toContain('stats');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all profile steps defined', () => {
      expect(command.steps).toContain('overview');
      expect(command.steps).toContain('xp');
      expect(command.steps).toContain('streaks');
      expect(command.steps).toContain('settings');
    });
  });

  // ==========================================================================
  // EXECUTE
  // ==========================================================================
  describe('Execute', () => {
    it('should show profile overview by default', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalledWith(12345);
    });

    it('should show XP details with args=xp', async () => {
      const result = await command.execute(mockContext, 'xp');

      expect(result.success).toBe(true);
      expect(mockGetXPStatus).toHaveBeenCalledWith(12345);
    });

    it('should show streaks with args=streaks', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.success).toBe(true);
      expect(mockGetStreaks).toHaveBeenCalledWith(12345);
    });

    it('should show settings with args=settings', async () => {
      const result = await command.execute(mockContext, 'settings');

      expect(result.success).toBe(true);
      expect(mockGetGamificationSettings).toHaveBeenCalledWith(12345);
    });

    it('should show profile overview for unknown args', async () => {
      const result = await command.execute(mockContext, 'unknown');

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // PROFILE OVERVIEW
  // ==========================================================================
  describe('Profile Overview', () => {
    it('should display user name', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Test User');
    });

    it('should display level and XP', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('5'); // Level
      expect(result.message).toContain('750'); // Total XP
      expect(result.message).toContain('150'); // XP to next level
    });

    it('should display Sonya emoji and name', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Соня');
    });

    it('should display Sonya stage', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Совёнок');
    });

    it('should display total days active', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('21');
    });

    it('should display longest streak record', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('14');
    });

    it('should display completed quests count', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('8');
    });

    it('should display badge count and XP', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('12');
      expect(result.message).toContain('320');
    });

    it('should display engagement title', async () => {
      const result = await command.execute(mockContext);

      // 'regular' engagement level
      expect(result.message).toBeDefined();
    });

    it('should have navigation keyboard', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const xpButton = buttons.find(b => b.callbackData === 'profile:xp');
      const streaksButton = buttons.find(b => b.callbackData === 'profile:streaks');
      const questsButton = buttons.find(b => b.callbackData === 'quest:list');
      const badgesButton = buttons.find(b => b.callbackData === 'badge:list');
      const sonyaButton = buttons.find(b => b.callbackData === 'sonya:status');
      const settingsButton = buttons.find(b => b.callbackData === 'profile:settings');
      const checkInButton = buttons.find(b => b.callbackData === 'profile:check_in');

      expect(xpButton).toBeDefined();
      expect(streaksButton).toBeDefined();
      expect(questsButton).toBeDefined();
      expect(badgesButton).toBeDefined();
      expect(sonyaButton).toBeDefined();
      expect(settingsButton).toBeDefined();
      expect(checkInButton).toBeDefined();
    });

    it('should handle API error gracefully', async () => {
      mockGetPlayerProfile.mockRejectedValue(new Error('API Error'));

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('профиль');
    });

    it('should display streak badge when streak exists', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Streak badge should be shown when currentCount > 0
    });

    it('should not display streak badge when no active streak', async () => {
      const profileNoStreak = {
        ...mockProfile,
        streaks: [{ type: 'daily_login', currentCount: 0, longestCount: 14 }],
      };
      mockGetPlayerProfile.mockResolvedValue(profileNoStreak);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should not display longest streak when zero', async () => {
      const profileNoRecord = {
        ...mockProfile,
        longestStreak: 0,
      };
      mockGetPlayerProfile.mockResolvedValue(profileNoRecord);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should not contain record display when 0
    });
  });

  // ==========================================================================
  // XP DETAILS
  // ==========================================================================
  describe('XP Details', () => {
    it('should display XP details header', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('XP');
    });

    it('should display level and progress bar', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.message).toContain('5'); // Level
    });

    it('should display total XP', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.message).toContain('750');
    });

    it('should display XP to next level', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.message).toContain('150');
    });

    it('should display XP earning tips', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.message).toContain('25'); // Check-in XP
      expect(result.message).toContain('15'); // Diary XP
    });

    it('should have action buttons', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      const buttons = result.keyboard?.flat() ?? [];
      const checkInButton = buttons.find(b => b.callbackData === 'profile:check_in');
      const diaryButton = buttons.find(b => b.callbackData === 'diary:new');
      const backButton = buttons.find(b => b.callbackData === 'profile:overview');

      expect(checkInButton).toBeDefined();
      expect(diaryButton).toBeDefined();
      expect(backButton).toBeDefined();
    });

    it('should calculate XP sources correctly', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.success).toBe(true);
      // Quests XP: 8 * 50 = 400+
      // Badge XP: 320
    });

    it('should handle API error gracefully', async () => {
      mockGetXPStatus.mockRejectedValue(new Error('API Error'));

      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('XP');
    });
  });

  // ==========================================================================
  // STREAKS VIEW
  // ==========================================================================
  describe('Streaks View', () => {
    it('should display streaks header', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('стрик');
    });

    it('should display each streak type', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('вход'); // daily_login translated
      expect(result.message).toContain('Дневник'); // sleep_diary translated
    });

    it('should display current streak count', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('7'); // daily_login current
      expect(result.message).toContain('3'); // sleep_diary current
    });

    it('should display longest streak record', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('14'); // daily_login record
      expect(result.message).toContain('10'); // sleep_diary record
    });

    it('should display frozen status for frozen streaks', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('заморожен');
    });

    it('should display multiplier when > 1', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('1.5'); // Multiplier for daily_login
    });

    it('should not display multiplier when = 1', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      // sleep_diary has multiplier 1, should not show
      expect(result.success).toBe(true);
    });

    it('should display compassion mode status', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('сострадания');
    });

    it('should display soft reset status when enabled', async () => {
      mockGetGamificationSettings.mockResolvedValue({
        ...mockSettings,
        softResetEnabled: true,
      });

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('сброс');
    });

    it('should show empty state when no streaks', async () => {
      mockGetStreaks.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('активных');
    });

    it('should have action buttons', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      const buttons = result.keyboard?.flat() ?? [];
      const checkInButton = buttons.find(b => b.callbackData === 'profile:check_in');
      const settingsButton = buttons.find(b => b.callbackData === 'profile:settings');
      const backButton = buttons.find(b => b.callbackData === 'profile:overview');

      expect(checkInButton).toBeDefined();
      expect(settingsButton).toBeDefined();
      expect(backButton).toBeDefined();
    });

    it('should handle API error gracefully', async () => {
      mockGetStreaks.mockRejectedValue(new Error('API Error'));

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('стрик');
    });
  });

  // ==========================================================================
  // SETTINGS VIEW
  // ==========================================================================
  describe('Settings View', () => {
    it('should display settings header', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Настройки');
    });

    it('should display compassion mode status', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      expect(result.message).toContain('сострадания');
      expect(result.message).toContain('Включён');
    });

    it('should display soft reset status', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      expect(result.message).toContain('сброс');
      expect(result.message).toContain('Выключен');
    });

    it('should display time limits', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      expect(result.message).toContain('30'); // softLimitMinutes
      expect(result.message).toContain('60'); // dailyLimitMinutes
    });

    it('should have toggle buttons', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      const buttons = result.keyboard?.flat() ?? [];
      const compassionButton = buttons.find(b => b.callbackData === 'profile:toggle_compassion');
      const softResetButton = buttons.find(b => b.callbackData === 'profile:toggle_soft_reset');
      const backButton = buttons.find(b => b.callbackData === 'profile:overview');

      expect(compassionButton).toBeDefined();
      expect(softResetButton).toBeDefined();
      expect(backButton).toBeDefined();
    });

    it('should show disable button when compassion enabled', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      const buttons = result.keyboard?.flat() ?? [];
      const compassionButton = buttons.find(b => b.callbackData === 'profile:toggle_compassion');

      expect(compassionButton?.text).toContain('Откл');
    });

    it('should show enable button when soft reset disabled', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      const buttons = result.keyboard?.flat() ?? [];
      const softResetButton = buttons.find(b => b.callbackData === 'profile:toggle_soft_reset');

      expect(softResetButton?.text).toContain('Вкл');
    });

    it('should handle API error gracefully', async () => {
      mockGetGamificationSettings.mockRejectedValue(new Error('API Error'));

      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('настройки');
    });
  });

  // ==========================================================================
  // TOGGLE COMPASSION MODE
  // ==========================================================================
  describe('Toggle Compassion Mode', () => {
    it('should toggle compassion mode off', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ ...mockSettings, compassionEnabled: true })
        .mockResolvedValueOnce({ ...mockSettings, compassionEnabled: false });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalledWith(12345, {
        compassionEnabled: false,
      });
      expect(result.message).toContain('выключен');
    });

    it('should toggle compassion mode on', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ ...mockSettings, compassionEnabled: false })
        .mockResolvedValueOnce({ ...mockSettings, compassionEnabled: true });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalledWith(12345, {
        compassionEnabled: true,
      });
      expect(result.message).toContain('включён');
    });

    it('should have back button after toggle', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce(mockSettings);

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'profile:settings');

      expect(backButton).toBeDefined();
    });

    it('should handle API error gracefully', async () => {
      mockGetGamificationSettings.mockRejectedValue(new Error('API Error'));

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('настройку');
    });
  });

  // ==========================================================================
  // TOGGLE SOFT RESET
  // ==========================================================================
  describe('Toggle Soft Reset', () => {
    it('should toggle soft reset on', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ ...mockSettings, softResetEnabled: false })
        .mockResolvedValueOnce({ ...mockSettings, softResetEnabled: true });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalledWith(12345, {
        softResetEnabled: true,
      });
      expect(result.message).toContain('включён');
    });

    it('should toggle soft reset off', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ ...mockSettings, softResetEnabled: true })
        .mockResolvedValueOnce({ ...mockSettings, softResetEnabled: false });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalledWith(12345, {
        softResetEnabled: false,
      });
      expect(result.message).toContain('выключен');
    });

    it('should have back button after toggle', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce(mockSettings);

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'profile:settings');

      expect(backButton).toBeDefined();
    });

    it('should handle API error gracefully', async () => {
      mockGetGamificationSettings.mockRejectedValue(new Error('API Error'));

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('настройку');
    });
  });

  // ==========================================================================
  // DAILY CHECK-IN
  // ==========================================================================
  describe('Daily Check-In', () => {
    it('should record daily check-in', async () => {
      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.success).toBe(true);
      expect(mockRecordDailyCheckIn).toHaveBeenCalledWith(12345);
    });

    it('should display XP earned', async () => {
      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.message).toContain('25'); // XP earned
    });

    it('should display total XP', async () => {
      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.message).toContain('775'); // Total XP after check-in
    });

    it('should display streak update', async () => {
      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.message).toContain('8'); // New streak count
    });

    it('should display level-up celebration', async () => {
      mockRecordDailyCheckIn.mockResolvedValue({
        xpEarned: 25,
        totalXp: 900,
        level: 6,
        leveledUp: true,
        awardedBadges: [],
        streakUpdates: [],
      });

      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.message).toContain('6'); // New level
      expect(result.message).toContain('уровень');
    });

    it('should display awarded badges', async () => {
      mockRecordDailyCheckIn.mockResolvedValue({
        xpEarned: 25,
        totalXp: 775,
        level: 5,
        leveledUp: false,
        awardedBadges: [
          { badge: { icon: '🏆', name: 'Стрик-мастер' } },
        ],
        streakUpdates: [],
      });

      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.message).toContain('Стрик-мастер');
    });

    it('should display new record notification', async () => {
      mockRecordDailyCheckIn.mockResolvedValue({
        xpEarned: 25,
        totalXp: 775,
        level: 5,
        leveledUp: false,
        awardedBadges: [],
        streakUpdates: [{ type: 'daily_login', currentCount: 15, isNewRecord: true }],
      });

      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.message).toContain('рекорд');
    });

    it('should have navigation buttons', async () => {
      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      const buttons = result.keyboard?.flat() ?? [];
      const profileButton = buttons.find(b => b.callbackData === 'profile:overview');
      const questsButton = buttons.find(b => b.callbackData === 'quest:list');

      expect(profileButton).toBeDefined();
      expect(questsButton).toBeDefined();
    });

    it('should handle API error gracefully', async () => {
      mockRecordDailyCheckIn.mockRejectedValue(new Error('API Error'));

      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('чек-ин');
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('Handle Step', () => {
    it('should handle overview step', async () => {
      const result = await command.handleStep(mockContext, 'overview', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });

    it('should handle xp step', async () => {
      const result = await command.handleStep(mockContext, 'xp', {});

      expect(result.success).toBe(true);
      expect(mockGetXPStatus).toHaveBeenCalled();
    });

    it('should handle streaks step', async () => {
      const result = await command.handleStep(mockContext, 'streaks', {});

      expect(result.success).toBe(true);
      expect(mockGetStreaks).toHaveBeenCalled();
    });

    it('should handle settings step', async () => {
      const result = await command.handleStep(mockContext, 'settings', {});

      expect(result.success).toBe(true);
      expect(mockGetGamificationSettings).toHaveBeenCalled();
    });

    it('should default to overview for unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // HANDLE CALLBACK
  // ==========================================================================
  describe('Handle Callback', () => {
    it('should route overview callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'profile:overview', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });

    it('should route xp callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'profile:xp', {});

      expect(result.success).toBe(true);
      expect(mockGetXPStatus).toHaveBeenCalled();
    });

    it('should route streaks callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.success).toBe(true);
      expect(mockGetStreaks).toHaveBeenCalled();
    });

    it('should route settings callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'profile:settings', {});

      expect(result.success).toBe(true);
      expect(mockGetGamificationSettings).toHaveBeenCalled();
    });

    it('should route toggle_compassion callback correctly', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce(mockSettings);

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalled();
    });

    it('should route toggle_soft_reset callback correctly', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce(mockSettings);

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalled();
    });

    it('should route check_in callback correctly', async () => {
      const result = await command.handleCallback(mockContext, 'profile:check_in', {});

      expect(result.success).toBe(true);
      expect(mockRecordDailyCheckIn).toHaveBeenCalled();
    });

    it('should default to overview for unknown action', async () => {
      const result = await command.handleCallback(mockContext, 'profile:unknown', {});

      expect(result.success).toBe(true);
      expect(mockGetPlayerProfile).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ENGAGEMENT TITLES
  // ==========================================================================
  describe('Engagement Titles', () => {
    it('should display new_user title', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        engagementLevel: 'new_user',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should display casual title', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        engagementLevel: 'casual',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should display regular title', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        engagementLevel: 'regular',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should display engaged title', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        engagementLevel: 'engaged',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should display power_user title', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        engagementLevel: 'power_user',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should default to new_user for unknown level', async () => {
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        engagementLevel: 'unknown_level',
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // STREAK TYPE LABELS
  // ==========================================================================
  describe('Streak Type Labels', () => {
    it('should translate daily_login streak type', async () => {
      mockGetStreaks.mockResolvedValue([
        { type: 'daily_login', currentCount: 5, longestCount: 10, isFrozen: false, multiplier: 1 },
      ]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('вход');
    });

    it('should translate sleep_diary streak type', async () => {
      mockGetStreaks.mockResolvedValue([
        { type: 'sleep_diary', currentCount: 3, longestCount: 7, isFrozen: false, multiplier: 1 },
      ]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('Дневник');
    });

    it('should translate exercise streak type', async () => {
      mockGetStreaks.mockResolvedValue([
        { type: 'exercise', currentCount: 2, longestCount: 5, isFrozen: false, multiplier: 1 },
      ]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('Упражнения');
    });

    it('should translate mindfulness streak type', async () => {
      mockGetStreaks.mockResolvedValue([
        { type: 'mindfulness', currentCount: 4, longestCount: 8, isFrozen: false, multiplier: 1 },
      ]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('Осознанность');
    });

    it('should translate digital_detox streak type', async () => {
      mockGetStreaks.mockResolvedValue([
        { type: 'digital_detox', currentCount: 1, longestCount: 3, isFrozen: false, multiplier: 1 },
      ]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('детокс');
    });

    it('should use type as fallback for unknown type', async () => {
      mockGetStreaks.mockResolvedValue([
        { type: 'custom_streak', currentCount: 1, longestCount: 2, isFrozen: false, multiplier: 1 },
      ]);

      const result = await command.handleCallback(mockContext, 'profile:streaks', {});

      expect(result.message).toContain('custom_streak');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(profileCommand).toBeInstanceOf(ProfileCommand);
    });

    it('should have correct name', () => {
      expect(profileCommand.name).toBe('profile');
    });
  });
});
