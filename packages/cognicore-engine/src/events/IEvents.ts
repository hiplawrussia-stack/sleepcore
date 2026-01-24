/**
 * EVENTS MODULE - INTERFACES
 * ===========================
 * Event-Driven Architecture for CogniCore Engine
 *
 * Research Foundation (2025-2026):
 * - Event Sourcing patterns (Oskar Dudycz, Event-Driven.io)
 * - DDD Domain Events (Khalil Stemmler, Microsoft patterns)
 * - HIPAA Audit Controls (45 C.F.R. § 164.312(b))
 * - GDPR Event Logging (Article 30, EHDS 2025/327)
 * - Type-safe EventEmitter (@types/node July 2024)
 *
 * Compliance:
 * - HIPAA: 6 years audit log retention
 * - GDPR: Crypto-shredding ready for right to erasure
 * - EU AI Act: Explainability audit trail
 *
 * @module events/IEvents
 */

import type { IDomainEvent, IEventMetadata } from '../integration/ICognitiveCoreAPI';

// ============================================================================
// EVENT STORE INTERFACES
// ============================================================================

/**
 * Event store configuration
 */
export interface IEventStoreConfig {
  /** Storage backend type */
  backend: 'memory' | 'postgresql';

  /** Connection string for PostgreSQL */
  connectionString?: string;

  /** Retention period in days (HIPAA: 2190 = 6 years) */
  retentionDays: number;

  /** Enable encryption for HIPAA/GDPR compliance */
  enableEncryption: boolean;

  /** Encryption key ID (for crypto-shredding) */
  encryptionKeyId?: string;

  /** Snapshot threshold (create snapshot after N events) */
  snapshotThreshold: number;

  /** Enable compression for archived events */
  enableCompression: boolean;

  /** Maximum events per query */
  maxEventsPerQuery: number;
}

/**
 * Stored event with metadata
 */
export interface IStoredEvent<T extends IDomainEvent = IDomainEvent> {
  /** Unique storage ID */
  readonly id: string;

  /** Sequence number within aggregate */
  readonly sequenceNumber: number;

  /** Global sequence number */
  readonly globalSequence: number;

  /** Event data */
  readonly event: T;

  /** Storage timestamp */
  readonly storedAt: Date;

  /** Encryption key ID if encrypted */
  readonly encryptionKeyId?: string;

  /** Checksum for integrity verification */
  readonly checksum: string;
}

/**
 * Event query options
 */
export interface IEventQueryOptions {
  /** Filter by aggregate ID */
  aggregateId?: string;

  /** Filter by aggregate type */
  aggregateType?: string;

  /** Filter by event types */
  eventTypes?: string[];

  /** Filter by user ID */
  userId?: string;

  /** Start timestamp */
  fromTimestamp?: Date;

  /** End timestamp */
  toTimestamp?: Date;

  /** Start sequence number */
  fromSequence?: number;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort order */
  order?: 'asc' | 'desc';
}

/**
 * Aggregate snapshot for performance optimization
 */
export interface IAggregateSnapshot<TState = unknown> {
  /** Aggregate ID */
  aggregateId: string;

  /** Aggregate type */
  aggregateType: string;

  /** Snapshot version (last event sequence number) */
  version: number;

  /** Serialized state */
  state: TState;

  /** Snapshot timestamp */
  createdAt: Date;

  /** Checksum for integrity */
  checksum: string;
}

/**
 * Event store interface
 * Implements Event Sourcing pattern with HIPAA/GDPR compliance
 */
export interface IEventStore {
  /**
   * Append event to store
   * @param event - Domain event to store
   * @returns Stored event with metadata
   */
  append(event: IDomainEvent): Promise<IStoredEvent>;

  /**
   * Append multiple events atomically
   * @param events - Events to store
   * @returns Stored events with metadata
   */
  appendBatch(events: IDomainEvent[]): Promise<IStoredEvent[]>;

  /**
   * Get events by aggregate ID
   * @param aggregateId - Aggregate identifier
   * @param fromVersion - Start from version (for replay after snapshot)
   * @returns Array of stored events
   */
  getEvents(aggregateId: string, fromVersion?: number): Promise<IStoredEvent[]>;

  /**
   * Query events with filters
   * @param options - Query options
   * @returns Array of stored events
   */
  queryEvents(options: IEventQueryOptions): Promise<IStoredEvent[]>;

  /**
   * Get events by type
   * @param eventType - Event type to query
   * @param options - Additional options
   * @returns Array of stored events
   */
  getEventsByType(eventType: string, options?: Partial<IEventQueryOptions>): Promise<IStoredEvent[]>;

  /**
   * Create snapshot for aggregate
   * @param aggregateId - Aggregate identifier
   * @param aggregateType - Aggregate type
   * @param state - Current state to snapshot
   * @param version - Current version
   */
  createSnapshot<TState>(
    aggregateId: string,
    aggregateType: string,
    state: TState,
    version: number
  ): Promise<IAggregateSnapshot<TState>>;

  /**
   * Get latest snapshot for aggregate
   * @param aggregateId - Aggregate identifier
   * @returns Latest snapshot or null
   */
  getSnapshot<TState>(aggregateId: string): Promise<IAggregateSnapshot<TState> | null>;

  /**
   * Get event count for aggregate
   * @param aggregateId - Aggregate identifier
   * @returns Number of events
   */
  getEventCount(aggregateId: string): Promise<number>;

  /**
   * Get global event count
   * @returns Total number of events in store
   */
  getTotalEventCount(): Promise<number>;

  /**
   * Delete events for GDPR compliance (crypto-shredding)
   * Note: Events are not physically deleted, encryption keys are destroyed
   * @param aggregateId - Aggregate identifier
   * @returns Number of affected events
   */
  cryptoShred(aggregateId: string): Promise<number>;

  /**
   * Archive old events (compress and move to cold storage)
   * @param beforeDate - Archive events before this date
   * @returns Number of archived events
   */
  archiveEvents(beforeDate: Date): Promise<number>;

  /**
   * Verify event integrity
   * @param eventId - Event storage ID
   * @returns True if checksum valid
   */
  verifyIntegrity(eventId: string): Promise<boolean>;
}

// ============================================================================
// PIPELINE BEHAVIOR INTERFACES
// ============================================================================

/**
 * Pipeline behavior context
 */
export interface IPipelineContext {
  /** Correlation ID for tracing */
  correlationId: string;

  /** Start timestamp */
  startedAt: Date;

  /** Current user ID if available */
  userId?: string;

  /** Current session ID if available */
  sessionId?: string;

  /** Additional context data */
  data: Map<string, unknown>;

  /** Metrics collection */
  metrics: {
    /** Processing duration in ms */
    durationMs?: number;
    /** Handler execution count */
    handlerCount?: number;
    /** Retry count if applicable */
    retryCount?: number;
  };
}

/**
 * Pipeline behavior interface (middleware pattern)
 * Inspired by MediatR pipeline behaviors
 */
export interface IPipelineBehavior {
  /** Behavior name for logging */
  readonly name: string;

  /** Behavior priority (lower = earlier) */
  readonly priority: number;

  /**
   * Handle event in pipeline
   * @param event - Domain event
   * @param context - Pipeline context
   * @param next - Next behavior in pipeline
   * @returns Promise that resolves when handling complete
   */
  handle(
    event: IDomainEvent,
    context: IPipelineContext,
    next: () => Promise<void>
  ): Promise<void>;
}

// ============================================================================
// EVENT HANDLER INTERFACES
// ============================================================================

/**
 * Event handler registration
 */
export interface IEventHandlerRegistration {
  /** Handler name */
  name: string;

  /** Event types this handler processes */
  eventTypes: string[];

  /** Handler priority (lower = earlier) */
  priority: number;

  /** Whether handler is async (fire-and-forget) */
  async: boolean;

  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Event handler result
 */
export interface IEventHandlerResult {
  /** Handler name */
  handlerName: string;

  /** Success status */
  success: boolean;

  /** Error if failed */
  error?: Error;

  /** Execution duration in ms */
  durationMs: number;

  /** Whether handler was skipped */
  skipped: boolean;

  /** Skip reason if skipped */
  skipReason?: string;
}

/**
 * Event dispatch result
 */
export interface IEventDispatchResult {
  /** Event ID */
  eventId: string;

  /** Event type */
  eventType: string;

  /** Total handlers invoked */
  handlersInvoked: number;

  /** Successful handlers */
  handlersSucceeded: number;

  /** Failed handlers */
  handlersFailed: number;

  /** Individual handler results */
  handlerResults: IEventHandlerResult[];

  /** Total dispatch duration in ms */
  totalDurationMs: number;

  /** Whether event was stored */
  stored: boolean;

  /** Storage ID if stored */
  storageId?: string;
}

// ============================================================================
// AUDIT TRAIL INTERFACES (HIPAA/GDPR)
// ============================================================================

/**
 * Audit log entry
 */
export interface IAuditLogEntry {
  /** Unique audit ID */
  id: string;

  /** Timestamp */
  timestamp: Date;

  /** Event type */
  eventType: string;

  /** Event ID */
  eventId: string;

  /** User ID */
  userId?: string;

  /** Session ID */
  sessionId?: string;

  /** IP address (hashed for privacy) */
  ipAddressHash?: string;

  /** Action performed */
  action: 'publish' | 'subscribe' | 'handle' | 'store' | 'query' | 'delete';

  /** Resource accessed */
  resource: string;

  /** Outcome */
  outcome: 'success' | 'failure' | 'partial';

  /** Additional details */
  details?: Record<string, unknown>;

  /** Correlation ID for tracing */
  correlationId: string;
}

/**
 * Audit log query options
 */
export interface IAuditLogQueryOptions {
  /** Filter by user ID */
  userId?: string;

  /** Filter by event type */
  eventType?: string;

  /** Filter by action */
  action?: IAuditLogEntry['action'];

  /** Filter by outcome */
  outcome?: IAuditLogEntry['outcome'];

  /** Start timestamp */
  fromTimestamp?: Date;

  /** End timestamp */
  toTimestamp?: Date;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Audit logger interface
 */
export interface IAuditLogger {
  /**
   * Log audit entry
   * @param entry - Audit log entry
   */
  log(entry: Omit<IAuditLogEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Query audit logs
   * @param options - Query options
   * @returns Array of audit log entries
   */
  query(options: IAuditLogQueryOptions): Promise<IAuditLogEntry[]>;

  /**
   * Get audit log count
   * @param options - Filter options
   * @returns Number of matching entries
   */
  count(options?: Partial<IAuditLogQueryOptions>): Promise<number>;

  /**
   * Export audit logs for compliance reporting
   * @param options - Export options
   * @returns Serialized audit log data
   */
  export(options: IAuditLogQueryOptions): Promise<string>;
}

// ============================================================================
// EVENT BUS CONFIGURATION
// ============================================================================

/**
 * Event bus configuration
 */
export interface IEventBusConfig {
  /** Enable event persistence */
  enablePersistence: boolean;

  /** Event store configuration */
  eventStore?: IEventStoreConfig;

  /** Enable audit logging */
  enableAuditLog: boolean;

  /** Pipeline behaviors */
  behaviors: IPipelineBehavior[];

  /** Default retry configuration */
  defaultRetry: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };

  /** Maximum concurrent handlers */
  maxConcurrentHandlers: number;

  /** Handler timeout in ms */
  handlerTimeoutMs: number;

  /** Enable dead letter queue */
  enableDeadLetterQueue: boolean;

  /** Dead letter queue handler */
  deadLetterHandler?: (event: IDomainEvent, error: Error) => Promise<void>;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create default event metadata
 */
export function createEventMetadata(
  source: string,
  options?: Partial<IEventMetadata>
): IEventMetadata {
  return {
    correlationId: options?.correlationId ?? crypto.randomUUID(),
    causationId: options?.causationId,
    userId: options?.userId,
    sessionId: options?.sessionId,
    source,
    context: options?.context,
  };
}

/**
 * Create pipeline context
 */
export function createPipelineContext(
  correlationId: string,
  userId?: string,
  sessionId?: string
): IPipelineContext {
  return {
    correlationId,
    startedAt: new Date(),
    userId,
    sessionId,
    data: new Map<string, unknown>(),
    metrics: {},
  };
}

/**
 * Default event bus configuration
 */
export const DEFAULT_EVENT_BUS_CONFIG: IEventBusConfig = {
  enablePersistence: true,
  enableAuditLog: true,
  behaviors: [],
  defaultRetry: {
    maxAttempts: 3,
    delayMs: 100,
    backoffMultiplier: 2,
  },
  maxConcurrentHandlers: 10,
  handlerTimeoutMs: 30000,
  enableDeadLetterQueue: true,
};

/**
 * Default event store configuration (HIPAA compliant)
 */
export const DEFAULT_EVENT_STORE_CONFIG: IEventStoreConfig = {
  backend: 'memory',
  retentionDays: 2190, // 6 years (HIPAA requirement)
  enableEncryption: true,
  snapshotThreshold: 100,
  enableCompression: true,
  maxEventsPerQuery: 1000,
};
