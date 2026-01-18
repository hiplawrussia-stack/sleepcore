/**
 * AdaptivePersonaService - Adaptive Conversational Persona
 * ==========================================================
 * Adapts Sonya's communication style based on user state and TTM stage.
 *
 * Research basis (2025-2026):
 * - JMIR Mental Health 2025: Persona approach for multiturn dialog
 * - CounselLLM: TTM/MI integration in LLMs
 * - MITI 4.2: Motivational Interviewing fidelity
 * - Hybrid models (rule-based + generative) best practice
 *
 * Features:
 * - Tone adaptation based on emotional state
 * - MI strategy selection
 * - TTM change stage adaptation
 * - Personalized communication style
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { ISleepState } from '../../sleep/interfaces/ISleepState';

// ==================== Interfaces ====================

/**
 * User's emotional state for adaptation
 */
export interface IEmotionalState {
  /** Primary emotion */
  primary: 'neutral' | 'positive' | 'tired' | 'frustrated' | 'anxious' | 'hopeful' | 'discouraged';

  /** Emotion intensity (0-1) */
  intensity: number;

  /** Detected sentiment (-1 to +1) */
  sentiment: number;

  /** Stress level (0-1) */
  stressLevel: number;

  /** Engagement level (0-1) */
  engagement: number;
}

/**
 * Transtheoretical Model (TTM) change stage
 */
export type ChangeStage =
  | 'precontemplation' // Not thinking about change
  | 'contemplation'     // Thinking about change
  | 'preparation'       // Planning to change
  | 'action'            // Actively changing
  | 'maintenance';      // Maintaining change

/**
 * Motivational Interviewing strategy
 */
export type MIStrategy =
  | 'express_empathy'           // Reflective listening
  | 'develop_discrepancy'       // Gap between current/desired
  | 'roll_with_resistance'      // Don't argue
  | 'support_self_efficacy'     // Build confidence
  | 'elicit_change_talk'        // Draw out motivation
  | 'affirm';                   // Acknowledge strengths

/**
 * Adapted message result
 */
export interface IAdaptedMessage {
  /** Original message */
  original: string;

  /** Adapted message */
  adapted: string;

  /** Tone adjustments applied */
  toneAdjustments: string[];

  /** MI strategy used */
  miStrategy: MIStrategy | null;

  /** Change stage considered */
  changeStage: ChangeStage;

  /** Confidence in adaptation */
  confidence: number;
}

/**
 * User communication profile
 */
export interface ICommunicationProfile {
  /** User ID */
  userId: string;

  /** Current change stage */
  changeStage: ChangeStage;

  /** Preferred MI strategies */
  preferredStrategies: MIStrategy[];

  /** Emotional baseline */
  emotionalBaseline: IEmotionalState;

  /** Communication preferences */
  preferences: {
    formality: 'informal' | 'neutral' | 'formal';
    verbosity: 'brief' | 'moderate' | 'detailed';
    encouragementLevel: 'low' | 'medium' | 'high';
    humorTolerance: number; // 0-1
  };

  /** Last update */
  lastUpdated: Date;
}

// ==================== Configuration ====================

export interface IAdaptivePersonaConfig {
  /** Enable adaptive responses */
  enabled: boolean;

  /** Default change stage for new users */
  defaultChangeStage: ChangeStage;

  /** MI strategy weights by stage */
  strategyWeights: Record<ChangeStage, Record<MIStrategy, number>>;

  /** Tone adjustment factors */
  toneFactors: {
    encouragementMultiplier: number;
    empathyMultiplier: number;
    directnessMultiplier: number;
  };
}

export const DEFAULT_ADAPTIVE_CONFIG: IAdaptivePersonaConfig = {
  enabled: true,
  defaultChangeStage: 'contemplation',
  strategyWeights: {
    precontemplation: {
      express_empathy: 0.4,
      develop_discrepancy: 0.3,
      roll_with_resistance: 0.2,
      support_self_efficacy: 0.05,
      elicit_change_talk: 0.03,
      affirm: 0.02,
    },
    contemplation: {
      express_empathy: 0.25,
      develop_discrepancy: 0.25,
      roll_with_resistance: 0.15,
      support_self_efficacy: 0.15,
      elicit_change_talk: 0.15,
      affirm: 0.05,
    },
    preparation: {
      express_empathy: 0.15,
      develop_discrepancy: 0.1,
      roll_with_resistance: 0.1,
      support_self_efficacy: 0.25,
      elicit_change_talk: 0.25,
      affirm: 0.15,
    },
    action: {
      express_empathy: 0.1,
      develop_discrepancy: 0.05,
      roll_with_resistance: 0.05,
      support_self_efficacy: 0.35,
      elicit_change_talk: 0.15,
      affirm: 0.3,
    },
    maintenance: {
      express_empathy: 0.15,
      develop_discrepancy: 0.05,
      roll_with_resistance: 0.1,
      support_self_efficacy: 0.25,
      elicit_change_talk: 0.1,
      affirm: 0.35,
    },
  },
  toneFactors: {
    encouragementMultiplier: 1.0,
    empathyMultiplier: 1.0,
    directnessMultiplier: 1.0,
  },
};

// ==================== Service Implementation ====================

/**
 * Adaptive Persona Service
 * Adapts communication style based on user state
 */
export class AdaptivePersonaService {
  private config: IAdaptivePersonaConfig;
  private userProfiles: Map<string, ICommunicationProfile> = new Map();
  private emotionalHistory: Map<string, IEmotionalState[]> = new Map();

  constructor(config: Partial<IAdaptivePersonaConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
  }

  // ==================== Public API ====================

  /**
   * Adapt message tone based on user's emotional state
   */
  async adaptTone(
    userId: string,
    baseMessage: string,
    emotionalState?: IEmotionalState
  ): Promise<IAdaptedMessage> {
    const profile = await this.getOrCreateProfile(userId);
    const state = emotionalState || profile.emotionalBaseline;

    const toneAdjustments: string[] = [];
    let adapted = baseMessage;

    // Apply emotional state adjustments
    if (state.primary === 'discouraged' || state.primary === 'frustrated') {
      adapted = this.addEmpathy(adapted);
      toneAdjustments.push('added_empathy');
    }

    if (state.primary === 'anxious') {
      adapted = this.addReassurance(adapted);
      toneAdjustments.push('added_reassurance');
    }

    if (state.stressLevel > 0.7) {
      adapted = this.simplifyMessage(adapted);
      toneAdjustments.push('simplified');
    }

    if (state.engagement < 0.3) {
      adapted = this.addMotivation(adapted, profile.changeStage);
      toneAdjustments.push('added_motivation');
    }

    // Apply encouragement based on profile
    if (profile.preferences.encouragementLevel === 'high') {
      adapted = this.increaseEncouragement(adapted);
      toneAdjustments.push('increased_encouragement');
    }

    return {
      original: baseMessage,
      adapted,
      toneAdjustments,
      miStrategy: null,
      changeStage: profile.changeStage,
      confidence: 0.8,
    };
  }

  /**
   * Select optimal MI strategy for current context
   */
  async selectMIStrategy(
    userId: string,
    context?: { recentChangeTalk?: number; recentSustainTalk?: number }
  ): Promise<MIStrategy> {
    const profile = await this.getOrCreateProfile(userId);
    const weights = this.config.strategyWeights[profile.changeStage];

    // Adjust weights based on context
    const adjustedWeights = { ...weights };

    if (context?.recentSustainTalk && context.recentSustainTalk > 0.5) {
      // High sustain talk → roll with resistance
      adjustedWeights.roll_with_resistance *= 1.5;
      adjustedWeights.express_empathy *= 1.3;
    }

    if (context?.recentChangeTalk && context.recentChangeTalk > 0.5) {
      // High change talk → support and affirm
      adjustedWeights.support_self_efficacy *= 1.5;
      adjustedWeights.affirm *= 1.5;
    }

    // Normalize and select
    const total = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
    const random = Math.random() * total;

    let cumulative = 0;
    for (const [strategy, weight] of Object.entries(adjustedWeights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return strategy as MIStrategy;
      }
    }

    return 'express_empathy';
  }

  /**
   * Adapt content to user's change stage
   */
  async adaptToChangeStage(
    userId: string,
    content: string
  ): Promise<IAdaptedMessage> {
    const profile = await this.getOrCreateProfile(userId);
    const strategy = await this.selectMIStrategy(userId);

    let adapted = content;
    const toneAdjustments: string[] = [];

    switch (profile.changeStage) {
      case 'precontemplation':
        // Don't push for change, just build rapport
        adapted = this.removeCallsToAction(adapted);
        adapted = this.addCuriosityElements(adapted);
        toneAdjustments.push('removed_pressure', 'added_curiosity');
        break;

      case 'contemplation':
        // Explore ambivalence
        adapted = this.addReflectiveQuestions(adapted);
        toneAdjustments.push('added_reflection');
        break;

      case 'preparation':
        // Focus on concrete planning
        adapted = this.addActionableSteps(adapted);
        toneAdjustments.push('added_action_steps');
        break;

      case 'action':
        // Reinforce efforts
        adapted = this.addReinforcement(adapted);
        toneAdjustments.push('added_reinforcement');
        break;

      case 'maintenance':
        // Prevent relapse, celebrate success
        adapted = this.addMaintenanceSupport(adapted);
        toneAdjustments.push('added_maintenance_support');
        break;
    }

    return {
      original: content,
      adapted,
      toneAdjustments,
      miStrategy: strategy,
      changeStage: profile.changeStage,
      confidence: 0.75,
    };
  }

  /**
   * Detect user's change stage from behavior
   */
  async detectChangeStage(
    userId: string,
    sleepHistory: ISleepState[],
    behaviorIndicators?: {
      diaryCompletionRate?: number;
      recommendationFollowRate?: number;
      sessionCount?: number;
      daysInProgram?: number;
    }
  ): Promise<ChangeStage> {
    // Extract values with defaults
    const diaryCompletionRate = behaviorIndicators?.diaryCompletionRate ?? 0;
    const recommendationFollowRate = behaviorIndicators?.recommendationFollowRate ?? 0;
    const sessionCount = behaviorIndicators?.sessionCount ?? 0;
    const daysInProgram = behaviorIndicators?.daysInProgram ?? 0;

    // Simple heuristic-based detection
    // In production, this would use ML classification

    if (daysInProgram === 0 || sessionCount < 2) {
      return 'precontemplation';
    }

    if (diaryCompletionRate < 0.3) {
      return 'contemplation';
    }

    if (diaryCompletionRate >= 0.3 && diaryCompletionRate < 0.6) {
      return 'preparation';
    }

    if (diaryCompletionRate >= 0.6 && recommendationFollowRate >= 0.5) {
      if (daysInProgram >= 28) {
        return 'maintenance';
      }
      return 'action';
    }

    return 'contemplation';
  }

  /**
   * Update user's emotional state
   */
  async updateEmotionalState(userId: string, state: IEmotionalState): Promise<void> {
    const history = this.emotionalHistory.get(userId) || [];
    history.push(state);

    // Keep last 20 states
    if (history.length > 20) {
      history.shift();
    }

    this.emotionalHistory.set(userId, history);

    // Update profile baseline
    const profile = await this.getOrCreateProfile(userId);
    profile.emotionalBaseline = this.calculateEmotionalBaseline(history);
    profile.lastUpdated = new Date();
    this.userProfiles.set(userId, profile);
  }

  /**
   * Update user's change stage
   */
  async updateChangeStage(userId: string, stage: ChangeStage): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    profile.changeStage = stage;
    profile.lastUpdated = new Date();
    this.userProfiles.set(userId, profile);
  }

  /**
   * Get user's communication profile
   */
  async getCommunicationProfile(userId: string): Promise<ICommunicationProfile> {
    return this.getOrCreateProfile(userId);
  }

  /**
   * Get MI strategy description in Russian
   */
  getMIStrategyDescription(strategy: MIStrategy): string {
    const descriptions: Record<MIStrategy, string> = {
      express_empathy: 'Проявление эмпатии и понимания',
      develop_discrepancy: 'Исследование разрыва между текущим и желаемым',
      roll_with_resistance: 'Принятие сопротивления без спора',
      support_self_efficacy: 'Поддержка уверенности в своих силах',
      elicit_change_talk: 'Стимулирование речи об изменениях',
      affirm: 'Признание сильных сторон и усилий',
    };
    return descriptions[strategy];
  }

  /**
   * Get change stage description in Russian
   */
  getChangeStageDescription(stage: ChangeStage): string {
    const descriptions: Record<ChangeStage, string> = {
      precontemplation: 'Не думает об изменениях',
      contemplation: 'Размышляет об изменениях',
      preparation: 'Планирует изменения',
      action: 'Активно меняется',
      maintenance: 'Поддерживает изменения',
    };
    return descriptions[stage];
  }

  // ==================== Private Methods ====================

  private async getOrCreateProfile(userId: string): Promise<ICommunicationProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        changeStage: this.config.defaultChangeStage,
        preferredStrategies: ['express_empathy', 'support_self_efficacy'],
        emotionalBaseline: {
          primary: 'neutral',
          intensity: 0.5,
          sentiment: 0,
          stressLevel: 0.3,
          engagement: 0.5,
        },
        preferences: {
          formality: 'informal',
          verbosity: 'moderate',
          encouragementLevel: 'medium',
          humorTolerance: 0.5,
        },
        lastUpdated: new Date(),
      };
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  private calculateEmotionalBaseline(history: IEmotionalState[]): IEmotionalState {
    if (history.length === 0) {
      return {
        primary: 'neutral',
        intensity: 0.5,
        sentiment: 0,
        stressLevel: 0.3,
        engagement: 0.5,
      };
    }

    const avgIntensity = history.reduce((a, b) => a + b.intensity, 0) / history.length;
    const avgSentiment = history.reduce((a, b) => a + b.sentiment, 0) / history.length;
    const avgStress = history.reduce((a, b) => a + b.stressLevel, 0) / history.length;
    const avgEngagement = history.reduce((a, b) => a + b.engagement, 0) / history.length;

    // Most common primary emotion
    const emotionCounts = new Map<string, number>();
    for (const state of history) {
      emotionCounts.set(state.primary, (emotionCounts.get(state.primary) || 0) + 1);
    }
    const primary = [...emotionCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] as IEmotionalState['primary'] || 'neutral';

    return {
      primary,
      intensity: avgIntensity,
      sentiment: avgSentiment,
      stressLevel: avgStress,
      engagement: avgEngagement,
    };
  }

  // ==================== Message Adaptation Methods ====================

  private addEmpathy(message: string): string {
    const empathyPhrases = [
      'Я понимаю, что это непросто. ',
      'Это нормально — чувствовать себя так. ',
      'Твои чувства абсолютно понятны. ',
    ];
    const phrase = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
    return phrase + message;
  }

  private addReassurance(message: string): string {
    const reassurancePhrases = [
      ' Помни, что ты не одна в этом.',
      ' Маленькие шаги тоже ведут к цели.',
      ' Я здесь, чтобы помочь.',
    ];
    const phrase = reassurancePhrases[Math.floor(Math.random() * reassurancePhrases.length)];
    return message + phrase;
  }

  private simplifyMessage(message: string): string {
    // Remove complex sentences, keep core message
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      return sentences.slice(0, 3).join('. ') + '.';
    }
    return message;
  }

  private addMotivation(message: string, stage: ChangeStage): string {
    const motivationByStage: Record<ChangeStage, string[]> = {
      precontemplation: [
        ' Просто интересно, как это может быть полезно?',
      ],
      contemplation: [
        ' Что бы ты хотела изменить в своём сне?',
      ],
      preparation: [
        ' Ты уже на правильном пути!',
      ],
      action: [
        ' Твои усилия заметны и важны!',
      ],
      maintenance: [
        ' Ты отлично справляешься!',
      ],
    };
    const phrases = motivationByStage[stage];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    return message + phrase;
  }

  private increaseEncouragement(message: string): string {
    const encouragements = [
      '💪 ',
      '✨ ',
      '🌟 ',
    ];
    const emoji = encouragements[Math.floor(Math.random() * encouragements.length)];
    return emoji + message;
  }

  private removeCallsToAction(message: string): string {
    // Remove imperative phrases
    return message
      .replace(/попробуй/gi, 'можно попробовать')
      .replace(/сделай/gi, 'можно сделать')
      .replace(/начни/gi, 'можно начать');
  }

  private addCuriosityElements(message: string): string {
    const curiosity = ' Как ты думаешь, что могло бы помочь?';
    return message + curiosity;
  }

  private addReflectiveQuestions(message: string): string {
    const questions = [
      ' Что ты думаешь об этом?',
      ' Как это для тебя?',
      ' Что тебе кажется наиболее важным?',
    ];
    const question = questions[Math.floor(Math.random() * questions.length)];
    return message + question;
  }

  private addActionableSteps(message: string): string {
    return message + ' Начнём с малого — какой первый шаг ты готова сделать?';
  }

  private addReinforcement(message: string): string {
    const reinforcements = [
      'Отличная работа! ',
      'Ты молодец! ',
      'Прекрасно! ',
    ];
    const phrase = reinforcements[Math.floor(Math.random() * reinforcements.length)];
    return phrase + message;
  }

  private addMaintenanceSupport(message: string): string {
    return message + ' Ты уже многого достигла — продолжай в том же духе!';
  }
}

// ==================== Factory & Singleton ====================

export function createAdaptivePersonaService(
  config?: Partial<IAdaptivePersonaConfig>
): AdaptivePersonaService {
  return new AdaptivePersonaService(config);
}

export const adaptivePersonaService = createAdaptivePersonaService();
