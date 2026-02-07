/**
 * ModelCard Tests
 *
 * Comprehensive test coverage for IEC 62304 Class C compliance
 * Target: 100% statement, branch, function, line coverage
 */

import {
  COGNICORE_MODEL_CARD,
  ModelCardGenerator,
  modelCardGenerator,
} from '../ModelCard';
import { IModelCard } from '../../interfaces/ISafetyEnvelope';

describe('ModelCard', () => {
  // ============================================================================
  // COGNICORE_MODEL_CARD CONSTANT
  // ============================================================================

  describe('COGNICORE_MODEL_CARD', () => {
    it('should have correct model name', () => {
      expect(COGNICORE_MODEL_CARD.modelName).toBe('CogniCore Cognitive Engine / БАЙТ');
    });

    it('should have correct organization', () => {
      expect(COGNICORE_MODEL_CARD.organization).toBe('БФ "Другой путь" (Charitable Foundation "Another Way")');
    });

    it('should have valid version format', () => {
      expect(COGNICORE_MODEL_CARD.modelVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have releaseDate as Date object', () => {
      expect(COGNICORE_MODEL_CARD.releaseDate).toBeInstanceOf(Date);
    });

    it('should have lastUpdated as Date object', () => {
      expect(COGNICORE_MODEL_CARD.lastUpdated).toBeInstanceOf(Date);
    });

    describe('intendedUse', () => {
      it('should have primaryUse description', () => {
        expect(COGNICORE_MODEL_CARD.intendedUse.primaryUse).toBeDefined();
        expect(COGNICORE_MODEL_CARD.intendedUse.primaryUse.length).toBeGreaterThan(100);
      });

      it('should have primaryUsers array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.intendedUse.primaryUsers)).toBe(true);
        expect(COGNICORE_MODEL_CARD.intendedUse.primaryUsers.length).toBeGreaterThan(0);
      });

      it('should have outOfScopeUses array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.intendedUse.outOfScopeUses)).toBe(true);
        expect(COGNICORE_MODEL_CARD.intendedUse.outOfScopeUses.length).toBeGreaterThan(0);
      });

      it('should include clinical diagnosis as out-of-scope', () => {
        expect(COGNICORE_MODEL_CARD.intendedUse.outOfScopeUses.some(
          u => u.toLowerCase().includes('diagnosis')
        )).toBe(true);
      });
    });

    describe('trainingData', () => {
      it('should have description', () => {
        expect(COGNICORE_MODEL_CARD.trainingData.description).toBeDefined();
      });

      it('should have sources array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.trainingData.sources)).toBe(true);
      });

      it('should have biasConsiderations array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.trainingData.biasConsiderations)).toBe(true);
      });
    });

    describe('performance', () => {
      it('should have metrics array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.performance.metrics)).toBe(true);
        expect(COGNICORE_MODEL_CARD.performance.metrics.length).toBeGreaterThan(0);
      });

      it('should have limitations array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.performance.limitations)).toBe(true);
      });

      it('should have metrics with required fields', () => {
        for (const metric of COGNICORE_MODEL_CARD.performance.metrics) {
          expect(metric.name).toBeDefined();
          expect(metric.value).toBeDefined();
          expect(metric.unit).toBeDefined();
          expect(metric.description).toBeDefined();
        }
      });
    });

    describe('ethicalConsiderations', () => {
      it('should have sensitiveUseCases', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.ethicalConsiderations.sensitiveUseCases)).toBe(true);
      });

      it('should have potentialHarms', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.ethicalConsiderations.potentialHarms)).toBe(true);
      });

      it('should have mitigationStrategies', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.ethicalConsiderations.mitigationStrategies)).toBe(true);
      });
    });

    describe('safety', () => {
      it('should have safetyLevel', () => {
        expect(COGNICORE_MODEL_CARD.safety.safetyLevel).toBeDefined();
      });

      it('should have constitutionalPrinciplesCount', () => {
        expect(typeof COGNICORE_MODEL_CARD.safety.constitutionalPrinciplesCount).toBe('number');
      });

      it('should have safetyInvariantsCount', () => {
        expect(typeof COGNICORE_MODEL_CARD.safety.safetyInvariantsCount).toBe('number');
      });

      it('should have safetyMeasures array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.safety.safetyMeasures)).toBe(true);
      });

      it('should have knownFailureModes array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.safety.knownFailureModes)).toBe(true);
      });

      it('should have testedScenarios array', () => {
        expect(Array.isArray(COGNICORE_MODEL_CARD.safety.testedScenarios)).toBe(true);
      });
    });

    describe('regulatory', () => {
      it('should have fdaStatus', () => {
        expect(COGNICORE_MODEL_CARD.regulatory.fdaStatus).toBeDefined();
      });

      it('should have ceMarking', () => {
        expect(COGNICORE_MODEL_CARD.regulatory.ceMarking).toBeDefined();
      });

      it('should have clinicalValidation', () => {
        expect(COGNICORE_MODEL_CARD.regulatory.clinicalValidation).toBeDefined();
      });

      it('should have euAiActClassification', () => {
        expect(COGNICORE_MODEL_CARD.regulatory.euAiActClassification).toBeDefined();
      });
    });

    describe('contact', () => {
      it('should have email', () => {
        expect(COGNICORE_MODEL_CARD.contact.email).toBeDefined();
        expect(COGNICORE_MODEL_CARD.contact.email).toContain('@');
      });

      it('should have documentation URL', () => {
        expect(COGNICORE_MODEL_CARD.contact.documentation).toBeDefined();
      });
    });
  });

  // ============================================================================
  // MODELCARDGENERATOR CLASS
  // ============================================================================

  describe('ModelCardGenerator', () => {
    let generator: ModelCardGenerator;

    beforeEach(() => {
      generator = new ModelCardGenerator();
    });

    // ==========================================================================
    // CONSTRUCTOR
    // ==========================================================================

    describe('constructor', () => {
      it('should create with default COGNICORE_MODEL_CARD', () => {
        const gen = new ModelCardGenerator();
        expect(gen.getModelCard()).toBe(COGNICORE_MODEL_CARD);
      });

      it('should create with custom model card', () => {
        const customCard: IModelCard = {
          modelName: 'Custom Model',
          modelVersion: '1.0.0',
          organization: 'Test Org',
          releaseDate: new Date('2025-01-01'),
          lastUpdated: new Date('2025-01-01'),
          intendedUse: {
            primaryUse: 'Testing',
            primaryUsers: ['Testers'],
            outOfScopeUses: ['Production'],
          },
          trainingData: {
            description: 'Test data',
            sources: ['Test'],
            biasConsiderations: ['None'],
          },
          performance: {
            metrics: [{ name: 'Accuracy', value: 0.95, unit: '%', description: 'Test' }],
            limitations: ['Limited'],
          },
          ethicalConsiderations: {
            sensitiveUseCases: ['Test'],
            potentialHarms: ['Test'],
            mitigationStrategies: ['Test'],
          },
          safety: {
            safetyLevel: 'MHSL-2' as any,
            constitutionalPrinciplesCount: 5,
            safetyInvariantsCount: 10,
            safetyMeasures: ['Test'],
            knownFailureModes: ['Test'],
            testedScenarios: ['Test'],
          },
          regulatory: {
            fdaStatus: 'N/A',
            ceMarking: 'N/A',
            clinicalValidation: 'N/A',
            euAiActClassification: 'limited-risk',
          },
          contact: {
            email: 'test@test.com',
            documentation: 'https://test.com',
          },
        };
        const customGen = new ModelCardGenerator(customCard);
        expect(customGen.getModelCard().modelName).toBe('Custom Model');
      });
    });

    // ==========================================================================
    // GETTERS
    // ==========================================================================

    describe('getModelCard', () => {
      it('should return the model card', () => {
        const card = generator.getModelCard();
        expect(card).toBeDefined();
        expect(card.modelName).toBe(COGNICORE_MODEL_CARD.modelName);
      });
    });

    describe('getMetric', () => {
      it('should return metric by name', () => {
        const metrics = COGNICORE_MODEL_CARD.performance.metrics;
        if (metrics.length > 0) {
          const firstMetric = metrics[0];
          const result = generator.getMetric(firstMetric.name);
          expect(result).toBeDefined();
          expect(result?.name).toBe(firstMetric.name);
        }
      });

      it('should return undefined for unknown metric', () => {
        const result = generator.getMetric('NonExistentMetric12345');
        expect(result).toBeUndefined();
      });
    });

    // ==========================================================================
    // FORMAT GENERATORS
    // ==========================================================================

    describe('toMarkdown', () => {
      it('should generate markdown string', () => {
        const md = generator.toMarkdown();
        expect(typeof md).toBe('string');
        expect(md.length).toBeGreaterThan(100);
      });

      it('should include model name in header', () => {
        const md = generator.toMarkdown();
        expect(md).toContain(`# Model Card: ${COGNICORE_MODEL_CARD.modelName}`);
      });

      it('should include version', () => {
        const md = generator.toMarkdown();
        expect(md).toContain(`**Version:** ${COGNICORE_MODEL_CARD.modelVersion}`);
      });

      it('should include organization', () => {
        const md = generator.toMarkdown();
        expect(md).toContain(`**Organization:** ${COGNICORE_MODEL_CARD.organization}`);
      });

      it('should include Intended Use section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Intended Use');
      });

      it('should include Primary Users section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('### Primary Users');
      });

      it('should include Out-of-Scope Uses section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('### Out-of-Scope Uses');
      });

      it('should include Training Data section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Training Data');
      });

      it('should include Performance section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Performance');
      });

      it('should include metrics table', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('| Metric | Value | Description |');
      });

      it('should include Ethical Considerations section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Ethical Considerations');
      });

      it('should include Safety section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Safety');
      });

      it('should include safety level', () => {
        const md = generator.toMarkdown();
        expect(md).toContain(`**Safety Level:** ${COGNICORE_MODEL_CARD.safety.safetyLevel}`);
      });

      it('should include Regulatory Status section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Regulatory Status');
      });

      it('should include Contact section', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('## Contact');
      });

      it('should include disclaimer at the end', () => {
        const md = generator.toMarkdown();
        expect(md).toContain('This model card was generated automatically');
      });
    });

    describe('toJSON', () => {
      it('should generate valid JSON string', () => {
        const json = generator.toJSON();
        expect(typeof json).toBe('string');
        expect(() => JSON.parse(json)).not.toThrow();
      });

      it('should be parseable back to model card structure', () => {
        const json = generator.toJSON();
        const parsed = JSON.parse(json);
        expect(parsed.modelName).toBe(COGNICORE_MODEL_CARD.modelName);
        expect(parsed.modelVersion).toBe(COGNICORE_MODEL_CARD.modelVersion);
      });

      it('should include all required fields', () => {
        const json = generator.toJSON();
        const parsed = JSON.parse(json);
        expect(parsed.intendedUse).toBeDefined();
        expect(parsed.trainingData).toBeDefined();
        expect(parsed.performance).toBeDefined();
        expect(parsed.ethicalConsiderations).toBeDefined();
        expect(parsed.safety).toBeDefined();
        expect(parsed.regulatory).toBeDefined();
        expect(parsed.contact).toBeDefined();
      });
    });

    describe('toHTML', () => {
      it('should generate HTML string', () => {
        const html = generator.toHTML();
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(100);
      });

      it('should include DOCTYPE declaration', () => {
        const html = generator.toHTML();
        expect(html).toContain('<!DOCTYPE html>');
      });

      it('should include html lang attribute', () => {
        const html = generator.toHTML();
        expect(html).toContain('<html lang="ru">');
      });

      it('should include charset meta', () => {
        const html = generator.toHTML();
        expect(html).toContain('<meta charset="UTF-8">');
      });

      it('should include viewport meta', () => {
        const html = generator.toHTML();
        expect(html).toContain('viewport');
      });

      it('should include title with model name', () => {
        const html = generator.toHTML();
        expect(html).toContain(`<title>Model Card: ${COGNICORE_MODEL_CARD.modelName}</title>`);
      });

      it('should include style section', () => {
        const html = generator.toHTML();
        expect(html).toContain('<style>');
        expect(html).toContain('</style>');
      });

      it('should include body section', () => {
        const html = generator.toHTML();
        expect(html).toContain('<body>');
        expect(html).toContain('</body>');
      });

      it('should include markdown content in pre tag', () => {
        const html = generator.toHTML();
        expect(html).toContain('<pre>');
        expect(html).toContain('</pre>');
      });

      it('should include CSS for safety-badge class', () => {
        const html = generator.toHTML();
        expect(html).toContain('.safety-badge');
      });
    });

    // ==========================================================================
    // USER SUMMARIES
    // ==========================================================================

    describe('toUserSummary', () => {
      describe('child ageGroup', () => {
        it('should generate child-friendly summary', () => {
          const summary = generator.toUserSummary('child');
          expect(summary).toContain('БАЙТ');
        });

        it('should include robot emoji', () => {
          const summary = generator.toUserSummary('child');
          expect(summary).toContain('🤖');
        });

        it('should include what robot can do', () => {
          const summary = generator.toUserSummary('child');
          expect(summary).toContain('Я могу:');
          expect(summary).toContain('✅');
        });

        it('should include what robot cannot do', () => {
          const summary = generator.toUserSummary('child');
          expect(summary).toContain('Я НЕ могу:');
          expect(summary).toContain('❌');
        });

        it('should mention telling adults if feeling bad', () => {
          const summary = generator.toUserSummary('child');
          expect(summary).toContain('расскажи взрослому');
        });

        it('should use simple language', () => {
          const summary = generator.toUserSummary('child');
          expect(summary).toContain('робот-помощник');
          expect(summary).not.toContain('AI-ассистент');
        });
      });

      describe('teen ageGroup', () => {
        it('should generate teen-appropriate summary', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('БАЙТ');
        });

        it('should mention AI-помощник', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('AI-помощник');
        });

        it('should include what it does', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('Что я делаю:');
        });

        it('should include important info section', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('Важно знать:');
        });

        it('should include crisis hotline', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('8-800-2000-122');
        });

        it('should mention not being a replacement for psychologist', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('не замена психолога');
        });

        it('should mention that AI can make mistakes', () => {
          const summary = generator.toUserSummary('teen');
          expect(summary).toContain('могу ошибаться');
        });
      });

      describe('adult ageGroup', () => {
        it('should generate adult summary by default', () => {
          const summary = generator.toUserSummary();
          expect(summary).toContain('AI-ассистент');
        });

        it('should generate adult summary explicitly', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('AI-ассистент');
        });

        it('should include capabilities section', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('Возможности:');
        });

        it('should include limitations section', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('Ограничения:');
        });

        it('should include safety section', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('Безопасность:');
        });

        it('should mention safety invariants', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('инвариантов безопасности');
        });

        it('should mention constitutional principles', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('конституционных принципов');
        });

        it('should mention EU AI Act compliance', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('EU AI Act');
        });

        it('should include emergency hotline', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('8-800-2000-122');
        });

        it('should include contact email', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('tech@awfond.ru');
        });

        it('should mention XAI', () => {
          const summary = generator.toUserSummary('adult');
          expect(summary).toContain('XAI');
        });
      });
    });

    describe('toCompactSummary', () => {
      it('should generate compact summary', () => {
        const summary = generator.toCompactSummary();
        expect(typeof summary).toBe('string');
      });

      it('should include model name and version', () => {
        const summary = generator.toCompactSummary();
        expect(summary).toContain(COGNICORE_MODEL_CARD.modelName);
        expect(summary).toContain(COGNICORE_MODEL_CARD.modelVersion);
      });

      it('should include safety level', () => {
        const summary = generator.toCompactSummary();
        expect(summary).toContain('Safety:');
      });

      it('should include EU AI Act classification', () => {
        const summary = generator.toCompactSummary();
        expect(summary).toContain('EU AI Act:');
      });

      it('should include invariants count', () => {
        const summary = generator.toCompactSummary();
        expect(summary).toContain('Invariants:');
      });

      it('should include principles count', () => {
        const summary = generator.toCompactSummary();
        expect(summary).toContain('Principles:');
      });
    });

    // ==========================================================================
    // COMPLIANCE REPORTS
    // ==========================================================================

    describe('generateTransparencyReport', () => {
      it('should generate transparency report', () => {
        const report = generator.generateTransparencyReport();
        expect(typeof report).toBe('string');
        expect(report.length).toBeGreaterThan(100);
      });

      it('should include EU AI Act title', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('# EU AI Act Transparency Report');
      });

      it('should include system identification section', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('## System Identification');
      });

      it('should include model name', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain(COGNICORE_MODEL_CARD.modelName);
      });

      it('should include model version', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain(COGNICORE_MODEL_CARD.modelVersion);
      });

      it('should include Article 52 compliance section', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('## Article 52 Compliance');
      });

      it('should include AI nature disclosure', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('AI Nature Disclosure');
        expect(report).toContain('Users are informed they are interacting with an AI system');
      });

      it('should include capability disclosure', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('Capability Disclosure');
      });

      it('should include data processing disclosure', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('Data Processing Disclosure');
      });

      it('should include Article 5 compliance section', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('## Article 5 Compliance');
      });

      it('should include subliminal manipulation compliance', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('Subliminal Manipulation');
        expect(report).toContain('COMPLIANT');
      });

      it('should include exploiting vulnerabilities compliance', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('Exploiting Vulnerabilities');
      });

      it('should include social scoring compliance', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('Social Scoring');
      });

      it('should include safety measures section', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('## Safety Measures');
      });

      it('should include contact section', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('## Contact');
      });

      it('should include last updated date', () => {
        const report = generator.generateTransparencyReport();
        expect(report).toContain('Last Updated:');
      });
    });

    describe('generateSafetyAuditReport', () => {
      it('should generate safety audit report', () => {
        const report = generator.generateSafetyAuditReport();
        expect(typeof report).toBe('string');
        expect(report.length).toBeGreaterThan(100);
      });

      it('should include report title', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('# Safety Audit Report');
      });

      it('should include system name', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain(`## System: ${COGNICORE_MODEL_CARD.modelName}`);
      });

      it('should include current date', () => {
        const report = generator.generateSafetyAuditReport();
        const today = new Date().toISOString().split('T')[0];
        expect(report).toContain(`## Date: ${today}`);
      });

      it('should include safety level section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Safety Level');
      });

      it('should include current safety level', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain(`**Current Level:** ${COGNICORE_MODEL_CARD.safety.safetyLevel}`);
      });

      it('should include constitutional principles count', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('**Constitutional Principles:**');
      });

      it('should include safety invariants count', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('**Safety Invariants:**');
      });

      it('should include tested scenarios section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Tested Scenarios');
      });

      it('should include checkboxes for tested scenarios', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('[x]');
      });

      it('should include known failure modes section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Known Failure Modes');
      });

      it('should include red team results section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Red Team Results');
      });

      it('should include adversarial testing section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Adversarial Testing');
      });

      it('should include performance metrics section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Performance Metrics');
      });

      it('should include recommendations section', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Recommendations');
      });

      it('should include audit status', () => {
        const report = generator.generateSafetyAuditReport();
        expect(report).toContain('## Audit Status');
        expect(report).toContain('PASSED');
      });
    });

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================

    describe('edge cases', () => {
      it('should handle model card with empty arrays', () => {
        const minimalCard: IModelCard = {
          modelName: 'Minimal',
          modelVersion: '0.0.1',
          organization: 'Test',
          releaseDate: new Date(),
          lastUpdated: new Date(),
          intendedUse: {
            primaryUse: 'Test',
            primaryUsers: [],
            outOfScopeUses: [],
          },
          trainingData: {
            description: 'None',
            sources: [],
            biasConsiderations: [],
          },
          performance: {
            metrics: [],
            limitations: [],
          },
          ethicalConsiderations: {
            sensitiveUseCases: [],
            potentialHarms: [],
            mitigationStrategies: [],
          },
          safety: {
            safetyLevel: 'MHSL-1' as any,
            constitutionalPrinciplesCount: 0,
            safetyInvariantsCount: 0,
            safetyMeasures: [],
            knownFailureModes: [],
            testedScenarios: [],
          },
          regulatory: {
            fdaStatus: 'N/A',
            ceMarking: 'N/A',
            clinicalValidation: 'N/A',
            euAiActClassification: 'minimal-risk',
          },
          contact: {
            email: 'test@test.com',
            documentation: 'N/A',
          },
        };

        const gen = new ModelCardGenerator(minimalCard);

        // Should not throw
        expect(() => gen.toMarkdown()).not.toThrow();
        expect(() => gen.toJSON()).not.toThrow();
        expect(() => gen.toHTML()).not.toThrow();
        expect(() => gen.toUserSummary('child')).not.toThrow();
        expect(() => gen.toUserSummary('teen')).not.toThrow();
        expect(() => gen.toUserSummary('adult')).not.toThrow();
        expect(() => gen.toCompactSummary()).not.toThrow();
        expect(() => gen.generateTransparencyReport()).not.toThrow();
        expect(() => gen.generateSafetyAuditReport()).not.toThrow();
      });

      it('should handle model card without optional fields', () => {
        const cardWithoutOptional: IModelCard = {
          modelName: 'NoOptional',
          modelVersion: '1.0.0',
          organization: 'Test',
          releaseDate: new Date(),
          lastUpdated: new Date(),
          intendedUse: {
            primaryUse: 'Test',
            primaryUsers: ['User'],
            outOfScopeUses: ['Bad use'],
          },
          trainingData: {
            description: 'Test data',
            sources: ['Source'],
            biasConsiderations: ['Bias'],
          },
          performance: {
            metrics: [{ name: 'Test', value: 0.5, unit: '%', description: 'Test metric' }],
            limitations: ['Limit'],
          },
          ethicalConsiderations: {
            sensitiveUseCases: ['Sensitive'],
            potentialHarms: ['Harm'],
            mitigationStrategies: ['Strategy'],
          },
          safety: {
            safetyLevel: 'MHSL-2' as any,
            constitutionalPrinciplesCount: 1,
            safetyInvariantsCount: 1,
            safetyMeasures: ['Measure'],
            knownFailureModes: ['Failure'],
            testedScenarios: ['Scenario'],
            // No redTeamingResults or adversarialTestingResults
          },
          regulatory: {
            fdaStatus: 'Pending',
            ceMarking: 'Pending',
            clinicalValidation: 'Pending',
            euAiActClassification: 'limited-risk',
          },
          contact: {
            email: 'test@example.com',
            documentation: 'https://docs.example.com',
          },
        };

        const gen = new ModelCardGenerator(cardWithoutOptional);
        const auditReport = gen.generateSafetyAuditReport();

        // Should handle missing optional fields gracefully
        expect(auditReport).toContain('Not available');
      });
    });
  });

  // ============================================================================
  // SINGLETON EXPORT
  // ============================================================================

  describe('modelCardGenerator singleton', () => {
    it('should be an instance of ModelCardGenerator', () => {
      expect(modelCardGenerator).toBeInstanceOf(ModelCardGenerator);
    });

    it('should use default COGNICORE_MODEL_CARD', () => {
      expect(modelCardGenerator.getModelCard()).toBe(COGNICORE_MODEL_CARD);
    });

    it('should be the same instance on multiple imports', () => {
      const { modelCardGenerator: anotherImport } = require('../ModelCard');
      expect(modelCardGenerator).toBe(anotherImport);
    });
  });
});
