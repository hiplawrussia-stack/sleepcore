/**
 * Crisis Detection Module
 * Multi-layer crisis detection for mental health safety
 */

export {
  CrisisDetector,
  createCrisisDetector,
  defaultCrisisDetector,
  DEFAULT_CRISIS_CONFIG,
} from './CrisisDetector';

export type {
  CrisisSeverity,
  CrisisType,
  LayerResult,
  CrisisDetectionResult,
  CrisisDetectorConfig,
  StateRiskData,
} from './CrisisDetector';
