/**
 * ProfileCommand Tests
 * ====================
 *
 * IEC 62304 Class B - User engagement tracking
 * White Hat Gamification principles (Octalysis)
 *
 * Tests verify:
 * - Profile overview display
 * - XP status and level progress
 * - Streak tracking and display
 * - Gamification settings (compassion mode, soft reset)
 * - Daily check-in functionality
 *
 * Research basis (Sprint 7):
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
    progressBar: (percent: number, total: number) =>
      `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}] ${Math.floor(percent)}%`,
    streakBadge: (count: number) => `🔥 ${count} дней подряд`,
    tip: (text: string) => `💡 ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
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

  // Sample profile data
  const sampleProfile = {
    level: 5,
    totalXp: 1500,
    levelProgress: 65,
    xpToNextLevel: 180,
    totalDaysActive: 28,
    longestStreak: 14,
    completedQuestCount: 12,
    badgeCount: 8,
    totalBadgeXp: 350,
    engagementLevel: 'regular',
    sonyaEmoji: '🦉',
    sonyaName: 'Соня',
    sonyaStage: { name: 'Подруга' },
    streaks: [
      { type: 'daily_login', currentCount: 7, longestCount: 14, isFrozen: false, multiplier: 1.5 },
    ],
  };

  const sampleXPStatus = {
    level: 5,
    totalXp: 1500,
    levelProgress: 65,
    xpToNextLevel: 180,
  };

  const sampleStreaks = [
    {
      type: 'daily_login',
      currentCount: 7,
      longestCount: 14,
      isFrozen: false,
      multiplier: 1.5,
    },
    {
      type: 'sleep_diary',
      currentCount: 5,
      longestCount: 10,
      isFrozen: false,
      multiplier: 1.2,
    },
  ];

  const sampleSettings = {
    compassionEnabled: true,
    softResetEnabled: false,
    softLimitMinutes: 30,
    dailyLimitMinutes: 60,
  };

  const sampleCheckInResult = {
    xpEarned: 25,
    totalXp: 1525,
    level: 5,
    leveledUp: false,
    awardedBadges: [],
    streakUpdates: [
      { type: 'daily_login', currentCount: 8, isNewRecord: false },
    ],
  };

  beforeEach(() => {
    command = new ProfileCommand();

    mockGetPlayerProfile = jest.fn().mockResolvedValue(sampleProfile);
    mockGetXPStatus = jest.fn().mockResolvedValue(sampleXPStatus);
    mockGetStreaks = jest.fn().mockResolvedValue(sampleStreaks);
    mockGetGamificationSettings = jest.fn().mockResolvedValue(sampleSettings);
    mockUpdateGamificationSettings = jest.fn().mockResolvedValue(undefined);
    mockRecordDailyCheckIn = jest.fn().mockResolvedValue(sampleCheckInResult);

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('profile');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Твой профиль игрока');
    });

    it('should have profile-related aliases', () => {
      expect(command.aliases).toContain('me');
      expect(command.aliases).toContain('профиль');
      expect(command.aliases).toContain('stats');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all steps defined', () => {
      expect(command.steps).toContain('overview');
      expect(command.steps).toContain('xp');
      expect(command.steps).toContain('streaks');
      expect(command.steps).toContain('settings');
    });
  });

  // ==========================================================================
  // PROFILE OVERVIEW
  // ==========================================================================
  describe('Profile Overview', () => {
    it('should show profile overview on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Профиль игрока');
    });

    it('should display user name', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Test User');
    });

    it('should show level and XP', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Уровень 5');
      expect(result.message).toContain('1500 XP');
    });

    it('should show level progress bar', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('█'); // Progress bar
    });

    it('should show XP to next level', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('180 до след. уровня');
    });

    it('should show total active days', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('28');
      expect(result.message).toContain('Активных дней');
    });

    it('should show streak badge if active', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔥'); // Streak icon
    });

    it('should show longest streak record', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Рекорд');
      expect(result.message).toContain('14');
    });

    it('should show quest and badge counts', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Квестов');
      expect(result.message).toContain('12');
      expect(result.message).toContain('Бейджей');
      expect(result.message).toContain('8');
    });

    it('should show engagement level title', async () => {
      const result = await command.execute(mockContext);

      // 'regular' maps to '🌳 Постоянный'
      expect(result.message).toContain('🌳');
      expect(result.message).toContain('Постоянный');
    });

    it('should show Sonya stage', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Соня');
      expect(result.message).toContain('Подруга');
    });

    it('should have navigation buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'profile:xp')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'profile:streaks')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'profile:settings')).toBeDefined();
    });

    it('should have check-in button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const checkInButton = buttons.find(b => b.callbackData === 'profile:check_in');
      expect(checkInButton).toBeDefined();
      expect(checkInButton?.text).toContain('Отметиться');
    });

    it('should handle profile load error', async () => {
      mockGetPlayerProfile.mockRejectedValue(new Error('Network error'));

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось загрузить профиль');
    });
  });

  // ==========================================================================
  // XP DETAILS VIEW
  // ==========================================================================
  describe('XP Details View', () => {
    it('should show XP details via args', async () => {
      const result = await command.execute(mockContext, 'xp');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Опыт и Уровень');
    });

    it('should show total XP', async () => {
      const result = await command.execute(mockContext, 'xp');

      expect(result.message).toContain('Всего');
      expect(result.message).toContain('1500 XP');
    });

    it('should show XP sources breakdown', async () => {
      const result = await command.execute(mockContext, 'xp');

      expect(result.message).toContain('Источники XP');
      expect(result.message).toContain('Квесты');
      expect(result.message).toContain('Бейджи');
    });

    it('should show how to earn XP', async () => {
      const result = await command.execute(mockContext, 'xp');

      expect(result.message).toContain('Как заработать XP');
      expect(result.message).toContain('Ежедневный чек-ин');
      expect(result.message).toContain('+25 XP');
    });

    it('should have action buttons', async () => {
      const result = await command.execute(mockContext, 'xp');

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'profile:check_in')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'diary:new')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'profile:overview')).toBeDefined();
    });

    it('should handle XP load error', async () => {
      mockGetXPStatus.mockRejectedValue(new Error('Network error'));

      const result = await command.execute(mockContext, 'xp');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось загрузить');
    });
  });

  // ==========================================================================
  // STREAKS VIEW
  // ==========================================================================
  describe('Streaks View', () => {
    it('should show streaks via args', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твои стрики');
    });

    it('should list all active streaks', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('Ежедневный вход');
      expect(result.message).toContain('Дневник сна');
    });

    it('should show streak counts', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('7');
      expect(result.message).toContain('5');
    });

    it('should show streak records', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('Рекорд');
      expect(result.message).toContain('14');
    });

    it('should show multipliers when > 1', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('Множитель');
      expect(result.message).toContain('x1.5');
    });

    it('should show frozen streak status', async () => {
      mockGetStreaks.mockResolvedValue([
        {
          type: 'daily_login',
          currentCount: 7,
          longestCount: 14,
          isFrozen: true,
          frozenUntil: new Date('2026-02-10'),
          multiplier: 1,
        },
      ]);

      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('❄️');
      expect(result.message).toContain('заморожен');
    });

    it('should show compassion mode status', async () => {
      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('Режим сострадания');
    });

    it('should show empty state when no streaks', async () => {
      mockGetStreaks.mockResolvedValue([]);

      const result = await command.execute(mockContext, 'streaks');

      expect(result.message).toContain('Нет активных стриков');
    });

    it('should have check-in and settings buttons', async () => {
      const result = await command.execute(mockContext, 'streaks');

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'profile:check_in')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'profile:settings')).toBeDefined();
    });

    it('should handle streaks load error', async () => {
      mockGetStreaks.mockRejectedValue(new Error('Network error'));

      const result = await command.execute(mockContext, 'streaks');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось загрузить стрики');
    });
  });

  // ==========================================================================
  // SETTINGS VIEW
  // ==========================================================================
  describe('Settings View', () => {
    it('should show settings via args', async () => {
      const result = await command.execute(mockContext, 'settings');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Настройки геймификации');
    });

    it('should show compassion mode status', async () => {
      const result = await command.execute(mockContext, 'settings');

      expect(result.message).toContain('Режим сострадания');
      expect(result.message).toContain('Включён');
    });

    it('should show soft reset status', async () => {
      const result = await command.execute(mockContext, 'settings');

      expect(result.message).toContain('Мягкий сброс');
      expect(result.message).toContain('Выключен');
    });

    it('should show time limits', async () => {
      const result = await command.execute(mockContext, 'settings');

      expect(result.message).toContain('30 мин');
      expect(result.message).toContain('60 мин');
    });

    it('should have toggle buttons', async () => {
      const result = await command.execute(mockContext, 'settings');

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'profile:toggle_compassion')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'profile:toggle_soft_reset')).toBeDefined();
    });

    it('should handle settings load error', async () => {
      mockGetGamificationSettings.mockRejectedValue(new Error('Network error'));

      const result = await command.execute(mockContext, 'settings');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось загрузить настройки');
    });
  });

  // ==========================================================================
  // TOGGLE COMPASSION MODE
  // ==========================================================================
  describe('Toggle Compassion Mode', () => {
    it('should toggle compassion mode on', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ compassionEnabled: false })
        .mockResolvedValueOnce({ compassionEnabled: true });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalledWith(
        12345,
        { compassionEnabled: true }
      );
    });

    it('should toggle compassion mode off', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ compassionEnabled: true })
        .mockResolvedValueOnce({ compassionEnabled: false });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('выключен');
    });

    it('should handle toggle error', async () => {
      mockGetGamificationSettings.mockRejectedValue(new Error('Network error'));

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_compassion',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось изменить');
    });
  });

  // ==========================================================================
  // TOGGLE SOFT RESET
  // ==========================================================================
  describe('Toggle Soft Reset', () => {
    it('should toggle soft reset on', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ softResetEnabled: false })
        .mockResolvedValueOnce({ softResetEnabled: true });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      expect(result.success).toBe(true);
      expect(mockUpdateGamificationSettings).toHaveBeenCalledWith(
        12345,
        { softResetEnabled: true }
      );
    });

    it('should toggle soft reset off', async () => {
      mockGetGamificationSettings
        .mockResolvedValueOnce({ softResetEnabled: true })
        .mockResolvedValueOnce({ softResetEnabled: false });

      const result = await command.handleCallback(
        mockContext,
        'profile:toggle_soft_reset',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('выключен');
    });
  });

  // ==========================================================================
  // DAILY CHECK-IN
  // ==========================================================================
  describe('Daily Check-In', () => {
    it('should perform check-in successfully', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ежедневный чек-ин');
    });

    it('should show XP earned', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.message).toContain('+25 XP');
    });

    it('should show total XP', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.message).toContain('1525 XP');
    });

    it('should show streak update', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.message).toContain('Стрик');
      expect(result.message).toContain('8');
    });

    it('should celebrate level up', async () => {
      mockRecordDailyCheckIn.mockResolvedValue({
        ...sampleCheckInResult,
        leveledUp: true,
        level: 6,
      });

      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.message).toContain('Новый уровень');
      expect(result.message).toContain('6');
    });

    it('should celebrate new badges', async () => {
      mockRecordDailyCheckIn.mockResolvedValue({
        ...sampleCheckInResult,
        awardedBadges: [
          { badge: { icon: '🏆', name: 'Недельный чемпион' } },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.message).toContain('Новые бейджи');
      expect(result.message).toContain('🏆');
      expect(result.message).toContain('Недельный чемпион');
    });

    it('should show new record notification', async () => {
      mockRecordDailyCheckIn.mockResolvedValue({
        ...sampleCheckInResult,
        streakUpdates: [
          { type: 'daily_login', currentCount: 15, isNewRecord: true },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.message).toContain('новый рекорд');
    });

    it('should handle check-in error', async () => {
      mockRecordDailyCheckIn.mockRejectedValue(new Error('Already checked in'));

      const result = await command.handleCallback(
        mockContext,
        'profile:check_in',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось выполнить чек-ин');
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    it('should handle overview callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:overview',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Профиль игрока');
    });

    it('should handle xp callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:xp',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Опыт и Уровень');
    });

    it('should handle streaks callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:streaks',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твои стрики');
    });

    it('should handle settings callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:settings',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Настройки геймификации');
    });

    it('should default to overview for unknown callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'profile:unknown_action',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Профиль игрока');
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('Handle Step', () => {
    it('should handle overview step', async () => {
      const result = await command.handleStep(mockContext, 'overview', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Профиль игрока');
    });

    it('should handle xp step', async () => {
      const result = await command.handleStep(mockContext, 'xp', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Опыт и Уровень');
    });

    it('should handle streaks step', async () => {
      const result = await command.handleStep(mockContext, 'streaks', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твои стрики');
    });

    it('should handle settings step', async () => {
      const result = await command.handleStep(mockContext, 'settings', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Настройки геймификации');
    });

    it('should default to overview for unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Профиль игрока');
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
