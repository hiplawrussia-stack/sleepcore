/**
 * AdminCommand Tests - Administrative Control Module
 * ===================================================
 *
 * IEC 62304 Class B - Administrative oversight
 * ICH E6(R3): Centralized monitoring
 * 21 CFR Part 11: Audit trail for admin actions
 * HIPAA: Minimum necessary access (role-based)
 *
 * Tests verify:
 * - Authorization checks (admin vs non-admin)
 * - Super-admin only features (audit log, data export)
 * - Dashboard metrics display
 * - User list and detail views
 * - Safety alerts display
 * - Audit logging for all actions
 *
 * CRITICAL: Admin access controls must be enforced.
 *
 * @packageDocumentation
 */

import { AdminCommand, adminCommand } from '../AdminCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    error: (text: string) => `❌ ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    success: (text: string) => `✅ ${text}`,
    progressBar: (percent: number, total: number) => `[${percent}%]`,
    formatTime: (date: Date) => date.toLocaleTimeString('ru-RU'),
    formatDate: (date: Date) => date.toLocaleDateString('ru-RU'),
    formatShortDate: (date: Date) => date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
  },
}));

// Mock AdminDashboardService
const mockIsAdmin = jest.fn();
const mockIsSuperAdmin = jest.fn();
const mockGetUserRole = jest.fn();
const mockLogAdminAction = jest.fn();
const mockGetDashboardMetrics = jest.fn();
const mockGetUserList = jest.fn();
const mockGetUserDetail = jest.fn();
const mockGetAuditLog = jest.fn();

jest.mock('../../services/AdminDashboardService', () => ({
  createAdminDashboardService: jest.fn(() => ({
    isAdmin: mockIsAdmin,
    isSuperAdmin: mockIsSuperAdmin,
    getUserRole: mockGetUserRole,
    logAdminAction: mockLogAdminAction,
    getDashboardMetrics: mockGetDashboardMetrics,
    getUserList: mockGetUserList,
    getUserDetail: mockGetUserDetail,
    getAuditLog: mockGetAuditLog,
  })),
}));

// Mock AnonymizedDataExportService
const mockExportDataset = jest.fn();
const mockGenerateDataSharingStatement = jest.fn();
const mockValidateKAnonymity = jest.fn();

jest.mock('../../services/AnonymizedDataExportService', () => ({
  createAnonymizedDataExportService: jest.fn(() => ({
    exportDataset: mockExportDataset,
    generateDataSharingStatement: mockGenerateDataSharingStatement,
    validateKAnonymity: mockValidateKAnonymity,
  })),
  DEFAULT_EXPORT_CONFIG: {
    format: 'csv',
    level: 'de_identified',
    kAnonymity: 5,
  },
}));

describe('AdminCommand', () => {
  let command: AdminCommand;
  let mockContext: ISleepCoreContext;
  let mockDb: object;

  beforeEach(() => {
    command = new AdminCommand();

    // Reset mocks
    mockIsAdmin.mockReset();
    mockIsSuperAdmin.mockReset();
    mockGetUserRole.mockReset();
    mockLogAdminAction.mockReset();
    mockGetDashboardMetrics.mockReset();
    mockGetUserList.mockReset();
    mockGetUserDetail.mockReset();
    mockGetAuditLog.mockReset();
    mockExportDataset.mockReset();
    mockGenerateDataSharingStatement.mockReset();
    mockValidateKAnonymity.mockReset();

    // Default: not admin
    mockIsAdmin.mockReturnValue(false);
    mockIsSuperAdmin.mockReturnValue(false);
    mockGetUserRole.mockReturnValue('user');

    // Mock database
    mockDb = {};

    // Create mock context
    mockContext = {
      userId: 'admin123',
      chatId: 456789,
      displayName: 'Admin User',
      languageCode: 'ru',
      sleepCore: {
        db: mockDb,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('admin');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('администратор');
    });

    it('should have monitoring aliases', () => {
      expect(command.aliases).toContain('dashboard');
      expect(command.aliases).toContain('monitor');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all admin steps defined', () => {
      expect(command.steps).toContain('main_menu');
      expect(command.steps).toContain('dashboard');
      expect(command.steps).toContain('user_list');
      expect(command.steps).toContain('safety_alerts');
      expect(command.steps).toContain('audit_log');
      expect(command.steps).toContain('data_export');
    });
  });

  // ==========================================================================
  // AUTHORIZATION
  // ==========================================================================
  describe('Authorization', () => {
    it('should deny access to non-admin users', async () => {
      mockIsAdmin.mockReturnValue(false);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Доступ запрещён');
    });

    it('should allow access to admin users', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockGetUserRole.mockReturnValue('admin');

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Панель администратора');
    });

    it('should log access attempt for non-admin', async () => {
      mockIsAdmin.mockReturnValue(false);

      await command.execute(mockContext);

      // The warning log is in the implementation - we test authorization was checked
      expect(mockIsAdmin).toHaveBeenCalledWith('admin123');
    });

    it('should log admin action on successful access', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockGetUserRole.mockReturnValue('admin');

      await command.execute(mockContext);

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_DASHBOARD'
      );
    });

    it('should re-check authorization on callbacks', async () => {
      mockIsAdmin.mockReturnValue(false);

      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('истекла');
    });
  });

  // ==========================================================================
  // MAIN MENU
  // ==========================================================================
  describe('Main Menu', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetUserRole.mockReturnValue('admin');
    });

    it('should show admin role', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Admin User');
      expect(result.message).toContain('Администратор');
    });

    it('should show super-admin role for super admins', async () => {
      mockGetUserRole.mockReturnValue('super_admin');
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Супер-администратор');
    });

    it('should show basic navigation buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'admin:dashboard')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'admin:users')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'admin:safety')).toBeDefined();
    });

    it('should show audit log button for super admin', async () => {
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'admin:audit')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'admin:export')).toBeDefined();
    });

    it('should NOT show audit log button for regular admin', async () => {
      mockIsSuperAdmin.mockReturnValue(false);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'admin:audit')).toBeUndefined();
      expect(buttons.find(b => b.callbackData === 'admin:export')).toBeUndefined();
    });
  });

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  describe('Dashboard', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetDashboardMetrics.mockResolvedValue({
        enrollment: {
          total: 50,
          withConsent: 45,
          active7Days: 30,
          active30Days: 40,
          dropouts: 5,
        },
        isiOutcomes: {
          baselineCount: 45,
          averageBaseline: 18.5,
          latestCount: 40,
          averageLatest: 12.3,
          mcidAchieved: 25,
          remissionAchieved: 15,
        },
        engagement: {
          diaryCompletionRate: 75,
          averageSessionsPerUser: 4.2,
          averageStreakDays: 8,
          questCompletionRate: 60,
        },
        safety: {
          adverseEventsTotal: 3,
          adverseEventsSerious: 0,
          isiWorseningCount: 2,
        },
        compliance: {
          consentedUsers: 45,
          dataExportRequests: 2,
          anonymizationRequests: 1,
        },
        generatedAt: new Date(),
      });
    });

    it('should show dashboard metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Дашборд');
    });

    it('should show enrollment stats', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(result.message).toContain('Набор участников');
      expect(result.message).toContain('50');
      expect(result.message).toContain('45');
    });

    it('should show ISI outcomes', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(result.message).toContain('ISI');
      expect(result.message).toContain('Baseline');
      expect(result.message).toContain('MCID');
    });

    it('should show safety summary', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(result.message).toContain('Безопасность');
      expect(result.message).toContain('AE');
    });

    it('should log dashboard view action', async () => {
      await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_DASHBOARD'
      );
    });

    it('should handle dashboard error gracefully', async () => {
      mockGetDashboardMetrics.mockRejectedValue(new Error('DB error'));

      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка');
    });

    it('should have refresh and navigation buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:dashboard',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'admin:refresh')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'admin:main')).toBeDefined();
    });
  });

  // ==========================================================================
  // USER LIST
  // ==========================================================================
  describe('User List', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetUserList.mockResolvedValue([
        {
          id: 1,
          displayName: 'User One',
          status: 'active',
          currentWeek: 3,
          latestISI: 14,
          isiChange: 4,
          baselineISI: 18,
        },
        {
          id: 2,
          displayName: 'User Two',
          status: 'inactive',
          currentWeek: 5,
          latestISI: 10,
          isiChange: 8,
          baselineISI: 18,
        },
      ]);
    });

    it('should show user list', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:users',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Участники');
      expect(result.message).toContain('User One');
      expect(result.message).toContain('User Two');
    });

    it('should show user status icons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:users',
        {}
      );

      expect(result.message).toContain('🟢'); // active
      expect(result.message).toContain('🟡'); // inactive
    });

    it('should show ISI changes', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:users',
        {}
      );

      expect(result.message).toContain('ISI');
    });

    it('should show empty message when no users', async () => {
      mockGetUserList.mockResolvedValue([]);

      const result = await command.handleCallback(
        mockContext,
        'admin:users',
        {}
      );

      expect(result.message).toContain('Участников пока нет');
    });

    it('should log user list view action', async () => {
      await command.handleCallback(
        mockContext,
        'admin:users',
        {}
      );

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_USER_LIST'
      );
    });

    it('should have pagination buttons when more users exist', async () => {
      // Return 10 users (full page)
      mockGetUserList.mockResolvedValue(
        Array(10).fill(null).map((_, i) => ({
          id: i + 1,
          displayName: `User ${i + 1}`,
          status: 'active',
          currentWeek: 1,
          latestISI: 15,
          isiChange: 0,
        }))
      );

      const result = await command.handleCallback(
        mockContext,
        'admin:users',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('users_page'))).toBeDefined();
    });
  });

  // ==========================================================================
  // USER DETAIL
  // ==========================================================================
  describe('User Detail', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetUserDetail.mockResolvedValue({
        user: {
          id: 1,
          externalId: 'ext-12345678',
          displayName: 'Test User',
          status: 'active',
          currentWeek: 4,
          consentGiven: true,
          lastActivityAt: new Date(),
          baselineISI: 18,
          latestISI: 12,
          isiChange: 6,
          diaryCount: 28,
          sessionCount: 4,
          enrollmentDate: new Date('2026-01-01'),
        },
        isiHistory: [
          { week: 1, score: 18, date: new Date('2026-01-01') },
          { week: 2, score: 16, date: new Date('2026-01-08') },
          { week: 3, score: 14, date: new Date('2026-01-15') },
          { week: 4, score: 12, date: new Date('2026-01-22') },
        ],
      });
    });

    it('should show user detail', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:user:1',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Карточка участника');
      expect(result.message).toContain('Test User');
    });

    it('should show ISI history', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:user:1',
        {}
      );

      expect(result.message).toContain('ISI История');
      expect(result.message).toContain('Baseline');
    });

    it('should show consent status', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:user:1',
        {}
      );

      expect(result.message).toContain('Согласие');
      expect(result.message).toContain('✅');
    });

    it('should show activity metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:user:1',
        {}
      );

      expect(result.message).toContain('Записей дневника');
      expect(result.message).toContain('28');
    });

    it('should log user detail view action', async () => {
      await command.handleCallback(
        mockContext,
        'admin:user:1',
        {}
      );

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_USER_DETAIL',
        1
      );
    });

    it('should show warning for ISI worsening', async () => {
      mockGetUserDetail.mockResolvedValue({
        user: {
          id: 1,
          externalId: 'ext-12345678',
          displayName: 'Worsening User',
          status: 'active',
          currentWeek: 4,
          consentGiven: true,
          baselineISI: 15,
          latestISI: 22,
          isiChange: -7,
          diaryCount: 10,
          sessionCount: 2,
          enrollmentDate: new Date(),
        },
        isiHistory: [],
      });

      const result = await command.handleCallback(
        mockContext,
        'admin:user:1',
        {}
      );

      expect(result.message).toContain('ВНИМАНИЕ');
      expect(result.message).toContain('ухудшение');
    });

    it('should handle user not found', async () => {
      mockGetUserDetail.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'admin:user:999',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('не найден');
    });
  });

  // ==========================================================================
  // SAFETY ALERTS
  // ==========================================================================
  describe('Safety Alerts', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetDashboardMetrics.mockResolvedValue({
        enrollment: { total: 50 },
        isiOutcomes: {},
        engagement: {},
        safety: {
          adverseEventsTotal: 3,
          adverseEventsSerious: 1,
          isiWorseningCount: 2,
        },
        compliance: {},
        generatedAt: new Date(),
      });
      mockGetUserList.mockResolvedValue([]);
    });

    it('should show safety alerts', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:safety',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Оповещения безопасности');
    });

    it('should show AE statistics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:safety',
        {}
      );

      expect(result.message).toContain('AE');
      expect(result.message).toContain('SAE');
    });

    it('should show ISI worsening users', async () => {
      mockGetUserList.mockResolvedValue([
        {
          id: 1,
          displayName: 'Worsening User',
          status: 'active',
          isiChange: -8,
          baselineISI: 14,
          latestISI: 22,
        },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'admin:safety',
        {}
      );

      expect(result.message).toContain('ISI Ухудшение');
      expect(result.message).toContain('Worsening User');
    });

    it('should show inactive users', async () => {
      mockGetUserList.mockResolvedValue([
        {
          id: 2,
          displayName: 'Inactive User',
          status: 'inactive',
          isiChange: 0,
          lastActivityAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'admin:safety',
        {}
      );

      expect(result.message).toContain('Неактивные');
      expect(result.message).toContain('Inactive User');
    });

    it('should show success when no alerts', async () => {
      mockGetDashboardMetrics.mockResolvedValue({
        safety: {
          adverseEventsTotal: 0,
          adverseEventsSerious: 0,
          isiWorseningCount: 0,
        },
        generatedAt: new Date(),
      });
      mockGetUserList.mockResolvedValue([
        { id: 1, status: 'active', isiChange: 5 },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'admin:safety',
        {}
      );

      expect(result.message).toContain('Активных оповещений нет');
    });

    it('should log safety view action', async () => {
      await command.handleCallback(
        mockContext,
        'admin:safety',
        {}
      );

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_ADVERSE_EVENTS'
      );
    });
  });

  // ==========================================================================
  // AUDIT LOG (SUPER ADMIN ONLY)
  // ==========================================================================
  describe('Audit Log', () => {
    it('should deny access to regular admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(false);

      const result = await command.handleCallback(
        mockContext,
        'admin:audit',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('супер-администратор');
    });

    it('should show audit log to super admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);
      mockGetAuditLog.mockReturnValue([
        {
          timestamp: new Date(),
          adminId: 'admin123',
          adminName: 'Admin User',
          action: 'VIEW_DASHBOARD',
        },
        {
          timestamp: new Date(),
          adminId: 'admin123',
          adminName: 'Admin User',
          action: 'VIEW_USER_DETAIL',
          targetUserId: 1,
        },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'admin:audit',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Журнал аудита');
      expect(result.message).toContain('21 CFR Part 11');
    });

    it('should show audit entries', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);
      mockGetAuditLog.mockReturnValue([
        {
          timestamp: new Date(),
          adminId: 'admin123',
          adminName: 'Admin User',
          action: 'VIEW_DASHBOARD',
        },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'admin:audit',
        {}
      );

      expect(result.message).toContain('VIEW_DASHBOARD');
    });

    it('should show empty log message', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);
      mockGetAuditLog.mockReturnValue([]);

      const result = await command.handleCallback(
        mockContext,
        'admin:audit',
        {}
      );

      expect(result.message).toContain('Журнал пуст');
    });

    it('should log audit log view action', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);
      mockGetAuditLog.mockReturnValue([]);

      await command.handleCallback(
        mockContext,
        'admin:audit',
        {}
      );

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_AUDIT_LOG'
      );
    });
  });

  // ==========================================================================
  // DATA EXPORT (SUPER ADMIN ONLY)
  // ==========================================================================
  describe('Data Export', () => {
    it('should deny access to regular admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(false);

      const result = await command.handleCallback(
        mockContext,
        'admin:export',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('супер-администратор');
    });

    it('should show export menu to super admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await command.handleCallback(
        mockContext,
        'admin:export',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Экспорт');
      expect(result.message).toContain('анонимизированных');
    });

    it('should show anonymization levels', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await command.handleCallback(
        mockContext,
        'admin:export',
        {}
      );

      expect(result.message).toContain('Псевдонимизация');
      expect(result.message).toContain('Де-идентификация');
      expect(result.message).toContain('Анонимизация');
    });

    it('should show export format options', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await command.handleCallback(
        mockContext,
        'admin:export',
        {}
      );

      expect(result.message).toContain('CSV');
      expect(result.message).toContain('JSON');
    });

    it('should have export buttons', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await command.handleCallback(
        mockContext,
        'admin:export',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('export_run'))).toBeDefined();
    });

    it('should log export view action', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockIsSuperAdmin.mockReturnValue(true);

      await command.handleCallback(
        mockContext,
        'admin:export',
        {}
      );

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'VIEW_DATA_EXPORT'
      );
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetDashboardMetrics.mockResolvedValue({
        enrollment: {},
        isiOutcomes: {},
        engagement: {},
        safety: {},
        compliance: {},
        generatedAt: new Date(),
      });
      mockGetUserList.mockResolvedValue([]);
    });

    it('should handle main callback', async () => {
      mockGetUserRole.mockReturnValue('admin');

      const result = await command.handleCallback(
        mockContext,
        'admin:main',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Панель администратора');
    });

    it('should handle refresh callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'admin:refresh',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Дашборд');
    });

    it('should handle unknown callback as main menu', async () => {
      mockGetUserRole.mockReturnValue('admin');

      const result = await command.handleCallback(
        mockContext,
        'admin:unknown_action',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Панель администратора');
    });
  });

  // ==========================================================================
  // STEP HANDLING
  // ==========================================================================
  describe('Step Handling', () => {
    beforeEach(() => {
      mockIsAdmin.mockReturnValue(true);
      mockGetUserRole.mockReturnValue('admin');
    });

    it('should handle main_menu step', async () => {
      const result = await command.handleStep(mockContext, 'main_menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Панель администратора');
    });

    it('should handle unknown step as main menu', async () => {
      const result = await command.handleStep(mockContext, 'unknown_step', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Панель администратора');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(adminCommand).toBeInstanceOf(AdminCommand);
    });

    it('should have correct name', () => {
      expect(adminCommand.name).toBe('admin');
    });
  });
});
