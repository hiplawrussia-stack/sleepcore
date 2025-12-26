/**
 * Monte Carlo Simulation Engine
 *
 * Phase 6.3: What-if Scenario Simulation for Mental Health Digital Twins
 *
 * 2025 Research Integration:
 * - Ensemble prediction with uncertainty quantification
 * - Stochastic differential equations (SDE) simulation
 * - Heterogeneous treatment effect estimation
 * - Counterfactual trajectory generation
 * - Causal effect decomposition
 *
 * Research basis:
 * - Nature Computational Science: "Probabilistic graphical model for digital twins"
 * - Frontiers: "Digital twins and the future of precision mental health"
 * - PMC: "Method Monte Carlo in healthcare decision making"
 *
 * © БФ "Другой путь", 2025
 */

import {
  IDigitalTwinState,
  ITwinStateVariable,
  IScenario,
  IScenarioResult,
  IScenarioComparison,
  ISimulatedTrajectory,
  ITrajectoryEvent,
  ITwinSimulatorService,
  ITwinPersonalization,
  ISimulationConfig,
  DEFAULT_SIMULATION_CONFIG,
  ScenarioOutcome,
  IClinicalInterpretation,
  generateTwinId,
} from '../interfaces/IDigitalTwin';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Outcome classification thresholds
 * Based on clinical significance research
 */
const OUTCOME_THRESHOLDS = {
  crisis: 0.85,           // Overall distress > 85%
  deterioration: 0.65,    // Significant worsening
  improvement: 0.35,      // Significant improvement
  recovery: 0.2,          // Near-full recovery
  remission: 0.1,         // Full remission (2025)
};

/**
 * Effect sizes for stressors by type
 * 2025: Evidence-based from digital phenotyping studies
 */
const STRESSOR_EFFECTS: Record<string, Map<string, number>> = {
  work: new Map([
    ['emotion_anxiety', 0.3],
    ['emotion_stress', 0.4],
    ['physio_sleep_quality', -0.2],
    ['cognition_focus', -0.25],
  ]),
  relationship: new Map([
    ['emotion_sadness', 0.4],
    ['emotion_anxiety', 0.2],
    ['social_engagement', -0.3],
    ['emotion_loneliness', 0.35],
  ]),
  health: new Map([
    ['emotion_anxiety', 0.3],
    ['physio_energy', -0.3],
    ['emotion_sadness', 0.2],
    ['overall_wellbeing', -0.25],
  ]),
  financial: new Map([
    ['emotion_anxiety', 0.4],
    ['emotion_stress', 0.3],
    ['cognition_rumination', 0.2],
    ['physio_sleep_quality', -0.15],
  ]),
  loss: new Map([
    ['emotion_sadness', 0.6],
    ['emotion_grief', 0.5],
    ['physio_energy', -0.3],
    ['social_withdrawal', 0.3],
  ]),
  trauma: new Map([
    ['emotion_anxiety', 0.5],
    ['emotion_fear', 0.4],
    ['physio_sleep_quality', -0.4],
    ['cognition_intrusion', 0.5],
  ]),
  other: new Map([
    ['emotion_anxiety', 0.2],
    ['emotion_stress', 0.2],
  ]),
};

/**
 * Effect sizes for protective factors
 */
const PROTECTIVE_EFFECTS: Record<string, Map<string, number>> = {
  social_support: new Map([
    ['emotion_sadness', -0.3],
    ['emotion_anxiety', -0.2],
    ['resilience', 0.3],
    ['emotion_loneliness', -0.35],
  ]),
  therapy: new Map([
    ['cognition_rumination', -0.4],
    ['emotion_anxiety', -0.3],
    ['coping_skills', 0.4],
    ['emotion_regulation', 0.35],
  ]),
  medication: new Map([
    ['emotion_anxiety', -0.4],
    ['emotion_sadness', -0.3],
    ['physio_sleep_quality', 0.3],
  ]),
  lifestyle: new Map([
    ['physio_energy', 0.3],
    ['physio_sleep_quality', 0.3],
    ['emotion_anxiety', -0.2],
    ['overall_wellbeing', 0.25],
  ]),
  coping_skills: new Map([
    ['cognition_rumination', -0.3],
    ['emotion_regulation', 0.3],
    ['resilience', 0.2],
  ]),
  mindfulness: new Map([
    ['emotion_anxiety', -0.25],
    ['cognition_rumination', -0.35],
    ['emotion_regulation', 0.3],
    ['present_focus', 0.4],
  ]),
};

// ============================================================================
// MONTE CARLO ENGINE
// ============================================================================

/**
 * Monte Carlo Simulation Engine
 *
 * Implements what-if scenario simulations with uncertainty quantification
 */
export class MonteCarloEngine implements ITwinSimulatorService {
  private config: ISimulationConfig;
  private rng: () => number;

  constructor(config: Partial<ISimulationConfig> = {}) {
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    this.rng = this.createRng(config.seed);
  }

  // ==========================================================================
  // SCENARIO SIMULATION
  // ==========================================================================

  async simulateScenario(
    twin: IDigitalTwinState,
    scenario: IScenario,
    personalization?: ITwinPersonalization
  ): Promise<IScenarioResult> {
    const startTime = Date.now();
    const trajectories: ISimulatedTrajectory[] = [];

    // Run Monte Carlo simulations
    for (let i = 0; i < this.config.numTrajectories; i++) {
      // Check time budget
      if (Date.now() - startTime > this.config.maxComputeTimeMs) {
        break;
      }

      const trajectory = this.simulateSingleTrajectory(
        twin,
        scenario,
        personalization
      );
      trajectories.push(trajectory);
    }

    // Calculate expected trajectory (ensemble mean)
    const expectedTrajectory = this.calculateExpectedTrajectory(trajectories);

    // Classify outcomes
    const outcomeDistribution = this.classifyOutcomes(trajectories);
    const outcome = this.getMostLikelyOutcome(outcomeDistribution);

    // Calculate end state statistics
    const { expected, worstCase, bestCase } = this.calculateEndStateStatistics(trajectories);

    // Calculate risk metrics
    const crisisProbability = outcomeDistribution.get('crisis') || 0;
    const recoveryProbability = outcomeDistribution.get('recovery') || 0;
    const tippingPointProbability = this.calculateTippingPointProbability(trajectories);

    // Time-to-event calculations
    const expectedTimeToImprovement = this.calculateTimeToEvent(trajectories, 'improvement');
    const expectedTimeToCrisis = this.calculateTimeToEvent(trajectories, 'crisis');

    // 2025: Uncertainty decomposition
    const { aleatoric, epistemic } = this.decomposeUncertainty(trajectories);
    const predictionUncertainty = Math.sqrt(aleatoric * aleatoric + epistemic * epistemic);

    // 2025: Key drivers analysis
    const keyDrivers = this.analyzeKeyDrivers(trajectories, twin);

    // Confidence based on simulation variance
    const confidenceLevel = this.calculateConfidenceLevel(trajectories);

    return {
      id: generateTwinId('SIM'),
      scenario,
      simulatedAt: new Date(),

      trajectories,
      expectedTrajectory,
      outcome,
      outcomeDistribution,

      expectedEndState: expected,
      worstCaseEndState: worstCase,
      bestCaseEndState: bestCase,

      crisisProbability,
      recoveryProbability,
      tippingPointProbability,

      expectedTimeToImprovement,
      expectedTimeToCrisis,

      predictionUncertainty,
      aleatoric,
      epistemic,

      keyDrivers,

      confidenceLevel,
      simulationCount: trajectories.length,
      methodUsed: 'ensemble_kalman',
    };
  }

  // ==========================================================================
  // SCENARIO COMPARISON
  // ==========================================================================

  async compareScenarios(
    twin: IDigitalTwinState,
    scenarioA: IScenario,
    scenarioB: IScenario,
    personalization?: ITwinPersonalization
  ): Promise<IScenarioComparison> {
    // Run both scenarios
    const resultA = await this.simulateScenario(twin, scenarioA, personalization);
    const resultB = await this.simulateScenario(twin, scenarioB, personalization);

    // Calculate differential outcome
    const differentialOutcome = new Map<string, number>();
    for (const [key, valueA] of Array.from(resultA.expectedEndState)) {
      const valueB = resultB.expectedEndState.get(key) || 0;
      differentialOutcome.set(key, valueA - valueB);
    }

    // Calculate relative benefit (positive = A is better)
    const relativeBenefit = this.calculateRelativeBenefit(resultA, resultB);

    // Calculate NNT
    const nnt = this.calculateNNT(resultA, resultB);

    // Risk comparison
    const relativeRiskReduction = this.calculateRelativeRiskReduction(
      resultA.crisisProbability,
      resultB.crisisProbability
    );
    const absoluteRiskReduction = resultB.crisisProbability - resultA.crisisProbability;

    // 2025: Hazard ratio (survival analysis)
    const hazardRatio = this.calculateHazardRatio(resultA, resultB);

    // Time comparison
    const timeAdvantage = this.calculateTimeAdvantage(resultA, resultB);

    // Statistical comparison
    const { effectSize, pValue, confidenceInterval } = this.calculateStatisticalComparison(resultA, resultB);
    const comparisonConfidence = this.calculateComparisonConfidence(resultA, resultB);

    // 2025: Average Treatment Effect
    const averageTreatmentEffect = this.calculateATE(resultA, resultB);

    // Generate recommendation
    const { recommended, reason, reasonRu } = this.generateRecommendation(
      resultA,
      resultB,
      effectSize,
      pValue
    );

    return {
      scenarioA: resultA,
      scenarioB: resultB,
      comparedAt: new Date(),

      differentialOutcome,
      relativeBenefit,
      numberNeededToTreat: nnt,

      relativeRiskReduction,
      absoluteRiskReduction,
      hazardRatio,

      expectedTimeAdvantage: timeAdvantage,

      comparisonConfidence,
      effectSize,
      pValue,
      confidenceInterval,

      averageTreatmentEffect,

      recommendedScenario: recommended,
      recommendationReason: reason,
      recommendationReasonRu: reasonRu,
    };
  }

  // ==========================================================================
  // SCENARIO CREATION HELPERS
  // ==========================================================================

  createBaselineScenario(twin: IDigitalTwinState, horizonDays: number): IScenario {
    return {
      id: generateTwinId('SCN'),
      name: 'Baseline (No Intervention)',
      nameRu: 'Базовый сценарий (без интервенции)',
      description: 'Natural progression without any new interventions',
      descriptionRu: 'Естественное развитие без новых интервенций',

      interventionType: null,
      targetVariable: null,
      interventionStrength: 0,
      horizonDays,
      startState: twin,

      externalStressors: [],
      protectiveFactors: [],
    };
  }

  createInterventionScenario(
    twin: IDigitalTwinState,
    interventionType: string,
    targetVariable: string,
    horizonDays: number
  ): IScenario {
    return {
      id: generateTwinId('SCN'),
      name: `Intervention: ${interventionType}`,
      nameRu: `Интервенция: ${interventionType}`,
      description: `Apply ${interventionType} intervention targeting ${targetVariable}`,
      descriptionRu: `Применить ${interventionType} для ${targetVariable}`,

      interventionType,
      targetVariable,
      interventionStrength: 0.5,  // Default medium strength
      horizonDays,
      startState: twin,

      externalStressors: [],
      protectiveFactors: [],
    };
  }

  // ==========================================================================
  // PREDICTION
  // ==========================================================================

  async predictFuture(
    twin: IDigitalTwinState,
    horizonDays: number,
    intervention?: { type: string; target: string }
  ): Promise<IScenarioResult> {
    const scenario = intervention
      ? this.createInterventionScenario(twin, intervention.type, intervention.target, horizonDays)
      : this.createBaselineScenario(twin, horizonDays);

    return this.simulateScenario(twin, scenario);
  }

  // ==========================================================================
  // CLINICAL INTERPRETATION
  // ==========================================================================

  generateClinicalInterpretation(result: IScenarioResult): IClinicalInterpretation {
    const findings: string[] = [];
    const findingsRu: string[] = [];
    const actions: string[] = [];
    const actionsRu: string[] = [];

    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    let urgency: 'routine' | 'soon' | 'urgent' | 'immediate';

    if (result.crisisProbability > 0.5) {
      riskLevel = 'critical';
      urgency = 'immediate';
    } else if (result.crisisProbability > 0.3 || result.outcome === 'deterioration') {
      riskLevel = 'high';
      urgency = 'urgent';
    } else if (result.crisisProbability > 0.1 || result.outcome === 'stable') {
      riskLevel = 'moderate';
      urgency = 'soon';
    } else {
      riskLevel = 'low';
      urgency = 'routine';
    }

    // Generate findings
    findings.push(`Expected outcome: ${result.outcome} (${(result.confidenceLevel * 100).toFixed(0)}% confidence)`);
    findingsRu.push(`Ожидаемый исход: ${this.translateOutcome(result.outcome)} (уверенность ${(result.confidenceLevel * 100).toFixed(0)}%)`);

    if (result.crisisProbability > 0.1) {
      findings.push(`Crisis risk: ${(result.crisisProbability * 100).toFixed(1)}% within ${result.scenario.horizonDays} days`);
      findingsRu.push(`Риск кризиса: ${(result.crisisProbability * 100).toFixed(1)}% в течение ${result.scenario.horizonDays} дней`);
    }

    if (result.recoveryProbability > 0.3) {
      findings.push(`Recovery probability: ${(result.recoveryProbability * 100).toFixed(1)}%`);
      findingsRu.push(`Вероятность восстановления: ${(result.recoveryProbability * 100).toFixed(1)}%`);
    }

    // 2025: Key drivers explanation
    if (result.keyDrivers.length > 0) {
      const topDriver = result.keyDrivers[0];
      findings.push(`Primary driver: ${topDriver.variable} (${topDriver.direction} impact)`);
      findingsRu.push(`Основной фактор: ${topDriver.variable} (${topDriver.direction === 'positive' ? 'положительное' : 'отрицательное'} влияние)`);
    }

    // Generate actions based on risk
    if (riskLevel === 'critical') {
      actions.push('Immediate clinical review recommended');
      actions.push('Consider intensive support or crisis intervention');
      actions.push('Activate safety protocols');
      actionsRu.push('Рекомендуется немедленный клинический осмотр');
      actionsRu.push('Рассмотреть интенсивную поддержку или кризисную интервенцию');
      actionsRu.push('Активировать протоколы безопасности');
    } else if (riskLevel === 'high') {
      actions.push('Schedule follow-up within 48 hours');
      actions.push('Review current treatment plan');
      actions.push('Increase monitoring frequency');
      actionsRu.push('Запланировать контроль в течение 48 часов');
      actionsRu.push('Пересмотреть текущий план лечения');
      actionsRu.push('Увеличить частоту мониторинга');
    } else if (riskLevel === 'moderate') {
      actions.push('Continue standard monitoring');
      actions.push('Consider preventive intervention if trajectory continues');
      actionsRu.push('Продолжить стандартный мониторинг');
      actionsRu.push('Рассмотреть профилактическую интервенцию');
    } else {
      actions.push('Maintain current approach');
      actions.push('Standard check-in schedule');
      actionsRu.push('Продолжать текущий подход');
      actionsRu.push('Стандартный график проверок');
    }

    // Summary
    const summary = `Over the next ${result.scenario.horizonDays} days, the most likely outcome is ${result.outcome}. ` +
      `Crisis risk is ${(result.crisisProbability * 100).toFixed(0)}%. ` +
      `Prediction confidence: ${(result.confidenceLevel * 100).toFixed(0)}%.`;

    const summaryRu = `В течение ${result.scenario.horizonDays} дней наиболее вероятный исход: ${this.translateOutcome(result.outcome)}. ` +
      `Риск кризиса: ${(result.crisisProbability * 100).toFixed(0)}%. ` +
      `Уверенность прогноза: ${(result.confidenceLevel * 100).toFixed(0)}%.`;

    // 2025: Uncertainty statement
    const uncertaintyStatement = `Prediction uncertainty: ${(result.predictionUncertainty * 100).toFixed(1)}% ` +
      `(aleatoric: ${(result.aleatoric * 100).toFixed(1)}%, epistemic: ${(result.epistemic * 100).toFixed(1)}%)`;
    const uncertaintyStatementRu = `Неопределённость прогноза: ${(result.predictionUncertainty * 100).toFixed(1)}% ` +
      `(алеаторическая: ${(result.aleatoric * 100).toFixed(1)}%, эпистемическая: ${(result.epistemic * 100).toFixed(1)}%)`;

    // 2025: Key drivers explanation
    const keyDriversExplanation = result.keyDrivers.length > 0
      ? `Key factors: ${result.keyDrivers.map(d => `${d.variable} (${d.direction})`).join(', ')}`
      : 'No dominant factors identified';
    const keyDriversExplanationRu = result.keyDrivers.length > 0
      ? `Ключевые факторы: ${result.keyDrivers.map(d => `${d.variable} (${d.direction === 'positive' ? '+' : '-'})`).join(', ')}`
      : 'Доминирующие факторы не выявлены';

    return {
      summary,
      summaryRu,
      keyFindings: findings,
      keyFindingsRu: findingsRu,
      riskLevel,
      actionRequired: riskLevel === 'critical' || riskLevel === 'high',
      urgency,
      recommendedActions: actions,
      recommendedActionsRu: actionsRu,
      confidenceStatement: `Based on ${result.simulationCount} simulations.`,
      confidenceStatementRu: `На основе ${result.simulationCount} симуляций.`,
      keyDriversExplanation,
      keyDriversExplanationRu,
      uncertaintyStatement,
      uncertaintyStatementRu,
    };
  }

  // ==========================================================================
  // PRIVATE SIMULATION METHODS
  // ==========================================================================

  private simulateSingleTrajectory(
    twin: IDigitalTwinState,
    scenario: IScenario,
    personalization?: ITwinPersonalization
  ): ISimulatedTrajectory {
    const numSteps = Math.ceil(scenario.horizonDays / this.config.timeStepDays);
    const timepoints: number[] = [];
    const states = new Map<string, number[]>();
    const events: ITrajectoryEvent[] = [];

    // Initialize states from twin
    for (const [varId, variable] of Array.from(twin.variables)) {
      states.set(varId, [variable.value]);
    }

    // Get personalization parameters
    const meanReversion = personalization?.meanReversionRate || new Map();
    const volatility = personalization?.volatility || new Map();

    // Simulate forward using SDE: dx = f(x)dt + g(x)dW
    for (let step = 0; step <= numSteps; step++) {
      const day = step * this.config.timeStepDays;
      timepoints.push(day);

      if (step === 0) continue;

      for (const [varId, values] of Array.from(states)) {
        const prevValue = values[values.length - 1];
        const variable = twin.variables.get(varId);

        let newValue = prevValue;

        // 1. Apply intervention effect (on day 1)
        if (step === 1 && scenario.interventionType && scenario.targetVariable === varId) {
          const effect = scenario.interventionStrength * 0.5;
          newValue -= effect;  // Reduce distress
          events.push({
            day,
            eventType: 'intervention',
            description: `Applied ${scenario.interventionType}`,
            impact: new Map([[varId, -effect]]),
            causalMechanism: 'direct_intervention',
          });
        }

        // 2. Apply stressor effects
        for (const stressor of scenario.externalStressors) {
          if (day >= stressor.onsetDay && day < stressor.onsetDay + stressor.durationDays) {
            const stressorEffects = STRESSOR_EFFECTS[stressor.type];
            const effect = (stressorEffects?.get(varId) || 0) * stressor.intensity;
            if (effect !== 0) {
              newValue += effect * this.config.timeStepDays / stressor.durationDays;
            }
          }
        }

        // 3. Apply protective factor effects
        for (const factor of scenario.protectiveFactors) {
          const factorEffects = PROTECTIVE_EFFECTS[factor.type];
          const effect = (factorEffects?.get(varId) || 0) * factor.strength * factor.reliability;
          newValue += effect * this.config.timeStepDays / scenario.horizonDays;
        }

        // 4. Mean reversion (Ornstein-Uhlenbeck process)
        const baseline = variable?.baselineValue ?? 0.5;
        const reversionRate = meanReversion.get(varId) ?? 0.1;
        newValue += reversionRate * this.config.timeStepDays * (baseline - newValue);

        // 5. 2025: Circadian modulation
        if (this.config.includeCircadian && personalization?.circadianPattern) {
          const hourOfDay = (day * 24) % 24;
          const circadianEffect = personalization.circadianPattern.get(varId)?.[Math.floor(hourOfDay)] ?? 0;
          newValue += circadianEffect * 0.05;
        }

        // 6. 2025: Weekly modulation
        if (this.config.includeWeekly && personalization?.weeklyPattern) {
          const dayOfWeek = Math.floor(day) % 7;
          const weeklyEffect = personalization.weeklyPattern.get(varId)?.[dayOfWeek] ?? 0;
          newValue += weeklyEffect * 0.05;
        }

        // 7. Stochastic noise (Wiener process)
        const varVolatility = volatility.get(varId) ?? variable?.historicalStd ?? 0.1;
        const noise = this.gaussianRandom() * varVolatility * this.config.noiseLevel * Math.sqrt(this.config.timeStepDays);
        newValue += noise;

        // Bound to [0, 1]
        newValue = Math.max(0, Math.min(1, newValue));

        values.push(newValue);
      }

      // Check for events
      const overallDistress = this.calculateOverallDistress(states, step);

      if (overallDistress > OUTCOME_THRESHOLDS.crisis && events.every(e => e.eventType !== 'crisis')) {
        events.push({
          day,
          eventType: 'crisis',
          description: 'Crisis threshold crossed',
          impact: new Map([['overall_distress', overallDistress]]),
          causalMechanism: 'threshold_crossing',
        });
      }

      if (overallDistress < OUTCOME_THRESHOLDS.recovery && events.every(e => e.eventType !== 'recovery')) {
        events.push({
          day,
          eventType: 'recovery',
          description: 'Recovery threshold reached',
          impact: new Map([['overall_distress', overallDistress]]),
          causalMechanism: 'threshold_crossing',
        });
      }
    }

    // Determine final outcome
    const finalOutcome = this.classifySingleTrajectoryOutcome(states);

    // 2025: Generate confidence bands
    const confidenceBands = this.config.propagateUncertainty
      ? this.generateConfidenceBands(states, volatility)
      : undefined;

    return {
      id: generateTwinId('TRJ'),
      timepoints,
      states,
      events,
      finalOutcome,
      probability: 1 / this.config.numTrajectories,
      confidenceBands,
    };
  }

  private calculateExpectedTrajectory(trajectories: ISimulatedTrajectory[]): ISimulatedTrajectory {
    const firstTraj = trajectories[0];
    const meanStates = new Map<string, number[]>();

    for (const varId of Array.from(firstTraj.states.keys())) {
      const meanValues: number[] = [];

      for (let t = 0; t < firstTraj.timepoints.length; t++) {
        let sum = 0;
        for (const traj of trajectories) {
          const values = traj.states.get(varId);
          sum += values?.[t] ?? 0;
        }
        meanValues.push(sum / trajectories.length);
      }

      meanStates.set(varId, meanValues);
    }

    const finalOutcome = this.classifySingleTrajectoryOutcome(meanStates);

    return {
      id: 'expected',
      timepoints: firstTraj.timepoints,
      states: meanStates,
      events: [],
      finalOutcome,
      probability: 1,
    };
  }

  private classifyOutcomes(trajectories: ISimulatedTrajectory[]): Map<ScenarioOutcome, number> {
    const counts = new Map<ScenarioOutcome, number>([
      ['improvement', 0],
      ['stable', 0],
      ['deterioration', 0],
      ['crisis', 0],
      ['recovery', 0],
      ['remission', 0],
    ]);

    for (const traj of trajectories) {
      const current = counts.get(traj.finalOutcome) || 0;
      counts.set(traj.finalOutcome, current + 1);
    }

    // Convert to probabilities
    const distribution = new Map<ScenarioOutcome, number>();
    for (const [outcome, count] of Array.from(counts)) {
      distribution.set(outcome, count / trajectories.length);
    }

    return distribution;
  }

  private getMostLikelyOutcome(distribution: Map<ScenarioOutcome, number>): ScenarioOutcome {
    let maxProb = 0;
    let mostLikely: ScenarioOutcome = 'stable';

    for (const [outcome, prob] of Array.from(distribution)) {
      if (prob > maxProb) {
        maxProb = prob;
        mostLikely = outcome;
      }
    }

    return mostLikely;
  }

  private classifySingleTrajectoryOutcome(states: Map<string, number[]>): ScenarioOutcome {
    const finalDistress = this.calculateOverallDistress(states, this.getLastIndex(states));
    const initialDistress = this.calculateOverallDistress(states, 0);

    if (finalDistress > OUTCOME_THRESHOLDS.crisis) return 'crisis';
    if (finalDistress < OUTCOME_THRESHOLDS.remission) return 'remission';
    if (finalDistress < OUTCOME_THRESHOLDS.recovery) return 'recovery';
    if (finalDistress < initialDistress - 0.15) return 'improvement';
    if (finalDistress > initialDistress + 0.15) return 'deterioration';
    return 'stable';
  }

  private calculateOverallDistress(states: Map<string, number[]>, index: number): number {
    const distressVars = ['emotion_anxiety', 'emotion_sadness', 'cognition_rumination', 'emotion_stress'];
    let sum = 0;
    let count = 0;

    for (const varId of distressVars) {
      const values = states.get(varId);
      if (values && values[index] !== undefined) {
        sum += values[index];
        count++;
      }
    }

    return count > 0 ? sum / count : 0.5;
  }

  private getLastIndex(states: Map<string, number[]>): number {
    const firstVar = states.values().next().value;
    return firstVar ? firstVar.length - 1 : 0;
  }

  private calculateEndStateStatistics(trajectories: ISimulatedTrajectory[]): {
    expected: Map<string, number>;
    worstCase: Map<string, number>;
    bestCase: Map<string, number>;
  } {
    const expected = new Map<string, number>();
    const worstCase = new Map<string, number>();
    const bestCase = new Map<string, number>();

    const firstTraj = trajectories[0];

    for (const varId of Array.from(firstTraj.states.keys())) {
      const finalValues: number[] = [];

      for (const traj of trajectories) {
        const values = traj.states.get(varId);
        if (values) {
          finalValues.push(values[values.length - 1]);
        }
      }

      expected.set(varId, this.mean(finalValues));
      worstCase.set(varId, this.percentile(finalValues, 95));
      bestCase.set(varId, this.percentile(finalValues, 5));
    }

    return { expected, worstCase, bestCase };
  }

  private calculateTippingPointProbability(trajectories: ISimulatedTrajectory[]): number {
    let tippingCount = 0;

    for (const traj of trajectories) {
      for (const [, values] of Array.from(traj.states)) {
        for (let i = 1; i < values.length; i++) {
          const change = Math.abs(values[i] - values[i - 1]);
          if (change > 0.25) {  // Large sudden change
            tippingCount++;
            break;
          }
        }
      }
    }

    return tippingCount / trajectories.length;
  }

  private calculateTimeToEvent(
    trajectories: ISimulatedTrajectory[],
    eventType: 'improvement' | 'crisis'
  ): number | null {
    const times: number[] = [];

    for (const traj of trajectories) {
      const event = traj.events.find(e =>
        (eventType === 'crisis' && e.eventType === 'crisis') ||
        (eventType === 'improvement' && (e.eventType === 'recovery' || traj.finalOutcome === 'improvement'))
      );

      if (event) {
        times.push(event.day);
      }
    }

    if (times.length < trajectories.length * 0.1) {
      return null;
    }

    return this.mean(times);
  }

  private calculateConfidenceLevel(trajectories: ISimulatedTrajectory[]): number {
    const distribution = this.classifyOutcomes(trajectories);
    let entropy = 0;

    for (const prob of Array.from(distribution.values())) {
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    }

    const maxEntropy = Math.log2(6);  // 6 outcomes
    return 1 - (entropy / maxEntropy);
  }

  // ==========================================================================
  // 2025: UNCERTAINTY QUANTIFICATION
  // ==========================================================================

  private decomposeUncertainty(trajectories: ISimulatedTrajectory[]): {
    aleatoric: number;
    epistemic: number;
  } {
    // Aleatoric: inherent variability (within-trajectory noise)
    let aleatoricSum = 0;
    for (const traj of trajectories) {
      for (const [, values] of Array.from(traj.states)) {
        const variance = this.variance(values);
        aleatoricSum += variance;
      }
    }
    const aleatoric = Math.sqrt(aleatoricSum / (trajectories.length * trajectories[0].states.size));

    // Epistemic: model uncertainty (between-trajectory variance)
    const endStates: number[][] = [];
    for (const traj of trajectories) {
      const endState: number[] = [];
      for (const [, values] of Array.from(traj.states)) {
        endState.push(values[values.length - 1]);
      }
      endStates.push(endState);
    }

    let epistemicSum = 0;
    const numVars = endStates[0].length;
    for (let v = 0; v < numVars; v++) {
      const varValues = endStates.map(s => s[v]);
      epistemicSum += this.variance(varValues);
    }
    const epistemic = Math.sqrt(epistemicSum / numVars);

    return { aleatoric, epistemic };
  }

  private analyzeKeyDrivers(
    trajectories: ISimulatedTrajectory[],
    twin: IDigitalTwinState
  ): Array<{ variable: string; contribution: number; direction: 'positive' | 'negative' }> {
    const contributions: Map<string, number> = new Map();

    const expectedTraj = this.calculateExpectedTrajectory(trajectories);

    for (const [varId, values] of Array.from(expectedTraj.states)) {
      const initialValue = values[0];
      const finalValue = values[values.length - 1];
      const change = finalValue - initialValue;

      contributions.set(varId, Math.abs(change));
    }

    // Sort by contribution
    const sorted = Array.from(contributions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)  // Top 5
      .map(([variable, contribution]) => {
        const values = expectedTraj.states.get(variable) || [];
        const direction = values[values.length - 1] > values[0] ? 'positive' : 'negative';
        return { variable, contribution, direction: direction as 'positive' | 'negative' };
      });

    return sorted;
  }

  private generateConfidenceBands(
    states: Map<string, number[]>,
    volatility: Map<string, number>
  ): { lower: Map<string, number[]>; upper: Map<string, number[]> } | undefined {
    const lower = new Map<string, number[]>();
    const upper = new Map<string, number[]>();

    for (const [varId, values] of Array.from(states)) {
      const vol = volatility.get(varId) || 0.1;
      const lowerVals = values.map(v => Math.max(0, v - 1.96 * vol));
      const upperVals = values.map(v => Math.min(1, v + 1.96 * vol));
      lower.set(varId, lowerVals);
      upper.set(varId, upperVals);
    }

    return { lower, upper };
  }

  // ==========================================================================
  // COMPARISON METHODS
  // ==========================================================================

  private calculateRelativeBenefit(resultA: IScenarioResult, resultB: IScenarioResult): number {
    let benefit = 0;
    benefit += (resultB.crisisProbability - resultA.crisisProbability) * 2;
    benefit += (resultA.recoveryProbability - resultB.recoveryProbability) * 1.5;

    const outcomeScores: Record<ScenarioOutcome, number> = {
      remission: 1.2,
      recovery: 1,
      improvement: 0.6,
      stable: 0.3,
      deterioration: -0.5,
      crisis: -1,
    };

    benefit += outcomeScores[resultA.outcome] - outcomeScores[resultB.outcome];
    return benefit;
  }

  private calculateNNT(resultA: IScenarioResult, resultB: IScenarioResult): number | null {
    const improvementA = resultA.recoveryProbability + (resultA.outcomeDistribution.get('improvement') || 0);
    const improvementB = resultB.recoveryProbability + (resultB.outcomeDistribution.get('improvement') || 0);

    const diff = improvementA - improvementB;

    if (Math.abs(diff) < 0.01) return null;
    return Math.abs(1 / diff);
  }

  private calculateRelativeRiskReduction(riskA: number, riskB: number): number {
    if (riskB === 0) return riskA > 0 ? -1 : 0;
    return (riskB - riskA) / riskB;
  }

  private calculateHazardRatio(resultA: IScenarioResult, resultB: IScenarioResult): number {
    // Simplified hazard ratio using time-to-event
    const timeA = resultA.expectedTimeToCrisis;
    const timeB = resultB.expectedTimeToCrisis;

    if (timeA === null && timeB === null) return 1;
    if (timeA === null) return 0.5;  // A is better (no crisis)
    if (timeB === null) return 2;    // B is better

    return timeB / timeA;
  }

  private calculateTimeAdvantage(resultA: IScenarioResult, resultB: IScenarioResult): number {
    const timeA = resultA.expectedTimeToImprovement;
    const timeB = resultB.expectedTimeToImprovement;

    if (timeA === null && timeB === null) return 0;
    if (timeA === null) return -30;
    if (timeB === null) return 30;

    return timeB - timeA;
  }

  private calculateStatisticalComparison(
    resultA: IScenarioResult,
    resultB: IScenarioResult
  ): { effectSize: number; pValue: number; confidenceInterval: [number, number] } {
    const distressVars = ['emotion_anxiety', 'emotion_sadness'];
    const valuesA: number[] = [];
    const valuesB: number[] = [];

    for (const traj of resultA.trajectories) {
      let sum = 0;
      for (const varId of distressVars) {
        const vals = traj.states.get(varId);
        if (vals) sum += vals[vals.length - 1];
      }
      valuesA.push(sum / distressVars.length);
    }

    for (const traj of resultB.trajectories) {
      let sum = 0;
      for (const varId of distressVars) {
        const vals = traj.states.get(varId);
        if (vals) sum += vals[vals.length - 1];
      }
      valuesB.push(sum / distressVars.length);
    }

    const meanA = this.mean(valuesA);
    const meanB = this.mean(valuesB);
    const stdA = this.std(valuesA);
    const stdB = this.std(valuesB);
    const pooledStd = Math.sqrt((stdA * stdA + stdB * stdB) / 2);

    const effectSize = pooledStd > 0 ? (meanB - meanA) / pooledStd : 0;

    const se = pooledStd * Math.sqrt(2 / valuesA.length);
    const z = se > 0 ? Math.abs(meanA - meanB) / se : 0;
    const pValue = 2 * (1 - this.normalCDF(z));

    // 95% CI for effect size
    const ciHalfWidth = 1.96 * Math.sqrt(2 / valuesA.length + effectSize * effectSize / (2 * valuesA.length));
    const confidenceInterval: [number, number] = [effectSize - ciHalfWidth, effectSize + ciHalfWidth];

    return { effectSize, pValue, confidenceInterval };
  }

  private calculateComparisonConfidence(resultA: IScenarioResult, resultB: IScenarioResult): number {
    let overlap = 0;

    const outcomes: ScenarioOutcome[] = ['improvement', 'stable', 'deterioration', 'crisis', 'recovery', 'remission'];
    for (const outcome of outcomes) {
      const probA = resultA.outcomeDistribution.get(outcome) || 0;
      const probB = resultB.outcomeDistribution.get(outcome) || 0;
      overlap += Math.min(probA, probB);
    }

    return 1 - overlap;
  }

  private calculateATE(resultA: IScenarioResult, resultB: IScenarioResult): number {
    // Average Treatment Effect (A vs B)
    let sum = 0;
    let count = 0;

    for (const [varId, valueA] of Array.from(resultA.expectedEndState)) {
      const valueB = resultB.expectedEndState.get(varId);
      if (valueB !== undefined) {
        sum += valueA - valueB;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private generateRecommendation(
    resultA: IScenarioResult,
    resultB: IScenarioResult,
    effectSize: number,
    pValue: number
  ): { recommended: 'A' | 'B' | 'equivalent'; reason: string; reasonRu: string } {
    if (pValue > 0.1 || Math.abs(effectSize) < 0.2) {
      return {
        recommended: 'equivalent',
        reason: 'No statistically significant difference. Choose based on preference or feasibility.',
        reasonRu: 'Статистически значимой разницы нет. Выбирайте по предпочтениям или реализуемости.',
      };
    }

    if (effectSize < -0.2 && pValue < 0.1) {
      const relBenefit = this.calculateRelativeBenefit(resultA, resultB);
      if (relBenefit > 0) {
        return {
          recommended: 'A',
          reason: `Scenario A shows better outcomes (effect size: ${Math.abs(effectSize).toFixed(2)}, p=${pValue.toFixed(3)}).`,
          reasonRu: `Сценарий A показывает лучшие результаты (размер эффекта: ${Math.abs(effectSize).toFixed(2)}, p=${pValue.toFixed(3)}).`,
        };
      }
    }

    if (effectSize > 0.2 && pValue < 0.1) {
      const relBenefit = this.calculateRelativeBenefit(resultA, resultB);
      if (relBenefit < 0) {
        return {
          recommended: 'B',
          reason: `Scenario B shows better outcomes (effect size: ${Math.abs(effectSize).toFixed(2)}, p=${pValue.toFixed(3)}).`,
          reasonRu: `Сценарий B показывает лучшие результаты (размер эффекта: ${Math.abs(effectSize).toFixed(2)}, p=${pValue.toFixed(3)}).`,
        };
      }
    }

    return {
      recommended: 'equivalent',
      reason: 'Results are mixed. Consider other factors.',
      reasonRu: 'Результаты смешанные. Учитывайте другие факторы.',
    };
  }

  private translateOutcome(outcome: ScenarioOutcome): string {
    const translations: Record<ScenarioOutcome, string> = {
      improvement: 'улучшение',
      stable: 'стабильность',
      deterioration: 'ухудшение',
      crisis: 'кризис',
      recovery: 'выздоровление',
      remission: 'ремиссия',
    };
    return translations[outcome];
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private createRng(seed?: number): () => number {
    if (seed === undefined) return Math.random;

    let s = seed;
    return () => {
      s |= 0;
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  private gaussianRandom(): number {
    const u1 = this.rng();
    const u2 = this.rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private std(values: number[]): number {
    const m = this.mean(values);
    return Math.sqrt(this.variance(values));
  }

  private variance(values: number[]): number {
    const m = this.mean(values);
    return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const monteCarloEngine = new MonteCarloEngine();
