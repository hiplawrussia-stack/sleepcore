/**
 * AnonymizedDataExportService Tests
 * ==================================
 *
 * Tests for clinical trial data anonymization and export service.
 * Validates k-anonymity, data sharing statements, audit logging,
 * and export formatting (CSV/JSON/NDJSON).
 *
 * Research basis: EDPB Guidelines 01/2025, EMA Policy 0070, HIPAA Safe Harbor
 *
 * @packageDocumentation
 */

import {
  AnonymizedDataExportService,
  createAnonymizedDataExportService,
  DEFAULT_EXPORT_CONFIG,
  type IExportConfig,
  type IAnonymizedParticipant,
} from '../AnonymizedDataExportService';

// Create mock database connection
const createMockDb = () => {
  const mockQuery = jest.fn();
  const mockQueryOne = jest.fn();
  const mockExecute = jest.fn();

  return {
    type: 'sqlite' as const,
    isConnected: true,
    connect: jest.fn(),
    close: jest.fn(),
    query: mockQuery,
    queryOne: mockQueryOne,
    execute: mockExecute,
    transaction: jest.fn(),
  };
};

// Sample raw user data for DB mocks
const mockUsers = [
  {
    id: 1,
    external_id: 'ext_001',
    first_name: 'Alice',
    birth_year: 1990,
    sex: 'female',
    created_at: '2025-06-01T10:00:00Z',
    last_activity_at: new Date().toISOString(),
    consent_given: 1,
    program_week: 3,
  },
  {
    id: 2,
    external_id: 'ext_002',
    first_name: 'Bob',
    birth_year: 1985,
    sex: 'male',
    created_at: '2025-06-05T12:00:00Z',
    last_activity_at: new Date().toISOString(),
    consent_given: 1,
    program_week: 5,
  },
];

const mockAssessments = [
  {
    id: 1,
    user_id: 1,
    type: 'ISI',
    score: 18,
    responses: '[3,2,3,3,2,3,2]',
    created_at: '2025-06-02T10:00:00Z',
  },
  {
    id: 2,
    user_id: 2,
    type: 'ISI',
    score: 10,
    responses: '[1,2,1,2,1,2,1]',
    created_at: '2025-06-06T10:00:00Z',
  },
];

const mockDiaries = [
  {
    id: 1,
    user_id: 1,
    date: '2025-06-02',
    bedtime: '23:30',
    wake_time: '07:00',
    sleep_onset_latency: 25,
    wake_after_sleep_onset: 15,
    total_sleep_time: 410,
    time_in_bed: 450,
    sleep_efficiency: 91.1,
    sleep_quality: 4,
    created_at: '2025-06-02T08:00:00Z',
  },
];

describe('AnonymizedDataExportService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  let service: AnonymizedDataExportService;

  beforeEach(() => {
    mockDb = createMockDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new AnonymizedDataExportService(mockDb as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================
  describe('Constructor', () => {
    it('should create instance with mock db', () => {
      expect(service).toBeInstanceOf(AnonymizedDataExportService);
    });

    it('should create instance via factory function', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = createAnonymizedDataExportService(mockDb as any);
      expect(created).toBeInstanceOf(AnonymizedDataExportService);
    });

    it('should start with empty audit log', () => {
      expect(service.getAuditLog()).toEqual([]);
    });
  });

  // ==========================================================================
  // validateKAnonymity()
  // ==========================================================================
  describe('validateKAnonymity()', () => {
    it('should validate k-anonymity with valid data (all groups >= k)', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'S1', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S2', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S3', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S4', ageGroup: '35-39', sex: 'male', consentGiven: true, status: 'active' },
        { participantId: 'S5', ageGroup: '35-39', sex: 'male', consentGiven: true, status: 'active' },
        { participantId: 'S6', ageGroup: '35-39', sex: 'male', consentGiven: true, status: 'active' },
      ];

      const result = service.validateKAnonymity(data, 3, ['ageGroup', 'sex']);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect k-anonymity violations (group < k)', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'S1', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S2', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S3', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S4', ageGroup: '40-44', sex: 'male', consentGiven: true, status: 'active' },
        // Only 1 person in 40-44|male group
      ];

      const result = service.validateKAnonymity(data, 3, ['ageGroup', 'sex']);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].count).toBeLessThan(3);
    });

    it('should handle empty data', () => {
      const result = service.validateKAnonymity([], 5, ['ageGroup', 'sex']);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle k=1 (always valid for non-empty groups)', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'S1', ageGroup: '30-34', sex: 'female', consentGiven: true, status: 'active' },
      ];

      const result = service.validateKAnonymity(data, 1, ['ageGroup', 'sex']);

      expect(result.valid).toBe(true);
    });

    it('should treat missing quasi-identifiers as NULL', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'S1', consentGiven: true, status: 'active' },
        { participantId: 'S2', consentGiven: true, status: 'active' },
      ];

      const result = service.validateKAnonymity(data, 2, ['ageGroup', 'sex']);

      // Both have NULL|NULL, so group size is 2 >= k=2
      expect(result.valid).toBe(true);
    });

    it('should report violation details with group key and count', () => {
      const data: IAnonymizedParticipant[] = [
        { participantId: 'S1', ageGroup: '20-24', sex: 'female', consentGiven: true, status: 'active' },
        { participantId: 'S2', ageGroup: '30-34', sex: 'male', consentGiven: true, status: 'active' },
        { participantId: 'S3', ageGroup: '30-34', sex: 'male', consentGiven: true, status: 'active' },
        { participantId: 'S4', ageGroup: '30-34', sex: 'male', consentGiven: true, status: 'active' },
      ];

      const result = service.validateKAnonymity(data, 3, ['ageGroup', 'sex']);

      expect(result.valid).toBe(false);
      const violation = result.violations.find((v) => v.group.includes('20-24'));
      expect(violation).toBeDefined();
      expect(violation!.count).toBe(1);
    });
  });

  // ==========================================================================
  // generateDataSharingStatement()
  // ==========================================================================
  describe('generateDataSharingStatement()', () => {
    it('should generate ICMJE-compliant data sharing statement', () => {
      const statement = service.generateDataSharingStatement(DEFAULT_EXPORT_CONFIG);

      expect(statement).toContain('DATA SHARING STATEMENT');
      expect(statement).toContain('ICMJE');
    });

    it('should include anonymization level in statement', () => {
      const statement = service.generateDataSharingStatement(DEFAULT_EXPORT_CONFIG);

      expect(statement).toContain(DEFAULT_EXPORT_CONFIG.level);
    });

    it('should include k-anonymity value', () => {
      const statement = service.generateDataSharingStatement(DEFAULT_EXPORT_CONFIG);

      expect(statement).toContain(`k=${DEFAULT_EXPORT_CONFIG.kAnonymity}`);
    });

    it('should include ISI scores when configured', () => {
      const config: IExportConfig = { ...DEFAULT_EXPORT_CONFIG, includeISI: true };
      const statement = service.generateDataSharingStatement(config);

      expect(statement).toContain('ISI assessment scores');
    });

    it('should include diary data when configured', () => {
      const config: IExportConfig = { ...DEFAULT_EXPORT_CONFIG, includeDiary: true };
      const statement = service.generateDataSharingStatement(config);

      expect(statement).toContain('Sleep diary metrics');
    });

    it('should include required sections (access criteria, contact, data availability)', () => {
      const statement = service.generateDataSharingStatement(DEFAULT_EXPORT_CONFIG);

      expect(statement).toContain('Access criteria');
      expect(statement).toContain('Contact');
      expect(statement).toContain('When will data be available');
      expect(statement).toContain('Data use agreement required');
      expect(statement).toContain('IRB/Ethics approval');
    });
  });

  // ==========================================================================
  // getAuditLog()
  // ==========================================================================
  describe('getAuditLog()', () => {
    it('should return empty array initially', () => {
      const log = service.getAuditLog();

      expect(log).toEqual([]);
      expect(log).toHaveLength(0);
    });

    it('should return a copy of the audit log (immutability)', () => {
      const log1 = service.getAuditLog();
      const log2 = service.getAuditLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });

    it('should accumulate entries after exports', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      // Setup mock DB to return minimal data
      mockDb.query.mockResolvedValue(mockUsers);

      await service.exportDataset({ format: 'json' }, 'admin-1');

      const log = service.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].exportedBy).toBe('admin-1');
      expect(log[0].exportId).toMatch(/^EXP-/);
      expect(log[0].checksum).toBeDefined();
      expect(log[0].timestamp).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // exportDataset()
  // ==========================================================================
  describe('exportDataset()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();

      // Setup mock DB responses based on query content
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('FROM users')) {
          return Promise.resolve(mockUsers);
        }
        if (query.includes('FROM assessments')) {
          return Promise.resolve(mockAssessments);
        }
        if (query.includes('FROM sleep_diary_entries')) {
          return Promise.resolve(mockDiaries);
        }
        if (query.includes('FROM therapy_sessions')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });
    });

    it('should export dataset in JSON format', async () => {
      const result = await service.exportDataset({ format: 'json' }, 'admin-test');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('checksum');
      expect(result).toHaveProperty('dataset');
      expect(result).toHaveProperty('auditEntry');

      // JSON should be parseable
      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('participants');
      expect(parsed).toHaveProperty('dataSharingStatement');
    });

    it('should export dataset in CSV format', async () => {
      const result = await service.exportDataset({ format: 'csv' }, 'admin-test');

      expect(result.data).toContain('# METADATA');
      expect(result.data).toContain('# PARTICIPANTS');
      expect(result.data).toContain('participant_id');
      expect(result.filename).toContain('.csv');
    });

    it('should export dataset in NDJSON format', async () => {
      const result = await service.exportDataset({ format: 'ndjson' }, 'admin-test');

      const lines = result.data.split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);

      // Each line should be valid JSON
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('type');
        expect(parsed).toHaveProperty('data');
      }

      // First line should be metadata
      const firstLine = JSON.parse(lines[0]);
      expect(firstLine.type).toBe('metadata');

      expect(result.filename).toContain('.ndjson');
    });

    it('should anonymize participant IDs (de_identified uses sequential)', async () => {
      const result = await service.exportDataset(
        { format: 'json', level: 'de_identified' },
        'admin-test'
      );

      const dataset = result.dataset;
      expect(dataset.participants[0].participantId).toMatch(/^SUBJ\d{4}$/);
      expect(dataset.participants[0].participantId).toBe('SUBJ0001');
      expect(dataset.participants[1].participantId).toBe('SUBJ0002');
    });

    it('should include metadata with correct fields', async () => {
      const result = await service.exportDataset({ format: 'json' }, 'admin-test');

      const metadata = result.dataset.metadata;
      expect(metadata.exportId).toMatch(/^EXP-/);
      expect(metadata.anonymizationLevel).toBe('de_identified');
      expect(metadata.totalParticipants).toBe(2);
      expect(metadata.kAnonymity).toBe(5);
      expect(metadata.dataVersion).toBe('1.0.0');
      expect(metadata.dateRange).toHaveProperty('start');
      expect(metadata.dateRange).toHaveProperty('end');
    });

    it('should include ISI assessments when configured', async () => {
      const result = await service.exportDataset(
        { format: 'json', includeISI: true },
        'admin-test'
      );

      expect(result.dataset.isiAssessments).toBeDefined();
      expect(result.dataset.isiAssessments!.length).toBe(2);
      expect(result.dataset.isiAssessments![0].totalScore).toBe(18);
      expect(result.dataset.isiAssessments![0].severity).toBe('moderate');
    });

    it('should include diary entries when configured', async () => {
      const result = await service.exportDataset(
        { format: 'json', includeDiary: true },
        'admin-test'
      );

      expect(result.dataset.diaryEntries).toBeDefined();
      expect(result.dataset.diaryEntries!.length).toBe(1);
      expect(result.dataset.diaryEntries![0].sleepEfficiency).toBe(91.1);
    });

    it('should generate a SHA-256 checksum', async () => {
      const result = await service.exportDataset({ format: 'json' }, 'admin-test');

      // SHA-256 hex is 64 characters
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate filename with date and export ID', async () => {
      const result = await service.exportDataset({ format: 'json' }, 'admin-test');

      expect(result.filename).toMatch(/^sleepcore_export_\d{4}-\d{2}-\d{2}_EXP-.+\.json$/);
    });

    it('should create an audit entry on export', async () => {
      const result = await service.exportDataset({ format: 'json' }, 'admin-test');

      expect(result.auditEntry.exportedBy).toBe('admin-test');
      expect(result.auditEntry.recordCount).toBe(2);
      expect(result.auditEntry.checksum).toBe(result.checksum);

      // Audit log should contain the entry
      const log = service.getAuditLog();
      expect(log).toHaveLength(1);
      expect(log[0].exportId).toBe(result.auditEntry.exportId);
    });

    it('should transform ages to 5-year ranges by default', async () => {
      const result = await service.exportDataset({ format: 'json' }, 'admin-test');

      // Birth year 1990 => age ~35 in 2025/2026 => range 35-39
      const p1 = result.dataset.participants[0];
      expect(p1.ageGroup).toMatch(/^\d+-\d+$/);
    });

    it('should use relative_days date transformation by default', async () => {
      const result = await service.exportDataset(
        { format: 'json', includeDiary: true },
        'admin-test'
      );

      if (result.dataset.diaryEntries && result.dataset.diaryEntries.length > 0) {
        expect(result.dataset.diaryEntries[0].entryDate).toMatch(/^Day \d+$/);
      }
    });

    it('should exclude diary entries when includeDiary is false', async () => {
      const result = await service.exportDataset(
        { format: 'json', includeDiary: false },
        'admin-test'
      );

      expect(result.dataset.diaryEntries).toBeUndefined();
    });

    it('should exclude ISI when includeISI is false', async () => {
      const result = await service.exportDataset(
        { format: 'json', includeISI: false },
        'admin-test'
      );

      expect(result.dataset.isiAssessments).toBeUndefined();
    });
  });

  // ==========================================================================
  // Default Config
  // ==========================================================================
  describe('Default Config', () => {
    it('should have correct default export config', () => {
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
});
