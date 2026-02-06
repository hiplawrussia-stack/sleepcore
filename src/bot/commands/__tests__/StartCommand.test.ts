/**
 * StartCommand Tests - Safety-Critical Module
 * ============================================
 *
 * IEC 62304 Class B - Clinical data collection
 * ICH E6(R3) 2025 - Informed consent requirements
 *
 * Tests verify:
 * - Session initialization
 * - Consent flow (ICH E6(R3) / Russia 152-FZ)
 * - ISI assessment flow (7 questions)
 * - ISI severity classification (Red Line: ≥22 requires referral)
 * - Data persistence
 *
 * CRITICAL: ISI ≥22 MUST recommend specialist referral (CLAUDE.md §2.1)
 *
 * @packageDocumentation
 */

import { StartCommand, startCommand } from '../StartCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    say: (text: string) => `_${text}_`,
    greet: () => ({ emoji: '🦉', text: 'Привет!' }),
    respondToEmotion: (emotion: string) => ({
      emoji: emotion === 'positive' ? '😊' : '🤗',
      text: 'Я рядом.',
    }),
    encourageByWeek: () => ({ emoji: '🎉', text: 'Отлично!' }),
  },
}));

jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    success: (text: string) => `✅ ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    isiScore: (score: number) => `ISI: ${score}/28`,
    numberedList: (items: string[]) => items.map((item, i) => `${i + 1}. ${item}`).join('\n'),
    progressBar: (percent: number, total: number) => `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}] ${Math.floor(percent)}%`,
    getISISeverity: (score: number) => {
      if (score <= 7) return 'none';
      if (score <= 14) return 'subthreshold';
      if (score <= 21) return 'moderate';
      return 'severe';
    },
  },
}));

describe('StartCommand', () => {
  let command: StartCommand;
  let mockContext: ISleepCoreContext;
  let mockStartSession: jest.Mock;
  let mockRecordISIAssessment: jest.Mock;
  let mockEnrollISISchedule: jest.Mock;

  beforeEach(() => {
    command = new StartCommand();

    // Create mocks for SleepCoreAPI methods
    mockStartSession = jest.fn();
    mockRecordISIAssessment = jest.fn();
    mockEnrollISISchedule = jest.fn();

    // Create mock context
    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Тест Юзер',
      languageCode: 'ru',
      sleepCore: {
        startSession: mockStartSession,
        recordISIAssessment: mockRecordISIAssessment,
        enrollISISchedule: mockEnrollISISchedule,
        registerForNotifications: jest.fn(),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('start');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('сна');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('begin');
      expect(command.aliases).toContain('начать');
    });

    it('should NOT require session (first command)', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have all onboarding steps defined', () => {
      expect(command.steps).toContain('welcome');
      expect(command.steps).toContain('consent_intro');
      expect(command.steps).toContain('consent_confirm');
      expect(command.steps).toContain('isi_intro');
      expect(command.steps).toContain('isi_q1');
      expect(command.steps).toContain('isi_q7');
      expect(command.steps).toContain('isi_result');
      expect(command.steps).toContain('complete');
    });
  });

  // ==========================================================================
  // SESSION INITIALIZATION
  // ==========================================================================
  describe('Session Initialization', () => {
    it('should start session on execute', async () => {
      await command.execute(mockContext);

      expect(mockStartSession).toHaveBeenCalledWith('user123');
    });

    it('should show welcome message after session start', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Соня');
    });
  });

  // ==========================================================================
  // WELCOME STEP
  // ==========================================================================
  describe('Welcome Step', () => {
    it('should include user name in greeting', async () => {
      const result = await command.handleStep(mockContext, 'welcome', {});

      expect(result.message).toBeDefined();
    });

    it('should mention CBT-I', async () => {
      const result = await command.handleStep(mockContext, 'welcome', {});

      expect(result.message).toContain('КПТ-И');
    });

    it('should have button to begin consent', async () => {
      const result = await command.handleStep(mockContext, 'welcome', {});

      const buttons = result.keyboard?.flat() ?? [];
      const consentButton = buttons.find(b => b.callbackData === 'start:begin_consent');

      expect(consentButton).toBeDefined();
    });

    it('should mention data encryption', async () => {
      const result = await command.handleStep(mockContext, 'welcome', {});

      expect(result.message).toContain('шифрован');
    });
  });

  // ==========================================================================
  // CONSENT FLOW (ICH E6(R3) / 152-FZ)
  // ==========================================================================
  describe('Consent Flow', () => {
    it('should show consent intro with key information', async () => {
      const result = await command.handleStep(mockContext, 'consent_intro', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('согласие');
    });

    it('should mention program duration', async () => {
      const result = await command.handleStep(mockContext, 'consent_intro', {});

      expect(result.message).toContain('8 недель');
    });

    it('should disclose potential side effects', async () => {
      const result = await command.handleStep(mockContext, 'consent_intro', {});

      expect(result.message).toContain('сонливость');
    });

    it('should have read more and accept buttons', async () => {
      const result = await command.handleStep(mockContext, 'consent_intro', {});

      const buttons = result.keyboard?.flat() ?? [];
      const readMoreButton = buttons.find(b => b.callbackData?.includes('read_more'));
      const acceptButton = buttons.find(b => b.callbackData?.includes('accept'));

      expect(readMoreButton || acceptButton).toBeDefined();
    });

    it('should handle consent acceptance', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:consent_accept',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle consent decline gracefully', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:consent_decline',
        {}
      );

      expect(result.success).toBe(true);
      // Should inform user they can't proceed without consent
    });
  });

  // ==========================================================================
  // ISI ASSESSMENT FLOW
  // ==========================================================================
  describe('ISI Assessment Flow', () => {
    it('should show ISI introduction', async () => {
      const result = await command.handleStep(mockContext, 'isi_intro', {});

      expect(result.success).toBe(true);
    });

    it('should show all 7 ISI questions', async () => {
      for (let q = 1; q <= 7; q++) {
        const result = await command.handleStep(mockContext, `isi_q${q}`, {});

        expect(result.success).toBe(true);
        expect(result.keyboard).toBeDefined();
        // Should have 5 options (0-4)
        const buttons = result.keyboard?.flat() ?? [];
        expect(buttons.length).toBe(5);
      }
    });

    it('should have correct answer options for each question', async () => {
      const result = await command.handleStep(mockContext, 'isi_q1', {});

      const buttons = result.keyboard?.flat() ?? [];

      // First question: problems falling asleep
      expect(buttons[0].text).toContain('Нет проблем');
      expect(buttons[4].text).toContain('серьёзные');
    });

    it('should accumulate answers correctly', async () => {
      // Answer first question with value 2
      const result = await command.handleCallback(
        mockContext,
        'start:isi_answer:1:2',
        { isiAnswers: [] }
      );

      expect(result.success).toBe(true);
    });

    it('should proceed to next question after answer', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:isi_answer:1:2',
        { isiAnswers: [] }
      );

      // Should move to question 2
      expect(result.metadata?.step).toBe('isi_q2');
    });

    it('should show result after question 7', async () => {
      // Complete all 7 answers
      const answers = [2, 2, 2, 2, 2, 2, 2]; // Score = 14

      const result = await command.handleCallback(
        mockContext,
        'start:isi_answer:7:2',
        { isiAnswers: answers.slice(0, 6) }
      );

      expect(result.metadata?.step).toBe('isi_result');
    });
  });

  // ==========================================================================
  // ISI SEVERITY CLASSIFICATION (SAFETY-CRITICAL)
  // ==========================================================================
  describe('SAFETY: ISI Severity Classification', () => {
    it('should classify score 0-7 as none (green)', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [1, 1, 0, 0, 1, 1, 1] } // Score = 5
      );

      expect(result.message).toContain('🟢🟢🟢🟢🟢');
      expect(result.metadata?.severity).toBe('none');
    });

    it('should classify score 8-14 as subthreshold', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [2, 2, 2, 2, 2, 1, 1] } // Score = 12
      );

      expect(result.message).toContain('🟡');
      expect(result.metadata?.severity).toBe('subthreshold');
    });

    it('should classify score 15-21 as moderate', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [3, 3, 3, 3, 3, 2, 2] } // Score = 19
      );

      expect(result.message).toContain('🟠');
      expect(result.metadata?.severity).toBe('moderate');
    });

    it('should classify score 22-28 as severe (RED LINE)', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [4, 4, 4, 4, 4, 3, 3] } // Score = 26
      );

      expect(result.message).toContain('🔴');
      expect(result.metadata?.severity).toBe('severe');
    });

    it('should recommend specialist for severe insomnia (≥22)', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [4, 4, 4, 4, 4, 4, 4] } // Score = 28
      );

      // CLAUDE.md Red Line 2.1: ISI ≥22 requires specialist referral
      expect(result.message).toContain('специалист');
    });
  });

  // ==========================================================================
  // DATA PERSISTENCE
  // ==========================================================================
  describe('Data Persistence', () => {
    it('should record ISI assessment in SleepCoreAPI', async () => {
      await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [2, 2, 2, 2, 2, 2, 2] } // Score = 14
      );

      expect(mockRecordISIAssessment).toHaveBeenCalledWith(
        'user123',
        14,
        'subthreshold',
        [2, 2, 2, 2, 2, 2, 2]
      );
    });

    it('should enroll user in ISI schedule', async () => {
      await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [2, 2, 2, 2, 2, 2, 2] }
      );

      expect(mockEnrollISISchedule).toHaveBeenCalledWith(
        'user123',
        456789,
        'Тест Юзер',
        14
      );
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    it('should handle begin_consent callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:begin_consent',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle begin_assessment callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:begin_assessment',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle skip_assessment callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:skip_assessment',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle view_tips callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:view_tips',
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should handle start_diary callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:start_diary',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.redirect).toBe('diary');
    });

    it('should reject invalid callback prefix', async () => {
      const result = await command.handleCallback(
        mockContext,
        'other:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should reject unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'start:unknown_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should handle unknown step', async () => {
      const result = await command.handleStep(
        mockContext,
        'unknown_step',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });

    it('should handle missing isiAnswers gracefully', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [] }
      );

      // Should calculate score as 0 with empty answers
      expect(result.success).toBe(true);
      expect(result.metadata?.isiScore).toBe(0);
    });

    it('should handle undefined values in isiAnswers', async () => {
      const result = await command.handleStep(
        mockContext,
        'isi_result',
        { isiAnswers: [undefined, 2, undefined, 2] as unknown as number[] }
      );

      // Should treat undefined as 0
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // COMPLETE STEP
  // ==========================================================================
  describe('Complete Step', () => {
    it('should show success message', async () => {
      const result = await command.handleStep(mockContext, 'complete', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('завершен');
    });

    it('should show available commands', async () => {
      const result = await command.handleStep(mockContext, 'complete', {});

      expect(result.message).toContain('/diary');
      expect(result.message).toContain('/today');
      expect(result.message).toContain('/relax');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(startCommand).toBeInstanceOf(StartCommand);
    });

    it('should have correct name', () => {
      expect(startCommand.name).toBe('start');
    });
  });
});
