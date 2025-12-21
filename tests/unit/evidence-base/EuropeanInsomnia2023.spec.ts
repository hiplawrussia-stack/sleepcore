/**
 * EuropeanInsomnia2023 Unit Tests
 * Tests European Guideline 2023 for insomnia treatment
 */

import {
  europeanGuideline2023,
  EuropeanGuideline2023,
  DIAGNOSTIC_RECOMMENDATIONS,
  TREATMENT_RECOMMENDATIONS,
  PHARMACOLOGICAL_RECOMMENDATIONS,
  CBTI_COMPONENT_EVIDENCE,
  PHARMACOLOGICAL_EVIDENCE,
  DCBTI_CRITERIA,
} from '../../../src/evidence-base/guidelines/EuropeanInsomnia2023';

describe('EuropeanInsomnia2023', () => {
  let guideline: EuropeanGuideline2023;

  beforeEach(() => {
    guideline = new EuropeanGuideline2023();
  });

  describe('Constants', () => {
    describe('DIAGNOSTIC_RECOMMENDATIONS', () => {
      it('should have diagnostic recommendations', () => {
        expect(DIAGNOSTIC_RECOMMENDATIONS.length).toBeGreaterThan(0);
      });

      it('should have category diagnostic', () => {
        DIAGNOSTIC_RECOMMENDATIONS.forEach(r => {
          expect(r.category).toBe('diagnostic');
        });
      });

      it('should have clinical interview as Grade A', () => {
        const clinical = DIAGNOSTIC_RECOMMENDATIONS.find(r =>
          r.text.toLowerCase().includes('clinical interview')
        );
        expect(clinical).toBeDefined();
        expect(clinical!.evidenceGrade).toBe('A');
      });
    });

    describe('TREATMENT_RECOMMENDATIONS', () => {
      it('should have treatment recommendations', () => {
        expect(TREATMENT_RECOMMENDATIONS.length).toBeGreaterThan(0);
      });

      it('should have CBT-I as first-line', () => {
        const cbti = TREATMENT_RECOMMENDATIONS.find(r =>
          r.text.toLowerCase().includes('cbt-i') ||
          r.textRu.includes('КПТ-И')
        );
        expect(cbti).toBeDefined();
      });

      it('should have Grade A recommendations', () => {
        const gradeA = TREATMENT_RECOMMENDATIONS.filter(r => r.evidenceGrade === 'A');
        expect(gradeA.length).toBeGreaterThan(0);
      });
    });

    describe('PHARMACOLOGICAL_RECOMMENDATIONS', () => {
      it('should have pharmacological recommendations', () => {
        expect(PHARMACOLOGICAL_RECOMMENDATIONS.length).toBeGreaterThan(0);
      });

      it('should have new 2023 recommendations', () => {
        const new2023 = PHARMACOLOGICAL_RECOMMENDATIONS.filter(r => r.isNew2023);
        expect(new2023.length).toBeGreaterThan(0);
      });
    });

    describe('CBTI_COMPONENT_EVIDENCE', () => {
      it('should have all CBT-I components', () => {
        const components = CBTI_COMPONENT_EVIDENCE.map(c => c.component.toLowerCase());
        expect(components.some(c => c.includes('sleep restriction'))).toBe(true);
        expect(components.some(c => c.includes('stimulus control'))).toBe(true);
        expect(components.some(c => c.includes('cognitive'))).toBe(true);
      });

      it('should have effect sizes', () => {
        CBTI_COMPONENT_EVIDENCE.forEach(c => {
          expect(c.effectSize).toBeGreaterThan(0);
        });
      });

      it('should have quality ratings', () => {
        CBTI_COMPONENT_EVIDENCE.forEach(c => {
          expect(['high', 'moderate', 'low']).toContain(c.quality);
        });
      });

      it('should have confidence intervals', () => {
        CBTI_COMPONENT_EVIDENCE.forEach(c => {
          expect(c.effectSizeCI).toHaveLength(2);
          expect(c.effectSizeCI[0]).toBeLessThanOrEqual(c.effectSize);
          expect(c.effectSizeCI[1]).toBeGreaterThanOrEqual(c.effectSize);
        });
      });
    });

    describe('PHARMACOLOGICAL_EVIDENCE', () => {
      it('should have pharmacological evidence', () => {
        expect(PHARMACOLOGICAL_EVIDENCE.length).toBeGreaterThan(0);
      });

      it('should indicate recommended status', () => {
        const recommended = PHARMACOLOGICAL_EVIDENCE.filter(p => p.isRecommended);
        expect(recommended.length).toBeGreaterThan(0);
      });

      it('should have orexin antagonists as new 2023', () => {
        const orexin = PHARMACOLOGICAL_EVIDENCE.find(p =>
          p.class.toLowerCase().includes('orexin') ||
          p.agent.toLowerCase().includes('daridorexant')
        );
        expect(orexin).toBeDefined();
        expect(orexin!.isNew2023).toBe(true);
      });

      it('should have duration recommendations', () => {
        PHARMACOLOGICAL_EVIDENCE.forEach(p => {
          expect(p.recommendedDuration).toBeTruthy();
        });
      });

      it('should have side effects listed', () => {
        PHARMACOLOGICAL_EVIDENCE.forEach(p => {
          expect(Array.isArray(p.sideEffects)).toBe(true);
        });
      });
    });

    describe('DCBTI_CRITERIA', () => {
      it('should have dCBT-I criteria', () => {
        expect(DCBTI_CRITERIA.length).toBeGreaterThan(0);
      });

      it('should have required criteria', () => {
        const required = DCBTI_CRITERIA.filter(c => c.isRequired);
        expect(required.length).toBeGreaterThan(0);
      });

      it('should have descriptions', () => {
        DCBTI_CRITERIA.forEach(c => {
          expect(c.description).toBeTruthy();
        });
      });
    });
  });

  describe('Singleton export', () => {
    it('should export singleton instance', () => {
      expect(europeanGuideline2023).toBeDefined();
      expect(europeanGuideline2023).toBeInstanceOf(EuropeanGuideline2023);
    });
  });

  describe('getRecommendations()', () => {
    it('should return all recommendations', () => {
      const recs = guideline.getRecommendations();
      const totalCount =
        DIAGNOSTIC_RECOMMENDATIONS.length +
        TREATMENT_RECOMMENDATIONS.length +
        PHARMACOLOGICAL_RECOMMENDATIONS.length;
      expect(recs.length).toBe(totalCount);
    });

    it('should filter by diagnostic category', () => {
      const filtered = guideline.getRecommendations('diagnostic');
      filtered.forEach(r => {
        expect(r.category).toBe('diagnostic');
      });
      expect(filtered.length).toBe(DIAGNOSTIC_RECOMMENDATIONS.length);
    });

    it('should filter by treatment category', () => {
      const filtered = guideline.getRecommendations('treatment');
      filtered.forEach(r => {
        expect(r.category).toBe('treatment');
      });
      expect(filtered.length).toBe(TREATMENT_RECOMMENDATIONS.length);
    });

    it('should filter by pharmacological category', () => {
      const filtered = guideline.getRecommendations('pharmacological');
      filtered.forEach(r => {
        expect(r.category).toBe('pharmacological');
      });
      expect(filtered.length).toBe(PHARMACOLOGICAL_RECOMMENDATIONS.length);
    });
  });

  describe('getNew2023Recommendations()', () => {
    it('should return only new 2023 recommendations', () => {
      const new2023 = guideline.getNew2023Recommendations();
      new2023.forEach(r => {
        expect(r.isNew2023).toBe(true);
      });
    });

    it('should return fewer items than total', () => {
      const new2023 = guideline.getNew2023Recommendations();
      const all = guideline.getRecommendations();
      expect(new2023.length).toBeLessThan(all.length);
    });
  });

  describe('getGradeARecommendations()', () => {
    it('should return only Grade A recommendations', () => {
      const gradeA = guideline.getGradeARecommendations();
      gradeA.forEach(r => {
        expect(r.evidenceGrade).toBe('A');
      });
    });

    it('should return at least one recommendation', () => {
      const gradeA = guideline.getGradeARecommendations();
      expect(gradeA.length).toBeGreaterThan(0);
    });
  });

  describe('getCBTIComponentEvidence()', () => {
    it('should return all component evidence', () => {
      const evidence = guideline.getCBTIComponentEvidence();
      expect(evidence.length).toBe(CBTI_COMPONENT_EVIDENCE.length);
    });
  });

  describe('getMostEffectiveCBTIComponents()', () => {
    it('should return high quality components only', () => {
      const mostEffective = guideline.getMostEffectiveCBTIComponents();
      mostEffective.forEach(c => {
        expect(c.quality).toBe('high');
      });
    });

    it('should be sorted by effect size descending', () => {
      const mostEffective = guideline.getMostEffectiveCBTIComponents();
      for (let i = 1; i < mostEffective.length; i++) {
        expect(mostEffective[i - 1].effectSize).toBeGreaterThanOrEqual(
          mostEffective[i].effectSize
        );
      }
    });
  });

  describe('getPharmacologicalEvidence()', () => {
    it('should return all evidence when no filter', () => {
      const all = guideline.getPharmacologicalEvidence();
      expect(all.length).toBe(PHARMACOLOGICAL_EVIDENCE.length);
    });

    it('should filter recommended only', () => {
      const recommended = guideline.getPharmacologicalEvidence(true);
      recommended.forEach(p => {
        expect(p.isRecommended).toBe(true);
      });
    });

    it('should filter not recommended only', () => {
      const notRecommended = guideline.getPharmacologicalEvidence(false);
      notRecommended.forEach(p => {
        expect(p.isRecommended).toBe(false);
      });
    });
  });

  describe('getDCBTICriteria()', () => {
    it('should return all dCBT-I criteria', () => {
      const criteria = guideline.getDCBTICriteria();
      expect(criteria.length).toBe(DCBTI_CRITERIA.length);
    });
  });

  describe('checkDCBTICompliance()', () => {
    it('should be compliant when all required criteria met', () => {
      const criteria: Record<string, boolean> = {};
      DCBTI_CRITERIA.forEach(c => {
        criteria[c.criterion] = true;
      });

      const result = guideline.checkDCBTICompliance(criteria);
      expect(result.compliant).toBe(true);
      expect(result.missingRequired.length).toBe(0);
      expect(result.missingOptional.length).toBe(0);
    });

    it('should be non-compliant when required criteria missing', () => {
      const criteria: Record<string, boolean> = {};
      // Only set optional criteria
      DCBTI_CRITERIA.forEach(c => {
        if (!c.isRequired) {
          criteria[c.criterion] = true;
        }
      });

      const result = guideline.checkDCBTICompliance(criteria);
      if (DCBTI_CRITERIA.some(c => c.isRequired)) {
        expect(result.compliant).toBe(false);
        expect(result.missingRequired.length).toBeGreaterThan(0);
      }
    });

    it('should list missing optional criteria', () => {
      const criteria: Record<string, boolean> = {};
      // Only set required criteria
      DCBTI_CRITERIA.forEach(c => {
        if (c.isRequired) {
          criteria[c.criterion] = true;
        }
      });

      const result = guideline.checkDCBTICompliance(criteria);
      expect(result.compliant).toBe(true);
      if (DCBTI_CRITERIA.some(c => !c.isRequired)) {
        expect(result.missingOptional.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty criteria', () => {
      const result = guideline.checkDCBTICompliance({});
      if (DCBTI_CRITERIA.some(c => c.isRequired)) {
        expect(result.compliant).toBe(false);
      }
    });
  });

  describe('generateSummaryReport()', () => {
    it('should generate report string', () => {
      const report = guideline.generateSummaryReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(100);
    });

    it('should include title', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('ЕВРОПЕЙСКОЕ РУКОВОДСТВО');
      expect(report).toContain('2023');
    });

    it('should include source citation', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('Riemann');
      expect(report).toContain('ESRS');
    });

    it('should include Grade A recommendations', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('Grade A');
    });

    it('should include new 2023 section', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('НОВОЕ В 2023');
    });

    it('should include CBT-I components section', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('КПТ-И');
      expect(report).toContain('d=');
    });

    it('should include digital CBT-I section', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('ЦИФРОВАЯ КПТ-И');
    });

    it('should include pharmacotherapy section', () => {
      const report = guideline.generateSummaryReport();
      expect(report).toContain('ФАРМАКОТЕРАПИЯ');
    });

    it('should mention DORA as new', () => {
      const report = guideline.generateSummaryReport();
      expect(report.toLowerCase()).toContain('dora');
    });
  });

  describe('Clinical guideline compliance', () => {
    it('should recommend CBT-I as first-line treatment', () => {
      const treatment = guideline.getRecommendations('treatment');
      const cbti = treatment.find(r =>
        r.text.toLowerCase().includes('cbt-i') &&
        r.text.toLowerCase().includes('first')
      );
      expect(cbti).toBeDefined();
      expect(cbti!.evidenceGrade).toBe('A');
    });

    it('should have restrictions on sedative-hypnotics', () => {
      const pharma = guideline.getPharmacologicalEvidence();
      const sedatives = pharma.filter(p =>
        p.class.toLowerCase().includes('benzodiazepine') ||
        p.class.toLowerCase().includes('z-drug')
      );
      sedatives.forEach(s => {
        expect(s.recommendedDuration).toBeDefined();
      });
    });

    it('should not recommend antihistamines for insomnia', () => {
      const pharma = guideline.getPharmacologicalEvidence();
      const antihistamines = pharma.find(p =>
        p.class.toLowerCase().includes('antihistamine')
      );
      if (antihistamines) {
        expect(antihistamines.isRecommended).toBe(false);
      }
    });
  });
});
