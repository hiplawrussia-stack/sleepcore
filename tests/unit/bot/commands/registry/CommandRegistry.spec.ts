/**
 * CommandRegistry Unit Tests
 * ==========================
 * Tests for context-aware command management and Progressive Disclosure.
 *
 * @module @sleepcore/bot/commands/registry
 */

import {
  CommandRegistry,
  getTimeOfDay,
  getCurrentTimeOfDay,
  getMoscowHour,
  DEFAULT_COMMAND_CONFIGS,
  commandRegistry,
} from '../../../../../src/bot/commands/registry/CommandRegistry';
import type {
  ICommandContext,
  ICommandConfig,
  TimeOfDay,
  TherapyPhase,
} from '../../../../../src/bot/commands/registry/CommandRegistry';
import type { ICommand } from '../../../../../src/bot/commands/interfaces/ICommand';

/**
 * Create a mock command for testing
 */
function createMockCommand(overrides: Partial<ICommand> = {}): ICommand {
  return {
    name: overrides.name ?? 'test',
    description: overrides.description ?? 'Test command',
    aliases: overrides.aliases,
    execute: jest.fn().mockResolvedValue({ success: true }),
    ...overrides,
  } as ICommand;
}

/**
 * Create a mock command context for testing
 */
function createMockContext(overrides: Partial<ICommandContext> = {}): ICommandContext {
  return {
    timeOfDay: 'day',
    dayOfWeek: 1,
    therapyPhase: 'active',
    therapyWeek: 3,
    hasPendingDiary: false,
    hasPendingAssessment: false,
    daysSinceLastActivity: 0,
    ...overrides,
  };
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command', () => {
      const command = createMockCommand({ name: 'mycommand' });

      registry.register(command);

      expect(registry.has('mycommand')).toBe(true);
    });

    it('should use default config from DEFAULT_COMMAND_CONFIGS', () => {
      const command = createMockCommand({ name: 'diary' });

      registry.register(command);

      const config = registry.getConfig('diary');
      expect(config?.priority).toBe(DEFAULT_COMMAND_CONFIGS.diary.priority);
      expect(config?.category).toBe(DEFAULT_COMMAND_CONFIGS.diary.category);
      expect(config?.icon).toBe(DEFAULT_COMMAND_CONFIGS.diary.icon);
    });

    it('should allow custom config to override defaults', () => {
      const command = createMockCommand({ name: 'diary' });

      registry.register(command, {
        priority: 100,
        icon: '🔥',
      });

      const config = registry.getConfig('diary');
      expect(config?.priority).toBe(100);
      expect(config?.icon).toBe('🔥');
    });

    it('should register command aliases', () => {
      const command = createMockCommand({
        name: 'mycommand',
        aliases: ['mc', 'mycmd'],
      });

      registry.register(command);

      expect(registry.has('mc')).toBe(true);
      expect(registry.has('mycmd')).toBe(true);
      expect(registry.get('mc')).toBe(command);
      expect(registry.get('mycmd')).toBe(command);
    });

    it('should use fallback values when no default config exists', () => {
      const command = createMockCommand({ name: 'unknowncommand' });

      registry.register(command);

      const config = registry.getConfig('unknowncommand');
      expect(config?.priority).toBe(99);
      expect(config?.category).toBe('tools');
      expect(config?.icon).toBe('📋');
      expect(config?.shortLabel).toBe('unknowncommand');
      expect(config?.showInMenu).toBe(true);
    });
  });

  describe('get', () => {
    it('should return command by name', () => {
      const command = createMockCommand({ name: 'testcmd' });
      registry.register(command);

      expect(registry.get('testcmd')).toBe(command);
    });

    it('should return command by alias', () => {
      const command = createMockCommand({
        name: 'testcmd',
        aliases: ['t'],
      });
      registry.register(command);

      expect(registry.get('t')).toBe(command);
    });

    it('should return undefined for non-existent command', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getConfig', () => {
    it('should return config by command name', () => {
      const command = createMockCommand({ name: 'testcmd' });
      registry.register(command, { priority: 5, category: 'core' });

      const config = registry.getConfig('testcmd');

      expect(config?.priority).toBe(5);
      expect(config?.category).toBe('core');
      expect(config?.command).toBe(command);
    });

    it('should return config by alias', () => {
      const command = createMockCommand({
        name: 'testcmd',
        aliases: ['tc'],
      });
      registry.register(command, { priority: 7 });

      const config = registry.getConfig('tc');

      expect(config?.priority).toBe(7);
    });

    it('should return undefined for non-existent command', () => {
      expect(registry.getConfig('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no commands registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered commands', () => {
      const cmd1 = createMockCommand({ name: 'cmd1' });
      const cmd2 = createMockCommand({ name: 'cmd2' });
      const cmd3 = createMockCommand({ name: 'cmd3' });

      registry.register(cmd1);
      registry.register(cmd2);
      registry.register(cmd3);

      const all = registry.getAll();

      expect(all).toHaveLength(3);
      expect(all).toContain(cmd1);
      expect(all).toContain(cmd2);
      expect(all).toContain(cmd3);
    });
  });

  describe('getAllWithConfigs', () => {
    it('should return empty array when no commands registered', () => {
      expect(registry.getAllWithConfigs()).toEqual([]);
    });

    it('should return all registered commands with configs', () => {
      const cmd1 = createMockCommand({ name: 'cmd1' });
      const cmd2 = createMockCommand({ name: 'cmd2' });

      registry.register(cmd1, { category: 'core' });
      registry.register(cmd2, { category: 'therapy' });

      const all = registry.getAllWithConfigs();

      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('cmd1');
      expect(all[0].config.category).toBe('core');
      expect(all[1].name).toBe('cmd2');
      expect(all[1].config.category).toBe('therapy');
    });
  });

  describe('has', () => {
    it('should return true for registered command', () => {
      registry.register(createMockCommand({ name: 'exists' }));

      expect(registry.has('exists')).toBe(true);
    });

    it('should return true for command alias', () => {
      registry.register(createMockCommand({
        name: 'exists',
        aliases: ['e'],
      }));

      expect(registry.has('e')).toBe(true);
    });

    it('should return false for non-existent command', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('getVisibleCommands', () => {
    beforeEach(() => {
      // Register commands for visibility testing
      registry.register(createMockCommand({ name: 'diary' }), {
        showInMenu: true,
        availablePhases: ['active', 'maintenance'],
        relevantTimes: ['morning'],
        minWeek: 0,
        // Explicitly set isVisible to undefined to override default
        isVisible: undefined,
      });

      registry.register(createMockCommand({ name: 'progress' }), {
        showInMenu: true,
        availablePhases: ['active', 'maintenance'],
        minWeek: 1,
      });

      registry.register(createMockCommand({ name: 'hidden' }), {
        showInMenu: false,
        availablePhases: ['active'],
      });

      registry.register(createMockCommand({ name: 'advanced' }), {
        showInMenu: true,
        availablePhases: ['active'],
        minWeek: 4,
      });

      registry.register(createMockCommand({ name: 'onboarding' }), {
        showInMenu: true,
        availablePhases: ['onboarding'],
      });
    });

    it('should filter by showInMenu', () => {
      const context = createMockContext({ therapyPhase: 'active', therapyWeek: 5 });
      const visible = registry.getVisibleCommands(context);

      const names = visible.map((r) => r.name);
      expect(names).not.toContain('hidden');
    });

    it('should filter by therapy phase', () => {
      const context = createMockContext({ therapyPhase: 'onboarding' });
      const visible = registry.getVisibleCommands(context);

      const names = visible.map((r) => r.name);
      expect(names).toContain('onboarding');
      expect(names).not.toContain('diary');
      expect(names).not.toContain('progress');
    });

    it('should filter by minimum week', () => {
      // Use morning time and hasPendingDiary to satisfy diary's default isVisible
      const context = createMockContext({
        therapyPhase: 'active',
        therapyWeek: 2,
        timeOfDay: 'morning',
        hasPendingDiary: true,
      });
      const visible = registry.getVisibleCommands(context);

      const names = visible.map((r) => r.name);
      expect(names).toContain('diary');
      expect(names).toContain('progress');
      expect(names).not.toContain('advanced');
    });

    it('should show command when week meets minWeek requirement', () => {
      const context = createMockContext({ therapyPhase: 'active', therapyWeek: 4 });
      const visible = registry.getVisibleCommands(context);

      const names = visible.map((r) => r.name);
      expect(names).toContain('advanced');
    });

    it('should sort by time relevance then priority', () => {
      // Clear and re-register with specific priorities
      registry = new CommandRegistry();

      // This command is only relevant in the morning
      registry.register(createMockCommand({ name: 'morning_only' }), {
        showInMenu: true,
        priority: 10,
        availablePhases: ['active'],
        relevantTimes: ['morning'],
      });

      // This command is only relevant in the evening (not current time)
      registry.register(createMockCommand({ name: 'evening_only' }), {
        showInMenu: true,
        priority: 1,
        availablePhases: ['active'],
        relevantTimes: ['evening'],
      });

      const context = createMockContext({ timeOfDay: 'morning', therapyPhase: 'active' });
      const visible = registry.getVisibleCommands(context);

      // Time-relevant commands should come first, even with lower priority
      expect(visible[0].name).toBe('morning_only');
      expect(visible[1].name).toBe('evening_only');
    });

    it('should use custom isVisible function', () => {
      registry = new CommandRegistry();

      registry.register(createMockCommand({ name: 'custom' }), {
        showInMenu: true,
        availablePhases: ['active'],
        isVisible: (ctx) => ctx.hasPendingDiary,
      });

      const visibleWithPending = registry.getVisibleCommands(
        createMockContext({ therapyPhase: 'active', hasPendingDiary: true })
      );
      const visibleWithoutPending = registry.getVisibleCommands(
        createMockContext({ therapyPhase: 'active', hasPendingDiary: false })
      );

      expect(visibleWithPending.map((r) => r.name)).toContain('custom');
      expect(visibleWithoutPending.map((r) => r.name)).not.toContain('custom');
    });
  });

  describe('getProactiveSuggestions', () => {
    beforeEach(() => {
      registry.register(createMockCommand({ name: 'proactive1' }), {
        showInMenu: true,
        proactive: true,
        priority: 1,
        availablePhases: ['active'],
        relevantTimes: ['morning'],
      });

      registry.register(createMockCommand({ name: 'proactive2' }), {
        showInMenu: true,
        proactive: true,
        priority: 2,
        availablePhases: ['active'],
        relevantTimes: ['morning'],
      });

      registry.register(createMockCommand({ name: 'proactive3' }), {
        showInMenu: true,
        proactive: true,
        priority: 3,
        availablePhases: ['active'],
        relevantTimes: ['morning'],
      });

      registry.register(createMockCommand({ name: 'proactive4' }), {
        showInMenu: true,
        proactive: true,
        priority: 4,
        availablePhases: ['active'],
        relevantTimes: ['morning'],
      });

      registry.register(createMockCommand({ name: 'not_proactive' }), {
        showInMenu: true,
        proactive: false,
        availablePhases: ['active'],
        relevantTimes: ['morning'],
      });
    });

    it('should return only proactive commands', () => {
      const context = createMockContext({ timeOfDay: 'morning', therapyPhase: 'active' });
      const suggestions = registry.getProactiveSuggestions(context);

      const names = suggestions.map((r) => r.name);
      expect(names).not.toContain('not_proactive');
    });

    it('should return max 3 suggestions', () => {
      const context = createMockContext({ timeOfDay: 'morning', therapyPhase: 'active' });
      const suggestions = registry.getProactiveSuggestions(context);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should filter by time relevance', () => {
      const context = createMockContext({ timeOfDay: 'evening', therapyPhase: 'active' });
      const suggestions = registry.getProactiveSuggestions(context);

      // Morning-only commands should not appear in evening
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getByCategory', () => {
    beforeEach(() => {
      registry.register(createMockCommand({ name: 'core1' }), {
        category: 'core',
        priority: 2,
        showInMenu: true,
      });

      registry.register(createMockCommand({ name: 'core2' }), {
        category: 'core',
        priority: 1,
        showInMenu: true,
      });

      registry.register(createMockCommand({ name: 'therapy1' }), {
        category: 'therapy',
        priority: 1,
        showInMenu: true,
      });

      registry.register(createMockCommand({ name: 'tools1' }), {
        category: 'tools',
        priority: 1,
        showInMenu: true,
      });
    });

    it('should return commands of specified category', () => {
      const coreCommands = registry.getByCategory('core');

      expect(coreCommands).toHaveLength(2);
      expect(coreCommands[0].name).toBe('core2');
      expect(coreCommands[1].name).toBe('core1');
    });

    it('should sort by priority', () => {
      const coreCommands = registry.getByCategory('core');

      // Lower priority number = higher priority
      expect(coreCommands[0].config.priority).toBe(1);
      expect(coreCommands[1].config.priority).toBe(2);
    });

    it('should return empty array for category with no commands', () => {
      const supportCommands = registry.getByCategory('support');

      expect(supportCommands).toEqual([]);
    });
  });
});

describe('getTimeOfDay', () => {
  it('should return morning for hours 5-11', () => {
    expect(getTimeOfDay(5)).toBe('morning');
    expect(getTimeOfDay(8)).toBe('morning');
    expect(getTimeOfDay(11)).toBe('morning');
  });

  it('should return day for hours 12-16', () => {
    expect(getTimeOfDay(12)).toBe('day');
    expect(getTimeOfDay(14)).toBe('day');
    expect(getTimeOfDay(16)).toBe('day');
  });

  it('should return evening for hours 17-21', () => {
    expect(getTimeOfDay(17)).toBe('evening');
    expect(getTimeOfDay(19)).toBe('evening');
    expect(getTimeOfDay(21)).toBe('evening');
  });

  it('should return night for hours 22-4', () => {
    expect(getTimeOfDay(22)).toBe('night');
    expect(getTimeOfDay(23)).toBe('night');
    expect(getTimeOfDay(0)).toBe('night');
    expect(getTimeOfDay(2)).toBe('night');
    expect(getTimeOfDay(4)).toBe('night');
  });
});

describe('getCurrentTimeOfDay', () => {
  it('should return a valid time of day', () => {
    const result = getCurrentTimeOfDay();

    expect(['morning', 'day', 'evening', 'night']).toContain(result);
  });
});

describe('getMoscowHour', () => {
  it('should return a number between 0 and 23', () => {
    const hour = getMoscowHour();

    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThan(24);
  });
});

describe('DEFAULT_COMMAND_CONFIGS', () => {
  it('should have config for core commands', () => {
    expect(DEFAULT_COMMAND_CONFIGS.start).toBeDefined();
    expect(DEFAULT_COMMAND_CONFIGS.diary).toBeDefined();
    expect(DEFAULT_COMMAND_CONFIGS.help).toBeDefined();
    expect(DEFAULT_COMMAND_CONFIGS.sos).toBeDefined();
  });

  it('should have appropriate priorities', () => {
    expect(DEFAULT_COMMAND_CONFIGS.start.priority).toBe(0);
    expect(DEFAULT_COMMAND_CONFIGS.diary.priority).toBe(1);
    expect(DEFAULT_COMMAND_CONFIGS.today.priority).toBe(2);
  });

  it('should have correct categories', () => {
    expect(DEFAULT_COMMAND_CONFIGS.diary.category).toBe('core');
    expect(DEFAULT_COMMAND_CONFIGS.today.category).toBe('therapy');
    expect(DEFAULT_COMMAND_CONFIGS.progress.category).toBe('tools');
    expect(DEFAULT_COMMAND_CONFIGS.sos.category).toBe('support');
    expect(DEFAULT_COMMAND_CONFIGS.rehearsal.category).toBe('memory');
  });

  it('should have icons for all commands', () => {
    const commands = Object.values(DEFAULT_COMMAND_CONFIGS);

    for (const config of commands) {
      expect(config.icon).toBeDefined();
      expect(config.icon?.length).toBeGreaterThan(0);
    }
  });
});

describe('commandRegistry singleton', () => {
  it('should export a CommandRegistry instance', () => {
    expect(commandRegistry).toBeInstanceOf(CommandRegistry);
  });
});

// ============================================================================
// ADDITIONAL COVERAGE: DEFAULT_COMMAND_CONFIGS details & recall isVisible
// ============================================================================

describe('DEFAULT_COMMAND_CONFIGS — detailed validation', () => {
  it('should have sos available in all phases', () => {
    expect(DEFAULT_COMMAND_CONFIGS.sos.availablePhases).toEqual(
      expect.arrayContaining(['onboarding', 'assessment', 'active', 'maintenance', 'graduated'])
    );
  });

  it('should have diary relevant in morning', () => {
    expect(DEFAULT_COMMAND_CONFIGS.diary.relevantTimes).toContain('morning');
  });

  it('should have relax relevant in evening and night', () => {
    expect(DEFAULT_COMMAND_CONFIGS.relax.relevantTimes).toContain('evening');
    expect(DEFAULT_COMMAND_CONFIGS.relax.relevantTimes).toContain('night');
  });

  it('should have today minWeek=1', () => {
    expect(DEFAULT_COMMAND_CONFIGS.today.minWeek).toBe(1);
  });

  it('should have mindful minWeek=2', () => {
    expect(DEFAULT_COMMAND_CONFIGS.mindful.minWeek).toBe(2);
  });

  it('should have rehearsal minWeek=1 and proactive', () => {
    expect(DEFAULT_COMMAND_CONFIGS.rehearsal.minWeek).toBe(1);
    expect(DEFAULT_COMMAND_CONFIGS.rehearsal.proactive).toBe(true);
  });

  it('should have recall minWeek=1 and proactive with morning isVisible', () => {
    expect(DEFAULT_COMMAND_CONFIGS.recall.minWeek).toBe(1);
    expect(DEFAULT_COMMAND_CONFIGS.recall.proactive).toBe(true);
    expect(DEFAULT_COMMAND_CONFIGS.recall.isVisible).toBeDefined();
  });

  it('should have start hidden from menu', () => {
    expect(DEFAULT_COMMAND_CONFIGS.start.showInMenu).toBe(false);
  });

  it('should have settings hidden from menu', () => {
    expect(DEFAULT_COMMAND_CONFIGS.settings.showInMenu).toBe(false);
  });

  it('should have smart_tips proactive and available in all times', () => {
    expect(DEFAULT_COMMAND_CONFIGS.smart_tips.proactive).toBe(true);
    expect(DEFAULT_COMMAND_CONFIGS.smart_tips.relevantTimes).toEqual(
      expect.arrayContaining(['morning', 'day', 'evening', 'night'])
    );
  });

  it('should have 12 configured commands total', () => {
    expect(Object.keys(DEFAULT_COMMAND_CONFIGS).length).toBe(12);
  });
});

describe('recall isVisible callback', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('should show recall command only in morning via default isVisible', () => {
    // Register recall with defaults (using the name to pick up DEFAULT_COMMAND_CONFIGS)
    registry.register(createMockCommand({ name: 'recall' }));

    const morningCtx = createMockContext({
      timeOfDay: 'morning',
      therapyPhase: 'active',
      therapyWeek: 2,
    });
    const eveningCtx = createMockContext({
      timeOfDay: 'evening',
      therapyPhase: 'active',
      therapyWeek: 2,
    });

    const morningVisible = registry.getVisibleCommands(morningCtx);
    const eveningVisible = registry.getVisibleCommands(eveningCtx);

    expect(morningVisible.map(r => r.name)).toContain('recall');
    expect(eveningVisible.map(r => r.name)).not.toContain('recall');
  });
});

describe('getTimeOfDay — boundary cases', () => {
  it('should return morning at exactly hour 5', () => {
    expect(getTimeOfDay(5)).toBe('morning');
  });

  it('should return night at exactly hour 4', () => {
    expect(getTimeOfDay(4)).toBe('night');
  });

  it('should return day at exactly hour 12', () => {
    expect(getTimeOfDay(12)).toBe('day');
  });

  it('should return evening at exactly hour 17', () => {
    expect(getTimeOfDay(17)).toBe('evening');
  });

  it('should return night at midnight (hour 0)', () => {
    expect(getTimeOfDay(0)).toBe('night');
  });

  it('should return evening at hour 21', () => {
    expect(getTimeOfDay(21)).toBe('evening');
  });

  it('should return night at hour 22', () => {
    expect(getTimeOfDay(22)).toBe('night');
  });
});

describe('getVisibleCommands — progressive disclosure', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('should show week-2 commands at week 2 but not week 1', () => {
    registry.register(createMockCommand({ name: 'week2cmd' }), {
      showInMenu: true,
      availablePhases: ['active'],
      minWeek: 2,
    });

    const week1Ctx = createMockContext({ therapyPhase: 'active', therapyWeek: 1 });
    const week2Ctx = createMockContext({ therapyPhase: 'active', therapyWeek: 2 });

    expect(registry.getVisibleCommands(week1Ctx).map(r => r.name)).not.toContain('week2cmd');
    expect(registry.getVisibleCommands(week2Ctx).map(r => r.name)).toContain('week2cmd');
  });

  it('should show no commands for graduated phase when none configured', () => {
    registry.register(createMockCommand({ name: 'activeonly' }), {
      showInMenu: true,
      availablePhases: ['active'],
    });

    const gradCtx = createMockContext({ therapyPhase: 'graduated' });
    expect(registry.getVisibleCommands(gradCtx)).toHaveLength(0);
  });

  it('should show commands with no availablePhases restriction to all phases', () => {
    registry.register(createMockCommand({ name: 'allphases' }), {
      showInMenu: true,
      // No availablePhases restriction
    });

    const gradCtx = createMockContext({ therapyPhase: 'graduated' });
    expect(registry.getVisibleCommands(gradCtx).map(r => r.name)).toContain('allphases');
  });

  it('should show commands with no minWeek restriction at week 0', () => {
    registry.register(createMockCommand({ name: 'noweek' }), {
      showInMenu: true,
      availablePhases: ['active'],
      // No minWeek
    });

    const ctx = createMockContext({ therapyPhase: 'active', therapyWeek: 0 });
    expect(registry.getVisibleCommands(ctx).map(r => r.name)).toContain('noweek');
  });

  it('should sort same-relevance commands by priority', () => {
    registry.register(createMockCommand({ name: 'low_pri' }), {
      showInMenu: true,
      priority: 10,
      availablePhases: ['active'],
    });
    registry.register(createMockCommand({ name: 'high_pri' }), {
      showInMenu: true,
      priority: 1,
      availablePhases: ['active'],
    });

    const ctx = createMockContext({ therapyPhase: 'active' });
    const visible = registry.getVisibleCommands(ctx);

    expect(visible[0].name).toBe('high_pri');
    expect(visible[1].name).toBe('low_pri');
  });
});

describe('getProactiveSuggestions — additional', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('should return empty when no proactive commands exist', () => {
    registry.register(createMockCommand({ name: 'normal' }), {
      showInMenu: true,
      proactive: false,
      availablePhases: ['active'],
      relevantTimes: ['morning'],
    });

    const ctx = createMockContext({ timeOfDay: 'morning', therapyPhase: 'active' });
    expect(registry.getProactiveSuggestions(ctx)).toHaveLength(0);
  });

  it('should respect therapy phase for proactive suggestions', () => {
    registry.register(createMockCommand({ name: 'proactive_active' }), {
      showInMenu: true,
      proactive: true,
      availablePhases: ['active'],
      relevantTimes: ['morning'],
    });

    const onboardingCtx = createMockContext({ timeOfDay: 'morning', therapyPhase: 'onboarding' });
    expect(registry.getProactiveSuggestions(onboardingCtx)).toHaveLength(0);
  });
});
