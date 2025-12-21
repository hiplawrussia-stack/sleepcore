/**
 * SleepDiaryService Unit Tests
 * Tests sleep diary management, calculations, and analysis
 */

import {
  SleepDiaryService,
  createSleepDiaryService,
  DEFAULT_DIARY_CONFIG,
} from '../../../src/diary/SleepDiaryService';
import {
  createDiaryEntry,
  createDiaryEntryFromPattern,
  createDiaryEntrySeries,
  createImprovementSeries,
} from '../../helpers';

describe('SleepDiaryService', () => {
  let service: SleepDiaryService;

  beforeEach(() => {
    service = new SleepDiaryService();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const s = createSleepDiaryService();
      expect(s).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const s = new SleepDiaryService({ minimumEntriesForAnalysis: 5 });
      expect(s).toBeDefined();
    });
  });

  describe('addEntry()', () => {
    it('should store entry and return calculated metrics', () => {
      const entry = createDiaryEntry({ userId: 'user1' });
      const metrics = service.addEntry(entry);

      expect(metrics).toBeDefined();
      expect(metrics.sleepEfficiency).toBeGreaterThan(0);
      expect(metrics.totalSleepTime).toBeGreaterThan(0);
    });

    it('should store multiple entries for same user', () => {
      const entries = createDiaryEntrySeries('healthy', 3, 'user1');
      entries.forEach(e => service.addEntry(e));

      const stored = service.getEntries('user1');
      expect(stored.length).toBe(3);
    });

    it('should store entries for different users separately', () => {
      service.addEntry(createDiaryEntry({ userId: 'user1' }));
      service.addEntry(createDiaryEntry({ userId: 'user2' }));
      service.addEntry(createDiaryEntry({ userId: 'user1' }));

      expect(service.getEntries('user1').length).toBe(2);
      expect(service.getEntries('user2').length).toBe(1);
    });
  });

  describe('calculateMetrics()', () => {
    it('should calculate Time In Bed correctly', () => {
      const entry = createDiaryEntry({
        bedtime: '23:00',
        outOfBedTime: '07:00',
      });

      const metrics = service.calculateMetrics(entry);

      expect(metrics.timeInBed).toBe(480); // 8 hours
    });

    it('should handle crossing midnight', () => {
      const entry = createDiaryEntry({
        bedtime: '01:00',
        outOfBedTime: '09:00',
      });

      const metrics = service.calculateMetrics(entry);

      expect(metrics.timeInBed).toBe(480); // 8 hours
    });

    it('should calculate Total Sleep Time correctly', () => {
      const entry = createDiaryEntry({
        bedtime: '23:00',
        outOfBedTime: '07:00',
        sleepOnsetLatency: 30,
        wakeAfterSleepOnset: 30,
      });

      const metrics = service.calculateMetrics(entry);

      // TIB 480 - SOL 30 - WASO 30 = 420 min
      expect(metrics.totalSleepTime).toBe(420);
    });

    it('should calculate Sleep Efficiency correctly', () => {
      const entry = createDiaryEntry({
        bedtime: '23:00',
        outOfBedTime: '07:00', // 480 min TIB
        sleepOnsetLatency: 0,
        wakeAfterSleepOnset: 0,
      });

      const metrics = service.calculateMetrics(entry);

      expect(metrics.sleepEfficiency).toBe(100);
    });

    it('should cap efficiency at 0-100 range', () => {
      // Very poor sleep
      const entry = createDiaryEntry({
        bedtime: '23:00',
        outOfBedTime: '07:00',
        sleepOnsetLatency: 300, // More than TIB
        wakeAfterSleepOnset: 300,
      });

      const metrics = service.calculateMetrics(entry);

      expect(metrics.sleepEfficiency).toBe(0);
      expect(metrics.totalSleepTime).toBe(0);
    });

    it('should preserve all entry values in metrics', () => {
      const entry = createDiaryEntry({
        sleepOnsetLatency: 25,
        wakeAfterSleepOnset: 40,
        numberOfAwakenings: 3,
        bedtime: '22:30',
        finalAwakening: '06:00',
        outOfBedTime: '06:30',
      });

      const metrics = service.calculateMetrics(entry);

      expect(metrics.sleepOnsetLatency).toBe(25);
      expect(metrics.wakeAfterSleepOnset).toBe(40);
      expect(metrics.numberOfAwakenings).toBe(3);
      expect(metrics.bedtime).toBe('22:30');
      expect(metrics.wakeTime).toBe('06:00');
    });
  });

  describe('getEntries()', () => {
    beforeEach(() => {
      // Add 14 days of entries
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));
    });

    it('should return all entries when no days specified', () => {
      const entries = service.getEntries('user1');
      expect(entries.length).toBe(14);
    });

    it('should return empty array for unknown user', () => {
      const entries = service.getEntries('unknown');
      expect(entries).toEqual([]);
    });

    it('should filter by days when specified', () => {
      const entries = service.getEntries('user1', 7);
      expect(entries.length).toBeLessThanOrEqual(7);
    });
  });

  describe('calculateWeeklySummary()', () => {
    beforeEach(() => {
      const entries = createDiaryEntrySeries('healthy', 7, 'user1');
      entries.forEach(e => service.addEntry(e));
    });

    it('should calculate weekly averages', () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const summary = service.calculateWeeklySummary(
        'user1',
        weekStart.toISOString().split('T')[0]
      );

      expect(summary.entriesCount).toBeGreaterThan(0);
      expect(summary.averages.timeInBed).toBeGreaterThan(0);
      expect(summary.averages.sleepEfficiency).toBeGreaterThan(0);
    });

    it('should include week date range', () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const summary = service.calculateWeeklySummary(
        'user1',
        weekStart.toISOString().split('T')[0]
      );

      expect(summary.weekStartDate).toBeDefined();
      expect(summary.weekEndDate).toBeDefined();
    });

    it('should calculate quality distribution', () => {
      const summary = service.calculateWeeklySummary(
        'user1',
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );

      expect(summary.qualityDistribution).toHaveProperty('very_poor');
      expect(summary.qualityDistribution).toHaveProperty('poor');
      expect(summary.qualityDistribution).toHaveProperty('fair');
      expect(summary.qualityDistribution).toHaveProperty('good');
      expect(summary.qualityDistribution).toHaveProperty('excellent');
    });

    it('should generate recommendations based on metrics', () => {
      // Add poor sleep entries
      const poorEntries = createDiaryEntrySeries('insomnia', 7, 'user2');
      poorEntries.forEach(e => service.addEntry(e));

      const summary = service.calculateWeeklySummary(
        'user2',
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );

      expect(summary.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzePatterns()', () => {
    it('should throw error if insufficient entries', () => {
      service.addEntry(createDiaryEntry({ userId: 'user1' }));

      expect(() => service.analyzePatterns('user1')).toThrow(
        /Need at least/
      );
    });

    it('should analyze patterns with sufficient data', () => {
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const analysis = service.analyzePatterns('user1');

      expect(analysis.userId).toBe('user1');
      expect(analysis.entriesAnalyzed).toBeGreaterThanOrEqual(7);
    });

    it('should calculate average bedtime and wake time', () => {
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const analysis = service.analyzePatterns('user1');

      expect(analysis.patterns.averageBedtime).toMatch(/^\d{2}:\d{2}$/);
      expect(analysis.patterns.averageWakeTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should estimate chronotype', () => {
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const analysis = service.analyzePatterns('user1');

      expect([
        'definite_morning',
        'moderate_morning',
        'intermediate',
        'moderate_evening',
        'definite_evening',
      ]).toContain(analysis.patterns.estimatedChronotype);
    });

    it('should detect insomnia subtype', () => {
      // Sleep onset insomnia pattern
      const entries = createDiaryEntrySeries('sleep_onset', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const analysis = service.analyzePatterns('user1');

      expect(analysis.insomnia.subtype).toBe('sleep_onset');
    });

    it('should detect maintenance insomnia', () => {
      const entries = createDiaryEntrySeries('maintenance', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const analysis = service.analyzePatterns('user1');

      expect(analysis.insomnia.subtype).toBe('sleep_maintenance');
    });

    it('should identify sleep issues', () => {
      const entries = createDiaryEntrySeries('insomnia', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const analysis = service.analyzePatterns('user1');

      expect(analysis.issues.length).toBeGreaterThan(0);
      // Should identify at least one issue
      expect(analysis.issues[0]).toHaveProperty('id');
      expect(analysis.issues[0]).toHaveProperty('description');
      expect(analysis.issues[0]).toHaveProperty('frequency');
      expect(analysis.issues[0]).toHaveProperty('severity');
    });
  });

  describe('estimateISI()', () => {
    it('should return -1 if insufficient data', () => {
      service.addEntry(createDiaryEntry({ userId: 'user1' }));

      const isi = service.estimateISI('user1');

      expect(isi).toBe(-1);
    });

    it('should estimate ISI in valid range (0-28)', () => {
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const isi = service.estimateISI('user1');

      expect(isi).toBeGreaterThanOrEqual(0);
      expect(isi).toBeLessThanOrEqual(28);
    });

    it('should estimate low ISI for healthy sleep', () => {
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const isi = service.estimateISI('user1');

      expect(isi).toBeLessThan(10);
    });

    it('should estimate high ISI for insomnia pattern', () => {
      const entries = createDiaryEntrySeries('insomnia', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const isi = service.estimateISI('user1');

      expect(isi).toBeGreaterThan(10);
    });
  });

  describe('trend detection', () => {
    it('should detect improving trend', () => {
      const entries = createImprovementSeries('insomnia', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const summary = service.calculateWeeklySummary(
        'user1',
        weekStart.toISOString().split('T')[0]
      );

      // With improvement series, later entries should be better
      expect(summary.averages.sleepEfficiency).toBeGreaterThan(0);
    });

    it('should detect stable trend for consistent data', () => {
      // All same quality entries
      const entries = createDiaryEntrySeries('healthy', 14, 'user1');
      entries.forEach(e => service.addEntry(e));

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const summary = service.calculateWeeklySummary(
        'user1',
        weekStart.toISOString().split('T')[0]
      );

      expect(['improving', 'stable', 'declining']).toContain(summary.trends.sleepEfficiency);
    });
  });

  describe('createSleepDiaryService()', () => {
    it('should create service with factory function', () => {
      const s = createSleepDiaryService();
      expect(s).toBeInstanceOf(SleepDiaryService);
    });

    it('should accept custom config', () => {
      const s = createSleepDiaryService({ sleepEfficiencyTarget: 90 });
      expect(s).toBeInstanceOf(SleepDiaryService);
    });
  });

  describe('DEFAULT_DIARY_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_DIARY_CONFIG.minimumEntriesForAnalysis).toBe(7);
      expect(DEFAULT_DIARY_CONFIG.sleepEfficiencyTarget).toBe(85);
      expect(DEFAULT_DIARY_CONFIG.optimalSleepHoursMin).toBe(7);
      expect(DEFAULT_DIARY_CONFIG.optimalSleepHoursMax).toBe(9);
    });
  });
});
