/**
 * RuleEngine Unit Tests
 * =====================
 */

import { RuleEngine, RulePriority, DEFAULT_RULES } from '../../../src/modules/adaptive-keyboard/RuleEngine';
import type { IUserBehaviorContext } from '../../../src/modules/adaptive-keyboard/UserInteractionRepository';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  const createMockContext = (overrides: Partial<IUserBehaviorContext> = {}): IUserBehaviorContext => ({
    userId: 'test-user-123',
    lastCommands: [],
    ignoredCommands: new Map(),
    frequentCommands: [],
    timeOfDay: 'day',
    dayOfWeek: 1, // Monday
    totalInteractions: 10,
    averageSessionCommands: 3,
    daysActive: 5,
    ...overrides,
  });

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  describe('Rule Management', () => {
    it('should initialize with default rules', () => {
      const rules = ruleEngine.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.id === 'sos-always-visible')).toBe(true);
    });

    it('should add custom rules', () => {
      const customRule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'Test rule',
        condition: () => true,
        action: 'promote' as const,
        target: 'test',
        priority: RulePriority.HIGH,
        enabled: true,
      };

      ruleEngine.addRule(customRule);
      const rules = ruleEngine.getRules();
      expect(rules.some((r) => r.id === 'custom-test-rule')).toBe(true);
    });

    it('should remove rules by ID', () => {
      const initialCount = ruleEngine.getRules().length;
      const removed = ruleEngine.removeRule('morning-diary');
      expect(removed).toBe(true);
      expect(ruleEngine.getRules().length).toBe(initialCount - 1);
    });

    it('should enable/disable rules', () => {
      ruleEngine.setRuleEnabled('morning-diary', false);
      const rule = ruleEngine.getRules().find((r) => r.id === 'morning-diary');
      expect(rule?.enabled).toBe(false);
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate SOS rule as always matching', () => {
      const context = createMockContext();
      const results = ruleEngine.evaluateRules(context);
      const sosResult = results.find((r) => r.ruleId === 'sos-always-visible');
      expect(sosResult?.matched).toBe(true);
      expect(sosResult?.action).toBe('show');
    });

    it('should match morning rules in morning', () => {
      const context = createMockContext({ timeOfDay: 'morning' });
      const commands = ['diary', 'recall', 'relax', 'sos'];
      const adapted = ruleEngine.applyRules(commands, context);

      const diaryAdapted = adapted.find((c) => c.command === 'diary');
      const recallAdapted = adapted.find((c) => c.command === 'recall');

      // Diary and recall should be promoted in morning
      expect(diaryAdapted?.promoted).toBe(true);
      expect(recallAdapted?.promoted).toBe(true);
    });

    it('should match evening rules in evening', () => {
      const context = createMockContext({ timeOfDay: 'evening' });
      const results = ruleEngine.evaluateRules(context);

      const relaxRule = results.find((r) => r.ruleId === 'evening-relax');
      const rehearsalRule = results.find((r) => r.ruleId === 'evening-rehearsal');

      expect(relaxRule?.matched).toBe(true);
      expect(rehearsalRule?.matched).toBe(true);
    });

    it('should match night rules at night', () => {
      const context = createMockContext({ timeOfDay: 'night' });
      const results = ruleEngine.evaluateRules(context);

      const sosHighlight = results.find((r) => r.ruleId === 'night-sos-highlight');
      expect(sosHighlight?.matched).toBe(true);
      expect(sosHighlight?.action).toBe('highlight');
    });
  });

  describe('Command Adaptation', () => {
    it('should apply rules to commands', () => {
      const context = createMockContext({ timeOfDay: 'evening' });
      const commands = ['diary', 'relax', 'sos', 'help'];

      const adapted = ruleEngine.applyRules(commands, context);

      expect(adapted.length).toBe(4);

      // Relax should be promoted in evening
      const relaxAdapted = adapted.find((c) => c.command === 'relax');
      expect(relaxAdapted?.promoted).toBe(true);

      const sosAdapted = adapted.find((c) => c.command === 'sos');
      expect(sosAdapted?.visible).toBe(true);
    });

    it('should sort commands by adaptation', () => {
      const context = createMockContext({ timeOfDay: 'evening' });
      const commands = ['help', 'diary', 'relax', 'sos'];

      const adapted = ruleEngine.applyRules(commands, context);
      const sorted = ruleEngine.getSortedCommands(adapted);

      // Relax should be promoted in evening
      const relaxAdapted = adapted.find((c) => c.command === 'relax');
      expect(relaxAdapted?.promoted).toBe(true);

      // Promoted commands should appear in sorted list
      expect(sorted).toContain('relax');
      expect(sorted).toContain('sos');
    });

    it('should handle ignored commands', () => {
      const ignoredCommands = new Map([
        ['mindful', 6], // Ignored 6 times, should be hidden
      ]);

      const context = createMockContext({ ignoredCommands });
      const commands = ['diary', 'mindful', 'relax'];

      const adapted = ruleEngine.applyRules(commands, context);
      const mindfulAdapted = adapted.find((c) => c.command === 'mindful');

      expect(mindfulAdapted?.visible).toBe(false);
    });

    it('should handle frequent commands', () => {
      const context = createMockContext({
        frequentCommands: ['relax', 'diary'],
      });
      const commands = ['help', 'relax', 'diary'];

      const adapted = ruleEngine.applyRules(commands, context);

      const relaxAdapted = adapted.find((c) => c.command === 'relax');
      expect(relaxAdapted?.promoted).toBe(true);
    });
  });

  describe('Command Explanation', () => {
    it('should provide explanation for adapted commands', () => {
      const context = createMockContext({ timeOfDay: 'evening' });
      const commands = ['relax', 'help'];

      const adapted = ruleEngine.applyRules(commands, context);
      const explanation = ruleEngine.getCommandExplanation('relax', adapted);

      expect(explanation).toContain('Evening Relaxation Promotion');
    });

    it('should return default message for non-adapted commands', () => {
      const context = createMockContext();
      const commands = ['help'];

      const adapted = ruleEngine.applyRules(commands, context);
      const explanation = ruleEngine.getCommandExplanation('unknown', adapted);

      expect(explanation).toBe('Command not found');
    });
  });

  describe('Priority Ordering', () => {
    it('should sort rules by priority', () => {
      const rules = ruleEngine.getRules();

      for (let i = 1; i < rules.length; i++) {
        expect(rules[i - 1].priority).toBeGreaterThanOrEqual(rules[i].priority);
      }
    });

    it('should apply critical rules first', () => {
      const context = createMockContext();
      const results = ruleEngine.evaluateRules(context);

      // First evaluated rule should be SOS (critical priority)
      expect(results[0].ruleId).toBe('sos-always-visible');
    });
  });
});
