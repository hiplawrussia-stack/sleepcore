/**
 * AEReportCommand Tests
 * =====================
 *
 * Adverse Event reporting - Safety-Critical Module
 * ICH E6(R3) compliance for patient safety monitoring
 *
 * Tests verify:
 * - CIOMS Form I minimum data collection
 * - Multi-step reporting flow
 * - Severity and seriousness assessment
 * - Database persistence (21 CFR Part 11)
 * - Safety alerts for serious events
 *
 * @packageDocumentation
 */

import { AEReportCommand, aeReportCommand } from '../AEReportCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    tip: (text: string) => `💡 ${text}`,
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
  },
}));

// Mock AdverseEventService
const mockProcessPatientReport = jest.fn();
jest.mock('../../services/AdverseEventService', () => ({
  createAdverseEventService: jest.fn(() => ({
    processPatientReport: mockProcessPatientReport,
  })),
  DTX_AE_CATEGORIES: {
    SYMPTOM_DETERIORATION: { term: 'Ухудшение сна' },
    ANXIETY_INCREASE: { term: 'Усиление тревоги' },
    FRUSTRATION: { term: 'Фрустрация от терапии' },
    EXCESSIVE_DAYTIME_SLEEPINESS: { term: 'Дневная сонливость' },
    FATIGUE: { term: 'Усталость' },
    HEADACHE: { term: 'Головная боль' },
    DIZZINESS: { term: 'Головокружение' },
    ACCIDENT_INJURY: { term: 'Несчастный случай' },
    OTHER: { term: 'Другое' },
  },
}));

describe('AEReportCommand', () => {
  let command: AEReportCommand;
  let mockContext: ISleepCoreContext;

  beforeEach(() => {
    command = new AEReportCommand();
    jest.clearAllMocks();

    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        db: {},
        getSession: jest.fn().mockReturnValue({ startDate: new Date() }),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('aereport');
    });

    it('should have Russian description', () => {
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

    it('should have all steps defined', () => {
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

  // ==========================================================================
  // INTRO STEP
  // ==========================================================================
  describe('Intro Step', () => {
    it('should show intro on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сообщение о проблеме');
    });

    it('should include user name', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Test User');
    });

    it('should explain purpose', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Скорректировать');
      expect(result.message).toContain('безопасность');
      expect(result.message).toContain('Улучшить терапию');
    });

    it('should mention confidentiality', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('конфиденциальны');
    });

    it('should warn about emergency', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('экстренная ситуация');
      expect(result.message).toContain('медицинск');
    });

    it('should have start and cancel buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'aereport:start')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'aereport:cancel')).toBeDefined();
    });

    it('should set intro step in metadata', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata?.step).toBe('intro');
    });
  });

  // ==========================================================================
  // CATEGORY SELECTION
  // ==========================================================================
  describe('Category Selection', () => {
    it('should show category selection on start callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:start',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Тип проблемы');
    });

    it('should list all DTx AE categories', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:start',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('SYMPTOM_DETERIORATION'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('ANXIETY_INCREASE'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('EXCESSIVE_DAYTIME_SLEEPINESS'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('FATIGUE'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('HEADACHE'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('DIZZINESS'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('ACCIDENT_INJURY'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('OTHER'))).toBeDefined();
    });

    it('should include frustration category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:start',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('FRUSTRATION'))).toBeDefined();
    });

    it('should have cancel button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:start',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'aereport:cancel')).toBeDefined();
    });
  });

  // ==========================================================================
  // SEVERITY SELECTION
  // ==========================================================================
  describe('Severity Selection', () => {
    it('should show severity selection after category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:HEADACHE',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Серьёзность');
    });

    it('should show selected category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:HEADACHE',
        {}
      );

      expect(result.message).toContain('Головная боль');
    });

    it('should have three severity levels', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:FATIGUE',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('mild'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('moderate'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('severe'))).toBeDefined();
    });

    it('should explain severity levels', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:FATIGUE',
        {}
      );

      expect(result.message).toContain('Насколько');
      expect(result.message).toContain('влияет');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:FATIGUE',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'aereport:start')).toBeDefined();
    });
  });

  // ==========================================================================
  // ONSET SELECTION
  // ==========================================================================
  describe('Onset Selection', () => {
    it('should show onset selection after severity', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:severity:moderate',
        { category: 'HEADACHE' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Когда это началось');
    });

    it('should have all onset options', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:severity:mild',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('today'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('yesterday'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('this_week'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('earlier'))).toBeDefined();
    });

    it('should store severity in metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:severity:severe',
        {}
      );

      expect(result.metadata?.severity).toBe('severe');
    });
  });

  // ==========================================================================
  // DESCRIPTION STEP
  // ==========================================================================
  describe('Description Step', () => {
    it('should show description prompt after onset', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:onset:today',
        { category: 'HEADACHE', severity: 'mild' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Описание');
    });

    it('should prompt for text input', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:onset:yesterday',
        {}
      );

      expect(result.message).toContain('опиши подробнее');
    });

    it('should have skip option', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:onset:this_week',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'aereport:skip_description')).toBeDefined();
    });

    it('should set awaitingText flag', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:onset:today',
        {}
      );

      expect(result.metadata?.awaitingText).toBe(true);
    });

    it('should provide helpful tip', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:onset:today',
        {}
      );

      expect(result.message).toContain('подробнее');
      expect(result.message).toContain('помочь');
    });
  });

  // ==========================================================================
  // SERIOUS CHECK
  // ==========================================================================
  describe('Serious Check', () => {
    it('should show serious check after description skip', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:skip_description',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Медицинская помощь');
    });

    it('should ask about medical attention', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:skip_description',
        {}
      );

      expect(result.message).toContain('Требовалась');
      expect(result.message).toContain('медицинская помощь');
    });

    it('should have all seriousness levels (CIOMS)', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:skip_description',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData?.includes('serious:no'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('serious:outpatient'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('serious:hospitalized'))).toBeDefined();
      expect(buttons.find(b => b.callbackData?.includes('serious:emergency'))).toBeDefined();
    });
  });

  // ==========================================================================
  // CONFIRMATION
  // ==========================================================================
  describe('Confirmation', () => {
    it('should show confirmation after serious check', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Подтверждение');
    });

    it('should display all collected data', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:outpatient',
        {
          category: 'HEADACHE',
          severity: 'moderate',
          onset: 'yesterday',
          description: 'Сильная головная боль',
        }
      );

      expect(result.message).toContain('Тип проблемы');
      expect(result.message).toContain('Серьёзность');
      expect(result.message).toContain('Начало');
      expect(result.message).toContain('Мед. помощь');
    });

    it('should show severity name correctly', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        { category: 'FATIGUE', severity: 'severe', onset: 'this_week' }
      );

      expect(result.message).toContain('Тяжёлая');
    });

    it('should show onset name correctly', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        { category: 'FATIGUE', severity: 'mild', onset: 'earlier' }
      );

      expect(result.message).toContain('Раньше');
    });

    it('should show serious name correctly', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:hospitalized',
        { category: 'ACCIDENT_INJURY', severity: 'severe', onset: 'today' }
      );

      expect(result.message).toContain('Госпитализация');
    });

    it('should include description if provided', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        { category: 'HEADACHE', description: 'Мигрень после обеда' }
      );

      expect(result.message).toContain('Мигрень после обеда');
    });

    it('should have submit and edit buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'aereport:confirm')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'aereport:start')).toBeDefined();
    });
  });

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================
  describe('Submission', () => {
    beforeEach(() => {
      mockProcessPatientReport.mockResolvedValue({
        id: '12345',
        isSerious: false,
      });
    });

    it('should submit report on confirm', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.success).toBe(true);
      expect(mockProcessPatientReport).toHaveBeenCalled();
    });

    it('should show success message', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.message).toContain('Сообщение получено');
    });

    it('should include report ID', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'AE12345',
        isSerious: false,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.message).toContain('AE-AE12345');
    });

    it('should thank user', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.message).toContain('Спасибо');
      expect(result.message).toContain('Test User');
    });

    it('should set submitted step in metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.metadata?.step).toBe('submitted');
    });

    it('should store reportId in metadata', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'TEST123',
        isSerious: false,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.metadata?.reportId).toBe('TEST123');
    });
  });

  // ==========================================================================
  // SERIOUS EVENT HANDLING (SAFETY-CRITICAL)
  // ==========================================================================
  describe('SAFETY: Serious Event Handling', () => {
    it('should show priority message for serious events', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'SERIOUS001',
        isSerious: true,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'ACCIDENT_INJURY', severity: 'severe', onset: 'today', seriousCheck: 'hospitalized' }
      );

      expect(result.message).toContain('приоритетном порядке');
    });

    it('should warn about symptom worsening for serious events', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'SERIOUS002',
        isSerious: true,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'DIZZINESS', severity: 'severe', onset: 'today', seriousCheck: 'emergency' }
      );

      expect(result.message).toContain('ухудшаются');
      expect(result.message).toContain('медицинской помощью');
    });

    it('should mention contact within 24 hours for serious events', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'SERIOUS003',
        isSerious: true,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'FATIGUE', severity: 'severe', seriousCheck: 'hospitalized' }
      );

      expect(result.message).toContain('24 час');
    });

    it('should show different message for non-serious events', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'NORMAL001',
        isSerious: false,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today', seriousCheck: 'no' }
      );

      expect(result.message).not.toContain('приоритетном порядке');
      expect(result.message).toContain('зарегистрировано');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle submission error gracefully', async () => {
      mockProcessPatientReport.mockRejectedValue(new Error('DB error'));

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { category: 'HEADACHE', severity: 'mild', onset: 'today' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось отправить');
    });

    it('should handle missing category', async () => {
      mockProcessPatientReport.mockResolvedValue({
        id: 'TEST',
        isSerious: false,
      });

      const result = await command.handleCallback(
        mockContext,
        'aereport:confirm',
        { severity: 'mild', onset: 'today' }
      );

      expect(result.success).toBe(true);
      // Should default to 'OTHER' category
    });

    it('should handle missing database', async () => {
      const contextWithoutDb = {
        ...mockContext,
        sleepCore: {
          db: null,
          getSession: jest.fn(),
        },
      } as unknown as ISleepCoreContext;

      // Clear cache to force re-creation of service
      command = new AEReportCommand();

      const result = await command.handleCallback(
        contextWithoutDb,
        'aereport:confirm',
        { category: 'HEADACHE' }
      );

      // Error is caught and returned as error result
      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось отправить');
    });
  });

  // ==========================================================================
  // CANCELLATION
  // ==========================================================================
  describe('Cancellation', () => {
    it('should handle cancel callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:cancel',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('отменено');
    });

    it('should mention alternative commands', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:cancel',
        {}
      );

      expect(result.message).toContain('/aereport');
      expect(result.message).toContain('/sos');
    });
  });

  // ==========================================================================
  // STEP HANDLER
  // ==========================================================================
  describe('Step Handler', () => {
    it('should handle intro step', async () => {
      const result = await command.handleStep(mockContext, 'intro', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сообщение о проблеме');
    });

    it('should handle category step', async () => {
      const result = await command.handleStep(mockContext, 'category', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Тип проблемы');
    });

    it('should handle severity step', async () => {
      const result = await command.handleStep(mockContext, 'severity', { category: 'HEADACHE' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Серьёзность');
    });

    it('should handle onset step', async () => {
      const result = await command.handleStep(mockContext, 'onset', { category: 'HEADACHE', severity: 'mild' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Когда это началось');
    });

    it('should handle description step', async () => {
      const result = await command.handleStep(mockContext, 'description', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Описание');
    });

    it('should handle serious_check step', async () => {
      const result = await command.handleStep(mockContext, 'serious_check', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Медицинская помощь');
    });

    it('should handle confirm step', async () => {
      const result = await command.handleStep(mockContext, 'confirm', {
        category: 'HEADACHE',
        severity: 'mild',
        onset: 'today',
        seriousCheck: 'no',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Подтверждение');
    });

    it('should handle unknown step by showing intro', async () => {
      const result = await command.handleStep(mockContext, 'unknown_step', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сообщение о проблеме');
    });
  });

  // ==========================================================================
  // CATEGORY NAME HELPER
  // ==========================================================================
  describe('Category Names', () => {
    it('should show correct category name for SYMPTOM_DETERIORATION', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:SYMPTOM_DETERIORATION',
        {}
      );

      expect(result.message).toContain('Ухудшение сна');
    });

    it('should show correct category name for ANXIETY_INCREASE', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:category:ANXIETY_INCREASE',
        {}
      );

      expect(result.message).toContain('Усиление тревоги');
    });

    it('should handle unknown category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        { category: 'UNKNOWN_CATEGORY' }
      );

      expect(result.message).toContain('Другое');
    });

    it('should handle missing category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'aereport:serious:no',
        {}
      );

      expect(result.message).toContain('Не указано');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(aeReportCommand).toBeInstanceOf(AEReportCommand);
    });

    it('should have correct name', () => {
      expect(aeReportCommand.name).toBe('aereport');
    });
  });
});
