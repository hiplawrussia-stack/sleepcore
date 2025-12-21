/**
 * IRepository - Generic Repository Interface
 * ===========================================
 *
 * Based on byte-bot IRepository pattern with sleep-specific extensions.
 * Implements Repository Pattern for data access abstraction.
 *
 * Design Patterns:
 * - Repository Pattern: Data access abstraction
 * - Data Mapper Pattern: Entity ↔ Database row conversion
 * - Specification Pattern: Complex query support
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IQueryOptions } from './IDatabaseConnection';

/**
 * Base entity interface with audit fields
 */
export interface IEntity {
  /** Primary key */
  readonly id?: number;

  /** Creation timestamp */
  readonly createdAt?: Date;

  /** Last update timestamp */
  readonly updatedAt?: Date;

  /** Soft delete timestamp (GDPR compliance) */
  readonly deletedAt?: Date | null;
}

/**
 * Generic repository interface
 * @template T Entity type
 * @template ID Primary key type (default: number)
 */
export interface IRepository<T extends IEntity, ID = number> {
  /**
   * Find entity by primary key
   * @param id Primary key value
   */
  findById(id: ID): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   * @param options Query options (pagination, ordering)
   */
  findAll(options?: IQueryOptions): Promise<T[]>;

  /**
   * Find entities matching criteria
   * @param criteria Partial entity for matching
   */
  findBy(criteria: Partial<T>): Promise<T[]>;

  /**
   * Find first entity matching criteria
   * @param criteria Partial entity for matching
   */
  findOneBy(criteria: Partial<T>): Promise<T | null>;

  /**
   * Save entity (insert or update)
   * @param entity Entity to save
   */
  save(entity: T): Promise<T>;

  /**
   * Insert new entity
   * @param entity Entity to insert
   */
  insert(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;

  /**
   * Update existing entity
   * @param id Primary key
   * @param entity Partial entity with updates
   */
  update(id: ID, entity: Partial<T>): Promise<T | null>;

  /**
   * Soft delete entity (GDPR compliant)
   * @param id Primary key
   */
  delete(id: ID): Promise<boolean>;

  /**
   * Hard delete entity (use with caution)
   * @param id Primary key
   */
  hardDelete(id: ID): Promise<boolean>;

  /**
   * Restore soft-deleted entity
   * @param id Primary key
   */
  restore(id: ID): Promise<boolean>;

  /**
   * Check if entity exists
   * @param id Primary key
   */
  exists(id: ID): Promise<boolean>;

  /**
   * Count entities matching criteria
   * @param criteria Optional filter criteria
   */
  count(criteria?: Partial<T>): Promise<number>;
}

/**
 * Sleep diary entry entity
 */
export interface ISleepDiaryEntryEntity extends IEntity {
  readonly userId: string;
  readonly date: string;
  readonly bedtime: string;
  readonly lightsOffTime: string;
  readonly sleepOnsetLatency: number;
  readonly wakeTime: string;
  readonly outOfBedTime: string;
  readonly nightAwakenings: number;
  readonly wakeAfterSleepOnset: number;
  readonly totalSleepTime: number;
  readonly timeInBed: number;
  readonly sleepEfficiency: number;
  readonly sleepQuality: number;
  readonly morningMood: number;
  readonly notes?: string;
}

/**
 * Sleep diary repository interface
 */
export interface ISleepDiaryRepository extends IRepository<ISleepDiaryEntryEntity> {
  /**
   * Find entries by user and date range
   */
  findByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ISleepDiaryEntryEntity[]>;

  /**
   * Get weekly summary statistics
   */
  getWeeklySummary(
    userId: string,
    weekStartDate: string
  ): Promise<{
    avgSleepEfficiency: number;
    avgTotalSleepTime: number;
    avgSleepOnsetLatency: number;
    avgWakeAfterSleepOnset: number;
    avgSleepQuality: number;
    entryCount: number;
  }>;

  /**
   * Calculate sleep efficiency trend
   */
  getSleepEfficiencyTrend(
    userId: string,
    days: number
  ): Promise<Array<{ date: string; sleepEfficiency: number }>>;

  /**
   * Get latest entry for user
   */
  getLatestEntry(userId: string): Promise<ISleepDiaryEntryEntity | null>;

  /**
   * Count entries in date range
   */
  countEntriesInRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number>;
}

/**
 * Assessment result entity
 */
export interface IAssessmentEntity extends IEntity {
  readonly userId: string;
  readonly type: 'isi' | 'meq' | 'mctq' | 'dbas' | 'tcm' | 'ayurveda';
  readonly score: number;
  readonly severity?: string;
  readonly category?: string;
  readonly responsesJson: string;
  readonly interpretation?: string;
  readonly assessedAt: Date;
}

/**
 * Assessment repository interface
 */
export interface IAssessmentRepository extends IRepository<IAssessmentEntity> {
  /**
   * Find assessments by user and type
   */
  findByUserAndType(
    userId: string,
    type: IAssessmentEntity['type']
  ): Promise<IAssessmentEntity[]>;

  /**
   * Get latest assessment of type
   */
  getLatestByType(
    userId: string,
    type: IAssessmentEntity['type']
  ): Promise<IAssessmentEntity | null>;

  /**
   * Calculate score change between assessments
   */
  getScoreChange(
    userId: string,
    type: IAssessmentEntity['type']
  ): Promise<{
    baseline: number;
    current: number;
    change: number;
    percentChange: number;
  } | null>;

  /**
   * Check if MCID (Minimal Clinically Important Difference) achieved
   * For ISI: 6-point reduction
   */
  isMCIDReached(
    userId: string,
    type: IAssessmentEntity['type'],
    mcidThreshold: number
  ): Promise<boolean>;
}

/**
 * Therapy session entity
 */
export interface ITherapySessionEntity extends IEntity {
  readonly userId: string;
  readonly sessionType: 'cbti' | 'mbti' | 'acti' | 'tcm' | 'ayurveda';
  readonly week: number;
  readonly component: string;
  readonly status: 'scheduled' | 'in_progress' | 'completed' | 'skipped';
  readonly adherence: number;
  readonly homeworkCompleted: boolean;
  readonly notesJson?: string;
  readonly scheduledAt: Date;
  readonly completedAt?: Date;
}

/**
 * Therapy session repository interface
 */
export interface ITherapySessionRepository extends IRepository<ITherapySessionEntity> {
  /**
   * Find sessions by user and type
   */
  findByUserAndType(
    userId: string,
    sessionType: ITherapySessionEntity['sessionType']
  ): Promise<ITherapySessionEntity[]>;

  /**
   * Get current week sessions
   */
  getCurrentWeekSessions(userId: string): Promise<ITherapySessionEntity[]>;

  /**
   * Calculate overall adherence
   */
  calculateAdherence(
    userId: string,
    sessionType?: ITherapySessionEntity['sessionType']
  ): Promise<number>;

  /**
   * Get session completion rate
   */
  getCompletionRate(
    userId: string,
    sessionType?: ITherapySessionEntity['sessionType']
  ): Promise<{
    completed: number;
    total: number;
    rate: number;
  }>;
}

/**
 * User profile entity
 */
export interface IUserEntity extends IEntity {
  readonly externalId: string;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly chronotype?: string;
  readonly prakriti?: string;
  readonly tcmConstitution?: string;
  readonly timezone?: string;
  readonly locale?: string;
  readonly settingsJson?: string;
  readonly consentGiven: boolean;
  readonly consentDate?: Date;
  readonly lastActivityAt?: Date;
}

/**
 * User repository interface
 */
export interface IUserRepository extends IRepository<IUserEntity, number> {
  /**
   * Find user by external ID
   */
  findByExternalId(externalId: string): Promise<IUserEntity | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<IUserEntity | null>;

  /**
   * Update last activity timestamp
   */
  updateLastActivity(userId: number): Promise<void>;

  /**
   * Check if user has given consent
   */
  hasConsent(userId: number): Promise<boolean>;

  /**
   * Record user consent (GDPR compliance)
   */
  recordConsent(userId: number): Promise<void>;

  /**
   * Get users requiring follow-up (inactive for N days)
   */
  getInactiveUsers(days: number): Promise<IUserEntity[]>;
}
