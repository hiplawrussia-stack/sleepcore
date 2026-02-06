/**
 * AdaptivePersonaService Tests
 * ============================
 *
 * Tests for adaptive conversational persona service.
 * Validates tone adaptation, MI strategy selection, and change stage detection.
 *
 * @packageDocumentation
 */

import {
  AdaptivePersonaService,
  adaptivePersonaService,
  createAdaptivePersonaService,
  DEFAULT_ADAPTIVE_CONFIG,
  type IEmotionalState,
  type ChangeStage,
  type MIStrategy,
} from '../AdaptivePersonaService';

describe('AdaptivePersonaService', () => {
  let service: AdaptivePersonaService;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    service = new AdaptivePersonaService();
  });

  /**
   * Create test emotional state
   */
  function createEmotionalState(
    overrides: Partial<IEmotionalState> = {}
  ): IEmotionalState {
    return {
      primary: 'neutral',
      intensity: 0.5,
      sentiment: 0,
      stressLevel: 0.3,
      engagement: 0.5,
      ...overrides,
    };
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = DEFAULT_ADAPTIVE_CONFIG;

      expect(config.enabled).toBe(true);
      expect(config.defaultChangeStage).toBe('contemplation');
      expect(config.strategyWeights).toBeDefined();
      expect(config.toneFactors).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customService = new AdaptivePersonaService({
        enabled: false,
        defaultChangeStage: 'action',
      });

      // Service should be created (we can't directly access config, but it shouldn't throw)
      expect(customService).toBeDefined();
    });
  });

  // ==========================================================================
  // Tone Adaptation
  // ==========================================================================
  describe('Tone Adaptation', () => {
    it('should adapt tone for neutral state', async () => {
      const result = await service.adaptTone(
        testUserId,
        'Это тестовое сообщение.',
        createEmotionalState({ primary: 'neutral' })
      );

      expect(result.original).toBe('Это тестовое сообщение.');
      expect(result.adapted).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should add empathy for discouraged state', async () => {
      const result = await service.adaptTone(
        testUserId,
        'Попробуй ещё раз.',
        createEmotionalState({ primary: 'discouraged' })
      );

      expect(result.toneAdjustments).toContain('added_empathy');
      expect(result.adapted).not.toBe(result.original);
    });

    it('should add empathy for frustrated state', async () => {
      const result = await service.adaptTone(
        testUserId,
        'Сделай упражнение.',
        createEmotionalState({ primary: 'frustrated' })
      );

      expect(result.toneAdjustments).toContain('added_empathy');
    });

    it('should add reassurance for anxious state', async () => {
      const result = await service.adaptTone(
        testUserId,
        'Начни выполнение.',
        createEmotionalState({ primary: 'anxious' })
      );

      expect(result.toneAdjustments).toContain('added_reassurance');
    });

    it('should simplify message for high stress', async () => {
      const longMessage = 'Это длинное сообщение. Оно содержит много предложений. Которые нужно упростить. Для лучшего восприятия.';

      const result = await service.adaptTone(
        testUserId,
        longMessage,
        createEmotionalState({ stressLevel: 0.8 })
      );

      expect(result.toneAdjustments).toContain('simplified');
    });

    it('should add motivation for low engagement', async () => {
      const result = await service.adaptTone(
        testUserId,
        'Продолжим.',
        createEmotionalState({ engagement: 0.2 })
      );

      expect(result.toneAdjustments).toContain('added_motivation');
    });

    it('should include change stage in result', async () => {
      const result = await service.adaptTone(testUserId, 'Test');

      expect(result.changeStage).toBeDefined();
    });
  });

  // ==========================================================================
  // MI Strategy Selection
  // ==========================================================================
  describe('MI Strategy Selection', () => {
    it('should select MI strategy for user', async () => {
      const strategy = await service.selectMIStrategy(testUserId);

      const validStrategies: MIStrategy[] = [
        'express_empathy',
        'develop_discrepancy',
        'roll_with_resistance',
        'support_self_efficacy',
        'elicit_change_talk',
        'affirm',
      ];

      expect(validStrategies).toContain(strategy);
    });

    it('should adjust for high sustain talk', async () => {
      // Run multiple times to account for randomness
      const strategies: MIStrategy[] = [];
      for (let i = 0; i < 20; i++) {
        const strategy = await service.selectMIStrategy(testUserId, {
          recentSustainTalk: 0.8,
        });
        strategies.push(strategy);
      }

      // With high sustain talk, roll_with_resistance and express_empathy should be more common
      const empathyCount = strategies.filter(s =>
        s === 'roll_with_resistance' || s === 'express_empathy'
      ).length;
      expect(empathyCount).toBeGreaterThan(0);
    });

    it('should adjust for high change talk', async () => {
      const strategies: MIStrategy[] = [];
      for (let i = 0; i < 20; i++) {
        const strategy = await service.selectMIStrategy(testUserId, {
          recentChangeTalk: 0.8,
        });
        strategies.push(strategy);
      }

      // With high change talk, support and affirm should be more common
      const supportCount = strategies.filter(s =>
        s === 'support_self_efficacy' || s === 'affirm'
      ).length;
      expect(supportCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Change Stage Adaptation
  // ==========================================================================
  describe('Change Stage Adaptation', () => {
    it('should adapt to precontemplation stage', async () => {
      await service.updateChangeStage(testUserId, 'precontemplation');

      const result = await service.adaptToChangeStage(testUserId, 'Попробуй это сделать.');

      expect(result.toneAdjustments).toContain('removed_pressure');
      expect(result.toneAdjustments).toContain('added_curiosity');
    });

    it('should adapt to contemplation stage', async () => {
      await service.updateChangeStage(testUserId, 'contemplation');

      const result = await service.adaptToChangeStage(testUserId, 'Рекомендация.');

      expect(result.toneAdjustments).toContain('added_reflection');
    });

    it('should adapt to preparation stage', async () => {
      await service.updateChangeStage(testUserId, 'preparation');

      const result = await service.adaptToChangeStage(testUserId, 'Вот информация.');

      expect(result.toneAdjustments).toContain('added_action_steps');
    });

    it('should adapt to action stage', async () => {
      await service.updateChangeStage(testUserId, 'action');

      const result = await service.adaptToChangeStage(testUserId, 'Ты делаешь это.');

      expect(result.toneAdjustments).toContain('added_reinforcement');
    });

    it('should adapt to maintenance stage', async () => {
      await service.updateChangeStage(testUserId, 'maintenance');

      const result = await service.adaptToChangeStage(testUserId, 'Продолжай.');

      expect(result.toneAdjustments).toContain('added_maintenance_support');
    });

    it('should include selected MI strategy', async () => {
      const result = await service.adaptToChangeStage(testUserId, 'Test');

      expect(result.miStrategy).not.toBeNull();
    });
  });

  // ==========================================================================
  // Change Stage Detection
  // ==========================================================================
  describe('Change Stage Detection', () => {
    it('should detect precontemplation for new users', async () => {
      const stage = await service.detectChangeStage(testUserId, [], {
        daysInProgram: 0,
        sessionCount: 1,
      });

      expect(stage).toBe('precontemplation');
    });

    it('should detect contemplation for low engagement', async () => {
      const stage = await service.detectChangeStage(testUserId, [], {
        daysInProgram: 7,
        sessionCount: 5,
        diaryCompletionRate: 0.2,
      });

      expect(stage).toBe('contemplation');
    });

    it('should detect preparation for moderate engagement', async () => {
      const stage = await service.detectChangeStage(testUserId, [], {
        daysInProgram: 7,
        sessionCount: 5,
        diaryCompletionRate: 0.4,
      });

      expect(stage).toBe('preparation');
    });

    it('should detect action for high engagement', async () => {
      const stage = await service.detectChangeStage(testUserId, [], {
        daysInProgram: 14,
        sessionCount: 10,
        diaryCompletionRate: 0.7,
        recommendationFollowRate: 0.6,
      });

      expect(stage).toBe('action');
    });

    it('should detect maintenance for long-term high engagement', async () => {
      const stage = await service.detectChangeStage(testUserId, [], {
        daysInProgram: 35,
        sessionCount: 30,
        diaryCompletionRate: 0.8,
        recommendationFollowRate: 0.7,
      });

      expect(stage).toBe('maintenance');
    });
  });

  // ==========================================================================
  // Emotional State Updates
  // ==========================================================================
  describe('Emotional State Updates', () => {
    it('should update emotional state', async () => {
      await service.updateEmotionalState(testUserId, createEmotionalState({
        primary: 'positive',
        sentiment: 0.8,
      }));

      const profile = await service.getCommunicationProfile(testUserId);

      // Baseline should be updated
      expect(profile.emotionalBaseline.primary).toBe('positive');
    });

    it('should calculate baseline from history', async () => {
      // Add multiple states
      for (let i = 0; i < 5; i++) {
        await service.updateEmotionalState(testUserId, createEmotionalState({
          primary: 'tired',
          intensity: 0.6 + i * 0.05,
          stressLevel: 0.4 + i * 0.05,
        }));
      }

      const profile = await service.getCommunicationProfile(testUserId);

      expect(profile.emotionalBaseline.primary).toBe('tired');
      expect(profile.emotionalBaseline.intensity).toBeGreaterThan(0.5);
    });

    it('should limit history to last 20 states', async () => {
      // Add 25 states
      for (let i = 0; i < 25; i++) {
        await service.updateEmotionalState(testUserId, createEmotionalState({
          primary: i % 2 === 0 ? 'positive' : 'neutral',
        }));
      }

      // Should not throw and profile should still work
      const profile = await service.getCommunicationProfile(testUserId);
      expect(profile).toBeDefined();
    });
  });

  // ==========================================================================
  // Communication Profile
  // ==========================================================================
  describe('Communication Profile', () => {
    it('should create default profile for new user', async () => {
      const profile = await service.getCommunicationProfile(testUserId);

      expect(profile.userId).toBe(testUserId);
      expect(profile.changeStage).toBe('contemplation');
      expect(profile.preferences).toBeDefined();
      expect(profile.preferences.formality).toBe('informal');
      expect(profile.preferences.verbosity).toBe('moderate');
      expect(profile.preferences.encouragementLevel).toBe('medium');
    });

    it('should return existing profile', async () => {
      await service.updateChangeStage(testUserId, 'action');

      const profile = await service.getCommunicationProfile(testUserId);

      expect(profile.changeStage).toBe('action');
    });

    it('should update change stage', async () => {
      await service.updateChangeStage(testUserId, 'maintenance');

      const profile = await service.getCommunicationProfile(testUserId);

      expect(profile.changeStage).toBe('maintenance');
      expect(profile.lastUpdated).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Strategy and Stage Descriptions
  // ==========================================================================
  describe('Strategy and Stage Descriptions', () => {
    it('should return MI strategy descriptions', () => {
      const strategies: MIStrategy[] = [
        'express_empathy',
        'develop_discrepancy',
        'roll_with_resistance',
        'support_self_efficacy',
        'elicit_change_talk',
        'affirm',
      ];

      for (const strategy of strategies) {
        const description = service.getMIStrategyDescription(strategy);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      }
    });

    it('should return change stage descriptions', () => {
      const stages: ChangeStage[] = [
        'precontemplation',
        'contemplation',
        'preparation',
        'action',
        'maintenance',
      ];

      for (const stage of stages) {
        const description = service.getChangeStageDescription(stage);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      }
    });

    it('should return Russian descriptions', () => {
      const description = service.getMIStrategyDescription('express_empathy');
      expect(description).toContain('эмпатии');

      const stageDesc = service.getChangeStageDescription('action');
      expect(stageDesc).toContain('меняется');
    });
  });

  // ==========================================================================
  // High Encouragement Level
  // ==========================================================================
  describe('High Encouragement Level', () => {
    it('should increase encouragement when profile requests it', async () => {
      // First, we need to create a profile with high encouragement
      // Since preferences are internal, we test through adaptTone behavior
      const profile = await service.getCommunicationProfile(testUserId);

      // Manually set high encouragement (this is testing internal behavior)
      (profile.preferences as { encouragementLevel: string }).encouragementLevel = 'high';

      const result = await service.adaptTone(testUserId, 'Продолжай работу.');

      expect(result.toneAdjustments).toContain('increased_encouragement');
    });
  });

  // ==========================================================================
  // Factory and Singleton
  // ==========================================================================
  describe('Factory and Singleton', () => {
    it('should create service via factory', () => {
      const created = createAdaptivePersonaService({
        defaultChangeStage: 'preparation',
      });

      expect(created).toBeInstanceOf(AdaptivePersonaService);
    });

    it('should export singleton instance', () => {
      expect(adaptivePersonaService).toBeInstanceOf(AdaptivePersonaService);
    });

    it('should adapt tone via singleton', async () => {
      const result = await adaptivePersonaService.adaptTone(
        'singleton_user',
        'Test message'
      );

      expect(result).toBeDefined();
      expect(result.adapted).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const result = await service.adaptTone(testUserId, '');

      expect(result.original).toBe('');
      expect(result.adapted).toBeDefined();
    });

    it('should handle very long messages', async () => {
      const longMessage = 'Тест. '.repeat(100);

      const result = await service.adaptTone(
        testUserId,
        longMessage,
        createEmotionalState({ stressLevel: 0.9 })
      );

      // Should be simplified
      expect(result.toneAdjustments).toContain('simplified');
      expect(result.adapted.length).toBeLessThan(longMessage.length);
    });

    it('should handle all emotional states', async () => {
      const emotions: IEmotionalState['primary'][] = [
        'neutral',
        'positive',
        'tired',
        'frustrated',
        'anxious',
        'hopeful',
        'discouraged',
      ];

      for (const primary of emotions) {
        const result = await service.adaptTone(
          testUserId,
          'Test',
          createEmotionalState({ primary })
        );
        expect(result).toBeDefined();
      }
    });

    it('should handle missing behavior indicators', async () => {
      const stage = await service.detectChangeStage(testUserId, []);

      // Should default to precontemplation without data
      expect(['precontemplation', 'contemplation']).toContain(stage);
    });

    it('should remove calls to action in precontemplation', async () => {
      await service.updateChangeStage(testUserId, 'precontemplation');

      const result = await service.adaptToChangeStage(
        testUserId,
        'Попробуй сделать это. Начни прямо сейчас.'
      );

      // Imperatives should be softened
      expect(result.adapted).toContain('можно');
    });
  });
});
