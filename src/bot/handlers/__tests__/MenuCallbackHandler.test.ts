/**
 * MenuCallbackHandler Tests
 * =========================
 * Unit tests for menu callback handler.
 *
 * @packageDocumentation
 */

import { MenuCallbackHandler } from '../MenuCallbackHandler';
import type { IHandlerContext } from '../types';

describe('MenuCallbackHandler', () => {
  let handler: MenuCallbackHandler;
  let mockDeps: any;

  beforeEach(() => {
    mockDeps = {
      startCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Start message' }),
      },
      diaryCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Diary message' }),
      },
      todayCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Today message' }),
      },
      relaxCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Relax message' }),
      },
      mindfulCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Mindful message' }),
      },
      progressCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Progress message' }),
      },
      sosCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'SOS message' }),
      },
      helpCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Help message' }),
      },
      rehearsalCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Rehearsal message' }),
      },
      recallCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Recall message' }),
      },
      questCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Quest message' }),
      },
      badgeCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Badge message' }),
      },
      evolutionCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Evolution message' }),
      },
      therapyCommand: {
        execute: jest.fn().mockResolvedValue({ message: 'Therapy message' }),
      },
      sonyaEvolutionService: {
        recordInteraction: jest.fn(),
      },
    };

    handler = new MenuCallbackHandler(mockDeps);
  });

  describe('Command routing', () => {
    it('should have command = "menu"', () => {
      expect(handler.command).toBe('menu');
    });

    it('should route menu:start to startCommand', async () => {
      const context = createMockContext('menu:start');
      await handler.handle(context);

      expect(mockDeps.startCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:diary to diaryCommand', async () => {
      const context = createMockContext('menu:diary');
      await handler.handle(context);

      expect(mockDeps.diaryCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:today to todayCommand', async () => {
      const context = createMockContext('menu:today');
      await handler.handle(context);

      expect(mockDeps.todayCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:relax to relaxCommand', async () => {
      const context = createMockContext('menu:relax');
      await handler.handle(context);

      expect(mockDeps.relaxCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:mindful to mindfulCommand', async () => {
      const context = createMockContext('menu:mindful');
      await handler.handle(context);

      expect(mockDeps.mindfulCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:progress to progressCommand', async () => {
      const context = createMockContext('menu:progress');
      await handler.handle(context);

      expect(mockDeps.progressCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:sos to sosCommand', async () => {
      const context = createMockContext('menu:sos');
      await handler.handle(context);

      expect(mockDeps.sosCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:help to helpCommand', async () => {
      const context = createMockContext('menu:help');
      await handler.handle(context);

      expect(mockDeps.helpCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:rehearsal to rehearsalCommand', async () => {
      const context = createMockContext('menu:rehearsal');
      await handler.handle(context);

      expect(mockDeps.rehearsalCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:recall to recallCommand', async () => {
      const context = createMockContext('menu:recall');
      await handler.handle(context);

      expect(mockDeps.recallCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:therapy to therapyCommand', async () => {
      const context = createMockContext('menu:therapy');
      await handler.handle(context);

      expect(mockDeps.therapyCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });
  });

  describe('Gamification commands', () => {
    it('should route menu:quest and record interaction', async () => {
      const context = createMockContext('menu:quest');
      await handler.handle(context);

      expect(mockDeps.sonyaEvolutionService.recordInteraction).toHaveBeenCalledWith(
        context.sleepCoreCtx.userId,
        'command'
      );
      expect(mockDeps.questCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:badges and record interaction', async () => {
      const context = createMockContext('menu:badges');
      await handler.handle(context);

      expect(mockDeps.sonyaEvolutionService.recordInteraction).toHaveBeenCalledWith(
        context.sleepCoreCtx.userId,
        'command'
      );
      expect(mockDeps.badgeCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });

    it('should route menu:sonya and record interaction', async () => {
      const context = createMockContext('menu:sonya');
      await handler.handle(context);

      expect(mockDeps.sonyaEvolutionService.recordInteraction).toHaveBeenCalledWith(
        context.sleepCoreCtx.userId,
        'command'
      );
      expect(mockDeps.evolutionCommand.execute).toHaveBeenCalledWith(context.sleepCoreCtx);
    });
  });

  describe('Unknown actions', () => {
    it('should return notHandled for unknown action', async () => {
      const context = createMockContext('menu:unknown');
      const result = await handler.handle(context);

      // Unknown actions are not handled by this handler
      expect(result.handled).toBe(false);
    });
  });

  describe('Result handling', () => {
    it('should return command result in handled response', async () => {
      const context = createMockContext('menu:start');
      const result = await handler.handle(context);

      expect(result.handled).toBe(true);
      expect(result.result).toEqual({ message: 'Start message' });
    });
  });
});

/**
 * Helper to create mock handler context
 */
function createMockContext(callbackData: string): IHandlerContext {
  const [command, action] = callbackData.split(':');
  return {
    ctx: {
      session: {
        preferences: { notifications: true },
      },
      from: { id: 123, first_name: 'Test' },
      callbackQuery: { data: callbackData },
      answerCallbackQuery: jest.fn(),
      editMessageText: jest.fn(),
      reply: jest.fn(),
    } as any,
    sleepCoreCtx: {
      userId: '123',
      chatId: '123',
      locale: 'ru',
    } as any,
    callbackData: {
      command,
      action,
      params: [],
      raw: callbackData,
    },
  };
}
