/**
 * CommandHandler Unit Tests
 * ==========================
 * Tests for CommandHandler - command registration and management.
 */

import { CommandHandler, createCommandHandler } from '../../../../src/bot/commands/CommandHandler';
import { startCommand } from '../../../../src/bot/commands/StartCommand';
import { diaryCommand } from '../../../../src/bot/commands/DiaryCommand';
import { createMockSleepCoreAPI } from './testHelpers';

describe('CommandHandler', () => {
  let handler: CommandHandler;

  beforeEach(() => {
    const mockSleepCore = createMockSleepCoreAPI();
    handler = new CommandHandler(mockSleepCore);
  });

  describe('constructor', () => {
    it('should create handler with default commands', () => {
      expect(handler.getAll().length).toBeGreaterThan(0);
    });

    it('should register all default commands', () => {
      expect(handler.has('start')).toBe(true);
      expect(handler.has('diary')).toBe(true);
      expect(handler.has('today')).toBe(true);
      expect(handler.has('relax')).toBe(true);
      expect(handler.has('mindful')).toBe(true);
      expect(handler.has('progress')).toBe(true);
      expect(handler.has('sos')).toBe(true);
      expect(handler.has('help')).toBe(true);
    });
  });

  describe('register()', () => {
    it('should register a new command', () => {
      const mockCommand = {
        name: 'test',
        description: 'Test command',
        execute: jest.fn(),
      };

      handler.register(mockCommand);
      expect(handler.has('test')).toBe(true);
    });

    it('should register command aliases', () => {
      const mockCommand = {
        name: 'test',
        description: 'Test command',
        aliases: ['t', 'tst'],
        execute: jest.fn(),
      };

      handler.register(mockCommand);
      expect(handler.has('t')).toBe(true);
      expect(handler.has('tst')).toBe(true);
    });
  });

  describe('get()', () => {
    it('should get command by name', () => {
      const command = handler.get('start');
      expect(command).toBeDefined();
      expect(command?.name).toBe('start');
    });

    it('should get command by alias', () => {
      const command = handler.get('begin');
      expect(command).toBeDefined();
      expect(command?.name).toBe('start');
    });

    it('should return undefined for unknown command', () => {
      const command = handler.get('unknown');
      expect(command).toBeUndefined();
    });

    it('should handle command with leading slash', () => {
      const command = handler.get('/start');
      expect(command).toBeDefined();
      expect(command?.name).toBe('start');
    });

    it('should be case-insensitive', () => {
      const command = handler.get('START');
      expect(command).toBeDefined();
      expect(command?.name).toBe('start');
    });
  });

  describe('getAll()', () => {
    it('should return all registered commands', () => {
      const commands = handler.getAll();
      expect(commands.length).toBe(8);
    });

    it('should return command instances', () => {
      const commands = handler.getAll();
      commands.forEach(cmd => {
        expect(cmd.name).toBeDefined();
        expect(cmd.description).toBeDefined();
        expect(cmd.execute).toBeDefined();
      });
    });
  });

  describe('has()', () => {
    it('should return true for registered command', () => {
      expect(handler.has('start')).toBe(true);
    });

    it('should return true for registered alias', () => {
      expect(handler.has('дневник')).toBe(true);
    });

    it('should return false for unknown command', () => {
      expect(handler.has('unknown')).toBe(false);
    });
  });

  describe('getBotFatherCommands()', () => {
    it('should return commands in BotFather format', () => {
      const commands = handler.getBotFatherCommands();

      expect(commands.length).toBe(8);
      commands.forEach(cmd => {
        expect(cmd.command).toBeDefined();
        expect(cmd.description).toBeDefined();
        expect(typeof cmd.command).toBe('string');
        expect(typeof cmd.description).toBe('string');
      });
    });

    it('should not include slash in command names', () => {
      const commands = handler.getBotFatherCommands();

      commands.forEach(cmd => {
        expect(cmd.command.startsWith('/')).toBe(false);
      });
    });
  });

  describe('alias resolution', () => {
    it('should resolve Russian aliases', () => {
      expect(handler.get('начать')?.name).toBe('start');
      expect(handler.get('дневник')?.name).toBe('diary');
      expect(handler.get('сегодня')?.name).toBe('today');
      expect(handler.get('расслабление')?.name).toBe('relax');
      expect(handler.get('осознанность')?.name).toBe('mindful');
      expect(handler.get('прогресс')?.name).toBe('progress');
      // 'помощь' is registered for both sos and help - check that one of them works
      const helpCmd = handler.get('помощь');
      expect(['sos', 'help']).toContain(helpCmd?.name);
    });

    it('should resolve English aliases', () => {
      expect(handler.get('begin')?.name).toBe('start');
      expect(handler.get('sleep')?.name).toBe('diary');
      expect(handler.get('daily')?.name).toBe('today');
      expect(handler.get('calm')?.name).toBe('relax');
      expect(handler.get('meditation')?.name).toBe('mindful');
      expect(handler.get('stats')?.name).toBe('progress');
      expect(handler.get('emergency')?.name).toBe('sos');
    });
  });
});

describe('createCommandHandler()', () => {
  it('should create a new CommandHandler instance', () => {
    const handler = createCommandHandler();
    expect(handler).toBeInstanceOf(CommandHandler);
  });

  it('should accept custom SleepCoreAPI', () => {
    const mockSleepCore = createMockSleepCoreAPI();
    const handler = createCommandHandler(mockSleepCore);
    expect(handler).toBeInstanceOf(CommandHandler);
  });

  it('should register default commands', () => {
    const handler = createCommandHandler();
    expect(handler.has('start')).toBe(true);
    expect(handler.has('diary')).toBe(true);
  });
});
