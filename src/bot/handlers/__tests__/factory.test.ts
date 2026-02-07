/**
 * Factory Functions Tests
 * =======================
 * Unit tests for handler factory functions.
 *
 * @packageDocumentation
 */

import {
  createAllHandlers,
  registerAllHandlers,
  createRouterWithHandlers,
  listHandlerCommands,
} from '../factory';
import { CallbackRouter } from '../CallbackRouter';
import { MenuCallbackHandler } from '../MenuCallbackHandler';

describe('Handler Factory', () => {
  const mockDeps = {
    startCommand: { execute: jest.fn() },
    diaryCommand: { execute: jest.fn() },
    therapyCommand: { execute: jest.fn() },
    relaxCommand: { execute: jest.fn() },
    mindfulCommand: { execute: jest.fn() },
    progressCommand: { execute: jest.fn() },
    sosCommand: { execute: jest.fn() },
    helpCommand: { execute: jest.fn() },
    rehearsalCommand: { execute: jest.fn() },
    recallCommand: { execute: jest.fn() },
    questCommand: { execute: jest.fn() },
    badgeCommand: { execute: jest.fn() },
    evolutionCommand: { execute: jest.fn() },
    todayCommand: { execute: jest.fn() },
    sonyaEvolutionService: { recordInteraction: jest.fn() },
    emojiSlider: {},
    hubMenu: {},
    dailyGreeting: {},
    yearInPixels: {},
    onboardingTracker: {},
    buildKeyboard: jest.fn(),
    ensureGamificationSession: jest.fn(),
  };

  describe('createAllHandlers', () => {
    it('should create array of handlers', () => {
      const handlers = createAllHandlers(mockDeps);
      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('should create handlers with command property', () => {
      const handlers = createAllHandlers(mockDeps);
      handlers.forEach((handler) => {
        expect(typeof handler.command).toBe('string');
        expect(handler.command.length).toBeGreaterThan(0);
      });
    });

    it('should create all expected handler types', () => {
      const handlers = createAllHandlers(mockDeps);
      const commands = handlers.map((h) => h.command);

      expect(commands).toContain('menu');
      expect(commands).toContain('start');
      expect(commands).toContain('diary');
      expect(commands).toContain('therapy');
      expect(commands).toContain('hub');
      expect(commands).toContain('settings');
      expect(commands).toContain('today');
      expect(commands).toContain('mood');
      expect(commands).toContain('cmd');
      expect(commands).toContain('pixels');
      expect(commands).toContain('quest');
    });
  });

  describe('registerAllHandlers', () => {
    it('should return CallbackRouter instance', () => {
      const router = registerAllHandlers(mockDeps);
      expect(router).toBeInstanceOf(CallbackRouter);
    });

    it('should register all handlers with router', () => {
      const router = registerAllHandlers(mockDeps);
      const handlers = router.getAll();

      expect(handlers.length).toBeGreaterThan(0);
    });

    it('should have menu handler registered', () => {
      const router = registerAllHandlers(mockDeps);
      expect(router.has('menu')).toBe(true);
    });

    it('should have start handler registered', () => {
      const router = registerAllHandlers(mockDeps);
      expect(router.has('start')).toBe(true);
    });

    it('should have diary handler registered', () => {
      const router = registerAllHandlers(mockDeps);
      expect(router.has('diary')).toBe(true);
    });
  });

  describe('createRouterWithHandlers', () => {
    it('should create router with provided handlers', () => {
      const handler = new MenuCallbackHandler(mockDeps);
      const router = createRouterWithHandlers([handler]);

      expect(router).toBeInstanceOf(CallbackRouter);
      expect(router.has('menu')).toBe(true);
    });

    it('should create empty router with no handlers', () => {
      const router = createRouterWithHandlers([]);
      expect(router.getAll()).toHaveLength(0);
    });
  });

  describe('listHandlerCommands', () => {
    it('should return array of command names', () => {
      const commands = listHandlerCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should include expected commands', () => {
      const commands = listHandlerCommands();

      expect(commands).toContain('menu');
      expect(commands).toContain('start');
      expect(commands).toContain('diary');
      expect(commands).toContain('therapy');
    });
  });
});
