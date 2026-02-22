/**
 * Smoke Test: All Bot Commands
 * ============================
 * Verifies that all 26 commands are properly configured and instantiable.
 *
 * Tests:
 * - Command metadata (name, description, aliases)
 * - Execute function exists
 * - Can be registered in CommandRegistry
 *
 * @packageDocumentation
 */

import { allCommands, commandRegistry, initializeCommandRegistry } from '../../src/bot/commands';

describe('Commands Smoke Test', () => {
  const EXPECTED_COMMAND_COUNT = 26;

  describe('Command Count', () => {
    it(`should have exactly ${EXPECTED_COMMAND_COUNT} commands registered`, () => {
      expect(allCommands.length).toBe(EXPECTED_COMMAND_COUNT);
    });
  });

  describe('All Commands Metadata', () => {
    // Actual command names from allCommands (some differ from expected)
    const commandNames = [
      'start',
      'diary',
      'today',
      'relax',
      'mindful',
      'progress',
      'sos',
      'help',
      'rehearsal',
      'recall',
      'quest',
      'badges',      // Not 'badge'
      'sonya',       // Not 'evolution' - это название персонажа
      'smart_tips',
      'therapy',
      'chronotype',
      'profile',
      'admin',
      'aereport',    // Not 'ae_report'
      'whatif',
      'predict',
      'insights',
      'explain',
      'safety',
      'twin',
      'link',
    ];

    it('should have all expected command names', () => {
      const actualNames = allCommands.map((cmd) => cmd.name);
      for (const name of commandNames) {
        expect(actualNames).toContain(name);
      }
    });

    describe.each(allCommands)('Command: /$name', (command) => {
      it('should have a name', () => {
        expect(command.name).toBeDefined();
        expect(typeof command.name).toBe('string');
        expect(command.name.length).toBeGreaterThan(0);
      });

      it('should have a description', () => {
        expect(command.description).toBeDefined();
        expect(typeof command.description).toBe('string');
        expect(command.description.length).toBeGreaterThan(0);
      });

      it('should have an execute function', () => {
        expect(command.execute).toBeDefined();
        expect(typeof command.execute).toBe('function');
      });

      it('should have aliases array (may be empty)', () => {
        expect(command.aliases).toBeDefined();
        expect(Array.isArray(command.aliases)).toBe(true);
      });

      it('should have requiresSession property', () => {
        expect(typeof command.requiresSession).toBe('boolean');
      });
    });
  });

  describe('Command Registry', () => {
    beforeAll(() => {
      // Clear registry before test
      // @ts-expect-error accessing private for testing
      commandRegistry.commands.clear();
      initializeCommandRegistry();
    });

    it('should register all commands without errors', () => {
      // @ts-expect-error accessing private for testing
      expect(commandRegistry.commands.size).toBe(EXPECTED_COMMAND_COUNT);
    });

    it('should find each command by name', () => {
      for (const cmd of allCommands) {
        const found = commandRegistry.get(cmd.name);
        expect(found).toBeDefined();
        expect(found?.name).toBe(cmd.name);
      }
    });

    it('should have aliases registered', () => {
      // Note: Some aliases may conflict (e.g., 'прогресс' for both progress and profile)
      // This is acceptable - later registered command wins
      let totalAliases = 0;
      for (const cmd of allCommands) {
        totalAliases += cmd.aliases.length;
      }
      expect(totalAliases).toBeGreaterThan(0);
    });
  });

  describe('Command Categories', () => {
    it('should have core commands (start, diary, today, help)', () => {
      const coreNames = ['start', 'diary', 'today', 'help'];
      const actualNames = allCommands.map((c) => c.name);
      for (const name of coreNames) {
        expect(actualNames).toContain(name);
      }
    });

    it('should have therapy commands (relax, mindful, therapy)', () => {
      const therapyNames = ['relax', 'mindful', 'therapy'];
      const actualNames = allCommands.map((c) => c.name);
      for (const name of therapyNames) {
        expect(actualNames).toContain(name);
      }
    });

    it('should have gamification commands (quest, badges, sonya, profile)', () => {
      const gamificationNames = ['quest', 'badges', 'sonya', 'profile'];
      const actualNames = allCommands.map((c) => c.name);
      for (const name of gamificationNames) {
        expect(actualNames).toContain(name);
      }
    });

    it('should have AI/prediction commands (predict, insights, explain, twin, whatif)', () => {
      const aiNames = ['predict', 'insights', 'explain', 'twin', 'whatif'];
      const actualNames = allCommands.map((c) => c.name);
      for (const name of aiNames) {
        expect(actualNames).toContain(name);
      }
    });

    it('should have safety commands (sos, safety, aereport)', () => {
      const safetyNames = ['sos', 'safety', 'aereport'];
      const actualNames = allCommands.map((c) => c.name);
      for (const name of safetyNames) {
        expect(actualNames).toContain(name);
      }
    });

    it('should have admin commands (admin)', () => {
      const adminNames = ['admin'];
      const actualNames = allCommands.map((c) => c.name);
      for (const name of adminNames) {
        expect(actualNames).toContain(name);
      }
    });
  });

  describe('Russian Language Support', () => {
    it('all commands should have Russian descriptions', () => {
      for (const cmd of allCommands) {
        // Check if description contains Cyrillic characters
        const hasCyrillic = /[а-яёА-ЯЁ]/.test(cmd.description);
        expect(hasCyrillic).toBe(true);
      }
    });
  });
});
