/**
 * MCQ30Repository Unit Tests
 * ==========================
 * Tests for MCQ-30 assessment data persistence.
 *
 * MCQ-30 (Metacognitions Questionnaire) is a clinical instrument
 * measuring dysfunctional metacognitive beliefs associated with
 * psychological disorders including insomnia.
 *
 * Covers:
 * - CRUD operations for MCQ-30 results
 * - Soft delete filtering (deleted_at IS NULL)
 * - JSON serialization/deserialization
 * - Result grouping by user
 * - Replace operation (soft delete + insert)
 *
 * Traceability:
 * - REQ-ASSESS-001 (Assessment data persistence)
 * - REQ-MCT-001 (Metacognitive therapy support)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/database
 */

import { MCQ30Repository } from '../MCQ30Repository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

/**
 * Create mock database connection
 */
function createMockDb(): IDatabaseConnection {
  return {
    type: 'sqlite' as const,
    isConnected: true,
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    queryOne: jest.fn().mockResolvedValue(null),
    execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
    beginTransaction: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
      query: jest.fn().mockResolvedValue([]),
      queryOne: jest.fn().mockResolvedValue(null),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
    transaction: jest.fn().mockImplementation(async (fn) => {
      const tx = {
        execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
        query: jest.fn().mockResolvedValue([]),
        queryOne: jest.fn().mockResolvedValue(null),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
      return fn(tx);
    }),
    tableExists: jest.fn().mockResolvedValue(true),
    healthCheck: jest.fn().mockResolvedValue({
      connected: true,
      latencyMs: 1,
      version: 'SQLite mock',
    }),
  };
}

/**
 * Create mock MCQ-30 result object
 */
function createMockMCQ30Result(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    totalScore: 85,
    subscales: {
      positiveBeliefs: 15,
      negativeBeliefs: 20,
      cognitiveConfidence: 12,
      controlNeed: 18,
      cognitiveSelfConsciousness: 20,
    },
    severity: 'moderate',
    assessmentDate: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create mock database row for MCQ-30 result
 */
function createMockResultRow(userId: string, result: unknown, assessedAt: string = '2026-01-15T10:00:00.000Z') {
  return {
    user_id: userId,
    result_json: JSON.stringify(result),
    assessed_at: assessedAt,
    created_at: '2026-01-15T10:00:00.000Z',
    deleted_at: null,
  };
}

describe('MCQ30Repository', () => {
  let db: IDatabaseConnection;
  let repository: MCQ30Repository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new MCQ30Repository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });

    it('should store database connection reference', () => {
      expect((repository as any).db).toBe(db);
    });
  });

  describe('getResults()', () => {
    it('should return empty array for user with no results', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const results = await repository.getResults('user_123');

      expect(results).toEqual([]);
    });

    it('should return parsed JSON results for user', async () => {
      const mockResult = createMockMCQ30Result();
      const mockRows = [
        { result_json: JSON.stringify(mockResult) },
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.getResults('user_123');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockResult);
    });

    it('should return multiple results in chronological order', async () => {
      const result1 = createMockMCQ30Result({ totalScore: 80 });
      const result2 = createMockMCQ30Result({ totalScore: 70 });
      const result3 = createMockMCQ30Result({ totalScore: 60 });
      const mockRows = [
        { result_json: JSON.stringify(result1) },
        { result_json: JSON.stringify(result2) },
        { result_json: JSON.stringify(result3) },
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.getResults('user_123');

      expect(results).toHaveLength(3);
      expect((results[0] as any).totalScore).toBe(80);
      expect((results[1] as any).totalScore).toBe(70);
      expect((results[2] as any).totalScore).toBe(60);
    });

    it('should query with correct SQL and parameters', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getResults('user_456');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT result_json FROM mcq30_results'),
        ['user_456']
      );
    });

    it('should exclude soft-deleted results', async () => {
      await repository.getResults('user_123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.anything()
      );
    });

    it('should order results by assessed_at ASC', async () => {
      await repository.getResults('user_123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY assessed_at ASC'),
        expect.anything()
      );
    });

    it('should handle complex JSON results with nested objects', async () => {
      const complexResult = {
        totalScore: 95,
        subscales: {
          positiveBeliefs: { score: 18, items: [3, 4, 3, 4, 4] },
          negativeBeliefs: { score: 22, items: [4, 5, 5, 4, 4] },
        },
        metadata: {
          version: '2.0',
          completedInSeconds: 245,
        },
      };
      (db.query as jest.Mock).mockResolvedValue([
        { result_json: JSON.stringify(complexResult) },
      ]);

      const results = await repository.getResults('user_123');

      expect(results[0]).toEqual(complexResult);
    });
  });

  describe('getAllResults()', () => {
    it('should return empty array when no results exist', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const results = await repository.getAllResults();

      expect(results).toEqual([]);
    });

    it('should return results grouped by user', async () => {
      const result1 = createMockMCQ30Result({ totalScore: 80 });
      const result2 = createMockMCQ30Result({ totalScore: 75 });
      const result3 = createMockMCQ30Result({ totalScore: 90 });
      const mockRows = [
        { user_id: 'user_1', result_json: JSON.stringify(result1) },
        { user_id: 'user_1', result_json: JSON.stringify(result2) },
        { user_id: 'user_2', result_json: JSON.stringify(result3) },
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.getAllResults();

      expect(results).toHaveLength(2);

      const user1Results = results.find(r => r.userId === 'user_1');
      expect(user1Results).toBeDefined();
      expect(user1Results!.results).toHaveLength(2);

      const user2Results = results.find(r => r.userId === 'user_2');
      expect(user2Results).toBeDefined();
      expect(user2Results!.results).toHaveLength(1);
    });

    it('should exclude soft-deleted results', async () => {
      await repository.getAllResults();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
      );
    });

    it('should order by user_id and assessed_at', async () => {
      await repository.getAllResults();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY user_id, assessed_at ASC'),
      );
    });

    it('should select both user_id and result_json', async () => {
      await repository.getAllResults();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id, result_json'),
      );
    });

    it('should handle single user with multiple results', async () => {
      const results = [
        { totalScore: 85 },
        { totalScore: 78 },
        { totalScore: 65 },
      ];
      const mockRows = results.map(r => ({
        user_id: 'user_single',
        result_json: JSON.stringify(r),
      }));
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const allResults = await repository.getAllResults();

      expect(allResults).toHaveLength(1);
      expect(allResults[0].userId).toBe('user_single');
      expect(allResults[0].results).toHaveLength(3);
    });

    it('should preserve result order within user group', async () => {
      const result1 = { assessedAt: '2026-01-01', score: 80 };
      const result2 = { assessedAt: '2026-01-15', score: 75 };
      const result3 = { assessedAt: '2026-02-01', score: 70 };
      const mockRows = [
        { user_id: 'user_1', result_json: JSON.stringify(result1) },
        { user_id: 'user_1', result_json: JSON.stringify(result2) },
        { user_id: 'user_1', result_json: JSON.stringify(result3) },
      ];
      (db.query as jest.Mock).mockResolvedValue(mockRows);

      const results = await repository.getAllResults();
      const userResults = results[0].results as Array<{ score: number }>;

      expect(userResults[0].score).toBe(80);
      expect(userResults[1].score).toBe(75);
      expect(userResults[2].score).toBe(70);
    });
  });

  describe('addResult()', () => {
    it('should insert result with correct SQL', async () => {
      const result = createMockMCQ30Result();
      const assessedAt = new Date('2026-01-15T10:00:00.000Z');

      await repository.addResult('user_123', result, assessedAt);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mcq30_results'),
        expect.anything()
      );
    });

    it('should serialize result to JSON', async () => {
      const result = createMockMCQ30Result();
      const assessedAt = new Date('2026-01-15T10:00:00.000Z');

      await repository.addResult('user_123', result, assessedAt);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      expect(params[1]).toBe(JSON.stringify(result));
    });

    it('should convert assessedAt to ISO string', async () => {
      const result = createMockMCQ30Result();
      const assessedAt = new Date('2026-02-01T15:30:00.000Z');

      await repository.addResult('user_123', result, assessedAt);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      expect(params[2]).toBe('2026-02-01T15:30:00.000Z');
    });

    it('should pass userId as first parameter', async () => {
      const result = createMockMCQ30Result();
      const assessedAt = new Date();

      await repository.addResult('user_789', result, assessedAt);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      expect(params[0]).toBe('user_789');
    });

    it('should include created_at in INSERT', async () => {
      const result = createMockMCQ30Result();
      const assessedAt = new Date();

      await repository.addResult('user_123', result, assessedAt);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining("datetime('now')"),
        expect.anything()
      );
    });

    it('should handle empty result object', async () => {
      const assessedAt = new Date();

      await repository.addResult('user_123', {}, assessedAt);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      expect(params[1]).toBe('{}');
    });

    it('should handle null values in result', async () => {
      const result = { score: null, notes: null };
      const assessedAt = new Date();

      await repository.addResult('user_123', result, assessedAt);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      expect(JSON.parse(params[1])).toEqual({ score: null, notes: null });
    });

    it('should handle array values in result', async () => {
      const result = { answers: [1, 2, 3, 4, 5] };
      const assessedAt = new Date();

      await repository.addResult('user_123', result, assessedAt);

      const call = (db.execute as jest.Mock).mock.calls[0];
      const params = call[1];

      expect(JSON.parse(params[1]).answers).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('replaceResults()', () => {
    it('should soft delete existing results first', async () => {
      const results = [{ result: createMockMCQ30Result(), assessedAt: new Date() }];

      await repository.replaceResults('user_123', results);

      // First call should be the UPDATE for soft delete
      const firstCall = (db.execute as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toContain('UPDATE mcq30_results SET deleted_at');
    });

    it('should soft delete only for specified user', async () => {
      const results = [{ result: createMockMCQ30Result(), assessedAt: new Date() }];

      await repository.replaceResults('user_456', results);

      const firstCall = (db.execute as jest.Mock).mock.calls[0];
      expect(firstCall[1]).toContain('user_456');
    });

    it('should only soft delete non-deleted results', async () => {
      const results = [{ result: createMockMCQ30Result(), assessedAt: new Date() }];

      await repository.replaceResults('user_123', results);

      const firstCall = (db.execute as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toContain('deleted_at IS NULL');
    });

    it('should insert all new results after soft delete', async () => {
      const results = [
        { result: createMockMCQ30Result({ totalScore: 80 }), assessedAt: new Date('2026-01-01') },
        { result: createMockMCQ30Result({ totalScore: 70 }), assessedAt: new Date('2026-01-15') },
        { result: createMockMCQ30Result({ totalScore: 60 }), assessedAt: new Date('2026-02-01') },
      ];

      await repository.replaceResults('user_123', results);

      // 1 UPDATE + 3 INSERTs = 4 total calls
      expect(db.execute).toHaveBeenCalledTimes(4);
    });

    it('should insert results in order', async () => {
      const results = [
        { result: { order: 1 }, assessedAt: new Date('2026-01-01') },
        { result: { order: 2 }, assessedAt: new Date('2026-01-15') },
      ];

      await repository.replaceResults('user_123', results);

      const insertCalls = (db.execute as jest.Mock).mock.calls.slice(1);

      const firstInsertResult = JSON.parse(insertCalls[0][1][1]);
      const secondInsertResult = JSON.parse(insertCalls[1][1][1]);

      expect(firstInsertResult.order).toBe(1);
      expect(secondInsertResult.order).toBe(2);
    });

    it('should handle empty results array', async () => {
      await repository.replaceResults('user_123', []);

      // Should only call UPDATE for soft delete, no INSERTs
      expect(db.execute).toHaveBeenCalledTimes(1);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.anything()
      );
    });

    it('should use correct assessedAt for each result', async () => {
      const date1 = new Date('2026-01-01T10:00:00.000Z');
      const date2 = new Date('2026-02-15T15:30:00.000Z');
      const results = [
        { result: { id: 1 }, assessedAt: date1 },
        { result: { id: 2 }, assessedAt: date2 },
      ];

      await repository.replaceResults('user_123', results);

      const insertCalls = (db.execute as jest.Mock).mock.calls.slice(1);

      expect(insertCalls[0][1][2]).toBe(date1.toISOString());
      expect(insertCalls[1][1][2]).toBe(date2.toISOString());
    });

    it('should set deleted_at to current timestamp', async () => {
      const results = [{ result: {}, assessedAt: new Date() }];

      await repository.replaceResults('user_123', results);

      const updateCall = (db.execute as jest.Mock).mock.calls[0];
      expect(updateCall[0]).toContain("deleted_at = datetime('now')");
    });
  });

  describe('edge cases', () => {
    it('should handle very large result objects', async () => {
      const largeResult = {
        answers: Array(1000).fill(0).map((_, i) => ({
          questionId: i,
          answer: i % 5,
          timestamp: new Date().toISOString(),
        })),
        metadata: {
          longText: 'x'.repeat(10000),
        },
      };

      await repository.addResult('user_123', largeResult, new Date());

      const call = (db.execute as jest.Mock).mock.calls[0];
      const serialized = call[1][1];

      expect(JSON.parse(serialized)).toEqual(largeResult);
    });

    it('should handle special characters in result', async () => {
      const resultWithSpecialChars = {
        notes: 'User said: "I can\'t sleep" at 3:00 AM\nNew line here',
        emoji: '😴🌙',
        russian: 'Бессонница',
        chinese: '失眠症',
      };

      await repository.addResult('user_123', resultWithSpecialChars, new Date());

      const call = (db.execute as jest.Mock).mock.calls[0];
      const serialized = call[1][1];

      expect(JSON.parse(serialized)).toEqual(resultWithSpecialChars);
    });

    it('should handle numeric user IDs', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getResults('12345');

      expect(db.query).toHaveBeenCalledWith(
        expect.anything(),
        ['12345']
      );
    });

    it('should handle undefined fields in result gracefully', async () => {
      const resultWithUndefined = {
        score: 80,
        optional: undefined,
      };

      await repository.addResult('user_123', resultWithUndefined, new Date());

      // JSON.stringify converts undefined to nothing (removes the key)
      const call = (db.execute as jest.Mock).mock.calls[0];
      const parsed = JSON.parse(call[1][1]);

      expect(parsed.score).toBe(80);
      expect('optional' in parsed).toBe(false);
    });

    it('should handle Date objects in result', async () => {
      const resultWithDate = {
        completedAt: new Date('2026-01-15T10:00:00.000Z'),
      };

      await repository.addResult('user_123', resultWithDate, new Date());

      const call = (db.execute as jest.Mock).mock.calls[0];
      const parsed = JSON.parse(call[1][1]);

      // Date is serialized to ISO string by JSON.stringify
      expect(parsed.completedAt).toBe('2026-01-15T10:00:00.000Z');
    });
  });

  describe('error handling', () => {
    it('should propagate database query errors', async () => {
      const dbError = new Error('Database connection failed');
      (db.query as jest.Mock).mockRejectedValue(dbError);

      await expect(repository.getResults('user_123')).rejects.toThrow('Database connection failed');
    });

    it('should propagate database execute errors', async () => {
      const dbError = new Error('Insert failed');
      (db.execute as jest.Mock).mockRejectedValue(dbError);

      await expect(
        repository.addResult('user_123', {}, new Date())
      ).rejects.toThrow('Insert failed');
    });

    it('should throw on invalid JSON in database', async () => {
      (db.query as jest.Mock).mockResolvedValue([
        { result_json: 'invalid json {{{' },
      ]);

      await expect(repository.getResults('user_123')).rejects.toThrow();
    });

    it('should handle partial failure in replaceResults', async () => {
      (db.execute as jest.Mock)
        .mockResolvedValueOnce({ changes: 1 }) // UPDATE succeeds
        .mockRejectedValueOnce(new Error('Insert failed')); // First INSERT fails

      const results = [
        { result: { id: 1 }, assessedAt: new Date() },
        { result: { id: 2 }, assessedAt: new Date() },
      ];

      await expect(repository.replaceResults('user_123', results)).rejects.toThrow('Insert failed');
    });
  });

  describe('SQL injection prevention', () => {
    it('should use parameterized queries for getResults', async () => {
      const maliciousUserId = "'; DROP TABLE mcq30_results; --";

      await repository.getResults(maliciousUserId);

      // Verify query uses parameter binding, not string concatenation
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        [maliciousUserId]
      );
    });

    it('should use parameterized queries for addResult', async () => {
      const maliciousUserId = "'; DELETE FROM users; --";

      await repository.addResult(maliciousUserId, {}, new Date());

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('VALUES (?, ?, ?,'),
        expect.arrayContaining([maliciousUserId])
      );
    });

    it('should use parameterized queries for replaceResults soft delete', async () => {
      const maliciousUserId = "1; DROP TABLE mcq30_results;";

      await repository.replaceResults(maliciousUserId, []);

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ?'),
        [maliciousUserId]
      );
    });
  });
});
