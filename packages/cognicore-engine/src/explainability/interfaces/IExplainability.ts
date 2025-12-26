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

// ============================================================================
// CORE EXPLANATION TYPES (Enhanced)
// ============================================================================

/**
 * Types of explanations (extended from OLD)
 */
export type ExplanationType =
  | 'local'           // Explains single prediction (SHAP)
  | 'global'          // Explains overall model behavior
  | 'counterfactual'  // "What if" explanations
  | 'contrastive'     // "Why X and not Y" explanations
  | 'example-based'   // Similar case explanations
  | 'causal'          // Causal chain explanations (NEW: Phase 5.1 integration)
  | 'narrative'       // Natural language story (NEW: HCXAI)
  | 'concept-based';  // High-level concept explanations (NEW: CRAFT)

/**
 * Target audience for explanation (extended)
 */
export type ExplanationAudience =
  | 'user'            // End user (patient/client)
  | 'parent'          // Parent/guardian (NEW: family context)
  | 'clinician'       // Healthcare professional
  | 'auditor'         // Regulatory/compliance reviewer
  | 'regulator'       // EU AI Act compliance (NEW)
  | 'developer';      // Technical debugging

/**
 * Explanation detail level
 */
export type ExplanationLevel = 'simple' | 'detailed' | 'technical';

/**
 * Cognitive style for personalized explanations (NEW: HCXAI)
 */
export type CognitiveStyle =
  | 'visual'          // Prefers visual representations
  | 'analytical'      // Prefers detailed logical analysis
  | 'intuitive'       // Prefers high-level summaries
  | 'sequential';     // Prefers step-by-step explanations

/**
 * EU AI Act risk level (NEW: Regulatory compliance)
 */
export type EUAIActRiskLevel =
  | 'minimal'         // No requirements
  | 'limited'         // Transparency obligations
  | 'high'            // Full conformity assessment
  | 'unacceptable';   // Prohibited

// ============================================================================
// FEATURE ATTRIBUTION (Enhanced SHAP)
// ============================================================================

/**
 * Feature category for mental health context
 */
export type FeatureCategory =
  | 'emotional'       // Mood, energy, stress
  | 'behavioral'      // Actions, habits
  | 'temporal'        // Time of day, day of week
  | 'contextual'      // Trigger, situation
  | 'historical'      // Past patterns, streak
  | 'demographic'     // Age, preferences
  | 'engagement'      // App usage, responses
  | 'family'          // Family dynamics (NEW: Phase 6.1)
  | 'causal';         // Causal factors (NEW: Phase 5.1)

/**
 * Feature metadata for mental health context (enhanced)
 */
export interface IFeatureDefinition {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
  category: FeatureCategory;

  // Value handling
  valueType: 'numeric' | 'categorical' | 'boolean' | 'text';
  possibleValues?: string[];
  minValue?: number;
  maxValue?: number;

  // Attribution
  baselineValue: number | string;
  defaultWeight: number;           // Base weight (0-1)

  // Causal info (NEW: integration with CausalGraph)
  isCausalFactor?: boolean;
  causalParents?: string[];        // What causes this feature
  causalChildren?: string[];       // What this feature causes

  // Visualization
  emoji: string;
  colorPositive: string;
  colorNegative: string;

  // HCXAI metadata (NEW)
  layTermExplanation?: string;     // Plain language for lay users
  clinicalTermExplanation?: string; // Technical for clinicians
}

/**
 * Feature contribution to a decision (enhanced)
 */
export interface IFeatureAttribution {
  featureId: string;
  featureName: string;
  featureNameRu: string;
  featureValue: string | number | boolean;

  // Attribution
  contribution: number;           // -1.0 to 1.0
  absoluteImportance: number;     // 0.0 to 1.0
  shapleyValue?: number;          // Exact Shapley value (NEW: precision)

  // Context
  baselineValue?: string | number;
  comparisonToBaseline?: string;
  comparisonToBaselineRu?: string;

  // Causal context (NEW: Phase 5.1 integration)
  isCausallyRelevant?: boolean;
  causalPathway?: string;         // "stress -> mood -> behavior"

  // Uncertainty (NEW: HCXAI)
  confidenceInterval?: {
    lower: number;
    upper: number;
  };

  // Visualization
  direction: 'positive' | 'negative' | 'neutral';
  emoji?: string;
  color?: string;
}

/**
 * SHAP-like explanation for a single prediction (enhanced)
 */
export interface ISHAPExplanation {
  predictionId: string;
  prediction: string;
  predictionValue: number;
  baselineValue: number;

  // Feature attributions
  attributions: IFeatureAttribution[];
  topPositiveFeatures: IFeatureAttribution[];
  topNegativeFeatures: IFeatureAttribution[];

  // Confidence & Uncertainty (NEW: enhanced)
  confidence: number;
  uncertaintySource?: string;
  uncertaintyQuantification?: {
    method: 'bootstrap' | 'bayesian' | 'ensemble';
    samples: number;
    standardError: number;
  };

  // Causal summary (NEW: Phase 5.1)
  causalSummary?: {
    primaryCause: string;
    causalChain: string[];
    interventionPoints: string[];
  };

  // Metadata
  timestamp: Date;
  computationTime: number;
  explanationVersion: string;
}

// ============================================================================
// COUNTERFACTUAL EXPLANATIONS (Enhanced with Risk-Sensitivity)
// ============================================================================

/**
 * Counterfactual change
 */
export interface ICounterfactualChange {
  featureId: string;
  featureName: string;
  featureNameRu: string;
  currentValue: string | number;
  suggestedValue: string | number;
  changeDescription: string;
  changeDescriptionRu: string;

  // Risk-Sensitive (NEW: 2025 research)
  changeRisk?: 'low' | 'medium' | 'high';
  riskExplanation?: string;
}

/**
 * Counterfactual feasibility (enhanced)
 */
export type CounterfactualFeasibility =
  | 'easy'
  | 'moderate'
  | 'difficult'
  | 'impossible'
  | 'risky';       // NEW: Risk-sensitive counterfactuals

/**
 * Counterfactual scenario (enhanced)
 */
export interface ICounterfactualScenario {
  id: string;
  description: string;
  descriptionRu: string;

  // Changes
  changes: ICounterfactualChange[];

  // Predicted outcome
  alternativeOutcome: string;
  alternativeOutcomeRu: string;
  alternativeValue: number;

  // Feasibility (enhanced)
  feasibility: CounterfactualFeasibility;
  effort: string;
  effortRu: string;

  // Risk-Sensitive (NEW: 2025 research)
  robustness: number;              // 0-1, how robust is this counterfactual
  plausibility: number;            // 0-1, how plausible given context
  sparsity: number;                // 0-1, fewer changes = higher sparsity
  recourseScore: number;           // 0-1, combined actionability score

  // Confidence
  confidence: number;
}

/**
 * Counterfactual explanation (enhanced)
 */
export interface ICounterfactualExplanation {
  predictionId: string;
  currentOutcome: string;
  currentOutcomeRu: string;
  currentValue: number;

  // Scenarios (enhanced ordering)
  scenarios: ICounterfactualScenario[];
  closestCounterfactual?: ICounterfactualScenario;
  mostRobustCounterfactual?: ICounterfactualScenario;  // NEW: risk-sensitive
  easiestCounterfactual?: ICounterfactualScenario;     // NEW: actionability

  // User-friendly summary
  summary: string;
  summaryRu: string;
  userActionableAdvice: string[];
  userActionableAdviceRu: string[];

  // Risk-Sensitive metrics (NEW)
  overallRobustness: number;       // How robust are the explanations
  diversityScore: number;          // How diverse are the scenarios
}

// ============================================================================
// GLOBAL EXPLANATIONS (Enhanced)
// ============================================================================

/**
 * Global feature importance (enhanced)
 */
export interface IGlobalFeatureImportance {
  featureId: string;
  featureName: string;
  featureNameRu: string;
  description: string;
  descriptionRu: string;

  // Importance metrics (enhanced)
  meanAbsoluteSHAP: number;
  medianAbsoluteSHAP: number;      // NEW: more robust
  maxAbsoluteSHAP: number;         // NEW: outlier info
  frequency: number;
  coverage: number;

  // Trends
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPeriod: string;
  trendMagnitude?: number;         // NEW: how much change

  // Category
  category: FeatureCategory;
}

/**
 * Decision rule extracted from model
 */
export interface IDecisionRule {
  id: string;
  condition: string;
  conditionRu: string;
  outcome: string;
  outcomeRu: string;
  coverage: number;
  confidence: number;
  priority: number;

  // NEW: Causal annotation
  isCausal?: boolean;
  causalStrength?: number;
}

/**
 * Bias analysis result (enhanced for EU AI Act)
 */
export interface IBiasAnalysisResult {
  analyzed: boolean;

  // Demographic parity (enhanced)
  demographicParity?: {
    group: string;
    metric: string;
    value: number;
    baseline: number;
    isFair: boolean;
    confidenceInterval?: { lower: number; upper: number };
  }[];

  // Identified biases
  identifiedBiases: {
    type: string;
    description: string;
    descriptionRu: string;
    severity: 'low' | 'medium' | 'high';
    mitigation?: string;
    mitigationRu?: string;
  }[];

  // Overall fairness score
  fairnessScore?: number;

  // EU AI Act compliance (NEW)
  euAIActCompliance?: {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Global model explanation (enhanced)
 */
export interface IGlobalExplanation {
  modelName: string;
  modelVersion: string;

  // Feature importance
  featureImportance: IGlobalFeatureImportance[];

  // Decision rules
  keyDecisionRules: IDecisionRule[];

  // Performance summary
  performanceSummary: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    customMetrics: Record<string, number>;
  };

  // Bias analysis
  biasAnalysis?: IBiasAnalysisResult;

  // EU AI Act compliance (NEW)
  regulatoryCompliance?: {
    euAIActRiskLevel: EUAIActRiskLevel;
    transparencyObligations: string[];
    conformityStatus: 'compliant' | 'partial' | 'non-compliant';
    lastAuditDate?: Date;
  };

  // Metadata
  computedAt: Date;
  dataPointsAnalyzed: number;
}

// ============================================================================
// CAUSAL EXPLANATIONS (NEW: Phase 5.1 Integration)
// ============================================================================

/**
 * Causal chain in explanation
 */
export interface ICausalChain {
  id: string;
  description: string;
  descriptionRu: string;

  // Chain structure
  nodes: {
    variable: string;
    variableRu: string;
    value: string | number;
    role: 'cause' | 'mediator' | 'effect';
  }[];

  // Edges
  edges: {
    from: string;
    to: string;
    strength: number;              // -1 to 1
    mechanism?: string;
    mechanismRu?: string;
  }[];

  // Intervention points
  interventionPoints: {
    variable: string;
    potentialImpact: number;
    feasibility: CounterfactualFeasibility;
    recommendation: string;
    recommendationRu: string;
  }[];
}

/**
 * Causal explanation
 */
export interface ICausalExplanation {
  predictionId: string;

  // Primary causal chain
  primaryChain: ICausalChain;

  // Alternative chains
  alternativeChains?: ICausalChain[];

  // Root causes
  rootCauses: {
    variable: string;
    variableRu: string;
    contribution: number;
    isModifiable: boolean;
  }[];

  // Narrative summary
  narrativeSummary: string;
  narrativeSummaryRu: string;

  // Confidence
  confidence: number;
  methodology: 'do-calculus' | 'pearl' | 'scm' | 'heuristic';
}

// ============================================================================
// NARRATIVE EXPLANATIONS (NEW: HCXAI)
// ============================================================================

/**
 * Narrative structure type
 */
export type NarrativeStructure =
  | 'journey'         // User's journey through decision
  | 'comparison'      // Compare with similar cases
  | 'cause-effect'    // Causal storytelling
  | 'recommendation'; // Action-focused narrative

/**
 * Narrative explanation (NEW: natural language stories)
 */
export interface INarrativeExplanation {
  predictionId: string;

  // Structure
  structure: NarrativeStructure;

  // Narrative content
  title: string;
  titleRu: string;
  opening: string;
  openingRu: string;
  body: string;
  bodyRu: string;
  conclusion: string;
  conclusionRu: string;

  // Key points (bullet-friendly)
  keyPoints: string[];
  keyPointsRu: string[];

  // Call to action
  callToAction?: string;
  callToActionRu?: string;

  // Personalization
  cognitiveStyleUsed: CognitiveStyle;
  ageGroupUsed: 'child' | 'teen' | 'adult';

  // Readability metrics (NEW: HCXAI)
  readability: {
    fleschKincaidGrade: number;
    readingTime: number;           // seconds
    wordCount: number;
  };
}

// ============================================================================
// CLINICIAN-FACING EXPLANATIONS (Enhanced)
// ============================================================================

/**
 * Clinical explanation for healthcare professionals (enhanced)
 */
export interface IClinicianExplanation {
  patientId: string;
  sessionId: string;

  // Clinical context (enhanced)
  clinicalContext: {
    presentingConcern: string;
    presentingConcernRu: string;
    relevantHistory: string[];
    currentSymptoms: string[];
    riskFactors: string[];
    protectiveFactors: string[];
    familyContext?: string;        // NEW: Phase 6.1 integration
  };

  // AI assessment (enhanced)
  aiAssessment: {
    primaryConcern: string;
    severity: 'mild' | 'moderate' | 'severe';
    riskLevel: string;
    confidence: number;
    reasoning: string;
    reasoningRu: string;

    // Causal reasoning (NEW: Phase 5.1)
    causalFactors?: string[];
    mechanismHypothesis?: string;
  };

  // Intervention rationale
  interventionRationale: {
    selectedIntervention: string;
    therapeuticApproach: string;
    evidenceBasis: string[];
    alternativesConsidered: string[];
    contraindications: string[];
    expectedOutcome?: string;       // NEW
    outcomeTimeframe?: string;      // NEW
  };

  // Clinical recommendations
  recommendations: {
    immediateActions: string[];
    followUpRecommendations: string[];
    escalationCriteria: string[];
    referralSuggestions: string[];
    familyInvolvement?: string[];   // NEW: Phase 6.1
  };

  // Uncertainty disclosure (enhanced for HCXAI)
  uncertaintyDisclosure: {
    confidenceLevel: string;
    knownLimitations: string[];
    suggestedVerification: string[];
    modelBlindSpots?: string[];     // NEW: what model might miss
    dataQualityNote?: string;       // NEW: data issues
  };

  // Regulatory compliance (NEW: EU AI Act)
  regulatoryCompliance: {
    euAIActRiskLevel: EUAIActRiskLevel;
    humanOversightRequired: boolean;
    appealProcess?: string;
  };

  // Documentation
  timestamp: Date;
  aiModelVersion: string;
  disclaimer: string;
  disclaimerRu: string;
}

// ============================================================================
// USER-FACING EXPLANATIONS (Enhanced HCXAI)
// ============================================================================

/**
 * Simplified factor for user explanation (enhanced)
 */
export interface IUserFactor {
  name: string;
  nameRu: string;
  value: string;
  impact: 'helps' | 'hurts' | 'neutral';
  emoji: string;
  explanation: string;
  explanationRu: string;

  // HCXAI additions (NEW)
  layTermDescription?: string;     // Very simple explanation
  actionable?: boolean;            // Can user change this?
  actionSuggestion?: string;       // If actionable, what to do
}

/**
 * User explanation (enhanced HCXAI)
 */
export interface IUserExplanation {
  summary: string;
  summaryRu: string;
  reasoning: string;
  reasoningRu: string;

  // Key factors
  keyFactors: IUserFactor[];

  // Confidence (enhanced)
  confidence: {
    level: 'low' | 'medium' | 'high';
    emoji: string;
    description: string;
    descriptionRu: string;
  };

  // Actionable advice
  actionableAdvice: string[];
  actionableAdviceRu: string[];

  // Transparency (enhanced HCXAI)
  limitations: string[];
  limitationsRu: string[];
  disclaimer: string;
  disclaimerRu: string;

  // HCXAI additions (NEW)
  whyThisMatters?: string;         // Connect to user's goals
  whyThisMattersRu?: string;
  whatCanChange?: string[];        // Modifiable factors
  whatCanChangeRu?: string[];

  // Personalization
  ageGroup: 'child' | 'teen' | 'adult';
  cognitiveStyle?: CognitiveStyle;

  // Effectiveness tracking (NEW)
  explanationId: string;           // For tracking understanding
  feedbackPrompt?: string;         // "Did this make sense?"
}

// ============================================================================
// EXPLANATION EFFECTIVENESS (NEW: HCXAI)
// ============================================================================

/**
 * Explanation effectiveness metrics (NEW)
 */
export interface IExplanationEffectiveness {
  explanationId: string;
  userId: string;

  // User feedback
  userUnderstood?: boolean;
  userFoundHelpful?: boolean;
  userRating?: number;             // 1-5
  userFeedbackText?: string;

  // Behavioral metrics
  timeSpentReading?: number;       // seconds
  scrollDepth?: number;            // 0-1
  expandedDetails?: boolean;
  clickedLearnMore?: boolean;

  // Outcome metrics
  followedAdvice?: boolean;
  interventionAccepted?: boolean;
  subsequentBehaviorChange?: boolean;

  // A/B test info
  explanationVariant?: string;
  experimentId?: string;

  // Timestamp
  recordedAt: Date;
}

// ============================================================================
// EXPLANATION REQUEST/RESPONSE (Enhanced)
// ============================================================================

/**
 * Request for explanation (enhanced)
 */
export interface IExplanationRequest {
  predictionId: string;
  predictionType: string;

  // Context
  context: Record<string, unknown>;
  inputFeatures: Record<string, unknown>;
  output: unknown;

  // Explanation preferences (enhanced)
  audience: ExplanationAudience;
  level: ExplanationLevel;
  types: ExplanationType[];

  // Options
  includeCounterfactuals: boolean;
  includeGlobalContext: boolean;
  includeCausal: boolean;          // NEW: Phase 5.1
  includeNarrative: boolean;       // NEW: HCXAI
  maxCounterfactuals?: number;

  // Personalization (enhanced)
  ageGroup?: 'child' | 'teen' | 'adult';
  cognitiveStyle?: CognitiveStyle; // NEW: HCXAI
  language?: 'en' | 'ru';
  preferredNarrativeStructure?: NarrativeStructure; // NEW

  // Regulatory (NEW)
  requireEUAIActCompliance?: boolean;
}

/**
 * Complete explanation response (enhanced)
 */
export interface IExplanationResponse {
  requestId: string;
  predictionId: string;

  // Explanations by type (enhanced)
  localExplanation?: ISHAPExplanation;
  counterfactualExplanation?: ICounterfactualExplanation;
  globalContext?: IGlobalExplanation;
  clinicianExplanation?: IClinicianExplanation;
  causalExplanation?: ICausalExplanation;           // NEW: Phase 5.1
  narrativeExplanation?: INarrativeExplanation;     // NEW: HCXAI

  // User-facing summary
  userExplanation: IUserExplanation;

  // Regulatory compliance (NEW)
  regulatoryInfo?: {
    euAIActRiskLevel: EUAIActRiskLevel;
    isCompliant: boolean;
    transparencyMet: boolean;
    humanOversightRequired: boolean;
  };

  // Metadata (enhanced)
  generatedAt: Date;
  computationTime: number;
  explanationVersion: string;

  // Effectiveness tracking (NEW)
  effectivenessTrackingEnabled: boolean;
  feedbackUrl?: string;
}

// ============================================================================
// SERVICE INTERFACES (Enhanced)
// ============================================================================

/**
 * Explainability Service interface (enhanced)
 */
export interface IExplainabilityService {
  // Main explanation generator
  explain(request: IExplanationRequest): Promise<IExplanationResponse>;

  // Specific explanation types
  generateSHAPExplanation(
    features: Record<string, unknown>,
    prediction: unknown
  ): Promise<ISHAPExplanation>;

  generateCounterfactuals(
    features: Record<string, unknown>,
    currentOutcome: string,
    desiredOutcome?: string,
    options?: {
      maxCounterfactuals?: number;
      requireRobust?: boolean;      // NEW: risk-sensitive
      feasibilityThreshold?: CounterfactualFeasibility;
    }
  ): Promise<ICounterfactualExplanation>;

  generateGlobalExplanation(
    predictionType: string
  ): Promise<IGlobalExplanation>;

  generateClinicianExplanation(
    sessionData: Record<string, unknown>
  ): Promise<IClinicianExplanation>;

  // NEW: Causal explanations (Phase 5.1 integration)
  generateCausalExplanation(
    features: Record<string, unknown>,
    outcome: string
  ): Promise<ICausalExplanation>;

  // NEW: Narrative explanations (HCXAI)
  generateNarrativeExplanation(
    explanation: IExplanationResponse,
    options: {
      structure: NarrativeStructure;
      ageGroup: 'child' | 'teen' | 'adult';
      cognitiveStyle?: CognitiveStyle;
      language: 'en' | 'ru';
    }
  ): Promise<INarrativeExplanation>;

  // Format explanations
  formatForAudience(
    explanation: IExplanationResponse,
    audience: ExplanationAudience,
    level: ExplanationLevel
  ): string;

  // Caching
  getCachedGlobalExplanation(predictionType: string): IGlobalExplanation | null;
  invalidateCache(predictionType?: string): void;

  // NEW: Effectiveness tracking
  recordExplanationFeedback(
    feedback: Partial<IExplanationEffectiveness>
  ): Promise<void>;

  getExplanationEffectiveness(
    explanationId: string
  ): Promise<IExplanationEffectiveness | null>;
}

/**
 * Feature Attribution Engine interface
 */
export interface IFeatureAttributionEngine {
  calculateAttributions(
    features: Record<string, unknown>,
    prediction: {
      outcome: string;
      value: number;
      confidence: number;
    }
  ): ISHAPExplanation;

  visualizeAttributions(
    explanation: ISHAPExplanation,
    format: 'text' | 'bars' | 'emoji'
  ): string;

  generateUserSummary(
    explanation: ISHAPExplanation,
    ageGroup: 'child' | 'teen' | 'adult'
  ): string;

  addFeature(definition: IFeatureDefinition): void;
  getFeature(featureId: string): IFeatureDefinition | undefined;
  getFeaturesByCategory(category: FeatureCategory): IFeatureDefinition[];
}

/**
 * Counterfactual Explainer interface
 */
export interface ICounterfactualExplainer {
  generateCounterfactuals(
    currentFeatures: Record<string, unknown>,
    currentOutcome: string,
    desiredOutcome?: string,
    maxCounterfactuals?: number,
    options?: {
      requireRobust?: boolean;
      minRobustness?: number;
      feasibilityThreshold?: CounterfactualFeasibility;
    }
  ): ICounterfactualExplanation;

  formatForDisplay(
    explanation: ICounterfactualExplanation,
    ageGroup: 'child' | 'teen' | 'adult'
  ): string;

  // NEW: Risk-sensitive methods
  calculateRobustness(scenario: ICounterfactualScenario): number;
  calculatePlausibility(
    scenario: ICounterfactualScenario,
    contextFeatures: Record<string, unknown>
  ): number;
}

/**
 * Narrative Generator interface (NEW: HCXAI)
 */
export interface INarrativeGenerator {
  generateNarrative(
    explanation: IExplanationResponse,
    options: {
      structure: NarrativeStructure;
      ageGroup: 'child' | 'teen' | 'adult';
      cognitiveStyle?: CognitiveStyle;
      language: 'en' | 'ru';
      maxWords?: number;
    }
  ): INarrativeExplanation;

  // Templates for different structures
  getTemplates(
    structure: NarrativeStructure,
    language: 'en' | 'ru'
  ): string[];

  // Personalize based on user history
  personalizeNarrative(
    narrative: INarrativeExplanation,
    userHistory: {
      previousExplanations: string[];
      preferredStyle?: CognitiveStyle;
      comprehensionLevel?: number;
    }
  ): INarrativeExplanation;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default explainability configuration
 */
export const DEFAULT_EXPLAINABILITY_CONFIG = {
  maxCounterfactuals: 3,
  minRobustness: 0.6,
  minPlausibility: 0.5,
  cacheExpirationMs: 60 * 60 * 1000, // 1 hour
  enableEffectivenessTracking: true,
  defaultLanguage: 'ru' as const,
  defaultAgeGroup: 'adult' as const,
  euAIActComplianceRequired: true,
};

/**
 * EU AI Act transparency requirements
 */
export const EU_AI_ACT_REQUIREMENTS = {
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
export const HCXAI_PRINCIPLES = {
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
export const READABILITY_TARGETS = {
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
