"use strict";
/**
 * 🎯 INTERVENTION OPTIMIZATION ENGINE - INTERFACES
 * =================================================
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
 * Key Algorithms:
 * - Thompson Sampling with Beta/Normal conjugate priors
 * - Contextual Bandits with state features
 * - Reward Shaping for sparse healthcare outcomes
 * - Exploration/Exploitation via UCB and Thompson
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAMANTE_REWARD_WEIGHTS = exports.TIME_OF_DAY_HOURS = exports.INTERVENTION_CATEGORIES = exports.DEFAULT_OPTIMIZER_CONFIG = void 0;
/**
 * Default optimizer configuration
 */
exports.DEFAULT_OPTIMIZER_CONFIG = {
    explorationStrategy: 'thompson_sampling',
    epsilon: 0.1,
    temperature: 1.0,
    ucbConstant: 2.0,
    thompsonPriorStrength: 1.0,
    minPullsPerArm: 5,
    rewardDiscountFactor: 0.95,
    delayedRewardWeight: 0.6,
    immediateRewardWeight: 0.4,
    enableRewardShaping: true,
    rewardShapingWeights: {
        engagementBonus: 0.2,
        completionBonus: 0.3,
        progressPotential: 0.15,
        explorationBonus: 0.1,
        noveltyBonus: 0.05,
        diversityBonus: 0.1,
        timingBonus: 0.05,
        contextMatchBonus: 0.05,
    },
    maxInterventionsPerDay: 10,
    minInterventionIntervalSeconds: 3600, // 1 hour
    enableContextualBandit: true,
    contextualRegularization: 1.0,
    enableMRTRandomization: false,
    mrtRandomizationProbability: 0.5,
    enableCrisisOverride: true,
    learningRate: 0.01,
    batchSize: 32,
};
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Intervention categories with descriptions
 */
exports.INTERVENTION_CATEGORIES = {
    cognitive_restructuring: {
        name: 'Cognitive Restructuring',
        description: 'Challenge and reframe unhelpful thoughts',
        evidenceBase: 'CBT core technique, extensive RCT support',
    },
    behavioral_activation: {
        name: 'Behavioral Activation',
        description: 'Increase engagement in valued activities',
        evidenceBase: 'Strong evidence for depression (Dimidjian et al., 2006)',
    },
    mindfulness: {
        name: 'Mindfulness',
        description: 'Present-moment awareness without judgment',
        evidenceBase: 'MBCT prevents depression relapse (Segal et al., 2010)',
    },
    psychoeducation: {
        name: 'Psychoeducation',
        description: 'Information about mental health and coping',
        evidenceBase: 'Foundation of most evidence-based treatments',
    },
    social_support: {
        name: 'Social Support',
        description: 'Connection with others for emotional support',
        evidenceBase: 'Strong protective factor (Cohen & Wills, 1985)',
    },
    crisis_intervention: {
        name: 'Crisis Intervention',
        description: 'Immediate safety and stabilization',
        evidenceBase: 'Essential for acute risk management',
    },
    distress_tolerance: {
        name: 'Distress Tolerance',
        description: 'Skills to survive crisis without making things worse',
        evidenceBase: 'DBT core module (Linehan, 1993)',
    },
    emotion_regulation: {
        name: 'Emotion Regulation',
        description: 'Skills to understand and manage emotions',
        evidenceBase: 'DBT core module, transdiagnostic relevance',
    },
    interpersonal_effectiveness: {
        name: 'Interpersonal Effectiveness',
        description: 'Skills for healthy relationships',
        evidenceBase: 'DBT core module',
    },
    physical_wellness: {
        name: 'Physical Wellness',
        description: 'Exercise, sleep, and nutrition for mental health',
        evidenceBase: 'Exercise comparable to antidepressants (Blumenthal et al., 2007)',
    },
    goal_setting: {
        name: 'Goal Setting',
        description: 'Setting and working toward meaningful goals',
        evidenceBase: 'Motivational Interviewing, Self-Determination Theory',
    },
    self_compassion: {
        name: 'Self-Compassion',
        description: 'Kindness toward oneself in difficult moments',
        evidenceBase: 'Neff research, reduces depression and anxiety',
    },
    gratitude: {
        name: 'Gratitude',
        description: 'Appreciating positive aspects of life',
        evidenceBase: 'Positive psychology intervention (Emmons & McCullough, 2003)',
    },
    values_clarification: {
        name: 'Values Clarification',
        description: 'Identifying what matters most',
        evidenceBase: 'ACT core process (Hayes et al., 2006)',
    },
    acceptance: {
        name: 'Acceptance',
        description: 'Making room for difficult experiences',
        evidenceBase: 'ACT core process, alternative to avoidance',
    },
    exposure: {
        name: 'Exposure',
        description: 'Gradual approach to feared situations',
        evidenceBase: 'Gold standard for anxiety disorders',
    },
    problem_solving: {
        name: 'Problem Solving',
        description: 'Structured approach to solving problems',
        evidenceBase: 'PST effective for depression (Cuijpers et al., 2007)',
    },
};
/**
 * Time of day hour ranges
 */
exports.TIME_OF_DAY_HOURS = {
    early_morning: [5, 7],
    morning: [7, 12],
    midday: [12, 14],
    afternoon: [14, 17],
    evening: [17, 21],
    night: [21, 24],
    late_night: [0, 5],
};
/**
 * Default reward shaping weights based on DIAMANTE trial
 */
exports.DIAMANTE_REWARD_WEIGHTS = {
    engagementBonus: 0.25,
    completionBonus: 0.35,
    progressPotential: 0.15,
    explorationBonus: 0.05,
    noveltyBonus: 0.05,
    diversityBonus: 0.05,
    timingBonus: 0.05,
    contextMatchBonus: 0.05,
};
//# sourceMappingURL=IInterventionOptimizer.js.map