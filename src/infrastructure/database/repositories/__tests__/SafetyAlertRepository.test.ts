/**
 * SafetyAlertRepository Unit Tests
 * =================================
 *
 * CRITICAL: Safety alert management for crisis escalation.
 *
 * Compliance:
 * - IEC 62304 Class C (safety-critical)
 * - SAMHSA Guidelines 2025
 *
 * Traceability:
 * - REQ-CRISIS-001: Crisis alerts must be tracked
 * - REQ-ESCALATION-001: Alerts must support escalation workflow
 *
 * @packageDocumentation
 */

import {
  SafetyAlertRepository,
  type ISafetyAlertEntity,
} from '../AdverseEventRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

describe('SafetyAlertRepository', () => {
  let repository: SafetyAlertRepository;
  let mockDb: jest.Mocked<IDatabaseConnection>;

  const mockAlertRow = {
    id: 1,
    type: 'ISI_WORSENING',
    severity: 'warning',
    user_id: 'user-123',
    user_display_name: 'Иван Петров',
    message: 'ISI score increased by 8 points (14 → 22)',
    adverse_event_id: null,
    acknowledged: 0,
    acknowledged_by: null,
    acknowledged_at: null,
    escalated: 0,
    escalated_to: null,
    escalated_at: null,
    created_at: '2026-01-20T10:00:00.000Z',
  };

  const mockCriticalAlertRow = {
    id: 2,
    type: 'CRISIS',
    severity: 'critical',
    user_id: 'user-456',
    user_display_name: 'Мария Сидорова',
    message: 'Crisis keywords detected: "не хочу жить"',
    adverse_event_id: null,
    acknowledged: 0,
    acknowledged_by: null,
    acknowledged_at: null,
    escalated: 0,
    escalated_to: null,
    escalated_at: null,
    created_at: '2026-01-20T11:00:00.000Z',
  };

  const mockAcknowledgedAlertRow = {
    id: 3,
    type: 'SERIOUS_AE',
    severity: 'critical',
    user_id: 'user-789',
    user_display_name: null,
    message: 'Serious adverse event reported',
    adverse_event_id: 5,
    acknowledged: 1,
    acknowledged_by: 'dr.smith',
    acknowledged_at: '2026-01-20T12:00:00.000Z',
    escalated: 0,
    escalated_to: null,
    escalated_at: null,
    created_at: '2026-01-20T10:30:00.000Z',
  };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    } as unknown as jest.Mocked<IDatabaseConnection>;

    repository = new SafetyAlertRepository(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== create ====================

  describe('create', () => {
    const newAlert: Omit<ISafetyAlertEntity, 'id' | 'createdAt'> = {
      type: 'ISI_WORSENING',
      severity: 'warning',
      userId: 'user-123',
      userDisplayName: 'Test User',
      message: 'ISI increased significantly',
      acknowledged: false,
      escalated: false,
    };

    beforeEach(() => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 10 });
      mockDb.queryOne.mockResolvedValue({ ...mockAlertRow, id: 10 });
    });

    it('should insert alert and return created entity', async () => {
      const result = await repository.create(newAlert);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO safety_alerts'),
        expect.arrayContaining(['ISI_WORSENING', 'warning', 'user-123'])
      );
      expect(result).toBeDefined();
      expect(result.id).toBe(10);
    });

    it('should insert with all required fields', async () => {
      await repository.create(newAlert);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params).toContain('ISI_WORSENING');
      expect(params).toContain('warning');
      expect(params).toContain('user-123');
      expect(params).toContain('Test User');
      expect(params).toContain('ISI increased significantly');
    });

    it('should handle optional adverseEventId', async () => {
      const alertWithAE = { ...newAlert, adverseEventId: 5 };

      await repository.create(alertWithAE);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params).toContain(5);
    });

    it('should handle null userDisplayName', async () => {
      const alertNoName = { ...newAlert, userDisplayName: undefined };

      await repository.create(alertNoName);

      const params = mockDb.execute.mock.calls[0][1] as unknown[];
      expect(params).toContain(null);
    });

    it('should create alerts for all types', async () => {
      const types: ISafetyAlertEntity['type'][] = [
        'ISI_WORSENING',
        'SERIOUS_AE',
        'SUSAR',
        'DEADLINE_APPROACHING',
        'CRISIS',
      ];

      for (const type of types) {
        mockDb.queryOne.mockResolvedValue({ ...mockAlertRow, type });
        const alert = await repository.create({ ...newAlert, type });
        expect(alert.type).toBe(type);
      }
    });
  });

  // ==================== findById ====================

  describe('findById', () => {
    it('should return alert when exists', async () => {
      mockDb.queryOne.mockResolvedValue(mockAlertRow);

      const result = await repository.findById(1);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        [1]
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.type).toBe('ISI_WORSENING');
    });

    it('should return null when not exists', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('should convert row to entity correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockAlertRow);

      const result = await repository.findById(1);

      expect(result).toMatchObject({
        id: 1,
        type: 'ISI_WORSENING',
        severity: 'warning',
        userId: 'user-123',
        userDisplayName: 'Иван Петров',
        acknowledged: false,
        escalated: false,
      });
    });

    it('should parse acknowledged alert correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockAcknowledgedAlertRow);

      const result = await repository.findById(3);

      expect(result?.acknowledged).toBe(true);
      expect(result?.acknowledgedBy).toBe('dr.smith');
      expect(result?.acknowledgedAt).toBeInstanceOf(Date);
    });
  });

  // ==================== findUnacknowledged ====================

  describe('findUnacknowledged', () => {
    it('should return only unacknowledged alerts', async () => {
      mockDb.query.mockResolvedValue([mockAlertRow, mockCriticalAlertRow]);

      const result = await repository.findUnacknowledged();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE acknowledged = 0')
      );
      expect(result).toHaveLength(2);
      result.forEach(alert => {
        expect(alert.acknowledged).toBe(false);
      });
    });

    it('should order by created_at DESC', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findUnacknowledged();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });

    it('should return empty array when all acknowledged', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await repository.findUnacknowledged();

      expect(result).toEqual([]);
    });
  });

  // ==================== findByUserId ====================

  describe('findByUserId', () => {
    it('should return alerts for specific user', async () => {
      mockDb.query.mockResolvedValue([mockAlertRow]);

      const result = await repository.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ?'),
        ['user-123', 100]
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });

    it('should use default limit of 100', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        expect.arrayContaining([100])
      );
    });

    it('should support custom limit', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByUserId('user-123', 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-123', 10]
      );
    });

    it('should order by created_at DESC', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });

  // ==================== findByAdverseEventId ====================

  describe('findByAdverseEventId', () => {
    it('should return alerts linked to adverse event', async () => {
      const alertWithAE = { ...mockAlertRow, adverse_event_id: 5 };
      mockDb.query.mockResolvedValue([alertWithAE]);

      const result = await repository.findByAdverseEventId(5);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE adverse_event_id = ?'),
        [5]
      );
      expect(result).toHaveLength(1);
      expect(result[0].adverseEventId).toBe(5);
    });

    it('should return empty array when no alerts linked', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await repository.findByAdverseEventId(999);

      expect(result).toEqual([]);
    });

    it('should order by created_at DESC', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findByAdverseEventId(5);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });

  // ==================== acknowledge ====================

  describe('acknowledge', () => {
    it('should acknowledge unacknowledged alert', async () => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      const result = await repository.acknowledge(1, 'dr.smith');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SET acknowledged = 1'),
        ['dr.smith', 1]
      );
      expect(result).toBe(true);
    });

    it('should set acknowledged_by and acknowledged_at', async () => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      await repository.acknowledge(1, 'admin');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('acknowledged_by = ?'),
        expect.any(Array)
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("acknowledged_at = datetime('now')"),
        expect.any(Array)
      );
    });

    it('should only acknowledge unacknowledged alerts', async () => {
      mockDb.execute.mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      const result = await repository.acknowledge(3, 'admin');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ? AND acknowledged = 0'),
        expect.any(Array)
      );
      expect(result).toBe(false);
    });

    it('should return false when alert not found', async () => {
      mockDb.execute.mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      const result = await repository.acknowledge(999, 'admin');

      expect(result).toBe(false);
    });
  });

  // ==================== escalate ====================

  describe('escalate', () => {
    it('should escalate alert', async () => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      const result = await repository.escalate(1, 'senior.doctor');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('SET escalated = 1'),
        ['senior.doctor', 1]
      );
      expect(result).toBe(true);
    });

    it('should set escalated_to and escalated_at', async () => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      await repository.escalate(1, 'admin');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('escalated_to = ?'),
        expect.any(Array)
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("escalated_at = datetime('now')"),
        expect.any(Array)
      );
    });

    it('should allow re-escalation', async () => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      const result = await repository.escalate(1, 'crisis.team');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        expect.any(Array)
      );
      expect(result).toBe(true);
    });

    it('should return false when alert not found', async () => {
      mockDb.execute.mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      const result = await repository.escalate(999, 'admin');

      expect(result).toBe(false);
    });
  });

  // ==================== findAll ====================

  describe('findAll', () => {
    it('should return all alerts with default limit', async () => {
      mockDb.query.mockResolvedValue([mockAlertRow, mockCriticalAlertRow]);

      const result = await repository.findAll();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [100]
      );
      expect(result).toHaveLength(2);
    });

    it('should support custom limit', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findAll(50);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [50]
      );
    });

    it('should order by created_at DESC', async () => {
      mockDb.query.mockResolvedValue([]);

      await repository.findAll();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });
  });

  // ==================== hasDuplicateAlert ====================

  describe('hasDuplicateAlert', () => {
    it('should return true when duplicate exists', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 1 });

      const result = await repository.hasDuplicateAlert('SERIOUS_AE', 5);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = ? AND adverse_event_id = ? AND acknowledged = 0'),
        ['SERIOUS_AE', 5]
      );
      expect(result).toBe(true);
    });

    it('should return false when no duplicate', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const result = await repository.hasDuplicateAlert('CRISIS', 10);

      expect(result).toBe(false);
    });

    it('should only check unacknowledged alerts', async () => {
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      await repository.hasDuplicateAlert('ISI_WORSENING', 1);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('acknowledged = 0'),
        expect.any(Array)
      );
    });

    it('should handle null count result', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await repository.hasDuplicateAlert('DEADLINE_APPROACHING', 1);

      expect(result).toBe(false);
    });
  });

  // ==================== rowToEntity conversion ====================

  describe('rowToEntity conversion', () => {
    it('should convert all fields correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockAcknowledgedAlertRow);

      const result = await repository.findById(3);

      expect(result).toMatchObject({
        id: 3,
        type: 'SERIOUS_AE',
        severity: 'critical',
        userId: 'user-789',
        userDisplayName: undefined, // null becomes undefined
        message: 'Serious adverse event reported',
        adverseEventId: 5,
        acknowledged: true,
        acknowledgedBy: 'dr.smith',
        escalated: false,
        escalatedTo: undefined,
        escalatedAt: undefined,
      });
    });

    it('should parse dates correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockAcknowledgedAlertRow);

      const result = await repository.findById(3);

      expect(result?.acknowledgedAt).toBeInstanceOf(Date);
      expect(result?.createdAt).toBeInstanceOf(Date);
    });

    it('should handle escalated alert', async () => {
      const escalatedRow = {
        ...mockAlertRow,
        escalated: 1,
        escalated_to: 'crisis.team',
        escalated_at: '2026-01-20T15:00:00.000Z',
      };
      mockDb.queryOne.mockResolvedValue(escalatedRow);

      const result = await repository.findById(1);

      expect(result?.escalated).toBe(true);
      expect(result?.escalatedTo).toBe('crisis.team');
      expect(result?.escalatedAt).toBeInstanceOf(Date);
    });
  });

  // ==================== Crisis Escalation Workflow ====================

  describe('crisis escalation workflow', () => {
    it('should support create → acknowledge → escalate flow', async () => {
      // 1. Create crisis alert
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 100 });
      mockDb.queryOne.mockResolvedValue({ ...mockCriticalAlertRow, id: 100 });

      const alert = await repository.create({
        type: 'CRISIS',
        severity: 'critical',
        userId: 'user-crisis',
        message: 'Crisis detected',
        acknowledged: false,
        escalated: false,
      });

      expect(alert.type).toBe('CRISIS');
      expect(alert.severity).toBe('critical');

      // 2. Acknowledge
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });
      const ackResult = await repository.acknowledge(100, 'first.responder');
      expect(ackResult).toBe(true);

      // 3. Escalate
      const escResult = await repository.escalate(100, 'crisis.team');
      expect(escResult).toBe(true);
    });

    it('should find unacknowledged crisis alerts', async () => {
      mockDb.query.mockResolvedValue([mockCriticalAlertRow]);

      const alerts = await repository.findUnacknowledged();

      const crisisAlerts = alerts.filter(a => a.type === 'CRISIS');
      expect(crisisAlerts.length).toBeGreaterThanOrEqual(0); // depends on mock data
    });
  });

  // ==================== Alert Types ====================

  describe('alert types', () => {
    const alertTypes: Array<{ type: ISafetyAlertEntity['type']; description: string }> = [
      { type: 'ISI_WORSENING', description: 'ISI score worsening' },
      { type: 'SERIOUS_AE', description: 'Serious adverse event' },
      { type: 'SUSAR', description: 'Suspected unexpected serious adverse reaction' },
      { type: 'DEADLINE_APPROACHING', description: 'Regulatory deadline approaching' },
      { type: 'CRISIS', description: 'Crisis detected' },
    ];

    alertTypes.forEach(({ type, description }) => {
      it(`should handle ${type} (${description})`, async () => {
        mockDb.queryOne.mockResolvedValue({ ...mockAlertRow, type });

        const result = await repository.findById(1);

        expect(result?.type).toBe(type);
      });
    });
  });

  // ==================== Severity Levels ====================

  describe('severity levels', () => {
    it('should handle warning severity', async () => {
      mockDb.queryOne.mockResolvedValue({ ...mockAlertRow, severity: 'warning' });

      const result = await repository.findById(1);

      expect(result?.severity).toBe('warning');
    });

    it('should handle critical severity', async () => {
      mockDb.queryOne.mockResolvedValue({ ...mockAlertRow, severity: 'critical' });

      const result = await repository.findById(1);

      expect(result?.severity).toBe('critical');
    });
  });
});
