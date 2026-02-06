/**
 * BadgeCommand Tests
 * ==================
 *
 * Achievement badge system testing.
 *
 * Research basis (Sprint 8 - 2025):
 * - 91% employers actively look for digital credentials
 * - Badge rarity system based on Diablo color hierarchy
 * - White Hat Gamification: meaning, accomplishment, empowerment
 *
 * @packageDocumentation
 */

import { BadgeCommand, badgeCommand } from '../BadgeCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';
import type { BadgeCategory, BadgeRarity } from '../../../modules/quests';

// Mock badge data
const mockBadge = {
  id: 'diary_master',
  name: 'Мастер дневника',
  description: 'Веди дневник 7 дней подряд',
  icon: '📓',
  category: 'achievement' as BadgeCategory,
  rarity: 'common' as BadgeRarity,
  hidden: false,
  reward: {
    xp: 100,
  },
  criteria: {
    type: 'streak' as const,
    metric: 'diary_streak',
    value: 7,
  },
};

const mockRareBadge = {
  id: 'week_warrior',
  name: 'Недельный воин',
  description: 'Заверши 5 квестов',
  icon: '⚔️',
  category: 'milestone' as BadgeCategory,
  rarity: 'rare' as BadgeRarity,
  hidden: false,
  reward: {
    xp: 250,
    title: 'Воин сна',
  },
  criteria: {
    type: 'count' as const,
    metric: 'quests_completed',
    value: 5,
  },
};

const mockEpicBadge = {
  id: 'sleep_champion',
  name: 'Чемпион сна',
  description: 'Достигни 1000 XP',
  icon: '🏆',
  category: 'milestone' as BadgeCategory,
  rarity: 'epic' as BadgeRarity,
  hidden: false,
  reward: {
    xp: 500,
  },
  criteria: {
    type: 'count' as const,
    metric: 'total_xp',
    value: 1000,
  },
};

const mockLegendaryBadge = {
  id: 'insomnia_slayer',
  name: 'Победитель бессонницы',
  description: 'Полная ремиссия',
  icon: '👑',
  category: 'special' as BadgeCategory,
  rarity: 'legendary' as BadgeRarity,
  hidden: false,
  reward: {
    xp: 1000,
    title: 'Легенда',
  },
};

const mockStreakBadge = {
  id: 'streak_7',
  name: 'Неделя подряд',
  description: '7 дней дневника подряд',
  icon: '🔥',
  category: 'streak' as BadgeCategory,
  rarity: 'common' as BadgeRarity,
  hidden: false,
  reward: {
    xp: 75,
  },
  criteria: {
    type: 'streak' as const,
    metric: 'diary_streak',
    value: 7,
  },
};

const mockEvolutionBadge = {
  id: 'sonya_growth',
  name: 'Рост Сони',
  description: 'Соня повысила уровень',
  icon: '🌱',
  category: 'evolution' as BadgeCategory,
  rarity: 'rare' as BadgeRarity,
  hidden: false,
  reward: {
    xp: 150,
  },
};

const mockHiddenBadge = {
  id: 'secret_badge',
  name: 'Секретный',
  description: 'Секретное достижение',
  icon: '🔮',
  category: 'special' as BadgeCategory,
  rarity: 'legendary' as BadgeRarity,
  hidden: true,
  reward: {
    xp: 500,
  },
};

const mockUserBadge = {
  id: 1,
  badgeId: 'diary_master',
  userId: 12345,
  earnedAt: new Date('2026-02-01'),
  isNew: false,
};

const mockNewUserBadge = {
  id: 2,
  badgeId: 'week_warrior',
  userId: 12345,
  earnedAt: new Date('2026-02-05'),
  isNew: true,
};

const mockProfile = {
  totalXp: 500,
  totalBadgeXp: 350,
  completedQuestCount: 3,
  totalDaysActive: 14,
  streaks: [
    { type: 'sleep_diary', currentCount: 5 },
  ],
};

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    progressBar: (percent: number, _total: number) =>
      `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}]`,
  },
}));

describe('BadgeCommand', () => {
  let command: BadgeCommand;
  let mockContext: ISleepCoreContext;
  let mockGetUserBadges: jest.Mock;
  let mockGetAllBadges: jest.Mock;
  let mockGetPlayerProfile: jest.Mock;
  let mockHasBadge: jest.Mock;

  beforeEach(() => {
    command = new BadgeCommand();
    jest.clearAllMocks();

    // SleepCore API mocks
    mockGetUserBadges = jest.fn();
    mockGetAllBadges = jest.fn();
    mockGetPlayerProfile = jest.fn();
    mockHasBadge = jest.fn();

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getUserBadges: mockGetUserBadges,
        getAllBadges: mockGetAllBadges,
        getPlayerProfile: mockGetPlayerProfile,
        hasBadge: mockHasBadge,
      },
    } as unknown as ISleepCoreContext;

    // Default mock implementations
    mockGetUserBadges.mockResolvedValue([mockUserBadge]);
    mockGetAllBadges.mockResolvedValue([
      mockBadge,
      mockRareBadge,
      mockEpicBadge,
      mockLegendaryBadge,
      mockStreakBadge,
      mockEvolutionBadge,
      mockHiddenBadge,
    ]);
    mockGetPlayerProfile.mockResolvedValue(mockProfile);
    mockHasBadge.mockResolvedValue(true);
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('badges');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Твои бейджи и достижения');
    });

    it('should have badge-related aliases', () => {
      expect(command.aliases).toContain('badge');
      expect(command.aliases).toContain('achievements');
      expect(command.aliases).toContain('достижения');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all conversation steps defined', () => {
      expect(command.steps).toContain('list');
      expect(command.steps).toContain('category');
      expect(command.steps).toContain('details');
    });
  });

  // ==========================================================================
  // BADGE COLLECTION (MAIN VIEW)
  // ==========================================================================
  describe('Badge Collection', () => {
    it('should show badge collection on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твои бейджи');
    });

    it('should show collected count', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Собрано');
      expect(result.message).toContain('1/6'); // 1 user badge, 6 visible badges
    });

    it('should show total XP from badges', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Всего XP от бейджей');
      expect(result.message).toContain('350');
    });

    it('should show category stats', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('По категориям');
      expect(result.message).toContain('🎯 Достижения');
      expect(result.message).toContain('🔥 Серии');
      expect(result.message).toContain('📍 Вехи');
    });

    it('should show rarity distribution', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('По редкости');
      expect(result.message).toContain('⬜ Обычные');
      expect(result.message).toContain('🟦 Редкие');
      expect(result.message).toContain('🟪 Эпические');
      expect(result.message).toContain('🟨 Легендарные');
    });

    it('should have category navigation buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:category:achievement')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'badge:category:streak')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'badge:category:milestone')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'badge:category:special')).toBeDefined();
    });

    it('should have progress and all badges buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:progress')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'badge:all')).toBeDefined();
    });

    it('should have cross-navigation to quests', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:list')).toBeDefined();
    });

    it('should show empty state when no badges', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Пока нет бейджей');
      expect(result.message).toContain('квесты');
    });

    it('should show new badges notification', async () => {
      mockGetUserBadges.mockResolvedValue([mockUserBadge, mockNewUserBadge]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Новых');
      expect(result.message).toContain('1');
    });

    it('should have new badges button when present', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:new')).toBeDefined();
    });

    it('should exclude hidden badges from count', async () => {
      const result = await command.execute(mockContext);

      // 7 total badges, 1 hidden = 6 visible
      expect(result.message).toContain('1/6');
    });
  });

  // ==========================================================================
  // SUBCOMMANDS
  // ==========================================================================
  describe('Subcommands', () => {
    it('should handle "all" subcommand', async () => {
      const result = await command.execute(mockContext, 'all');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все бейджи');
    });

    it('should handle "progress" subcommand', async () => {
      const result = await command.execute(mockContext, 'progress');

      expect(result.success).toBe(true);
    });

    it('should treat unknown subcommand as category', async () => {
      const result = await command.execute(mockContext, 'achievement');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Достижения');
    });
  });

  // ==========================================================================
  // NEW BADGES VIEW
  // ==========================================================================
  describe('New Badges View', () => {
    it('should show new badges', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Новые бейджи');
    });

    it('should show Sonya congratulation', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Поздравляю');
    });

    it('should show new badge with details', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      expect(result.message).toContain('Недельный воин');
      expect(result.message).toContain('🆕');
      expect(result.message).toContain('+250 XP');
    });

    it('should show rarity label', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      expect(result.message).toContain('🟦 Редкий');
    });

    it('should redirect to collection when no new badges', async () => {
      mockGetUserBadges.mockResolvedValue([mockUserBadge]); // isNew: false

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      expect(result.message).toContain('Твои бейджи'); // Main view
    });

    it('should have navigation buttons', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:list')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'quest:list')).toBeDefined();
    });
  });

  // ==========================================================================
  // CATEGORY VIEW
  // ==========================================================================
  describe('Category View', () => {
    it('should show achievement category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('🎯 Достижения');
    });

    it('should show streak category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:streak', {});

      expect(result.message).toContain('🔥 Серии');
    });

    it('should show milestone category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:milestone', {});

      expect(result.message).toContain('📍 Вехи');
    });

    it('should show evolution category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:evolution', {});

      expect(result.message).toContain('🌱 Эволюция');
    });

    it('should show special category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:special', {});

      expect(result.message).toContain('✨ Особые');
    });

    it('should show category description', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      expect(result.message).toContain('Награды за выполнение квестов');
    });

    it('should show collected count in category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      expect(result.message).toContain('Собрано');
    });

    it('should show earned badge with checkmark', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      expect(result.message).toContain('✅');
    });

    it('should show unearned badge with empty box', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      expect(result.message).toContain('⬜');
    });

    it('should have badge detail buttons (max 6)', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      const buttons = result.keyboard?.flat() ?? [];
      const detailButtons = buttons.filter((b) => b.callbackData?.startsWith('badge:details:'));
      expect(detailButtons.length).toBeLessThanOrEqual(6);
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:list')).toBeDefined();
    });

    it('should include tip for details', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:achievement', {});

      expect(result.message).toContain('💡');
      expect(result.message).toContain('подробностей');
    });
  });

  // ==========================================================================
  // ALL BADGES VIEW
  // ==========================================================================
  describe('All Badges View', () => {
    it('should show all badges', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все бейджи');
    });

    it('should show total count', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('1/6'); // Excludes hidden
    });

    it('should group by rarity - legendary', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('🟨 Легендарные');
    });

    it('should group by rarity - epic', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('🟪 Эпические');
    });

    it('should group by rarity - rare', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('🟦 Редкие');
    });

    it('should group by rarity - common', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('⬜ Обычные');
    });

    it('should exclude hidden badges', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).not.toContain('Секретный');
    });

    it('should show "and more" for 5+ badges in rarity', async () => {
      // Add more common badges
      const manyCommonBadges = Array.from({ length: 8 }, (_, i) => ({
        ...mockBadge,
        id: `common_${i}`,
        name: `Common Badge ${i}`,
      }));
      mockGetAllBadges.mockResolvedValue(manyCommonBadges);

      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('и ещё');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:list')).toBeDefined();
    });
  });

  // ==========================================================================
  // PROGRESS VIEW
  // ==========================================================================
  describe('Progress View', () => {
    it('should show progress page', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.success).toBe(true);
    });

    it('should show badges close to completion', async () => {
      mockGetUserBadges.mockResolvedValue([]);
      // Profile has 5 days streak, badge needs 7 = 71%

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('Скоро получишь');
    });

    it('should show progress bar for close badges', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('█');
    });

    it('should show current/target values', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('5/7'); // diary streak
    });

    it('should show percentage', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('%');
    });

    it('should show empty state when no badges close', async () => {
      // All badges either earned or <30% progress
      mockGetUserBadges.mockResolvedValue([mockUserBadge, { ...mockNewUserBadge, badgeId: 'streak_7' }]);
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        streaks: [{ type: 'sleep_diary', currentCount: 1 }], // 1/7 = 14%
        completedQuestCount: 0,
        totalXp: 50,
      });

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('нет бейджей близких к получению');
    });

    it('should include encouragement tip', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('💡');
    });

    it('should have navigation buttons', async () => {
      mockGetUserBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:list')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'badge:list')).toBeDefined();
    });

    it('should track quests_completed metric', async () => {
      mockGetUserBadges.mockResolvedValue([]);
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        completedQuestCount: 3,
      });

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('3/5'); // 3 completed, need 5
    });

    it('should track total_xp metric', async () => {
      mockGetUserBadges.mockResolvedValue([]);
      mockGetPlayerProfile.mockResolvedValue({
        ...mockProfile,
        totalXp: 500,
      });

      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.message).toContain('500/1000');
    });
  });

  // ==========================================================================
  // BADGE DETAILS VIEW
  // ==========================================================================
  describe('Badge Details View', () => {
    it('should show badge details', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Мастер дневника');
    });

    it('should show badge icon and name', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('📓');
      expect(result.message).toContain('Мастер дневника');
    });

    it('should show badge description', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('Веди дневник 7 дней подряд');
    });

    it('should show earned status with checkmark', async () => {
      mockHasBadge.mockResolvedValue(true);

      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('✅');
    });

    it('should show rarity label', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('⬜ Обычный');
    });

    it('should show category label', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('🎯 Достижение');
    });

    it('should show XP reward', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('+100 XP');
    });

    it('should show title reward if present', async () => {
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:week_warrior', {});

      expect(result.message).toContain('🏆 Титул');
      expect(result.message).toContain('Воин сна');
    });

    it('should show Sonya message for earned badge', async () => {
      mockHasBadge.mockResolvedValue(true);

      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('у тебя есть');
    });

    it('should show progress for unearned badge', async () => {
      mockHasBadge.mockResolvedValue(false);

      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('Прогресс');
      expect(result.message).toContain('5/7');
    });

    it('should show progress bar for unearned', async () => {
      mockHasBadge.mockResolvedValue(false);

      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('█');
    });

    it('should return error for unknown badge', async () => {
      mockGetAllBadges.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'badge:details:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });

    it('should have back button to category', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:category:achievement')).toBeDefined();
    });

    it('should have all badges button', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:list')).toBeDefined();
    });
  });

  // ==========================================================================
  // RARITY LABELS
  // ==========================================================================
  describe('Rarity Labels', () => {
    it('should format common rarity', async () => {
      mockGetAllBadges.mockResolvedValue([mockBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('⬜ Обычный');
    });

    it('should format rare rarity', async () => {
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:week_warrior', {});

      expect(result.message).toContain('🟦 Редкий');
    });

    it('should format epic rarity', async () => {
      mockGetAllBadges.mockResolvedValue([mockEpicBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:sleep_champion', {});

      expect(result.message).toContain('🟪 Эпический');
    });

    it('should format legendary rarity', async () => {
      mockGetAllBadges.mockResolvedValue([mockLegendaryBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:insomnia_slayer', {});

      expect(result.message).toContain('🟨 Легендарный');
    });
  });

  // ==========================================================================
  // CATEGORY LABELS
  // ==========================================================================
  describe('Category Labels', () => {
    it('should format achievement category', async () => {
      mockGetAllBadges.mockResolvedValue([mockBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('🎯 Достижение');
    });

    it('should format streak category', async () => {
      mockGetAllBadges.mockResolvedValue([mockStreakBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:streak_7', {});

      expect(result.message).toContain('🔥 Серия');
    });

    it('should format milestone category', async () => {
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:week_warrior', {});

      expect(result.message).toContain('📍 Веха');
    });

    it('should format evolution category', async () => {
      mockGetAllBadges.mockResolvedValue([mockEvolutionBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:sonya_growth', {});

      expect(result.message).toContain('🌱 Эволюция');
    });

    it('should format special category', async () => {
      mockGetAllBadges.mockResolvedValue([mockLegendaryBadge]);

      const result = await command.handleCallback(mockContext, 'badge:details:insomnia_slayer', {});

      expect(result.message).toContain('✨ Особый');
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('handleStep', () => {
    it('should handle list step', async () => {
      const result = await command.handleStep(mockContext, 'list', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твои бейджи');
    });

    it('should handle category step', async () => {
      const result = await command.handleStep(mockContext, 'category', { category: 'achievement' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Достижения');
    });

    it('should handle details step', async () => {
      const result = await command.handleStep(mockContext, 'details', { badgeId: 'diary_master' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Мастер дневника');
    });

    it('should default to collection for unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твои бейджи');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should route badge:list to collection', async () => {
      const result = await command.handleCallback(mockContext, 'badge:list', {});

      expect(result.message).toContain('Твои бейджи');
    });

    it('should route badge:all to all badges', async () => {
      const result = await command.handleCallback(mockContext, 'badge:all', {});

      expect(result.message).toContain('Все бейджи');
    });

    it('should route badge:progress to progress', async () => {
      const result = await command.handleCallback(mockContext, 'badge:progress', {});

      expect(result.success).toBe(true);
    });

    it('should route badge:category with param', async () => {
      const result = await command.handleCallback(mockContext, 'badge:category:streak', {});

      expect(result.message).toContain('Серии');
    });

    it('should route badge:details with param', async () => {
      const result = await command.handleCallback(mockContext, 'badge:details:diary_master', {});

      expect(result.message).toContain('Мастер дневника');
    });

    it('should route badge:new to new badges', async () => {
      mockGetUserBadges.mockResolvedValue([mockNewUserBadge]);
      mockGetAllBadges.mockResolvedValue([mockRareBadge]);

      const result = await command.handleCallback(mockContext, 'badge:new', {});

      expect(result.message).toContain('Новые бейджи');
    });

    it('should default to collection for unknown action', async () => {
      const result = await command.handleCallback(mockContext, 'badge:unknown', {});

      expect(result.message).toContain('Твои бейджи');
    });
  });

  // ==========================================================================
  // USER ID HANDLING
  // ==========================================================================
  describe('User ID Handling', () => {
    it('should use parseInt for userId', async () => {
      await command.execute(mockContext);

      expect(mockGetUserBadges).toHaveBeenCalledWith(12345);
      expect(mockGetPlayerProfile).toHaveBeenCalledWith(12345);
    });
  });

  // ==========================================================================
  // PROGRESS CRITERIA TRACKING
  // ==========================================================================
  describe('Progress Criteria Tracking', () => {
    it('should track days_active metric', async () => {
      const daysActiveBadge = {
        ...mockBadge,
        id: 'active_30',
        criteria: {
          type: 'count' as const,
          metric: 'days_active',
          value: 30,
        },
      };
      mockGetAllBadges.mockResolvedValue([daysActiveBadge]);
      mockGetUserBadges.mockResolvedValue([]);
      mockHasBadge.mockResolvedValue(false);

      const result = await command.handleCallback(mockContext, 'badge:details:active_30', {});

      expect(result.message).toContain('14/30'); // profile.totalDaysActive = 14
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(badgeCommand).toBeInstanceOf(BadgeCommand);
    });

    it('should have correct name', () => {
      expect(badgeCommand.name).toBe('badges');
    });
  });
});
