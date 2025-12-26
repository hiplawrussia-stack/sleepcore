/**
 * 🎯 MOTIVATIONAL STATE INTERFACE
 * ================================
 * World-First Integration of MI Theory with Computational Models
 *
 * Scientific Foundation (2024-2025 Research):
 * - Motivational Interviewing (Miller & Rollnick, 2013)
 * - MITI 4.2 Coding System (Moyers et al., 2014)
 * - MISC 2.5 Client Language Coding (CASAA)
 * - DARN-CAT Framework for Change Talk
 * - AI-Augmented MI (arXiv:2505.17380, 2025)
 * - BiMISC Dataset (ACL 2024)
 * - LLM MI Scoping Review (JMIR 2025)
 *
 * Key Innovation:
 * - Real-time Change Talk / Sustain Talk detection
 * - DARN-CAT classification for motivation assessment
 * - Readiness Ruler digital implementation
 * - MI-consistent response selection
 * - Integration with existing INarrativeState.stage
 *
 * БФ "Другой путь" | CogniCore Phase 4.1
 */
import type { ChangeStage } from '../../state/interfaces/INarrativeState';
/**
 * Client language categories based on MISC coding scheme
 * CT = Change Talk (favors change)
 * ST = Sustain Talk (favors status quo)
 * FN = Follow/Neutral (unrelated to change)
 */
export type ClientLanguageCategory = 'change_talk' | 'sustain_talk' | 'follow_neutral';
/**
 * DARN-CAT Framework for Change Talk Classification
 *
 * Preparatory Change Talk (DARN):
 * - Desire: "I want to...", "I wish I could..."
 * - Ability: "I could...", "I can..."
 * - Reasons: "Because...", "It would help me..."
 * - Need: "I have to...", "I must..."
 *
 * Mobilizing Change Talk (CAT):
 * - Commitment: "I will...", "I'm going to..."
 * - Activation: "I'm ready to...", "I'm willing to..."
 * - Taking Steps: "I started...", "I've been..."
 */
export type ChangeTaskSubtype = 'desire' | 'ability' | 'reasons' | 'need' | 'commitment' | 'activation' | 'taking_steps';
/**
 * Sustain Talk Subtypes (mirror of DARN-CAT)
 */
export type SustainTalkSubtype = 'desire_against' | 'ability_against' | 'reasons_against' | 'need_against' | 'commitment_against' | 'activation_against' | 'taking_steps_against';
/**
 * Detected utterance with language classification
 */
export interface ClientUtterance {
    readonly id: string;
    readonly text: string;
    readonly timestamp: Date;
    /** Primary classification */
    readonly category: ClientLanguageCategory;
    /** Subtype for Change Talk */
    readonly changeSubtype?: ChangeTaskSubtype;
    /** Subtype for Sustain Talk */
    readonly sustainSubtype?: SustainTalkSubtype;
    /** Strength score: -5 (strong ST) to +5 (strong CT) */
    readonly strength: number;
    /** Detection confidence (0-1) */
    readonly confidence: number;
    /** Keywords/patterns that triggered detection */
    readonly evidenceSpans: Array<{
        readonly start: number;
        readonly end: number;
        readonly text: string;
        readonly pattern: string;
    }>;
    /** Link to triggering topic */
    readonly targetBehavior?: string;
}
/**
 * Readiness Ruler Assessment
 * Classic MI tool for measuring importance and confidence
 */
export interface ReadinessRuler {
    /**
     * Importance: "How important is it to you to [change]?"
     * Scale: 0 (not at all) to 10 (extremely)
     */
    readonly importance: number;
    /**
     * Confidence: "How confident are you that you could [change]?"
     * Scale: 0 (not at all) to 10 (extremely)
     */
    readonly confidence: number;
    /**
     * Readiness: Computed from importance × confidence
     * Or explicit "How ready are you to [change]?"
     */
    readonly readiness: number;
    /** When last assessed */
    readonly assessedAt: Date;
    /** Source of assessment */
    readonly source: 'self_report' | 'inferred' | 'conversation';
    /** Confidence in assessment accuracy */
    readonly assessmentConfidence: number;
}
/**
 * Change Talk vs Sustain Talk ratio
 * Key predictor of behavior change (Amrhein et al., 2003)
 */
export interface LanguageBalance {
    /** Total Change Talk utterances */
    readonly changeTalkCount: number;
    /** Total Sustain Talk utterances */
    readonly sustainTalkCount: number;
    /** CT / (CT + ST) ratio - higher = more change-oriented */
    readonly changeTalkRatio: number;
    /** Average strength of CT (-5 to +5) */
    readonly averageCtStrength: number;
    /** Average strength of ST (-5 to +5) */
    readonly averageStStrength: number;
    /** Net balance: positive = more CT, negative = more ST */
    readonly netBalance: number;
    /** Trend over last N utterances */
    readonly trend: 'increasing' | 'stable' | 'decreasing';
    /** Time window for this calculation */
    readonly windowStart: Date;
    readonly windowEnd: Date;
}
/**
 * DARN-CAT Profile - distribution of change talk types
 */
export interface DarnCatProfile {
    readonly desire: number;
    readonly ability: number;
    readonly reasons: number;
    readonly need: number;
    readonly commitment: number;
    readonly activation: number;
    readonly takingSteps: number;
    /** Ratio of mobilizing to preparatory (higher = more action-ready) */
    readonly mobilizingRatio: number;
    /** Dominant preparatory type */
    readonly dominantPreparatory: 'desire' | 'ability' | 'reasons' | 'need' | 'none';
    /** Has mobilizing language started? */
    readonly mobilizingPresent: boolean;
}
/**
 * Ambivalence Assessment
 * Core concept in MI - the "push-pull" of change
 */
export interface AmbivalenceState {
    /**
     * Overall ambivalence level (0-1)
     * 0 = No ambivalence (clear direction)
     * 1 = Maximum ambivalence (equal CT and ST)
     */
    readonly level: number;
    /**
     * Type of ambivalence
     */
    readonly type: AmbivalenceType;
    /**
     * Arguments FOR change (pros)
     */
    readonly prosForChange: string[];
    /**
     * Arguments AGAINST change (cons)
     */
    readonly consForChange: string[];
    /**
     * Arguments FOR status quo (pros)
     */
    readonly prosForStatusQuo: string[];
    /**
     * Arguments AGAINST status quo (cons)
     */
    readonly consForStatusQuo: string[];
    /**
     * Is ambivalence normal and healthy?
     * (Important for response strategy)
     */
    readonly isNormative: boolean;
    /**
     * Primary source of ambivalence
     */
    readonly primaryConflict: string;
}
export type AmbivalenceType = 'approach_approach' | 'avoidance_avoidance' | 'approach_avoidance' | 'double_approach_avoidance';
/**
 * Discord/Resistance Indicators
 * Signs of strain in therapeutic relationship
 */
export interface DiscordIndicators {
    /**
     * Overall discord level (0-1)
     * Higher = more relationship strain
     */
    readonly level: number;
    /**
     * Types of discord observed
     */
    readonly types: DiscordType[];
    /**
     * Recent discord events
     */
    readonly events: DiscordEvent[];
    /**
     * Is discord increasing?
     */
    readonly trend: 'increasing' | 'stable' | 'decreasing';
    /**
     * Recommended response
     */
    readonly recommendedResponse: 'reflect' | 'apologize' | 'shift_focus' | 'emphasize_autonomy';
}
export type DiscordType = 'arguing' | 'interrupting' | 'negating' | 'ignoring' | 'defending' | 'squaring_off';
export interface DiscordEvent {
    readonly type: DiscordType;
    readonly utterance: string;
    readonly timestamp: Date;
    readonly intensity: number;
    readonly possibleTrigger?: string;
}
/**
 * 🎯 Main Motivational State Interface
 * Integrates with CogniCore State Vector
 */
export interface IMotivationalState {
    /** Unique identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: string | number;
    /**
     * Current readiness ruler scores
     */
    readonly readinessRuler: ReadinessRuler;
    /**
     * Linked stage from INarrativeState
     * (Precontemplation → Contemplation → Preparation → Action → Maintenance)
     */
    readonly linkedStage: ChangeStage;
    /**
     * Days in current motivational state
     */
    readonly daysInState: number;
    /**
     * Recent client utterances (last N)
     */
    readonly recentUtterances: ClientUtterance[];
    /**
     * Current language balance
     */
    readonly languageBalance: LanguageBalance;
    /**
     * DARN-CAT profile
     */
    readonly darnCatProfile: DarnCatProfile;
    /**
     * Session-level CT/ST ratio
     */
    readonly sessionRatio: number;
    /**
     * Historical trend of CT ratio
     */
    readonly ratioTrend: Array<{
        readonly date: Date;
        readonly ratio: number;
    }>;
    /**
     * Current ambivalence state
     */
    readonly ambivalence: AmbivalenceState;
    /**
     * Is ambivalence being explored?
     */
    readonly ambivalenceExplored: boolean;
    /**
     * Discord indicators
     */
    readonly discord: DiscordIndicators;
    /**
     * Is rapport maintained?
     */
    readonly rapportLevel: number;
    /**
     * Recommended MI strategy for current state
     */
    readonly recommendedStrategy: MIStrategy;
    /**
     * Focus areas for this session
     */
    readonly sessionFocus: string[];
    /**
     * Things to avoid (based on user state)
     */
    readonly avoid: string[];
    /** Timestamp */
    readonly timestamp: Date;
    /** Overall confidence in assessment */
    readonly confidence: number;
    /** Data quality indicator */
    readonly dataQuality: number;
}
/**
 * MI Strategy recommendations
 */
export type MIStrategy = 'build_rapport' | 'develop_discrepancy' | 'evoke_change_talk' | 'explore_ambivalence' | 'strengthen_commitment' | 'support_self_efficacy' | 'roll_with_resistance' | 'summarize_and_transition' | 'action_planning' | 'relapse_prevention';
export interface IMotivationalStateBuilder {
    setUserId(userId: string | number): this;
    setReadinessRuler(importance: number, confidence: number): this;
    setLinkedStage(stage: ChangeStage): this;
    addUtterance(utterance: ClientUtterance): this;
    setLanguageBalance(balance: LanguageBalance): this;
    setDarnCatProfile(profile: DarnCatProfile): this;
    setAmbivalence(ambivalence: AmbivalenceState): this;
    setDiscord(discord: DiscordIndicators): this;
    setStrategy(strategy: MIStrategy): this;
    build(): IMotivationalState;
}
export interface IMotivationalStateFactory {
    /**
     * Create from conversation analysis
     */
    fromConversation(messages: Array<{
        text: string;
        timestamp: Date;
        isUser: boolean;
    }>, userId: string | number, previousState?: IMotivationalState): Promise<IMotivationalState>;
    /**
     * Create from explicit assessment (readiness ruler)
     */
    fromAssessment(userId: string | number, importance: number, confidence: number): IMotivationalState;
    /**
     * Create initial state for new user
     */
    createInitial(userId: string | number): IMotivationalState;
    /**
     * Update based on new utterance
     */
    updateWithUtterance(currentState: IMotivationalState, newUtterance: ClientUtterance): IMotivationalState;
    /**
     * Update readiness ruler
     */
    updateReadiness(currentState: IMotivationalState, importance: number, confidence: number): IMotivationalState;
}
/**
 * Change Talk detection patterns
 * Based on MISC 2.5 coding manual + Russian adaptations
 */
export declare const CHANGE_TALK_PATTERNS: Record<ChangeTaskSubtype, {
    readonly keywords: string[];
    readonly keywordsRu: string[];
    readonly patterns: RegExp[];
    readonly patternsRu: RegExp[];
    readonly strength: number;
}>;
/**
 * Sustain Talk detection patterns
 */
export declare const SUSTAIN_TALK_PATTERNS: Record<SustainTalkSubtype, {
    readonly keywords: string[];
    readonly keywordsRu: string[];
    readonly patterns: RegExp[];
    readonly patternsRu: RegExp[];
    readonly strength: number;
}>;
/**
 * Discord/Resistance patterns
 */
export declare const DISCORD_PATTERNS: Record<DiscordType, {
    readonly keywords: string[];
    readonly keywordsRu: string[];
    readonly patterns: RegExp[];
}>;
/**
 * Strategy recommendations based on state
 */
export declare const STRATEGY_RECOMMENDATIONS: Record<ChangeStage, {
    readonly primaryStrategy: MIStrategy;
    readonly secondaryStrategies: MIStrategy[];
    readonly focus: string[];
    readonly avoid: string[];
}>;
//# sourceMappingURL=IMotivationalState.d.ts.map