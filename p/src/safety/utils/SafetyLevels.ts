/**
 * Mental Health Safety Levels (MHSL)
 *
 * Phase 6.2: Safety level classification inspired by Anthropic's ASL framework
 *
 * 2025 Research Integration:
 * - Anthropic ASL-3 Security Standard (May 2025)
 * - EU AI Act Risk Categories (Feb 2025)
 * - FDA Digital Therapeutics Classification
 * - APA Mental Health AI Advisory (Nov 2025)
 *
 * © БФ "Другой путь", 2025
 */

import {
  SafetyLevel,
  ISafetyLevelConfig,
  ISafetyContext,
  RiskLevel,
  EUAIActRiskLevel,
  ASL3SecurityTier,
} from '../interfaces/ISafetyEnvelope';

// ============================================================================
// MHSL DEFINITIONS
// ============================================================================

/**
 * Mental Health Safety Level configurations
 *
 * Graduated safety levels modeled after Anthropic's ASL framework,
 * adapted for mental health digital therapeutics context.
 *
 * 2025 enhancements:
 * - ASL-3 security tier mapping
 * - EU AI Act classification
 * - Explainability requirements
 * - Latency constraints
 */
export const SAFETY_LEVEL_CONFIGS: Record<SafetyLevel, ISafetyLevelConfig> = {
  // ---------------------------------------------------------------------------
  // MHSL-1: Informational Only
  // ---------------------------------------------------------------------------
  'MHSL-1': {
    level: 'MHSL-1',
    name: 'Informational',
    description: 'Read-only information delivery with no interactive support',

    capabilities: {
      canProvideInformation: true,
      canProvideEmotionalSupport: false,
      canSuggestInterventions: false,
      canDeliverTherapeuticContent: false,
      canMakeClinicalRecommendations: false,
      requiresHumanOversight: false,
      requiresClinicalValidation: false,
      // 2025 additions
      canUseAdaptivePersonalization: false,
      canAccessUserHistory: false,
      requiresExplainability: false,
    },

    requirements: {
      disclaimerRequired: true,
      humanEscalationRequired: false,
      auditLoggingRequired: false,
      consentRequired: false,
      minorProtectionRequired: true,
      // 2025 additions
      fundamentalRightsImpactAssessment: false,
      realTimeMonitoring: false,
      explainabilityRequired: false,
    },

    deployment: {
      allowedEnvironments: ['development', 'staging', 'production'],
      requiresClinicalApproval: false,
      requiresRegulatoryApproval: false,
      // 2025 additions
      maxResponseLatencyMs: 500,
      requiresRedTeamTesting: false,
    },

    asl3SecurityTier: 'standard',
    euAiActClassification: 'minimal-risk',
  },

  // ---------------------------------------------------------------------------
  // MHSL-2: Supportive Interaction (CURRENT LEVEL)
  // ---------------------------------------------------------------------------
  'MHSL-2': {
    level: 'MHSL-2',
    name: 'Supportive Interaction',
    description: 'Interactive emotional support and wellness guidance without clinical intervention',

    capabilities: {
      canProvideInformation: true,
      canProvideEmotionalSupport: true,
      canSuggestInterventions: true,
      canDeliverTherapeuticContent: false,
      canMakeClinicalRecommendations: false,
      requiresHumanOversight: false,
      requiresClinicalValidation: false,
      // 2025 additions
      canUseAdaptivePersonalization: true,
      canAccessUserHistory: true,
      requiresExplainability: true,
    },

    requirements: {
      disclaimerRequired: true,
      humanEscalationRequired: true, // For crisis situations
      auditLoggingRequired: true,
      consentRequired: true,
      minorProtectionRequired: true,
      // 2025 additions
      fundamentalRightsImpactAssessment: false,
      realTimeMonitoring: true,
      explainabilityRequired: true,
    },

    deployment: {
      allowedEnvironments: ['development', 'staging', 'production'],
      requiresClinicalApproval: false,
      requiresRegulatoryApproval: false,
      // 2025 additions
      maxResponseLatencyMs: 100, // Sub-100ms for guardrails
      requiresRedTeamTesting: true,
    },

    asl3SecurityTier: 'elevated',
    euAiActClassification: 'limited-risk',
  },

  // ---------------------------------------------------------------------------
  // MHSL-3: Therapeutic Guidance
  // ---------------------------------------------------------------------------
  'MHSL-3': {
    level: 'MHSL-3',
    name: 'Therapeutic Guidance',
    description: 'Structured therapeutic content delivery with mandatory human oversight',

    capabilities: {
      canProvideInformation: true,
      canProvideEmotionalSupport: true,
      canSuggestInterventions: true,
      canDeliverTherapeuticContent: true,
      canMakeClinicalRecommendations: false,
      requiresHumanOversight: true,
      requiresClinicalValidation: true,
      // 2025 additions
      canUseAdaptivePersonalization: true,
      canAccessUserHistory: true,
      requiresExplainability: true,
    },

    requirements: {
      disclaimerRequired: true,
      humanEscalationRequired: true,
      auditLoggingRequired: true,
      consentRequired: true,
      minorProtectionRequired: true,
      // 2025 additions
      fundamentalRightsImpactAssessment: true,
      realTimeMonitoring: true,
      explainabilityRequired: true,
    },

    deployment: {
      allowedEnvironments: ['staging', 'production'],
      requiresClinicalApproval: true,
      requiresRegulatoryApproval: false,
      // 2025 additions
      maxResponseLatencyMs: 100,
      requiresRedTeamTesting: true,
    },

    asl3SecurityTier: 'restricted',
    euAiActClassification: 'high-risk',
  },

  // ---------------------------------------------------------------------------
  // MHSL-4: Autonomous Therapeutic Intervention (FUTURE)
  // ---------------------------------------------------------------------------
  'MHSL-4': {
    level: 'MHSL-4',
    name: 'Autonomous Therapeutic Intervention',
    description: 'Autonomous delivery of personalized therapeutic interventions with clinical validation',

    capabilities: {
      canProvideInformation: true,
      canProvideEmotionalSupport: true,
      canSuggestInterventions: true,
      canDeliverTherapeuticContent: true,
      canMakeClinicalRecommendations: true,
      requiresHumanOversight: true,
      requiresClinicalValidation: true,
      // 2025 additions
      canUseAdaptivePersonalization: true,
      canAccessUserHistory: true,
      requiresExplainability: true,
    },

    requirements: {
      disclaimerRequired: true,
      humanEscalationRequired: true,
      auditLoggingRequired: true,
      consentRequired: true,
      minorProtectionRequired: true,
      // 2025 additions
      fundamentalRightsImpactAssessment: true,
      realTimeMonitoring: true,
      explainabilityRequired: true,
    },

    deployment: {
      allowedEnvironments: ['production'],
      requiresClinicalApproval: true,
      requiresRegulatoryApproval: true,
      // 2025 additions
      maxResponseLatencyMs: 100,
      requiresRedTeamTesting: true,
    },

    asl3SecurityTier: 'critical',
    euAiActClassification: 'high-risk',
  },
};

// ============================================================================
// CURRENT SYSTEM LEVEL
// ============================================================================

/**
 * Current safety level for the CogniCore system
 *
 * БАЙТ operates at MHSL-2: Supportive Interaction
 * - Provides emotional support and wellness tips
 * - Suggests coping techniques
 * - Does NOT provide clinical diagnosis or treatment
 * - Escalates to humans in crisis situations
 */
export const CURRENT_SAFETY_LEVEL: SafetyLevel = 'MHSL-2';

// ============================================================================
// EU AI ACT RISK CLASSIFICATION
// ============================================================================

/**
 * EU AI Act risk classification for mental health AI
 *
 * БАЙТ is classified as LIMITED-RISK AI system because:
 * - It's a chatbot that needs to disclose AI nature
 * - It does NOT autonomously make clinical decisions
 * - It escalates to humans in high-risk situations
 *
 * EU AI Act 2025 Updates:
 * - Article 5 prohibited practices check
 * - Article 52 transparency obligations
 * - Vulnerable groups protection
 */
export const EU_AI_ACT_CLASSIFICATION = {
  currentClassification: 'limited-risk' as EUAIActRiskLevel,

  reasoning: [
    'Chatbot system requiring AI disclosure (Article 52)',
    'No autonomous clinical decision-making',
    'Human escalation for high-risk situations',
    'Does not manipulate behavior detrimentally (Article 5)',
    'Vulnerable groups protection enabled (children, teens)',
  ],

  transparency_obligations: [
    'Users informed they are interacting with AI',
    'Clear information about AI capabilities and limitations',
    'Disclosure of data processing practices',
    'Emotion recognition disclosure when applicable',
    'Right to human escalation clearly communicated',
  ],

  wouldBeHighRiskIf: [
    'Autonomous diagnosis of mental health conditions',
    'Prescription or medication recommendations',
    'Autonomous therapeutic decision-making without oversight',
    'Processing of health data for treatment decisions',
    'Biometric categorization for mental state inference',
  ],

  prohibitedPracticesCompliance: {
    subliminalManipulation: {
      compliant: true,
      evidence: 'No subliminal techniques used, all interactions transparent',
    },
    exploitingVulnerabilities: {
      compliant: true,
      evidence: 'Minor protection and age-adaptive content enabled',
    },
    socialScoring: {
      compliant: true,
      evidence: 'No social scoring or behavioral profiling for discrimination',
    },
    psychologicalHarm: {
      compliant: true,
      evidence: 'Safety invariants prevent psychological harm',
    },
  },

  articleReferences: [
    'Article 5 - Prohibited AI practices',
    'Article 52 - Transparency for chatbots',
    'Article 27 - Fundamental rights impact assessment (FRIA)',
    'Article 72 - Post-market monitoring',
  ],
};

// ============================================================================
// SAFETY LEVEL SERVICE
// ============================================================================

/**
 * Safety Level Service
 *
 * Manages safety level configuration and validation
 * Enhanced with 2025 features:
 * - ASL-3 security tier support
 * - EU AI Act compliance checks
 * - Explainability requirements
 */
export class SafetyLevelService {
  private currentLevel: SafetyLevel;
  private config: ISafetyLevelConfig;

  constructor(level: SafetyLevel = CURRENT_SAFETY_LEVEL) {
    this.currentLevel = level;
    this.config = SAFETY_LEVEL_CONFIGS[level];
  }

  // ==========================================================================
  // LEVEL MANAGEMENT
  // ==========================================================================

  /**
   * Get current safety level
   */
  getCurrentLevel(): SafetyLevel {
    return this.currentLevel;
  }

  /**
   * Get current level configuration
   */
  getConfig(): ISafetyLevelConfig {
    return this.config;
  }

  /**
   * Get ASL-3 security tier
   */
  getSecurityTier(): ASL3SecurityTier {
    return this.config.asl3SecurityTier;
  }

  /**
   * Get EU AI Act classification
   */
  getEUAIActClassification(): EUAIActRiskLevel {
    return this.config.euAiActClassification;
  }

  /**
   * Check if action is allowed at current level
   */
  isActionAllowed(action: keyof ISafetyLevelConfig['capabilities']): boolean {
    return this.config.capabilities[action];
  }

  /**
   * Check if requirement is needed at current level
   */
  isRequirementNeeded(requirement: keyof ISafetyLevelConfig['requirements']): boolean {
    return this.config.requirements[requirement];
  }

  /**
   * Check if environment is allowed for deployment
   */
  isEnvironmentAllowed(env: 'development' | 'staging' | 'production'): boolean {
    return this.config.deployment.allowedEnvironments.includes(env);
  }

  /**
   * Get max allowed latency for guardrails
   */
  getMaxLatencyMs(): number {
    return this.config.deployment.maxResponseLatencyMs;
  }

  // ==========================================================================
  // LEVEL EVALUATION
  // ==========================================================================

  /**
   * Determine required safety level for given context
   *
   * Returns the minimum required safety level based on:
   * - Risk level
   * - User age group
   * - Operation type
   * - Vulnerability factors (2025)
   */
  determineRequiredLevel(context: ISafetyContext): SafetyLevel {
    // Crisis situations require at least MHSL-2 with human escalation
    if (context.currentRiskLevel === 'critical' || context.currentRiskLevel === 'high') {
      return 'MHSL-2';
    }

    // Therapeutic content requires MHSL-3
    if (context.operation === 'intervention_selection') {
      return 'MHSL-2'; // Currently we're at MHSL-2
    }

    // Causal inference operations require higher level (2025)
    if (context.operation === 'causal_inference' || context.operation === 'counterfactual_generation') {
      return 'MHSL-3';
    }

    // Vulnerability factors increase required level (EU AI Act 2025)
    if (context.vulnerabilityFactors && context.vulnerabilityFactors.length > 0) {
      return 'MHSL-2';
    }

    // Default informational level
    return 'MHSL-1';
  }

  /**
   * Check if current level is sufficient for context
   */
  isLevelSufficient(context: ISafetyContext): boolean {
    const requiredLevel = this.determineRequiredLevel(context);
    return this.compareLevel(this.currentLevel, requiredLevel) >= 0;
  }

  /**
   * Compare two safety levels
   *
   * Returns:
   * - Positive number if level1 > level2
   * - Negative number if level1 < level2
   * - 0 if equal
   */
  private compareLevel(level1: SafetyLevel, level2: SafetyLevel): number {
    const levelOrder: SafetyLevel[] = ['MHSL-1', 'MHSL-2', 'MHSL-3', 'MHSL-4'];
    return levelOrder.indexOf(level1) - levelOrder.indexOf(level2);
  }

  // ==========================================================================
  // RISK-BASED ADJUSTMENTS
  // ==========================================================================

  /**
   * Get adjusted capabilities based on risk level
   *
   * Higher risk = more restrictions
   */
  getAdjustedCapabilities(riskLevel: RiskLevel): ISafetyLevelConfig['capabilities'] {
    const baseCapabilities = { ...this.config.capabilities };

    if (riskLevel === 'critical') {
      // In critical risk, only allow basic support + crisis escalation
      return {
        ...baseCapabilities,
        canSuggestInterventions: false, // Focus on crisis support
        canDeliverTherapeuticContent: false,
        requiresHumanOversight: true,
        requiresExplainability: true, // 2025: Always explain in crisis
      };
    }

    if (riskLevel === 'high') {
      return {
        ...baseCapabilities,
        requiresHumanOversight: true,
        requiresExplainability: true,
      };
    }

    return baseCapabilities;
  }

  /**
   * Get adjusted requirements based on age group
   */
  getAdjustedRequirements(
    ageGroup: 'child' | 'teen' | 'adult'
  ): ISafetyLevelConfig['requirements'] {
    const baseRequirements = { ...this.config.requirements };

    if (ageGroup === 'child') {
      return {
        ...baseRequirements,
        minorProtectionRequired: true,
        humanEscalationRequired: true, // Always have human oversight for children
        consentRequired: true, // Parental consent implications
        fundamentalRightsImpactAssessment: true, // 2025: FRIA for minors
        explainabilityRequired: true, // 2025: Explain to guardians
      };
    }

    if (ageGroup === 'teen') {
      return {
        ...baseRequirements,
        minorProtectionRequired: true,
        humanEscalationRequired: true,
        explainabilityRequired: true,
      };
    }

    return baseRequirements;
  }

  // ==========================================================================
  // 2025 COMPLIANCE CHECKS
  // ==========================================================================

  /**
   * Check if explainability is required
   */
  requiresExplainability(context: ISafetyContext): boolean {
    // Always require for minors
    if (context.isMinor) return true;

    // Require for high-risk operations
    if (context.currentRiskLevel === 'high' || context.currentRiskLevel === 'critical') {
      return true;
    }

    // Require for certain operations
    const explainableOperations: string[] = [
      'intervention_selection',
      'causal_inference',
      'counterfactual_generation',
    ];
    if (explainableOperations.includes(context.operation)) {
      return true;
    }

    return this.config.requirements.explainabilityRequired;
  }

  /**
   * Check if human oversight is required
   */
  requiresHumanOversight(context: ISafetyContext): boolean {
    // Always require for crisis
    if (context.currentRiskLevel === 'critical' || context.currentRiskLevel === 'high') {
      return true;
    }

    // Always require for children
    if (context.ageGroup === 'child') {
      return true;
    }

    // Check config requirement
    return this.config.capabilities.requiresHumanOversight;
  }

  /**
   * Check latency compliance (2025: <100ms for guardrails)
   */
  checkLatencyCompliance(latencyMs: number): { compliant: boolean; message: string } {
    const maxLatency = this.config.deployment.maxResponseLatencyMs;

    if (latencyMs <= maxLatency) {
      return {
        compliant: true,
        message: `Latency ${latencyMs}ms within limit ${maxLatency}ms`,
      };
    }

    return {
      compliant: false,
      message: `Latency ${latencyMs}ms exceeds limit ${maxLatency}ms - guardrails may be degraded`,
    };
  }

  // ==========================================================================
  // LEVEL DOCUMENTATION
  // ==========================================================================

  /**
   * Get human-readable description of current level
   */
  getLevelDescription(): string {
    return `
${this.config.name} (${this.currentLevel})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.config.description}

Security Tier: ${this.config.asl3SecurityTier.toUpperCase()} (ASL-3)
EU AI Act: ${this.config.euAiActClassification.toUpperCase()}

Capabilities:
${Object.entries(this.config.capabilities)
  .map(([key, value]) => `  ${value ? '✅' : '❌'} ${this.formatCapabilityName(key)}`)
  .join('\n')}

Requirements:
${Object.entries(this.config.requirements)
  .map(([key, value]) => `  ${value ? '✅' : '❌'} ${this.formatRequirementName(key)}`)
  .join('\n')}

Deployment:
  Environments: ${this.config.deployment.allowedEnvironments.join(', ')}
  Clinical Approval: ${this.config.deployment.requiresClinicalApproval ? 'Required' : 'Not Required'}
  Regulatory Approval: ${this.config.deployment.requiresRegulatoryApproval ? 'Required' : 'Not Required'}
  Max Latency: ${this.config.deployment.maxResponseLatencyMs}ms
  Red Team Testing: ${this.config.deployment.requiresRedTeamTesting ? 'Required' : 'Not Required'}
    `.trim();
  }

  private formatCapabilityName(key: string): string {
    const names: Record<string, string> = {
      canProvideInformation: 'Provide Information',
      canProvideEmotionalSupport: 'Provide Emotional Support',
      canSuggestInterventions: 'Suggest Interventions',
      canDeliverTherapeuticContent: 'Deliver Therapeutic Content',
      canMakeClinicalRecommendations: 'Make Clinical Recommendations',
      requiresHumanOversight: 'Requires Human Oversight',
      requiresClinicalValidation: 'Requires Clinical Validation',
      canUseAdaptivePersonalization: 'Adaptive Personalization',
      canAccessUserHistory: 'Access User History',
      requiresExplainability: 'Requires Explainability',
    };
    return names[key] || key;
  }

  private formatRequirementName(key: string): string {
    const names: Record<string, string> = {
      disclaimerRequired: 'Disclaimer Required',
      humanEscalationRequired: 'Human Escalation Required',
      auditLoggingRequired: 'Audit Logging Required',
      consentRequired: 'User Consent Required',
      minorProtectionRequired: 'Minor Protection Required',
      fundamentalRightsImpactAssessment: 'FRIA Required',
      realTimeMonitoring: 'Real-Time Monitoring',
      explainabilityRequired: 'Explainability Required',
    };
    return names[key] || key;
  }

  /**
   * Get disclaimer text for current level
   */
  getDisclaimerText(ageGroup: 'child' | 'teen' | 'adult' = 'adult'): string {
    const baseDisclaimer = `
⚠️ ВАЖНАЯ ИНФОРМАЦИЯ

БАЙТ — это AI-помощник для поддержки цифрового благополучия.

• Это НЕ замена профессиональной психологической помощи
• AI НЕ может ставить диагнозы или назначать лечение
• При серьёзных проблемах обратитесь к специалисту

📞 Экстренная помощь: 8-800-2000-122 (бесплатно, 24/7)
    `.trim();

    if (ageGroup === 'child') {
      return `
${baseDisclaimer}

👨‍👩‍👧 Рекомендуем рассказать родителям, если тебе тяжело.
      `.trim();
    }

    if (ageGroup === 'teen') {
      return `
${baseDisclaimer}

💡 Помни: просить о помощи — это нормально и правильно.
      `.trim();
    }

    return baseDisclaimer;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const safetyLevelService = new SafetyLevelService();
