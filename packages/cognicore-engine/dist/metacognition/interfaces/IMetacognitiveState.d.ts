/**
 * METACOGNITIVE STATE INTERFACE
 * ==============================
 * Wells' Metacognitive Therapy (MCT) Model Implementation
 *
 * Scientific Foundation (2024-2025 Research):
 * - S-REF Model (Wells & Matthews, 1994, 1996)
 * - Metacognitive Therapy (Wells, 2009)
 * - MCQ-30 Questionnaire (Wells & Cartwright-Hatton, 2004)
 * - CAS-1R Assessment (Wells, 2009)
 * - MCT Meta-Analysis (Normann & Morina, 2018; December 2024 update)
 *
 * Key Innovation:
 * - Digital implementation of MCQ-30 subscales
 * - Real-time CAS detection
 * - Metacognitive belief tracking
 * - Integration with existing CogniCore State Vector
 *
 * Evidence Base (2024):
 * - MCT effect size d = 1.28 for anxiety/depression (Thingbak et al., 2024)
 * - MCT superior to CBT: Hedges' g = 0.69 at post-treatment
 * - 21 MCT studies + 28 MCTraining studies meta-analyzed
 *
 * БФ "Другой путь" | CogniCore Phase 4.2
 */
/**
 * MCQ-30 Five Factor Structure
 * Each subscale: 6 items, score range 6-24
 * Total score range: 30-120 (higher = more dysfunctional)
 */
export interface MCQ30Subscales {
    /**
     * Factor 1: Positive Beliefs about Worry
     * "Worrying helps me cope" / "Беспокойство помогает мне справляться"
     * Examples: "Worrying helps me to avoid problems in the future"
     */
    readonly positiveWorryBeliefs: MCQ30Subscale;
    /**
     * Factor 2: Negative Beliefs about Uncontrollability and Danger
     * "My worrying is dangerous" / "Моё беспокойство опасно"
     * Examples: "When I start worrying I cannot stop"
     */
    readonly negativeUncontrollabilityDanger: MCQ30Subscale;
    /**
     * Factor 3: Cognitive Confidence
     * "I don't trust my memory" / "Я не доверяю своей памяти"
     * Examples: "I have a poor memory"
     */
    readonly cognitiveConfidence: MCQ30Subscale;
    /**
     * Factor 4: Need to Control Thoughts
     * "I should control my thoughts" / "Я должен контролировать мысли"
     * Examples: "Not being able to control my thoughts is a sign of weakness"
     */
    readonly needToControlThoughts: MCQ30Subscale;
    /**
     * Factor 5: Cognitive Self-Consciousness
     * "I monitor my thinking" / "Я слежу за своим мышлением"
     * Examples: "I pay close attention to the way my mind works"
     */
    readonly cognitiveSelfConsciousness: MCQ30Subscale;
    /**
     * Total MCQ-30 score
     */
    readonly totalScore: number;
    /**
     * Assessment timestamp
     */
    readonly assessedAt: Date;
    /**
     * Data source
     */
    readonly source: 'self_report' | 'inferred' | 'conversation';
}
/**
 * Individual MCQ-30 subscale
 */
export interface MCQ30Subscale {
    /** Raw score (6-24) */
    readonly score: number;
    /** Normalized score (0-1) */
    readonly normalized: number;
    /** Clinical significance threshold crossed */
    readonly clinicallySignificant: boolean;
    /** Item-level responses if available */
    readonly itemResponses?: number[];
    /** Confidence in score */
    readonly confidence: number;
}
/**
 * MCQ-30 Item definitions (for digital assessment)
 */
export interface MCQ30Item {
    readonly id: number;
    readonly subscale: keyof Omit<MCQ30Subscales, 'totalScore' | 'assessedAt' | 'source'>;
    readonly textEn: string;
    readonly textRu: string;
    readonly reversed: boolean;
}
/**
 * CAS Components (Wells, 2009)
 * The toxic thinking style at the heart of emotional disorders
 */
export interface CognitiveAttentionalSyndrome {
    /**
     * Worry/Rumination Component
     * Repetitive negative thinking about past (rumination) or future (worry)
     */
    readonly worryRumination: CASWorryRumination;
    /**
     * Threat Monitoring Component
     * Excessive attention to potential threats
     */
    readonly threatMonitoring: CASThreatMonitoring;
    /**
     * Maladaptive Coping Strategies
     * Behaviors that backfire and maintain distress
     */
    readonly maladaptiveCoping: CASMaladaptiveCoping;
    /**
     * Overall CAS severity (0-1)
     */
    readonly severity: number;
    /**
     * CAS activity detected in current session
     */
    readonly activeNow: boolean;
    /**
     * Duration of current CAS episode (minutes)
     */
    readonly currentEpisodeDuration?: number;
    /**
     * Triggers identified
     */
    readonly triggers: string[];
}
/**
 * Worry and Rumination Assessment
 */
export interface CASWorryRumination {
    /**
     * Worry intensity (future-focused) 0-1
     */
    readonly worryIntensity: number;
    /**
     * Rumination intensity (past-focused) 0-1
     */
    readonly ruminationIntensity: number;
    /**
     * Predominant type
     */
    readonly predominantType: 'worry' | 'rumination' | 'mixed' | 'none';
    /**
     * Time spent in repetitive thinking (estimated minutes/day)
     */
    readonly estimatedDailyMinutes: number;
    /**
     * Perceived controllability (0 = uncontrollable, 1 = fully controllable)
     */
    readonly perceivedControllability: number;
    /**
     * Content themes
     */
    readonly themes: WorryRuminationTheme[];
    /**
     * Detected worry/rumination episodes in conversation
     */
    readonly detectedEpisodes: Array<{
        readonly text: string;
        readonly type: 'worry' | 'rumination';
        readonly timestamp: Date;
        readonly intensity: number;
    }>;
}
/**
 * Worry/Rumination themes
 */
export type WorryRuminationTheme = 'health' | 'relationships' | 'performance' | 'finances' | 'safety' | 'social_evaluation' | 'future_uncertainty' | 'past_mistakes' | 'digital_usage' | 'self_worth' | 'control' | 'other';
/**
 * Threat Monitoring Assessment
 */
export interface CASThreatMonitoring {
    /**
     * Level of hypervigilance (0-1)
     */
    readonly hypervigilance: number;
    /**
     * Self-focused attention (0-1)
     * High = excessive monitoring of internal states
     */
    readonly selfFocusedAttention: number;
    /**
     * External threat scanning (0-1)
     */
    readonly externalThreatScanning: number;
    /**
     * Attention flexibility (0 = rigid, 1 = flexible)
     */
    readonly attentionFlexibility: number;
    /**
     * Threat domains being monitored
     */
    readonly monitoredDomains: ThreatDomain[];
}
/**
 * Threat domains
 */
export type ThreatDomain = 'bodily_sensations' | 'thoughts' | 'emotions' | 'social_cues' | 'environment' | 'performance' | 'digital_notifications';
/**
 * Maladaptive Coping Strategies
 */
export interface CASMaladaptiveCoping {
    /**
     * Thought suppression attempts (0-1)
     */
    readonly thoughtSuppression: number;
    /**
     * Avoidance behaviors (0-1)
     */
    readonly avoidance: number;
    /**
     * Reassurance seeking (0-1)
     */
    readonly reassuranceSeeking: number;
    /**
     * Safety behaviors (0-1)
     */
    readonly safetyBehaviors: number;
    /**
     * Substance use for coping (0-1)
     */
    readonly substanceUse: number;
    /**
     * Digital escapism (0-1)
     * Using devices to avoid feelings
     */
    readonly digitalEscapism: number;
    /**
     * Checking behaviors (0-1)
     */
    readonly checking: number;
    /**
     * Identified specific strategies
     */
    readonly identifiedStrategies: MaladaptiveStrategy[];
}
/**
 * Specific maladaptive strategies
 */
export interface MaladaptiveStrategy {
    readonly type: MaladaptiveStrategyType;
    readonly frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
    readonly effectiveness: number;
    readonly actualEffect: 'maintaining' | 'worsening' | 'neutral';
    readonly description?: string;
}
export type MaladaptiveStrategyType = 'thought_suppression' | 'distraction' | 'avoidance' | 'reassurance_seeking' | 'checking' | 'safety_behavior' | 'substance_use' | 'excessive_planning' | 'rumination_as_coping' | 'worry_as_preparation' | 'digital_escape' | 'social_withdrawal' | 'overworking' | 'perfectionism';
/**
 * Detailed Metacognitive Beliefs Assessment
 */
export interface MetacognitiveBeliefs {
    /**
     * Positive beliefs about worry
     * "Worry helps me cope/prepare/avoid"
     */
    readonly positiveWorryBeliefs: BeliefCluster;
    /**
     * Positive beliefs about rumination
     * "Rumination helps me understand/learn"
     */
    readonly positiveRuminationBeliefs: BeliefCluster;
    /**
     * Negative beliefs about thoughts (Type 2 worry)
     * "My thoughts are dangerous/uncontrollable"
     */
    readonly negativeThoughtBeliefs: BeliefCluster;
    /**
     * Beliefs about cognitive competence
     * "I can't trust my memory/judgment"
     */
    readonly cognitiveCompetenceBeliefs: BeliefCluster;
    /**
     * Beliefs about thought control
     * "I must control my thoughts or bad things will happen"
     */
    readonly thoughtControlBeliefs: BeliefCluster;
    /**
     * Beliefs about emotional control
     * "I must not feel certain emotions"
     */
    readonly emotionalControlBeliefs: BeliefCluster;
}
/**
 * Cluster of related beliefs
 */
export interface BeliefCluster {
    /** Overall strength 0-1 */
    readonly strength: number;
    /** Specific beliefs identified */
    readonly beliefs: SpecificBelief[];
    /** Confidence in assessment */
    readonly confidence: number;
    /** Last updated */
    readonly lastUpdated: Date;
}
/**
 * Specific metacognitive belief
 */
export interface SpecificBelief {
    readonly id: string;
    readonly content: string;
    readonly contentRu?: string;
    readonly type: 'positive' | 'negative';
    readonly strength: number;
    readonly evidenceFor: string[];
    readonly evidenceAgainst: string[];
    readonly challengedAt?: Date;
    readonly responseToChallenge?: string;
}
/**
 * Complete Metacognitive State
 * Extends basic Metacognition from ICognitiveState
 */
export interface IMetacognitiveState {
    /** Unique identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: string | number;
    /**
     * MCQ-30 subscale scores
     */
    readonly mcq30: MCQ30Subscales;
    /**
     * Cognitive Attentional Syndrome
     */
    readonly cas: CognitiveAttentionalSyndrome;
    /**
     * Detailed metacognitive beliefs
     */
    readonly beliefs: MetacognitiveBeliefs;
    /**
     * Attentional control capacity (0-1)
     * Ability to shift and sustain attention voluntarily
     */
    readonly attentionalControl: number;
    /**
     * Detached mindfulness capacity (0-1)
     * Ability to observe thoughts without engagement
     */
    readonly detachedMindfulnessCapacity: number;
    /**
     * Meta-awareness level (0-1)
     * Awareness of own mental processes
     */
    readonly metaAwareness: number;
    /**
     * Primary treatment targets (prioritized)
     */
    readonly treatmentTargets: TreatmentTarget[];
    /**
     * Recommended interventions
     */
    readonly recommendedInterventions: MCTIntervention[];
    /** Timestamp */
    readonly timestamp: Date;
    /** Overall confidence in assessment */
    readonly confidence: number;
    /** Data quality indicator */
    readonly dataQuality: number;
}
/**
 * Treatment target from MCT
 */
export interface TreatmentTarget {
    readonly type: TreatmentTargetType;
    readonly priority: 'high' | 'medium' | 'low';
    readonly description: string;
    readonly currentSeverity: number;
    readonly linkedBeliefs: string[];
}
export type TreatmentTargetType = 'positive_worry_beliefs' | 'negative_worry_beliefs' | 'rumination' | 'threat_monitoring' | 'thought_suppression' | 'attentional_inflexibility' | 'reassurance_seeking' | 'avoidance' | 'low_metacognitive_awareness';
/**
 * MCT Intervention types
 */
export type MCTIntervention = 'attention_training_technique' | 'detached_mindfulness' | 'worry_postponement' | 'rumination_postponement' | 'verbal_reattribution' | 'behavioral_experiment' | 'advantages_disadvantages' | 'metacognitive_profiling' | 'situational_attention_refocusing';
/**
 * Complete MCQ-30 Items
 * Based on Wells & Cartwright-Hatton (2004)
 */
export declare const MCQ30_ITEMS: MCQ30Item[];
/**
 * Patterns for detecting worry in text
 */
export declare const WORRY_PATTERNS: {
    keywords: {
        en: string[];
        ru: string[];
    };
    futureOrientation: {
        en: string[];
        ru: string[];
    };
};
/**
 * Patterns for detecting rumination in text
 */
export declare const RUMINATION_PATTERNS: {
    keywords: {
        en: string[];
        ru: string[];
    };
    pastOrientation: {
        en: string[];
        ru: string[];
    };
};
/**
 * Patterns for detecting positive worry beliefs
 */
export declare const POSITIVE_WORRY_BELIEF_PATTERNS: {
    en: string[];
    ru: string[];
};
/**
 * Patterns for detecting uncontrollability beliefs
 */
export declare const UNCONTROLLABILITY_PATTERNS: {
    en: string[];
    ru: string[];
};
/**
 * MCQ-30 Clinical Cutoffs
 * Based on normative data
 */
export declare const MCQ30_CLINICAL_CUTOFFS: {
    readonly positiveWorryBeliefs: 12;
    readonly negativeUncontrollabilityDanger: 14;
    readonly cognitiveConfidence: 13;
    readonly needToControlThoughts: 12;
    readonly cognitiveSelfConsciousness: 16;
    readonly totalScore: 65;
};
/**
 * CAS severity thresholds
 */
export declare const CAS_SEVERITY_THRESHOLDS: {
    readonly mild: 0.3;
    readonly moderate: 0.5;
    readonly severe: 0.7;
    readonly critical: 0.85;
};
//# sourceMappingURL=IMetacognitiveState.d.ts.map