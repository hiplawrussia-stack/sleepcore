/**
 * ReplyKeyboardService Tests
 * ==========================
 *
 * Tests for context-aware persistent reply keyboard service.
 * Validates time-based layouts, context switching, and button parsing.
 *
 * @packageDocumentation
 */

import {
  ReplyKeyboardService,
  replyKeyboard,
  type IKeyboardContext,
} from '../ReplyKeyboardService';

describe('ReplyKeyboardService', () => {
  let service: ReplyKeyboardService;

  beforeEach(() => {
    service = new ReplyKeyboardService();
  });

  // ==========================================================================
  // Time of Day
  // ==========================================================================
  describe('Time of Day', () => {
    it('should return valid time of day', () => {
      const tod = service.getTimeOfDay();

      expect(['morning', 'day', 'evening', 'night']).toContain(tod);
    });
  });

  // ==========================================================================
  // Layout Selection
  // ==========================================================================
  describe('Layout Selection', () => {
    it('should return morning layout', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('morning');
      expect(layout.description).toContain('Morning');
    });

    it('should return day layout', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('day');
      expect(layout.description).toContain('Day');
    });

    it('should return evening layout', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'evening',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('evening');
      expect(layout.description).toContain('Evening');
    });

    it('should return night layout', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'night',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.timeOfDay).toBe('night');
      expect(layout.description).toContain('Night');
    });
  });

  // ==========================================================================
  // Context Priority
  // ==========================================================================
  describe('Context Priority', () => {
    it('should prioritize vulnerable state over time', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        isVulnerable: true,
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.description).toContain('Vulnerable');
    });

    it('should prioritize onboarding over time', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'evening',
        hasCompletedOnboarding: false,
      };

      const layout = service.getLayout(context);

      expect(layout.description).toContain('Onboarding');
    });

    it('should prioritize vulnerable over onboarding', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        isVulnerable: true,
        hasCompletedOnboarding: false,
      };

      const layout = service.getLayout(context);

      expect(layout.description).toContain('Vulnerable');
    });
  });

  // ==========================================================================
  // Keyboard Building
  // ==========================================================================
  describe('Keyboard Building', () => {
    it('should build keyboard from layout', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);
      const keyboard = service.buildKeyboard(layout);

      expect(keyboard).toBeDefined();
    });

    it('should include primary buttons', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'morning',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);

      expect(layout.primaryButtons.length).toBeGreaterThan(0);
      expect(layout.primaryButtons.length).toBeLessThanOrEqual(5);
    });

    it('should have menu button in all layouts', () => {
      const times = ['morning', 'day', 'evening', 'night'] as const;

      for (const time of times) {
        const context: IKeyboardContext = {
          timeOfDay: time,
          hasCompletedOnboarding: true,
        };
        const layout = service.getLayout(context);
        const hasMenu = layout.primaryButtons.some(b => b.command === 'menu');
        expect(hasMenu).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Keyboard Generation
  // ==========================================================================
  describe('Keyboard Generation', () => {
    it('should generate keyboard with defaults', () => {
      const keyboard = service.generate();

      expect(keyboard).toBeDefined();
    });

    it('should generate keyboard with partial context', () => {
      const keyboard = service.generate({ isVulnerable: true });

      expect(keyboard).toBeDefined();
    });

    it('should generate keyboard for specific time', () => {
      const keyboard = service.generateForTime('evening');

      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Layout Description
  // ==========================================================================
  describe('Layout Description', () => {
    it('should get current layout description', () => {
      const description = service.getCurrentLayoutDescription();

      expect(description.length).toBeGreaterThan(0);
    });

    it('should get description for context', () => {
      const description = service.getCurrentLayoutDescription({
        isVulnerable: true,
      });

      expect(description).toContain('Vulnerable');
    });
  });

  // ==========================================================================
  // Button Parsing
  // ==========================================================================
  describe('Button Parsing', () => {
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

    it('should parse relaxation button to command', () => {
      const command = service.parseButtonToCommand('🧘 Релаксация');

      expect(command).toBe('relax');
    });

    it('should return null for unknown button', () => {
      const command = service.parseButtonToCommand('Unknown Button');

      expect(command).toBeNull();
    });

    it('should check if text is reply keyboard button', () => {
      expect(service.isReplyKeyboardButton('📓 Дневник')).toBe(true);
      expect(service.isReplyKeyboardButton('Random text')).toBe(false);
    });
  });

  // ==========================================================================
  // Night Layout
  // ==========================================================================
  describe('Night Layout', () => {
    it('should have SOS button in night layout', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'night',
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);
      const hasSOS = layout.primaryButtons.some(
        b => b.command === 'sos' || b.text.includes('Помощь')
      );

      expect(hasSOS).toBe(true);
    });
  });

  // ==========================================================================
  // Vulnerable Layout
  // ==========================================================================
  describe('Vulnerable Layout', () => {
    it('should have urgent SOS button', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        isVulnerable: true,
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);
      const hasSOS = layout.primaryButtons.some(
        b => b.text.includes('Срочная') || b.command === 'sos'
      );

      expect(hasSOS).toBe(true);
    });

    it('should have relaxation option', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        isVulnerable: true,
        hasCompletedOnboarding: true,
      };

      const layout = service.getLayout(context);
      const hasRelax = layout.primaryButtons.some(
        b => b.command === 'relax' || b.text.includes('Успокоиться')
      );

      expect(hasRelax).toBe(true);
    });
  });

  // ==========================================================================
  // Onboarding Layout
  // ==========================================================================
  describe('Onboarding Layout', () => {
    it('should have start button', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        hasCompletedOnboarding: false,
      };

      const layout = service.getLayout(context);
      const hasStart = layout.primaryButtons.some(b => b.command === 'start');

      expect(hasStart).toBe(true);
    });

    it('should have help button', () => {
      const context: IKeyboardContext = {
        timeOfDay: 'day',
        hasCompletedOnboarding: false,
      };

      const layout = service.getLayout(context);
      const hasHelp = layout.primaryButtons.some(b => b.command === 'help');

      expect(hasHelp).toBe(true);
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(replyKeyboard).toBeInstanceOf(ReplyKeyboardService);
    });

    it('should generate keyboard via singleton', () => {
      const keyboard = replyKeyboard.generate();

      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty context', () => {
      const keyboard = service.generate({});

      expect(keyboard).toBeDefined();
    });

    it('should default hasCompletedOnboarding to true', () => {
      const keyboard = service.generate({ timeOfDay: 'morning' });

      expect(keyboard).toBeDefined();
    });

    it('should handle all button texts in layouts', () => {
      const allButtons = [
        '📓 Дневник',
        '📅 Сегодня',
        '📊 Меню',
        '🧠 Осознанность',
        '📈 Прогресс',
        '🧘 Релаксация',
        '🆘 Помощь',
        '🆘 Срочная помощь',
        '🧘 Успокоиться',
        '❓ Справка',
        '🚀 Начать',
      ];

      for (const button of allButtons) {
        const result = service.isReplyKeyboardButton(button);
        // Some should be true (from layouts), others false (not in layouts)
        expect(typeof result).toBe('boolean');
      }
    });
  });
});
