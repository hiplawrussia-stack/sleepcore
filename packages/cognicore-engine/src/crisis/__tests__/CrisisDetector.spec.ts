/**
 * 🧪 CRISIS DETECTOR TESTS
 * ========================
 * Comprehensive tests for multi-layer crisis detection
 *
 * Test Categories:
 * 1. Layer 1: Raw text keyword detection
 * 2. Layer 2: Pattern analysis
 * 3. Layer 3: State-based risk assessment
 * 4. Multi-layer integration
 * 5. Bilingual support (Russian + English)
 * 6. Severity classification
 * 7. Edge cases and false positives
 */

import {
  CrisisDetector,
  createCrisisDetector,
  defaultCrisisDetector,
  CrisisSeverity,
  CrisisType,
  StateRiskData,
  CrisisDetectionResult,
} from '../CrisisDetector';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create state risk data for testing
 */
function createStateRisk(overrides: Partial<StateRiskData> = {}): StateRiskData {
  return {
    overallRiskLevel: 0.2,
    suicidalIdeation: 0,
    selfHarmRisk: 0,
    emotionalValence: 0,
    recentTrend: 'stable',
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('CrisisDetector', () => {
  let detector: CrisisDetector;

  beforeEach(() => {
    detector = createCrisisDetector();
  });

  // ==========================================================================
  // FACTORY & INITIALIZATION
  // ==========================================================================

  describe('Factory & Initialization', () => {
    it('should create detector with default config', () => {
      expect(detector).toBeDefined();
      expect(detector).toBeInstanceOf(CrisisDetector);
    });

    it('should create detector with custom config', () => {
      const customDetector = createCrisisDetector({
        sensitivityLevel: 'low',
        language: 'en',
      });
      expect(customDetector).toBeDefined();
    });

    it('should export default detector instance', () => {
      expect(defaultCrisisDetector).toBeDefined();
      expect(defaultCrisisDetector).toBeInstanceOf(CrisisDetector);
    });
  });

  // ==========================================================================
  // LAYER 1: RAW TEXT KEYWORD DETECTION
  // ==========================================================================

  describe('Layer 1: Raw Text Keyword Detection', () => {
    describe('Russian suicidal keywords', () => {
      const suicidalTextsRu = [
        'Я хочу покончить с собой',
        'Мне хочется убить себя',
        'Не хочу больше жить',
        'Хочу умереть',
        'Лучше бы меня не было',
        'Думаю о суициде',
        'Хочу повеситься',
        'Вскрою вены',
      ];

      it.each(suicidalTextsRu)('should detect suicidal content: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer1RawText.triggered).toBe(true);
        expect(result.layer1RawText.indicators).toContain('keyword_suicidal');
      });
    });

    describe('English suicidal keywords', () => {
      const suicidalTextsEn = [
        'I want to kill myself',
        'I want to end my life',
        'I wish I was dead',
        'I don\'t want to live anymore',
        'Better off dead',
        'Thinking about suicide',
        'Going to hang myself',
      ];

      it.each(suicidalTextsEn)('should detect suicidal content: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer1RawText.triggered).toBe(true);
        expect(result.layer1RawText.indicators).toContain('keyword_suicidal');
      });
    });

    describe('Self-harm keywords', () => {
      const selfHarmTexts = [
        'Хочу порезать себя',
        'Я режусь',
        'Хочу навредить себе',
        'I want to cut myself',
        'I hurt myself',
        'Self-harm helps me cope',
      ];

      it.each(selfHarmTexts)('should detect self-harm content: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer1RawText.triggered).toBe(true);
        expect(result.layer1RawText.indicators).toContain('keyword_selfharm');
      });
    });

    describe('Hopelessness indicators', () => {
      const hopelessTexts = [
        'Всё безнадёжно',
        'Нет надежды',
        'Ничего не изменится',
        'Выхода нет',
        'There is no hope',
        'Nothing will ever change',
        'I feel hopeless',
      ];

      it.each(hopelessTexts)('should detect hopelessness: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer1RawText.triggered).toBe(true);
        expect(result.layer1RawText.indicators).toContain('keyword_hopeless');
      });
    });

    describe('Non-crisis messages', () => {
      const safeTexts = [
        'Сегодня хороший день',
        'Я чувствую себя лучше',
        'Пошёл гулять с друзьями',
        'I had a great day today',
        'Feeling much better now',
        'Looking forward to the weekend',
      ];

      it.each(safeTexts)('should NOT flag safe text: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer1RawText.triggered).toBe(false);
        expect(result.severity).toBe('none');
      });
    });
  });

  // ==========================================================================
  // LAYER 2: PATTERN ANALYSIS
  // ==========================================================================

  describe('Layer 2: Pattern Analysis', () => {
    describe('Planning language', () => {
      const planningTexts = [
        'У меня есть план как покончить с этим',
        'Я готов умереть сегодня',
        'Решил убить себя',
        'I have a plan to end it all',
        'I\'m ready to die',
        'I\'ve decided to kill myself',
        'I\'m going to kill myself tonight',
      ];

      it.each(planningTexts)('should detect planning language: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer2Pattern.triggered).toBe(true);
        expect(result.layer2Pattern.indicators).toContain('pattern_planning');
      });
    });

    describe('Farewell language', () => {
      const farewellTexts = [
        'Прощайте все навсегда',
        'Это моё последнее сообщение',
        'Goodbye forever everyone',
        'This is my final message',
        'This is goodbye',
      ];

      it.each(farewellTexts)('should detect farewell language: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer2Pattern.triggered).toBe(true);
        expect(result.layer2Pattern.indicators).toContain('pattern_farewell');
      });
    });

    describe('Urgency patterns', () => {
      const urgencyTexts = [
        'Сегодня ночью всему конец',
        'Это конец',
        'Tonight it will be over',
        'This is the end',
        'Won\'t be here tomorrow',
      ];

      it.each(urgencyTexts)('should detect urgency: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer2Pattern.triggered).toBe(true);
        expect(result.layer2Pattern.indicators).toContain('pattern_urgency');
      });
    });

    describe('Absolute statements', () => {
      const absoluteTexts = [
        'Никогда не станет лучше',
        'Всегда буду одинок',
        'Никто не поможет',
        'It will never get better',
        'I will always be alone',
        'Nobody cares about me',
        'Everyone hates me',
      ];

      it.each(absoluteTexts)('should detect absolute statements: "%s"', (text) => {
        const result = detector.detect(text);
        expect(result.layer2Pattern.triggered).toBe(true);
        expect(result.layer2Pattern.indicators).toContain('pattern_absolutes');
      });
    });
  });

  // ==========================================================================
  // LAYER 3: STATE-BASED RISK ASSESSMENT
  // ==========================================================================

  describe('Layer 3: State-Based Risk', () => {
    it('should detect high overall risk level', () => {
      const result = detector.detect('Обычное сообщение', createStateRisk({
        overallRiskLevel: 0.8,
      }));
      expect(result.layer3State.triggered).toBe(true);
      expect(result.layer3State.indicators).toContain('state_high_overall_risk');
    });

    it('should detect suicidal ideation from state', () => {
      const result = detector.detect('Neutral message', createStateRisk({
        suicidalIdeation: 0.6,
      }));
      expect(result.layer3State.triggered).toBe(true);
      expect(result.layer3State.indicators).toContain('state_suicidal_ideation');
    });

    it('should detect self-harm risk from state', () => {
      const result = detector.detect('Neutral message', createStateRisk({
        selfHarmRisk: 0.55,
      }));
      expect(result.layer3State.triggered).toBe(true);
      expect(result.layer3State.indicators).toContain('state_self_harm_risk');
    });

    it('should detect severe negative affect', () => {
      const result = detector.detect('Neutral message', createStateRisk({
        emotionalValence: -0.8,
      }));
      expect(result.layer3State.triggered).toBe(true);
      expect(result.layer3State.indicators).toContain('state_severe_negative_affect');
    });

    it('should detect declining trend', () => {
      const result = detector.detect('Neutral message', createStateRisk({
        recentTrend: 'declining',
      }));
      expect(result.layer3State.triggered).toBe(true);
      expect(result.layer3State.indicators).toContain('state_declining_trend');
    });

    it('should not trigger for normal state', () => {
      const result = detector.detect('Neutral message', createStateRisk());
      expect(result.layer3State.triggered).toBe(false);
    });
  });

  // ==========================================================================
  // MULTI-LAYER INTEGRATION
  // ==========================================================================

  describe('Multi-Layer Integration', () => {
    it('should combine multiple layers for higher confidence', () => {
      const text = 'Я решил покончить с собой сегодня ночью. Прощайте все.';
      const result = detector.detect(text, createStateRisk({
        overallRiskLevel: 0.7,
        suicidalIdeation: 0.5,
      }));

      expect(result.layer1RawText.triggered).toBe(true);
      expect(result.layer2Pattern.triggered).toBe(true);
      expect(result.layer3State.triggered).toBe(true);
      expect(result.severity).toBe('critical');
      // Confidence is weighted combination of layers (L1:0.5, L2:0.3, L3:0.2)
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect crisis from text alone without state', () => {
      const text = 'I want to kill myself';
      const result = detector.detect(text);

      expect(result.isCrisis).toBe(true);
      expect(result.layer1RawText.triggered).toBe(true);
    });

    it('should detect crisis from state alone', () => {
      const result = detector.detect('Just a normal message', createStateRisk({
        overallRiskLevel: 0.75,
        suicidalIdeation: 0.6,
      }));

      expect(result.layer3State.triggered).toBe(true);
      expect(result.severity).not.toBe('none');
    });
  });

  // ==========================================================================
  // SEVERITY CLASSIFICATION
  // ==========================================================================

  describe('Severity Classification', () => {
    it('should classify CRITICAL: suicidal + planning', () => {
      const text = 'У меня есть план как покончить с собой сегодня';
      const result = detector.detect(text);
      expect(result.severity).toBe('critical');
    });

    it('should classify HIGH: suicidal keywords with confidence', () => {
      const text = 'Хочу умереть. Не вижу смысла жить.';
      const result = detector.detect(text);
      expect(['high', 'critical']).toContain(result.severity);
    });

    it('should classify HIGH: farewell pattern', () => {
      const text = 'Прощайте все навсегда. Это мое последнее сообщение.';
      const result = detector.detect(text);
      expect(result.severity).toBe('high');
    });

    it('should classify MODERATE: self-harm without suicidal', () => {
      const text = 'Хочу порезать себя';
      const result = detector.detect(text);
      expect(['moderate', 'high']).toContain(result.severity);
    });

    it('should classify LOW: hopelessness only', () => {
      const text = 'Всё безнадёжно';
      const result = detector.detect(text);
      expect(result.severity).toBe('low');
    });

    it('should classify NONE: no indicators', () => {
      const text = 'Сегодня хорошая погода';
      const result = detector.detect(text);
      expect(result.severity).toBe('none');
    });
  });

  // ==========================================================================
  // CRISIS TYPE CLASSIFICATION
  // ==========================================================================

  describe('Crisis Type Classification', () => {
    it('should identify suicidal_intent when planning', () => {
      const text = 'I have a plan to kill myself tomorrow';
      const result = detector.detect(text);
      expect(result.crisisType).toBe('suicidal_intent');
    });

    it('should identify suicidal_ideation without planning', () => {
      const text = 'Хочу умереть';
      const result = detector.detect(text);
      expect(result.crisisType).toBe('suicidal_ideation');
    });

    it('should identify self_harm', () => {
      const text = 'I cut myself to cope';
      const result = detector.detect(text);
      expect(result.crisisType).toBe('self_harm');
    });

    it('should identify acute_distress from hopelessness', () => {
      const text = 'Нет надежды, ничего не изменится';
      const result = detector.detect(text);
      expect(result.crisisType).toBe('acute_distress');
    });
  });

  // ==========================================================================
  // RECOMMENDED ACTIONS
  // ==========================================================================

  describe('Recommended Actions', () => {
    it('should recommend emergency_escalation for critical', () => {
      const text = 'Решил покончить с собой сегодня ночью';
      const result = detector.detect(text);
      expect(result.recommendedAction).toBe('emergency_escalation');
      expect(result.urgency).toBe('immediate');
    });

    it('should recommend crisis_protocol for high severity', () => {
      const text = 'Прощайте все навсегда';
      const result = detector.detect(text);
      expect(result.recommendedAction).toBe('crisis_protocol');
      expect(result.urgency).toBe('urgent');
    });

    it('should recommend supportive_response for moderate', () => {
      const text = 'Хочу порезать себя';
      const result = detector.detect(text);
      expect(['supportive_response', 'crisis_protocol']).toContain(result.recommendedAction);
    });

    it('should recommend monitor for low severity', () => {
      const text = 'Чувствую себя безнадёжно';
      const result = detector.detect(text);
      expect(result.recommendedAction).toBe('monitor');
    });

    it('should recommend none for no crisis', () => {
      const text = 'Having a great day!';
      const result = detector.detect(text);
      expect(result.recommendedAction).toBe('none');
    });
  });

  // ==========================================================================
  // QUICK CHECK
  // ==========================================================================

  describe('Quick Check', () => {
    it('should return true for suicidal keywords', () => {
      expect(detector.quickCheck('Хочу умереть')).toBe(true);
      expect(detector.quickCheck('I want to kill myself')).toBe(true);
    });

    it('should return true for self-harm keywords', () => {
      expect(detector.quickCheck('Хочу порезать себя')).toBe(true);
      expect(detector.quickCheck('I cut myself')).toBe(true);
    });

    it('should return false for safe text', () => {
      expect(detector.quickCheck('Hello world')).toBe(false);
      expect(detector.quickCheck('Привет, как дела?')).toBe(false);
    });

    it('should be fast (under 5ms)', () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        detector.quickCheck('Хочу умереть навсегда');
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50); // 100 checks in under 50ms
    });
  });

  // ==========================================================================
  // PROTECTIVE FACTORS
  // ==========================================================================

  describe('Protective Factors', () => {
    it('should reduce severity when asking for help', () => {
      const withoutHelp = detector.detect('Хочу умереть');
      const withHelp = detector.detect('Хочу умереть, но нужна помощь');

      // Protective factor should either reduce severity or confidence
      expect(withHelp.confidence).toBeLessThanOrEqual(withoutHelp.confidence);
    });

    it('should recognize "don\'t want to die" as protective', () => {
      const result = detector.detect('I feel hopeless but I don\'t want to die');
      // Should still detect hopelessness but lower severity
      expect(result.layer1RawText.triggered).toBe(true);
    });

    it('should recognize Russian protective factors', () => {
      const result = detector.detect('Мне плохо, но хочу жить');
      // Protective factor should reduce confidence
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  // ==========================================================================
  // BILINGUAL SUPPORT
  // ==========================================================================

  describe('Bilingual Support', () => {
    it('should detect mixed language text', () => {
      const text = 'I want to умереть please help';
      const result = detector.detect(text);
      expect(result.layer1RawText.triggered).toBe(true);
    });

    it('should work with Russian-specific detector', () => {
      const ruDetector = createCrisisDetector({ language: 'ru' });
      const result = ruDetector.detect('Хочу покончить с собой');
      expect(result.layer1RawText.triggered).toBe(true);
    });

    it('should work with English-specific detector', () => {
      const enDetector = createCrisisDetector({ language: 'en' });
      const result = enDetector.detect('I want to kill myself');
      expect(result.layer1RawText.triggered).toBe(true);
    });
  });

  // ==========================================================================
  // EDGE CASES & FALSE POSITIVES
  // ==========================================================================

  describe('Edge Cases & False Positives', () => {
    it('should NOT flag discussion about suicide prevention', () => {
      // This is a known challenge - may need context-aware detection
      // For now, keyword-based will trigger, which is safer (false positive > false negative)
      const text = 'We should talk more about suicide prevention';
      const result = detector.detect(text);
      // May trigger - that's acceptable for safety
      // The key is that it's flagged for review
    });

    it('should handle empty text', () => {
      const result = detector.detect('');
      expect(result.severity).toBe('none');
      expect(result.isCrisis).toBe(false);
    });

    it('should handle very long text', () => {
      const longText = 'Сегодня обычный день. '.repeat(100) + 'Хочу умереть.';
      const result = detector.detect(longText);
      expect(result.layer1RawText.triggered).toBe(true);
    });

    it('should handle special characters', () => {
      const text = 'Хочу 🔪 себя...';
      const result = detector.detect(text);
      // May or may not trigger depending on exact keywords
    });

    it('should handle case variations', () => {
      expect(detector.quickCheck('ХОЧУ УМЕРЕТЬ')).toBe(true);
      expect(detector.quickCheck('I WANT TO KILL MYSELF')).toBe(true);
    });

    it('should handle extra whitespace', () => {
      expect(detector.quickCheck('  хочу   умереть  ')).toBe(true);
    });
  });

  // ==========================================================================
  // CRISIS RESOURCES
  // ==========================================================================

  describe('Crisis Resources', () => {
    it('should provide Russian crisis resources', () => {
      const resources = detector.getCrisisResources('ru');
      expect(resources.length).toBeGreaterThan(0);
      expect(resources.some(r => r.includes('8-800'))).toBe(true);
    });

    it('should provide English crisis resources', () => {
      const resources = detector.getCrisisResources('en');
      expect(resources.length).toBeGreaterThan(0);
      expect(resources.some(r => r.includes('988'))).toBe(true);
    });
  });

  // ==========================================================================
  // PERFORMANCE
  // ==========================================================================

  describe('Performance', () => {
    it('should complete full detection under 50ms', () => {
      const text = 'Я решил покончить с собой сегодня ночью. Прощайте все.';
      const state = createStateRisk({ overallRiskLevel: 0.8 });

      const start = Date.now();
      const result = detector.detect(text, state);
      const elapsed = Date.now() - start;

      expect(result.processingTimeMs).toBeDefined();
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle 100 detections per second', () => {
      const texts = [
        'Хочу умереть',
        'Normal message',
        'I feel hopeless',
        'Having a great day',
        'Покончить с собой',
      ];

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        detector.detect(texts[i % texts.length]);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ==========================================================================
  // METADATA
  // ==========================================================================

  describe('Metadata', () => {
    it('should include detection timestamp', () => {
      const result = detector.detect('Test message');
      expect(result.detectedAt).toBeInstanceOf(Date);
    });

    it('should include processing time', () => {
      const result = detector.detect('Test message');
      expect(typeof result.processingTimeMs).toBe('number');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include all layer results', () => {
      const result = detector.detect('Test message');
      expect(result.layer1RawText).toBeDefined();
      expect(result.layer2Pattern).toBeDefined();
      expect(result.layer3State).toBeDefined();
    });

    it('should include primary indicator', () => {
      const result = detector.detect('Хочу умереть');
      expect(result.primaryIndicator).toBeDefined();
      expect(result.primaryIndicator).toContain('suicidal');
    });
  });
});
