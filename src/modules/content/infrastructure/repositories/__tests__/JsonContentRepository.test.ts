/**
 * JsonContentRepository Unit Tests
 * =================================
 * Comprehensive tests for JSON-based content repository.
 *
 * Coverage targets:
 * - Constructor and initialization
 * - File loading (recursive directory traversal)
 * - Query operations with all filter combinations
 * - Sorting and pagination
 * - Random content selection
 * - Search functionality
 * - Statistics aggregation
 * - Singleton pattern
 *
 * @packageDocumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { JsonContentRepository, getContentRepository } from '../JsonContentRepository';
import {
  IContentItem,
  ContentCategory,
  ContentSubcategory,
  AgeGroup,
  DifficultyLevel,
  EmotionalState,
} from '../../../domain/entities/ContentItem';
import { IContentQuery } from '../../../domain/interfaces/IContentRepository';

// Mock fs module
jest.mock('fs');

// Using 'any' to avoid complex Dirent type incompatibilities across Node.js versions
const mockFs = fs as jest.Mocked<typeof fs> & {
  readdirSync: jest.Mock;
  readFileSync: jest.Mock;
};

// Helper to create mock content items
function createMockContentItem(overrides: Partial<IContentItem> = {}): IContentItem {
  return {
    id: 'test-content-1',
    version: 1,
    category: 'relaxation',
    subcategory: 'breathing',
    type: 'exercise',
    title: 'Тестовое упражнение',
    shortDescription: 'Краткое описание упражнения',
    fullContent: 'Полное содержимое упражнения для практики',
    ageGroups: ['adult'],
    difficulty: 'beginner',
    durationMinutes: 5,
    tags: ['релаксация', 'дыхание'],
    emotionalStates: ['anxiety', 'stress'],
    keywords: ['дыхание', 'расслабление'],
    evidenceLevel: 'A',
    reward: { xp: 10 },
    icon: '🧘',
    order: 1,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

// Helper to create mock directory entries
function createMockDirent(name: string, isDir: boolean): any {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    path: '',
    parentPath: '',
  };
}

describe('JsonContentRepository', () => {
  let repository: JsonContentRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton for each test
    (JsonContentRepository as any).instance = null;

    // Default empty directory
    mockFs.readdirSync.mockReturnValue([]);
  });

  describe('Constructor', () => {
    it('should create repository with default data path', () => {
      repository = new JsonContentRepository();
      expect(repository).toBeInstanceOf(JsonContentRepository);
    });

    it('should create repository with custom data path', () => {
      repository = new JsonContentRepository('/custom/path');
      expect(repository).toBeInstanceOf(JsonContentRepository);
    });

    it('should not load content on construction', () => {
      repository = new JsonContentRepository();
      expect(mockFs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe('initialize()', () => {
    it('should load content on first initialization', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      expect(mockFs.readdirSync).toHaveBeenCalledWith('/test/path', { withFileTypes: true });
    });

    it('should not reload content on subsequent initializations', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();
      await repository.initialize();
      await repository.initialize();

      expect(mockFs.readdirSync).toHaveBeenCalledTimes(1);
    });

    it('should load JSON files from directory', async () => {
      const mockItem = createMockContentItem({ id: 'content-1' });

      mockFs.readdirSync.mockReturnValue([
        createMockDirent('content1.json', false),
      ]);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockItem));

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      const item = await repository.getById('content-1');
      expect(item).toEqual(mockItem);
    });

    it('should recursively load from subdirectories', async () => {
      const mockItem1 = createMockContentItem({ id: 'content-1' });
      const mockItem2 = createMockContentItem({ id: 'content-2' });

      // Root directory contains a subdirectory
      mockFs.readdirSync.mockImplementation((dirPath: any) => {
        if (dirPath === '/test/path') {
          return [createMockDirent('subdir', true)];
        }
        if (dirPath === path.join('/test/path', 'subdir')) {
          return [
            createMockDirent('content1.json', false),
            createMockDirent('content2.json', false),
          ];
        }
        return [];
      });

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('content1')) {
          return JSON.stringify(mockItem1);
        }
        return JSON.stringify(mockItem2);
      });

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      const all = await repository.getAll();
      expect(all).toHaveLength(2);
    });

    it('should skip non-JSON files', async () => {
      const mockItem = createMockContentItem({ id: 'content-1' });

      mockFs.readdirSync.mockReturnValue([
        createMockDirent('content.json', false),
        createMockDirent('readme.txt', false),
        createMockDirent('image.png', false),
        createMockDirent('.gitkeep', false),
      ]);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockItem));

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should skip inactive content items', async () => {
      const activeItem = createMockContentItem({ id: 'active', isActive: true });
      const inactiveItem = createMockContentItem({ id: 'inactive', isActive: false });

      mockFs.readdirSync.mockReturnValue([
        createMockDirent('active.json', false),
        createMockDirent('inactive.json', false),
      ]);
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('active')) {
          return JSON.stringify(activeItem);
        }
        return JSON.stringify(inactiveItem);
      });

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      const all = await repository.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('active');
    });

    it('should skip items without id', async () => {
      const validItem = createMockContentItem({ id: 'valid' });
      const invalidItem = { ...createMockContentItem(), id: '' };

      mockFs.readdirSync.mockReturnValue([
        createMockDirent('valid.json', false),
        createMockDirent('invalid.json', false),
      ]);
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (filePath.includes('valid')) {
          return JSON.stringify(validItem);
        }
        return JSON.stringify(invalidItem);
      });

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      const all = await repository.getAll();
      expect(all).toHaveLength(1);
    });

    it('should handle directory read errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading content from'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle file read errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockFs.readdirSync.mockReturnValue([
        createMockDirent('broken.json', false),
      ]);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Cannot read file');
      });

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading content file'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockFs.readdirSync.mockReturnValue([
        createMockDirent('invalid.json', false),
      ]);
      mockFs.readFileSync.mockReturnValue('not valid json {{{');

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getById()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'item-1', title: 'First' }),
        createMockContentItem({ id: 'item-2', title: 'Second' }),
        createMockContentItem({ id: 'item-3', title: 'Third' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return content item by id', async () => {
      const item = await repository.getById('item-2');
      expect(item).not.toBeNull();
      expect(item?.title).toBe('Second');
    });

    it('should return null for non-existent id', async () => {
      const item = await repository.getById('non-existent');
      expect(item).toBeNull();
    });

    it('should initialize if not already initialized', async () => {
      await repository.getById('item-1');
      expect(mockFs.readdirSync).toHaveBeenCalled();
    });
  });

  describe('query()', () => {
    const testItems: IContentItem[] = [
      createMockContentItem({
        id: 'relax-1',
        category: 'relaxation',
        subcategory: 'breathing',
        type: 'exercise',
        ageGroups: ['adult'],
        difficulty: 'beginner',
        emotionalStates: ['anxiety'],
        durationMinutes: 5,
        tags: ['быстрое', 'дыхание'],
        keywords: ['диафрагма'],
        order: 1,
        createdAt: '2025-01-01T00:00:00Z',
      }),
      createMockContentItem({
        id: 'relax-2',
        category: 'relaxation',
        subcategory: 'pmr',
        type: 'technique',
        ageGroups: ['adult', 'teen'],
        difficulty: 'intermediate',
        emotionalStates: ['stress'],
        durationMinutes: 15,
        tags: ['мышцы'],
        keywords: ['напряжение'],
        order: 2,
        createdAt: '2025-01-05T00:00:00Z',
      }),
      createMockContentItem({
        id: 'mind-1',
        category: 'mindfulness',
        subcategory: 'meditation',
        type: 'meditation',
        ageGroups: ['child', 'teen', 'adult'],
        difficulty: 'advanced',
        emotionalStates: ['anxiety', 'stress'],
        durationMinutes: 20,
        tags: ['осознанность'],
        keywords: ['внимание', 'момент'],
        order: 3,
        createdAt: '2025-01-10T00:00:00Z',
      }),
      createMockContentItem({
        id: 'crisis-1',
        category: 'crisis',
        subcategory: 'tipp-skills',
        type: 'technique',
        ageGroups: ['adult'],
        difficulty: 'beginner',
        emotionalStates: ['panic', 'crisis'],
        durationMinutes: 3,
        tags: ['экстренная', 'tipp'],
        keywords: ['температура', 'интенсивное'],
        order: 4,
        createdAt: '2025-01-15T00:00:00Z',
      }),
    ];

    beforeEach(async () => {
      mockFs.readdirSync.mockReturnValue(
        testItems.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const match = filePath.match(/item(\d)/);
        const index = match ? parseInt(match[1]) : 0;
        return JSON.stringify(testItems[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    describe('Filter by category', () => {
      it('should filter by category', async () => {
        const results = await repository.query({ category: 'relaxation' });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.category === 'relaxation')).toBe(true);
      });

      it('should return empty for non-existent category', async () => {
        const results = await repository.query({ category: 'digital-wellness' });
        expect(results).toHaveLength(0);
      });
    });

    describe('Filter by subcategory', () => {
      it('should filter by subcategory', async () => {
        const results = await repository.query({ subcategory: 'breathing' });
        expect(results).toHaveLength(1);
        expect(results[0].subcategory).toBe('breathing');
      });
    });

    describe('Filter by type', () => {
      it('should filter by type', async () => {
        const results = await repository.query({ type: 'technique' });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.type === 'technique')).toBe(true);
      });
    });

    describe('Filter by ageGroup', () => {
      it('should filter by age group (inclusive)', async () => {
        const results = await repository.query({ ageGroup: 'teen' });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.ageGroups.includes('teen'))).toBe(true);
      });

      it('should filter by child age group', async () => {
        const results = await repository.query({ ageGroup: 'child' });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('mind-1');
      });
    });

    describe('Filter by difficulty', () => {
      it('should filter by difficulty', async () => {
        const results = await repository.query({ difficulty: 'beginner' });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.difficulty === 'beginner')).toBe(true);
      });
    });

    describe('Filter by emotionalState', () => {
      it('should filter by emotional state (inclusive)', async () => {
        const results = await repository.query({ emotionalState: 'anxiety' });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.emotionalStates.includes('anxiety'))).toBe(true);
      });

      it('should filter by crisis emotional state', async () => {
        const results = await repository.query({ emotionalState: 'crisis' });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('crisis-1');
      });
    });

    describe('Filter by tags', () => {
      it('should filter by tags (any match)', async () => {
        const results = await repository.query({ tags: ['дыхание', 'мышцы'] });
        expect(results).toHaveLength(2);
      });

      it('should return items matching any tag', async () => {
        const results = await repository.query({ tags: ['tipp'] });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('crisis-1');
      });

      it('should return empty when no tags match', async () => {
        const results = await repository.query({ tags: ['несуществующий'] });
        expect(results).toHaveLength(0);
      });
    });

    describe('Filter by keywords', () => {
      it('should filter by keywords in content', async () => {
        const results = await repository.query({ keywords: ['диафрагма'] });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('relax-1');
      });

      it('should match keywords case-insensitively', async () => {
        const results = await repository.query({ keywords: ['ДИАФРАГМА'] });
        expect(results).toHaveLength(1);
      });

      it('should match partial keywords in title', async () => {
        const results = await repository.query({ keywords: ['упражн'] });
        expect(results).toHaveLength(4); // All have 'упражнение' in title
      });

      it('should match partial keywords in shortDescription', async () => {
        const results = await repository.query({ keywords: ['описание'] });
        expect(results).toHaveLength(4);
      });
    });

    describe('Filter by duration', () => {
      it('should filter by maxDurationMinutes', async () => {
        const results = await repository.query({ maxDurationMinutes: 10 });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.durationMinutes <= 10)).toBe(true);
      });

      it('should filter by minDurationMinutes', async () => {
        const results = await repository.query({ minDurationMinutes: 10 });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.durationMinutes >= 10)).toBe(true);
      });

      it('should filter by duration range', async () => {
        const results = await repository.query({
          minDurationMinutes: 5,
          maxDurationMinutes: 15,
        });
        expect(results).toHaveLength(2);
        expect(results.every(r => r.durationMinutes >= 5 && r.durationMinutes <= 15)).toBe(true);
      });
    });

    describe('Filter by isActive', () => {
      it('should filter by isActive true', async () => {
        const results = await repository.query({ isActive: true });
        expect(results).toHaveLength(4);
      });

      it('should filter by isActive false', async () => {
        const results = await repository.query({ isActive: false });
        expect(results).toHaveLength(0); // All test items are active
      });
    });

    describe('Multiple filters', () => {
      it('should apply multiple filters together', async () => {
        const results = await repository.query({
          category: 'relaxation',
          difficulty: 'beginner',
        });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('relax-1');
      });

      it('should combine category and ageGroup filters', async () => {
        const results = await repository.query({
          category: 'relaxation',
          ageGroup: 'teen',
        });
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('relax-2');
      });

      it('should combine multiple complex filters', async () => {
        const results = await repository.query({
          emotionalState: 'stress',
          maxDurationMinutes: 20,
          ageGroup: 'adult',
        });
        expect(results).toHaveLength(2);
      });
    });

    describe('Sorting', () => {
      it('should sort by order ascending by default', async () => {
        const results = await repository.query({});
        expect(results.map(r => r.order)).toEqual([1, 2, 3, 4]);
      });

      it('should sort by order descending', async () => {
        const results = await repository.query({
          orderBy: 'order',
          orderDirection: 'desc',
        });
        expect(results.map(r => r.order)).toEqual([4, 3, 2, 1]);
      });

      it('should sort by durationMinutes ascending', async () => {
        const results = await repository.query({
          orderBy: 'durationMinutes',
          orderDirection: 'asc',
        });
        expect(results.map(r => r.durationMinutes)).toEqual([3, 5, 15, 20]);
      });

      it('should sort by durationMinutes descending', async () => {
        const results = await repository.query({
          orderBy: 'durationMinutes',
          orderDirection: 'desc',
        });
        expect(results.map(r => r.durationMinutes)).toEqual([20, 15, 5, 3]);
      });

      it('should sort by difficulty ascending', async () => {
        const results = await repository.query({
          orderBy: 'difficulty',
          orderDirection: 'asc',
        });
        // beginner=1, intermediate=2, advanced=3
        expect(results.map(r => r.difficulty)).toEqual([
          'beginner', 'beginner', 'intermediate', 'advanced'
        ]);
      });

      it('should sort by difficulty descending', async () => {
        const results = await repository.query({
          orderBy: 'difficulty',
          orderDirection: 'desc',
        });
        expect(results.map(r => r.difficulty)).toEqual([
          'advanced', 'intermediate', 'beginner', 'beginner'
        ]);
      });

      it('should sort by createdAt ascending', async () => {
        const results = await repository.query({
          orderBy: 'createdAt',
          orderDirection: 'asc',
        });
        expect(results.map(r => r.id)).toEqual(['relax-1', 'relax-2', 'mind-1', 'crisis-1']);
      });

      it('should sort by createdAt descending', async () => {
        const results = await repository.query({
          orderBy: 'createdAt',
          orderDirection: 'desc',
        });
        expect(results.map(r => r.id)).toEqual(['crisis-1', 'mind-1', 'relax-2', 'relax-1']);
      });
    });

    describe('Pagination', () => {
      it('should apply offset', async () => {
        const results = await repository.query({ offset: 2 });
        expect(results).toHaveLength(2);
        expect(results.map(r => r.order)).toEqual([3, 4]);
      });

      it('should apply limit', async () => {
        const results = await repository.query({ limit: 2 });
        expect(results).toHaveLength(2);
        expect(results.map(r => r.order)).toEqual([1, 2]);
      });

      it('should apply offset and limit together', async () => {
        const results = await repository.query({ offset: 1, limit: 2 });
        expect(results).toHaveLength(2);
        expect(results.map(r => r.order)).toEqual([2, 3]);
      });

      it('should handle offset exceeding total count', async () => {
        const results = await repository.query({ offset: 100 });
        expect(results).toHaveLength(0);
      });

      it('should handle limit exceeding remaining items', async () => {
        const results = await repository.query({ offset: 3, limit: 10 });
        expect(results).toHaveLength(1);
      });
    });
  });

  describe('getByCategory()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'r1', category: 'relaxation' }),
        createMockContentItem({ id: 'r2', category: 'relaxation' }),
        createMockContentItem({ id: 'm1', category: 'mindfulness' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return all items for category', async () => {
      const results = await repository.getByCategory('relaxation');
      expect(results).toHaveLength(2);
    });

    it('should return empty for non-existent category', async () => {
      const results = await repository.getByCategory('crisis');
      expect(results).toHaveLength(0);
    });
  });

  describe('getBySubcategory()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'r1', category: 'relaxation', subcategory: 'breathing' }),
        createMockContentItem({ id: 'r2', category: 'relaxation', subcategory: 'pmr' }),
        createMockContentItem({ id: 'm1', category: 'mindfulness', subcategory: 'meditation' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return items for category and subcategory', async () => {
      const results = await repository.getBySubcategory('relaxation', 'breathing');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('r1');
    });

    it('should return empty when subcategory not in category', async () => {
      const results = await repository.getBySubcategory('relaxation', 'meditation');
      expect(results).toHaveLength(0);
    });
  });

  describe('getForAgeGroup()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'a1', ageGroups: ['adult'] }),
        createMockContentItem({ id: 'at1', ageGroups: ['adult', 'teen'] }),
        createMockContentItem({ id: 'c1', ageGroups: ['child'] }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return items suitable for age group', async () => {
      const results = await repository.getForAgeGroup('adult');
      expect(results).toHaveLength(2);
    });

    it('should return child-appropriate items', async () => {
      const results = await repository.getForAgeGroup('child');
      expect(results).toHaveLength(1);
    });

    it('should return teen items including multi-age items', async () => {
      const results = await repository.getForAgeGroup('teen');
      expect(results).toHaveLength(1);
    });
  });

  describe('getForEmotionalState()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'a1', emotionalStates: ['anxiety'] }),
        createMockContentItem({ id: 'as1', emotionalStates: ['anxiety', 'stress'] }),
        createMockContentItem({ id: 'p1', emotionalStates: ['panic'] }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return items for emotional state', async () => {
      const results = await repository.getForEmotionalState('anxiety');
      expect(results).toHaveLength(2);
    });

    it('should return items for stress state', async () => {
      const results = await repository.getForEmotionalState('stress');
      expect(results).toHaveLength(1);
    });
  });

  describe('getRandom()', () => {
    const testItems = [
      createMockContentItem({ id: 'item-1', category: 'relaxation', ageGroups: ['adult'], emotionalStates: ['anxiety'] }),
      createMockContentItem({ id: 'item-2', category: 'relaxation', ageGroups: ['teen'], emotionalStates: ['stress'] }),
      createMockContentItem({ id: 'item-3', category: 'mindfulness', ageGroups: ['adult'], emotionalStates: ['anxiety'] }),
      createMockContentItem({ id: 'item-4', category: 'crisis', ageGroups: ['adult'], emotionalStates: ['panic'] }),
      createMockContentItem({ id: 'item-5', category: 'sleep', ageGroups: ['adult'], emotionalStates: ['insomnia'] }),
    ];

    beforeEach(async () => {
      mockFs.readdirSync.mockReturnValue(
        testItems.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(testItems[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return random item by default', async () => {
      const results = await repository.getRandom();
      expect(results).toHaveLength(1);
      expect(testItems.map(i => i.id)).toContain(results[0].id);
    });

    it('should return specified count of random items', async () => {
      const results = await repository.getRandom({ count: 3 });
      expect(results).toHaveLength(3);
    });

    it('should filter by category', async () => {
      const results = await repository.getRandom({ category: 'relaxation', count: 5 });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.category === 'relaxation')).toBe(true);
    });

    it('should filter by subcategory', async () => {
      const results = await repository.getRandom({ subcategory: 'breathing', count: 5 });
      expect(results.every(r => r.subcategory === 'breathing')).toBe(true);
    });

    it('should filter by ageGroup', async () => {
      const results = await repository.getRandom({ ageGroup: 'teen', count: 5 });
      expect(results).toHaveLength(1);
      expect(results.every(r => r.ageGroups.includes('teen'))).toBe(true);
    });

    it('should filter by emotionalState', async () => {
      const results = await repository.getRandom({ emotionalState: 'anxiety', count: 5 });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.emotionalStates.includes('anxiety'))).toBe(true);
    });

    it('should exclude specified ids', async () => {
      const results = await repository.getRandom({
        excludeIds: ['item-1', 'item-2', 'item-3'],
        count: 5,
      });
      expect(results).toHaveLength(2);
      expect(results.some(r => r.id === 'item-1')).toBe(false);
      expect(results.some(r => r.id === 'item-2')).toBe(false);
      expect(results.some(r => r.id === 'item-3')).toBe(false);
    });

    it('should return all when count exceeds available', async () => {
      const results = await repository.getRandom({ count: 100 });
      expect(results).toHaveLength(5);
    });

    it('should combine multiple filter options', async () => {
      const results = await repository.getRandom({
        category: 'relaxation',
        ageGroup: 'adult',
        count: 5,
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-1');
    });
  });

  describe('getQuickContent()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'quick-1', durationMinutes: 3, ageGroups: ['adult'] }),
        createMockContentItem({ id: 'quick-2', durationMinutes: 5, ageGroups: ['adult', 'teen'] }),
        createMockContentItem({ id: 'medium-1', durationMinutes: 10, ageGroups: ['adult'] }),
        createMockContentItem({ id: 'long-1', durationMinutes: 20, ageGroups: ['adult'] }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return content under specified minutes', async () => {
      const results = await repository.getQuickContent(5);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.durationMinutes <= 5)).toBe(true);
    });

    it('should sort by duration ascending', async () => {
      const results = await repository.getQuickContent(10);
      expect(results.map(r => r.durationMinutes)).toEqual([3, 5, 10]);
    });

    it('should filter by age group when specified', async () => {
      const results = await repository.getQuickContent(10, 'teen');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('quick-2');
    });

    it('should return empty when no quick content available', async () => {
      const results = await repository.getQuickContent(1);
      expect(results).toHaveLength(0);
    });
  });

  describe('getCrisisContent()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'crisis-1', category: 'crisis' }),
        createMockContentItem({ id: 'crisis-2', category: 'crisis' }),
        createMockContentItem({ id: 'relax-1', category: 'relaxation' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return only crisis category content', async () => {
      const results = await repository.getCrisisContent();
      expect(results).toHaveLength(2);
      expect(results.every(r => r.category === 'crisis')).toBe(true);
    });
  });

  describe('search()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({
          id: 'item-1',
          title: 'Дыхательное упражнение',
          shortDescription: 'Техника глубокого дыхания',
          fullContent: 'Полный текст о диафрагмальном дыхании',
          tags: ['релаксация'],
          keywords: ['вдох', 'выдох'],
        }),
        createMockContentItem({
          id: 'item-2',
          title: 'Медитация осознанности',
          shortDescription: 'Практика внимательности',
          fullContent: 'Фокусировка на дыхании и ощущениях',
          tags: ['mindfulness'],
          keywords: ['фокус', 'внимание'],
        }),
        createMockContentItem({
          id: 'item-3',
          title: 'Прогрессивная мышечная релаксация',
          shortDescription: 'ПМР техника',
          fullContent: 'Напряжение и расслабление мышц',
          tags: ['пмр'],
          keywords: ['мышцы', 'расслабление'],
        }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should search in title', async () => {
      const results = await repository.search('Дыхательное');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-1');
    });

    it('should search in shortDescription', async () => {
      const results = await repository.search('внимательности');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-2');
    });

    it('should search in fullContent', async () => {
      const results = await repository.search('диафрагмальном');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-1');
    });

    it('should search in tags', async () => {
      const results = await repository.search('mindfulness');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-2');
    });

    it('should search in keywords', async () => {
      const results = await repository.search('мышцы');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-3');
    });

    it('should search case-insensitively', async () => {
      // Search for uppercase version of a word that exists in test data
      const results = await repository.search('ДЫХАТЕЛЬНОЕ');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find partial matches', async () => {
      const results = await repository.search('дыхан');
      expect(results).toHaveLength(2); // item-1 and item-2
    });

    it('should return empty for no matches', async () => {
      const results = await repository.search('несуществующий термин xyz');
      expect(results).toHaveLength(0);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({
          id: 'r1',
          category: 'relaxation',
          ageGroups: ['adult'],
          difficulty: 'beginner',
          emotionalStates: ['anxiety'],
        }),
        createMockContentItem({
          id: 'r2',
          category: 'relaxation',
          ageGroups: ['adult', 'teen'],
          difficulty: 'intermediate',
          emotionalStates: ['stress'],
        }),
        createMockContentItem({
          id: 'm1',
          category: 'mindfulness',
          ageGroups: ['child', 'teen', 'adult'],
          difficulty: 'advanced',
          emotionalStates: ['anxiety', 'stress'],
        }),
        createMockContentItem({
          id: 'c1',
          category: 'crisis',
          ageGroups: ['adult'],
          difficulty: 'beginner',
          emotionalStates: ['panic', 'crisis'],
        }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return total count', async () => {
      const stats = await repository.getStats();
      expect(stats.totalCount).toBe(4);
    });

    it('should count by category', async () => {
      const stats = await repository.getStats();
      expect(stats.byCategory.relaxation).toBe(2);
      expect(stats.byCategory.mindfulness).toBe(1);
      expect(stats.byCategory.crisis).toBe(1);
      expect(stats.byCategory.sleep).toBe(0);
    });

    it('should count by age group', async () => {
      const stats = await repository.getStats();
      expect(stats.byAgeGroup.adult).toBe(4);
      expect(stats.byAgeGroup.teen).toBe(2);
      expect(stats.byAgeGroup.child).toBe(1);
    });

    it('should count by difficulty', async () => {
      const stats = await repository.getStats();
      expect(stats.byDifficulty.beginner).toBe(2);
      expect(stats.byDifficulty.intermediate).toBe(1);
      expect(stats.byDifficulty.advanced).toBe(1);
    });

    it('should count by emotional state', async () => {
      const stats = await repository.getStats();
      expect(stats.byEmotionalState.anxiety).toBe(2);
      expect(stats.byEmotionalState.stress).toBe(2);
      expect(stats.byEmotionalState.panic).toBe(1);
      expect(stats.byEmotionalState.crisis).toBe(1);
    });

    it('should not include zero-count emotional states', async () => {
      const stats = await repository.getStats();
      expect(stats.byEmotionalState.depression).toBeUndefined();
      expect(stats.byEmotionalState.insomnia).toBeUndefined();
    });
  });

  describe('getAll()', () => {
    it('should return all content items', async () => {
      const items = [
        createMockContentItem({ id: 'item-1' }),
        createMockContentItem({ id: 'item-2' }),
        createMockContentItem({ id: 'item-3' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
      const all = await repository.getAll();

      expect(all).toHaveLength(3);
    });

    it('should return empty array when no content', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      repository = new JsonContentRepository('/test/path');
      const all = await repository.getAll();

      expect(all).toHaveLength(0);
    });
  });

  describe('count()', () => {
    beforeEach(async () => {
      const items = [
        createMockContentItem({ id: 'r1', category: 'relaxation' }),
        createMockContentItem({ id: 'r2', category: 'relaxation' }),
        createMockContentItem({ id: 'm1', category: 'mindfulness' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');
    });

    it('should return total count without options', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should return total count with empty options', async () => {
      const count = await repository.count({});
      expect(count).toBe(3);
    });

    it('should return filtered count with options', async () => {
      const count = await repository.count({ category: 'relaxation' });
      expect(count).toBe(2);
    });

    it('should return zero for no matches', async () => {
      const count = await repository.count({ category: 'crisis' });
      expect(count).toBe(0);
    });
  });

  describe('reload()', () => {
    it('should clear and reload content', async () => {
      const initialItems = [
        createMockContentItem({ id: 'initial-1' }),
      ];
      const newItems = [
        createMockContentItem({ id: 'new-1' }),
        createMockContentItem({ id: 'new-2' }),
      ];

      let callCount = 0;
      mockFs.readdirSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [createMockDirent('item0.json', false)];
        }
        return [
          createMockDirent('item0.json', false),
          createMockDirent('item1.json', false),
        ];
      });

      let readCallCount = 0;
      mockFs.readFileSync.mockImplementation(() => {
        readCallCount++;
        if (readCallCount === 1) {
          return JSON.stringify(initialItems[0]);
        }
        if (readCallCount === 2) {
          return JSON.stringify(newItems[0]);
        }
        return JSON.stringify(newItems[1]);
      });

      repository = new JsonContentRepository('/test/path');

      await repository.initialize();
      let all = await repository.getAll();
      expect(all).toHaveLength(1);

      await repository.reload();
      all = await repository.getAll();
      expect(all).toHaveLength(2);
    });

    it('should allow re-initialization after reload', async () => {
      mockFs.readdirSync.mockReturnValue([]);

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();
      await repository.reload();

      expect(mockFs.readdirSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Singleton: getContentRepository()', () => {
    beforeEach(() => {
      // Reset the module-level singleton
      jest.resetModules();
    });

    it('should return same instance on multiple calls', () => {
      const { getContentRepository } = require('../JsonContentRepository');

      const instance1 = getContentRepository();
      const instance2 = getContentRepository();

      expect(instance1).toBe(instance2);
    });

    it('should use default path when not specified', () => {
      const mod = require('../JsonContentRepository');
      const instance = mod.getContentRepository();

      // Use constructor name check since class reference differs after resetModules
      expect(instance.constructor.name).toBe('JsonContentRepository');
    });

    it('should use custom path on first call', () => {
      const mod = require('../JsonContentRepository');
      const instance = mod.getContentRepository('/custom/path');

      expect(instance.constructor.name).toBe('JsonContentRepository');
    });

    it('should ignore path on subsequent calls (uses first path)', () => {
      const { getContentRepository, JsonContentRepository } = require('../JsonContentRepository');

      const instance1 = getContentRepository('/first/path');
      const instance2 = getContentRepository('/second/path');

      expect(instance1).toBe(instance2);
    });
  });

  describe('Edge cases', () => {
    it('should handle content with undefined isActive (treated as active)', async () => {
      const item = createMockContentItem({ id: 'item-1' });
      delete (item as any).isActive;

      mockFs.readdirSync.mockReturnValue([createMockDirent('item.json', false)]);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(item));

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      // Item without isActive should still be loaded (checked as !== false)
      const all = await repository.getAll();
      expect(all).toHaveLength(1);
    });

    it('should handle deeply nested directories', async () => {
      const item = createMockContentItem({ id: 'deep-item' });

      mockFs.readdirSync.mockImplementation((dirPath: any) => {
        if (dirPath === '/test/path') {
          return [createMockDirent('level1', true)];
        }
        if (dirPath.includes('level1') && !dirPath.includes('level2')) {
          return [createMockDirent('level2', true)];
        }
        if (dirPath.includes('level2') && !dirPath.includes('level3')) {
          return [createMockDirent('level3', true)];
        }
        if (dirPath.includes('level3')) {
          return [createMockDirent('deep.json', false)];
        }
        return [];
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(item));

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      const all = await repository.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('deep-item');
    });

    it('should handle empty JSON file gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockFs.readdirSync.mockReturnValue([createMockDirent('empty.json', false)]);
      mockFs.readFileSync.mockReturnValue('');

      repository = new JsonContentRepository('/test/path');
      await repository.initialize();

      const all = await repository.getAll();
      expect(all).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('should handle content with all emotional states', async () => {
      const item = createMockContentItem({
        id: 'all-emotions',
        emotionalStates: [
          'anxiety', 'stress', 'depression', 'anger', 'fear',
          'panic', 'sadness', 'overwhelm', 'insomnia', 'crisis',
        ],
      });

      mockFs.readdirSync.mockReturnValue([createMockDirent('item.json', false)]);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(item));

      repository = new JsonContentRepository('/test/path');

      const stats = await repository.getStats();
      expect(stats.byEmotionalState.anxiety).toBe(1);
      expect(stats.byEmotionalState.crisis).toBe(1);
      expect(stats.byEmotionalState.insomnia).toBe(1);
    });

    it('should handle sorting with equal values', async () => {
      const items = [
        createMockContentItem({ id: 'a', order: 1, durationMinutes: 5 }),
        createMockContentItem({ id: 'b', order: 1, durationMinutes: 5 }),
        createMockContentItem({ id: 'c', order: 1, durationMinutes: 5 }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');

      const results = await repository.query({ orderBy: 'order' });
      expect(results).toHaveLength(3);
    });

    it('should handle getRandom with all items excluded', async () => {
      const items = [
        createMockContentItem({ id: 'item-1' }),
        createMockContentItem({ id: 'item-2' }),
      ];

      mockFs.readdirSync.mockReturnValue(
        items.map((_, i) => createMockDirent(`item${i}.json`, false))
      );
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const index = parseInt(filePath.match(/item(\d)/)?.[1] || '0');
        return JSON.stringify(items[index]);
      });

      repository = new JsonContentRepository('/test/path');

      const results = await repository.getRandom({
        excludeIds: ['item-1', 'item-2'],
      });
      expect(results).toHaveLength(0);
    });
  });
});
