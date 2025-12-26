/**
 * METACOGNITIVE THERAPY TECHNIQUES INTERFACE
 * ==========================================
 * Wells' MCT Interventions for Digital Implementation
 *
 * Scientific Foundation:
 * - Attention Training Technique (ATT) - Wells, 1990
 * - Detached Mindfulness (DM) - Wells, 2005
 * - Worry Postponement - Wells, 2009
 * - Situational Attention Refocusing (SAR) - Wells
 * - Digital ATT Effectiveness: d = 0.67 abbreviated version (2024 RCT)
 *
 * Key Innovation:
 * - Automated ATT delivery via chat/audio
 * - Real-time CAS interruption
 * - Digital worry postponement scheduling
 * - DM guidance adapted for text-based delivery
 *
 * БФ "Другой путь" | CogniCore Phase 4.2
 */
import type { IMetacognitiveState, MCTIntervention, WorryRuminationTheme, SpecificBelief } from './IMetacognitiveState';
/**
 * ATT Session Configuration
 * Based on Wells' protocol
 */
export interface ATTSession {
    /** Session identifier */
    readonly id: string;
    /** User identifier */
    readonly userId: string | number;
    /** Session type */
    readonly type: ATTSessionType;
    /** Duration in minutes */
    readonly durationMinutes: number;
    /** Session phases */
    readonly phases: ATTPhase[];
    /** Audio tracks used */
    readonly audioTracks?: ATTAudioTrack[];
    /** Text-based instructions */
    readonly instructions: ATTInstruction[];
    /** Session state */
    readonly state: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
    /** Progress within session (0-1) */
    readonly progress: number;
    /** Start time */
    readonly startedAt?: Date;
    /** End time */
    readonly completedAt?: Date;
    /** User feedback */
    readonly feedback?: ATTSessionFeedback;
}
/**
 * ATT Session Types
 */
export type ATTSessionType = 'full' | 'abbreviated' | 'practice' | 'introduction';
/**
 * ATT Phase
 * Based on Wells' three-component structure
 */
export interface ATTPhase {
    readonly type: ATTPhaseType;
    readonly durationSeconds: number;
    readonly instructions: string;
    readonly instructionsRu: string;
    readonly sounds?: string[];
    readonly currentSound?: number;
}
export type ATTPhaseType = 'psychoeducation' | 'selective_attention' | 'attention_switching' | 'divided_attention' | 'self_focus_redirect' | 'closing';
/**
 * ATT Audio Track
 */
export interface ATTAudioTrack {
    readonly id: string;
    readonly name: string;
    readonly nameRu: string;
    readonly location: 'left' | 'right' | 'center' | 'behind' | 'above';
    readonly type: 'voice' | 'ambient' | 'tonal' | 'nature';
    readonly url?: string;
    readonly description: string;
}
/**
 * ATT Text Instruction
 * For text-based delivery without audio
 */
export interface ATTInstruction {
    readonly phase: ATTPhaseType;
    readonly order: number;
    readonly textEn: string;
    readonly textRu: string;
    readonly durationSeconds: number;
    readonly visualCue?: string;
    readonly pause?: boolean;
}
/**
 * ATT Session Feedback
 */
export interface ATTSessionFeedback {
    /** Difficulty rating (1-10) */
    readonly difficulty: number;
    /** Focus quality (1-10) */
    readonly focusQuality: number;
    /** Mind wandering frequency (1-10) */
    readonly mindWandering: number;
    /** Relaxation achieved (1-10) */
    readonly relaxation: number;
    /** Would practice again */
    readonly wouldRepeat: boolean;
    /** Free-form comments */
    readonly comments?: string;
    /** Submitted at */
    readonly submittedAt: Date;
}
/**
 * Detached Mindfulness Exercise
 */
export interface DetachedMindfulnessExercise {
    /** Exercise identifier */
    readonly id: string;
    /** Exercise type */
    readonly type: DMExerciseType;
    /** Target: what to apply DM to */
    readonly target: DMTarget;
    /** Exercise instructions */
    readonly instructions: DMInstruction[];
    /** Metaphors to use */
    readonly metaphors: DMMetaphor[];
    /** Duration estimate (minutes) */
    readonly estimatedDuration: number;
    /** Prerequisites */
    readonly prerequisites: string[];
    /** Contraindications */
    readonly contraindications: string[];
}
/**
 * DM Exercise Types
 */
export type DMExerciseType = 'tiger_task' | 'clouds_passing' | 'leaves_on_stream' | 'train_station' | 'free_association' | 'thought_observation' | 'spatial_distancing';
/**
 * DM Target
 */
export interface DMTarget {
    readonly type: 'worry' | 'rumination' | 'intrusive_thought' | 'negative_belief' | 'emotion' | 'sensation';
    readonly content?: string;
    readonly intensity: number;
}
/**
 * DM Instruction
 */
export interface DMInstruction {
    readonly order: number;
    readonly textEn: string;
    readonly textRu: string;
    readonly duration: number;
    readonly pause: boolean;
}
/**
 * DM Metaphor
 */
export interface DMMetaphor {
    readonly id: string;
    readonly nameEn: string;
    readonly nameRu: string;
    readonly descriptionEn: string;
    readonly descriptionRu: string;
    readonly scriptEn: string;
    readonly scriptRu: string;
    readonly suitableFor: DMTarget['type'][];
}
/**
 * Worry Postponement Protocol
 */
export interface WorryPostponementProtocol {
    /** User identifier */
    readonly userId: string | number;
    /** Scheduled worry time */
    readonly scheduledWorryTime: ScheduledWorryTime;
    /** Current postponed worries */
    readonly postponedWorries: PostponedWorry[];
    /** Worry time sessions completed */
    readonly sessionsCompleted: number;
    /** Protocol start date */
    readonly startedAt: Date;
    /** Protocol active */
    readonly isActive: boolean;
    /** Effectiveness metrics */
    readonly effectiveness: WorryPostponementEffectiveness;
}
/**
 * Scheduled Worry Time
 */
export interface ScheduledWorryTime {
    /** Time of day (24h format, e.g., "18:00") */
    readonly time: string;
    /** Duration in minutes (typically 15-30) */
    readonly durationMinutes: number;
    /** Days of week (0=Sunday, 6=Saturday) */
    readonly daysOfWeek: number[];
    /** Location (optional, for consistency) */
    readonly location?: string;
    /** Reminder enabled */
    readonly reminderEnabled: boolean;
    /** Reminder minutes before */
    readonly reminderMinutesBefore: number;
}
/**
 * Postponed Worry
 */
export interface PostponedWorry {
    readonly id: string;
    readonly content: string;
    readonly theme: WorryRuminationTheme;
    readonly capturedAt: Date;
    readonly urgencyPerceived: number;
    readonly processedDuringWorryTime: boolean;
    readonly processedAt?: Date;
    readonly outcome?: WorryOutcome;
}
/**
 * Worry Processing Outcome
 */
export interface WorryOutcome {
    readonly stillRelevant: boolean;
    readonly actionTaken?: string;
    readonly resolved: boolean;
    readonly lessIntense: boolean;
    readonly insight?: string;
}
/**
 * Worry Postponement Effectiveness
 */
export interface WorryPostponementEffectiveness {
    /** Reduction in spontaneous worry (0-1) */
    readonly worryReduction: number;
    /** Success rate of postponing (0-1) */
    readonly postponementSuccessRate: number;
    /** Average time to worry dissipation */
    readonly avgDissipationMinutes: number;
    /** Worries that resolved before worry time */
    readonly resolvedBeforeWorryTime: number;
    /** Total worries processed */
    readonly totalWorriesProcessed: number;
}
/**
 * Verbal Reattribution for Metacognitive Beliefs
 */
export interface VerbalReattribution {
    /** Target belief */
    readonly targetBelief: SpecificBelief;
    /** Socratic questions to use */
    readonly socraticQuestions: SocraticQuestion[];
    /** Evidence gathering prompts */
    readonly evidencePrompts: EvidencePrompt[];
    /** Alternative perspectives */
    readonly alternatives: AlternativePerspective[];
    /** Behavioral experiment suggestions */
    readonly experiments: BehavioralExperiment[];
}
/**
 * Socratic Question for MCT
 */
export interface SocraticQuestion {
    readonly id: string;
    readonly questionEn: string;
    readonly questionRu: string;
    readonly targetBeliefType: 'positive_worry' | 'uncontrollability' | 'danger' | 'need_to_control';
    readonly purpose: string;
    readonly followUpIfYes?: string;
    readonly followUpIfNo?: string;
}
/**
 * Evidence Gathering Prompt
 */
export interface EvidencePrompt {
    readonly id: string;
    readonly promptEn: string;
    readonly promptRu: string;
    readonly forOrAgainst: 'for' | 'against';
    readonly targetBelief: string;
}
/**
 * Alternative Perspective
 */
export interface AlternativePerspective {
    readonly id: string;
    readonly originalBelief: string;
    readonly alternativeEn: string;
    readonly alternativeRu: string;
    readonly evidenceSupporting: string[];
}
/**
 * Behavioral Experiment for MCT
 */
export interface BehavioralExperiment {
    readonly id: string;
    readonly nameEn: string;
    readonly nameRu: string;
    readonly beliefTested: string;
    readonly prediction: string;
    readonly procedure: string[];
    readonly procedureRu: string[];
    readonly possibleOutcomes: ExperimentOutcome[];
    readonly safetyConsiderations: string[];
}
/**
 * Experiment Outcome
 */
export interface ExperimentOutcome {
    readonly outcome: string;
    readonly interpretation: string;
    readonly implicationForBelief: 'supports' | 'contradicts' | 'neutral';
}
/**
 * Main MCT Engine Interface
 */
export interface IMetacognitiveTherapyEngine {
    /**
     * Detect CAS activity in text
     */
    detectCAS(text: string, context?: MCTContext): Promise<CASDetectionResult>;
    /**
     * Administer MCQ-30 item
     */
    scoreMCQ30Item(itemId: number, response: number): MCQ30ItemScore;
    /**
     * Calculate full MCQ-30 from responses
     */
    calculateMCQ30(responses: Map<number, number>): MCQ30Result;
    /**
     * Update metacognitive state
     */
    updateState(currentState: IMetacognitiveState, newData: Partial<IMetacognitiveState>): IMetacognitiveState;
    /**
     * Create ATT session
     */
    createATTSession(userId: string | number, type: ATTSessionType, preferences?: ATTPreferences): ATTSession;
    /**
     * Get next ATT instruction
     */
    getNextATTInstruction(session: ATTSession): ATTInstruction | null;
    /**
     * Complete ATT session
     */
    completeATTSession(session: ATTSession, feedback: ATTSessionFeedback): ATTSession;
    /**
     * Create DM exercise
     */
    createDMExercise(target: DMTarget, preferences?: DMPreferences): DetachedMindfulnessExercise;
    /**
     * Setup worry postponement
     */
    setupWorryPostponement(userId: string | number, schedule: ScheduledWorryTime): WorryPostponementProtocol;
    /**
     * Record postponed worry
     */
    recordPostponedWorry(protocol: WorryPostponementProtocol, worry: Omit<PostponedWorry, 'id' | 'capturedAt' | 'processedDuringWorryTime'>): WorryPostponementProtocol;
    /**
     * Process worry during worry time
     */
    processWorryDuringWorryTime(protocol: WorryPostponementProtocol, worryId: string, outcome: WorryOutcome): WorryPostponementProtocol;
    /**
     * Generate Socratic questions for belief
     */
    generateSocraticQuestions(belief: SpecificBelief, context: MCTContext): SocraticQuestion[];
    /**
     * Create verbal reattribution plan
     */
    createReattributionPlan(belief: SpecificBelief, state: IMetacognitiveState): VerbalReattribution;
    /**
     * Suggest behavioral experiment
     */
    suggestBehavioralExperiment(belief: SpecificBelief, context: MCTContext): BehavioralExperiment[];
    /**
     * Recommend intervention based on state
     */
    recommendIntervention(state: IMetacognitiveState): MCTIntervention;
    /**
     * Get intervention priority
     */
    getInterventionPriority(state: IMetacognitiveState): MCTIntervention[];
    /**
     * Generate response to CAS
     */
    generateCASResponse(detection: CASDetectionResult, context: MCTContext): MCTResponse;
}
/**
 * MCT Context
 */
export interface MCTContext {
    readonly state: IMetacognitiveState;
    readonly recentMessages: Array<{
        text: string;
        isUser: boolean;
        timestamp: Date;
    }>;
    readonly currentTopic?: string;
    readonly sessionGoal?: string;
    readonly language: 'ru' | 'en';
    readonly ageGroup: 'child' | 'teen' | 'adult';
}
/**
 * CAS Detection Result
 */
export interface CASDetectionResult {
    readonly detected: boolean;
    readonly type: 'worry' | 'rumination' | 'threat_monitoring' | 'mixed' | 'none';
    readonly confidence: number;
    readonly intensity: number;
    readonly themes: WorryRuminationTheme[];
    readonly triggerText: string;
    readonly metacognitiveBeliefActivated?: string;
    readonly recommendedIntervention: MCTIntervention;
}
/**
 * MCQ-30 Item Score
 */
export interface MCQ30ItemScore {
    readonly itemId: number;
    readonly rawScore: number;
    readonly subscale: string;
}
/**
 * MCQ-30 Full Result
 */
export interface MCQ30Result {
    readonly subscales: {
        readonly positiveWorryBeliefs: number;
        readonly negativeUncontrollabilityDanger: number;
        readonly cognitiveConfidence: number;
        readonly needToControlThoughts: number;
        readonly cognitiveSelfConsciousness: number;
    };
    readonly totalScore: number;
    readonly clinicalFlags: string[];
    readonly primaryConcern?: string;
}
/**
 * ATT Preferences
 */
export interface ATTPreferences {
    readonly preferredDuration: 'short' | 'standard' | 'extended';
    readonly audioEnabled: boolean;
    readonly visualCuesEnabled: boolean;
    readonly reminderFrequency: 'daily' | 'every_other_day' | 'weekly';
}
/**
 * DM Preferences
 */
export interface DMPreferences {
    readonly preferredMetaphor: DMExerciseType;
    readonly visualizationAbility: 'low' | 'medium' | 'high';
    readonly preferredLength: 'brief' | 'standard' | 'extended';
}
/**
 * MCT Response
 */
export interface MCTResponse {
    readonly type: 'psychoeducation' | 'intervention_offer' | 'technique_guidance' | 'belief_challenge' | 'encouragement';
    readonly textEn: string;
    readonly textRu: string;
    readonly intervention?: MCTIntervention;
    readonly followUpQuestions?: string[];
}
/**
 * Standard ATT Instructions (Abbreviated Version)
 * Based on 2024 research showing better adherence with shorter version
 */
export declare const ATT_ABBREVIATED_INSTRUCTIONS: ATTInstruction[];
/**
 * Detached Mindfulness Metaphors
 */
export declare const DM_METAPHORS: DMMetaphor[];
/**
 * Socratic Questions for Metacognitive Belief Challenge
 */
export declare const MCT_SOCRATIC_QUESTIONS: SocraticQuestion[];
//# sourceMappingURL=IMetacognitiveTherapy.d.ts.map