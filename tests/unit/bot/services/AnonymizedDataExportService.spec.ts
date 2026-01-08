/**
 * AnonymizedDataExportService Unit Tests
 * =======================================
 * Tests for clinical data anonymization and export service.
 *
 * Covers:
 * - Anonymization levels (pseudonymized, de_identified, anonymized)
 * - Export formats (CSV, JSON, NDJSON)
 * - Date transformations
 * - Age transformations
 * - k-anonymity validation
 * - ICMJE data sharing statement generation
 */

import {
  AnonymizedDataExportService,
  createAnonymizedDataExportService,
  DEFAULT_EXPORT_CONFIG,
  type IExportConfig,
  type IAnonymizedParticipant,
  type AnonymizationLevel,
} from '../../../../src/bot/services/AnonymizedDataExportService';
import type { IDatabaseConnection } from '../../../../src/infrastructure/database/interfaces/IDatabaseConnection';

// ==================== Mock Database ====================

function createMockDatabase(): IDatabaseConnection {
  return {
    query: jest.fn().mockResolvedValue([]), // Return empty arrays by default
    execute: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
    transaction: jest.fn().mockImplementation(async (fn) => fn({
      query: jest.fn().mockResolvedValue([]),
      execute: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
    })),
    close: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  } as unknown as IDatabaseConnection;
}

function createMockDatabaseWithUsers(): IDatabaseConnection {
  const mockDb = createMockDatabase();
  (mockDb.query as jest.Mock).mockImplementation((sql: string) => {
    if (sql.includes('users')) {
      return Promise.resolve([
        {
          id: 1,
          external_id: 'user-123',
          first_name: 'Test User',
          birth_year: 1990,
          sex: 'M',
          consent_given: 1,
          created_at: '2025-01-01T10:00:00Z',
          last_activity_at: '2025-01-15T10:00:00Z',
          program_week: 2,
        },
      ]);
    }
    return Promise.resolve([]);
  });
  return mockDb;
}

// ==================== Tests ====================

describe('AnonymizedDataExportService', () => {
  let service: AnonymizedDataExportService;
  let mockDb: IDatabaseConnection;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = createAnonymizedDataExportService(mockDb);
  });

  describe('factory function', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(AnonymizedDataExportService);
    });
  });

  describe('DEFAULT_EXPORT_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_EXPORT_CONFIG.level).toBe('de_identified');
      expect(DEFAULT_EXPORT_CONFIG.format).toBe('csv');
      expect(DEFAULT_EXPORT_CONFIG.dateTransformation).toBe('relative_days');
      expect(DEFAULT_EXPORT_CONFIG.ageTransformation).toBe('ranges_5');
      expect(DEFAULT_EXPORT_CONFIG.kAnonymity).toBe(5);
      expect(DEFAULT_EXPORT_CONFIG.includeISI).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includeDiary).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includeSessions).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includeAdverseEvents).toBe(true);
      expect(DEFAULT_EXPORT_CONFIG.includeGamification).toBe(false);
    });
  });

  describe('transformAge()', () => {
    it('should return exact age when exact mode', () => {
      const result = service['transformAge'](35, 'exact');
      expect(result).toBe('35');
    });

    it('should return 5-year range', () => {
      expect(service['transformAge'](35, 'ranges_5')).toBe('35-39');
      expect(service['transformAge'](42, 'ranges_5')).toBe('40-44');
      expect(service['transformAge'](18, 'ranges_5')).toBe('15-19');
    });

    it('should return 10-year range', () => {
      expect(service['transformAge'](35, 'ranges_10')).toBe('30-39');
      expect(service['transformAge'](42, 'ranges_10')).toBe('40-49');
      expect(service['transformAge'](25, 'ranges_10')).toBe('20-29');
    });

    it('should cap at 89 for HIPAA compliance', () => {
      expect(service['transformAge'](90, 'cap_89')).toBe('89+');
      expect(service['transformAge'](95, 'cap_89')).toBe('89+');
      expect(service['transformAge'](100, 'cap_89')).toBe('89+');
      expect(service['transformAge'](85, 'cap_89')).toBe('85');
    });
  });

  describe('transformDate()', () => {
    const baseDate = new Date('2025-03-15');
    const enrollmentDate = new Date('2025-01-01');

    it('should return year only', () => {
      const result = service['transformDate'](baseDate, enrollmentDate, 'year_only');
      expect(result).toBe('2025');
    });

    it('should return relative days', () => {
      const result = service['transformDate'](baseDate, enrollmentDate, 'relative_days');
      expect(result).toBe('Day 73'); // 73 days from Jan 1 to Mar 15
    });

    it('should return week number', () => {
      const result = service['transformDate'](baseDate, enrollmentDate, 'week_number');
      expect(result).toBe('Week 10'); // ~10 weeks from Jan 1 to Mar 15
    });

    it('should return REDACTED when remove mode', () => {
      const result = service['transformDate'](baseDate, enrollmentDate, 'remove');
      expect(result).toBe('[REDACTED]');
    });

    it('should return Day 0 when no reference date', () => {
      const result = service['transformDate'](baseDate, null, 'relative_days');
      expect(result).toBe('Day 0');
    });
  });

  describe('createIdMapping()', () => {
    it('should generate sequential ID for de_identified', () => {
      const users = [
        { id: 1, external_id: 'user-123' },
        { id: 2, external_id: 'user-456' },
      ];
      const config = { ...DEFAULT_EXPORT_CONFIG, level: 'de_identified' as const };

      const idMap = service['createIdMapping'](users, config);

      expect(idMap.get(1)).toBe('SUBJ0001');
      expect(idMap.get(2)).toBe('SUBJ0002');
    });

    it('should generate hash for pseudonymized with salt', () => {
      const users = [{ id: 1, external_id: 'user-123' }];
      const config = {
        ...DEFAULT_EXPORT_CONFIG,
        level: 'pseudonymized' as const,
        pseudonymizationSalt: 'test-salt-secret',
      };

      const idMap = service['createIdMapping'](users, config);

      expect(idMap.get(1)).toMatch(/^P[a-f0-9]{12}$/); // P + 12 hex chars
    });

    it('should generate sequential ID for anonymized', () => {
      const users = [
        { id: 10, external_id: 'user-10' },
        { id: 20, external_id: 'user-20' },
        { id: 30, external_id: 'user-30' },
      ];
      const config = { ...DEFAULT_EXPORT_CONFIG, level: 'anonymized' as const };

      const idMap = service['createIdMapping'](users, config);

      expect(idMap.get(10)).toBe('SUBJ0001');
      expect(idMap.get(20)).toBe('SUBJ0002');
      expect(idMap.get(30)).toBe('SUBJ0003');
    });
  });

  describe('validateKAnonymity()', () => {
    it('should pass when all groups meet k threshold', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'P001', ageGroup: '30-34', sex: 'M', consentGiven: true, status: 'active' },
        { participantId: 'P002', ageGroup: '30-34', sex: 'M', consentGiven: true, status: 'active' },
        { participantId: 'P003', ageGroup: '30-34', sex: 'M', consentGiven: true, status: 'active' },
        { participantId: 'P004', ageGroup: '30-34', sex: 'F', consentGiven: true, status: 'active' },
        { participantId: 'P005', ageGroup: '30-34', sex: 'F', consentGiven: true, status: 'active' },
        { participantId: 'P006', ageGroup: '30-34', sex: 'F', consentGiven: true, status: 'active' },
      ];

      const result = service.validateKAnonymity(data, 3, ['ageGroup', 'sex']);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when a group is below k threshold', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'P001', ageGroup: '30-34', sex: 'M', consentGiven: true, status: 'active' },
        { participantId: 'P002', ageGroup: '30-34', sex: 'M', consentGiven: true, status: 'active' },
        { participantId: 'P003', ageGroup: '30-34', sex: 'F', consentGiven: true, status: 'active' }, // Only 1 F
      ];

      const result = service.validateKAnonymity(data, 2, ['ageGroup', 'sex']);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].count).toBe(1);
    });

    it('should pass with k=1 (no anonymity requirement)', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'P001', ageGroup: '25-29', sex: 'M', consentGiven: true, status: 'active' },
      ];

      const result = service.validateKAnonymity(data, 1, ['ageGroup', 'sex']);

      expect(result.valid).toBe(true);
    });

    it('should handle empty data', () => {
      const result = service.validateKAnonymity([], 5, ['ageGroup', 'sex']);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('generateDataSharingStatement()', () => {
    it('should generate ICMJE-compliant statement', () => {
      const config: IExportConfig = {
        ...DEFAULT_EXPORT_CONFIG,
        level: 'de_identified',
        kAnonymity: 5,
      };

      const statement = service.generateDataSharingStatement(config);

      expect(statement).toContain('DATA SHARING STATEMENT');
      expect(statement).toContain('De-identified individual participant data');
      expect(statement).toContain('k=5');
      expect(statement).toContain('ICMJE');
    });

    it('should include configured data types', () => {
      const config: IExportConfig = {
        ...DEFAULT_EXPORT_CONFIG,
        includeISI: true,
        includeDiary: true,
        includeAdverseEvents: false,
      };

      const statement = service.generateDataSharingStatement(config);

      expect(statement).toContain('ISI assessment scores');
      expect(statement).toContain('Sleep diary metrics');
    });
  });

  describe('exportDataset()', () => {
    beforeEach(() => {
      // Mock database to return sample data as arrays (collectRawData expects arrays)
      (mockDb.query as jest.Mock).mockImplementation((sql: string) => {
        if (sql.includes('users')) {
          return Promise.resolve([
            {
              id: 1,
              external_id: 'user-123',
              first_name: 'Test User',
              birth_year: 1990,
              sex: 'M',
              consent_given: 1,
              created_at: '2025-01-01T10:00:00Z',
              last_activity_at: '2025-01-15T10:00:00Z',
              program_week: 2,
            },
          ]);
        }
        // Return empty arrays for other queries (assessments, diaries, sessions)
        return Promise.resolve([]);
      });
    });

    it('should export dataset with correct structure', async () => {
      const result = await service.exportDataset(
        { format: 'json', level: 'de_identified' },
        'admin-user'
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('checksum');
      expect(result).toHaveProperty('dataset');
      expect(result).toHaveProperty('auditEntry');
    });

    it('should generate valid checksum', async () => {
      const result = await service.exportDataset(
        { format: 'json' },
        'admin-user'
      );

      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256
    });

    it('should create audit entry', async () => {
      const result = await service.exportDataset(
        { format: 'csv' },
        'admin-user'
      );

      expect(result.auditEntry).toHaveProperty('exportId');
      expect(result.auditEntry).toHaveProperty('timestamp');
      expect(result.auditEntry.exportedBy).toBe('admin-user');
    });

    it('should generate appropriate filename', async () => {
      const result = await service.exportDataset(
        { format: 'csv' },
        'admin-user'
      );

      expect(result.filename).toMatch(/sleepcore_export_.*\.csv$/);
    });
  });

  describe('formatOutput()', () => {
    const mockDataset = {
      metadata: {
        exportDate: '2025-01-15T12:00:00Z',
        exportId: 'test-export-123',
        anonymizationLevel: 'de_identified' as AnonymizationLevel,
        totalParticipants: 1,
        dateRange: { start: '2025', end: '2025' },
        kAnonymity: 5,
        dataVersion: '1.0.0',
      },
      dataSharingStatement: 'Test statement',
      participants: [
        { participantId: 'P001', ageGroup: '30-34', sex: 'M', consentGiven: true, status: 'active' as const },
      ],
      isiAssessments: [],
      diaryEntries: [],
      adverseEvents: [],
    };

    it('should format as JSON', () => {
      const output = service['formatOutput'](mockDataset, 'json');

      expect(() => JSON.parse(output)).not.toThrow();
      const parsed = JSON.parse(output);
      expect(parsed.metadata.exportId).toBe('test-export-123');
    });

    it('should format as NDJSON', () => {
      const output = service['formatOutput'](mockDataset, 'ndjson');
      const lines = output.trim().split('\n');

      expect(lines.length).toBeGreaterThan(0);
      expect(() => JSON.parse(lines[0])).not.toThrow();
    });

    it('should format as CSV', () => {
      const output = service['formatOutput'](mockDataset, 'csv');

      expect(output).toContain('participant_id');
      expect(output).toContain('P001');
    });
  });

  describe('getAuditLog()', () => {
    it('should return empty array initially', () => {
      const log = service.getAuditLog();

      expect(log).toEqual([]);
    });

    it('should return audit entries after export', async () => {
      // Create service with mock data for export
      const mockDbWithUsers = createMockDatabaseWithUsers();
      const serviceWithData = createAnonymizedDataExportService(mockDbWithUsers);

      await serviceWithData.exportDataset({}, 'admin-1');
      await serviceWithData.exportDataset({}, 'admin-2');

      const log = serviceWithData.getAuditLog();

      expect(log).toHaveLength(2);
      expect(log[0].exportedBy).toBe('admin-1');
      expect(log[1].exportedBy).toBe('admin-2');
    });
  });
});

describe('AnonymizationLevel compliance', () => {
  let service: AnonymizedDataExportService;

  beforeEach(() => {
    service = createAnonymizedDataExportService(createMockDatabase());
  });

  describe('HIPAA Safe Harbor', () => {
    it('should use 5-year age ranges by default', () => {
      expect(DEFAULT_EXPORT_CONFIG.ageTransformation).toBe('ranges_5');
    });

    it('should cap ages at 89+', () => {
      const result = service['transformAge'](92, 'cap_89');
      expect(result).toBe('89+');
    });

    it('should use relative dates by default', () => {
      expect(DEFAULT_EXPORT_CONFIG.dateTransformation).toBe('relative_days');
    });
  });

  describe('GDPR Article 89', () => {
    it('should default to de_identified level', () => {
      expect(DEFAULT_EXPORT_CONFIG.level).toBe('de_identified');
    });

    it('should enforce k-anonymity by default', () => {
      expect(DEFAULT_EXPORT_CONFIG.kAnonymity).toBe(5);
    });
  });

  describe('ICMJE data sharing', () => {
    it('should generate data sharing statement', () => {
      const statement = service.generateDataSharingStatement(DEFAULT_EXPORT_CONFIG);

      expect(statement).toContain('DATA SHARING STATEMENT');
      expect(statement).toContain('ICMJE');
    });
  });
});
