/**
 * AdverseEventService Tests
 * =========================
 *
 * Tests for clinical pilot adverse event tracking and reporting.
 * Validates AE classification, CIOMS compliance, and regulatory deadlines.
 *
 * Research basis mocked: ICH E6(R3), ICH E2A/E2B, CIOMS Form I
 *
 * @packageDocumentation
 */

import {
  AdverseEventService,
  createAdverseEventService,
  DTX_AE_CATEGORIES,
  type IAdverseEventReport,
  type AESeverity,
  type CausalityAssessment,
  type AEOutcome,
  type ActionTaken,
  type Expectedness,
} from '../AdverseEventService';

// Mock database infrastructure — provides in-memory implementations
// so AdverseEventService repository calls work without a real DB
jest.mock('../../../infrastructure/database', () => {
  class MockAdverseEventRepository {
    private store = new Map<number, any>();
    private idCounter = 0;

    async insertWithAudit(entity: any, _changedBy: string, _context?: any) {
      const id = ++this.idCounter;
      const now = new Date();
      const fullEntity = { ...entity, id, uuid: `ae-${id}`, createdAt: now, updatedAt: now };
      this.store.set(id, fullEntity);
      return fullEntity;
    }

    async updateWithAudit(id: number, updates: any, _changedBy: string, _reason?: string) {
      const entity = this.store.get(id);
      if (!entity) return null;
      const updated = { ...entity, ...updates, updatedAt: new Date() };
      this.store.set(id, updated);
      return updated;
    }

    async findById(id: number) {
      return this.store.get(id) || null;
    }

    async findByUserId(userId: string) {
      return [...this.store.values()]
        .filter((e) => e.userId === userId)
        .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    }

    async findSerious() {
      return [...this.store.values()]
        .filter((e) => e.isSerious)
        .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    }

    async findByStatus(status: string) {
      return [...this.store.values()]
        .filter((e) => e.reportStatus === status)
        .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    }

    async findAll() {
      return [...this.store.values()]
        .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    }

    async findApproachingDeadlines(days: number) {
      const now = new Date();
      const threshold = new Date(now);
      threshold.setDate(threshold.getDate() + days);
      return [...this.store.values()].filter((e) => {
        if (!e.regulatoryDeadline) return false;
        if (e.reportStatus === 'closed') return false;
        return e.regulatoryDeadline.getTime() <= threshold.getTime() &&
               e.regulatoryDeadline.getTime() > now.getTime();
      });
    }

    async getStatistics() {
      const events = [...this.store.values()];
      const byCategory: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      for (const e of events) {
        if (e.dtxCategory) byCategory[e.dtxCategory] = (byCategory[e.dtxCategory] || 0) + 1;
        if (e.severity) bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
      }
      return {
        total: events.length,
        serious: events.filter((e) => e.isSerious).length,
        nonSerious: events.filter((e) => !e.isSerious).length,
        pending: events.filter((e) => e.reportStatus !== 'closed').length,
        byCategory,
        bySeverity,
      };
    }
  }

  class MockSafetyAlertRepository {
    private store = new Map<number, any>();
    private idCounter = 0;

    async create(alert: any) {
      const id = ++this.idCounter;
      const fullAlert = { ...alert, id, createdAt: new Date() };
      this.store.set(id, fullAlert);
      return fullAlert;
    }

    async hasDuplicateAlert(type: string, eventId: number) {
      return [...this.store.values()].some(
        (a) => a.type === type && a.adverseEventId === eventId && !a.acknowledged
      );
    }

    async findUnacknowledged() {
      return [...this.store.values()].filter((a) => !a.acknowledged);
    }

    async findAll(limit: number = 100) {
      return [...this.store.values()].slice(0, limit);
    }

    async acknowledge(id: number, acknowledgedBy: string) {
      const alert = this.store.get(id);
      if (!alert) return false;
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      return true;
    }
  }

  return {
    __esModule: true,
    AdverseEventRepository: MockAdverseEventRepository,
    SafetyAlertRepository: MockSafetyAlertRepository,
    createAdverseEventRepository: () => new MockAdverseEventRepository(),
    createSafetyAlertRepository: () => new MockSafetyAlertRepository(),
  };
});

// Create mock database connection (passed to constructor but not used by mocked repos)
const createMockDb = () => ({
  queryOne: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
});

describe('AdverseEventService', () => {
  let service: AdverseEventService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  const testUserId = 'user_test_123';

  beforeEach(() => {
    mockDb = createMockDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new AdverseEventService(mockDb as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Create a minimal valid AE report
   */
  function createMinimalReport(
    overrides: Partial<Omit<IAdverseEventReport, 'id' | 'reportedAt' | 'regulatoryDeadline' | 'reportStatus'>> = {}
  ) {
    return {
      userId: testUserId,
      cioms: {
        reporterType: 'patient' as const,
        patientId: testUserId,
        productName: 'SleepCore DTx',
        productVersion: '1.0.0',
        reactionTerm: 'Test reaction',
        reactionOnsetDate: new Date(),
      },
      severity: 'mild' as AESeverity,
      isSerious: false,
      expectedness: 'expected' as Expectedness,
      description: 'Test description',
      onsetDate: new Date(),
      outcome: 'not_recovered' as AEOutcome,
      causality: 'possible' as CausalityAssessment,
      actionTaken: 'none' as ActionTaken,
      reportedBy: 'patient' as const,
      ...overrides,
    };
  }

  // ==========================================================================
  // Event Reporting
  // ==========================================================================
  describe('Event Reporting', () => {
    it('should report new adverse event', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const report = await service.reportAdverseEvent(createMinimalReport());

      expect(report.id).toBe(1);
      expect(report.reportStatus).toBe('draft');
      expect(report.reportedAt).toBeInstanceOf(Date);
      expect(report.regulatoryDeadline).toBeInstanceOf(Date);

      consoleSpy.mockRestore();
    });

    it('should auto-increment report IDs', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      const report1 = await service.reportAdverseEvent(createMinimalReport());
      const report2 = await service.reportAdverseEvent(createMinimalReport());

      expect(report1.id).toBe(1);
      expect(report2.id).toBe(2);
    });

    it('should calculate 90-day deadline for non-serious events', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      const report = await service.reportAdverseEvent(createMinimalReport({ isSerious: false }));

      const expectedDeadline = new Date(report.reportedAt);
      expectedDeadline.setDate(expectedDeadline.getDate() + 90);

      expect(report.regulatoryDeadline?.toDateString()).toBe(expectedDeadline.toDateString());
    });

    it('should calculate 15-day deadline for serious events', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      const report = await service.reportAdverseEvent(
        createMinimalReport({
          isSerious: true,
          seriousnessCriteria: ['hospitalization'],
        })
      );

      const expectedDeadline = new Date(report.reportedAt);
      expectedDeadline.setDate(expectedDeadline.getDate() + 15);

      expect(report.regulatoryDeadline?.toDateString()).toBe(expectedDeadline.toDateString());
    });

    it('should calculate 7-day deadline for fatal/life-threatening events', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      const report = await service.reportAdverseEvent(
        createMinimalReport({
          isSerious: true,
          seriousnessCriteria: ['life_threatening'],
        })
      );

      const expectedDeadline = new Date(report.reportedAt);
      expectedDeadline.setDate(expectedDeadline.getDate() + 7);

      expect(report.regulatoryDeadline?.toDateString()).toBe(expectedDeadline.toDateString());
    });

    it('should calculate 7-day deadline for death events', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      const report = await service.reportAdverseEvent(
        createMinimalReport({
          isSerious: true,
          seriousnessCriteria: ['death'],
        })
      );

      const expectedDeadline = new Date(report.reportedAt);
      expectedDeadline.setDate(expectedDeadline.getDate() + 7);

      expect(report.regulatoryDeadline?.toDateString()).toBe(expectedDeadline.toDateString());
    });

    it('should create safety alert for serious events', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      await service.reportAdverseEvent(
        createMinimalReport({
          isSerious: true,
          seriousnessCriteria: ['hospitalization'],
        })
      );

      const alerts = await service.getUnacknowledgedAlerts();
      expect(alerts.some((a) => a.type === 'SERIOUS_AE')).toBe(true);
    });

    it('should create SUSAR alert for unexpected serious events', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      await service.reportAdverseEvent(
        createMinimalReport({
          isSerious: true,
          expectedness: 'unexpected',
          seriousnessCriteria: ['hospitalization'],
        })
      );

      const alerts = await service.getUnacknowledgedAlerts();
      expect(alerts.some((a) => a.type === 'SUSAR')).toBe(true);
    });

    it('should log audit trail on report creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.reportAdverseEvent(createMinimalReport());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AE Audit]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('REPORT_CREATED')
      );

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Event Updates
  // ==========================================================================
  describe('Event Updates', () => {
    beforeEach(async () => {
      jest.spyOn(console, 'log').mockImplementation();
      await service.reportAdverseEvent(createMinimalReport());
    });

    it('should update existing report', async () => {
      const updated = await service.updateAdverseEvent(1, {
        severity: 'moderate',
        outcome: 'recovered',
      });

      expect(updated).not.toBeNull();
      expect(updated?.severity).toBe('moderate');
      expect(updated?.outcome).toBe('recovered');
      expect(updated?.lastUpdatedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent report', async () => {
      const updated = await service.updateAdverseEvent(999, { severity: 'severe' });
      expect(updated).toBeNull();
    });

    it('should preserve original fields when updating', async () => {
      const updated = await service.updateAdverseEvent(1, { severity: 'severe' });

      expect(updated?.cioms.reactionTerm).toBe('Test reaction');
      expect(updated?.userId).toBe(testUserId);
    });

    it('should log audit trail on update', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await service.updateAdverseEvent(1, { severity: 'severe' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('REPORT_UPDATED')
      );
    });
  });

  // ==========================================================================
  // ISI Deterioration Detection
  // ==========================================================================
  describe('ISI Deterioration Detection', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should detect ISI worsening >= 7 points', async () => {
      const report = await service.checkISIDeterioration(
        testUserId,
        12, // baseline
        20, // current (+8)
        4   // week
      );

      expect(report).not.toBeNull();
      expect(report?.dtxCategory).toBe('SYMPTOM_DETERIORATION');
      expect(report?.currentISI).toBe(20);
      expect(report?.baselineISI).toBe(12);
    });

    it('should create safety alert for ISI worsening', async () => {
      await service.checkISIDeterioration(testUserId, 10, 18, 3);

      const alerts = await service.getUnacknowledgedAlerts();
      expect(alerts.some((a) => a.type === 'ISI_WORSENING')).toBe(true);
    });

    it('should return null for ISI change < 7', async () => {
      const report = await service.checkISIDeterioration(testUserId, 12, 15, 4);
      expect(report).toBeNull();
    });

    it('should return null for ISI improvement', async () => {
      const report = await service.checkISIDeterioration(testUserId, 18, 10, 4);
      expect(report).toBeNull();
    });

    it('should include context in auto-created report', async () => {
      const report = await service.checkISIDeterioration(testUserId, 10, 20, 5);

      expect(report?.currentWeek).toBe(5);
      expect(report?.reportedBy).toBe('system');
      expect(report?.expectedness).toBe('expected');
    });
  });

  // ==========================================================================
  // Patient Self-Report
  // ==========================================================================
  describe('Patient Self-Report', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should return patient report questions', () => {
      const questions = service.getPatientReportQuestions();

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].id).toBe('category');
      expect(questions[0].type).toBe('select');
      expect(questions[0].options).toBeDefined();
    });

    it('should include all required question types', () => {
      const questions = service.getPatientReportQuestions();
      const ids = questions.map((q) => q.id);

      expect(ids).toContain('category');
      expect(ids).toContain('severity');
      expect(ids).toContain('onset');
      expect(ids).toContain('description');
      expect(ids).toContain('serious_check');
    });

    it('should process patient report with standard category', async () => {
      const report = await service.processPatientReport(testUserId, {
        category: 'FATIGUE',
        severity: 'moderate',
        onset: 'today',
        description: 'Сильная усталость после ограничения сна',
        serious_check: 'no',
      });

      expect(report.dtxCategory).toBe('FATIGUE');
      expect(report.severity).toBe('moderate');
      expect(report.isSerious).toBe(false);
      expect(report.reportedBy).toBe('patient');
    });

    it('should mark report as serious for hospitalization', async () => {
      const report = await service.processPatientReport(testUserId, {
        category: 'ACCIDENT_INJURY',
        severity: 'severe',
        onset: 'yesterday',
        description: 'Упал из-за сонливости',
        serious_check: 'hospitalized',
      });

      expect(report.isSerious).toBe(true);
      expect(report.seriousnessCriteria).toContain('hospitalization');
    });

    it('should mark report as serious for emergency', async () => {
      const report = await service.processPatientReport(testUserId, {
        category: 'DIZZINESS',
        severity: 'severe',
        onset: 'today',
        description: 'Сильное головокружение',
        serious_check: 'emergency',
      });

      expect(report.isSerious).toBe(true);
      expect(report.seriousnessCriteria).toContain('medically_important');
    });

    it('should handle OTHER category', async () => {
      const report = await service.processPatientReport(testUserId, {
        category: 'OTHER',
        severity: 'mild',
        onset: 'this_week',
        description: 'Какая-то другая проблема',
        serious_check: 'no',
      });

      expect(report.dtxCategory).toBeUndefined();
      expect(report.cioms.reactionTerm).toContain('другая');
    });

    it('should calculate correct onset dates', async () => {
      const today = new Date();

      // Yesterday
      const reportYesterday = await service.processPatientReport(testUserId, {
        category: 'HEADACHE',
        severity: 'mild',
        onset: 'yesterday',
        description: 'Test',
        serious_check: 'no',
      });
      const expectedYesterday = new Date(today);
      expectedYesterday.setDate(expectedYesterday.getDate() - 1);
      expect(reportYesterday.onsetDate.toDateString()).toBe(expectedYesterday.toDateString());

      // This week
      const reportThisWeek = await service.processPatientReport(testUserId, {
        category: 'HEADACHE',
        severity: 'mild',
        onset: 'this_week',
        description: 'Test',
        serious_check: 'no',
      });
      const expectedThisWeek = new Date(today);
      expectedThisWeek.setDate(expectedThisWeek.getDate() - 3);
      expect(reportThisWeek.onsetDate.toDateString()).toBe(expectedThisWeek.toDateString());

      // Earlier (7 days ago) - covers lines 564-566
      const reportEarlier = await service.processPatientReport(testUserId, {
        category: 'FATIGUE',
        severity: 'moderate',
        onset: 'earlier',
        description: 'Started more than a week ago',
        serious_check: 'no',
      });
      const expectedEarlier = new Date(today);
      expectedEarlier.setDate(expectedEarlier.getDate() - 7);
      expect(reportEarlier.onsetDate.toDateString()).toBe(expectedEarlier.toDateString());
    });

    it('should include context data in report', async () => {
      const report = await service.processPatientReport(
        testUserId,
        {
          category: 'FATIGUE',
          severity: 'moderate',
          onset: 'today',
          description: 'Test',
          serious_check: 'no',
        },
        { currentISI: 15, baselineISI: 12, currentWeek: 3 }
      );

      expect(report.currentISI).toBe(15);
      expect(report.baselineISI).toBe(12);
      expect(report.currentWeek).toBe(3);
    });

    it('should mark expected categories correctly', async () => {
      // Expected: FATIGUE
      const expectedReport = await service.processPatientReport(testUserId, {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
        description: 'Test',
        serious_check: 'no',
      });
      expect(expectedReport.expectedness).toBe('expected');

      // Unexpected: ACCIDENT_INJURY
      const unexpectedReport = await service.processPatientReport(testUserId, {
        category: 'ACCIDENT_INJURY',
        severity: 'mild',
        onset: 'today',
        description: 'Test',
        serious_check: 'no',
      });
      expect(unexpectedReport.expectedness).toBe('unexpected');
    });
  });

  // ==========================================================================
  // Safety Alerts
  // ==========================================================================
  describe('Safety Alerts', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should get unacknowledged alerts', async () => {
      await service.reportAdverseEvent(
        createMinimalReport({ isSerious: true, seriousnessCriteria: ['hospitalization'] })
      );

      const alerts = await service.getUnacknowledgedAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.every((a) => !a.acknowledged)).toBe(true);
    });

    it('should get all alerts with limit', async () => {
      // Create multiple alerts
      for (let i = 0; i < 5; i++) {
        await service.reportAdverseEvent(
          createMinimalReport({ isSerious: true, seriousnessCriteria: ['hospitalization'] })
        );
      }

      const allAlerts = await service.getAllAlerts(3);
      expect(allAlerts.length).toBeLessThanOrEqual(3);
    });

    it('should acknowledge alert', async () => {
      await service.reportAdverseEvent(
        createMinimalReport({ isSerious: true, seriousnessCriteria: ['hospitalization'] })
      );

      const result = await service.acknowledgeAlert(1, 'admin123');
      expect(result).toBe(true);

      const alerts = await service.getUnacknowledgedAlerts();
      expect(alerts.length).toBe(0);
    });

    it('should return false for invalid alert index', async () => {
      const result = await service.acknowledgeAlert(999, 'admin123');
      expect(result).toBe(false);
    });

    it('should store acknowledgment details', async () => {
      await service.reportAdverseEvent(
        createMinimalReport({ isSerious: true, seriousnessCriteria: ['hospitalization'] })
      );

      await service.acknowledgeAlert(1, 'admin123');

      const allAlerts = await service.getAllAlerts();
      expect(allAlerts[0].acknowledgedBy).toBe('admin123');
      expect(allAlerts[0].acknowledgedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Deadline Monitoring
  // ==========================================================================
  describe('Deadline Monitoring', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should detect approaching deadlines', async () => {
      // Create report with deadline in 2 days
      const report = await service.reportAdverseEvent(createMinimalReport());

      // Manually set deadline to 2 days from now
      const nearDeadline = new Date();
      nearDeadline.setDate(nearDeadline.getDate() + 2);
      await service.updateAdverseEvent(report.id!, { regulatoryDeadline: nearDeadline });

      const alerts = await service.checkDeadlines();
      expect(alerts.some((a) => a.type === 'DEADLINE_APPROACHING')).toBe(true);
    });

    it('should not alert for distant deadlines', async () => {
      await service.reportAdverseEvent(createMinimalReport({ isSerious: false }));
      // Non-serious has 90-day deadline

      const alerts = await service.checkDeadlines();
      expect(alerts.filter((a) => a.type === 'DEADLINE_APPROACHING').length).toBe(0);
    });

    it('should skip closed reports', async () => {
      const report = await service.reportAdverseEvent(createMinimalReport());

      const nearDeadline = new Date();
      nearDeadline.setDate(nearDeadline.getDate() + 2);
      await service.updateAdverseEvent(report.id!, {
        regulatoryDeadline: nearDeadline,
        reportStatus: 'closed',
      });

      const alerts = await service.checkDeadlines();
      expect(alerts.filter((a) => a.type === 'DEADLINE_APPROACHING').length).toBe(0);
    });

    it('should mark critical severity for deadline <= 1 day', async () => {
      const report = await service.reportAdverseEvent(createMinimalReport());

      const tomorrowDeadline = new Date();
      tomorrowDeadline.setDate(tomorrowDeadline.getDate() + 1);
      await service.updateAdverseEvent(report.id!, { regulatoryDeadline: tomorrowDeadline });

      const alerts = await service.checkDeadlines();
      const deadlineAlert = alerts.find((a) => a.type === 'DEADLINE_APPROACHING');
      expect(deadlineAlert?.severity).toBe('critical');
    });
  });

  // ==========================================================================
  // Queries
  // ==========================================================================
  describe('Queries', () => {
    beforeEach(async () => {
      jest.spyOn(console, 'log').mockImplementation();

      // Create several reports
      await service.reportAdverseEvent(createMinimalReport({ userId: 'user1', isSerious: false }));
      await service.reportAdverseEvent(createMinimalReport({ userId: 'user1', isSerious: true, seriousnessCriteria: ['hospitalization'] }));
      await service.reportAdverseEvent(createMinimalReport({ userId: 'user2', isSerious: false }));
    });

    it('should get all reports', async () => {
      const reports = await service.getAllReports();
      expect(reports.length).toBe(3);
    });

    it('should filter reports by userId', async () => {
      const reports = await service.getAllReports({ userId: 'user1' });
      expect(reports.length).toBe(2);
      expect(reports.every((r) => r.userId === 'user1')).toBe(true);
    });

    it('should filter reports by seriousness', async () => {
      const serious = await service.getAllReports({ isSerious: true });
      expect(serious.length).toBe(1);

      const nonSerious = await service.getAllReports({ isSerious: false });
      expect(nonSerious.length).toBe(2);
    });

    it('should filter reports by status', async () => {
      const drafts = await service.getAllReports({ status: 'draft' });
      expect(drafts.length).toBe(3);

      const closed = await service.getAllReports({ status: 'closed' });
      expect(closed.length).toBe(0);
    });

    it('should sort reports by date descending', async () => {
      const reports = await service.getAllReports();
      for (let i = 1; i < reports.length; i++) {
        expect(reports[i - 1].reportedAt.getTime()).toBeGreaterThanOrEqual(
          reports[i].reportedAt.getTime()
        );
      }
    });

    it('should get report by ID', async () => {
      const report = await service.getReportById(1);
      expect(report).toBeDefined();
      expect(report?.id).toBe(1);
    });

    it('should return undefined for non-existent ID', async () => {
      const report = await service.getReportById(999);
      expect(report).toBeUndefined();
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================
  describe('Statistics', () => {
    beforeEach(async () => {
      jest.spyOn(console, 'log').mockImplementation();

      // Create varied reports
      await service.reportAdverseEvent(
        createMinimalReport({ isSerious: false, severity: 'mild', dtxCategory: 'FATIGUE' })
      );
      await service.reportAdverseEvent(
        createMinimalReport({ isSerious: true, severity: 'moderate', dtxCategory: 'FATIGUE', seriousnessCriteria: ['hospitalization'] })
      );
      await service.reportAdverseEvent(
        createMinimalReport({ isSerious: false, severity: 'severe', dtxCategory: 'HEADACHE' })
      );
    });

    it('should calculate total count', async () => {
      const stats = await service.getStatistics();
      expect(stats.total).toBe(3);
    });

    it('should count serious vs non-serious', async () => {
      const stats = await service.getStatistics();
      expect(stats.serious).toBe(1);
      expect(stats.nonSerious).toBe(2);
    });

    it('should count pending reports', async () => {
      const stats = await service.getStatistics();
      expect(stats.pending).toBe(3); // All are drafts
    });

    it('should break down by category', async () => {
      const stats = await service.getStatistics();
      expect(stats.byCategory['FATIGUE']).toBe(2);
      expect(stats.byCategory['HEADACHE']).toBe(1);
    });

    it('should break down by severity', async () => {
      const stats = await service.getStatistics();
      expect(stats.bySeverity['mild']).toBe(1);
      expect(stats.bySeverity['moderate']).toBe(1);
      expect(stats.bySeverity['severe']).toBe(1);
    });
  });

  // ==========================================================================
  // CIOMS Export
  // ==========================================================================
  describe('CIOMS Export', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should export report in CIOMS format', async () => {
      await service.reportAdverseEvent(
        createMinimalReport({
          userId: 'patient123',
          cioms: {
            reporterType: 'patient',
            patientId: 'patient123',
            patientInitials: 'AB',
            patientAge: 35,
            patientSex: 'female',
            productName: 'SleepCore DTx',
            productVersion: '1.0.0',
            reactionTerm: 'Insomnia symptom deterioration',
            reactionOnsetDate: new Date('2025-01-15'),
          },
          description: 'ISI increased from 12 to 20',
          baselineISI: 12,
          currentISI: 20,
          currentWeek: 4,
        })
      );

      const cioms = await service.exportCIOMSFormat(1);

      expect(cioms).toContain('CIOMS FORM I');
      expect(cioms).toContain('Report ID: 1');
      expect(cioms).toContain('patient123');
      expect(cioms).toContain('SleepCore DTx');
      expect(cioms).toContain('Insomnia symptom deterioration');
      expect(cioms).toContain('Baseline ISI: 12');
      expect(cioms).toContain('Current ISI: 20');
    });

    it('should return null for non-existent report', async () => {
      const cioms = await service.exportCIOMSFormat(999);
      expect(cioms).toBeNull();
    });

    it('should include seriousness criteria when present', async () => {
      await service.reportAdverseEvent(
        createMinimalReport({
          isSerious: true,
          seriousnessCriteria: ['hospitalization', 'disability'],
        })
      );

      const cioms = await service.exportCIOMSFormat(1);
      expect(cioms).toContain('Serious: Yes');
      expect(cioms).toContain('hospitalization');
    });

    it('should include regulatory status', async () => {
      await service.reportAdverseEvent(createMinimalReport());
      await service.updateAdverseEvent(1, { reportStatus: 'pending_review' });

      const cioms = await service.exportCIOMSFormat(1);
      expect(cioms).toContain('Status: pending_review');
    });
  });

  // ==========================================================================
  // DTX Categories
  // ==========================================================================
  describe('DTX Categories', () => {
    it('should define all required categories', () => {
      expect(DTX_AE_CATEGORIES.SYMPTOM_DETERIORATION).toBeDefined();
      expect(DTX_AE_CATEGORIES.ANXIETY_INCREASE).toBeDefined();
      expect(DTX_AE_CATEGORIES.FRUSTRATION).toBeDefined();
      expect(DTX_AE_CATEGORIES.HOPELESSNESS).toBeDefined();
      expect(DTX_AE_CATEGORIES.EXCESSIVE_DAYTIME_SLEEPINESS).toBeDefined();
      expect(DTX_AE_CATEGORIES.FATIGUE).toBeDefined();
      expect(DTX_AE_CATEGORIES.HEADACHE).toBeDefined();
      expect(DTX_AE_CATEGORIES.DIZZINESS).toBeDefined();
      expect(DTX_AE_CATEGORIES.SUICIDAL_IDEATION).toBeDefined();
      expect(DTX_AE_CATEGORIES.ACCIDENT_INJURY).toBeDefined();
      expect(DTX_AE_CATEGORIES.APP_MALFUNCTION).toBeDefined();
    });

    it('should have required fields for each category', () => {
      for (const [key, category] of Object.entries(DTX_AE_CATEGORIES)) {
        expect(category.code).toBeDefined();
        expect(category.term).toBeDefined();
        expect(category.meddraSOC).toBeDefined();
        expect(category.description).toBeDefined();
      }
    });

    it('should mark suicidal ideation as always serious', () => {
      expect(DTX_AE_CATEGORIES.SUICIDAL_IDEATION.alwaysSerious).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('Factory Function', () => {
    it('should create service via factory', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = createAdverseEventService(mockDb as any);
      expect(created).toBeInstanceOf(AdverseEventService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should handle empty description in patient report', async () => {
      const report = await service.processPatientReport(testUserId, {
        category: 'OTHER',
        severity: 'mild',
        onset: 'today',
        description: '',
        serious_check: 'no',
      });

      expect(report.cioms.reactionTerm).toBe('Patient-reported event');
    });

    it('should handle negative alert index', async () => {
      const result = await service.acknowledgeAlert(-1, 'admin');
      expect(result).toBe(false);
    });

    it('should not duplicate deadline alerts', async () => {
      const report = await service.reportAdverseEvent(createMinimalReport());

      const nearDeadline = new Date();
      nearDeadline.setDate(nearDeadline.getDate() + 2);
      await service.updateAdverseEvent(report.id!, { regulatoryDeadline: nearDeadline });

      // Check deadlines twice
      await service.checkDeadlines();
      await service.checkDeadlines();

      const alerts = await service.getAllAlerts();
      const deadlineAlerts = alerts.filter((a) => a.type === 'DEADLINE_APPROACHING');
      expect(deadlineAlerts.length).toBe(1);
    });

    it('should handle reports without regulatory deadline', async () => {
      await service.reportAdverseEvent(createMinimalReport());
      await service.updateAdverseEvent(1, { regulatoryDeadline: undefined });

      const alerts = await service.checkDeadlines();
      expect(alerts.filter((a) => a.eventId === 1).length).toBe(0);
    });

    it('should handle multiple filters in getAllReports', async () => {
      await service.reportAdverseEvent(createMinimalReport({ userId: 'user1', isSerious: true, seriousnessCriteria: ['hospitalization'] }));
      await service.reportAdverseEvent(createMinimalReport({ userId: 'user1', isSerious: false }));
      await service.reportAdverseEvent(createMinimalReport({ userId: 'user2', isSerious: true, seriousnessCriteria: ['hospitalization'] }));

      const filtered = await service.getAllReports({ userId: 'user1', isSerious: true });
      expect(filtered.length).toBe(1);
    });

    it('should handle empty events map in statistics', async () => {
      const stats = await service.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.serious).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });
});
