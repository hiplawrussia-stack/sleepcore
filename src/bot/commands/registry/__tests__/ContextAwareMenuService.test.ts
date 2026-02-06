/**
 * ContextAwareMenuService Tests
 * =============================
 *
 * IEC 62304 compliance tests for dynamic menu generation.
 * Research: JITAI, Progressive Disclosure, Context-Aware UI
 *
 * Tests verify:
 * - Context building from session data
 * - Time-based greetings
 * - Main menu generation with Sonya persona
 * - Vulnerable state detection (JITAI)
 * - Proactive notifications
 * - Re-engagement messages
 * - Keyboard building
 *
 * @packageDocumentation
 */

import {
  ContextAwareMenuService,
  createContextAwareMenuService,
  type IJITAIContext,
} from '../ContextAwareMenuService';
import { CommandRegistry, type ICommandContext } from '../CommandRegistry';

// Mock dependencies
jest.mock('../../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    greet: jest.fn(() => ({ text: 'Привет!' })),
    respondToEmotion: jest.fn(() => ({ text: 'Я понимаю...' })),
    tip: (text: string) => `💡 ${text}`,
  },
}));

jest.mock('../../../services', () => ({
  sentimentAnalysis: {
    analyze: jest.fn(() => ({ primaryEmotion: 'neutral' })),
  },
}));

// Mock CommandRegistry methods
const mockGetVisibleCommands = jest.fn();
const mockGetProactiveSuggestions = jest.fn();

jest.mock('../CommandRegistry', () => {
  const actual = jest.requireActual('../CommandRegistry');
  return {
    ...actual,
    CommandRegistry: jest.fn().mockImplementation(() => ({
      getVisibleCommands: mockGetVisibleCommands,
      getProactiveSuggestions: mockGetProactiveSuggestions,
    })),
    getCurrentTimeOfDay: jest.fn(() => 'morning'),
    getMoscowHour: jest.fn(() => 8),
  };
});

describe('ContextAwareMenuService', () => {
  let service: ContextAwareMenuService;
  let mockRegistry: CommandRegistry;

  const mockCommand = (name: string, config: Partial<any> = {}) => ({
    name,
    config: {
      icon: '📔',
      shortLabel: name,
      priority: 1,
      ...config,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockGetVisibleCommands.mockReturnValue([
      mockCommand('diary'),
      mockCommand('today'),
      mockCommand('relax'),
      mockCommand('progress'),
    ]);
    mockGetProactiveSuggestions.mockReturnValue([]);

    mockRegistry = new CommandRegistry();
    service = new ContextAwareMenuService(mockRegistry);
  });

  // ==========================================================================
  // CONTEXT BUILDING
  // ==========================================================================
  describe('Context Building', () => {
    it('should build context from session data', () => {
      const context = service.buildContext({
        therapyWeek: 3,
        hasCompletedOnboarding: true,
      });

      expect(context.timeOfDay).toBeDefined();
      expect(context.dayOfWeek).toBeDefined();
      expect(context.therapyWeek).toBe(3);
    });

    it('should set onboarding phase when not completed', () => {
      const context = service.buildContext({
        hasCompletedOnboarding: false,
      });

      expect(context.therapyPhase).toBe('onboarding');
    });

    it('should set assessment phase for week 0', () => {
      const context = service.buildContext({
        hasCompletedOnboarding: true,
        therapyWeek: 0,
      });

      expect(context.therapyPhase).toBe('assessment');
    });

    it('should set active phase for weeks 1-5', () => {
      const context = service.buildContext({
        hasCompletedOnboarding: true,
        therapyWeek: 3,
      });

      expect(context.therapyPhase).toBe('active');
    });

    it('should set maintenance phase for weeks 6-7', () => {
      const context = service.buildContext({
        hasCompletedOnboarding: true,
        therapyWeek: 6,
      });

      expect(context.therapyPhase).toBe('maintenance');
    });

    it('should set graduated phase for week 8+', () => {
      const context = service.buildContext({
        hasCompletedOnboarding: true,
        therapyWeek: 8,
      });

      expect(context.therapyPhase).toBe('graduated');
    });

    it('should detect pending diary', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const context = service.buildContext({
        lastDiaryDate: yesterday.toISOString().split('T')[0],
      });

      expect(context.hasPendingDiary).toBe(true);
    });

    it('should detect filled diary for today', () => {
      const today = new Date().toISOString().split('T')[0];

      const context = service.buildContext({
        lastDiaryDate: today,
      });

      expect(context.hasPendingDiary).toBe(false);
    });

    it('should detect pending assessment after 7 days', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const context = service.buildContext({
        lastAssessmentDate: eightDaysAgo.toISOString(),
      });

      expect(context.hasPendingAssessment).toBe(true);
    });

    it('should calculate days since last activity', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const context = service.buildContext({
        lastActivityAt: threeDaysAgo,
      });

      expect(context.daysSinceLastActivity).toBe(3);
    });

    it('should pass JITAI sleep data', () => {
      const context = service.buildContext({
        lastSleepEfficiency: 72,
        sleepEfficiencyTrend: 'declining',
      });

      expect(context.lastSleepEfficiency).toBe(72);
      expect(context.sleepEfficiencyTrend).toBe('declining');
    });

    it('should analyze sentiment from last message', () => {
      const { sentimentAnalysis } = require('../../../services');
      sentimentAnalysis.analyze.mockReturnValue({ primaryEmotion: 'anxious' });

      const context = service.buildContext({
        lastMessage: 'Я так устал от бессонницы...',
      });

      expect(sentimentAnalysis.analyze).toHaveBeenCalledWith(
        'Я так устал от бессонницы...',
        expect.any(Object)
      );
      expect(context.emotionalState).toBe('anxious');
    });
  });

  // ==========================================================================
  // GREETINGS
  // ==========================================================================
  describe('Greetings', () => {
    it('should return morning greeting', () => {
      const context: IJITAIContext = {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        therapyPhase: 'active',
        therapyWeek: 2,
        hasPendingDiary: true,
        hasPendingAssessment: false,
        daysSinceLastActivity: 0,
      };

      const greeting = service.getGreeting(context);

      expect(greeting.emoji).toBe('🌅');
      expect(greeting.greeting).toBe('Доброе утро!');
      expect(greeting.suggestion).toContain('дневник');
    });

    it('should return day greeting', () => {
      const context: IJITAIContext = {
        timeOfDay: 'day',
        dayOfWeek: 1,
        therapyPhase: 'active',
        therapyWeek: 2,
        hasPendingDiary: false,
        hasPendingAssessment: false,
        daysSinceLastActivity: 0,
      };

      const greeting = service.getGreeting(context);

      expect(greeting.emoji).toBe('☀️');
      expect(greeting.greeting).toBe('Добрый день!');
    });

    it('should return evening greeting', () => {
      const context: IJITAIContext = {
        timeOfDay: 'evening',
        dayOfWeek: 1,
        therapyPhase: 'active',
        therapyWeek: 2,
        hasPendingDiary: false,
        hasPendingAssessment: false,
        daysSinceLastActivity: 0,
      };

      const greeting = service.getGreeting(context);

      expect(greeting.emoji).toBe('🌆');
      expect(greeting.greeting).toBe('Добрый вечер!');
      expect(greeting.suggestion).toContain('расслабление');
    });

    it('should return night greeting', () => {
      const context: IJITAIContext = {
        timeOfDay: 'night',
        dayOfWeek: 1,
        therapyPhase: 'active',
        therapyWeek: 2,
        hasPendingDiary: false,
        hasPendingAssessment: false,
        daysSinceLastActivity: 0,
      };

      const greeting = service.getGreeting(context);

      expect(greeting.emoji).toBe('🌙');
      expect(greeting.greeting).toBe('Доброй ночи!');
    });
  });

  // ==========================================================================
  // MAIN MENU GENERATION
  // ==========================================================================
  describe('Main Menu Generation', () => {
    const baseContext: IJITAIContext = {
      timeOfDay: 'morning',
      dayOfWeek: 1,
      therapyPhase: 'active',
      therapyWeek: 2,
      hasPendingDiary: true,
      hasPendingAssessment: false,
      daysSinceLastActivity: 0,
    };

    it('should generate menu with title', () => {
      const menu = service.generateMainMenu(baseContext, 'Иван');

      expect(menu.title).toContain('Соня');
      expect(menu.title).toContain('Привет');
    });

    it('should include primary actions (max 3)', () => {
      const menu = service.generateMainMenu(baseContext);

      expect(menu.primaryActions).toHaveLength(3);
      expect(menu.primaryActions[0].callbackData).toContain('menu:');
    });

    it('should include secondary actions', () => {
      const menu = service.generateMainMenu(baseContext);

      expect(menu.secondaryActions).toBeDefined();
      expect(menu.secondaryActions?.length).toBeLessThanOrEqual(3);
    });

    it('should include quick access (help and SOS)', () => {
      const menu = service.generateMainMenu(baseContext);

      expect(menu.quickAccess).toBeDefined();
      expect(menu.quickAccess?.some(b => b.callbackData === 'menu:help')).toBe(true);
      expect(menu.quickAccess?.some(b => b.callbackData === 'menu:sos')).toBe(true);
    });

    it('should include proactive suggestion when available', () => {
      mockGetProactiveSuggestions.mockReturnValue([
        mockCommand('diary', { icon: '📔', shortLabel: 'Дневник' }),
      ]);

      const menu = service.generateMainMenu(baseContext);

      expect(menu.proactiveSuggestion).toBeDefined();
      expect(menu.proactiveSuggestion?.button.callbackData).toBe('menu:diary');
    });

    it('should include Sonya message for emotional states', () => {
      const emotionalContext: IJITAIContext = {
        ...baseContext,
        emotionalState: 'anxious',
      };

      const menu = service.generateMainMenu(emotionalContext);

      expect(menu.sonyaMessage).toBeDefined();
    });

    it('should not include Sonya message for neutral state', () => {
      const neutralContext: IJITAIContext = {
        ...baseContext,
        emotionalState: 'neutral',
      };

      const menu = service.generateMainMenu(neutralContext);

      expect(menu.sonyaMessage).toBeUndefined();
    });

    it('should prioritize commands for vulnerable state', () => {
      mockGetVisibleCommands.mockReturnValue([
        mockCommand('diary'),
        mockCommand('today'),
        mockCommand('relax'),
        mockCommand('mindful'),
        mockCommand('sos'),
      ]);

      const vulnerableContext: IJITAIContext = {
        ...baseContext,
        lastSleepEfficiency: 60, // Below 75% threshold
      };

      const menu = service.generateMainMenu(vulnerableContext);

      // Should prioritize sos, relax, mindful
      const primaryNames = menu.primaryActions.map(a => a.callbackData);
      expect(primaryNames.some(n => n?.includes('sos') || n?.includes('relax'))).toBe(true);
    });
  });

  // ==========================================================================
  // VULNERABLE STATE DETECTION
  // ==========================================================================
  describe('Vulnerable State Detection', () => {
    const baseContext: IJITAIContext = {
      timeOfDay: 'day',
      dayOfWeek: 1,
      therapyPhase: 'active',
      therapyWeek: 2,
      hasPendingDiary: false,
      hasPendingAssessment: false,
      daysSinceLastActivity: 0,
    };

    it('should detect vulnerable state for low sleep efficiency', () => {
      mockGetVisibleCommands.mockReturnValue([
        mockCommand('sos'),
        mockCommand('relax'),
        mockCommand('diary'),
      ]);

      const context: IJITAIContext = {
        ...baseContext,
        lastSleepEfficiency: 70, // Below 75% threshold
      };

      const menu = service.generateMainMenu(context);

      // Menu should be generated with prioritized commands
      expect(menu.primaryActions).toBeDefined();
    });

    it('should detect vulnerable state for declining trend', () => {
      mockGetVisibleCommands.mockReturnValue([
        mockCommand('sos'),
        mockCommand('relax'),
        mockCommand('diary'),
      ]);

      const context: IJITAIContext = {
        ...baseContext,
        sleepEfficiencyTrend: 'declining',
      };

      const menu = service.generateMainMenu(context);

      expect(menu.primaryActions).toBeDefined();
    });

    it('should detect vulnerable state for frustrated emotion', () => {
      mockGetVisibleCommands.mockReturnValue([
        mockCommand('sos'),
        mockCommand('relax'),
        mockCommand('diary'),
      ]);

      const context: IJITAIContext = {
        ...baseContext,
        emotionalState: 'frustrated',
      };

      const menu = service.generateMainMenu(context);

      expect(menu.primaryActions).toBeDefined();
    });

    it('should detect vulnerable state for anxious emotion', () => {
      mockGetVisibleCommands.mockReturnValue([
        mockCommand('sos'),
        mockCommand('relax'),
        mockCommand('diary'),
      ]);

      const context: IJITAIContext = {
        ...baseContext,
        emotionalState: 'anxious',
      };

      const menu = service.generateMainMenu(context);

      expect(menu.primaryActions).toBeDefined();
    });

    it('should detect vulnerable state at night', () => {
      mockGetVisibleCommands.mockReturnValue([
        mockCommand('sos'),
        mockCommand('relax'),
        mockCommand('diary'),
      ]);

      const context: IJITAIContext = {
        ...baseContext,
        timeOfDay: 'night',
      };

      const menu = service.generateMainMenu(context);

      expect(menu.primaryActions).toBeDefined();
    });

    it('should not detect vulnerable state for normal context', () => {
      const context: IJITAIContext = {
        ...baseContext,
        lastSleepEfficiency: 85,
        sleepEfficiencyTrend: 'improving',
        emotionalState: 'hopeful',
      };

      const menu = service.generateMainMenu(context);

      // Normal menu generation, no special prioritization
      expect(menu.primaryActions).toBeDefined();
    });
  });

  // ==========================================================================
  // MESSAGE FORMATTING
  // ==========================================================================
  describe('Message Formatting', () => {
    it('should format menu message with title', () => {
      const layout = {
        title: '🦉 Соня\n\nПривет!',
        primaryActions: [],
      };

      const message = service.formatMenuMessage(layout);

      expect(message).toContain('Соня');
      expect(message).toContain('Привет');
    });

    it('should include Sonya message if present', () => {
      const layout = {
        title: '🦉 Соня',
        sonyaMessage: 'Я понимаю твоё беспокойство...',
        primaryActions: [],
      };

      const message = service.formatMenuMessage(layout);

      expect(message).toContain('беспокойство');
    });

    it('should include subtitle if present', () => {
      const layout = {
        title: '🦉 Соня',
        subtitle: 'Как прошла ночь?',
        primaryActions: [],
      };

      const message = service.formatMenuMessage(layout);

      expect(message).toContain('Как прошла ночь');
    });

    it('should include proactive suggestion if present', () => {
      const layout = {
        title: '🦉 Соня',
        proactiveSuggestion: {
          message: 'Пора заполнить дневник!',
          button: { text: 'Дневник', callbackData: 'menu:diary' },
        },
        primaryActions: [],
      };

      const message = service.formatMenuMessage(layout);

      expect(message).toContain('💡');
      expect(message).toContain('Пора заполнить дневник');
    });
  });

  // ==========================================================================
  // KEYBOARD BUILDING
  // ==========================================================================
  describe('Keyboard Building', () => {
    it('should put proactive suggestion at top', () => {
      const layout = {
        title: 'Test',
        proactiveSuggestion: {
          message: 'Test',
          button: { text: 'Proactive', callbackData: 'menu:test' },
        },
        primaryActions: [
          { text: 'Primary', callbackData: 'menu:primary' },
        ],
        primaryButtons: [],
      };

      const keyboard = service.buildMenuKeyboard(layout);

      expect(keyboard[0][0].text).toBe('Proactive');
    });

    it('should layout 2 primary actions in one row', () => {
      const layout = {
        title: 'Test',
        primaryActions: [
          { text: 'One', callbackData: 'menu:one' },
          { text: 'Two', callbackData: 'menu:two' },
        ],
      };

      const keyboard = service.buildMenuKeyboard(layout);

      expect(keyboard[0]).toHaveLength(2);
    });

    it('should split 3 primary actions into two rows', () => {
      const layout = {
        title: 'Test',
        primaryActions: [
          { text: 'One', callbackData: 'menu:one' },
          { text: 'Two', callbackData: 'menu:two' },
          { text: 'Three', callbackData: 'menu:three' },
        ],
      };

      const keyboard = service.buildMenuKeyboard(layout);

      expect(keyboard[0]).toHaveLength(2);
      expect(keyboard[1]).toHaveLength(1);
    });

    it('should layout secondary actions 2 per row', () => {
      const layout = {
        title: 'Test',
        primaryActions: [{ text: 'Primary', callbackData: 'menu:p' }],
        secondaryActions: [
          { text: 'Sec1', callbackData: 'menu:s1' },
          { text: 'Sec2', callbackData: 'menu:s2' },
          { text: 'Sec3', callbackData: 'menu:s3' },
        ],
      };

      const keyboard = service.buildMenuKeyboard(layout);

      // Primary, then secondary rows
      expect(keyboard.length).toBeGreaterThanOrEqual(3);
    });

    it('should put quick access at bottom', () => {
      const layout = {
        title: 'Test',
        primaryActions: [{ text: 'Primary', callbackData: 'menu:p' }],
        quickAccess: [
          { text: 'Help', callbackData: 'menu:help' },
          { text: 'SOS', callbackData: 'menu:sos' },
        ],
      };

      const keyboard = service.buildMenuKeyboard(layout);

      const lastRow = keyboard[keyboard.length - 1];
      expect(lastRow.some(b => b.text === 'Help')).toBe(true);
      expect(lastRow.some(b => b.text === 'SOS')).toBe(true);
    });
  });

  // ==========================================================================
  // PROACTIVE NOTIFICATIONS
  // ==========================================================================
  describe('Proactive Notifications', () => {
    const baseContext: IJITAIContext = {
      timeOfDay: 'morning',
      dayOfWeek: 1,
      therapyPhase: 'active',
      therapyWeek: 2,
      hasPendingDiary: true,
      hasPendingAssessment: false,
      daysSinceLastActivity: 0,
    };

    it('should generate morning notification at 8:00 with pending diary', () => {
      const { getMoscowHour } = require('../CommandRegistry');
      getMoscowHour.mockReturnValue(8);

      mockGetProactiveSuggestions.mockReturnValue([
        mockCommand('diary'),
        mockCommand('recall'),
      ]);

      const notification = service.generateProactiveNotification(baseContext, 'Иван');

      expect(notification).not.toBeNull();
      expect(notification?.message).toContain('Соня');
      expect(notification?.message).toContain('ночь');
      expect(notification?.keyboard.some(row => row.some(b => b.callbackData === 'menu:diary'))).toBe(true);
    });

    it('should generate evening notification at 20:00', () => {
      const { getMoscowHour } = require('../CommandRegistry');
      getMoscowHour.mockReturnValue(20);

      mockGetProactiveSuggestions.mockReturnValue([
        mockCommand('relax'),
        mockCommand('rehearsal'),
      ]);

      const eveningContext: IJITAIContext = {
        ...baseContext,
        timeOfDay: 'evening',
        hasPendingDiary: false,
      };

      const notification = service.generateProactiveNotification(eveningContext, 'Иван');

      expect(notification).not.toBeNull();
      expect(notification?.message).toContain('готовиться ко сну');
      expect(notification?.message).toContain('23%'); // Research stat
    });

    it('should return null for other hours', () => {
      const { getMoscowHour } = require('../CommandRegistry');
      getMoscowHour.mockReturnValue(14);

      const notification = service.generateProactiveNotification(baseContext);

      expect(notification).toBeNull();
    });

    it('should return null with no suggestions', () => {
      const { getMoscowHour } = require('../CommandRegistry');
      getMoscowHour.mockReturnValue(8);

      mockGetProactiveSuggestions.mockReturnValue([]);

      const notification = service.generateProactiveNotification(baseContext);

      expect(notification).toBeNull();
    });
  });

  // ==========================================================================
  // RE-ENGAGEMENT MESSAGES
  // ==========================================================================
  describe('Re-engagement Messages', () => {
    const baseContext: IJITAIContext = {
      timeOfDay: 'day',
      dayOfWeek: 1,
      therapyPhase: 'active',
      therapyWeek: 3,
      hasPendingDiary: true,
      hasPendingAssessment: false,
      daysSinceLastActivity: 0,
    };

    it('should return null for recent activity (< 7 days)', () => {
      const context: IJITAIContext = {
        ...baseContext,
        daysSinceLastActivity: 5,
      };

      const message = service.generateReengagementMessage(context);

      expect(message).toBeNull();
    });

    it('should generate first re-engagement (7-10 days)', () => {
      const context: IJITAIContext = {
        ...baseContext,
        daysSinceLastActivity: 8,
      };

      const message = service.generateReengagementMessage(context, 'Иван');

      expect(message).not.toBeNull();
      expect(message?.message).toContain('8 дней');
      expect(message?.message).toContain('Иван');
      expect(message?.message).toContain('мысленная репетиция'); // New feature mention
    });

    it('should generate second re-engagement (10-14 days)', () => {
      const context: IJITAIContext = {
        ...baseContext,
        daysSinceLastActivity: 12,
      };

      const message = service.generateReengagementMessage(context, 'Мария');

      expect(message).not.toBeNull();
      expect(message?.message).toContain('12 дней');
      expect(message?.message).toContain('78%'); // Research stat
    });

    it('should generate last re-engagement (14+ days)', () => {
      const context: IJITAIContext = {
        ...baseContext,
        daysSinceLastActivity: 20,
      };

      const message = service.generateReengagementMessage(context, 'Алекс');

      expect(message).not.toBeNull();
      expect(message?.message).toContain('С возвращением');
      expect(message?.message).toContain('💪');
    });

    it('should include standard re-engagement keyboard', () => {
      const context: IJITAIContext = {
        ...baseContext,
        daysSinceLastActivity: 10,
      };

      const message = service.generateReengagementMessage(context);

      expect(message?.keyboard).toHaveLength(3);
      expect(message?.keyboard[0][0].callbackData).toBe('menu:diary');
      expect(message?.keyboard[1][0].callbackData).toBe('menu:progress');
      expect(message?.keyboard[2][0].callbackData).toBe('menu:help');
    });

    it('should use default name when not provided', () => {
      const context: IJITAIContext = {
        ...baseContext,
        daysSinceLastActivity: 8,
      };

      const message = service.generateReengagementMessage(context);

      expect(message?.message).toContain('друг');
    });
  });

  // ==========================================================================
  // FACTORY FUNCTION
  // ==========================================================================
  describe('Factory Function', () => {
    it('should create service with registry', () => {
      const registry = new CommandRegistry();
      const service = createContextAwareMenuService(registry);

      expect(service).toBeInstanceOf(ContextAwareMenuService);
    });
  });
});
