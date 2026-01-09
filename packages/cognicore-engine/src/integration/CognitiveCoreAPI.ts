/**
 * 🔌 COGNITIVE CORE API - IMPLEMENTATION
 * =======================================
 * Phase 3.5: Integration & API Layer
 *
 * Facade Pattern Implementation providing unified access to:
 * - State Vector Engine (Phase 3.1)
 * - Temporal Echo Engine (Phase 3.2)
 * - Belief Update Engine (Phase 3.2)
 * - Deep Cognitive Mirror (Phase 3.3)
 * - Intervention Optimizer (Phase 3.4)
 *
 * Architecture:
 * - Event-Driven with Domain Events
 * - CQRS for read/write separation
 * - Event Sourcing for audit trails
 * - Clean Architecture with Facade
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import {
  ICognitiveCoreAPI,
  ICognitiveCoreConfig,
  ICognitiveCoreResponse,
  IUserSession,
  ISessionContext,
  IProcessMessageCommand,
  IRecordObservationCommand,
  IRequestInterventionCommand,
  IRecordOutcomeCommand,
  IUserStateQuery,
  IUserStateResult,
  IInterventionHistoryQuery,
  IInterventionHistoryResult,
  IMessageProcessingResult,
  IResponseSuggestion,
  IDomainEvent,
  IEventMetadata,
  IEventBus,
  IEventSubscription,
  IEventStore,
  IStateRepository,
  ISessionRepository,
  EventHandler,
  IStateUpdatedEvent,
  IBeliefUpdatedEvent,
  TextAnalysisResultCompletedEvent,
  IInterventionSelectedEvent,
  ICrisisDetectedEvent,
  IMessageReceivedEvent,
  DEFAULT_COGNITIVE_CORE_CONFIG,
  CreateCognitiveCoreAPI,
} from './ICognitiveCoreAPI';

// Direct imports following 2024-2025 best practices (avoid barrel re-exports)
import { StateVector } from '../state/StateVector';
import type { IStateVector } from '../state/interfaces/IStateVector';
import type { TemporalPrediction } from '../state/interfaces/IStateVector';

import {
  BeliefUpdateEngine,
  createBeliefUpdateEngine,
} from '../belief/BeliefUpdateEngine';
import type {
  BeliefState,
  Observation,
} from '../belief/IBeliefUpdate';

import {
  TemporalEchoEngine,
  createTemporalEchoEngine,
} from '../temporal/TemporalEchoEngine';
import type { VulnerabilityWindow } from '../temporal/ITemporalPrediction';

import {
  DeepCognitiveMirror,
  createDeepCognitiveMirror,
} from '../mirror/DeepCognitiveMirror';
import type {
  TextAnalysisResult,
  TherapeuticInsight,
  SocraticQuestion,
} from '../mirror/IDeepCognitiveMirror';

import {
  InterventionOptimizer,
  createInterventionOptimizer,
} from '../intervention/InterventionOptimizer';
import type {
  IInterventionSelection,
  IIntervention,
  IInterventionOutcome,
  IContextualFeatures,
} from '../intervention/IInterventionOptimizer';

import {
  CrisisDetector,
  createCrisisDetector,
} from '../crisis/CrisisDetector';
import type {
  CrisisDetectionResult,
  StateRiskData,
} from '../crisis/CrisisDetector';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return `corr-${generateId()}`;
}

/**
 * Create response wrapper
 */
function createResponse<T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string; details?: unknown },
  startTime?: number
): ICognitiveCoreResponse<T> {
  return {
    success,
    data,
    error,
    metadata: {
      requestId: generateId(),
      processingTimeMs: startTime ? Date.now() - startTime : 0,
      timestamp: new Date(),
    },
  };
}

/**
 * Detect language from text
 */
function detectLanguage(text: string): 'en' | 'ru' {
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text) ? 'ru' : 'en';
}

// ============================================================================
// IN-MEMORY EVENT BUS
// ============================================================================

/**
 * In-memory event bus implementation
 */
class InMemoryEventBus implements IEventBus {
  private subscriptions: Map<string, Map<string, EventHandler>> = new Map();
  private subscriptionCounter = 0;

  async publish<T extends IDomainEvent>(event: T): Promise<void> {
    const handlers = this.subscriptions.get(event.eventType);
    if (handlers) {
      const promises = Array.from(handlers.values()).map(handler =>
        handler(event).catch(err => {
          console.error(`Error in event handler for ${event.eventType}:`, err);
        })
      );
      await Promise.all(promises);
    }

    // Also publish to wildcard subscribers
    const wildcardHandlers = this.subscriptions.get('*');
    if (wildcardHandlers) {
      const promises = Array.from(wildcardHandlers.values()).map(handler =>
        handler(event).catch(err => {
          console.error(`Error in wildcard handler:`, err);
        })
      );
      await Promise.all(promises);
    }
  }

  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): IEventSubscription {
    const subscriptionId = `sub-${++this.subscriptionCounter}`;

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Map());
    }

    this.subscriptions.get(eventType)!.set(subscriptionId, handler as EventHandler);

    return {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => this.unsubscribe(subscriptionId),
    };
  }

  subscribeMany(
    eventTypes: string[],
    handler: EventHandler
  ): IEventSubscription[] {
    return eventTypes.map(eventType => this.subscribe(eventType, handler));
  }

  unsubscribe(subscriptionId: string): void {
    for (const handlers of this.subscriptions.values()) {
      if (handlers.has(subscriptionId)) {
        handlers.delete(subscriptionId);
        return;
      }
    }
  }

  clearAll(): void {
    this.subscriptions.clear();
  }
}

// ============================================================================
// IN-MEMORY EVENT STORE
// ============================================================================

/**
 * In-memory event store implementation
 */
class InMemoryEventStore implements IEventStore {
  private streams: Map<string, IDomainEvent[]> = new Map();
  private eventBus: IEventBus;
  private maxEvents: number;

  constructor(eventBus: IEventBus, maxEvents: number = 10000) {
    this.eventBus = eventBus;
    this.maxEvents = maxEvents;
  }

  async append(
    streamId: string,
    event: IDomainEvent,
    expectedVersion?: number
  ): Promise<void> {
    if (!this.streams.has(streamId)) {
      this.streams.set(streamId, []);
    }

    const stream = this.streams.get(streamId)!;

    if (expectedVersion !== undefined && stream.length !== expectedVersion) {
      throw new Error(
        `Concurrency conflict: expected version ${expectedVersion}, actual ${stream.length}`
      );
    }

    stream.push(event);

    // Trim if exceeds max
    if (stream.length > this.maxEvents) {
      stream.splice(0, stream.length - this.maxEvents);
    }

    // Publish to event bus
    await this.eventBus.publish(event);
  }

  async appendMany(
    streamId: string,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const version = expectedVersion !== undefined ? expectedVersion + i : undefined;
      await this.append(streamId, events[i], version);
    }
  }

  async readStream(
    streamId: string,
    fromVersion: number = 0,
    count?: number
  ): Promise<IDomainEvent[]> {
    const stream = this.streams.get(streamId) || [];
    const result = stream.slice(fromVersion, count ? fromVersion + count : undefined);
    return result;
  }

  async readByType(
    eventType: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<IDomainEvent[]> {
    const result: IDomainEvent[] = [];

    for (const stream of this.streams.values()) {
      for (const event of stream) {
        if (event.eventType !== eventType) continue;
        if (fromTimestamp && event.timestamp < fromTimestamp) continue;
        if (toTimestamp && event.timestamp > toTimestamp) continue;
        result.push(event);
      }
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getStreamVersion(streamId: string): Promise<number> {
    const stream = this.streams.get(streamId);
    return stream ? stream.length : 0;
  }

  subscribeToStream(
    streamId: string,
    handler: EventHandler
  ): IEventSubscription {
    // Subscribe to all events but filter by stream ID
    return this.eventBus.subscribe('*', async (event) => {
      if (event.aggregateId === streamId) {
        await handler(event);
      }
    });
  }
}

// ============================================================================
// IN-MEMORY STATE REPOSITORY
// ============================================================================

/**
 * In-memory state repository
 */
class InMemoryStateRepository implements IStateRepository {
  private states: Map<string, IStateVector> = new Map();
  private beliefs: Map<string, BeliefState> = new Map();
  private history: Map<string, Array<{ state: IStateVector; timestamp: Date }>> = new Map();

  async getState(userId: string): Promise<IStateVector | null> {
    return this.states.get(userId) || null;
  }

  async saveState(userId: string, state: IStateVector): Promise<void> {
    this.states.set(userId, state);

    // Add to history
    if (!this.history.has(userId)) {
      this.history.set(userId, []);
    }
    this.history.get(userId)!.push({ state, timestamp: new Date() });

    // Keep last 100 entries
    const hist = this.history.get(userId)!;
    if (hist.length > 100) {
      hist.splice(0, hist.length - 100);
    }
  }

  async getBelief(userId: string): Promise<BeliefState | null> {
    return this.beliefs.get(userId) || null;
  }

  async saveBelief(userId: string, belief: BeliefState): Promise<void> {
    this.beliefs.set(userId, belief);
  }

  async getStateHistory(
    userId: string,
    limit: number = 50
  ): Promise<Array<{ state: IStateVector; timestamp: Date }>> {
    const hist = this.history.get(userId) || [];
    return hist.slice(-limit);
  }

  async deleteUserData(userId: string): Promise<void> {
    this.states.delete(userId);
    this.beliefs.delete(userId);
    this.history.delete(userId);
  }
}

// ============================================================================
// IN-MEMORY SESSION REPOSITORY
// ============================================================================

/**
 * In-memory session repository
 */
class InMemorySessionRepository implements ISessionRepository {
  private sessions: Map<string, IUserSession> = new Map();
  private userActiveSessions: Map<string, string> = new Map();

  async create(session: IUserSession): Promise<void> {
    this.sessions.set(session.sessionId, session);

    // Set as active session for user
    if (session.status === 'active') {
      this.userActiveSessions.set(session.userId, session.sessionId);
    }
  }

  async getById(sessionId: string): Promise<IUserSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getActiveSession(userId: string): Promise<IUserSession | null> {
    const sessionId = this.userActiveSessions.get(userId);
    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      this.userActiveSessions.delete(userId);
      return null;
    }

    return session;
  }

  async update(session: IUserSession): Promise<void> {
    this.sessions.set(session.sessionId, session);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'ended';
      this.userActiveSessions.delete(session.userId);
    }
  }

  async getSessionHistory(userId: string, limit: number = 10): Promise<IUserSession[]> {
    const userSessions: IUserSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }

    return userSessions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }
}

// ============================================================================
// COGNITIVE CORE API IMPLEMENTATION
// ============================================================================

/**
 * 🔌 Cognitive Core API Implementation
 *
 * Main facade providing unified access to all cognitive subsystems
 */
export class CognitiveCoreAPI implements ICognitiveCoreAPI {
  private config: ICognitiveCoreConfig;
  private eventBus: IEventBus;
  private eventStore: IEventStore;
  private stateRepository: IStateRepository;
  private sessionRepository: ISessionRepository;

  // Cognitive engines
  private beliefEngine: BeliefUpdateEngine;
  private temporalEngine: TemporalEchoEngine;
  private cognitiveMirror: DeepCognitiveMirror;
  private interventionOptimizer: InterventionOptimizer;
  private crisisDetector: CrisisDetector;

  // Intervention library
  private interventions: IIntervention[] = [];

  constructor(config: ICognitiveCoreConfig) {
    this.config = config;

    // Initialize infrastructure
    this.eventBus = new InMemoryEventBus();
    this.eventStore = new InMemoryEventStore(this.eventBus, config.maxEventsInMemory);
    this.stateRepository = new InMemoryStateRepository();
    this.sessionRepository = new InMemorySessionRepository();

    // Initialize cognitive engines
    this.beliefEngine = createBeliefUpdateEngine();
    this.temporalEngine = createTemporalEchoEngine();
    this.cognitiveMirror = createDeepCognitiveMirror({
      languageStyle: 'conversational',
      enableCrisisDetection: config.crisisDetectionEnabled,
    });
    this.interventionOptimizer = createInterventionOptimizer({
      enableCrisisOverride: config.crisisDetectionEnabled,
      enableContextualBandit: true,
    });

    // Initialize crisis detector (multi-layer detection)
    this.crisisDetector = createCrisisDetector({
      enableLayer1: true,
      enableLayer2: true,
      enableLayer3: true,
      sensitivityLevel: 'high',
      language: 'auto',
    });

    // Initialize default interventions
    this.initializeDefaultInterventions();
  }

  /**
   * Initialize default intervention library
   */
  private async initializeDefaultInterventions(): Promise<void> {
    const defaultInterventions: IIntervention[] = [
      this.createIntervention('grounding_5_4_3_2_1', 'distress_tolerance', 'brief'),
      this.createIntervention('thought_record', 'cognitive_restructuring', 'standard'),
      this.createIntervention('mindful_breathing', 'mindfulness', 'micro'),
      this.createIntervention('gratitude_moment', 'gratitude', 'micro'),
      this.createIntervention('self_compassion_break', 'self_compassion', 'brief'),
      this.createIntervention('behavioral_activation_small', 'behavioral_activation', 'brief'),
      this.createIntervention('crisis_support', 'crisis_intervention', 'standard'),
    ];

    for (const intervention of defaultInterventions) {
      await this.interventionOptimizer.registerIntervention(intervention);
      this.interventions.push(intervention);
    }
  }

  /**
   * Create intervention helper
   */
  private createIntervention(
    id: string,
    category: string,
    intensity: 'micro' | 'brief' | 'standard' | 'extended' | 'intensive'
  ): IIntervention {
    const interventionData: Record<string, { name: string; description: string; content: { en: string; ru: string } }> = {
      'grounding_5_4_3_2_1': {
        name: '5-4-3-2-1 Grounding',
        description: 'Grounding exercise using 5 senses',
        content: {
          en: 'Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
          ru: 'Заметь 5 вещей, которые видишь, 4 которые можешь потрогать, 3 которые слышишь, 2 которые чувствуешь на запах, 1 на вкус.',
        },
      },
      'thought_record': {
        name: 'Thought Record',
        description: 'CBT thought recording exercise',
        content: {
          en: 'What thought just went through your mind? What emotions did it bring up? What evidence supports or contradicts this thought?',
          ru: 'Какая мысль только что пришла тебе в голову? Какие эмоции она вызвала? Какие факты подтверждают или опровергают эту мысль?',
        },
      },
      'mindful_breathing': {
        name: 'Mindful Breathing',
        description: 'Brief mindfulness exercise',
        content: {
          en: 'Take a slow, deep breath in through your nose for 4 counts. Hold for 4 counts. Exhale slowly for 6 counts.',
          ru: 'Сделай медленный глубокий вдох через нос на 4 счёта. Задержи на 4 счёта. Медленно выдохни на 6 счётов.',
        },
      },
      'gratitude_moment': {
        name: 'Gratitude Moment',
        description: 'Quick gratitude practice',
        content: {
          en: 'Think of one small thing you can appreciate right now, no matter how simple.',
          ru: 'Подумай об одной маленькой вещи, за которую ты можешь быть благодарен прямо сейчас, какой бы простой она ни была.',
        },
      },
      'self_compassion_break': {
        name: 'Self-Compassion Break',
        description: 'Self-compassion exercise',
        content: {
          en: 'This is a moment of difficulty. Difficulty is part of life. May I be kind to myself in this moment.',
          ru: 'Это момент трудности. Трудности — часть жизни. Пусть я буду добр к себе в этот момент.',
        },
      },
      'behavioral_activation_small': {
        name: 'Small Step Activation',
        description: 'Behavioral activation micro-step',
        content: {
          en: 'What is one tiny action you could take right now that might help you feel just a little better?',
          ru: 'Какое одно маленькое действие ты мог бы сделать прямо сейчас, которое могло бы помочь тебе почувствовать себя чуть лучше?',
        },
      },
      'crisis_support': {
        name: 'Crisis Support',
        description: 'Immediate crisis intervention',
        content: {
          en: 'I hear that you\'re going through a really difficult time. Your safety matters. If you\'re in crisis, please call: 988 (US) or your local crisis line.',
          ru: 'Я слышу, что тебе сейчас очень тяжело. Твоя безопасность важна. Если тебе нужна срочная помощь, позвони: 8-800-2000-122 (бесплатно по России).',
        },
      },
    };

    const data = interventionData[id] || {
      name: id,
      description: 'Intervention',
      content: { en: 'Intervention content', ru: 'Содержание интервенции' },
    };

    return {
      id,
      name: data.name,
      description: data.description,
      category: category as any,
      intensity,
      modality: 'text_message',
      estimatedDurationSeconds: intensity === 'micro' ? 30 : intensity === 'brief' ? 180 : 300,
      preconditions: {},
      contraindications: {},
      content: {
        en: {
          introduction: '',
          mainContent: data.content.en,
          closing: '',
        },
        ru: {
          introduction: '',
          mainContent: data.content.ru,
          closing: '',
        },
      },
      mechanisms: [],
      targetOutcomes: ['engagement', 'completion'],
      evidenceLevel: 'rct',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async startSession(
    userId: string,
    platform: 'telegram' | 'web' | 'api',
    context?: Partial<ISessionContext>
  ): Promise<ICognitiveCoreResponse<IUserSession>> {
    const startTime = Date.now();

    try {
      // End any existing active session
      const existingSession = await this.sessionRepository.getActiveSession(userId);
      if (existingSession) {
        await this.sessionRepository.endSession(existingSession.sessionId);
      }

      // Create initial state if needed
      let currentState = await this.stateRepository.getState(userId);
      if (!currentState) {
        currentState = StateVector.createInitial(userId);
        await this.stateRepository.saveState(userId, currentState);
      }

      // Create initial belief if needed
      let currentBelief = await this.stateRepository.getBelief(userId);
      if (!currentBelief) {
        currentBelief = this.beliefEngine.initializeBelief();
        await this.stateRepository.saveBelief(userId, currentBelief);
      }

      // Create new session
      const session: IUserSession = {
        sessionId: generateId(),
        userId,
        platform,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        status: 'active',
        currentState,
        currentBelief,
        messageCount: 0,
        interventionsDelivered: 0,
        context: {
          language: context?.language || this.config.defaultLanguage,
          ageGroup: context?.ageGroup,
          crisisMode: false,
          customData: {},
          ...context,
        },
        pendingOutcomes: [],
      };

      await this.sessionRepository.create(session);

      // Emit event
      await this.emitEvent<IDomainEvent>({
        eventId: generateId(),
        eventType: 'USER_SESSION_STARTED',
        aggregateId: session.sessionId,
        aggregateType: 'user_session',
        timestamp: new Date(),
        version: 1,
        payload: {
          userId,
          sessionId: session.sessionId,
          platform,
          initialContext: context,
        },
        metadata: this.createMetadata(userId, session.sessionId),
      });

      return createResponse(true, session, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'SESSION_START_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start session',
      }, startTime);
    }
  }

  async getOrCreateSession(
    userId: string,
    platform: 'telegram' | 'web' | 'api'
  ): Promise<ICognitiveCoreResponse<IUserSession>> {
    const startTime = Date.now();

    try {
      let session = await this.sessionRepository.getActiveSession(userId);

      if (session) {
        // Check for timeout
        const timeSinceActivity = Date.now() - session.lastActivityAt.getTime();
        if (timeSinceActivity > this.config.sessionTimeoutMs) {
          await this.sessionRepository.endSession(session.sessionId);
          session = null;
        }
      }

      if (!session) {
        const result = await this.startSession(userId, platform);
        return result;
      }

      return createResponse(true, session, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'SESSION_ERROR',
        message: error instanceof Error ? error.message : 'Session error',
      }, startTime);
    }
  }

  async endSession(sessionId: string): Promise<ICognitiveCoreResponse<void>> {
    const startTime = Date.now();

    try {
      await this.sessionRepository.endSession(sessionId);
      return createResponse(true, undefined, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'SESSION_END_ERROR',
        message: error instanceof Error ? error.message : 'Failed to end session',
      }, startTime);
    }
  }

  async updateSessionContext(
    sessionId: string,
    context: Partial<ISessionContext>
  ): Promise<ICognitiveCoreResponse<IUserSession>> {
    const startTime = Date.now();

    try {
      const session = await this.sessionRepository.getById(sessionId);
      if (!session) {
        return createResponse(false, undefined, {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        }, startTime);
      }

      session.context = { ...session.context, ...context };
      session.lastActivityAt = new Date();

      await this.sessionRepository.update(session);

      return createResponse(true, session, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'CONTEXT_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update context',
      }, startTime);
    }
  }

  // ============================================================================
  // MESSAGE PROCESSING
  // ============================================================================

  async processMessage(
    command: IProcessMessageCommand
  ): Promise<ICognitiveCoreResponse<IMessageProcessingResult>> {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();

    try {
      // Get session
      const session = await this.sessionRepository.getById(command.sessionId);
      if (!session) {
        return createResponse(false, undefined, {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        }, startTime);
      }

      // Emit message received event
      await this.emitEvent<IMessageReceivedEvent>({
        eventId: generateId(),
        eventType: 'MESSAGE_RECEIVED',
        aggregateId: command.sessionId,
        aggregateType: 'conversation',
        timestamp: new Date(),
        version: 1,
        payload: {
          messageId: command.metadata?.messageId || generateId(),
          userId: command.userId,
          sessionId: command.sessionId,
          text: command.text,
          timestamp: command.metadata?.timestamp || new Date(),
        },
        metadata: this.createMetadata(command.userId, command.sessionId, correlationId),
      });

      // Detect language
      const language = detectLanguage(command.text);
      session.context.language = language;

      // 🚨 LAYER 1: Immediate raw text crisis check (BEFORE cognitive analysis)
      // This catches crisis indicators even if cognitive analysis interprets text differently
      const immediateCheck = this.crisisDetector.quickCheck(command.text);
      let earlyWarningTriggered = false;

      if (immediateCheck) {
        earlyWarningTriggered = true;
        // Log early warning but continue processing
        // Full crisis detection will happen after state update
      }

      // 1. Cognitive analysis
      const analysis = await this.cognitiveMirror.analyzeText(command.text, command.userId);

      // Extract distortions from thoughts
      const allDistortions = analysis.thoughts.flatMap(t => t.distortions);

      // Emit cognitive analysis event
      await this.emitEvent<TextAnalysisResultCompletedEvent>({
        eventId: generateId(),
        eventType: 'COGNITIVE_ANALYSIS_COMPLETED',
        aggregateId: command.userId,
        aggregateType: 'cognitive_state',
        timestamp: new Date(),
        version: 1,
        payload: {
          userId: command.userId,
          messageId: command.metadata?.messageId || '',
          analysis,
          distortionsDetected: allDistortions.map(d => d.type),
          insightsGenerated: 0,
        },
        metadata: this.createMetadata(command.userId, command.sessionId, correlationId),
      });

      // 2. Create observation from analysis
      const observation = this.createObservationFromAnalysis(analysis, command.text);

      // 3. Update belief state
      const previousBelief = session.currentBelief;
      const beliefUpdate = this.beliefEngine.updateBelief(previousBelief, observation);
      const newBelief = beliefUpdate.newBelief;

      // Emit belief update event
      await this.emitEvent<IBeliefUpdatedEvent>({
        eventId: generateId(),
        eventType: 'BELIEF_UPDATED',
        aggregateId: command.userId,
        aggregateType: 'cognitive_state',
        timestamp: new Date(),
        version: 1,
        payload: {
          userId: command.userId,
          observation,
          previousBelief,
          newBelief,
          informationGain: beliefUpdate.informationGain,
        },
        metadata: this.createMetadata(command.userId, command.sessionId, correlationId),
      });

      // 4. Convert belief to state
      const previousState = session.currentState;
      const newState = this.beliefEngine.beliefToStateVector(newBelief);

      // Emit state update event
      await this.emitEvent<IStateUpdatedEvent>({
        eventId: generateId(),
        eventType: 'STATE_UPDATED',
        aggregateId: command.userId,
        aggregateType: 'cognitive_state',
        timestamp: new Date(),
        version: 1,
        payload: {
          userId: command.userId,
          previousState,
          newState,
          trigger: 'message',
          changes: this.calculateStateChanges(previousState, newState),
        },
        metadata: this.createMetadata(command.userId, command.sessionId, correlationId),
      });

      // 5. Multi-layer crisis detection (combines raw text + patterns + state)
      const stateRiskData: StateRiskData = {
        overallRiskLevel: newState.risk.overallRiskLevel,
        suicidalIdeation: newState.risk.suicidalIdeation,
        selfHarmRisk: newState.risk.selfHarmRisk,
        emotionalValence: newState.emotional.vad.valence,
        recentTrend: 'stable', // TODO: calculate from history
      };

      // Full multi-layer crisis detection
      const crisisResult = this.crisisDetector.detect(command.text, stateRiskData);

      // Crisis is detected if multi-layer detector says so OR early warning was triggered
      const crisisDetected = crisisResult.isCrisis || earlyWarningTriggered;

      // Also check legacy indicators for backwards compatibility
      const legacyCrisis = this.checkCrisis(analysis, newState);
      const finalCrisisDetected = crisisDetected || legacyCrisis;

      if (finalCrisisDetected) {
        session.context.crisisMode = true;

        // Combine indicators from all sources
        const allTriggerIndicators = [
          ...crisisResult.allIndicators,
          ...(earlyWarningTriggered ? ['early_warning_raw_text'] : []),
          ...this.extractCrisisIndicators(analysis),
        ];

        await this.emitEvent<ICrisisDetectedEvent>({
          eventId: generateId(),
          eventType: 'CRISIS_DETECTED',
          aggregateId: command.userId,
          aggregateType: 'user_session',
          timestamp: new Date(),
          version: 1,
          payload: {
            userId: command.userId,
            sessionId: command.sessionId,
            riskLevel: Math.max(newState.risk.overallRiskLevel, crisisResult.confidence),
            triggerIndicators: [...new Set(allTriggerIndicators)],
            recommendedAction: crisisResult.recommendedAction || 'immediate_response',
            crisisType: crisisResult.crisisType || 'acute_distress',
          },
          metadata: this.createMetadata(command.userId, command.sessionId, correlationId),
        });
      }

      // 6. Generate insights
      const insights = await this.generateInsightsFromAnalysis(analysis, newState, allDistortions);

      // 7. Generate Socratic questions if appropriate
      let socraticQuestions: SocraticQuestion[] | undefined;
      if (allDistortions.length > 0 && !finalCrisisDetected && analysis.thoughts.length > 0) {
        const firstThought = analysis.thoughts[0];
        socraticQuestions = await this.cognitiveMirror.generateSocraticQuestions(
          firstThought,
          2
        );
      }

      // 8. Get intervention recommendation if appropriate
      let recommendedIntervention: IInterventionSelection | undefined;
      if (this.config.autoInterventionEnabled) {
        const contextFeatures = this.stateToContextFeatures(newState, session);
        const shouldDeliver = await this.interventionOptimizer.shouldDeliver(
          command.userId,
          contextFeatures,
          finalCrisisDetected ? 'crisis_triggered' : 'event_triggered'
        );

        if (shouldDeliver) {
          recommendedIntervention = await this.interventionOptimizer.selectIntervention(
            command.userId,
            contextFeatures,
            this.interventions.filter(i => i.isActive)
          );

          await this.emitEvent<IInterventionSelectedEvent>({
            eventId: generateId(),
            eventType: 'INTERVENTION_SELECTED',
            aggregateId: command.userId,
            aggregateType: 'intervention',
            timestamp: new Date(),
            version: 1,
            payload: {
              userId: command.userId,
              sessionId: command.sessionId,
              selection: recommendedIntervention,
              decisionPointId: recommendedIntervention.decisionPoint.id,
              wasExploration: recommendedIntervention.isExploration,
            },
            metadata: this.createMetadata(command.userId, command.sessionId, correlationId),
          });
        }
      }

      // 9. Generate response suggestions
      const responseSuggestions = this.generateResponseSuggestions(
        analysis,
        insights,
        socraticQuestions,
        recommendedIntervention,
        finalCrisisDetected,
        language
      );

      // Update session
      session.currentState = newState;
      session.currentBelief = newBelief;
      session.messageCount++;
      session.lastActivityAt = new Date();

      await this.sessionRepository.update(session);

      // Save state
      await this.stateRepository.saveState(command.userId, newState);
      await this.stateRepository.saveBelief(command.userId, newBelief);

      const result: IMessageProcessingResult = {
        analysis,
        newState,
        newBelief,
        insights,
        socraticQuestions,
        crisisDetected: finalCrisisDetected,
        recommendedIntervention,
        responseSuggestions,
      };

      return createResponse(true, result, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'MESSAGE_PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process message',
        details: error,
      }, startTime);
    }
  }

  async analyzeText(
    text: string,
    language?: 'en' | 'ru'
  ): Promise<ICognitiveCoreResponse<TextAnalysisResult>> {
    const startTime = Date.now();

    try {
      // Use anonymous user for stateless analysis
      const _detectedLanguage = language || detectLanguage(text);
      const analysis = await this.cognitiveMirror.analyzeText(text, 'anonymous');
      return createResponse(true, analysis, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to analyze text',
      }, startTime);
    }
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  async getUserState(
    query: IUserStateQuery
  ): Promise<ICognitiveCoreResponse<IUserStateResult>> {
    const startTime = Date.now();

    try {
      const currentState = await this.stateRepository.getState(query.userId);
      const currentBelief = await this.stateRepository.getBelief(query.userId);

      if (!currentState || !currentBelief) {
        return createResponse(false, undefined, {
          code: 'USER_NOT_FOUND',
          message: 'User state not found',
        }, startTime);
      }

      const result: IUserStateResult = {
        userId: query.userId,
        currentState,
        currentBelief,
        lastUpdated: new Date(),
      };

      if (query.includeHistory) {
        result.history = await this.stateRepository.getStateHistory(
          query.userId,
          query.historyLimit || 50
        );
      }

      if (query.includePredictions) {
        const horizons = query.predictionHorizons || ['24h'];
        result.predictions = {};

        for (const horizon of horizons) {
          const prediction = await this.temporalEngine.predictAtHorizon(currentState, horizon);
          result.predictions[horizon] = prediction;
        }
      }

      return createResponse(true, result, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'STATE_QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to query state',
      }, startTime);
    }
  }

  async recordObservation(
    command: IRecordObservationCommand
  ): Promise<ICognitiveCoreResponse<{ state: IStateVector; belief: BeliefState }>> {
    const startTime = Date.now();

    try {
      let currentBelief = await this.stateRepository.getBelief(command.userId);
      if (!currentBelief) {
        currentBelief = this.beliefEngine.initializeBelief();
      }

      const beliefUpdate = this.beliefEngine.updateBelief(currentBelief, command.observation);
      const newBelief = beliefUpdate.newBelief;
      const newState = this.beliefEngine.beliefToStateVector(newBelief);

      await this.stateRepository.saveState(command.userId, newState);
      await this.stateRepository.saveBelief(command.userId, newBelief);

      return createResponse(true, { state: newState, belief: newBelief }, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'OBSERVATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to record observation',
      }, startTime);
    }
  }

  async getPredictions(
    userId: string,
    horizons: Array<'6h' | '12h' | '24h' | '72h' | '1w'> = ['24h']
  ): Promise<ICognitiveCoreResponse<Record<string, ITemporalPrediction>>> {
    const startTime = Date.now();

    try {
      const currentState = await this.stateRepository.getState(userId);
      if (!currentState) {
        return createResponse(false, undefined, {
          code: 'USER_NOT_FOUND',
          message: 'User state not found',
        }, startTime);
      }

      const predictions: Record<string, ITemporalPrediction> = {};
      for (const horizon of horizons) {
        predictions[horizon] = await this.temporalEngine.predictAtHorizon(currentState, horizon);
      }

      return createResponse(true, predictions, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'PREDICTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate predictions',
      }, startTime);
    }
  }

  async getVulnerabilityWindows(
    userId: string
  ): Promise<ICognitiveCoreResponse<IVulnerabilityWindow[]>> {
    const startTime = Date.now();

    try {
      const currentState = await this.stateRepository.getState(userId);
      if (!currentState) {
        return createResponse(false, undefined, {
          code: 'USER_NOT_FOUND',
          message: 'User state not found',
        }, startTime);
      }

      // Get state history for trajectory prediction
      const stateHistory = await this.stateRepository.getStateHistory(userId, 50);

      // Generate trajectory predictions
      const trajectory = await this.temporalEngine.predictTrajectory(
        currentState,
        stateHistory,
        ['6h', '12h', '24h', '72h']
      );

      // Detect vulnerability windows from trajectory
      const windows = this.temporalEngine.detectVulnerabilityWindows(trajectory);
      return createResponse(true, windows, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'VULNERABILITY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to identify vulnerability windows',
      }, startTime);
    }
  }

  // ============================================================================
  // INTERVENTION
  // ============================================================================

  async requestIntervention(
    command: IRequestInterventionCommand
  ): Promise<ICognitiveCoreResponse<IInterventionSelection>> {
    const startTime = Date.now();

    try {
      const session = await this.sessionRepository.getById(command.sessionId);
      if (!session) {
        return createResponse(false, undefined, {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        }, startTime);
      }

      const contextFeatures = this.stateToContextFeatures(session.currentState, session);

      // Filter interventions if specific category requested
      let availableInterventions = this.interventions.filter(i => i.isActive);
      if (command.context?.specificCategory) {
        availableInterventions = availableInterventions.filter(
          i => i.category === command.context!.specificCategory
        );
      }

      const selection = await this.interventionOptimizer.selectIntervention(
        command.userId,
        contextFeatures,
        availableInterventions
      );

      // Update session
      session.interventionsDelivered++;
      session.context.lastInterventionAt = new Date();
      session.pendingOutcomes.push(selection.decisionPoint.id);
      await this.sessionRepository.update(session);

      return createResponse(true, selection, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'INTERVENTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to select intervention',
      }, startTime);
    }
  }

  async recordOutcome(
    command: IRecordOutcomeCommand
  ): Promise<ICognitiveCoreResponse<void>> {
    const startTime = Date.now();

    try {
      const outcome: IInterventionOutcome = {
        decisionPointId: command.decisionPointId,
        userId: command.userId,
        interventionId: command.interventionId,
        timestamp: new Date(),
        latencySeconds: 60,
        outcomeType: command.outcomeType,
        value: command.value,
        rawValue: command.value,
        confidence: 0.9,
      };

      await this.interventionOptimizer.recordOutcome(outcome);

      return createResponse(true, undefined, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'OUTCOME_ERROR',
        message: error instanceof Error ? error.message : 'Failed to record outcome',
      }, startTime);
    }
  }

  async getInterventionHistory(
    query: IInterventionHistoryQuery
  ): Promise<ICognitiveCoreResponse<IInterventionHistoryResult>> {
    const startTime = Date.now();

    try {
      const profile = await this.interventionOptimizer.getUserProfile(query.userId);

      const interventions: Array<{
        interventionId: string;
        category: string;
        deliveredAt: Date;
        outcome?: IInterventionOutcome;
        reward?: number;
      }> = [];

      for (const [interventionId, stats] of Object.entries(profile.interventionStats)) {
        const intervention = await this.interventionOptimizer.getIntervention(interventionId);
        if (intervention) {
          interventions.push({
            interventionId,
            category: intervention.category,
            deliveredAt: stats.lastDelivered || new Date(),
            reward: stats.averageReward,
          });
        }
      }

      const result: IInterventionHistoryResult = {
        total: profile.totalInterventions,
        interventions: interventions.slice(0, query.limit || 50),
        statistics: {
          byCategory: Object.fromEntries(
            Object.entries(profile.categoryHistory).map(([cat, stats]) => [cat, stats.count])
          ),
          averageReward: profile.averageOutcomeImprovement,
          completionRate: profile.completionRate,
        },
      };

      return createResponse(true, result, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'HISTORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get intervention history',
      }, startTime);
    }
  }

  async getAvailableInterventions(
    userId: string
  ): Promise<ICognitiveCoreResponse<IInterventionSelection[]>> {
    const startTime = Date.now();

    try {
      const session = await this.sessionRepository.getActiveSession(userId);
      if (!session) {
        return createResponse(false, undefined, {
          code: 'SESSION_NOT_FOUND',
          message: 'No active session',
        }, startTime);
      }

      const contextFeatures = this.stateToContextFeatures(session.currentState, session);

      const recommendations = await this.interventionOptimizer.getTopKRecommendations(
        userId,
        contextFeatures,
        5,
        this.interventions.filter(i => i.isActive)
      );

      return createResponse(true, recommendations, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'AVAILABLE_INTERVENTIONS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get available interventions',
      }, startTime);
    }
  }

  // ============================================================================
  // INSIGHTS & RECOMMENDATIONS
  // ============================================================================

  async generateInsights(
    userId: string
  ): Promise<ICognitiveCoreResponse<ITherapeuticInsight[]>> {
    const startTime = Date.now();

    try {
      const currentState = await this.stateRepository.getState(userId);
      if (!currentState) {
        return createResponse(false, undefined, {
          code: 'USER_NOT_FOUND',
          message: 'User state not found',
        }, startTime);
      }

      const insight = await this.cognitiveMirror.generateInsight({
        userId,
        insightType: 'pattern_observation',
      });

      return createResponse(true, insight ? [insight] : [], undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'INSIGHT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate insights',
      }, startTime);
    }
  }

  async generateSocraticQuestions(
    userId: string,
    count: number = 3
  ): Promise<ICognitiveCoreResponse<SocraticQuestion[]>> {
    const startTime = Date.now();

    try {
      const currentState = await this.stateRepository.getState(userId);
      if (!currentState) {
        return createResponse(false, undefined, {
          code: 'USER_NOT_FOUND',
          message: 'User state not found',
        }, startTime);
      }

      const questions: SocraticQuestion[] = [];
      const distortions = currentState.cognitive.activeDistortions;

      // Create a synthetic thought from active distortions for Socratic questioning
      if (distortions.length > 0) {
        const syntheticThought = {
          id: generateId(),
          content: 'Current cognitive pattern',
          type: 'automatic_negative' as const,
          distortions: distortions.map(d => ({
            type: d.type,
            confidence: d.confidence,
            evidence: d.triggeredBy ? [d.triggeredBy] : [],
          })),
          cognitiveTriadTarget: 'self' as const,
          believability: 0.7,
          timestamp: new Date(),
          confidence: 0.7,
        };

        const thoughtQuestions = await this.cognitiveMirror.generateSocraticQuestions(
          syntheticThought,
          count
        );
        questions.push(...thoughtQuestions);
      }

      return createResponse(true, questions.slice(0, count), undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'SOCRATIC_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate questions',
      }, startTime);
    }
  }

  // ============================================================================
  // CRISIS MANAGEMENT
  // ============================================================================

  async checkCrisisStatus(
    userId: string
  ): Promise<ICognitiveCoreResponse<{
    isCrisis: boolean;
    riskLevel: number;
    indicators: string[];
    recommendedAction: string;
  }>> {
    const startTime = Date.now();

    try {
      const currentState = await this.stateRepository.getState(userId);
      if (!currentState) {
        return createResponse(true, {
          isCrisis: false,
          riskLevel: 0,
          indicators: [],
          recommendedAction: 'continue_monitoring',
        }, undefined, startTime);
      }

      // Convert risk level string to numeric value
      const riskLevelMap: Record<string, number> = {
        none: 0,
        low: 0.2,
        medium: 0.4,
        high: 0.7,
        critical: 0.85,
      };
      const riskLevel = riskLevelMap[currentState.risk.level] ?? 0;
      const isCrisis = riskLevel >= 0.7;
      const indicators: string[] = [];

      // Check category risks
      const suicidalRisk = currentState.risk.categoryRisks?.['suicidal_ideation'];
      const selfHarmRisk = currentState.risk.categoryRisks?.['self_harm'];

      if (suicidalRisk && riskLevelMap[suicidalRisk.level] > 0.3) {
        indicators.push('suicidal_ideation');
      }
      if (selfHarmRisk && riskLevelMap[selfHarmRisk.level] > 0.3) {
        indicators.push('self_harm_risk');
      }
      if (currentState.emotional.arousal > 0.8) indicators.push('high_arousal');
      if (currentState.emotional.valence < -0.7) indicators.push('very_negative_mood');

      const recommendedAction = isCrisis
        ? 'immediate_intervention'
        : riskLevel > 0.5
        ? 'close_monitoring'
        : 'continue_monitoring';

      return createResponse(true, {
        isCrisis,
        riskLevel,
        indicators,
        recommendedAction,
      }, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'CRISIS_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check crisis status',
      }, startTime);
    }
  }

  async activateCrisisMode(
    userId: string,
    sessionId: string
  ): Promise<ICognitiveCoreResponse<void>> {
    const startTime = Date.now();

    try {
      const session = await this.sessionRepository.getById(sessionId);
      if (session) {
        session.context.crisisMode = true;
        await this.sessionRepository.update(session);
      }
      return createResponse(true, undefined, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'CRISIS_ACTIVATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to activate crisis mode',
      }, startTime);
    }
  }

  async deactivateCrisisMode(
    userId: string,
    sessionId: string
  ): Promise<ICognitiveCoreResponse<void>> {
    const startTime = Date.now();

    try {
      const session = await this.sessionRepository.getById(sessionId);
      if (session) {
        session.context.crisisMode = false;
        await this.sessionRepository.update(session);
      }
      return createResponse(true, undefined, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'CRISIS_DEACTIVATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to deactivate crisis mode',
      }, startTime);
    }
  }

  // ============================================================================
  // DATA MANAGEMENT
  // ============================================================================

  async exportUserData(
    userId: string
  ): Promise<ICognitiveCoreResponse<{
    states: IStateVector[];
    sessions: IUserSession[];
    interventions: Array<{ intervention: IIntervention; outcome?: IInterventionOutcome }>;
    events: IDomainEvent[];
  }>> {
    const startTime = Date.now();

    try {
      const stateHistory = await this.stateRepository.getStateHistory(userId, 1000);
      const sessions = await this.sessionRepository.getSessionHistory(userId, 100);
      const events = await this.eventStore.readStream(`user-${userId}`, 0, 10000);

      return createResponse(true, {
        states: stateHistory.map(h => h.state),
        sessions,
        interventions: [],
        events,
      }, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export data',
      }, startTime);
    }
  }

  async deleteUserData(userId: string): Promise<ICognitiveCoreResponse<void>> {
    const startTime = Date.now();

    try {
      await this.stateRepository.deleteUserData(userId);
      return createResponse(true, undefined, undefined, startTime);
    } catch (error) {
      return createResponse(false, undefined, {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete data',
      }, startTime);
    }
  }

  // ============================================================================
  // EVENT SUBSCRIPTIONS
  // ============================================================================

  subscribeToEvents<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): IEventSubscription {
    return this.eventBus.subscribe(eventType, handler);
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Emit domain event
   */
  private async emitEvent<T extends IDomainEvent>(event: T): Promise<void> {
    if (this.config.enableEventSourcing) {
      await this.eventStore.append(event.aggregateId, event);
    } else if (this.config.enableRealTimeEvents) {
      await this.eventBus.publish(event);
    }
  }

  /**
   * Create event metadata
   */
  private createMetadata(
    userId: string,
    sessionId: string,
    correlationId?: string
  ): IEventMetadata {
    return {
      correlationId: correlationId || generateCorrelationId(),
      userId,
      sessionId,
      source: 'cognitive-core',
    };
  }

  /**
   * Create observation from cognitive analysis
   */
  private createObservationFromAnalysis(
    analysis: TextAnalysisResult,
    text: string
  ): Observation {
    // Extract emotional indicators from EmotionalConsequence objects
    const emotions = analysis.emotions || [];
    const hasNegativeEmotion = emotions.some(e =>
      e.valence < -0.3 || ['sad', 'angry', 'fearful', 'anxious', 'stressed'].includes(e.emotion)
    );
    const hasPositiveEmotion = emotions.some(e =>
      e.valence > 0.3 || ['happy', 'joyful', 'hopeful', 'calm', 'content'].includes(e.emotion)
    );

    // Extract distortions from thoughts
    const allDistortions = analysis.thoughts.flatMap(t => t.distortions);

    // Estimate valence from analysis
    let valence = 0;
    if (hasNegativeEmotion) valence -= 0.3;
    if (hasPositiveEmotion) valence += 0.3;
    if (allDistortions.length > 0) valence -= 0.1 * allDistortions.length;

    // Estimate arousal from punctuation and caps
    const hasExclamation = text.includes('!');
    const hasCaps = text.toUpperCase() === text && text.length > 3;
    let arousal = 0.5;
    if (hasExclamation) arousal += 0.1;
    if (hasCaps) arousal += 0.2;

    // Check for crisis indicators
    const crisisIndicators = this.extractCrisisIndicators(analysis);

    // Determine which components this observation informs
    const informsComponents: ('emotional' | 'cognitive' | 'narrative' | 'risk' | 'resources')[] = ['emotional', 'cognitive'];
    if (crisisIndicators.length > 0) {
      informsComponents.push('risk');
    }

    return {
      id: generateId(),
      type: 'text_message',
      timestamp: new Date(),
      data: {
        text,
        valence,
        arousal,
        distortions: allDistortions.map(d => d.type),
        distortionCount: allDistortions.length,
        insightLevel: analysis.metrics.insightReadiness,
        crisisIndicators,
        analysis,
      },
      reliability: 0.7,
      informsComponents,
    };
  }

  /**
   * Calculate state changes
   */
  private calculateStateChanges(
    previousState: IStateVector,
    newState: IStateVector
  ): Array<{
    dimension: 'emotional' | 'cognitive' | 'narrative' | 'risk' | 'resource';
    field: string;
    previousValue: unknown;
    newValue: unknown;
    changeType: 'increase' | 'decrease' | 'transition';
    magnitude: number;
  }> {
    const changes: Array<{
      dimension: 'emotional' | 'cognitive' | 'narrative' | 'risk' | 'resource';
      field: string;
      previousValue: unknown;
      newValue: unknown;
      changeType: 'increase' | 'decrease' | 'transition';
      magnitude: number;
    }> = [];

    // Check emotional changes
    const valenceDiff = newState.emotional.valence - previousState.emotional.valence;
    if (Math.abs(valenceDiff) > 0.1) {
      changes.push({
        dimension: 'emotional',
        field: 'valence',
        previousValue: previousState.emotional.valence,
        newValue: newState.emotional.valence,
        changeType: valenceDiff > 0 ? 'increase' : 'decrease',
        magnitude: Math.abs(valenceDiff),
      });
    }

    // Check risk changes
    const riskDiff = newState.risk.overallRiskLevel - previousState.risk.overallRiskLevel;
    if (Math.abs(riskDiff) > 0.1) {
      changes.push({
        dimension: 'risk',
        field: 'overallRiskLevel',
        previousValue: previousState.risk.overallRiskLevel,
        newValue: newState.risk.overallRiskLevel,
        changeType: riskDiff > 0 ? 'increase' : 'decrease',
        magnitude: Math.abs(riskDiff),
      });
    }

    return changes;
  }

  /**
   * Extract crisis indicators from analysis
   */
  private extractCrisisIndicators(analysis: TextAnalysisResult): string[] {
    const indicators: string[] = [];

    // Check for crisis-related emotions
    const crisisEmotions = ['despair', 'hopeless', 'suicidal', 'panic'];
    for (const emotion of analysis.emotions) {
      if (crisisEmotions.includes(emotion.emotion) || emotion.intensity > 0.9) {
        indicators.push(`high_intensity_${emotion.emotion}`);
      }
    }

    // Check for crisis-related thoughts
    for (const thought of analysis.thoughts) {
      if (thought.content.toLowerCase().includes('suicide') ||
          thought.content.toLowerCase().includes('самоубийств') ||
          thought.content.toLowerCase().includes('не хочу жить') ||
          thought.content.toLowerCase().includes('don\'t want to live')) {
        indicators.push('suicidal_content');
      }
      if (thought.content.toLowerCase().includes('вред себе') ||
          thought.content.toLowerCase().includes('hurt myself') ||
          thought.content.toLowerCase().includes('harm myself')) {
        indicators.push('self_harm_content');
      }
    }

    // Check for high overall negativity
    if (analysis.metrics.overallNegativity > 0.8) {
      indicators.push('extreme_negativity');
    }

    return indicators;
  }

  /**
   * Check for crisis indicators
   */
  private checkCrisis(analysis: TextAnalysisResult, state: IStateVector): boolean {
    const crisisIndicators = this.extractCrisisIndicators(analysis);
    if (crisisIndicators.length > 0) return true;
    if (state.risk.overallRiskLevel > 0.7) return true;
    if (state.risk.suicidalIdeation > 0.5) return true;
    if (state.risk.selfHarmRisk > 0.5) return true;
    return false;
  }

  /**
   * Generate insights from analysis
   */
  private async generateInsightsFromAnalysis(
    analysis: TextAnalysisResult,
    state: IStateVector,
    allDistortions?: Array<{ type: string }>
  ): Promise<ITherapeuticInsight[]> {
    const insights: ITherapeuticInsight[] = [];

    // Extract distortions if not provided
    const distortions = allDistortions || analysis.thoughts.flatMap(t => t.distortions);

    // Pattern observation if distortions detected
    if (distortions.length > 0 && analysis.chains.length > 0) {
      const insight = await this.cognitiveMirror.generateInsight({
        userId: state.userId,
        currentChain: analysis.chains[0],
        insightType: 'pattern_observation',
      });
      if (insight) insights.push(insight);
    }

    return insights;
  }

  /**
   * Convert state to contextual features for intervention optimizer
   */
  private stateToContextFeatures(
    state: IStateVector,
    session: IUserSession
  ): IContextualFeatures {
    return {
      valence: state.emotional.valence,
      arousal: state.emotional.arousal,
      dominance: state.emotional.dominance,
      emotionalStability: 1 - state.emotional.emotionalLability,
      moodTrend: 'stable',
      cognitiveDistortionCount: state.cognitive.activeDistortions.length,
      primaryDistortion: state.cognitive.activeDistortions[0]?.type,
      cognitiveFlexibility: state.cognitive.thinkingStyle.flexibility,
      insightLevel: state.cognitive.metacognition.selfAwareness,
      energyLevel: state.resources.energy.current,
      copingCapacity: state.resources.cognitiveCapacity.available,
      socialSupport: state.resources.socialResources.network.qualityScore,
      riskLevel: state.risk.overallRiskLevel,
      crisisProximity: state.risk.crisisProximity,
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      minutesSinceLastInteraction: session.lastActivityAt
        ? (Date.now() - session.lastActivityAt.getTime()) / 60000
        : 0,
      sessionsToday: 1,
      sessionsTotalLifetime: session.messageCount,
      daysSinceFirstSession: 1,
      averageSessionDuration: 300,
      completionRate: 0.7,
      engagementScore: 0.8,
      preferredIntensity: 'brief',
      interventionFatigue: Math.min(1, session.interventionsDelivered / 10),
      categoryExposureCounts: {} as Record<string, number>,
    };
  }

  /**
   * Generate response suggestions for bot
   */
  private generateResponseSuggestions(
    analysis: TextAnalysisResult,
    insights: ITherapeuticInsight[],
    socraticQuestions?: SocraticQuestion[],
    recommendedIntervention?: IInterventionSelection,
    crisisDetected?: boolean,
    language: 'en' | 'ru' = 'ru'
  ): IResponseSuggestion[] {
    const suggestions: IResponseSuggestion[] = [];

    // Crisis response takes highest priority
    if (crisisDetected) {
      suggestions.push({
        type: 'crisis_response',
        priority: 10,
        content: {
          text: language === 'ru'
            ? 'Я вижу, что тебе сейчас очень тяжело. Твоя безопасность важнее всего. Если тебе нужна срочная помощь, позвони на линию доверия: 8-800-2000-122 (бесплатно по России).'
            : 'I can see you\'re going through a very difficult time. Your safety matters most. If you need immediate help, please call: 988 (US crisis line).',
        },
        rationale: 'Crisis indicators detected',
      });
    }

    // Intervention suggestion
    if (recommendedIntervention) {
      const intervention = recommendedIntervention.intervention;
      const content = language === 'ru'
        ? intervention.content.ru.mainContent
        : intervention.content.en.mainContent;

      suggestions.push({
        type: 'intervention',
        priority: crisisDetected ? 8 : 7,
        content: {
          text: content,
          buttons: [
            { label: language === 'ru' ? 'Попробовать' : 'Try it', callbackData: `intervention:${intervention.id}:start` },
            { label: language === 'ru' ? 'Позже' : 'Later', callbackData: `intervention:${intervention.id}:skip` },
          ],
        },
        rationale: recommendedIntervention.reasoning.primaryFactor,
      });
    }

    // Insight-based response
    if (insights.length > 0) {
      const insight = insights[0];
      suggestions.push({
        type: 'text',
        priority: 5,
        content: {
          text: insight.content,
        },
        rationale: `Insight type: ${insight.type}`,
      });
    }

    // Socratic question
    if (socraticQuestions && socraticQuestions.length > 0 && !crisisDetected) {
      const question = socraticQuestions[0];
      suggestions.push({
        type: 'question',
        priority: 4,
        content: {
          text: question.question,
        },
        rationale: `Socratic question type: ${question.type}`,
      });
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    return suggestions;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Factory function for creating Cognitive Core API
 */
export const createCognitiveCoreAPI: CreateCognitiveCoreAPI = async (
  config?: Partial<ICognitiveCoreConfig>
) => {
  const fullConfig = { ...DEFAULT_COGNITIVE_CORE_CONFIG, ...config };
  return new CognitiveCoreAPI(fullConfig);
};
