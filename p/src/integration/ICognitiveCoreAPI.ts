/**
 * 🔌 COGNITIVE CORE API - INTERFACES
 * ===================================
 * Phase 3.5: Integration & API Layer
 *
 * Architecture Patterns (2024-2025 Research):
 * - Clean Architecture with Facade Pattern
 * - Event-Driven Architecture (EDA) for loose coupling
 * - CQRS for read/write separation
 * - Domain Events for cross-aggregate communication
 * - Event Sourcing for audit trails (HIPAA compliance)
 *
 * Scientific Foundation:
 * - Cardinal Health EDA (Current 2024) - Event streaming for healthcare
 * - reSolve/EvtStore patterns - CQRS + ES for Node.js
 * - PostgreSQL stateful conversations (Medium 2024)
 * - NestJS + EventStoreDB patterns (2024)
 * - Khalil Stemmler DDD patterns for TypeScript
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import type { IStateVector } from '../state/interfaces/IStateVector';
import type { TemporalPrediction } from '../state/interfaces/IStateVector';
import type { BeliefState, Observation } from '../belief/IBeliefUpdate';
import type { VulnerabilityWindow } from '../temporal/ITemporalPrediction';
import type { TextAnalysisResult, TherapeuticInsight, SocraticQuestion } from '../mirror/IDeepCognitiveMirror';
import type { IInterventionSelection, IIntervention, IInterventionOutcome } from '../intervention/IInterventionOptimizer';

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

/**
 * Base domain event interface
 * Following Khalil Stemmler's DDD patterns
 */
export interface IDomainEvent {
  /** Unique event ID */
  readonly eventId: string;

  /** Event type for routing */
  readonly eventType: string;

  /** Aggregate ID that generated this event */
  readonly aggregateId: string;

  /** Aggregate type */
  readonly aggregateType: 'user_session' | 'cognitive_state' | 'intervention' | 'conversation';

  /** Event timestamp */
  readonly timestamp: Date;

  /** Event version for schema evolution */
  readonly version: number;

  /** Event payload */
  readonly payload: unknown;

  /** Metadata (correlation ID, causation ID, etc.) */
  readonly metadata: IEventMetadata;
}

/**
 * Event metadata for tracing and correlation
 */
export interface IEventMetadata {
  /** Correlation ID for request tracing */
  correlationId: string;

  /** Causation ID - event that caused this event */
  causationId?: string;

  /** User ID if applicable */
  userId?: string;

  /** Session ID */
  sessionId?: string;

  /** Source system/component */
  source: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

// ============================================================================
// SPECIFIC DOMAIN EVENTS
// ============================================================================

/**
 * User session started event
 */
export interface IUserSessionStartedEvent extends IDomainEvent {
  eventType: 'USER_SESSION_STARTED';
  payload: {
    userId: string;
    sessionId: string;
    platform: 'telegram' | 'web' | 'api';
    initialContext?: Record<string, unknown>;
  };
}

/**
 * Message received event
 */
export interface IMessageReceivedEvent extends IDomainEvent {
  eventType: 'MESSAGE_RECEIVED';
  payload: {
    messageId: string;
    userId: string;
    sessionId: string;
    text: string;
    timestamp: Date;
    metadata?: {
      replyToMessageId?: string;
      hasMedia?: boolean;
      language?: string;
    };
  };
}

/**
 * State updated event
 */
export interface IStateUpdatedEvent extends IDomainEvent {
  eventType: 'STATE_UPDATED';
  payload: {
    userId: string;
    previousState: IStateVector;
    newState: IStateVector;
    trigger: 'message' | 'observation' | 'decay' | 'intervention';
    changes: IStateChange[];
  };
}

/**
 * State change details
 */
export interface IStateChange {
  dimension: 'emotional' | 'cognitive' | 'narrative' | 'risk' | 'resource';
  field: string;
  previousValue: unknown;
  newValue: unknown;
  changeType: 'increase' | 'decrease' | 'transition';
  magnitude: number;
}

/**
 * Belief updated event
 */
export interface IBeliefUpdatedEvent extends IDomainEvent {
  eventType: 'BELIEF_UPDATED';
  payload: {
    userId: string;
    observation: Observation;
    previousBelief: BeliefState;
    newBelief: BeliefState;
    informationGain: number;
  };
}

/**
 * Cognitive analysis completed event
 */
export interface TextAnalysisResultCompletedEvent extends IDomainEvent {
  eventType: 'COGNITIVE_ANALYSIS_COMPLETED';
  payload: {
    userId: string;
    messageId: string;
    analysis: TextAnalysisResult;
    distortionsDetected: string[];
    insightsGenerated: number;
  };
}

/**
 * Intervention selected event
 */
export interface IInterventionSelectedEvent extends IDomainEvent {
  eventType: 'INTERVENTION_SELECTED';
  payload: {
    userId: string;
    sessionId: string;
    selection: IInterventionSelection;
    decisionPointId: string;
    wasExploration: boolean;
  };
}

/**
 * Intervention delivered event
 */
export interface IInterventionDeliveredEvent extends IDomainEvent {
  eventType: 'INTERVENTION_DELIVERED';
  payload: {
    userId: string;
    interventionId: string;
    deliveryMethod: 'text' | 'interactive' | 'exercise';
    deliveredAt: Date;
    content: {
      text: string;
      buttons?: Array<{ label: string; callbackData: string }>;
    };
  };
}

/**
 * Intervention outcome recorded event
 */
export interface IInterventionOutcomeEvent extends IDomainEvent {
  eventType: 'INTERVENTION_OUTCOME';
  payload: {
    userId: string;
    interventionId: string;
    outcome: IInterventionOutcome;
    rewardSignal: number;
  };
}

/**
 * Crisis detected event
 */
export interface ICrisisDetectedEvent extends IDomainEvent {
  eventType: 'CRISIS_DETECTED';
  payload: {
    userId: string;
    sessionId: string;
    riskLevel: number;
    triggerIndicators: string[];
    recommendedAction: 'immediate_response' | 'escalate' | 'monitor';
    crisisType: 'self_harm' | 'suicidal_ideation' | 'acute_distress' | 'panic';
  };
}

/**
 * Vulnerability window detected event
 */
export interface VulnerabilityWindowEvent extends IDomainEvent {
  eventType: 'VULNERABILITY_WINDOW_DETECTED';
  payload: {
    userId: string;
    window: VulnerabilityWindow;
    recommendedInterventionTypes: string[];
  };
}

/**
 * Prediction generated event
 */
export interface IPredictionGeneratedEvent extends IDomainEvent {
  eventType: 'PREDICTION_GENERATED';
  payload: {
    userId: string;
    prediction: TemporalPrediction;
    horizon: '6h' | '12h' | '24h' | '72h' | '1w';
    confidence: number;
  };
}

// ============================================================================
// EVENT BUS INTERFACE
// ============================================================================

/**
 * Event handler function type
 */
export type EventHandler<T extends IDomainEvent = IDomainEvent> = (event: T) => Promise<void>;

/**
 * Event subscription
 */
export interface IEventSubscription {
  /** Subscription ID */
  id: string;

  /** Event type subscribed to */
  eventType: string;

  /** Handler function */
  handler: EventHandler;

  /** Unsubscribe function */
  unsubscribe: () => void;
}

/**
 * Event bus for domain event distribution
 * Implements Observer pattern for loose coupling
 */
export interface IEventBus {
  /**
   * Publish domain event
   * @param event - Event to publish
   */
  publish<T extends IDomainEvent>(event: T): Promise<void>;

  /**
   * Subscribe to event type
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function
   * @returns Subscription for unsubscribing
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): IEventSubscription;

  /**
   * Subscribe to multiple event types
   * @param eventTypes - Types of events to subscribe to
   * @param handler - Handler function
   * @returns Array of subscriptions
   */
  subscribeMany(
    eventTypes: string[],
    handler: EventHandler
  ): IEventSubscription[];

  /**
   * Unsubscribe by subscription ID
   * @param subscriptionId - ID of subscription to remove
   */
  unsubscribe(subscriptionId: string): void;

  /**
   * Clear all subscriptions
   */
  clearAll(): void;
}

// ============================================================================
// USER SESSION
// ============================================================================

/**
 * User session state
 * Aggregate root for user interaction context
 */
export interface IUserSession {
  /** Session ID */
  readonly sessionId: string;

  /** User ID */
  readonly userId: string;

  /** Platform (Telegram, web, API) */
  readonly platform: 'telegram' | 'web' | 'api';

  /** Session start time */
  readonly startedAt: Date;

  /** Last activity timestamp */
  lastActivityAt: Date;

  /** Session status */
  status: 'active' | 'idle' | 'ended';

  /** Current state vector */
  currentState: IStateVector;

  /** Current belief state */
  currentBelief: BeliefState;

  /** Message count in session */
  messageCount: number;

  /** Interventions delivered in session */
  interventionsDelivered: number;

  /** Session context */
  context: ISessionContext;

  /** Pending outcomes awaiting measurement */
  pendingOutcomes: string[];
}

/**
 * Session context
 */
export interface ISessionContext {
  /** Detected language */
  language: 'en' | 'ru';

  /** Age group */
  ageGroup?: 'child' | 'teen' | 'adult';

  /** Current conversation topic */
  currentTopic?: string;

  /** Active exercise if any */
  activeExercise?: {
    exerciseId: string;
    step: number;
    startedAt: Date;
  };

  /** Last intervention time */
  lastInterventionAt?: Date;

  /** Crisis mode active */
  crisisMode: boolean;

  /** Custom context data */
  customData: Record<string, unknown>;
}

// ============================================================================
// PERSISTENCE INTERFACES
// ============================================================================

/**
 * Event store for event sourcing
 * Enables full audit trail and state reconstruction
 */
export interface IEventStore {
  /**
   * Append event to stream
   * @param streamId - Stream identifier (usually aggregate ID)
   * @param event - Event to append
   * @param expectedVersion - Expected version for optimistic concurrency
   */
  append(
    streamId: string,
    event: IDomainEvent,
    expectedVersion?: number
  ): Promise<void>;

  /**
   * Append multiple events atomically
   * @param streamId - Stream identifier
   * @param events - Events to append
   * @param expectedVersion - Expected version
   */
  appendMany(
    streamId: string,
    events: IDomainEvent[],
    expectedVersion?: number
  ): Promise<void>;

  /**
   * Read events from stream
   * @param streamId - Stream identifier
   * @param fromVersion - Start version (inclusive)
   * @param count - Maximum events to read
   * @returns Events in order
   */
  readStream(
    streamId: string,
    fromVersion?: number,
    count?: number
  ): Promise<IDomainEvent[]>;

  /**
   * Read events by type across all streams
   * @param eventType - Event type to filter
   * @param fromTimestamp - Start timestamp
   * @param toTimestamp - End timestamp
   * @returns Matching events
   */
  readByType(
    eventType: string,
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<IDomainEvent[]>;

  /**
   * Get current version of stream
   * @param streamId - Stream identifier
   * @returns Current version number
   */
  getStreamVersion(streamId: string): Promise<number>;

  /**
   * Subscribe to stream for real-time updates
   * @param streamId - Stream identifier
   * @param handler - Event handler
   * @returns Subscription
   */
  subscribeToStream(
    streamId: string,
    handler: EventHandler
  ): IEventSubscription;
}

/**
 * State repository for read models (CQRS read side)
 */
export interface IStateRepository {
  /**
   * Get user's current state
   * @param userId - User identifier
   * @returns Current state or null
   */
  getState(userId: string): Promise<IStateVector | null>;

  /**
   * Save user's state
   * @param userId - User identifier
   * @param state - State to save
   */
  saveState(userId: string, state: IStateVector): Promise<void>;

  /**
   * Get user's belief state
   * @param userId - User identifier
   * @returns Current belief or null
   */
  getBelief(userId: string): Promise<BeliefState | null>;

  /**
   * Save user's belief state
   * @param userId - User identifier
   * @param belief - Belief to save
   */
  saveBelief(userId: string, belief: BeliefState): Promise<void>;

  /**
   * Get state history
   * @param userId - User identifier
   * @param limit - Maximum entries
   * @returns State history
   */
  getStateHistory(
    userId: string,
    limit?: number
  ): Promise<Array<{ state: IStateVector; timestamp: Date }>>;

  /**
   * Delete user data (GDPR right to erasure)
   * @param userId - User identifier
   */
  deleteUserData(userId: string): Promise<void>;
}

/**
 * Session repository
 */
export interface ISessionRepository {
  /**
   * Create new session
   * @param session - Session to create
   */
  create(session: IUserSession): Promise<void>;

  /**
   * Get session by ID
   * @param sessionId - Session identifier
   * @returns Session or null
   */
  getById(sessionId: string): Promise<IUserSession | null>;

  /**
   * Get active session for user
   * @param userId - User identifier
   * @returns Active session or null
   */
  getActiveSession(userId: string): Promise<IUserSession | null>;

  /**
   * Update session
   * @param session - Session to update
   */
  update(session: IUserSession): Promise<void>;

  /**
   * End session
   * @param sessionId - Session identifier
   */
  endSession(sessionId: string): Promise<void>;

  /**
   * Get session history
   * @param userId - User identifier
   * @param limit - Maximum sessions
   * @returns Session history
   */
  getSessionHistory(
    userId: string,
    limit?: number
  ): Promise<IUserSession[]>;
}

// ============================================================================
// QUERY INTERFACES (CQRS Read Side)
// ============================================================================

/**
 * User state query
 */
export interface IUserStateQuery {
  /** User identifier */
  userId: string;

  /** Include state history */
  includeHistory?: boolean;

  /** History limit */
  historyLimit?: number;

  /** Include predictions */
  includePredictions?: boolean;

  /** Prediction horizons */
  predictionHorizons?: Array<'6h' | '12h' | '24h' | '72h' | '1w'>;
}

/**
 * User state query result
 */
export interface IUserStateResult {
  /** User identifier */
  userId: string;

  /** Current state */
  currentState: IStateVector;

  /** Current belief */
  currentBelief: BeliefState;

  /** State history if requested */
  history?: Array<{ state: IStateVector; timestamp: Date }>;

  /** Predictions if requested */
  predictions?: Record<string, TemporalPrediction>;

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Intervention history query
 */
export interface IInterventionHistoryQuery {
  /** User identifier */
  userId: string;

  /** Start date */
  fromDate?: Date;

  /** End date */
  toDate?: Date;

  /** Categories filter */
  categories?: string[];

  /** Limit */
  limit?: number;
}

/**
 * Intervention history result
 */
export interface IInterventionHistoryResult {
  /** Total interventions */
  total: number;

  /** Interventions */
  interventions: Array<{
    interventionId: string;
    category: string;
    deliveredAt: Date;
    outcome?: IInterventionOutcome;
    reward?: number;
  }>;

  /** Statistics */
  statistics: {
    byCategory: Record<string, number>;
    averageReward: number;
    completionRate: number;
  };
}

// ============================================================================
// COMMAND INTERFACES (CQRS Write Side)
// ============================================================================

/**
 * Process message command
 */
export interface IProcessMessageCommand {
  /** User identifier */
  userId: string;

  /** Session identifier */
  sessionId: string;

  /** Message text */
  text: string;

  /** Message metadata */
  metadata?: {
    messageId: string;
    replyToMessageId?: string;
    timestamp: Date;
  };
}

/**
 * Record observation command
 */
export interface IRecordObservationCommand {
  /** User identifier */
  userId: string;

  /** Observation data */
  observation: Observation;

  /** Trigger source */
  source: 'message' | 'button' | 'exercise' | 'system';
}

/**
 * Request intervention command
 */
export interface IRequestInterventionCommand {
  /** User identifier */
  userId: string;

  /** Session identifier */
  sessionId: string;

  /** Request context */
  context?: {
    userInitiated: boolean;
    specificCategory?: string;
    preferredIntensity?: 'micro' | 'brief' | 'standard' | 'extended';
  };
}

/**
 * Record outcome command
 */
export interface IRecordOutcomeCommand {
  /** Decision point ID */
  decisionPointId: string;

  /** User identifier */
  userId: string;

  /** Intervention identifier */
  interventionId: string;

  /** Outcome type */
  outcomeType: 'engagement' | 'completion' | 'self_reported_mood' | 'user_rating';

  /** Outcome value */
  value: number;
}

// ============================================================================
// MAIN FACADE INTERFACE
// ============================================================================

/**
 * Cognitive Core API Response
 */
export interface ICognitiveCoreResponse<T> {
  /** Success flag */
  success: boolean;

  /** Response data */
  data?: T;

  /** Error if any */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Response metadata */
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: Date;
  };
}

/**
 * Message processing result
 */
export interface IMessageProcessingResult {
  /** Cognitive analysis */
  analysis: TextAnalysisResult;

  /** Updated state */
  newState: IStateVector;

  /** Updated belief */
  newBelief: BeliefState;

  /** Generated insights */
  insights: TherapeuticInsight[];

  /** Socratic questions if applicable */
  socraticQuestions?: SocraticQuestion[];

  /** Crisis detected */
  crisisDetected: boolean;

  /** Recommended intervention */
  recommendedIntervention?: IInterventionSelection;

  /** Response suggestions */
  responseSuggestions: IResponseSuggestion[];
}

/**
 * Response suggestion for bot
 */
export interface IResponseSuggestion {
  /** Suggestion type */
  type: 'text' | 'intervention' | 'exercise' | 'question' | 'crisis_response';

  /** Priority (1-10) */
  priority: number;

  /** Content */
  content: {
    text: string;
    buttons?: Array<{ label: string; callbackData: string }>;
  };

  /** Rationale */
  rationale: string;
}

/**
 * 🔌 Main Cognitive Core Facade API
 *
 * Provides simplified interface to the complex cognitive subsystem
 * Following Clean Architecture + Facade Pattern
 */
export interface ICognitiveCoreAPI {
  // ========================
  // SESSION MANAGEMENT
  // ========================

  /**
   * Start new user session
   * @param userId - User identifier
   * @param platform - Platform type
   * @param context - Initial context
   * @returns Session information
   */
  startSession(
    userId: string,
    platform: 'telegram' | 'web' | 'api',
    context?: Partial<ISessionContext>
  ): Promise<ICognitiveCoreResponse<IUserSession>>;

  /**
   * Get or create active session
   * @param userId - User identifier
   * @param platform - Platform type
   * @returns Active session
   */
  getOrCreateSession(
    userId: string,
    platform: 'telegram' | 'web' | 'api'
  ): Promise<ICognitiveCoreResponse<IUserSession>>;

  /**
   * End user session
   * @param sessionId - Session identifier
   */
  endSession(sessionId: string): Promise<ICognitiveCoreResponse<void>>;

  /**
   * Update session context
   * @param sessionId - Session identifier
   * @param context - Context updates
   */
  updateSessionContext(
    sessionId: string,
    context: Partial<ISessionContext>
  ): Promise<ICognitiveCoreResponse<IUserSession>>;

  // ========================
  // MESSAGE PROCESSING
  // ========================

  /**
   * Process incoming message (main entry point)
   * @param command - Process message command
   * @returns Full processing result
   */
  processMessage(
    command: IProcessMessageCommand
  ): Promise<ICognitiveCoreResponse<IMessageProcessingResult>>;

  /**
   * Analyze text without updating state
   * @param text - Text to analyze
   * @param language - Language hint
   * @returns Cognitive analysis only
   */
  analyzeText(
    text: string,
    language?: 'en' | 'ru'
  ): Promise<ICognitiveCoreResponse<TextAnalysisResult>>;

  // ========================
  // STATE MANAGEMENT
  // ========================

  /**
   * Get user state
   * @param query - State query
   * @returns User state result
   */
  getUserState(
    query: IUserStateQuery
  ): Promise<ICognitiveCoreResponse<IUserStateResult>>;

  /**
   * Record observation and update state
   * @param command - Observation command
   * @returns Updated state
   */
  recordObservation(
    command: IRecordObservationCommand
  ): Promise<ICognitiveCoreResponse<{ state: IStateVector; belief: BeliefState }>>;

  /**
   * Get temporal predictions
   * @param userId - User identifier
   * @param horizons - Prediction horizons
   * @returns Predictions
   */
  getPredictions(
    userId: string,
    horizons?: Array<'6h' | '12h' | '24h' | '72h' | '1w'>
  ): Promise<ICognitiveCoreResponse<Record<string, TemporalPrediction>>>;

  /**
   * Get vulnerability windows
   * @param userId - User identifier
   * @returns Current vulnerability windows
   */
  getVulnerabilityWindows(
    userId: string
  ): Promise<ICognitiveCoreResponse<VulnerabilityWindow[]>>;

  // ========================
  // INTERVENTION
  // ========================

  /**
   * Request intervention selection
   * @param command - Intervention request command
   * @returns Selected intervention
   */
  requestIntervention(
    command: IRequestInterventionCommand
  ): Promise<ICognitiveCoreResponse<IInterventionSelection>>;

  /**
   * Record intervention outcome
   * @param command - Outcome command
   */
  recordOutcome(
    command: IRecordOutcomeCommand
  ): Promise<ICognitiveCoreResponse<void>>;

  /**
   * Get intervention history
   * @param query - History query
   * @returns Intervention history
   */
  getInterventionHistory(
    query: IInterventionHistoryQuery
  ): Promise<ICognitiveCoreResponse<IInterventionHistoryResult>>;

  /**
   * Get available interventions for current context
   * @param userId - User identifier
   * @returns Available interventions with scores
   */
  getAvailableInterventions(
    userId: string
  ): Promise<ICognitiveCoreResponse<IInterventionSelection[]>>;

  // ========================
  // INSIGHTS & RECOMMENDATIONS
  // ========================

  /**
   * Generate therapeutic insights for user
   * @param userId - User identifier
   * @returns Generated insights
   */
  generateInsights(
    userId: string
  ): Promise<ICognitiveCoreResponse<TherapeuticInsight[]>>;

  /**
   * Generate Socratic questions
   * @param userId - User identifier
   * @param count - Number of questions
   * @returns Socratic questions
   */
  generateSocraticQuestions(
    userId: string,
    count?: number
  ): Promise<ICognitiveCoreResponse<SocraticQuestion[]>>;

  // ========================
  // CRISIS MANAGEMENT
  // ========================

  /**
   * Check crisis status
   * @param userId - User identifier
   * @returns Crisis assessment
   */
  checkCrisisStatus(
    userId: string
  ): Promise<ICognitiveCoreResponse<{
    isCrisis: boolean;
    riskLevel: number;
    indicators: string[];
    recommendedAction: string;
  }>>;

  /**
   * Activate crisis mode
   * @param userId - User identifier
   * @param sessionId - Session identifier
   */
  activateCrisisMode(
    userId: string,
    sessionId: string
  ): Promise<ICognitiveCoreResponse<void>>;

  /**
   * Deactivate crisis mode
   * @param userId - User identifier
   * @param sessionId - Session identifier
   */
  deactivateCrisisMode(
    userId: string,
    sessionId: string
  ): Promise<ICognitiveCoreResponse<void>>;

  // ========================
  // DATA MANAGEMENT
  // ========================

  /**
   * Export user data (GDPR compliance)
   * @param userId - User identifier
   * @returns Exported data
   */
  exportUserData(
    userId: string
  ): Promise<ICognitiveCoreResponse<{
    states: IStateVector[];
    sessions: IUserSession[];
    interventions: Array<{ intervention: IIntervention; outcome?: IInterventionOutcome }>;
    events: IDomainEvent[];
  }>>;

  /**
   * Delete user data (GDPR right to erasure)
   * @param userId - User identifier
   */
  deleteUserData(userId: string): Promise<ICognitiveCoreResponse<void>>;

  // ========================
  // EVENT SUBSCRIPTIONS
  // ========================

  /**
   * Subscribe to domain events
   * @param eventType - Event type
   * @param handler - Event handler
   * @returns Subscription
   */
  subscribeToEvents<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): IEventSubscription;

  /**
   * Get event bus for advanced integrations
   * @returns Event bus instance
   */
  getEventBus(): IEventBus;
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Configuration for Cognitive Core API
 */
export interface ICognitiveCoreConfig {
  /** Event store configuration */
  eventStore: {
    type: 'memory' | 'sqlite' | 'postgresql';
    connectionString?: string;
    tableName?: string;
  };

  /** State repository configuration */
  stateRepository: {
    type: 'memory' | 'sqlite' | 'postgresql';
    connectionString?: string;
  };

  /** Enable event sourcing */
  enableEventSourcing: boolean;

  /** Enable real-time event streaming */
  enableRealTimeEvents: boolean;

  /** Default language */
  defaultLanguage: 'en' | 'ru';

  /** Crisis detection enabled */
  crisisDetectionEnabled: boolean;

  /** Auto-intervention enabled */
  autoInterventionEnabled: boolean;

  /** Session timeout (ms) */
  sessionTimeoutMs: number;

  /** Max events to keep in memory */
  maxEventsInMemory: number;
}

/**
 * Default configuration
 */
export const DEFAULT_COGNITIVE_CORE_CONFIG: ICognitiveCoreConfig = {
  eventStore: {
    type: 'memory',
  },
  stateRepository: {
    type: 'memory',
  },
  enableEventSourcing: true,
  enableRealTimeEvents: true,
  defaultLanguage: 'ru',
  crisisDetectionEnabled: true,
  autoInterventionEnabled: true,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  maxEventsInMemory: 10000,
};

/**
 * Factory function type
 */
export type CreateCognitiveCoreAPI = (
  config?: Partial<ICognitiveCoreConfig>
) => Promise<ICognitiveCoreAPI>;
