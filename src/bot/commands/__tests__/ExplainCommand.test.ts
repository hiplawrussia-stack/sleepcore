/**
 * ExplainCommand Tests
 * ====================
 *
 * XAI (Explainable AI) explanations for recommendations.
 * FDA AI Guidance 2025 compliance for transparency.
 *
 * @packageDocumentation
 */

import { ExplainCommand, explainCommand } from '../ExplainCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    tip: (text: string) => `💡 ${text}`,
    say: (text: string) => `_${text}_`,
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

describe('ExplainCommand', () => {
  let command: ExplainCommand;
  let mockContext: ISleepCoreContext;
  let mockExplainCurrentIntervention: jest.Mock;

  beforeEach(() => {
    command = new ExplainCommand();

    mockExplainCurrentIntervention = jest.fn();

    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        explainCurrentIntervention: mockExplainCurrentIntervention,
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('explain');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('Объяснение');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('почему_так');
      expect(command.aliases).toContain('объясни');
      expect(command.aliases).toContain('explainability');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  // ==========================================================================
  // EXECUTE - MENU
  // ==========================================================================
  describe('Execute - Menu', () => {
    it('should show explanation menu when no context', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Объяснения AI');
    });

    it('should mention XAI', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('XAI');
    });

    it('should list explanation topics', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Рекомендации');
      expect(result.message).toContain('Прогнозы');
      expect(result.message).toContain('Цифровой двойник');
      expect(result.message).toContain('Данные');
      expect(result.message).toContain('Ограничения');
    });

    it('should have topic buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'explain:recommendation:general')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'explain:prediction')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'explain:twin')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'explain:how_ai_works')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'explain:data_usage')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'explain:limitations')).toBeDefined();
    });
  });

  // ==========================================================================
  // CONTEXT HANDLING
  // ==========================================================================
  describe('Context Handling', () => {
    it('should store context via setContext', () => {
      command.setContext('user123', 'recommendation', { recommendationId: 'rec1' });

      // Context is stored internally, tested via execute
    });

    it('should explain last context when set', async () => {
      command.setContext('user123', 'recommendation', { recommendationId: 'rec1' });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('рекомендации');
    });

    it('should explain prediction context', async () => {
      command.setContext('user123', 'prediction', {});

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('прогноз');
    });

    it('should explain twin context', async () => {
      command.setContext('user123', 'twin', {});

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Цифровой двойник');
    });
  });

  // ==========================================================================
  // RECOMMENDATION EXPLANATION
  // ==========================================================================
  describe('Recommendation Explanation', () => {
    it('should show recommendation explanation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Как формируются рекомендации');
    });

    it('should mention CBT-I protocols', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('CBT-I');
      expect(result.message).toContain('Sleep Restriction');
      expect(result.message).toContain('Stimulus Control');
    });

    it('should mention AI personalization', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('Thompson Sampling');
      expect(result.message).toContain('PLRNN');
    });

    it('should show static example when no personalized explanation', async () => {
      mockExplainCurrentIntervention.mockRejectedValue(new Error('No data'));

      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('Пример объяснения');
      expect(result.message).toContain('6.5 часов');
    });

    it('should show personalized explanation when available', async () => {
      mockExplainCurrentIntervention.mockResolvedValue({
        summaryRu: 'Сократить время в кровати',
        reasoningRu: 'Низкая эффективность сна',
        keyFactors: [
          { nameRu: 'SE', value: '72%', impact: 'hurts', emoji: '📊', explanationRu: 'Низкая эффективность' },
        ],
        confidence: { level: 'high', emoji: '✅', descriptionRu: 'Высокая уверенность' },
        actionableAdviceRu: ['Соблюдайте расписание'],
        limitationsRu: [],
        disclaimerRu: 'Это не медицинский совет',
      });

      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('Сократить время в кровати');
      expect(result.message).toContain('Низкая эффективность');
    });

    it('should have next topic button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'explain:prediction')).toBeDefined();
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'explain:menu')).toBeDefined();
    });
  });

  // ==========================================================================
  // PREDICTION EXPLANATION
  // ==========================================================================
  describe('Prediction Explanation', () => {
    it('should show prediction explanation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Как строятся прогнозы');
    });

    it('should explain PLRNN', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.message).toContain('PLRNN');
      expect(result.message).toContain('нейросеть');
    });

    it('should explain data collection step', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.message).toContain('Сбор данных');
      expect(result.message).toContain('5D вектор');
    });

    it('should list sleep metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.message).toContain('SE');
      expect(result.message).toContain('SOL');
      expect(result.message).toContain('WASO');
      expect(result.message).toContain('TST');
    });

    it('should explain calibration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.message).toContain('Калибровка');
      expect(result.message).toContain('уверенность');
    });

    it('should cite scientific sources', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.message).toContain('npj Digital Medicine');
      expect(result.message).toContain('Durstewitz');
    });
  });

  // ==========================================================================
  // DIGITAL TWIN EXPLANATION
  // ==========================================================================
  describe('Digital Twin Explanation', () => {
    it('should show digital twin explanation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Цифровой двойник');
    });

    it('should explain what-if scenarios', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      expect(result.message).toContain('Что если');
      expect(result.message).toContain('лечь раньше');
    });

    it('should explain trajectory tracking', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      expect(result.message).toContain('траектори');
      expect(result.message).toContain('перелома');
    });

    it('should explain risk warnings', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      expect(result.message).toContain('Предупреждать');
      expect(result.message).toContain('Bifurcation');
    });

    it('should list twin components', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      expect(result.message).toContain('Kalman');
      expect(result.message).toContain('Monte Carlo');
    });

    it('should have whatif button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'whatif:menu')).toBeDefined();
    });
  });

  // ==========================================================================
  // HOW AI WORKS EXPLANATION
  // ==========================================================================
  describe('How AI Works Explanation', () => {
    it('should show how AI works', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Как работает AI');
    });

    it('should explain CogniCore Engine', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.message).toContain('CogniCore');
      expect(result.message).toContain('Thompson Sampling');
    });

    it('should explain Constitutional AI', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.message).toContain('Constitutional AI');
      expect(result.message).toContain('безопасность');
    });

    it('should explain Motivational Interviewing', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.message).toContain('Motivational Interviewing');
      expect(result.message).toContain('MITI');
    });

    it('should list third-wave therapies', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.message).toContain('MBT-I');
      expect(result.message).toContain('ACT-I');
      expect(result.message).toContain('MCT');
    });

    it('should state AI principles', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.message).toContain('данных');
      expect(result.message).toContain('Прозрачность');
      expect(result.message).toContain('Безопасность');
    });
  });

  // ==========================================================================
  // DATA USAGE EXPLANATION
  // ==========================================================================
  describe('Data Usage Explanation', () => {
    it('should show data usage explanation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Использование');
      expect(result.message).toContain('данных');
    });

    it('should list collected data types', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      expect(result.message).toContain('Дневник сна');
      expect(result.message).toContain('опросники');
      expect(result.message).toContain('Голосовые');
    });

    it('should explain data usage purposes', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      expect(result.message).toContain('Персонализация');
      expect(result.message).toContain('Прогнозирование');
    });

    it('should explain data protection', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      expect(result.message).toContain('Шифрование');
      expect(result.message).toContain('GDPR');
      expect(result.message).toContain('152');
    });

    it('should explain user rights', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      expect(result.message).toContain('Запросить');
      expect(result.message).toContain('Удалить');
      expect(result.message).toContain('Экспортировать');
    });

    it('should have export button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'profile:export')).toBeDefined();
    });
  });

  // ==========================================================================
  // LIMITATIONS EXPLANATION
  // ==========================================================================
  describe('Limitations Explanation', () => {
    it('should show limitations explanation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ограничения');
    });

    it('should state cannot replace doctor', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.message).toContain('Заменить врача');
      expect(result.message).toContain('диагнозы');
      expect(result.message).toContain('лекарства');
    });

    it('should state cannot guarantee result', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.message).toContain('Гарантировать');
      expect(result.message).toContain('70-80%');
    });

    it('should state needs data', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.message).toContain('7 дней');
      expect(result.message).toContain('данных');
    });

    it('should state crisis limitations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.message).toContain('кризис');
      expect(result.message).toContain('8-800');
    });

    it('should list when to see doctor', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.message).toContain('обратиться к врачу');
      expect(result.message).toContain('апноэ');
      expect(result.message).toContain('3 месяц');
    });

    it('should have SOS button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'sos:menu')).toBeDefined();
    });
  });

  // ==========================================================================
  // SAFETY MEASURES EXPLANATION
  // ==========================================================================
  describe('Safety Measures Explanation', () => {
    it('should show safety measures', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('безопасности');
    });

    it('should explain Constitutional AI layer', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      expect(result.message).toContain('Constitutional AI');
      expect(result.message).toContain('проверяются');
    });

    it('should explain crisis detection', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      expect(result.message).toContain('Crisis Detection');
      expect(result.message).toContain('Ключевые слова');
    });

    it('should explain human escalation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      expect(result.message).toContain('Human Escalation');
      expect(result.message).toContain('админа');
    });

    it('should explain adverse event reporting', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      expect(result.message).toContain('Adverse Event');
      expect(result.message).toContain('CIOMS');
    });

    it('should have SOS button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'sos:menu')).toBeDefined();
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should route to recommendation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:rec1',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('рекомендации');
    });

    it('should route to prediction', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:prediction',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('прогноз');
    });

    it('should route to twin', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:twin',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Цифровой двойник');
    });

    it('should route to how_ai_works', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:how_ai_works',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Как работает AI');
    });

    it('should route to data_usage', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:data_usage',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('данных');
    });

    it('should route to safety', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:safety',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('безопасности');
    });

    it('should route to limitations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:limitations',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ограничения');
    });

    it('should show menu for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:unknown',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Объяснения AI');
    });

    it('should show menu for menu action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'explain:menu',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Объяснения AI');
    });
  });

  // ==========================================================================
  // PERSONALIZED EXPLANATION FORMATTING
  // ==========================================================================
  describe('Personalized Explanation Formatting', () => {
    it('should format key factors with impact icons', async () => {
      mockExplainCurrentIntervention.mockResolvedValue({
        summaryRu: 'Тест',
        reasoningRu: 'Причина',
        keyFactors: [
          { nameRu: 'Позитивный', value: '90%', impact: 'helps', emoji: '✅', explanationRu: 'Хорошо' },
          { nameRu: 'Негативный', value: '30%', impact: 'hurts', emoji: '⚠️', explanationRu: 'Плохо' },
          { nameRu: 'Нейтральный', value: '50%', impact: 'neutral', emoji: '➖', explanationRu: 'Норма' },
        ],
        confidence: { level: 'medium', emoji: '🟡', descriptionRu: 'Средняя уверенность' },
        actionableAdviceRu: ['Совет 1', 'Совет 2'],
        limitationsRu: [],
        disclaimerRu: '',
      });

      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('✅'); // helps icon
      expect(result.message).toContain('⚠️'); // hurts icon
    });

    it('should show confidence level', async () => {
      mockExplainCurrentIntervention.mockResolvedValue({
        summaryRu: 'Тест',
        reasoningRu: 'Причина',
        keyFactors: [],
        confidence: { level: 'high', emoji: '🟢', descriptionRu: 'Высокая уверенность' },
        actionableAdviceRu: [],
        limitationsRu: [],
        disclaimerRu: '',
      });

      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('Уверенность');
      expect(result.message).toContain('Высокая');
    });

    it('should show actionable advice', async () => {
      mockExplainCurrentIntervention.mockResolvedValue({
        summaryRu: 'Тест',
        reasoningRu: 'Причина',
        keyFactors: [],
        confidence: { level: 'high', emoji: '✅', descriptionRu: 'Высокая' },
        actionableAdviceRu: ['Ложитесь в 23:00', 'Вставайте в 7:00'],
        limitationsRu: [],
        disclaimerRu: '',
      });

      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('Что вы можете сделать');
      expect(result.message).toContain('Ложитесь в 23:00');
    });

    it('should show disclaimer', async () => {
      mockExplainCurrentIntervention.mockResolvedValue({
        summaryRu: 'Тест',
        reasoningRu: 'Причина',
        keyFactors: [],
        confidence: { level: 'high', emoji: '✅', descriptionRu: 'Высокая' },
        actionableAdviceRu: [],
        limitationsRu: [],
        disclaimerRu: 'Это не замена врачу',
      });

      const result = await command.handleCallback(
        mockContext,
        'explain:recommendation:general',
        {}
      );

      expect(result.message).toContain('не замена врачу');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(explainCommand).toBeInstanceOf(ExplainCommand);
    });

    it('should have correct name', () => {
      expect(explainCommand.name).toBe('explain');
    });
  });
});
