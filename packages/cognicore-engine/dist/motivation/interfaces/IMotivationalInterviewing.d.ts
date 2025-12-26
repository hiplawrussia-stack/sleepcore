/**
 * MOTIVATIONAL INTERVIEWING TECHNIQUES INTERFACE
 * ================================================
 * OARS + MITI 4.2 Behavior Codes for AI-MI System
 *
 * Scientific Foundation:
 * - MITI 4.2 Coding Manual (Moyers et al., 2014)
 * - OARS Framework (Miller & Rollnick, 2013)
 * - AI-MI Best Practices (JMIR 2025 Scoping Review)
 * - LLM Chain-of-Thought for MI (arXiv:2505.17380)
 *
 * Key Innovation:
 * - Computational implementation of MI therapist behaviors
 * - Real-time response generation following MI principles
 * - Fidelity tracking using MITI 4.2 global scores
 *
 * BФ "Другой путь" | CogniCore Phase 4.1
 */
import type { IMotivationalState, MIStrategy, ClientUtterance, ChangeTaskSubtype, DiscordType } from './IMotivationalState';
/**
 * MITI 4.2 Behavior Codes
 * Based on Moyers et al., 2014
 */
export type MITIBehaviorCode = 'question_open' | 'question_closed' | 'reflection_simple' | 'reflection_complex' | 'affirm' | 'seek_collaboration' | 'emphasize_autonomy' | 'support' | 'persuade' | 'persuade_with_permission' | 'confront' | 'direct' | 'give_information' | 'structure';
/**
 * OARS Techniques (core MI skills)
 */
export type OARSTechnique = 'open_question' | 'affirmation' | 'reflection' | 'summary';
/**
 * Reflection types (detailed classification)
 */
export type ReflectionType = 'repeat' | 'rephrase' | 'paraphrase' | 'feeling' | 'meaning' | 'amplified' | 'double_sided' | 'reframe' | 'metaphor' | 'continuing' | 'summary_reflection';
/**
 * Summary types
 */
export type SummaryType = 'collecting' | 'linking' | 'transitional';
/**
 * Structured MI response
 */
export interface MIResponse {
    /** Unique identifier */
    readonly id: string;
    /** Response text */
    readonly text: string;
    /** Russian version if different */
    readonly textRu?: string;
    /** Primary MITI behavior code */
    readonly primaryBehavior: MITIBehaviorCode;
    /** Secondary behaviors if applicable */
    readonly secondaryBehaviors?: MITIBehaviorCode[];
    /** OARS technique if applicable */
    readonly oarsTechnique?: OARSTechnique;
    /** Reflection type if reflection */
    readonly reflectionType?: ReflectionType;
    /** Summary type if summary */
    readonly summaryType?: SummaryType;
    /** Target: which CT subtype this aims to evoke */
    readonly targetChangeTalk?: ChangeTaskSubtype;
    /** Strategic intent */
    readonly strategicIntent: MIStrategy;
    /** Expected impact on CT/ST balance */
    readonly expectedImpact: 'increase_ct' | 'decrease_st' | 'explore' | 'neutral';
    /** MI-spirit alignment score (0-1) */
    readonly spiritAlignment: number;
    /** Timestamp */
    readonly timestamp: Date;
}
/**
 * Response generation context
 */
export interface MIResponseContext {
    /** Current motivational state */
    readonly motivationalState: IMotivationalState;
    /** Last client utterance */
    readonly lastUtterance: ClientUtterance;
    /** Conversation history (last N exchanges) */
    readonly recentExchanges: Array<{
        readonly clientText: string;
        readonly therapistResponse: string;
        readonly timestamp: Date;
    }>;
    /** Current therapeutic strategy */
    readonly currentStrategy: MIStrategy;
    /** Session goal */
    readonly sessionGoal?: string;
    /** Target behavior for change */
    readonly targetBehavior: string;
    /** User's values (for discrepancy development) */
    readonly userValues?: string[];
    /** User's expressed goals */
    readonly userGoals?: string[];
    /** Cultural/age context */
    readonly ageGroup: 'child' | 'teen' | 'adult';
    readonly language: 'ru' | 'en';
}
/**
 * Open question template
 */
export interface OpenQuestionTemplate {
    readonly id: string;
    readonly category: 'values' | 'goals' | 'obstacles' | 'resources' | 'importance' | 'confidence' | 'next_steps';
    readonly template: string;
    readonly templateRu: string;
    readonly placeholders: string[];
    readonly targetChangeTalk: ChangeTaskSubtype[];
    readonly appropriateStages: MIStrategy[];
    readonly examples: string[];
    readonly examplesRu: string[];
}
/**
 * Affirmation template
 */
export interface AffirmationTemplate {
    readonly id: string;
    readonly type: 'strength' | 'effort' | 'progress' | 'value' | 'intention';
    readonly template: string;
    readonly templateRu: string;
    readonly placeholders: string[];
    readonly appropriateFor: {
        readonly minChangeTalkRatio?: number;
        readonly stages: MIStrategy[];
        readonly afterDiscord?: boolean;
    };
}
/**
 * Reflection template
 */
export interface ReflectionTemplate {
    readonly id: string;
    readonly type: ReflectionType;
    readonly pattern: string;
    readonly patternRu: string;
    readonly complexity: 'simple' | 'complex';
    readonly target: 'change_talk' | 'sustain_talk' | 'ambivalence' | 'feeling' | 'meaning';
    readonly examples: Array<{
        readonly input: string;
        readonly output: string;
        readonly outputRu: string;
    }>;
}
/**
 * Summary template
 */
export interface SummaryTemplate {
    readonly id: string;
    readonly type: SummaryType;
    readonly structure: string;
    readonly structureRu: string;
    readonly includeSections: Array<'change_talk' | 'sustain_talk' | 'values' | 'goals' | 'strengths' | 'next_steps'>;
    readonly transitionPhrase?: string;
    readonly transitionPhraseRu?: string;
}
/**
 * MITI 4.2 Global Scores (1-5 scale)
 */
export interface MITIGlobalScores {
    /**
     * Technical Global: Cultivating Change Talk
     * How well therapist recognizes, reinforces, and evokes CT
     */
    readonly cultivatingChangeTalk: number;
    /**
     * Technical Global: Softening Sustain Talk
     * How well therapist avoids reinforcing ST
     */
    readonly softeningSustainTalk: number;
    /**
     * Relational Global: Partnership
     * Power sharing, collaboration, respect for expertise
     */
    readonly partnership: number;
    /**
     * Relational Global: Empathy
     * Understanding client's perspective
     */
    readonly empathy: number;
}
/**
 * MITI 4.2 Behavior Counts (per session/segment)
 */
export interface MITIBehaviorCounts {
    readonly openQuestions: number;
    readonly closedQuestions: number;
    readonly simpleReflections: number;
    readonly complexReflections: number;
    readonly affirm: number;
    readonly seekCollaboration: number;
    readonly emphasizeAutonomy: number;
    readonly persuade: number;
    readonly confront: number;
    readonly direct: number;
    readonly giveInformation: number;
}
/**
 * MITI 4.2 Summary Scores (derived)
 */
export interface MITISummaryScores {
    /**
     * Reflection to Question Ratio (R:Q)
     * Competent: >= 1:1, Proficient: >= 2:1
     */
    readonly reflectionToQuestionRatio: number;
    /**
     * Percent Complex Reflections (%CR)
     * Competent: >= 40%, Proficient: >= 50%
     */
    readonly percentComplexReflections: number;
    /**
     * Percent Open Questions (%OQ)
     * Competent: >= 50%, Proficient: >= 70%
     */
    readonly percentOpenQuestions: number;
    /**
     * MI-Adherent / MI-Non-Adherent Ratio
     * Higher = better fidelity
     */
    readonly adherentNonAdherentRatio: number;
    /**
     * Overall fidelity assessment
     */
    readonly fidelityLevel: 'below_threshold' | 'competent' | 'proficient';
}
/**
 * Complete MI Fidelity Report
 */
export interface MIFidelityReport {
    readonly sessionId: string;
    readonly timestamp: Date;
    readonly duration: number;
    readonly globalScores: MITIGlobalScores;
    readonly behaviorCounts: MITIBehaviorCounts;
    readonly summaryScores: MITISummaryScores;
    /** Specific recommendations for improvement */
    readonly recommendations: string[];
    /** Highlights (good moments) */
    readonly highlights: string[];
    /** Areas for growth */
    readonly growthAreas: string[];
}
/**
 * Main MI Engine Interface
 */
export interface IMotivationalInterviewingEngine {
    /**
     * Analyze client utterance and classify CT/ST
     */
    analyzeUtterance(text: string): Promise<ClientUtterance>;
    /**
     * Generate MI-consistent response
     */
    generateResponse(context: MIResponseContext): Promise<MIResponse>;
    /**
     * Generate open-ended question to evoke specific CT
     */
    generateOpenQuestion(targetChangeTalk: ChangeTaskSubtype, context: MIResponseContext): Promise<MIResponse>;
    /**
     * Generate affirmation
     */
    generateAffirmation(context: MIResponseContext): Promise<MIResponse>;
    /**
     * Generate reflection of client statement
     */
    generateReflection(utterance: ClientUtterance, type: ReflectionType, context: MIResponseContext): Promise<MIResponse>;
    /**
     * Generate summary
     */
    generateSummary(type: SummaryType, context: MIResponseContext): Promise<MIResponse>;
    /**
     * Respond to discord/resistance
     */
    respondToDiscord(discordType: DiscordType, context: MIResponseContext): Promise<MIResponse>;
    /**
     * Calculate MI fidelity for session
     */
    calculateFidelity(sessionResponses: MIResponse[], clientUtterances: ClientUtterance[]): MIFidelityReport;
    /**
     * Get strategy recommendation based on state
     */
    recommendStrategy(state: IMotivationalState): MIStrategy;
    /**
     * Determine if ready for action planning
     */
    assessReadinessForAction(state: IMotivationalState): {
        readonly ready: boolean;
        readonly reasons: string[];
        readonly nextSteps: string[];
    };
}
/**
 * MI Response Generator (AI-powered)
 */
export interface IMIResponseGenerator {
    /**
     * Generate response using templates
     */
    generateFromTemplate(template: OpenQuestionTemplate | AffirmationTemplate | ReflectionTemplate | SummaryTemplate, context: MIResponseContext): Promise<string>;
    /**
     * Generate response using LLM with MI constraints
     */
    generateWithLLM(prompt: string, context: MIResponseContext, constraints: MIGenerationConstraints): Promise<string>;
    /**
     * Validate response for MI adherence
     */
    validateMIAdherence(response: string, context: MIResponseContext): {
        readonly isAdherent: boolean;
        readonly score: number;
        readonly issues: string[];
        readonly suggestions: string[];
    };
    /**
     * Reframe non-adherent response
     */
    reframeToMIAdherent(response: string, context: MIResponseContext): Promise<string>;
}
/**
 * Constraints for LLM generation
 */
export interface MIGenerationConstraints {
    /** Allowed behavior codes */
    readonly allowedBehaviors: MITIBehaviorCode[];
    /** Forbidden behavior codes */
    readonly forbiddenBehaviors: MITIBehaviorCode[];
    /** Maximum response length */
    readonly maxLength: number;
    /** Must include reflection? */
    readonly mustIncludeReflection: boolean;
    /** Avoid MI-inconsistent phrases */
    readonly avoidPhrases: string[];
    /** Target CT subtype to evoke */
    readonly targetChangeTalk?: ChangeTaskSubtype;
    /** Language */
    readonly language: 'ru' | 'en';
}
/**
 * Open question templates for evoking change talk
 */
export declare const OPEN_QUESTION_TEMPLATES: OpenQuestionTemplate[];
/**
 * Affirmation templates
 */
export declare const AFFIRMATION_TEMPLATES: AffirmationTemplate[];
/**
 * Reflection pattern templates
 */
export declare const REFLECTION_TEMPLATES: ReflectionTemplate[];
/**
 * Summary templates
 */
export declare const SUMMARY_TEMPLATES: SummaryTemplate[];
/**
 * Discord response strategies
 */
export declare const DISCORD_RESPONSE_STRATEGIES: Record<DiscordType, {
    readonly primaryResponse: MITIBehaviorCode;
    readonly templates: string[];
    readonly templatesRu: string[];
    readonly avoid: string[];
}>;
/**
 * MITI 4.2 competency thresholds
 */
export declare const MITI_THRESHOLDS: {
    readonly global: {
        readonly belowThreshold: {
            readonly cultivatingChangeTalk: 2.5;
            readonly softeningSustainTalk: 2.5;
            readonly partnership: 3;
            readonly empathy: 3;
        };
        readonly competent: {
            readonly cultivatingChangeTalk: 3;
            readonly softeningSustainTalk: 3;
            readonly partnership: 3.5;
            readonly empathy: 3.5;
        };
        readonly proficient: {
            readonly cultivatingChangeTalk: 4;
            readonly softeningSustainTalk: 4;
            readonly partnership: 4;
            readonly empathy: 4;
        };
    };
    readonly summary: {
        readonly competent: {
            readonly reflectionToQuestionRatio: 1;
            readonly percentComplexReflections: 40;
            readonly percentOpenQuestions: 50;
        };
        readonly proficient: {
            readonly reflectionToQuestionRatio: 2;
            readonly percentComplexReflections: 50;
            readonly percentOpenQuestions: 70;
        };
    };
};
//# sourceMappingURL=IMotivationalInterviewing.d.ts.map