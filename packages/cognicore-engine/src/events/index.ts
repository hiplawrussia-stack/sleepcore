/**
 * EVENTS MODULE
 * ==============
 * Event-Driven Architecture for CogniCore Engine
 *
 * Features:
 * - Type-safe EventBus with pipeline behaviors
 * - HIPAA-compliant Event Store (6 years retention)
 * - GDPR-ready crypto-shredding support
 * - Crisis-aware event handling
 * - MediatR-inspired middleware pattern
 *
 * Architecture Patterns:
 * - Event Sourcing (append-only, immutable)
 * - CQRS (Command Query Responsibility Segregation)
 * - Observer Pattern (event distribution)
 * - Mediator Pattern (decoupling)
 * - Pipeline Pattern (middleware)
 *
 * Research Foundation (2025-2026):
 * - Healthcare EDA (Philips, Epic Systems patterns)
 * - Event Sourcing (Oskar Dudycz, Event-Driven.io)
 * - DDD Domain Events (Khalil Stemmler, Microsoft)
 * - HIPAA 45 C.F.R. § 164.312(b) audit controls
 * - GDPR Article 30, EHDS 2025/327
 *
 * Sources (HIGH confidence):
 * - https://event-driven.io/en/type_script_node_js_event_sourcing/
 * - https://khalilstemmler.com/articles/typescript-domain-driven-design/chain-business-logic-domain-events/
 * - https://www.kiteworks.com/hipaa-compliance/hipaa-audit-log-requirements/
 * - https://pmc.ncbi.nlm.nih.gov/articles/PMC11433454/ (AI Crisis Detection)
 *
 * @module events
 */

// ============================================================================
// INTERFACES
// ============================================================================

export type {
  // Event Store
  IEventStoreConfig,
  IStoredEvent,
  IEventQueryOptions,
  IAggregateSnapshot,
  IEventStore,

  // Pipeline
  IPipelineContext,
  IPipelineBehavior,

  // Handlers
  IEventHandlerRegistration,
  IEventHandlerResult,
  IEventDispatchResult,

  // Audit
  IAuditLogEntry,
  IAuditLogQueryOptions,
  IAuditLogger,

  // Configuration
  IEventBusConfig,
} from './IEvents';

export {
  createEventMetadata,
  createPipelineContext,
  DEFAULT_EVENT_BUS_CONFIG,
  DEFAULT_EVENT_STORE_CONFIG,
} from './IEvents';

// ============================================================================
// EVENT BUS
// ============================================================================

export {
  CogniCoreEventBus,
  createEventBus,
  createInitializedEventBus,
} from './EventBus';

// ============================================================================
// EVENT STORE
// ============================================================================

export {
  InMemoryEventStore,
  InMemoryAuditLogger,
  createInMemoryEventStore,
  createInMemoryAuditLogger,
} from './EventStore';

// ============================================================================
// PIPELINE BEHAVIORS
// ============================================================================

export {
  // Behaviors
  LoggingBehavior,
  ValidationBehavior,
  MetricsBehavior,
  AuditBehavior,
  RetryBehavior,
  ThrottlingBehavior,
  CrisisAlertBehavior,

  // Types
  type EventValidator,
  type IMetricsCollector,

  // Factories
  createDefaultBehaviors,
  createCrisisAwareBehaviors,
} from './behaviors';

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export {
  // Base
  BaseEventHandler,

  // Handlers
  CrisisEventHandler,
  StateChangeEventHandler,
  InterventionOutcomeHandler,
  VulnerabilityWindowHandler,
  MessageAnalyticsHandler,
  CompositeEventHandler,

  // Registry
  EventHandlerRegistry,

  // Callback interfaces
  type ICrisisNotificationCallback,
  type IStateChangeCallback,
  type IInterventionLearningCallback,
  type IProactiveInterventionCallback,
  type IAnalyticsCallback,

  // Factories
  createDefaultHandlerRegistry,
  createCrisisHandlerRegistry,
} from './handlers';

// ============================================================================
// CONVENIENCE FACTORY
// ============================================================================

import { CogniCoreEventBus, createEventBus } from './EventBus';
import { InMemoryEventStore, InMemoryAuditLogger } from './EventStore';
import { createDefaultBehaviors, createCrisisAwareBehaviors } from './behaviors';
import { EventHandlerRegistry, CrisisEventHandler, type ICrisisNotificationCallback } from './handlers';
import type { IEventBusConfig, IEventStoreConfig } from './IEvents';

/**
 * Configuration for creating a complete event system
 */
export interface IEventSystemConfig {
  /** Event bus configuration */
  eventBusConfig?: Partial<IEventBusConfig>;

  /** Event store configuration */
  eventStoreConfig?: Partial<IEventStoreConfig>;

  /** Enable persistence (default: true) */
  enablePersistence?: boolean;

  /** Enable audit logging (default: true) */
  enableAuditLog?: boolean;

  /** Crisis notification callback (optional) */
  crisisCallback?: ICrisisNotificationCallback;

  /** Custom logger (optional) */
  logger?: {
    debug: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
}

/**
 * Complete event system with all components
 */
export interface IEventSystem {
  /** Event bus for publishing/subscribing */
  eventBus: CogniCoreEventBus;

  /** Event store for persistence */
  eventStore: InMemoryEventStore;

  /** Audit logger for HIPAA compliance */
  auditLogger: InMemoryAuditLogger;

  /** Handler registry */
  handlerRegistry: EventHandlerRegistry;

  /** Shutdown function */
  shutdown: () => Promise<void>;
}

/**
 * Create complete event system
 *
 * Convenience factory that sets up:
 * - EventBus with pipeline behaviors
 * - In-memory EventStore (PostgreSQL-ready)
 * - HIPAA-compliant AuditLogger
 * - Handler registry
 *
 * @example
 * ```typescript
 * const eventSystem = await createEventSystem({
 *   crisisCallback: {
 *     notify: async (event) => { ... },
 *     escalate: async (event) => { ... },
 *     log: async (event) => { ... },
 *   },
 * });
 *
 * // Subscribe to events
 * eventSystem.eventBus.subscribe('STATE_UPDATED', async (event) => {
 *   console.log('State updated:', event);
 * });
 *
 * // Publish event
 * await eventSystem.eventBus.publish(stateUpdatedEvent);
 *
 * // Shutdown
 * await eventSystem.shutdown();
 * ```
 */
export async function createEventSystem(
  config: IEventSystemConfig = {}
): Promise<IEventSystem> {
  const {
    eventBusConfig = {},
    eventStoreConfig = {},
    enablePersistence = true,
    enableAuditLog = true,
    crisisCallback,
  } = config;

  // Create event store
  const eventStore = new InMemoryEventStore(eventStoreConfig);

  // Create audit logger
  const auditLogger = new InMemoryAuditLogger(
    eventStoreConfig.retentionDays ?? 2190
  );

  // Create behaviors
  const behaviors = crisisCallback
    ? createCrisisAwareBehaviors(
        async (event) => {
          // Fire crisis alert
          if (event.eventType === 'CRISIS_DETECTED') {
            await crisisCallback.notify(event as unknown as import('../integration/ICognitiveCoreAPI').ICrisisDetectedEvent);
          }
        },
        enableAuditLog ? auditLogger : undefined
      )
    : createDefaultBehaviors(enableAuditLog ? auditLogger : undefined);

  // Create event bus
  const eventBus = createEventBus({
    ...eventBusConfig,
    enablePersistence,
    enableAuditLog,
    behaviors,
  });

  // Initialize event bus
  await eventBus.initialize(
    enablePersistence ? eventStore : undefined,
    enableAuditLog ? auditLogger : undefined
  );

  // Create handler registry
  const handlerRegistry = new EventHandlerRegistry();

  // Register crisis handler if callback provided
  if (crisisCallback) {
    handlerRegistry.register(new CrisisEventHandler(crisisCallback));
    handlerRegistry.registerWithEventBus(eventBus);
  }

  // Shutdown function
  const shutdown = async (): Promise<void> => {
    eventBus.clearAll();
    handlerRegistry.clear();
  };

  return {
    eventBus,
    eventStore,
    auditLogger,
    handlerRegistry,
    shutdown,
  };
}

/**
 * Create minimal event system (no persistence, no audit)
 *
 * Useful for testing or simple use cases
 */
export function createMinimalEventSystem(): {
  eventBus: CogniCoreEventBus;
  shutdown: () => void;
} {
  const eventBus = createEventBus({
    enablePersistence: false,
    enableAuditLog: false,
    behaviors: [],
  });

  return {
    eventBus,
    shutdown: () => eventBus.clearAll(),
  };
}
