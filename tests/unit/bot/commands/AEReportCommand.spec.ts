/**
 * AEReportCommand Unit Tests
 * ==========================
 * Tests for /aereport command - adverse event self-reporting.
 *
 * Coverage targets: >90% for IEC 62304 Class C compliance
 */

import { AEReportCommand } from '../../../../src/bot/commands/AEReportCommand';
import {
  createMockContext,
  createMockContextNoSession,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock AdverseEventService
const mockProcessPatientReport = jest.fn();

jest.mock('../../../../src/bot/services/AdverseEventService', () => ({
  createAdverseEventService: jest.fn().mockReturnValue({
    submitReport: jest.fn().mockResolvedValue({
      id: 'ae-123',
      submitted: true,
      timestamp: new Date(),
    }),
    processPatientReport: (...args: unknown[]) => mockProcessPatientReport(...args),
    getCategories: jest.fn().mockReturnValue([
      { id: 'mood', name: 'Mood changes' },
      { id: 'sleep', name: 'Sleep problems' },
      { id: 'fatigue', name: 'Fatigue' },
    ]),
    checkSeriousness: jest.fn().mockReturnValue({
      isSerious: false,
      criteria: [],
    }),
  }),
  DTX_AE_CATEGORIES: {
    SYMPTOM_DETERIORATION: {
      code: 'DTX001',
      term: 'Insomnia symptom deterioration',
      meddraSOC: 'Psychiatric disorders',
      description: 'ISI score increase >=7 points from baseline',
    },
    ANXIETY_INCREASE: {
      code: 'DTX002',
      term: 'Anxiety increase',
      meddraSOC: 'Psychiatric disorders',
      description: 'Increased anxiety related to sleep restriction or therapy',
    },
    FRUSTRATION: {
      code: 'DTX003',
      term: 'Treatment-related frustration',
      meddraSOC: 'Psychiatric disorders',
      description: 'Significant frustration with therapy demands',
    },
    EXCESSIVE_DAYTIME_SLEEPINESS: {
      code: 'DTX005',
      term: 'Excessive daytime sleepiness',
      meddraSOC: 'Nervous system disorders',
      description: 'Daytime sleepiness from sleep restriction',
    },
    FATIGUE: {
      code: 'DTX006',
      term: 'Fatigue',
      meddraSOC: 'General disorders',
      description: 'Fatigue during sleep restriction',
    },
    HEADACHE: {
      code: 'DTX007',
      term: 'Headache',
      meddraSOC: 'Nervous system disorders',
      description: 'Headache related to sleep changes',
    },
    DIZZINESS: {
      code: 'DTX008',
      term: 'Dizziness',
      meddraSOC: 'Nervous system disorders',
      description: 'Dizziness related to sleep restriction',
    },
    ACCIDENT_INJURY: {
      code: 'DTX009',
      term: 'Accident or injury',
      meddraSOC: 'Injury',
      description: 'Accident or injury related to sleepiness',
    },
    OTHER: {
      code: 'DTX099',
      term: 'Other',
      meddraSOC: 'General',
      description: 'Other adverse event',
    },
  },
}));

describe('AEReportCommand', () => {
  let command: AEReportCommand;

  beforeEach(() => {
    command = new AEReportCommand();
    jest.clearAllMocks();
    mockProcessPatientReport.mockResolvedValue({
      id: 'ae-456',
      submitted: true,
      alertGenerated: false,
      isSerious: false,
      timestamp: new Date(),
    });
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('aereport');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('проблем');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('ae');
      expect(command.aliases).toContain('problem');
      expect(command.aliases).toContain('sideeffect');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });

    it('should have conversation steps', () => {
      expect(command.steps).toContain('intro');
      expect(command.steps).toContain('category');
      expect(command.steps).toContain('severity');
      expect(command.steps).toContain('onset');
      expect(command.steps).toContain('description');
      expect(command.steps).toContain('serious_check');
      expect(command.steps).toContain('confirm');
      expect(command.steps).toContain('submitted');
    });
  });

  describe('execute()', () => {
    it('should show intro when session exists', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
    });

    it('should contain intro content with user greeting', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.execute(ctx);

      assertContainsText(result, 'Сообщение о проблеме');
    });

    it('should have start and cancel buttons', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.execute(ctx);

      assertHasKeyboard(result, 2);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.callbackData === 'aereport:start')).toBe(true);
      expect(buttons.some(b => b.callbackData === 'aereport:cancel')).toBe(true);
    });
  });

  describe('handleStep()', () => {
    it('should handle intro step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'intro', {});

      assertSuccessWithMessage(result);
    });

    it('should handle category step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'category', { step: 'category' });

      expect(result).toBeDefined();
    });

    it('should handle severity step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'severity', {
        step: 'severity',
        category: 'mood',
      });

      expect(result).toBeDefined();
    });

    it('should handle onset step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'onset', {
        step: 'onset',
        category: 'mood',
        severity: 'mild',
      });

      expect(result).toBeDefined();
    });

    it('should handle description step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'description', {
        step: 'description',
        category: 'mood',
        severity: 'mild',
        onset: '2024-01-01',
      });

      expect(result).toBeDefined();
    });

    it('should handle serious_check step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'serious_check', {
        step: 'serious_check',
        category: 'mood',
        severity: 'moderate',
        onset: '2024-01-01',
        description: 'Test description',
      });

      expect(result).toBeDefined();
    });

    it('should handle confirm step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'confirm', {
        step: 'confirm',
        category: 'mood',
        severity: 'mild',
        onset: '2024-01-01',
        description: 'Test description',
        seriousCheck: 'no',
      });

      expect(result).toBeDefined();
    });

    it('should default to intro for unknown step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleStep(ctx, 'unknown', {});

      assertSuccessWithMessage(result);
    });
  });

  describe('handleCallback()', () => {
    it('should handle category selection', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:category:mood', {});

      expect(result).toBeDefined();
    });

    it('should handle severity selection', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:severity:mild', { category: 'mood' });

      expect(result).toBeDefined();
    });

    it('should handle confirm callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:confirm', {
        category: 'mood',
        severity: 'mild',
        onset: '2024-01-01',
        description: 'Test',
      });

      expect(result).toBeDefined();
    });

    it('should handle cancel callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:cancel', {});

      expect(result).toBeDefined();
    });

    // Onset callbacks
    it('should handle onset:today callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:onset:today', {
        category: 'SYMPTOM_DETERIORATION',
        severity: 'mild',
      });

      assertSuccessWithMessage(result);
      // Should proceed to description step
      expect(result.metadata).toHaveProperty('step', 'description');
    });

    it('should handle onset:yesterday callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:onset:yesterday', {
        category: 'ANXIETY_INCREASE',
        severity: 'moderate',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'description');
    });

    it('should handle onset:this_week callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:onset:this_week', {
        category: 'FATIGUE',
        severity: 'mild',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'description');
    });

    it('should handle onset:earlier callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:onset:earlier', {
        category: 'HEADACHE',
        severity: 'severe',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'description');
    });

    // Skip description callback
    it('should handle skip_description callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:skip_description', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      assertSuccessWithMessage(result);
      // Should proceed to serious_check step
      expect(result.metadata).toHaveProperty('step', 'serious_check');
    });

    // Serious check callbacks
    it('should handle serious:no callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
        description: 'Test',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'confirm');
    });

    it('should handle serious:outpatient callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:outpatient', {
        category: 'HEADACHE',
        severity: 'moderate',
        onset: 'yesterday',
        description: '',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'confirm');
    });

    it('should handle serious:hospitalized callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:hospitalized', {
        category: 'ACCIDENT_INJURY',
        severity: 'severe',
        onset: 'today',
        description: 'Fall',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'confirm');
    });

    it('should handle serious:emergency callback', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:emergency', {
        category: 'ACCIDENT_INJURY',
        severity: 'severe',
        onset: 'today',
        description: 'Car accident',
      });

      assertSuccessWithMessage(result);
      expect(result.metadata).toHaveProperty('step', 'confirm');
    });

    // Start callback
    it('should handle start callback to show categories', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:start', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Тип проблемы');
    });

    // Default callback
    it('should default to intro for unknown action', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:unknown_action', {});

      assertSuccessWithMessage(result);
    });
  });

  // ==================== submitReport() ====================

  describe('submitReport() via ae:confirm callback', () => {
    it('should submit non-serious report successfully', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-789',
        submitted: true,
        isSerious: false,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
        description: 'Some fatigue',
        seriousCheck: 'no',
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'AE-');
      // Non-serious should NOT contain priority text
      expect(result.message).not.toContain('приоритетном');
    });

    it('should submit serious report with priority notice', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-serious-001',
        submitted: true,
        isSerious: true,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:confirm', {
        category: 'ACCIDENT_INJURY',
        severity: 'severe',
        onset: 'today',
        description: 'Car accident due to sleepiness',
        seriousCheck: 'emergency',
      });

      assertSuccessWithMessage(result);
      assertContainsText(result, 'приоритетном порядке');
      assertContainsText(result, 'AE-');
    });

    it('should calculate week number from session startDate', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-week',
        submitted: true,
        isSerious: false,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      // Set session with startDate 14 days ago (week 2)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        startDate,
      });

      await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      expect(mockProcessPatientReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ currentWeek: 2 })
      );
    });

    it('should set weekNumber undefined when session has no startDate', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-nostart',
        submitted: true,
        isSerious: false,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue({
        userId: 'test-user',
        startDate: null,
      });

      await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      expect(mockProcessPatientReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ currentWeek: undefined })
      );
    });

    it('should set weekNumber undefined when no session exists', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-nosession',
        submitted: true,
        isSerious: false,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };
      (ctx.sleepCore.getSession as jest.Mock).mockReturnValue(null);

      await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      expect(mockProcessPatientReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ currentWeek: undefined })
      );
    });

    it('should return error on processPatientReport failure', async () => {
      mockProcessPatientReport.mockRejectedValue(new Error('DB error'));

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось');
    });

    it('should include reportId in metadata', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-meta-test',
        submitted: true,
        isSerious: false,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      expect(result.metadata).toHaveProperty('reportId', 'ae-meta-test');
      expect(result.metadata).toHaveProperty('step', 'submitted');
    });

    it('should log submission details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockProcessPatientReport.mockResolvedValue({
        id: 'ae-log-test',
        submitted: true,
        isSerious: false,
        timestamp: new Date(),
      });

      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      await command.handleCallback(ctx, 'ae:confirm', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AE Command] Report submitted')
      );
      consoleSpy.mockRestore();
    });
  });

  // ==================== cancelReport() ====================

  describe('cancelReport()', () => {
    it('should return success message', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:cancel', {});

      assertSuccessWithMessage(result);
    });

    it('should mention /aereport and /sos commands', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:cancel', {});

      assertContainsText(result, '/aereport');
      assertContainsText(result, '/sos');
    });
  });

  // ==================== Helper Methods ====================

  describe('getCategoryName()', () => {
    it('should return term for valid category via severity step', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:category:SYMPTOM_DETERIORATION', {});

      // Severity step shows the category name
      assertContainsText(result, 'Insomnia symptom deterioration');
    });

    it('should return "Не указано" for undefined category', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      // Confirm step shows category name; undefined category → "Не указано"
      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: undefined,
        severity: 'mild',
        onset: 'today',
        description: '',
      });

      assertContainsText(result, 'Не указано');
    });

    it('should return "Другое" for unknown category', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:category:NONEXISTENT', {});

      // Severity step shows the category name — unknown returns "Другое"
      assertContainsText(result, 'Другое');
    });
  });

  describe('getSeverityName()', () => {
    it('should show "Лёгкая" for mild', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
        description: '',
      });

      assertContainsText(result, 'Лёгкая');
    });

    it('should show "Умеренная" for moderate', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'moderate',
        onset: 'today',
        description: '',
      });

      assertContainsText(result, 'Умеренная');
    });

    it('should show "Тяжёлая" for severe', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'severe',
        onset: 'today',
        description: '',
      });

      assertContainsText(result, 'Тяжёлая');
    });

    it('should show "Не указано" for undefined severity', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: undefined,
        onset: 'today',
        description: '',
      });

      assertContainsText(result, 'Не указано');
    });
  });

  describe('getOnsetName()', () => {
    it('should show "Сегодня" for today', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      assertContainsText(result, 'Сегодня');
    });

    it('should show "Вчера" for yesterday', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'yesterday',
      });

      assertContainsText(result, 'Вчера');
    });

    it('should show "На этой неделе" for this_week', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'this_week',
      });

      assertContainsText(result, 'На этой неделе');
    });

    it('should show "Раньше" for earlier', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'earlier',
      });

      assertContainsText(result, 'Раньше');
    });
  });

  describe('getSeriousName()', () => {
    it('should show "Не требовалась" for no', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      assertContainsText(result, 'Не требовалась');
    });

    it('should show "Амбулаторно" for outpatient', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:outpatient', {
        category: 'FATIGUE',
        severity: 'moderate',
        onset: 'today',
      });

      assertContainsText(result, 'Амбулаторно');
    });

    it('should show "Госпитализация" for hospitalized', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:hospitalized', {
        category: 'ACCIDENT_INJURY',
        severity: 'severe',
        onset: 'today',
      });

      assertContainsText(result, 'Госпитализация');
    });

    it('should show "Экстренная помощь" for emergency', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:emergency', {
        category: 'ACCIDENT_INJURY',
        severity: 'severe',
        onset: 'today',
      });

      assertContainsText(result, 'Экстренная помощь');
    });
  });

  describe('clinical trial compliance', () => {
    it('should collect CIOMS Form I minimum data', async () => {
      expect(command.steps).toContain('category');
      expect(command.steps).toContain('severity');
      expect(command.steps).toContain('onset');
      expect(command.steps).toContain('description');
      expect(command.steps).toContain('serious_check');
    });
  });

  // ==================== Confirmation display ====================

  describe('confirmation display', () => {
    it('should show all report data in confirmation', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'moderate',
        onset: 'yesterday',
        description: 'Very tired all day',
      });

      assertContainsText(result, 'Подтверждение');
      assertContainsText(result, 'Fatigue');
      assertContainsText(result, 'Умеренная');
      assertContainsText(result, 'Вчера');
      assertContainsText(result, 'Не требовалась');
      assertContainsText(result, 'Very tired all day');
    });

    it('should have confirm, edit, and cancel buttons', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:serious:no', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      assertHasKeyboard(result, 3);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.callbackData === 'aereport:confirm')).toBe(true);
      expect(buttons.some(b => b.callbackData === 'aereport:start')).toBe(true);
      expect(buttons.some(b => b.callbackData === 'aereport:cancel')).toBe(true);
    });
  });

  // ==================== Category selection ====================

  describe('category selection display', () => {
    it('should show all 9 categories plus cancel', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:start', {});

      assertHasKeyboard(result);
      const buttons = result.keyboard!.flat();
      // 9 categories + 1 cancel
      expect(buttons.length).toBeGreaterThanOrEqual(10);
      expect(buttons.some(b => b.callbackData?.includes('SYMPTOM_DETERIORATION'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('ANXIETY_INCREASE'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('FATIGUE'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('HEADACHE'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('OTHER'))).toBe(true);
    });
  });

  // ==================== Severity selection ====================

  describe('severity selection display', () => {
    it('should show 3 severity levels plus back button', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:category:FATIGUE', {});

      assertHasKeyboard(result);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.callbackData?.includes('severity:mild'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('severity:moderate'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('severity:severe'))).toBe(true);
    });
  });

  // ==================== Description step ====================

  describe('description step display', () => {
    it('should have skip and back buttons', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:onset:today', {
        category: 'FATIGUE',
        severity: 'mild',
      });

      assertHasKeyboard(result);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.callbackData?.includes('skip_description'))).toBe(true);
    });

    it('should set awaitingText in metadata', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:onset:today', {
        category: 'FATIGUE',
        severity: 'mild',
      });

      expect(result.metadata).toHaveProperty('awaitingText', true);
    });
  });

  // ==================== Serious check step ====================

  describe('serious check display', () => {
    it('should show 4 seriousness options plus back', async () => {
      const ctx = createMockContext();
      (ctx.sleepCore as { db?: unknown }).db = { query: jest.fn() };

      const result = await command.handleCallback(ctx, 'ae:skip_description', {
        category: 'FATIGUE',
        severity: 'mild',
        onset: 'today',
      });

      assertHasKeyboard(result);
      assertContainsText(result, 'Медицинская помощь');
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.callbackData?.includes('serious:no'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('serious:outpatient'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('serious:hospitalized'))).toBe(true);
      expect(buttons.some(b => b.callbackData?.includes('serious:emergency'))).toBe(true);
    });
  });
});
