/**
 * AutomatedBackupScheduler - Cron-based Automated Backup System
 * ==============================================================
 *
 * Production-ready automated backup scheduler for SleepCore DTx.
 * Based on 2025 best practices for healthcare applications.
 *
 * Features:
 * - Cron-based scheduling (node-cron)
 * - GFS retention (Grandfather-Father-Son): daily/weekly/monthly
 * - Backup verification with checksum
 * - Health monitoring and alerting
 * - HIPAA/GDPR compliant (6+ year retention support)
 *
 * Research basis:
 * - 3-2-1 backup rule (3 copies, 2 media, 1 offsite)
 * - GitLab post-mortem: monitoring critical for detection
 * - AES-256-GCM encryption at rest
 * - HIPAA Security Rule: contingency plan required
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database/security
 */

import * as cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { BackupService, type IBackupResult, type IBackupMetadata, type IBackupServiceConfig } from './BackupService';
import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

/**
 * GFS Retention configuration
 * Grandfather-Father-Son backup rotation scheme
 */
export interface IGFSRetentionConfig {
  /** Keep daily backups for N days (Son) - default: 7 */
  dailyRetentionDays: number;

  /** Keep weekly backups for N weeks (Father) - default: 4 */
  weeklyRetentionWeeks: number;

  /** Keep monthly backups for N months (Grandfather) - default: 12 */
  monthlyRetentionMonths: number;

  /** Day of week for weekly backup (0=Sun, 6=Sat) - default: 0 (Sunday) */
  weeklyBackupDay: number;

  /** Day of month for monthly backup (1-28) - default: 1 */
  monthlyBackupDay: number;
}

/**
 * Backup schedule configuration
 */
export interface IBackupScheduleConfig {
  /** Cron expression for daily backup (default: '0 2 * * *' = 2:00 AM daily) */
  dailyCron: string;

  /** Cron expression for weekly backup (default: '0 3 * * 0' = 3:00 AM Sunday) */
  weeklyCron: string;

  /** Cron expression for monthly backup (default: '0 4 1 * *' = 4:00 AM 1st of month) */
  monthlyCron: string;

  /** Run immediate backup on start (default: false) */
  runOnStart: boolean;

  /** Timezone for cron (default: 'Europe/Moscow') */
  timezone: string;
}

/**
 * Health monitoring configuration
 */
export interface IHealthConfig {
  /** Max time since last successful backup before alert (hours) - default: 25 */
  maxHoursSinceBackup: number;

  /** Callback for health alerts */
  onHealthAlert?: (alert: IBackupHealthAlert) => void | Promise<void>;

  /** Callback for backup completion */
  onBackupComplete?: (result: IBackupResult, type: BackupType) => void | Promise<void>;
}

/**
 * Backup types for GFS rotation
 */
export type BackupType = 'daily' | 'weekly' | 'monthly';

/**
 * Health alert structure
 */
export interface IBackupHealthAlert {
  type: 'backup_failed' | 'backup_overdue' | 'verification_failed' | 'storage_low';
  message: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Backup health status
 */
export interface IBackupHealthStatus {
  healthy: boolean;
  lastBackupAt: Date | null;
  lastBackupType: BackupType | null;
  hoursSinceLastBackup: number | null;
  totalBackups: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  nextScheduledBackup: {
    type: BackupType;
    at: Date;
  } | null;
  alerts: IBackupHealthAlert[];
}

/**
 * Full scheduler configuration
 */
export interface IAutomatedBackupConfig {
  /** Backup service configuration */
  backup: IBackupServiceConfig;

  /** GFS retention configuration */
  retention?: Partial<IGFSRetentionConfig>;

  /** Schedule configuration */
  schedule?: Partial<IBackupScheduleConfig>;

  /** Health monitoring configuration */
  health?: Partial<IHealthConfig>;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Default configurations
 */
const DEFAULT_GFS_RETENTION: IGFSRetentionConfig = {
  dailyRetentionDays: 7,
  weeklyRetentionWeeks: 4,
  monthlyRetentionMonths: 12,
  weeklyBackupDay: 0, // Sunday
  monthlyBackupDay: 1, // 1st of month
};

const DEFAULT_SCHEDULE: IBackupScheduleConfig = {
  dailyCron: '0 2 * * *', // 2:00 AM daily
  weeklyCron: '0 3 * * 0', // 3:00 AM Sunday
  monthlyCron: '0 4 1 * *', // 4:00 AM 1st of month
  runOnStart: false,
  timezone: 'Europe/Moscow',
};

const DEFAULT_HEALTH: Required<Omit<IHealthConfig, 'onHealthAlert' | 'onBackupComplete'>> = {
  maxHoursSinceBackup: 25,
};

/**
 * Backup metadata with type
 */
interface ITypedBackupMetadata extends IBackupMetadata {
  backupType: BackupType;
}

/**
 * AutomatedBackupScheduler - Production backup automation
 */
export class AutomatedBackupScheduler {
  private readonly backupService: BackupService;
  private readonly retention: IGFSRetentionConfig;
  private readonly schedule: IBackupScheduleConfig;
  private readonly health: IHealthConfig;
  private readonly verbose: boolean;
  private readonly metadataPath: string;

  private dailyTask: cron.ScheduledTask | null = null;
  private weeklyTask: cron.ScheduledTask | null = null;
  private monthlyTask: cron.ScheduledTask | null = null;
  private healthCheckTask: cron.ScheduledTask | null = null;

  private db: IDatabaseConnection | null = null;
  private isRunning = false;
  private alerts: IBackupHealthAlert[] = [];

  constructor(config: IAutomatedBackupConfig) {
    this.backupService = new BackupService(config.backup);
    this.retention = { ...DEFAULT_GFS_RETENTION, ...config.retention };
    this.schedule = { ...DEFAULT_SCHEDULE, ...config.schedule };
    this.health = { ...DEFAULT_HEALTH, ...config.health };
    this.verbose = config.verbose ?? false;
    this.metadataPath = path.join(config.backup.backupDir, 'scheduler-metadata.json');
  }

  /**
   * Start automated backup scheduler
   */
  async start(db: IDatabaseConnection): Promise<void> {
    if (this.isRunning) {
      this.log('Scheduler already running');
      return;
    }

    this.db = db;
    this.isRunning = true;

    // Ensure backup directory exists
    await mkdir(path.dirname(this.metadataPath), { recursive: true }).catch(() => {});

    // Schedule daily backups
    this.dailyTask = cron.schedule(
      this.schedule.dailyCron,
      () => this.runBackup('daily'),
      { timezone: this.schedule.timezone }
    );

    // Schedule weekly backups
    this.weeklyTask = cron.schedule(
      this.schedule.weeklyCron,
      () => this.runBackup('weekly'),
      { timezone: this.schedule.timezone }
    );

    // Schedule monthly backups
    this.monthlyTask = cron.schedule(
      this.schedule.monthlyCron,
      () => this.runBackup('monthly'),
      { timezone: this.schedule.timezone }
    );

    // Schedule health check every hour
    this.healthCheckTask = cron.schedule(
      '0 * * * *', // Every hour
      () => this.runHealthCheck(),
      { timezone: this.schedule.timezone }
    );

    this.log(`Automated backup scheduler started`);
    this.log(`  Daily: ${this.schedule.dailyCron} (${this.schedule.timezone})`);
    this.log(`  Weekly: ${this.schedule.weeklyCron}`);
    this.log(`  Monthly: ${this.schedule.monthlyCron}`);

    // Run immediate backup if configured
    if (this.schedule.runOnStart) {
      this.log('Running startup backup...');
      await this.runBackup('daily');
    }
  }

  /**
   * Stop automated backup scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.dailyTask?.stop();
    this.weeklyTask?.stop();
    this.monthlyTask?.stop();
    this.healthCheckTask?.stop();

    this.dailyTask = null;
    this.weeklyTask = null;
    this.monthlyTask = null;
    this.healthCheckTask = null;

    this.isRunning = false;
    this.log('Automated backup scheduler stopped');
  }

  /**
   * Run backup of specified type
   */
  async runBackup(type: BackupType): Promise<IBackupResult> {
    if (!this.db) {
      return {
        success: false,
        error: 'Database not connected',
        duration: 0,
      };
    }

    this.log(`Starting ${type} backup...`);
    const startTime = Date.now();

    try {
      // Run backup
      const result = await this.backupService.backup(this.db);

      if (result.success && result.metadata) {
        // Add type metadata
        const typedMetadata: ITypedBackupMetadata = {
          ...result.metadata,
          backupType: type,
        };

        // Save to scheduler metadata
        await this.saveBackupMetadata(typedMetadata);

        // Verify backup
        const verified = await this.backupService.verifyBackup(
          result.metadata.backupPath,
          result.metadata.checksum
        );

        if (!verified) {
          const alert: IBackupHealthAlert = {
            type: 'verification_failed',
            message: `Backup verification failed for ${type} backup`,
            timestamp: new Date(),
            details: { backupPath: result.metadata.backupPath },
          };
          this.addAlert(alert);
        }

        // Apply GFS retention
        await this.applyGFSRetention();

        this.log(`${type} backup completed: ${result.metadata.backupPath} (${result.duration}ms)`);
      } else {
        // Backup failed - create alert
        const alert: IBackupHealthAlert = {
          type: 'backup_failed',
          message: `${type} backup failed: ${result.error}`,
          timestamp: new Date(),
          details: { error: result.error },
        };
        this.addAlert(alert);
      }

      // Notify callback
      if (this.health.onBackupComplete) {
        await this.health.onBackupComplete(result, type);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const alert: IBackupHealthAlert = {
        type: 'backup_failed',
        message: `${type} backup exception: ${errorMessage}`,
        timestamp: new Date(),
        details: { error: errorMessage },
      };
      this.addAlert(alert);

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Manual backup trigger
   */
  async triggerBackup(type: BackupType = 'daily'): Promise<IBackupResult> {
    return this.runBackup(type);
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<IBackupHealthStatus> {
    const backups = await this.loadBackupMetadata();
    const now = new Date();

    // Find last backup
    const lastBackup = backups.length > 0
      ? backups.reduce((latest, current) =>
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
        )
      : null;

    // Calculate hours since last backup
    const hoursSinceLastBackup = lastBackup
      ? (now.getTime() - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60)
      : null;

    // Count backups by type
    const dailyCount = backups.filter(b => b.backupType === 'daily').length;
    const weeklyCount = backups.filter(b => b.backupType === 'weekly').length;
    const monthlyCount = backups.filter(b => b.backupType === 'monthly').length;

    // Determine health
    const isOverdue = hoursSinceLastBackup !== null &&
      hoursSinceLastBackup > this.health.maxHoursSinceBackup;
    const hasRecentFailure = this.alerts.some(
      a => a.type === 'backup_failed' &&
        (now.getTime() - a.timestamp.getTime()) < 24 * 60 * 60 * 1000
    );

    return {
      healthy: !isOverdue && !hasRecentFailure,
      lastBackupAt: lastBackup ? new Date(lastBackup.timestamp) : null,
      lastBackupType: lastBackup?.backupType ?? null,
      hoursSinceLastBackup,
      totalBackups: {
        daily: dailyCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
      },
      nextScheduledBackup: this.getNextScheduledBackup(),
      alerts: [...this.alerts],
    };
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Run health check
   */
  private async runHealthCheck(): Promise<void> {
    const status = await this.getHealthStatus();

    if (status.hoursSinceLastBackup !== null &&
        status.hoursSinceLastBackup > this.health.maxHoursSinceBackup) {
      const alert: IBackupHealthAlert = {
        type: 'backup_overdue',
        message: `No backup for ${Math.round(status.hoursSinceLastBackup)} hours`,
        timestamp: new Date(),
        details: {
          hoursSinceLastBackup: status.hoursSinceLastBackup,
          threshold: this.health.maxHoursSinceBackup,
        },
      };
      this.addAlert(alert);
    }
  }

  /**
   * Apply GFS retention policy
   */
  private async applyGFSRetention(): Promise<void> {
    const backups = await this.loadBackupMetadata();
    const now = new Date();
    const toDelete: ITypedBackupMetadata[] = [];

    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp);
      const ageMs = now.getTime() - backupDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      let shouldDelete = false;

      switch (backup.backupType) {
        case 'daily':
          // Keep daily backups for N days
          if (ageDays > this.retention.dailyRetentionDays) {
            shouldDelete = true;
          }
          break;

        case 'weekly': {
          // Keep weekly backups for N weeks
          const ageWeeks = ageDays / 7;
          if (ageWeeks > this.retention.weeklyRetentionWeeks) {
            shouldDelete = true;
          }
          break;
        }

        case 'monthly': {
          // Keep monthly backups for N months
          const ageMonths = ageDays / 30;
          if (ageMonths > this.retention.monthlyRetentionMonths) {
            shouldDelete = true;
          }
          break;
        }
      }

      if (shouldDelete) {
        toDelete.push(backup);
      }
    }

    // Delete expired backups
    for (const backup of toDelete) {
      try {
        await unlink(backup.backupPath);
        this.log(`Deleted expired ${backup.backupType} backup: ${backup.backupPath}`);
      } catch {
        // File may already be deleted
      }
    }

    // Update metadata
    const remaining = backups.filter(b => !toDelete.includes(b));
    await this.saveBackupMetadataList(remaining);

    if (toDelete.length > 0) {
      this.log(`GFS retention: deleted ${toDelete.length} expired backups`);
    }
  }

  /**
   * Get next scheduled backup time
   */
  private getNextScheduledBackup(): { type: BackupType; at: Date } | null {
    if (!this.isRunning) return null;

    const now = new Date();
    const nextDaily = this.getNextCronRun(this.schedule.dailyCron, now);
    const nextWeekly = this.getNextCronRun(this.schedule.weeklyCron, now);
    const nextMonthly = this.getNextCronRun(this.schedule.monthlyCron, now);

    const candidates: { type: BackupType; at: Date }[] = [];
    if (nextDaily) candidates.push({ type: 'daily', at: nextDaily });
    if (nextWeekly) candidates.push({ type: 'weekly', at: nextWeekly });
    if (nextMonthly) candidates.push({ type: 'monthly', at: nextMonthly });

    if (candidates.length === 0) return null;

    return candidates.reduce((earliest, current) =>
      current.at < earliest.at ? current : earliest
    );
  }

  /**
   * Calculate next cron run time (simplified)
   */
  private getNextCronRun(cronExpr: string, from: Date): Date | null {
    try {
      // Parse cron expression: minute hour dayOfMonth month dayOfWeek
      const parts = cronExpr.split(' ');
      if (parts.length !== 5) return null;

      const [minute, hour] = parts.map(p => p === '*' ? -1 : parseInt(p, 10));
      const next = new Date(from);

      // Set time
      if (hour !== -1) next.setHours(hour);
      if (minute !== -1) next.setMinutes(minute);
      next.setSeconds(0);
      next.setMilliseconds(0);

      // If past, move to next day
      if (next <= from) {
        next.setDate(next.getDate() + 1);
      }

      return next;
    } catch {
      return null;
    }
  }

  /**
   * Add health alert
   */
  private addAlert(alert: IBackupHealthAlert): void {
    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Notify callback
    if (this.health.onHealthAlert) {
      Promise.resolve(this.health.onHealthAlert(alert)).catch((err: Error) => {
        console.error('[BackupScheduler] Alert callback error:', err);
      });
    }

    console.warn(`[BackupScheduler] ALERT: ${alert.message}`);
  }

  /**
   * Load backup metadata from file
   */
  private async loadBackupMetadata(): Promise<ITypedBackupMetadata[]> {
    try {
      const content = await readFile(this.metadataPath, 'utf8');
      return JSON.parse(content) as ITypedBackupMetadata[];
    } catch {
      return [];
    }
  }

  /**
   * Save single backup metadata
   */
  private async saveBackupMetadata(metadata: ITypedBackupMetadata): Promise<void> {
    const existing = await this.loadBackupMetadata();
    existing.push(metadata);
    await this.saveBackupMetadataList(existing);
  }

  /**
   * Save backup metadata list
   */
  private async saveBackupMetadataList(backups: ITypedBackupMetadata[]): Promise<void> {
    await writeFile(this.metadataPath, JSON.stringify(backups, null, 2));
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[BackupScheduler] ${message}`);
    }
  }
}

/**
 * Create automated backup scheduler from environment
 */
export function createAutomatedBackupScheduler(
  config?: Partial<IAutomatedBackupConfig>
): AutomatedBackupScheduler {
  const backupDir = process.env.BACKUP_DIR || './data/backups';

  return new AutomatedBackupScheduler({
    backup: {
      backupDir,
      encrypt: process.env.BACKUP_ENCRYPT !== 'false',
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
      ...config?.backup,
    },
    retention: {
      dailyRetentionDays: parseInt(process.env.BACKUP_DAILY_RETENTION || '7', 10),
      weeklyRetentionWeeks: parseInt(process.env.BACKUP_WEEKLY_RETENTION || '4', 10),
      monthlyRetentionMonths: parseInt(process.env.BACKUP_MONTHLY_RETENTION || '12', 10),
      ...config?.retention,
    },
    schedule: {
      dailyCron: process.env.BACKUP_DAILY_CRON || '0 2 * * *',
      weeklyCron: process.env.BACKUP_WEEKLY_CRON || '0 3 * * 0',
      monthlyCron: process.env.BACKUP_MONTHLY_CRON || '0 4 1 * *',
      runOnStart: process.env.BACKUP_RUN_ON_START === 'true',
      timezone: process.env.TZ || 'Europe/Moscow',
      ...config?.schedule,
    },
    health: {
      maxHoursSinceBackup: parseInt(process.env.BACKUP_MAX_HOURS || '25', 10),
      ...config?.health,
    },
    verbose: process.env.BACKUP_VERBOSE === 'true' || config?.verbose,
  });
}
