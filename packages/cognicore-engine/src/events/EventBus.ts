/**
 * EVENT BUS IMPLEMENTATION
 * =========================
 * Type-safe Event Bus with Pipeline Behaviors for CogniCore Engine
 *
 * Architecture Patterns:
 * - Observer Pattern (event distribution)
 * - Mediator Pattern (decoupling)
 * - Pipeline Pattern (middleware)
 * - MediatR-inspired behaviors
 *
 * Research Foundation (2025-2026):
 * - TypeScript type-safe EventEmitter patterns
 * - MediatR Pipeline Behaviors (.NET patterns adapted)
 * - Healthcare EDA patterns (Philips, Epic Systems)
 * - HIPAA-compliant event handling
 *
 * @module events/EventBus
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IDomainEvent,
  IEventBus,
  IEventSubscription,
  EventHandler,
} from '../integration/ICognitiveCoreAPI';
import type {
  IEventBusConfig,
  IEventStore,
  IPipelineBehavior,
  IPipelineContext,
  IAuditLogger,
} from './IEvents';
import { DEFAULT_EVENT_BUS_CONFIG, createPipelineContext } from './IEvents';

// ============================================================================
// TYPE-SAFE EVENT BUS
// ============================================================================

/**
 * CogniCore Event Bus
 *
 * Features:
 * - Type-safe event publishing and subscribing
 * - Pipeline behaviors (middleware pattern)
 * - Optional event persistence
 * - HIPAA-compliant audit logging
 * - Dead letter queue for failed events
 * - Retry with exponential backoff
 *
 * @example
 * ```typescript
 * const eventBus = new CogniCoreEventBus();
 *
 * // Subscribe to events
 * const sub = eventBus.subscribe('STATE_UPDATED', async (event) => {
 *   console.log('State updated:', event);
 * });
 *
 * // Publish event
 * await eventBus.publish(stateUpdatedEvent);
 *
 * // Unsubscribe
 * sub.unsubscribe();
 * ```
 */
export class CogniCoreEventBus implements IEventBus {
  private readonly config: IEventBusConfig;
  private readonly handlers: Map<string, Set<{ id: string; handler: EventHandler }>>;
  private readonly behaviors: IPipelineBehavior[];
  private eventStore?: IEventStore;
  private auditLogger?: IAuditLogger;
  private readonly deadLetterQueue: Array<{ event: IDomainEvent; error: Error; timestamp: Date }>;
  private isInitialized: boolean;

  constructor(config: Partial<IEventBusConfig> = {}) {
    this.config = { ...DEFAULT_EVENT_BUS_CONFIG, ...config };
    this.handlers = new Map();
    this.behaviors = [...(this.config.behaviors ?? [])].sort((a, b) => a.priority - b.priority);
    this.deadLetterQueue = [];
    this.isInitialized = false;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize event bus with optional event store and audit logger
   */
  async initialize(eventStore?: IEventStore, auditLogger?: IAuditLogger): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.eventStore = eventStore;
    this.auditLogger = auditLogger;
    this.isInitialized = true;
  }

  /**
   * Check if event bus is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // ============================================================================
  // PUBLISHING
  // ============================================================================

  /**
   * Publish domain event
   *
   * @param event - Event to publish
   */
  async publish<T extends IDomainEvent>(event: T): Promise<void> {
    // Create pipeline context
    const context = createPipelineContext(
      event.metadata.correlationId,
      event.metadata.userId,
      event.metadata.sessionId
    );

    // Execute through pipeline
    await this.executePipeline(event, context, async () => {
      // Store event if persistence enabled
      if (this.config.enablePersistence && this.eventStore) {
        await this.eventStore.append(event);
      }

      // Dispatch to handlers
      await this.dispatchToHandlers(event, context);
    });
  }

  /**
   * Publish multiple events atomically
   */
  async publishBatch(events: IDomainEvent[]): Promise<void> {
    // Store all events first if persistence enabled
    if (this.config.enablePersistence && this.eventStore) {
      await this.eventStore.appendBatch(events);
    }

    // Dispatch each event
    for (const event of events) {
      await this.publish(event);
    }
  }

  // ============================================================================
  // SUBSCRIBING
  // ============================================================================

  /**
   * Subscribe to event type
   *
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function
   * @returns Subscription for unsubscribing
   */
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): IEventSubscription {
    const subscriptionId = uuidv4();

    // Get or create handler set for event type
    let typeHandlers = this.handlers.get(eventType);
    if (!typeHandlers) {
      typeHandlers = new Set();
      this.handlers.set(eventType, typeHandlers);
    }

    // Add handler
    const handlerEntry = { id: subscriptionId, handler: handler as EventHandler };
    typeHandlers.add(handlerEntry);

    // Create subscription
    const subscription: IEventSubscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => {
        this.unsubscribe(subscriptionId);
      },
    };

    return subscription;
  }

  /**
   * Subscribe to multiple event types
   */
  subscribeMany(eventTypes: string[], handler: EventHandler): IEventSubscription[] {
    return eventTypes.map((eventType) => this.subscribe(eventType, handler));
  }

  /**
   * Subscribe to all events (wildcard)
   */
  subscribeAll(handler: EventHandler): IEventSubscription {
    return this.subscribe('*', handler);
  }

  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId: string): void {
    for (const [_eventType, typeHandlers] of this.handlers) {
      for (const handlerEntry of typeHandlers) {
        if (handlerEntry.id === subscriptionId) {
          typeHandlers.delete(handlerEntry);
          return;
        }
      }
    }
  }

  /**
   * Clear all subscriptions
   */
  clearAll(): void {
    this.handlers.clear();
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return this.handlers.get(eventType)?.size ?? 0;
    }

    let count = 0;
    for (const typeHandlers of this.handlers.values()) {
      count += typeHandlers.size;
    }
    return count;
  }

  // ============================================================================
  // BEHAVIORS
  // ============================================================================

  /**
   * Add pipeline behavior
   */
  addBehavior(behavior: IPipelineBehavior): void {
    this.behaviors.push(behavior);
    this.behaviors.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove pipeline behavior by name
   */
  removeBehavior(behaviorName: string): void {
    const index = this.behaviors.findIndex((b) => b.name === behaviorName);
    if (index !== -1) {
      this.behaviors.splice(index, 1);
    }
  }

  /**
   * Get all pipeline behaviors
   */
  getBehaviors(): readonly IPipelineBehavior[] {
    return this.behaviors;
  }

  // ============================================================================
  // DEAD LETTER QUEUE
  // ============================================================================

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): ReadonlyArray<{ event: IDomainEvent; error: Error; timestamp: Date }> {
    return this.deadLetterQueue;
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue.length = 0;
  }

  /**
   * Retry dead letter events
   */
  async retryDeadLetterQueue(): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    const eventsToRetry = [...this.deadLetterQueue];
    this.clearDeadLetterQueue();

    for (const { event } of eventsToRetry) {
      try {
        await this.publish(event);
        succeeded++;
      } catch {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Execute event through pipeline behaviors
   */
  private async executePipeline(
    event: IDomainEvent,
    context: IPipelineContext,
    finalHandler: () => Promise<void>
  ): Promise<void> {
    if (this.behaviors.length === 0) {
      await finalHandler();
      return;
    }

    // Build pipeline chain (from last to first)
    let pipeline = finalHandler;
    for (let i = this.behaviors.length - 1; i >= 0; i--) {
      const behavior = this.behaviors[i];
      const next = pipeline;
      pipeline = async () => {
        await behavior.handle(event, context, next);
      };
    }

    // Execute pipeline
    await pipeline();
  }

  /**
   * Dispatch event to handlers
   */
  private async dispatchToHandlers(
    event: IDomainEvent,
    context: IPipelineContext
  ): Promise<void> {
    // Get handlers for this event type
    const typeHandlers = this.handlers.get(event.eventType) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();
    const allHandlers = [...typeHandlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      return;
    }

    context.metrics.handlerCount = allHandlers.length;

    // Execute handlers
    const results = await Promise.allSettled(
      allHandlers.map((handlerEntry) =>
        this.executeHandler(handlerEntry.handler, event, context)
      )
    );

    // Handle failures
    for (const result of results) {
      if (result.status === 'rejected') {
        await this.handleFailure(event, result.reason as Error);
      }
    }
  }

  /**
   * Execute single handler with retry
   */
  private async executeHandler(
    handler: EventHandler,
    event: IDomainEvent,
    _context: IPipelineContext
  ): Promise<void> {
    const { maxAttempts, delayMs, backoffMultiplier } = this.config.defaultRetry;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        // Wrap with timeout
        await Promise.race([
          handler(event),
          this.timeout(this.config.handlerTimeoutMs),
        ]);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt < maxAttempts) {
          const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Handle event processing failure
   */
  private async handleFailure(event: IDomainEvent, error: Error): Promise<void> {
    // Add to dead letter queue if enabled
    if (this.config.enableDeadLetterQueue) {
      this.deadLetterQueue.push({
        event,
        error,
        timestamp: new Date(),
      });

      // Call dead letter handler if configured
      if (this.config.deadLetterHandler) {
        try {
          await this.config.deadLetterHandler(event, error);
        } catch (dlqError) {
          console.error('[EventBus] Dead letter handler failed:', dlqError);
        }
      }
    }

    // Log to audit if enabled
    if (this.config.enableAuditLog && this.auditLogger) {
      await this.auditLogger.log({
        eventType: event.eventType,
        eventId: event.eventId,
        userId: event.metadata.userId,
        sessionId: event.metadata.sessionId,
        action: 'handle',
        resource: `event/${event.aggregateType}/${event.aggregateId}`,
        outcome: 'failure',
        correlationId: event.metadata.correlationId,
        details: {
          error: error.message,
          stack: error.stack,
        },
      });
    }
  }

  /**
   * Create timeout promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Handler timeout after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create event bus with default configuration
 */
export function createEventBus(config?: Partial<IEventBusConfig>): CogniCoreEventBus {
  return new CogniCoreEventBus(config);
}

/**
 * Create event bus and initialize with stores
 */
export async function createInitializedEventBus(
  config?: Partial<IEventBusConfig>,
  eventStore?: IEventStore,
  auditLogger?: IAuditLogger
): Promise<CogniCoreEventBus> {
  const eventBus = new CogniCoreEventBus(config);
  await eventBus.initialize(eventStore, auditLogger);
  return eventBus;
}
