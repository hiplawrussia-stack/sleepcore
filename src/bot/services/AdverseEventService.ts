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
 */
export class AdverseEventService {
  private db: IDatabaseConnection;
  private events: Map<number, IAdverseEventReport> = new Map();
  private alerts: ISafetyAlert[] = [];
  private nextEventId = 1;

  constructor(db: IDatabaseConnection) {
    this.db = db;
  }

  // ==================== Event Reporting ====================

  /**
   * Report new adverse event
   * Auto-calculates regulatory deadlines based on seriousness
   */
  async reportAdverseEvent(
    report: Omit<IAdverseEventReport, 'id' | 'reportedAt' | 'regulatoryDeadline' | 'reportStatus'>
  ): Promise<IAdverseEventReport> {
    const id = this.nextEventId++;
    const reportedAt = new Date();

    // Calculate regulatory deadline
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

    const fullReport: IAdverseEventReport = {
      ...report,
      id,
      reportedAt,
      regulatoryDeadline,
      reportStatus: 'draft',
    };

    this.events.set(id, fullReport);

    // Log to console (audit trail)
    this.logAEAction('REPORT_CREATED', fullReport);

    // Create safety alert if serious
    if (fullReport.isSerious) {
      this.createSafetyAlert({
        type: 'SERIOUS_AE',
        severity: 'critical',
        userId: fullReport.userId,
        message: `Serious AE reported: ${fullReport.cioms.reactionTerm}`,
        eventId: id,
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    // Check for SUSAR (unexpected serious)
    if (fullReport.isSerious && fullReport.expectedness === 'unexpected') {
      this.createSafetyAlert({
        type: 'SUSAR',
        severity: 'critical',
        userId: fullReport.userId,
        message: `SUSAR: ${fullReport.cioms.reactionTerm} - Requires expedited reporting`,
        eventId: id,
        createdAt: new Date(),
        acknowledged: false,
      });
    }

    return fullReport;
  }

  /**
   * Update existing AE report
   */
  async updateAdverseEvent(
    id: number,
    updates: Partial<IAdverseEventReport>
  ): Promise<IAdverseEventReport | null> {
    const existing = this.events.get(id);
    if (!existing) return null;

    const updated: IAdverseEventReport = {
      ...existing,
      ...updates,
      lastUpdatedAt: new Date(),
    };

    this.events.set(id, updated);
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
    let onsetDate = new Date();
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
   */
  private createSafetyAlert(alert: ISafetyAlert): void {
    this.alerts.push(alert);
    console.log(
      `[AE Service] SAFETY ALERT: ${alert.type} | ${alert.severity} | User: ${alert.userId} | ${alert.message}`
    );
  }

  /**
   * Get all unacknowledged safety alerts
   */
  getUnacknowledgedAlerts(): ISafetyAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Get all safety alerts
   */
  getAllAlerts(limit: number = 100): ISafetyAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Acknowledge safety alert
   */
  acknowledgeAlert(index: number, acknowledgedBy: string): boolean {
    if (index < 0 || index >= this.alerts.length) return false;

    this.alerts[index].acknowledged = true;
    this.alerts[index].acknowledgedBy = acknowledgedBy;
    this.alerts[index].acknowledgedAt = new Date();

    return true;
  }

  // ==================== Deadline Monitoring ====================

  /**
   * Check for approaching deadlines
   * Should be called daily by cron job
   */
  checkDeadlines(): ISafetyAlert[] {
    const now = new Date();
    const newAlerts: ISafetyAlert[] = [];

    for (const [id, event] of this.events) {
      if (!event.regulatoryDeadline) continue;
      if (event.reportStatus === 'closed') continue;
      if (event.reportStatus === 'submitted_roszdravnadzor') continue;

      const daysUntilDeadline = Math.ceil(
        (event.regulatoryDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline <= AE_CONFIG.deadlineReminderDays && daysUntilDeadline > 0) {
        const alert: ISafetyAlert = {
          type: 'DEADLINE_APPROACHING',
          severity: daysUntilDeadline <= 1 ? 'critical' : 'warning',
          userId: event.userId,
          message: `AE Report #${id} deadline in ${daysUntilDeadline} days: ${event.cioms.reactionTerm}`,
          eventId: id,
          createdAt: new Date(),
          acknowledged: false,
        };

        // Avoid duplicate alerts
        const existingAlert = this.alerts.find(
          (a) => a.type === 'DEADLINE_APPROACHING' && a.eventId === id && !a.acknowledged
        );
        if (!existingAlert) {
          this.createSafetyAlert(alert);
          newAlerts.push(alert);
        }
      }
    }

    return newAlerts;
  }

  // ==================== Queries ====================

  /**
   * Get all AE reports
   */
  getAllReports(filters?: {
    userId?: string;
    isSerious?: boolean;
    status?: ReportStatus;
  }): IAdverseEventReport[] {
    let reports = Array.from(this.events.values());

    if (filters?.userId) {
      reports = reports.filter((r) => r.userId === filters.userId);
    }
    if (filters?.isSerious !== undefined) {
      reports = reports.filter((r) => r.isSerious === filters.isSerious);
    }
    if (filters?.status) {
      reports = reports.filter((r) => r.reportStatus === filters.status);
    }

    return reports.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
  }

  /**
   * Get AE report by ID
   */
  getReportById(id: number): IAdverseEventReport | undefined {
    return this.events.get(id);
  }

  /**
   * Get AE statistics for dashboard
   */
  getStatistics(): {
    total: number;
    serious: number;
    nonSerious: number;
    pending: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const reports = Array.from(this.events.values());

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = { mild: 0, moderate: 0, severe: 0 };

    for (const report of reports) {
      // By category
      const cat = report.dtxCategory || 'OTHER';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      // By severity
      bySeverity[report.severity]++;
    }

    return {
      total: reports.length,
      serious: reports.filter((r) => r.isSerious).length,
      nonSerious: reports.filter((r) => !r.isSerious).length,
      pending: reports.filter((r) => r.reportStatus !== 'closed').length,
      byCategory,
      bySeverity,
    };
  }

  // ==================== Export ====================

  /**
   * Export AE report in CIOMS-like format
   * For regulatory submission
   */
  exportCIOMSFormat(id: number): string | null {
    const report = this.events.get(id);
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
}

// ==================== Factory ====================

export function createAdverseEventService(db: IDatabaseConnection): AdverseEventService {
  return new AdverseEventService(db);
}

export default AdverseEventService;
