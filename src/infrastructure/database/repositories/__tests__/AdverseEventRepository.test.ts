/**
 * AdverseEventRepository Unit Tests
 * ==================================
 *
 * CRITICAL: Adverse event tracking for regulatory compliance.
 *
 * Compliance:
 * - ICH E6(R3): GCP requirements
 * - ICH E2B(R3): ICSR data elements
 * - 21 CFR Part 11: Audit trail
 * - ГОСТ IEC 62304-2022: Traceability
 *
 * Traceability:
 * - REQ-AE-001: Adverse events must be tracked with audit trail
 * - REQ-REGULATORY-001: Regulatory deadlines must be monitored
 * - REQ-AUDIT-001: All changes require audit trail
 *
 * @packageDocumentation
 */

import {
  AdverseEventRepository,
  type IAdverseEventEntity,
  type AESeverity,
  type ReportStatus,
} from '../AdverseEventRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

describe('AdverseEventRepository', () => {
  let repository: AdverseEventRepository;
  let mockDb: jest.Mocked<IDatabaseConnection>;

  const mockAERow = {
    id: 1,
    uuid: 'ae-uuid-123',
    user_id: 'user-123',
    user_internal_id: 42,
    reporter_type: 'patient',
    reporter_name: 'Ivan Petrov',
    reporter_contact: '+7-999-123-4567',
    patient_initials: 'I.P.',
    patient_age: 45,
    patient_sex: 'male',
    product_name: 'SleepCore',
    product_version: '1.0.0',
    reaction_term: 'Excessive daytime sleepiness',
    reaction_onset_date: '2026-01-20T08:00:00.000Z',
    severity: 'moderate',
    is_serious: 0,
    seriousness_criteria_json: null,
    expectedness: 'expected',
    dtx_category: 'SLEEP_RESTRICTION',
    meddra_pt_code: '10013649',
    meddra_soc: 'Nervous system disorders',
    custom_term: null,
    description: 'Patient reported excessive sleepiness during work',
    onset_date: '2026-01-20T08:00:00.000Z',
    resolution_date: '2026-01-25T18:00:00.000Z',
    outcome: 'recovered',
    causality: 'probable',
    action_taken: 'dose_reduced',
    current_isi: 14,
    baseline_isi: 18,
    current_week: 3,
    report_status: 'pending_review',
    regulatory_deadline: '2026-02-05T00:00:00.000Z',
    submitted_to_roszdravnadzor: null,
    submitted_to_ethics: null,
    reported_at: '2026-01-21T10:00:00.000Z',
    reported_by: 'patient',
    created_by: 'system',
    notes: 'TIB was adjusted from 5.5h to 6h',
    created_at: '2026-01-21T10:00:00.000Z',
    updated_at: '2026-01-21T10:00:00.000Z',
    deleted_at: null,
  };

  const mockSeriousAERow = {
    ...mockAERow,
    id: 2,
    uuid: 'ae-uuid-456',
    severity: 'severe',
    is_serious: 1,
    seriousness_criteria_json: JSON.stringify(['hospitalization']),
    expectedness: 'unexpected',
    report_status: 'draft',
  };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    } as unknown as jest.Mocked<IDatabaseConnection>;

    repository = new AdverseEventRepository(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== findByUuid ====================

  describe('findByUuid', () => {
    it('should return AE when UUID exists', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const result = await repository.findByUuid('ae-uuid-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM adverse_events WHERE uuid = ? AND deleted_at IS NULL',
        ['ae-uuid-123']
      );
      expect(result).not.toBeNull();
      expect(result?.uuid).toBe('ae-uuid-123');
      expect(result?.userId).toBe('user-123');
    });

    it('should return null when UUID does not exist', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await repository.findByUuid('nonexistent-uuid');

      expect(result).toBeNull();
    });

    it('should correctly parse entity fields', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const result = await repository.findByUuid('ae-uuid-123');

      expect(result?.severity).toBe('moderate');
      expect(result?.isSerious).toBe(false);
      expect(result?.reporterType).toBe('patient');
      expect(result?.causality).toBe('probable');
      expect(result?.actionTaken).toBe('dose_reduced');
      expect(result?.outcome).toBe('recovered');
    });

    it('should parse dates correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const result = await repository.findByUuid('ae-uuid-123');

      expect(result?.onsetDate).toBeInstanceOf(Date);
      expect(result?.resolutionDate).toBeInstanceOf(Date);
      expect(result?.reportedAt).toBeInstanceOf(Date);
      expect(result?.regulatoryDeadline).toBeInstanceOf(Date);
    });

    it('should parse seriousness criteria JSON', async () => {
      mockDb.queryOne.mockResolvedValue(mockSeriousAERow);

      const result = await repository.findByUuid('ae-uuid-456');

      expect(result?.isSerious).toBe(true);
      expect(result?.seriousnessCriteria).toEqual(['hospitalization']);
    });
  });

  // ==================== findByUserId ====================

  describe('findByUserId', () => {
    it('should return all AEs for user', async () => {
      mockDb.query.mockResolvedValue([mockAERow, mockSeriousAERow]);

      const result = await repository.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND deleted_at IS NULL'),
        ['user-123']
      );
      expect(result).toHaveLength(2);
    });

    it('should order by reported_at DESC by default', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY reported_at DESC'),
        expect.any(Array)
      );
    });

    it('should support custom ordering', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByUserId('user-123', { orderBy: 'severity', orderDirection: 'ASC' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY severity ASC'),
        expect.any(Array)
      );
    });

    it('should support pagination with limit', async () => {
      mockDb.query.mockResolvedValue([mockAERow]);

      await repository.findByUserId('user-123', { limit: 10 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        expect.any(Array)
      );
    });

    it('should support pagination with offset', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByUserId('user-123', { limit: 10, offset: 20 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 20'),
        expect.any(Array)
      );
    });

    it('should return empty array when no AEs exist', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await repository.findByUserId('user-without-aes');

      expect(result).toEqual([]);
    });
  });

  // ==================== findSerious ====================

  describe('findSerious', () => {
    it('should return only serious AEs', async () => {
      mockDb.query.mockResolvedValue([mockSeriousAERow]);

      const result = await repository.findSerious();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_serious = 1 AND deleted_at IS NULL')
      );
      expect(result).toHaveLength(1);
      expect(result[0].isSerious).toBe(true);
    });

    it('should support limit option', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findSerious({ limit: 5 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5')
      );
    });

    it('should order by reported_at DESC', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findSerious();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY reported_at DESC')
      );
    });
  });

  // ==================== findByStatus ====================

  describe('findByStatus', () => {
    it('should return AEs with specified status', async () => {
      mockDb.query.mockResolvedValue([mockAERow]);

      const result = await repository.findByStatus('pending_review');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE report_status = ? AND deleted_at IS NULL'),
        ['pending_review']
      );
      expect(result).toHaveLength(1);
    });

    it('should work with all status values', async () => {
      const statuses: ReportStatus[] = [
        'draft',
        'pending_review',
        'submitted_roszdravnadzor',
        'submitted_ethics',
        'closed',
      ];

      for (const status of statuses) {
        mockDb.query.mockResolvedValue([]);
        await repository.findByStatus(status);
        expect(mockDb.query).toHaveBeenLastCalledWith(
          expect.any(String),
          [status]
        );
      }
    });
  });

  // ==================== findApproachingDeadlines ====================

  describe('findApproachingDeadlines', () => {
    it('should find AEs with deadlines within default 3 days', async () => {
      mockDb.query.mockResolvedValue([mockAERow]);

      const result = await repository.findApproachingDeadlines();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE regulatory_deadline IS NOT NULL'),
        expect.any(Array)
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("NOT IN ('submitted_roszdravnadzor', 'closed')"),
        expect.any(Array)
      );
      expect(result).toHaveLength(1);
    });

    it('should accept custom days ahead parameter', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findApproachingDeadlines(7);

      // Verify the deadline calculation is used
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should order by deadline ASC (most urgent first)', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findApproachingDeadlines();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY regulatory_deadline ASC'),
        expect.any(Array)
      );
    });
  });

  // ==================== getStatistics ====================

  describe('getStatistics', () => {
    beforeEach(() => {
      mockDb.queryOne
        .mockResolvedValueOnce({ count: 100 }) // total
        .mockResolvedValueOnce({ count: 15 })  // serious
        .mockResolvedValueOnce({ count: 45 }); // pending

      mockDb.query
        .mockResolvedValueOnce([
          { dtx_category: 'SLEEP_RESTRICTION', count: 30 },
          { dtx_category: 'COGNITIVE', count: 20 },
          { dtx_category: 'OTHER', count: 50 },
        ])
        .mockResolvedValueOnce([
          { severity: 'mild', count: 60 },
          { severity: 'moderate', count: 30 },
          { severity: 'severe', count: 10 },
        ]);
    });

    it('should return complete statistics', async () => {
      const stats = await repository.getStatistics();

      expect(stats.total).toBe(100);
      expect(stats.serious).toBe(15);
      expect(stats.nonSerious).toBe(85);
      expect(stats.pending).toBe(45);
    });

    it('should return statistics by category', async () => {
      const stats = await repository.getStatistics();

      expect(stats.byCategory).toEqual({
        SLEEP_RESTRICTION: 30,
        COGNITIVE: 20,
        OTHER: 50,
      });
    });

    it('should return statistics by severity', async () => {
      const stats = await repository.getStatistics();

      expect(stats.bySeverity).toEqual({
        mild: 60,
        moderate: 30,
        severe: 10,
      });
    });

    it('should handle empty database', async () => {
      mockDb.queryOne.mockReset();
      mockDb.query.mockReset();

      mockDb.queryOne
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });
      mockDb.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await repository.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.serious).toBe(0);
      expect(stats.nonSerious).toBe(0);
      expect(stats.byCategory).toEqual({});
      expect(stats.bySeverity).toEqual({});
    });
  });

  // ==================== insertWithAudit ====================

  describe('insertWithAudit', () => {
    const newAE: Omit<IAdverseEventEntity, 'id' | 'uuid' | 'createdAt' | 'updatedAt'> = {
      userId: 'user-123',
      reporterType: 'patient',
      productName: 'SleepCore',
      reactionTerm: 'Daytime sleepiness',
      reactionOnsetDate: new Date('2026-01-20'),
      severity: 'mild',
      isSerious: false,
      expectedness: 'expected',
      onsetDate: new Date('2026-01-20'),
      reportStatus: 'draft',
      reportedAt: new Date('2026-01-21'),
      reportedBy: 'patient',
      createdBy: 'system',
    };

    beforeEach(() => {
      // Mock insert (base class)
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 99 });
      mockDb.queryOne.mockResolvedValue({
        ...mockAERow,
        id: 99,
        uuid: 'generated-uuid',
      });
    });

    it('should insert AE and create audit entry', async () => {
      const result = await repository.insertWithAudit(newAE, 'admin-user');

      // Should have two execute calls: insert + audit
      expect(mockDb.execute).toHaveBeenCalledTimes(2);

      // Check audit entry
      const auditCall = mockDb.execute.mock.calls[1];
      expect(auditCall[0]).toContain('INSERT INTO adverse_events_audit');
      expect(auditCall[1]).toContain('CREATE');
      expect(auditCall[1]).toContain('admin-user');
    });

    it('should include context in audit entry', async () => {
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
      };

      await repository.insertWithAudit(newAE, 'admin-user', context);

      const auditCall = mockDb.execute.mock.calls[1];
      const params = auditCall[1] as unknown[];

      expect(params).toContain('192.168.1.1');
      expect(params).toContain('Mozilla/5.0');
      expect(params).toContain('session-123');
    });

    it('should return the inserted entity', async () => {
      const result = await repository.insertWithAudit(newAE, 'admin-user');

      expect(result).toBeDefined();
      expect(result.id).toBe(99);
    });
  });

  // ==================== updateWithAudit ====================

  describe('updateWithAudit', () => {
    beforeEach(() => {
      // First call: findById returns existing
      mockDb.queryOne.mockResolvedValueOnce(mockAERow);
      // Update execute
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });
      // Second call: findById returns updated
      mockDb.queryOne.mockResolvedValueOnce({
        ...mockAERow,
        severity: 'severe',
        updated_at: '2026-01-22T10:00:00.000Z',
      });
    });

    it('should update AE and create audit entry', async () => {
      const updates = { severity: 'severe' as AESeverity };

      await repository.updateWithAudit(1, updates, 'admin-user', 'Severity escalated');

      // Should have calls for update + audit
      expect(mockDb.execute).toHaveBeenCalled();

      // Check audit entry includes old and new values
      const auditCall = mockDb.execute.mock.calls.find(call =>
        (call[0] as string).includes('adverse_events_audit')
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![1]).toContain('UPDATE');
      expect(auditCall![1]).toContain('admin-user');
      expect(auditCall![1]).toContain('Severity escalated');
    });

    it('should return null when AE does not exist', async () => {
      mockDb.queryOne.mockReset();
      mockDb.queryOne.mockResolvedValue(null);

      const result = await repository.updateWithAudit(999, {}, 'admin-user');

      expect(result).toBeNull();
    });

    it('should include context in audit entry', async () => {
      const context = {
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome',
        sessionId: 'sess-456',
      };

      await repository.updateWithAudit(1, { severity: 'severe' as AESeverity }, 'admin', undefined, context);

      const auditCall = mockDb.execute.mock.calls.find(call =>
        (call[0] as string).includes('adverse_events_audit')
      );
      const params = auditCall![1] as unknown[];

      expect(params).toContain('10.0.0.1');
    });
  });

  // ==================== updateStatus ====================

  describe('updateStatus', () => {
    beforeEach(() => {
      mockDb.queryOne.mockResolvedValueOnce(mockAERow);
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });
      mockDb.queryOne.mockResolvedValueOnce({
        ...mockAERow,
        report_status: 'submitted_roszdravnadzor',
      });
    });

    it('should update status with STATUS_CHANGE audit action', async () => {
      await repository.updateStatus(1, 'submitted_roszdravnadzor', 'admin', 'Submitted to regulator');

      const auditCall = mockDb.execute.mock.calls.find(call =>
        (call[0] as string).includes('adverse_events_audit')
      );
      expect(auditCall![1]).toContain('STATUS_CHANGE');
    });

    it('should track old and new status values', async () => {
      await repository.updateStatus(1, 'closed', 'admin');

      const auditCall = mockDb.execute.mock.calls.find(call =>
        (call[0] as string).includes('adverse_events_audit')
      );
      const params = auditCall![1] as unknown[];

      // Should contain old status and new status in JSON
      const oldValuesJson = params.find(p => typeof p === 'string' && p.includes('pending_review'));
      const newValuesJson = params.find(p => typeof p === 'string' && p.includes('closed'));

      expect(oldValuesJson).toBeDefined();
      expect(newValuesJson).toBeDefined();
    });

    it('should return null when AE does not exist', async () => {
      mockDb.queryOne.mockReset();
      mockDb.queryOne.mockResolvedValue(null);

      const result = await repository.updateStatus(999, 'closed', 'admin');

      expect(result).toBeNull();
    });
  });

  // ==================== getAuditTrail ====================

  describe('getAuditTrail', () => {
    const mockAuditRows = [
      {
        id: 3,
        adverse_event_id: 1,
        action: 'STATUS_CHANGE',
        changed_at: '2026-01-22T10:00:00.000Z',
        changed_by: 'admin',
        old_values_json: '{"report_status":"draft"}',
        new_values_json: '{"report_status":"pending_review"}',
        reason: 'Ready for review',
        ip_address: '192.168.1.1',
        user_agent: 'Chrome',
        session_id: 'sess-123',
      },
      {
        id: 2,
        adverse_event_id: 1,
        action: 'UPDATE',
        changed_at: '2026-01-21T15:00:00.000Z',
        changed_by: 'clinician',
        old_values_json: null,
        new_values_json: '{"description":"Updated description"}',
        reason: null,
        ip_address: null,
        user_agent: null,
        session_id: null,
      },
      {
        id: 1,
        adverse_event_id: 1,
        action: 'CREATE',
        changed_at: '2026-01-21T10:00:00.000Z',
        changed_by: 'system',
        old_values_json: null,
        new_values_json: '{"severity":"mild"}',
        reason: null,
        ip_address: null,
        user_agent: null,
        session_id: null,
      },
    ];

    it('should return audit trail ordered by date DESC', async () => {
      mockDb.query.mockResolvedValue(mockAuditRows);

      const result = await repository.getAuditTrail(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY changed_at DESC'),
        [1]
      );
      expect(result).toHaveLength(3);
      expect(result[0].action).toBe('STATUS_CHANGE');
      expect(result[2].action).toBe('CREATE');
    });

    it('should parse audit entry fields correctly', async () => {
      mockDb.query.mockResolvedValue(mockAuditRows);

      const result = await repository.getAuditTrail(1);
      const entry = result[0];

      expect(entry.adverseEventId).toBe(1);
      expect(entry.changedBy).toBe('admin');
      expect(entry.changedAt).toBeInstanceOf(Date);
      expect(entry.oldValues).toEqual({ report_status: 'draft' });
      expect(entry.newValues).toEqual({ report_status: 'pending_review' });
      expect(entry.reason).toBe('Ready for review');
      expect(entry.ipAddress).toBe('192.168.1.1');
    });

    it('should handle entries with null optional fields', async () => {
      mockDb.query.mockResolvedValue([mockAuditRows[2]]);

      const result = await repository.getAuditTrail(1);
      const entry = result[0];

      expect(entry.oldValues).toBeUndefined();
      expect(entry.reason).toBeUndefined();
      expect(entry.ipAddress).toBeUndefined();
    });

    it('should return empty array when no audit entries exist', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await repository.getAuditTrail(999);

      expect(result).toEqual([]);
    });
  });

  // ==================== rowToEntity / entityToParams ====================

  describe('rowToEntity conversion', () => {
    it('should convert all row fields to entity', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity).toMatchObject({
        id: 1,
        uuid: 'ae-uuid-123',
        userId: 'user-123',
        userInternalId: 42,
        reporterType: 'patient',
        reporterName: 'Ivan Petrov',
        patientInitials: 'I.P.',
        patientAge: 45,
        patientSex: 'male',
        productName: 'SleepCore',
        severity: 'moderate',
        isSerious: false,
        expectedness: 'expected',
        dtxCategory: 'SLEEP_RESTRICTION',
        meddraPtCode: '10013649',
        causality: 'probable',
        actionTaken: 'dose_reduced',
        outcome: 'recovered',
        currentIsi: 14,
        baselineIsi: 18,
        currentWeek: 3,
        reportStatus: 'pending_review',
        reportedBy: 'patient',
        createdBy: 'system',
      });
    });

    it('should handle null optional fields', async () => {
      const rowWithNulls = {
        ...mockAERow,
        user_internal_id: null,
        reporter_name: null,
        resolution_date: null,
        outcome: null,
        causality: null,
        notes: null,
      };
      mockDb.queryOne.mockResolvedValue(rowWithNulls);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity?.userInternalId).toBeUndefined();
      expect(entity?.reporterName).toBeUndefined();
      expect(entity?.resolutionDate).toBeUndefined();
      expect(entity?.outcome).toBeUndefined();
      expect(entity?.causality).toBeUndefined();
      expect(entity?.notes).toBeUndefined();
    });
  });

  // ==================== ICH Compliance ====================

  describe('ICH E2B(R3) ICSR compliance', () => {
    it('should support all CIOMS E.1 reporter fields', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity?.reporterType).toBeDefined();
      expect(entity?.reporterName).toBeDefined();
      expect(entity?.reporterContact).toBeDefined();
    });

    it('should support CIOMS E.2 patient fields', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity?.patientInitials).toBeDefined();
      expect(entity?.patientAge).toBeDefined();
      expect(entity?.patientSex).toBeDefined();
    });

    it('should support CIOMS E.3 product fields', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity?.productName).toBeDefined();
      expect(entity?.productVersion).toBeDefined();
    });

    it('should support CIOMS E.4 reaction fields', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity?.reactionTerm).toBeDefined();
      expect(entity?.reactionOnsetDate).toBeInstanceOf(Date);
    });

    it('should support MedDRA coding', async () => {
      mockDb.queryOne.mockResolvedValue(mockAERow);

      const entity = await repository.findByUuid('ae-uuid-123');

      expect(entity?.meddraPtCode).toBe('10013649');
      expect(entity?.meddraSoc).toBe('Nervous system disorders');
    });
  });

  // ==================== 21 CFR Part 11 Compliance ====================

  describe('21 CFR Part 11 audit trail compliance', () => {
    it('should track who made changes', async () => {
      mockDb.query.mockResolvedValue([
        {
          id: 1,
          adverse_event_id: 1,
          action: 'UPDATE',
          changed_at: '2026-01-22T10:00:00.000Z',
          changed_by: 'dr.smith',
          old_values_json: null,
          new_values_json: null,
          reason: null,
          ip_address: null,
          user_agent: null,
          session_id: null,
        },
      ]);

      const trail = await repository.getAuditTrail(1);

      expect(trail[0].changedBy).toBe('dr.smith');
    });

    it('should track when changes were made', async () => {
      mockDb.query.mockResolvedValue([
        {
          id: 1,
          adverse_event_id: 1,
          action: 'CREATE',
          changed_at: '2026-01-22T10:30:45.000Z',
          changed_by: 'system',
          old_values_json: null,
          new_values_json: null,
          reason: null,
          ip_address: null,
          user_agent: null,
          session_id: null,
        },
      ]);

      const trail = await repository.getAuditTrail(1);

      expect(trail[0].changedAt).toEqual(new Date('2026-01-22T10:30:45.000Z'));
    });

    it('should track what was changed', async () => {
      mockDb.query.mockResolvedValue([
        {
          id: 1,
          adverse_event_id: 1,
          action: 'UPDATE',
          changed_at: '2026-01-22T10:00:00.000Z',
          changed_by: 'admin',
          old_values_json: '{"severity":"mild"}',
          new_values_json: '{"severity":"moderate"}',
          reason: 'Condition worsened',
          ip_address: null,
          user_agent: null,
          session_id: null,
        },
      ]);

      const trail = await repository.getAuditTrail(1);

      expect(trail[0].oldValues).toEqual({ severity: 'mild' });
      expect(trail[0].newValues).toEqual({ severity: 'moderate' });
    });

    it('should support reason for change', async () => {
      mockDb.query.mockResolvedValue([
        {
          id: 1,
          adverse_event_id: 1,
          action: 'UPDATE',
          changed_at: '2026-01-22T10:00:00.000Z',
          changed_by: 'admin',
          old_values_json: null,
          new_values_json: null,
          reason: 'Correcting data entry error per patient feedback',
          ip_address: null,
          user_agent: null,
          session_id: null,
        },
      ]);

      const trail = await repository.getAuditTrail(1);

      expect(trail[0].reason).toBe('Correcting data entry error per patient feedback');
    });
  });
});
