/**
 * Content Library Integration Tests
 * ==================================
 * Tests for integration between Content Library and bot commands.
 *
 * Validates:
 * - RelaxCommand + ContentService integration
 * - MindfulCommand + ContentService integration
 * - SmartTipsCommand + ContentService integration
 * - Age-adaptive content delivery
 * - JITAI pattern implementation
 */

import { RelaxCommand } from '../../../src/bot/commands/RelaxCommand';
import { MindfulCommand } from '../../../src/bot/commands/MindfulCommand';
import { SmartTipsCommand } from '../../../src/bot/commands/SmartTipsCommand';
import { ContentService } from '../../../src/modules/content';

// Mock SleepCore context
const createMockContext = (overrides: Partial<any> = {}): any => ({
  userId: '123',
  chatId: 456,
  displayName: 'Test User',
  languageCode: 'ru',
  sleepCore: {
    getSession: jest.fn().mockReturnValue({
      ageGroup: 'adult',
      mbtiPlan: null,
      actiPlan: null,
    }),
    getRelaxationRecommendation: jest.fn().mockReturnValue({
      technique: 'breathing',
    }),
    getMindfulnessPractice: jest.fn().mockReturnValue({
      practice: 'breath_awareness',
    }),
  },
  ...overrides,
});

// Mock ContentService with test data
const mockContentItems = [
  {
    id: 'relax-breathing-001',
    version: 1,
    category: 'relaxation',
    subcategory: 'breathing',
    type: 'exercise',
    title: 'Дыхание 4-7-8',
    shortDescription: 'Расслабляющее дыхание',
    fullContent: 'Полное описание техники',
    steps: [
      { order: 1, instruction: 'Вдох на 4 счёта', duration: 4 },
      { order: 2, instruction: 'Задержка на 7 счётов', duration: 7 },
      { order: 3, instruction: 'Выдох на 8 счётов', duration: 8 },
    ],
    ageGroups: ['teen', 'adult'],
    difficulty: 'beginner',
    durationMinutes: 5,
    tags: ['breathing', 'sleep'],
    emotionalStates: ['stress', 'anxiety'],
    keywords: ['дыхание', 'релаксация'],
    evidenceLevel: 'A',
    reward: { xp: 15 },
    icon: '🌬️',
    order: 1,
    isActive: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'mindful-awareness-001',
    version: 1,
    category: 'mindfulness',
    subcategory: 'basic',
    type: 'exercise',
    title: 'Осознанное дыхание',
    shortDescription: 'Базовая практика осознанности',
    fullContent: 'Полное описание практики',
    ageGroups: ['teen', 'adult'],
    difficulty: 'beginner',
    durationMinutes: 10,
    tags: ['mindfulness', 'awareness'],
    emotionalStates: ['anxiety', 'stress'],
    keywords: ['осознанность', 'дыхание'],
    evidenceLevel: 'A',
    reward: { xp: 20 },
    icon: '🧘',
    order: 1,
    isActive: true,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

// Mock repository
class MockContentRepository {
  private content = new Map(mockContentItems.map(item => [item.id, item]));

  async getById(id: string) {
    return this.content.get(id) || null;
  }

  async query(options: any) {
    let results = Array.from(this.content.values());

    if (options.category) {
      results = results.filter(item => item.category === options.category);
    }

    if (options.ageGroup) {
      results = results.filter(item => item.ageGroups.includes(options.ageGroup));
    }

    return results;
  }

  async getForAgeGroup(ageGroup: string) {
    return this.query({ ageGroup });
  }

  async getCrisisContent() {
    return this.query({ category: 'crisis' });
  }

  async search(keyword: string) {
    const lower = keyword.toLowerCase();
    return Array.from(this.content.values()).filter(
      item => item.title.toLowerCase().includes(lower)
    );
  }

  async getAll() {
    return Array.from(this.content.values());
  }
}

describe('Content Library Integration', () => {
  describe('RelaxCommand Integration', () => {
    let command: RelaxCommand;
    let mockContext: any;

    beforeEach(() => {
      command = new RelaxCommand();
      mockContext = createMockContext();

      // Mock the content service
      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);
    });

    it('should execute and return menu with content from library', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Техники релаксации');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard!.length).toBeGreaterThan(0);
    });

    it('should show specific content by ID', async () => {
      const result = await command.execute(mockContext, 'relax-breathing-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Дыхание 4-7-8');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.contentId).toBe('relax-breathing-001');
    });

    it('should include XP reward in metadata', async () => {
      const result = await command.execute(mockContext, 'relax-breathing-001');

      expect(result.metadata!.xpReward).toBe(15);
    });

    it('should limit buttons to max 2 per row', async () => {
      const result = await command.execute(mockContext);

      result.keyboard!.forEach(row => {
        expect(row.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('MindfulCommand Integration', () => {
    let command: MindfulCommand;
    let mockContext: any;

    beforeEach(() => {
      command = new MindfulCommand();
      mockContext = createMockContext();

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);
    });

    it('should execute and return menu with content from library', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Практики осознанности');
      expect(result.keyboard).toBeDefined();
    });

    it('should show personalized menu for users with therapy plan', async () => {
      mockContext.sleepCore.getSession.mockReturnValue({
        ageGroup: 'adult',
        mbtiPlan: { active: true },
        actiPlan: null,
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('активный план терапии');
    });

    it('should show specific practice by ID', async () => {
      const result = await command.execute(mockContext, 'mindful-awareness-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Осознанное дыхание');
      expect(result.metadata!.contentId).toBe('mindful-awareness-001');
    });
  });

  describe('SmartTipsCommand Integration', () => {
    let command: SmartTipsCommand;
    let mockContext: any;

    beforeEach(() => {
      command = new SmartTipsCommand();
      mockContext = createMockContext();

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);
    });

    it('should execute and return personalized recommendations', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Персональные рекомендации');
      expect(result.keyboard).toBeDefined();
    });

    it('should parse emotion from Russian keyword', async () => {
      const result = await command.execute(mockContext, 'стресс');

      expect(result.success).toBe(true);
      expect(result.metadata!.emotion).toBe('stress');
    });

    it('should parse emotion from English keyword', async () => {
      const result = await command.execute(mockContext, 'anxiety');

      expect(result.success).toBe(true);
      expect(result.metadata!.emotion).toBe('anxiety');
    });

    it('should include time of day in metadata', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata!.timeOfDay).toBeDefined();
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(
        result.metadata!.timeOfDay
      );
    });

    it('should show quick filter buttons', async () => {
      const result = await command.execute(mockContext);

      const hasQuickFilter = result.keyboard!.some(row =>
        row.some(btn => btn.callbackData === 'tips:filter:quick')
      );
      expect(hasQuickFilter).toBe(true);
    });

    it('should show specific content by ID', async () => {
      const result = await command.execute(mockContext, 'relax-breathing-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Дыхание 4-7-8');
    });
  });

  describe('Age-Adaptive Content Delivery', () => {
    it('should filter content by age group for RelaxCommand', async () => {
      const command = new RelaxCommand();
      const mockContext = createMockContext();
      mockContext.sleepCore.getSession.mockReturnValue({
        ageGroup: 'child',
      });

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);

      const result = await command.execute(mockContext);

      // Should return empty or child-appropriate content
      expect(result.success).toBe(true);
    });

    it('should filter content by age group for MindfulCommand', async () => {
      const command = new MindfulCommand();
      const mockContext = createMockContext();
      mockContext.sleepCore.getSession.mockReturnValue({
        ageGroup: 'teen',
      });

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
    });
  });

  describe('Progressive Disclosure Pattern', () => {
    it('should limit initial content display to 5 items', async () => {
      const command = new RelaxCommand();
      const mockContext = createMockContext();

      // Create mock with many items
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        ...mockContentItems[0],
        id: `item-${i}`,
        title: `Техника ${i}`,
      }));

      const mockRepo = {
        getForAgeGroup: jest.fn().mockResolvedValue(manyItems),
        query: jest.fn().mockResolvedValue(manyItems),
        getById: jest.fn(),
        search: jest.fn(),
        getAll: jest.fn(),
        getCrisisContent: jest.fn().mockResolvedValue([]),
      };

      (command as any).contentService = new ContentService(mockRepo as any);

      const result = await command.execute(mockContext);

      // Should have "More" button when content > 5
      const hasMoreButton = result.keyboard!.some(row =>
        row.some(btn => btn.callbackData === 'relax:more')
      );
      expect(hasMoreButton).toBe(true);
    });

    it('should not show "More" button when content <= 5', async () => {
      const command = new RelaxCommand();
      const mockContext = createMockContext();

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);

      const result = await command.execute(mockContext);

      const hasMoreButton = result.keyboard!.some(row =>
        row.some(btn => btn.callbackData === 'relax:more')
      );
      expect(hasMoreButton).toBe(false);
    });
  });

  describe('JITAI Pattern Implementation', () => {
    it('should provide context-aware tips based on time', async () => {
      const command = new SmartTipsCommand();
      const mockContext = createMockContext();

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);

      const result = await command.execute(mockContext);

      // Should contain a context-aware tip
      expect(result.message).toMatch(/Утро|день|вечер|ночи/i);
    });

    it('should prioritize crisis content for panic emotion', async () => {
      const command = new SmartTipsCommand();
      const mockContext = createMockContext();

      const mockRepo = new MockContentRepository();
      (command as any).contentService = new ContentService(mockRepo as any);

      const result = await command.execute(mockContext, 'паника');

      expect(result.success).toBe(true);
      expect(result.message).toContain('/sos');
    });
  });
});

describe('ContentService Integration', () => {
  let service: ContentService;

  beforeEach(() => {
    const mockRepo = new MockContentRepository();
    service = new ContentService(mockRepo as any);
  });

  describe('formatForTelegram()', () => {
    it('should format content item for Telegram display', () => {
      const content = mockContentItems[0];
      const formatted = service.formatForTelegram(content as any);

      expect(formatted).toContain(content.title);
      expect(formatted).toContain(content.icon);
      expect(formatted).toContain('XP');
    });
  });

  describe('formatStepsForTelegram()', () => {
    it('should format content with steps', () => {
      const content = mockContentItems[0];
      const formatted = service.formatStepsForTelegram(content as any);

      expect(formatted).toContain(content.title);
      expect(formatted).toContain('Шаги');
      expect(formatted).toContain('Вдох');
    });

    it('should fallback to formatForTelegram if no steps', () => {
      const contentWithoutSteps = { ...mockContentItems[1] };
      const formatted = service.formatStepsForTelegram(contentWithoutSteps as any);

      expect(formatted).toContain(contentWithoutSteps.title);
    });
  });

  describe('getRecommendations()', () => {
    it('should return recommendations with relevance scores', async () => {
      const context = {
        userId: 123,
        ageGroup: 'adult' as const,
        currentEmotion: 'stress' as const,
      };

      const recommendations = await service.getRecommendations(context, 5);

      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(rec => {
        expect(rec.content).toBeDefined();
        expect(rec.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(rec.reason).toBeDefined();
      });
    });

    it('should prioritize content matching emotional state', async () => {
      const context = {
        userId: 123,
        ageGroup: 'adult' as const,
        currentEmotion: 'stress' as const,
      };

      const recommendations = await service.getRecommendations(context, 5);

      // Content matching stress should be in recommendations
      const stressContent = recommendations.filter(rec =>
        rec.content.emotionalStates.includes('stress')
      );
      expect(stressContent.length).toBeGreaterThan(0);
    });
  });
});
