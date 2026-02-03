/**
 * AdverseEventRepository - Adverse Event Data Access
 * ====================================================
 *
 * Repository for adverse event persistence with full regulatory compliance.
 *
 * Compliance:
 * - ICH E6(R3): GCP requirements
 * - ICH E2B(R3): ICSR data elements
 * - 21 CFR Part 11: Audit trail
 * - ГОСТ IEC 62304-2022: Traceability
 *
 * Features:
 * - CRUD operations with automatic audit trail
 * - Safety alert management
 * - Deadline monitoring
 * - CIOMS export format
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { BaseRepository, type IBaseRow, validateOrderBy } from './BaseRepository';
import type { IDatabaseConnection, IQueryOptions } from '../interfaces/IDatabaseConnection';
import type { IEntity } from '../interfaces/IRepository';

// ==================== Entity Interfaces ====================

/**
 * AE severity classification (ICH E2A)
 */
export type AESeverity = 'mild' | 'moderate' | 'severe';

/**
 * AE seriousness criteria (ICH E2A)
 */
export type SeriousnessCriteria =
  | 'death'
  | 'life_threatening'
  | 'hospitalization'
  | 'disability'
  | 'congenital_anomaly'
  | 'medically_important';

/**
 * AE outcome classification
 */
export type AEOutcome =
  | 'recovered'
  | 'recovering'
  | 'not_recovered'
  | 'recovered_with_sequelae'
  | 'fatal'
  | 'unknown';

/**
 * Causality assessment (WHO-UMC categories)
 */
export type CausalityAssessment =
  | 'certain'
  | 'probable'
  | 'possible'
  | 'unlikely'
  | 'conditional'
  | 'unassessable';

/**
 * Expectedness based on known profile
 */
export type Expectedness = 'expected' | 'unexpected';

/**
 * Action taken with therapy
 */
export type ActionTaken =
  | 'none'
  | 'dose_reduced'
  | 'temporarily_interrupted'
  | 'permanently_discontinued'
  | 'not_applicable';

/**
 * Report status for regulatory tracking
 */
export type ReportStatus =
  | 'draft'
  | 'pending_review'
  | 'submitted_roszdravnadzor'
  | 'submitted_ethics'
  | 'closed';

/**
 * Reporter type (CIOMS E.1)
 */
export type ReporterType = 'patient' | 'healthcare_professional' | 'other';

/**
 * Reported by classification
 */
export type ReportedBy = 'patient' | 'system' | 'clinician';

/**
 * Adverse Event Entity
 */
export interface IAdverseEventEntity extends IEntity {
  readonly uuid: string;
  readonly userId: string;
  readonly userInternalId?: number;

  // CIOMS E.1: Reporter
  readonly reporterType: ReporterType;
  readonly reporterName?: string;
  readonly reporterContact?: string;

  // CIOMS E.2: Patient
  readonly patientInitials?: string;
  readonly patientAge?: number;
  readonly patientSex?: 'male' | 'female' | 'other';

  // CIOMS E.3: Product
  readonly productName: string;
  readonly productVersion?: string;

  // CIOMS E.4: Reaction
  readonly reactionTerm: string;
  readonly reactionOnsetDate: Date;

  // Classification
  readonly severity: AESeverity;
  readonly isSerious: boolean;
  readonly seriousnessCriteria?: SeriousnessCriteria[];
  readonly expectedness: Expectedness;

  // DTx-specific
  readonly dtxCategory?: string;
  readonly meddraPtCode?: string;
  readonly meddraSoc?: string;
  readonly customTerm?: string;

  // Clinical details
  readonly description?: string;
  readonly onsetDate: Date;
  readonly resolutionDate?: Date;
  readonly outcome?: AEOutcome;

  // Assessment
  readonly causality?: CausalityAssessment;
  readonly actionTaken?: ActionTaken;

  // Context
  readonly currentIsi?: number;
  readonly baselineIsi?: number;
  readonly currentWeek?: number;

  // Regulatory
  readonly reportStatus: ReportStatus;
  readonly regulatoryDeadline?: Date;
  readonly submittedToRoszdravnadzor?: Date;
  readonly submittedToEthics?: Date;

  // Metadata
  readonly reportedAt: Date;
  readonly reportedBy: ReportedBy;
  readonly createdBy: string;
  readonly notes?: string;
}

/**
 * Safety Alert Entity
 */
export interface ISafetyAlertEntity extends IEntity {
  readonly type: 'ISI_WORSENING' | 'SERIOUS_AE' | 'SUSAR' | 'DEADLINE_APPROACHING' | 'CRISIS';
  readonly severity: 'warning' | 'critical';
  readonly userId: string;
  readonly userDisplayName?: string;
  readonly message: string;
  readonly adverseEventId?: number;
  readonly acknowledged: boolean;
  readonly acknowledgedBy?: string;
  readonly acknowledgedAt?: Date;
  readonly escalated: boolean;
  readonly escalatedTo?: string;
  readonly escalatedAt?: Date;
}

/**
 * Audit trail entry
 */
export interface IAdverseEventAuditEntry {
  readonly id: number;
  readonly adverseEventId: number;
  readonly action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'SUBMISSION';
  readonly changedAt: Date;
  readonly changedBy: string;
  readonly oldValues?: Record<string, unknown>;
  readonly newValues?: Record<string, unknown>;
  readonly reason?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
}

// ==================== Database Row Interfaces ====================

interface IAdverseEventRow extends IBaseRow {
  uuid: string;
  user_id: string;
  user_internal_id: number | null;
  reporter_type: string;
  reporter_name: string | null;
  reporter_contact: string | null;
  patient_initials: string | null;
  patient_age: number | null;
  patient_sex: string | null;
  product_name: string;
  product_version: string | null;
  reaction_term: string;
  reaction_onset_date: string;
  severity: string;
  is_serious: number;
  seriousness_criteria_json: string | null;
  expectedness: string;
  dtx_category: string | null;
  meddra_pt_code: string | null;
  meddra_soc: string | null;
  custom_term: string | null;
  description: string | null;
  onset_date: string;
  resolution_date: string | null;
  outcome: string | null;
  causality: string | null;
  action_taken: string | null;
  current_isi: number | null;
  baseline_isi: number | null;
  current_week: number | null;
  report_status: string;
  regulatory_deadline: string | null;
  submitted_to_roszdravnadzor: string | null;
  submitted_to_ethics: string | null;
  reported_at: string;
  reported_by: string;
  created_by: string;
  notes: string | null;
}

interface ISafetyAlertRow extends IBaseRow {
  type: string;
  severity: string;
  user_id: string;
  user_display_name: string | null;
  message: string;
  adverse_event_id: number | null;
  acknowledged: number;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated: number;
  escalated_to: string | null;
  escalated_at: string | null;
}

// ==================== Repository Implementation ====================

/**
 * Adverse Event Repository
 * Provides CRUD operations with automatic audit trail
 */
export class AdverseEventRepository extends BaseRepository<IAdverseEventEntity> {
  protected readonly tableName = 'adverse_events';

  protected readonly allowedOrderByColumns: ReadonlySet<string> = new Set([
    'id', 'created_at', 'updated_at', 'deleted_at',
    'reported_at', 'onset_date', 'severity', 'report_status',
    'user_id', 'reaction_term', 'regulatory_deadline',
  ]);

  constructor(db: IDatabaseConnection) {
    super(db);
  }

  // ==================== Row/Entity Conversion ====================

  protected rowToEntity(row: IBaseRow): IAdverseEventEntity {
    const r = row as IAdverseEventRow;
    return {
      id: r.id,
      uuid: r.uuid,
      userId: r.user_id,
      userInternalId: r.user_internal_id || undefined,
      reporterType: r.reporter_type as ReporterType,
      reporterName: r.reporter_name || undefined,
      reporterContact: r.reporter_contact || undefined,
      patientInitials: r.patient_initials || undefined,
      patientAge: r.patient_age || undefined,
      patientSex: (r.patient_sex as 'male' | 'female' | 'other') || undefined,
      productName: r.product_name,
      productVersion: r.product_version || undefined,
      reactionTerm: r.reaction_term,
      reactionOnsetDate: new Date(r.reaction_onset_date),
      severity: r.severity as AESeverity,
      isSerious: r.is_serious === 1,
      seriousnessCriteria: r.seriousness_criteria_json
        ? JSON.parse(r.seriousness_criteria_json)
        : undefined,
      expectedness: r.expectedness as Expectedness,
      dtxCategory: r.dtx_category || undefined,
      meddraPtCode: r.meddra_pt_code || undefined,
      meddraSoc: r.meddra_soc || undefined,
      customTerm: r.custom_term || undefined,
      description: r.description || undefined,
      onsetDate: new Date(r.onset_date),
      resolutionDate: r.resolution_date ? new Date(r.resolution_date) : undefined,
      outcome: (r.outcome as AEOutcome) || undefined,
      causality: (r.causality as CausalityAssessment) || undefined,
      actionTaken: (r.action_taken as ActionTaken) || undefined,
      currentIsi: r.current_isi || undefined,
      baselineIsi: r.baseline_isi || undefined,
      currentWeek: r.current_week || undefined,
      reportStatus: r.report_status as ReportStatus,
      regulatoryDeadline: r.regulatory_deadline ? new Date(r.regulatory_deadline) : undefined,
      submittedToRoszdravnadzor: r.submitted_to_roszdravnadzor
        ? new Date(r.submitted_to_roszdravnadzor)
        : undefined,
      submittedToEthics: r.submitted_to_ethics ? new Date(r.submitted_to_ethics) : undefined,
      reportedAt: new Date(r.reported_at),
      reportedBy: r.reported_by as ReportedBy,
      createdBy: r.created_by,
      notes: r.notes || undefined,
      createdAt: this.parseDate(r.created_at),
      updatedAt: this.parseDate(r.updated_at),
      deletedAt: r.deleted_at ? this.parseDate(r.deleted_at) : undefined,
    };
  }

  protected entityToParams(entity: Partial<IAdverseEventEntity>): Record<string, unknown> {
    return {
      uuid: entity.uuid,
      user_id: entity.userId,
      user_internal_id: entity.userInternalId || null,
      reporter_type: entity.reporterType,
      reporter_name: entity.reporterName || null,
      reporter_contact: entity.reporterContact || null,
      patient_initials: entity.patientInitials || null,
      patient_age: entity.patientAge || null,
      patient_sex: entity.patientSex || null,
      product_name: entity.productName,
      product_version: entity.productVersion || null,
      reaction_term: entity.reactionTerm,
      reaction_onset_date: entity.reactionOnsetDate?.toISOString(),
      severity: entity.severity,
      is_serious: entity.isSerious ? 1 : 0,
      seriousness_criteria_json: entity.seriousnessCriteria
        ? JSON.stringify(entity.seriousnessCriteria)
        : null,
      expectedness: entity.expectedness,
      dtx_category: entity.dtxCategory || null,
      meddra_pt_code: entity.meddraPtCode || null,
      meddra_soc: entity.meddraSoc || null,
      custom_term: entity.customTerm || null,
      description: entity.description || null,
      onset_date: entity.onsetDate?.toISOString(),
      resolution_date: entity.resolutionDate?.toISOString() || null,
      outcome: entity.outcome || null,
      causality: entity.causality || null,
      action_taken: entity.actionTaken || null,
      current_isi: entity.currentIsi || null,
      baseline_isi: entity.baselineIsi || null,
      current_week: entity.currentWeek || null,
      report_status: entity.reportStatus,
      regulatory_deadline: entity.regulatoryDeadline?.toISOString() || null,
      submitted_to_roszdravnadzor: entity.submittedToRoszdravnadzor?.toISOString() || null,
      submitted_to_ethics: entity.submittedToEthics?.toISOString() || null,
      reported_at: entity.reportedAt?.toISOString(),
      reported_by: entity.reportedBy,
      created_by: entity.createdBy,
      notes: entity.notes || null,
    };
  }

  protected getInsertColumns(): string[] {
    return [
      'user_id',
      'user_internal_id',
      'reporter_type',
      'reporter_name',
      'reporter_contact',
      'patient_initials',
      'patient_age',
      'patient_sex',
      'product_name',
      'product_version',
      'reaction_term',
      'reaction_onset_date',
      'severity',
      'is_serious',
      'seriousness_criteria_json',
      'expectedness',
      'dtx_category',
      'meddra_pt_code',
      'meddra_soc',
      'custom_term',
      'description',
      'onset_date',
      'resolution_date',
      'outcome',
      'causality',
      'action_taken',
      'current_isi',
      'baseline_isi',
      'current_week',
      'report_status',
      'regulatory_deadline',
      'reported_at',
      'reported_by',
      'created_by',
      'notes',
    ];
  }

  // ==================== Custom Queries ====================

  /**
   * Find AE by UUID (for external reference)
   */
  async findByUuid(uuid: string): Promise<IAdverseEventEntity | null> {
    const row = await this.db.queryOne<IAdverseEventRow>(
      `SELECT * FROM ${this.tableName} WHERE uuid = ? AND deleted_at IS NULL`,
      [uuid]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Find all AEs for a user
   */
  async findByUserId(
    userId: string,
    options?: IQueryOptions
  ): Promise<IAdverseEventEntity[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`;

    if (options?.orderBy) {
      const validated = validateOrderBy(options.orderBy, this.allowedOrderByColumns, options.orderDirection || 'DESC');
      sql += ` ORDER BY ${validated.column} ${validated.direction}`;
    } else {
      sql += ' ORDER BY reported_at DESC';
    }

    if (options?.limit) {
      sql += ` LIMIT ${Number(options.limit)}`;
    }

    if (options?.offset) {
      sql += ` OFFSET ${Number(options.offset)}`;
    }

    const rows = await this.db.query<IAdverseEventRow>(sql, [userId]);
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Find serious AEs
   */
  async findSerious(options?: IQueryOptions): Promise<IAdverseEventEntity[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE is_serious = 1 AND deleted_at IS NULL`;
    sql += ' ORDER BY reported_at DESC';

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    const rows = await this.db.query<IAdverseEventRow>(sql);
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Find AEs by status
   */
  async findByStatus(status: ReportStatus): Promise<IAdverseEventEntity[]> {
    const rows = await this.db.query<IAdverseEventRow>(
      `SELECT * FROM ${this.tableName} WHERE report_status = ? AND deleted_at IS NULL ORDER BY reported_at DESC`,
      [status]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Find AEs with approaching deadlines
   */
  async findApproachingDeadlines(daysAhead: number = 3): Promise<IAdverseEventEntity[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysAhead);

    const rows = await this.db.query<IAdverseEventRow>(
      `SELECT * FROM ${this.tableName}
       WHERE regulatory_deadline IS NOT NULL
         AND regulatory_deadline <= ?
         AND report_status NOT IN ('submitted_roszdravnadzor', 'closed')
         AND deleted_at IS NULL
       ORDER BY regulatory_deadline ASC`,
      [deadline.toISOString()]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    serious: number;
    nonSerious: number;
    pending: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    // Total
    const totalResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`
    );

    // Serious
    const seriousResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_serious = 1 AND deleted_at IS NULL`
    );

    // Pending
    const pendingResult = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE report_status NOT IN ('closed') AND deleted_at IS NULL`
    );

    // By category
    const categoryRows = await this.db.query<{ dtx_category: string; count: number }>(
      `SELECT COALESCE(dtx_category, 'OTHER') as dtx_category, COUNT(*) as count
       FROM ${this.tableName}
       WHERE deleted_at IS NULL
       GROUP BY dtx_category`
    );

    // By severity
    const severityRows = await this.db.query<{ severity: string; count: number }>(
      `SELECT severity, COUNT(*) as count
       FROM ${this.tableName}
       WHERE deleted_at IS NULL
       GROUP BY severity`
    );

    return {
      total: totalResult?.count || 0,
      serious: seriousResult?.count || 0,
      nonSerious: (totalResult?.count || 0) - (seriousResult?.count || 0),
      pending: pendingResult?.count || 0,
      byCategory: Object.fromEntries(categoryRows.map((r) => [r.dtx_category, r.count])),
      bySeverity: Object.fromEntries(severityRows.map((r) => [r.severity, r.count])),
    };
  }

  // ==================== Insert with Audit ====================

  /**
   * Insert with automatic audit trail
   * Note: uuid is auto-generated by the database, so it's not required in the input
   */
  async insertWithAudit(
    entity: Omit<IAdverseEventEntity, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    changedBy: string,
    context?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IAdverseEventEntity> {
    // Insert the entity (uuid will be auto-generated by database DEFAULT)
    // Cast needed because base insert expects uuid, but our DB generates it
    const inserted = await this.insert(entity as Omit<IAdverseEventEntity, 'id' | 'createdAt' | 'updatedAt'>);

    // Create audit entry
    await this.createAuditEntry({
      adverseEventId: inserted.id!,
      action: 'CREATE',
      changedBy,
      newValues: this.entityToParams(inserted),
      ...context,
    });

    return inserted;
  }

  /**
   * Update with automatic audit trail
   */
  async updateWithAudit(
    id: number,
    updates: Partial<IAdverseEventEntity>,
    changedBy: string,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string; sessionId?: string }
  ): Promise<IAdverseEventEntity | null> {
    // Get old values
    const oldEntity = await this.findById(id);
    if (!oldEntity) return null;

    // Update
    const updated = await this.update(id, updates);
    if (!updated) return null;

    // Create audit entry
    await this.createAuditEntry({
      adverseEventId: id,
      action: 'UPDATE',
      changedBy,
      oldValues: this.entityToParams(oldEntity),
      newValues: this.entityToParams(updated),
      reason,
      ...context,
    });

    return updated;
  }

  /**
   * Update status with audit
   */
  async updateStatus(
    id: number,
    newStatus: ReportStatus,
    changedBy: string,
    reason?: string
  ): Promise<IAdverseEventEntity | null> {
    const oldEntity = await this.findById(id);
    if (!oldEntity) return null;

    const updated = await this.update(id, { reportStatus: newStatus } as Partial<IAdverseEventEntity>);
    if (!updated) return null;

    await this.createAuditEntry({
      adverseEventId: id,
      action: 'STATUS_CHANGE',
      changedBy,
      oldValues: { report_status: oldEntity.reportStatus },
      newValues: { report_status: newStatus },
      reason,
    });

    return updated;
  }

  // ==================== Audit Trail ====================

  /**
   * Create audit entry
   */
  private async createAuditEntry(entry: {
    adverseEventId: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'SUBMISSION';
    changedBy: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    await this.db.execute(
      `INSERT INTO adverse_events_audit
       (adverse_event_id, action, changed_by, old_values_json, new_values_json, reason, ip_address, user_agent, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.adverseEventId,
        entry.action,
        entry.changedBy,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.reason || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.sessionId || null,
      ]
    );
  }

  /**
   * Get audit trail for an AE
   */
  async getAuditTrail(adverseEventId: number): Promise<IAdverseEventAuditEntry[]> {
    const rows = await this.db.query<{
      id: number;
      adverse_event_id: number;
      action: string;
      changed_at: string;
      changed_by: string;
      old_values_json: string | null;
      new_values_json: string | null;
      reason: string | null;
      ip_address: string | null;
      user_agent: string | null;
      session_id: string | null;
    }>(
      `SELECT * FROM adverse_events_audit WHERE adverse_event_id = ? ORDER BY changed_at DESC`,
      [adverseEventId]
    );

    return rows.map((r) => ({
      id: r.id,
      adverseEventId: r.adverse_event_id,
      action: r.action as IAdverseEventAuditEntry['action'],
      changedAt: new Date(r.changed_at),
      changedBy: r.changed_by,
      oldValues: r.old_values_json ? JSON.parse(r.old_values_json) : undefined,
      newValues: r.new_values_json ? JSON.parse(r.new_values_json) : undefined,
      reason: r.reason || undefined,
      ipAddress: r.ip_address || undefined,
      userAgent: r.user_agent || undefined,
      sessionId: r.session_id || undefined,
    }));
  }
}

// ==================== Safety Alert Repository ====================

/**
 * Safety Alert Repository
 */
export class SafetyAlertRepository {
  private readonly tableName = 'safety_alerts';

  constructor(private readonly db: IDatabaseConnection) {}

  /**
   * Create safety alert
   */
  async create(alert: Omit<ISafetyAlertEntity, 'id' | 'createdAt'>): Promise<ISafetyAlertEntity> {
    const result = await this.db.execute(
      `INSERT INTO ${this.tableName}
       (type, severity, user_id, user_display_name, message, adverse_event_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        alert.type,
        alert.severity,
        alert.userId,
        alert.userDisplayName || null,
        alert.message,
        alert.adverseEventId || null,
      ]
    );

    return this.findById(result.lastInsertRowid) as Promise<ISafetyAlertEntity>;
  }

  /**
   * Find by ID
   */
  async findById(id: number): Promise<ISafetyAlertEntity | null> {
    const row = await this.db.queryOne<ISafetyAlertRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Find unacknowledged alerts
   */
  async findUnacknowledged(): Promise<ISafetyAlertEntity[]> {
    const rows = await this.db.query<ISafetyAlertRow>(
      `SELECT * FROM ${this.tableName} WHERE acknowledged = 0 ORDER BY created_at DESC`
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Find alerts by user
   */
  async findByUserId(userId: string, limit: number = 100): Promise<ISafetyAlertEntity[]> {
    const rows = await this.db.query<ISafetyAlertRow>(
      `SELECT * FROM ${this.tableName} WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Find alerts by AE
   */
  async findByAdverseEventId(adverseEventId: number): Promise<ISafetyAlertEntity[]> {
    const rows = await this.db.query<ISafetyAlertRow>(
      `SELECT * FROM ${this.tableName} WHERE adverse_event_id = ? ORDER BY created_at DESC`,
      [adverseEventId]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Acknowledge alert
   */
  async acknowledge(id: number, acknowledgedBy: string): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE ${this.tableName}
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
       WHERE id = ? AND acknowledged = 0`,
      [acknowledgedBy, id]
    );
    return result.changes > 0;
  }

  /**
   * Escalate alert
   */
  async escalate(id: number, escalatedTo: string): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE ${this.tableName}
       SET escalated = 1, escalated_to = ?, escalated_at = datetime('now')
       WHERE id = ?`,
      [escalatedTo, id]
    );
    return result.changes > 0;
  }

  /**
   * Get all alerts
   */
  async findAll(limit: number = 100): Promise<ISafetyAlertEntity[]> {
    const rows = await this.db.query<ISafetyAlertRow>(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Check for duplicate alert
   */
  async hasDuplicateAlert(
    type: ISafetyAlertEntity['type'],
    adverseEventId: number
  ): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}
       WHERE type = ? AND adverse_event_id = ? AND acknowledged = 0`,
      [type, adverseEventId]
    );
    return (result?.count || 0) > 0;
  }

  private rowToEntity(row: ISafetyAlertRow): ISafetyAlertEntity {
    return {
      id: row.id,
      type: row.type as ISafetyAlertEntity['type'],
      severity: row.severity as 'warning' | 'critical',
      userId: row.user_id,
      userDisplayName: row.user_display_name || undefined,
      message: row.message,
      adverseEventId: row.adverse_event_id || undefined,
      acknowledged: row.acknowledged === 1,
      acknowledgedBy: row.acknowledged_by || undefined,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      escalated: row.escalated === 1,
      escalatedTo: row.escalated_to || undefined,
      escalatedAt: row.escalated_at ? new Date(row.escalated_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }
}

// ==================== Factory Functions ====================

/**
 * Create AdverseEventRepository
 */
export function createAdverseEventRepository(db: IDatabaseConnection): AdverseEventRepository {
  return new AdverseEventRepository(db);
}

/**
 * Create SafetyAlertRepository
 */
export function createSafetyAlertRepository(db: IDatabaseConnection): SafetyAlertRepository {
  return new SafetyAlertRepository(db);
}
