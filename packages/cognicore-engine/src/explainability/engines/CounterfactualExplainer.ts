/**
 * Counterfactual Explainer
 * ========================
 * Phase 5.2: Risk-Sensitive "What if" explanations
 *
 * Answers: "What would need to change to get a different outcome?"
 *
 * Research basis:
 * - Wachter et al. (2017) - Counterfactual Explanations
 * - Risk-Sensitive Counterfactuals (2024-2025) - Robust explanations
 * - Actionable Recourse in ML
 * - DiCE (Mothilal et al., 2020) - Diverse counterfactuals
 * - FACE (Poyiadzi et al., 2020) - Feasible counterfactuals
 *
 * Key features:
 * - Risk-sensitive robustness scoring
 * - Plausibility assessment
 * - Sparsity optimization (fewer changes = better)
 * - Diversity in counterfactual scenarios
 * - Age-adaptive formatting
 * - Russian language support
 *
 * (c) BF "Drugoy Put", 2025
 */

import { randomUUID } from 'crypto';
import {
  ICounterfactualExplanation,
  ICounterfactualScenario,
  ICounterfactualChange,
  ICounterfactualExplainer,
  CounterfactualFeasibility,
  IFeatureDefinition,
} from '../interfaces/IExplainability';
import { INTERVENTION_FEATURES } from './FeatureAttributionEngine';

// ============================================================================
// COUNTERFACTUAL RULES
// ============================================================================

/**
 * Rule for generating counterfactuals
 */
interface CounterfactualRule {
  id: string;
  targetOutcome: string;
  targetOutcomeRu: string;
  requiredChanges: {
    featureId: string;
    condition: (currentValue: unknown) => boolean;
    suggestedValue: unknown;
    description: string;
    descriptionRu: string;
    feasibility: CounterfactualFeasibility;
    riskLevel: 'low' | 'medium' | 'high';
  }[];
  priority: number;
  category: 'intervention' | 'mood' | 'time' | 'trigger' | 'streak' | 'risk';
}

/**
 * Comprehensive counterfactual rules for mental health context
 */
const COUNTERFACTUAL_RULES: CounterfactualRule[] = [
  // INTERVENTION RULES
  {
    id: 'RULE-001',
    targetOutcome: 'More Active Technique',
    targetOutcomeRu: 'Более активная техника',
    requiredChanges: [
      {
        featureId: 'currentEnergy',
        condition: (v) => (v as number) < 3,
        suggestedValue: 4,
        description: 'Increase energy level',
        descriptionRu: 'Повысить уровень энергии',
        feasibility: 'moderate',
        riskLevel: 'low',
      },
      {
        featureId: 'currentMood',
        condition: (v) => (v as number) < 3,
        suggestedValue: 4,
        description: 'Improve mood',
        descriptionRu: 'Улучшить настроение',
        feasibility: 'moderate',
        riskLevel: 'low',
      },
    ],
    priority: 1,
    category: 'intervention',
  },

  // RISK REDUCTION RULES
  {
    id: 'RULE-002',
    targetOutcome: 'Less Intensive Support',
    targetOutcomeRu: 'Менее интенсивная поддержка',
    requiredChanges: [
      {
        featureId: 'riskLevel',
        condition: (v) => v === 'high' || v === 'moderate',
        suggestedValue: 'low',
        description: 'Reduce risk level',
        descriptionRu: 'Снизить уровень риска',
        feasibility: 'difficult',
        riskLevel: 'high',
      },
      {
        featureId: 'moodTrend',
        condition: (v) => v === 'declining',
        suggestedValue: 'stable',
        description: 'Stabilize mood trend',
        descriptionRu: 'Стабилизировать тренд настроения',
        feasibility: 'moderate',
        riskLevel: 'medium',
      },
    ],
    priority: 2,
    category: 'risk',
  },

  // TIME-BASED RULES
  {
    id: 'RULE-003',
    targetOutcome: 'Morning Technique',
    targetOutcomeRu: 'Утренняя техника',
    requiredChanges: [
      {
        featureId: 'timeOfDay',
        condition: (v) => v !== 'morning',
        suggestedValue: 'morning',
        description: 'Try in the morning',
        descriptionRu: 'Попробовать утром',
        feasibility: 'easy',
        riskLevel: 'low',
      },
    ],
    priority: 3,
    category: 'time',
  },

  {
    id: 'RULE-004',
    targetOutcome: 'Evening Relaxation',
    targetOutcomeRu: 'Вечерняя релаксация',
    requiredChanges: [
      {
        featureId: 'timeOfDay',
        condition: (v) => v !== 'evening',
        suggestedValue: 'evening',
        description: 'Try in the evening',
        descriptionRu: 'Попробовать вечером',
        feasibility: 'easy',
        riskLevel: 'low',
      },
    ],
    priority: 3,
    category: 'time',
  },

  // TRIGGER-BASED RULES
  {
    id: 'RULE-005',
    targetOutcome: 'Boredom Technique',
    targetOutcomeRu: 'Техника для скуки',
    requiredChanges: [
      {
        featureId: 'activeTrigger',
        condition: (v) => v !== 'boredom',
        suggestedValue: 'boredom',
        description: 'When main trigger is boredom',
        descriptionRu: 'Когда основной триггер — скука',
        feasibility: 'easy',
        riskLevel: 'low',
      },
    ],
    priority: 4,
    category: 'trigger',
  },

  {
    id: 'RULE-006',
    targetOutcome: 'Stress Management Technique',
    targetOutcomeRu: 'Техника для стресса',
    requiredChanges: [
      {
        featureId: 'activeTrigger',
        condition: (v) => v !== 'stress',
        suggestedValue: 'stress',
        description: 'When main trigger is stress',
        descriptionRu: 'Когда основной триггер — стресс',
        feasibility: 'easy',
        riskLevel: 'low',
      },
    ],
    priority: 4,
    category: 'trigger',
  },

  {
    id: 'RULE-007',
    targetOutcome: 'Loneliness Support',
    targetOutcomeRu: 'Поддержка при одиночестве',
    requiredChanges: [
      {
        featureId: 'activeTrigger',
        condition: (v) => v !== 'loneliness',
        suggestedValue: 'loneliness',
        description: 'When feeling lonely',
        descriptionRu: 'Когда чувствуешь одиночество',
        feasibility: 'easy',
        riskLevel: 'low',
      },
    ],
    priority: 4,
    category: 'trigger',
  },

  // STREAK-BASED RULES
  {
    id: 'RULE-008',
    targetOutcome: 'Advanced Technique',
    targetOutcomeRu: 'Более продвинутая техника',
    requiredChanges: [
      {
        featureId: 'streak',
        condition: (v) => (v as number) < 7,
        suggestedValue: 7,
        description: 'Reach 7-day streak',
        descriptionRu: 'Достичь streak в 7 дней',
        feasibility: 'moderate',
        riskLevel: 'low',
      },
    ],
    priority: 5,
    category: 'streak',
  },

  {
    id: 'RULE-009',
    targetOutcome: 'Expert Level Exercises',
    targetOutcomeRu: 'Упражнения экспертного уровня',
    requiredChanges: [
      {
        featureId: 'streak',
        condition: (v) => (v as number) < 30,
        suggestedValue: 30,
        description: 'Reach 30-day streak',
        descriptionRu: 'Достичь streak в 30 дней',
        feasibility: 'difficult',
        riskLevel: 'low',
      },
    ],
    priority: 6,
    category: 'streak',
  },

  // MOOD IMPROVEMENT RULES
  {
    id: 'RULE-010',
    targetOutcome: 'Positive Mood Techniques',
    targetOutcomeRu: 'Техники для хорошего настроения',
    requiredChanges: [
      {
        featureId: 'currentMood',
        condition: (v) => (v as number) < 4,
        suggestedValue: 4,
        description: 'Improve mood to good level',
        descriptionRu: 'Улучшить настроение до хорошего',
        feasibility: 'moderate',
        riskLevel: 'low',
      },
    ],
    priority: 2,
    category: 'mood',
  },

  // SOCIAL SUPPORT RULES
  {
    id: 'RULE-011',
    targetOutcome: 'Group Activities',
    targetOutcomeRu: 'Групповые активности',
    requiredChanges: [
      {
        featureId: 'socialSupport',
        condition: (v) => (v as number) < 3,
        suggestedValue: 4,
        description: 'Increase social support',
        descriptionRu: 'Увеличить социальную поддержку',
        feasibility: 'moderate',
        riskLevel: 'low',
      },
    ],
    priority: 4,
    category: 'intervention',
  },

  // STRESS REDUCTION
  {
    id: 'RULE-012',
    targetOutcome: 'Calming Exercises',
    targetOutcomeRu: 'Успокаивающие упражнения',
    requiredChanges: [
      {
        featureId: 'stressLevel',
        condition: (v) => (v as number) > 3,
        suggestedValue: 2,
        description: 'Reduce stress level',
        descriptionRu: 'Снизить уровень стресса',
        feasibility: 'moderate',
        riskLevel: 'medium',
      },
    ],
    priority: 2,
    category: 'mood',
  },
];

// ============================================================================
// COUNTERFACTUAL EXPLAINER
// ============================================================================

/**
 * Risk-Sensitive Counterfactual Explainer
 *
 * Generates "what if" explanations with robustness scoring
 * and actionability assessment.
 */
export class CounterfactualExplainer implements ICounterfactualExplainer {
  private featureDefinitions: Map<string, IFeatureDefinition>;
  private rules: CounterfactualRule[];

  constructor(
    definitions?: Record<string, IFeatureDefinition>,
    rules?: CounterfactualRule[]
  ) {
    this.featureDefinitions = new Map(
      Object.entries(definitions || INTERVENTION_FEATURES)
    );
    this.rules = rules || COUNTERFACTUAL_RULES;
  }

  // ==========================================================================
  // COUNTERFACTUAL GENERATION
  // ==========================================================================

  /**
   * Generate counterfactual explanations with risk-sensitivity
   */
  generateCounterfactuals(
    currentFeatures: Record<string, unknown>,
    currentOutcome: string,
    desiredOutcome?: string,
    maxCounterfactuals: number = 3,
    options?: {
      requireRobust?: boolean;
      minRobustness?: number;
      feasibilityThreshold?: CounterfactualFeasibility;
    }
  ): ICounterfactualExplanation {
    const scenarios: ICounterfactualScenario[] = [];

    // Find applicable rules
    const applicableRules = this.findApplicableRules(
      currentFeatures,
      desiredOutcome
    );

    // Generate scenarios from rules
    for (const rule of applicableRules) {
      const scenario = this.generateScenarioFromRule(rule, currentFeatures);

      if (scenario) {
        // Apply robustness filter if required
        if (options?.requireRobust && options.minRobustness) {
          if (scenario.robustness < options.minRobustness) continue;
        }

        // Apply feasibility filter
        if (options?.feasibilityThreshold) {
          if (!this.meetsFeasibilityThreshold(
            scenario.feasibility,
            options.feasibilityThreshold
          )) continue;
        }

        scenarios.push(scenario);
      }
    }

    // Add proximity-based counterfactual (minimum change)
    const proximityScenario = this.generateProximityCounterfactual(
      currentFeatures,
      currentOutcome
    );

    if (proximityScenario) {
      scenarios.unshift(proximityScenario);
    }

    // Sort by recourse score (combined actionability metric)
    scenarios.sort((a, b) => b.recourseScore - a.recourseScore);

    // Select diverse subset
    const diverseScenarios = this.selectDiverseScenarios(
      scenarios,
      maxCounterfactuals
    );

    // Find special scenarios
    const closestCounterfactual = this.findClosestCounterfactual(diverseScenarios);
    const mostRobustCounterfactual = this.findMostRobust(diverseScenarios);
    const easiestCounterfactual = this.findEasiest(diverseScenarios);

    // Calculate overall metrics
    const overallRobustness = this.calculateOverallRobustness(diverseScenarios);
    const diversityScore = this.calculateDiversityScore(diverseScenarios);

    // Generate summaries
    const { summary, summaryRu } = this.generateSummary(
      diverseScenarios,
      currentOutcome
    );
    const { advice, adviceRu } = this.generateActionableAdvice(diverseScenarios);

    return {
      predictionId: randomUUID(),
      currentOutcome,
      currentOutcomeRu: this.translateOutcome(currentOutcome),
      currentValue: 0.5,

      scenarios: diverseScenarios,
      closestCounterfactual,
      mostRobustCounterfactual,
      easiestCounterfactual,

      summary,
      summaryRu,
      userActionableAdvice: advice,
      userActionableAdviceRu: adviceRu,

      overallRobustness,
      diversityScore,
    };
  }

  /**
   * Find rules applicable to current features
   */
  private findApplicableRules(
    features: Record<string, unknown>,
    desiredOutcome?: string
  ): CounterfactualRule[] {
    let applicable = this.rules.filter(rule => {
      return rule.requiredChanges.some(change =>
        change.condition(features[change.featureId])
      );
    });

    // Filter by desired outcome if specified
    if (desiredOutcome) {
      const exactMatch = applicable.filter(r =>
        r.targetOutcome.toLowerCase().includes(desiredOutcome.toLowerCase()) ||
        r.targetOutcomeRu.toLowerCase().includes(desiredOutcome.toLowerCase())
      );

      if (exactMatch.length > 0) {
        applicable = exactMatch;
      }
    }

    // Sort by priority
    return applicable.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate scenario from rule with robustness scoring
   */
  private generateScenarioFromRule(
    rule: CounterfactualRule,
    currentFeatures: Record<string, unknown>
  ): ICounterfactualScenario | null {
    const changes: ICounterfactualChange[] = [];
    let totalFeasibility: CounterfactualFeasibility = 'easy';
    const effortDescriptions: string[] = [];
    const effortDescriptionsRu: string[] = [];
    let maxRisk: 'low' | 'medium' | 'high' = 'low';

    for (const requiredChange of rule.requiredChanges) {
      if (requiredChange.condition(currentFeatures[requiredChange.featureId])) {
        const definition = this.featureDefinitions.get(requiredChange.featureId);

        changes.push({
          featureId: requiredChange.featureId,
          featureName: definition?.name || requiredChange.featureId,
          featureNameRu: definition?.nameRu || requiredChange.featureId,
          currentValue: currentFeatures[requiredChange.featureId] as string | number,
          suggestedValue: requiredChange.suggestedValue as string | number,
          changeDescription: requiredChange.description,
          changeDescriptionRu: requiredChange.descriptionRu,
          changeRisk: requiredChange.riskLevel,
          riskExplanation: this.getRiskExplanation(requiredChange.riskLevel),
        });

        effortDescriptions.push(requiredChange.description);
        effortDescriptionsRu.push(requiredChange.descriptionRu);

        // Update feasibility (take hardest)
        totalFeasibility = this.combineFeasibility(
          totalFeasibility,
          requiredChange.feasibility
        );

        // Update risk (take highest)
        if (this.riskOrder(requiredChange.riskLevel) > this.riskOrder(maxRisk)) {
          maxRisk = requiredChange.riskLevel;
        }
      }
    }

    if (changes.length === 0) return null;

    // Calculate risk-sensitive metrics
    const robustness = this.calculateRobustness({
      id: '',
      changes,
      feasibility: totalFeasibility,
    } as ICounterfactualScenario);

    const plausibility = this.calculatePlausibility(
      { changes } as ICounterfactualScenario,
      currentFeatures
    );

    const sparsity = this.calculateSparsity(changes.length);
    const recourseScore = this.calculateRecourseScore(
      robustness,
      plausibility,
      sparsity,
      totalFeasibility
    );

    // Add 'risky' feasibility if high risk
    if (maxRisk === 'high') {
      totalFeasibility = 'risky';
    }

    return {
      id: randomUUID(),
      description: `To get "${rule.targetOutcome}"`,
      descriptionRu: `Чтобы получить "${rule.targetOutcomeRu}"`,

      changes,

      alternativeOutcome: rule.targetOutcome,
      alternativeOutcomeRu: rule.targetOutcomeRu,
      alternativeValue: 0.7,

      feasibility: totalFeasibility,
      effort: effortDescriptions.join('; '),
      effortRu: effortDescriptionsRu.join('; '),

      robustness,
      plausibility,
      sparsity,
      recourseScore,

      confidence: 0.75 - (changes.length * 0.1),
    };
  }

  /**
   * Generate proximity-based counterfactual (minimum change)
   */
  private generateProximityCounterfactual(
    currentFeatures: Record<string, unknown>,
    currentOutcome: string
  ): ICounterfactualScenario | null {
    const singleChanges: ICounterfactualChange[] = [];

    // Check mood change
    const currentMood = currentFeatures.currentMood as number;
    if (currentMood && currentMood < 4) {
      const definition = this.featureDefinitions.get('currentMood');
      singleChanges.push({
        featureId: 'currentMood',
        featureName: definition?.name || 'Mood',
        featureNameRu: definition?.nameRu || 'Настроение',
        currentValue: currentMood,
        suggestedValue: Math.min(5, currentMood + 1),
        changeDescription: 'Raise mood by 1 point',
        changeDescriptionRu: 'Повысить настроение на 1 пункт',
        changeRisk: 'low',
      });
    }

    // Check energy change
    const currentEnergy = currentFeatures.currentEnergy as number;
    if (currentEnergy && currentEnergy < 4) {
      const definition = this.featureDefinitions.get('currentEnergy');
      singleChanges.push({
        featureId: 'currentEnergy',
        featureName: definition?.name || 'Energy',
        featureNameRu: definition?.nameRu || 'Энергия',
        currentValue: currentEnergy,
        suggestedValue: Math.min(5, currentEnergy + 1),
        changeDescription: 'Raise energy by 1 point',
        changeDescriptionRu: 'Повысить энергию на 1 пункт',
        changeRisk: 'low',
      });
    }

    // Check stress reduction
    const stressLevel = currentFeatures.stressLevel as number;
    if (stressLevel && stressLevel > 2) {
      const definition = this.featureDefinitions.get('stressLevel');
      singleChanges.push({
        featureId: 'stressLevel',
        featureName: definition?.name || 'Stress',
        featureNameRu: definition?.nameRu || 'Стресс',
        currentValue: stressLevel,
        suggestedValue: Math.max(1, stressLevel - 1),
        changeDescription: 'Reduce stress by 1 point',
        changeDescriptionRu: 'Снизить стресс на 1 пункт',
        changeRisk: 'low',
      });
    }

    if (singleChanges.length === 0) return null;

    // Take the smallest change (first one found)
    const smallestChange = singleChanges[0];

    const robustness = 0.85; // High robustness for minimal changes
    const plausibility = 0.90;
    const sparsity = 1.0; // Maximum sparsity (single change)
    const recourseScore = (robustness + plausibility + sparsity) / 3;

    return {
      id: randomUUID(),
      description: 'Minimal Change',
      descriptionRu: 'Минимальное изменение',

      changes: [smallestChange],

      alternativeOutcome: `Different recommendation (with ${smallestChange.changeDescription.toLowerCase()})`,
      alternativeOutcomeRu: `Другая рекомендация (при ${smallestChange.changeDescriptionRu.toLowerCase()})`,
      alternativeValue: 0.6,

      feasibility: 'easy',
      effort: smallestChange.changeDescription,
      effortRu: smallestChange.changeDescriptionRu,

      robustness,
      plausibility,
      sparsity,
      recourseScore,

      confidence: 0.8,
    };
  }

  // ==========================================================================
  // RISK-SENSITIVE METRICS
  // ==========================================================================

  /**
   * Calculate robustness of a counterfactual scenario
   * Higher = more robust to perturbations
   */
  calculateRobustness(scenario: ICounterfactualScenario): number {
    if (!scenario.changes || scenario.changes.length === 0) return 0;

    // Factors affecting robustness:
    // 1. Fewer changes = more robust
    // 2. Larger margins from decision boundary = more robust
    // 3. Lower risk changes = more robust

    const sparsityFactor = 1 / Math.sqrt(scenario.changes.length);

    // Risk factor based on change risks
    const riskFactors = scenario.changes.map(c => {
      switch (c.changeRisk) {
        case 'low': return 1.0;
        case 'medium': return 0.7;
        case 'high': return 0.4;
        default: return 0.5;
      }
    });
    const avgRiskFactor = riskFactors.reduce((a, b) => a + b, 0) / riskFactors.length;

    // Feasibility factor
    const feasibilityFactor = this.feasibilityToScore(scenario.feasibility);

    // Combined robustness (weighted average)
    const robustness = (
      sparsityFactor * 0.3 +
      avgRiskFactor * 0.4 +
      feasibilityFactor * 0.3
    );

    return Math.min(1, Math.max(0, robustness));
  }

  /**
   * Calculate plausibility of a counterfactual scenario
   * Higher = more realistic given the context
   */
  calculatePlausibility(
    scenario: ICounterfactualScenario,
    contextFeatures: Record<string, unknown>
  ): number {
    if (!scenario.changes || scenario.changes.length === 0) return 0;

    // Plausibility factors:
    // 1. How far is the suggested value from current value
    // 2. Is the suggested value within typical range
    // 3. Consistency with other features

    const plausibilityScores = scenario.changes.map(change => {
      const definition = this.featureDefinitions.get(change.featureId);
      if (!definition) return 0.5;

      // Distance factor
      const currentNum = typeof change.currentValue === 'number' ? change.currentValue : 0;
      const suggestedNum = typeof change.suggestedValue === 'number' ? change.suggestedValue : 0;

      if (definition.valueType === 'numeric' && definition.maxValue && definition.minValue) {
        const range = definition.maxValue - definition.minValue;
        const distance = Math.abs(suggestedNum - currentNum) / range;
        return 1 - distance * 0.5; // Smaller changes are more plausible
      }

      // Categorical - check if suggested is a common value
      if (definition.valueType === 'categorical' && definition.possibleValues) {
        return definition.possibleValues.includes(String(change.suggestedValue)) ? 0.8 : 0.3;
      }

      return 0.5;
    });

    return plausibilityScores.reduce((a, b) => a + b, 0) / plausibilityScores.length;
  }

  /**
   * Calculate sparsity (preference for fewer changes)
   */
  private calculateSparsity(changeCount: number): number {
    // Exponential decay - strongly prefer fewer changes
    return Math.exp(-0.5 * (changeCount - 1));
  }

  /**
   * Calculate combined recourse score
   */
  private calculateRecourseScore(
    robustness: number,
    plausibility: number,
    sparsity: number,
    feasibility: CounterfactualFeasibility
  ): number {
    const feasibilityScore = this.feasibilityToScore(feasibility);

    // Weighted combination
    return (
      robustness * 0.25 +
      plausibility * 0.25 +
      sparsity * 0.25 +
      feasibilityScore * 0.25
    );
  }

  // ==========================================================================
  // DIVERSITY & SELECTION
  // ==========================================================================

  /**
   * Select diverse subset of counterfactuals
   */
  private selectDiverseScenarios(
    scenarios: ICounterfactualScenario[],
    maxCount: number
  ): ICounterfactualScenario[] {
    if (scenarios.length <= maxCount) return scenarios;

    const selected: ICounterfactualScenario[] = [];
    const usedCategories = new Set<string>();

    // First pass: select best from each category
    for (const scenario of scenarios) {
      if (selected.length >= maxCount) break;

      const category = this.getScenarioCategory(scenario);
      if (!usedCategories.has(category)) {
        selected.push(scenario);
        usedCategories.add(category);
      }
    }

    // Second pass: fill remaining slots with highest recourse scores
    for (const scenario of scenarios) {
      if (selected.length >= maxCount) break;
      if (!selected.includes(scenario)) {
        selected.push(scenario);
      }
    }

    return selected;
  }

  /**
   * Get category of a scenario based on changed features
   */
  private getScenarioCategory(scenario: ICounterfactualScenario): string {
    if (scenario.changes.length === 0) return 'unknown';

    const featureId = scenario.changes[0].featureId;
    const definition = this.featureDefinitions.get(featureId);

    return definition?.category || 'unknown';
  }

  /**
   * Calculate diversity score for selected scenarios
   */
  private calculateDiversityScore(scenarios: ICounterfactualScenario[]): number {
    if (scenarios.length <= 1) return 0;

    const categories = scenarios.map(s => this.getScenarioCategory(s));
    const uniqueCategories = new Set(categories);

    return uniqueCategories.size / scenarios.length;
  }

  /**
   * Calculate overall robustness of explanation
   */
  private calculateOverallRobustness(scenarios: ICounterfactualScenario[]): number {
    if (scenarios.length === 0) return 0;

    const robustnessValues = scenarios.map(s => s.robustness);
    return robustnessValues.reduce((a, b) => a + b, 0) / robustnessValues.length;
  }

  // ==========================================================================
  // FINDING SPECIAL SCENARIOS
  // ==========================================================================

  /**
   * Find closest counterfactual (easiest to achieve)
   */
  private findClosestCounterfactual(
    scenarios: ICounterfactualScenario[]
  ): ICounterfactualScenario | undefined {
    if (scenarios.length === 0) return undefined;

    return [...scenarios].sort((a, b) => {
      const feasibilityOrder: Record<CounterfactualFeasibility, number> = {
        easy: 0, moderate: 1, difficult: 2, impossible: 3, risky: 4
      };

      const feasibilityDiff =
        feasibilityOrder[a.feasibility] - feasibilityOrder[b.feasibility];

      if (feasibilityDiff !== 0) return feasibilityDiff;
      return a.changes.length - b.changes.length;
    })[0];
  }

  /**
   * Find most robust counterfactual
   */
  private findMostRobust(
    scenarios: ICounterfactualScenario[]
  ): ICounterfactualScenario | undefined {
    if (scenarios.length === 0) return undefined;

    return [...scenarios].sort((a, b) => b.robustness - a.robustness)[0];
  }

  /**
   * Find easiest counterfactual
   */
  private findEasiest(
    scenarios: ICounterfactualScenario[]
  ): ICounterfactualScenario | undefined {
    if (scenarios.length === 0) return undefined;

    const easyScenarios = scenarios.filter(s => s.feasibility === 'easy');
    if (easyScenarios.length > 0) {
      return easyScenarios.sort((a, b) => b.recourseScore - a.recourseScore)[0];
    }

    return this.findClosestCounterfactual(scenarios);
  }

  // ==========================================================================
  // USER-FACING OUTPUT
  // ==========================================================================

  /**
   * Generate summary of counterfactuals
   */
  private generateSummary(
    scenarios: ICounterfactualScenario[],
    currentOutcome: string
  ): { summary: string; summaryRu: string } {
    if (scenarios.length === 0) {
      return {
        summary: `Current recommendation "${currentOutcome}" is optimal for your situation.`,
        summaryRu: `Текущая рекомендация "${this.translateOutcome(currentOutcome)}" — оптимальна для твоей ситуации.`,
      };
    }

    const easiest = scenarios.find(s => s.feasibility === 'easy');

    if (easiest && easiest.changes.length > 0) {
      const change = easiest.changes[0];
      return {
        summary: `If ${change.changeDescription.toLowerCase()}, you'll get ${easiest.alternativeOutcome.toLowerCase()}.`,
        summaryRu: `Если ${change.changeDescriptionRu.toLowerCase()}, ты получишь ${easiest.alternativeOutcomeRu.toLowerCase()}.`,
      };
    }

    return {
      summary: `There are ${scenarios.length} way(s) to get a different recommendation.`,
      summaryRu: `Есть ${scenarios.length} способа(ов) получить другую рекомендацию.`,
    };
  }

  /**
   * Generate actionable advice from counterfactuals
   */
  private generateActionableAdvice(
    scenarios: ICounterfactualScenario[]
  ): { advice: string[]; adviceRu: string[] } {
    const advice: string[] = [];
    const adviceRu: string[] = [];

    for (const scenario of scenarios) {
      if (scenario.feasibility === 'easy' || scenario.feasibility === 'moderate') {
        for (const change of scenario.changes) {
          if (!advice.includes(change.changeDescription)) {
            advice.push(change.changeDescription);
            adviceRu.push(change.changeDescriptionRu);
          }
        }
      }
    }

    return {
      advice: advice.slice(0, 3),
      adviceRu: adviceRu.slice(0, 3),
    };
  }

  /**
   * Format counterfactuals for display
   */
  formatForDisplay(
    explanation: ICounterfactualExplanation,
    ageGroup: 'child' | 'teen' | 'adult' = 'adult'
  ): string {
    switch (ageGroup) {
      case 'child':
        return this.formatForChild(explanation);
      case 'teen':
        return this.formatForTeen(explanation);
      case 'adult':
      default:
        return this.formatForAdult(explanation);
    }
  }

  private formatForChild(explanation: ICounterfactualExplanation): string {
    if (explanation.scenarios.length === 0) {
      return '🌟 Я выбрал лучшее для тебя!';
    }

    const easiest = explanation.easiestCounterfactual;
    if (easiest && easiest.changes.length > 0) {
      return `🔮 А знаешь что? ${easiest.effortRu} — и будет ещё круче!`;
    }

    return '🌟 Это специально для тебя!';
  }

  private formatForTeen(explanation: ICounterfactualExplanation): string {
    let result = `💡 ${explanation.summaryRu}\n`;

    if (explanation.userActionableAdviceRu.length > 0) {
      result += '\nЧто можно сделать:\n';
      for (const advice of explanation.userActionableAdviceRu.slice(0, 2)) {
        result += `• ${advice}\n`;
      }
    }

    return result.trim();
  }

  private formatForAdult(explanation: ICounterfactualExplanation): string {
    let result = `📊 Анализ альтернатив\n\n`;
    result += `${explanation.summaryRu}\n`;

    if (explanation.scenarios.length > 0) {
      result += '\nВозможные изменения:\n';

      for (const scenario of explanation.scenarios.slice(0, 3)) {
        result += `\n${scenario.descriptionRu}:\n`;
        for (const change of scenario.changes) {
          result += `  • ${change.changeDescriptionRu} `;
          result += `(${change.currentValue} → ${change.suggestedValue})\n`;
        }
        result += `  Сложность: ${this.translateFeasibility(scenario.feasibility)}`;
        result += ` | Надёжность: ${Math.round(scenario.robustness * 100)}%\n`;
      }
    }

    return result.trim();
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private combineFeasibility(
    current: CounterfactualFeasibility,
    newFeasibility: CounterfactualFeasibility
  ): CounterfactualFeasibility {
    const order: Record<CounterfactualFeasibility, number> = {
      easy: 0, moderate: 1, difficult: 2, risky: 3, impossible: 4
    };

    return order[newFeasibility] > order[current] ? newFeasibility : current;
  }

  private meetsFeasibilityThreshold(
    feasibility: CounterfactualFeasibility,
    threshold: CounterfactualFeasibility
  ): boolean {
    const order: Record<CounterfactualFeasibility, number> = {
      easy: 0, moderate: 1, difficult: 2, risky: 3, impossible: 4
    };

    return order[feasibility] <= order[threshold];
  }

  private feasibilityToScore(feasibility: CounterfactualFeasibility): number {
    const scores: Record<CounterfactualFeasibility, number> = {
      easy: 1.0,
      moderate: 0.7,
      difficult: 0.4,
      risky: 0.3,
      impossible: 0,
    };
    return scores[feasibility] ?? 0.5;
  }

  private riskOrder(risk: 'low' | 'medium' | 'high'): number {
    const order = { low: 0, medium: 1, high: 2 };
    return order[risk] ?? 0;
  }

  private getRiskExplanation(risk: 'low' | 'medium' | 'high'): string {
    switch (risk) {
      case 'low': return 'Safe change with minimal risk';
      case 'medium': return 'Moderate change that may require effort';
      case 'high': return 'Significant change that needs careful consideration';
    }
  }

  private translateFeasibility(feasibility: CounterfactualFeasibility): string {
    const translations: Record<CounterfactualFeasibility, string> = {
      easy: 'легко',
      moderate: 'средне',
      difficult: 'сложно',
      risky: 'рискованно',
      impossible: 'невозможно',
    };
    return translations[feasibility];
  }

  private translateOutcome(outcome: string): string {
    // Simple translation map for common outcomes
    const translations: Record<string, string> = {
      'intervention': 'техника',
      'support': 'поддержка',
      'technique': 'техника',
      'exercise': 'упражнение',
    };

    for (const [en, ru] of Object.entries(translations)) {
      if (outcome.toLowerCase().includes(en)) {
        return outcome.replace(new RegExp(en, 'gi'), ru);
      }
    }

    return outcome;
  }

  // ==========================================================================
  // RULE MANAGEMENT
  // ==========================================================================

  /**
   * Add custom counterfactual rule
   */
  addRule(rule: CounterfactualRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all rules
   */
  getRules(): CounterfactualRule[] {
    return [...this.rules];
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): CounterfactualRule[] {
    return this.rules.filter(r => r.category === category);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create Counterfactual Explainer instance
 */
export function createCounterfactualExplainer(
  customDefinitions?: Record<string, IFeatureDefinition>,
  customRules?: CounterfactualRule[]
): CounterfactualExplainer {
  return new CounterfactualExplainer(customDefinitions, customRules);
}
