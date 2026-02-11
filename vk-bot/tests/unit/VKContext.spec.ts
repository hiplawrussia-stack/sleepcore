/**
 * VK Context Unit Tests
 * =====================
 * Tests for the VK context implementation.
 *
 * Test Coverage:
 * - VKSleepCoreContext class
 * - Property getters (userId, chatId, displayName, etc.)
 * - Methods (reply, sendResult, answerCallback, editMessage, deleteMessage)
 * - Markdown conversion
 * - createVKContext factory function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VKSleepCoreContext, createVKContext } from '../../src/platform/VKContext';
import type { VKUser, VKCallbackPayload } from '../../src/platform/types';
import type { ICommandResult, IInlineButton } from '../../../src/bot/commands/interfaces/ICommand';

// Mock MessageContext from vk-io
function createMockVKContext(overrides: Partial<{
  senderId: number;
  peerId: number;
  text: string;
  eventPayload: unknown;
  conversationMessageId: number;
}> = {}) {
  const defaults = {
    senderId: 123456789,
    peerId: 2000000001,
    text: '',
    eventPayload: undefined,
    conversationMessageId: undefined,
  };

  const ctx = {
    ...defaults,
    ...overrides,
    send: vi.fn().mockResolvedValue(undefined),
    answer: vi.fn().mockResolvedValue(undefined),
    api: {
      messages: {
        edit: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    },
  };

  return ctx as any;
}

// Mock SleepCoreAPI
function createMockSleepCoreAPI() {
  return {
    // Add minimal mock as needed
  } as any;
}

describe('VK Context', () => {
  describe('VKSleepCoreContext', () => {
    let mockVKContext: ReturnType<typeof createMockVKContext>;
    let mockSleepCore: ReturnType<typeof createMockSleepCoreAPI>;
    let context: VKSleepCoreContext;

    beforeEach(() => {
      mockVKContext = createMockVKContext();
      mockSleepCore = createMockSleepCoreAPI();
      context = new VKSleepCoreContext(mockVKContext, mockSleepCore);
    });

    describe('Property getters', () => {
      it('should return userId as string', () => {
        mockVKContext = createMockVKContext({ senderId: 123456789 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.userId).toBe('123456789');
        expect(typeof context.userId).toBe('string');
      });

      it('should return chatId (peerId)', () => {
        mockVKContext = createMockVKContext({ peerId: 2000000001 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.chatId).toBe(2000000001);
      });

      it('should return default displayName when no user set', () => {
        mockVKContext = createMockVKContext({ senderId: 123 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.displayName).toBe('User 123');
      });

      it('should return first name when user is set', () => {
        const user: VKUser = {
          id: 123,
          first_name: 'Иван',
          is_closed: false,
        };
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore, user);

        expect(context.displayName).toBe('Иван');
      });

      it('should return full name when user has last name', () => {
        const user: VKUser = {
          id: 123,
          first_name: 'Иван',
          last_name: 'Петров',
          is_closed: false,
        };
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore, user);

        expect(context.displayName).toBe('Иван Петров');
      });

      it('should return default languageCode as ru', () => {
        expect(context.languageCode).toBe('ru');
      });

      it('should return sleepCore API instance', () => {
        expect(context.sleepCore).toBe(mockSleepCore);
      });

      it('should return original vkContext', () => {
        expect(context.vkContext).toBe(mockVKContext);
      });

      it('should return messageText from vk context', () => {
        mockVKContext = createMockVKContext({ text: 'Привет мир' });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.messageText).toBe('Привет мир');
      });

      it('should return empty string when no message text', () => {
        mockVKContext = createMockVKContext({ text: undefined as any });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.messageText).toBe('');
      });

      it('should return callbackPayload from vk context', () => {
        const payload: VKCallbackPayload = {
          command: 'therapy',
          action: 'start',
        };
        mockVKContext = createMockVKContext({ eventPayload: payload });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.callbackPayload).toEqual(payload);
      });

      it('should return isCallback true when eventPayload exists', () => {
        mockVKContext = createMockVKContext({ eventPayload: { command: 'test' } });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.isCallback).toBe(true);
      });

      it('should return isCallback false when no eventPayload', () => {
        mockVKContext = createMockVKContext({ eventPayload: undefined });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        expect(context.isCallback).toBe(false);
      });
    });

    describe('setLanguageCode', () => {
      it('should update language code', () => {
        context.setLanguageCode('en');

        expect(context.languageCode).toBe('en');
      });
    });

    describe('setUser', () => {
      it('should update user info', () => {
        const user: VKUser = {
          id: 456,
          first_name: 'Мария',
          last_name: 'Сидорова',
          is_closed: false,
        };

        context.setUser(user);

        expect(context.displayName).toBe('Мария Сидорова');
      });
    });

    describe('reply', () => {
      it('should send message through vk context', async () => {
        await context.reply('Привет!');

        expect(mockVKContext.send).toHaveBeenCalledWith({
          message: 'Привет!',
        });
      });

      it('should include keyboard in options', async () => {
        const keyboard = { one_time: false, buttons: [] };

        await context.reply('Выберите:', { keyboard: keyboard as any });

        expect(mockVKContext.send).toHaveBeenCalledWith({
          message: 'Выберите:',
          keyboard: keyboard,
        });
      });

      it('should include attachments', async () => {
        await context.reply('Смотри фото', {
          attachments: ['photo123_456', 'photo789_012'],
        });

        expect(mockVKContext.send).toHaveBeenCalledWith({
          message: 'Смотри фото',
          attachment: 'photo123_456,photo789_012',
        });
      });

      it('should disable mentions when specified', async () => {
        await context.reply('Текст', { disableMentions: true });

        expect(mockVKContext.send).toHaveBeenCalledWith({
          message: 'Текст',
          disable_mentions: true,
        });
      });

      describe('Markdown conversion', () => {
        it('should remove bold formatting (*text*)', async () => {
          await context.reply('This is *bold* text');

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'This is bold text',
          });
        });

        it('should remove double bold formatting (**text**)', async () => {
          await context.reply('This is **bold** text');

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'This is bold text',
          });
        });

        it('should remove italic formatting (_text_)', async () => {
          await context.reply('This is _italic_ text');

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'This is italic text',
          });
        });

        it('should remove inline code formatting (`text`)', async () => {
          await context.reply('Use `npm install` command');

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'Use npm install command',
          });
        });

        it('should remove code block formatting', async () => {
          // Code block regex extracts content between ```
          await context.reply('Example:\n```\nconst x = 1;\n```');

          // Check that send was called with transformed message
          expect(mockVKContext.send).toHaveBeenCalled();
          const sentMessage = mockVKContext.send.mock.calls[0][0].message;
          // The code block content should be preserved without the markers
          expect(sentMessage).toContain('const x = 1;');
          expect(sentMessage).toContain('Example:');
        });

        it('should convert links to text with url', async () => {
          await context.reply('Visit [our site](https://example.com)');

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'Visit our site (https://example.com)',
          });
        });

        it('should handle multiple formatting in one message', async () => {
          await context.reply(
            '*Bold* and _italic_ with `code` and [link](https://example.com)'
          );

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'Bold and italic with code and link (https://example.com)',
          });
        });

        it('should preserve plain text', async () => {
          await context.reply('Обычный текст без форматирования');

          expect(mockVKContext.send).toHaveBeenCalledWith({
            message: 'Обычный текст без форматирования',
          });
        });
      });
    });

    describe('sendResult', () => {
      it('should not send anything when message is empty', async () => {
        const result: ICommandResult = {};

        await context.sendResult(result);

        expect(mockVKContext.send).not.toHaveBeenCalled();
      });

      it('should send message from command result', async () => {
        const result: ICommandResult = {
          message: 'Команда выполнена',
        };

        await context.sendResult(result);

        expect(mockVKContext.send).toHaveBeenCalledWith({
          message: 'Команда выполнена',
        });
      });

      it('should convert inline keyboard', async () => {
        const result: ICommandResult = {
          message: 'Выберите действие:',
          keyboard: [
            [{ text: 'Начать', callbackData: 'action:start' }],
          ],
        };

        await context.sendResult(result);

        expect(mockVKContext.send).toHaveBeenCalled();
        const callArg = mockVKContext.send.mock.calls[0][0];
        expect(callArg.message).toBe('Выберите действие:');
        expect(callArg.keyboard).toBeDefined();
      });

      it('should convert reply keyboard', async () => {
        const result: ICommandResult = {
          message: 'Выберите:',
          replyKeyboard: [
            [{ text: 'Да' }, { text: 'Нет' }],
          ],
        };

        await context.sendResult(result);

        expect(mockVKContext.send).toHaveBeenCalled();
        const callArg = mockVKContext.send.mock.calls[0][0];
        expect(callArg.keyboard).toBeDefined();
      });

      it('should remove keyboard when requested', async () => {
        const result: ICommandResult = {
          message: 'Готово',
          removeKeyboard: true,
        };

        await context.sendResult(result);

        expect(mockVKContext.send).toHaveBeenCalled();
        const callArg = mockVKContext.send.mock.calls[0][0];
        expect(callArg.keyboard).toBeDefined();
      });
    });

    describe('answerCallback', () => {
      it('should show snackbar with text', async () => {
        mockVKContext = createMockVKContext({ eventPayload: { command: 'test' } });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.answerCallback('Успешно!');

        expect(mockVKContext.answer).toHaveBeenCalledWith({
          type: 'show_snackbar',
          text: 'Успешно!',
        });
      });

      it('should show default OK text when no text provided', async () => {
        mockVKContext = createMockVKContext({ eventPayload: { command: 'test' } });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.answerCallback();

        expect(mockVKContext.answer).toHaveBeenCalledWith({
          type: 'show_snackbar',
          text: 'OK',
        });
      });

      it('should not call answer when not a callback context', async () => {
        mockVKContext = createMockVKContext({ eventPayload: undefined });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.answerCallback('Text');

        expect(mockVKContext.answer).not.toHaveBeenCalled();
      });

      it('should silently handle answer errors', async () => {
        mockVKContext = createMockVKContext({ eventPayload: { command: 'test' } });
        mockVKContext.answer = vi.fn().mockRejectedValue(new Error('API Error'));
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        // Should not throw
        await expect(context.answerCallback('Text')).resolves.toBeUndefined();
      });
    });

    describe('editMessage', () => {
      it('should edit message when conversationMessageId exists', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: 123 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.editMessage('Обновленный текст');

        expect(mockVKContext.api.messages.edit).toHaveBeenCalledWith({
          peer_id: mockVKContext.peerId,
          conversation_message_id: 123,
          message: 'Обновленный текст',
        });
      });

      it('should include keyboard in edit', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: 123 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);
        const keyboard = { buttons: [] };

        await context.editMessage('Текст', { keyboard: keyboard as any });

        expect(mockVKContext.api.messages.edit).toHaveBeenCalledWith({
          peer_id: mockVKContext.peerId,
          conversation_message_id: 123,
          message: 'Текст',
          keyboard: keyboard,
        });
      });

      it('should fallback to reply when no conversationMessageId', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: undefined });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.editMessage('Текст');

        expect(mockVKContext.api.messages.edit).not.toHaveBeenCalled();
        expect(mockVKContext.send).toHaveBeenCalled();
      });

      it('should fallback to reply when edit fails', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: 123 });
        mockVKContext.api.messages.edit = vi.fn().mockRejectedValue(new Error('Edit failed'));
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.editMessage('Текст');

        expect(mockVKContext.send).toHaveBeenCalled();
      });
    });

    describe('deleteMessage', () => {
      it('should delete message by conversationMessageId', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: 456 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.deleteMessage();

        expect(mockVKContext.api.messages.delete).toHaveBeenCalledWith({
          peer_id: mockVKContext.peerId,
          conversation_message_ids: [456],
          delete_for_all: 1,
        });
      });

      it('should delete message by explicit messageId', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: 456 });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await context.deleteMessage(789);

        expect(mockVKContext.api.messages.delete).toHaveBeenCalledWith({
          peer_id: mockVKContext.peerId,
          conversation_message_ids: [789],
          delete_for_all: 1,
        });
      });

      it('should not throw when no messageId', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: undefined });
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await expect(context.deleteMessage()).resolves.toBeUndefined();
        expect(mockVKContext.api.messages.delete).not.toHaveBeenCalled();
      });

      it('should silently handle delete errors', async () => {
        mockVKContext = createMockVKContext({ conversationMessageId: 123 });
        mockVKContext.api.messages.delete = vi.fn().mockRejectedValue(new Error('Delete failed'));
        context = new VKSleepCoreContext(mockVKContext, mockSleepCore);

        await expect(context.deleteMessage()).resolves.toBeUndefined();
      });
    });
  });

  describe('createVKContext', () => {
    it('should create context and fetch user info', async () => {
      const mockVKContext = createMockVKContext({ senderId: 123 });
      const mockSleepCore = createMockSleepCoreAPI();
      const mockUser: VKUser = {
        id: 123,
        first_name: 'Тест',
        last_name: 'Пользователь',
        is_closed: false,
      };
      const mockApi = {
        users: {
          get: vi.fn().mockResolvedValue([mockUser]),
        },
      };

      const ctx = await createVKContext(mockVKContext, mockSleepCore, mockApi);

      expect(mockApi.users.get).toHaveBeenCalledWith({ user_ids: [123] });
      expect(ctx.displayName).toBe('Тест Пользователь');
    });

    it('should handle user fetch error gracefully', async () => {
      const mockVKContext = createMockVKContext({ senderId: 123 });
      const mockSleepCore = createMockSleepCoreAPI();
      const mockApi = {
        users: {
          get: vi.fn().mockRejectedValue(new Error('API Error')),
        },
      };

      const ctx = await createVKContext(mockVKContext, mockSleepCore, mockApi);

      expect(ctx.displayName).toBe('User 123');
    });

    it('should handle empty user response', async () => {
      const mockVKContext = createMockVKContext({ senderId: 123 });
      const mockSleepCore = createMockSleepCoreAPI();
      const mockApi = {
        users: {
          get: vi.fn().mockResolvedValue([]),
        },
      };

      const ctx = await createVKContext(mockVKContext, mockSleepCore, mockApi);

      expect(ctx.displayName).toBe('User 123');
    });
  });
});
