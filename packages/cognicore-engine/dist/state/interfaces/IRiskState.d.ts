/**
 * 🚨 RISK STATE INTERFACE
 * =======================
 * Comprehensive risk assessment compatible with CrisisPipeline
 * Multi-layer risk tracking with early warning system
 *
 * Scientific Foundation:
 * - Columbia Suicide Severity Rating Scale (C-SSRS)
 * - Risk-Need-Responsivity Model (Andrews & Bonta)
 * - Safety Planning Intervention (Stanley & Brown)
 * - Dynamic Risk Assessment (Douglas & Skeem)
 *
 * Integration:
 * - Compatible with existing CrisisPipeline
 * - Aligned with CrisisRiskLevel from src project
 * - Supports fail-safe design principles
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Risk level (aligned with CrisisPipeline)
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
/**
 * Risk trajectory (direction of change)
 */
export type RiskTrajectory = 'improving' | 'stable' | 'declining' | 'volatile';
/**
 * Risk category types
 */
export type RiskCategory = 'self_harm' | 'suicidal_ideation' | 'substance_use' | 'behavioral' | 'relational' | 'emotional_crisis' | 'digital_addiction' | 'social_isolation' | 'academic_crisis' | 'family_crisis';
/**
 * Risk factor (contributing to risk)
 */
export interface RiskFactor {
    readonly id: string;
    readonly category: RiskCategory;
    readonly description: string;
    readonly severity: number;
    readonly temporality: 'static' | 'stable_dynamic' | 'acute_dynamic';
    readonly modifiable: boolean;
    readonly detectedAt: Date;
    readonly lastUpdated: Date;
    readonly evidence: string[];
}
/**
 * Protective factor (reducing risk)
 */
export interface ProtectiveFactor {
    readonly id: string;
    readonly type: 'internal' | 'external';
    readonly description: string;
    readonly strength: number;
    readonly reliability: number;
    readonly category: 'social_support' | 'coping_skills' | 'hope' | 'reasons_for_living' | 'professional_support' | 'values' | 'self_efficacy';
    readonly detectedAt: Date;
    readonly evidence: string[];
}
/**
 * Early warning sign
 */
export interface EarlyWarning {
    readonly id: string;
    readonly type: 'behavioral' | 'emotional' | 'cognitive' | 'social' | 'physical';
    readonly description: string;
    readonly severity: number;
    readonly detectedAt: Date;
    readonly trend: 'new' | 'increasing' | 'stable' | 'decreasing';
    readonly requiresAction: boolean;
    readonly suggestedAction?: string;
}
/**
 * Safety plan component
 */
export interface SafetyPlanComponent {
    readonly type: 'warning_signs' | 'coping_strategies' | 'distraction_activities' | 'support_contacts' | 'professional_contacts' | 'environment_safety';
    readonly items: string[];
    readonly lastUpdated: Date;
    readonly userDefined: boolean;
}
/**
 * Safety plan status
 */
export interface SafetyPlan {
    readonly exists: boolean;
    readonly lastUpdated?: Date;
    readonly completeness: number;
    readonly components: SafetyPlanComponent[];
    readonly primaryContact?: {
        readonly name: string;
        readonly phone?: string;
        readonly relationship: string;
    };
    readonly professionalContact?: {
        readonly name: string;
        readonly phone?: string;
        readonly type: 'therapist' | 'psychiatrist' | 'counselor' | 'hotline';
    };
}
/**
 * Crisis event record
 */
export interface CrisisEvent {
    readonly id: string;
    readonly timestamp: Date;
    readonly severity: RiskLevel;
    readonly category: RiskCategory;
    readonly triggeredBy: string;
    readonly actionTaken: string;
    readonly outcome: 'resolved' | 'escalated' | 'referred' | 'ongoing';
    readonly responseTime: number;
    readonly userFeedback?: string;
}
/**
 * Lethal means assessment
 */
export interface LethalMeansAssessment {
    readonly assessed: boolean;
    readonly lastAssessedAt?: Date;
    readonly accessToMeans: 'unknown' | 'none' | 'limited' | 'easy';
    readonly meansRestrictionDiscussed: boolean;
    readonly safetyStepsCompleted: string[];
}
/**
 * Support network assessment
 */
export interface SupportNetwork {
    readonly size: number;
    readonly quality: number;
    readonly accessibility: number;
    readonly diversity: number;
    readonly primarySupports: Array<{
        readonly relationship: string;
        readonly availability: 'always' | 'usually' | 'sometimes' | 'rarely';
        readonly quality: number;
    }>;
    readonly lastContacted?: Date;
}
/**
 * Intervention effectiveness
 */
export interface InterventionEffectiveness {
    readonly interventionId: string;
    readonly interventionType: string;
    readonly timesUsed: number;
    readonly averageEffectiveness: number;
    readonly bestForRiskCategories: RiskCategory[];
    readonly contraindicated: RiskCategory[];
}
/**
 * Risk prediction
 */
export interface RiskPrediction {
    readonly timeframe: '6h' | '24h' | '72h' | '1w';
    readonly predictedLevel: RiskLevel;
    readonly confidence: number;
    readonly keyFactors: string[];
    readonly preventiveActions: string[];
    readonly calculatedAt: Date;
}
/**
 * 🚨 Main Risk State Interface
 * Core component of State Vector S_t (r_t)
 */
export interface IRiskState {
    /**
     * Current overall risk level
     */
    readonly level: RiskLevel;
    /**
     * Confidence in risk assessment (0.0 - 1.0)
     */
    readonly confidence: number;
    /**
     * Risk trajectory over time
     */
    readonly trajectory: RiskTrajectory;
    /**
     * Active risk factors
     */
    readonly riskFactors: RiskFactor[];
    /**
     * Active protective factors
     */
    readonly protectiveFactors: ProtectiveFactor[];
    /**
     * Early warning signs detected
     */
    readonly earlyWarnings: EarlyWarning[];
    /**
     * Risk by category
     */
    readonly categoryRisks: Record<RiskCategory, {
        readonly level: RiskLevel;
        readonly confidence: number;
        readonly lastAssessed: Date;
    }>;
    /**
     * Safety plan status
     */
    readonly safetyPlan: SafetyPlan;
    /**
     * Support network assessment
     */
    readonly supportNetwork: SupportNetwork;
    /**
     * Lethal means assessment
     */
    readonly lethalMeans: LethalMeansAssessment;
    /**
     * Crisis history
     */
    readonly crisisHistory: CrisisEvent[];
    /**
     * Effective interventions for this user
     */
    readonly effectiveInterventions: InterventionEffectiveness[];
    /**
     * Risk predictions
     */
    readonly predictions: RiskPrediction[];
    /**
     * Time since last crisis event
     */
    readonly daysSinceLastCrisis: number | null;
    /**
     * Current stabilization phase
     */
    readonly stabilizationPhase: 'acute' | 'subacute' | 'stable' | 'recovery';
    /**
     * Timestamp of this assessment
     */
    readonly timestamp: Date;
    /**
     * Data quality (0.0 - 1.0)
     */
    readonly dataQuality: number;
    /**
     * Assessment method used
     */
    readonly assessmentMethod: 'automated' | 'combined' | 'self_report' | 'fallback';
}
/**
 * Risk State Builder
 */
export interface IRiskStateBuilder {
    setLevel(level: RiskLevel, confidence: number): this;
    setTrajectory(trajectory: RiskTrajectory): this;
    addRiskFactor(factor: RiskFactor): this;
    addProtectiveFactor(factor: ProtectiveFactor): this;
    addEarlyWarning(warning: EarlyWarning): this;
    setCategoryRisk(category: RiskCategory, level: RiskLevel, confidence: number): this;
    setSafetyPlan(plan: SafetyPlan): this;
    setSupportNetwork(network: SupportNetwork): this;
    addCrisisEvent(event: CrisisEvent): this;
    addPrediction(prediction: RiskPrediction): this;
    build(): IRiskState;
}
/**
 * Risk State Factory
 */
export interface IRiskStateFactory {
    /**
     * Create from CrisisPipeline assessment
     * (compatibility with existing system)
     */
    fromCrisisPipelineAssessment(assessment: {
        riskLevel: string;
        confidence: number;
        triggers: Array<{
            category: string;
            matches: string[];
            confidence: number;
            severity: number;
        }>;
        recommendedAction: string;
        escalationRequired: boolean;
    }): IRiskState;
    /**
     * Create from text analysis
     */
    fromTextAnalysis(text: string, previousState?: IRiskState): Promise<IRiskState>;
    /**
     * Create safe baseline state
     */
    createSafe(): IRiskState;
    /**
     * Apply new evidence to update risk
     */
    updateWithEvidence(currentState: IRiskState, evidence: {
        text: string;
        emotionalState?: {
            intensity: number;
            valence: number;
        };
        behavioralIndicators?: string[];
    }): IRiskState;
    /**
     * Create fail-safe state (when detection fails)
     */
    createFailSafe(): IRiskState;
}
/**
 * Risk Detector Interface
 */
export interface IRiskDetector {
    /**
     * Detect risk from text
     */
    detectRisk(text: string): Promise<{
        level: RiskLevel;
        confidence: number;
        factors: RiskFactor[];
        warnings: EarlyWarning[];
        requiresEscalation: boolean;
    }>;
    /**
     * Detect specific risk category
     */
    detectCategoryRisk(text: string, category: RiskCategory): Promise<{
        level: RiskLevel;
        confidence: number;
        evidence: string[];
    }>;
    /**
     * Predict risk trajectory
     */
    predictTrajectory(history: IRiskState[], currentState: IRiskState): RiskTrajectory;
}
/**
 * Risk keywords and patterns (Russian)
 * Aligned with existing CrisisPipeline
 */
export declare const RISK_PATTERNS: Record<RiskCategory, {
    keywords: string[];
    phrases: string[];
    severity: number;
    requiresImmediateAction: boolean;
}>;
/**
 * Crisis response protocols by risk level
 */
export declare const CRISIS_RESPONSE_PROTOCOLS: Record<RiskLevel, {
    immediateActions: string[];
    resourcesProvide: string[];
    escalationRequired: boolean;
    followUpTimeframe: string;
    documentationRequired: boolean;
}>;
/**
 * Risk score thresholds (aligned with CrisisPipeline)
 */
export declare const RISK_THRESHOLDS: {
    readonly none: 0;
    readonly low: 0.2;
    readonly medium: 0.4;
    readonly high: 0.7;
    readonly critical: 0.85;
};
//# sourceMappingURL=IRiskState.d.ts.map