/**
 * Admin Dashboard Service
 * =======================
 * Centralized monitoring for clinical pilot study.
 *
 * Research basis (2025-2026):
 * - ICH E6(R3): Centralized monitoring as sole approach permitted
 * - 21 CFR Part 11: Audit trail requirements (time-stamped, who/what/when)
 * - HIPAA Minimum Necessary: Role-based access controls
 * - ACRO 2025 Survey: 96% trials include RBQM component
 *
 * Features:
 * - Study enrollment metrics
 * - ISI outcome tracking
 * - Engagement & retention KPIs
 * - Adverse event monitoring
 * - Audit trail access
 * - GDPR/152-FZ compliance metrics
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import type { IDatabaseConnection } from '../../infrastructure/database/interfaces/IDatabaseConnection';
import { AdverseEventService, createAdverseEventService } from './AdverseEventService';
import type { ISafetyAlert } from './AdverseEventService';

// ==================== Types ====================

/**
 * User role for RBAC
 * Based on ImproWise RBACS pattern (System/Study/CRF levels)
 */
export type UserRole = 'user' | 'clinician' | 'admin' | 'super_admin';

/**
 * Admin action types for audit logging
 */
export type AdminAction =
  | 'VIEW_DASHBOARD'
  | 'VIEW_USER_LIST'
  | 'VIEW_USER_DETAIL'
  | 'VIEW_ASSESSMENTS'
  | 'VIEW_ADVERSE_EVENTS'
  | 'EXPORT_DATA'
  | 'VIEW_DATA_EXPORT'
  | 'VIEW_AUDIT_LOG';

/**
 * Dashboard metrics summary
 */
export interface IDashboardMetrics {
  /** Enrollment metrics */
  enrollment: {
    total: number;
    withConsent: number;
    active7Days: number;
    active30Days: number;
    dropouts: number;
  };
  /** ISI outcome metrics */
  isiOutcomes: {
    baselineCount: number;
    averageBaseline: number;
    latestCount: number;
    averageLatest: number;
    mcidAchieved: number; // ≥7 point reduction
    remissionAchieved: number; // ISI < 8
  };
  /** Engagement metrics */
  engagement: {
    diaryCompletionRate: number;
    averageSessionsPerUser: number;
    averageStreakDays: number;
    questCompletionRate: number;
  };
  /** Safety metrics */
  safety: {
    adverseEventsTotal: number;
    adverseEventsSerious: number;
    isiWorseningCount: number; // ≥7 point increase
  };
  /** Compliance metrics */
  compliance: {
    consentedUsers: number;
    dataExportRequests: number;
    anonymizationRequests: number;
  };
  /** Timestamp */
  generatedAt: Date;
}

/**
 * User summary for admin view
 */
export interface IUserSummary {
  id: number;
  externalId: string;
  displayName: string;
  enrollmentDate: Date;
  lastActivityAt: Date | null;
  consentGiven: boolean;
  currentWeek: number;
  baselineISI: number | null;
  latestISI: number | null;
  isiChange: number | null;
  diaryCount: number;
  sessionCount: number;
  status: 'active' | 'inactive' | 'dropped' | 'completed';
}

/**
 * Admin audit log entry
 */
export interface IAdminAuditEntry {
  timestamp: Date;
  adminId: string;
  adminName: string;
  action: AdminAction;
  targetUserId?: number;
  details?: string;
  ipAddress?: string;
}

// ==================== Configuration ====================

/**
 * Admin configuration from environment
 * ADMIN_USER_IDS: Comma-separated list of Telegram user IDs with admin access
 * SUPER_ADMIN_IDS: Comma-separated list of super admin IDs (can view audit logs)
 */
const getAdminConfig = () => {
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()) || [];
  const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',').map((id) => id.trim()) || [];

  return {
    adminIds,
    superAdminIds,
    /** Days of inactivity to consider user inactive */
    inactiveDaysThreshold: 7,
    /** Days of inactivity to consider user dropped */
    dropoutDaysThreshold: 21,
    /** ISI MCID threshold (within-person) */
    mcidThreshold: 7,
    /** ISI remission threshold */
    remissionThreshold: 8,
    /** ISI worsening threshold (safety alert) */
    worseningThreshold: 7,
  };
};

// ==================== Admin Dashboard Service ====================

/**
 * Admin Dashboard Service
 * Provides centralized monitoring capabilities for clinical pilot study
 */
export class AdminDashboardService {
  private db: IDatabaseConnection;
  private auditLog: IAdminAuditEntry[] = [];
  private config = getAdminConfig();
  private aeService: AdverseEventService;

  constructor(db: IDatabaseConnection) {
    this.db = db;
    this.aeService = createAdverseEventService(db);
  }

  /**
   * Get adverse event service instance
   */
  getAEService(): AdverseEventService {
    return this.aeService;
  }

  // ==================== Authorization ====================

  /**
   * Check if user has admin role
   * Uses environment-based config for security (HIPAA minimum necessary)
   */
  isAdmin(userId: string): boolean {
    return (
      this.config.adminIds.includes(userId) || this.config.superAdminIds.includes(userId)
    );
  }

  /**
   * Check if user has super admin role
   */
  isSuperAdmin(userId: string): boolean {
    return this.config.superAdminIds.includes(userId);
  }

  /**
   * Get user role
   */
  getUserRole(userId: string): UserRole {
    if (this.config.superAdminIds.includes(userId)) return 'super_admin';
    if (this.config.adminIds.includes(userId)) return 'admin';
    return 'user';
  }

  // ==================== Audit Logging ====================

  /**
   * Log admin action (21 CFR Part 11 compliance)
   * Secure, computer-generated, time-stamped audit trail
   */
  logAdminAction(
    adminId: string,
    adminName: string,
    action: AdminAction,
    targetUserId?: number,
    details?: string
  ): void {
    const entry: IAdminAuditEntry = {
      timestamp: new Date(),
      adminId,
      adminName,
      action,
      targetUserId,
      details,
    };

    this.auditLog.push(entry);

    // Also log to console for persistent storage
    console.log(
      `[Admin Audit] ${entry.timestamp.toISOString()} | ${adminId} (${adminName}) | ${action}` +
        (targetUserId ? ` | User: ${targetUserId}` : '') +
        (details ? ` | ${details}` : '')
    );
  }

  /**
   * Get audit log (super admin only)
   */
  getAuditLog(limit: number = 100): IAdminAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  // ==================== Dashboard Metrics ====================

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<IDashboardMetrics> {
    const [enrollment, isiOutcomes, engagement, safety, compliance] = await Promise.all([
      this.getEnrollmentMetrics(),
      this.getISIOutcomeMetrics(),
      this.getEngagementMetrics(),
      this.getSafetyMetrics(),
      this.getComplianceMetrics(),
    ]);

    return {
      enrollment,
      isiOutcomes,
      engagement,
      safety,
      compliance,
      generatedAt: new Date(),
    };
  }

  /**
   * Get enrollment metrics
   */
  private async getEnrollmentMetrics(): Promise<IDashboardMetrics['enrollment']> {
    const total = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`
    );

    const withConsent = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE consent_given = 1 AND deleted_at IS NULL`
    );

    const active7Days = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users
       WHERE deleted_at IS NULL
       AND last_activity_at >= datetime('now', '-7 days')`
    );

    const active30Days = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users
       WHERE deleted_at IS NULL
       AND last_activity_at >= datetime('now', '-30 days')`
    );

    const dropouts = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users
       WHERE deleted_at IS NULL
       AND consent_given = 1
       AND last_activity_at < datetime('now', '-${this.config.dropoutDaysThreshold} days')`
    );

    return {
      total: total?.count || 0,
      withConsent: withConsent?.count || 0,
      active7Days: active7Days?.count || 0,
      active30Days: active30Days?.count || 0,
      dropouts: dropouts?.count || 0,
    };
  }

  /**
   * Get ISI outcome metrics
   */
  private async getISIOutcomeMetrics(): Promise<IDashboardMetrics['isiOutcomes']> {
    // Baseline ISI (first assessment per user)
    const baselineStats = await this.db.queryOne<{ count: number; avg: number }>(
      `SELECT COUNT(*) as count, AVG(score) as avg FROM (
        SELECT user_id, MIN(created_at) as first_date, score
        FROM assessments
        WHERE type = 'ISI' AND deleted_at IS NULL
        GROUP BY user_id
      )`
    );

    // Latest ISI (most recent per user)
    const latestStats = await this.db.queryOne<{ count: number; avg: number }>(
      `SELECT COUNT(*) as count, AVG(score) as avg FROM (
        SELECT user_id, MAX(created_at) as last_date, score
        FROM assessments
        WHERE type = 'ISI' AND deleted_at IS NULL
        GROUP BY user_id
        HAVING COUNT(*) > 1
      )`
    );

    // MCID achieved (≥7 point reduction from baseline)
    const mcidAchieved = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM (
        SELECT
          baseline.user_id,
          baseline.score as baseline_score,
          latest.score as latest_score,
          (baseline.score - latest.score) as improvement
        FROM (
          SELECT user_id, score, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
          FROM assessments WHERE type = 'ISI' AND deleted_at IS NULL
        ) baseline
        JOIN (
          SELECT user_id, score, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
          FROM assessments WHERE type = 'ISI' AND deleted_at IS NULL
        ) latest ON baseline.user_id = latest.user_id
        WHERE baseline.rn = 1 AND latest.rn = 1
        AND (baseline.score - latest.score) >= ${this.config.mcidThreshold}
      )`
    );

    // Remission achieved (latest ISI < 8)
    const remissionAchieved = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM (
        SELECT user_id, score
        FROM assessments a1
        WHERE type = 'ISI' AND deleted_at IS NULL
        AND created_at = (
          SELECT MAX(created_at) FROM assessments a2
          WHERE a2.user_id = a1.user_id AND a2.type = 'ISI' AND a2.deleted_at IS NULL
        )
        AND score < ${this.config.remissionThreshold}
      )`
    );

    return {
      baselineCount: baselineStats?.count || 0,
      averageBaseline: Math.round((baselineStats?.avg || 0) * 10) / 10,
      latestCount: latestStats?.count || 0,
      averageLatest: Math.round((latestStats?.avg || 0) * 10) / 10,
      mcidAchieved: mcidAchieved?.count || 0,
      remissionAchieved: remissionAchieved?.count || 0,
    };
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(): Promise<IDashboardMetrics['engagement']> {
    // Diary completion rate (users with ≥5 diaries / total consented users)
    const diaryStats = await this.db.queryOne<{ total_diaries: number; users_with_diaries: number }>(
      `SELECT
        COUNT(*) as total_diaries,
        COUNT(DISTINCT user_id) as users_with_diaries
       FROM sleep_diary_entries WHERE deleted_at IS NULL`
    );

    const totalConsented = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE consent_given = 1 AND deleted_at IS NULL`
    );

    const diaryCompletionRate =
      totalConsented?.count && totalConsented.count > 0
        ? Math.round(((diaryStats?.users_with_diaries || 0) / totalConsented.count) * 100)
        : 0;

    // Average sessions per user
    const sessionStats = await this.db.queryOne<{ avg: number }>(
      `SELECT AVG(session_count) as avg FROM (
        SELECT user_id, COUNT(*) as session_count
        FROM therapy_sessions WHERE deleted_at IS NULL
        GROUP BY user_id
      )`
    );

    // Average streak (from gamification)
    const streakStats = await this.db.queryOne<{ avg: number }>(
      `SELECT AVG(daily_streak) as avg FROM gamification_state WHERE deleted_at IS NULL`
    );

    // Quest completion rate
    const questStats = await this.db.queryOne<{ completed: number; total: number }>(
      `SELECT
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COUNT(*) as total
       FROM quest_progress WHERE deleted_at IS NULL`
    );

    const questCompletionRate =
      questStats?.total && questStats.total > 0
        ? Math.round((questStats.completed / questStats.total) * 100)
        : 0;

    return {
      diaryCompletionRate,
      averageSessionsPerUser: Math.round((sessionStats?.avg || 0) * 10) / 10,
      averageStreakDays: Math.round((streakStats?.avg || 0) * 10) / 10,
      questCompletionRate,
    };
  }

  /**
   * Get safety metrics
   */
  private async getSafetyMetrics(): Promise<IDashboardMetrics['safety']> {
    // Get AE statistics from the service
    const aeStats = this.aeService.getStatistics();

    // ISI worsening (≥7 point increase from baseline)
    const isiWorsening = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM (
        SELECT
          baseline.user_id,
          (latest.score - baseline.score) as worsening
        FROM (
          SELECT user_id, score, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
          FROM assessments WHERE type = 'ISI' AND deleted_at IS NULL
        ) baseline
        JOIN (
          SELECT user_id, score, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
          FROM assessments WHERE type = 'ISI' AND deleted_at IS NULL
        ) latest ON baseline.user_id = latest.user_id
        WHERE baseline.rn = 1 AND latest.rn = 1
        AND (latest.score - baseline.score) >= ${this.config.worseningThreshold}
      )`
    );

    return {
      adverseEventsTotal: aeStats.total,
      adverseEventsSerious: aeStats.serious,
      isiWorseningCount: isiWorsening?.count || 0,
    };
  }

  /**
   * Get safety alerts for admin view
   */
  getSafetyAlerts(): ISafetyAlert[] {
    return this.aeService.getUnacknowledgedAlerts();
  }

  /**
   * Get all safety alerts (including acknowledged)
   */
  getAllSafetyAlerts(limit: number = 100): ISafetyAlert[] {
    return this.aeService.getAllAlerts(limit);
  }

  /**
   * Acknowledge safety alert
   */
  acknowledgeSafetyAlert(index: number, adminId: string): boolean {
    return this.aeService.acknowledgeAlert(index, adminId);
  }

  /**
   * Get compliance metrics
   */
  private async getComplianceMetrics(): Promise<IDashboardMetrics['compliance']> {
    const consentedUsers = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE consent_given = 1 AND deleted_at IS NULL`
    );

    // Count GDPR requests from audit log
    const exportRequests = this.auditLog.filter((e) => e.action === 'EXPORT_DATA').length;

    // Count anonymizations
    const anonymizationRequests = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NOT NULL`
    );

    return {
      consentedUsers: consentedUsers?.count || 0,
      dataExportRequests: exportRequests,
      anonymizationRequests: anonymizationRequests?.count || 0,
    };
  }

  // ==================== User Management ====================

  /**
   * Get user list summary for admin view
   */
  async getUserList(limit: number = 50, offset: number = 0): Promise<IUserSummary[]> {
    const users = await this.db.query<{
      id: number;
      external_id: string;
      first_name: string | null;
      created_at: string;
      last_activity_at: string | null;
      consent_given: number;
    }>(
      `SELECT id, external_id, first_name, created_at, last_activity_at, consent_given
       FROM users WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const summaries: IUserSummary[] = [];

    for (const user of users) {
      // Get ISI scores
      const isiScores = await this.db.query<{ score: number; created_at: string }>(
        `SELECT score, created_at FROM assessments
         WHERE user_id = ? AND type = 'ISI' AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [user.id]
      );

      const baselineISI = isiScores.length > 0 ? isiScores[0].score : null;
      const latestISI = isiScores.length > 0 ? isiScores[isiScores.length - 1].score : null;
      const isiChange = baselineISI !== null && latestISI !== null ? baselineISI - latestISI : null;

      // Get diary count
      const diaryCount = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM sleep_diary_entries WHERE user_id = ? AND deleted_at IS NULL`,
        [user.id]
      );

      // Get session count
      const sessionCount = await this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM therapy_sessions WHERE user_id = ? AND deleted_at IS NULL`,
        [user.id]
      );

      // Calculate current week
      const enrollmentDate = new Date(user.created_at);
      const daysSinceEnrollment = Math.floor(
        (Date.now() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const currentWeek = Math.floor(daysSinceEnrollment / 7);

      // Determine status
      let status: IUserSummary['status'] = 'active';
      if (user.last_activity_at) {
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(user.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActivity > this.config.dropoutDaysThreshold) {
          status = 'dropped';
        } else if (daysSinceActivity > this.config.inactiveDaysThreshold) {
          status = 'inactive';
        }
      }
      if (currentWeek >= 12) {
        status = 'completed';
      }

      summaries.push({
        id: user.id,
        externalId: user.external_id,
        displayName: user.first_name || `User ${user.id}`,
        enrollmentDate,
        lastActivityAt: user.last_activity_at ? new Date(user.last_activity_at) : null,
        consentGiven: user.consent_given === 1,
        currentWeek,
        baselineISI,
        latestISI,
        isiChange,
        diaryCount: diaryCount?.count || 0,
        sessionCount: sessionCount?.count || 0,
        status,
      });
    }

    return summaries;
  }

  /**
   * Get detailed user info (for admin view)
   */
  async getUserDetail(userId: number): Promise<{
    user: IUserSummary;
    isiHistory: Array<{ date: Date; score: number; week: number }>;
    recentDiaries: number;
    recentSessions: number;
  } | null> {
    const users = await this.getUserList(1, 0);
    const userList = await this.db.query<{ id: number }>(
      `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (userList.length === 0) return null;

    // Get full user summary
    const allUsers = await this.getUserList(1000, 0);
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return null;

    // Get ISI history
    const isiHistory = await this.db.query<{ score: number; created_at: string }>(
      `SELECT score, created_at FROM assessments
       WHERE user_id = ? AND type = 'ISI' AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [userId]
    );

    const enrollmentDate = user.enrollmentDate;

    return {
      user,
      isiHistory: isiHistory.map((row) => {
        const date = new Date(row.created_at);
        const daysSinceEnrollment = Math.floor(
          (date.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          date,
          score: row.score,
          week: Math.floor(daysSinceEnrollment / 7),
        };
      }),
      recentDiaries: user.diaryCount,
      recentSessions: user.sessionCount,
    };
  }
}

// ==================== Factory ====================

export function createAdminDashboardService(db: IDatabaseConnection): AdminDashboardService {
  return new AdminDashboardService(db);
}

export default AdminDashboardService;
