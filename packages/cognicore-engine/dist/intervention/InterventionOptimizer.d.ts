/**
 * 🎯 INTERVENTION OPTIMIZATION ENGINE - IMPLEMENTATION
 * ====================================================
 * Phase 3.4: Multi-Armed Bandit & Reinforcement Learning
 * for Optimal Intervention Selection
 *
 * Scientific Foundation (2024-2025):
 * - CAREForMe (MOBILESoft 2024) - Contextual MAB for mental health
 * - DIAMANTE Trial (JMIR 2024) - RL for depression, 19% improvement
 * - StayWell Trial (npj 2025) - CBT/DBT with RL, 25% depression reduction
 * - IntelligentPooling - Thompson Sampling for mHealth
 * - MRT Design (HeartSteps) - 210 randomizations per participant
 * - JITAI Framework - Just-In-Time Adaptive Interventions
 *
 * Key Algorithms Implemented:
 * - Thompson Sampling with Beta/Normal conjugate priors
 * - Contextual Bandits with LinUCB-style updates
 * - Reward Shaping for sparse healthcare outcomes
 * - Exploration/Exploitation balance
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
import { IInterventionOptimizer, IIntervention, IInterventionSelection, IContextualFeatures, IInterventionOutcome, IRewardSignal, IBanditArm, IUserInterventionProfile, IOptimizerConfig, IOptimizerState, IGlobalStats, DecisionPointType, CreateInterventionOptimizer } from './IInterventionOptimizer';
/**
 * 🎯 Intervention Optimization Engine
 *
 * Implements Multi-Armed Bandit + Contextual Bandit + Reinforcement Learning
 * for optimal intervention selection in mental health context
 */
export declare class InterventionOptimizer implements IInterventionOptimizer {
    private config;
    private interventions;
    private arms;
    private userProfiles;
    private decisionPoints;
    private pendingOutcomes;
    private globalStats;
    private crisisIntervention;
    constructor(config?: Partial<IOptimizerConfig>);
    /**
     * Initialize global statistics
     */
    private initializeGlobalStats;
    /**
     * Select optimal intervention for user
     */
    selectIntervention(userId: string, context: IContextualFeatures, availableInterventions: IIntervention[]): Promise<IInterventionSelection>;
    /**
     * Select intervention using configured strategy
     */
    private selectByStrategy;
    /**
     * Check if intervention should be delivered at decision point
     */
    shouldDeliver(userId: string, context: IContextualFeatures, decisionPointType: DecisionPointType): Promise<boolean>;
    /**
     * Get top-k intervention recommendations
     */
    getTopKRecommendations(userId: string, context: IContextualFeatures, k: number, availableInterventions: IIntervention[]): Promise<IInterventionSelection[]>;
    /**
     * Record outcome and update bandit
     */
    recordOutcome(outcome: IInterventionOutcome): Promise<void>;
    /**
     * Compute reward signal from outcomes
     */
    computeReward(outcomes: IInterventionOutcome[], context: IContextualFeatures): IRewardSignal;
    /**
     * Compute reward shaping components
     */
    private computeShapingComponents;
    /**
     * Calculate timing bonus
     */
    private calculateTimingBonus;
    /**
     * Calculate context match bonus
     */
    private calculateContextMatchBonus;
    /**
     * Compute shaping bonus from components
     */
    private computeShapingBonus;
    /**
     * Update bandit arm with reward
     */
    updateArm(interventionId: string, reward: IRewardSignal, context?: IContextualFeatures): Promise<void>;
    /**
     * Update contextual arm with feature weights
     */
    private updateContextualArm;
    /**
     * Convert context to feature vector
     */
    private contextToFeatureVector;
    /**
     * Dot product of feature weights and features
     */
    private dotProduct;
    /**
     * Batch update from multiple outcomes
     */
    batchUpdate(outcomes: IInterventionOutcome[]): Promise<void>;
    /**
     * Get or create user intervention profile
     */
    getUserProfile(userId: string): Promise<IUserInterventionProfile>;
    /**
     * Create default user profile
     */
    private createDefaultProfile;
    /**
     * Update user preferences
     */
    updateUserPreferences(userId: string, preferences: Partial<IUserInterventionProfile>): Promise<void>;
    /**
     * Record user explicit feedback
     */
    recordUserFeedback(userId: string, interventionId: string, feedback: 'positive' | 'neutral' | 'negative'): Promise<void>;
    /**
     * Update user profile after outcome
     */
    private updateUserProfileOnOutcome;
    /**
     * Calculate overall rate from category history
     */
    private calculateOverallRate;
    /**
     * Create default intervention stats
     */
    private createDefaultInterventionStats;
    /**
     * Create empty shaping components
     */
    private createEmptyShapingComponents;
    /**
     * Register new intervention
     */
    registerIntervention(intervention: IIntervention): Promise<void>;
    /**
     * Update intervention definition
     */
    updateIntervention(interventionId: string, updates: Partial<IIntervention>): Promise<void>;
    /**
     * Deactivate intervention
     */
    deactivateIntervention(interventionId: string): Promise<void>;
    /**
     * Get intervention by ID
     */
    getIntervention(interventionId: string): Promise<IIntervention | null>;
    /**
     * Filter eligible interventions for context
     */
    filterEligibleInterventions(interventions: IIntervention[], context: IContextualFeatures, userProfile: IUserInterventionProfile): IIntervention[];
    /**
     * Get arm statistics
     */
    getArmStats(interventionId: string): Promise<IBanditArm | null>;
    /**
     * Get global optimizer statistics
     */
    getGlobalStats(): Promise<IGlobalStats>;
    /**
     * Get optimizer state for persistence
     */
    getState(): Promise<IOptimizerState>;
    /**
     * Load optimizer state
     */
    loadState(state: IOptimizerState): Promise<void>;
    /**
     * Sample from Thompson Sampling posterior
     */
    thompsonSample(arm: IBanditArm): number;
    /**
     * Calculate UCB value for arm
     */
    calculateUCB(arm: IBanditArm, totalPulls: number): number;
    /**
     * Get exploration probability
     */
    getExplorationProbability(): number;
    /**
     * Decay exploration rate
     */
    decayExploration(decayFactor: number): void;
    /**
     * Get crisis intervention
     */
    getCrisisIntervention(context: IContextualFeatures): Promise<IIntervention>;
    /**
     * Check if context indicates crisis
     */
    isCrisisContext(context: IContextualFeatures): boolean;
    /**
     * Update optimizer configuration
     */
    updateConfig(config: Partial<IOptimizerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): IOptimizerConfig;
    /**
     * Initialize bandit arm for intervention
     */
    private initializeArm;
    /**
     * Check if arm is contextual
     */
    private isContextualArm;
    /**
     * Calculate contextual bonus
     */
    private calculateContextualBonus;
    /**
     * Should explore vs exploit
     */
    private shouldExplore;
    /**
     * Get total pulls across all arms
     */
    private getTotalPulls;
    /**
     * Get mean reward for arm
     */
    private getArmMeanReward;
    /**
     * Calculate gradient preference for gradient bandit
     */
    private calculateGradientPreference;
    /**
     * Get average reward across all arms
     */
    private getAverageReward;
    /**
     * Get alternatives list
     */
    private getAlternatives;
    /**
     * Create alternatives from scores
     */
    private createAlternativesFromScores;
    /**
     * Calculate selection confidence
     */
    private calculateSelectionConfidence;
    /**
     * Create decision point
     */
    private createDecisionPoint;
    /**
     * Create crisis selection
     */
    private createCrisisSelection;
    /**
     * Create selection reasoning
     */
    private createSelectionReasoning;
    /**
     * Update global stats on selection
     */
    private updateGlobalStatsOnSelection;
    /**
     * Update global stats on outcome
     */
    private updateGlobalStatsOnOutcome;
    /**
     * Count today's interventions for user
     */
    private countTodayInterventions;
    /**
     * Count today's interventions for category
     */
    private countTodayInterventionsForCategory;
}
/**
 * Factory function for creating InterventionOptimizer
 */
export declare const createInterventionOptimizer: CreateInterventionOptimizer;
//# sourceMappingURL=InterventionOptimizer.d.ts.map