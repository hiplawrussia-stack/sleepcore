/**
 * DiaryCommand Tests - Clinical Data Collection Module
 * =====================================================
 *
 * IEC 62304 Class B - Clinical data capture
 * European Insomnia Guideline 2023 - Sleep diary requirements
 *
 * Tests verify:
 * - 3-tap diary entry flow
 * - Bedtime/waketime input
 * - Sleep quality rating (1-5)
 * - processNewDiaryEntry integration (plan creation after 7 days)
 * - Third-wave therapy non-response detection
 * - Duration calculation (including midnight crossing)
 *
 * CRITICAL: Plan creation after 7 diary entries (CLAUDE.md §13.3)
 *
 * @packageDocumentation
 */

import { DiaryCommand, diaryCommand } from '../DiaryCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    say: (text: string) => `_${text}_`,
    greet: () => ({ emoji: '🦉', text: 'Доброе утро!' }),
    tip: (text: string) => `💡 ${text}`,
    celebrate: (text: string) => `🎉 ${text}`,
    respondToEmotion: (emotion: string) => ({
      emoji: emotion === 'tired' ? '🤗' : '😊',
      text: 'Отдохни как следует.',
    }),
  },
}));

jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    formatDate: (date: Date) => date.toLocaleDateString('ru-RU'),
    duration: (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}ч ${m}м`;
    },
    progressBar: (percent: number, total: number) =>
      `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}] ${Math.floor(percent)}%`,
    sleepEfficiency: (se: number) => `SE: ${se}%`,
  },
}));

describe('DiaryCommand', () => {
  let command: DiaryCommand;
  let mockContext: ISleepCoreContext;
  let mockProcessNewDiaryEntry: jest.Mock;
  let mockAddDiaryEntry: jest.Mock;
  let mockGetSleepStates: jest.Mock;
  let mockDetectRiskEscalation: jest.Mock;

  beforeEach(() => {
    command = new DiaryCommand();

    // Create mocks for SleepCoreAPI methods
    mockProcessNewDiaryEntry = jest.fn();
    mockAddDiaryEntry = jest.fn();
    mockGetSleepStates = jest.fn().mockReturnValue([]);
    mockDetectRiskEscalation = jest.fn().mockResolvedValue(null);

    // Create mock context
    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        processNewDiaryEntry: mockProcessNewDiaryEntry,
        addDiaryEntry: mockAddDiaryEntry,
        getSleepStates: mockGetSleepStates,
        detectRiskEscalation: mockDetectRiskEscalation,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('diary');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('дневник');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('sleep');
      expect(command.aliases).toContain('log');
      expect(command.aliases).toContain('дневник');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });

    it('should have all diary steps defined', () => {
      expect(command.steps).toContain('intro');
      expect(command.steps).toContain('bedtime_hour');
      expect(command.steps).toContain('bedtime_minute');
      expect(command.steps).toContain('waketime_hour');
      expect(command.steps).toContain('waketime_minute');
      expect(command.steps).toContain('sleep_quality');
      expect(command.steps).toContain('summary');
    });
  });

  // ==========================================================================
  // EXECUTE
  // ==========================================================================
  describe('Execute', () => {
    it('should start with intro step', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.metadata?.step).toBe('intro');
    });

    it('should set current date in metadata', async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await command.execute(mockContext);

      expect(result.metadata?.date).toBe(today);
    });
  });

  // ==========================================================================
  // INTRO STEP
  // ==========================================================================
  describe('Intro Step', () => {
    const data = { date: '2026-02-06' };

    it('should show greeting and diary header', async () => {
      const result = await command.handleStep(mockContext, 'intro', data);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Соня');
      expect(result.message).toContain('Дневник сна');
    });

    it('should mention 3-tap entry', async () => {
      const result = await command.handleStep(mockContext, 'intro', data);

      expect(result.message).toContain('3 касания');
    });

    it('should have quick entry buttons', async () => {
      const result = await command.handleStep(mockContext, 'intro', data);

      const buttons = result.keyboard?.flat() ?? [];
      const quickButtons = buttons.filter((b) => b.callbackData?.startsWith('diary:quick:'));

      expect(quickButtons.length).toBeGreaterThan(0);
      expect(quickButtons[0].text).toContain('22:00-6:00');
    });

    it('should have manual entry button', async () => {
      const result = await command.handleStep(mockContext, 'intro', data);

      const buttons = result.keyboard?.flat() ?? [];
      const manualButton = buttons.find((b) => b.callbackData?.includes('bedtime_hour:start'));

      expect(manualButton).toBeDefined();
      expect(manualButton?.text).toContain('Ввести вручную');
    });

    it('should include CBT-I tip', async () => {
      const result = await command.handleStep(mockContext, 'intro', data);

      expect(result.message).toContain('КПТ-И');
    });
  });

  // ==========================================================================
  // TIME ENTRY STEPS
  // ==========================================================================
  describe('Bedtime Hour Step', () => {
    it('should show hour selection', async () => {
      const result = await command.handleStep(mockContext, 'bedtime_hour', { date: '2026-02-06' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Время отхода ко сну');
      expect(result.message).toContain('Шаг 1/3');
    });

    it('should have evening hour buttons', async () => {
      const result = await command.handleStep(mockContext, 'bedtime_hour', { date: '2026-02-06' });

      const buttons = result.keyboard?.flat() ?? [];
      const hourButtons = buttons.filter((b) => b.callbackData?.startsWith('diary:bedtime_hour:'));

      expect(hourButtons.length).toBeGreaterThan(5);
    });
  });

  describe('Bedtime Minute Step', () => {
    it('should show minute selection', async () => {
      const result = await command.handleStep(mockContext, 'bedtime_minute', {
        date: '2026-02-06',
        bedtimeHour: 23,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('23:__');
    });

    it('should have 15-minute interval buttons', async () => {
      const result = await command.handleStep(mockContext, 'bedtime_minute', {
        date: '2026-02-06',
        bedtimeHour: 22,
      });

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons).toContainEqual(expect.objectContaining({ text: ':00' }));
      expect(buttons).toContainEqual(expect.objectContaining({ text: ':15' }));
      expect(buttons).toContainEqual(expect.objectContaining({ text: ':30' }));
      expect(buttons).toContainEqual(expect.objectContaining({ text: ':45' }));
    });
  });

  describe('Waketime Hour Step', () => {
    it('should show step 2/3', async () => {
      const result = await command.handleStep(mockContext, 'waketime_hour', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Шаг 2/3');
      expect(result.message).toContain('Время пробуждения');
    });

    it('should show bedtime in message', async () => {
      const result = await command.handleStep(mockContext, 'waketime_hour', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 30,
      });

      expect(result.message).toContain('23:30');
    });

    it('should have morning hour buttons', async () => {
      const result = await command.handleStep(mockContext, 'waketime_hour', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
      });

      const buttons = result.keyboard?.flat() ?? [];
      const hourButtons = buttons.filter((b) => b.callbackData?.startsWith('diary:wake_hour:'));

      expect(hourButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Waketime Minute Step', () => {
    it('should show minute selection', async () => {
      const result = await command.handleStep(mockContext, 'waketime_minute', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('07:__');
    });
  });

  // ==========================================================================
  // SLEEP QUALITY STEP
  // ==========================================================================
  describe('Sleep Quality Step', () => {
    const data = {
      date: '2026-02-06',
      bedtimeHour: 23,
      bedtimeMinute: 0,
      waketimeHour: 7,
      waketimeMinute: 0,
    };

    it('should show step 3/3', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', data);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Шаг 3/3');
      expect(result.message).toContain('Качество сна');
    });

    it('should show times and duration', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', data);

      expect(result.message).toContain('23:00');
      expect(result.message).toContain('07:00');
      expect(result.message).toContain('8ч'); // 8 hours
    });

    it('should have 5 quality rating buttons', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', data);

      const buttons = result.keyboard?.flat() ?? [];
      const qualityButtons = buttons.filter((b) => b.callbackData?.startsWith('diary:quality:'));

      expect(qualityButtons.length).toBe(5);
      expect(qualityButtons[0].text).toContain('1');
      expect(qualityButtons[4].text).toContain('5');
    });

    it('should have emoji for each quality level', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', data);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons[0].text).toContain('😫');
      expect(buttons[4].text).toContain('😊');
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    describe('Quick Entry', () => {
      it('should parse quick entry format and skip to quality', async () => {
        const result = await command.handleCallback(mockContext, 'diary:quick:22-6', {
          date: '2026-02-06',
        });

        expect(result.success).toBe(true);
        expect(result.metadata?.step).toBe('sleep_quality');
        expect(result.metadata?.bedtimeHour).toBe(22);
        expect(result.metadata?.waketimeHour).toBe(6);
      });
    });

    describe('Bedtime Selection', () => {
      it('should proceed to minute selection after hour', async () => {
        const result = await command.handleCallback(mockContext, 'diary:bedtime_hour:23', {
          date: '2026-02-06',
        });

        expect(result.success).toBe(true);
        expect(result.metadata?.step).toBe('bedtime_minute');
        expect(result.metadata?.bedtimeHour).toBe(23);
      });

      it('should proceed to waketime after minute', async () => {
        const result = await command.handleCallback(mockContext, 'diary:bedtime_min:30', {
          date: '2026-02-06',
          bedtimeHour: 23,
        });

        expect(result.success).toBe(true);
        expect(result.metadata?.step).toBe('waketime_hour');
        expect(result.metadata?.bedtimeMinute).toBe(30);
      });
    });

    describe('Waketime Selection', () => {
      it('should proceed to minute selection after hour', async () => {
        const result = await command.handleCallback(mockContext, 'diary:wake_hour:7', {
          date: '2026-02-06',
          bedtimeHour: 23,
          bedtimeMinute: 0,
        });

        expect(result.success).toBe(true);
        expect(result.metadata?.step).toBe('waketime_minute');
        expect(result.metadata?.waketimeHour).toBe(7);
      });

      it('should proceed to quality after minute', async () => {
        const result = await command.handleCallback(mockContext, 'diary:wake_min:15', {
          date: '2026-02-06',
          bedtimeHour: 23,
          bedtimeMinute: 0,
          waketimeHour: 7,
        });

        expect(result.success).toBe(true);
        expect(result.metadata?.step).toBe('sleep_quality');
        expect(result.metadata?.waketimeMinute).toBe(15);
      });
    });

    describe('Quality Selection', () => {
      it('should save entry and show summary', async () => {
        mockProcessNewDiaryEntry.mockResolvedValue({
          metrics: { sleepEfficiency: 88 },
          entriesCount: 3,
          planCreated: false,
          intervention: null,
          message: 'Продолжайте вести дневник.',
          thirdWaveRecommendation: null,
          isNonResponding: false,
        });

        const result = await command.handleCallback(mockContext, 'diary:quality:4', {
          date: '2026-02-06',
          bedtimeHour: 23,
          bedtimeMinute: 0,
          waketimeHour: 7,
          waketimeMinute: 0,
        });

        expect(result.success).toBe(true);
        expect(result.metadata?.step).toBe('summary');
        expect(result.metadata?.sleepQuality).toBe(4);
        expect(mockProcessNewDiaryEntry).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // INTEGRATION: processNewDiaryEntry
  // ==========================================================================
  describe('INTEGRATION: processNewDiaryEntry Pipeline', () => {
    const fullData = {
      date: '2026-02-06',
      bedtimeHour: 23,
      bedtimeMinute: 0,
      waketimeHour: 7,
      waketimeMinute: 0,
      sleepQuality: 4,
    };

    it('should call processNewDiaryEntry with correct entry format', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 1,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      await command.handleCallback(mockContext, 'diary:quality:4', fullData);

      expect(mockProcessNewDiaryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          date: '2026-02-06',
          bedtime: '23:00',
          finalAwakening: '07:00',
          subjectiveQuality: 'good',
        })
      );
    });

    it('should map quality 1 to very_poor', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 1,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      await command.handleCallback(mockContext, 'diary:quality:1', { ...fullData, sleepQuality: 1 });

      expect(mockProcessNewDiaryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectiveQuality: 'very_poor',
        })
      );
    });

    it('should map quality 5 to excellent', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 1,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      await command.handleCallback(mockContext, 'diary:quality:5', { ...fullData, sleepQuality: 5 });

      expect(mockProcessNewDiaryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectiveQuality: 'excellent',
        })
      );
    });
  });

  // ==========================================================================
  // CRITICAL: PLAN CREATION AFTER 7 DAYS (CLAUDE.md §13.3)
  // ==========================================================================
  describe('CRITICAL: Plan Creation After 7 Days', () => {
    it('should show plan created message when 7 entries complete', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: { sleepEfficiency: 75 },
        entriesCount: 7,
        planCreated: true,
        intervention: null,
        message: 'План создан!',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Базовый период завершён');
      expect(result.message).toContain('7 дней');
      expect(result.message).toContain('персональный план');
    });

    it('should show progress bar for baseline collection', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 3,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      expect(result.message).toContain('Сбор базовых данных');
      expect(result.message).toContain('3/7');
    });

    it('should show remaining days in Russian', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 5,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      // 7 - 5 = 2 дня
      expect(result.message).toContain('2');
      expect(result.message).toContain('дня');
    });
  });

  // ==========================================================================
  // INTERVENTION DISPLAY
  // ==========================================================================
  describe('Intervention Display', () => {
    it('should show intervention when available', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: { sleepEfficiency: 78 },
        entriesCount: 10,
        planCreated: false,
        intervention: {
          component: 'sleep_restriction',
          action: 'Ложитесь в 23:30, вставайте в 6:00',
          rationale: 'Повышение эффективности сна',
        },
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      expect(result.message).toContain('Рекомендация на сегодня');
      expect(result.message).toContain('Ложитесь в 23:30');
      expect(result.message).toContain('Повышение эффективности');
    });

    it('should show correct emoji for each component', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 10,
        planCreated: false,
        intervention: {
          component: 'relaxation',
          action: 'Практикуйте ПМР перед сном',
          rationale: 'Снижение напряжения',
        },
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      expect(result.message).toContain('🧘'); // Relaxation emoji
    });
  });

  // ==========================================================================
  // NON-RESPONSE DETECTION (European Guideline 2023)
  // ==========================================================================
  describe('Non-Response Detection', () => {
    it('should show third-wave recommendation for non-responders', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: { sleepEfficiency: 70 },
        entriesCount: 42, // Week 6+
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: {
          recommendedApproach: 'mbti',
          rationale: 'Высокий уровень предсонного возбуждения.',
          confidence: 0.85,
        },
        isNonResponding: true,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:2', {
        date: '2026-02-06',
        bedtimeHour: 1,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 2,
      });

      expect(result.message).toContain('Рекомендация по терапии');
      expect(result.message).toContain('Терапия осознанности');
      expect(result.message).toContain('ограниченный эффект');
    });

    it('should have button to navigate to third-wave therapy', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 45,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: {
          recommendedApproach: 'acti',
          rationale: 'Катастрофизация и избегание.',
          confidence: 0.8,
        },
        isNonResponding: true,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:2', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 6,
        waketimeMinute: 0,
        sleepQuality: 2,
      });

      const buttons = result.keyboard?.flat() ?? [];
      const thirdWaveButton = buttons.find((b) => b.callbackData?.includes('third_wave'));

      expect(thirdWaveButton).toBeDefined();
      expect(thirdWaveButton?.text).toContain('Перейти к новой терапии');
    });
  });

  // ==========================================================================
  // DURATION CALCULATION
  // ==========================================================================
  describe('Duration Calculation', () => {
    it('should calculate duration correctly for same-day', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', {
        date: '2026-02-06',
        bedtimeHour: 6,
        bedtimeMinute: 0,
        waketimeHour: 14,
        waketimeMinute: 0,
      });

      expect(result.message).toContain('8ч'); // 14 - 6 = 8 hours
    });

    it('should handle midnight crossing', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
      });

      // 23:00 → 07:00 = 8 hours (crossing midnight)
      expect(result.message).toContain('8ч');
    });

    it('should handle late bedtime crossing midnight', async () => {
      const result = await command.handleStep(mockContext, 'sleep_quality', {
        date: '2026-02-06',
        bedtimeHour: 1,
        bedtimeMinute: 0,
        waketimeHour: 9,
        waketimeMinute: 0,
      });

      // 01:00 → 09:00 = 8 hours
      expect(result.message).toContain('8ч');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown_step', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });

    it('should handle invalid callback prefix', async () => {
      const result = await command.handleCallback(mockContext, 'other:action', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should handle unknown callback action', async () => {
      const result = await command.handleCallback(mockContext, 'diary:unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should handle missing required fields', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 1,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      // Missing waketime
      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        sleepQuality: 3,
      });

      // Should show error about missing data
      expect(result.message).toContain('Данные сессии потеряны');
    });

    it('should fallback to addDiaryEntry if processNewDiaryEntry fails', async () => {
      mockProcessNewDiaryEntry.mockRejectedValue(new Error('Integration failed'));
      mockAddDiaryEntry.mockReturnValue(undefined);

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      expect(result.success).toBe(true);
      expect(mockAddDiaryEntry).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SUMMARY DISPLAY
  // ==========================================================================
  describe('Summary Step', () => {
    beforeEach(() => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: { sleepEfficiency: 85 },
        entriesCount: 5,
        planCreated: false,
        intervention: null,
        message: 'Хороший прогресс!',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });
    });

    it('should show all entry details', async () => {
      const result = await command.handleCallback(mockContext, 'diary:quality:4', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 30,
        waketimeHour: 7,
        waketimeMinute: 15,
        sleepQuality: 4,
      });

      expect(result.message).toContain('23:30');
      expect(result.message).toContain('07:15');
      expect(result.message).toContain('4/5');
    });

    it('should show quality emoji', async () => {
      const result = await command.handleCallback(mockContext, 'diary:quality:5', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 5,
      });

      expect(result.message).toContain('😊');
    });

    it('should have progress button', async () => {
      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      const buttons = result.keyboard?.flat() ?? [];
      const progressButton = buttons.find((b) => b.callbackData?.includes('progress'));

      expect(progressButton).toBeDefined();
    });

    it('should show relaxation button after 7 entries', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 10,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      const buttons = result.keyboard?.flat() ?? [];
      const relaxButton = buttons.find((b) => b.callbackData?.includes('relax'));

      expect(relaxButton).toBeDefined();
    });
  });

  // ==========================================================================
  // RUSSIAN PLURALIZATION
  // ==========================================================================
  describe('Russian Pluralization', () => {
    it('should pluralize "день" correctly for 1', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 6,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      // 7 - 6 = 1 день
      expect(result.message).toContain('1');
      expect(result.message).toContain('день');
    });

    it('should pluralize "дня" correctly for 2-4', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 4,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      // 7 - 4 = 3 дня
      expect(result.message).toContain('3');
      expect(result.message).toContain('дня');
    });

    it('should pluralize "дней" correctly for 5+', async () => {
      mockProcessNewDiaryEntry.mockResolvedValue({
        metrics: null,
        entriesCount: 2,
        planCreated: false,
        intervention: null,
        message: '',
        thirdWaveRecommendation: null,
        isNonResponding: false,
      });

      const result = await command.handleCallback(mockContext, 'diary:quality:3', {
        date: '2026-02-06',
        bedtimeHour: 23,
        bedtimeMinute: 0,
        waketimeHour: 7,
        waketimeMinute: 0,
        sleepQuality: 3,
      });

      // 7 - 2 = 5 дней
      expect(result.message).toContain('5');
      expect(result.message).toContain('дней');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(diaryCommand).toBeInstanceOf(DiaryCommand);
    });

    it('should have correct name', () => {
      expect(diaryCommand.name).toBe('diary');
    });
  });
});
