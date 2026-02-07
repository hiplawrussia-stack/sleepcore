/**
 * CallbackRouter Tests
 * ====================
 * Unit tests for the callback router and handler infrastructure.
 *
 * @packageDocumentation
 */

import { CallbackRouter, createCallbackRouter } from '../CallbackRouter';
import { BaseCallbackHandler } from '../BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext } from '../types';

/**
 * Mock handler for testing
 */
class MockHandler extends BaseCallbackHandler {
  readonly command = 'test';
  public handleCalled = false;
  public lastContext: IHandlerContext | null = null;

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    this.handleCalled = true;
    this.lastContext = context;
    return this.handled();
  }
}

/**
 * Mock handler that always returns notHandled
 */
class NotHandlingMockHandler extends BaseCallbackHandler {
  readonly command = 'nothandle';

  async handle(_context: IHandlerContext): Promise<ICallbackResult> {
    return this.notHandled();
  }
}

/**
 * Multi-command handler that handles multiple commands
 */
class MultiCommandHandler extends BaseCallbackHandler {
  readonly command = 'primary';
  private additionalCommands = ['secondary', 'tertiary'];

  canHandle(data: { command: string }): boolean {
    return data.command === this.command || this.additionalCommands.includes(data.command);
  }

  async handle(_context: IHandlerContext): Promise<ICallbackResult> {
    return this.handled();
  }
}

describe('CallbackRouter', () => {
  let router: CallbackRouter;

  beforeEach(() => {
    router = new CallbackRouter();
  });

  describe('Registration', () => {
    it('should register a handler', () => {
      const handler = new MockHandler({});
      router.register(handler);
      expect(router.has('test')).toBe(true);
    });

    it('should get registered handler by command', () => {
      const handler = new MockHandler({});
      router.register(handler);
      expect(router.get('test')).toBe(handler);
    });

    it('should return undefined for unregistered command', () => {
      expect(router.get('nonexistent')).toBeUndefined();
    });

    it('should return all registered handlers', () => {
      const handler1 = new MockHandler({});
      const handler2 = new NotHandlingMockHandler({});
      router.register(handler1);
      router.register(handler2);
      expect(router.getAll()).toHaveLength(2);
    });

    it('should throw error when registering duplicate command', () => {
      const handler1 = new MockHandler({});
      const handler2 = new MockHandler({});
      router.register(handler1);
      expect(() => router.register(handler2)).toThrow("Handler for command 'test' already registered");
    });
  });

  describe('Routing', () => {
    it('should route to correct handler', async () => {
      const handler = new MockHandler({});
      router.register(handler);

      const context = createMockContext('test:action');
      await router.route(context);

      expect(handler.handleCalled).toBe(true);
    });

    it('should return notHandled for unregistered command', async () => {
      const context = createMockContext('unknown:action');
      const result = await router.route(context);

      expect(result.handled).toBe(false);
    });

    it('should return handler result', async () => {
      const handler = new MockHandler({});
      router.register(handler);

      const context = createMockContext('test:action');
      const result = await router.route(context);

      expect(result.handled).toBe(true);
    });

    it('should use canHandle to verify handler matches', async () => {
      const handler = new MultiCommandHandler({});
      router.register(handler);

      // Primary command should be handled
      const context = createMockContext('primary:action');
      const result = await router.route(context);

      expect(result.handled).toBe(true);
    });
  });

  describe('createCallbackRouter factory', () => {
    it('should create a router instance', () => {
      const router = createCallbackRouter();
      expect(router).toBeInstanceOf(CallbackRouter);
    });
  });
});

describe('BaseCallbackHandler', () => {
  let handler: MockHandler;

  beforeEach(() => {
    handler = new MockHandler({});
  });

  describe('Result builders', () => {
    it('handled() should return handled=true', () => {
      const result = (handler as any).handled();
      expect(result.handled).toBe(true);
    });

    it('notHandled() should return handled=false', () => {
      const result = (handler as any).notHandled();
      expect(result.handled).toBe(false);
    });

    it('handledWithMessage() should include answer text', () => {
      const result = (handler as any).handledWithMessage('Toast message');
      expect(result.handled).toBe(true);
      expect(result.answerText).toBe('Toast message');
    });

    it('alert() should set showAlert and answerText', () => {
      const result = (handler as any).alert('Alert text');
      expect(result.handled).toBe(true);
      expect(result.showAlert).toBe(true);
      expect(result.answerText).toBe('Alert text');
    });
  });

  describe('canHandle', () => {
    it('should return true for matching command', () => {
      expect(handler.canHandle({ command: 'test', action: '', params: [], raw: 'test:' })).toBe(true);
    });

    it('should return false for non-matching command', () => {
      expect(handler.canHandle({ command: 'other', action: '', params: [], raw: 'other:' })).toBe(false);
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
