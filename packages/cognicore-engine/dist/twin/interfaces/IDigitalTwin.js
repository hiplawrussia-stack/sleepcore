"use strict";
/**
 * Digital Twin Interfaces
 *
 * Phase 6.3: Mental Health Digital Twin (MHDT) for Precision Mental Health
 *
 * 2025 Research Integration:
 * - CogniFit/Duke Digital Cognitive Twins Framework (2025)
 * - Kalman Filter State Estimation (Enhanced KF, Ensemble KF)
 * - Bayesian Model Updating for Digital Twins (GenAI-BMU)
 * - Digital Phenotyping (smartphone sensors, EMA)
 * - POMDP Belief State Modeling
 * - Multi-layer Architecture (sensing, processing, simulation, visualization)
 * - Big AI Integration (physics-based + data-driven)
 * - Real-time Bidirectional Synchronization
 *
 * Research basis:
 * - Nature: "Digital twins and Big AI: the future of truly individualised healthcare"
 * - PMC: "Digital Twin Cognition: AI-Biomarker Integration in Biomimetic Neuropsychology"
 * - Frontiers: "Digital twins and the future of precision mental health"
 * - JAMA Psychiatry: "A Dynamical Systems View of Psychiatric Disorders"
 * - arXiv: "Position: AI Will Transform Neuropsychology Through MHDTs"
 *
 * © БФ "Другой путь", 2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SIMULATION_CONFIG = void 0;
exports.generateTwinId = generateTwinId;
const crypto_1 = require("crypto");
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateTwinId(prefix = 'TWIN') {
    return `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`;
}
exports.DEFAULT_SIMULATION_CONFIG = {
    numTrajectories: 1000,
    timeStepDays: 0.5,
    noiseLevel: 0.1,
    usePersonalization: true,
    includeCircadian: false,
    includeWeekly: true,
    includeSeasonal: false,
    ensembleMethod: 'monte_carlo',
    ensembleWeighting: 'equal',
    propagateUncertainty: true,
    uncertaintyMethod: 'sampling',
    maxComputeTimeMs: 10000,
    parallelization: true,
};
//# sourceMappingURL=IDigitalTwin.js.map