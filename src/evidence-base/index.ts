/**
 * Evidence Base Module
 * ====================
 * Clinical guidelines and evidence-based recommendations.
 *
 * @packageDocumentation
 * @module @sleepcore/evidence-base
 */

// European Insomnia Guideline 2023
export {
  EuropeanGuideline2023,
  europeanGuideline2023,
  DIAGNOSTIC_RECOMMENDATIONS,
  TREATMENT_RECOMMENDATIONS,
  PHARMACOLOGICAL_RECOMMENDATIONS,
  CBTI_COMPONENT_EVIDENCE,
  PHARMACOLOGICAL_EVIDENCE,
  DCBTI_CRITERIA,
} from './guidelines/EuropeanInsomnia2023';

export type {
  EvidenceGrade,
  RecommendationStrength,
  TreatmentCategory,
  IGuidelineRecommendation,
  ICBTIComponentEvidence,
  IPharmacologicalEvidence,
  IDCBTICriteria,
} from './guidelines/EuropeanInsomnia2023';
