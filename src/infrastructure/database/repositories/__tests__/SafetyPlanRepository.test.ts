/**
 * SafetyPlanRepository Unit Tests
 * ================================
 *
 * CRITICAL: Stanley-Brown safety plans for crisis escalation.
 * These tests ensure patient safety data integrity.
 *
 * Compliance:
 * - IEC 62304 Class C (safety-critical)
 * - SAMHSA Guidelines 2025
 *
 * Traceability:
 * - REQ-CRISIS-001: Crisis escalation must maintain safety plans
 * - REQ-PHI-001: Patient data must be persisted correctly
 *
 * @packageDocumentation
 */

import {
  SafetyPlanRepository,
  type ISafetyPlanEntity,
  type ISafetyPlanRow,
} from '../SafetyPlanRepository';
import type { IDatabaseConnection } from '../../interfaces/IDatabaseConnection';

describe('SafetyPlanRepository', () => {
  let repository: SafetyPlanRepository;
  let mockDb: jest.Mocked<IDatabaseConnection>;

  const mockSafetyPlanRow: ISafetyPlanRow = {
    id: 1,
    user_id: 'user-123',
    warning_signs_json: JSON.stringify(['difficulty sleeping', 'irritability', 'social withdrawal']),
    coping_strategies_json: JSON.stringify(['deep breathing', 'call a friend', 'go for a walk']),
    reasons_to_live_json: JSON.stringify(['family', 'career goals', 'pet']),
    support_contacts_json: JSON.stringify([
      { name: 'John Doe', phone: '+7-999-123-4567', relation: 'friend' },
      { name: 'Jane Smith', phone: '+7-999-765-4321', relation: 'sister' },
    ]),
    safe_places_json: JSON.stringify(['bedroom', 'park nearby', 'coffee shop']),
    professional_contacts_json: JSON.stringify([
      { name: 'Dr. Ivanov', phone: '+7-495-111-2233', type: 'psychiatrist' },
      { name: 'Crisis Hotline', phone: '8-800-2000-122', type: 'hotline' },
    ]),
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-01-20T14:30:00.000Z',
    deleted_at: null,
  };

  const mockSafetyPlanEntity: ISafetyPlanEntity = {
    id: 1,
    userId: 'user-123',
    warningSigns: ['difficulty sleeping', 'irritability', 'social withdrawal'],
    copingStrategies: ['deep breathing', 'call a friend', 'go for a walk'],
    reasonsToLive: ['family', 'career goals', 'pet'],
    supportContacts: [
      { name: 'John Doe', phone: '+7-999-123-4567', relation: 'friend' },
      { name: 'Jane Smith', phone: '+7-999-765-4321', relation: 'sister' },
    ],
    safePlaces: ['bedroom', 'park nearby', 'coffee shop'],
    professionalContacts: [
      { name: 'Dr. Ivanov', phone: '+7-495-111-2233', type: 'psychiatrist' },
      { name: 'Crisis Hotline', phone: '8-800-2000-122', type: 'hotline' },
    ],
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-01-20T14:30:00.000Z'),
  };

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
      transaction: jest.fn(),
    } as unknown as jest.Mocked<IDatabaseConnection>;

    repository = new SafetyPlanRepository(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== findByUserId ====================

  describe('findByUserId', () => {
    it('should return safety plan when exists', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const result = await repository.findByUserId('user-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM safety_plans WHERE user_id = ? AND deleted_at IS NULL',
        ['user-123']
      );
      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.warningSigns).toEqual(['difficulty sleeping', 'irritability', 'social withdrawal']);
      expect(result?.professionalContacts).toHaveLength(2);
    });

    it('should return null when safety plan does not exist', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const result = await repository.findByUserId('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted safety plans', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      await repository.findByUserId('user-with-deleted-plan');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should correctly parse all JSON fields', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const result = await repository.findByUserId('user-123');

      expect(result?.warningSigns).toBeInstanceOf(Array);
      expect(result?.copingStrategies).toBeInstanceOf(Array);
      expect(result?.reasonsToLive).toBeInstanceOf(Array);
      expect(result?.supportContacts).toBeInstanceOf(Array);
      expect(result?.safePlaces).toBeInstanceOf(Array);
      expect(result?.professionalContacts).toBeInstanceOf(Array);
    });

    it('should correctly convert dates', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const result = await repository.findByUserId('user-123');

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.createdAt.toISOString()).toBe('2026-01-15T10:00:00.000Z');
    });

    it('should handle empty arrays in JSON fields', async () => {
      const emptyRow: ISafetyPlanRow = {
        ...mockSafetyPlanRow,
        warning_signs_json: '[]',
        coping_strategies_json: '[]',
        reasons_to_live_json: '[]',
        support_contacts_json: '[]',
        safe_places_json: '[]',
        professional_contacts_json: '[]',
      };
      mockDb.queryOne.mockResolvedValue(emptyRow);

      const result = await repository.findByUserId('user-123');

      expect(result?.warningSigns).toEqual([]);
      expect(result?.copingStrategies).toEqual([]);
      expect(result?.supportContacts).toEqual([]);
    });
  });

  // ==================== findAll ====================

  describe('findAll', () => {
    it('should return all non-deleted safety plans', async () => {
      const rows: ISafetyPlanRow[] = [
        mockSafetyPlanRow,
        { ...mockSafetyPlanRow, id: 2, user_id: 'user-456' },
        { ...mockSafetyPlanRow, id: 3, user_id: 'user-789' },
      ];
      mockDb.query.mockResolvedValue(rows);

      const result = await repository.findAll();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM safety_plans WHERE deleted_at IS NULL'
      );
      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('user-123');
      expect(result[1].userId).toBe('user-456');
      expect(result[2].userId).toBe('user-789');
    });

    it('should return empty array when no safety plans exist', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should correctly convert all rows to entities', async () => {
      mockDb.query.mockResolvedValue([mockSafetyPlanRow, mockSafetyPlanRow]);

      const result = await repository.findAll();

      result.forEach(entity => {
        expect(entity.warningSigns).toBeInstanceOf(Array);
        expect(entity.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  // ==================== upsert ====================

  describe('upsert', () => {
    const newPlanData: Partial<ISafetyPlanEntity> = {
      warningSigns: ['can\'t sleep', 'feeling hopeless'],
      copingStrategies: ['meditation', 'journaling'],
      reasonsToLive: ['children', 'dreams'],
      supportContacts: [{ name: 'Mom', phone: '+7-999-111-2222', relation: 'mother' }],
      safePlaces: ['home'],
      professionalContacts: [{ name: 'Therapist', phone: '+7-495-333-4444', type: 'psychologist' }],
    };

    describe('when plan does not exist (INSERT)', () => {
      beforeEach(() => {
        mockDb.queryOne.mockResolvedValue(null); // No existing plan
        mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 1 });
      });

      it('should insert new safety plan', async () => {
        await repository.upsert('new-user', newPlanData);

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO safety_plans'),
          expect.any(Array)
        );
      });

      it('should insert with all JSON fields', async () => {
        await repository.upsert('new-user', newPlanData);

        const insertCall = mockDb.execute.mock.calls[0];
        const params = insertCall[1] as unknown[];

        expect(params[0]).toBe('new-user'); // user_id
        expect(params[1]).toBe(JSON.stringify(newPlanData.warningSigns));
        expect(params[2]).toBe(JSON.stringify(newPlanData.copingStrategies));
        expect(params[3]).toBe(JSON.stringify(newPlanData.reasonsToLive));
        expect(params[4]).toBe(JSON.stringify(newPlanData.supportContacts));
        expect(params[5]).toBe(JSON.stringify(newPlanData.safePlaces));
        expect(params[6]).toBe(JSON.stringify(newPlanData.professionalContacts));
      });

      it('should use empty arrays for undefined fields on insert', async () => {
        await repository.upsert('new-user', { warningSigns: ['only warning signs'] });

        const insertCall = mockDb.execute.mock.calls[0];
        const params = insertCall[1] as unknown[];

        expect(params[1]).toBe(JSON.stringify(['only warning signs']));
        expect(params[2]).toBe('[]'); // copingStrategies default
        expect(params[3]).toBe('[]'); // reasonsToLive default
      });

      it('should include timestamps on insert', async () => {
        const beforeInsert = new Date();
        await repository.upsert('new-user', newPlanData);
        const afterInsert = new Date();

        const insertCall = mockDb.execute.mock.calls[0];
        const params = insertCall[1] as unknown[];

        // created_at and updated_at are the last two parameters
        const createdAt = new Date(params[7] as string);
        const updatedAt = new Date(params[8] as string);

        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
        expect(updatedAt.getTime()).toBe(createdAt.getTime());
      });
    });

    describe('when plan exists (UPDATE)', () => {
      beforeEach(() => {
        mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);
        mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });
      });

      it('should update existing safety plan', async () => {
        await repository.upsert('user-123', newPlanData);

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE safety_plans SET'),
          expect.any(Array)
        );
      });

      it('should preserve existing values for undefined fields', async () => {
        const partialUpdate = { warningSigns: ['new warning'] };
        await repository.upsert('user-123', partialUpdate);

        const updateCall = mockDb.execute.mock.calls[0];
        const params = updateCall[1] as unknown[];

        // New value
        expect(params[0]).toBe(JSON.stringify(['new warning']));
        // Preserved values from existing entity
        expect(params[1]).toBe(JSON.stringify(mockSafetyPlanEntity.copingStrategies));
        expect(params[2]).toBe(JSON.stringify(mockSafetyPlanEntity.reasonsToLive));
      });

      it('should update updated_at timestamp on update', async () => {
        const beforeUpdate = new Date();
        await repository.upsert('user-123', newPlanData);
        const afterUpdate = new Date();

        const updateCall = mockDb.execute.mock.calls[0];
        const params = updateCall[1] as unknown[];

        // updated_at is at index 6 for UPDATE
        const updatedAt = new Date(params[6] as string);

        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        expect(updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
      });

      it('should only update non-deleted records', async () => {
        await repository.upsert('user-123', newPlanData);

        expect(mockDb.execute).toHaveBeenCalledWith(
          expect.stringContaining('WHERE user_id = ? AND deleted_at IS NULL'),
          expect.any(Array)
        );
      });
    });

    describe('edge cases', () => {
      it('should handle plan with empty support contacts', async () => {
        mockDb.queryOne.mockResolvedValue(null);
        mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

        await repository.upsert('user', { supportContacts: [] });

        const params = mockDb.execute.mock.calls[0][1] as unknown[];
        expect(params[4]).toBe('[]');
      });

      it('should handle plan with special characters in text', async () => {
        mockDb.queryOne.mockResolvedValue(null);
        mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 1 });

        const specialData = {
          warningSigns: ['quotes "here"', 'слэш / тут', 'unicode: 日本語'],
        };
        await repository.upsert('user', specialData);

        const params = mockDb.execute.mock.calls[0][1] as unknown[];
        const parsed = JSON.parse(params[1] as string);
        expect(parsed).toEqual(specialData.warningSigns);
      });
    });
  });

  // ==================== deleteByUserId ====================

  describe('deleteByUserId', () => {
    it('should soft delete safety plan by user ID', async () => {
      mockDb.execute.mockResolvedValue({ changes: 1, lastInsertRowid: 0 });

      await repository.deleteByUserId('user-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        "UPDATE safety_plans SET deleted_at = datetime('now') WHERE user_id = ? AND deleted_at IS NULL",
        ['user-123']
      );
    });

    it('should only delete non-deleted records', async () => {
      mockDb.execute.mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      await repository.deleteByUserId('already-deleted');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('AND deleted_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should not throw when user has no safety plan', async () => {
      mockDb.execute.mockResolvedValue({ changes: 0, lastInsertRowid: 0 });

      await expect(repository.deleteByUserId('nonexistent-user')).resolves.not.toThrow();
    });
  });

  // ==================== rowToEntity (private, tested via public methods) ====================

  describe('rowToEntity conversion (tested via findByUserId)', () => {
    it('should map all fields correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const result = await repository.findByUserId('user-123');

      expect(result).toMatchObject({
        id: mockSafetyPlanRow.id,
        userId: mockSafetyPlanRow.user_id,
        warningSigns: JSON.parse(mockSafetyPlanRow.warning_signs_json),
        copingStrategies: JSON.parse(mockSafetyPlanRow.coping_strategies_json),
        reasonsToLive: JSON.parse(mockSafetyPlanRow.reasons_to_live_json),
        supportContacts: JSON.parse(mockSafetyPlanRow.support_contacts_json),
        safePlaces: JSON.parse(mockSafetyPlanRow.safe_places_json),
        professionalContacts: JSON.parse(mockSafetyPlanRow.professional_contacts_json),
      });
    });

    it('should convert support contact objects correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const result = await repository.findByUserId('user-123');

      expect(result?.supportContacts[0]).toEqual({
        name: 'John Doe',
        phone: '+7-999-123-4567',
        relation: 'friend',
      });
    });

    it('should convert professional contact objects correctly', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const result = await repository.findByUserId('user-123');

      expect(result?.professionalContacts[0]).toEqual({
        name: 'Dr. Ivanov',
        phone: '+7-495-111-2233',
        type: 'psychiatrist',
      });
    });
  });

  // ==================== Stanley-Brown Compliance ====================

  describe('Stanley-Brown Safety Plan compliance', () => {
    it('should support all 6 Stanley-Brown components', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const plan = await repository.findByUserId('user-123');

      // Step 1: Warning signs
      expect(plan?.warningSigns).toBeDefined();

      // Step 2: Internal coping strategies
      expect(plan?.copingStrategies).toBeDefined();

      // Step 3: People and social settings (safe places)
      expect(plan?.safePlaces).toBeDefined();

      // Step 4: People to contact for help (support contacts)
      expect(plan?.supportContacts).toBeDefined();

      // Step 5: Professionals/agencies to contact
      expect(plan?.professionalContacts).toBeDefined();

      // Step 6: Making the environment safe + reasons to live
      expect(plan?.reasonsToLive).toBeDefined();
    });

    it('should preserve contact structure with phone numbers', async () => {
      mockDb.queryOne.mockResolvedValue(mockSafetyPlanRow);

      const plan = await repository.findByUserId('user-123');

      // Support contacts should have name, phone, relation
      plan?.supportContacts.forEach(contact => {
        expect(contact).toHaveProperty('name');
        expect(contact).toHaveProperty('phone');
      });

      // Professional contacts should have name, phone, type
      plan?.professionalContacts.forEach(contact => {
        expect(contact).toHaveProperty('name');
        expect(contact).toHaveProperty('phone');
        expect(contact).toHaveProperty('type');
      });
    });
  });
});
