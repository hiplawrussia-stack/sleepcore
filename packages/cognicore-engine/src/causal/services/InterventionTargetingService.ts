/**
 * 🎯 INTERVENTION TARGETING SERVICE
 * ==================================
 * Pearl's Do-Calculus for Optimal Intervention Selection
 *
 * Implements:
 * 1. Backdoor Criterion - Confounding adjustment
 * 2. Front-door Criterion - Mediated effects
 * 3. Causal Effect Estimation - ATE computation
 * 4. Counterfactual Reasoning - What-if analysis
 * 5. Monte Carlo Simulation - Trajectory prediction
 *
 * Scientific Foundation (2024-2025):
 * - Pearl (2009): Causality - Models, Reasoning, and Inference
 * - DoWhy (Microsoft): Causal inference framework
 * - EconML (Microsoft): Heterogeneous treatment effects
 * - Causal Forest (Wager & Athey, 2018)
 * - CATE estimation for personalized interventions
 *
 * Integration Points:
 * - InterventionOptimizer (Phase 3.4): Provides causal targets
 * - StateVector (Phase 3.1): Observation data
 * - TemporalEchoEngine (Phase 3.2): Time-series patterns
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import {
  ICausalGraph,
  ICausalNode,
  ICausalEdge,
  ICausalObservation,
  IInterventionTarget,
  IInterventionTargetingService,
  IInterventionConstraints,
  IInterventionSimulation,
  ISimulatedTrajectory,
  IDoOperatorResult,
  INodeEffect,
  CausalInterventionType,
} from '../interfaces/ICausalGraph';

// ============================================================================
// INTERVENTION MAPPINGS
// ============================================================================

/**
 * Mapping from node IDs to available intervention types
 * Based on clinical best practices
 */
const NODE_INTERVENTION_MAP: Record<string, CausalInterventionType[]> = {
  // Cognitions - can be reframed
  cognition_rumination: ['cognitive_reframe', 'activity_schedule', 'psychoeducation'],
  cognition_catastrophizing: ['cognitive_reframe', 'relaxation', 'psychoeducation'],
  cognition_self_criticism: ['cognitive_reframe', 'psychoeducation'],

  // Behaviors - can be changed
  behavior_withdrawal: ['social_prompt', 'activity_schedule', 'challenge'],
  behavior_avoidance: ['challenge', 'activity_schedule', 'psychoeducation'],
  behavior_substance_use: ['challenge', 'relaxation', 'crisis_support'],

  // Physiological - can be improved
  physio_sleep_quality: ['relaxation', 'psychoeducation', 'activity_schedule'],
  physio_energy: ['activity_schedule', 'challenge'],

  // Protective - can be strengthened
  protective_social_support: ['social_prompt', 'challenge'],
  protective_coping_skills: ['psychoeducation', 'challenge', 'cognitive_reframe'],
};

/**
 * Intervention engagement requirements (0-1)
 * Higher = more user effort required
 */
const INTERVENTION_ENGAGEMENT: Record<CausalInterventionType, number> = {
  psychoeducation: 0.2,      // Low - just reading
  relaxation: 0.3,           // Low-medium - guided exercise
  cognitive_reframe: 0.5,    // Medium - active thinking
  social_prompt: 0.6,        // Medium-high - requires reaching out
  activity_schedule: 0.5,    // Medium - planning + doing
  challenge: 0.7,            // High - sustained effort
  crisis_support: 0.1,       // Low - passive receipt
};

/**
 * Expected time to effect for interventions (hours)
 */
const INTERVENTION_TIME_TO_EFFECT: Record<CausalInterventionType, number> = {
  crisis_support: 0.5,       // Immediate
  relaxation: 1,             // Quick
  psychoeducation: 24,       // Takes time to internalize
  cognitive_reframe: 12,     // Medium-term
  social_prompt: 6,          // After social contact
  activity_schedule: 48,     // Needs multiple instances
  challenge: 72,             // Gradual behavioral change
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Intervention Targeting Service
 * Implements Pearl's do-calculus for optimal intervention selection
 */
export class InterventionTargetingService implements IInterventionTargetingService {

  // ============================================================================
  // TARGET SELECTION
  // ============================================================================

  async findOptimalTarget(
    graph: ICausalGraph,
    goalNodeId: string,
    constraints?: IInterventionConstraints
  ): Promise<IInterventionTarget> {
    const targets = await this.rankTargets(graph, goalNodeId, 10);

    if (constraints) {
      const filtered = targets.filter(t => {
        if (constraints.excludedNodes?.includes(t.nodeId)) return false;
        if (constraints.maxComplexity !== undefined &&
            t.requiredUserEngagement > constraints.maxComplexity) return false;
        if (constraints.timeConstraint !== undefined &&
            t.estimatedTimeToEffect > constraints.timeConstraint) return false;
        if (constraints.preferredTypes?.length &&
            !constraints.preferredTypes.includes(t.interventionType)) return false;
        return true;
      });

      if (filtered.length > 0) return filtered[0];
    }

    if (targets.length === 0) {
      throw new Error(`No intervention targets found for goal ${goalNodeId}`);
    }

    return targets[0];
  }

  async rankTargets(
    graph: ICausalGraph,
    goalNodeId: string,
    topK: number = 5
  ): Promise<IInterventionTarget[]> {
    const goalNode = graph.nodes.get(goalNodeId);
    if (!goalNode) {
      throw new Error(`Goal node ${goalNodeId} not found`);
    }

    const candidates: IInterventionTarget[] = [];
    const ancestors = this.getAncestors(graph, goalNodeId);

    // Also include goal itself if manipulable
    if (goalNode.isManipulable) {
      ancestors.add(goalNodeId);
    }

    for (const candidateId of ancestors) {
      const candidateNode = graph.nodes.get(candidateId);
      if (!candidateNode || !candidateNode.isManipulable) continue;

      const interventionTypes = NODE_INTERVENTION_MAP[candidateId] || ['psychoeducation'];

      for (const interventionType of interventionTypes) {
        const doResult = await this.estimateDoEffect(
          graph,
          candidateId,
          goalNodeId,
          1.0
        );

        const affectedNodes = await this.calculateAffectedNodes(graph, candidateId);

        // Determine target value based on goal
        const isNegativeTarget = goalNode.metadata.valence !== undefined ?
          goalNode.metadata.valence < 0 : false;
        const targetValue = isNegativeTarget ?
          Math.max(0, candidateNode.value - 0.3) :
          Math.min(1, candidateNode.value + 0.3);

        const target: IInterventionTarget = {
          nodeId: candidateId,
          interventionType,
          targetValue,

          expectedDirectEffect: this.getDirectEffect(graph, candidateId, goalNodeId),
          expectedTotalEffect: doResult.averageTreatmentEffect,
          affectedNodes,

          feasibilityScore: this.calculateFeasibility(candidateNode, interventionType),
          estimatedTimeToEffect: INTERVENTION_TIME_TO_EFFECT[interventionType],
          requiredUserEngagement: INTERVENTION_ENGAGEMENT[interventionType],

          riskOfBackfire: this.calculateBackfireRisk(graph, candidateId, goalNodeId),
          contraindications: this.getContraindications(candidateNode, interventionType),
        };

        candidates.push(target);
      }
    }

    // Score and rank
    const scored = candidates.map(c => ({
      target: c,
      score: this.scoreTarget(c, goalNode),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.target);
  }

  // ============================================================================
  // DO-CALCULUS
  // ============================================================================

  async estimateDoEffect(
    graph: ICausalGraph,
    interventionNodeId: string,
    targetNodeId: string,
    interventionValue: number
  ): Promise<IDoOperatorResult> {
    // Check identifiability using backdoor criterion
    const backdoorPaths = this.findBackdoorPaths(graph, interventionNodeId, targetNodeId);
    const adjustmentSet = this.findAdjustmentSet(graph, interventionNodeId, targetNodeId);

    const isIdentifiable = adjustmentSet !== null;

    let ate = 0;
    if (isIdentifiable) {
      // Backdoor adjustment formula
      ate = this.calculateTotalCausalEffect(graph, interventionNodeId, targetNodeId);
    } else {
      // Try front-door criterion
      const frontDoorPath = this.findFrontDoorPath(graph, interventionNodeId, targetNodeId);

      if (frontDoorPath) {
        ate = this.calculateFrontDoorEffect(graph, frontDoorPath);
      } else {
        // Fall back to correlation
        ate = this.getDirectEffect(graph, interventionNodeId, targetNodeId);
      }
    }

    ate *= interventionValue;
    const uncertainty = Math.abs(ate) * 0.3;

    return {
      intervention: `do(${interventionNodeId} = ${interventionValue})`,
      targetNode: targetNodeId,

      averageTreatmentEffect: ate,
      conditionalATE: new Map(),

      effectLowerBound: ate - uncertainty,
      effectUpperBound: ate + uncertainty,

      isIdentifiable,
      adjustmentSet: adjustmentSet || [],
      frontDoorPath: this.findFrontDoorPath(graph, interventionNodeId, targetNodeId) || undefined,
      backDoorPaths: backdoorPaths,
    };
  }

  // ============================================================================
  // SIMULATION
  // ============================================================================

  async simulateIntervention(
    graph: ICausalGraph,
    intervention: IInterventionTarget
  ): Promise<IInterventionSimulation> {
    const numTrajectories = 100;
    const timeHorizon = 72; // hours
    const timeStep = 6; // hours

    const timepoints = Array.from(
      { length: Math.ceil(timeHorizon / timeStep) + 1 },
      (_, i) => i * timeStep
    );

    const trajectories: ISimulatedTrajectory[] = [];

    // Monte Carlo simulation
    for (let i = 0; i < numTrajectories; i++) {
      const trajectory = this.simulateSingleTrajectory(
        graph,
        intervention,
        timepoints
      );
      trajectories.push(trajectory);
    }

    // Aggregate outcomes
    const expectedOutcome = new Map<string, number>();
    const worstCaseOutcome = new Map<string, number>();
    const bestCaseOutcome = new Map<string, number>();

    for (const nodeId of graph.nodes.keys()) {
      const finalValues = trajectories.map(t => {
        const values = t.nodeValues.get(nodeId);
        return values ? values[values.length - 1] : 0;
      });

      expectedOutcome.set(nodeId, this.mean(finalValues));
      worstCaseOutcome.set(nodeId, this.percentile(finalValues, 10));
      bestCaseOutcome.set(nodeId, this.percentile(finalValues, 90));
    }

    // Calculate success probability
    const targetNode = graph.nodes.get(intervention.nodeId);
    const targetFinalValues = trajectories.map(t => {
      const values = t.nodeValues.get(intervention.nodeId);
      return values ? values[values.length - 1] : 0;
    });

    const baseline = targetNode?.value ?? 0.5;
    const isNegativeTarget = (targetNode?.metadata?.valence ?? 0) < 0;

    let successCount = 0;
    for (const finalValue of targetFinalValues) {
      if (isNegativeTarget && finalValue < baseline) successCount++;
      else if (!isNegativeTarget && finalValue > baseline) successCount++;
    }

    return {
      intervention,
      trajectories,
      successProbability: successCount / numTrajectories,
      expectedOutcome,
      worstCaseOutcome,
      bestCaseOutcome,
    };
  }

  // ============================================================================
  // COUNTERFACTUALS
  // ============================================================================

  async computeCounterfactual(
    graph: ICausalGraph,
    observation: ICausalObservation,
    hypotheticalChange: Map<string, number>
  ): Promise<Map<string, number>> {
    // Step 1: Abduction - infer exogenous variables
    const exogenous = this.inferExogenous(graph, observation);

    // Step 2: Action - modify values
    const modifiedValues = new Map(observation.variables);
    for (const [nodeId, value] of hypotheticalChange) {
      modifiedValues.set(nodeId, value);
    }

    // Step 3: Prediction - propagate through graph
    const result = new Map<string, number>();

    for (const nodeId of graph.topologicalOrder) {
      if (hypotheticalChange.has(nodeId)) {
        result.set(nodeId, hypotheticalChange.get(nodeId)!);
      } else {
        const parents = graph.reverseAdjacency.get(nodeId) || [];

        if (parents.length === 0) {
          const node = graph.nodes.get(nodeId);
          result.set(nodeId,
            (observation.variables.get(nodeId) ?? 0) + (exogenous.get(nodeId) ?? 0)
          );
        } else {
          let value = exogenous.get(nodeId) ?? 0;

          for (const parentId of parents) {
            const edge = graph.edges.get(`${parentId}->${nodeId}`);
            const parentValue = result.get(parentId) ??
              observation.variables.get(parentId) ?? 0;

            if (edge) {
              value += edge.strength * parentValue;
            }
          }

          result.set(nodeId, Math.max(0, Math.min(1, value)));
        }
      }
    }

    return result;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getAncestors(graph: ICausalGraph, nodeId: string): Set<string> {
    const ancestors = new Set<string>();
    const visited = new Set<string>();
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const parents = graph.reverseAdjacency.get(current) || [];

      for (const parent of parents) {
        ancestors.add(parent);
        stack.push(parent);
      }
    }

    return ancestors;
  }

  private getDescendants(graph: ICausalGraph, nodeId: string): Set<string> {
    const descendants = new Set<string>();
    const visited = new Set<string>();
    const stack = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const children = graph.adjacencyList.get(current) || [];

      for (const child of children) {
        descendants.add(child);
        stack.push(child);
      }
    }

    return descendants;
  }

  private getDirectEffect(graph: ICausalGraph, sourceId: string, targetId: string): number {
    const edge = graph.edges.get(`${sourceId}->${targetId}`);
    return edge?.strength ?? 0;
  }

  private calculateTotalCausalEffect(
    graph: ICausalGraph,
    sourceId: string,
    targetId: string
  ): number {
    const paths = this.findAllDirectedPaths(graph, sourceId, targetId);
    let totalEffect = 0;

    for (const path of paths) {
      let pathEffect = 1;

      for (let i = 0; i < path.length - 1; i++) {
        const edge = graph.edges.get(`${path[i]}->${path[i + 1]}`);
        pathEffect *= edge?.strength ?? 0;
      }

      totalEffect += pathEffect;
    }

    return totalEffect;
  }

  private findAllDirectedPaths(
    graph: ICausalGraph,
    sourceId: string,
    targetId: string,
    maxLength: number = 5
  ): string[][] {
    const paths: string[][] = [];

    const dfs = (current: string, path: string[]): void => {
      if (path.length > maxLength) return;

      if (current === targetId) {
        paths.push([...path]);
        return;
      }

      const children = graph.adjacencyList.get(current) || [];

      for (const child of children) {
        if (!path.includes(child)) {
          path.push(child);
          dfs(child, path);
          path.pop();
        }
      }
    };

    dfs(sourceId, [sourceId]);
    return paths;
  }

  private findBackdoorPaths(
    graph: ICausalGraph,
    sourceId: string,
    targetId: string
  ): string[][] {
    const backdoorPaths: string[][] = [];
    const parents = graph.reverseAdjacency.get(sourceId) || [];

    for (const parent of parents) {
      const paths = this.findAllUndirectedPaths(graph, parent, targetId, new Set([sourceId]));
      for (const path of paths) {
        backdoorPaths.push([sourceId, ...path]);
      }
    }

    return backdoorPaths;
  }

  private findAllUndirectedPaths(
    graph: ICausalGraph,
    sourceId: string,
    targetId: string,
    blocked: Set<string>,
    maxLength: number = 5
  ): string[][] {
    const paths: string[][] = [];

    const dfs = (current: string, path: string[]): void => {
      if (path.length > maxLength) return;

      if (current === targetId) {
        paths.push([...path]);
        return;
      }

      const children = graph.adjacencyList.get(current) || [];
      const parents = graph.reverseAdjacency.get(current) || [];
      const neighbors = [...new Set([...children, ...parents])];

      for (const neighbor of neighbors) {
        if (!path.includes(neighbor) && !blocked.has(neighbor)) {
          path.push(neighbor);
          dfs(neighbor, path);
          path.pop();
        }
      }
    };

    dfs(sourceId, [sourceId]);
    return paths;
  }

  private findAdjustmentSet(
    graph: ICausalGraph,
    sourceId: string,
    targetId: string
  ): string[] | null {
    const backdoorPaths = this.findBackdoorPaths(graph, sourceId, targetId);

    if (backdoorPaths.length === 0) {
      return []; // No confounding
    }

    const sourceParents = graph.reverseAdjacency.get(sourceId) || [];
    const sourceDescendants = this.getDescendants(graph, sourceId);

    const adjustmentSet = sourceParents.filter(p => !sourceDescendants.has(p));

    // Verify blocking
    const blocked = new Set(adjustmentSet);
    blocked.add(sourceId);

    for (const path of backdoorPaths) {
      let pathBlocked = false;

      for (const node of path.slice(1, -1)) {
        if (blocked.has(node)) {
          pathBlocked = true;
          break;
        }
      }

      if (!pathBlocked) {
        return null;
      }
    }

    return adjustmentSet;
  }

  private findFrontDoorPath(
    graph: ICausalGraph,
    sourceId: string,
    targetId: string
  ): string[] | null {
    const children = graph.adjacencyList.get(sourceId) || [];

    for (const mediator of children) {
      const mediatorChildren = graph.adjacencyList.get(mediator) || [];

      if (mediatorChildren.includes(targetId)) {
        const mediatorParents = graph.reverseAdjacency.get(mediator) || [];

        if (mediatorParents.length === 1 && mediatorParents[0] === sourceId) {
          return [sourceId, mediator, targetId];
        }
      }
    }

    return null;
  }

  private calculateFrontDoorEffect(graph: ICausalGraph, path: string[]): number {
    let effect = 1;

    for (let i = 0; i < path.length - 1; i++) {
      const edge = graph.edges.get(`${path[i]}->${path[i + 1]}`);
      effect *= edge?.strength ?? 0;
    }

    return effect;
  }

  private async calculateAffectedNodes(
    graph: ICausalGraph,
    interventionNodeId: string
  ): Promise<INodeEffect[]> {
    const descendants = this.getDescendants(graph, interventionNodeId);
    const effects: INodeEffect[] = [];

    for (const descendantId of descendants) {
      const paths = this.findAllDirectedPaths(graph, interventionNodeId, descendantId);

      if (paths.length === 0) continue;

      let totalEffect = 0;
      let minPathLength = Infinity;

      for (const path of paths) {
        let pathEffect = 1;

        for (let i = 0; i < path.length - 1; i++) {
          const edge = graph.edges.get(`${path[i]}->${path[i + 1]}`);
          pathEffect *= edge?.strength ?? 0;
        }

        totalEffect += pathEffect;
        minPathLength = Math.min(minPathLength, path.length - 1);
      }

      let timeToEffect = 0;
      const shortestPath = paths.reduce((a, b) => a.length < b.length ? a : b);

      for (let i = 0; i < shortestPath.length - 1; i++) {
        const edge = graph.edges.get(`${shortestPath[i]}->${shortestPath[i + 1]}`);
        timeToEffect += edge?.peakLagHours ?? 6;
      }

      effects.push({
        nodeId: descendantId,
        expectedChange: totalEffect,
        probability: Math.min(1, Math.abs(totalEffect) * 2),
        timeToEffect,
        pathLength: minPathLength,
      });
    }

    return effects.sort((a, b) => Math.abs(b.expectedChange) - Math.abs(a.expectedChange));
  }

  private calculateFeasibility(
    node: ICausalNode,
    interventionType: CausalInterventionType
  ): number {
    let feasibility = 1.0;

    if (!node.isManipulable) {
      feasibility *= 0.3;
    }

    feasibility *= (1 - node.volatility * 0.3);

    const engagement = INTERVENTION_ENGAGEMENT[interventionType];
    feasibility *= (1 - engagement * 0.2);

    return Math.max(0.1, feasibility);
  }

  private calculateBackfireRisk(
    graph: ICausalGraph,
    interventionNodeId: string,
    goalNodeId: string
  ): number {
    let risk = 0;

    const directEffect = this.getDirectEffect(graph, interventionNodeId, goalNodeId);
    if (directEffect < 0) {
      risk += 0.3;
    }

    const paths = this.findAllDirectedPaths(graph, interventionNodeId, goalNodeId);
    const pathSigns = paths.map(path => {
      let sign = 1;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = graph.edges.get(`${path[i]}->${path[i + 1]}`);
        if (edge && edge.strength < 0) sign *= -1;
      }
      return sign;
    });

    const hasPositive = pathSigns.includes(1);
    const hasNegative = pathSigns.includes(-1);
    if (hasPositive && hasNegative) {
      risk += 0.3;
    }

    const reversePath = graph.edges.has(`${goalNodeId}->${interventionNodeId}`);
    if (reversePath) {
      risk += 0.2;
    }

    return Math.min(1, risk);
  }

  private getContraindications(
    node: ICausalNode,
    interventionType: CausalInterventionType
  ): string[] {
    const contraindications: string[] = [];

    if (node.value > 0.8 && node.type === 'emotion') {
      if (interventionType === 'challenge') {
        contraindications.push('High emotional intensity - avoid demanding challenges');
      }
    }

    if (node.id === 'physio_energy' && node.value < 0.3) {
      if (interventionType === 'activity_schedule') {
        contraindications.push('Low energy - start with less demanding activities');
      }
    }

    if (node.id === 'behavior_avoidance' && node.value > 0.7) {
      if (interventionType === 'social_prompt') {
        contraindications.push('High avoidance - use gradual exposure');
      }
    }

    return contraindications;
  }

  private scoreTarget(target: IInterventionTarget, goalNode: ICausalNode): number {
    const weights = {
      expectedEffect: 0.35,
      feasibility: 0.25,
      timeToEffect: 0.15,
      engagement: 0.15,
      backfireRisk: 0.10,
    };

    let score = 0;

    score += weights.expectedEffect * Math.min(1, Math.abs(target.expectedTotalEffect));
    score += weights.feasibility * target.feasibilityScore;
    score += weights.timeToEffect * (1 - target.estimatedTimeToEffect / 72);
    score += weights.engagement * (1 - target.requiredUserEngagement);
    score += weights.backfireRisk * (1 - target.riskOfBackfire);

    return score;
  }

  private simulateSingleTrajectory(
    graph: ICausalGraph,
    intervention: IInterventionTarget,
    timepoints: number[]
  ): ISimulatedTrajectory {
    const nodeValues = new Map<string, number[]>();

    for (const [nodeId, node] of graph.nodes) {
      nodeValues.set(nodeId, [node.value]);
    }

    for (let t = 1; t < timepoints.length; t++) {
      const dt = timepoints[t] - timepoints[t - 1];

      for (const nodeId of graph.topologicalOrder) {
        const node = graph.nodes.get(nodeId)!;
        const prevValues = nodeValues.get(nodeId)!;
        const prevValue = prevValues[prevValues.length - 1];

        let newValue = prevValue;

        // Apply intervention at t=0
        if (nodeId === intervention.nodeId && t === 1) {
          const effectMagnitude = intervention.targetValue - node.value;
          newValue += effectMagnitude * 0.7;
        }

        // Propagate from parents
        const parents = graph.reverseAdjacency.get(nodeId) || [];
        for (const parentId of parents) {
          const edge = graph.edges.get(`${parentId}->${nodeId}`);
          const parentValues = nodeValues.get(parentId)!;
          const parentPrev = parentValues[parentValues.length - 1];
          const parentPrevPrev = parentValues.length > 1 ?
            parentValues[parentValues.length - 2] : parentPrev;

          if (edge) {
            const parentChange = parentPrev - parentPrevPrev;
            const lagFactor = Math.exp(-dt / (edge.peakLagHours || 6));
            newValue += edge.strength * parentChange * (1 - lagFactor);
          }
        }

        // Add noise
        const noise = (Math.random() - 0.5) * node.volatility * 0.1;
        newValue += noise;

        // Mean reversion
        const reversionRate = 0.1 * (dt / 24);
        newValue += reversionRate * (node.baselineValue - newValue);

        newValue = Math.max(0, Math.min(1, newValue));
        prevValues.push(newValue);
      }
    }

    return {
      timepoints,
      nodeValues,
      probability: 1 / 100,
    };
  }

  private inferExogenous(
    graph: ICausalGraph,
    observation: ICausalObservation
  ): Map<string, number> {
    const exogenous = new Map<string, number>();

    for (const nodeId of graph.topologicalOrder) {
      const observedValue = observation.variables.get(nodeId) ?? 0;
      const parents = graph.reverseAdjacency.get(nodeId) || [];

      if (parents.length === 0) {
        const node = graph.nodes.get(nodeId);
        exogenous.set(nodeId, observedValue - (node?.baselineValue ?? 0.5));
      } else {
        let predicted = 0;

        for (const parentId of parents) {
          const edge = graph.edges.get(`${parentId}->${nodeId}`);
          const parentValue = observation.variables.get(parentId) ?? 0;

          if (edge) {
            predicted += edge.strength * parentValue;
          }
        }

        exogenous.set(nodeId, observedValue - predicted);
      }
    }

    return exogenous;
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }
}

/**
 * Factory function for creating InterventionTargetingService
 */
export function createInterventionTargetingService(): IInterventionTargetingService {
  return new InterventionTargetingService();
}
