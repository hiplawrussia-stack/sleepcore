"use strict";
/**
 * ⏰ TEMPORAL PREDICTION INTERFACES
 * ==================================
 * Temporal Echo Engine - State Forecasting System
 *
 * Scientific Foundation (2024-2025 Research):
 * - Kalman Filter for mood dynamics (Applied Comp. Psychiatry Lab, 2024)
 * - JITAI frameworks for vulnerability windows (Frontiers Digital Health, 2025)
 * - Nonlinear state-space models (medRxiv, 2025)
 * - Transformer-based emotion forecasting (JMIR, 2025)
 * - EMA + passive sensing prediction (JMIR, 2025)
 *
 * Prediction Horizons:
 * - 6h: Immediate intervention window
 * - 12h: Short-term planning
 * - 24h: Daily rhythm prediction
 * - 72h: Multi-day trajectory
 * - 1w: Weekly pattern analysis
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HORIZON_HOURS = exports.DEFAULT_TEMPORAL_CONFIG = void 0;
/**
 * Default configuration
 */
exports.DEFAULT_TEMPORAL_CONFIG = {
    minHistorySize: 5,
    smoothingMethod: 'kalman',
    kalmanParams: {
        processNoise: 0.1,
        measurementNoise: 0.3,
        initialUncertainty: 1.0,
    },
    ewmaAlpha: 0.3,
    confidenceThreshold: 0.6,
    detectNonlinearDynamics: true,
    circadianMinDays: 7,
};
/**
 * Horizon to hours mapping
 */
exports.HORIZON_HOURS = {
    '6h': 6,
    '12h': 12,
    '24h': 24,
    '72h': 72,
    '1w': 168,
};
//# sourceMappingURL=ITemporalPrediction.js.map