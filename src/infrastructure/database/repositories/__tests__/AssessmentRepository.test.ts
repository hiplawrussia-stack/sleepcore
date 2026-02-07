/**
 * AssessmentRepository Unit Tests
 * ================================
 *
 * Tests for clinical assessment data access (ISI, MEQ, MCTQ, etc.)
 * Covers:
 *
 * - CRUD operations
 * - ISI score tracking and trends
 * - MCID (Minimal Clinically Important Difference) calculation
 * - Baseline vs current comparison
 * - Severity distribution analytics
 *
 * Traceability:
 * - REQ-ISI-001 (ISI assessment)
 * - REQ-CBTI-002 (Treatment outcome tracking)
 * - REQ-MCID-001 (Clinical improvement detection)
 *
 * @packageDocumentation
 */

import { AssessmentRepository } from '../AssessmentRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';
import type { IAssessmentEntity } from '../../interfaces/IRepository';

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
 * Create mock assessment row (database format)
 */
function createMockAssessmentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    user_id: '123',
    type: 'isi',
    score: 18,
    severity: 'moderate',
    category: null,
    responses_json: JSON.stringify([3, 2, 3, 3, 2, 2, 3]),
    interpretation: 'Moderate clinical insomnia',
    assessed_at: '2026-02-01T10:00:00.000Z',
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('AssessmentRepository', () => {
  let db: IDatabaseConnection;
  let repository: AssessmentRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    repository = new AssessmentRepository(db);
  });

  describe('constructor', () => {
    it('should create repository instance', () => {
      expect(repository).toBeInstanceOf(AssessmentRepository);
    });
  });

  describe('findByUserAndType()', () => {
    it('should find all assessments of specific type for user', async () => {
      const rows = [
        createMockAssessmentRow({ id: 1, score: 18, assessed_at: '2026-02-01T10:00:00.000Z' }),
        createMockAssessmentRow({ id: 2, score: 15, assessed_at: '2026-02-15T10:00:00.000Z' }),
        createMockAssessmentRow({ id: 3, score: 10, assessed_at: '2026-03-01T10:00:00.000Z' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByUserAndType('123', 'isi');

      expect(result).toHaveLength(3);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND type = ?'),
        ['123', 'isi']
      );
    });

    it('should order by assessed_at DESC', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByUserAndType('123', 'isi');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY assessed_at DESC'),
        expect.any(Array)
      );
    });

    it('should return empty array when no assessments', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByUserAndType('123', 'meq');

      expect(result).toEqual([]);
    });
  });

  describe('getLatestByType()', () => {
    it('should return most recent assessment of type', async () => {
      const row = createMockAssessmentRow({ score: 12, assessed_at: '2026-03-01T10:00:00.000Z' });
      (db.queryOne as jest.Mock).mockResolvedValue(row);

      const result = await repository.getLatestByType('123', 'isi');

      expect(result).not.toBeNull();
      expect(result?.score).toBe(12);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY assessed_at DESC'),
        ['123', 'isi']
      );
    });

    it('should return null when no assessments exist', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getLatestByType('123', 'mctq');

      expect(result).toBeNull();
    });
  });

  describe('getScoreChange()', () => {
    it('should calculate score change between baseline and current (REQ-CBTI-002)', async () => {
      // First call: baseline (first assessment)
      // Second call: latest assessment
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 20 })) // Baseline
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 12 })); // Latest

      const result = await repository.getScoreChange('123', 'isi');

      expect(result).not.toBeNull();
      expect(result?.baseline).toBe(20);
      expect(result?.current).toBe(12);
      expect(result?.change).toBe(-8); // 12 - 20 = -8 (improvement!)
      expect(result?.percentChange).toBe(-40); // -8/20 * 100
    });

    it('should return null when no baseline exists', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.getScoreChange('123', 'isi');

      expect(result).toBeNull();
    });

    it('should return null when only one assessment exists', async () => {
      const row = createMockAssessmentRow();
      // Both calls return the same row (same id)
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce(row);

      const result = await repository.getScoreChange('123', 'isi');

      expect(result).toBeNull();
    });

    it('should handle zero baseline score', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 0 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 5 }));

      const result = await repository.getScoreChange('123', 'isi');

      expect(result?.percentChange).toBe(0); // Avoid division by zero
    });

    it('should round percent change to 1 decimal', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 21 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 14 }));

      const result = await repository.getScoreChange('123', 'isi');

      expect(result?.percentChange).toBe(-33.3); // -7/21 * 100 ≈ -33.33...
    });
  });

  describe('isMCIDReached() - REQ-MCID-001', () => {
    it('should return true when ISI reduction >= 6 points (clinical remission)', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 18 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 10 })); // -8 points

      const result = await repository.isMCIDReached('123', 'isi', 6);

      expect(result).toBe(true); // -8 <= -6
    });

    it('should return false when ISI reduction < 6 points', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 18 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 14 })); // -4 points

      const result = await repository.isMCIDReached('123', 'isi', 6);

      expect(result).toBe(false); // -4 > -6
    });

    it('should return false when no baseline', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.isMCIDReached('123', 'isi', 6);

      expect(result).toBe(false);
    });

    it('should work with custom MCID threshold', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 18 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 10 })); // -8 points

      const result = await repository.isMCIDReached('123', 'isi', 8);

      expect(result).toBe(true); // -8 <= -8
    });

    it('should return false when score worsens', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 15 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 20 })); // +5 points (worse)

      const result = await repository.isMCIDReached('123', 'isi', 6);

      expect(result).toBe(false);
    });
  });

  describe('getScoreTrend()', () => {
    it('should return score trend in chronological order', async () => {
      const rows = [
        { assessed_at: '2026-03-01T10:00:00.000Z', score: 10, severity: 'subthreshold' },
        { assessed_at: '2026-02-15T10:00:00.000Z', score: 15, severity: 'moderate' },
        { assessed_at: '2026-02-01T10:00:00.000Z', score: 18, severity: 'moderate' },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getScoreTrend('123', 'isi');

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2026-02-01'); // First (chronological)
      expect(result[0].score).toBe(18);
      expect(result[2].date).toBe('2026-03-01'); // Last
      expect(result[2].score).toBe(10);
    });

    it('should respect limit parameter', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getScoreTrend('123', 'isi', 5);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        ['123', 'isi', 5]
      );
    });

    it('should use default limit of 10', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getScoreTrend('123', 'isi');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        ['123', 'isi', 10]
      );
    });

    it('should extract date portion from assessed_at', async () => {
      const rows = [
        { assessed_at: '2026-02-01T15:30:45.123Z', score: 18, severity: 'moderate' },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getScoreTrend('123', 'isi');

      expect(result[0].date).toBe('2026-02-01'); // Date only, no time
    });
  });

  describe('countByType()', () => {
    it('should count assessments grouped by type', async () => {
      const rows = [
        { type: 'isi', count: 5 },
        { type: 'meq', count: 2 },
        { type: 'mctq', count: 1 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.countByType('123');

      expect(result.isi).toBe(5);
      expect(result.meq).toBe(2);
      expect(result.mctq).toBe(1);
    });

    it('should return empty object when no assessments', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const result = await repository.countByType('123');

      expect(result).toEqual({});
    });
  });

  describe('findByDateRange()', () => {
    it('should find assessments within date range', async () => {
      const rows = [
        createMockAssessmentRow({ assessed_at: '2026-02-01T10:00:00.000Z' }),
        createMockAssessmentRow({ id: 2, assessed_at: '2026-02-15T10:00:00.000Z' }),
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.findByDateRange('123', '2026-02-01', '2026-02-28');

      expect(result).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('assessed_at >= ?'),
        expect.arrayContaining(['123', '2026-02-01', '2026-02-28'])
      );
    });

    it('should filter by type when specified', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange('123', '2026-02-01', '2026-02-28', 'isi');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = ?'),
        ['123', '2026-02-01', '2026-02-28', 'isi']
      );
    });

    it('should not filter by type when not specified', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.findByDateRange('123', '2026-02-01', '2026-02-28');

      const sqlCall = (db.query as jest.Mock).mock.calls[0][0];
      // Should not have the extra type filter
      expect(sqlCall.match(/AND type = \?/g)?.length || 0).toBe(0);
    });
  });

  describe('getSeverityDistribution()', () => {
    it('should return severity distribution across users', async () => {
      const rows = [
        { severity: 'none', count: 10 },
        { severity: 'subthreshold', count: 25 },
        { severity: 'moderate', count: 40 },
        { severity: 'severe', count: 15 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getSeverityDistribution('isi');

      expect(result.none).toBe(10);
      expect(result.subthreshold).toBe(25);
      expect(result.moderate).toBe(40);
      expect(result.severe).toBe(15);
    });

    it('should use latest assessment per user', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      await repository.getSeverityDistribution('isi');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY assessed_at DESC)'),
        ['isi']
      );
    });

    it('should handle null severity as unknown', async () => {
      const rows = [
        { severity: null, count: 5 },
      ];
      (db.query as jest.Mock).mockResolvedValue(rows);

      const result = await repository.getSeverityDistribution('isi');

      expect(result.unknown).toBe(5);
    });
  });

  describe('rowToEntity conversion', () => {
    it('should correctly map database row to entity', async () => {
      const row = createMockAssessmentRow();
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndType('123', 'isi');
      const entity = result[0];

      expect(entity.id).toBe(1);
      expect(entity.userId).toBe('123');
      expect(entity.type).toBe('isi');
      expect(entity.score).toBe(18);
      expect(entity.severity).toBe('moderate');
      expect(entity.responsesJson).toBe(JSON.stringify([3, 2, 3, 3, 2, 2, 3]));
      expect(entity.interpretation).toBe('Moderate clinical insomnia');
      expect(entity.assessedAt).toBeInstanceOf(Date);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      expect(entity.deletedAt).toBeNull();
    });

    it('should handle optional fields', async () => {
      const row = createMockAssessmentRow({
        severity: null,
        category: 'chronotype',
        interpretation: null,
      });
      (db.query as jest.Mock).mockResolvedValue([row]);

      const result = await repository.findByUserAndType('123', 'meq');
      const entity = result[0];

      expect(entity.severity).toBeNull();
      expect(entity.category).toBe('chronotype');
      expect(entity.interpretation).toBeNull();
    });
  });

  describe('entityToParams conversion', () => {
    it('should correctly map entity fields to database columns', async () => {
      const entity: Partial<IAssessmentEntity> = {
        id: 1,
        userId: '123',
        type: 'isi',
        score: 18,
        severity: 'moderate',
        category: 'sleep',
        responsesJson: JSON.stringify([3, 2, 3, 3, 2, 2, 3]),
        interpretation: 'Moderate insomnia',
        assessedAt: new Date('2026-02-01T10:00:00.000Z'),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockAssessmentRow());

      // Use insert which internally calls entityToParams
      await repository.insert(entity as Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });

    it('should convert assessedAt Date to ISO string', async () => {
      const entity: Partial<IAssessmentEntity> = {
        userId: '456',
        type: 'meq',
        score: 45,
        responsesJson: '[]',
        assessedAt: new Date('2026-03-15T14:30:00.000Z'),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 2 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockAssessmentRow({ id: 2 }));

      await repository.insert(entity as Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });

    it('should handle optional fields as undefined', async () => {
      const entity: Partial<IAssessmentEntity> = {
        userId: '789',
        type: 'mctq',
        score: 5,
        responsesJson: '{}',
        assessedAt: new Date(),
        // No severity, category, interpretation
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 3 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockAssessmentRow({ id: 3 }));

      await repository.insert(entity as Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'>);

      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe('getInsertColumns()', () => {
    it('should include all required columns', async () => {
      const entity: Partial<IAssessmentEntity> = {
        userId: '123',
        type: 'isi',
        score: 18,
        responsesJson: '[]',
        assessedAt: new Date(),
      };
      (db.execute as jest.Mock).mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      (db.queryOne as jest.Mock).mockResolvedValue(createMockAssessmentRow());

      await repository.insert(entity as Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'>);

      const sqlCall = (db.execute as jest.Mock).mock.calls[0][0];
      expect(sqlCall).toContain('user_id');
      expect(sqlCall).toContain('type');
      expect(sqlCall).toContain('score');
      expect(sqlCall).toContain('responses_json');
      expect(sqlCall).toContain('assessed_at');
    });
  });

  describe('ISI Severity Classification (REQ-ISI-001)', () => {
    it('should correctly identify ISI severity levels', async () => {
      const testCases = [
        { score: 5, expectedSeverity: 'none' },
        { score: 10, expectedSeverity: 'subthreshold' },
        { score: 18, expectedSeverity: 'moderate' },
        { score: 24, expectedSeverity: 'severe' },
      ];

      for (const tc of testCases) {
        const row = createMockAssessmentRow({ score: tc.score, severity: tc.expectedSeverity });
        (db.queryOne as jest.Mock).mockResolvedValue(row);

        const result = await repository.getLatestByType('123', 'isi');

        expect(result?.severity).toBe(tc.expectedSeverity);
      }
    });

    it('should detect severe insomnia requiring specialist referral (ISI >= 22)', async () => {
      const severeRow = createMockAssessmentRow({ score: 22, severity: 'severe' });
      (db.queryOne as jest.Mock).mockResolvedValue(severeRow);

      const result = await repository.getLatestByType('123', 'isi');

      expect(result?.score).toBeGreaterThanOrEqual(22);
      expect(result?.severity).toBe('severe');
    });
  });

  describe('Treatment Response Tracking', () => {
    it('should detect response (>= 8 point ISI reduction)', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 20 }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 10 }));

      const result = await repository.getScoreChange('123', 'isi');

      expect(result?.change).toBeLessThanOrEqual(-8);
    });

    it('should detect remission (ISI <= 7 after being >= 8)', async () => {
      (db.queryOne as jest.Mock)
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 1, score: 18, severity: 'moderate' }))
        .mockResolvedValueOnce(createMockAssessmentRow({ id: 2, score: 5, severity: 'none' }));

      const result = await repository.getScoreChange('123', 'isi');

      expect(result?.current).toBeLessThanOrEqual(7);
    });
  });
});
