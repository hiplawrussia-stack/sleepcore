/**
 * 🔄 MESSAGE PROCESSING PIPELINE - IMPLEMENTATION
 * ================================================
 * Phase 5.2: Core Message Processing Pipeline
 *
 * Pipeline Stages:
 * 1. Input Validation & Preprocessing
 * 2. NLP Analysis (Intent, Entities, Sentiment)
 * 3. User State Retrieval & Update
 * 4. Risk Detection & Crisis Check
 * 5. JITAI Decision Point
 * 6. Response Generation (Age-Adaptive)
 * 7. Post-processing & Delivery Prep
 *
 * Research Foundation:
 * - Layered Mental Health Chatbot Architecture (JMIR 2025)
 * - JITAI Design Principles (Nahum-Shani et al.)
 * - CBT-based Chatbot Efficacy (PMC 2025)
 * - Age-Adaptive Response Generation (CHI 2025)
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import {
  IIncomingMessage,
  IMessageAnalysis,
  IUserState,
  IGeneratedResponse,
  IPipelineResult,
  IPipelineConfig,
  IPipelineStageResult,
  IPipelineStats,
  IMessageProcessingPipeline,
  PipelineEvent,
  PipelineEventHandler,
  DEFAULT_PIPELINE_CONFIG,
  MessageIntent,
  MessageTopic,
  EmotionType,
  AgeGroup,
  RiskLevel,
  RiskIndicator,
  ISentimentAnalysis,
  IDetectedEmotion,
  IExtractedEntity,
  ResponseType,
} from './IMessagePipeline';

// Simple ID generator (avoids ESM uuid package issues with Jest)
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// USER STATE STORE (In-Memory for now)
// ============================================================================

/**
 * In-memory user state store
 * TODO: Replace with persistent storage in production
 */
class UserStateStore {
  private states: Map<string, IUserState> = new Map();

  async get(userId: string): Promise<IUserState | null> {
    return this.states.get(userId) || null;
  }

  async set(userId: string, state: IUserState): Promise<void> {
    this.states.set(userId, state);
  }

  async update(userId: string, updates: Partial<IUserState>): Promise<IUserState> {
    const current = await this.get(userId);
    const updated = {
      ...this.createDefaultState(userId),
      ...current,
      ...updates,
      lastUpdated: new Date(),
    };
    await this.set(userId, updated);
    return updated;
  }

  createDefaultState(userId: string): IUserState {
    return {
      userId,
      ageGroup: 'adult',
      emotionalState: {
        primaryEmotion: 'neutral',
        intensity: 0.3,
        trend: 'stable',
        recentEmotions: [],
      },
      risk: {
        level: 'low',
        score: 0.1,
        indicators: [],
        crisisMode: false,
        lastAssessment: new Date(),
      },
      engagement: {
        messagesInSession: 0,
        sessionDuration: 0,
        avgResponseLength: 0,
        interventionCompletionRate: 0,
        daysSinceLastInteraction: 0,
      },
      sessionContext: {
        customData: {},
      },
      interventionHistory: [],
      lastUpdated: new Date(),
    };
  }
}

// ============================================================================
// NLP ANALYZER
// ============================================================================

/**
 * Russian NLP patterns for mental health context
 */
const RUSSIAN_PATTERNS = {
  // Crisis keywords (high priority)
  crisis: [
    /умереть|смерть|суицид|убить себя|покончить/i,
    /не хочу жить|жить не хочу|незачем жить/i,
    /резать себя|порезать|боль себе/i,
    /конец|всё кончено|нет выхода|безнадёж/i,
  ],

  // Emotional keywords
  emotions: {
    sadness: [/грустн|печаль|тоска|плак|слёз|горе|уныни/i],
    anxiety: [/тревог|волну|беспоко|страш|паник|нервн/i],
    anger: [/злость|бесит|раздража|ненавиж|злюсь|ярость/i],
    fear: [/страх|боюсь|испуг|ужас|кошмар/i],
    loneliness: [/одинок|никому не нуж|никто не понимает/i],
    stress: [/стресс|напряг|устал|выгор|измотан/i],
    joy: [/радост|счаст|весел|здоров|хорош|отлично/i],
    hope: [/надежд|верю|получится|справлюсь/i],
    gratitude: [/спасибо|благодар|признател/i],
  },

  // Intent patterns
  intents: {
    greeting: [/^привет|здравствуй|добр\w+ (утр|день|вечер)|хай|хеллоу/i],
    help_request: [/помог|помощь|подскаж|посовету|что делать|как быть/i],
    emotional_disclosure: [/чувствую|ощущаю|мне (плохо|хорошо|грустно)/i],
    question: [/\?$|как\b|что\b|почему|зачем|когда/i],
    reflection: [/думаю|размышля|понял|осозна/i],
    feedback: [/спасибо|не помогло|помогло|работает|не работает/i],
    small_talk: [/как дела|что нового|погода/i],
  },

  // Topic patterns
  topics: {
    digital_addiction: [/телефон|экран|соцсет|игр|интернет|ютуб|тикток/i],
    anxiety: [/тревог|волну|беспоко|паник/i],
    depression: [/депресс|подавлен|безнадёж|пуст/i],
    stress: [/стресс|давлен|перегруз|работ/i],
    relationships: [/отношен|друг|родител|семь|любо/i],
    self_esteem: [/уверен|оценк|достоин|неуверен/i],
    sleep: [/сон|спать|бессон|усну|просыпа/i],
    motivation: [/мотива|лень|не хочу|цель|смысл/i],
  },
};

/**
 * Simple NLP analyzer for Russian text
 */
class NlpAnalyzer {
  /**
   * Analyze message text
   */
  analyze(text: string, languageHint?: 'ru' | 'en'): IMessageAnalysis {
    const language = languageHint || this.detectLanguage(text);

    return {
      intent: this.detectIntent(text),
      intentConfidence: 0.7, // Simplified
      entities: this.extractEntities(text),
      sentiment: this.analyzeSentiment(text),
      language,
      topic: this.detectTopic(text),
    };
  }

  private detectLanguage(text: string): 'ru' | 'en' {
    // Simple heuristic: check for Cyrillic characters
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
  }

  private detectIntent(text: string): MessageIntent {
    // Check for crisis first (highest priority)
    for (const pattern of RUSSIAN_PATTERNS.crisis) {
      if (pattern.test(text)) {
        return 'crisis';
      }
    }

    // Check command prefix
    if (text.startsWith('/')) {
      return 'command';
    }

    // Check other intents
    for (const [intent, patterns] of Object.entries(RUSSIAN_PATTERNS.intents)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return intent as MessageIntent;
        }
      }
    }

    return 'unknown';
  }

  private extractEntities(text: string): IExtractedEntity[] {
    const entities: IExtractedEntity[] = [];

    // Extract emotion mentions
    for (const [emotion, patterns] of Object.entries(RUSSIAN_PATTERNS.emotions)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
          entities.push({
            type: 'emotion',
            value: emotion,
            confidence: 0.8,
            position: { start: match.index, end: match.index + match[0].length },
          });
        }
      }
    }

    // Extract time mentions
    const timePatterns = [
      /\d{1,2}[:\s]?\d{2}/g, // Time format
      /(утром|днём|вечером|ночью)/gi,
      /(вчера|сегодня|завтра)/gi,
    ];

    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'time',
          value: match[0],
          confidence: 0.9,
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    return entities;
  }

  private analyzeSentiment(text: string): ISentimentAnalysis {
    const emotions: IDetectedEmotion[] = [];
    let totalScore = 0;
    let detectionCount = 0;

    // Detect emotions and calculate sentiment
    for (const [emotion, patterns] of Object.entries(RUSSIAN_PATTERNS.emotions)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const valence = this.getEmotionValence(emotion as EmotionType);
          emotions.push({
            type: emotion as EmotionType,
            confidence: 0.75,
            valence,
          });

          totalScore += valence === 'positive' ? 0.5 : valence === 'negative' ? -0.5 : 0;
          detectionCount++;
        }
      }
    }

    // Calculate overall sentiment
    const score = detectionCount > 0 ? totalScore / detectionCount : 0;
    const overall = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

    // Check for mixed emotions
    const hasPositive = emotions.some(e => e.valence === 'positive');
    const hasNegative = emotions.some(e => e.valence === 'negative');

    return {
      overall: hasPositive && hasNegative ? 'mixed' : overall,
      score,
      intensity: Math.min(Math.abs(score) * 2, 1),
      emotions,
    };
  }

  private getEmotionValence(emotion: EmotionType): 'positive' | 'negative' | 'neutral' {
    const positive = ['joy', 'hope', 'gratitude'];
    const negative = ['sadness', 'anger', 'fear', 'anxiety', 'stress', 'loneliness', 'frustration', 'shame', 'guilt'];

    if (positive.includes(emotion)) return 'positive';
    if (negative.includes(emotion)) return 'negative';
    return 'neutral';
  }

  private detectTopic(text: string): MessageTopic {
    for (const [topic, patterns] of Object.entries(RUSSIAN_PATTERNS.topics)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return topic as MessageTopic;
        }
      }
    }
    return 'general';
  }
}

// ============================================================================
// RISK DETECTOR
// ============================================================================

/**
 * Risk detection service
 */
class RiskDetector {
  /**
   * Assess risk level from message and user state
   */
  assess(
    analysis: IMessageAnalysis,
    userState: IUserState,
    messageText: string
  ): { level: RiskLevel; score: number; indicators: RiskIndicator[] } {
    const indicators: RiskIndicator[] = [];
    let score = 0;

    // Crisis intent = immediate high risk
    if (analysis.intent === 'crisis') {
      indicators.push('crisis_keywords');
      score += 0.8;
    }

    // Check for specific risk patterns in text
    for (const pattern of RUSSIAN_PATTERNS.crisis) {
      if (pattern.test(messageText)) {
        if (pattern.source.includes('умереть') || pattern.source.includes('суицид')) {
          indicators.push('suicidal_ideation');
          score += 0.9;
        }
        if (pattern.source.includes('резать')) {
          indicators.push('self_harm_mention');
          score += 0.8;
        }
        if (pattern.source.includes('безнадёж') || pattern.source.includes('нет выхода')) {
          indicators.push('hopelessness');
          score += 0.5;
        }
      }
    }

    // Check emotional state
    const negativeEmotions = analysis.sentiment.emotions.filter(e => e.valence === 'negative');
    if (negativeEmotions.length >= 2) {
      score += 0.2;
    }

    // Check for declining mood trend
    if (userState.emotionalState.trend === 'declining') {
      indicators.push('declining_mood');
      score += 0.3;
    }

    // Normalize score
    score = Math.min(score, 1);

    // Determine level
    let level: RiskLevel;
    if (score >= 0.8) level = 'critical';
    else if (score >= 0.6) level = 'high';
    else if (score >= 0.4) level = 'elevated';
    else if (score >= 0.2) level = 'moderate';
    else level = 'low';

    return { level, score, indicators };
  }
}

// ============================================================================
// RESPONSE GENERATOR
// ============================================================================

/**
 * Response templates by type and age group
 */
const RESPONSE_TEMPLATES = {
  acknowledgment: {
    child: [
      'Понимаю тебя! 💙',
      'Я тебя слышу!',
      'Спасибо, что рассказал мне!',
    ],
    teen: [
      'Понимаю, о чём ты.',
      'Слышу тебя.',
      'Спасибо, что делишься.',
    ],
    adult: [
      'Благодарю за то, что поделились.',
      'Я вас понимаю.',
      'Это важно, что вы об этом говорите.',
    ],
  },

  empathetic_response: {
    child: [
      'Это может быть непросто. Я рядом! 🤗',
      'Понимаю, что тебе сейчас нелегко.',
      'Ты молодец, что говоришь об этом!',
    ],
    teen: [
      'Понимаю, как это может быть сложно.',
      'Это нормально так себя чувствовать.',
      'Спасибо за доверие.',
    ],
    adult: [
      'Понимаю, что это может быть непростой ситуацией.',
      'Ваши чувства важны и понятны.',
      'Благодарю за открытость.',
    ],
  },

  crisis_response: {
    child: [
      '🆘 Мне важно, чтобы ты был в безопасности.\n\nПожалуйста, скажи взрослому, которому доверяешь, как ты себя чувствуешь.\n\nЕсли нужна помощь прямо сейчас: 8-800-2000-122 (бесплатно)',
    ],
    teen: [
      '🆘 Я беспокоюсь о тебе и хочу помочь.\n\nПожалуйста, поговори с кем-то, кому доверяешь — родителями, учителем, психологом.\n\nЕсли нужна помощь сейчас: 8-800-2000-122 (бесплатно, анонимно, круглосуточно)',
    ],
    adult: [
      '🆘 То, что вы написали, вызывает у меня беспокойство.\n\nПожалуйста, обратитесь за помощью к специалисту или позвоните на линию поддержки.\n\n📞 8-800-2000-122 — бесплатная психологическая помощь\n📞 +7 908 143-08-07 — Фонд "Другой путь"',
    ],
  },

  check_in: {
    child: [
      'Как ты сегодня? 🌈',
      'Что хорошего произошло сегодня?',
    ],
    teen: [
      'Как ты себя чувствуешь сейчас?',
      'Как прошёл твой день?',
    ],
    adult: [
      'Как вы себя чувствуете сегодня?',
      'Что сейчас у вас на уме?',
    ],
  },

  encouragement: {
    child: [
      'Ты супер! 🌟',
      'Так держать! 💪',
      'Верю в тебя!',
    ],
    teen: [
      'Ты справляешься.',
      'Это уже шаг вперёд.',
      'Ты на правильном пути.',
    ],
    adult: [
      'Вы делаете важную работу над собой.',
      'Каждый шаг имеет значение.',
      'Это требует мужества.',
    ],
  },
};

/**
 * Age-adaptive response generator
 */
class ResponseGenerator {
  private nlpAnalyzer: NlpAnalyzer;

  constructor() {
    this.nlpAnalyzer = new NlpAnalyzer();
  }

  /**
   * Generate response based on analysis and user state
   */
  generate(
    message: IIncomingMessage,
    analysis: IMessageAnalysis,
    userState: IUserState
  ): IGeneratedResponse {
    const responseId = generateId();
    const ageGroup = userState.ageGroup;

    // Determine response type
    const responseType = this.determineResponseType(analysis, userState);

    // Get base text
    let text = this.getResponseText(responseType, ageGroup, analysis);

    // Add personalization
    text = this.personalize(text, userState, analysis);

    // Calculate typing delay (therapeutic effect)
    const typingDelay = this.calculateTypingDelay(text, ageGroup);

    return {
      responseId,
      type: responseType,
      text,
      parseMode: 'HTML',
      typingDelay,
      metadata: {
        generatedAt: new Date(),
        ageGroupAdapted: ageGroup,
        rationale: `Response type: ${responseType}, Intent: ${analysis.intent}, Sentiment: ${analysis.sentiment.overall}`,
      },
    };
  }

  private determineResponseType(
    analysis: IMessageAnalysis,
    userState: IUserState
  ): ResponseType {
    // Crisis takes priority
    if (analysis.intent === 'crisis' || userState.risk.crisisMode) {
      return 'crisis_response';
    }

    // Map intents to response types
    switch (analysis.intent) {
      case 'greeting':
        return 'check_in';
      case 'emotional_disclosure':
        return 'empathetic_response';
      case 'help_request':
        return 'intervention';
      case 'question':
        return 'information';
      case 'reflection':
        return 'encouragement';
      case 'feedback':
        return 'acknowledgment';
      default:
        // Based on sentiment
        if (analysis.sentiment.overall === 'negative') {
          return 'empathetic_response';
        }
        return 'acknowledgment';
    }
  }

  private getResponseText(
    type: ResponseType,
    ageGroup: AgeGroup,
    analysis: IMessageAnalysis
  ): string {
    const templates = RESPONSE_TEMPLATES[type as keyof typeof RESPONSE_TEMPLATES];

    if (!templates) {
      // Fallback
      return this.getAcknowledgment(ageGroup);
    }

    const ageTemplates = templates[ageGroup] || templates['adult'];
    return ageTemplates[Math.floor(Math.random() * ageTemplates.length)];
  }

  private getAcknowledgment(ageGroup: AgeGroup): string {
    const templates = RESPONSE_TEMPLATES.acknowledgment;
    const ageTemplates = templates[ageGroup] || templates['adult'];
    return ageTemplates[Math.floor(Math.random() * ageTemplates.length)];
  }

  private personalize(
    text: string,
    userState: IUserState,
    analysis: IMessageAnalysis
  ): string {
    // Add emotion-specific additions
    const primaryEmotion = analysis.sentiment.emotions[0]?.type;

    if (primaryEmotion === 'anxiety' || primaryEmotion === 'stress') {
      if (userState.ageGroup === 'child') {
        text += '\n\nПопробуем сделать глубокий вдох вместе? 🌬️';
      } else if (userState.ageGroup === 'teen') {
        text += '\n\nДавай попробуем технику дыхания?';
      } else {
        text += '\n\nВозможно, стоит попробовать технику осознанного дыхания?';
      }
    }

    if (primaryEmotion === 'sadness' || primaryEmotion === 'loneliness') {
      if (userState.ageGroup === 'child') {
        text += '\n\nТы не один! Я здесь рядом 💙';
      } else {
        text += '\n\nПомните, что вы не одиноки в этом.';
      }
    }

    return text;
  }

  private calculateTypingDelay(text: string, ageGroup: AgeGroup): number {
    // Base delay: ~50ms per character, adjusted by age group
    const baseDelay = text.length * 50;

    // Age adjustments
    const multipliers: Record<AgeGroup, number> = {
      child: 0.8, // Faster for kids
      teen: 1.0,
      adult: 1.2, // Slower for adults (more "thoughtful")
    };

    const delay = baseDelay * multipliers[ageGroup];

    // Clamp between 500ms and 3000ms
    return Math.max(500, Math.min(delay, 3000));
  }
}

// ============================================================================
// MAIN PIPELINE IMPLEMENTATION
// ============================================================================

/**
 * Message Processing Pipeline
 */
export class MessageProcessingPipeline implements IMessageProcessingPipeline {
  private config: IPipelineConfig;
  private userStateStore: UserStateStore;
  private nlpAnalyzer: NlpAnalyzer;
  private riskDetector: RiskDetector;
  private responseGenerator: ResponseGenerator;
  private eventHandlers: Map<PipelineEvent, PipelineEventHandler[]>;
  private stats: IPipelineStats;
  private startTime: Date;

  constructor(config: Partial<IPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.userStateStore = new UserStateStore();
    this.nlpAnalyzer = new NlpAnalyzer();
    this.riskDetector = new RiskDetector();
    this.responseGenerator = new ResponseGenerator();
    this.eventHandlers = new Map();
    this.startTime = new Date();

    this.stats = {
      messagesProcessed: 0,
      avgProcessingTimeMs: 0,
      crisisDetections: 0,
      interventionsDelivered: 0,
      errorCount: 0,
      uptimeSeconds: 0,
    };
  }

  /**
   * Process message through pipeline
   */
  async process(message: IIncomingMessage): Promise<IPipelineResult> {
    const pipelineId = generateId();
    const startTime = Date.now();
    const stageResults: IPipelineStageResult<unknown>[] = [];
    const eventsEmitted: string[] = [];

    try {
      // Emit message received event
      await this.emit('message:received', { message });
      eventsEmitted.push('message:received');

      // Stage 1: NLP Analysis
      const analysisResult = await this.runStage('nlp_analysis', async () => {
        return this.nlpAnalyzer.analyze(message.text, message.metadata?.languageCode as 'ru' | 'en');
      });
      stageResults.push(analysisResult);

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('NLP analysis failed');
      }

      const analysis = analysisResult.data as IMessageAnalysis;
      await this.emit('message:analyzed', { analysis });
      eventsEmitted.push('message:analyzed');

      // Stage 2: Get/Create User State
      const stateResult = await this.runStage('user_state', async () => {
        let state = await this.userStateStore.get(message.userId);
        if (!state) {
          state = this.userStateStore.createDefaultState(message.userId);
          await this.userStateStore.set(message.userId, state);
        }
        return state;
      });
      stageResults.push(stateResult);

      let userState = stateResult.data as IUserState;

      // Stage 3: Risk Detection
      const riskResult = await this.runStage('risk_detection', async () => {
        return this.riskDetector.assess(analysis, userState, message.text);
      });
      stageResults.push(riskResult);

      const riskAssessment = riskResult.data as { level: RiskLevel; score: number; indicators: RiskIndicator[] };

      // Update user state with new risk and emotional data
      userState = await this.userStateStore.update(message.userId, {
        risk: {
          ...userState.risk,
          level: riskAssessment.level,
          score: riskAssessment.score,
          indicators: riskAssessment.indicators,
          crisisMode: riskAssessment.level === 'critical' || riskAssessment.level === 'high',
          lastAssessment: new Date(),
        },
        emotionalState: {
          ...userState.emotionalState,
          primaryEmotion: analysis.sentiment.emotions[0]?.type || 'neutral',
          intensity: analysis.sentiment.intensity,
          recentEmotions: [
            {
              emotion: analysis.sentiment.emotions[0]?.type || 'neutral',
              timestamp: new Date(),
              intensity: analysis.sentiment.intensity,
            },
            ...userState.emotionalState.recentEmotions.slice(0, 9),
          ],
        },
        engagement: {
          ...userState.engagement,
          messagesInSession: userState.engagement.messagesInSession + 1,
          avgResponseLength:
            (userState.engagement.avgResponseLength * userState.engagement.messagesInSession + message.text.length) /
            (userState.engagement.messagesInSession + 1),
        },
      });

      // Emit risk event if elevated
      if (riskAssessment.level === 'critical' || riskAssessment.level === 'high') {
        await this.emit('crisis:detected', { userId: message.userId, riskAssessment });
        eventsEmitted.push('crisis:detected');
        this.stats.crisisDetections++;
      } else if (riskAssessment.level === 'elevated') {
        await this.emit('risk:detected', { userId: message.userId, riskAssessment });
        eventsEmitted.push('risk:detected');
      }

      await this.emit('state:updated', { userState });
      eventsEmitted.push('state:updated');

      // Stage 4: Response Generation
      const responseResult = await this.runStage('response_generation', async () => {
        return this.responseGenerator.generate(message, analysis, userState);
      });
      stageResults.push(responseResult);

      const response = responseResult.data as IGeneratedResponse;

      await this.emit('response:generated', { response });
      eventsEmitted.push('response:generated');

      // Calculate total time
      const totalProcessingTimeMs = Date.now() - startTime;

      // Update stats
      this.stats.messagesProcessed++;
      this.stats.avgProcessingTimeMs =
        (this.stats.avgProcessingTimeMs * (this.stats.messagesProcessed - 1) + totalProcessingTimeMs) /
        this.stats.messagesProcessed;

      // Emit completion
      await this.emit('pipeline:completed', { pipelineId, totalProcessingTimeMs });
      eventsEmitted.push('pipeline:completed');

      return {
        pipelineId,
        originalMessage: message,
        analysis,
        userState,
        response,
        eventsEmitted,
        totalProcessingTimeMs,
        stageResults,
      };
    } catch (error) {
      this.stats.errorCount++;
      await this.emit('pipeline:error', { error, message });

      throw error;
    }
  }

  /**
   * Analyze message without processing
   */
  async analyzeOnly(text: string, language?: 'ru' | 'en'): Promise<IMessageAnalysis> {
    return this.nlpAnalyzer.analyze(text, language);
  }

  /**
   * Get user state
   */
  async getUserState(userId: string): Promise<IUserState | null> {
    return this.userStateStore.get(userId);
  }

  /**
   * Update user state
   */
  async updateUserState(userId: string, updates: Partial<IUserState>): Promise<void> {
    await this.userStateStore.update(userId, updates);
  }

  /**
   * Subscribe to events
   */
  on(event: PipelineEvent, handler: PipelineEventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Get pipeline stats
   */
  getStats(): IPipelineStats {
    return {
      ...this.stats,
      uptimeSeconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  // Private helpers

  private async runStage<T>(
    stageName: string,
    fn: () => Promise<T>
  ): Promise<IPipelineStageResult<T>> {
    const startTime = Date.now();

    try {
      const data = await fn();
      return {
        stage: stageName,
        success: true,
        data,
        processingTimeMs: Date.now() - startTime,
        continueProcessing: true,
      };
    } catch (error) {
      return {
        stage: stageName,
        success: false,
        error: error as Error,
        processingTimeMs: Date.now() - startTime,
        continueProcessing: false,
      };
    }
  }

  private async emit(event: PipelineEvent, data: unknown): Promise<void> {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`[Pipeline] Event handler error for ${event}:`, error);
      }
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create message processing pipeline
 */
export function createMessageProcessingPipeline(
  config?: Partial<IPipelineConfig>
): MessageProcessingPipeline {
  return new MessageProcessingPipeline(config);
}
