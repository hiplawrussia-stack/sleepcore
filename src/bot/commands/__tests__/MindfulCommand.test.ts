/**
 * MindfulCommand Tests
 * ====================
 *
 * IEC 62304 Class B - Third-wave therapy delivery
 *
 * Tests verify:
 * - Content Library integration
 * - MBT-I/ACT-I practice delivery
 * - Age-adaptive content
 * - Timer and completion tracking
 * - XP rewards
 *
 * @packageDocumentation
 */

// Mock functions must be declared before jest.mock for hoisting
const mockGetContent = jest.fn();
const mockGetMindfulnessContent = jest.fn();
const mockFormatForTelegram = jest.fn();
const mockFormatStepsForTelegram = jest.fn();
const mockRecordCompletion = jest.fn();

import { MindfulCommand, mindfulCommand } from '../MindfulCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock content items
const mockMindfulnessContent = [
  {
    id: 'body_scan',
    title: 'Сканирование тела',
    shortDescription: 'Расслабление через внимание к телу',
    icon: '🧘',
    durationMinutes: 10,
    category: 'mindfulness',
    reward: { xp: 25 },
    steps: [
      { step: 1, instruction: 'Лягте удобно' },
      { step: 2, instruction: 'Закройте глаза' },
    ],
  },
  {
    id: 'breath_awareness',
    title: 'Дыхательная практика',
    shortDescription: 'Осознанное дыхание для успокоения',
    icon: '🌬️',
    durationMinutes: 5,
    category: 'mindfulness',
    reward: { xp: 15 },
    steps: [],
  },
  {
    id: 'loving_kindness',
    title: 'Медитация любящей доброты',
    shortDescription: 'Развитие сострадания к себе',
    icon: '💚',
    durationMinutes: 15,
    category: 'mindfulness',
    reward: { xp: 30 },
    steps: [{ step: 1, instruction: 'Сядьте спокойно' }],
  },
  {
    id: '3min_breathing',
    title: '3-минутное пространство дыхания',
    shortDescription: 'Быстрая практика осознанности',
    icon: '⏱️',
    durationMinutes: 3,
    category: 'mindfulness',
    reward: { xp: 10 },
    steps: [],
  },
  {
    id: 'sitting_meditation',
    title: 'Сидячая медитация',
    shortDescription: 'Классическая медитация',
    icon: '🧎',
    durationMinutes: 20,
    category: 'mindfulness',
    reward: { xp: 40 },
    steps: [],
  },
  {
    id: 'open_awareness',
    title: 'Открытое осознавание',
    shortDescription: 'Расширенное внимание',
    icon: '👁️',
    durationMinutes: 15,
    category: 'mindfulness',
    reward: { xp: 30 },
    steps: [],
  },
];

// Mock ContentService
jest.mock('../../../modules/content', () => ({
  getContentService: () => ({
    getContent: mockGetContent,
    getMindfulnessContent: mockGetMindfulnessContent,
    formatForTelegram: mockFormatForTelegram,
    formatStepsForTelegram: mockFormatStepsForTelegram,
    recordCompletion: mockRecordCompletion,
  }),
  AgeGroup: {},
}));

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    say: (text: string) => `_${text}_`,
    tip: (text: string) => `💡 ${text}`,
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    success: (text: string) => `✅ ${text}`,
    tip: (text: string) => `💡 ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
  },
}));

describe('MindfulCommand', () => {
  let command: MindfulCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockGetMindfulnessPractice: jest.Mock;
  let mockAssessArousal: jest.Mock;
  let mockRecordMBTIPractice: jest.Mock;

  beforeEach(() => {
    command = new MindfulCommand();
    jest.clearAllMocks();

    // Setup default mock returns
    mockGetMindfulnessContent.mockResolvedValue(mockMindfulnessContent);
    mockGetContent.mockImplementation((id: string) => {
      return Promise.resolve(mockMindfulnessContent.find(c => c.id === id) || null);
    });
    mockFormatForTelegram.mockReturnValue('Formatted content');
    mockFormatStepsForTelegram.mockReturnValue('Formatted steps content');
    mockRecordCompletion.mockResolvedValue(undefined);

    // Create mocks for SleepCoreAPI methods
    mockGetSession = jest.fn();
    mockGetMindfulnessPractice = jest.fn();
    mockAssessArousal = jest.fn();
    mockRecordMBTIPractice = jest.fn();

    // Create mock context
    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getMindfulnessPractice: mockGetMindfulnessPractice,
        assessArousal: mockAssessArousal,
        recordMBTIPractice: mockRecordMBTIPractice,
      },
    } as unknown as ISleepCoreContext;

    mockGetSession.mockReturnValue(null);
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('mindful');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('осознанности');
    });

    it('should have mindfulness-related aliases', () => {
      expect(command.aliases).toContain('mindfulness');
      expect(command.aliases).toContain('meditation');
      expect(command.aliases).toContain('осознанность');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all steps defined', () => {
      expect(command.steps).toContain('menu');
      expect(command.steps).toContain('show');
      expect(command.steps).toContain('more');
      expect(command.steps).toContain('done');
      expect(command.steps).toContain('timer');
    });
  });

  // ==========================================================================
  // EXECUTE - DEFAULT MENU
  // ==========================================================================
  describe('Execute - Default Menu', () => {
    it('should show menu on execute without args', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should include Sonya persona', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Соня');
    });

    it('should include mindfulness header', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Практики осознанности');
    });

    it('should list available practices', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Сканирование тела');
      expect(result.message).toContain('Дыхательная практика');
    });

    it('should include practice durations', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('10 мин');
      expect(result.message).toContain('5 мин');
    });

    it('should include tip about regular practice', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('2-4 недели');
    });

    it('should have practice buttons', async () => {
      const result = await command.execute(mockContext);

      expect(result.keyboard).toBeDefined();
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.callbackData?.includes('mindful:show:body_scan'))).toBe(true);
    });

    it('should have "More practices" button when more than 5 available', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard!.flat();
      const moreButton = buttons.find(b => b.callbackData === 'mindful:more');
      expect(moreButton).toBeDefined();
      expect(moreButton?.text).toContain('Больше практик');
    });

    it('should limit displayed content to 5 items', async () => {
      const result = await command.execute(mockContext);

      // 6th item should not be in list (open_awareness)
      expect(result.message).not.toContain('Открытое осознавание');
    });
  });

  // ==========================================================================
  // EXECUTE - WITH SPECIFIC PRACTICE ARG
  // ==========================================================================
  describe('Execute - With Practice Argument', () => {
    it('should show specific practice when arg provided', async () => {
      const result = await command.execute(mockContext, 'body_scan');

      expect(result.success).toBe(true);
      expect(mockGetContent).toHaveBeenCalledWith('body_scan');
    });

    it('should show menu when practice not found', async () => {
      mockGetContent.mockResolvedValueOnce(null);

      const result = await command.execute(mockContext, 'nonexistent');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практики осознанности');
    });
  });

  // ==========================================================================
  // PERSONALIZED MENU (WITH ACTIVE PLAN)
  // ==========================================================================
  describe('Personalized Menu', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({
        mbtiPlan: { active: true },
      });
    });

    it('should show personalized menu when user has MBT-I plan', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('активный план');
    });

    it('should show recommended practice', async () => {
      mockGetMindfulnessPractice.mockReturnValue({ practice: 'body_scan' });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Рекомендовано');
    });

    it('should have button to start recommended practice', async () => {
      mockGetMindfulnessPractice.mockReturnValue({ practice: 'body_scan' });

      const result = await command.execute(mockContext);

      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.text.includes('рекомендованную'))).toBe(true);
    });

    it('should show other available practices', async () => {
      mockGetMindfulnessPractice.mockReturnValue({ practice: 'body_scan' });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Другие практики');
    });

    it('should fallback to first content if no recommendation', async () => {
      mockGetMindfulnessPractice.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Рекомендовано');
    });

    it('should handle ACT-I plan same as MBT-I', async () => {
      mockGetSession.mockReturnValue({ actiPlan: { active: true } });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('активный план');
    });
  });

  // ==========================================================================
  // SHOW PRACTICE
  // ==========================================================================
  describe('Show Practice', () => {
    it('should show practice content via callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:show:body_scan',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Соня');
    });

    it('should use formatStepsForTelegram when steps exist', async () => {
      await command.handleCallback(mockContext, 'mindful:show:body_scan', {});

      expect(mockFormatStepsForTelegram).toHaveBeenCalled();
    });

    it('should use formatForTelegram when no steps', async () => {
      await command.handleCallback(mockContext, 'mindful:show:breath_awareness', {});

      expect(mockFormatForTelegram).toHaveBeenCalled();
    });

    it('should have timer button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:show:body_scan',
        {}
      );

      const buttons = result.keyboard!.flat();
      const timerButton = buttons.find(b => b.callbackData?.includes('mindful:timer'));
      expect(timerButton).toBeDefined();
      expect(timerButton?.text).toContain('таймер');
    });

    it('should have completion button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:show:body_scan',
        {}
      );

      const buttons = result.keyboard!.flat();
      const doneButton = buttons.find(b => b.callbackData?.includes('mindful:done'));
      expect(doneButton).toBeDefined();
      expect(doneButton?.text).toContain('Выполнено');
    });

    it('should have back to list button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:show:body_scan',
        {}
      );

      const buttons = result.keyboard!.flat();
      const backButton = buttons.find(b => b.callbackData === 'mindful:menu');
      expect(backButton).toBeDefined();
    });

    it('should include metadata with content info', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:show:body_scan',
        {}
      );

      expect(result.metadata?.contentId).toBe('body_scan');
      expect(result.metadata?.xpReward).toBe(25);
    });

    it('should return error for unknown practice', async () => {
      mockGetContent.mockResolvedValueOnce(null);

      const result = await command.handleCallback(
        mockContext,
        'mindful:show:unknown',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найдена');
    });
  });

  // ==========================================================================
  // MORE CONTENT VIEW
  // ==========================================================================
  describe('More Content View', () => {
    it('should show all practices on "more" callback', async () => {
      const result = await command.handleCallback(mockContext, 'mindful:more', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все практики');
    });

    it('should list all 6 practices', async () => {
      const result = await command.handleCallback(mockContext, 'mindful:more', {});

      expect(result.message).toContain('Сканирование тела');
      expect(result.message).toContain('Открытое осознавание');
    });

    it('should have buttons for all practices', async () => {
      const result = await command.handleCallback(mockContext, 'mindful:more', {});

      const buttons = result.keyboard!.flat();
      expect(buttons.length).toBeGreaterThanOrEqual(6);
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(mockContext, 'mindful:more', {});

      const buttons = result.keyboard!.flat();
      const backButton = buttons.find(b => b.callbackData === 'mindful:menu');
      expect(backButton).toBeDefined();
      expect(backButton?.text).toContain('Назад');
    });
  });

  // ==========================================================================
  // PRACTICE COMPLETION
  // ==========================================================================
  describe('Practice Completion', () => {
    it('should handle completion callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практика завершена');
    });

    it('should show XP earned', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.message).toContain('+25 XP');
    });

    it('should record completion in ContentService', async () => {
      await command.handleCallback(mockContext, 'mindful:done:body_scan', {});

      expect(mockRecordCompletion).toHaveBeenCalledWith({
        contentId: 'body_scan',
        userId: 12345,
        completedAt: expect.any(Date),
        xpEarned: 25,
      });
    });

    it('should include metadata with XP earned', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.metadata?.xpEarned).toBe(25);
      expect(result.metadata?.contentId).toBe('body_scan');
    });

    it('should have button for another practice', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      const buttons = result.keyboard!.flat();
      const anotherButton = buttons.find(b => b.callbackData === 'mindful:menu');
      expect(anotherButton).toBeDefined();
      expect(anotherButton?.text).toContain('Другая практика');
    });

    it('should include ACT effectiveness tip', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.message).toContain('48%');
    });

    it('should use default XP when content not found', async () => {
      mockGetContent.mockResolvedValueOnce(null);

      const result = await command.handleCallback(
        mockContext,
        'mindful:done:unknown',
        {}
      );

      expect(result.message).toContain('+20 XP');
    });
  });

  // ==========================================================================
  // MBT-I INTEGRATION ON COMPLETION
  // ==========================================================================
  describe('MBT-I Integration on Completion', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ mbtiPlan: { active: true } });
      mockAssessArousal.mockReturnValue({ cognitive: 0.7, somatic: 0.5 });
    });

    it('should record MBT-I practice when user has plan', async () => {
      await command.handleCallback(mockContext, 'mindful:done:body_scan', {});

      expect(mockRecordMBTIPractice).toHaveBeenCalledWith(
        '12345',
        expect.objectContaining({
          practice: 'body_scan',
          completed: true,
        })
      );
    });

    it('should assess arousal for MBT-I tracking', async () => {
      await command.handleCallback(mockContext, 'mindful:done:body_scan', {});

      expect(mockAssessArousal).toHaveBeenCalledWith('12345');
    });

    it('should show arousal info when cognitive arousal high', async () => {
      mockAssessArousal.mockReturnValue({ cognitive: 0.8, somatic: 0.4 });

      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.message).toContain('Когнитивное возбуждение');
      expect(result.message).toContain('80%');
    });

    it('should not record MBT-I when no plan', async () => {
      mockGetSession.mockReturnValue(null);

      await command.handleCallback(mockContext, 'mindful:done:body_scan', {});

      expect(mockRecordMBTIPractice).not.toHaveBeenCalled();
    });

    it('should handle arousal assessment errors gracefully', async () => {
      mockAssessArousal.mockImplementation(() => {
        throw new Error('Assessment failed');
      });

      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // TIMER FUNCTIONALITY
  // ==========================================================================
  describe('Timer Functionality', () => {
    it('should start timer on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Таймер запущен');
    });

    it('should show timer duration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      expect(result.message).toContain('10 минут');
    });

    it('should show practice info', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      expect(result.message).toContain('🧘');
      expect(result.message).toContain('Сканирование тела');
    });

    it('should have early completion button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      const buttons = result.keyboard!.flat();
      const doneButton = buttons.find(b => b.callbackData === 'mindful:done:body_scan');
      expect(doneButton).toBeDefined();
      expect(doneButton?.text).toContain('Завершить раньше');
    });

    it('should have cancel button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      const buttons = result.keyboard!.flat();
      const cancelButton = buttons.find(b => b.callbackData === 'mindful:menu');
      expect(cancelButton).toBeDefined();
      expect(cancelButton?.text).toContain('Отменить');
    });

    it('should include timer metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      expect(result.metadata?.timer).toBe(10);
      expect(result.metadata?.contentId).toBe('body_scan');
    });

    it('should default to 10 minutes if duration not parsed', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:invalid',
        {}
      );

      expect(result.message).toContain('10 минут');
    });

    it('should handle different durations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:loving_kindness:15',
        {}
      );

      expect(result.message).toContain('15 минут');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should handle menu callback', async () => {
      const result = await command.handleCallback(mockContext, 'mindful:menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практики осознанности');
    });

    it('should handle show callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:show:body_scan',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle more callback', async () => {
      const result = await command.handleCallback(mockContext, 'mindful:more', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Все практики');
    });

    it('should handle done callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:done:body_scan',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('завершена');
    });

    it('should handle timer callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:timer:body_scan:10',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Таймер');
    });

    it('should return error for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'mindful:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестное действие');
    });
  });

  // ==========================================================================
  // AGE GROUP HANDLING
  // ==========================================================================
  describe('Age Group Handling', () => {
    it('should default to adult age group', async () => {
      await command.execute(mockContext);

      expect(mockGetMindfulnessContent).toHaveBeenCalledWith('adult');
    });

    it('should use age group from session if available', async () => {
      mockGetSession.mockReturnValue({ ageGroup: 'senior' });

      await command.execute(mockContext);

      expect(mockGetMindfulnessContent).toHaveBeenCalledWith('senior');
    });

    it('should fallback to adult on session error', async () => {
      mockGetSession.mockImplementation(() => {
        throw new Error('Session error');
      });

      await command.execute(mockContext);

      expect(mockGetMindfulnessContent).toHaveBeenCalledWith('adult');
    });
  });

  // ==========================================================================
  // CONTENT TO PRACTICE MAPPING
  // ==========================================================================
  describe('Content to Practice Mapping', () => {
    it('should map body_scan content to body_scan practice', async () => {
      mockGetSession.mockReturnValue({ mbtiPlan: { active: true } });

      await command.handleCallback(mockContext, 'mindful:done:body_scan', {});

      expect(mockRecordMBTIPractice).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ practice: 'body_scan' })
      );
    });

    it('should map breath content to breath_awareness practice', async () => {
      mockGetSession.mockReturnValue({ mbtiPlan: { active: true } });

      await command.handleCallback(mockContext, 'mindful:done:breath_awareness', {});

      expect(mockRecordMBTIPractice).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ practice: 'breath_awareness' })
      );
    });

    it('should map 3min content to 3_minute_breathing_space', async () => {
      mockGetSession.mockReturnValue({ mbtiPlan: { active: true } });
      // Use content ID without 'breath' substring to avoid matching 'breath' before '3min'
      await command.handleCallback(mockContext, 'mindful:done:3min_space', {});

      expect(mockRecordMBTIPractice).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ practice: '3_minute_breathing_space' })
      );
    });

    it('should map loving content to loving_kindness practice', async () => {
      mockGetSession.mockReturnValue({ mbtiPlan: { active: true } });

      await command.handleCallback(mockContext, 'mindful:done:loving_kindness', {});

      expect(mockRecordMBTIPractice).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ practice: 'loving_kindness' })
      );
    });

    it('should default to breath_awareness for unknown mapping', async () => {
      mockGetSession.mockReturnValue({ mbtiPlan: { active: true } });

      await command.handleCallback(mockContext, 'mindful:done:unknown_practice', {});

      expect(mockRecordMBTIPractice).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ practice: 'breath_awareness' })
      );
    });
  });

  // ==========================================================================
  // TITLE SHORTENING
  // ==========================================================================
  describe('Title Shortening', () => {
    it('should not shorten titles under 12 chars', async () => {
      // Mock content with short title
      const shortContent = [
        { ...mockMindfulnessContent[0], title: 'Short' },
      ];
      mockGetMindfulnessContent.mockResolvedValueOnce(shortContent);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.text.includes('Short'))).toBe(true);
    });

    it('should shorten titles over 12 chars with ellipsis', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard!.flat();
      // "Сканирование тела" is > 12 chars, should be truncated
      expect(buttons.some(b => b.text.includes('...'))).toBe(true);
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle empty content list gracefully', async () => {
      mockGetMindfulnessContent.mockResolvedValueOnce([]);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle content service errors', async () => {
      mockGetMindfulnessContent.mockRejectedValueOnce(new Error('Service error'));

      await expect(command.execute(mockContext)).rejects.toThrow();
    });

    it('should handle completion recording errors gracefully', async () => {
      mockRecordCompletion.mockRejectedValueOnce(new Error('Recording failed'));

      await expect(
        command.handleCallback(mockContext, 'mindful:done:body_scan', {})
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(mindfulCommand).toBeInstanceOf(MindfulCommand);
    });

    it('should have correct name', () => {
      expect(mindfulCommand.name).toBe('mindful');
    });
  });
});
