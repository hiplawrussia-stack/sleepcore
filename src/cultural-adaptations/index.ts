/**
 * Cultural Adaptations Module
 * ===========================
 * Evidence-based cultural adaptations for CBT-I integration
 * with traditional medicine systems worldwide.
 *
 * @packageDocumentation
 * @module @sleepcore/cultural-adaptations
 */

// ============= Asian Adaptations =============

// TCM (Traditional Chinese Medicine) Integration
export {
  TCMIntegratedCBTIEngine,
  tcmCBTIEngine,
  INSOMNIA_ACUPOINTS,
  HERBAL_FORMULAS,
  TAI_CHI_PROTOCOL,
  QIGONG_PROTOCOL,
} from './asia/TCMIntegratedCBTI';

export type {
  TCMConstitution,
  TCMInsomniaPattern,
  TCMTherapyType,
  IntegrationMode,
  IAcupoint,
  IHerbalFormula,
  IMindBodyProtocol,
  ITCMAssessment,
  ITCMCBTIPlan,
} from './asia/TCMIntegratedCBTI';

// Ayurveda & Yoga (India) Integration
export {
  AyurvedaYogaEngine,
  ayurvedaYogaEngine,
  SLEEP_HERBS,
  YOGA_NIDRA_PROTOCOL,
  DINACHARYA_TEMPLATES,
} from './asia/AyurvedaYogaIntegration';

export type {
  Dosha,
  Prakriti,
  IVikriti,
  AnidraType,
  YogaNidraStage,
  AyurvedicTherapy,
  IAyurvedicHerb,
  IYogaNidraProtocol,
  IDinacharya,
  IAyurvedicAssessment,
} from './asia/AyurvedaYogaIntegration';
