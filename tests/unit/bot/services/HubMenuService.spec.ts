/**
 * HubMenuService Unit Tests
 * ==========================
 * Tests for hub-and-spoke navigation pattern.
 *
 * @module @sleepcore/bot/services
 */

import {
  HubMenuService,
  hubMenu,
  type IMenuSection,
  type IMenuCommand,
} from '../../../../src/bot/services/HubMenuService';

describe('HubMenuService', () => {
  let service: HubMenuService;

  beforeEach(() => {
    service = new HubMenuService();
  });

  describe('getSections', () => {
    it('should return all sections', () => {
      const sections = service.getSections();
      expect(sections.length).toBe(4);
    });

    it('should include daily section', () => {
      const sections = service.getSections();
      const daily = sections.find(s => s.id === 'daily');
      expect(daily).toBeDefined();
      expect(daily?.title).toBe('Ежедневное');
    });

    it('should include therapy section', () => {
      const sections = service.getSections();
      const therapy = sections.find(s => s.id === 'therapy');
      expect(therapy).toBeDefined();
      expect(therapy?.title).toBe('Терапия');
    });

    it('should include analytics section', () => {
      const sections = service.getSections();
      const analytics = sections.find(s => s.id === 'analytics');
      expect(analytics).toBeDefined();
    });

    it('should include settings section', () => {
      const sections = service.getSections();
      const settings = sections.find(s => s.id === 'settings');
      expect(settings).toBeDefined();
    });
  });

  describe('getSection', () => {
    it('should return section by id', () => {
      const section = service.getSection('daily');
      expect(section).toBeDefined();
      expect(section?.id).toBe('daily');
    });

    it('should return undefined for unknown section', () => {
      const section = service.getSection('unknown');
      expect(section).toBeUndefined();
    });

    it('should return therapy section', () => {
      const section = service.getSection('therapy');
      expect(section).toBeDefined();
      expect(section?.commands.length).toBeGreaterThan(0);
    });

    it('should return analytics section', () => {
      const section = service.getSection('analytics');
      expect(section).toBeDefined();
    });

    it('should return settings section', () => {
      const section = service.getSection('settings');
      expect(section).toBeDefined();
    });
  });

  describe('getCommand', () => {
    it('should return command by id from daily section', () => {
      const command = service.getCommand('diary');
      expect(command).toBeDefined();
      expect(command?.name).toBe('diary');
    });

    it('should return command by id from therapy section', () => {
      const command = service.getCommand('relax');
      expect(command).toBeDefined();
      expect(command?.name).toBe('relax');
    });

    it('should return command by id from analytics section', () => {
      const command = service.getCommand('progress');
      expect(command).toBeDefined();
    });

    it('should return command by id from settings section', () => {
      const command = service.getCommand('help');
      expect(command).toBeDefined();
    });

    it('should return undefined for unknown command', () => {
      const command = service.getCommand('unknown-command');
      expect(command).toBeUndefined();
    });

    it('should return sos command', () => {
      const command = service.getCommand('sos');
      expect(command).toBeDefined();
      expect(command?.emoji).toBe('🆘');
    });
  });

  describe('generateHubMessage', () => {
    it('should generate message with username', () => {
      const message = service.generateHubMessage('Анна');
      expect(message).toContain('Анна');
      expect(message).toContain('Главное меню');
    });

    it('should generate message without username', () => {
      const message = service.generateHubMessage();
      expect(message).toContain('друг');
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
      expect(message).toContain('Записать сон');
      expect(message).toContain('Техники расслабления');
    });

    it('should include tip at the end', () => {
      const message = service.generateHubMessage();
      expect(message).toContain('Совет');
    });
  });

  describe('generateCompactHubMessage', () => {
    it('should generate compact message with username', () => {
      const message = service.generateCompactHubMessage('Мария');
      expect(message).toContain('Мария');
      expect(message).toContain('Главное меню');
    });

    it('should generate compact message without username', () => {
      const message = service.generateCompactHubMessage();
      expect(message).toContain('друг');
    });

    it('should be shorter than full hub message', () => {
      const compact = service.generateCompactHubMessage();
      const full = service.generateHubMessage();
      expect(compact.length).toBeLessThan(full.length);
    });
  });

  describe('buildHubKeyboard', () => {
    it('should build keyboard with inline buttons', () => {
      const keyboard = service.buildHubKeyboard();
      expect(keyboard).toBeDefined();
    });
  });

  describe('buildSectionKeyboard', () => {
    it('should build section keyboard', () => {
      const keyboard = service.buildSectionKeyboard();
      expect(keyboard).toBeDefined();
    });
  });

  describe('buildSectionExpandedKeyboard', () => {
    it('should build expanded keyboard for daily section', () => {
      const keyboard = service.buildSectionExpandedKeyboard('daily');
      expect(keyboard).toBeDefined();
    });

    it('should build expanded keyboard for therapy section', () => {
      const keyboard = service.buildSectionExpandedKeyboard('therapy');
      expect(keyboard).toBeDefined();
    });

    it('should return empty keyboard for unknown section', () => {
      const keyboard = service.buildSectionExpandedKeyboard('nonexistent');
      expect(keyboard).toBeDefined();
    });

    it('should build expanded keyboard for analytics section', () => {
      const keyboard = service.buildSectionExpandedKeyboard('analytics');
      expect(keyboard).toBeDefined();
    });

    it('should build expanded keyboard for settings section', () => {
      const keyboard = service.buildSectionExpandedKeyboard('settings');
      expect(keyboard).toBeDefined();
    });
  });

  describe('generateSectionMessage', () => {
    it('should generate daily section message', () => {
      const message = service.generateSectionMessage('daily');
      expect(message).toContain('Ежедневное');
      expect(message).toContain('Дневник');
    });

    it('should generate therapy section message', () => {
      const message = service.generateSectionMessage('therapy');
      expect(message).toContain('Терапия');
      expect(message).toContain('Релакс');
    });

    it('should return error for unknown section', () => {
      const message = service.generateSectionMessage('nonexistent');
      expect(message).toContain('не найден');
    });

    it('should include command descriptions', () => {
      const message = service.generateSectionMessage('daily');
      expect(message).toContain('Записать сон');
    });
  });

  describe('generateHelpMessage', () => {
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

    it('should include all sections', () => {
      const message = service.generateHelpMessage();
      expect(message).toContain('Ежедневное');
      expect(message).toContain('Терапия');
      expect(message).toContain('Аналитика');
      expect(message).toContain('Настройки');
    });

    it('should mention menu access', () => {
      const message = service.generateHelpMessage();
      expect(message).toContain('/menu');
    });
  });

  describe('getHubModelCommands', () => {
    it('should return 6 commands for BotFather', () => {
      const commands = service.getHubModelCommands();
      expect(commands.length).toBe(6);
    });

    it('should include start command', () => {
      const commands = service.getHubModelCommands();
      const start = commands.find(c => c.command === 'start');
      expect(start).toBeDefined();
    });

    it('should include menu command', () => {
      const commands = service.getHubModelCommands();
      const menu = commands.find(c => c.command === 'menu');
      expect(menu).toBeDefined();
    });

    it('should include diary command', () => {
      const commands = service.getHubModelCommands();
      const diary = commands.find(c => c.command === 'diary');
      expect(diary).toBeDefined();
    });

    it('should include sos command', () => {
      const commands = service.getHubModelCommands();
      const sos = commands.find(c => c.command === 'sos');
      expect(sos).toBeDefined();
    });

    it('should include help command', () => {
      const commands = service.getHubModelCommands();
      const help = commands.find(c => c.command === 'help');
      expect(help).toBeDefined();
    });

    it('should have descriptions for all commands', () => {
      const commands = service.getHubModelCommands();
      commands.forEach(cmd => {
        expect(cmd.description).toBeDefined();
        expect(cmd.description.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('hubMenu singleton', () => {
  it('should export singleton instance', () => {
    expect(hubMenu).toBeInstanceOf(HubMenuService);
  });

  it('should be able to get sections', () => {
    const sections = hubMenu.getSections();
    expect(sections.length).toBeGreaterThan(0);
  });

  it('should be able to generate hub message', () => {
    const message = hubMenu.generateHubMessage();
    expect(message.length).toBeGreaterThan(0);
  });
});
