/**
 * SafetyLevels Tests
 * ===================
 *
 * Comprehensive test suite for Mental Health Safety Levels (MHSL).
 * IEC 62304 Class C compliance requires 100% coverage.
 *
 * Research basis (2025):
 * - Anthropic ASL-3 Security Standard (May 2025)
 * - EU AI Act Risk Categories (Feb 2025)
 * - FDA Digital Therapeutics Classification
 *
 * @packageDocumentation
 */

import {
  SAFETY_LEVEL_CONFIGS,
  EU_AI_ACT_CLASSIFICATION,
  SafetyLevelService,
} from '../SafetyLevels';
import {
  ISafetyContext,
  SafetyLevel,
  RiskLevel,
} from '../../interfaces/ISafetyEnvelope';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function createSafetyContext(overrides: Partial<ISafetyContext> = {}): ISafetyContext {
  return {
    userId: 12345,
    ageGroup: 'adult',
    isMinor: false,
    sessionId: 'test-session-001',
    messageCount: 1,
    sessionDuration: 5,
    inputText: 'Привет, как дела?',
    operation: 'chat_response',
    currentRiskLevel: 'none' as RiskLevel,
    crisisIndicators: [],
    recentInteractions: [],
    previousViolations: [],
    timestamp: new Date(),
    source: 'user_message',
    confidenceInAgeDetection: 0.95,
    requiresExplanation: false,
    ...overrides,
  };
}

// =============================================================================
// SAFETY_LEVEL_CONFIGS TESTS
// =============================================================================
describe('SAFETY_LEVEL_CONFIGS', () => {
  it('should define all 4 MHSL levels', () => {
    expect(SAFETY_LEVEL_CONFIGS['MHSL-1']).toBeDefined();
    expect(SAFETY_LEVEL_CONFIGS['MHSL-2']).toBeDefined();
    expect(SAFETY_LEVEL_CONFIGS['MHSL-3']).toBeDefined();
    expect(SAFETY_LEVEL_CONFIGS['MHSL-4']).toBeDefined();
  });

  describe('MHSL-1 (Informational)', () => {
    const config = SAFETY_LEVEL_CONFIGS['MHSL-1'];

    it('should have correct level and name', () => {
      expect(config.level).toBe('MHSL-1');
      expect(config.name).toBe('Informational');
    });

    it('should have minimal capabilities', () => {
      expect(config.capabilities.canProvideInformation).toBe(true);
      expect(config.capabilities.canProvideEmotionalSupport).toBe(false);
      expect(config.capabilities.canSuggestInterventions).toBe(false);
      expect(config.capabilities.canDeliverTherapeuticContent).toBe(false);
      expect(config.capabilities.canMakeClinicalRecommendations).toBe(false);
    });

    it('should have minimal requirements', () => {
      expect(config.requirements.disclaimerRequired).toBe(true);
      expect(config.requirements.humanEscalationRequired).toBe(false);
      expect(config.requirements.auditLoggingRequired).toBe(false);
      expect(config.requirements.minorProtectionRequired).toBe(true);
    });

    it('should be classified as minimal-risk for EU AI Act', () => {
      expect(config.euAiActClassification).toBe('minimal-risk');
    });

    it('should have standard ASL-3 security tier', () => {
      expect(config.asl3SecurityTier).toBe('standard');
    });
  });

  describe('MHSL-2 (Supportive Interaction)', () => {
    const config = SAFETY_LEVEL_CONFIGS['MHSL-2'];

    it('should have correct level and name', () => {
      expect(config.level).toBe('MHSL-2');
      expect(config.name).toBe('Supportive Interaction');
    });

    it('should have supportive capabilities', () => {
      expect(config.capabilities.canProvideInformation).toBe(true);
      expect(config.capabilities.canProvideEmotionalSupport).toBe(true);
      expect(config.capabilities.canSuggestInterventions).toBe(true);
      expect(config.capabilities.canDeliverTherapeuticContent).toBe(false);
    });

    it('should require minor protection', () => {
      expect(config.requirements.minorProtectionRequired).toBe(true);
    });

    it('should be classified as limited-risk for EU AI Act', () => {
      expect(config.euAiActClassification).toBe('limited-risk');
    });
  });

  describe('MHSL-3 (Therapeutic Guidance)', () => {
    const config = SAFETY_LEVEL_CONFIGS['MHSL-3'];

    it('should have correct level', () => {
      expect(config.level).toBe('MHSL-3');
    });

    it('should have therapeutic capabilities', () => {
      expect(config.capabilities.canDeliverTherapeuticContent).toBe(true);
      // MHSL-3 does NOT make clinical recommendations - that's MHSL-4
      expect(config.capabilities.canMakeClinicalRecommendations).toBe(false);
    });

    it('should require clinical validation', () => {
      expect(config.capabilities.requiresClinicalValidation).toBe(true);
    });

    it('should be classified as high-risk for EU AI Act', () => {
      expect(config.euAiActClassification).toBe('high-risk');
    });

    it('should have restricted ASL-3 security tier', () => {
      expect(config.asl3SecurityTier).toBe('restricted');
    });
  });

  describe('MHSL-4 (Clinical Integration)', () => {
    const config = SAFETY_LEVEL_CONFIGS['MHSL-4'];

    it('should have correct level', () => {
      expect(config.level).toBe('MHSL-4');
    });

    it('should require clinical approval for deployment', () => {
      expect(config.deployment.requiresClinicalApproval).toBe(true);
      expect(config.deployment.requiresRegulatoryApproval).toBe(true);
    });

    it('should require red team testing', () => {
      expect(config.deployment.requiresRedTeamTesting).toBe(true);
    });

    it('should have critical ASL-3 security tier', () => {
      expect(config.asl3SecurityTier).toBe('critical');
    });

    it('should require real-time monitoring', () => {
      expect(config.requirements.realTimeMonitoring).toBe(true);
    });
  });
});

// =============================================================================
// EU_AI_ACT_CLASSIFICATION TESTS
// =============================================================================
describe('EU_AI_ACT_CLASSIFICATION', () => {
  it('should have current classification as limited-risk', () => {
    expect(EU_AI_ACT_CLASSIFICATION.currentClassification).toBe('limited-risk');
  });

  it('should include reasoning for classification', () => {
    expect(EU_AI_ACT_CLASSIFICATION.reasoning).toContain('Chatbot system requiring AI disclosure (Article 52)');
    expect(EU_AI_ACT_CLASSIFICATION.reasoning).toContain('No autonomous clinical decision-making');
  });

  it('should include transparency obligations', () => {
    expect(EU_AI_ACT_CLASSIFICATION.transparency_obligations).toContain('Users informed they are interacting with AI');
    expect(EU_AI_ACT_CLASSIFICATION.transparency_obligations).toContain('Clear information about AI capabilities and limitations');
  });

  it('should define what would make it high-risk', () => {
    expect(EU_AI_ACT_CLASSIFICATION.wouldBeHighRiskIf).toContain('Autonomous diagnosis of mental health conditions');
    expect(EU_AI_ACT_CLASSIFICATION.wouldBeHighRiskIf).toContain('Prescription or medication recommendations');
  });

  it('should have prohibited practices compliance', () => {
    expect(EU_AI_ACT_CLASSIFICATION.prohibitedPracticesCompliance.subliminalManipulation.compliant).toBe(true);
    expect(EU_AI_ACT_CLASSIFICATION.prohibitedPracticesCompliance.exploitingVulnerabilities.compliant).toBe(true);
    expect(EU_AI_ACT_CLASSIFICATION.prohibitedPracticesCompliance.socialScoring.compliant).toBe(true);
    expect(EU_AI_ACT_CLASSIFICATION.prohibitedPracticesCompliance.psychologicalHarm.compliant).toBe(true);
  });

  it('should reference relevant EU AI Act articles', () => {
    expect(EU_AI_ACT_CLASSIFICATION.articleReferences).toContain('Article 5 - Prohibited AI practices');
    expect(EU_AI_ACT_CLASSIFICATION.articleReferences).toContain('Article 52 - Transparency for chatbots');
  });
});

// =============================================================================
// SafetyLevelService TESTS
// =============================================================================
describe('SafetyLevelService', () => {
  describe('Constructor', () => {
    it('should default to MHSL-2', () => {
      const service = new SafetyLevelService();
      expect(service.getCurrentLevel()).toBe('MHSL-2');
    });

    it('should accept custom initial level', () => {
      const service = new SafetyLevelService('MHSL-1');
      expect(service.getCurrentLevel()).toBe('MHSL-1');
    });

    it('should initialize with MHSL-3', () => {
      const service = new SafetyLevelService('MHSL-3');
      expect(service.getCurrentLevel()).toBe('MHSL-3');
    });

    it('should initialize with MHSL-4', () => {
      const service = new SafetyLevelService('MHSL-4');
      expect(service.getCurrentLevel()).toBe('MHSL-4');
    });
  });

  describe('getConfig', () => {
    it('should return configuration for current level', () => {
      const service = new SafetyLevelService('MHSL-2');
      const config = service.getConfig();
      expect(config.level).toBe('MHSL-2');
      expect(config.name).toBe('Supportive Interaction');
    });
  });

  describe('getSecurityTier', () => {
    it('should return correct security tier for each level', () => {
      expect(new SafetyLevelService('MHSL-1').getSecurityTier()).toBe('standard');
      expect(new SafetyLevelService('MHSL-2').getSecurityTier()).toBe('elevated');
      expect(new SafetyLevelService('MHSL-3').getSecurityTier()).toBe('restricted');
      expect(new SafetyLevelService('MHSL-4').getSecurityTier()).toBe('critical');
    });
  });

  describe('getEUAIActClassification', () => {
    it('should return correct EU AI Act classification', () => {
      expect(new SafetyLevelService('MHSL-1').getEUAIActClassification()).toBe('minimal-risk');
      expect(new SafetyLevelService('MHSL-2').getEUAIActClassification()).toBe('limited-risk');
      expect(new SafetyLevelService('MHSL-3').getEUAIActClassification()).toBe('high-risk');
      expect(new SafetyLevelService('MHSL-4').getEUAIActClassification()).toBe('high-risk');
    });
  });

  describe('isActionAllowed', () => {
    it('should check if action is allowed at MHSL-1', () => {
      const service = new SafetyLevelService('MHSL-1');
      expect(service.isActionAllowed('canProvideInformation')).toBe(true);
      expect(service.isActionAllowed('canProvideEmotionalSupport')).toBe(false);
      expect(service.isActionAllowed('canSuggestInterventions')).toBe(false);
    });

    it('should check if action is allowed at MHSL-2', () => {
      const service = new SafetyLevelService('MHSL-2');
      expect(service.isActionAllowed('canProvideInformation')).toBe(true);
      expect(service.isActionAllowed('canProvideEmotionalSupport')).toBe(true);
      expect(service.isActionAllowed('canSuggestInterventions')).toBe(true);
      expect(service.isActionAllowed('canDeliverTherapeuticContent')).toBe(false);
    });

    it('should check if action is allowed at MHSL-3', () => {
      const service = new SafetyLevelService('MHSL-3');
      expect(service.isActionAllowed('canDeliverTherapeuticContent')).toBe(true);
      // MHSL-3 does NOT allow clinical recommendations - that's MHSL-4
      expect(service.isActionAllowed('canMakeClinicalRecommendations')).toBe(false);
    });

    it('should check if action is allowed at MHSL-4', () => {
      const service = new SafetyLevelService('MHSL-4');
      expect(service.isActionAllowed('canDeliverTherapeuticContent')).toBe(true);
      expect(service.isActionAllowed('canMakeClinicalRecommendations')).toBe(true);
    });
  });

  describe('isRequirementNeeded', () => {
    it('should check if requirement is needed', () => {
      const service = new SafetyLevelService('MHSL-2');
      expect(service.isRequirementNeeded('disclaimerRequired')).toBe(true);
      expect(service.isRequirementNeeded('minorProtectionRequired')).toBe(true);
    });

    it('should return audit logging requirement for MHSL-3', () => {
      const service = new SafetyLevelService('MHSL-3');
      expect(service.isRequirementNeeded('auditLoggingRequired')).toBe(true);
    });
  });

  describe('isEnvironmentAllowed', () => {
    it('should allow all environments for MHSL-1', () => {
      const service = new SafetyLevelService('MHSL-1');
      expect(service.isEnvironmentAllowed('development')).toBe(true);
      expect(service.isEnvironmentAllowed('staging')).toBe(true);
      expect(service.isEnvironmentAllowed('production')).toBe(true);
    });

    it('should allow all environments for MHSL-2', () => {
      const service = new SafetyLevelService('MHSL-2');
      expect(service.isEnvironmentAllowed('development')).toBe(true);
      expect(service.isEnvironmentAllowed('staging')).toBe(true);
      expect(service.isEnvironmentAllowed('production')).toBe(true);
    });
  });

  describe('getMaxLatencyMs', () => {
    it('should return max latency for each level', () => {
      expect(new SafetyLevelService('MHSL-1').getMaxLatencyMs()).toBe(500);
      // MHSL-2, 3, 4 all have 100ms latency for sub-100ms guardrails
      expect(new SafetyLevelService('MHSL-2').getMaxLatencyMs()).toBe(100);
      expect(new SafetyLevelService('MHSL-3').getMaxLatencyMs()).toBe(100);
      expect(new SafetyLevelService('MHSL-4').getMaxLatencyMs()).toBe(100);
    });
  });

  describe('determineRequiredLevel', () => {
    it('should return MHSL-2 for critical risk', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext({ currentRiskLevel: 'critical' });
      expect(service.determineRequiredLevel(context)).toBe('MHSL-2');
    });

    it('should return MHSL-2 for high risk', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext({ currentRiskLevel: 'high' });
      expect(service.determineRequiredLevel(context)).toBe('MHSL-2');
    });

    it('should return MHSL-2 for intervention_selection operation', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext({ operation: 'intervention_selection' });
      expect(service.determineRequiredLevel(context)).toBe('MHSL-2');
    });

    it('should return MHSL-3 for causal_inference operation', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext({ operation: 'causal_inference' });
      expect(service.determineRequiredLevel(context)).toBe('MHSL-3');
    });

    it('should return MHSL-3 for counterfactual_generation operation', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext({ operation: 'counterfactual_generation' });
      expect(service.determineRequiredLevel(context)).toBe('MHSL-3');
    });

    it('should return MHSL-2 for vulnerability factors', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext({
        vulnerabilityFactors: ['previous_crisis', 'social_isolation']
      });
      expect(service.determineRequiredLevel(context)).toBe('MHSL-2');
    });

    it('should return MHSL-1 for default context', () => {
      const service = new SafetyLevelService();
      const context = createSafetyContext();
      expect(service.determineRequiredLevel(context)).toBe('MHSL-1');
    });
  });

  describe('isLevelSufficient', () => {
    it('should return true when current level >= required level', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext(); // Requires MHSL-1
      expect(service.isLevelSufficient(context)).toBe(true);
    });

    it('should return true when level exactly matches', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ currentRiskLevel: 'high' }); // Requires MHSL-2
      expect(service.isLevelSufficient(context)).toBe(true);
    });

    it('should return false when current level < required level', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ operation: 'causal_inference' }); // Requires MHSL-3
      expect(service.isLevelSufficient(context)).toBe(false);
    });
  });

  describe('getAdjustedCapabilities', () => {
    it('should restrict capabilities for critical risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedCapabilities('critical');

      expect(adjusted.canSuggestInterventions).toBe(false);
      expect(adjusted.canDeliverTherapeuticContent).toBe(false);
      expect(adjusted.requiresHumanOversight).toBe(true);
      expect(adjusted.requiresExplainability).toBe(true);
    });

    it('should require oversight for high risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedCapabilities('high');

      expect(adjusted.requiresHumanOversight).toBe(true);
      expect(adjusted.requiresExplainability).toBe(true);
    });

    it('should return base capabilities for moderate risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedCapabilities('moderate');

      expect(adjusted.canSuggestInterventions).toBe(true);
      expect(adjusted.canProvideEmotionalSupport).toBe(true);
    });

    it('should return base capabilities for low risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedCapabilities('low');
      const config = service.getConfig();

      expect(adjusted.canProvideInformation).toBe(config.capabilities.canProvideInformation);
    });

    it('should return base capabilities for none risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedCapabilities('none');

      expect(adjusted).toBeDefined();
    });
  });

  describe('getAdjustedRequirements', () => {
    it('should add requirements for children', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedRequirements('child');

      expect(adjusted.minorProtectionRequired).toBe(true);
      expect(adjusted.humanEscalationRequired).toBe(true);
      expect(adjusted.consentRequired).toBe(true);
      expect(adjusted.fundamentalRightsImpactAssessment).toBe(true);
      expect(adjusted.explainabilityRequired).toBe(true);
    });

    it('should add requirements for teens', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedRequirements('teen');

      expect(adjusted.minorProtectionRequired).toBe(true);
      expect(adjusted.humanEscalationRequired).toBe(true);
      expect(adjusted.explainabilityRequired).toBe(true);
    });

    it('should return base requirements for adults', () => {
      const service = new SafetyLevelService('MHSL-2');
      const adjusted = service.getAdjustedRequirements('adult');
      const config = service.getConfig();

      expect(adjusted.disclaimerRequired).toBe(config.requirements.disclaimerRequired);
    });
  });

  describe('requiresExplainability', () => {
    it('should require explainability for minors', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ isMinor: true });
      expect(service.requiresExplainability(context)).toBe(true);
    });

    it('should require explainability for high risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ currentRiskLevel: 'high' });
      expect(service.requiresExplainability(context)).toBe(true);
    });

    it('should require explainability for critical risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ currentRiskLevel: 'critical' });
      expect(service.requiresExplainability(context)).toBe(true);
    });

    it('should require explainability for intervention_selection', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ operation: 'intervention_selection' });
      expect(service.requiresExplainability(context)).toBe(true);
    });

    it('should require explainability for causal_inference', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ operation: 'causal_inference' });
      expect(service.requiresExplainability(context)).toBe(true);
    });

    it('should require explainability for counterfactual_generation', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ operation: 'counterfactual_generation' });
      expect(service.requiresExplainability(context)).toBe(true);
    });

    it('should use config value for regular adult context', () => {
      const service = new SafetyLevelService('MHSL-1');
      const context = createSafetyContext();
      // MHSL-1 does not require explainability by default
      expect(service.requiresExplainability(context)).toBe(false);
    });
  });

  describe('requiresHumanOversight', () => {
    it('should require oversight for critical risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ currentRiskLevel: 'critical' });
      expect(service.requiresHumanOversight(context)).toBe(true);
    });

    it('should require oversight for high risk', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ currentRiskLevel: 'high' });
      expect(service.requiresHumanOversight(context)).toBe(true);
    });

    it('should require oversight for children', () => {
      const service = new SafetyLevelService('MHSL-2');
      const context = createSafetyContext({ ageGroup: 'child' });
      expect(service.requiresHumanOversight(context)).toBe(true);
    });

    it('should use config value for regular adult context', () => {
      const service = new SafetyLevelService('MHSL-1');
      const context = createSafetyContext();
      // MHSL-1 does not require human oversight by default
      expect(service.requiresHumanOversight(context)).toBe(false);
    });
  });

  describe('checkLatencyCompliance', () => {
    it('should return compliant for latency within limit', () => {
      const service = new SafetyLevelService('MHSL-2'); // Max 100ms
      const result = service.checkLatencyCompliance(50);

      expect(result.compliant).toBe(true);
      expect(result.message).toContain('within limit');
    });

    it('should return compliant for exact limit', () => {
      const service = new SafetyLevelService('MHSL-2'); // Max 100ms
      const result = service.checkLatencyCompliance(100);

      expect(result.compliant).toBe(true);
    });

    it('should return non-compliant for latency exceeding limit', () => {
      const service = new SafetyLevelService('MHSL-2'); // Max 100ms
      const result = service.checkLatencyCompliance(150);

      expect(result.compliant).toBe(false);
      expect(result.message).toContain('exceeds limit');
    });

    it('should use correct limits for MHSL-1', () => {
      const service = new SafetyLevelService('MHSL-1'); // Max 500ms
      const result = service.checkLatencyCompliance(300);

      expect(result.compliant).toBe(true);
    });

    it('should apply same 100ms limit for MHSL-4', () => {
      const service = new SafetyLevelService('MHSL-4'); // Max 100ms
      const result = service.checkLatencyCompliance(75);

      expect(result.compliant).toBe(true);
    });
  });

  describe('getLevelDescription', () => {
    it('should return formatted description', () => {
      const service = new SafetyLevelService('MHSL-2');
      const description = service.getLevelDescription();

      expect(description).toContain('MHSL-2');
      expect(description).toContain('Supportive Interaction');
      expect(description).toContain('Capabilities:');
      expect(description).toContain('Requirements:');
      expect(description).toContain('Deployment:');
      expect(description).toContain('ASL-3');
    });

    it('should format capabilities correctly', () => {
      const service = new SafetyLevelService('MHSL-2');
      const description = service.getLevelDescription();

      expect(description).toContain('✅');
      expect(description).toContain('Provide Information');
      expect(description).toContain('Provide Emotional Support');
    });

    it('should show EU AI Act classification', () => {
      const service = new SafetyLevelService('MHSL-3');
      const description = service.getLevelDescription();

      expect(description).toContain('EU AI Act:');
      expect(description).toContain('HIGH-RISK');
    });
  });

  describe('getDisclaimerText', () => {
    it('should return base disclaimer for adults', () => {
      const service = new SafetyLevelService('MHSL-2');
      const disclaimer = service.getDisclaimerText('adult');

      expect(disclaimer).toContain('ВАЖНАЯ ИНФОРМАЦИЯ');
      expect(disclaimer).toContain('БАЙТ');
      expect(disclaimer).toContain('8-800-2000-122');
      expect(disclaimer).not.toContain('родителям');
    });

    it('should include child-specific message', () => {
      const service = new SafetyLevelService('MHSL-2');
      const disclaimer = service.getDisclaimerText('child');

      expect(disclaimer).toContain('ВАЖНАЯ ИНФОРМАЦИЯ');
      expect(disclaimer).toContain('родителям');
    });

    it('should include teen-specific message', () => {
      const service = new SafetyLevelService('MHSL-2');
      const disclaimer = service.getDisclaimerText('teen');

      expect(disclaimer).toContain('ВАЖНАЯ ИНФОРМАЦИЯ');
      expect(disclaimer).toContain('просить о помощи');
    });

    it('should default to adult disclaimer', () => {
      const service = new SafetyLevelService('MHSL-2');
      const disclaimer = service.getDisclaimerText();

      expect(disclaimer).toContain('ВАЖНАЯ ИНФОРМАЦИЯ');
      expect(disclaimer).not.toContain('родителям');
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================
describe('SafetyLevelService Edge Cases', () => {
  it('should handle empty vulnerability factors', () => {
    const service = new SafetyLevelService();
    const context = createSafetyContext({ vulnerabilityFactors: [] });
    // Empty array should not trigger MHSL-2 requirement
    expect(service.determineRequiredLevel(context)).toBe('MHSL-1');
  });

  it('should handle undefined vulnerability factors', () => {
    const service = new SafetyLevelService();
    const context = createSafetyContext();
    delete (context as any).vulnerabilityFactors;
    expect(service.determineRequiredLevel(context)).toBe('MHSL-1');
  });

  it('should handle all risk levels in getAdjustedCapabilities', () => {
    const service = new SafetyLevelService('MHSL-2');
    const riskLevels: RiskLevel[] = ['none', 'low', 'moderate', 'high', 'critical'];

    for (const risk of riskLevels) {
      const adjusted = service.getAdjustedCapabilities(risk);
      expect(adjusted).toBeDefined();
      expect(adjusted.canProvideInformation).toBeDefined();
    }
  });

  it('should handle all age groups in getAdjustedRequirements', () => {
    const service = new SafetyLevelService('MHSL-2');
    const ageGroups: Array<'child' | 'teen' | 'adult'> = ['child', 'teen', 'adult'];

    for (const age of ageGroups) {
      const adjusted = service.getAdjustedRequirements(age);
      expect(adjusted).toBeDefined();
      expect(adjusted.disclaimerRequired).toBeDefined();
    }
  });
});

// =============================================================================
// COMPLIANCE INTEGRATION TESTS
// =============================================================================
describe('SafetyLevelService Compliance', () => {
  it('should enforce EU AI Act requirements at MHSL-3', () => {
    const service = new SafetyLevelService('MHSL-3');
    const config = service.getConfig();

    // High-risk AI systems require
    expect(config.requirements.fundamentalRightsImpactAssessment).toBe(true);
    expect(config.requirements.auditLoggingRequired).toBe(true);
    expect(config.requirements.explainabilityRequired).toBe(true);
  });

  it('should meet ASL-3 restricted tier requirements at MHSL-3', () => {
    const service = new SafetyLevelService('MHSL-3');

    expect(service.getSecurityTier()).toBe('restricted');
    expect(service.getMaxLatencyMs()).toBeLessThanOrEqual(100); // <100ms for guardrails
  });

  it('should meet FDA DTx requirements at MHSL-4', () => {
    const service = new SafetyLevelService('MHSL-4');
    const config = service.getConfig();

    expect(config.deployment.requiresClinicalApproval).toBe(true);
    expect(config.deployment.requiresRegulatoryApproval).toBe(true);
    expect(config.capabilities.requiresClinicalValidation).toBe(true);
  });
});
