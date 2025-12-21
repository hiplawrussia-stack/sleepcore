/**
 * UserRepository - User Data Access
 * ==================================
 *
 * Repository for user accounts with therapy progress tracking.
 * Implements IUserRepository with SQLite backend.
 *
 * Features:
 * - User CRUD with GDPR compliance
 * - Consent management
 * - Timezone/locale handling
 * - Chronotype/cultural profile
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection } from '../interfaces/IDatabaseConnection';
import type { IUserRepository, IUserEntity } from '../interfaces/IRepository';
import { BaseRepository, type IBaseRow } from './BaseRepository';

/**
 * Database row for user entity
 */
interface IUserRow extends IBaseRow {
  external_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  chronotype?: string;
  prakriti?: string;
  tcm_constitution?: string;
  timezone?: string;
  locale?: string;
  settings_json?: string;
  consent_given: number;
  consent_date?: string;
  last_activity_at?: string;
}

/**
 * SQLite User Repository implementation
 */
export class UserRepository
  extends BaseRepository<IUserEntity>
  implements IUserRepository
{
  protected readonly tableName = 'users';

  constructor(db: IDatabaseConnection) {
    super(db);
  }

  protected rowToEntity(row: IUserRow): IUserEntity {
    return {
      id: row.id,
      externalId: row.external_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      chronotype: row.chronotype,
      prakriti: row.prakriti,
      tcmConstitution: row.tcm_constitution,
      timezone: row.timezone || 'UTC',
      locale: row.locale || 'en',
      settingsJson: row.settings_json,
      consentGiven: row.consent_given === 1,
      consentDate: row.consent_date ? this.parseDate(row.consent_date) : undefined,
      lastActivityAt: row.last_activity_at ? this.parseDate(row.last_activity_at) : undefined,
      createdAt: this.parseDate(row.created_at),
      updatedAt: this.parseDate(row.updated_at),
      deletedAt: row.deleted_at ? this.parseDate(row.deleted_at) : null,
    };
  }

  protected entityToParams(entity: Partial<IUserEntity>): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (entity.id !== undefined) params.id = entity.id;
    if (entity.externalId !== undefined) params.external_id = entity.externalId;
    if (entity.email !== undefined) params.email = entity.email;
    if (entity.firstName !== undefined) params.first_name = entity.firstName;
    if (entity.lastName !== undefined) params.last_name = entity.lastName;
    if (entity.chronotype !== undefined) params.chronotype = entity.chronotype;
    if (entity.prakriti !== undefined) params.prakriti = entity.prakriti;
    if (entity.tcmConstitution !== undefined) params.tcm_constitution = entity.tcmConstitution;
    if (entity.timezone !== undefined) params.timezone = entity.timezone;
    if (entity.locale !== undefined) params.locale = entity.locale;
    if (entity.settingsJson !== undefined) params.settings_json = entity.settingsJson;
    if (entity.consentGiven !== undefined) params.consent_given = entity.consentGiven ? 1 : 0;
    if (entity.consentDate !== undefined) {
      params.consent_date = entity.consentDate instanceof Date
        ? entity.consentDate.toISOString()
        : entity.consentDate;
    }
    if (entity.lastActivityAt !== undefined) {
      params.last_activity_at = entity.lastActivityAt instanceof Date
        ? entity.lastActivityAt.toISOString()
        : entity.lastActivityAt;
    }

    return params;
  }

  protected getInsertColumns(): string[] {
    return [
      'external_id',
      'email',
      'first_name',
      'last_name',
      'chronotype',
      'prakriti',
      'tcm_constitution',
      'timezone',
      'locale',
      'settings_json',
      'consent_given',
      'consent_date',
    ];
  }

  /**
   * Find user by external ID (e.g., Telegram ID)
   */
  async findByExternalId(externalId: string): Promise<IUserEntity | null> {
    const row = await this.db.queryOne<IUserRow>(
      `SELECT * FROM ${this.tableName} WHERE external_id = ? AND deleted_at IS NULL`,
      [externalId]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUserEntity | null> {
    const row = await this.db.queryOne<IUserRow>(
      `SELECT * FROM ${this.tableName} WHERE email = ? AND deleted_at IS NULL`,
      [email]
    );
    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(userId: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.tableName}
       SET last_activity_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  /**
   * Check if user has given consent
   */
  async hasConsent(userId: number): Promise<boolean> {
    const row = await this.db.queryOne<{ consent_given: number }>(
      `SELECT consent_given FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );
    return row?.consent_given === 1;
  }

  /**
   * Record user consent
   */
  async recordConsent(userId: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.tableName}
       SET consent_given = 1, consent_date = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  /**
   * Get users requiring follow-up (inactive for N days)
   */
  async getInactiveUsers(days: number): Promise<IUserEntity[]> {
    const rows = await this.db.query<IUserRow>(
      `SELECT * FROM ${this.tableName}
       WHERE deleted_at IS NULL
         AND last_activity_at < datetime('now', '-' || ? || ' days')
       ORDER BY last_activity_at ASC`,
      [days]
    );
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * GDPR: Export all user data
   */
  async exportUserData(userId: number): Promise<{
    user: IUserEntity | null;
    sleepDiaries: number;
    assessments: number;
    therapySessions: number;
  }> {
    const user = await this.findById(userId);

    // Count related data
    const diaryCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sleep_diary_entries WHERE user_id = ?`,
      [userId]
    );

    const assessmentCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM assessments WHERE user_id = ?`,
      [userId]
    );

    const sessionCount = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM therapy_sessions WHERE user_id = ?`,
      [userId]
    );

    return {
      user,
      sleepDiaries: diaryCount?.count || 0,
      assessments: assessmentCount?.count || 0,
      therapySessions: sessionCount?.count || 0,
    };
  }

  /**
   * GDPR: Anonymize user data (right to be forgotten)
   */
  async anonymizeUser(userId: number): Promise<boolean> {
    const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const result = await this.db.execute(
      `UPDATE ${this.tableName}
       SET
         external_id = ?,
         email = NULL,
         first_name = 'Anonymized',
         last_name = 'User',
         deleted_at = datetime('now'),
         updated_at = datetime('now')
       WHERE id = ?`,
      [anonymizedId, userId]
    );

    return result.changes > 0;
  }
}
