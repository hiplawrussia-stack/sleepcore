"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInterventionOptimizer = exports.InterventionOptimizer = void 0;
const IInterventionOptimizer_1 = require("./IInterventionOptimizer");
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
/**
 * Sample from Beta distribution using Gamma samples
 * Thompson Sampling for binary outcomes
 */
function sampleBeta(alpha, beta) {
    // Use Gamma distribution relationship: Beta(a,b) = Gamma(a,1) / (Gamma(a,1) + Gamma(b,1))
    const gammaA = sampleGamma(alpha, 1);
    const gammaB = sampleGamma(beta, 1);
    return gammaA / (gammaA + gammaB);
}
/**
 * Sample from Gamma distribution using Marsaglia and Tsang's method
 */
function sampleGamma(shape, scale) {
    if (shape < 1) {
        // For shape < 1, use: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
        const u = Math.random();
        return sampleGamma(shape + 1, scale) * Math.pow(u, 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        let x;
        let v;
        do {
            x = sampleNormal(0, 1);
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = Math.random();
        if (u < 1 - 0.0331 * (x * x) * (x * x)) {
            return d * v * scale;
        }
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
            return d * v * scale;
        }
    }
}
/**
 * Sample from Normal distribution using Box-Muller transform
 */
function sampleNormal(mean, stddev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z;
}
/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
/**
 * Get current time of day category
 */
function getCurrentTimeOfDay(hour) {
    for (const [timeOfDay, [start, end]] of Object.entries(IInterventionOptimizer_1.TIME_OF_DAY_HOURS)) {
        if (start <= hour && hour < end) {
            return timeOfDay;
        }
        // Handle late_night wraparound
        if (timeOfDay === 'late_night' && (hour >= 0 && hour < 5)) {
            return 'late_night';
        }
    }
    return 'night';
}
/**
 * Softmax function for probability distribution
 */
function softmax(values, temperature = 1.0) {
    const maxVal = Math.max(...values);
    const expValues = values.map(v => Math.exp((v - maxVal) / temperature));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    return expValues.map(v => v / sumExp);
}
/**
 * Weighted random selection
 */
function weightedRandomSelect(items, weights) {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    return items[items.length - 1];
}
// ============================================================================
// INTERVENTION OPTIMIZER IMPLEMENTATION
// ============================================================================
/**
 * 🎯 Intervention Optimization Engine
 *
 * Implements Multi-Armed Bandit + Contextual Bandit + Reinforcement Learning
 * for optimal intervention selection in mental health context
 */
class InterventionOptimizer {
    config;
    interventions;
    arms;
    userProfiles;
    decisionPoints;
    pendingOutcomes;
    globalStats;
    crisisIntervention;
    constructor(config = {}) {
        this.config = { ...IInterventionOptimizer_1.DEFAULT_OPTIMIZER_CONFIG, ...config };
        this.interventions = new Map();
        this.arms = new Map();
        this.userProfiles = new Map();
        this.decisionPoints = [];
        this.pendingOutcomes = [];
        this.crisisIntervention = null;
        this.globalStats = this.initializeGlobalStats();
    }
    /**
     * Initialize global statistics
     */
    initializeGlobalStats() {
        const categoryDistribution = {};
        for (const category of Object.keys(IInterventionOptimizer_1.INTERVENTION_CATEGORIES)) {
            categoryDistribution[category] = 0;
        }
        const timeOfDayDistribution = {
            early_morning: 0,
            morning: 0,
            midday: 0,
            afternoon: 0,
            evening: 0,
            night: 0,
            late_night: 0,
        };
        return {
            totalDecisionPoints: 0,
            totalInterventionsDelivered: 0,
            overallEngagementRate: 0,
            overallOutcomeImprovement: 0,
            explorationRatio: 0,
            categoryDistribution,
            timeOfDayDistribution,
            rewardTrend: [],
        };
    }
    // ============================================================================
    // CORE SELECTION
    // ============================================================================
    /**
     * Select optimal intervention for user
     */
    async selectIntervention(userId, context, availableInterventions) {
        // Get user profile
        const userProfile = await this.getUserProfile(userId);
        // Check for crisis context - override bandit selection
        if (this.config.enableCrisisOverride && this.isCrisisContext(context)) {
            const crisisIntervention = await this.getCrisisIntervention(context);
            return this.createCrisisSelection(crisisIntervention, context, userId);
        }
        // Filter eligible interventions
        const eligibleInterventions = this.filterEligibleInterventions(availableInterventions, context, userProfile);
        if (eligibleInterventions.length === 0) {
            throw new Error('No eligible interventions available for current context');
        }
        // Ensure all eligible interventions have arms
        for (const intervention of eligibleInterventions) {
            if (!this.arms.has(intervention.id)) {
                this.initializeArm(intervention.id);
            }
        }
        // Decide exploration vs exploitation
        const shouldExplore = this.shouldExplore();
        let selectedIntervention;
        let expectedReward;
        let probability;
        let alternatives;
        if (shouldExplore && this.config.explorationStrategy === 'epsilon_greedy') {
            // Random exploration
            const randomIndex = Math.floor(Math.random() * eligibleInterventions.length);
            selectedIntervention = eligibleInterventions[randomIndex];
            expectedReward = this.getArmMeanReward(selectedIntervention.id);
            probability = 1 / eligibleInterventions.length;
            alternatives = this.getAlternatives(eligibleInterventions, selectedIntervention.id);
        }
        else {
            // Use configured strategy for selection
            const selection = this.selectByStrategy(eligibleInterventions, context, userProfile);
            selectedIntervention = selection.intervention;
            expectedReward = selection.expectedReward;
            probability = selection.probability;
            alternatives = selection.alternatives;
        }
        // Create decision point
        const decisionPoint = this.createDecisionPoint(userId, context, selectedIntervention, probability, shouldExplore);
        // Update statistics
        this.updateGlobalStatsOnSelection(selectedIntervention, context, shouldExplore);
        // Create selection reasoning
        const reasoning = this.createSelectionReasoning(selectedIntervention, context, shouldExplore, alternatives);
        return {
            intervention: selectedIntervention,
            confidence: this.calculateSelectionConfidence(selectedIntervention.id),
            expectedReward,
            probability,
            isExploration: shouldExplore,
            explorationStrategy: this.config.explorationStrategy,
            alternatives,
            reasoning,
            decisionPoint,
        };
    }
    /**
     * Select intervention using configured strategy
     */
    selectByStrategy(interventions, context, userProfile) {
        const scores = [];
        for (const intervention of interventions) {
            let score;
            const arm = this.arms.get(intervention.id);
            switch (this.config.explorationStrategy) {
                case 'thompson_sampling':
                    score = this.thompsonSample(arm);
                    break;
                case 'ucb':
                    score = this.calculateUCB(arm, this.getTotalPulls());
                    break;
                case 'boltzmann':
                    score = arm.meanReward;
                    break;
                case 'gradient_bandit':
                    score = this.calculateGradientPreference(arm);
                    break;
                default:
                    score = arm.meanReward;
            }
            // Add contextual bonus if enabled
            if (this.config.enableContextualBandit && this.isContextualArm(arm)) {
                score += this.calculateContextualBonus(arm, context);
            }
            scores.push({ intervention, score });
        }
        // Sort by score
        scores.sort((a, b) => b.score - a.score);
        // For Boltzmann/softmax, sample from distribution
        if (this.config.explorationStrategy === 'boltzmann') {
            const scoreValues = scores.map(s => s.score);
            const probabilities = softmax(scoreValues, this.config.temperature);
            const selected = weightedRandomSelect(scores, probabilities);
            return {
                intervention: selected.intervention,
                expectedReward: selected.score,
                probability: probabilities[scores.indexOf(selected)],
                alternatives: this.createAlternativesFromScores(scores, selected.intervention.id),
            };
        }
        // For other strategies, select top scorer
        const selected = scores[0];
        const totalScore = scores.reduce((sum, s) => sum + Math.max(0, s.score), 0);
        const probability = totalScore > 0 ? Math.max(0, selected.score) / totalScore : 1;
        return {
            intervention: selected.intervention,
            expectedReward: selected.score,
            probability,
            alternatives: this.createAlternativesFromScores(scores, selected.intervention.id),
        };
    }
    /**
     * Check if intervention should be delivered at decision point
     */
    async shouldDeliver(userId, context, decisionPointType) {
        const userProfile = await this.getUserProfile(userId);
        // Crisis always delivers
        if (decisionPointType === 'crisis_triggered') {
            return true;
        }
        // Check daily limit
        const todayInterventions = this.countTodayInterventions(userId);
        if (todayInterventions >= this.config.maxInterventionsPerDay) {
            return false;
        }
        // Check minimum interval
        if (userProfile.lastInterventionAt) {
            const secondsSince = (Date.now() - userProfile.lastInterventionAt.getTime()) / 1000;
            if (secondsSince < this.config.minInterventionIntervalSeconds) {
                return false;
            }
        }
        // MRT randomization if enabled
        if (this.config.enableMRTRandomization) {
            return Math.random() < this.config.mrtRandomizationProbability;
        }
        // Check context appropriateness
        if (context.riskLevel > 0.8 && decisionPointType !== 'user_initiated') {
            // High risk - be more cautious about unsolicited interventions
            return Math.random() < 0.3;
        }
        // Check energy level
        if (context.energyLevel < 0.2) {
            // Low energy - less likely to engage
            return Math.random() < 0.5;
        }
        // Default: deliver with probability based on engagement history
        const engagementRate = userProfile.engagementRate || 0.5;
        return Math.random() < (0.5 + engagementRate * 0.3);
    }
    /**
     * Get top-k intervention recommendations
     */
    async getTopKRecommendations(userId, context, k, availableInterventions) {
        const userProfile = await this.getUserProfile(userId);
        const eligible = this.filterEligibleInterventions(availableInterventions, context, userProfile);
        // Score all eligible interventions
        const scored = [];
        for (const intervention of eligible) {
            if (!this.arms.has(intervention.id)) {
                this.initializeArm(intervention.id);
            }
            const arm = this.arms.get(intervention.id);
            let score = this.config.explorationStrategy === 'thompson_sampling'
                ? this.thompsonSample(arm)
                : arm.meanReward;
            if (this.config.enableContextualBandit && this.isContextualArm(arm)) {
                score += this.calculateContextualBonus(arm, context);
            }
            scored.push({ intervention, score });
        }
        // Sort and take top-k
        scored.sort((a, b) => b.score - a.score);
        const topK = scored.slice(0, k);
        // Convert to selections
        return topK.map((item, index) => ({
            intervention: item.intervention,
            confidence: this.calculateSelectionConfidence(item.intervention.id),
            expectedReward: item.score,
            probability: 1 / (index + 1), // Decreasing probability
            isExploration: false,
            explorationStrategy: this.config.explorationStrategy,
            alternatives: [],
            reasoning: this.createSelectionReasoning(item.intervention, context, false, []),
            decisionPoint: this.createDecisionPoint(userId, context, item.intervention, 1 / (index + 1), false),
        }));
    }
    // ============================================================================
    // REWARD & LEARNING
    // ============================================================================
    /**
     * Record outcome and update bandit
     */
    async recordOutcome(outcome) {
        // Get decision point
        const decisionPoint = this.decisionPoints.find(dp => dp.id === outcome.decisionPointId);
        if (!decisionPoint) {
            console.warn(`Decision point not found: ${outcome.decisionPointId}`);
            return;
        }
        // Compute reward
        const reward = this.computeReward([outcome], decisionPoint.context);
        // Update arm
        await this.updateArm(outcome.interventionId, reward, decisionPoint.context);
        // Update user profile
        await this.updateUserProfileOnOutcome(outcome.userId, outcome.interventionId, outcome);
        // Update global stats
        this.updateGlobalStatsOnOutcome(outcome, reward);
        // Remove from pending
        this.pendingOutcomes = this.pendingOutcomes.filter(po => po.decisionPointId !== outcome.decisionPointId);
    }
    /**
     * Compute reward signal from outcomes
     */
    computeReward(outcomes, context) {
        let immediateReward = 0;
        let delayedReward = 0;
        for (const outcome of outcomes) {
            const discountedValue = outcome.value * Math.pow(this.config.rewardDiscountFactor, outcome.latencySeconds / 3600 // Discount by hours
            );
            if (outcome.latencySeconds < 300) { // < 5 minutes = immediate
                immediateReward += discountedValue;
            }
            else {
                delayedReward += discountedValue;
            }
        }
        // Normalize
        immediateReward = clamp(immediateReward / Math.max(1, outcomes.length), -1, 1);
        delayedReward = clamp(delayedReward / Math.max(1, outcomes.length), -1, 1);
        // Compute shaping components
        const shapingComponents = this.computeShapingComponents(outcomes, context);
        // Combine rewards
        const baseReward = this.config.immediateRewardWeight * immediateReward +
            this.config.delayedRewardWeight * delayedReward;
        let shapedReward = baseReward;
        if (this.config.enableRewardShaping) {
            const shapingBonus = this.computeShapingBonus(shapingComponents);
            shapedReward = clamp(baseReward + shapingBonus, -1, 1);
        }
        // Convert to 0-1 for Beta distribution
        const reward = (shapedReward + 1) / 2;
        return {
            reward,
            immediateReward,
            delayedReward,
            shapedReward,
            discountFactor: this.config.rewardDiscountFactor,
            outcomes,
            shapingComponents,
        };
    }
    /**
     * Compute reward shaping components
     */
    computeShapingComponents(outcomes, context) {
        const hasEngagement = outcomes.some(o => o.outcomeType === 'engagement' && o.value > 0);
        const hasCompletion = outcomes.some(o => o.outcomeType === 'completion' && o.value > 0);
        const avgValue = outcomes.reduce((sum, o) => sum + o.value, 0) / outcomes.length;
        return {
            engagementBonus: hasEngagement ? 0.5 : 0,
            completionBonus: hasCompletion ? 0.8 : 0,
            progressPotential: Math.max(0, avgValue),
            explorationBonus: 0, // Set during selection
            noveltyBonus: 0, // Set based on intervention history
            diversityBonus: 0, // Set based on category diversity
            timingBonus: this.calculateTimingBonus(context),
            contextMatchBonus: this.calculateContextMatchBonus(context),
        };
    }
    /**
     * Calculate timing bonus
     */
    calculateTimingBonus(context) {
        // Bonus for delivering at appropriate times
        const hour = context.hourOfDay;
        // Penalize late night (unless crisis)
        if (hour >= 0 && hour < 6) {
            return -0.2;
        }
        // Bonus for morning (good for behavioral activation)
        if (hour >= 7 && hour < 10) {
            return 0.1;
        }
        // Bonus for evening reflection time
        if (hour >= 18 && hour < 21) {
            return 0.1;
        }
        return 0;
    }
    /**
     * Calculate context match bonus
     */
    calculateContextMatchBonus(context) {
        // Bonus for high engagement score users
        if (context.engagementScore > 0.7) {
            return 0.1;
        }
        // Small penalty for intervention fatigue
        if (context.interventionFatigue > 0.5) {
            return -0.1;
        }
        return 0;
    }
    /**
     * Compute shaping bonus from components
     */
    computeShapingBonus(components) {
        const weights = this.config.rewardShapingWeights;
        return (weights.engagementBonus * components.engagementBonus +
            weights.completionBonus * components.completionBonus +
            weights.progressPotential * components.progressPotential +
            weights.explorationBonus * components.explorationBonus +
            weights.noveltyBonus * components.noveltyBonus +
            weights.diversityBonus * components.diversityBonus +
            weights.timingBonus * components.timingBonus +
            weights.contextMatchBonus * components.contextMatchBonus);
    }
    /**
     * Update bandit arm with reward
     */
    async updateArm(interventionId, reward, context) {
        let arm = this.arms.get(interventionId);
        if (!arm) {
            this.initializeArm(interventionId);
            arm = this.arms.get(interventionId);
        }
        const rewardValue = reward.reward; // 0-1 for Beta
        // Update basic statistics
        arm.pullCount += 1;
        arm.totalReward += rewardValue;
        // Online mean update (Welford's algorithm for numerical stability)
        const delta = rewardValue - arm.meanReward;
        arm.meanReward += delta / arm.pullCount;
        const delta2 = rewardValue - arm.meanReward;
        arm.rewardVariance += delta * delta2;
        // Update Beta distribution (Thompson Sampling)
        if (rewardValue > 0.5) {
            arm.alphaSuccess += rewardValue;
        }
        else {
            arm.betaFailure += (1 - rewardValue);
        }
        // Update Normal distribution parameters
        const priorPrecision = arm.normalPrecision;
        const observationPrecision = 1 / Math.max(0.01, arm.rewardVariance / arm.pullCount);
        arm.normalPrecision = priorPrecision + observationPrecision;
        arm.normalMean = (priorPrecision * arm.normalMean + observationPrecision * rewardValue) / arm.normalPrecision;
        // Update UCB
        arm.ucbValue = this.calculateUCB(arm, this.getTotalPulls());
        // Update timestamps
        arm.lastUpdated = new Date();
        arm.lastPulled = new Date();
        // Update contextual features if applicable
        if (context && this.config.enableContextualBandit && this.isContextualArm(arm)) {
            this.updateContextualArm(arm, context, rewardValue);
        }
        this.arms.set(interventionId, arm);
    }
    /**
     * Update contextual arm with feature weights
     */
    updateContextualArm(arm, context, reward) {
        // Extract feature vector
        const features = this.contextToFeatureVector(context);
        // Simple online linear regression update
        // w = w + lr * (reward - w^T x) * x
        const prediction = this.dotProduct(arm.featureWeights, features);
        const error = reward - prediction;
        for (const [key, value] of Object.entries(features)) {
            const currentWeight = arm.featureWeights[key] || 0;
            arm.featureWeights[key] = currentWeight + this.config.learningRate * error * value;
            // L2 regularization
            arm.featureWeights[key] *= (1 - this.config.contextualRegularization * this.config.learningRate);
        }
    }
    /**
     * Convert context to feature vector
     */
    contextToFeatureVector(context) {
        return {
            valence: context.valence,
            arousal: context.arousal,
            dominance: context.dominance,
            emotionalStability: context.emotionalStability,
            moodTrendImproving: context.moodTrend === 'improving' ? 1 : 0,
            moodTrendDeclining: context.moodTrend === 'declining' ? 1 : 0,
            energyLevel: context.energyLevel,
            copingCapacity: context.copingCapacity,
            socialSupport: context.socialSupport,
            riskLevel: context.riskLevel,
            hourNormalized: context.hourOfDay / 24,
            dayOfWeekNormalized: context.dayOfWeek / 7,
            completionRate: context.completionRate,
            engagementScore: context.engagementScore,
            interventionFatigue: context.interventionFatigue,
            bias: 1, // Intercept term
        };
    }
    /**
     * Dot product of feature weights and features
     */
    dotProduct(weights, features) {
        let sum = 0;
        for (const [key, value] of Object.entries(features)) {
            sum += (weights[key] || 0) * value;
        }
        return sum;
    }
    /**
     * Batch update from multiple outcomes
     */
    async batchUpdate(outcomes) {
        // Group outcomes by intervention
        const grouped = new Map();
        for (const outcome of outcomes) {
            const existing = grouped.get(outcome.interventionId) || [];
            existing.push(outcome);
            grouped.set(outcome.interventionId, existing);
        }
        // Update each intervention
        for (const [interventionId, interventionOutcomes] of grouped) {
            const decisionPoint = this.decisionPoints.find(dp => dp.id === interventionOutcomes[0].decisionPointId);
            if (decisionPoint) {
                const reward = this.computeReward(interventionOutcomes, decisionPoint.context);
                await this.updateArm(interventionId, reward, decisionPoint.context);
            }
        }
    }
    // ============================================================================
    // USER PROFILE
    // ============================================================================
    /**
     * Get or create user intervention profile
     */
    async getUserProfile(userId) {
        let profile = this.userProfiles.get(userId);
        if (!profile) {
            profile = this.createDefaultProfile(userId);
            this.userProfiles.set(userId, profile);
        }
        return profile;
    }
    /**
     * Create default user profile
     */
    createDefaultProfile(userId) {
        const categoryHistory = {};
        for (const category of Object.keys(IInterventionOptimizer_1.INTERVENTION_CATEGORIES)) {
            categoryHistory[category] = {
                count: 0,
                averageReward: 0,
                rewardVariance: 0,
                engagementRate: 0,
                completionRate: 0,
            };
        }
        return {
            userId,
            totalInterventions: 0,
            categoryHistory,
            interventionStats: {},
            preferredCategories: [],
            avoidedCategories: [],
            preferredIntensity: 'brief',
            preferredTimeOfDay: ['morning', 'evening'],
            engagementRate: 0.5, // Prior assumption
            completionRate: 0.5,
            averageOutcomeImprovement: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    /**
     * Update user preferences
     */
    async updateUserPreferences(userId, preferences) {
        const profile = await this.getUserProfile(userId);
        Object.assign(profile, preferences, { updatedAt: new Date() });
        this.userProfiles.set(userId, profile);
    }
    /**
     * Record user explicit feedback
     */
    async recordUserFeedback(userId, interventionId, feedback) {
        const profile = await this.getUserProfile(userId);
        if (!profile.interventionStats[interventionId]) {
            profile.interventionStats[interventionId] = this.createDefaultInterventionStats();
        }
        profile.interventionStats[interventionId].userFeedback = feedback;
        profile.updatedAt = new Date();
        // Convert feedback to reward signal
        const feedbackReward = feedback === 'positive' ? 0.9 : feedback === 'negative' ? 0.1 : 0.5;
        await this.updateArm(interventionId, {
            reward: feedbackReward,
            immediateReward: feedbackReward,
            delayedReward: 0,
            shapedReward: feedbackReward,
            discountFactor: 1,
            outcomes: [],
            shapingComponents: this.createEmptyShapingComponents(),
        });
        this.userProfiles.set(userId, profile);
    }
    /**
     * Update user profile after outcome
     */
    async updateUserProfileOnOutcome(userId, interventionId, outcome) {
        const profile = await this.getUserProfile(userId);
        const intervention = this.interventions.get(interventionId);
        profile.totalInterventions += 1;
        profile.lastInterventionAt = new Date();
        // Update intervention stats
        if (!profile.interventionStats[interventionId]) {
            profile.interventionStats[interventionId] = this.createDefaultInterventionStats();
        }
        const stats = profile.interventionStats[interventionId];
        stats.deliveryCount += 1;
        if (outcome.outcomeType === 'engagement' && outcome.value > 0) {
            stats.engagementCount += 1;
        }
        if (outcome.outcomeType === 'completion' && outcome.value > 0) {
            stats.completionCount += 1;
        }
        stats.totalReward += outcome.value;
        stats.averageReward = stats.totalReward / stats.deliveryCount;
        stats.bestOutcome = Math.max(stats.bestOutcome, outcome.value);
        stats.lastDelivered = new Date();
        // Update category stats
        if (intervention) {
            const categoryStats = profile.categoryHistory[intervention.category];
            categoryStats.count += 1;
            categoryStats.averageReward = (categoryStats.averageReward * (categoryStats.count - 1) + outcome.value) / categoryStats.count;
            categoryStats.lastUsed = new Date();
            if (outcome.outcomeType === 'engagement') {
                categoryStats.engagementRate = (categoryStats.engagementRate * (categoryStats.count - 1) + (outcome.value > 0 ? 1 : 0)) / categoryStats.count;
            }
            if (outcome.outcomeType === 'completion') {
                categoryStats.completionRate = (categoryStats.completionRate * (categoryStats.count - 1) + (outcome.value > 0 ? 1 : 0)) / categoryStats.count;
            }
        }
        // Update overall rates
        profile.engagementRate = this.calculateOverallRate(profile, 'engagementRate');
        profile.completionRate = this.calculateOverallRate(profile, 'completionRate');
        // Update preferred categories (top 3 by average reward)
        const sortedCategories = Object.entries(profile.categoryHistory)
            .filter(([_, stats]) => stats.count >= 3)
            .sort(([_, a], [__, b]) => b.averageReward - a.averageReward);
        profile.preferredCategories = sortedCategories.slice(0, 3).map(([cat]) => cat);
        profile.updatedAt = new Date();
        this.userProfiles.set(userId, profile);
    }
    /**
     * Calculate overall rate from category history
     */
    calculateOverallRate(profile, rateType) {
        let totalCount = 0;
        let weightedSum = 0;
        for (const stats of Object.values(profile.categoryHistory)) {
            if (stats.count > 0) {
                weightedSum += stats[rateType] * stats.count;
                totalCount += stats.count;
            }
        }
        return totalCount > 0 ? weightedSum / totalCount : 0.5;
    }
    /**
     * Create default intervention stats
     */
    createDefaultInterventionStats() {
        return {
            deliveryCount: 0,
            engagementCount: 0,
            completionCount: 0,
            totalReward: 0,
            averageReward: 0,
            bestOutcome: 0,
        };
    }
    /**
     * Create empty shaping components
     */
    createEmptyShapingComponents() {
        return {
            engagementBonus: 0,
            completionBonus: 0,
            progressPotential: 0,
            explorationBonus: 0,
            noveltyBonus: 0,
            diversityBonus: 0,
            timingBonus: 0,
            contextMatchBonus: 0,
        };
    }
    // ============================================================================
    // INTERVENTION MANAGEMENT
    // ============================================================================
    /**
     * Register new intervention
     */
    async registerIntervention(intervention) {
        this.interventions.set(intervention.id, intervention);
        this.initializeArm(intervention.id);
        // Check if this is a crisis intervention
        if (intervention.category === 'crisis_intervention' && !this.crisisIntervention) {
            this.crisisIntervention = intervention;
        }
    }
    /**
     * Update intervention definition
     */
    async updateIntervention(interventionId, updates) {
        const intervention = this.interventions.get(interventionId);
        if (intervention) {
            const updated = { ...intervention, ...updates, updatedAt: new Date() };
            this.interventions.set(interventionId, updated);
        }
    }
    /**
     * Deactivate intervention
     */
    async deactivateIntervention(interventionId) {
        const intervention = this.interventions.get(interventionId);
        if (intervention) {
            const updated = { ...intervention, isActive: false, updatedAt: new Date() };
            this.interventions.set(interventionId, updated);
        }
    }
    /**
     * Get intervention by ID
     */
    async getIntervention(interventionId) {
        return this.interventions.get(interventionId) || null;
    }
    /**
     * Filter eligible interventions for context
     */
    filterEligibleInterventions(interventions, context, userProfile) {
        return interventions.filter(intervention => {
            // Must be active
            if (!intervention.isActive)
                return false;
            // Check preconditions
            const pre = intervention.preconditions;
            if (pre.minValence !== undefined && context.valence < pre.minValence)
                return false;
            if (pre.maxValence !== undefined && context.valence > pre.maxValence)
                return false;
            if (pre.minArousal !== undefined && context.arousal < pre.minArousal)
                return false;
            if (pre.maxArousal !== undefined && context.arousal > pre.maxArousal)
                return false;
            if (pre.minEnergy !== undefined && context.energyLevel < pre.minEnergy)
                return false;
            // Check risk level
            if (pre.maxRiskLevel !== undefined) {
                const riskOrder = ['none', 'low', 'moderate', 'elevated', 'high', 'crisis'];
                const contextRiskIndex = Math.floor(context.riskLevel * 5);
                const maxRiskIndex = riskOrder.indexOf(pre.maxRiskLevel);
                if (contextRiskIndex > maxRiskIndex)
                    return false;
            }
            // Check time of day
            if (pre.allowedTimeOfDay && pre.allowedTimeOfDay.length > 0) {
                const currentTimeOfDay = getCurrentTimeOfDay(context.hourOfDay);
                if (!pre.allowedTimeOfDay.includes(currentTimeOfDay))
                    return false;
            }
            // Check session requirements
            if (pre.minSessionsCompleted !== undefined &&
                context.sessionsTotalLifetime < pre.minSessionsCompleted)
                return false;
            // Check contraindications
            const contra = intervention.contraindications;
            if (contra.crisisState && context.riskLevel > 0.8)
                return false;
            if (contra.userDeclined)
                return false;
            if (contra.maxDailyInterventions !== undefined) {
                const todayCount = this.countTodayInterventionsForCategory(userProfile.userId, intervention.category);
                if (todayCount >= contra.maxDailyInterventions)
                    return false;
            }
            if (contra.minTimeSinceLastIntervention !== undefined && userProfile.lastInterventionAt) {
                const secondsSince = (Date.now() - userProfile.lastInterventionAt.getTime()) / 1000;
                if (secondsSince < contra.minTimeSinceLastIntervention)
                    return false;
            }
            // Check user avoided categories
            if (userProfile.avoidedCategories.includes(intervention.category))
                return false;
            return true;
        });
    }
    // ============================================================================
    // STATISTICS & ANALYTICS
    // ============================================================================
    /**
     * Get arm statistics
     */
    async getArmStats(interventionId) {
        return this.arms.get(interventionId) || null;
    }
    /**
     * Get global optimizer statistics
     */
    async getGlobalStats() {
        return { ...this.globalStats };
    }
    /**
     * Get optimizer state for persistence
     */
    async getState() {
        return {
            config: { ...this.config },
            arms: Object.fromEntries(this.arms),
            userProfiles: Object.fromEntries(this.userProfiles),
            recentDecisionPoints: this.decisionPoints.slice(-1000), // Keep last 1000
            pendingOutcomes: [...this.pendingOutcomes],
            globalStats: { ...this.globalStats },
            lastUpdated: new Date(),
            version: '1.0.0',
        };
    }
    /**
     * Load optimizer state
     */
    async loadState(state) {
        this.config = { ...IInterventionOptimizer_1.DEFAULT_OPTIMIZER_CONFIG, ...state.config };
        this.arms = new Map(Object.entries(state.arms));
        this.userProfiles = new Map(Object.entries(state.userProfiles));
        this.decisionPoints = state.recentDecisionPoints;
        this.pendingOutcomes = state.pendingOutcomes;
        this.globalStats = state.globalStats;
    }
    // ============================================================================
    // EXPLORATION CONTROL
    // ============================================================================
    /**
     * Sample from Thompson Sampling posterior
     */
    thompsonSample(arm) {
        // Use Beta distribution for binary outcomes
        if (arm.pullCount < this.config.minPullsPerArm) {
            // Use prior-weighted sample for cold start
            const priorAlpha = this.config.thompsonPriorStrength;
            const priorBeta = this.config.thompsonPriorStrength;
            return sampleBeta(arm.alphaSuccess + priorAlpha, arm.betaFailure + priorBeta);
        }
        // Use Normal distribution for continuous rewards
        const stddev = 1 / Math.sqrt(arm.normalPrecision);
        return sampleNormal(arm.normalMean, stddev);
    }
    /**
     * Calculate UCB value for arm
     */
    calculateUCB(arm, totalPulls) {
        if (arm.pullCount === 0) {
            return Infinity; // Ensure unpulled arms are selected
        }
        const exploitation = arm.meanReward;
        const exploration = this.config.ucbConstant * Math.sqrt(Math.log(totalPulls + 1) / arm.pullCount);
        return exploitation + exploration;
    }
    /**
     * Get exploration probability
     */
    getExplorationProbability() {
        return this.config.epsilon;
    }
    /**
     * Decay exploration rate
     */
    decayExploration(decayFactor) {
        this.config.epsilon *= decayFactor;
        this.config.epsilon = Math.max(0.01, this.config.epsilon); // Minimum exploration
    }
    // ============================================================================
    // CRISIS HANDLING
    // ============================================================================
    /**
     * Get crisis intervention
     */
    async getCrisisIntervention(context) {
        if (this.crisisIntervention) {
            return this.crisisIntervention;
        }
        // Create default crisis intervention
        return {
            id: 'crisis_default',
            name: 'Crisis Support',
            description: 'Immediate crisis support and safety resources',
            category: 'crisis_intervention',
            intensity: 'standard',
            modality: 'text_message',
            estimatedDurationSeconds: 300,
            preconditions: {},
            contraindications: {},
            content: {
                en: {
                    introduction: 'I notice you may be going through a difficult time.',
                    mainContent: 'Your safety is the most important thing right now. You are not alone.',
                    closing: 'Please reach out to a crisis helpline if you need immediate support.',
                    quickVersion: 'You are not alone. Help is available.',
                },
                ru: {
                    introduction: 'Я заметил, что тебе сейчас может быть тяжело.',
                    mainContent: 'Твоя безопасность сейчас важнее всего. Ты не один.',
                    closing: 'Пожалуйста, позвони на горячую линию, если тебе нужна срочная помощь: 8-800-2000-122',
                    quickVersion: 'Ты не один. Помощь доступна.',
                },
            },
            mechanisms: ['emotional_processing', 'social_connection'],
            targetOutcomes: ['crisis_averted', 'engagement'],
            evidenceLevel: 'expert_consensus',
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
        };
    }
    /**
     * Check if context indicates crisis
     */
    isCrisisContext(context) {
        return context.riskLevel > 0.8 || context.crisisProximity > 0.7;
    }
    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    /**
     * Update optimizer configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================
    /**
     * Initialize bandit arm for intervention
     */
    initializeArm(interventionId) {
        const arm = {
            interventionId,
            pullCount: 0,
            totalReward: 0,
            meanReward: 0.5, // Optimistic initialization
            rewardVariance: 0.25,
            alphaSuccess: this.config.thompsonPriorStrength,
            betaFailure: this.config.thompsonPriorStrength,
            normalMean: 0.5,
            normalPrecision: 1 / 0.25, // Prior precision
            ucbValue: Infinity,
            lastUpdated: new Date(),
        };
        // If contextual bandits enabled, initialize with feature weights
        if (this.config.enableContextualBandit) {
            const contextualArm = {
                ...arm,
                featureWeights: {},
                covarianceMatrix: [],
                featureAccumulator: [],
                rewardFeatureAccumulator: [],
            };
            this.arms.set(interventionId, contextualArm);
        }
        else {
            this.arms.set(interventionId, arm);
        }
    }
    /**
     * Check if arm is contextual
     */
    isContextualArm(arm) {
        return 'featureWeights' in arm;
    }
    /**
     * Calculate contextual bonus
     */
    calculateContextualBonus(arm, context) {
        const features = this.contextToFeatureVector(context);
        return this.dotProduct(arm.featureWeights, features);
    }
    /**
     * Should explore vs exploit
     */
    shouldExplore() {
        if (this.config.explorationStrategy === 'thompson_sampling') {
            // Thompson sampling handles exploration automatically
            return false;
        }
        if (this.config.explorationStrategy === 'ucb') {
            // UCB handles exploration automatically
            return false;
        }
        return Math.random() < this.config.epsilon;
    }
    /**
     * Get total pulls across all arms
     */
    getTotalPulls() {
        let total = 0;
        for (const arm of this.arms.values()) {
            total += arm.pullCount;
        }
        return total;
    }
    /**
     * Get mean reward for arm
     */
    getArmMeanReward(interventionId) {
        const arm = this.arms.get(interventionId);
        return arm ? arm.meanReward : 0.5;
    }
    /**
     * Calculate gradient preference for gradient bandit
     */
    calculateGradientPreference(arm) {
        // Simple preference based on mean reward deviation from average
        const avgReward = this.getAverageReward();
        return arm.meanReward - avgReward;
    }
    /**
     * Get average reward across all arms
     */
    getAverageReward() {
        if (this.arms.size === 0)
            return 0.5;
        let totalReward = 0;
        let totalPulls = 0;
        for (const arm of this.arms.values()) {
            totalReward += arm.totalReward;
            totalPulls += arm.pullCount;
        }
        return totalPulls > 0 ? totalReward / totalPulls : 0.5;
    }
    /**
     * Get alternatives list
     */
    getAlternatives(interventions, selectedId) {
        return interventions
            .filter(i => i.id !== selectedId)
            .slice(0, 5)
            .map(i => ({
            interventionId: i.id,
            expectedReward: this.getArmMeanReward(i.id),
            probability: 0,
            reasonNotSelected: 'Lower expected reward',
        }));
    }
    /**
     * Create alternatives from scores
     */
    createAlternativesFromScores(scores, selectedId) {
        return scores
            .filter(s => s.intervention.id !== selectedId)
            .slice(0, 5)
            .map(s => ({
            interventionId: s.intervention.id,
            expectedReward: s.score,
            probability: 0,
            reasonNotSelected: s.score < scores[0].score ? 'Lower expected reward' : 'Not selected by sampling',
        }));
    }
    /**
     * Calculate selection confidence
     */
    calculateSelectionConfidence(interventionId) {
        const arm = this.arms.get(interventionId);
        if (!arm || arm.pullCount === 0)
            return 0.5;
        // Confidence increases with pulls and decreases with variance
        const pullConfidence = 1 - Math.exp(-arm.pullCount / 10);
        const varianceConfidence = 1 / (1 + arm.rewardVariance);
        return 0.5 * pullConfidence + 0.5 * varianceConfidence;
    }
    /**
     * Create decision point
     */
    createDecisionPoint(userId, context, intervention, probability, wasExploration) {
        const decisionPoint = {
            id: generateId(),
            userId,
            timestamp: new Date(),
            type: 'event_triggered',
            context,
            interventionDelivered: true,
            selectedIntervention: intervention.id,
            selectionProbability: probability,
            selectionReason: wasExploration ? 'Exploration' : 'Exploitation',
            wasExploration,
        };
        this.decisionPoints.push(decisionPoint);
        // Add to pending outcomes
        this.pendingOutcomes.push({
            decisionPointId: decisionPoint.id,
            expectedOutcomeTime: new Date(Date.now() + 3600000), // 1 hour
        });
        return decisionPoint;
    }
    /**
     * Create crisis selection
     */
    createCrisisSelection(intervention, context, userId) {
        const decisionPoint = this.createDecisionPoint(userId, context, intervention, 1.0, false);
        decisionPoint.type = 'crisis_triggered';
        decisionPoint.selectionReason = 'Crisis override - immediate safety response';
        return {
            intervention,
            confidence: 1.0,
            expectedReward: 1.0,
            probability: 1.0,
            isExploration: false,
            explorationStrategy: this.config.explorationStrategy,
            alternatives: [],
            reasoning: {
                primaryFactor: 'Crisis detection triggered immediate safety response',
                influentialFeatures: [
                    { feature: 'riskLevel', value: context.riskLevel, influence: 'positive' },
                    { feature: 'crisisProximity', value: context.crisisProximity, influence: 'positive' },
                ],
                rejectionReasons: {},
                exploitationExplanation: 'Crisis intervention bypasses normal selection',
                clinicalNotes: 'User safety is the priority. Normal bandit selection overridden.',
            },
            decisionPoint,
        };
    }
    /**
     * Create selection reasoning
     */
    createSelectionReasoning(intervention, context, wasExploration, alternatives) {
        const influentialFeatures = [];
        // Determine influential features
        if (context.valence < 0) {
            influentialFeatures.push({ feature: 'valence', value: context.valence, influence: 'negative' });
        }
        if (context.energyLevel < 0.3) {
            influentialFeatures.push({ feature: 'energyLevel', value: context.energyLevel, influence: 'negative' });
        }
        if (context.engagementScore > 0.7) {
            influentialFeatures.push({ feature: 'engagementScore', value: context.engagementScore, influence: 'positive' });
        }
        const rejectionReasons = {};
        for (const alt of alternatives.slice(0, 3)) {
            rejectionReasons[alt.interventionId] = alt.reasonNotSelected;
        }
        return {
            primaryFactor: wasExploration
                ? 'Random exploration to discover new interventions'
                : `${this.config.explorationStrategy} selected highest expected reward`,
            influentialFeatures,
            rejectionReasons,
            exploitationExplanation: wasExploration
                ? 'Exploration phase - trying less-used intervention'
                : `Selected ${intervention.category} based on past success`,
            clinicalNotes: intervention.category === 'crisis_intervention'
                ? 'Crisis intervention selected - prioritize safety'
                : undefined,
        };
    }
    /**
     * Update global stats on selection
     */
    updateGlobalStatsOnSelection(intervention, context, wasExploration) {
        this.globalStats.totalDecisionPoints += 1;
        this.globalStats.totalInterventionsDelivered += 1;
        this.globalStats.categoryDistribution[intervention.category] += 1;
        const timeOfDay = getCurrentTimeOfDay(context.hourOfDay);
        this.globalStats.timeOfDayDistribution[timeOfDay] += 1;
        // Update exploration ratio
        const explorationCount = wasExploration ? 1 : 0;
        this.globalStats.explorationRatio =
            (this.globalStats.explorationRatio * (this.globalStats.totalDecisionPoints - 1) + explorationCount) /
                this.globalStats.totalDecisionPoints;
    }
    /**
     * Update global stats on outcome
     */
    updateGlobalStatsOnOutcome(outcome, reward) {
        // Update engagement rate
        if (outcome.outcomeType === 'engagement') {
            const engaged = outcome.value > 0 ? 1 : 0;
            this.globalStats.overallEngagementRate =
                (this.globalStats.overallEngagementRate * (this.globalStats.totalDecisionPoints - 1) + engaged) /
                    this.globalStats.totalDecisionPoints;
        }
        // Update outcome improvement (moving average)
        this.globalStats.overallOutcomeImprovement =
            0.95 * this.globalStats.overallOutcomeImprovement + 0.05 * outcome.value;
        // Update reward trend
        this.globalStats.rewardTrend.push(reward.reward);
        if (this.globalStats.rewardTrend.length > 168) { // 7 days * 24 hours
            this.globalStats.rewardTrend.shift();
        }
    }
    /**
     * Count today's interventions for user
     */
    countTodayInterventions(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.decisionPoints.filter(dp => dp.userId === userId &&
            dp.interventionDelivered &&
            dp.timestamp >= today).length;
    }
    /**
     * Count today's interventions for category
     */
    countTodayInterventionsForCategory(userId, category) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.decisionPoints.filter(dp => {
            if (dp.userId !== userId || !dp.interventionDelivered || dp.timestamp < today) {
                return false;
            }
            const intervention = this.interventions.get(dp.selectedIntervention || '');
            return intervention?.category === category;
        }).length;
    }
}
exports.InterventionOptimizer = InterventionOptimizer;
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Factory function for creating InterventionOptimizer
 */
const createInterventionOptimizer = (config) => {
    return new InterventionOptimizer(config);
};
exports.createInterventionOptimizer = createInterventionOptimizer;
//# sourceMappingURL=InterventionOptimizer.js.map