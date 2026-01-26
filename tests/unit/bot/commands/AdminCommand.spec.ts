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
});
