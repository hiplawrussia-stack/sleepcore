/**
 * BaseRepository - Abstract Repository Implementation
 * ====================================================
 *
 * Provides common CRUD operations for all repositories.
 * Based on byte-bot repository pattern with Data Mapper.
 *
 * Features:
 * - Generic CRUD operations
 * - Soft delete support (GDPR compliance)
 * - Audit timestamps (created_at, updated_at)
 * - Type-safe queries
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import type { IDatabaseConnection, IQueryOptions } from '../interfaces/IDatabaseConnection';
import type { IEntity, IRepository } from '../interfaces/IRepository';

/**
 * Database row type (snake_case from SQLite)
 */
export interface IBaseRow {
  id?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Abstract base repository with common CRUD operations
 */
export abstract class BaseRepository<T extends IEntity, ID = number>
  implements IRepository<T, ID>
{
  protected abstract readonly tableName: string;

  constructor(protected readonly db: IDatabaseConnection) {}

  /**
   * Convert database row to entity
   */
  protected abstract rowToEntity(row: IBaseRow): T;

  /**
   * Convert entity to database parameters
   */
  protected abstract entityToParams(entity: Partial<T>): Record<string, unknown>;

  /**
   * Get column names for INSERT (excluding id, timestamps)
   */
  protected abstract getInsertColumns(): string[];

  async findById(id: ID): Promise<T | null> {
    const row = await this.db.queryOne<IBaseRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return row ? this.rowToEntity(row) : null;
  }

  async findAll(options?: IQueryOptions): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;

    if (!options?.includeDeleted) {
      sql += ' WHERE deleted_at IS NULL';
    }

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const rows = await this.db.query<IBaseRow>(sql);
    return rows.map((row) => this.rowToEntity(row));
  }

  async findBy(criteria: Partial<T>): Promise<T[]> {
    const params = this.entityToParams(criteria);
    const conditions = Object.keys(params)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const sql = `SELECT * FROM ${this.tableName} WHERE ${conditions} AND deleted_at IS NULL`;
    const rows = await this.db.query<IBaseRow>(sql, Object.values(params));
    return rows.map((row) => this.rowToEntity(row));
  }

  async findOneBy(criteria: Partial<T>): Promise<T | null> {
    const results = await this.findBy(criteria);
    return results[0] || null;
  }

  async save(entity: T): Promise<T> {
    if (entity.id) {
      const updated = await this.update(entity.id as unknown as ID, entity);
      return updated || entity;
    }
    return this.insert(entity as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
  }

  async insert(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const params = this.entityToParams(entity as Partial<T>);
    const columns = this.getInsertColumns();
    const values = columns.map((col) => params[col]);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.db.execute(sql, values);

    return this.findById(result.lastInsertRowid as unknown as ID) as Promise<T>;
  }

  async update(id: ID, entity: Partial<T>): Promise<T | null> {
    const params = this.entityToParams(entity);
    // Remove id and timestamps from update params
    delete params.id;
    delete params.created_at;

    // Add updated_at
    params.updated_at = new Date().toISOString();

    const setClause = Object.keys(params)
      .map((key) => `${key} = ?`)
      .join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ? AND deleted_at IS NULL`;
    await this.db.execute(sql, [...Object.values(params), id]);

    return this.findById(id);
  }

  async delete(id: ID): Promise<boolean> {
    // Soft delete
    const sql = `UPDATE ${this.tableName} SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`;
    const result = await this.db.execute(sql, [id]);
    return result.changes > 0;
  }

  async hardDelete(id: ID): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.changes > 0;
  }

  async restore(id: ID): Promise<boolean> {
    const sql = `UPDATE ${this.tableName} SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.changes > 0;
  }

  async exists(id: ID): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    return (result?.count || 0) > 0;
  }

  async count(criteria?: Partial<T>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE deleted_at IS NULL`;
    let values: unknown[] = [];

    if (criteria) {
      const params = this.entityToParams(criteria);
      const conditions = Object.keys(params)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` AND ${conditions}`;
      values = Object.values(params);
    }

    const result = await this.db.queryOne<{ count: number }>(sql, values);
    return result?.count || 0;
  }

  /**
   * Helper: Convert camelCase to snake_case
   */
  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Helper: Convert snake_case to camelCase
   */
  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Helper: Parse ISO date string to Date
   */
  protected parseDate(dateStr: string | null | undefined): Date | undefined {
    if (!dateStr) return undefined;
    return new Date(dateStr);
  }
}
