"use strict";
/**
 * 🔬 CAUSAL GRAPH LAYER - INTERFACES
 * ===================================
 * Phase 5.1: Causal Discovery & Intervention Targeting
 *
 * Scientific Foundation (2024-2025):
 * - Pearl's Causal Hierarchy: Association → Intervention → Counterfactual
 * - PC Algorithm (Spirtes, Glymour, Scheines, 2000)
 * - PyWhy/DoWhy Framework (Microsoft Research, 2024)
 * - Critical Slowing Down for Depression (PNAS, 2019)
 * - BOSS Algorithm (PMC, 2024) - Best Order Score Search
 * - Causal Forest (Wager & Athey, 2018) - Heterogeneous treatment effects
 *
 * Market Context (2025):
 * - Causal AI Market: $63.37M (2025) → $1.62B (2035), 38.35% CAGR
 * - Key drivers: Personalized interventions, XAI requirements, healthcare
 *
 * Integration Points:
 * - StateVector (Phase 3.1) - Provides observation data
 * - InterventionOptimizer (Phase 3.4) - Consumes causal targets
 * - TemporalEchoEngine (Phase 3.2) - Temporal pattern integration
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MENTAL_HEALTH_DOMAIN_PRIORS = exports.DEFAULT_NODE_TEMPLATES = exports.DEFAULT_DISCOVERY_CONFIG = void 0;
/**
 * Default discovery configuration
 */
exports.DEFAULT_DISCOVERY_CONFIG = {
    algorithm: 'hybrid',
    significanceLevel: 0.05,
    minConfidence: 0.6,
    minObservations: 30,
    maxParents: 5,
    forbiddenEdges: [],
    requiredEdges: [],
    useDomainPriors: true,
    domainPriors: [],
    respectTemporalOrder: true,
    maxLagDays: 7,
};
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Default node templates for mental health domain
 */
exports.DEFAULT_NODE_TEMPLATES = [
    // Emotions
    { id: 'emotion_anxiety', name: 'Anxiety', nameRu: 'Тревога', type: 'emotion', isObservable: true, isManipulable: false },
    { id: 'emotion_sadness', name: 'Sadness', nameRu: 'Грусть', type: 'emotion', isObservable: true, isManipulable: false },
    { id: 'emotion_anger', name: 'Anger', nameRu: 'Гнев', type: 'emotion', isObservable: true, isManipulable: false },
    { id: 'emotion_joy', name: 'Joy', nameRu: 'Радость', type: 'emotion', isObservable: true, isManipulable: false },
    { id: 'emotion_irritability', name: 'Irritability', nameRu: 'Раздражительность', type: 'emotion', isObservable: true, isManipulable: false },
    // Cognitions
    { id: 'cognition_rumination', name: 'Rumination', nameRu: 'Руминация', type: 'cognition', isObservable: false, isManipulable: true },
    { id: 'cognition_catastrophizing', name: 'Catastrophizing', nameRu: 'Катастрофизация', type: 'cognition', isObservable: false, isManipulable: true },
    { id: 'cognition_self_criticism', name: 'Self-criticism', nameRu: 'Самокритика', type: 'cognition', isObservable: false, isManipulable: true },
    // Behaviors
    { id: 'behavior_withdrawal', name: 'Social withdrawal', nameRu: 'Социальная изоляция', type: 'behavior', isObservable: true, isManipulable: true },
    { id: 'behavior_avoidance', name: 'Avoidance', nameRu: 'Избегание', type: 'behavior', isObservable: true, isManipulable: true },
    { id: 'behavior_substance_use', name: 'Substance use', nameRu: 'Употребление веществ', type: 'behavior', isObservable: true, isManipulable: true },
    // Physiological
    { id: 'physio_sleep_quality', name: 'Sleep quality', nameRu: 'Качество сна', type: 'physiological', isObservable: true, isManipulable: true },
    { id: 'physio_energy', name: 'Energy level', nameRu: 'Уровень энергии', type: 'physiological', isObservable: true, isManipulable: true },
    { id: 'physio_appetite', name: 'Appetite', nameRu: 'Аппетит', type: 'physiological', isObservable: true, isManipulable: false },
    // Triggers
    { id: 'trigger_stress', name: 'Stress event', nameRu: 'Стрессовое событие', type: 'trigger', isObservable: true, isManipulable: false },
    { id: 'trigger_conflict', name: 'Interpersonal conflict', nameRu: 'Межличностный конфликт', type: 'trigger', isObservable: true, isManipulable: false },
    { id: 'trigger_loss', name: 'Loss/Rejection', nameRu: 'Потеря/Отвержение', type: 'trigger', isObservable: true, isManipulable: false },
    { id: 'trigger_craving', name: 'Craving', nameRu: 'Тяга', type: 'trigger', isObservable: true, isManipulable: false },
    // Protective
    { id: 'protective_social_support', name: 'Social support', nameRu: 'Социальная поддержка', type: 'protective', isObservable: true, isManipulable: true },
    { id: 'protective_coping_skills', name: 'Coping skills', nameRu: 'Навыки совладания', type: 'protective', isObservable: false, isManipulable: true },
];
/**
 * Expert-defined causal relationships for mental health domain
 * Based on CBT model, emotion regulation theory, and addiction research
 */
exports.MENTAL_HEALTH_DOMAIN_PRIORS = [
    // Trigger → Emotion pathways
    { sourceId: 'trigger_stress', targetId: 'emotion_anxiety', strength: 0.7, confidence: 'established', minLagHours: 0, maxLagHours: 24, peakLagHours: 2 },
    { sourceId: 'trigger_conflict', targetId: 'emotion_anger', strength: 0.6, confidence: 'established', minLagHours: 0, maxLagHours: 4, peakLagHours: 0.5 },
    { sourceId: 'trigger_loss', targetId: 'emotion_sadness', strength: 0.8, confidence: 'established', minLagHours: 0, maxLagHours: 168, peakLagHours: 24 },
    // Emotion → Cognition pathways
    { sourceId: 'emotion_anxiety', targetId: 'cognition_catastrophizing', strength: 0.6, confidence: 'established', minLagHours: 0, maxLagHours: 12, peakLagHours: 1 },
    { sourceId: 'emotion_sadness', targetId: 'cognition_rumination', strength: 0.7, confidence: 'established', minLagHours: 1, maxLagHours: 48, peakLagHours: 6 },
    // Cognition → Behavior pathways
    { sourceId: 'cognition_rumination', targetId: 'behavior_withdrawal', strength: 0.5, confidence: 'probable', minLagHours: 12, maxLagHours: 72, peakLagHours: 24 },
    { sourceId: 'cognition_catastrophizing', targetId: 'behavior_avoidance', strength: 0.6, confidence: 'probable', minLagHours: 0, maxLagHours: 24, peakLagHours: 4 },
    // Emotion → Physiological pathways
    { sourceId: 'emotion_anxiety', targetId: 'physio_sleep_quality', strength: -0.6, confidence: 'established', minLagHours: 4, maxLagHours: 24, peakLagHours: 8 },
    { sourceId: 'emotion_sadness', targetId: 'physio_energy', strength: -0.5, confidence: 'established', minLagHours: 6, maxLagHours: 48, peakLagHours: 12 },
    // Physiological → Emotion feedback
    { sourceId: 'physio_sleep_quality', targetId: 'emotion_irritability', strength: -0.5, confidence: 'established', minLagHours: 8, maxLagHours: 24, peakLagHours: 12 },
    // Protective factors
    { sourceId: 'protective_social_support', targetId: 'emotion_sadness', strength: -0.4, confidence: 'probable', minLagHours: 0, maxLagHours: 48, peakLagHours: 6 },
    { sourceId: 'protective_coping_skills', targetId: 'cognition_rumination', strength: -0.5, confidence: 'probable', minLagHours: 0, maxLagHours: 24, peakLagHours: 2 },
    // Addiction-specific
    { sourceId: 'emotion_anxiety', targetId: 'behavior_substance_use', strength: 0.4, confidence: 'probable', minLagHours: 0, maxLagHours: 12, peakLagHours: 2 },
    { sourceId: 'trigger_craving', targetId: 'behavior_substance_use', strength: 0.7, confidence: 'established', minLagHours: 0, maxLagHours: 4, peakLagHours: 1 },
];
//# sourceMappingURL=ICausalGraph.js.map