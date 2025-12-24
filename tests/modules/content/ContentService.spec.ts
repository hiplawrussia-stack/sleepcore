/**
 * ContentService Unit Tests
 * =========================
 * Tests for the Content Library service.
 */

import { ContentService } from '../../../src/modules/content/application/services/ContentService';
import { JsonContentRepository } from '../../../src/modules/content/infrastructure/repositories/JsonContentRepository';
import {
  IContentItem,
  AgeGroup,
  EmotionalState,
  ContentCategory,
} from '../../../src/modules/content/domain/entities/ContentItem';
import { IContentContext } from '../../../src/modules/content/domain/interfaces/IContentService';

// Mock content items for testing
const mockContent: IContentItem[] = [
  {
    id: 'test-breathing-001',
    version: 1,
    category: 'relaxation',
    subcategory: 'breathing',
    type: 'exercise',
    title: 'Test Breathing Exercise',
    shortDescription: 'A test breathing exercise',
    fullContent: 'Full content here',
    steps: [
      { order: 1, instruction: 'Breathe in', duration: 4 },
      { order: 2, instruction: 'Breathe out', duration: 4 },
    ],
    ageGroups: ['teen', 'adult'],
    difficulty: 'beginner',
    durationMinutes: 5,
    tags: ['breathing', 'stress'],
    emotionalStates: ['stress', 'anxiety'],
    keywords: ['breathing', 'relaxation'],
    evidenceLevel: 'A',
    reward: { xp: 15 },
    icon: '🌬️',
    order: 1,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'test-crisis-001',
    version: 1,
    category: 'crisis',
    subcategory: 'tipp-skills',
    type: 'technique',
    title: 'Crisis TIPP',
    shortDescription: 'Crisis intervention',
    fullContent: 'Crisis content',
    ageGroups: ['teen', 'adult'],
    difficulty: 'beginner',
    durationMinutes: 2,
    tags: ['crisis', 'TIPP'],
    emotionalStates: ['crisis', 'panic'],
    keywords: ['crisis', 'emergency'],
    evidenceLevel: 'B',
    reward: { xp: 20 },
    icon: '🧊',
    order: 1,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'test-sleep-001',
    version: 1,
    category: 'sleep',
    subcategory: 'techniques',
    type: 'technique',
    title: 'Sleep Technique',
    shortDescription: 'Help you sleep',
    fullContent: 'Sleep content',
    ageGroups: ['adult'],
    difficulty: 'intermediate',
    durationMinutes: 10,
    tags: ['sleep', 'insomnia'],
    emotionalStates: ['insomnia'],
    keywords: ['sleep', 'insomnia'],
    evidenceLevel: 'A',
    reward: { xp: 25 },
    icon: '😴',
    order: 1,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'test-child-001',
    version: 1,
    category: 'relaxation',
    subcategory: 'breathing',
    type: 'exercise',
    title: 'Child Breathing',
    shortDescription: 'Fun breathing for kids',
    fullContent: 'Child-friendly content',
    ageGroups: ['child'],
    difficulty: 'beginner',
    durationMinutes: 2,
    tags: ['breathing', 'kids'],
    emotionalStates: ['anxiety', 'fear'],
    keywords: ['kids', 'children'],
    evidenceLevel: 'B',
    reward: { xp: 10 },
    icon: '🐰',
    order: 2,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

// Mock repository
class MockContentRepository {
  private content: Map<string, IContentItem> = new Map();

  constructor() {
    mockContent.forEach(item => this.content.set(item.id, item));
  }

  async getById(id: string): Promise<IContentItem | null> {
    return this.content.get(id) || null;
  }

  async query(options: any): Promise<IContentItem[]> {
    let results = Array.from(this.content.values());

    if (options.category) {
      results = results.filter(item => item.category === options.category);
    }

    if (options.ageGroup) {
      results = results.filter(item => item.ageGroups.includes(options.ageGroup));
    }

    if (options.emotionalState) {
      results = results.filter(item =>
        item.emotionalStates.includes(options.emotionalState)
      );
    }

    if (options.maxDurationMinutes) {
      results = results.filter(
        item => item.durationMinutes <= options.maxDurationMinutes
      );
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getByCategory(category: string): Promise<IContentItem[]> {
    return this.query({ category });
  }

  async getForAgeGroup(ageGroup: string): Promise<IContentItem[]> {
    return this.query({ ageGroup });
  }

  async getForEmotionalState(state: string): Promise<IContentItem[]> {
    return this.query({ emotionalState: state });
  }

  async getCrisisContent(): Promise<IContentItem[]> {
    return this.query({ category: 'crisis' });
  }

  async search(keyword: string): Promise<IContentItem[]> {
    const lower = keyword.toLowerCase();
    return Array.from(this.content.values()).filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        item.keywords.some(k => k.toLowerCase().includes(lower))
    );
  }

  async getAll(): Promise<IContentItem[]> {
    return Array.from(this.content.values());
  }
}

describe('ContentService', () => {
  let service: ContentService;
  let mockRepo: MockContentRepository;

  beforeEach(() => {
    mockRepo = new MockContentRepository();
    service = new ContentService(mockRepo as any);
  });

  describe('getRecommendations()', () => {
    it('should return recommendations for adult', async () => {
      const context: IContentContext = {
        userId: 123,
        ageGroup: 'adult',
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
      const context: IContentContext = {
        userId: 123,
        ageGroup: 'adult',
        currentEmotion: 'stress',
      };

      const recommendations = await service.getRecommendations(context, 5);

      // Content matching stress should have higher scores
      const stressContent = recommendations.filter(rec =>
        rec.content.emotionalStates.includes('stress')
      );

      expect(stressContent.length).toBeGreaterThan(0);
    });

    it('should respect age group filter', async () => {
      const context: IContentContext = {
        userId: 123,
        ageGroup: 'child',
      };

      const recommendations = await service.getRecommendations(context, 5);

      recommendations.forEach(rec => {
        expect(rec.content.ageGroups).toContain('child');
      });
    });
  });

  describe('getContentForEmotion()', () => {
    it('should return content for stress', async () => {
      const content = await service.getContentForEmotion('stress', 'adult');

      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.emotionalStates).toContain('stress');
      });
    });

    it('should include crisis content for panic', async () => {
      const content = await service.getContentForEmotion('panic', 'adult');

      const crisisContent = content.filter(item => item.category === 'crisis');
      expect(crisisContent.length).toBeGreaterThan(0);
    });

    it('should filter quick content for high intensity', async () => {
      const content = await service.getContentForEmotion('anxiety', 'adult', 0.9);

      content.forEach(item => {
        expect(item.durationMinutes).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('getQuickRelief()', () => {
    it('should return content under 5 minutes', async () => {
      const context: IContentContext = {
        userId: 123,
        ageGroup: 'adult',
      };

      const content = await service.getQuickRelief(context);

      content.forEach(item => {
        expect(item.durationMinutes).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('getCrisisIntervention()', () => {
    it('should return crisis content', async () => {
      const content = await service.getCrisisIntervention('adult');

      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.category).toBe('crisis');
      });
    });

    it('should filter by age group', async () => {
      const content = await service.getCrisisIntervention('teen');

      content.forEach(item => {
        expect(item.ageGroups).toContain('teen');
      });
    });
  });

  describe('getSleepContent()', () => {
    it('should return sleep category content', async () => {
      const content = await service.getSleepContent('adult');

      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.category).toBe('sleep');
      });
    });
  });

  describe('getRelaxationContent()', () => {
    it('should return relaxation content', async () => {
      const content = await service.getRelaxationContent('adult');

      expect(content.length).toBeGreaterThan(0);
      content.forEach(item => {
        expect(item.category).toBe('relaxation');
      });
    });

    it('should filter by duration', async () => {
      const content = await service.getRelaxationContent('adult', 3);

      content.forEach(item => {
        expect(item.durationMinutes).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('getDailyContent()', () => {
    it('should return daily content structure', async () => {
      const context: IContentContext = {
        userId: 123,
        ageGroup: 'adult',
      };

      const daily = await service.getDailyContent(context);

      expect(daily).toBeDefined();
      // At least one of the fields should be defined
      expect(
        daily.morning || daily.afternoon || daily.evening || daily.crisis
      ).toBeDefined();
    });
  });

  describe('recordCompletion()', () => {
    it('should record and retrieve completion history', async () => {
      const completion = {
        contentId: 'test-breathing-001',
        userId: 123,
        completedAt: new Date(),
        xpEarned: 15,
      };

      await service.recordCompletion(completion);

      const history = await service.getContentHistory(123);

      expect(history.length).toBe(1);
      expect(history[0].contentId).toBe('test-breathing-001');
    });
  });

  describe('getContent()', () => {
    it('should return content by ID', async () => {
      const content = await service.getContent('test-breathing-001');

      expect(content).toBeDefined();
      expect(content?.id).toBe('test-breathing-001');
    });

    it('should return null for non-existent ID', async () => {
      const content = await service.getContent('non-existent');

      expect(content).toBeNull();
    });
  });

  describe('search()', () => {
    it('should find content by keyword', async () => {
      const results = await service.search('breathing');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by age group in context', async () => {
      const context: IContentContext = {
        userId: 123,
        ageGroup: 'child',
      };

      const results = await service.search('breathing', context);

      results.forEach(item => {
        expect(item.ageGroups).toContain('child');
      });
    });
  });

  describe('formatForTelegram()', () => {
    it('should format content for Telegram display', async () => {
      const content = mockContent[0];
      const formatted = service.formatForTelegram(content);

      expect(formatted).toContain(content.title);
      expect(formatted).toContain(content.icon);
      expect(formatted).toContain(content.shortDescription);
      expect(formatted).toContain('XP');
    });
  });

  describe('formatStepsForTelegram()', () => {
    it('should format steps for Telegram display', async () => {
      const content = mockContent[0];
      const formatted = service.formatStepsForTelegram(content);

      expect(formatted).toContain(content.title);
      expect(formatted).toContain('Шаги');
      expect(formatted).toContain('Breathe in');
      expect(formatted).toContain('Breathe out');
    });

    it('should fallback to formatForTelegram if no steps', async () => {
      const contentWithoutSteps = { ...mockContent[1] };
      delete (contentWithoutSteps as any).steps;

      const formatted = service.formatStepsForTelegram(contentWithoutSteps);

      expect(formatted).toContain(contentWithoutSteps.title);
    });
  });
});

describe('ContentItem Entity', () => {
  const { ContentItem } = require('../../../src/modules/content/domain/entities/ContentItem');

  it('should check if suitable for age group', () => {
    const item = new ContentItem(mockContent[0]);

    expect(item.isSuitableFor('adult')).toBe(true);
    expect(item.isSuitableFor('teen')).toBe(true);
    expect(item.isSuitableFor('child')).toBe(false);
  });

  it('should check if addresses emotion', () => {
    const item = new ContentItem(mockContent[0]);

    expect(item.addressesEmotion('stress')).toBe(true);
    expect(item.addressesEmotion('anxiety')).toBe(true);
    expect(item.addressesEmotion('insomnia')).toBe(false);
  });

  it('should format duration correctly', () => {
    const item = new ContentItem(mockContent[0]);
    expect(item.getFormattedDuration()).toBe('5 минут');

    const shortItem = new ContentItem({ ...mockContent[0], durationMinutes: 1 });
    expect(shortItem.getFormattedDuration()).toBe('1 минута');

    const twoMin = new ContentItem({ ...mockContent[0], durationMinutes: 2 });
    expect(twoMin.getFormattedDuration()).toBe('2 минуты');
  });

  it('should get difficulty label', () => {
    const item = new ContentItem(mockContent[0]);
    expect(item.getDifficultyLabel()).toBe('Начальный');

    const advItem = new ContentItem({ ...mockContent[0], difficulty: 'advanced' });
    expect(advItem.getDifficultyLabel()).toBe('Продвинутый');
  });

  it('should get evidence description', () => {
    const item = new ContentItem(mockContent[0]);
    expect(item.getEvidenceDescription()).toContain('мета-анализы');
  });
});
