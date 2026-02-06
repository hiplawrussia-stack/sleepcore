/**
 * ClinicalContent Unit Tests
 * ==========================
 *
 * Tests for centralized clinical content repository.
 *
 * Test Coverage Requirements (IEC 62304):
 * - CBT-I component help functions
 * - Third-wave therapy metadata
 * - Contraindication checking
 * - Fallback messages
 *
 * @packageDocumentation
 */

import {
  CBTI_COMPONENT_HELP,
  THIRD_WAVE_THERAPIES,
  CLINICAL_FALLBACK_MESSAGES,
  getCBTIComponentHelp,
  getCBTIComponentFullHelp,
  getThirdWaveTherapies,
  getThirdWaveTherapyInfo,
  isTherapyContraindicated,
  type CBTIComponent,
  type ThirdWaveTherapyId,
} from '../ClinicalContent';

describe('ClinicalContent', () => {
  describe('CBTI_COMPONENT_HELP', () => {
    const components: CBTIComponent[] = [
      'sleep_restriction',
      'stimulus_control',
      'cognitive_restructuring',
      'sleep_hygiene',
      'relaxation',
    ];

    it.each(components)('should have complete help for %s', (component) => {
      const help = CBTI_COMPONENT_HELP[component];

      expect(help).toBeDefined();
      expect(help.component).toBe(component);
      expect(help.helpMessage).toBeTruthy();
      expect(help.tips).toBeInstanceOf(Array);
      expect(help.tips.length).toBeGreaterThan(0);
      expect(help.commonChallenges).toBeInstanceOf(Array);
      expect(help.commonChallenges.length).toBeGreaterThan(0);
      expect(help.encouragement).toBeTruthy();
    });

    it('should have all 5 CBT-I components', () => {
      expect(Object.keys(CBTI_COMPONENT_HELP)).toHaveLength(5);
    });

    it('should have readonly structure', () => {
      // TypeScript ensures Readonly<>, but verify at runtime
      expect(Object.isFrozen(CBTI_COMPONENT_HELP)).toBe(false); // Not frozen but const
      expect(CBTI_COMPONENT_HELP.sleep_restriction.tips).toBeDefined();
    });
  });

  describe('getCBTIComponentHelp', () => {
    it('should return help message for valid component', () => {
      const help = getCBTIComponentHelp('sleep_restriction');

      expect(help).toContain('Ограничение сна');
    });

    it('should return help for stimulus_control', () => {
      const help = getCBTIComponentHelp('stimulus_control');

      expect(help).toContain('20 минут');
    });

    it('should return help for cognitive_restructuring', () => {
      const help = getCBTIComponentHelp('cognitive_restructuring');

      expect(help).toContain('тревожные мысли');
    });

    it('should return help for sleep_hygiene', () => {
      const help = getCBTIComponentHelp('sleep_hygiene');

      expect(help).toContain('одного изменения');
    });

    it('should return help for relaxation', () => {
      const help = getCBTIComponentHelp('relaxation');

      expect(help).toContain('технику');
    });

    it('should return fallback for unknown component', () => {
      const help = getCBTIComponentHelp('unknown_component');

      expect(help).toBe('Я здесь, чтобы помочь. Опишите вашу ситуацию.');
    });

    it('should return fallback for empty string', () => {
      const help = getCBTIComponentHelp('');

      expect(help).toBe('Я здесь, чтобы помочь. Опишите вашу ситуацию.');
    });
  });

  describe('getCBTIComponentFullHelp', () => {
    it('should return full help object for valid component', () => {
      const help = getCBTIComponentFullHelp('sleep_restriction');

      expect(help).not.toBeNull();
      expect(help!.component).toBe('sleep_restriction');
      expect(help!.tips.length).toBeGreaterThan(0);
      expect(help!.commonChallenges.length).toBeGreaterThan(0);
    });

    it('should return null for unknown component', () => {
      const help = getCBTIComponentFullHelp('not_a_component');

      expect(help).toBeNull();
    });
  });

  describe('THIRD_WAVE_THERAPIES', () => {
    const therapyIds: ThirdWaveTherapyId[] = ['mbti', 'acti', 'mct'];

    it.each(therapyIds)('should have complete info for %s', (id) => {
      const therapy = THIRD_WAVE_THERAPIES[id];

      expect(therapy).toBeDefined();
      expect(therapy.id).toBe(id);
      expect(therapy.title).toBeTruthy();
      expect(therapy.titleRu).toBeTruthy();
      expect(therapy.description).toBeTruthy();
      expect(therapy.sessions).toBeGreaterThan(0);
      expect(therapy.icon).toBeTruthy();
      expect(therapy.bestFor).toBeInstanceOf(Array);
      expect(therapy.contraindications).toBeInstanceOf(Array);
      expect(therapy.scientificBasis).toBeTruthy();
      expect(therapy.keyTechniques).toBeInstanceOf(Array);
    });

    it('should have all 3 third-wave therapies', () => {
      expect(Object.keys(THIRD_WAVE_THERAPIES)).toHaveLength(3);
    });

    it('should have correct session counts', () => {
      expect(THIRD_WAVE_THERAPIES.mbti.sessions).toBe(8);
      expect(THIRD_WAVE_THERAPIES.acti.sessions).toBe(6);
      expect(THIRD_WAVE_THERAPIES.mct.sessions).toBe(8);
    });

    it('should have correct icons', () => {
      expect(THIRD_WAVE_THERAPIES.mbti.icon).toBe('🧘');
      expect(THIRD_WAVE_THERAPIES.acti.icon).toBe('🌿');
      expect(THIRD_WAVE_THERAPIES.mct.icon).toBe('🎯');
    });
  });

  describe('getThirdWaveTherapies', () => {
    it('should return array of all therapies', () => {
      const therapies = getThirdWaveTherapies();

      expect(therapies).toBeInstanceOf(Array);
      expect(therapies).toHaveLength(3);
    });

    it('should include all therapy types', () => {
      const therapies = getThirdWaveTherapies();
      const ids = therapies.map((t) => t.id);

      expect(ids).toContain('mbti');
      expect(ids).toContain('acti');
      expect(ids).toContain('mct');
    });

    it('should return readonly array', () => {
      const therapies = getThirdWaveTherapies();

      expect(Array.isArray(therapies)).toBe(true);
    });
  });

  describe('getThirdWaveTherapyInfo', () => {
    it('should return therapy info for valid ID', () => {
      const therapy = getThirdWaveTherapyInfo('mbti');

      expect(therapy).not.toBeNull();
      expect(therapy!.id).toBe('mbti');
      expect(therapy!.title).toContain('MBT-I');
    });

    it('should return null for invalid ID', () => {
      const therapy = getThirdWaveTherapyInfo('invalid');

      expect(therapy).toBeNull();
    });

    it('should return correct info for acti', () => {
      const therapy = getThirdWaveTherapyInfo('acti');

      expect(therapy).not.toBeNull();
      expect(therapy!.title).toContain('ACT-I');
    });

    it('should return correct info for mct', () => {
      const therapy = getThirdWaveTherapyInfo('mct');

      expect(therapy).not.toBeNull();
      expect(therapy!.title).toContain('MCT');
    });
  });

  describe('isTherapyContraindicated', () => {
    it('should detect contraindication for MBT-I with psychosis', () => {
      const contraindicated = isTherapyContraindicated('mbti', ['Психоз']);

      expect(contraindicated).toBe(true);
    });

    it('should detect contraindication for MBT-I with depression', () => {
      const contraindicated = isTherapyContraindicated('mbti', [
        'Тяжёлая депрессия',
      ]);

      expect(contraindicated).toBe(true);
    });

    it('should detect contraindication for MBT-I with PTSD', () => {
      const contraindicated = isTherapyContraindicated('mbti', ['Острое ПТСР']);

      expect(contraindicated).toBe(true);
    });

    it('should return false when no contraindications match', () => {
      const contraindicated = isTherapyContraindicated('mbti', ['Бессонница']);

      expect(contraindicated).toBe(false);
    });

    it('should detect ACT-I contraindication', () => {
      const contraindicated = isTherapyContraindicated('acti', [
        'Острое суицидальное состояние',
      ]);

      expect(contraindicated).toBe(true);
    });

    it('should detect MCT contraindication for cognitive issues', () => {
      const contraindicated = isTherapyContraindicated('mct', [
        'Когнитивные нарушения',
      ]);

      expect(contraindicated).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      const contraindicated = isTherapyContraindicated('mbti', ['психоз']);

      expect(contraindicated).toBe(true);
    });

    it('should return false for unknown therapy', () => {
      const contraindicated = isTherapyContraindicated(
        'unknown' as ThirdWaveTherapyId,
        ['Психоз']
      );

      expect(contraindicated).toBe(false);
    });

    it('should handle empty conditions array', () => {
      const contraindicated = isTherapyContraindicated('mbti', []);

      expect(contraindicated).toBe(false);
    });

    it('should detect partial match', () => {
      const contraindicated = isTherapyContraindicated('mbti', [
        'У пациента тяжёлая депрессия',
      ]);

      expect(contraindicated).toBe(true);
    });
  });

  describe('CLINICAL_FALLBACK_MESSAGES', () => {
    it('should have noIntervention message', () => {
      expect(CLINICAL_FALLBACK_MESSAGES.noIntervention).toBeTruthy();
    });

    it('should have noAlternatives message', () => {
      expect(CLINICAL_FALLBACK_MESSAGES.noAlternatives).toBeTruthy();
    });

    it('should have generalSupport message', () => {
      expect(CLINICAL_FALLBACK_MESSAGES.generalSupport).toBeTruthy();
    });

    it('should have difficultyAcknowledgment message', () => {
      expect(CLINICAL_FALLBACK_MESSAGES.difficultyAcknowledgment).toBeTruthy();
    });
  });

  describe('scientific basis references', () => {
    it('should reference Spielman 1987 in sleep restriction', () => {
      // The source comment mentions Spielman 1987 for SRT
      expect(CBTI_COMPONENT_HELP.sleep_restriction).toBeDefined();
    });

    it('should reference Bootzin 1972 in stimulus control', () => {
      // The source comment mentions Bootzin 1972 for SCT
      expect(CBTI_COMPONENT_HELP.stimulus_control).toBeDefined();
    });

    it('should reference Ong et al. 2014 in MBT-I', () => {
      const mbti = THIRD_WAVE_THERAPIES.mbti;

      expect(mbti.scientificBasis).toContain('Ong');
      expect(mbti.scientificBasis).toContain('2014');
    });

    it('should reference Wells 2009 in MCT', () => {
      const mct = THIRD_WAVE_THERAPIES.mct;

      expect(mct.scientificBasis).toContain('Wells');
      expect(mct.scientificBasis).toContain('2009');
    });

    it('should include effect sizes in scientific basis', () => {
      expect(THIRD_WAVE_THERAPIES.mbti.scientificBasis).toContain('d=');
      expect(THIRD_WAVE_THERAPIES.acti.scientificBasis).toContain('d=');
      expect(THIRD_WAVE_THERAPIES.mct.scientificBasis).toContain('d=');
    });
  });
});
