/**
 * Adverse Event Reporting Service
 * ================================
 * Clinical pilot adverse event tracking and reporting.
 *
 * Research basis (2025-2026):
 * - ICH E6(R3): Step 4 final guideline (January 6, 2025)
 * - ICH E2A/E2B: 15 days SUSAR/SAE, 7 days fatal/life-threatening
 * - CIOMS Form I: 4 minimum elements (source, patient, drug/device, reaction)
 * - MedDRA: 5-level hierarchy for AE coding
 * - Roszdravnadzor: 15 days serious, 90 days non-serious (Order 200n)
 * - "Digitalovigilance" for DTx (JMIR 2023)
 *
 * DTx-specific considerations:
 * - Symptom deterioration (ISI increase >=7) as potential AE
 * - Psychological AEs: frustration, anxiety, hopelessness
 * - Treatment burden: fatigue from sleep restriction
 * - Technical issues affecting safety (app failures)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { IDatabaseConnection } from '../../infrastructure/database/interfaces/IDatabaseConnection';
import {
  AdverseEventRepository,
  SafetyAlertRepository,
  type IAdverseEventEntity,
  type ISafetyAlertEntity,
  createAdverseEventRepository,
  createSafetyAlertRepository,
} from '../../infrastructure/database';

// ==================== Types ====================

/**
 * AE severity classification (ICH E2A)
 */
export type AESeverity = 'mild' | 'moderate' | 'severe';

/**
 * AE seriousness criteria (ICH E2A)
 * Serious AE = any of these outcomes
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
 * AE expectedness based on known DTx/CBT-I profile
 */
export type Expectedness = 'expected' | 'unexpected';

/**
 * AE action taken with therapy
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
 * DTx-specific AE categories
 * Based on JMIR Mental Health 2023 systematic review
 */
export const DTX_AE_CATEGORIES = {
  // Primary outcome deterioration
  SYMPTOM_DETERIORATION: {
    code: 'DTX001',
    term: 'Insomnia symptom deterioration',
    meddraSOC: 'Psychiatric disorders',
    description: 'ISI score increase >=7 points from baseline',
  },
  // Psychological reactions
  ANXIETY_INCREASE: {
    code: 'DTX002',
    term: 'Anxiety increase',
    meddraSOC: 'Psychiatric disorders',
    description: 'Increased anxiety related to sleep restriction or therapy',
  },
  FRUSTRATION: {
    code: 'DTX003',
    term: 'Treatment-related frustration',
    meddraSOC: 'Psychiatric disorders',
    description: 'Significant frustration with therapy demands',
  },
  HOPELESSNESS: {
    code: 'DTX004',
    term: 'Hopelessness',
    meddraSOC: 'Psychiatric disorders',
    description: 'Feelings of hopelessness about sleep improvement',
  },
  // Physical symptoms
  EXCESSIVE_DAYTIME_SLEEPINESS: {
    code: 'DTX005',
    term: 'Excessive daytime sleepiness',
    meddraSOC: 'Nervous system disorders',
    description: 'Daytime sleepiness during sleep restriction phase',
  },
  FATIGUE: {
    code: 'DTX006',
    term: 'Fatigue',
    meddraSOC: 'General disorders',
    description: 'Increased fatigue from sleep restriction',
  },
  HEADACHE: {
    code: 'DTX007',
    term: 'Headache',
    meddraSOC: 'Nervous system disorders',
    description: 'Headache possibly related to sleep changes',
  },
  DIZZINESS: {
    code: 'DTX008',
    term: 'Dizziness',
    meddraSOC: 'Nervous system disorders',
    description: 'Dizziness during sleep restriction',
  },
  // Safety-critical
  SUICIDAL_IDEATION: {
    code: 'DTX009',
    term: 'Suicidal ideation',
    meddraSOC: 'Psychiatric disorders',
    description: 'New or worsening suicidal thoughts',
    alwaysSerious: true,
  },
  ACCIDENT_INJURY: {
    code: 'DTX010',
    term: 'Accident or injury',
    meddraSOC: 'Injury, poisoning',
    description: 'Accident or injury possibly related to sleepiness',
  },
  // Technical issues affecting safety
  APP_MALFUNCTION: {
    code: 'DTX011',
    term: 'App malfunction affecting safety',
    meddraSOC: 'Product issues',
    description: 'Technical issue that impacted therapy safety',
  },
} as const;

/**
 * CIOMS Form I minimum data elements
 */
export interface ICIOMSMinimumData {
  /** E.1 Identifiable source (reporter) */
  reporterType: 'patient' | 'healthcare_professional' | 'other';
  reporterName?: string;
  reporterContact?: string;

  /** E.2 Identifiable patient */
  patientId: string;
  patientInitials?: string;
  patientAge?: number;
  patientSex?: 'male' | 'female' | 'other';

  /** E.3 Suspect product */
  productName: string;
  productVersion?: string;

  /** E.4 Suspect adverse reaction */
  reactionTerm: string;
  reactionOnsetDate: Date;
}

/**
 * Full Adverse Event Report
 */
export interface IAdverseEventReport {
  /** Unique report ID */
  id?: number;

  /** User reference */
  userId: string;
  userInternalId?: number;

  /** CIOMS minimum data */
  cioms: ICIOMSMinimumData;

  /** AE classification */
  severity: AESeverity;
  isSerious: boolean;
  seriousnessCriteria?: SeriousnessCriteria[];
  expectedness: Expectedness;

  /** DTx-specific category */
  dtxCategory?: keyof typeof DTX_AE_CATEGORIES;
  customTerm?: string;

  /** Clinical details */
  description: string;
  onsetDate: Date;
  resolutionDate?: Date;
  outcome: AEOutcome;

  /** Assessment */
  causality: CausalityAssessment;
  actionTaken: ActionTaken;

  /** Context data */
  currentISI?: number;
  baselineISI?: number;
  currentWeek?: number;

  /** Regulatory tracking */
  reportStatus: ReportStatus;
  regulatoryDeadline?: Date;
  submittedToRoszdravnadzor?: Date;
  submittedToEthics?: Date;

  /** Metadata */
  reportedAt: Date;
  reportedBy: 'patient' | 'system' | 'clinician';
  lastUpdatedAt?: Date;
  notes?: string;
}

/**
 * Safety alert for immediate attention
 */
export interface ISafetyAlert {
  type: 'ISI_WORSENING' | 'SERIOUS_AE' | 'SUSAR' | 'DEADLINE_APPROACHING';
  severity: 'warning' | 'critical';
  userId: string;
  userDisplayName?: string;
  message: string;
  eventId?: number;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// ==================== Configuration ====================

const AE_CONFIG = {
  /** ISI increase threshold to auto-flag as potential AE */
  isiWorseningThreshold: 7,
  /** Serious AE reporting deadline (days) */
  seriousDeadlineDays: 15,
  /** Fatal/life-threatening deadline (days) */
  fatalDeadlineDays: 7,
  /** Non-serious AE deadline (days) - Russia Order 200n */
  nonSeriousDeadlineDays: 90,
  /** Reminder before deadline (days) */
  deadlineReminderDays: 3,
} as const;

// ==================== Adverse Event Service ====================

/**
 * Adverse Event Reporting Service
 * Manages AE tracking, classification, and regulatory compliance
 *
 * **UPDATED 2026-01-26:** Now uses real database via AdverseEventRepository
 * instead of in-memory storage. Full 21 CFR Part 11 audit trail enabled.
 */
export class AdverseEventService {
  private readonly db: IDatabaseConnection;
  private readonly aeRepository: AdverseEventRepository;
  private readonly alertRepository: SafetyAlertRepository;

  constructor(db: IDatabaseConnection) {
    this.db = db;
    this.aeRepository = createAdverseEventRepository(db);
    this.alertRepository = createSafetyAlertRepository(db);
  }

  // ==================== Event Reporting ====================

  /**
   * Report new adverse event
   * Auto-calculates regulatory deadlines based on seriousness
   * Now persists to database with full audit trail (21 CFR Part 11)
   */
  async reportAdverseEvent(
    report: Omit<IAdverseEventReport, 'id' | 'reportedAt' | 'regulatoryDeadline' | 'reportStatus'>
  ): Promise<IAdverseEventReport> {
    const reportedAt = new Date();

    // Calculate regulatory deadline (ICH E2A / Roszdravnadzor Order 200n)
    let deadlineDays: number;
    if (report.isSerious) {
      if (report.seriousnessCriteria?.includes('death') ||
          report.seriousnessCriteria?.includes('life_threatening')) {
        deadlineDays = AE_CONFIG.fatalDeadlineDays;
      } else {
        deadlineDays = AE_CONFIG.seriousDeadlineDays;
      }
    } else {
      deadlineDays = AE_CONFIG.nonSeriousDeadlineDays;
    }

    const regulatoryDeadline = new Date(reportedAt);
    regulatoryDeadline.setDate(regulatoryDeadline.getDate() + deadlineDays);

    // Convert IAdverseEventReport to IAdverseEventEntity format
    const entityData: Omit<IAdverseEventEntity, 'id' | 'uuid' | 'createdAt' | 'updatedAt'> = {
      userId: report.userId,
      userInternalId: report.userInternalId,
      reporterType: report.cioms.reporterType,
      reporterName: report.cioms.reporterName,
      reporterContact: report.cioms.reporterContact,
      patientInitials: report.cioms.patientInitials,
      patientAge: report.cioms.patientAge,
      patientSex: report.cioms.patientSex,
      productName: report.cioms.productName,
      productVersion: report.cioms.productVersion,
      reactionTerm: report.cioms.reactionTerm,
      reactionOnsetDate: report.cioms.reactionOnsetDate,
      severity: report.severity,
      isSerious: report.isSerious,
      seriousnessCriteria: report.seriousnessCriteria,
      expectedness: report.expectedness,
      dtxCategory: report.dtxCategory,
      customTerm: report.customTerm,
      description: report.description,
      onsetDate: report.onsetDate,
      resolutionDate: report.resolutionDate,
      outcome: report.outcome,
      causality: report.causality,
      actionTaken: report.actionTaken,
      currentIsi: report.currentISI,
      baselineIsi: report.baselineISI,
      currentWeek: report.currentWeek,
      reportStatus: 'draft',
      regulatoryDeadline,
      reportedAt,
      reportedBy: report.reportedBy,
      createdBy: report.reportedBy,
      notes: report.notes,
    };

    // Insert with audit trail (21 CFR Part 11 compliance)
    const inserted = await this.aeRepository.insertWithAudit(
      entityData,
      report.reportedBy,
      {} // context can include ipAddress, userAgent, sessionId
    );

    // Convert back to IAdverseEventReport format
    const fullReport = this.entityToReport(inserted);

    // Log to console (audit trail)
    this.logAEAction('REPORT_CREATED', fullReport);

    // Create safety alert if serious
    if (fullReport.isSerious) {
      await this.createSafetyAlert({
        type: 'SERIOUS_AE',
        severity: 'critical',
        userId: fullReport.userId,
        message: `Serious AE reported: ${fullReport.cioms.reactionTerm}`,
        eventId: fullReport.id,
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    // Check for SUSAR (unexpected serious)
    if (fullReport.isSerious && fullReport.expectedness === 'unexpected') {
      await this.createSafetyAlert({
        type: 'SUSAR',
        severity: 'critical',
        userId: fullReport.userId,
        message: `SUSAR: ${fullReport.cioms.reactionTerm} - Requires expedited reporting`,
        eventId: fullReport.id,
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    return fullReport;
  }

  /**
   * Update existing AE report
   * Persists to database with audit trail (21 CFR Part 11)
   */
  async updateAdverseEvent(
    id: number,
    updates: Partial<IAdverseEventReport>,
    changedBy: string = 'system',
    reason?: string
  ): Promise<IAdverseEventReport | null> {
    // Build entity updates object (without readonly constraints)
    const entityUpdates: Record<string, unknown> = {};

    if (updates.severity !== undefined) entityUpdates['severity'] = updates.severity;
    if (updates.isSerious !== undefined) entityUpdates['isSerious'] = updates.isSerious;
    if (updates.seriousnessCriteria !== undefined) entityUpdates['seriousnessCriteria'] = updates.seriousnessCriteria;
    if (updates.expectedness !== undefined) entityUpdates['expectedness'] = updates.expectedness;
    if (updates.outcome !== undefined) entityUpdates['outcome'] = updates.outcome;
    if (updates.causality !== undefined) entityUpdates['causality'] = updates.causality;
    if (updates.actionTaken !== undefined) entityUpdates['actionTaken'] = updates.actionTaken;
    if (updates.description !== undefined) entityUpdates['description'] = updates.description;
    if (updates.resolutionDate !== undefined) entityUpdates['resolutionDate'] = updates.resolutionDate;
    if (updates.reportStatus !== undefined) entityUpdates['reportStatus'] = updates.reportStatus;
    if (updates.regulatoryDeadline !== undefined) entityUpdates['regulatoryDeadline'] = updates.regulatoryDeadline;
    if (updates.notes !== undefined) entityUpdates['notes'] = updates.notes;

    const updatedEntity = await this.aeRepository.updateWithAudit(
      id,
      entityUpdates as Partial<IAdverseEventEntity>,
      changedBy,
      reason
    );

    if (!updatedEntity) return null;

    const updated = this.entityToReport(updatedEntity);
    this.logAEAction('REPORT_UPDATED', updated);

    return updated;
  }

  /**
   * Auto-detect potential AE from ISI score change
   * Called after each ISI assessment
   */
  async checkISIDeterioration(
    userId: string,
    baselineISI: number,
    currentISI: number,
    currentWeek: number
  ): Promise<IAdverseEventReport | null> {
    const isiIncrease = currentISI - baselineISI;

    if (isiIncrease >= AE_CONFIG.isiWorseningThreshold) {
      // Create safety alert
      this.createSafetyAlert({
        type: 'ISI_WORSENING',
        severity: 'warning',
        userId,
        message: `ISI worsening detected: +${isiIncrease} points (${baselineISI} -> ${currentISI})`,
        createdAt: new Date(),
        acknowledged: false,
      });

      // Auto-create draft AE report for review
      const report = await this.reportAdverseEvent({
        userId,
        cioms: {
          reporterType: 'patient',
          patientId: userId,
          productName: 'SleepCore DTx',
          productVersion: '1.0.0',
          reactionTerm: DTX_AE_CATEGORIES.SYMPTOM_DETERIORATION.term,
          reactionOnsetDate: new Date(),
        },
        severity: 'moderate',
        isSerious: false, // May need clinical review
        expectedness: 'expected', // Known possibility with CBT-I
        dtxCategory: 'SYMPTOM_DETERIORATION',
        description: `Automated detection: ISI increased by ${isiIncrease} points from baseline ${baselineISI} to ${currentISI} at week ${currentWeek}`,
        onsetDate: new Date(),
        outcome: 'not_recovered',
        causality: 'possible',
        actionTaken: 'none',
        currentISI,
        baselineISI,
        currentWeek,
        reportedBy: 'system',
      });

      console.log(`[AE Service] Auto-detected ISI worsening for user ${userId}: +${isiIncrease} points`);
      return report;
    }

    return null;
  }

  // ==================== Patient Self-Report ====================

  /**
   * Create AE report from patient self-report
   * Returns structured questions for guided reporting
   */
  getPatientReportQuestions(): Array<{
    id: string;
    question: string;
    type: 'select' | 'text' | 'date';
    options?: Array<{ value: string; label: string }>;
  }> {
    return [
      {
        id: 'category',
        question: 'Какой тип проблемы вы хотите сообщить?',
        type: 'select',
        options: [
          { value: 'SYMPTOM_DETERIORATION', label: 'Ухудшение сна' },
          { value: 'ANXIETY_INCREASE', label: 'Усиление тревоги' },
          { value: 'FRUSTRATION', label: 'Фрустрация от терапии' },
          { value: 'EXCESSIVE_DAYTIME_SLEEPINESS', label: 'Сильная дневная сонливость' },
          { value: 'FATIGUE', label: 'Сильная усталость' },
          { value: 'HEADACHE', label: 'Головная боль' },
          { value: 'DIZZINESS', label: 'Головокружение' },
          { value: 'ACCIDENT_INJURY', label: 'Несчастный случай или травма' },
          { value: 'OTHER', label: 'Другое' },
        ],
      },
      {
        id: 'severity',
        question: 'Насколько серьёзна проблема?',
        type: 'select',
        options: [
          { value: 'mild', label: 'Лёгкая - не мешает обычной жизни' },
          { value: 'moderate', label: 'Умеренная - некоторые ограничения' },
          { value: 'severe', label: 'Тяжёлая - значительно мешает' },
        ],
      },
      {
        id: 'onset',
        question: 'Когда это началось?',
        type: 'select',
        options: [
          { value: 'today', label: 'Сегодня' },
          { value: 'yesterday', label: 'Вчера' },
          { value: 'this_week', label: 'На этой неделе' },
          { value: 'earlier', label: 'Раньше' },
        ],
      },
      {
        id: 'description',
        question: 'Опишите, что произошло:',
        type: 'text',
      },
      {
        id: 'serious_check',
        question: 'Требовалась ли медицинская помощь?',
        type: 'select',
        options: [
          { value: 'no', label: 'Нет' },
          { value: 'outpatient', label: 'Да, амбулаторно' },
          { value: 'hospitalized', label: 'Да, госпитализация' },
          { value: 'emergency', label: 'Да, экстренная помощь' },
        ],
      },
    ];
  }

  /**
   * Process patient self-report answers
   */
  async processPatientReport(
    userId: string,
    answers: Record<string, string>,
    contextData?: { currentISI?: number; baselineISI?: number; currentWeek?: number }
  ): Promise<IAdverseEventReport> {
    const category = answers.category as keyof typeof DTX_AE_CATEGORIES | 'OTHER';
    const severity = answers.severity as AESeverity;
    const seriousCheck = answers.serious_check;

    // Determine if serious based on medical help required
    const isSerious = seriousCheck === 'hospitalized' || seriousCheck === 'emergency';
    const seriousnessCriteria: SeriousnessCriteria[] = [];
    if (seriousCheck === 'hospitalized') {
      seriousnessCriteria.push('hospitalization');
    }
    if (seriousCheck === 'emergency') {
      seriousnessCriteria.push('medically_important');
    }

    // Get reaction term
    let reactionTerm: string;
    let dtxCategory: keyof typeof DTX_AE_CATEGORIES | undefined;

    if (category !== 'OTHER' && category in DTX_AE_CATEGORIES) {
      dtxCategory = category;
      reactionTerm = DTX_AE_CATEGORIES[category].term;
    } else {
      reactionTerm = answers.description?.substring(0, 50) || 'Patient-reported event';
    }

    // Determine expectedness
    const expectedCategories: (keyof typeof DTX_AE_CATEGORIES)[] = [
      'SYMPTOM_DETERIORATION',
      'EXCESSIVE_DAYTIME_SLEEPINESS',
      'FATIGUE',
      'FRUSTRATION',
    ];
    const expectedness: Expectedness = dtxCategory && expectedCategories.includes(dtxCategory)
      ? 'expected'
      : 'unexpected';

    // Calculate onset date
    const onsetDate = new Date();
    switch (answers.onset) {
      case 'yesterday':
        onsetDate.setDate(onsetDate.getDate() - 1);
        break;
      case 'this_week':
        onsetDate.setDate(onsetDate.getDate() - 3);
        break;
      case 'earlier':
        onsetDate.setDate(onsetDate.getDate() - 7);
        break;
    }

    return this.reportAdverseEvent({
      userId,
      cioms: {
        reporterType: 'patient',
        patientId: userId,
        productName: 'SleepCore DTx',
        productVersion: '1.0.0',
        reactionTerm,
        reactionOnsetDate: onsetDate,
      },
      severity,
      isSerious,
      seriousnessCriteria: isSerious ? seriousnessCriteria : undefined,
      expectedness,
      dtxCategory,
      description: answers.description || '',
      onsetDate,
      outcome: 'not_recovered',
      causality: 'possible', // Default, needs clinical review
      actionTaken: 'none',
      currentISI: contextData?.currentISI,
      baselineISI: contextData?.baselineISI,
      currentWeek: contextData?.currentWeek,
      reportedBy: 'patient',
    });
  }

  // ==================== Safety Alerts ====================

  /**
   * Create safety alert
   * Now persists to database for regulatory compliance
   */
  private async createSafetyAlert(alert: ISafetyAlert): Promise<void> {
    // Check for duplicate unacknowledged alert
    if (alert.eventId) {
      const hasDuplicate = await this.alertRepository.hasDuplicateAlert(
        alert.type as ISafetyAlertEntity['type'],
        alert.eventId
      );
      if (hasDuplicate) {
        console.log(`[AE Service] Duplicate alert suppressed: ${alert.type} for event ${alert.eventId}`);
        return;
      }
    }

    await this.alertRepository.create({
      type: alert.type as ISafetyAlertEntity['type'],
      severity: alert.severity,
      userId: alert.userId,
      userDisplayName: alert.userDisplayName,
      message: alert.message,
      adverseEventId: alert.eventId,
      acknowledged: false,
      escalated: false,
    });

    console.log(
      `[AE Service] SAFETY ALERT: ${alert.type} | ${alert.severity} | User: ${alert.userId} | ${alert.message}`
    );
  }

  /**
   * Get all unacknowledged safety alerts
   */
  async getUnacknowledgedAlerts(): Promise<ISafetyAlert[]> {
    const entities = await this.alertRepository.findUnacknowledged();
    return entities.map((e) => this.alertEntityToAlert(e));
  }

  /**
   * Get all safety alerts
   */
  async getAllAlerts(limit: number = 100): Promise<ISafetyAlert[]> {
    const entities = await this.alertRepository.findAll(limit);
    return entities.map((e) => this.alertEntityToAlert(e));
  }

  /**
   * Acknowledge safety alert
   */
  async acknowledgeAlert(id: number, acknowledgedBy: string): Promise<boolean> {
    return this.alertRepository.acknowledge(id, acknowledgedBy);
  }

  // ==================== Deadline Monitoring ====================

  /**
   * Check for approaching deadlines
   * Should be called daily by cron job
   */
  async checkDeadlines(): Promise<ISafetyAlert[]> {
    const now = new Date();
    const newAlerts: ISafetyAlert[] = [];

    // Get events with approaching deadlines from database
    const eventsApproaching = await this.aeRepository.findApproachingDeadlines(
      AE_CONFIG.deadlineReminderDays
    );

    for (const entity of eventsApproaching) {
      if (!entity.regulatoryDeadline) continue;

      const daysUntilDeadline = Math.ceil(
        (entity.regulatoryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline > 0) {
        const alert: ISafetyAlert = {
          type: 'DEADLINE_APPROACHING',
          severity: daysUntilDeadline <= 1 ? 'critical' : 'warning',
          userId: entity.userId,
          message: `AE Report #${entity.id} deadline in ${daysUntilDeadline} days: ${entity.reactionTerm}`,
          eventId: entity.id,
          createdAt: new Date(),
          acknowledged: false,
        };

        // createSafetyAlert now handles duplicate checking
        await this.createSafetyAlert(alert);
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  // ==================== Queries ====================

  /**
   * Get all AE reports
   */
  async getAllReports(filters?: {
    userId?: string;
    isSerious?: boolean;
    status?: ReportStatus;
  }): Promise<IAdverseEventReport[]> {
    let entities: IAdverseEventEntity[];

    if (filters?.userId) {
      entities = await this.aeRepository.findByUserId(filters.userId);
    } else if (filters?.isSerious !== undefined) {
      const all = await (filters.isSerious
        ? this.aeRepository.findSerious()
        : this.aeRepository.findAll());
      entities = filters.isSerious ? all : all.filter((e) => !e.isSerious);
    } else if (filters?.status) {
      entities = await this.aeRepository.findByStatus(filters.status);
    } else {
      entities = await this.aeRepository.findAll();
    }

    // Apply additional filters if needed
    if (filters?.userId && filters?.isSerious !== undefined) {
      entities = entities.filter((e) => e.isSerious === filters.isSerious);
    }
    if (filters?.userId && filters?.status) {
      entities = entities.filter((e) => e.reportStatus === filters.status);
    }

    return entities.map((e) => this.entityToReport(e));
  }

  /**
   * Get AE report by ID
   */
  async getReportById(id: number): Promise<IAdverseEventReport | undefined> {
    const entity = await this.aeRepository.findById(id);
    return entity ? this.entityToReport(entity) : undefined;
  }

  /**
   * Get AE statistics for dashboard
   */
  async getStatistics(): Promise<{
    total: number;
    serious: number;
    nonSerious: number;
    pending: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    return this.aeRepository.getStatistics();
  }

  // ==================== Export ====================

  /**
   * Export AE report in CIOMS-like format
   * For regulatory submission
   */
  async exportCIOMSFormat(id: number): Promise<string | null> {
    const report = await this.getReportById(id);
    if (!report) return null;

    const lines = [
      '========== CIOMS FORM I - ADVERSE EVENT REPORT ==========',
      '',
      `Report ID: ${report.id}`,
      `Report Date: ${report.reportedAt.toISOString()}`,
      '',
      '--- E.1 REPORTER IDENTIFICATION ---',
      `Type: ${report.cioms.reporterType}`,
      report.cioms.reporterName ? `Name: ${report.cioms.reporterName}` : '',
      '',
      '--- E.2 PATIENT IDENTIFICATION ---',
      `Patient ID: ${report.cioms.patientId}`,
      report.cioms.patientInitials ? `Initials: ${report.cioms.patientInitials}` : '',
      report.cioms.patientAge ? `Age: ${report.cioms.patientAge}` : '',
      report.cioms.patientSex ? `Sex: ${report.cioms.patientSex}` : '',
      '',
      '--- E.3 SUSPECT PRODUCT ---',
      `Product: ${report.cioms.productName}`,
      report.cioms.productVersion ? `Version: ${report.cioms.productVersion}` : '',
      '',
      '--- E.4 ADVERSE REACTION ---',
      `Reaction Term: ${report.cioms.reactionTerm}`,
      `Onset Date: ${report.onsetDate.toISOString().split('T')[0]}`,
      report.resolutionDate ? `Resolution Date: ${report.resolutionDate.toISOString().split('T')[0]}` : '',
      '',
      '--- CLASSIFICATION ---',
      `Severity: ${report.severity}`,
      `Serious: ${report.isSerious ? 'Yes' : 'No'}`,
      report.seriousnessCriteria?.length ? `Seriousness Criteria: ${report.seriousnessCriteria.join(', ')}` : '',
      `Expectedness: ${report.expectedness}`,
      `Outcome: ${report.outcome}`,
      '',
      '--- ASSESSMENT ---',
      `Causality: ${report.causality}`,
      `Action Taken: ${report.actionTaken}`,
      '',
      '--- DESCRIPTION ---',
      report.description,
      '',
      '--- CONTEXT ---',
      report.baselineISI !== undefined ? `Baseline ISI: ${report.baselineISI}` : '',
      report.currentISI !== undefined ? `Current ISI: ${report.currentISI}` : '',
      report.currentWeek !== undefined ? `Program Week: ${report.currentWeek}` : '',
      '',
      '--- REGULATORY STATUS ---',
      `Status: ${report.reportStatus}`,
      report.regulatoryDeadline ? `Deadline: ${report.regulatoryDeadline.toISOString().split('T')[0]}` : '',
      '',
      '==========================================================',
    ];

    return lines.filter((l) => l !== '').join('\n');
  }

  // ==================== Audit Logging ====================

  /**
   * Log AE-related action (audit trail)
   */
  private logAEAction(action: string, report: IAdverseEventReport): void {
    console.log(
      `[AE Audit] ${new Date().toISOString()} | ${action} | ` +
        `ID: ${report.id} | User: ${report.userId} | ` +
        `Serious: ${report.isSerious} | Term: ${report.cioms.reactionTerm}`
    );
  }

  // ==================== Conversion Helpers ====================

  /**
   * Convert database entity to service report format
   */
  private entityToReport(entity: IAdverseEventEntity): IAdverseEventReport {
    return {
      id: entity.id,
      userId: entity.userId,
      userInternalId: entity.userInternalId,
      cioms: {
        reporterType: entity.reporterType,
        reporterName: entity.reporterName,
        reporterContact: entity.reporterContact,
        patientId: entity.userId,
        patientInitials: entity.patientInitials,
        patientAge: entity.patientAge,
        patientSex: entity.patientSex,
        productName: entity.productName,
        productVersion: entity.productVersion,
        reactionTerm: entity.reactionTerm,
        reactionOnsetDate: entity.reactionOnsetDate,
      },
      severity: entity.severity,
      isSerious: entity.isSerious,
      seriousnessCriteria: entity.seriousnessCriteria,
      expectedness: entity.expectedness,
      dtxCategory: entity.dtxCategory as keyof typeof DTX_AE_CATEGORIES | undefined,
      customTerm: entity.customTerm,
      description: entity.description || '',
      onsetDate: entity.onsetDate,
      resolutionDate: entity.resolutionDate,
      outcome: entity.outcome || 'unknown',
      causality: entity.causality || 'unassessable',
      actionTaken: entity.actionTaken || 'none',
      currentISI: entity.currentIsi,
      baselineISI: entity.baselineIsi,
      currentWeek: entity.currentWeek,
      reportStatus: entity.reportStatus,
      regulatoryDeadline: entity.regulatoryDeadline,
      submittedToRoszdravnadzor: entity.submittedToRoszdravnadzor,
      submittedToEthics: entity.submittedToEthics,
      reportedAt: entity.reportedAt,
      reportedBy: entity.reportedBy,
      lastUpdatedAt: entity.updatedAt,
      notes: entity.notes,
    };
  }

  /**
   * Convert safety alert entity to service alert format
   */
  private alertEntityToAlert(entity: ISafetyAlertEntity): ISafetyAlert {
    return {
      type: entity.type as ISafetyAlert['type'],
      severity: entity.severity,
      userId: entity.userId,
      userDisplayName: entity.userDisplayName,
      message: entity.message,
      eventId: entity.adverseEventId,
      createdAt: entity.createdAt || new Date(),
      acknowledged: entity.acknowledged,
      acknowledgedBy: entity.acknowledgedBy,
      acknowledgedAt: entity.acknowledgedAt,
    };
  }
}

// ==================== Factory ====================

export function createAdverseEventService(db: IDatabaseConnection): AdverseEventService {
  return new AdverseEventService(db);
}

export default AdverseEventService;
