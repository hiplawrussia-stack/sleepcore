/**
 * RuleEngine - Forward Chaining Rule Engine for Keyboard Adaptation
 * ==================================================================
 *
 * Lightweight TypeScript rule engine implementing forward chaining pattern.
 * Evaluates rules against user context to determine keyboard adaptations.
 *
 * Research basis:
 * - Forward chaining: evaluate conditions, apply actions in priority order
 * - Decision tables: structured rule management
 * - Context-aware personalization: time, behavior, streak-based rules
 *
 * @packageDocumentation
 * @module @sleepcore/modules/adaptive-keyboard
 */

import type { IUserBehaviorContext } from './UserInteractionRepository';
import type { TimeOfDay } from '../../bot/commands/registry';

/**
 * Available keyboard actions
 */
export type KeyboardAction = 'show' | 'hide' | 'promote' | 'demote' | 'highlight';

/**
 * Rule priority levels
 */
export enum RulePriority {
  CRITICAL = 100, // Safety/SOS rules
  HIGH = 80, // Context-critical rules (time, emotion)
  MEDIUM = 50, // Behavior-based rules
  LOW = 20, // Default/fallback rules
}

/**
 * Adaptation rule definition
 */
export interface IAdaptationRule {
  id: string;
  name: string;
  description: string;
  condition: (context: IUserBehaviorContext) => boolean;
  action: KeyboardAction;
  target: string; // command name or '*' for all
  priority: number;
  enabled: boolean;
}

/**
 * Rule evaluation result
 */
export interface IRuleResult {
  ruleId: string;
  ruleName: string;
  action: KeyboardAction;
  target: string;
  matched: boolean;
}

/**
 * Keyboard command with adaptation
 */
export interface IAdaptedCommand {
  command: string;
  visible: boolean;
  promoted: boolean;
  demoted: boolean;
  highlighted: boolean;
  appliedRules: string[];
}

/**
 * Default rules for SleepCore keyboard adaptation
 * Based on research: time-based, behavior-based, streak-based rules
 */
const DEFAULT_RULES: IAdaptationRule[] = [
  // ===== CRITICAL: Safety rules =====
  {
    id: 'sos-always-visible',
    name: 'SOS Always Visible',
    description: 'SOS button is always visible for safety',
    condition: () => true,
    action: 'show',
    target: 'sos',
    priority: RulePriority.CRITICAL,
    enabled: true,
  },

  // ===== HIGH: Time-based rules =====
  {
    id: 'morning-diary',
    name: 'Morning Diary Promotion',
    description: 'Promote diary in morning (research: optimal time for sleep logging)',
    condition: (ctx) => ctx.timeOfDay === 'morning',
    action: 'promote',
    target: 'diary',
    priority: RulePriority.HIGH,
    enabled: true,
  },
  {
    id: 'morning-recall',
    name: 'Morning Recall Promotion',
    description: 'Promote recall test in morning (cognitive consolidation window)',
    condition: (ctx) => ctx.timeOfDay === 'morning',
    action: 'promote',
    target: 'recall',
    priority: RulePriority.HIGH,
    enabled: true,
  },
  {
    id: 'evening-relax',
    name: 'Evening Relaxation Promotion',
    description: 'Promote relaxation in evening (research: golden hour 20:00)',
    condition: (ctx) => ctx.timeOfDay === 'evening',
    action: 'promote',
    target: 'relax',
    priority: RulePriority.HIGH,
    enabled: true,
  },
  {
    id: 'evening-rehearsal',
    name: 'Evening Rehearsal Promotion',
    description: 'Promote mental rehearsal in evening',
    condition: (ctx) => ctx.timeOfDay === 'evening',
    action: 'promote',
    target: 'rehearsal',
    priority: RulePriority.HIGH,
    enabled: true,
  },
  {
    id: 'night-sos-highlight',
    name: 'Night SOS Highlight',
    description: 'Highlight SOS at night (vulnerable time)',
    condition: (ctx) => ctx.timeOfDay === 'night',
    action: 'highlight',
    target: 'sos',
    priority: RulePriority.HIGH,
    enabled: true,
  },
  {
    id: 'night-relax-promote',
    name: 'Night Relaxation Promote',
    description: 'Promote relaxation at night for insomnia',
    condition: (ctx) => ctx.timeOfDay === 'night',
    action: 'promote',
    target: 'relax',
    priority: RulePriority.HIGH,
    enabled: true,
  },

  // ===== MEDIUM: Behavior-based rules =====
  {
    id: 'hide-ignored-commands',
    name: 'Hide Ignored Commands',
    description: 'Hide commands ignored 5+ times (user not interested)',
    condition: (ctx) => {
      // Will be applied per-command in evaluation
      return ctx.ignoredCommands.size > 0;
    },
    action: 'hide',
    target: '*', // Special: applied to each ignored command
    priority: RulePriority.MEDIUM,
    enabled: true,
  },
  {
    id: 'promote-frequent-commands',
    name: 'Promote Frequent Commands',
    description: 'Promote commands user clicks frequently',
    condition: (ctx) => ctx.frequentCommands.length > 0,
    action: 'promote',
    target: '*', // Special: applied to each frequent command
    priority: RulePriority.MEDIUM,
    enabled: true,
  },
  {
    id: 'new-user-onboarding',
    name: 'New User Onboarding',
    description: 'Show onboarding-friendly commands for new users',
    condition: (ctx) => ctx.daysActive <= 3,
    action: 'promote',
    target: 'start',
    priority: RulePriority.MEDIUM,
    enabled: true,
  },

  // ===== LOW: Default rules =====
  {
    id: 'streak-progress-promote',
    name: 'Streak Progress Promotion',
    description: 'Promote progress for users with streaks',
    condition: (ctx) => {
      // Check if user has been active recently
      return ctx.lastCommands.length > 0;
    },
    action: 'promote',
    target: 'progress',
    priority: RulePriority.LOW,
    enabled: true,
  },
];

/**
 * RuleEngine - Evaluates and applies adaptation rules
 */
export class RuleEngine {
  private rules: IAdaptationRule[];

  constructor(customRules?: IAdaptationRule[]) {
    // Deep copy to prevent mutation of DEFAULT_RULES between instances
    this.rules = DEFAULT_RULES.map((rule) => ({ ...rule }));
    if (customRules) {
      this.rules.push(...customRules.map((rule) => ({ ...rule })));
    }
    this.sortRulesByPriority();
  }

  /**
   * Sort rules by priority (descending)
   */
  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add a new rule
   */
  addRule(rule: IAdaptationRule): void {
    this.rules.push(rule);
    this.sortRulesByPriority();
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  getRules(): IAdaptationRule[] {
    return [...this.rules];
  }

  /**
   * Evaluate all rules against context
   */
  evaluateRules(context: IUserBehaviorContext): IRuleResult[] {
    const results: IRuleResult[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const matched = rule.condition(context);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
          target: rule.target,
          matched,
        });
      } catch (error) {
        // Rule condition threw error - skip this rule
        console.warn(`Rule ${rule.id} evaluation failed:`, error);
      }
    }

    return results;
  }

  /**
   * Apply rules to a list of commands and return adapted commands
   */
  applyRules(
    commands: string[],
    context: IUserBehaviorContext
  ): IAdaptedCommand[] {
    // Initialize adapted commands
    const adaptedCommands: Map<string, IAdaptedCommand> = new Map();

    for (const command of commands) {
      adaptedCommands.set(command, {
        command,
        visible: true,
        promoted: false,
        demoted: false,
        highlighted: false,
        appliedRules: [],
      });
    }

    // Evaluate rules
    const results = this.evaluateRules(context);

    // Apply matched rules
    for (const result of results) {
      if (!result.matched) continue;

      if (result.target === '*') {
        // Special handling for wildcard rules
        this.applyWildcardRule(result, context, adaptedCommands);
      } else {
        // Apply to specific command
        const adapted = adaptedCommands.get(result.target);
        if (adapted) {
          this.applyAction(adapted, result);
        }
      }
    }

    return [...adaptedCommands.values()];
  }

  /**
   * Apply wildcard rule (affects multiple commands)
   */
  private applyWildcardRule(
    result: IRuleResult,
    context: IUserBehaviorContext,
    adaptedCommands: Map<string, IAdaptedCommand>
  ): void {
    if (result.ruleId === 'hide-ignored-commands') {
      // Hide commands that user ignores
      for (const [command, ignoreCount] of context.ignoredCommands) {
        if (ignoreCount >= 5) {
          const adapted = adaptedCommands.get(command);
          if (adapted) {
            this.applyAction(adapted, { ...result, target: command });
          }
        }
      }
    } else if (result.ruleId === 'promote-frequent-commands') {
      // Promote frequently used commands
      for (const command of context.frequentCommands) {
        const adapted = adaptedCommands.get(command);
        if (adapted) {
          this.applyAction(adapted, { ...result, action: 'promote', target: command });
        }
      }
    }
  }

  /**
   * Apply action to adapted command
   */
  private applyAction(adapted: IAdaptedCommand, result: IRuleResult): void {
    adapted.appliedRules.push(result.ruleId);

    switch (result.action) {
      case 'show':
        adapted.visible = true;
        break;
      case 'hide':
        adapted.visible = false;
        break;
      case 'promote':
        adapted.promoted = true;
        break;
      case 'demote':
        adapted.demoted = true;
        break;
      case 'highlight':
        adapted.highlighted = true;
        break;
    }
  }

  /**
   * Get sorted commands based on adaptation
   * Returns commands sorted by: promoted first, then normal, then demoted
   * Hidden commands are filtered out
   */
  getSortedCommands(adaptedCommands: IAdaptedCommand[]): string[] {
    return adaptedCommands
      .filter((c) => c.visible)
      .sort((a, b) => {
        // Promoted commands first
        if (a.promoted && !b.promoted) return -1;
        if (!a.promoted && b.promoted) return 1;

        // Demoted commands last
        if (a.demoted && !b.demoted) return 1;
        if (!a.demoted && b.demoted) return -1;

        return 0;
      })
      .map((c) => c.command);
  }

  /**
   * Get highlighted commands (for special styling)
   */
  getHighlightedCommands(adaptedCommands: IAdaptedCommand[]): string[] {
    return adaptedCommands
      .filter((c) => c.visible && c.highlighted)
      .map((c) => c.command);
  }

  /**
   * Get explanation of why a command was adapted
   */
  getCommandExplanation(
    command: string,
    adaptedCommands: IAdaptedCommand[]
  ): string {
    const adapted = adaptedCommands.find((c) => c.command === command);
    if (!adapted) return 'Command not found';

    const appliedRuleNames = adapted.appliedRules
      .map((id) => this.rules.find((r) => r.id === id)?.name)
      .filter(Boolean);

    if (appliedRuleNames.length === 0) {
      return 'No rules applied (default visibility)';
    }

    return `Rules applied: ${appliedRuleNames.join(', ')}`;
  }
}

// Singleton instance
export const ruleEngine = new RuleEngine();

// Export default rules for testing
export { DEFAULT_RULES };
