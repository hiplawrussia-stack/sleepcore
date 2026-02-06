/**
 * CognitiveProgressReportService Tests (Wave 2)
 * ===============================================
 *
 * Unit tests for DBAS-16-inspired cognitive progress monitoring:
 * snapshot recording, weekly report generation, belief change analysis,
 * field trends, overall progress, Russian summaries, and recommendations.
 *
 * Clinical references tested:
 * - DBAS-16 cutoff: 3.8 (Morin et al., 2007)
 * - Clinically significant change: 1.0 (configurable; Morin 2007 did not
 *   formally establish MCID — this threshold follows clinical practice)
 * - 5 tracked beliefs mapped to 4 DBAS domains
 * - Belief change: frequency-based (>0.3 threshold for "active")
 *
 * Edinger & Carney (2015): session-by-session belief monitoring rationale
 * Lancee et al. (2015): DBAS mediates insomnia severity change
 */

import {
  CognitiveProgressReportService,
  createCognitiveProgressReportService,
  cognitiveProgressReportService,
  DEFAULT_COGNITIVE_PROGRESS_CONFIG,
  type IBeliefSnapshot,
  type ICognitiveProgressReport,
  type BeliefDomain,
  type TrackedBelief,
  type BeliefChangeDirection,
} from '../CognitiveProgressReportService';
import type { ISleepState } from '../../../sleep/interfaces/ISleepState';

describe('CognitiveProgressReportService', () => {
  let service: CognitiveProgressReportService;

  beforeEach(() => {
    service = createCognitiveProgressReportService();
  });

  // ==================== Configuration ====================

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.dbasClinicalCutoff).toBe(3.8);
      expect(config.clinicallySignificantChange).toBe(1.0);
      expect(config.minSnapshotsForTrend).toBe(3);
    });

    it('should allow custom configuration', () => {
      const custom = createCognitiveProgressReportService({
        dbasClinicalCutoff: 4.0,
        clinicallySignificantChange: 1.5,
        minSnapshotsForTrend: 5,
      });
      const config = custom.getConfig();
      expect(config.dbasClinicalCutoff).toBe(4.0);
      expect(config.clinicallySignificantChange).toBe(1.5);
      expect(config.minSnapshotsForTrend).toBe(5);
      expect(config.enabled).toBe(true); // default preserved
    });

    it('should match Morin 2007 DBAS-16 clinical cutoff', () => {
      expect(DEFAULT_COGNITIVE_PROGRESS_CONFIG.dbasClinicalCutoff).toBe(3.8);
    });
  });

  // ==================== Snapshot Recording ====================

  describe('Snapshot Recording', () => {
    it('should record a snapshot from sleep state', () => {
      const state = createMockSleepState('2024-01-01', {
        dbasScore: 5.2,
        sleepAnxiety: 0.6,
        sleepSelfEfficacy: 0.4,
        preSleepArousal: 0.7,
        beliefs: allBeliefsActive(),
      });

      const snapshot = service.recordSnapshot('user1', state);
      expect(snapshot.date).toBe('2024-01-01');
      expect(snapshot.dbasScore).toBe(5.2);
      expect(snapshot.sleepAnxiety).toBe(0.6);
      expect(snapshot.sleepSelfEfficacy).toBe(0.4);
      expect(snapshot.preSleepArousal).toBe(0.7);
      expect(snapshot.activeBeliefs).toHaveLength(5);
    });

    it('should extract only active beliefs', () => {
      const state = createMockSleepState('2024-01-01', {
        dbasScore: 4.0,
        beliefs: {
          unrealisticExpectations: true,
          catastrophizing: false,
          helplessness: true,
          effortfulSleep: false,
          healthWorries: false,
        },
      });

      const snapshot = service.recordSnapshot('user1', state);
      expect(snapshot.activeBeliefs).toEqual(['unrealisticExpectations', 'helplessness']);
    });

    it('should record no active beliefs when all false', () => {
      const state = createMockSleepState('2024-01-01', {
        dbasScore: 2.0,
        beliefs: allBeliefsFalse(),
      });

      const snapshot = service.recordSnapshot('user1', state);
      expect(snapshot.activeBeliefs).toEqual([]);
    });

    it('should accumulate snapshots in history', () => {
      service.recordSnapshot('user1', createMockSleepState('2024-01-01'));
      service.recordSnapshot('user1', createMockSleepState('2024-01-02'));
      service.recordSnapshot('user1', createMockSleepState('2024-01-03'));

      expect(service.getSnapshotHistory('user1')).toHaveLength(3);
    });

    it('should separate snapshots by user', () => {
      service.recordSnapshot('user1', createMockSleepState('2024-01-01'));
      service.recordSnapshot('user2', createMockSleepState('2024-01-01'));

      expect(service.getSnapshotHistory('user1')).toHaveLength(1);
      expect(service.getSnapshotHistory('user2')).toHaveLength(1);
    });
  });

  // ==================== Bulk Recording ====================

  describe('Bulk Recording', () => {
    it('should record from sleep history array', () => {
      const history = createSleepHistory(5);
      service.recordFromHistory('user1', history);
      expect(service.getSnapshotHistory('user1')).toHaveLength(5);
    });
  });

  // ==================== Report Generation ====================

  describe('Weekly Report Generation', () => {
    it('should return null with fewer than 3 sleep states', () => {
      const history = createSleepHistory(2);
      const report = service.generateWeeklyReport('user1', history, 1);
      expect(report).toBeNull();
    });

    it('should return null with fewer snapshots than minSnapshotsForTrend', () => {
      const customService = createCognitiveProgressReportService({
        minSnapshotsForTrend: 10,
      });
      const history = createSleepHistory(5);
      const report = customService.generateWeeklyReport('user1', history, 1);
      expect(report).toBeNull();
    });

    it('should generate report with sufficient data', () => {
      const history = createSleepHistory(7);
      const report = service.generateWeeklyReport('user1', history, 2);

      expect(report).not.toBeNull();
      expect(report!.userId).toBe('user1');
      expect(report!.weekNumber).toBe(2);
      expect(report!.periodStart).toBeDefined();
      expect(report!.periodEnd).toBeDefined();
    });

    it('should calculate DBAS change from baseline to current', () => {
      // Baseline: high DBAS, then improvement
      const history: ISleepState[] = [];
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, { dbasScore: 6.0 }));
      }
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-${i + 6}`, { dbasScore: 3.0 }));
      }

      const report = service.generateWeeklyReport('user1', history, 3);
      expect(report).not.toBeNull();
      expect(report!.dbasChange).toBeLessThan(0); // improvement
      expect(report!.baselineDbas).toBeGreaterThan(report!.currentDbas);
    });

    it('should detect clinically significant change (>=1.0)', () => {
      const history: ISleepState[] = [];
      // 7 baseline + 7 recent = no overlap in windows
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, { dbasScore: 5.5 }));
      }
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, { dbasScore: 3.5 }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report).not.toBeNull();
      expect(report!.isClinicallySigChange).toBe(true);
    });

    it('should not flag clinically significant change for small differences', () => {
      const history = createSleepHistory(7, { dbasScore: 4.0 }); // all same
      const report = service.generateWeeklyReport('user1', history, 1);

      expect(report).not.toBeNull();
      expect(report!.isClinicallySigChange).toBe(false);
    });

    it('should round DBAS values to 1 decimal', () => {
      const history = createSleepHistory(7, { dbasScore: 4.333 });
      const report = service.generateWeeklyReport('user1', history, 1);

      expect(report).not.toBeNull();
      expect(report!.currentDbas).toBe(4.3);
      expect(report!.baselineDbas).toBe(4.3);
    });

    it('should auto-record snapshots if not yet recorded', () => {
      const history = createSleepHistory(7);
      // No manual recordSnapshot calls
      const report = service.generateWeeklyReport('user1', history, 1);
      expect(report).not.toBeNull();
      // Snapshots should be recorded now
      expect(service.getSnapshotHistory('user1').length).toBeGreaterThanOrEqual(7);
    });
  });

  // ==================== Belief Change Analysis ====================

  describe('Belief Change Analysis', () => {
    it('should detect improved belief (was active, now inactive)', () => {
      const history: ISleepState[] = [];
      // 7 baseline + 7 recent = clean separation (no overlap)
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
          dbasScore: 5.0,
          beliefs: { ...allBeliefsFalse(), catastrophizing: true },
        }));
      }
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, {
          dbasScore: 3.0,
          beliefs: allBeliefsFalse(),
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report).not.toBeNull();

      const catChange = report!.beliefChanges.find(c => c.belief === 'catastrophizing');
      expect(catChange).toBeDefined();
      expect(catChange!.direction).toBe('improved');
      expect(catChange!.wasActive).toBe(true);
      expect(catChange!.isActive).toBe(false);
    });

    it('should detect worsened belief (was inactive, now active)', () => {
      const history: ISleepState[] = [];
      // 7 baseline + 7 recent = clean separation
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
          dbasScore: 3.0,
          beliefs: allBeliefsFalse(),
        }));
      }
      // Recent: helplessness now active
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, {
          dbasScore: 4.5,
          beliefs: { ...allBeliefsFalse(), helplessness: true },
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      const helpChange = report!.beliefChanges.find(c => c.belief === 'helplessness');
      expect(helpChange).toBeDefined();
      expect(helpChange!.direction).toBe('worsened');
      expect(helpChange!.wasActive).toBe(false);
      expect(helpChange!.isActive).toBe(true);
    });

    it('should report unchanged when belief status remains the same', () => {
      const history: ISleepState[] = [];
      // All: unrealisticExpectations active throughout
      for (let i = 0; i < 8; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 4.5,
          beliefs: { ...allBeliefsFalse(), unrealisticExpectations: true },
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      const unrChange = report!.beliefChanges.find(c => c.belief === 'unrealisticExpectations');
      expect(unrChange).toBeDefined();
      expect(unrChange!.direction).toBe('unchanged');
    });

    it('should have Russian names for all belief changes', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 8; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 4.5,
          beliefs: allBeliefsActive(),
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 1);
      for (const change of report!.beliefChanges) {
        expect(change.nameRu).toBeDefined();
        expect(change.nameRu.length).toBeGreaterThan(0);
      }
    });

    it('should only include beliefs that were ever active (>0.3 frequency)', () => {
      // No beliefs active at all
      const history = createSleepHistory(8, {
        dbasScore: 2.0,
        beliefs: allBeliefsFalse(),
      });

      const report = service.generateWeeklyReport('user1', history, 1);
      expect(report!.beliefChanges).toHaveLength(0);
    });
  });

  // ==================== Field Trends ====================

  describe('Field Trends', () => {
    it('should detect improving self-efficacy trend (higherIsBetter)', () => {
      const history: ISleepState[] = [];
      // First half: low self-efficacy
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          sleepSelfEfficacy: 0.3,
        }));
      }
      // Second half: high self-efficacy
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          sleepSelfEfficacy: 0.8,
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.selfEfficacyTrend).toBe('improving');
    });

    it('should detect declining self-efficacy trend', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          sleepSelfEfficacy: 0.8,
        }));
      }
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          sleepSelfEfficacy: 0.3,
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.selfEfficacyTrend).toBe('declining');
    });

    it('should detect improving arousal trend (lower is better)', () => {
      const history: ISleepState[] = [];
      // First half: high arousal
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          preSleepArousal: 0.8,
        }));
      }
      // Second half: low arousal (improvement)
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          preSleepArousal: 0.2,
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.arousalTrend).toBe('improving');
    });

    it('should detect worsening arousal trend (higher is worse)', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          preSleepArousal: 0.2,
        }));
      }
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          preSleepArousal: 0.8,
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.arousalTrend).toBe('worsening');
    });

    it('should report stable trends when change < threshold (0.1)', () => {
      const history = createSleepHistory(8, {
        sleepSelfEfficacy: 0.5,
        preSleepArousal: 0.5,
      });

      const report = service.generateWeeklyReport('user1', history, 1);
      expect(report!.selfEfficacyTrend).toBe('stable');
      expect(report!.arousalTrend).toBe('stable');
    });
  });

  // ==================== Overall Progress ====================

  describe('Overall Progress Assessment', () => {
    it('should assess excellent progress (clinically sig + DBAS down + SE improving)', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 6.0,
          sleepSelfEfficacy: 0.3,
          beliefs: allBeliefsActive(),
        }));
      }
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-${i + 6}`, {
          dbasScore: 3.0,
          sleepSelfEfficacy: 0.8,
          beliefs: allBeliefsFalse(),
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 3);
      expect(report!.overallProgress).toBe('excellent');
    });

    it('should assess good progress (DBAS drop > 0.5 or 2+ improved beliefs)', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 5.0,
          beliefs: { ...allBeliefsFalse(), catastrophizing: true, helplessness: true },
        }));
      }
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-${i + 6}`, {
          dbasScore: 4.3, // drop of 0.7 > 0.5
          beliefs: allBeliefsFalse(),
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.overallProgress).toBe('good');
    });

    it('should assess none when no improvement', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 3.0,
          beliefs: allBeliefsFalse(),
        }));
      }
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          dbasScore: 3.5, // slight worsening
          beliefs: { ...allBeliefsFalse(), helplessness: true },
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(['minimal', 'none']).toContain(report!.overallProgress);
    });
  });

  // ==================== Russian Summary ====================

  describe('Russian Summary Generation', () => {
    it('should include normal range message when DBAS < 3.8', () => {
      const history = createSleepHistory(7, { dbasScore: 3.0 });
      const report = service.generateWeeklyReport('user1', history, 1);

      expect(report!.summaryRu).toContain('нормальном диапазоне');
    });

    it('should include DBAS score when above cutoff', () => {
      const history = createSleepHistory(7, { dbasScore: 5.0 });
      const report = service.generateWeeklyReport('user1', history, 1);

      expect(report!.summaryRu).toContain('дисфункциональных убеждений');
      expect(report!.summaryRu).toContain('3.8'); // cutoff mentioned
    });

    it('should include clinically significant improvement message', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, { dbasScore: 6.0 }));
      }
      for (let i = 0; i < 5; i++) {
        history.push(createMockSleepState(`2024-01-${i + 6}`, { dbasScore: 3.5 }));
      }

      const report = service.generateWeeklyReport('user1', history, 3);
      expect(report!.summaryRu).toContain('клинически значимое улучшение');
    });

    it('should include progress assessment label', () => {
      const history = createSleepHistory(7, { dbasScore: 4.0 });
      const report = service.generateWeeklyReport('user1', history, 1);

      // Should contain one of the progress labels
      const progressLabels = ['отличный', 'Хороший', 'Умеренный', 'Минимальные', 'без существенных'];
      const containsLabel = progressLabels.some(l => report!.summaryRu.includes(l));
      expect(containsLabel).toBe(true);
    });
  });

  // ==================== Recommendations ====================

  describe('Recommendations', () => {
    it('should recommend cognitive restructuring for high DBAS', () => {
      const history = createSleepHistory(7, { dbasScore: 5.0 });
      const report = service.generateWeeklyReport('user1', history, 1);

      expect(report!.recommendations.some(r =>
        r.includes('когнитивной реструктуризации')
      )).toBe(true);
    });

    it('should recommend for declining self-efficacy', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 4.0,
          sleepSelfEfficacy: 0.8,
        }));
      }
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          dbasScore: 4.0,
          sleepSelfEfficacy: 0.2,
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.recommendations.some(r =>
        r.includes('уверенность') || r.includes('успех')
      )).toBe(true);
    });

    it('should recommend relaxation for worsening arousal', () => {
      const history: ISleepState[] = [];
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 4.0,
          preSleepArousal: 0.2,
        }));
      }
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          dbasScore: 4.0,
          preSleepArousal: 0.8,
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.recommendations.some(r =>
        r.includes('релаксации') || r.includes('осознанность')
      )).toBe(true);
    });

    it('should recommend stability when everything is stable', () => {
      const history = createSleepHistory(7, {
        dbasScore: 2.5, // below cutoff
        sleepSelfEfficacy: 0.7,
        preSleepArousal: 0.3,
        beliefs: allBeliefsFalse(),
      });

      const report = service.generateWeeklyReport('user1', history, 1);
      expect(report!.recommendations.some(r =>
        r.includes('стабильны') || r.includes('Продолжайте')
      )).toBe(true);
    });

    it('should include specific advice for catastrophizing worsening', () => {
      const history: ISleepState[] = [];
      // 7 baseline + 7 recent = clean separation
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
          dbasScore: 4.5,
          beliefs: allBeliefsFalse(),
        }));
      }
      for (let i = 0; i < 7; i++) {
        history.push(createMockSleepState(`2024-01-${String(i + 8).padStart(2, '0')}`, {
          dbasScore: 5.0,
          beliefs: { ...allBeliefsFalse(), catastrophizing: true },
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.recommendations.some(r =>
        r.includes('декатастрофизации') || r.includes('худшее')
      )).toBe(true);
    });

    it('should limit recommendations to 4', () => {
      // Trigger many recommendation paths
      const history: ISleepState[] = [];
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 1}`, {
          dbasScore: 6.0,
          sleepSelfEfficacy: 0.9,
          preSleepArousal: 0.1,
          beliefs: allBeliefsFalse(),
        }));
      }
      for (let i = 0; i < 4; i++) {
        history.push(createMockSleepState(`2024-01-0${i + 5}`, {
          dbasScore: 7.0,
          sleepSelfEfficacy: 0.1,
          preSleepArousal: 0.9,
          beliefs: allBeliefsActive(),
        }));
      }

      const report = service.generateWeeklyReport('user1', history, 2);
      expect(report!.recommendations.length).toBeLessThanOrEqual(4);
    });
  });

  // ==================== DBAS Trend ====================

  describe('DBAS Trend', () => {
    it('should return empty trend for unknown user', () => {
      const trend = service.getDbasTrend('unknown');
      expect(trend.dates).toEqual([]);
      expect(trend.scores).toEqual([]);
      expect(trend.belowCutoff).toBe(false);
    });

    it('should track DBAS scores over time', () => {
      const states = [
        createMockSleepState('2024-01-01', { dbasScore: 5.0 }),
        createMockSleepState('2024-01-02', { dbasScore: 4.5 }),
        createMockSleepState('2024-01-03', { dbasScore: 3.5 }),
      ];

      for (const s of states) {
        service.recordSnapshot('user1', s);
      }

      const trend = service.getDbasTrend('user1');
      expect(trend.dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
      expect(trend.scores).toEqual([5.0, 4.5, 3.5]);
      expect(trend.belowCutoff).toBe(true); // 3.5 < 3.8
    });

    it('should report not below cutoff when latest >= 3.8', () => {
      service.recordSnapshot('user1', createMockSleepState('2024-01-01', { dbasScore: 4.0 }));
      const trend = service.getDbasTrend('user1');
      expect(trend.belowCutoff).toBe(false);
    });
  });

  // ==================== Most Problematic Beliefs ====================

  describe('Most Problematic Beliefs', () => {
    it('should return empty for unknown user', () => {
      expect(service.getMostProblematicBeliefs('unknown')).toEqual([]);
    });

    it('should rank beliefs by frequency', () => {
      // Record 10 snapshots: catastrophizing in all, helplessness in 5
      for (let i = 0; i < 10; i++) {
        const beliefs = {
          ...allBeliefsFalse(),
          catastrophizing: true,
          helplessness: i < 5,
        };
        service.recordSnapshot('user1', createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
          dbasScore: 4.5,
          beliefs,
        }));
      }

      const problematic = service.getMostProblematicBeliefs('user1');
      expect(problematic.length).toBeGreaterThanOrEqual(1);
      expect(problematic[0].belief).toBe('catastrophizing');
      expect(problematic[0].frequency).toBe(1.0); // 10/10
    });

    it('should include Russian name and domain', () => {
      service.recordSnapshot('user1', createMockSleepState('2024-01-01', {
        dbasScore: 5.0,
        beliefs: { ...allBeliefsFalse(), healthWorries: true },
      }));

      const problematic = service.getMostProblematicBeliefs('user1');
      expect(problematic[0].nameRu).toBe('Беспокойство о влиянии на здоровье');
      expect(problematic[0].domain).toBe('consequences');
    });

    it('should use only last 14 snapshots', () => {
      // Record 20 snapshots: catastrophizing only in first 6, helplessness in all
      for (let i = 0; i < 20; i++) {
        const beliefs = {
          ...allBeliefsFalse(),
          catastrophizing: i < 6, // only first 6 — outside last 14 window
          helplessness: true,
        };
        service.recordSnapshot('user1', createMockSleepState(`2024-01-${String(i + 1).padStart(2, '0')}`, {
          dbasScore: 4.5,
          beliefs,
        }));
      }

      const problematic = service.getMostProblematicBeliefs('user1');
      // Last 14 snapshots are indices 6-19
      // catastrophizing active only in indices 0-5 (outside window)
      // helplessness active in all 14
      expect(problematic[0].belief).toBe('helplessness');
    });
  });

  // ==================== History and Reset ====================

  describe('History and Reset', () => {
    it('should return empty history for unknown user', () => {
      expect(service.getSnapshotHistory('unknown')).toEqual([]);
    });

    it('should reset user data', () => {
      service.recordSnapshot('user1', createMockSleepState('2024-01-01'));
      expect(service.getSnapshotHistory('user1')).toHaveLength(1);

      service.resetUserData('user1');
      expect(service.getSnapshotHistory('user1')).toEqual([]);
    });

    it('should not affect other users on reset', () => {
      service.recordSnapshot('user1', createMockSleepState('2024-01-01'));
      service.recordSnapshot('user2', createMockSleepState('2024-01-01'));

      service.resetUserData('user1');
      expect(service.getSnapshotHistory('user1')).toEqual([]);
      expect(service.getSnapshotHistory('user2')).toHaveLength(1);
    });
  });

  // ==================== Singleton ====================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(cognitiveProgressReportService).toBeDefined();
      expect(cognitiveProgressReportService).toBeInstanceOf(CognitiveProgressReportService);
    });
  });
});

// ==================== Test Helpers ====================

function allBeliefsFalse() {
  return {
    unrealisticExpectations: false,
    catastrophizing: false,
    helplessness: false,
    effortfulSleep: false,
    healthWorries: false,
  };
}

function allBeliefsActive() {
  return {
    unrealisticExpectations: true,
    catastrophizing: true,
    helplessness: true,
    effortfulSleep: true,
    healthWorries: true,
  };
}

interface CognitionOverrides {
  dbasScore?: number;
  sleepAnxiety?: number;
  sleepSelfEfficacy?: number;
  preSleepArousal?: number;
  beliefs?: {
    unrealisticExpectations: boolean;
    catastrophizing: boolean;
    helplessness: boolean;
    effortfulSleep: boolean;
    healthWorries: boolean;
  };
}

function createMockSleepState(
  date: string,
  overrides: CognitionOverrides = {}
): ISleepState {
  return {
    date,
    userId: 'test',
    timestamp: new Date(date),
    metrics: {
      sleepOnsetLatency: 25,
      wakeAfterSleepOnset: 30,
      totalSleepTime: 360,
      timeInBed: 480,
      sleepEfficiency: 75,
      numberOfAwakenings: 2,
      bedtime: '23:00',
      wakeTime: '07:00',
      finalAwakening: '06:45',
      outOfBedTime: '07:00',
    },
    cognitions: {
      dbasScore: overrides.dbasScore ?? 4.0,
      beliefs: overrides.beliefs ?? allBeliefsFalse(),
      sleepAnxiety: overrides.sleepAnxiety ?? 0.5,
      preSleepArousal: overrides.preSleepArousal ?? 0.5,
      sleepSelfEfficacy: overrides.sleepSelfEfficacy ?? 0.5,
    },
    behaviors: {
      caffeine: { dailyMg: 200, lastIntakeTime: '14:00', hoursBeforeBed: 9 },
      alcohol: { drinksToday: 0, lastDrinkTime: '' },
      screenTimeBeforeBed: 30,
      exercise: { didExercise: true, durationMinutes: 30, hoursBeforeBed: 6 },
      naps: { count: 0, totalMinutes: 0, lastNapTime: '' },
      environment: { temperatureCelsius: 20, isQuiet: true, isDark: true, isComfortable: true },
    },
    circadian: {
      chronotype: 'intermediate',
      circadianPhase: 0,
      phaseDeviation: 0,
      lightExposure: 60,
      estimatedMelatoninOnset: '22:00',
      socialJetLag: 0.5,
      isStable: true,
    },
    homeostasis: {
      sleepDebt: -1,
      debtDuration: 3,
      homeostaticPressure: 0.5,
      optimalSleepDuration: 7.5,
      isRecoverable: true,
    },
    insomnia: {
      isiScore: 15,
      severity: 'moderate',
      subtype: 'sleep_onset',
      durationWeeks: 12,
      daytimeImpact: 0.5,
      sleepDistress: 0.5,
    },
    subjectiveQuality: 'fair',
    morningAlertness: 0.5,
    daytimeSleepiness: 0.4,
    sleepHealthScore: 55,
    trend: 'stable',
    dataQuality: 0.8,
    source: 'diary',
  } as ISleepState;
}

function createSleepHistory(
  days: number,
  overrides: CognitionOverrides = {}
): ISleepState[] {
  const history: ISleepState[] = [];
  for (let i = 0; i < days; i++) {
    const day = String(i + 1).padStart(2, '0');
    history.push(createMockSleepState(`2024-01-${day}`, overrides));
  }
  return history;
}
