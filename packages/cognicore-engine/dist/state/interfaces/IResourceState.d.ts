/**
 * 💪 RESOURCE STATE INTERFACE
 * ===========================
 * PERMA Model of Wellbeing + Coping Resources
 * Comprehensive assessment of available resources
 *
 * Scientific Foundation:
 * - PERMA Model (Seligman, 2011)
 * - Coping Theory (Lazarus & Folkman, 1984)
 * - Conservation of Resources Theory (Hobfoll, 1989)
 * - Positive Psychology Framework
 *
 * Components:
 * - P: Positive Emotion
 * - E: Engagement
 * - R: Relationships
 * - M: Meaning
 * - A: Accomplishment
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * PERMA dimension scores
 * Each dimension: 0.0 (absent) to 1.0 (optimal)
 */
export interface PERMADimensions {
    /**
     * Positive Emotion (P)
     * Frequency and intensity of positive emotions
     */
    readonly positiveEmotion: number;
    /**
     * Engagement (E)
     * Flow states, absorption in activities
     */
    readonly engagement: number;
    /**
     * Relationships (R)
     * Quality of social connections
     */
    readonly relationships: number;
    /**
     * Meaning (M)
     * Sense of purpose and meaning
     */
    readonly meaning: number;
    /**
     * Accomplishment (A)
     * Achievement and competence
     */
    readonly accomplishment: number;
}
/**
 * Coping strategy type
 */
export type CopingStrategyType = 'problem_solving' | 'information_seeking' | 'planning' | 'emotional_expression' | 'emotional_support' | 'reappraisal' | 'benefit_finding' | 'values_clarification' | 'acceptance' | 'social_support' | 'venting' | 'humor' | 'distraction' | 'denial' | 'substance_use' | 'behavioral_disengagement' | 'physical_activity' | 'relaxation' | 'creative_expression' | 'spiritual_practice';
/**
 * Coping strategy with effectiveness tracking
 */
export interface CopingStrategy {
    readonly id: string;
    readonly type: CopingStrategyType;
    readonly name: string;
    readonly description: string;
    readonly adaptive: boolean;
    readonly usageFrequency: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
    readonly effectiveness: number;
    readonly lastUsed?: Date;
    readonly contextEffective: string[];
    readonly contraindicated?: string[];
}
/**
 * Energy/vitality assessment
 */
export interface EnergyLevel {
    /**
     * Current energy (0.0 - 1.0)
     */
    readonly current: number;
    /**
     * Baseline/typical energy
     */
    readonly baseline: number;
    /**
     * Energy trend
     */
    readonly trend: 'depleting' | 'stable' | 'restoring';
    /**
     * Factors affecting energy
     */
    readonly factors: Array<{
        readonly factor: 'sleep' | 'nutrition' | 'exercise' | 'stress' | 'illness' | 'emotional_drain' | 'positive_interactions';
        readonly impact: number;
    }>;
}
/**
 * Cognitive load/capacity
 */
export interface CognitiveCapacity {
    /**
     * Current available capacity (0.0 - 1.0)
     */
    readonly available: number;
    /**
     * Current load (0.0 - 1.0)
     */
    readonly currentLoad: number;
    /**
     * Optimal capacity (when rested)
     */
    readonly optimal: number;
    /**
     * Load sources
     */
    readonly loadSources: Array<{
        readonly source: string;
        readonly load: number;
    }>;
    /**
     * Time until recovery
     */
    readonly estimatedRecoveryHours?: number;
}
/**
 * Self-efficacy assessment
 */
export interface SelfEfficacy {
    /**
     * General self-efficacy (0.0 - 1.0)
     */
    readonly general: number;
    /**
     * Domain-specific efficacy
     */
    readonly domains: Record<string, number>;
    /**
     * Recent mastery experiences
     */
    readonly masteryExperiences: Array<{
        readonly description: string;
        readonly domain: string;
        readonly impact: number;
        readonly timestamp: Date;
    }>;
}
/**
 * Resilience assessment
 */
export interface Resilience {
    /**
     * Overall resilience score (0.0 - 1.0)
     */
    readonly score: number;
    /**
     * Components
     */
    readonly components: {
        readonly adaptability: number;
        readonly persistence: number;
        readonly optimism: number;
        readonly selfRegulation: number;
        readonly socialSupport: number;
    };
    /**
     * Bounce-back history
     */
    readonly recoveryHistory: Array<{
        readonly challenge: string;
        readonly recoveryTime: number;
        readonly lessonsLearned: string[];
        readonly timestamp: Date;
    }>;
}
/**
 * Social resources
 */
export interface SocialResources {
    /**
     * Support network size and quality
     */
    readonly network: {
        readonly size: number;
        readonly qualityScore: number;
        readonly diversityScore: number;
        readonly accessibilityScore: number;
    };
    /**
     * Types of support available
     */
    readonly supportTypes: {
        readonly emotional: number;
        readonly instrumental: number;
        readonly informational: number;
        readonly companionship: number;
    };
    /**
     * Key relationships
     */
    readonly keyRelationships: Array<{
        readonly role: string;
        readonly quality: number;
        readonly frequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
        readonly supportProvided: ('emotional' | 'instrumental' | 'informational' | 'companionship')[];
    }>;
    /**
     * Isolation indicators
     */
    readonly isolationRisk: number;
}
/**
 * Time resources
 */
export interface TimeResources {
    /**
     * Perceived time availability (0.0 - 1.0)
     */
    readonly perceived: number;
    /**
     * Time for self-care
     */
    readonly selfCareTime: 'none' | 'minimal' | 'adequate' | 'abundant';
    /**
     * Time pressure level
     */
    readonly pressure: number;
    /**
     * Balance indicators
     */
    readonly balance: {
        readonly work_life: number;
        readonly rest_activity: number;
        readonly solitude_social: number;
    };
}
/**
 * Hope and optimism
 */
export interface HopeOptimism {
    /**
     * Hope score (Snyder's Hope Theory)
     */
    readonly hope: {
        readonly agency: number;
        readonly pathways: number;
        readonly overall: number;
    };
    /**
     * Optimism (Carver & Scheier)
     */
    readonly optimism: {
        readonly generalExpectancy: number;
        readonly explanatoryStyle: 'pessimistic' | 'mixed' | 'optimistic';
    };
    /**
     * Future orientation
     */
    readonly futureOrientation: {
        readonly clarity: number;
        readonly motivation: number;
        readonly confidence: number;
    };
}
/**
 * 💪 Main Resource State Interface
 * Core component of State Vector S_t (b_t - resources/buffers)
 */
export interface IResourceState {
    /**
     * PERMA wellbeing dimensions
     */
    readonly perma: PERMADimensions;
    /**
     * Overall PERMA score (weighted average)
     */
    readonly permaScore: number;
    /**
     * Available coping strategies
     */
    readonly copingStrategies: CopingStrategy[];
    /**
     * Currently effective strategies (top 3-5)
     */
    readonly effectiveStrategies: CopingStrategy[];
    /**
     * Current energy level
     */
    readonly energy: EnergyLevel;
    /**
     * Cognitive capacity
     */
    readonly cognitiveCapacity: CognitiveCapacity;
    /**
     * Self-efficacy assessment
     */
    readonly selfEfficacy: SelfEfficacy;
    /**
     * Resilience profile
     */
    readonly resilience: Resilience;
    /**
     * Social resources
     */
    readonly socialResources: SocialResources;
    /**
     * Time resources
     */
    readonly timeResources: TimeResources;
    /**
     * Hope and optimism
     */
    readonly hopeOptimism: HopeOptimism;
    /**
     * Resource depletion warnings
     */
    readonly depletionWarnings: Array<{
        readonly resource: string;
        readonly severity: 'low' | 'medium' | 'high';
        readonly trend: 'stable' | 'declining' | 'critical';
        readonly recommendedAction: string;
    }>;
    /**
     * Resource strengths
     */
    readonly strengths: Array<{
        readonly resource: string;
        readonly score: number;
        readonly usable: boolean;
    }>;
    /**
     * Overall resource availability (0.0 - 1.0)
     */
    readonly overallAvailability: number;
    /**
     * Timestamp
     */
    readonly timestamp: Date;
    /**
     * Assessment confidence
     */
    readonly confidence: number;
    /**
     * Data quality
     */
    readonly dataQuality: number;
}
/**
 * Resource State Builder
 */
export interface IResourceStateBuilder {
    setPERMA(perma: PERMADimensions): this;
    addCopingStrategy(strategy: CopingStrategy): this;
    setEnergy(energy: EnergyLevel): this;
    setCognitiveCapacity(capacity: CognitiveCapacity): this;
    setSelfEfficacy(efficacy: SelfEfficacy): this;
    setResilience(resilience: Resilience): this;
    setSocialResources(resources: SocialResources): this;
    setTimeResources(resources: TimeResources): this;
    setHopeOptimism(hope: HopeOptimism): this;
    build(): IResourceState;
}
/**
 * Resource State Factory
 */
export interface IResourceStateFactory {
    /**
     * Create from assessment questionnaire
     */
    fromAssessment(responses: Record<string, number | string>): Promise<IResourceState>;
    /**
     * Create from conversation analysis
     */
    fromConversation(messages: Array<{
        text: string;
        timestamp: Date;
    }>, previousState?: IResourceState): Promise<IResourceState>;
    /**
     * Create baseline state
     */
    createBaseline(): IResourceState;
    /**
     * Update with new coping attempt
     */
    recordCopingAttempt(currentState: IResourceState, strategyType: CopingStrategyType, effectiveness: number): IResourceState;
    /**
     * Update PERMA from self-report
     */
    updatePERMAFromSelfReport(currentState: IResourceState, dimension: keyof PERMADimensions, value: number): IResourceState;
}
/**
 * PERMA assessment questions (for self-report)
 */
export declare const PERMA_ASSESSMENT_QUESTIONS: Record<keyof PERMADimensions, {
    questions: string[];
    scale: {
        min: number;
        max: number;
        labels: {
            min: string;
            max: string;
        };
    };
}>;
/**
 * Coping strategy recommendations based on context
 */
export declare const COPING_RECOMMENDATIONS: Record<string, {
    situation: string;
    recommendedStrategies: CopingStrategyType[];
    avoidStrategies: CopingStrategyType[];
}>;
/**
 * PERMA dimension enhancement strategies
 */
export declare const PERMA_ENHANCEMENT: Record<keyof PERMADimensions, {
    lowScoreActions: string[];
    maintenanceActions: string[];
    relatedActivities: string[];
}>;
//# sourceMappingURL=IResourceState.d.ts.map