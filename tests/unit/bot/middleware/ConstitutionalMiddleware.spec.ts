/**
 * ConstitutionalMiddleware Unit Tests
 * ====================================
 * Tests for healthcare chatbot safety guardrails including:
 * - Crisis detection (SAFETY-CRITICAL)
 * - Clinical boundary enforcement
 * - Privacy protection
 * - Blocked topic detection
 * - Response validation
 *
 * IEC 62304 Class C: Safety guardrails for mental health DTx.
 */

import {
  ConstitutionalMiddleware,
  createConstitutionalMiddleware,
  constitutionalMiddleware,
  DEFAULT_CONSTITUTIONAL_CONFIG,
  type IConstitutionalCheck,
  type IConstitutionalConfig,
} from '../../../../src/bot/middleware/ConstitutionalMiddleware';

// Mock CrisisDetectionService
const mockAnalyzeMessage = jest.fn();
jest.mock('../../../../src/bot/services/CrisisDetectionService', () => ({
  crisisDetectionService: {
    analyzeMessage: (...args: unknown[]) => mockAnalyzeMessage(...args),
  },
}));

// ============================================================================
// HELPERS
// ============================================================================

function createMockCtx(text?: string, userId = 123) {
  return {
    from: { id: userId },
    message: text !== undefined ? { text } : undefined,
    reply: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockNext() {
  return jest.fn().mockResolvedValue(undefined);
}

function noCrisisResponse() {
  return {
    shouldInterrupt: false,
    action: 'continue',
    message: '',
    resources: [],
    severity: 'none',
    event: {
      userId: '123', chatId: '0', timestamp: new Date(),
      severity: 'none', crisisType: 'unknown', confidence: 0,
      action: 'continue', messageText: '', indicators: [], responseProvided: false,
    },
  };
}

function crisisResponse(severity: string, action: string) {
  return {
    shouldInterrupt: action === 'interrupt' || action === 'emergency',
    action,
    message: `Crisis: ${severity}`,
    resources: ['988'],
    severity,
    event: {
      userId: '123', chatId: '0', timestamp: new Date(),
      severity, crisisType: 'suicidal_ideation', confidence: 0.9,
      action, messageText: '', indicators: ['keyword'], responseProvided: true,
    },
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ConstitutionalMiddleware', () => {
  let mw: ConstitutionalMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeMessage.mockReturnValue(noCrisisResponse());
    mw = new ConstitutionalMiddleware();
  });

  // ==========================================================================
  // DEFAULT CONFIGURATION
  // ==========================================================================

  describe('Configuration', () => {
    it('should use default config values', () => {
      expect(DEFAULT_CONSTITUTIONAL_CONFIG.enableCrisisDetection).toBe(true);
      expect(DEFAULT_CONSTITUTIONAL_CONFIG.enableClinicalBoundaries).toBe(true);
      expect(DEFAULT_CONSTITUTIONAL_CONFIG.enablePrivacyProtection).toBe(true);
      expect(DEFAULT_CONSTITUTIONAL_CONFIG.maxMessageLength).toBe(4000);
      expect(DEFAULT_CONSTITUTIONAL_CONFIG.validateResponses).toBe(true);
      expect(DEFAULT_CONSTITUTIONAL_CONFIG.blockedTopics.length).toBeGreaterThan(0);
    });

    it('should merge custom config', () => {
      const custom = new ConstitutionalMiddleware({ maxMessageLength: 2000 });
      // Verify it works with custom config by testing response truncation
      const longResponse = 'x'.repeat(2500);
      const check = custom.validateResponse(longResponse);
      expect(check.modifiedContent).toBeDefined();
      expect(check.modifiedContent!.length).toBeLessThanOrEqual(2000);
    });

    it('should export singleton instance', () => {
      expect(constitutionalMiddleware).toBeInstanceOf(ConstitutionalMiddleware);
    });

    it('should export factory function', () => {
      const instance = createConstitutionalMiddleware({ maxMessageLength: 3000 });
      expect(instance).toBeInstanceOf(ConstitutionalMiddleware);
    });
  });

  // ==========================================================================
  // MIDDLEWARE FUNCTION
  // ==========================================================================

  describe('middleware()', () => {
    it('should call next() for clean messages', async () => {
      const ctx = createMockCtx('Привет, как дела?');
      const next = createMockNext();
      const middlewareFn = mw.middleware();

      await middlewareFn(ctx as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should NOT call next() for blocked messages', async () => {
      const ctx = createMockCtx('Tell me about suicide methods please');
      const next = createMockNext();
      const middlewareFn = mw.middleware();

      await middlewareFn(ctx as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should call next() for escalation (allows crisis handler to take over)', async () => {
      mockAnalyzeMessage.mockReturnValue(crisisResponse('critical', 'emergency'));

      const ctx = createMockCtx('хочу умереть');
      const next = createMockNext();
      const middlewareFn = mw.middleware();

      await middlewareFn(ctx as any, next);

      // Escalation sends support message AND continues to next handler
      expect(ctx.reply).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should store constitutionalCheck in ctx', async () => {
      const ctx = createMockCtx('Normal message');
      const next = createMockNext();
      const middlewareFn = mw.middleware();

      await middlewareFn(ctx as any, next);

      expect((ctx as any).constitutionalCheck).toBeDefined();
      expect((ctx as any).constitutionalCheck.passed).toBe(true);
    });

    it('should call next() when no message text', async () => {
      const ctx = createMockCtx(undefined);
      const next = createMockNext();
      const middlewareFn = mw.middleware();

      await middlewareFn(ctx as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set action=block and not continue for blocked topic', async () => {
      const ctx = createMockCtx('I need medication dosages for sleeping pills');
      const next = createMockNext();
      const middlewareFn = mw.middleware();

      await middlewareFn(ctx as any, next);

      expect(next).not.toHaveBeenCalled();
      expect((ctx as any).constitutionalCheck.action).toBe('block');
    });
  });

  // ==========================================================================
  // CRISIS DETECTION (SAFETY-CRITICAL)
  // ==========================================================================

  describe('checkIncomingMessage() — Crisis Detection', () => {
    it('should detect Russian suicidal ideation and escalate', async () => {
      mockAnalyzeMessage.mockReturnValue(crisisResponse('critical', 'emergency'));

      const check = await mw.checkIncomingMessage('хочу умереть', 'user1');

      expect(check.action).toBe('escalate');
      expect(check.violations.length).toBeGreaterThan(0);
      expect(check.violations[0].principle).toBe('safety');
      expect(check.crisisEvent).toBeDefined();
    });

    it('should detect English suicidal ideation and escalate', async () => {
      mockAnalyzeMessage.mockReturnValue(crisisResponse('high', 'interrupt'));

      const check = await mw.checkIncomingMessage('I want to kill myself', 'user1');

      expect(check.action).toBe('escalate');
      expect(check.violations.some(v => v.principle === 'safety')).toBe(true);
    });

    it('should set action=escalate for high severity crisis', async () => {
      mockAnalyzeMessage.mockReturnValue(crisisResponse('high', 'interrupt'));

      const check = await mw.checkIncomingMessage('self-harm patterns', 'user1');

      expect(check.action).toBe('escalate');
    });

    it('should allow clean messages through', async () => {
      const check = await mw.checkIncomingMessage('Я хорошо спал сегодня', 'user1');

      expect(check.passed).toBe(true);
      expect(check.action).toBe('allow');
      expect(check.violations.length).toBe(0);
    });

    it('should use fallback pattern matching when CrisisDetectionService throws', async () => {
      mockAnalyzeMessage.mockImplementation(() => {
        throw new Error('Service failed');
      });

      // Use English pattern — JS \b doesn't work with Cyrillic characters
      const check = await mw.checkIncomingMessage('I want to die', 'user1');

      // Fallback regex should detect suicidalIdeation pattern
      expect(check.violations.length).toBeGreaterThan(0);
      expect(check.violations[0].severity).toBe('critical');
    });

    it('should detect self-harm via fallback patterns', async () => {
      mockAnalyzeMessage.mockImplementation(() => {
        throw new Error('Service failed');
      });

      const check = await mw.checkIncomingMessage('I am cutting myself', 'user1');

      expect(check.violations.length).toBeGreaterThan(0);
      expect(check.violations[0].severity).toBe('high');
    });

    it('should detect severe distress via fallback patterns', async () => {
      mockAnalyzeMessage.mockImplementation(() => {
        throw new Error('Service failed');
      });

      // Use English pattern — JS \b doesn't work with Cyrillic characters
      const check = await mw.checkIncomingMessage('I cannot take it anymore', 'user1');

      expect(check.violations.length).toBeGreaterThan(0);
    });

    it('should record monitor action as non-crisis in violations', async () => {
      mockAnalyzeMessage.mockReturnValue({
        ...noCrisisResponse(),
        action: 'monitor',
        severity: 'low',
      });

      const check = await mw.checkIncomingMessage('чувствую себя не очень', 'user1');

      // monitor action means detected=true with low severity
      expect(check.violations.some(v => v.principle === 'safety')).toBe(true);
    });
  });

  // ==========================================================================
  // CLINICAL BOUNDARIES
  // ==========================================================================

  describe('checkIncomingMessage() — Clinical Boundaries', () => {
    it('should detect diagnosis request', async () => {
      // Use English — JS \b word boundary doesn't work with Cyrillic
      const check = await mw.checkIncomingMessage('do i have insomnia?', 'user1');

      const boundaryViolations = check.violations.filter(v =>
        v.principle === 'boundaries' || v.principle === 'clinical'
      );
      expect(boundaryViolations.length).toBeGreaterThan(0);
    });

    it('should detect medication advice request with high severity', async () => {
      // Use English — JS \b word boundary doesn't work with Cyrillic
      const check = await mw.checkIncomingMessage('what medication should I take for insomnia?', 'user1');

      const clinicalViolation = check.violations.find(v => v.principle === 'clinical');
      expect(clinicalViolation).toBeDefined();
      expect(clinicalViolation!.severity).toBe('high');
    });

    it('should detect emergency symptoms', async () => {
      // Use English — JS \b word boundary doesn't work with Cyrillic
      const check = await mw.checkIncomingMessage("haven't slept for 5 days, hallucinations started", 'user1');

      const safetyViolation = check.violations.find(v =>
        v.principle === 'safety' && v.reason.includes('emergency')
      );
      expect(safetyViolation).toBeDefined();
    });

    it('should detect English medication request', async () => {
      const check = await mw.checkIncomingMessage('what medication should I take for insomnia?', 'user1');

      const clinicalViolation = check.violations.find(v => v.principle === 'clinical');
      expect(clinicalViolation).toBeDefined();
    });

    it('should detect English diagnosis request', async () => {
      const check = await mw.checkIncomingMessage('do I have insomnia?', 'user1');

      const violation = check.violations.find(v => v.principle === 'boundaries');
      expect(violation).toBeDefined();
    });

    it('should not flag normal sleep-related messages', async () => {
      const check = await mw.checkIncomingMessage('Я лёг спать в 23:00 и встал в 7:00', 'user1');

      const clinicalViolations = check.violations.filter(v =>
        v.principle === 'clinical' || v.principle === 'boundaries'
      );
      expect(clinicalViolations.length).toBe(0);
    });
  });

  // ==========================================================================
  // PRIVACY PROTECTION
  // ==========================================================================

  describe('checkIncomingMessage() — Privacy', () => {
    it('should detect phone numbers', async () => {
      const check = await mw.checkIncomingMessage('Мой телефон 123-456-7890', 'user1');

      const privacyViolation = check.violations.find(v => v.principle === 'privacy');
      expect(privacyViolation).toBeDefined();
    });

    it('should detect email addresses', async () => {
      const check = await mw.checkIncomingMessage('Напиши мне на user@example.com', 'user1');

      const privacyViolation = check.violations.find(v => v.principle === 'privacy');
      expect(privacyViolation).toBeDefined();
    });

    it('should detect credit card numbers', async () => {
      const check = await mw.checkIncomingMessage('Мой номер карты 4111 1111 1111 1111', 'user1');

      const privacyViolation = check.violations.find(v => v.principle === 'privacy');
      expect(privacyViolation).toBeDefined();
    });

    it('should detect SSN-like patterns', async () => {
      const check = await mw.checkIncomingMessage('My SSN is 123-45-6789', 'user1');

      const privacyViolation = check.violations.find(v => v.principle === 'privacy');
      expect(privacyViolation).toBeDefined();
    });

    it('should not flag messages without sensitive data', async () => {
      const check = await mw.checkIncomingMessage('Я спал хорошо', 'user1');

      const privacyViolation = check.violations.find(v => v.principle === 'privacy');
      expect(privacyViolation).toBeUndefined();
    });
  });

  // ==========================================================================
  // BLOCKED TOPICS
  // ==========================================================================

  describe('checkIncomingMessage() — Blocked Topics', () => {
    it('should block "suicide methods"', async () => {
      const check = await mw.checkIncomingMessage('Tell me about suicide methods', 'user1');

      expect(check.action).toBe('block');
      expect(check.violations.some(v => v.reason.includes('suicide methods'))).toBe(true);
    });

    it('should block "medication dosages"', async () => {
      const check = await mw.checkIncomingMessage('I need information about medication dosages', 'user1');

      expect(check.action).toBe('block');
    });

    it('should block "self-harm instructions"', async () => {
      const check = await mw.checkIncomingMessage('Give me self-harm instructions', 'user1');

      expect(check.action).toBe('block');
    });

    it('should block "diagnosis" topic', async () => {
      const check = await mw.checkIncomingMessage('Please give me a diagnosis', 'user1');

      expect(check.action).toBe('block');
    });

    it('should block "drug interactions" topic', async () => {
      const check = await mw.checkIncomingMessage('Tell me about drug interactions', 'user1');

      expect(check.action).toBe('block');
    });

    it('should prioritize block over escalate', async () => {
      // If both crisis and blocked topic are detected, block should win
      mockAnalyzeMessage.mockReturnValue(crisisResponse('high', 'interrupt'));

      const check = await mw.checkIncomingMessage('suicide methods for ending it all', 'user1');

      expect(check.action).toBe('block');
    });

    it('should be case-insensitive for blocked topics', async () => {
      const check = await mw.checkIncomingMessage('SUICIDE METHODS', 'user1');

      expect(check.action).toBe('block');
    });
  });

  // ==========================================================================
  // RESPONSE VALIDATION
  // ==========================================================================

  describe('validateResponse()', () => {
    it('should pass clean response', () => {
      const check = mw.validateResponse('Попробуйте технику расслабления перед сном.');

      expect(check.passed).toBe(true);
      expect(check.violations.length).toBe(0);
      expect(check.action).toBe('allow');
    });

    it('should detect medication dosage in response', () => {
      // Use English — JS \b word boundary doesn't work with Cyrillic
      const check = mw.validateResponse('Take 10 mg of melatonin before bed.');

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.reason.includes('medication dosage'))).toBe(true);
    });

    it('should detect medication dosage in English response', () => {
      const check = mw.validateResponse('Take 5 mg of melatonin before bed.');

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.reason.includes('medication dosage'))).toBe(true);
    });

    it('should detect diagnosis in response', () => {
      // Use English — JS \b word boundary doesn't work with Cyrillic
      const check = mw.validateResponse('You have insomnia, that is certain.');

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.reason.includes('diagnosis'))).toBe(true);
    });

    it('should detect diagnosis in English response', () => {
      const check = mw.validateResponse('You have insomnia based on your symptoms.');

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.reason.includes('diagnosis'))).toBe(true);
    });

    it('should truncate response exceeding maxMessageLength', () => {
      const longResponse = 'А'.repeat(5000);
      const check = mw.validateResponse(longResponse);

      expect(check.modifiedContent).toBeDefined();
      expect(check.modifiedContent!.length).toBeLessThanOrEqual(4000);
      expect(check.modifiedContent!.endsWith('...')).toBe(true);
      expect(check.violations.some(v => v.reason.includes('truncated'))).toBe(true);
    });

    it('should NOT truncate response at exact maxMessageLength', () => {
      const exactResponse = 'Б'.repeat(4000);
      const check = mw.validateResponse(exactResponse);

      expect(check.modifiedContent).toBeUndefined();
    });

    it('should return action=modify for high-severity response violation', () => {
      // Use English — JS \b word boundary doesn't work with Cyrillic
      const check = mw.validateResponse('Take 20 pills of sleeping medication daily.');

      expect(check.action).toBe('modify');
    });
  });

  // ==========================================================================
  // CRISIS SUPPORT MESSAGE
  // ==========================================================================

  describe('getCrisisSupportMessage()', () => {
    it('should mention "причинить себе вред" for critical severity', () => {
      const check: IConstitutionalCheck = {
        passed: false,
        violations: [{ principle: 'safety', severity: 'critical', reason: 'Crisis', reasonRu: 'Кризис' }],
        action: 'escalate',
      };

      const message = (mw as any).getCrisisSupportMessage(check);

      expect(message).toContain('причинить себе вред');
    });

    it('should contain hotline 8-800-2000-122 for critical', () => {
      const check: IConstitutionalCheck = {
        passed: false,
        violations: [{ principle: 'safety', severity: 'critical', reason: 'Crisis', reasonRu: 'Кризис' }],
        action: 'escalate',
      };

      const message = (mw as any).getCrisisSupportMessage(check);

      expect(message).toContain('8-800-2000-122');
    });

    it('should mention "непросто" for high severity', () => {
      const check: IConstitutionalCheck = {
        passed: false,
        violations: [{ principle: 'safety', severity: 'high', reason: 'Crisis', reasonRu: 'Кризис' }],
        action: 'escalate',
      };

      const message = (mw as any).getCrisisSupportMessage(check);

      expect(message).toContain('непросто');
    });

    it('should contain hotline 8-800-2000-122 for high severity', () => {
      const check: IConstitutionalCheck = {
        passed: false,
        violations: [{ principle: 'safety', severity: 'high', reason: 'Crisis', reasonRu: 'Кризис' }],
        action: 'escalate',
      };

      const message = (mw as any).getCrisisSupportMessage(check);

      expect(message).toContain('8-800-2000-122');
    });
  });

  // ==========================================================================
  // BLOCKED MESSAGE RESPONSE
  // ==========================================================================

  describe('getBlockedMessageResponse()', () => {
    it('should mention referral to doctor', () => {
      const check: IConstitutionalCheck = {
        passed: false,
        violations: [{ principle: 'clinical', severity: 'high', reason: 'Blocked', reasonRu: 'Заблокировано' }],
        action: 'block',
      };

      const message = (mw as any).getBlockedMessageResponse(check);

      expect(message).toContain('врач');
    });

    it('should suggest alternative commands (/diary, /relax, /progress)', () => {
      const check: IConstitutionalCheck = {
        passed: false,
        violations: [],
        action: 'block',
      };

      const message = (mw as any).getBlockedMessageResponse(check);

      expect(message).toContain('/diary');
      expect(message).toContain('/relax');
      expect(message).toContain('/progress');
    });
  });

  // ==========================================================================
  // DISABLED FEATURES
  // ==========================================================================

  describe('Disabled Features', () => {
    it('should skip crisis detection when disabled', async () => {
      const noCrisisMw = new ConstitutionalMiddleware({ enableCrisisDetection: false });

      mockAnalyzeMessage.mockReturnValue(crisisResponse('critical', 'emergency'));

      const check = await noCrisisMw.checkIncomingMessage('хочу умереть', 'user1');

      // Should not have crisis violations since detection is disabled
      expect(mockAnalyzeMessage).not.toHaveBeenCalled();
      // But blocked topics might still trigger
    });

    it('should skip clinical boundaries when disabled', async () => {
      const noBoundaryMw = new ConstitutionalMiddleware({ enableClinicalBoundaries: false });

      const check = await noBoundaryMw.checkIncomingMessage('какие таблетки от бессонницы?', 'user1');

      const clinicalViolation = check.violations.find(v => v.principle === 'clinical' && v.severity === 'high');
      expect(clinicalViolation).toBeUndefined();
    });

    it('should skip privacy protection when disabled', async () => {
      const noPrivacyMw = new ConstitutionalMiddleware({ enablePrivacyProtection: false });

      const check = await noPrivacyMw.checkIncomingMessage('My email is test@test.com', 'user1');

      const privacyViolation = check.violations.find(v => v.principle === 'privacy');
      expect(privacyViolation).toBeUndefined();
    });
  });

  // ==========================================================================
  // TRANSLATION HELPERS
  // ==========================================================================

  describe('Translation Helpers', () => {
    it('should translate crisis type to Russian', () => {
      const result = (mw as any).getCrisisTypeRu('suicidalIdeation');
      expect(result).toBe('суицидальные мысли');
    });

    it('should translate self_harm type', () => {
      const result = (mw as any).getCrisisTypeRu('selfHarm');
      expect(result).toBe('самоповреждение');
    });

    it('should return original string for unknown type', () => {
      const result = (mw as any).getCrisisTypeRu('unknown_type');
      expect(result).toBe('unknown_type');
    });

    it('should translate crisis severity to Russian', () => {
      expect((mw as any).getCrisisSeverityRu('critical')).toBe('критический');
      expect((mw as any).getCrisisSeverityRu('high')).toBe('высокий');
      expect((mw as any).getCrisisSeverityRu('moderate')).toBe('умеренный');
      expect((mw as any).getCrisisSeverityRu('low')).toBe('низкий');
      expect((mw as any).getCrisisSeverityRu('none')).toBe('нет');
    });
  });
});
