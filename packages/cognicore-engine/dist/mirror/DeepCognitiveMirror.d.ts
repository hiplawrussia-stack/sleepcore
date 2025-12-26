/**
 * 🪞 DEEP COGNITIVE MIRROR - IMPLEMENTATION
 * ==========================================
 * Cognitive Pattern Analysis & Therapeutic Insight Engine
 *
 * Scientific Foundation (2024-2025 Research):
 * - ABCD Model extraction (arXiv:2404.11449, 2024)
 * - nBERT emotion recognition (MDPI, 2025)
 * - Socrates 2.0 dialogue approach (JMIR, 2024)
 * - Multi-LLM negotiation for distortion classification (KoACD, 2025)
 *
 * Implementation Features:
 * 1. Rule-based + ML-ready distortion detection
 * 2. ABCD chain extraction and linking
 * 3. Pattern recognition across sessions
 * 4. Therapeutic insight generation
 * 5. Socratic question generation
 * 6. Bilingual support (EN/RU)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */
import { type IDeepCognitiveMirror, type TextAnalysisResult, type SessionAnalysisResult, type ABCDChain, type ActivatingEvent, type AutomaticThought, type DetectedDistortion, type EmotionalConsequence, type Disputation, type SocraticQuestion, type AlternativeThought, type CognitivePattern, type PatternType, type ThinkingStyleProfile, type TherapeuticInsight, type TherapeuticExercise, type AnalysisContext, type InsightContext, type DeepCognitiveMirrorConfig } from './IDeepCognitiveMirror';
import type { CognitiveDistortionType } from '../state/interfaces/ICognitiveState';
/**
 * Deep Cognitive Mirror Engine
 * Main implementation of cognitive analysis system
 */
export declare class DeepCognitiveMirror implements IDeepCognitiveMirror {
    private readonly config;
    private readonly chainHistory;
    private readonly patternCache;
    private readonly insightHistory;
    private readonly distortionCounts;
    constructor(config?: Partial<DeepCognitiveMirrorConfig>);
    analyzeText(text: string, userId: string | number, context?: AnalysisContext): Promise<TextAnalysisResult>;
    analyzeSession(messages: Array<{
        text: string;
        timestamp: Date;
    }>, userId: string | number): Promise<SessionAnalysisResult>;
    extractABCDChain(text: string, userId: string | number): Promise<ABCDChain | null>;
    linkABCDComponents(event: ActivatingEvent, thoughts: AutomaticThought[], consequences: EmotionalConsequence[]): ABCDChain;
    detectDistortions(text: string): Promise<DetectedDistortion[]>;
    getDistortionProfile(userId: string | number, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<Map<CognitiveDistortionType, number>>;
    detectPatterns(userId: string | number, minConfidence?: number): Promise<CognitivePattern[]>;
    getThinkingStyleProfile(userId: string | number): Promise<ThinkingStyleProfile>;
    matchPattern(text: string, pattern: CognitivePattern): {
        matches: boolean;
        similarity: number;
    };
    generateInsight(context: InsightContext): Promise<TherapeuticInsight>;
    generateSocraticQuestions(thought: AutomaticThought, count?: number): Promise<SocraticQuestion[]>;
    generateAlternativeThoughts(thought: AutomaticThought, count?: number): Promise<AlternativeThought[]>;
    generateDisputation(thought: AutomaticThought): Promise<Disputation>;
    getRecommendedExercises(userId: string | number, focus?: CognitiveDistortionType | PatternType): Promise<TherapeuticExercise[]>;
    storeChain(chain: ABCDChain): Promise<void>;
    getChainHistory(userId: string | number, options?: {
        limit?: number;
        timeRange?: {
            start: Date;
            end: Date;
        };
        distortionFilter?: CognitiveDistortionType;
    }): Promise<ABCDChain[]>;
    getInsightHistory(userId: string | number, limit?: number): Promise<TherapeuticInsight[]>;
    private detectRussian;
    private extractActivatingEvents;
    private extractAutomaticThoughts;
    private extractEmotionalConsequences;
    private buildABCDChains;
    private categorizeEvent;
    private detectTimeContext;
    private classifyThoughtType;
    private detectTriadTarget;
    private detectBehavioralUrges;
    private assessDistortionSeverity;
    private assessCompleteness;
    private calculateChainConfidence;
    private calculateTextMetrics;
    private calculateOverallConfidence;
    private calculateNegativity;
    private calculateEmotionalIntensity;
    private calculateCognitiveComplexity;
    private estimateInsightReadiness;
    private calculateAverageValence;
    private calculateAverageArousal;
    private generateSessionInsights;
    private calculateEngagement;
    private getNextSessionFocus;
    private detectRiskFlags;
    private selectInsightType;
    private generateInsightContent;
    private gatherSupportingEvidence;
    private selectExercisesForInsight;
    private determineInsightTiming;
    private getPersonalizationFactors;
    private storeInsight;
    private updateDistortionCounts;
    private isNegativeThought;
    private inferDisputationType;
    private selectDisputationType;
}
/**
 * Factory function
 */
export declare function createDeepCognitiveMirror(config?: Partial<DeepCognitiveMirrorConfig>): IDeepCognitiveMirror;
//# sourceMappingURL=DeepCognitiveMirror.d.ts.map