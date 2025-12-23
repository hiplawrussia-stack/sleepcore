/**
 * SonyaEvolutionService Unit Tests
 * =================================
 */

import {
  SonyaEvolutionService,
  EVOLUTION_STAGES,
  type SonyaStageId,
} from '../../../src/modules/evolution/SonyaEvolutionService';

describe('SonyaEvolutionService', () => {
  let service: SonyaEvolutionService;

  beforeEach(() => {
    service = new SonyaEvolutionService();
  });

  describe('Stage Management', () => {
    it('should have all evolution stages defined', () => {
      const stages = service.getStages();
      expect(stages.length).toBe(4);

      const stageIds = stages.map((s) => s.id);
      expect(stageIds).toContain('owlet');
      expect(stageIds).toContain('young_owl');
      expect(stageIds).toContain('wise_owl');
      expect(stageIds).toContain('master');
    });

    it('should have correct required days for each stage', () => {
      const stages = service.getStages();

      const owlet = stages.find((s) => s.id === 'owlet');
      const youngOwl = stages.find((s) => s.id === 'young_owl');
      const wiseOwl = stages.find((s) => s.id === 'wise_owl');
      const master = stages.find((s) => s.id === 'master');

      expect(owlet?.requiredDays).toBe(0);
      expect(youngOwl?.requiredDays).toBe(7);
      expect(wiseOwl?.requiredDays).toBe(30);
      expect(master?.requiredDays).toBe(66);
    });

    it('should get stage by ID', () => {
      const owlet = service.getStage('owlet');
      expect(owlet).not.toBeNull();
      expect(owlet?.name).toBe('Совёнок Соня');
    });

    it('should return null for unknown stage ID', () => {
      const unknown = service.getStage('unknown' as SonyaStageId);
      expect(unknown).toBeNull();
    });
  });

  describe('User Data Management', () => {
    it('should create initial user data', () => {
      const userData = service.getUserData('new-user');

      expect(userData.userId).toBe('new-user');
      expect(userData.currentStage).toBe('owlet');
      expect(userData.daysActive).toBe(0);
      expect(userData.stagesUnlocked).toContain('owlet');
    });

    it('should return existing user data', () => {
      const firstCall = service.getUserData('test-user');
      firstCall.daysActive = 10;

      const secondCall = service.getUserData('test-user');
      expect(secondCall.daysActive).toBe(10);
    });

    it('should clear user data', () => {
      service.getUserData('user-to-clear');
      service.clearUserData('user-to-clear');

      const newData = service.getUserData('user-to-clear');
      expect(newData.daysActive).toBe(0);
    });
  });

  describe('Evolution Checking', () => {
    it('should not evolve at 0 days', async () => {
      const result = await service.checkEvolution('user1', 0);

      expect(result.evolved).toBe(false);
      expect(result.currentStage.id).toBe('owlet');
    });

    it('should not evolve at 6 days', async () => {
      const result = await service.checkEvolution('user2', 6);

      expect(result.evolved).toBe(false);
      expect(result.currentStage.id).toBe('owlet');
      expect(result.nextStage?.id).toBe('young_owl');
      expect(result.daysToNextStage).toBe(1);
    });

    it('should evolve to young_owl at 7 days', async () => {
      // First check at 6 days
      await service.checkEvolution('user3', 6);

      // Then check at 7 days
      const result = await service.checkEvolution('user3', 7);

      expect(result.evolved).toBe(true);
      expect(result.currentStage.id).toBe('young_owl');
      expect(result.previousStage?.id).toBe('owlet');
      expect(result.celebrationMessage).not.toBeNull();
    });

    it('should evolve to wise_owl at 30 days', async () => {
      // Set up at 29 days
      await service.checkEvolution('user4', 29);

      // Check at 30 days
      const result = await service.checkEvolution('user4', 30);

      expect(result.evolved).toBe(true);
      expect(result.currentStage.id).toBe('wise_owl');
    });

    it('should evolve to master at 66 days', async () => {
      // Set up at 65 days
      await service.checkEvolution('user5', 65);

      // Check at 66 days
      const result = await service.checkEvolution('user5', 66);

      expect(result.evolved).toBe(true);
      expect(result.currentStage.id).toBe('master');
      expect(result.nextStage).toBeNull();
      expect(result.daysToNextStage).toBe(0);
      expect(result.progressPercent).toBe(100);
    });

    it('should track unlocked stages', async () => {
      await service.checkEvolution('user6', 7);
      await service.checkEvolution('user6', 30);

      const userData = service.getUserData('user6');
      expect(userData.stagesUnlocked).toContain('owlet');
      expect(userData.stagesUnlocked).toContain('young_owl');
      expect(userData.stagesUnlocked).toContain('wise_owl');
    });

    it('should not show celebration twice', async () => {
      // First evolution
      const result1 = await service.checkEvolution('user7', 7);
      expect(result1.celebrationMessage).not.toBeNull();

      // Same check again
      const result2 = await service.checkEvolution('user7', 7);
      expect(result2.celebrationMessage).toBeNull();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress within stage', async () => {
      // 3 days into owlet (0-6 range)
      const result = await service.checkEvolution('user8', 3);

      // Progress should be 3/7 ≈ 43%
      expect(result.progressPercent).toBeGreaterThan(40);
      expect(result.progressPercent).toBeLessThan(50);
    });

    it('should calculate progress to next stage', async () => {
      // 10 days into young_owl (7-29 range)
      const result = await service.checkEvolution('user9', 10);

      // 3 days into 23-day range = ~13%
      expect(result.progressPercent).toBeGreaterThan(10);
      expect(result.progressPercent).toBeLessThan(20);
      expect(result.daysToNextStage).toBe(20);
    });

    it('should return 100% progress at max level', async () => {
      const result = await service.checkEvolution('user10', 100);

      expect(result.progressPercent).toBe(100);
      expect(result.daysToNextStage).toBe(0);
    });
  });

  describe('Greeting and Display', () => {
    it('should return stage-appropriate greeting', async () => {
      await service.checkEvolution('user11', 7);

      const greeting = service.getSonyaGreeting('user11');
      expect(greeting).toContain('🦉');
    });

    it('should return correct emoji', async () => {
      await service.checkEvolution('user12', 30);

      const emoji = service.getSonyaEmoji('user12');
      expect(emoji).toBe('🦉✨');
    });

    it('should return correct name', async () => {
      await service.checkEvolution('user13', 66);

      const name = service.getSonyaName('user13');
      expect(name).toBe('Мастер сна Соня');
    });

    it('should generate evolution status', async () => {
      await service.checkEvolution('user14', 10);

      const status = service.getEvolutionStatus('user14');
      expect(status).toContain('Молодая сова Соня');
      expect(status).toContain('10');
    });

    it('should generate progress bar', async () => {
      await service.checkEvolution('user15', 15);

      const progressBar = service.getProgressBar('user15', 10);
      expect(progressBar.length).toBe(10);
      expect(progressBar).toContain('█');
    });
  });

  describe('GDPR Compliance', () => {
    it('should export user data', async () => {
      await service.checkEvolution('gdpr-user', 10);

      const exported = service.exportUserData('gdpr-user');
      expect(exported).not.toBeNull();
      expect(exported?.userId).toBe('gdpr-user');
      expect(exported?.daysActive).toBe(10);
    });

    it('should import user data', () => {
      const importData = {
        userId: 'imported-user',
        currentStage: 'wise_owl' as SonyaStageId,
        daysActive: 35,
        stagesUnlocked: ['owlet', 'young_owl', 'wise_owl'] as SonyaStageId[],
        lastEvolutionCheck: new Date(),
        celebrationShown: true,
      };

      service.importUserData(importData);

      const userData = service.getUserData('imported-user');
      expect(userData.currentStage).toBe('wise_owl');
      expect(userData.daysActive).toBe(35);
    });
  });
});
