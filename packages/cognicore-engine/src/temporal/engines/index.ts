/**
 * 🧠 TEMPORAL ENGINES
 * ===================
 * Phase 1 CogniCore Engine 2.0
 *
 * Engines for nonlinear cognitive dynamics modeling:
 * - PLRNNEngine: Piecewise Linear RNN for nonlinear psychological dynamics
 * - KalmanFormerEngine: Hybrid Kalman + Transformer architecture
 *
 * © БФ "Другой путь", 2025
 */

export {
  PLRNNEngine,
  createPLRNNEngine,
  DEFAULT_PLRNN_CONFIG,
} from './PLRNNEngine';

export {
  KalmanFormerEngine,
  createKalmanFormerEngine,
  DEFAULT_KALMANFORMER_CONFIG,
} from './KalmanFormerEngine';
