/**
 * Integration Utilities Tests
 * ===========================
 * Unit tests for router integration utilities.
 *
 * @packageDocumentation
 */

import { createCallbackProcessor, buildKeyboard, sendCommandResult } from '../integration';
import { InlineKeyboard } from 'grammy';

describe('Integration Utilities', () => {
  const mockDeps = {
    startCommand: { execute: jest.fn(), handleCallback: jest.fn() },
    diaryCommand: { execute: jest.fn(), handleCallback: jest.fn() },
    therapyCommand: { execute: jest.fn(), handleCallback: jest.fn() },
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
    ensureGamificationSession: jest.fn().mockResolvedValue(undefined),
  };

  describe('createCallbackProcessor', () => {
    it('should create a processor function', () => {
      const processor = createCallbackProcessor(mockDeps);
      expect(typeof processor).toBe('function');
    });

    it('should return not handled for missing callback data', async () => {
      const processor = createCallbackProcessor(mockDeps);

      const ctx = {
        callbackQuery: {},
      } as any;

      const sleepCoreCtx = {
        userId: '123',
        chatId: '123',
        locale: 'ru',
      } as any;

      const result = await processor(ctx, sleepCoreCtx);
      expect(result.handled).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      const errorDeps = {
        ...mockDeps,
        startCommand: {
          execute: jest.fn(),
          handleCallback: jest.fn().mockRejectedValue(new Error('Test error')),
        },
      };
      const processor = createCallbackProcessor(errorDeps);

      const ctx = {
        callbackQuery: { data: 'start:test' },
        session: { preferences: { notifications: true } },
      } as any;

      const sleepCoreCtx = {
        userId: '123',
        chatId: '123',
        locale: 'ru',
      } as any;

      // Handler exceptions are caught in the router and returned as not handled
      const result = await processor(ctx, sleepCoreCtx);
      expect(result.handled).toBe(false);
    });
  });

  describe('buildKeyboard', () => {
    it('should return undefined for null input', () => {
      expect(buildKeyboard(null)).toBeUndefined();
    });

    it('should return undefined for non-array input', () => {
      expect(buildKeyboard('string')).toBeUndefined();
      expect(buildKeyboard(123)).toBeUndefined();
      expect(buildKeyboard({})).toBeUndefined();
    });

    it('should build keyboard from array spec', () => {
      const spec = [
        [{ text: 'Button 1', callback_data: 'action1' }],
        [{ text: 'Button 2', callback_data: 'action2' }],
      ];

      const keyboard = buildKeyboard(spec);
      expect(keyboard).toBeInstanceOf(InlineKeyboard);
    });

    it('should handle URL buttons', () => {
      const spec = [
        [{ text: 'Link', url: 'https://example.com' }],
      ];

      const keyboard = buildKeyboard(spec);
      expect(keyboard).toBeInstanceOf(InlineKeyboard);
    });

    it('should handle empty rows', () => {
      const spec = [[]];
      const keyboard = buildKeyboard(spec);
      expect(keyboard).toBeInstanceOf(InlineKeyboard);
    });
  });

  describe('sendCommandResult', () => {
    it('should not send if no message', async () => {
      const ctx = {
        editMessageText: jest.fn(),
        reply: jest.fn(),
      } as any;

      await sendCommandResult(ctx, {});
      expect(ctx.editMessageText).not.toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should edit message text with result', async () => {
      const ctx = {
        editMessageText: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn(),
      } as any;

      await sendCommandResult(ctx, { message: 'Test message' });
      expect(ctx.editMessageText).toHaveBeenCalledWith('Test message', {
        parse_mode: 'Markdown',
        reply_markup: undefined,
      });
    });

    it('should build keyboard if provided', async () => {
      const ctx = {
        editMessageText: jest.fn().mockResolvedValue(undefined),
        reply: jest.fn(),
      } as any;

      const keyboard = [[{ text: 'Button', callback_data: 'action' }]];
      await sendCommandResult(ctx, { message: 'Test', keyboard });

      expect(ctx.editMessageText).toHaveBeenCalled();
      const call = ctx.editMessageText.mock.calls[0];
      expect(call[1].reply_markup).toBeInstanceOf(InlineKeyboard);
    });

    it('should fallback to reply if edit fails', async () => {
      const ctx = {
        editMessageText: jest.fn().mockRejectedValue(new Error('Edit failed')),
        reply: jest.fn().mockResolvedValue(undefined),
      } as any;

      await sendCommandResult(ctx, { message: 'Test message' });
      expect(ctx.reply).toHaveBeenCalledWith('Test message', {
        parse_mode: 'Markdown',
        reply_markup: undefined,
      });
    });
  });
});
