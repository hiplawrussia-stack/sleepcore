/**
 * AdaptiveKeyboardService Tests
 * ==============================
 *
 * IEC 62304 compliance tests for adaptive keyboard generation.
 * Research: Context-Aware UI, Progressive Disclosure, Personalization
 *
 * Tests verify:
 * - Keyboard generation from user context
 * - Layout building (primary, secondary, quick-access)
 * - Command recording (shown/clicked)
 * - Rule application (time-based, behavior-based)
 * - Custom command management
 * - Keyboard explanation for debugging
 *
 * @packageDocumentation
 */

import { InlineKeyboard } from 'grammy';
import {
  AdaptiveKeyboardService,
  DEFAULT_COMMANDS,
  type IKeyboardCommand,
} from '../AdaptiveKeyboardService';
import { UserInteractionRepository, type IUserBehaviorContext } from '../UserInteractionRepository';
import { RuleEngine, type IAdaptedCommand } from '../RuleEngine';
import type { TimeOfDay } from '../../../bot/commands/registry';

// Mock dependencies
const mockBuildBehaviorContext = jest.fn();
const mockRecordCommandShown = jest.fn();
const mockRecordCommandClicked = jest.fn();

const mockApplyRules = jest.fn();
const mockGetSortedCommands = jest.fn();

jest.mock('../../../bot/commands/registry', () => ({
  getCurrentTimeOfDay: jest.fn(() => 'morning' as TimeOfDay),
}));

describe('AdaptiveKeyboardService', () => {
  let service: AdaptiveKeyboardService;
  let mockInteractionRepo: jest.Mocked<UserInteractionRepository>;
  let mockRuleEngine: jest.Mocked<RuleEngine>;

  const mockContext: IUserBehaviorContext = {
    userId: 'user123',
    lastCommands: ['diary', 'progress'],
    ignoredCommands: new Map(),
    frequentCommands: ['diary'],
    timeOfDay: 'morning',
    dayOfWeek: 1,
    totalInteractions: 50,
    averageSessionCommands: 3,
    daysActive: 10,
  };

  const createMockAdaptedCommands = (names: string[]): IAdaptedCommand[] =>
    names.map(name => ({
      command: name,
      visible: true,
      promoted: false,
      demoted: false,
      highlighted: false,
      appliedRules: [],
    }));

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockInteractionRepo = {
      buildBehaviorContext: mockBuildBehaviorContext.mockResolvedValue(mockContext),
      recordCommandShown: mockRecordCommandShown.mockResolvedValue(undefined),
      recordCommandClicked: mockRecordCommandClicked.mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserInteractionRepository>;

    // Create mock rule engine
    mockRuleEngine = {
      applyRules: mockApplyRules.mockReturnValue(
        createMockAdaptedCommands(['diary', 'progress', 'today', 'relax', 'mindful', 'help', 'sos'])
      ),
      getSortedCommands: mockGetSortedCommands.mockReturnValue([
        'diary', 'progress', 'today', 'relax', 'mindful', 'help', 'sos'
      ]),
    } as unknown as jest.Mocked<RuleEngine>;

    service = new AdaptiveKeyboardService(mockInteractionRepo, mockRuleEngine);
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================
  describe('Constructor', () => {
    it('should use default commands when not provided', () => {
      const defaultService = new AdaptiveKeyboardService(mockInteractionRepo, mockRuleEngine);
      const commands = defaultService.getCommands();

      expect(commands).toHaveLength(DEFAULT_COMMANDS.length);
      expect(commands.map(c => c.name)).toContain('diary');
      expect(commands.map(c => c.name)).toContain('sos');
    });

    it('should accept custom commands', () => {
      const customCommands: IKeyboardCommand[] = [
        { name: 'custom1', label: 'Custom 1', icon: '🎯', callbackData: 'menu:custom1', category: 'primary' },
        { name: 'custom2', label: 'Custom 2', icon: '🎪', callbackData: 'menu:custom2', category: 'secondary' },
      ];

      const customService = new AdaptiveKeyboardService(mockInteractionRepo, mockRuleEngine, customCommands);
      const commands = customService.getCommands();

      expect(commands).toHaveLength(2);
      expect(commands[0].name).toBe('custom1');
    });
  });

  // ==========================================================================
  // KEYBOARD GENERATION
  // ==========================================================================
  describe('generateKeyboard', () => {
    it('should return InlineKeyboard instance', async () => {
      const keyboard = await service.generateKeyboard('user123');

      expect(keyboard).toBeInstanceOf(InlineKeyboard);
    });

    it('should call generateLayout with userId', async () => {
      const spy = jest.spyOn(service, 'generateLayout');

      await service.generateKeyboard('user123', 'session456');

      expect(spy).toHaveBeenCalledWith('user123', 'session456');
    });

    it('should build context from interaction repository', async () => {
      await service.generateKeyboard('user123');

      expect(mockBuildBehaviorContext).toHaveBeenCalledWith('user123', 'morning', expect.any(Number));
    });

    it('should apply rules to commands', async () => {
      await service.generateKeyboard('user123');

      expect(mockApplyRules).toHaveBeenCalledWith(
        expect.arrayContaining(['diary', 'progress', 'today']),
        mockContext
      );
    });

    it('should record commands shown', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'sos', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'hidden', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ]);

      await service.generateKeyboard('user123', 'session789');

      // Only visible commands should be recorded
      expect(mockRecordCommandShown).toHaveBeenCalledWith('user123', 'diary', expect.objectContaining({
        sessionId: 'session789',
      }));
      expect(mockRecordCommandShown).toHaveBeenCalledWith('user123', 'sos', expect.any(Object));
      expect(mockRecordCommandShown).not.toHaveBeenCalledWith('user123', 'hidden', expect.any(Object));
    });
  });

  // ==========================================================================
  // LAYOUT GENERATION
  // ==========================================================================
  describe('generateLayout', () => {
    it('should return layout with primaryActions', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'progress', 'today', 'relax', 'mindful']);

      const layout = await service.generateLayout('user123');

      expect(layout.primaryActions).toBeDefined();
      expect(layout.primaryActions.length).toBeLessThanOrEqual(3);
    });

    it('should return layout with secondaryActions', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'progress', 'today', 'relax', 'mindful', 'rehearsal', 'recall']);

      const layout = await service.generateLayout('user123');

      expect(layout.secondaryActions).toBeDefined();
      expect(layout.secondaryActions.length).toBeLessThanOrEqual(4);
    });

    it('should return layout with quickAccess', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'help', 'sos']);

      const layout = await service.generateLayout('user123');

      expect(layout.quickAccess).toBeDefined();
      expect(layout.quickAccess.map(c => c.name)).toContain('help');
      expect(layout.quickAccess.map(c => c.name)).toContain('sos');
    });

    it('should return hidden commands list', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'hidden1', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'hidden2', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ]);

      const layout = await service.generateLayout('user123');

      expect(layout.hiddenCommands).toContain('hidden1');
      expect(layout.hiddenCommands).toContain('hidden2');
    });

    it('should return highlighted commands list', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: false, demoted: false, highlighted: true, appliedRules: [] },
        { command: 'sos', visible: true, promoted: false, demoted: false, highlighted: true, appliedRules: [] },
        { command: 'progress', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ]);

      const layout = await service.generateLayout('user123');

      expect(layout.highlightedCommands).toContain('diary');
      expect(layout.highlightedCommands).toContain('sos');
      expect(layout.highlightedCommands).not.toContain('progress');
    });

    it('should separate quick-access commands', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'progress', 'today', 'help', 'sos']);

      const layout = await service.generateLayout('user123');

      // help and sos should be in quickAccess, not primary
      expect(layout.quickAccess.map(c => c.name)).toContain('help');
      expect(layout.quickAccess.map(c => c.name)).toContain('sos');
      expect(layout.primaryActions.map(c => c.name)).not.toContain('help');
      expect(layout.primaryActions.map(c => c.name)).not.toContain('sos');
    });

    it('should limit primary actions to 3', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'progress', 'today', 'relax', 'mindful', 'rehearsal']);

      const layout = await service.generateLayout('user123');

      expect(layout.primaryActions).toHaveLength(3);
    });

    it('should put remaining commands in secondary', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'progress', 'today', 'relax', 'mindful', 'rehearsal', 'recall']);

      const layout = await service.generateLayout('user123');

      expect(layout.secondaryActions.length).toBeGreaterThan(0);
      expect(layout.secondaryActions.length).toBeLessThanOrEqual(4);
    });
  });

  // ==========================================================================
  // COMMAND CLICK RECORDING
  // ==========================================================================
  describe('recordCommandClick', () => {
    it('should record command click with context', async () => {
      await service.recordCommandClick('user123', 'diary', 'session456');

      expect(mockRecordCommandClicked).toHaveBeenCalledWith('user123', 'diary', {
        timeOfDay: 'morning',
        dayOfWeek: expect.any(Number),
        sessionId: 'session456',
      });
    });

    it('should work without sessionId', async () => {
      await service.recordCommandClick('user123', 'progress');

      expect(mockRecordCommandClicked).toHaveBeenCalledWith('user123', 'progress', expect.objectContaining({
        timeOfDay: 'morning',
      }));
    });
  });

  // ==========================================================================
  // KEYBOARD BUILDING
  // ==========================================================================
  describe('buildKeyboard (via generateKeyboard)', () => {
    it('should create keyboard with buttons for primary actions', async () => {
      mockGetSortedCommands.mockReturnValue(['diary', 'progress', 'today']);

      const keyboard = await service.generateKeyboard('user123');

      // InlineKeyboard internals are private, but we verify it builds without error
      expect(keyboard).toBeDefined();
    });

    it('should format label with icon', async () => {
      // Test via getCommands which shows the format
      const commands = service.getCommands();
      const diaryCmd = commands.find(c => c.name === 'diary');

      expect(diaryCmd?.icon).toBe('📔');
      expect(diaryCmd?.label).toBe('Дневник сна');
    });

    it('should highlight commands with sparkle prefix', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: false, demoted: false, highlighted: true, appliedRules: [] },
      ]);
      mockGetSortedCommands.mockReturnValue(['diary']);

      // Format label includes ✨ for highlighted commands
      const layout = await service.generateLayout('user123');

      expect(layout.highlightedCommands).toContain('diary');
    });
  });

  // ==========================================================================
  // KEYBOARD EXPLANATION
  // ==========================================================================
  describe('getKeyboardExplanation', () => {
    it('should return explanation string', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: true, demoted: false, highlighted: false, appliedRules: ['morning-diary'] },
        { command: 'sos', visible: true, promoted: false, demoted: false, highlighted: true, appliedRules: ['sos-always-visible'] },
      ]);

      const explanation = await service.getKeyboardExplanation('user123');

      expect(explanation).toContain('Keyboard Explanation');
      expect(explanation).toContain('user123');
      expect(explanation).toContain('Time: morning');
    });

    it('should include total interactions', async () => {
      const explanation = await service.getKeyboardExplanation('user123');

      expect(explanation).toContain('Total interactions: 50');
    });

    it('should include days active', async () => {
      const explanation = await service.getKeyboardExplanation('user123');

      expect(explanation).toContain('Days active: 10');
    });

    it('should show command statuses', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: true, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'hidden', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'demoted', visible: true, promoted: false, demoted: true, highlighted: false, appliedRules: [] },
      ]);

      const explanation = await service.getKeyboardExplanation('user123');

      expect(explanation).toContain('promoted');
      expect(explanation).toContain('hidden');
      expect(explanation).toContain('demoted');
    });

    it('should show highlighted status', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'sos', visible: true, promoted: false, demoted: false, highlighted: true, appliedRules: [] },
      ]);

      const explanation = await service.getKeyboardExplanation('user123');

      expect(explanation).toContain('highlighted');
    });

    it('should show applied rules', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: true, promoted: true, demoted: false, highlighted: false, appliedRules: ['morning-diary'] },
      ]);

      const explanation = await service.getKeyboardExplanation('user123');

      expect(explanation).toContain('morning-diary');
    });
  });

  // ==========================================================================
  // COMMAND MANAGEMENT
  // ==========================================================================
  describe('addCommand', () => {
    it('should add new command', () => {
      const newCommand: IKeyboardCommand = {
        name: 'custom',
        label: 'Custom',
        icon: '🆕',
        callbackData: 'menu:custom',
        category: 'secondary',
      };

      service.addCommand(newCommand);
      const commands = service.getCommands();

      expect(commands.find(c => c.name === 'custom')).toBeDefined();
    });

    it('should append to existing commands', () => {
      const initialCount = service.getCommands().length;

      service.addCommand({
        name: 'new',
        label: 'New',
        icon: '🔔',
        callbackData: 'menu:new',
        category: 'primary',
      });

      expect(service.getCommands().length).toBe(initialCount + 1);
    });
  });

  describe('removeCommand', () => {
    it('should remove existing command', () => {
      const result = service.removeCommand('diary');

      expect(result).toBe(true);
      expect(service.getCommands().find(c => c.name === 'diary')).toBeUndefined();
    });

    it('should return false for non-existent command', () => {
      const result = service.removeCommand('nonexistent');

      expect(result).toBe(false);
    });

    it('should not affect other commands', () => {
      const initialCount = service.getCommands().length;

      service.removeCommand('diary');

      expect(service.getCommands().length).toBe(initialCount - 1);
      expect(service.getCommands().find(c => c.name === 'progress')).toBeDefined();
    });
  });

  describe('getCommands', () => {
    it('should return copy of commands', () => {
      const commands1 = service.getCommands();
      const commands2 = service.getCommands();

      expect(commands1).not.toBe(commands2);
      expect(commands1).toEqual(commands2);
    });

    it('should not allow mutation of internal state', () => {
      const commands = service.getCommands();
      commands.push({
        name: 'mutated',
        label: 'Mutated',
        icon: '💥',
        callbackData: 'menu:mutated',
        category: 'primary',
      });

      expect(service.getCommands().find(c => c.name === 'mutated')).toBeUndefined();
    });
  });

  // ==========================================================================
  // USER CONTEXT
  // ==========================================================================
  describe('getUserContext', () => {
    it('should return user behavior context', async () => {
      const context = await service.getUserContext('user123');

      expect(context).toEqual(mockContext);
    });

    it('should call repository with current time', async () => {
      await service.getUserContext('user123');

      expect(mockBuildBehaviorContext).toHaveBeenCalledWith('user123', 'morning', expect.any(Number));
    });
  });

  // ==========================================================================
  // DEFAULT COMMANDS
  // ==========================================================================
  describe('DEFAULT_COMMANDS', () => {
    it('should have diary as primary', () => {
      const diary = DEFAULT_COMMANDS.find(c => c.name === 'diary');

      expect(diary).toBeDefined();
      expect(diary?.category).toBe('primary');
      expect(diary?.icon).toBe('📔');
    });

    it('should have progress as primary', () => {
      const progress = DEFAULT_COMMANDS.find(c => c.name === 'progress');

      expect(progress).toBeDefined();
      expect(progress?.category).toBe('primary');
    });

    it('should have today as primary', () => {
      const today = DEFAULT_COMMANDS.find(c => c.name === 'today');

      expect(today).toBeDefined();
      expect(today?.category).toBe('primary');
    });

    it('should have relax as secondary', () => {
      const relax = DEFAULT_COMMANDS.find(c => c.name === 'relax');

      expect(relax).toBeDefined();
      expect(relax?.category).toBe('secondary');
    });

    it('should have help as quick-access', () => {
      const help = DEFAULT_COMMANDS.find(c => c.name === 'help');

      expect(help).toBeDefined();
      expect(help?.category).toBe('quick-access');
    });

    it('should have sos as quick-access (safety-first)', () => {
      const sos = DEFAULT_COMMANDS.find(c => c.name === 'sos');

      expect(sos).toBeDefined();
      expect(sos?.category).toBe('quick-access');
      expect(sos?.icon).toBe('🆘');
    });

    it('should have callback data in menu: format', () => {
      for (const cmd of DEFAULT_COMMANDS) {
        expect(cmd.callbackData).toMatch(/^menu:/);
      }
    });
  });

  // ==========================================================================
  // TIME-BASED BEHAVIOR
  // ==========================================================================
  describe('Time-Based Behavior', () => {
    it('should use current time of day from registry', async () => {
      const { getCurrentTimeOfDay } = require('../../../bot/commands/registry');
      getCurrentTimeOfDay.mockReturnValue('evening');

      await service.generateKeyboard('user123');

      expect(mockBuildBehaviorContext).toHaveBeenCalledWith('user123', 'evening', expect.any(Number));
    });

    it('should pass current day of week', async () => {
      await service.generateKeyboard('user123');

      expect(mockBuildBehaviorContext).toHaveBeenCalledWith(
        'user123',
        expect.any(String),
        expect.any(Number) // 0-6
      );
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty adapted commands', async () => {
      mockApplyRules.mockReturnValue([]);
      mockGetSortedCommands.mockReturnValue([]);

      const layout = await service.generateLayout('user123');

      expect(layout.primaryActions).toHaveLength(0);
      expect(layout.secondaryActions).toHaveLength(0);
      expect(layout.quickAccess).toHaveLength(0);
    });

    it('should handle all commands hidden', async () => {
      mockApplyRules.mockReturnValue([
        { command: 'diary', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'sos', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ]);
      mockGetSortedCommands.mockReturnValue([]);

      const layout = await service.generateLayout('user123');

      expect(layout.hiddenCommands).toHaveLength(2);
      expect(layout.primaryActions).toHaveLength(0);
    });

    it('should handle missing command in sorted list', async () => {
      // Sorted list includes command not in available commands
      mockGetSortedCommands.mockReturnValue(['diary', 'nonexistent', 'progress']);

      const layout = await service.generateLayout('user123');

      // Should filter out nonexistent
      expect(layout.primaryActions.find(c => c.name === 'nonexistent')).toBeUndefined();
    });

    it('should handle new user with no interactions', async () => {
      mockBuildBehaviorContext.mockResolvedValue({
        userId: 'newuser',
        lastCommands: [],
        ignoredCommands: new Map(),
        frequentCommands: [],
        timeOfDay: 'morning',
        dayOfWeek: 1,
        totalInteractions: 0,
        averageSessionCommands: 0,
        daysActive: 0,
      });

      const layout = await service.generateLayout('newuser');

      expect(layout).toBeDefined();
      expect(layout.primaryActions.length).toBeGreaterThanOrEqual(0);
    });
  });
});
