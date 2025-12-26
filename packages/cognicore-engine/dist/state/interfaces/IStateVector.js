"use strict";
/**
 * 🧬 STATE VECTOR INTERFACE
 * =========================
 * Master Interface - POMDP State Vector S_t
 * World-First Complete Human Wellbeing State Representation
 *
 * Mathematical Foundation:
 * S_t = (e_t, c_t, n_t, r_t, b_t)
 *
 * Where:
 * - e_t: Emotional State (VAD + discrete emotions)
 * - c_t: Cognitive State (Beck's triad + distortions)
 * - n_t: Narrative State (Story arc + change stage)
 * - r_t: Risk State (Multi-layer risk assessment)
 * - b_t: Resource State (PERMA + coping resources)
 *
 * Scientific Foundation:
 * - POMDP Framework (Kaelbling et al., 1998)
 * - Integrated Theory of Wellbeing
 * - Dynamic Systems Theory of Change
 * - Computational Psychiatry (Huys et al., 2016)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEX_THRESHOLDS = exports.WELLBEING_WEIGHTS = void 0;
exports.getComponentStatus = getComponentStatus;
/**
 * Wellbeing index calculation weights
 */
exports.WELLBEING_WEIGHTS = {
    emotional: {
        valence: 0.25,
        arousal: 0.1,
        dominance: 0.15
    },
    cognitive: {
        coreBeliefs: 0.15,
        distortionAbsence: 0.1
    },
    narrative: {
        stageProgress: 0.05,
        roleGrowth: 0.05
    },
    risk: {
        safetyInverse: 0.05 // Higher safety = higher wellbeing
    },
    resources: {
        perma: 0.1
    }
};
/**
 * Index calculation thresholds
 */
exports.INDEX_THRESHOLDS = {
    wellbeing: {
        critical: 20,
        low: 40,
        moderate: 60,
        good: 80,
        excellent: 95
    },
    stability: {
        volatile: 20,
        unstable: 40,
        moderate: 60,
        stable: 80,
        veryStable: 95
    },
    urgency: {
        none: 20,
        low: 40,
        moderate: 60,
        high: 80,
        critical: 95
    }
};
/**
 * Calculate component status from score
 */
function getComponentStatus(score) {
    if (score >= 0.8)
        return 'excellent';
    if (score >= 0.6)
        return 'good';
    if (score >= 0.4)
        return 'moderate';
    if (score >= 0.2)
        return 'concerning';
    return 'critical';
}
//# sourceMappingURL=IStateVector.js.map