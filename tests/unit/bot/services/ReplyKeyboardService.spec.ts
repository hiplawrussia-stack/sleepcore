/**
 * ReplyKeyboardService Unit Tests
 * ================================
 * Tests for context-aware reply keyboard generation.
 *
 * @module @sleepcore/bot/services
 */

import { ReplyKeyboardService, replyKeyboard } from '../../../../src/bot/services/ReplyKeyboardService';
import type { IKeyboardContext } from '../../../../src/bot/services/ReplyKeyboardService';

describe('ReplyKeyboardService', () => {
  let service: ReplyKeyboardService;

  beforeEach(() => {
    service = new ReplyKeyboardService();
  });

  describe('getTimeOfDay', () => {
    it('should return a valid time of day', () => {
      const result = service.getTimeOfDay();
      expect(['morning', 'day', 'evening', 'night']).toContain(result);
    });
  });

  describe('getLayout', () => {
    it('should return vulnerable layout when isVulnerable is true', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        isVulnerable: true,
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.description).toContain('Vulnerable');
      expect(layout.primaryButtons.some((b) => b.command === 'sos')).toBe(true);
    });

    it('should return onboarding layout when hasCompletedOnboarding is false', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        hasCompletedOnboarding: false,
      };

      const layout = service.getLayout(context);

      expect(layout.description).toContain('Onboarding');
      expect(layout.primaryButtons.some((b) => b.command === 'start')).toBe(true);
    });

    it('should return morning layout for morning time', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('morning');
      expect(layout.description).toContain('Morning');
    });

    it('should return day layout for day time', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('day');
    });

    it('should return evening layout for evening time', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'evening',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('evening');
    });

    it('should return night layout for night time', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'night',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('night');
    });

    it('should prioritize vulnerable over onboarding', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        isVulnerable: true,
        hasCompletedOnboarding: false,
      };

      const layout = service.getLayout(context);

      expect(layout.description).toContain('Vulnerable');
    });
  });

  describe('buildKeyboard', () => {
    it('should create a keyboard from layout', () => {
      const layout = {
        timeOfDay: 'morning' as const,
        description: 'Test layout',
        primaryButtons: [
          { text: '📓 Дневник', command: 'diary' },
          { text: '📊 Меню', command: 'menu' },
        ],
      };

      const keyboard = service.buildKeyboard(layout);

      expect(keyboard).toBeDefined();
      // Grammy Keyboard doesn't expose buttons directly in tests, but we verify it builds
    });
  });

  describe('generate', () => {
    it('should generate keyboard with default context', () => {
      const keyboard = service.generate();
      expect(keyboard).toBeDefined();
    });

    it('should generate keyboard for specific time of day', () => {
      const keyboard = service.generate({ timeOfDay: 'evening' });
      expect(keyboard).toBeDefined();
    });

    it('should respect isVulnerable in context', () => {
      const keyboard = service.generate({ isVulnerable: true });
      expect(keyboard).toBeDefined();
    });

    it('should use hasCompletedOnboarding from context', () => {
      const keyboard = service.generate({ hasCompletedOnboarding: false });
      expect(keyboard).toBeDefined();
    });
  });

  describe('generateForTime', () => {
    it('should generate keyboard for morning', () => {
      const keyboard = service.generateForTime('morning');
      expect(keyboard).toBeDefined();
    });

    it('should generate keyboard for day', () => {
      const keyboard = service.generateForTime('day');
      expect(keyboard).toBeDefined();
    });

    it('should generate keyboard for evening', () => {
      const keyboard = service.generateForTime('evening');
      expect(keyboard).toBeDefined();
    });

    it('should generate keyboard for night', () => {
      const keyboard = service.generateForTime('night');
      expect(keyboard).toBeDefined();
    });
  });

  describe('getCurrentLayoutDescription', () => {
    it('should return layout description', () => {
      const description = service.getCurrentLayoutDescription({ timeOfDay: 'morning' });
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should return vulnerable description when isVulnerable', () => {
      const description = service.getCurrentLayoutDescription({ isVulnerable: true });
      expect(description).toContain('Vulnerable');
    });

    it('should return onboarding description when not completed', () => {
      const description = service.getCurrentLayoutDescription({ hasCompletedOnboarding: false });
      expect(description).toContain('Onboarding');
    });
  });

  describe('parseButtonToCommand', () => {
    it('should parse diary button to command', () => {
      const command = service.parseButtonToCommand('📓 Дневник');
      expect(command).toBe('diary');
    });

    it('should parse menu button to command', () => {
      const command = service.parseButtonToCommand('📊 Меню');
      expect(command).toBe('menu');
    });

    it('should parse SOS button to command', () => {
      const command = service.parseButtonToCommand('🆘 Помощь');
      expect(command).toBe('sos');
    });

    it('should return null for unknown button', () => {
      const command = service.parseButtonToCommand('Unknown Button');
      expect(command).toBeNull();
    });

    it('should parse relaxation button', () => {
      const command = service.parseButtonToCommand('🧘 Релаксация');
      expect(command).toBe('relax');
    });

    it('should parse today button', () => {
      const command = service.parseButtonToCommand('📅 Сегодня');
      expect(command).toBe('today');
    });
  });

  describe('isReplyKeyboardButton', () => {
    it('should return true for valid button text', () => {
      expect(service.isReplyKeyboardButton('📓 Дневник')).toBe(true);
    });

    it('should return false for unknown text', () => {
      expect(service.isReplyKeyboardButton('Random Text')).toBe(false);
    });

    it('should return true for SOS button', () => {
      expect(service.isReplyKeyboardButton('🆘 Помощь')).toBe(true);
    });
  });
});

describe('replyKeyboard singleton', () => {
  it('should export singleton instance', () => {
    expect(replyKeyboard).toBeInstanceOf(ReplyKeyboardService);
  });
});
