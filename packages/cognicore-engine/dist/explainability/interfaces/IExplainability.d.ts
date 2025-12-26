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
/**
 * Types of explanations (extended from OLD)
 */
export type ExplanationType = 'local' | 'global' | 'counterfactual' | 'contrastive' | 'example-based' | 'causal' | 'narrative' | 'concept-based';
/**
 * Target audience for explanation (extended)
 */
export type ExplanationAudience = 'user' | 'parent' | 'clinician' | 'auditor' | 'regulator' | 'developer';
/**
 * Explanation detail level
 */
export type ExplanationLevel = 'simple' | 'detailed' | 'technical';
/**
 * Cognitive style for personalized explanations (NEW: HCXAI)
 */
export type CognitiveStyle = 'visual' | 'analytical' | 'intuitive' | 'sequential';
/**
 * EU AI Act risk level (NEW: Regulatory compliance)
 */
export type EUAIActRiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable';
/**
 * Feature category for mental health context
 */
export type FeatureCategory = 'emotional' | 'behavioral' | 'temporal' | 'contextual' | 'historical' | 'demographic' | 'engagement' | 'family' | 'causal';
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
    valueType: 'numeric' | 'categorical' | 'boolean' | 'text';
    possibleValues?: string[];
    minValue?: number;
    maxValue?: number;
    baselineValue: number | string;
    defaultWeight: number;
    isCausalFactor?: boolean;
    causalParents?: string[];
    causalChildren?: string[];
    emoji: string;
    colorPositive: string;
    colorNegative: string;
    layTermExplanation?: string;
    clinicalTermExplanation?: string;
}
/**
 * Feature contribution to a decision (enhanced)
 */
export interface IFeatureAttribution {
    featureId: string;
    featureName: string;
    featureNameRu: string;
    featureValue: string | number | boolean;
    contribution: number;
    absoluteImportance: number;
    shapleyValue?: number;
    baselineValue?: string | number;
    comparisonToBaseline?: string;
    comparisonToBaselineRu?: string;
    isCausallyRelevant?: boolean;
    causalPathway?: string;
    confidenceInterval?: {
        lower: number;
        upper: number;
    };
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
    attributions: IFeatureAttribution[];
    topPositiveFeatures: IFeatureAttribution[];
    topNegativeFeatures: IFeatureAttribution[];
    confidence: number;
    uncertaintySource?: string;
    uncertaintyQuantification?: {
        method: 'bootstrap' | 'bayesian' | 'ensemble';
        samples: number;
        standardError: number;
    };
    causalSummary?: {
        primaryCause: string;
        causalChain: string[];
        interventionPoints: string[];
    };
    timestamp: Date;
    computationTime: number;
    explanationVersion: string;
}
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
    changeRisk?: 'low' | 'medium' | 'high';
    riskExplanation?: string;
}
/**
 * Counterfactual feasibility (enhanced)
 */
export type CounterfactualFeasibility = 'easy' | 'moderate' | 'difficult' | 'impossible' | 'risky';
/**
 * Counterfactual scenario (enhanced)
 */
export interface ICounterfactualScenario {
    id: string;
    description: string;
    descriptionRu: string;
    changes: ICounterfactualChange[];
    alternativeOutcome: string;
    alternativeOutcomeRu: string;
    alternativeValue: number;
    feasibility: CounterfactualFeasibility;
    effort: string;
    effortRu: string;
    robustness: number;
    plausibility: number;
    sparsity: number;
    recourseScore: number;
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
    scenarios: ICounterfactualScenario[];
    closestCounterfactual?: ICounterfactualScenario;
    mostRobustCounterfactual?: ICounterfactualScenario;
    easiestCounterfactual?: ICounterfactualScenario;
    summary: string;
    summaryRu: string;
    userActionableAdvice: string[];
    userActionableAdviceRu: string[];
    overallRobustness: number;
    diversityScore: number;
}
/**
 * Global feature importance (enhanced)
 */
export interface IGlobalFeatureImportance {
    featureId: string;
    featureName: string;
    featureNameRu: string;
    description: string;
    descriptionRu: string;
    meanAbsoluteSHAP: number;
    medianAbsoluteSHAP: number;
    maxAbsoluteSHAP: number;
    frequency: number;
    coverage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendPeriod: string;
    trendMagnitude?: number;
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
    isCausal?: boolean;
    causalStrength?: number;
}
/**
 * Bias analysis result (enhanced for EU AI Act)
 */
export interface IBiasAnalysisResult {
    analyzed: boolean;
    demographicParity?: {
        group: string;
        metric: string;
        value: number;
        baseline: number;
        isFair: boolean;
        confidenceInterval?: {
            lower: number;
            upper: number;
        };
    }[];
    identifiedBiases: {
        type: string;
        description: string;
        descriptionRu: string;
        severity: 'low' | 'medium' | 'high';
        mitigation?: string;
        mitigationRu?: string;
    }[];
    fairnessScore?: number;
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
    featureImportance: IGlobalFeatureImportance[];
    keyDecisionRules: IDecisionRule[];
    performanceSummary: {
        accuracy?: number;
        precision?: number;
        recall?: number;
        f1?: number;
        customMetrics: Record<string, number>;
    };
    biasAnalysis?: IBiasAnalysisResult;
    regulatoryCompliance?: {
        euAIActRiskLevel: EUAIActRiskLevel;
        transparencyObligations: string[];
        conformityStatus: 'compliant' | 'partial' | 'non-compliant';
        lastAuditDate?: Date;
    };
    computedAt: Date;
    dataPointsAnalyzed: number;
}
/**
 * Causal chain in explanation
 */
export interface ICausalChain {
    id: string;
    description: string;
    descriptionRu: string;
    nodes: {
        variable: string;
        variableRu: string;
        value: string | number;
        role: 'cause' | 'mediator' | 'effect';
    }[];
    edges: {
        from: string;
        to: string;
        strength: number;
        mechanism?: string;
        mechanismRu?: string;
    }[];
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
    primaryChain: ICausalChain;
    alternativeChains?: ICausalChain[];
    rootCauses: {
        variable: string;
        variableRu: string;
        contribution: number;
        isModifiable: boolean;
    }[];
    narrativeSummary: string;
    narrativeSummaryRu: string;
    confidence: number;
    methodology: 'do-calculus' | 'pearl' | 'scm' | 'heuristic';
}
/**
 * Narrative structure type
 */
export type NarrativeStructure = 'journey' | 'comparison' | 'cause-effect' | 'recommendation';
/**
 * Narrative explanation (NEW: natural language stories)
 */
export interface INarrativeExplanation {
    predictionId: string;
    structure: NarrativeStructure;
    title: string;
    titleRu: string;
    opening: string;
    openingRu: string;
    body: string;
    bodyRu: string;
    conclusion: string;
    conclusionRu: string;
    keyPoints: string[];
    keyPointsRu: string[];
    callToAction?: string;
    callToActionRu?: string;
    cognitiveStyleUsed: CognitiveStyle;
    ageGroupUsed: 'child' | 'teen' | 'adult';
    readability: {
        fleschKincaidGrade: number;
        readingTime: number;
        wordCount: number;
    };
}
/**
 * Clinical explanation for healthcare professionals (enhanced)
 */
export interface IClinicianExplanation {
    patientId: string;
    sessionId: string;
    clinicalContext: {
        presentingConcern: string;
        presentingConcernRu: string;
        relevantHistory: string[];
        currentSymptoms: string[];
        riskFactors: string[];
        protectiveFactors: string[];
        familyContext?: string;
    };
    aiAssessment: {
        primaryConcern: string;
        severity: 'mild' | 'moderate' | 'severe';
        riskLevel: string;
        confidence: number;
        reasoning: string;
        reasoningRu: string;
        causalFactors?: string[];
        mechanismHypothesis?: string;
    };
    interventionRationale: {
        selectedIntervention: string;
        therapeuticApproach: string;
        evidenceBasis: string[];
        alternativesConsidered: string[];
        contraindications: string[];
        expectedOutcome?: string;
        outcomeTimeframe?: string;
    };
    recommendations: {
        immediateActions: string[];
        followUpRecommendations: string[];
        escalationCriteria: string[];
        referralSuggestions: string[];
        familyInvolvement?: string[];
    };
    uncertaintyDisclosure: {
        confidenceLevel: string;
        knownLimitations: string[];
        suggestedVerification: string[];
        modelBlindSpots?: string[];
        dataQualityNote?: string;
    };
    regulatoryCompliance: {
        euAIActRiskLevel: EUAIActRiskLevel;
        humanOversightRequired: boolean;
        appealProcess?: string;
    };
    timestamp: Date;
    aiModelVersion: string;
    disclaimer: string;
    disclaimerRu: string;
}
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
    layTermDescription?: string;
    actionable?: boolean;
    actionSuggestion?: string;
}
/**
 * User explanation (enhanced HCXAI)
 */
export interface IUserExplanation {
    summary: string;
    summaryRu: string;
    reasoning: string;
    reasoningRu: string;
    keyFactors: IUserFactor[];
    confidence: {
        level: 'low' | 'medium' | 'high';
        emoji: string;
        description: string;
        descriptionRu: string;
    };
    actionableAdvice: string[];
    actionableAdviceRu: string[];
    limitations: string[];
    limitationsRu: string[];
    disclaimer: string;
    disclaimerRu: string;
    whyThisMatters?: string;
    whyThisMattersRu?: string;
    whatCanChange?: string[];
    whatCanChangeRu?: string[];
    ageGroup: 'child' | 'teen' | 'adult';
    cognitiveStyle?: CognitiveStyle;
    explanationId: string;
    feedbackPrompt?: string;
}
/**
 * Explanation effectiveness metrics (NEW)
 */
export interface IExplanationEffectiveness {
    explanationId: string;
    userId: string;
    userUnderstood?: boolean;
    userFoundHelpful?: boolean;
    userRating?: number;
    userFeedbackText?: string;
    timeSpentReading?: number;
    scrollDepth?: number;
    expandedDetails?: boolean;
    clickedLearnMore?: boolean;
    followedAdvice?: boolean;
    interventionAccepted?: boolean;
    subsequentBehaviorChange?: boolean;
    explanationVariant?: string;
    experimentId?: string;
    recordedAt: Date;
}
/**
 * Request for explanation (enhanced)
 */
export interface IExplanationRequest {
    predictionId: string;
    predictionType: string;
    context: Record<string, unknown>;
    inputFeatures: Record<string, unknown>;
    output: unknown;
    audience: ExplanationAudience;
    level: ExplanationLevel;
    types: ExplanationType[];
    includeCounterfactuals: boolean;
    includeGlobalContext: boolean;
    includeCausal: boolean;
    includeNarrative: boolean;
    maxCounterfactuals?: number;
    ageGroup?: 'child' | 'teen' | 'adult';
    cognitiveStyle?: CognitiveStyle;
    language?: 'en' | 'ru';
    preferredNarrativeStructure?: NarrativeStructure;
    requireEUAIActCompliance?: boolean;
}
/**
 * Complete explanation response (enhanced)
 */
export interface IExplanationResponse {
    requestId: string;
    predictionId: string;
    localExplanation?: ISHAPExplanation;
    counterfactualExplanation?: ICounterfactualExplanation;
    globalContext?: IGlobalExplanation;
    clinicianExplanation?: IClinicianExplanation;
    causalExplanation?: ICausalExplanation;
    narrativeExplanation?: INarrativeExplanation;
    userExplanation: IUserExplanation;
    regulatoryInfo?: {
        euAIActRiskLevel: EUAIActRiskLevel;
        isCompliant: boolean;
        transparencyMet: boolean;
        humanOversightRequired: boolean;
    };
    generatedAt: Date;
    computationTime: number;
    explanationVersion: string;
    effectivenessTrackingEnabled: boolean;
    feedbackUrl?: string;
}
/**
 * Explainability Service interface (enhanced)
 */
export interface IExplainabilityService {
    explain(request: IExplanationRequest): Promise<IExplanationResponse>;
    generateSHAPExplanation(features: Record<string, unknown>, prediction: unknown): Promise<ISHAPExplanation>;
    generateCounterfactuals(features: Record<string, unknown>, currentOutcome: string, desiredOutcome?: string, options?: {
        maxCounterfactuals?: number;
        requireRobust?: boolean;
        feasibilityThreshold?: CounterfactualFeasibility;
    }): Promise<ICounterfactualExplanation>;
    generateGlobalExplanation(predictionType: string): Promise<IGlobalExplanation>;
    generateClinicianExplanation(sessionData: Record<string, unknown>): Promise<IClinicianExplanation>;
    generateCausalExplanation(features: Record<string, unknown>, outcome: string): Promise<ICausalExplanation>;
    generateNarrativeExplanation(explanation: IExplanationResponse, options: {
        structure: NarrativeStructure;
        ageGroup: 'child' | 'teen' | 'adult';
        cognitiveStyle?: CognitiveStyle;
        language: 'en' | 'ru';
    }): Promise<INarrativeExplanation>;
    formatForAudience(explanation: IExplanationResponse, audience: ExplanationAudience, level: ExplanationLevel): string;
    getCachedGlobalExplanation(predictionType: string): IGlobalExplanation | null;
    invalidateCache(predictionType?: string): void;
    recordExplanationFeedback(feedback: Partial<IExplanationEffectiveness>): Promise<void>;
    getExplanationEffectiveness(explanationId: string): Promise<IExplanationEffectiveness | null>;
}
/**
 * Feature Attribution Engine interface
 */
export interface IFeatureAttributionEngine {
    calculateAttributions(features: Record<string, unknown>, prediction: {
        outcome: string;
        value: number;
        confidence: number;
    }): ISHAPExplanation;
    visualizeAttributions(explanation: ISHAPExplanation, format: 'text' | 'bars' | 'emoji'): string;
    generateUserSummary(explanation: ISHAPExplanation, ageGroup: 'child' | 'teen' | 'adult'): string;
    addFeature(definition: IFeatureDefinition): void;
    getFeature(featureId: string): IFeatureDefinition | undefined;
    getFeaturesByCategory(category: FeatureCategory): IFeatureDefinition[];
}
/**
 * Counterfactual Explainer interface
 */
export interface ICounterfactualExplainer {
    generateCounterfactuals(currentFeatures: Record<string, unknown>, currentOutcome: string, desiredOutcome?: string, maxCounterfactuals?: number, options?: {
        requireRobust?: boolean;
        minRobustness?: number;
        feasibilityThreshold?: CounterfactualFeasibility;
    }): ICounterfactualExplanation;
    formatForDisplay(explanation: ICounterfactualExplanation, ageGroup: 'child' | 'teen' | 'adult'): string;
    calculateRobustness(scenario: ICounterfactualScenario): number;
    calculatePlausibility(scenario: ICounterfactualScenario, contextFeatures: Record<string, unknown>): number;
}
/**
 * Narrative Generator interface (NEW: HCXAI)
 */
export interface INarrativeGenerator {
    generateNarrative(explanation: IExplanationResponse, options: {
        structure: NarrativeStructure;
        ageGroup: 'child' | 'teen' | 'adult';
        cognitiveStyle?: CognitiveStyle;
        language: 'en' | 'ru';
        maxWords?: number;
    }): INarrativeExplanation;
    getTemplates(structure: NarrativeStructure, language: 'en' | 'ru'): string[];
    personalizeNarrative(narrative: INarrativeExplanation, userHistory: {
        previousExplanations: string[];
        preferredStyle?: CognitiveStyle;
        comprehensionLevel?: number;
    }): INarrativeExplanation;
}
/**
 * Default explainability configuration
 */
export declare const DEFAULT_EXPLAINABILITY_CONFIG: {
    maxCounterfactuals: number;
    minRobustness: number;
    minPlausibility: number;
    cacheExpirationMs: number;
    enableEffectivenessTracking: boolean;
    defaultLanguage: "ru";
    defaultAgeGroup: "adult";
    euAIActComplianceRequired: boolean;
};
/**
 * EU AI Act transparency requirements
 */
export declare const EU_AI_ACT_REQUIREMENTS: {
    high: {
        riskAssessment: boolean;
        dataGovernance: boolean;
        humanOversight: boolean;
        transparency: boolean;
        accuracyRobustness: boolean;
        recordKeeping: boolean;
        informationProvision: boolean;
    };
    limited: {
        transparency: boolean;
        humanOversightOptional: boolean;
    };
    minimal: {
        voluntaryCodesOfConduct: boolean;
    };
};
/**
 * HCXAI principles
 */
export declare const HCXAI_PRINCIPLES: {
    meaningfulness: string;
    actionability: string;
    accuracy: string;
    appropriateness: string;
    timeliness: string;
    interactivity: string;
};
/**
 * Readability targets by age group
 */
export declare const READABILITY_TARGETS: {
    child: {
        maxFleschKincaidGrade: number;
        maxWords: number;
        maxSentenceLength: number;
    };
    teen: {
        maxFleschKincaidGrade: number;
        maxWords: number;
        maxSentenceLength: number;
    };
    adult: {
        maxFleschKincaidGrade: number;
        maxWords: number;
        maxSentenceLength: number;
    };
};
//# sourceMappingURL=IExplainability.d.ts.map