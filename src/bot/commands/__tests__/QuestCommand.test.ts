/**
 * QuestCommand Tests
 * ==================
 *
 * Gamification quest system testing.
 *
 * Research basis (SDT theory):
 * - Autonomy: User chooses quests
 * - Competence: Progress tracking
 * - Relatedness: Sonya guidance
 *
 * @packageDocumentation
 */

import { QuestCommand, questCommand } from '../QuestCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock quest data
const mockQuest = {
  id: 'diary_7_days',
  title: '7 дней дневника',
  description: 'Веди дневник сна 7 дней подряд',
  icon: '📓',
  difficulty: 'easy' as const,
  durationDays: 7,
  category: 'diary' as const,
  targetMetric: 'diary_entries',
  targetValue: 7,
  reward: {
    xp: 100,
    badge: 'diary_master',
  },
};

const mockHardQuest = {
  id: 'perfect_month',
  title: 'Идеальный месяц',
  description: 'Соблюдай режим сна 30 дней',
  icon: '🏆',
  difficulty: 'hard' as const,
  durationDays: 30,
  category: 'routine' as const,
  targetMetric: 'bedtime_consistency',
  targetValue: 30,
  reward: {
    xp: 500,
  },
};

const mockMediumQuest = {
  id: 'relax_week',
  title: 'Неделя релаксации',
  description: 'Пройди 7 сессий релаксации',
  icon: '🧘',
  difficulty: 'medium' as const,
  durationDays: 14,
  category: 'mindfulness' as const,
  targetMetric: 'relax_sessions',
  targetValue: 7,
  reward: {
    xp: 200,
  },
};

const mockActiveQuest = {
  quest: mockQuest,
  progress: 43,
  currentValue: 3,
  targetValue: 7,
  daysRemaining: 4,
  startedAt: new Date('2026-02-01'),
};

const mockActiveQuestLegacy = {
  questId: 'diary_7_days',
  progress: {
    currentValue: 3,
    targetValue: 7,
    startedAt: new Date('2026-02-01'),
  },
};

// Mock questService
const mockGetAllQuests = jest.fn();
const mockGetAvailableQuests = jest.fn();
const mockGetCompletedQuestIds = jest.fn();
const mockGetQuest = jest.fn();
const mockGetActiveQuests = jest.fn();
const mockGetProgressPercentage = jest.fn();
const mockGetDaysRemaining = jest.fn();
const mockAbandonQuest = jest.fn();

jest.mock('../../../modules/quests', () => ({
  questService: {
    getAllQuests: () => mockGetAllQuests(),
    getAvailableQuests: (userId: string) => mockGetAvailableQuests(userId),
    getCompletedQuestIds: (userId: string) => mockGetCompletedQuestIds(userId),
    getQuest: (questId: string) => mockGetQuest(questId),
    getActiveQuests: (userId: string) => mockGetActiveQuests(userId),
    getProgressPercentage: (active: unknown) => mockGetProgressPercentage(active),
    getDaysRemaining: (active: unknown) => mockGetDaysRemaining(active),
    abandonQuest: (userId: string, questId: string) => mockAbandonQuest(userId, questId),
  },
}));

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    respondToEmotion: (emotion: string) => ({
      emoji: emotion === 'positive' ? '😊' : '🤗',
      text: 'Молодец!',
    }),
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    progressBar: (percent: number, _total: number) =>
      `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}]`,
  },
}));

describe('QuestCommand', () => {
  let command: QuestCommand;
  let mockContext: ISleepCoreContext;
  let mockGetActiveQuestsSleepCore: jest.Mock;
  let mockGetAvailableQuestsSleepCore: jest.Mock;
  let mockGetCompletedQuestCount: jest.Mock;
  let mockGetPlayerProfile: jest.Mock;
  let mockStartQuest: jest.Mock;

  beforeEach(() => {
    command = new QuestCommand();
    jest.clearAllMocks();

    // SleepCore API mocks
    mockGetActiveQuestsSleepCore = jest.fn();
    mockGetAvailableQuestsSleepCore = jest.fn();
    mockGetCompletedQuestCount = jest.fn();
    mockGetPlayerProfile = jest.fn();
    mockStartQuest = jest.fn();

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getActiveQuests: mockGetActiveQuestsSleepCore,
        getAvailableQuests: mockGetAvailableQuestsSleepCore,
        getCompletedQuestCount: mockGetCompletedQuestCount,
        getPlayerProfile: mockGetPlayerProfile,
        startQuest: mockStartQuest,
      },
    } as unknown as ISleepCoreContext;

    // Default mock implementations
    mockGetActiveQuestsSleepCore.mockResolvedValue([mockActiveQuest]);
    mockGetAvailableQuestsSleepCore.mockResolvedValue([mockQuest, mockMediumQuest, mockHardQuest]);
    mockGetCompletedQuestCount.mockResolvedValue(5);
    mockGetPlayerProfile.mockResolvedValue({ totalXp: 1500 });
    mockGetAllQuests.mockReturnValue([mockQuest, mockMediumQuest, mockHardQuest]);
    mockGetAvailableQuests.mockReturnValue([mockQuest, mockMediumQuest, mockHardQuest]);
    mockGetCompletedQuestIds.mockReturnValue([]);
    mockGetQuest.mockReturnValue(mockQuest);
    mockGetActiveQuests.mockReturnValue([mockActiveQuestLegacy]);
    mockGetProgressPercentage.mockReturnValue(43);
    mockGetDaysRemaining.mockReturnValue(4);
    mockAbandonQuest.mockReturnValue(true);
    mockStartQuest.mockResolvedValue({
      quest: mockQuest,
      progress: {
        currentValue: 0,
        targetValue: 7,
        startedAt: new Date(),
      },
    });
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('quest');
    });

    it('should have Russian description', () => {
      expect(command.description).toBe('Квесты и задания');
    });

    it('should have quest-related aliases', () => {
      expect(command.aliases).toContain('quests');
      expect(command.aliases).toContain('tasks');
      expect(command.aliases).toContain('задания');
      expect(command.aliases).toContain('квесты');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all conversation steps defined', () => {
      expect(command.steps).toContain('list');
      expect(command.steps).toContain('details');
      expect(command.steps).toContain('start');
      expect(command.steps).toContain('progress');
    });
  });

  // ==========================================================================
  // QUEST HUB (MAIN VIEW)
  // ==========================================================================
  describe('Quest Hub', () => {
    it('should show quest hub on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Квесты');
    });

    it('should show user stats', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Твой прогресс');
      expect(result.message).toContain('Активных: 1/3');
      expect(result.message).toContain('Завершено: 5/3'); // 5 completed out of 3 total (mock)
      expect(result.message).toContain('Всего XP: 1500');
    });

    it('should show active quests preview', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Активные квесты:');
      expect(result.message).toContain('📓');
      expect(result.message).toContain('7 дней дневника');
    });

    it('should show available quests count', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Доступно 3 новых квестов');
    });

    it('should have navigation keyboard', async () => {
      const result = await command.execute(mockContext);

      expect(result.keyboard).toBeDefined();
      const buttons = result.keyboard?.flat() ?? [];

      expect(buttons.find((b) => b.callbackData === 'quest:active')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'quest:available')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'quest:completed')).toBeDefined();
    });

    it('should have cross-navigation to badges and profile', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'badge:list')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'profile:overview')).toBeDefined();
    });

    it('should include tip about sections', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('💡');
      expect(result.message).toContain('Выбери раздел');
    });

    it('should handle empty active quests', async () => {
      mockGetActiveQuestsSleepCore.mockResolvedValue([]);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Активных: 0/3');
    });

    it('should handle empty available quests', async () => {
      mockGetAvailableQuestsSleepCore.mockResolvedValue([]);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('новых квестов');
    });

    it('should show "and more" for 3+ active quests', async () => {
      mockGetActiveQuestsSleepCore.mockResolvedValue([
        mockActiveQuest,
        { ...mockActiveQuest, quest: mockMediumQuest },
        { ...mockActiveQuest, quest: mockHardQuest },
      ]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('и ещё 1');
    });

    it('should use parseInt for userId', async () => {
      await command.execute(mockContext);

      expect(mockGetActiveQuestsSleepCore).toHaveBeenCalledWith(12345);
      expect(mockGetCompletedQuestCount).toHaveBeenCalledWith(12345);
    });
  });

  // ==========================================================================
  // SUBCOMMANDS
  // ==========================================================================
  describe('Subcommands', () => {
    it('should handle "active" subcommand', async () => {
      const result = await command.execute(mockContext, 'active');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Активные квесты');
    });

    it('should handle "available" subcommand', async () => {
      const result = await command.execute(mockContext, 'available');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Доступные квесты');
    });

    it('should handle "completed" subcommand', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.execute(mockContext, 'completed');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Завершённые квесты');
    });

    it('should treat unknown subcommand as questId', async () => {
      const result = await command.execute(mockContext, 'diary_7_days');

      expect(result.success).toBe(true);
      expect(result.message).toContain('7 дней дневника');
    });
  });

  // ==========================================================================
  // ACTIVE QUESTS VIEW
  // ==========================================================================
  describe('Active Quests View', () => {
    it('should show active quests with progress', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Активные квесты');
      expect(result.message).toContain('1/3');
    });

    it('should show progress bar for each quest', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.message).toContain('█');
      expect(result.message).toContain('43%');
    });

    it('should show current/target values', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.message).toContain('3/7');
    });

    it('should show days remaining', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.message).toContain('4 дн.');
    });

    it('should have quest detail buttons', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:details:diary_7_days')).toBeDefined();
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:list')).toBeDefined();
    });

    it('should show empty state when no active quests', async () => {
      mockGetActiveQuestsSleepCore.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Нет активных квестов');
      expect(result.message).toContain('нет начатых квестов');
    });

    it('should offer to select quest when empty', async () => {
      mockGetActiveQuestsSleepCore.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'quest:active', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:available')).toBeDefined();
    });

    it('should show tip about 3 max active quests', async () => {
      mockGetActiveQuestsSleepCore.mockResolvedValue([]);

      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.message).toContain('до 3 активных квестов');
    });
  });

  // ==========================================================================
  // AVAILABLE QUESTS VIEW
  // ==========================================================================
  describe('Available Quests View', () => {
    it('should show available quests', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Доступные квесты');
    });

    it('should show quest count', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('(3)');
    });

    it('should group by difficulty - easy', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('🟢 Лёгкие:');
    });

    it('should group by difficulty - medium', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('🟡 Средние:');
    });

    it('should group by difficulty - hard', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('🔴 Сложные:');
    });

    it('should show XP reward for each quest', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('+100 XP');
      expect(result.message).toContain('+200 XP');
      expect(result.message).toContain('+500 XP');
    });

    it('should have quest buttons (max 5)', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      const buttons = result.keyboard?.flat() ?? [];
      const questButtons = buttons.filter((b) => b.callbackData?.startsWith('quest:details:'));
      expect(questButtons.length).toBeLessThanOrEqual(5);
    });

    it('should include tip to select quest', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('Выбери квест');
    });

    it('should show empty state when all quests completed', async () => {
      mockGetAvailableQuests.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('Все квесты выполнены');
      expect(result.message).toContain('Поздравляем');
    });

    it('should show Sonya emotion on completion', async () => {
      mockGetAvailableQuests.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Молодец');
    });

    it('should only show easy difficulty if no medium/hard', async () => {
      mockGetAvailableQuests.mockReturnValue([mockQuest]);

      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('🟢 Лёгкие:');
      expect(result.message).not.toContain('🟡 Средние:');
      expect(result.message).not.toContain('🔴 Сложные:');
    });
  });

  // ==========================================================================
  // COMPLETED QUESTS VIEW
  // ==========================================================================
  describe('Completed Quests View', () => {
    it('should show completed quests', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Завершённые квесты');
    });

    it('should show completed count', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days', 'relax_week']);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('(2)');
    });

    it('should show checkmark for completed quests', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('✅');
    });

    it('should show XP earned for each quest', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('+100 XP');
    });

    it('should show total XP earned', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('Всего заработано');
      expect(result.message).toContain('100 XP');
    });

    it('should calculate total XP from multiple quests', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days', 'relax_week']);
      mockGetQuest.mockImplementation((id) => {
        if (id === 'diary_7_days') return mockQuest;
        if (id === 'relax_week') return mockMediumQuest;
        return null;
      });

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('300 XP'); // 100 + 200
    });

    it('should show empty state when no completed quests', async () => {
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('нет завершённых квестов');
    });

    it('should offer to start first quest when empty', async () => {
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('Начни свой первый квест');
      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:available')).toBeDefined();
    });

    it('should skip null quests', async () => {
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days', 'unknown_quest']);
      mockGetQuest.mockImplementation((id) => {
        if (id === 'diary_7_days') return mockQuest;
        return null;
      });

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('100 XP'); // Only counts valid quest
    });
  });

  // ==========================================================================
  // QUEST DETAILS VIEW
  // ==========================================================================
  describe('Quest Details View', () => {
    it('should show quest details', async () => {
      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('7 дней дневника');
    });

    it('should show quest icon and title', async () => {
      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('📓');
      expect(result.message).toContain('7 дней дневника');
    });

    it('should show quest description', async () => {
      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('Веди дневник сна 7 дней подряд');
    });

    it('should show difficulty label - easy', async () => {
      mockGetQuest.mockReturnValue(mockQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('🟢 Лёгкий');
    });

    it('should show difficulty label - medium', async () => {
      mockGetQuest.mockReturnValue(mockMediumQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:relax_week', {});

      expect(result.message).toContain('🟡 Средний');
    });

    it('should show difficulty label - hard', async () => {
      mockGetQuest.mockReturnValue(mockHardQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:perfect_month', {});

      expect(result.message).toContain('🔴 Сложный');
    });

    it('should show category - diary', async () => {
      mockGetQuest.mockReturnValue(mockQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('📓 Дневник');
    });

    it('should show category - mindfulness', async () => {
      mockGetQuest.mockReturnValue(mockMediumQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:relax_week', {});

      expect(result.message).toContain('🧘 Осознанность');
    });

    it('should show category - routine', async () => {
      mockGetQuest.mockReturnValue(mockHardQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:perfect_month', {});

      expect(result.message).toContain('🕐 Режим');
    });

    it('should show duration in days', async () => {
      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('7 дней');
    });

    it('should show XP reward', async () => {
      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('+100 XP');
    });

    it('should show badge reward if present', async () => {
      mockGetQuest.mockReturnValue(mockQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('🏅 Бейдж');
      expect(result.message).toContain('diary_master');
    });

    it('should not show badge if not present', async () => {
      mockGetQuest.mockReturnValue(mockMediumQuest);

      const result = await command.handleCallback(mockContext, 'quest:details:relax_week', {});

      expect(result.message).not.toContain('🏅 Бейдж');
    });

    it('should return error for unknown quest', async () => {
      mockGetQuest.mockReturnValue(null);

      const result = await command.handleCallback(mockContext, 'quest:details:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // QUEST STATUS IN DETAILS
  // ==========================================================================
  describe('Quest Status in Details', () => {
    it('should show "Доступен" status for new quest', async () => {
      mockGetActiveQuests.mockReturnValue([]);
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('📋');
      expect(result.message).toContain('Доступен');
    });

    it('should show start button for available quest', async () => {
      mockGetActiveQuests.mockReturnValue([]);
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:start:diary_7_days')).toBeDefined();
    });

    it('should show "В процессе" status for active quest', async () => {
      mockGetActiveQuests.mockReturnValue([mockActiveQuestLegacy]);
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('🔄');
      expect(result.message).toContain('В процессе');
    });

    it('should show progress for active quest', async () => {
      mockGetActiveQuests.mockReturnValue([mockActiveQuestLegacy]);
      mockGetCompletedQuestIds.mockReturnValue([]);
      mockGetProgressPercentage.mockReturnValue(43);
      mockGetDaysRemaining.mockReturnValue(4);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('Прогресс');
      expect(result.message).toContain('3/7');
      expect(result.message).toContain('43%');
      expect(result.message).toContain('4 дней');
    });

    it('should show abandon button for active quest', async () => {
      mockGetActiveQuests.mockReturnValue([mockActiveQuestLegacy]);
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:abandon:diary_7_days')).toBeDefined();
    });

    it('should show "Выполнен" status for completed quest', async () => {
      mockGetActiveQuests.mockReturnValue([]);
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('✅');
      expect(result.message).toContain('Выполнен');
    });

    it('should show noop button for completed quest', async () => {
      mockGetActiveQuests.mockReturnValue([]);
      mockGetCompletedQuestIds.mockReturnValue(['diary_7_days']);

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'noop')).toBeDefined();
    });
  });

  // ==========================================================================
  // START QUEST
  // ==========================================================================
  describe('Start Quest', () => {
    it('should start quest successfully', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Квест начат');
    });

    it('should call sleepCore.startQuest with correct params', async () => {
      await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(mockStartQuest).toHaveBeenCalledWith(12345, 'diary_7_days');
    });

    it('should show quest details after starting', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.message).toContain('📓');
      expect(result.message).toContain('7 дней дневника');
      expect(result.message).toContain('Веди дневник сна');
    });

    it('should show duration and target', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.message).toContain('7 дней');
      expect(result.message).toContain('Цель');
      expect(result.message).toContain('записей в дневнике');
    });

    it('should show Sonya encouragement', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Удачи');
    });

    it('should show tip about auto-progress', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.message).toContain('Прогресс обновляется автоматически');
    });

    it('should have navigation buttons after start', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:active')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'quest:list')).toBeDefined();
    });

    it('should handle start failure - null result', async () => {
      mockStartQuest.mockResolvedValue(null);

      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось начать квест');
    });

    it('should mention possible reasons for failure', async () => {
      mockStartQuest.mockResolvedValue(null);

      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.error).toContain('3 квеста');
      expect(result.error).toContain('недоступен');
    });

    it('should handle start exception', async () => {
      mockStartQuest.mockRejectedValue(new Error('Database error'));

      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось начать квест');
    });
  });

  // ==========================================================================
  // ABANDON QUEST
  // ==========================================================================
  describe('Abandon Quest', () => {
    it('should abandon quest successfully', async () => {
      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Квест отменён');
    });

    it('should call questService.abandonQuest', async () => {
      await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(mockAbandonQuest).toHaveBeenCalledWith('12345', 'diary_7_days');
    });

    it('should show abandoned quest info', async () => {
      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(result.message).toContain('📓');
      expect(result.message).toContain('7 дней дневника');
    });

    it('should mention progress reset', async () => {
      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(result.message).toContain('Прогресс');
      expect(result.message).toContain('сброшен');
    });

    it('should mention restart option', async () => {
      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(result.message).toContain('начать его заново');
    });

    it('should have navigation buttons', async () => {
      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find((b) => b.callbackData === 'quest:available')).toBeDefined();
      expect(buttons.find((b) => b.callbackData === 'quest:list')).toBeDefined();
    });

    it('should handle abandon failure', async () => {
      mockAbandonQuest.mockReturnValue(false);

      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден или уже завершён');
    });

    it('should handle unknown quest on abandon', async () => {
      mockGetQuest.mockReturnValue(null);

      const result = await command.handleCallback(mockContext, 'quest:abandon:unknown', {});

      expect(result.success).toBe(true); // Still succeeds if abandon worked
      expect(result.message).toContain('unknown'); // Falls back to questId
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('handleStep', () => {
    it('should handle list step', async () => {
      const result = await command.handleStep(mockContext, 'list', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Квесты');
    });

    it('should handle details step with questId', async () => {
      const result = await command.handleStep(mockContext, 'details', { questId: 'diary_7_days' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('7 дней дневника');
    });

    it('should handle start step', async () => {
      const result = await command.handleStep(mockContext, 'start', { questId: 'diary_7_days' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Квест начат');
    });

    it('should handle progress step', async () => {
      const result = await command.handleStep(mockContext, 'progress', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Активные квесты');
    });

    it('should default to hub for unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown_step', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Квесты');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should route quest:list to hub', async () => {
      const result = await command.handleCallback(mockContext, 'quest:list', {});

      expect(result.message).toContain('Квесты');
      expect(result.message).toContain('Твой прогресс');
    });

    it('should route quest:active to active quests', async () => {
      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.message).toContain('Активные квесты');
    });

    it('should route quest:available to available quests', async () => {
      const result = await command.handleCallback(mockContext, 'quest:available', {});

      expect(result.message).toContain('Доступные квесты');
    });

    it('should route quest:completed to completed quests', async () => {
      mockGetCompletedQuestIds.mockReturnValue([]);

      const result = await command.handleCallback(mockContext, 'quest:completed', {});

      expect(result.message).toContain('нет завершённых');
    });

    it('should route quest:details with questId', async () => {
      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('7 дней дневника');
    });

    it('should route quest:start with questId', async () => {
      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.message).toContain('Квест начат');
    });

    it('should route quest:abandon with questId', async () => {
      const result = await command.handleCallback(mockContext, 'quest:abandon:diary_7_days', {});

      expect(result.message).toContain('Квест отменён');
    });

    it('should default to hub for unknown action', async () => {
      const result = await command.handleCallback(mockContext, 'quest:unknown_action', {});

      expect(result.message).toContain('Квесты');
    });
  });

  // ==========================================================================
  // METRIC LABELS
  // ==========================================================================
  describe('Metric Labels', () => {
    it('should format diary_entries', async () => {
      mockStartQuest.mockResolvedValue({
        quest: { ...mockQuest, targetMetric: 'diary_entries' },
        progress: { currentValue: 0, targetValue: 7, startedAt: new Date() },
      });

      const result = await command.handleCallback(mockContext, 'quest:start:diary_7_days', {});

      expect(result.message).toContain('записей в дневнике');
    });

    it('should format relax_sessions', async () => {
      mockStartQuest.mockResolvedValue({
        quest: { ...mockMediumQuest, targetMetric: 'relax_sessions' },
        progress: { currentValue: 0, targetValue: 7, startedAt: new Date() },
      });
      mockGetQuest.mockReturnValue({ ...mockMediumQuest, targetMetric: 'relax_sessions' });

      const result = await command.handleCallback(mockContext, 'quest:start:relax_week', {});

      expect(result.message).toContain('сессий релаксации');
    });

    it('should format bedtime_consistency', async () => {
      mockStartQuest.mockResolvedValue({
        quest: { ...mockHardQuest, targetMetric: 'bedtime_consistency' },
        progress: { currentValue: 0, targetValue: 30, startedAt: new Date() },
      });
      mockGetQuest.mockReturnValue({ ...mockHardQuest, targetMetric: 'bedtime_consistency' });

      const result = await command.handleCallback(mockContext, 'quest:start:perfect_month', {});

      expect(result.message).toContain('дней с режимом');
    });

    it('should fallback to raw metric if unknown', async () => {
      mockStartQuest.mockResolvedValue({
        quest: { ...mockQuest, targetMetric: 'custom_metric' },
        progress: { currentValue: 0, targetValue: 10, startedAt: new Date() },
      });
      mockGetQuest.mockReturnValue({ ...mockQuest, targetMetric: 'custom_metric' });

      const result = await command.handleCallback(mockContext, 'quest:start:custom', {});

      expect(result.message).toContain('custom_metric');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle hub error gracefully', async () => {
      mockGetActiveQuestsSleepCore.mockRejectedValue(new Error('Database error'));

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось загрузить квесты');
    });

    it('should handle active quests error', async () => {
      mockGetActiveQuestsSleepCore.mockRejectedValue(new Error('Network error'));

      const result = await command.handleCallback(mockContext, 'quest:active', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось загрузить активные квесты');
    });
  });

  // ==========================================================================
  // CATEGORY LABELS
  // ==========================================================================
  describe('Category Labels', () => {
    it('should format sleep category', async () => {
      mockGetQuest.mockReturnValue({ ...mockQuest, category: 'sleep' });

      const result = await command.handleCallback(mockContext, 'quest:details:sleep_quest', {});

      expect(result.message).toContain('😴 Сон');
    });

    it('should format diary category', async () => {
      mockGetQuest.mockReturnValue({ ...mockQuest, category: 'diary' });

      const result = await command.handleCallback(mockContext, 'quest:details:diary_7_days', {});

      expect(result.message).toContain('📓 Дневник');
    });

    it('should format mindfulness category', async () => {
      mockGetQuest.mockReturnValue({ ...mockQuest, category: 'mindfulness' });

      const result = await command.handleCallback(mockContext, 'quest:details:mindful', {});

      expect(result.message).toContain('🧘 Осознанность');
    });

    it('should format digital_detox category', async () => {
      mockGetQuest.mockReturnValue({ ...mockQuest, category: 'digital_detox' });

      const result = await command.handleCallback(mockContext, 'quest:details:detox', {});

      expect(result.message).toContain('📵 Детокс');
    });

    it('should format routine category', async () => {
      mockGetQuest.mockReturnValue({ ...mockQuest, category: 'routine' });

      const result = await command.handleCallback(mockContext, 'quest:details:routine', {});

      expect(result.message).toContain('🕐 Режим');
    });

    it('should fallback to raw category if unknown', async () => {
      mockGetQuest.mockReturnValue({ ...mockQuest, category: 'custom_category' });

      const result = await command.handleCallback(mockContext, 'quest:details:custom', {});

      expect(result.message).toContain('custom_category');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(questCommand).toBeInstanceOf(QuestCommand);
    });

    it('should have correct name', () => {
      expect(questCommand.name).toBe('quest');
    });
  });
});
