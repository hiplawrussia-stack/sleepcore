"use strict";
/**
 * Explainability Framework Interfaces
 * ====================================
 * Phase 5.2: Enterprise-Grade Explainable AI (XAI) for Mental Health
 *
 * World-class XAI system based on 2025 research:
 *
 * Research Foundation:
 * - SHAP (Lundberg & Lee, 2017) - Game-theoretic feature attribution
 * - LIME (Ribeiro et al., 2016) - Local interpretable explanations
 * - Wachter et al. (2017) - Counterfactual explanations
 * - RiskPath Toolkit (Utah, 2025) - 85-99% accuracy in healthcare XAI
 * - EU AI Act (Feb 2025) - Transparency obligations for high-risk AI
 * - HCXAI Framework - Human-Centered Explainable AI
 * - TIFU Framework - Transparency and Interpretability For Understandability
 * - Risk-Sensitive Counterfactuals (2024-2025) - Robust explanations
 * - CRAFT (2024) - Concept-based explanations
 *
 * Key Enhancements over Phase 7 (OLD):
 * 1. Risk-Sensitive Counterfactuals - robust explanations
 * 2. HCXAI compliance - human-centered design
 * 3. EU AI Act markers - regulatory compliance
 * 4. TIFU framework - mental health specific
 * 5. Causal integration - with CausalGraph (Phase 5.1)
 * 6. Narrative generation - natural language stories
 * 7. Personalized XAI - cognitive style adaptation
 * 8. Effectiveness tracking - did user understand?
 *
 * Time2Stop Research: +53.8% intervention effectiveness with explanations
 *
 * (c) BF "Drugoy Put", 2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.READABILITY_TARGETS = exports.HCXAI_PRINCIPLES = exports.EU_AI_ACT_REQUIREMENTS = exports.DEFAULT_EXPLAINABILITY_CONFIG = void 0;
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Default explainability configuration
 */
exports.DEFAULT_EXPLAINABILITY_CONFIG = {
    maxCounterfactuals: 3,
    minRobustness: 0.6,
    minPlausibility: 0.5,
    cacheExpirationMs: 60 * 60 * 1000, // 1 hour
    enableEffectivenessTracking: true,
    defaultLanguage: 'ru',
    defaultAgeGroup: 'adult',
    euAIActComplianceRequired: true,
};
/**
 * EU AI Act transparency requirements
 */
exports.EU_AI_ACT_REQUIREMENTS = {
    high: {
        riskAssessment: true,
        dataGovernance: true,
        humanOversight: true,
        transparency: true,
        accuracyRobustness: true,
        recordKeeping: true,
        informationProvision: true,
    },
    limited: {
        transparency: true,
        humanOversightOptional: true,
    },
    minimal: {
        voluntaryCodesOfConduct: true,
    },
};
/**
 * HCXAI principles
 */
exports.HCXAI_PRINCIPLES = {
    meaningfulness: 'Explanations must be meaningful to the target audience',
    actionability: 'Explanations should enable users to take appropriate actions',
    accuracy: 'Explanations must accurately represent the AI system',
    appropriateness: 'Level of detail appropriate for audience expertise',
    timeliness: 'Explanations provided at the right moment',
    interactivity: 'Allow users to explore and ask follow-up questions',
};
/**
 * Readability targets by age group
 */
exports.READABILITY_TARGETS = {
    child: {
        maxFleschKincaidGrade: 4,
        maxWords: 100,
        maxSentenceLength: 10,
    },
    teen: {
        maxFleschKincaidGrade: 8,
        maxWords: 200,
        maxSentenceLength: 15,
    },
    adult: {
        maxFleschKincaidGrade: 12,
        maxWords: 400,
        maxSentenceLength: 25,
    },
};
//# sourceMappingURL=IExplainability.js.map