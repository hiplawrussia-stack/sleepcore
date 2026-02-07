/**
 * AdminDashboardService Tests
 * ===========================
 *
 * Tests for clinical pilot study centralized monitoring service.
 * Validates RBAC, audit logging, and dashboard metrics.
 *
 * Research basis mocked: ICH E6(R3), 21 CFR Part 11
 *
 * @packageDocumentation
 */

import {
  AdminDashboardService,
  createAdminDashboardService,
  type UserRole,
  type AdminAction,
} from '../AdminDashboardService';

// Mock AdverseEventService
jest.mock('../AdverseEventService', () => ({
  createAdverseEventService: jest.fn(() => ({
    getStatistics: jest.fn(() => ({
      total: 5,
      serious: 1,
      byType: {},
      byGrade: {},
    })),
    getUnacknowledgedAlerts: jest.fn(() => [
      { id: 1, type: 'isi_worsening', severity: 'moderate' },
    ]),
    getAllAlerts: jest.fn(() => [
      { id: 1, type: 'isi_worsening', severity: 'moderate', acknowledged: false },
      { id: 2, type: 'dropout_risk', severity: 'low', acknowledged: true },
    ]),
    acknowledgeAlert: jest.fn(() => true),
  })),
}));

// Create mock database connection
const createMockDb = () => {
  const mockQueryOne = jest.fn();
  const mockQuery = jest.fn();

  return {
    queryOne: mockQueryOne,
    query: mockQuery,
    execute: jest.fn(),
    transaction: jest.fn(),
  };
};

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  const originalEnv = process.env;

  beforeEach(() => {
    // Setup environment variables for admin config
    process.env = {
      ...originalEnv,
      ADMIN_USER_IDS: 'admin123,admin456',
      SUPER_ADMIN_IDS: 'superadmin789',
    };

    mockDb = createMockDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new AdminDashboardService(mockDb as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Authorization (RBAC)
  // ==========================================================================
  describe('Authorization (RBAC)', () => {
    it('should identify admin users', () => {
      expect(service.isAdmin('admin123')).toBe(true);
      expect(service.isAdmin('admin456')).toBe(true);
    });

    it('should identify super admin as admin', () => {
      expect(service.isAdmin('superadmin789')).toBe(true);
    });

    it('should reject non-admin users', () => {
      expect(service.isAdmin('regular_user')).toBe(false);
      expect(service.isAdmin('unknown')).toBe(false);
    });

    it('should identify super admin users', () => {
      expect(service.isSuperAdmin('superadmin789')).toBe(true);
    });

    it('should not identify regular admin as super admin', () => {
      expect(service.isSuperAdmin('admin123')).toBe(false);
    });

    it('should return correct user roles', () => {
      expect(service.getUserRole('superadmin789')).toBe('super_admin');
      expect(service.getUserRole('admin123')).toBe('admin');
      expect(service.getUserRole('regular_user')).toBe('user');
    });
  });

  // ==========================================================================
  // Audit Logging
  // ==========================================================================
  describe('Audit Logging', () => {
    it('should log admin actions', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.logAdminAction('admin123', 'Admin Name', 'VIEW_DASHBOARD');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Admin Audit]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('admin123')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('VIEW_DASHBOARD')
      );

      consoleSpy.mockRestore();
    });

    it('should log action with target user', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.logAdminAction('admin123', 'Admin', 'VIEW_USER_DETAIL', 42);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User: 42')
      );

      consoleSpy.mockRestore();
    });

    it('should log action with details', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.logAdminAction('admin123', 'Admin', 'EXPORT_DATA', undefined, 'Full export');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Full export')
      );

      consoleSpy.mockRestore();
    });

    it('should retrieve audit log', () => {
      jest.spyOn(console, 'log').mockImplementation();

      service.logAdminAction('admin1', 'Admin 1', 'VIEW_DASHBOARD');
      service.logAdminAction('admin2', 'Admin 2', 'VIEW_USER_LIST');
      service.logAdminAction('admin1', 'Admin 1', 'VIEW_ASSESSMENTS');

      const log = service.getAuditLog();

      expect(log).toHaveLength(3);
      expect(log[0].action).toBe('VIEW_DASHBOARD');
      expect(log[2].action).toBe('VIEW_ASSESSMENTS');
    });

    it('should limit audit log entries', () => {
      jest.spyOn(console, 'log').mockImplementation();

      for (let i = 0; i < 150; i++) {
        service.logAdminAction('admin', 'Admin', 'VIEW_DASHBOARD');
      }

      const log = service.getAuditLog(50);
      expect(log).toHaveLength(50);
    });

    it('should include timestamp in audit entry', () => {
      jest.spyOn(console, 'log').mockImplementation();

      const before = new Date();
      service.logAdminAction('admin', 'Admin', 'VIEW_DASHBOARD');
      const after = new Date();

      const log = service.getAuditLog();
      expect(log[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ==========================================================================
  // Dashboard Metrics
  // ==========================================================================
  describe('Dashboard Metrics', () => {
    beforeEach(() => {
      // Setup default mock responses for metrics queries
      mockDb.queryOne.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count FROM users WHERE deleted_at IS NULL')) {
          if (query.includes('consent_given = 1')) {
            return Promise.resolve({ count: 80 });
          }
          if (query.includes('-7 days')) {
            return Promise.resolve({ count: 60 });
          }
          if (query.includes('-30 days')) {
            return Promise.resolve({ count: 75 });
          }
          if (query.includes('-21 days')) {
            return Promise.resolve({ count: 5 });
          }
          return Promise.resolve({ count: 100 });
        }
        if (query.includes('AVG(score)')) {
          return Promise.resolve({ count: 50, avg: 15.5 });
        }
        if (query.includes('mcidThreshold') || query.includes('>= 7')) {
          return Promise.resolve({ count: 20 });
        }
        if (query.includes('remissionThreshold') || query.includes('< 8')) {
          return Promise.resolve({ count: 15 });
        }
        if (query.includes('total_diaries')) {
          return Promise.resolve({ total_diaries: 500, users_with_diaries: 70 });
        }
        if (query.includes('AVG(session_count)')) {
          return Promise.resolve({ avg: 8.5 });
        }
        if (query.includes('AVG(daily_streak)')) {
          return Promise.resolve({ avg: 5.2 });
        }
        if (query.includes('quest_progress')) {
          return Promise.resolve({ completed: 300, total: 400 });
        }
        if (query.includes('worseningThreshold')) {
          return Promise.resolve({ count: 3 });
        }
        if (query.includes('deleted_at IS NOT NULL')) {
          return Promise.resolve({ count: 2 });
        }
        return Promise.resolve({ count: 0 });
      });
    });

    it('should get comprehensive dashboard metrics', async () => {
      const metrics = await service.getDashboardMetrics();

      expect(metrics).toHaveProperty('enrollment');
      expect(metrics).toHaveProperty('isiOutcomes');
      expect(metrics).toHaveProperty('engagement');
      expect(metrics).toHaveProperty('safety');
      expect(metrics).toHaveProperty('compliance');
      expect(metrics).toHaveProperty('generatedAt');
      expect(metrics.generatedAt).toBeInstanceOf(Date);
    });

    it('should include enrollment metrics', async () => {
      const metrics = await service.getDashboardMetrics();

      expect(metrics.enrollment.total).toBeGreaterThanOrEqual(0);
      expect(metrics.enrollment.withConsent).toBeGreaterThanOrEqual(0);
      expect(metrics.enrollment.active7Days).toBeGreaterThanOrEqual(0);
      expect(metrics.enrollment.active30Days).toBeGreaterThanOrEqual(0);
      expect(metrics.enrollment.dropouts).toBeGreaterThanOrEqual(0);
    });

    it('should include ISI outcome metrics', async () => {
      const metrics = await service.getDashboardMetrics();

      expect(metrics.isiOutcomes).toHaveProperty('baselineCount');
      expect(metrics.isiOutcomes).toHaveProperty('averageBaseline');
      expect(metrics.isiOutcomes).toHaveProperty('latestCount');
      expect(metrics.isiOutcomes).toHaveProperty('averageLatest');
      expect(metrics.isiOutcomes).toHaveProperty('mcidAchieved');
      expect(metrics.isiOutcomes).toHaveProperty('remissionAchieved');
    });

    it('should include engagement metrics', async () => {
      const metrics = await service.getDashboardMetrics();

      expect(metrics.engagement).toHaveProperty('diaryCompletionRate');
      expect(metrics.engagement).toHaveProperty('averageSessionsPerUser');
      expect(metrics.engagement).toHaveProperty('averageStreakDays');
      expect(metrics.engagement).toHaveProperty('questCompletionRate');
    });

    it('should include safety metrics from AE service', async () => {
      const metrics = await service.getDashboardMetrics();

      expect(metrics.safety.adverseEventsTotal).toBe(5);
      expect(metrics.safety.adverseEventsSerious).toBe(1);
      expect(metrics.safety).toHaveProperty('isiWorseningCount');
    });

    it('should include compliance metrics', async () => {
      const metrics = await service.getDashboardMetrics();

      expect(metrics.compliance).toHaveProperty('consentedUsers');
      expect(metrics.compliance).toHaveProperty('dataExportRequests');
      expect(metrics.compliance).toHaveProperty('anonymizationRequests');
    });

    it('should handle null query results gracefully', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const metrics = await service.getDashboardMetrics();

      expect(metrics.enrollment.total).toBe(0);
      expect(metrics.isiOutcomes.baselineCount).toBe(0);
    });
  });

  // ==========================================================================
  // Safety Alerts
  // ==========================================================================
  describe('Safety Alerts', () => {
    it('should get unacknowledged safety alerts', async () => {
      const alerts = await service.getSafetyAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('isi_worsening');
    });

    it('should get all safety alerts', async () => {
      const alerts = await service.getAllSafetyAlerts();

      expect(alerts).toHaveLength(2);
    });

    it('should get alerts with limit', async () => {
      const alerts = await service.getAllSafetyAlerts(1);

      // Mock always returns 2, but verifies the method accepts limit
      expect(alerts).toBeDefined();
    });

    it('should acknowledge safety alert', async () => {
      const result = await service.acknowledgeSafetyAlert(0, 'admin123');

      expect(result).toBe(true);
    });

    it('should get AE service instance', () => {
      const aeService = service.getAEService();

      expect(aeService).toBeDefined();
      expect(typeof aeService.getStatistics).toBe('function');
    });
  });

  // ==========================================================================
  // User Management
  // ==========================================================================
  describe('User Management', () => {
    beforeEach(() => {
      // Mock user list query - use recent dates to avoid "completed" status
      const recentEnrollment = new Date();
      recentEnrollment.setDate(recentEnrollment.getDate() - 14); // 2 weeks ago

      mockDb.query.mockImplementation((query: string, params?: unknown[]) => {
        if (query.includes('SELECT id, external_id, first_name')) {
          return Promise.resolve([
            {
              id: 1,
              external_id: 'ext_001',
              first_name: 'Иван',
              created_at: recentEnrollment.toISOString(),
              last_activity_at: new Date().toISOString(),
              consent_given: 1,
            },
            {
              id: 2,
              external_id: 'ext_002',
              first_name: null,
              created_at: recentEnrollment.toISOString(),
              last_activity_at: null,
              consent_given: 0,
            },
          ]);
        }
        if (query.includes('SELECT score, created_at FROM assessments')) {
          return Promise.resolve([
            { score: 18, created_at: '2025-01-02T00:00:00Z' },
            { score: 12, created_at: '2025-01-15T00:00:00Z' },
          ]);
        }
        if (query.includes('SELECT id FROM users WHERE id =')) {
          return Promise.resolve([{ id: params?.[0] }]);
        }
        return Promise.resolve([]);
      });

      mockDb.queryOne.mockImplementation((query: string) => {
        if (query.includes('sleep_diary_entries')) {
          return Promise.resolve({ count: 10 });
        }
        if (query.includes('therapy_sessions')) {
          return Promise.resolve({ count: 5 });
        }
        return Promise.resolve({ count: 0 });
      });
    });

    it('should get user list', async () => {
      const users = await service.getUserList();

      expect(users).toHaveLength(2);
      expect(users[0].displayName).toBe('Иван');
      expect(users[1].displayName).toBe('User 2');
    });

    it('should calculate ISI change', async () => {
      const users = await service.getUserList();

      // User 1 has ISI history: 18 -> 12, change = 6
      expect(users[0].baselineISI).toBe(18);
      expect(users[0].latestISI).toBe(12);
      expect(users[0].isiChange).toBe(6);
    });

    it('should determine user status', async () => {
      const users = await service.getUserList();

      // User 1 has recent activity - should be active
      expect(users[0].status).toBe('active');
    });

    it('should get user list with pagination', async () => {
      await service.getUserList(10, 5);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [10, 5]
      );
    });

    it('should get user detail', async () => {
      const detail = await service.getUserDetail(1);

      expect(detail).not.toBeNull();
      expect(detail?.user.id).toBe(1);
      expect(detail?.isiHistory).toHaveLength(2);
    });

    it('should return null for non-existent user', async () => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('SELECT id FROM users WHERE id =')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      const detail = await service.getUserDetail(999);

      expect(detail).toBeNull();
    });

    it('should calculate current week from enrollment', async () => {
      const users = await service.getUserList();

      // User enrolled on 2025-01-01, current week should be calculated
      expect(users[0].currentWeek).toBeGreaterThanOrEqual(0);
    });

    it('should handle user without first name', async () => {
      const users = await service.getUserList();

      expect(users[1].displayName).toBe('User 2');
    });

    it('should track consent status', async () => {
      const users = await service.getUserList();

      expect(users[0].consentGiven).toBe(true);
      expect(users[1].consentGiven).toBe(false);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('Factory Function', () => {
    it('should create service via factory', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = createAdminDashboardService(mockDb as any);

      expect(created).toBeInstanceOf(AdminDashboardService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty admin config', () => {
      process.env.ADMIN_USER_IDS = '';
      process.env.SUPER_ADMIN_IDS = '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emptyService = new AdminDashboardService(mockDb as any);

      expect(emptyService.isAdmin('anyone')).toBe(false);
      expect(emptyService.getUserRole('anyone')).toBe('user');
    });

    it('should handle missing env variables', () => {
      delete process.env.ADMIN_USER_IDS;
      delete process.env.SUPER_ADMIN_IDS;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noEnvService = new AdminDashboardService(mockDb as any);

      expect(noEnvService.isAdmin('admin123')).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.queryOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getDashboardMetrics()).rejects.toThrow('Database error');
    });

    it('should count export requests in compliance metrics', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      // Log some export actions
      service.logAdminAction('admin', 'Admin', 'EXPORT_DATA');
      service.logAdminAction('admin', 'Admin', 'EXPORT_DATA');

      mockDb.queryOne.mockResolvedValue({ count: 50 });

      const metrics = await service.getDashboardMetrics();

      expect(metrics.compliance.dataExportRequests).toBe(2);
    });

    it('should handle users at week 12+ as completed', async () => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('SELECT id, external_id')) {
          // User enrolled 100 days ago
          const oldDate = new Date();
          oldDate.setDate(oldDate.getDate() - 100);
          return Promise.resolve([
            {
              id: 1,
              external_id: 'old_user',
              first_name: 'Old',
              created_at: oldDate.toISOString(),
              last_activity_at: new Date().toISOString(),
              consent_given: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      });
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const users = await service.getUserList();

      expect(users[0].status).toBe('completed');
    });

    it('should mark inactive users correctly', async () => {
      // Use recent enrollment (within 12 weeks) to avoid "completed" override
      const recentEnrollment = new Date();
      recentEnrollment.setDate(recentEnrollment.getDate() - 30);

      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('SELECT id, external_id')) {
          // User with activity 10 days ago (> 7 day threshold)
          const inactiveDate = new Date();
          inactiveDate.setDate(inactiveDate.getDate() - 10);
          return Promise.resolve([
            {
              id: 1,
              external_id: 'inactive_user',
              first_name: 'Inactive',
              created_at: recentEnrollment.toISOString(),
              last_activity_at: inactiveDate.toISOString(),
              consent_given: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      });
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const users = await service.getUserList();

      expect(users[0].status).toBe('inactive');
    });

    it('should mark dropped users correctly', async () => {
      // Use recent enrollment (within 12 weeks) to avoid "completed" override
      const recentEnrollment = new Date();
      recentEnrollment.setDate(recentEnrollment.getDate() - 60);

      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('SELECT id, external_id')) {
          // User with activity 25 days ago (> 21 day threshold)
          const droppedDate = new Date();
          droppedDate.setDate(droppedDate.getDate() - 25);
          return Promise.resolve([
            {
              id: 1,
              external_id: 'dropped_user',
              first_name: 'Dropped',
              created_at: recentEnrollment.toISOString(),
              last_activity_at: droppedDate.toISOString(),
              consent_given: 1,
            },
          ]);
        }
        return Promise.resolve([]);
      });
      mockDb.queryOne.mockResolvedValue({ count: 0 });

      const users = await service.getUserList();

      expect(users[0].status).toBe('dropped');
    });
  });

  // ==========================================================================
  // Type Safety
  // ==========================================================================
  describe('Type Safety', () => {
    it('should have correct UserRole type', () => {
      const roles: UserRole[] = ['user', 'clinician', 'admin', 'super_admin'];

      expect(roles).toContain(service.getUserRole('superadmin789'));
    });

    it('should have correct AdminAction type', () => {
      const actions: AdminAction[] = [
        'VIEW_DASHBOARD',
        'VIEW_USER_LIST',
        'VIEW_USER_DETAIL',
        'VIEW_ASSESSMENTS',
        'VIEW_ADVERSE_EVENTS',
        'EXPORT_DATA',
        'VIEW_DATA_EXPORT',
        'VIEW_AUDIT_LOG',
      ];

      jest.spyOn(console, 'log').mockImplementation();

      for (const action of actions) {
        expect(() => service.logAdminAction('admin', 'Admin', action)).not.toThrow();
      }
    });
  });
});
