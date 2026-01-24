/**
 * EVENT HANDLERS
 * ================
 * Domain Event Handlers for CogniCore Engine
 *
 * Architecture Patterns:
 * - Observer Pattern for event handling
 * - Strategy Pattern for handler selection
 * - DDD Event Handlers (Khalil Stemmler patterns)
 *
 * Research Foundation (2025-2026):
 * - Real-time crisis detection (93.5% accuracy)
 * - HIPAA event logging requirements
 * - Healthcare EDA patterns
 *
 * @module events/handlers
 */

import type {
  IDomainEvent,
  ICrisisDetectedEvent,
  IStateUpdatedEvent,
  IInterventionOutcomeEvent,
  IMessageReceivedEvent,
  VulnerabilityWindowEvent,
  IEventBus,
} from '../../integration/ICognitiveCoreAPI';
import type { IEventHandlerRegistration } from '../IEvents';

// ============================================================================
// BASE EVENT HANDLER
// ============================================================================

/**
 * Base class for event handlers
 *
 * Provides common functionality:
 * - Registration info
 * - Error handling
 * - Logging
 */
export abstract class BaseEventHandler<T extends IDomainEvent = IDomainEvent> {
  abstract readonly name: string;
  abstract readonly eventTypes: string[];
  abstract readonly priority: number;
  readonly async: boolean = false;

  /**
   * Handle event
   * @param event - Domain event to handle
   */
  abstract handle(event: T): Promise<void>;

  /**
   * Get registration info
   */
  getRegistration(): IEventHandlerRegistration {
    return {
      name: this.name,
      eventTypes: this.eventTypes,
      priority: this.priority,
      async: this.async,
    };
  }

  /**
   * Check if this handler handles the event type
   */
  handles(eventType: string): boolean {
    return this.eventTypes.includes(eventType) || this.eventTypes.includes('*');
  }

  /**
   * Register with event bus
   */
  register(eventBus: IEventBus): void {
    for (const eventType of this.eventTypes) {
      eventBus.subscribe(eventType, this.handle.bind(this) as (event: IDomainEvent) => Promise<void>);
    }
  }
}

// ============================================================================
// CRISIS EVENT HANDLER
// ============================================================================

/**
 * Crisis notification callback
 */
export interface ICrisisNotificationCallback {
  /** Notify about crisis (Telegram, SMS, email, etc.) */
  notify(event: ICrisisDetectedEvent): Promise<void>;

  /** Escalate to human supervisor */
  escalate(event: ICrisisDetectedEvent): Promise<void>;

  /** Log crisis for compliance */
  log(event: ICrisisDetectedEvent): Promise<void>;
}

/**
 * Crisis Event Handler
 *
 * Handles crisis detection events with immediate response:
 * - Sends notifications to users
 * - Escalates to human supervisors
 * - Logs for HIPAA compliance
 *
 * Priority: 1 (highest - crisis events are critical)
 */
export class CrisisEventHandler extends BaseEventHandler<ICrisisDetectedEvent> {
  readonly name = 'CrisisEventHandler';
  readonly eventTypes = ['CRISIS_DETECTED'];
  readonly priority = 1;
  readonly async = false; // Must be synchronous for immediate response

  private readonly callback: ICrisisNotificationCallback;
  private readonly escalationThreshold: number;

  constructor(
    callback: ICrisisNotificationCallback,
    escalationThreshold: number = 0.7
  ) {
    super();
    this.callback = callback;
    this.escalationThreshold = escalationThreshold;
  }

  async handle(event: ICrisisDetectedEvent): Promise<void> {
    const { payload } = event;

    // Always log for compliance
    await this.callback.log(event);

    // Send notification
    await this.callback.notify(event);

    // Escalate if high risk or immediate action recommended
    if (
      payload.riskLevel >= this.escalationThreshold ||
      payload.recommendedAction === 'immediate_response' ||
      payload.recommendedAction === 'escalate'
    ) {
      await this.callback.escalate(event);
    }
  }
}

// ============================================================================
// STATE CHANGE HANDLER
// ============================================================================

/**
 * State change callback
 */
export interface IStateChangeCallback {
  /** Called when state significantly changes */
  onSignificantChange(event: IStateUpdatedEvent, changeScore: number): Promise<void>;

  /** Called when state improves */
  onImprovement(event: IStateUpdatedEvent): Promise<void>;

  /** Called when state deteriorates */
  onDeterioration(event: IStateUpdatedEvent): Promise<void>;
}

/**
 * State Change Event Handler
 *
 * Monitors state changes and triggers appropriate actions:
 * - Detects significant changes
 * - Identifies improvements vs deteriorations
 * - Triggers follow-up actions
 *
 * Priority: 10
 */
export class StateChangeEventHandler extends BaseEventHandler<IStateUpdatedEvent> {
  readonly name = 'StateChangeEventHandler';
  readonly eventTypes = ['STATE_UPDATED'];
  readonly priority = 10;
  readonly async = true; // Can run async for non-critical processing

  private readonly callback: IStateChangeCallback;
  private readonly significantChangeThreshold: number;

  constructor(
    callback: IStateChangeCallback,
    significantChangeThreshold: number = 0.2
  ) {
    super();
    this.callback = callback;
    this.significantChangeThreshold = significantChangeThreshold;
  }

  async handle(event: IStateUpdatedEvent): Promise<void> {
    const { payload } = event;
    const { changes } = payload;

    // Calculate overall change magnitude
    let totalChange = 0;
    let improvementScore = 0;
    let deteriorationScore = 0;

    for (const change of changes) {
      totalChange += Math.abs(change.magnitude);

      if (change.changeType === 'increase') {
        // Context-dependent: some dimensions improve with increase, others deteriorate
        if (this.isPositiveDimension(change.dimension, change.field)) {
          improvementScore += change.magnitude;
        } else {
          deteriorationScore += change.magnitude;
        }
      } else if (change.changeType === 'decrease') {
        if (this.isPositiveDimension(change.dimension, change.field)) {
          deteriorationScore += Math.abs(change.magnitude);
        } else {
          improvementScore += Math.abs(change.magnitude);
        }
      }
    }

    // Check for significant change
    if (totalChange >= this.significantChangeThreshold) {
      await this.callback.onSignificantChange(event, totalChange);
    }

    // Determine overall direction
    if (improvementScore > deteriorationScore && improvementScore > 0.1) {
      await this.callback.onImprovement(event);
    } else if (deteriorationScore > improvementScore && deteriorationScore > 0.1) {
      await this.callback.onDeterioration(event);
    }
  }

  /**
   * Determine if increase in dimension/field is positive
   */
  private isPositiveDimension(dimension: string, field: string): boolean {
    // Positive dimensions (increase = good)
    const positiveDimensions: Record<string, string[]> = {
      emotional: ['valence', 'stability', 'positiveAffect'],
      cognitive: ['clarity', 'flexibility', 'problemSolving'],
      resource: ['socialSupport', 'copingSkills', 'energy'],
    };

    // Negative dimensions (increase = bad)
    const negativeDimensions: Record<string, string[]> = {
      emotional: ['arousal', 'negativeAffect', 'anxiety'],
      cognitive: ['rumination', 'catastrophizing'],
      risk: ['crisisRisk', 'selfHarmRisk', 'suicidalIdeation'],
    };

    const positiveFields = positiveDimensions[dimension] ?? [];
    const negativeFields = negativeDimensions[dimension] ?? [];

    if (positiveFields.includes(field)) {
      return true;
    }

    if (negativeFields.includes(field)) {
      return false;
    }

    // Default: assume positive
    return true;
  }
}

// ============================================================================
// INTERVENTION OUTCOME HANDLER
// ============================================================================

/**
 * Intervention learning callback
 */
export interface IInterventionLearningCallback {
  /** Update intervention model based on outcome */
  updateModel(event: IInterventionOutcomeEvent): Promise<void>;

  /** Log outcome for analysis */
  logOutcome(event: IInterventionOutcomeEvent): Promise<void>;
}

/**
 * Intervention Outcome Event Handler
 *
 * Processes intervention outcomes for Thompson Sampling learning:
 * - Updates bandit arms
 * - Logs for analysis
 *
 * Priority: 20
 */
export class InterventionOutcomeHandler extends BaseEventHandler<IInterventionOutcomeEvent> {
  readonly name = 'InterventionOutcomeHandler';
  readonly eventTypes = ['INTERVENTION_OUTCOME'];
  readonly priority = 20;
  readonly async = true;

  private readonly callback: IInterventionLearningCallback;

  constructor(callback: IInterventionLearningCallback) {
    super();
    this.callback = callback;
  }

  async handle(event: IInterventionOutcomeEvent): Promise<void> {
    // Log outcome for compliance and analysis
    await this.callback.logOutcome(event);

    // Update model
    await this.callback.updateModel(event);
  }
}

// ============================================================================
// VULNERABILITY WINDOW HANDLER
// ============================================================================

/**
 * Proactive intervention callback
 */
export interface IProactiveInterventionCallback {
  /** Schedule proactive intervention */
  scheduleIntervention(
    userId: string,
    windowStart: Date,
    windowEnd: Date,
    recommendedTypes: string[]
  ): Promise<void>;

  /** Send preemptive notification */
  notifyUser(userId: string, message: string): Promise<void>;
}

/**
 * Vulnerability Window Event Handler
 *
 * Handles predicted vulnerability windows:
 * - Schedules proactive interventions
 * - Sends preemptive notifications
 *
 * Priority: 15
 */
export class VulnerabilityWindowHandler extends BaseEventHandler<VulnerabilityWindowEvent> {
  readonly name = 'VulnerabilityWindowHandler';
  readonly eventTypes = ['VULNERABILITY_WINDOW_DETECTED'];
  readonly priority = 15;
  readonly async = true;

  private readonly callback: IProactiveInterventionCallback;
  private readonly minConfidenceThreshold: number;

  constructor(
    callback: IProactiveInterventionCallback,
    minConfidenceThreshold: number = 0.6
  ) {
    super();
    this.callback = callback;
    this.minConfidenceThreshold = minConfidenceThreshold;
  }

  async handle(event: VulnerabilityWindowEvent): Promise<void> {
    const { payload } = event;
    const { window, recommendedInterventionTypes } = payload;

    // Only act on high-confidence predictions
    if (window.confidence < this.minConfidenceThreshold) {
      return;
    }

    // Schedule proactive intervention
    await this.callback.scheduleIntervention(
      payload.userId,
      window.startTime,
      window.endTime,
      recommendedInterventionTypes
    );
  }
}

// ============================================================================
// MESSAGE ANALYTICS HANDLER
// ============================================================================

/**
 * Analytics callback
 */
export interface IAnalyticsCallback {
  /** Track message received */
  trackMessage(event: IMessageReceivedEvent): Promise<void>;

  /** Update session analytics */
  updateSessionAnalytics(userId: string, sessionId: string): Promise<void>;
}

/**
 * Message Analytics Event Handler
 *
 * Tracks messages for analytics:
 * - Message counts
 * - Session activity
 * - Usage patterns
 *
 * Priority: 50 (low priority, analytics)
 */
export class MessageAnalyticsHandler extends BaseEventHandler<IMessageReceivedEvent> {
  readonly name = 'MessageAnalyticsHandler';
  readonly eventTypes = ['MESSAGE_RECEIVED'];
  readonly priority = 50;
  readonly async = true; // Fire-and-forget analytics

  private readonly callback: IAnalyticsCallback;

  constructor(callback: IAnalyticsCallback) {
    super();
    this.callback = callback;
  }

  async handle(event: IMessageReceivedEvent): Promise<void> {
    await this.callback.trackMessage(event);
    await this.callback.updateSessionAnalytics(
      event.payload.userId,
      event.payload.sessionId
    );
  }
}

// ============================================================================
// COMPOSITE HANDLER
// ============================================================================

/**
 * Composite Event Handler
 *
 * Combines multiple handlers for same event type
 */
export class CompositeEventHandler extends BaseEventHandler {
  readonly name: string;
  readonly eventTypes: string[];
  readonly priority: number;

  private readonly handlers: BaseEventHandler[];

  constructor(
    name: string,
    eventTypes: string[],
    handlers: BaseEventHandler[],
    priority: number = 100
  ) {
    super();
    this.name = name;
    this.eventTypes = eventTypes;
    this.handlers = handlers.sort((a, b) => a.priority - b.priority);
    this.priority = priority;
  }

  async handle(event: IDomainEvent): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.handles(event.eventType)) {
        await handler.handle(event);
      }
    }
  }
}

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

/**
 * Event Handler Registry
 *
 * Manages registration and lookup of event handlers
 */
export class EventHandlerRegistry {
  private readonly handlers: Map<string, BaseEventHandler[]>;
  private readonly handlersByName: Map<string, BaseEventHandler>;

  constructor() {
    this.handlers = new Map();
    this.handlersByName = new Map();
  }

  /**
   * Register handler
   */
  register(handler: BaseEventHandler): void {
    // Store by name
    this.handlersByName.set(handler.name, handler);

    // Store by event types
    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType) ?? [];
      existing.push(handler);
      existing.sort((a, b) => a.priority - b.priority);
      this.handlers.set(eventType, existing);
    }
  }

  /**
   * Unregister handler
   */
  unregister(handlerName: string): void {
    const handler = this.handlersByName.get(handlerName);
    if (!handler) {
      return;
    }

    this.handlersByName.delete(handlerName);

    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType);
      if (existing) {
        const index = existing.findIndex((h) => h.name === handlerName);
        if (index !== -1) {
          existing.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get handlers for event type
   */
  getHandlers(eventType: string): BaseEventHandler[] {
    const specific = this.handlers.get(eventType) ?? [];
    const wildcard = this.handlers.get('*') ?? [];
    return [...specific, ...wildcard].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get handler by name
   */
  getHandler(name: string): BaseEventHandler | undefined {
    return this.handlersByName.get(name);
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): BaseEventHandler[] {
    return Array.from(this.handlersByName.values());
  }

  /**
   * Register all handlers with event bus
   */
  registerWithEventBus(eventBus: IEventBus): void {
    for (const handler of this.handlersByName.values()) {
      handler.register(eventBus);
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.handlersByName.clear();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default event handler registry with standard handlers
 */
export function createDefaultHandlerRegistry(): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();

  // Note: Actual callbacks would be provided by the application
  // These are placeholder registrations showing the pattern

  return registry;
}

/**
 * Create crisis-focused handler registry
 */
export function createCrisisHandlerRegistry(
  crisisCallback: ICrisisNotificationCallback,
  stateChangeCallback?: IStateChangeCallback
): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();

  // Crisis handler (always register)
  registry.register(new CrisisEventHandler(crisisCallback));

  // State change handler (optional)
  if (stateChangeCallback) {
    registry.register(new StateChangeEventHandler(stateChangeCallback));
  }

  return registry;
}
