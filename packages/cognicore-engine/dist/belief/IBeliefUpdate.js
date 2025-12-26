"use strict";
/**
 * 🧠 BAYESIAN BELIEF UPDATE INTERFACES
 * =====================================
 * POMDP-based Belief State Management
 *
 * Scientific Foundation (2024-2025 Research):
 * - Active Inference / POMDP (Computational Psychiatry, 2025)
 * - Bayesian Cognitive Modeling (Griffiths et al., 2024)
 * - Kalman Filter for EMA mood dynamics (Applied Comp. Psychiatry, 2024)
 * - Belief space planning (ANPL, 2025)
 *
 * Core Concept:
 * In POMDP, the agent maintains a "belief" - a probability distribution
 * over possible hidden states. Each observation updates this belief
 * using Bayes' rule: P(state|observation) ∝ P(observation|state) × P(state)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPULATION_EMOTION_PRIORS = exports.DEFAULT_BELIEF_CONFIG = void 0;
/**
 * Default configuration
 */
exports.DEFAULT_BELIEF_CONFIG = {
    defaultPriorVariance: 0.25,
    minVariance: 0.01,
    beliefDecayRate: 0.01, // Variance increases by 1% per hour
    significanceThreshold: 0.2,
    reliabilityWeights: {
        'self_report_emotion': 0.9,
        'self_report_mood': 0.85,
        'assessment': 0.95,
        'text_message': 0.7,
        'behavioral': 0.6,
        'contextual': 0.5,
        'sensor': 0.65,
        'interaction': 0.55,
    },
    useActiveInference: true,
};
/**
 * Emotion priors based on population data
 * Used for initializing beliefs for new users
 */
exports.POPULATION_EMOTION_PRIORS = {
    neutral: 0.3,
    calm: 0.1,
    contentment: 0.08,
    joy: 0.05,
    sadness: 0.08,
    anxiety: 0.07,
    stress: 0.1,
    frustration: 0.05,
    boredom: 0.05,
    // ... lower probability for others
    anger: 0.02,
    fear: 0.02,
    surprise: 0.01,
    disgust: 0.01,
    trust: 0.01,
    anticipation: 0.01,
    love: 0.01,
    guilt: 0.01,
    shame: 0.01,
    hope: 0.01,
    confusion: 0.01,
    loneliness: 0.01,
    excitement: 0.01,
    irritation: 0.01,
    despair: 0.005,
    pride: 0.005,
    gratitude: 0.005,
    envy: 0.005,
    jealousy: 0.005,
    overwhelm: 0.005,
    numbness: 0.005,
    curiosity: 0.01,
    awe: 0.005,
    // Crisis-related emotions (Phase 6.2)
    hopelessness: 0.002, // Very low prior - crisis indicator
    relief: 0.01,
    apathy: 0.01,
    resentment: 0.01,
};
//# sourceMappingURL=IBeliefUpdate.js.map