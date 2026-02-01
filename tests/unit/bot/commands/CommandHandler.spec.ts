/**
 * CommandHandler Unit Tests
 * =========================
 * Tests for command registration, crisis detection before execution,
 * session management, callback routing, and safety plan keyboard.
 *
 * IEC 62304 Class C: Crisis detection path is SAFETY-CRITICAL.
 */

// Mock all command imports BEFORE importing CommandHandler
jest.mock('../../../../src/bot/commands/StartCommand', () => ({
  startCommand: { name: 'start', description: 'Начать программу', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/DiaryCommand', () => ({
  diaryCommand: { name: 'diary', description: 'Дневник сна', requiresSession: true, execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/TodayCommand', () => ({
  todayCommand: { name: 'today', description: 'Сводка за сегодня', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/RelaxCommand', () => ({
  relaxCommand: { name: 'relax', description: 'Расслабление', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/MindfulCommand', () => ({
  mindfulCommand: { name: 'mindful', description: 'Осознанность', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/ProgressCommand', () => ({
  progressCommand: { name: 'progress', description: 'Прогресс', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/SosCommand', () => ({
  sosCommand: { name: 'sos', description: 'SOS', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/HelpCommand', () => ({
  helpCommand: { name: 'help', description: 'Помощь', aliases: ['h'], execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/ProfileCommand', () => ({
  profileCommand: { name: 'profile', description: 'Профиль', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/QuestCommand', () => ({
  questCommand: { name: 'quest', description: 'Квест', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/BadgeCommand', () => ({
  badgeCommand: { name: 'badge', description: 'Бейдж', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/EvolutionCommand', () => ({
  evolutionCommand: { name: 'evolution', description: 'Эволюция', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/SmartTipsCommand', () => ({
  smartTipsCommand: { name: 'smart_tips', description: 'Советы', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/AdminCommand', () => ({
  adminCommand: { name: 'admin', description: 'Админ', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/AEReportCommand', () => ({
  aeReportCommand: { name: 'aereport', description: 'AE Report', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/ChronotypeCommand', () => ({
  chronotypeCommand: { name: 'chronotype', description: 'Хронотип', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/TherapyCommand', () => ({
  therapyCommand: { name: 'therapy', description: 'Терапия', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/RehearsalCommand', () => ({
  rehearsalCommand: { name: 'rehearsal', description: 'Репетиция', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/RecallCommand', () => ({
  recallCommand: { name: 'recall', description: 'Воспоминание', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/WhatIfCommand', () => ({
  whatIfCommand: { name: 'whatif', description: 'Что если', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/PredictCommand', () => ({
  predictCommand: { name: 'predict', description: 'Прогноз', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/InsightsCommand', () => ({
  insightsCommand: { name: 'insights', description: 'Инсайты', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/ExplainCommand', () => ({
  explainCommand: { name: 'explain', description: 'Объяснение', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/SafetyCommand', () => ({
  safetyCommand: { name: 'safety', description: 'Безопасность', execute: jest.fn() },
}));
jest.mock('../../../../src/bot/commands/TwinCommand', () => ({
  twinCommand: { name: 'twin', description: 'Двойник', execute: jest.fn() },
}));

import { CommandHandler } from '../../../../src/bot/commands/CommandHandler';
import { CrisisDetectionService } from '../../../../src/bot/services/CrisisDetectionService';
import { CrisisEscalationService } from '../../../../src/bot/services/CrisisEscalationService';
import { SleepCoreAPI } from '../../../../src/SleepCoreAPI';
import type { ICommand, IConversationCommand } from '../../../../src/bot/commands/interfaces/ICommand';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

function createMockSleepCoreAPI(): SleepCoreAPI {
  return {
    getSession: jest.fn().mockReturnValue({
      userId: 'test-user',
      startedAt: new Date(),
      currentPhase: 'treatment',
      weekNumber: 2,
    }),
  } as unknown as SleepCoreAPI;
}

function createMockCrisisDetection(overrides: Record<string, unknown> = {}): CrisisDetectionService {
  return {
    analyzeMessage: jest.fn().mockReturnValue({
      shouldInterrupt: false,
      action: 'continue',
      message: '',
      resources: [],
      severity: 'none',
      event: {
        userId: 'test-user',
        chatId: '12345',
        timestamp: new Date(),
        severity: 'none',
        crisisType: 'unknown',
        confidence: 0,
        action: 'continue',
        messageText: '',
        indicators: [],
        responseProvided: false,
      },
    }),
    ...overrides,
  } as unknown as CrisisDetectionService;
}

function createMockCrisisEscalation(): CrisisEscalationService {
  return {
    escalate: jest.fn().mockResolvedValue({
      escalated: false,
      level: 'none',
      notificationsSent: 0,
      aeCreated: false,
    }),
    updateConfig: jest.fn(),
    setBot: jest.fn(),
  } as unknown as CrisisEscalationService;
}

function createMockGrammyContext(overrides: Record<string, unknown> = {}) {
  return {
    from: { id: 123, first_name: 'Test', language_code: 'ru', is_bot: false },
    chat: { id: 12345, type: 'private' },
    message: { text: '/test', message_id: 1, date: Date.now() / 1000, chat: { id: 12345, type: 'private' } },
    callbackQuery: undefined,
    reply: jest.fn().mockResolvedValue(undefined),
    answerCallbackQuery: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('CommandHandler', () => {
  let handler: CommandHandler;
  let mockSleepCore: SleepCoreAPI;
  let mockCrisisDetection: CrisisDetectionService;
  let mockCrisisEscalation: CrisisEscalationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepCore = createMockSleepCoreAPI();
    mockCrisisDetection = createMockCrisisDetection();
    mockCrisisEscalation = createMockCrisisEscalation();
    handler = new CommandHandler(mockSleepCore, mockCrisisDetection, mockCrisisEscalation);
  });

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  describe('Command Registration', () => {
    it('should register default commands on construction', () => {
      const all = handler.getAll();
      expect(all.length).toBeGreaterThanOrEqual(20);
    });

    it('should register a custom command by name', () => {
      const cmd: ICommand = {
        name: 'custom',
        description: 'Custom command',
        execute: jest.fn(),
      };
      handler.register(cmd);
      expect(handler.get('custom')).toBe(cmd);
    });

    it('should register aliases', () => {
      const cmd: ICommand = {
        name: 'mycommand',
        description: 'Test',
        aliases: ['mc', 'mycmd'],
        execute: jest.fn(),
      };
      handler.register(cmd);
      expect(handler.get('mc')).toBe(cmd);
      expect(handler.get('mycmd')).toBe(cmd);
    });

    it('should strip leading slash from command name in get()', () => {
      const cmd: ICommand = { name: 'foo', description: 'Foo', execute: jest.fn() };
      handler.register(cmd);
      expect(handler.get('/foo')).toBe(cmd);
    });

    it('should be case-insensitive in get()', () => {
      const cmd: ICommand = { name: 'bar', description: 'Bar', execute: jest.fn() };
      handler.register(cmd);
      expect(handler.get('BAR')).toBe(cmd);
    });

    it('should return true from has() for registered command', () => {
      expect(handler.has('start')).toBe(true);
    });

    it('should return false from has() for unknown command', () => {
      expect(handler.has('nonexistent')).toBe(false);
    });

    it('should return undefined from get() for unknown command', () => {
      expect(handler.get('nonexistent')).toBeUndefined();
    });

    it('should return all commands from getAll()', () => {
      const all = handler.getAll();
      const names = all.map(c => c.name);
      expect(names).toContain('start');
      expect(names).toContain('diary');
      expect(names).toContain('sos');
      expect(names).toContain('safety');
    });

    it('should resolve alias from help command', () => {
      const helpCmd = handler.get('h');
      expect(helpCmd).toBeDefined();
      expect(helpCmd!.name).toBe('help');
    });
  });

  // ==========================================================================
  // CRISIS DETECTION BEFORE EXECUTION (SAFETY-CRITICAL)
  // ==========================================================================

  describe('Crisis Detection Before Command Execution', () => {
    it('should call analyzeMessage BEFORE command.execute', async () => {
      const callOrder: string[] = [];

      (mockCrisisDetection.analyzeMessage as jest.Mock).mockImplementation(() => {
        callOrder.push('crisis_check');
        return {
          shouldInterrupt: false,
          action: 'continue',
          message: '',
          resources: [],
          severity: 'none',
          event: { severity: 'none', action: 'continue', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'unknown', confidence: 0, messageText: '', indicators: [], responseProvided: false },
        };
      });

      const cmd: ICommand = {
        name: 'testcmd',
        description: 'Test',
        execute: jest.fn().mockImplementation(async () => {
          callOrder.push('execute');
          return { success: true, message: 'ok' };
        }),
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext({ message: { text: '/testcmd', message_id: 1, date: 0, chat: { id: 12345, type: 'private' } } });
      await (handler as any).handleCommand(ctx, cmd);

      expect(callOrder).toEqual(['crisis_check', 'execute']);
    });

    it('should send crisis response and NOT execute command when shouldInterrupt=true', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockReturnValue({
        shouldInterrupt: true,
        action: 'emergency',
        message: '🚨 Crisis detected',
        resources: ['988'],
        severity: 'critical',
        event: { severity: 'critical', action: 'emergency', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'suicidal_ideation', confidence: 0.95, messageText: '', indicators: ['keyword'], responseProvided: true },
      });

      const cmd: ICommand = {
        name: 'blocked',
        description: 'Should not execute',
        execute: jest.fn(),
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(cmd.execute).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('🚨 Crisis detected', expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }));
    });

    it('should execute command when shouldInterrupt=false', async () => {
      const cmd: ICommand = {
        name: 'allowed',
        description: 'Should execute',
        execute: jest.fn().mockResolvedValue({ success: true, message: 'Done' }),
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(cmd.execute).toHaveBeenCalled();
    });

    it('should trigger escalation for high severity', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockReturnValue({
        shouldInterrupt: true,
        action: 'interrupt',
        message: 'High severity message',
        resources: [],
        severity: 'high',
        event: { severity: 'high', action: 'interrupt', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'self_harm', confidence: 0.8, messageText: '', indicators: [], responseProvided: true },
      });

      const ctx = createMockGrammyContext();
      const cmd: ICommand = { name: 'test', description: 'Test', execute: jest.fn() };
      await (handler as any).handleCommand(ctx, cmd);

      expect(mockCrisisEscalation.escalate).toHaveBeenCalled();
    });

    it('should trigger escalation for critical severity', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockReturnValue({
        shouldInterrupt: true,
        action: 'emergency',
        message: 'Critical message',
        resources: [],
        severity: 'critical',
        event: { severity: 'critical', action: 'emergency', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'suicidal_ideation', confidence: 0.95, messageText: '', indicators: ['keyword'], responseProvided: true },
      });

      const ctx = createMockGrammyContext();
      const cmd: ICommand = { name: 'test', description: 'Test', execute: jest.fn() };
      await (handler as any).handleCommand(ctx, cmd);

      expect(mockCrisisEscalation.escalate).toHaveBeenCalled();
    });

    it('should NOT trigger escalation for moderate severity', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockReturnValue({
        shouldInterrupt: false,
        action: 'supportive',
        message: 'Supportive message',
        resources: [],
        severity: 'moderate',
        event: { severity: 'moderate', action: 'supportive', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'distress', confidence: 0.5, messageText: '', indicators: [], responseProvided: true },
      });

      const cmd: ICommand = { name: 'test', description: 'Test', execute: jest.fn().mockResolvedValue({ success: true, message: 'ok' }) };
      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(mockCrisisEscalation.escalate).not.toHaveBeenCalled();
    });

    it('should NOT trigger escalation for low severity', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockReturnValue({
        shouldInterrupt: false,
        action: 'monitor',
        message: '',
        resources: [],
        severity: 'low',
        event: { severity: 'low', action: 'monitor', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'unknown', confidence: 0.2, messageText: '', indicators: [], responseProvided: false },
      });

      const cmd: ICommand = { name: 'test', description: 'Test', execute: jest.fn().mockResolvedValue({ success: true, message: 'ok' }) };
      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(mockCrisisEscalation.escalate).not.toHaveBeenCalled();
    });

    it('should still send crisis response when escalation fails', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockReturnValue({
        shouldInterrupt: true,
        action: 'emergency',
        message: 'Crisis response',
        resources: [],
        severity: 'critical',
        event: { severity: 'critical', action: 'emergency', userId: '123', chatId: '12345', timestamp: new Date(), crisisType: 'suicidal_ideation', confidence: 0.9, messageText: '', indicators: [], responseProvided: true },
      });
      (mockCrisisEscalation.escalate as jest.Mock).mockRejectedValue(new Error('Network error'));

      const ctx = createMockGrammyContext();
      const cmd: ICommand = { name: 'test', description: 'Test', execute: jest.fn() };
      await (handler as any).handleCommand(ctx, cmd);

      // Crisis response should still be sent despite escalation error
      expect(ctx.reply).toHaveBeenCalledWith('Crisis response', expect.anything());
      expect(cmd.execute).not.toHaveBeenCalled();
    });

    it('should continue normally when crisis detection throws', async () => {
      (mockCrisisDetection.analyzeMessage as jest.Mock).mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const cmd: ICommand = {
        name: 'test',
        description: 'Test',
        execute: jest.fn().mockResolvedValue({ success: true, message: 'Worked' }),
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      // Command should still execute despite crisis detection failure
      expect(cmd.execute).toHaveBeenCalled();
    });

    it('should skip crisis check when message text is empty', async () => {
      const cmd: ICommand = {
        name: 'test',
        description: 'Test',
        execute: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext({ message: { text: '', message_id: 1, date: 0, chat: { id: 12345, type: 'private' } } });
      await (handler as any).handleCommand(ctx, cmd);

      expect(mockCrisisDetection.analyzeMessage).not.toHaveBeenCalled();
      expect(cmd.execute).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SESSION REQUIREMENT
  // ==========================================================================

  describe('Session Requirement', () => {
    it('should execute command that does not require session', async () => {
      const cmd: ICommand = {
        name: 'nosession',
        description: 'No session needed',
        requiresSession: false,
        execute: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
      };

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(cmd.execute).toHaveBeenCalled();
    });

    it('should execute command that requires session when session exists', async () => {
      const cmd: ICommand = {
        name: 'withsession',
        description: 'Needs session',
        requiresSession: true,
        execute: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
      };

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(cmd.execute).toHaveBeenCalled();
    });

    it('should send /start prompt when session required but missing', async () => {
      (mockSleepCore.getSession as jest.Mock).mockReturnValue(null);

      const cmd: ICommand = {
        name: 'needssession',
        description: 'Needs session',
        requiresSession: true,
        execute: jest.fn(),
      };

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(cmd.execute).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/start'),
        expect.anything()
      );
    });

    it('should reply with error message when command execution throws', async () => {
      const cmd: ICommand = {
        name: 'failing',
        description: 'Fails',
        execute: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      };

      const ctx = createMockGrammyContext();
      await (handler as any).handleCommand(ctx, cmd);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Произошла ошибка. Попробуйте позже.');
    });
  });

  // ==========================================================================
  // CALLBACK QUERY HANDLING
  // ==========================================================================

  describe('Callback Query Handling', () => {
    it('should parse command:action:value format and route to command', async () => {
      const mockHandleCallback = jest.fn().mockResolvedValue({
        success: true,
        message: 'Callback handled',
      });
      const cmd: IConversationCommand = {
        name: 'myconv',
        description: 'Conv',
        steps: ['step1'],
        execute: jest.fn(),
        handleStep: jest.fn(),
        handleCallback: mockHandleCallback,
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext({
        callbackQuery: { data: 'myconv:action:value', id: '1' },
        message: undefined,
      });

      await (handler as any).handleCallbackQuery(ctx);

      expect(mockHandleCallback).toHaveBeenCalledWith(
        expect.objectContaining({ userId: '123' }),
        'myconv:action:value',
        expect.any(Object)
      );
      expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    });

    it('should answer with "Команда не найдена" for unknown command', async () => {
      const ctx = createMockGrammyContext({
        callbackQuery: { data: 'unknown:action', id: '1' },
        message: undefined,
      });

      await (handler as any).handleCallbackQuery(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: 'Команда не найдена' });
    });

    it('should answer with "Действие не поддерживается" for command without handleCallback', async () => {
      const ctx = createMockGrammyContext({
        callbackQuery: { data: 'start:some_action', id: '1' },
        message: undefined,
      });

      await (handler as any).handleCallbackQuery(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: 'Действие не поддерживается' });
    });

    it('should do nothing when callback data is empty', async () => {
      const ctx = createMockGrammyContext({
        callbackQuery: { data: undefined, id: '1' },
        message: undefined,
      });

      await (handler as any).handleCallbackQuery(ctx);

      expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
    });

    it('should update session data from callback result metadata', async () => {
      const mockHandleCallback = jest.fn().mockResolvedValue({
        success: true,
        message: 'Updated',
        metadata: { step: 'next', someData: 'value' },
      });
      const cmd: IConversationCommand = {
        name: 'conv2',
        description: 'Conv2',
        steps: ['s1'],
        execute: jest.fn(),
        handleStep: jest.fn(),
        handleCallback: mockHandleCallback,
      };
      handler.register(cmd);

      // First create a session by handling a command
      const cmdCtx = createMockGrammyContext();
      const simpleCmd: ICommand = { name: 'init', description: 'Init', execute: jest.fn().mockResolvedValue({ success: true }) };
      await (handler as any).handleCommand(cmdCtx, simpleCmd);

      // Now do callback
      const ctx = createMockGrammyContext({
        callbackQuery: { data: 'conv2:action', id: '1' },
        message: undefined,
      });
      await (handler as any).handleCallbackQuery(ctx);

      const session = (handler as any).sessions.get('123');
      expect(session).toBeDefined();
      expect(session.conversationData.step).toBe('next');
      expect(session.conversationData.someData).toBe('value');
    });

    it('should handle callback error gracefully', async () => {
      const mockHandleCallback = jest.fn().mockRejectedValue(new Error('Callback failed'));
      const cmd = {
        name: 'failcb',
        description: 'Fail',
        steps: ['s1'],
        execute: jest.fn(),
        handleStep: jest.fn(),
        handleCallback: mockHandleCallback,
      };
      handler.register(cmd);

      const ctx = createMockGrammyContext({
        callbackQuery: { data: 'failcb:action', id: '1' },
        message: undefined,
      });

      await (handler as any).handleCallbackQuery(ctx);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: 'Ошибка обработки' });
    });
  });

  // ==========================================================================
  // SAFETY PLAN KEYBOARD
  // ==========================================================================

  describe('Safety Plan Keyboard', () => {
    it('should return Russian keyboard for "ru" language', () => {
      const keyboard = (handler as any).buildSafetyPlanKeyboard('ru');
      const allTexts = keyboard.inline_keyboard.flat().map((b: any) => b.text);

      expect(allTexts).toContain('📋 План безопасности');
      expect(allTexts).toContain('🆘 SOS Помощь');
      expect(allTexts).toContain('🧘 Расслабление');
    });

    it('should return English keyboard for "en" language', () => {
      const keyboard = (handler as any).buildSafetyPlanKeyboard('en');
      const allTexts = keyboard.inline_keyboard.flat().map((b: any) => b.text);

      expect(allTexts).toContain('📋 Safety Plan');
      expect(allTexts).toContain('🆘 SOS Help');
      expect(allTexts).toContain('🧘 Relaxation');
    });

    it('should contain Russian hotline number for Russian keyboard', () => {
      const keyboard = (handler as any).buildSafetyPlanKeyboard('ru');
      const allUrls = keyboard.inline_keyboard.flat().map((b: any) => b.url).filter(Boolean);

      expect(allUrls.some((u: string) => u.includes('88002000122'))).toBe(true);
    });

    it('should contain 988 number for English keyboard', () => {
      const keyboard = (handler as any).buildSafetyPlanKeyboard('en');
      const allUrls = keyboard.inline_keyboard.flat().map((b: any) => b.url).filter(Boolean);

      expect(allUrls.some((u: string) => u.includes('988'))).toBe(true);
    });

    it('should have 3 rows of buttons', () => {
      const keyboard = (handler as any).buildSafetyPlanKeyboard('ru');
      expect(keyboard.inline_keyboard.length).toBe(3);
    });

    it('should contain SOS callback and relax callback', () => {
      const keyboard = (handler as any).buildSafetyPlanKeyboard('ru');
      const allCallbacks = keyboard.inline_keyboard.flat().map((b: any) => b.callback_data).filter(Boolean);

      expect(allCallbacks).toContain('sos:menu');
      expect(allCallbacks).toContain('relax:menu');
    });
  });

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  describe('Session Management', () => {
    it('should create new session when updateSession is called for new user', () => {
      (handler as any).updateSession('new-user', 'start');

      const session = (handler as any).sessions.get('new-user');
      expect(session).toBeDefined();
      expect(session.userId).toBe('new-user');
      expect(session.currentCommand).toBe('start');
      expect(session.hasCompletedOnboarding).toBe(false);
      expect(session.language).toBe('ru');
    });

    it('should update existing session', () => {
      (handler as any).updateSession('user1', 'start');
      const firstActivity = (handler as any).sessions.get('user1').lastActivityAt;

      (handler as any).updateSession('user1', 'diary');

      const session = (handler as any).sessions.get('user1');
      expect(session.currentCommand).toBe('diary');
      expect(session.lastActivityAt.getTime()).toBeGreaterThanOrEqual(firstActivity.getTime());
    });

    it('should merge conversation data in updateSessionData', () => {
      (handler as any).updateSession('user2', 'start');
      (handler as any).updateSessionData('user2', { key1: 'value1' });
      (handler as any).updateSessionData('user2', { key2: 'value2' });

      const session = (handler as any).sessions.get('user2');
      expect(session.conversationData.key1).toBe('value1');
      expect(session.conversationData.key2).toBe('value2');
    });

    it('should detect onboardingCompleted in updateSessionData', () => {
      (handler as any).updateSession('user3', 'start');
      expect((handler as any).sessions.get('user3').hasCompletedOnboarding).toBe(false);

      (handler as any).updateSessionData('user3', { onboardingCompleted: true });
      expect((handler as any).sessions.get('user3').hasCompletedOnboarding).toBe(true);
    });
  });

  // ==========================================================================
  // RESPONSE SENDING
  // ==========================================================================

  describe('Response Sending', () => {
    it('should send error message for failed result', async () => {
      const ctx = createMockGrammyContext();
      await (handler as any).sendCommandResult(ctx, { success: false, error: 'Something went wrong' });

      expect(ctx.reply).toHaveBeenCalledWith('❌ Something went wrong');
    });

    it('should not send anything when message is empty', async () => {
      const ctx = createMockGrammyContext();
      await (handler as any).sendCommandResult(ctx, { success: true });

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should send message with HTML parse mode', async () => {
      const ctx = createMockGrammyContext();
      await (handler as any).sendCommandResult(ctx, { success: true, message: '<b>Hello</b>' });

      expect(ctx.reply).toHaveBeenCalledWith('<b>Hello</b>', expect.objectContaining({ parse_mode: 'HTML' }));
    });

    it('should include inline keyboard when present', async () => {
      const ctx = createMockGrammyContext();
      await (handler as any).sendCommandResult(ctx, {
        success: true,
        message: 'Pick one',
        keyboard: [[{ text: 'Option A', callbackData: 'a' }]],
      });

      expect(ctx.reply).toHaveBeenCalledWith('Pick one', expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }));
    });
  });

  // ==========================================================================
  // UTILITY & ACCESSORS
  // ==========================================================================

  describe('Utility Methods', () => {
    it('should expose crisis detection service', () => {
      const svc = handler.getCrisisDetectionService();
      expect(svc).toBe(mockCrisisDetection);
    });

    it('should expose crisis escalation service', () => {
      const svc = handler.getCrisisEscalationService();
      expect(svc).toBe(mockCrisisEscalation);
    });

    it('should configure escalation via configureEscalation()', () => {
      handler.configureEscalation({ adminUserIds: ['admin1', 'admin2'] });
      expect(mockCrisisEscalation.updateConfig).toHaveBeenCalledWith({ adminUserIds: ['admin1', 'admin2'] });
    });

    it('should generate BotFather commands list', () => {
      const cmds = handler.getBotFatherCommands();
      expect(cmds.length).toBeGreaterThan(0);
      expect(cmds[0]).toHaveProperty('command');
      expect(cmds[0]).toHaveProperty('description');
    });
  });
});
