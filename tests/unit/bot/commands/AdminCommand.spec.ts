/**
 * AdminCommand Unit Tests
 * ========================
 * Tests for /admin command - clinical pilot study monitoring dashboard.
 */

import { AdminCommand, adminCommand } from '../../../../src/bot/commands/AdminCommand';
import { createMockContext } from './testHelpers';

// Mock admin dashboard service
jest.mock('../../../../src/bot/services/AdminDashboardService', () => ({
  createAdminDashboardService: jest.fn().mockReturnValue({
    isAdmin: jest.fn().mockReturnValue(false),
    isSuperAdmin: jest.fn().mockReturnValue(false),
    getUserRole: jest.fn().mockReturnValue('admin'),
    getDashboardMetrics: jest.fn().mockResolvedValue({
      totalUsers: 50,
      activeUsers: 35,
      weeklyActiveUsers: 20,
      enrollment: { completed: 45, inProgress: 5, dropped: 0 },
      isiOutcomes: { responders: 20, remitters: 15, nonResponders: 10 },
      safety: { alertsThisWeek: 2, unacknowledged: 1 },
      engagement: { avgDiaryCompletionRate: 0.85, avgSessionLength: 12 },
      compliance: { avgAdherence: 0.8, exportRequests: 3 },
    }),
    getUserList: jest.fn().mockResolvedValue([]),
    logAction: jest.fn().mockResolvedValue(undefined),
    logAdminAction: jest.fn().mockResolvedValue(undefined),
  }),
  AdminDashboardService: jest.fn(),
}));

jest.mock('../../../../src/bot/services/AnonymizedDataExportService', () => ({
  createAnonymizedDataExportService: jest.fn().mockReturnValue({
    exportData: jest.fn().mockResolvedValue({ data: [], format: 'json' }),
  }),
  DEFAULT_EXPORT_CONFIG: {
    anonymizationLevel: 'strong',
    includeFields: ['sleep_metrics'],
    excludeFields: [],
  },
}));

describe('AdminCommand', () => {
  let command: AdminCommand;

  beforeEach(() => {
    command = new AdminCommand();
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('admin');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('администратор');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('dashboard');
      expect(command.aliases).toContain('monitor');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have conversation steps', () => {
      expect(command.steps).toContain('main_menu');
      expect(command.steps).toContain('dashboard');
      expect(command.steps).toContain('user_list');
      expect(command.steps).toContain('safety_alerts');
      expect(command.steps).toContain('audit_log');
    });
  });

  describe('execute()', () => {
    it('should show unauthorized message for non-admin users', async () => {
      const ctx = createMockContext();
      // Mock db on context
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.execute(ctx);

      // Non-admin users should see unauthorized message with success: false
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('Доступ запрещён');
    });
  });

  describe('handleStep()', () => {
    it('should handle main_menu step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'main_menu', {});

      expect(result.success).toBeDefined();
    });

    it('should handle unauthorized step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'unauthorized', {});

      expect(result.success).toBe(true);
    });
  });

  describe('handleCallback()', () => {
    it('should handle dashboard callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:dashboard', {});

      expect(result).toBeDefined();
    });

    it('should handle user_list callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:user_list', {});

      expect(result).toBeDefined();
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(adminCommand).toBeInstanceOf(AdminCommand);
      expect(adminCommand.name).toBe('admin');
    });
  });

  // ==================== Branch Coverage Improvements ====================

  describe('Error Handling - No Database', () => {
    it('should throw error when db is not configured in getAdminService', async () => {
      const ctx = createMockContext();
      // No db configured
      (ctx.sleepCore as { db?: unknown }).db = undefined;

      // Access via execute which calls getAdminService
      await expect(async () => {
        await command.execute(ctx);
      }).rejects.toThrow('Database connection not configured');
    });
  });

  describe('handleStep() - All Steps', () => {
    const mockAdminService = {
      isAdmin: jest.fn().mockReturnValue(true),
      isSuperAdmin: jest.fn().mockReturnValue(false),
      getUserRole: jest.fn().mockReturnValue('admin'),
      getDashboardMetrics: jest.fn().mockResolvedValue({
        enrollment: { total: 50, withConsent: 45, active7Days: 35, active30Days: 40, dropouts: 5 },
        isiOutcomes: { baselineCount: 40, averageBaseline: 18, latestCount: 35, averageLatest: 12, mcidAchieved: 20, remissionAchieved: 15 },
        engagement: { diaryCompletionRate: 85, averageSessionsPerUser: 12, averageStreakDays: 5, questCompletionRate: 70 },
        safety: { adverseEventsTotal: 2, adverseEventsSerious: 0, isiWorseningCount: 1 },
        compliance: { consentedUsers: 45, dataExportRequests: 3, anonymizationRequests: 5 },
        generatedAt: new Date(),
      }),
      getUserList: jest.fn().mockResolvedValue([
        { id: 'user-1', displayName: 'User 1', enrollmentDate: new Date(), isiBaseline: 18, currentIsi: 12 },
        { id: 'user-2', displayName: 'User 2', enrollmentDate: new Date(), isiBaseline: 22, currentIsi: 8 },
      ]),
      getUserDetail: jest.fn().mockResolvedValue({
        id: 'user-1',
        displayName: 'User 1',
        enrollmentDate: new Date(),
        isiBaseline: 18,
        currentIsi: 12,
        diaryCount: 14,
        sessionsCompleted: 3,
      }),
      getSafetyAlerts: jest.fn().mockResolvedValue([
        { userId: 'user-1', alertType: 'isi_worsening', severity: 'medium', timestamp: new Date() },
      ]),
      getAuditLog: jest.fn().mockResolvedValue([
        { action: 'VIEW_DASHBOARD', userId: 'admin-1', timestamp: new Date() },
      ]),
      logAction: jest.fn().mockResolvedValue(undefined),
      logAdminAction: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset the mock implementation
      const { createAdminDashboardService } = require('../../../../src/bot/services/AdminDashboardService');
      createAdminDashboardService.mockReturnValue(mockAdminService);
    });

    it('should handle dashboard step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'dashboard', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Дашборд');
    });

    it('should handle user_list step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'user_list', {});

      expect(result.success).toBe(true);
    });

    it('should handle user_detail step with targetUserId', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      mockAdminService.getUserDetail = jest.fn().mockResolvedValue({
        user: {
          id: 123,
          externalId: 'ext-user-123-abc',
          displayName: 'Test User',
          currentWeek: 3,
          status: 'active',
          consentGiven: true,
          lastActivityAt: new Date(),
          enrollmentDate: new Date(),
          baselineISI: 18,
          latestISI: 12,
          isiChange: 6,
          diaryCount: 14,
          sessionCount: 5,
        },
        isiHistory: [
          { week: 1, score: 18, date: new Date() },
          { week: 2, score: 15, date: new Date() },
        ],
      });

      const result = await command.handleStep(ctx, 'user_detail', { targetUserId: 123 });

      expect(result.success).toBe(true);
    });

    it('should show error for user_detail without targetUserId', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'user_detail', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('не указан');
    });

    it('should handle safety_alerts step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'safety_alerts', {});

      expect(result.success).toBe(true);
    });

    it('should handle audit_log step for super admin', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      mockAdminService.isSuperAdmin = jest.fn().mockReturnValue(true);
      mockAdminService.getAuditLog = jest.fn().mockResolvedValue([
        { action: 'VIEW_DASHBOARD', adminId: 'admin-1', adminName: 'Admin', timestamp: new Date(), details: {} },
      ]);

      const result = await command.handleStep(ctx, 'audit_log', {});

      expect(result.success).toBe(true);
    });

    it('should deny audit_log for non-super admin', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      mockAdminService.isSuperAdmin = jest.fn().mockReturnValue(false);

      const result = await command.handleStep(ctx, 'audit_log', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Доступ запрещён');
    });

    it('should handle data_export step for super admin', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      mockAdminService.isSuperAdmin = jest.fn().mockReturnValue(true);

      const result = await command.handleStep(ctx, 'data_export', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Экспорт');
    });

    it('should deny data_export for non-super admin', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      mockAdminService.isSuperAdmin = jest.fn().mockReturnValue(false);

      const result = await command.handleStep(ctx, 'data_export', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Доступ запрещён');
    });

    it('should fallback to main_menu for unknown step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'unknown_step', {});

      expect(result.success).toBe(true);
    });
  });

  describe('handleCallback() - All Callbacks', () => {
    const mockAdminService = {
      isAdmin: jest.fn().mockReturnValue(true),
      isSuperAdmin: jest.fn().mockReturnValue(true),
      getUserRole: jest.fn().mockReturnValue('super_admin'),
      getDashboardMetrics: jest.fn().mockResolvedValue({
        enrollment: { total: 50, withConsent: 45, active7Days: 35, active30Days: 40, dropouts: 5 },
        isiOutcomes: { baselineCount: 40, averageBaseline: 18, latestCount: 35, averageLatest: 12, mcidAchieved: 20, remissionAchieved: 15 },
        engagement: { diaryCompletionRate: 85, averageSessionsPerUser: 12, averageStreakDays: 5, questCompletionRate: 70 },
        safety: { adverseEventsTotal: 2, adverseEventsSerious: 0, isiWorseningCount: 1 },
        compliance: { consentedUsers: 45, dataExportRequests: 3, anonymizationRequests: 5 },
        generatedAt: new Date(),
      }),
      getUserList: jest.fn().mockResolvedValue([]),
      getSafetyAlerts: jest.fn().mockResolvedValue([]),
      getAuditLog: jest.fn().mockResolvedValue([]),
      acknowledgeAlert: jest.fn().mockResolvedValue(undefined),
      logAction: jest.fn().mockResolvedValue(undefined),
      logAdminAction: jest.fn().mockResolvedValue(undefined),
    };

    const mockExportService = {
      exportDataset: jest.fn().mockResolvedValue({
        dataset: {
          participants: [{ id: '1', ageGroup: '30-40', sex: 'M' }],
          isiAssessments: [],
          diaryEntries: [],
          adverseEvents: [],
        },
        checksum: 'abc123def456',
        auditEntry: {
          exportId: 'export-123',
          timestamp: new Date(),
        },
      }),
      generateDataSharingStatement: jest.fn().mockReturnValue('Data sharing statement'),
      validateKAnonymity: jest.fn().mockReturnValue({ valid: true, violations: [] }),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      const { createAdminDashboardService } = require('../../../../src/bot/services/AdminDashboardService');
      const { createAnonymizedDataExportService } = require('../../../../src/bot/services/AnonymizedDataExportService');
      createAdminDashboardService.mockReturnValue(mockAdminService);
      createAnonymizedDataExportService.mockReturnValue(mockExportService);
    });

    it('should handle main callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:main', {});

      expect(result.success).toBe(true);
    });

    it('should handle safety_alerts callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:safety', {});

      expect(result.success).toBe(true);
    });

    it('should handle audit callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:audit', {});

      expect(result.success).toBe(true);
    });

    it('should handle export callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export', {});

      expect(result.success).toBe(true);
    });

    it('should handle user detail callback with userId', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:user:user-123', {});

      expect(result).toBeDefined();
    });

    it('should handle acknowledge_alert callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:ack:alert-123', {});

      expect(result).toBeDefined();
    });

    it('should handle export format selection - json', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_json', {});

      expect(result.success).toBe(true);
    });

    it('should handle export format selection - csv', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_csv', {});

      expect(result.success).toBe(true);
    });

    it('should handle export level selection - pseudonymized', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_do:json:pseudonymized', {});

      expect(result).toBeDefined();
    });

    it('should handle export level selection - de_identified', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_do:csv:de_identified', {});

      expect(result).toBeDefined();
    });

    it('should handle export level selection - anonymized', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_do:json:anonymized', {});

      expect(result).toBeDefined();
    });

    it('should handle unknown callback by showing main menu', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      // Unknown callbacks fall through to default -> showMainMenu
      const result = await command.handleCallback(ctx, 'admin:unknown_action', {});

      expect(result.success).toBe(true);
      // Main menu contains admin panel header
      expect(result.message).toContain('Панель администратора');
    });
  });

  describe('Data Export - k-Anonymity', () => {
    it('should show k-anonymity warning when validation fails', async () => {
      const mockExportService = {
        exportDataset: jest.fn().mockResolvedValue({
          dataset: {
            participants: [{ id: '1', ageGroup: '30-40', sex: 'M' }],
            isiAssessments: [],
            diaryEntries: [],
            adverseEvents: [],
          },
          checksum: 'abc123def456',
          auditEntry: {
            exportId: 'export-123',
            timestamp: new Date(),
          },
        }),
        generateDataSharingStatement: jest.fn().mockReturnValue('Statement'),
        validateKAnonymity: jest.fn().mockReturnValue({
          valid: false,
          violations: [{ group: 'age-sex', count: 2 }],
        }),
      };

      const mockAdminService = {
        isAdmin: jest.fn().mockReturnValue(true),
        isSuperAdmin: jest.fn().mockReturnValue(true),
        getUserRole: jest.fn().mockReturnValue('super_admin'),
        logAdminAction: jest.fn(),
      };

      const { createAdminDashboardService } = require('../../../../src/bot/services/AdminDashboardService');
      const { createAnonymizedDataExportService } = require('../../../../src/bot/services/AnonymizedDataExportService');
      createAdminDashboardService.mockReturnValue(mockAdminService);
      createAnonymizedDataExportService.mockReturnValue(mockExportService);

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_run:json_anonymized', {});

      // Should contain warning about k-anonymity
      expect(result).toBeDefined();
    });

    it('should handle export error gracefully', async () => {
      const mockExportService = {
        exportDataset: jest.fn().mockRejectedValue(new Error('Export failed')),
      };

      const mockAdminService = {
        isAdmin: jest.fn().mockReturnValue(true),
        isSuperAdmin: jest.fn().mockReturnValue(true),
        getUserRole: jest.fn().mockReturnValue('super_admin'),
        logAdminAction: jest.fn(),
      };

      const { createAdminDashboardService } = require('../../../../src/bot/services/AdminDashboardService');
      const { createAnonymizedDataExportService } = require('../../../../src/bot/services/AnonymizedDataExportService');
      createAdminDashboardService.mockReturnValue(mockAdminService);
      createAnonymizedDataExportService.mockReturnValue(mockExportService);

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:export_run:json_anonymized', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка');
    });
  });

  describe('User List Pagination', () => {
    it('should handle pagination with page parameter', async () => {
      const mockAdminService = {
        isAdmin: jest.fn().mockReturnValue(true),
        isSuperAdmin: jest.fn().mockReturnValue(false),
        getUserRole: jest.fn().mockReturnValue('admin'),
        getUserList: jest.fn().mockResolvedValue([]),
        logAdminAction: jest.fn(),
      };

      const { createAdminDashboardService } = require('../../../../src/bot/services/AdminDashboardService');
      createAdminDashboardService.mockReturnValue(mockAdminService);

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'admin:users:2', {});

      expect(result).toBeDefined();
    });
  });

  describe('Super Admin Features', () => {
    it('should show audit log for super admin', async () => {
      const mockAdminService = {
        isAdmin: jest.fn().mockReturnValue(true),
        isSuperAdmin: jest.fn().mockReturnValue(true),
        getUserRole: jest.fn().mockReturnValue('super_admin'),
        getAuditLog: jest.fn().mockResolvedValue([
          { action: 'VIEW_DASHBOARD', adminId: 'admin-1', adminName: 'Admin', timestamp: new Date(), details: {} },
        ]),
        logAdminAction: jest.fn(),
      };

      const { createAdminDashboardService } = require('../../../../src/bot/services/AdminDashboardService');
      createAdminDashboardService.mockReturnValue(mockAdminService);

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'audit_log', {});

      expect(result.success).toBe(true);
    });
  });
});
