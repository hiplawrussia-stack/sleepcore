/**
 * MOTIVATIONAL INTERVIEWING ENGINE
 * =================================
 * Core implementation of MI techniques for CogniCore
 *
 * Scientific Foundation:
 * - MITI 4.2 Coding System (Moyers et al., 2014)
 * - MISC 2.5 Client Language Coding
 * - DARN-CAT Framework for Change Talk
 * - AI-MI Integration (arXiv:2505.17380, JMIR 2025)
 *
 * Key Features:
 * - Real-time Change Talk / Sustain Talk detection
 * - DARN-CAT classification
 * - MI-consistent response generation
 * - MITI 4.2 fidelity tracking
 *
 * БФ "Другой путь" | CogniCore Phase 4.1
 */

import type {
  IMotivationalState,
  IMotivationalStateFactory,
  IMotivationalStateBuilder,
  ClientUtterance,
  ClientLanguageCategory,
  ChangeTaskSubtype,
  SustainTalkSubtype,
  ReadinessRuler,
  LanguageBalance,
  DarnCatProfile,
  AmbivalenceState,
  AmbivalenceType,
  DiscordIndicators,
  DiscordType,
  DiscordEvent,
  MIStrategy
} from '../interfaces/IMotivationalState';

import {
  CHANGE_TALK_PATTERNS,
  SUSTAIN_TALK_PATTERNS,
  DISCORD_PATTERNS,
  STRATEGY_RECOMMENDATIONS
} from '../interfaces/IMotivationalState';

import type {
  IMotivationalInterviewingEngine,
  MIResponse,
  MIResponseContext,
  MITIBehaviorCode,
  ReflectionType,
  SummaryType,
  MIFidelityReport,
  MITIGlobalScores,
  MITIBehaviorCounts,
  MITISummaryScores
} from '../interfaces/IMotivationalInterviewing';

import {
  OPEN_QUESTION_TEMPLATES,
  AFFIRMATION_TEMPLATES,
  REFLECTION_TEMPLATES,
  SUMMARY_TEMPLATES,
  DISCORD_RESPONSE_STRATEGIES,
  MITI_THRESHOLDS
} from '../interfaces/IMotivationalInterviewing';

import type { ChangeStage } from '../../state/interfaces/INarrativeState';

// ============================================================
// MOTIVATIONAL STATE BUILDER IMPLEMENTATION
// ============================================================

/**
 * Mutable version of IMotivationalState for builder pattern
 */
type MutableMotivationalState = {
  -readonly [K in keyof IMotivationalState]?: IMotivationalState[K];
};

class MotivationalStateBuilder implements IMotivationalStateBuilder {
  private state: MutableMotivationalState = {};

  constructor() {
    this.reset();
  }

  private reset(): void {
    this.state = {
      id: this.generateId(),
      timestamp: new Date(),
      confidence: 0.5,
      dataQuality: 0.5,
      recentUtterances: [],
      ratioTrend: [],
      sessionFocus: [],
      avoid: []
    };
  }

  private generateId(): string {
    return `ms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  setUserId(userId: string | number): this {
    this.state.userId = userId;
    return this;
  }

  setReadinessRuler(importance: number, confidence: number): this {
    const readiness = Math.sqrt(importance * confidence);
    this.state.readinessRuler = {
      importance: Math.max(0, Math.min(10, importance)),
      confidence: Math.max(0, Math.min(10, confidence)),
      readiness,
      assessedAt: new Date(),
      source: 'inferred',
      assessmentConfidence: 0.7
    };
    return this;
  }

  setLinkedStage(stage: ChangeStage): this {
    this.state.linkedStage = stage;
    const recommendations = STRATEGY_RECOMMENDATIONS[stage];
    this.state.recommendedStrategy = recommendations.primaryStrategy;
    this.state.sessionFocus = recommendations.focus;
    this.state.avoid = recommendations.avoid;
    return this;
  }

  addUtterance(utterance: ClientUtterance): this {
    if (!this.state.recentUtterances) {
      this.state.recentUtterances = [];
    }
    this.state.recentUtterances.push(utterance);
    // Keep last 50 utterances
    if (this.state.recentUtterances.length > 50) {
      this.state.recentUtterances = this.state.recentUtterances.slice(-50);
    }
    return this;
  }

  setLanguageBalance(balance: LanguageBalance): this {
    this.state.languageBalance = balance;
    this.state.sessionRatio = balance.changeTalkRatio;
    return this;
  }

  setDarnCatProfile(profile: DarnCatProfile): this {
    this.state.darnCatProfile = profile;
    return this;
  }

  setAmbivalence(ambivalence: AmbivalenceState): this {
    this.state.ambivalence = ambivalence;
    return this;
  }

  setDiscord(discord: DiscordIndicators): this {
    this.state.discord = discord;
    return this;
  }

  setStrategy(strategy: MIStrategy): this {
    this.state.recommendedStrategy = strategy;
    return this;
  }

  build(): IMotivationalState {
    // Fill in defaults for required fields
    const result: IMotivationalState = {
      id: this.state.id!,
      userId: this.state.userId ?? 'unknown',
      readinessRuler: this.state.readinessRuler ?? this.createDefaultReadiness(),
      linkedStage: this.state.linkedStage ?? 'precontemplation',
      daysInState: this.state.daysInState ?? 0,
      recentUtterances: this.state.recentUtterances ?? [],
      languageBalance: this.state.languageBalance ?? this.createDefaultLanguageBalance(),
      darnCatProfile: this.state.darnCatProfile ?? this.createDefaultDarnCatProfile(),
      sessionRatio: this.state.sessionRatio ?? 0.5,
      ratioTrend: this.state.ratioTrend ?? [],
      ambivalence: this.state.ambivalence ?? this.createDefaultAmbivalence(),
      ambivalenceExplored: this.state.ambivalenceExplored ?? false,
      discord: this.state.discord ?? this.createDefaultDiscord(),
      rapportLevel: this.state.rapportLevel ?? 0.7,
      recommendedStrategy: this.state.recommendedStrategy ?? 'build_rapport',
      sessionFocus: this.state.sessionFocus ?? [],
      avoid: this.state.avoid ?? [],
      timestamp: this.state.timestamp ?? new Date(),
      confidence: this.state.confidence ?? 0.5,
      dataQuality: this.state.dataQuality ?? 0.5
    };

    this.reset();
    return result;
  }

  private createDefaultReadiness(): ReadinessRuler {
    return {
      importance: 5,
      confidence: 5,
      readiness: 5,
      assessedAt: new Date(),
      source: 'inferred',
      assessmentConfidence: 0.3
    };
  }

  private createDefaultLanguageBalance(): LanguageBalance {
    return {
      changeTalkCount: 0,
      sustainTalkCount: 0,
      changeTalkRatio: 0.5,
      averageCtStrength: 0,
      averageStStrength: 0,
      netBalance: 0,
      trend: 'stable',
      windowStart: new Date(),
      windowEnd: new Date()
    };
  }

  private createDefaultDarnCatProfile(): DarnCatProfile {
    return {
      desire: 0,
      ability: 0,
      reasons: 0,
      need: 0,
      commitment: 0,
      activation: 0,
      takingSteps: 0,
      mobilizingRatio: 0,
      dominantPreparatory: 'none',
      mobilizingPresent: false
    };
  }

  private createDefaultAmbivalence(): AmbivalenceState {
    return {
      level: 0.5,
      type: 'approach_avoidance',
      prosForChange: [],
      consForChange: [],
      prosForStatusQuo: [],
      consForStatusQuo: [],
      isNormative: true,
      primaryConflict: 'unknown'
    };
  }

  private createDefaultDiscord(): DiscordIndicators {
    return {
      level: 0,
      types: [],
      events: [],
      trend: 'stable',
      recommendedResponse: 'reflect'
    };
  }
}

// ============================================================
// MOTIVATIONAL STATE FACTORY IMPLEMENTATION
// ============================================================

export class MotivationalStateFactory implements IMotivationalStateFactory {
  private readonly engine: MotivationalEngine;

  constructor(engine?: MotivationalEngine) {
    this.engine = engine ?? new MotivationalEngine();
  }

  async fromConversation(
    messages: Array<{ text: string; timestamp: Date; isUser: boolean }>,
    userId: string | number,
    previousState?: IMotivationalState
  ): Promise<IMotivationalState> {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(userId);

    // Analyze each user message
    const userMessages = messages.filter(m => m.isUser);
    const utterances: ClientUtterance[] = [];

    for (const message of userMessages) {
      const utterance = await this.engine.analyzeUtterance(message.text);
      utterances.push({
        ...utterance,
        timestamp: message.timestamp
      });
      builder.addUtterance(utterance);
    }

    // Calculate language balance
    const balance = this.calculateLanguageBalance(utterances);
    builder.setLanguageBalance(balance);

    // Build DARN-CAT profile
    const profile = this.buildDarnCatProfile(utterances);
    builder.setDarnCatProfile(profile);

    // Infer readiness from language
    const readiness = this.inferReadiness(balance, profile);
    builder.setReadinessRuler(readiness.importance, readiness.confidence);

    // Determine stage
    const stage = this.inferStage(balance, profile, previousState?.linkedStage);
    builder.setLinkedStage(stage);

    // Assess ambivalence
    const ambivalence = this.assessAmbivalence(utterances);
    builder.setAmbivalence(ambivalence);

    // Check for discord
    const discord = this.detectDiscord(utterances);
    builder.setDiscord(discord);

    return builder.build();
  }

  fromAssessment(
    userId: string | number,
    importance: number,
    confidence: number
  ): IMotivationalState {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(userId);
    builder.setReadinessRuler(importance, confidence);

    // Infer stage from readiness
    const readiness = Math.sqrt(importance * confidence);
    let stage: ChangeStage;
    if (readiness < 3) {
      stage = 'precontemplation';
    } else if (readiness < 5) {
      stage = 'contemplation';
    } else if (readiness < 7) {
      stage = 'preparation';
    } else {
      stage = 'action';
    }
    builder.setLinkedStage(stage);

    return builder.build();
  }

  createInitial(userId: string | number): IMotivationalState {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(userId);
    builder.setLinkedStage('precontemplation');
    builder.setReadinessRuler(5, 5); // Unknown - middle values
    return builder.build();
  }

  updateWithUtterance(
    currentState: IMotivationalState,
    newUtterance: ClientUtterance
  ): IMotivationalState {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(currentState.userId);

    // Copy existing utterances and add new one
    const allUtterances = [...currentState.recentUtterances, newUtterance];
    for (const u of allUtterances) {
      builder.addUtterance(u);
    }

    // Recalculate balance
    const balance = this.calculateLanguageBalance(allUtterances);
    builder.setLanguageBalance(balance);

    // Recalculate profile
    const profile = this.buildDarnCatProfile(allUtterances);
    builder.setDarnCatProfile(profile);

    // Keep existing readiness unless significantly changed
    builder.setReadinessRuler(
      currentState.readinessRuler.importance,
      currentState.readinessRuler.confidence
    );

    // Re-evaluate stage
    const stage = this.inferStage(balance, profile, currentState.linkedStage);
    builder.setLinkedStage(stage);

    // Update ambivalence
    const ambivalence = this.assessAmbivalence(allUtterances);
    builder.setAmbivalence(ambivalence);

    // Check discord
    const discord = this.detectDiscord(allUtterances.slice(-5)); // Last 5 only
    builder.setDiscord(discord);

    return builder.build();
  }

  updateReadiness(
    currentState: IMotivationalState,
    importance: number,
    confidence: number
  ): IMotivationalState {
    const builder = new MotivationalStateBuilder();
    builder.setUserId(currentState.userId);

    // Copy utterances
    for (const u of currentState.recentUtterances) {
      builder.addUtterance(u);
    }

    builder.setLanguageBalance(currentState.languageBalance);
    builder.setDarnCatProfile(currentState.darnCatProfile);
    builder.setReadinessRuler(importance, confidence);
    builder.setAmbivalence(currentState.ambivalence);
    builder.setDiscord(currentState.discord);

    // Re-evaluate stage based on new readiness
    const readiness = Math.sqrt(importance * confidence);
    let stage: ChangeStage = currentState.linkedStage;
    if (readiness >= 7 && currentState.linkedStage !== 'action' && currentState.linkedStage !== 'maintenance') {
      stage = 'action';
    } else if (readiness >= 5 && currentState.linkedStage === 'contemplation') {
      stage = 'preparation';
    }
    builder.setLinkedStage(stage);

    return builder.build();
  }

  private calculateLanguageBalance(utterances: ClientUtterance[]): LanguageBalance {
    const ctUtterances = utterances.filter(u => u.category === 'change_talk');
    const stUtterances = utterances.filter(u => u.category === 'sustain_talk');

    const changeTalkCount = ctUtterances.length;
    const sustainTalkCount = stUtterances.length;
    const total = changeTalkCount + sustainTalkCount;

    const changeTalkRatio = total > 0 ? changeTalkCount / total : 0.5;

    const averageCtStrength = ctUtterances.length > 0
      ? ctUtterances.reduce((sum, u) => sum + u.strength, 0) / ctUtterances.length
      : 0;

    const averageStStrength = stUtterances.length > 0
      ? stUtterances.reduce((sum, u) => sum + u.strength, 0) / stUtterances.length
      : 0;

    const netBalance = averageCtStrength * changeTalkCount + averageStStrength * sustainTalkCount;

    // Calculate trend from last 10 utterances vs previous 10
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (utterances.length >= 10) {
      const recent = utterances.slice(-5);
      const earlier = utterances.slice(-10, -5);
      const recentRatio = recent.filter(u => u.category === 'change_talk').length / recent.length;
      const earlierRatio = earlier.filter(u => u.category === 'change_talk').length / earlier.length;
      if (recentRatio > earlierRatio + 0.1) trend = 'increasing';
      else if (recentRatio < earlierRatio - 0.1) trend = 'decreasing';
    }

    return {
      changeTalkCount,
      sustainTalkCount,
      changeTalkRatio,
      averageCtStrength,
      averageStStrength,
      netBalance,
      trend,
      windowStart: utterances[0]?.timestamp ?? new Date(),
      windowEnd: utterances[utterances.length - 1]?.timestamp ?? new Date()
    };
  }

  private buildDarnCatProfile(utterances: ClientUtterance[]): DarnCatProfile {
    const ctUtterances = utterances.filter(u => u.category === 'change_talk');

    const counts = {
      desire: 0,
      ability: 0,
      reasons: 0,
      need: 0,
      commitment: 0,
      activation: 0,
      takingSteps: 0
    };

    // Map snake_case subtype to camelCase counts
    const subtypeToCount: Record<string, keyof typeof counts> = {
      'desire': 'desire',
      'ability': 'ability',
      'reasons': 'reasons',
      'need': 'need',
      'commitment': 'commitment',
      'activation': 'activation',
      'taking_steps': 'takingSteps'
    };

    for (const u of ctUtterances) {
      if (u.changeSubtype) {
        const countKey = subtypeToCount[u.changeSubtype];
        if (countKey !== undefined) {
          counts[countKey]++;
        }
      }
    }

    const preparatory = counts.desire + counts.ability + counts.reasons + counts.need;
    const mobilizing = counts.commitment + counts.activation + counts.takingSteps;
    const mobilizingRatio = preparatory > 0 ? mobilizing / preparatory : 0;

    // Find dominant preparatory type
    let dominantPreparatory: 'desire' | 'ability' | 'reasons' | 'need' | 'none' = 'none';
    let maxPrep = 0;
    for (const type of ['desire', 'ability', 'reasons', 'need'] as const) {
      if (counts[type] > maxPrep) {
        maxPrep = counts[type];
        dominantPreparatory = type;
      }
    }

    return {
      ...counts,
      mobilizingRatio,
      dominantPreparatory,
      mobilizingPresent: mobilizing > 0
    };
  }

  private inferReadiness(balance: LanguageBalance, profile: DarnCatProfile): { importance: number; confidence: number } {
    // Importance: based on reasons and need
    const importance = Math.min(10, 5 + (profile.reasons + profile.need) * 0.5 + balance.changeTalkRatio * 3);

    // Confidence: based on ability and taking steps
    const confidence = Math.min(10, 5 + (profile.ability + profile.takingSteps) * 0.5 + (profile.mobilizingPresent ? 2 : 0));

    return { importance, confidence };
  }

  private inferStage(
    balance: LanguageBalance,
    profile: DarnCatProfile,
    currentStage?: ChangeStage
  ): ChangeStage {
    // Decision logic based on MI research

    // If mobilizing language present, likely in preparation/action
    if (profile.mobilizingPresent && profile.mobilizingRatio > 0.3) {
      if (profile.takingSteps >= 2) return 'action';
      if (profile.commitment >= 2 || profile.activation >= 2) return 'preparation';
    }

    // If CT ratio very low, likely precontemplation
    if (balance.changeTalkRatio < 0.3) {
      return 'precontemplation';
    }

    // If mixed CT/ST, likely contemplation
    if (balance.changeTalkRatio >= 0.3 && balance.changeTalkRatio <= 0.7) {
      return 'contemplation';
    }

    // If high CT ratio with preparatory language
    if (balance.changeTalkRatio > 0.7) {
      if (profile.dominantPreparatory !== 'none') return 'preparation';
    }

    // Default: keep current stage or start at contemplation
    return currentStage ?? 'contemplation';
  }

  private assessAmbivalence(utterances: ClientUtterance[]): AmbivalenceState {
    const prosForChange: string[] = [];
    const consForChange: string[] = [];
    const prosForStatusQuo: string[] = [];
    const consForStatusQuo: string[] = [];

    for (const u of utterances) {
      if (u.category === 'change_talk') {
        if (u.changeSubtype === 'reasons') {
          prosForChange.push(u.text);
        }
      } else if (u.category === 'sustain_talk') {
        if (u.sustainSubtype === 'reasons_against') {
          prosForStatusQuo.push(u.text);
        }
      }
    }

    const ctCount = utterances.filter(u => u.category === 'change_talk').length;
    const stCount = utterances.filter(u => u.category === 'sustain_talk').length;
    const total = ctCount + stCount;

    // Ambivalence is highest when CT and ST are balanced
    let level = 0;
    if (total > 0) {
      const ratio = ctCount / total;
      // Peak ambivalence at 0.5 ratio
      level = 1 - Math.abs(ratio - 0.5) * 2;
    }

    // Determine type
    let type: AmbivalenceType = 'approach_avoidance';
    if (prosForChange.length > 0 && prosForStatusQuo.length > 0) {
      type = 'double_approach_avoidance';
    }

    return {
      level,
      type,
      prosForChange: prosForChange.slice(0, 5),
      consForChange: consForChange.slice(0, 5),
      prosForStatusQuo: prosForStatusQuo.slice(0, 5),
      consForStatusQuo: consForStatusQuo.slice(0, 5),
      isNormative: level < 0.8,
      primaryConflict: prosForChange.length > 0 && prosForStatusQuo.length > 0
        ? 'Competing benefits'
        : 'Unknown'
    };
  }

  private detectDiscord(utterances: ClientUtterance[]): DiscordIndicators {
    const events: DiscordEvent[] = [];
    const typesFound = new Set<DiscordType>();

    for (const u of utterances) {
      for (const [type, patterns] of Object.entries(DISCORD_PATTERNS)) {
        const discordType = type as DiscordType;
        const allKeywords = [...patterns.keywords, ...patterns.keywordsRu];

        for (const keyword of allKeywords) {
          if (u.text.toLowerCase().includes(keyword.toLowerCase())) {
            typesFound.add(discordType);
            events.push({
              type: discordType,
              utterance: u.text,
              timestamp: u.timestamp,
              intensity: 0.5,
              possibleTrigger: undefined
            });
            break;
          }
        }
      }
    }

    const level = Math.min(1, events.length * 0.2);
    const types = Array.from(typesFound);

    let recommendedResponse: 'reflect' | 'apologize' | 'shift_focus' | 'emphasize_autonomy' = 'reflect';
    if (types.includes('squaring_off')) {
      recommendedResponse = 'emphasize_autonomy';
    } else if (types.includes('interrupting')) {
      recommendedResponse = 'apologize';
    } else if (types.includes('ignoring')) {
      recommendedResponse = 'shift_focus';
    }

    return {
      level,
      types,
      events: events.slice(-5),
      trend: 'stable',
      recommendedResponse
    };
  }
}

// ============================================================
// MOTIVATIONAL ENGINE IMPLEMENTATION
// ============================================================

export class MotivationalEngine implements IMotivationalInterviewingEngine {
  private responseIdCounter = 0;

  /**
   * Analyze client utterance for CT/ST classification
   */
  async analyzeUtterance(text: string): Promise<ClientUtterance> {
    const lowerText = text.toLowerCase();

    // Check for Change Talk patterns
    let bestCtMatch: { subtype: ChangeTaskSubtype; strength: number; confidence: number; spans: Array<{ start: number; end: number; text: string; pattern: string }> } | null = null;

    for (const [subtype, patterns] of Object.entries(CHANGE_TALK_PATTERNS)) {
      const ctSubtype = subtype as ChangeTaskSubtype;
      const allKeywords = [...patterns.keywords, ...patterns.keywordsRu];

      for (const keyword of allKeywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const confidence = this.calculateMatchConfidence(text, keyword);
          if (!bestCtMatch || confidence > bestCtMatch.confidence) {
            bestCtMatch = {
              subtype: ctSubtype,
              strength: patterns.strength,
              confidence,
              spans: [{
                start: index,
                end: index + keyword.length,
                text: text.substring(index, index + keyword.length),
                pattern: keyword
              }]
            };
          }
        }
      }
    }

    // Check for Sustain Talk patterns
    let bestStMatch: { subtype: SustainTalkSubtype; strength: number; confidence: number; spans: Array<{ start: number; end: number; text: string; pattern: string }> } | null = null;

    for (const [subtype, patterns] of Object.entries(SUSTAIN_TALK_PATTERNS)) {
      const stSubtype = subtype as SustainTalkSubtype;
      const allKeywords = [...patterns.keywords, ...patterns.keywordsRu];

      for (const keyword of allKeywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const confidence = this.calculateMatchConfidence(text, keyword);
          if (!bestStMatch || confidence > bestStMatch.confidence) {
            bestStMatch = {
              subtype: stSubtype,
              strength: patterns.strength,
              confidence,
              spans: [{
                start: index,
                end: index + keyword.length,
                text: text.substring(index, index + keyword.length),
                pattern: keyword
              }]
            };
          }
        }
      }
    }

    // Determine category
    let category: ClientLanguageCategory = 'follow_neutral';
    let changeSubtype: ChangeTaskSubtype | undefined;
    let sustainSubtype: SustainTalkSubtype | undefined;
    let strength = 0;
    let confidence = 0.5;
    let evidenceSpans: Array<{ start: number; end: number; text: string; pattern: string }> = [];

    if (bestCtMatch && (!bestStMatch || bestCtMatch.confidence > bestStMatch.confidence)) {
      category = 'change_talk';
      changeSubtype = bestCtMatch.subtype;
      strength = bestCtMatch.strength;
      confidence = bestCtMatch.confidence;
      evidenceSpans = bestCtMatch.spans;
    } else if (bestStMatch) {
      category = 'sustain_talk';
      sustainSubtype = bestStMatch.subtype;
      strength = bestStMatch.strength;
      confidence = bestStMatch.confidence;
      evidenceSpans = bestStMatch.spans;
    }

    return {
      id: `utt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      timestamp: new Date(),
      category,
      changeSubtype,
      sustainSubtype,
      strength,
      confidence,
      evidenceSpans
    };
  }

  /**
   * Generate MI-consistent response
   */
  async generateResponse(context: MIResponseContext): Promise<MIResponse> {
    const { motivationalState, lastUtterance, currentStrategy } = context;

    // Check for discord first
    if (motivationalState.discord.level > 0.5) {
      const discordType = motivationalState.discord.types[0];
      if (discordType) {
        return this.respondToDiscord(discordType, context);
      }
    }

    // Strategy-based response selection
    switch (currentStrategy) {
      case 'build_rapport':
        return this.generateAffirmation(context);

      case 'explore_ambivalence':
        return this.generateReflection(lastUtterance, 'double_sided', context);

      case 'evoke_change_talk':
        return this.generateOpenQuestion(this.selectTargetCt(motivationalState), context);

      case 'strengthen_commitment':
        if (lastUtterance.category === 'change_talk') {
          return this.generateReflection(lastUtterance, 'meaning', context);
        }
        return this.generateOpenQuestion('commitment', context);

      case 'support_self_efficacy':
        return this.generateOpenQuestion('ability', context);

      case 'roll_with_resistance':
        return this.generateReflection(lastUtterance, 'amplified', context);

      case 'summarize_and_transition':
        return this.generateSummary('transitional', context);

      case 'action_planning':
        return this.generateOpenQuestion('taking_steps', context);

      case 'relapse_prevention':
        return this.generateOpenQuestion('ability', context);

      case 'develop_discrepancy':
        return this.generateOpenQuestion('reasons', context);

      default:
        // Default: reflect with meaning
        return this.generateReflection(lastUtterance, 'meaning', context);
    }
  }

  /**
   * Generate open-ended question to evoke specific CT
   */
  async generateOpenQuestion(
    targetChangeTalk: ChangeTaskSubtype,
    context: MIResponseContext
  ): Promise<MIResponse> {
    const templates = OPEN_QUESTION_TEMPLATES.filter(
      t => t.targetChangeTalk.includes(targetChangeTalk)
    );

    if (templates.length === 0) {
      // Fallback to generic question
      const text = context.language === 'ru'
        ? 'Что для вас было бы важно изменить?'
        : 'What would be important for you to change?';

      return this.createResponse({
        text,
        textRu: 'Что для вас было бы важно изменить?',
        primaryBehavior: 'question_open',
        targetChangeTalk,
        strategicIntent: context.currentStrategy,
        expectedImpact: 'increase_ct'
      });
    }

    // Select template based on context
    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = context.language === 'ru' ? template.templateRu : template.template;

    return this.createResponse({
      text,
      textRu: template.templateRu,
      primaryBehavior: 'question_open',
      oarsTechnique: 'open_question',
      targetChangeTalk,
      strategicIntent: context.currentStrategy,
      expectedImpact: 'increase_ct'
    });
  }

  /**
   * Generate affirmation
   */
  async generateAffirmation(context: MIResponseContext): Promise<MIResponse> {
    const templates = AFFIRMATION_TEMPLATES.filter(t => {
      if (t.appropriateFor.minChangeTalkRatio !== undefined) {
        if (context.motivationalState.sessionRatio < t.appropriateFor.minChangeTalkRatio) {
          return false;
        }
      }
      return t.appropriateFor.stages.includes(context.currentStrategy);
    });

    if (templates.length === 0) {
      // Fallback affirmation
      const text = context.language === 'ru'
        ? 'Ценю, что вы делитесь этим со мной.'
        : 'I appreciate you sharing this with me.';

      return this.createResponse({
        text,
        textRu: 'Ценю, что вы делитесь этим со мной.',
        primaryBehavior: 'affirm',
        oarsTechnique: 'affirmation',
        strategicIntent: context.currentStrategy,
        expectedImpact: 'neutral'
      });
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = context.language === 'ru' ? template.templateRu : template.template;

    return this.createResponse({
      text,
      textRu: template.templateRu,
      primaryBehavior: 'affirm',
      oarsTechnique: 'affirmation',
      strategicIntent: context.currentStrategy,
      expectedImpact: 'neutral'
    });
  }

  /**
   * Generate reflection of client statement
   */
  async generateReflection(
    utterance: ClientUtterance,
    type: ReflectionType,
    context: MIResponseContext
  ): Promise<MIResponse> {
    const templates = REFLECTION_TEMPLATES.filter(t => t.type === type);

    if (templates.length === 0) {
      // Simple rephrase fallback
      const text = context.language === 'ru'
        ? `Вы говорите, что ${utterance.text.toLowerCase()}.`
        : `You're saying that ${utterance.text.toLowerCase()}.`;

      return this.createResponse({
        text,
        textRu: `Вы говорите, что ${utterance.text.toLowerCase()}.`,
        primaryBehavior: 'reflection_simple',
        oarsTechnique: 'reflection',
        reflectionType: 'rephrase',
        strategicIntent: context.currentStrategy,
        expectedImpact: utterance.category === 'change_talk' ? 'increase_ct' : 'explore'
      });
    }

    const template = templates[0];
    const isComplex = template.complexity === 'complex';
    const text = context.language === 'ru' ? template.patternRu : template.pattern;

    return this.createResponse({
      text,
      textRu: template.patternRu,
      primaryBehavior: isComplex ? 'reflection_complex' : 'reflection_simple',
      oarsTechnique: 'reflection',
      reflectionType: type,
      strategicIntent: context.currentStrategy,
      expectedImpact: utterance.category === 'change_talk' ? 'increase_ct' : 'explore'
    });
  }

  /**
   * Generate summary
   */
  async generateSummary(
    type: SummaryType,
    context: MIResponseContext
  ): Promise<MIResponse> {
    const templates = SUMMARY_TEMPLATES.filter(t => t.type === type);

    if (templates.length === 0) {
      const text = context.language === 'ru'
        ? 'Давайте подведём итог того, о чём мы говорили.'
        : 'Let me summarize what we\'ve discussed.';

      return this.createResponse({
        text,
        textRu: 'Давайте подведём итог того, о чём мы говорили.',
        primaryBehavior: 'reflection_complex',
        oarsTechnique: 'summary',
        summaryType: type,
        strategicIntent: context.currentStrategy,
        expectedImpact: 'increase_ct'
      });
    }

    const template = templates[0];
    const text = context.language === 'ru' ? template.structureRu : template.structure;

    return this.createResponse({
      text,
      textRu: template.structureRu,
      primaryBehavior: 'reflection_complex',
      oarsTechnique: 'summary',
      summaryType: type,
      strategicIntent: context.currentStrategy,
      expectedImpact: 'increase_ct'
    });
  }

  /**
   * Respond to discord/resistance
   */
  async respondToDiscord(
    discordType: DiscordType,
    context: MIResponseContext
  ): Promise<MIResponse> {
    const strategy = DISCORD_RESPONSE_STRATEGIES[discordType];
    const templates = context.language === 'ru' ? strategy.templatesRu : strategy.templates;
    const text = templates[Math.floor(Math.random() * templates.length)];

    return this.createResponse({
      text,
      textRu: strategy.templatesRu[0],
      primaryBehavior: strategy.primaryResponse,
      strategicIntent: 'roll_with_resistance',
      expectedImpact: 'decrease_st'
    });
  }

  /**
   * Calculate MI fidelity for session
   */
  calculateFidelity(
    sessionResponses: MIResponse[],
    clientUtterances: ClientUtterance[]
  ): MIFidelityReport {
    // Count behaviors (mutable for counting)
    const mutableCounts = {
      openQuestions: 0,
      closedQuestions: 0,
      simpleReflections: 0,
      complexReflections: 0,
      affirm: 0,
      seekCollaboration: 0,
      emphasizeAutonomy: 0,
      persuade: 0,
      confront: 0,
      direct: 0,
      giveInformation: 0
    };

    for (const r of sessionResponses) {
      switch (r.primaryBehavior) {
        case 'question_open':
          mutableCounts.openQuestions++;
          break;
        case 'question_closed':
          mutableCounts.closedQuestions++;
          break;
        case 'reflection_simple':
          mutableCounts.simpleReflections++;
          break;
        case 'reflection_complex':
          mutableCounts.complexReflections++;
          break;
        case 'affirm':
          mutableCounts.affirm++;
          break;
        case 'seek_collaboration':
          mutableCounts.seekCollaboration++;
          break;
        case 'emphasize_autonomy':
          mutableCounts.emphasizeAutonomy++;
          break;
        case 'persuade':
          mutableCounts.persuade++;
          break;
        case 'confront':
          mutableCounts.confront++;
          break;
        case 'direct':
          mutableCounts.direct++;
          break;
        case 'give_information':
          mutableCounts.giveInformation++;
          break;
      }
    }

    // Convert to readonly for the report
    const counts: MITIBehaviorCounts = { ...mutableCounts };

    // Calculate summary scores
    const totalQuestions = counts.openQuestions + counts.closedQuestions;
    const totalReflections = counts.simpleReflections + counts.complexReflections;
    const adherent = counts.affirm + counts.seekCollaboration + counts.emphasizeAutonomy;
    const nonAdherent = counts.persuade + counts.confront + counts.direct;

    const summaryScores: MITISummaryScores = {
      reflectionToQuestionRatio: totalQuestions > 0 ? totalReflections / totalQuestions : 0,
      percentComplexReflections: totalReflections > 0 ? (counts.complexReflections / totalReflections) * 100 : 0,
      percentOpenQuestions: totalQuestions > 0 ? (counts.openQuestions / totalQuestions) * 100 : 0,
      adherentNonAdherentRatio: nonAdherent > 0 ? adherent / nonAdherent : adherent,
      fidelityLevel: this.determineFidelityLevel(counts)
    };

    // Estimate global scores (simplified)
    const globalScores: MITIGlobalScores = {
      cultivatingChangeTalk: Math.min(5, 2.5 + summaryScores.reflectionToQuestionRatio * 0.5 + summaryScores.percentComplexReflections * 0.02),
      softeningSustainTalk: Math.min(5, 3 + (adherent - nonAdherent) * 0.2),
      partnership: Math.min(5, 3 + counts.seekCollaboration * 0.3 + counts.emphasizeAutonomy * 0.3),
      empathy: Math.min(5, 3 + counts.complexReflections * 0.2)
    };

    // Generate recommendations
    const recommendations: string[] = [];
    const highlights: string[] = [];
    const growthAreas: string[] = [];

    if (summaryScores.reflectionToQuestionRatio < 1) {
      recommendations.push('Increase ratio of reflections to questions');
      growthAreas.push('Reflective listening');
    } else {
      highlights.push('Good reflection to question ratio');
    }

    if (summaryScores.percentComplexReflections < 40) {
      recommendations.push('Use more complex reflections');
      growthAreas.push('Deep reflection skills');
    } else {
      highlights.push('Good use of complex reflections');
    }

    if (summaryScores.percentOpenQuestions < 50) {
      recommendations.push('Ask more open-ended questions');
      growthAreas.push('Open questioning');
    } else {
      highlights.push('Good use of open questions');
    }

    if (nonAdherent > 0) {
      recommendations.push('Reduce MI-non-adherent behaviors');
      growthAreas.push('MI spirit adherence');
    }

    return {
      sessionId: `session_${Date.now()}`,
      timestamp: new Date(),
      duration: sessionResponses.length * 2, // Estimate 2 min per exchange
      globalScores,
      behaviorCounts: counts,
      summaryScores,
      recommendations,
      highlights,
      growthAreas
    };
  }

  /**
   * Get strategy recommendation based on state
   */
  recommendStrategy(state: IMotivationalState): MIStrategy {
    // Check discord first
    if (state.discord.level > 0.5) {
      return 'roll_with_resistance';
    }

    // Check if ready for action
    const readinessAssessment = this.assessReadinessForAction(state);
    if (readinessAssessment.ready) {
      return 'action_planning';
    }

    // Use stage-based recommendation
    return STRATEGY_RECOMMENDATIONS[state.linkedStage].primaryStrategy;
  }

  /**
   * Determine if ready for action planning
   */
  assessReadinessForAction(state: IMotivationalState): {
    ready: boolean;
    reasons: string[];
    nextSteps: string[];
  } {
    const reasons: string[] = [];
    const nextSteps: string[] = [];

    // Criteria for action readiness
    const ctRatioHigh = state.languageBalance.changeTalkRatio >= 0.7;
    const mobilizingPresent = state.darnCatProfile.mobilizingPresent;
    const lowDiscord = state.discord.level < 0.3;
    const readinessHigh = state.readinessRuler.readiness >= 7;
    const ambivalenceResolved = state.ambivalence.level < 0.4;

    if (ctRatioHigh) reasons.push('High change talk ratio');
    if (mobilizingPresent) reasons.push('Mobilizing language present');
    if (lowDiscord) reasons.push('Good therapeutic rapport');
    if (readinessHigh) reasons.push('High readiness scores');
    if (ambivalenceResolved) reasons.push('Ambivalence largely resolved');

    const ready = reasons.length >= 3;

    if (!ready) {
      if (!ctRatioHigh) nextSteps.push('Continue evoking change talk');
      if (!mobilizingPresent) nextSteps.push('Elicit commitment language');
      if (!lowDiscord) nextSteps.push('Address therapeutic relationship');
      if (!readinessHigh) nextSteps.push('Build importance and confidence');
      if (!ambivalenceResolved) nextSteps.push('Explore remaining ambivalence');
    }

    return { ready, reasons, nextSteps };
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  private calculateMatchConfidence(text: string, keyword: string): number {
    // Longer matches in context have higher confidence
    const lengthFactor = Math.min(1, keyword.length / 20);

    // Word boundary matching is more confident
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    const boundaryMatch = regex.test(text) ? 0.2 : 0;

    return 0.5 + lengthFactor * 0.3 + boundaryMatch;
  }

  private selectTargetCt(state: IMotivationalState): ChangeTaskSubtype {
    // Select CT type to evoke based on current profile
    const profile = state.darnCatProfile;

    // If no mobilizing, work on preparatory first
    if (!profile.mobilizingPresent) {
      // Find weakest preparatory area
      const prep: Array<{ type: ChangeTaskSubtype; count: number }> = [
        { type: 'desire', count: profile.desire },
        { type: 'ability', count: profile.ability },
        { type: 'reasons', count: profile.reasons },
        { type: 'need', count: profile.need }
      ];
      prep.sort((a, b) => a.count - b.count);
      return prep[0].type;
    }

    // If mobilizing present but weak, strengthen it
    if (profile.mobilizingRatio < 0.5) {
      if (profile.commitment < profile.activation) return 'commitment';
      if (profile.activation < profile.takingSteps) return 'activation';
      return 'taking_steps';
    }

    // Default: strengthen commitment
    return 'commitment';
  }

  private createResponse(params: {
    text: string;
    textRu?: string;
    primaryBehavior: MITIBehaviorCode;
    secondaryBehaviors?: MITIBehaviorCode[];
    oarsTechnique?: 'open_question' | 'affirmation' | 'reflection' | 'summary';
    reflectionType?: ReflectionType;
    summaryType?: SummaryType;
    targetChangeTalk?: ChangeTaskSubtype;
    strategicIntent: MIStrategy;
    expectedImpact: 'increase_ct' | 'decrease_st' | 'explore' | 'neutral';
  }): MIResponse {
    return {
      id: `resp_${++this.responseIdCounter}`,
      text: params.text,
      textRu: params.textRu,
      primaryBehavior: params.primaryBehavior,
      secondaryBehaviors: params.secondaryBehaviors,
      oarsTechnique: params.oarsTechnique,
      reflectionType: params.reflectionType,
      summaryType: params.summaryType,
      targetChangeTalk: params.targetChangeTalk,
      strategicIntent: params.strategicIntent,
      expectedImpact: params.expectedImpact,
      spiritAlignment: this.calculateSpiritAlignment(params.primaryBehavior),
      timestamp: new Date()
    };
  }

  private calculateSpiritAlignment(behavior: MITIBehaviorCode): number {
    // MI-adherent behaviors have high alignment
    const adherentBehaviors: MITIBehaviorCode[] = [
      'affirm', 'seek_collaboration', 'emphasize_autonomy', 'support',
      'reflection_complex', 'question_open'
    ];

    const neutralBehaviors: MITIBehaviorCode[] = [
      'reflection_simple', 'give_information', 'structure'
    ];

    const nonAdherentBehaviors: MITIBehaviorCode[] = [
      'persuade', 'confront', 'direct'
    ];

    if (adherentBehaviors.includes(behavior)) return 0.9;
    if (neutralBehaviors.includes(behavior)) return 0.7;
    if (nonAdherentBehaviors.includes(behavior)) return 0.3;
    return 0.6;
  }

  private determineFidelityLevel(counts: MITIBehaviorCounts): 'below_threshold' | 'competent' | 'proficient' {
    const totalQuestions = counts.openQuestions + counts.closedQuestions;
    const totalReflections = counts.simpleReflections + counts.complexReflections;

    const rq = totalQuestions > 0 ? totalReflections / totalQuestions : 0;
    const pcr = totalReflections > 0 ? (counts.complexReflections / totalReflections) * 100 : 0;
    const poq = totalQuestions > 0 ? (counts.openQuestions / totalQuestions) * 100 : 0;

    const { competent, proficient } = MITI_THRESHOLDS.summary;

    if (rq >= proficient.reflectionToQuestionRatio &&
        pcr >= proficient.percentComplexReflections &&
        poq >= proficient.percentOpenQuestions) {
      return 'proficient';
    }

    if (rq >= competent.reflectionToQuestionRatio &&
        pcr >= competent.percentComplexReflections &&
        poq >= competent.percentOpenQuestions) {
      return 'competent';
    }

    return 'below_threshold';
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { MotivationalStateBuilder };
export default MotivationalEngine;
