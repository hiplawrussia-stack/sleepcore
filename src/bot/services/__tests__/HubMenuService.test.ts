/**
 * HubMenuService Tests
 * ====================
 *
 * Tests for hub-and-spoke navigation pattern service.
 * Validates menu generation, section management, and command lookup.
 *
 * @packageDocumentation
 */

import { HubMenuService, hubMenu } from '../HubMenuService';

describe('HubMenuService', () => {
  let service: HubMenuService;

  beforeEach(() => {
    service = new HubMenuService();
  });

  // ==========================================================================
  // Section Management
  // ==========================================================================
  describe('Section Management', () => {
    it('should return all sections', () => {
      const sections = service.getSections();

      expect(sections.length).toBe(4);
      expect(sections.map(s => s.id)).toContain('daily');
      expect(sections.map(s => s.id)).toContain('therapy');
      expect(sections.map(s => s.id)).toContain('analytics');
      expect(sections.map(s => s.id)).toContain('settings');
    });

    it('should get section by id', () => {
      const section = service.getSection('daily');

      expect(section).toBeDefined();
      expect(section?.id).toBe('daily');
      expect(section?.title).toBe('Ежедневное');
    });

    it('should return undefined for unknown section', () => {
      const section = service.getSection('unknown');

      expect(section).toBeUndefined();
    });

    it('should have commands in each section', () => {
      const sections = service.getSections();

      for (const section of sections) {
        expect(section.commands.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // Command Management
  // ==========================================================================
  describe('Command Management', () => {
    it('should get command by id', () => {
      const command = service.getCommand('diary');

      expect(command).toBeDefined();
      expect(command?.id).toBe('diary');
      expect(command?.name).toBe('diary');
    });

    it('should get command from any section', () => {
      const relaxCmd = service.getCommand('relax');
      const progressCmd = service.getCommand('progress');
      const sosCmd = service.getCommand('sos');

      expect(relaxCmd).toBeDefined();
      expect(progressCmd).toBeDefined();
      expect(sosCmd).toBeDefined();
    });

    it('should return undefined for unknown command', () => {
      const command = service.getCommand('unknown_command');

      expect(command).toBeUndefined();
    });

    it('should have valid callback data for each command', () => {
      const sections = service.getSections();

      for (const section of sections) {
        for (const cmd of section.commands) {
          expect(cmd.callbackData).toBeDefined();
          expect(cmd.callbackData.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ==========================================================================
  // Hub Message Generation
  // ==========================================================================
  describe('Hub Message Generation', () => {
    it('should generate hub message', () => {
      const message = service.generateHubMessage();

      expect(message).toContain('Главное меню');
      expect(message).toContain('друг');
    });

    it('should generate hub message with user name', () => {
      const message = service.generateHubMessage('Анна');

      expect(message).toContain('Анна');
    });

    it('should include all section titles', () => {
      const message = service.generateHubMessage();

      expect(message).toContain('Ежедневное');
      expect(message).toContain('Терапия');
      expect(message).toContain('Аналитика');
      expect(message).toContain('Настройки');
    });

    it('should include command descriptions', () => {
      const message = service.generateHubMessage();

      expect(message).toContain('/diary');
      expect(message).toContain('/mood');
      expect(message).toContain('/relax');
    });
  });

  // ==========================================================================
  // Compact Hub Message
  // ==========================================================================
  describe('Compact Hub Message', () => {
    it('should generate compact message', () => {
      const message = service.generateCompactHubMessage();

      expect(message).toContain('Главное меню');
    });

    it('should include user name in compact message', () => {
      const message = service.generateCompactHubMessage('Иван');

      expect(message).toContain('Иван');
    });

    it('should be shorter than full message', () => {
      const compact = service.generateCompactHubMessage();
      const full = service.generateHubMessage();

      expect(compact.length).toBeLessThan(full.length);
    });
  });

  // ==========================================================================
  // Keyboard Building
  // ==========================================================================
  describe('Keyboard Building', () => {
    it('should build hub keyboard', () => {
      const keyboard = service.buildHubKeyboard();

      expect(keyboard).toBeDefined();
    });

    it('should build section keyboard', () => {
      const keyboard = service.buildSectionKeyboard();

      expect(keyboard).toBeDefined();
    });

    it('should build expanded section keyboard', () => {
      const keyboard = service.buildSectionExpandedKeyboard('therapy');

      expect(keyboard).toBeDefined();
    });

    it('should return empty keyboard for unknown section', () => {
      const keyboard = service.buildSectionExpandedKeyboard('unknown');

      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // Section Message
  // ==========================================================================
  describe('Section Message', () => {
    it('should generate section message', () => {
      const message = service.generateSectionMessage('therapy');

      expect(message).toContain('Терапия');
      expect(message).toContain('Релакс');
      expect(message).toContain('Осознанность');
    });

    it('should include command descriptions in section', () => {
      const message = service.generateSectionMessage('daily');

      expect(message).toContain('Дневник');
      expect(message).toContain('Настроение');
    });

    it('should return not found for unknown section', () => {
      const message = service.generateSectionMessage('unknown');

      expect(message).toContain('не найден');
    });
  });

  // ==========================================================================
  // Help Message
  // ==========================================================================
  describe('Help Message', () => {
    it('should generate help message', () => {
      const message = service.generateHelpMessage();

      expect(message).toContain('Справка');
    });

    it('should include quick access commands', () => {
      const message = service.generateHelpMessage();

      expect(message).toContain('/start');
      expect(message).toContain('/menu');
      expect(message).toContain('/diary');
      expect(message).toContain('/sos');
    });

    it('should include all section commands', () => {
      const message = service.generateHelpMessage();

      expect(message).toContain('/relax');
      expect(message).toContain('/mindful');
      expect(message).toContain('/progress');
    });
  });

  // ==========================================================================
  // BotFather Commands
  // ==========================================================================
  describe('BotFather Commands', () => {
    it('should return hub model commands', () => {
      const commands = service.getHubModelCommands();

      expect(commands.length).toBe(6);
    });

    it('should include essential commands', () => {
      const commands = service.getHubModelCommands();
      const commandNames = commands.map(c => c.command);

      expect(commandNames).toContain('start');
      expect(commandNames).toContain('menu');
      expect(commandNames).toContain('diary');
      expect(commandNames).toContain('sos');
      expect(commandNames).toContain('help');
    });

    it('should have descriptions for all commands', () => {
      const commands = service.getHubModelCommands();

      for (const cmd of commands) {
        expect(cmd.description).toBeDefined();
        expect(cmd.description.length).toBeGreaterThan(0);
      }
    });

    it('should have emojis in descriptions', () => {
      const commands = service.getHubModelCommands();

      for (const cmd of commands) {
        // Most descriptions should have emojis
        const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(cmd.description);
        expect(hasEmoji || cmd.description.includes('🚀') || cmd.description.includes('📱') || cmd.description.includes('📓') || cmd.description.includes('💭') || cmd.description.includes('🆘') || cmd.description.includes('❓')).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Daily Section
  // ==========================================================================
  describe('Daily Section', () => {
    it('should have diary command', () => {
      const section = service.getSection('daily');
      const hasDiary = section?.commands.some(c => c.id === 'diary');

      expect(hasDiary).toBe(true);
    });

    it('should have mood command', () => {
      const section = service.getSection('daily');
      const hasMood = section?.commands.some(c => c.id === 'mood');

      expect(hasMood).toBe(true);
    });

    it('should have today command', () => {
      const section = service.getSection('daily');
      const hasToday = section?.commands.some(c => c.id === 'today');

      expect(hasToday).toBe(true);
    });
  });

  // ==========================================================================
  // Therapy Section
  // ==========================================================================
  describe('Therapy Section', () => {
    it('should have relaxation command', () => {
      const section = service.getSection('therapy');
      const hasRelax = section?.commands.some(c => c.id === 'relax');

      expect(hasRelax).toBe(true);
    });

    it('should have mindfulness command', () => {
      const section = service.getSection('therapy');
      const hasMindful = section?.commands.some(c => c.id === 'mindful');

      expect(hasMindful).toBe(true);
    });
  });

  // ==========================================================================
  // Settings Section
  // ==========================================================================
  describe('Settings Section', () => {
    it('should have SOS command', () => {
      const section = service.getSection('settings');
      const hasSOS = section?.commands.some(c => c.id === 'sos');

      expect(hasSOS).toBe(true);
    });

    it('should have help command', () => {
      const section = service.getSection('settings');
      const hasHelp = section?.commands.some(c => c.id === 'help');

      expect(hasHelp).toBe(true);
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(hubMenu).toBeInstanceOf(HubMenuService);
    });

    it('should get sections via singleton', () => {
      const sections = hubMenu.getSections();

      expect(sections.length).toBe(4);
    });

    it('should generate help via singleton', () => {
      const help = hubMenu.generateHelpMessage();

      expect(help).toContain('Справка');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle all section ids', () => {
      const sectionIds = ['daily', 'therapy', 'analytics', 'settings'];

      for (const id of sectionIds) {
        const section = service.getSection(id);
        expect(section).toBeDefined();
      }
    });

    it('should handle empty user name gracefully', () => {
      const message = service.generateHubMessage('');

      expect(message).toBeDefined();
    });

    it('should have consistent emoji usage', () => {
      const sections = service.getSections();

      for (const section of sections) {
        expect(section.emoji).toBeDefined();
        for (const cmd of section.commands) {
          expect(cmd.emoji).toBeDefined();
        }
      }
    });

    it('should have unique command ids', () => {
      const sections = service.getSections();
      const allIds: string[] = [];

      for (const section of sections) {
        for (const cmd of section.commands) {
          expect(allIds).not.toContain(cmd.id);
          allIds.push(cmd.id);
        }
      }
    });
  });
});
