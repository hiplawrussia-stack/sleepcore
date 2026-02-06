/**
 * RuleEngine Tests
 * ==================
 *
 * IEC 62304 compliance tests for forward chaining rule engine.
 * Research: Decision Tables, Context-Aware Personalization
 *
 * Tests verify:
 * - Default rules (safety, time-based, behavior-based)
 * - Rule evaluation against context
 * - Rule application to commands
 * - Wildcard rule handling
 * - Command sorting and highlighting
 * - Rule management (add, remove, enable/disable)
 *
 * @packageDocumentation
 */

import {
  RuleEngine,
  DEFAULT_RULES,
  RulePriority,
  type IAdaptationRule,
  type IAdaptedCommand,
} from '../RuleEngine';
import type { IUserBehaviorContext } from '../UserInteractionRepository';
import type { TimeOfDay } from '../../../bot/commands/registry';

describe('RuleEngine', () => {
  let engine: RuleEngine;

  const createContext = (overrides: Partial<IUserBehaviorContext> = {}): IUserBehaviorContext => ({
    userId: 'user1',
    lastCommands: [],
    ignoredCommands: new Map(),
    frequentCommands: [],
    timeOfDay: 'day' as TimeOfDay,
    dayOfWeek: 1,
    totalInteractions: 10,
    averageSessionCommands: 3,
    daysActive: 5,
    ...overrides,
  });

  beforeEach(() => {
    engine = new RuleEngine();
  });

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================
  describe('Constructor', () => {
    it('should initialize with default rules', () => {
      const rules = engine.getRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.id === 'sos-always-visible')).toBe(true);
    });

    it('should accept custom rules', () => {
      const customRule: IAdaptationRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        description: 'Test rule',
        condition: () => true,
        action: 'promote',
        target: 'custom',
        priority: RulePriority.HIGH,
        enabled: true,
      };

      const customEngine = new RuleEngine([customRule]);
      const rules = customEngine.getRules();

      expect(rules.some(r => r.id === 'custom-rule')).toBe(true);
    });

    it('should sort rules by priority', () => {
      const rules = engine.getRules();

      for (let i = 1; i < rules.length; i++) {
        expect(rules[i - 1].priority).toBeGreaterThanOrEqual(rules[i].priority);
      }
    });
  });

  // ==========================================================================
  // DEFAULT RULES
  // ==========================================================================
  describe('DEFAULT_RULES', () => {
    it('should have SOS always visible rule (CRITICAL priority)', () => {
      const sosRule = DEFAULT_RULES.find(r => r.id === 'sos-always-visible');

      expect(sosRule).toBeDefined();
      expect(sosRule?.priority).toBe(RulePriority.CRITICAL);
      expect(sosRule?.action).toBe('show');
      expect(sosRule?.target).toBe('sos');
      expect(sosRule?.condition(createContext())).toBe(true);
    });

    it('should have morning diary promotion rule', () => {
      const morningDiary = DEFAULT_RULES.find(r => r.id === 'morning-diary');

      expect(morningDiary).toBeDefined();
      expect(morningDiary?.priority).toBe(RulePriority.HIGH);
      expect(morningDiary?.action).toBe('promote');
      expect(morningDiary?.condition(createContext({ timeOfDay: 'morning' }))).toBe(true);
      expect(morningDiary?.condition(createContext({ timeOfDay: 'evening' }))).toBe(false);
    });

    it('should have evening relaxation promotion rule', () => {
      const eveningRelax = DEFAULT_RULES.find(r => r.id === 'evening-relax');

      expect(eveningRelax).toBeDefined();
      expect(eveningRelax?.condition(createContext({ timeOfDay: 'evening' }))).toBe(true);
      expect(eveningRelax?.condition(createContext({ timeOfDay: 'morning' }))).toBe(false);
    });

    it('should have night SOS highlight rule', () => {
      const nightSos = DEFAULT_RULES.find(r => r.id === 'night-sos-highlight');

      expect(nightSos).toBeDefined();
      expect(nightSos?.action).toBe('highlight');
      expect(nightSos?.condition(createContext({ timeOfDay: 'night' }))).toBe(true);
    });

    it('should have hide ignored commands rule', () => {
      const hideIgnored = DEFAULT_RULES.find(r => r.id === 'hide-ignored-commands');

      expect(hideIgnored).toBeDefined();
      expect(hideIgnored?.target).toBe('*');
      expect(hideIgnored?.action).toBe('hide');

      const contextWithIgnored = createContext({
        ignoredCommands: new Map([['diary', 5]]),
      });
      expect(hideIgnored?.condition(contextWithIgnored)).toBe(true);
    });

    it('should have promote frequent commands rule', () => {
      const promoteFrequent = DEFAULT_RULES.find(r => r.id === 'promote-frequent-commands');

      expect(promoteFrequent).toBeDefined();
      expect(promoteFrequent?.target).toBe('*');

      const contextWithFrequent = createContext({
        frequentCommands: ['diary', 'progress'],
      });
      expect(promoteFrequent?.condition(contextWithFrequent)).toBe(true);
    });

    it('should have new user onboarding rule', () => {
      const onboarding = DEFAULT_RULES.find(r => r.id === 'new-user-onboarding');

      expect(onboarding).toBeDefined();
      expect(onboarding?.condition(createContext({ daysActive: 2 }))).toBe(true);
      expect(onboarding?.condition(createContext({ daysActive: 5 }))).toBe(false);
    });
  });

  // ==========================================================================
  // RULE MANAGEMENT
  // ==========================================================================
  describe('addRule', () => {
    it('should add new rule', () => {
      const newRule: IAdaptationRule = {
        id: 'new-rule',
        name: 'New Rule',
        description: 'Test',
        condition: () => true,
        action: 'highlight',
        target: 'diary',
        priority: RulePriority.MEDIUM,
        enabled: true,
      };

      engine.addRule(newRule);

      expect(engine.getRules().some(r => r.id === 'new-rule')).toBe(true);
    });

    it('should re-sort rules after adding', () => {
      engine.addRule({
        id: 'high-priority',
        name: 'High Priority',
        description: 'Test',
        condition: () => true,
        action: 'promote',
        target: 'test',
        priority: RulePriority.CRITICAL + 10,
        enabled: true,
      });

      const rules = engine.getRules();
      expect(rules[0].id).toBe('high-priority');
    });
  });

  describe('removeRule', () => {
    it('should remove existing rule', () => {
      const result = engine.removeRule('morning-diary');

      expect(result).toBe(true);
      expect(engine.getRules().some(r => r.id === 'morning-diary')).toBe(false);
    });

    it('should return false for non-existent rule', () => {
      const result = engine.removeRule('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('setRuleEnabled', () => {
    it('should enable/disable rule', () => {
      engine.setRuleEnabled('morning-diary', false);

      const rule = engine.getRules().find(r => r.id === 'morning-diary');
      expect(rule?.enabled).toBe(false);

      engine.setRuleEnabled('morning-diary', true);
      expect(engine.getRules().find(r => r.id === 'morning-diary')?.enabled).toBe(true);
    });

    it('should return false for non-existent rule', () => {
      const result = engine.setRuleEnabled('non-existent', false);

      expect(result).toBe(false);
    });

    it('should return true for existing rule', () => {
      const result = engine.setRuleEnabled('morning-diary', false);

      expect(result).toBe(true);
    });
  });

  describe('getRules', () => {
    it('should return copy of rules', () => {
      const rules1 = engine.getRules();
      const rules2 = engine.getRules();

      expect(rules1).not.toBe(rules2);
    });
  });

  // ==========================================================================
  // RULE EVALUATION
  // ==========================================================================
  describe('evaluateRules', () => {
    it('should evaluate all enabled rules', () => {
      const context = createContext({ timeOfDay: 'morning' });

      const results = engine.evaluateRules(context);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.ruleId === 'sos-always-visible' && r.matched)).toBe(true);
      expect(results.some(r => r.ruleId === 'morning-diary' && r.matched)).toBe(true);
    });

    it('should skip disabled rules', () => {
      engine.setRuleEnabled('morning-diary', false);
      const context = createContext({ timeOfDay: 'morning' });

      const results = engine.evaluateRules(context);

      expect(results.some(r => r.ruleId === 'morning-diary')).toBe(false);
    });

    it('should handle rule evaluation errors gracefully', () => {
      engine.addRule({
        id: 'error-rule',
        name: 'Error Rule',
        description: 'Throws error',
        condition: () => { throw new Error('Test error'); },
        action: 'show',
        target: 'test',
        priority: RulePriority.LOW,
        enabled: true,
      });

      // Should not throw
      const results = engine.evaluateRules(createContext());

      // Error rule should not be in results (skipped)
      expect(results.some(r => r.ruleId === 'error-rule' && r.matched)).toBe(false);
    });

    it('should include action and target in results', () => {
      const results = engine.evaluateRules(createContext());

      const sosResult = results.find(r => r.ruleId === 'sos-always-visible');
      expect(sosResult?.action).toBe('show');
      expect(sosResult?.target).toBe('sos');
    });
  });

  // ==========================================================================
  // APPLY RULES
  // ==========================================================================
  describe('applyRules', () => {
    it('should return adapted commands', () => {
      const commands = ['diary', 'progress', 'sos', 'relax'];
      const context = createContext();

      const adapted = engine.applyRules(commands, context);

      expect(adapted).toHaveLength(4);
      expect(adapted.every(c => 'visible' in c && 'promoted' in c)).toBe(true);
    });

    it('should apply show action', () => {
      const commands = ['sos'];
      const context = createContext();

      const adapted = engine.applyRules(commands, context);

      expect(adapted[0].visible).toBe(true);
      expect(adapted[0].appliedRules).toContain('sos-always-visible');
    });

    it('should apply promote action for morning diary', () => {
      const commands = ['diary', 'progress'];
      const context = createContext({ timeOfDay: 'morning' });

      const adapted = engine.applyRules(commands, context);

      const diary = adapted.find(c => c.command === 'diary');
      expect(diary?.promoted).toBe(true);
    });

    it('should apply highlight action for night SOS', () => {
      const commands = ['sos', 'diary'];
      const context = createContext({ timeOfDay: 'night' });

      const adapted = engine.applyRules(commands, context);

      const sos = adapted.find(c => c.command === 'sos');
      expect(sos?.highlighted).toBe(true);
    });

    it('should apply hide action for ignored commands', () => {
      const commands = ['diary', 'ignored'];
      const context = createContext({
        ignoredCommands: new Map([['ignored', 6]]), // >= 5 triggers hide
      });

      const adapted = engine.applyRules(commands, context);

      const ignored = adapted.find(c => c.command === 'ignored');
      expect(ignored?.visible).toBe(false);
    });

    it('should apply promote for frequent commands', () => {
      const commands = ['diary', 'frequent'];
      const context = createContext({
        frequentCommands: ['frequent'],
      });

      const adapted = engine.applyRules(commands, context);

      const frequent = adapted.find(c => c.command === 'frequent');
      expect(frequent?.promoted).toBe(true);
    });

    it('should track applied rules', () => {
      const commands = ['diary'];
      const context = createContext({ timeOfDay: 'morning' });

      const adapted = engine.applyRules(commands, context);

      expect(adapted[0].appliedRules.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SORTING AND FILTERING
  // ==========================================================================
  describe('getSortedCommands', () => {
    it('should filter out hidden commands', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'visible', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'hidden', visible: false, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ];

      const sorted = engine.getSortedCommands(adapted);

      expect(sorted).toContain('visible');
      expect(sorted).not.toContain('hidden');
    });

    it('should put promoted commands first', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'normal', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'promoted', visible: true, promoted: true, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'also-normal', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ];

      const sorted = engine.getSortedCommands(adapted);

      expect(sorted[0]).toBe('promoted');
    });

    it('should put demoted commands last', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'demoted', visible: true, promoted: false, demoted: true, highlighted: false, appliedRules: [] },
        { command: 'normal', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ];

      const sorted = engine.getSortedCommands(adapted);

      expect(sorted[sorted.length - 1]).toBe('demoted');
    });

    it('should handle mixed promoted/demoted', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'demoted', visible: true, promoted: false, demoted: true, highlighted: false, appliedRules: [] },
        { command: 'promoted', visible: true, promoted: true, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'normal', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ];

      const sorted = engine.getSortedCommands(adapted);

      expect(sorted[0]).toBe('promoted');
      expect(sorted[sorted.length - 1]).toBe('demoted');
    });
  });

  describe('getHighlightedCommands', () => {
    it('should return only highlighted visible commands', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'highlighted', visible: true, promoted: false, demoted: false, highlighted: true, appliedRules: [] },
        { command: 'normal', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
        { command: 'hidden-highlighted', visible: false, promoted: false, demoted: false, highlighted: true, appliedRules: [] },
      ];

      const highlighted = engine.getHighlightedCommands(adapted);

      expect(highlighted).toContain('highlighted');
      expect(highlighted).not.toContain('normal');
      expect(highlighted).not.toContain('hidden-highlighted');
    });
  });

  describe('getCommandExplanation', () => {
    it('should explain applied rules', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'diary', visible: true, promoted: true, demoted: false, highlighted: false, appliedRules: ['morning-diary'] },
      ];

      const explanation = engine.getCommandExplanation('diary', adapted);

      expect(explanation).toContain('Morning Diary Promotion');
    });

    it('should return message for no rules', () => {
      const adapted: IAdaptedCommand[] = [
        { command: 'diary', visible: true, promoted: false, demoted: false, highlighted: false, appliedRules: [] },
      ];

      const explanation = engine.getCommandExplanation('diary', adapted);

      expect(explanation).toContain('No rules applied');
    });

    it('should return message for unknown command', () => {
      const explanation = engine.getCommandExplanation('unknown', []);

      expect(explanation).toContain('Command not found');
    });
  });

  // ==========================================================================
  // PRIORITY LEVELS
  // ==========================================================================
  describe('RulePriority', () => {
    it('should have correct priority values', () => {
      expect(RulePriority.CRITICAL).toBe(100);
      expect(RulePriority.HIGH).toBe(80);
      expect(RulePriority.MEDIUM).toBe(50);
      expect(RulePriority.LOW).toBe(20);
    });

    it('should maintain priority order: CRITICAL > HIGH > MEDIUM > LOW', () => {
      expect(RulePriority.CRITICAL).toBeGreaterThan(RulePriority.HIGH);
      expect(RulePriority.HIGH).toBeGreaterThan(RulePriority.MEDIUM);
      expect(RulePriority.MEDIUM).toBeGreaterThan(RulePriority.LOW);
    });
  });

  // ==========================================================================
  // TIME-BASED RULES
  // ==========================================================================
  describe('Time-Based Rules', () => {
    it('should promote diary and recall in morning', () => {
      const commands = ['diary', 'recall', 'relax'];
      const context = createContext({ timeOfDay: 'morning' });

      const adapted = engine.applyRules(commands, context);

      expect(adapted.find(c => c.command === 'diary')?.promoted).toBe(true);
      expect(adapted.find(c => c.command === 'recall')?.promoted).toBe(true);
    });

    it('should promote relax and rehearsal in evening', () => {
      const commands = ['diary', 'relax', 'rehearsal'];
      const context = createContext({ timeOfDay: 'evening' });

      const adapted = engine.applyRules(commands, context);

      expect(adapted.find(c => c.command === 'relax')?.promoted).toBe(true);
      expect(adapted.find(c => c.command === 'rehearsal')?.promoted).toBe(true);
    });

    it('should highlight SOS and promote relax at night', () => {
      const commands = ['sos', 'relax', 'diary'];
      const context = createContext({ timeOfDay: 'night' });

      const adapted = engine.applyRules(commands, context);

      expect(adapted.find(c => c.command === 'sos')?.highlighted).toBe(true);
      expect(adapted.find(c => c.command === 'relax')?.promoted).toBe(true);
    });
  });

  // ==========================================================================
  // BEHAVIOR-BASED RULES
  // ==========================================================================
  describe('Behavior-Based Rules', () => {
    it('should hide commands ignored 5+ times', () => {
      const commands = ['diary', 'ignored1', 'ignored2'];
      const context = createContext({
        ignoredCommands: new Map([
          ['ignored1', 5],
          ['ignored2', 10],
        ]),
      });

      const adapted = engine.applyRules(commands, context);

      expect(adapted.find(c => c.command === 'ignored1')?.visible).toBe(false);
      expect(adapted.find(c => c.command === 'ignored2')?.visible).toBe(false);
      expect(adapted.find(c => c.command === 'diary')?.visible).toBe(true);
    });

    it('should not hide commands ignored less than 5 times', () => {
      const commands = ['lessIgnored'];
      const context = createContext({
        ignoredCommands: new Map([['lessIgnored', 3]]),
      });

      const adapted = engine.applyRules(commands, context);

      expect(adapted.find(c => c.command === 'lessIgnored')?.visible).toBe(true);
    });

    it('should promote progress for users with recent commands', () => {
      const commands = ['progress', 'diary'];
      const context = createContext({
        lastCommands: ['diary', 'relax'],
      });

      const adapted = engine.applyRules(commands, context);

      expect(adapted.find(c => c.command === 'progress')?.promoted).toBe(true);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty command list', () => {
      const adapted = engine.applyRules([], createContext());

      expect(adapted).toEqual([]);
    });

    it('should handle context with empty maps', () => {
      const context = createContext({
        ignoredCommands: new Map(),
        frequentCommands: [],
        lastCommands: [],
      });

      const adapted = engine.applyRules(['diary'], context);

      expect(adapted).toHaveLength(1);
      expect(adapted[0].visible).toBe(true);
    });

    it('should handle multiple rules applying to same command', () => {
      const commands = ['sos'];
      const context = createContext({ timeOfDay: 'night' });

      const adapted = engine.applyRules(commands, context);

      const sos = adapted.find(c => c.command === 'sos');
      // Should have both sos-always-visible and night-sos-highlight
      expect(sos?.appliedRules.length).toBeGreaterThanOrEqual(2);
      expect(sos?.visible).toBe(true);
      expect(sos?.highlighted).toBe(true);
    });
  });
});
