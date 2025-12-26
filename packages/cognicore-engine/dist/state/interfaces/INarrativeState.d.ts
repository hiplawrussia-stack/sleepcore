/**
 * 📖 NARRATIVE STATE INTERFACE
 * ============================
 * Personal Story Arc Tracking - WORLD-FIRST Innovation
 * Человек как герой собственной истории изменений
 *
 * Scientific Foundation:
 * - Transtheoretical Model of Change (Prochaska & DiClemente, 1983)
 * - Narrative Identity Theory (McAdams, 2001)
 * - Hero's Journey (Campbell, 1949)
 * - Narrative Therapy (White & Epston, 1990)
 *
 * Unique Innovation:
 * - Tracking personal transformation journey
 * - Role evolution (victim → survivor → hero)
 * - Breakthrough/setback momentum
 * - Story arc prediction
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
/**
 * Stages of Change (Transtheoretical Model)
 * Enhanced with therapeutic context
 */
export type ChangeStage = 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance' | 'relapse';
/**
 * Narrative role in personal story
 * Based on archetypal journey
 */
export type NarrativeRole = 'victim' | 'survivor' | 'explorer' | 'hero' | 'mentor';
/**
 * Significant moment in the narrative
 */
export interface NarrativeMoment {
    readonly id: string;
    readonly type: 'breakthrough' | 'setback' | 'insight' | 'challenge' | 'milestone';
    readonly description: string;
    readonly emotionalImpact: number;
    readonly significance: number;
    readonly timestamp: Date;
    readonly triggeredBy?: string;
    readonly lessonsLearned?: string[];
    readonly linkedToStage?: ChangeStage;
}
/**
 * Story chapter (time period)
 */
export interface NarrativeChapter {
    readonly id: string;
    readonly title: string;
    readonly startDate: Date;
    readonly endDate?: Date;
    readonly dominantStage: ChangeStage;
    readonly dominantRole: NarrativeRole;
    readonly keyMoments: NarrativeMoment[];
    readonly overallTone: 'dark' | 'struggling' | 'neutral' | 'hopeful' | 'triumphant';
    readonly summary?: string;
}
/**
 * Personal values and meaning
 */
export interface PersonalValues {
    readonly identified: Array<{
        readonly value: string;
        readonly importance: number;
        readonly currentAlignment: number;
        readonly examples: string[];
    }>;
    readonly meaningSource: 'relationships' | 'achievement' | 'growth' | 'contribution' | 'experience' | 'mixed';
    readonly purposeClarity: number;
}
/**
 * Narrative themes (recurring patterns)
 */
export interface NarrativeTheme {
    readonly theme: string;
    readonly frequency: number;
    readonly valence: number;
    readonly evolution: 'intensifying' | 'stable' | 'resolving' | 'dormant';
    readonly examples: string[];
}
/**
 * Future projection (where story is heading)
 */
export interface NarrativeProjection {
    readonly predictedStage: ChangeStage;
    readonly predictedRole: NarrativeRole;
    readonly confidence: number;
    readonly timeframe: 'short' | 'medium' | 'long';
    readonly optimisticScenario: string;
    readonly realisticScenario: string;
    readonly pessimisticScenario: string;
    readonly keyFactors: string[];
}
/**
 * Momentum indicator
 */
export interface NarrativeMomentum {
    /**
     * Overall direction of change (-1.0 to +1.0)
     * Negative = moving toward relapse
     * Positive = moving toward growth
     */
    readonly direction: number;
    /**
     * Speed of change (0.0 to 1.0)
     * Low = slow, gradual
     * High = rapid transformation
     */
    readonly velocity: number;
    /**
     * Stability of momentum (0.0 to 1.0)
     * Low = erratic, unpredictable
     * High = consistent trajectory
     */
    readonly stability: number;
    /**
     * Factors accelerating positive change
     */
    readonly accelerators: string[];
    /**
     * Factors slowing or reversing progress
     */
    readonly barriers: string[];
}
/**
 * Stage transition probability
 */
export interface StageTransition {
    readonly fromStage: ChangeStage;
    readonly toStage: ChangeStage;
    readonly probability: number;
    readonly estimatedTimeframe: number;
    readonly requiredConditions: string[];
    readonly riskFactors: string[];
}
/**
 * 📖 Main Narrative State Interface
 * Core component of State Vector S_t (n_t)
 */
export interface INarrativeState {
    /**
     * Current stage in change process
     */
    readonly stage: ChangeStage;
    /**
     * Days spent in current stage
     */
    readonly daysInCurrentStage: number;
    /**
     * Stage transition history
     */
    readonly stageHistory: Array<{
        readonly stage: ChangeStage;
        readonly enteredAt: Date;
        readonly exitedAt?: Date;
        readonly duration: number;
    }>;
    /**
     * Current narrative role
     */
    readonly role: NarrativeRole;
    /**
     * Role evolution history
     */
    readonly roleHistory: Array<{
        readonly role: NarrativeRole;
        readonly startedAt: Date;
        readonly endedAt?: Date;
        readonly trigger?: string;
    }>;
    /**
     * Overall progress percentage (0-100)
     * Composite of stage progress and role evolution
     */
    readonly progressPercent: number;
    /**
     * Key breakthrough moments
     */
    readonly breakthroughs: NarrativeMoment[];
    /**
     * Setback moments
     */
    readonly setbacks: NarrativeMoment[];
    /**
     * Current narrative momentum
     */
    readonly momentum: NarrativeMomentum;
    /**
     * Story chapters (major periods)
     */
    readonly chapters: NarrativeChapter[];
    /**
     * Current chapter
     */
    readonly currentChapter: NarrativeChapter;
    /**
     * Recurring themes in narrative
     */
    readonly themes: NarrativeTheme[];
    /**
     * Personal values and meaning
     */
    readonly values: PersonalValues;
    /**
     * Future projections
     */
    readonly projections: NarrativeProjection[];
    /**
     * Likely stage transitions
     */
    readonly possibleTransitions: StageTransition[];
    /**
     * Timestamp of this state
     */
    readonly timestamp: Date;
    /**
     * Confidence in assessment
     */
    readonly confidence: number;
    /**
     * Data quality
     */
    readonly dataQuality: number;
}
/**
 * Narrative State Builder
 */
export interface INarrativeStateBuilder {
    setStage(stage: ChangeStage, daysIn: number): this;
    setRole(role: NarrativeRole): this;
    addBreakthrough(moment: NarrativeMoment): this;
    addSetback(moment: NarrativeMoment): this;
    setMomentum(momentum: NarrativeMomentum): this;
    addChapter(chapter: NarrativeChapter): this;
    addTheme(theme: NarrativeTheme): this;
    setValues(values: PersonalValues): this;
    addProjection(projection: NarrativeProjection): this;
    build(): INarrativeState;
}
/**
 * Narrative State Factory
 */
export interface INarrativeStateFactory {
    /**
     * Create from conversation history analysis
     */
    fromConversationHistory(messages: Array<{
        text: string;
        timestamp: Date;
    }>, previousState?: INarrativeState): Promise<INarrativeState>;
    /**
     * Create from self-reported stage
     */
    fromSelfReport(reportedStage: ChangeStage, previousState?: INarrativeState): Promise<INarrativeState>;
    /**
     * Create initial state for new user
     */
    createInitial(): INarrativeState;
    /**
     * Record breakthrough moment
     */
    recordBreakthrough(currentState: INarrativeState, description: string, emotionalImpact: number): INarrativeState;
    /**
     * Record setback moment
     */
    recordSetback(currentState: INarrativeState, description: string, emotionalImpact: number): INarrativeState;
    /**
     * Update stage based on new evidence
     */
    updateStage(currentState: INarrativeState, evidenceForChange: string[]): INarrativeState;
}
/**
 * Narrative Analyzer Interface
 */
export interface INarrativeAnalyzer {
    /**
     * Detect stage from text
     */
    detectStage(text: string): Promise<{
        stage: ChangeStage;
        confidence: number;
        evidence: string[];
    }>;
    /**
     * Detect role from text
     */
    detectRole(text: string): Promise<{
        role: NarrativeRole;
        confidence: number;
        evidence: string[];
    }>;
    /**
     * Identify narrative themes
     */
    identifyThemes(texts: string[]): Promise<NarrativeTheme[]>;
    /**
     * Predict next stage transition
     */
    predictTransition(currentState: INarrativeState): Promise<StageTransition[]>;
    /**
     * Generate chapter summary
     */
    generateChapterSummary(moments: NarrativeMoment[], timeframe: {
        start: Date;
        end: Date;
    }): Promise<string>;
}
/**
 * Stage characteristics and indicators
 */
export declare const STAGE_CHARACTERISTICS: Record<ChangeStage, {
    description: string;
    typicalDuration: {
        min: number;
        max: number;
    };
    indicators: string[];
    languagePatterns: string[];
    therapeuticFocus: string[];
    movingForward: string[];
    riskOfStagnation: string[];
}>;
/**
 * Role characteristics
 */
export declare const ROLE_CHARACTERISTICS: Record<NarrativeRole, {
    description: string;
    languagePatterns: string[];
    typicalEmotions: string[];
    growthDirection: NarrativeRole;
    therapeuticApproach: string;
}>;
/**
 * Stage transition probabilities (empirical data)
 */
export declare const STAGE_TRANSITIONS: Record<ChangeStage, Record<ChangeStage, number>>;
//# sourceMappingURL=INarrativeState.d.ts.map