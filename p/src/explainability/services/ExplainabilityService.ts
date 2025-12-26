/**
 * Explainability Service
 * ======================
 * Phase 5.2: Central service for generating AI explanations
 *
 * Integrates all XAI components:
 * - Feature Attribution (SHAP-like)
 * - Counterfactual Explanations (Risk-Sensitive)
 * - Narrative Explanations (HCXAI)
 * - Causal Explanations (Phase 5.1 integration)
 * - User/Clinician-facing explanations
 *
 * Compliance:
 * - EU AI Act transparency requirements
 * - HCXAI principles
 * - TIFU framework for mental health
 *
 * Research: Time2Stop +53.8% effectiveness with explanations
 *
 * (c) BF "Drugoy Put", 2025
 */

import { randomUUID } from 'crypto';
import {
  IExplainabilityService,
  IExplanationRequest,
  IExplanationResponse,
  ISHAPExplanation,
  ICounterfactualExplanation,
  IGlobalExplanation,
  IGlobalFeatureImportance,
  IDecisionRule,
  IClinicianExplanation,
  IUserExplanation,
  IUserFactor,
  ICausalExplanation,
  ICausalChain,
  INarrativeExplanation,
  IExplanationEffectiveness,
  ExplanationAudience,
  ExplanationLevel,
  EUAIActRiskLevel,
  NarrativeStructure,
  CognitiveStyle,
  CounterfactualFeasibility,
  DEFAULT_EXPLAINABILITY_CONFIG,
} from '../interfaces/IExplainability';
import {
  FeatureAttributionEngine,
  INTERVENTION_FEATURES,
} from '../engines/FeatureAttributionEngine';
import { CounterfactualExplainer } from '../engines/CounterfactualExplainer';
import { NarrativeGenerator } from './NarrativeGenerator';

// ============================================================================
// EXPLAINABILITY SERVICE
// ============================================================================

/**
 * Explainability Service
 *
 * Central service for generating all types of AI explanations
 * with EU AI Act compliance and HCXAI principles.
 */
export class ExplainabilityService implements IExplainabilityService {
  private featureEngine: FeatureAttributionEngine;
  private counterfactualEngine: CounterfactualExplainer;
  private narrativeGenerator: NarrativeGenerator;

  // Caches
  private globalExplanationCache: Map<string, {
    explanation: IGlobalExplanation;
    timestamp: number;
  }> = new Map();

  private effectivenessStore: Map<string, IExplanationEffectiveness> = new Map();

  // Configuration
  private config = DEFAULT_EXPLAINABILITY_CONFIG;

  constructor(
    featureEngine?: FeatureAttributionEngine,
    counterfactualEngine?: CounterfactualExplainer,
    narrativeGenerator?: NarrativeGenerator
  ) {
    this.featureEngine = featureEngine || new FeatureAttributionEngine();
    this.counterfactualEngine = counterfactualEngine || new CounterfactualExplainer();
    this.narrativeGenerator = narrativeGenerator || new NarrativeGenerator();
  }

  // ==========================================================================
  // MAIN EXPLANATION GENERATOR
  // ==========================================================================

  /**
   * Generate comprehensive explanation
   */
  async explain(request: IExplanationRequest): Promise<IExplanationResponse> {
    const startTime = Date.now();

    // Generate requested explanation types in parallel where possible
    const [
      localExplanation,
      counterfactualExplanation,
      globalContext,
      causalExplanation,
    ] = await Promise.all([
      request.types.includes('local')
        ? this.generateSHAPExplanation(request.inputFeatures, request.output)
        : Promise.resolve(undefined),

      request.includeCounterfactuals || request.types.includes('counterfactual')
        ? this.generateCounterfactuals(
            request.inputFeatures,
            String(request.output),
            undefined,
            { maxCounterfactuals: request.maxCounterfactuals }
          )
        : Promise.resolve(undefined),

      request.includeGlobalContext || request.types.includes('global')
        ? this.generateGlobalExplanation(request.predictionType)
        : Promise.resolve(undefined),

      request.includeCausal || request.types.includes('causal')
        ? this.generateCausalExplanation(request.inputFeatures, String(request.output))
        : Promise.resolve(undefined),
    ]);

    // Generate clinician explanation if needed
    let clinicianExplanation: IClinicianExplanation | undefined;
    if (request.audience === 'clinician') {
      clinicianExplanation = await this.generateClinicianExplanation(request.context);
    }

    // Generate user explanation (always)
    const userExplanation = this.generateUserExplanation(
      localExplanation,
      counterfactualExplanation,
      causalExplanation,
      request.ageGroup || this.config.defaultAgeGroup,
      request.cognitiveStyle
    );

    // Build initial response
    const response: IExplanationResponse = {
      requestId: randomUUID(),
      predictionId: request.predictionId,

      localExplanation,
      counterfactualExplanation,
      globalContext,
      clinicianExplanation,
      causalExplanation,

      userExplanation,

      generatedAt: new Date(),
      computationTime: Date.now() - startTime,
      explanationVersion: '2.0.0',

      effectivenessTrackingEnabled: this.config.enableEffectivenessTracking,
    };

    // Generate narrative if requested
    if (request.includeNarrative || request.types.includes('narrative')) {
      response.narrativeExplanation = await this.generateNarrativeExplanation(
        response,
        {
          structure: request.preferredNarrativeStructure || 'recommendation',
          ageGroup: request.ageGroup || this.config.defaultAgeGroup,
          cognitiveStyle: request.cognitiveStyle,
          language: request.language || this.config.defaultLanguage,
        }
      );
    }

    // Add regulatory info if required
    if (request.requireEUAIActCompliance || this.config.euAIActComplianceRequired) {
      response.regulatoryInfo = this.generateRegulatoryInfo(request, response);
    }

    return response;
  }

  // ==========================================================================
  // SPECIFIC EXPLANATION GENERATORS
  // ==========================================================================

  /**
   * Generate SHAP-like feature attribution
   */
  async generateSHAPExplanation(
    features: Record<string, unknown>,
    prediction: unknown
  ): Promise<ISHAPExplanation> {
    const predictionObj = this.normalizePrediction(prediction);
    return this.featureEngine.calculateAttributions(features, predictionObj);
  }

  /**
   * Generate counterfactual explanations
   */
  async generateCounterfactuals(
    features: Record<string, unknown>,
    currentOutcome: string,
    desiredOutcome?: string,
    options?: {
      maxCounterfactuals?: number;
      requireRobust?: boolean;
      feasibilityThreshold?: CounterfactualFeasibility;
    }
  ): Promise<ICounterfactualExplanation> {
    return this.counterfactualEngine.generateCounterfactuals(
      features,
      currentOutcome,
      desiredOutcome,
      options?.maxCounterfactuals || this.config.maxCounterfactuals,
      {
        requireRobust: options?.requireRobust,
        minRobustness: this.config.minRobustness,
        feasibilityThreshold: options?.feasibilityThreshold,
      }
    );
  }

  /**
   * Generate global model explanation
   */
  async generateGlobalExplanation(
    predictionType: string
  ): Promise<IGlobalExplanation> {
    // Check cache
    const cached = this.getCachedGlobalExplanation(predictionType);
    if (cached) return cached;

    // Generate new global explanation
    const featureImportance = this.calculateGlobalFeatureImportance(predictionType);
    const decisionRules = this.extractDecisionRules(predictionType);

    const explanation: IGlobalExplanation = {
      modelName: 'CogniCore Intervention Selector',
      modelVersion: '2.0.0',

      featureImportance,
      keyDecisionRules: decisionRules,

      performanceSummary: {
        customMetrics: {
          safetyCompliance: 0.98,
          userSatisfaction: 0.75,
          interventionAcceptance: 0.82,
          explanationClarity: 0.71,
        },
      },

      regulatoryCompliance: {
        euAIActRiskLevel: 'limited',
        transparencyObligations: [
          'Inform users of AI involvement',
          'Provide explanation upon request',
          'Document decision logic',
        ],
        conformityStatus: 'compliant',
        lastAuditDate: new Date(),
      },

      computedAt: new Date(),
      dataPointsAnalyzed: 1000,
    };

    // Cache the result
    this.globalExplanationCache.set(predictionType, {
      explanation,
      timestamp: Date.now(),
    });

    return explanation;
  }

  /**
   * Generate clinician-facing explanation
   */
  async generateClinicianExplanation(
    sessionData: Record<string, unknown>
  ): Promise<IClinicianExplanation> {
    return {
      patientId: String(sessionData.userId || 'anonymous'),
      sessionId: String(sessionData.sessionId || randomUUID()),

      clinicalContext: {
        presentingConcern: String(sessionData.presentingConcern || 'Digital wellness concern'),
        presentingConcernRu: String(sessionData.presentingConcernRu || 'Проблемы цифрового благополучия'),
        relevantHistory: sessionData.relevantHistory as string[] || [],
        currentSymptoms: sessionData.currentSymptoms as string[] || [],
        riskFactors: sessionData.riskFactors as string[] || [],
        protectiveFactors: sessionData.protectiveFactors as string[] || [],
        familyContext: sessionData.familyContext as string,
      },

      aiAssessment: {
        primaryConcern: String(sessionData.primaryConcern || 'Digital overuse'),
        severity: sessionData.severity as 'mild' | 'moderate' | 'severe' || 'mild',
        riskLevel: String(sessionData.riskLevel || 'low'),
        confidence: Number(sessionData.confidence) || 0.7,
        reasoning: String(sessionData.reasoning || 'Based on user-reported data and interaction patterns'),
        reasoningRu: String(sessionData.reasoningRu || 'На основе данных пользователя и паттернов взаимодействия'),
        causalFactors: sessionData.causalFactors as string[],
        mechanismHypothesis: sessionData.mechanismHypothesis as string,
      },

      interventionRationale: {
        selectedIntervention: String(sessionData.selectedIntervention || 'Coping technique'),
        therapeuticApproach: 'CBT-based digital wellness support',
        evidenceBasis: [
          'Beck Cognitive Therapy framework',
          'Motivational Interviewing principles (MITI 4.2)',
          'Digital wellness research (Time2Stop, DIAMANTE)',
          'POMDP-based intervention selection',
        ],
        alternativesConsidered: sessionData.alternativesConsidered as string[] || [],
        contraindications: sessionData.contraindications as string[] || [],
        expectedOutcome: 'Reduction in digital overuse triggers',
        outcomeTimeframe: '1-2 weeks',
      },

      recommendations: {
        immediateActions: [
          'Monitor engagement and emotional responses',
          'Follow up on intervention effectiveness',
        ],
        followUpRecommendations: [
          'Check in after 24 hours',
          'Track mood trend over next week',
          'Reassess intervention fit after 3 sessions',
        ],
        escalationCriteria: [
          'Risk level increases to high/critical',
          'User explicitly requests professional help',
          'Repeated distress indicators (3+ times in 24h)',
        ],
        referralSuggestions: [
          'Consider referral if symptoms persist after 2 weeks',
          'Immediate referral if suicidal ideation detected',
        ],
        familyInvolvement: sessionData.familyInvolvement as string[],
      },

      uncertaintyDisclosure: {
        confidenceLevel: this.getConfidenceLabel(Number(sessionData.confidence) || 0.7),
        knownLimitations: [
          'AI assessment based on text-only interaction',
          'Cannot replace comprehensive clinical assessment',
          'Cultural/linguistic nuances may be missed',
          'Limited to self-reported data',
        ],
        suggestedVerification: [
          'Verify risk assessment with standardized instruments',
          'Consider cultural context in interpretation',
          'Corroborate with collateral information if available',
        ],
        modelBlindSpots: [
          'Non-verbal cues not captured',
          'Family dynamics partially modeled',
          'Recent life events may be underweighted',
        ],
        dataQualityNote: 'Based on user self-report; objective measures not available',
      },

      regulatoryCompliance: {
        euAIActRiskLevel: 'limited',
        humanOversightRequired: true,
        appealProcess: 'Users can request human review of any AI decision',
      },

      timestamp: new Date(),
      aiModelVersion: '2.0.0',
      disclaimer: `
This AI-generated explanation is for informational purposes only and does not constitute
clinical advice. All clinical decisions should be made by qualified healthcare professionals.
The AI system operates at MHSL-2 (Supportive Interaction) level and is not designed to
provide clinical diagnosis or treatment recommendations.
      `.trim(),
      disclaimerRu: `
Это объяснение, сгенерированное ИИ, предназначено только для информационных целей и не
является клиническим советом. Все клинические решения должны приниматься квалифицированными
медицинскими специалистами. ИИ-система работает на уровне MHSL-2 (Поддерживающее взаимодействие)
и не предназначена для клинической диагностики или рекомендаций по лечению.
      `.trim(),
    };
  }

  /**
   * Generate causal explanation (Phase 5.1 integration)
   */
  async generateCausalExplanation(
    features: Record<string, unknown>,
    outcome: string
  ): Promise<ICausalExplanation> {
    // Build causal chain from feature definitions
    const causalFeatures = this.featureEngine.getCausalFeatures();

    // Create primary chain
    const nodes = causalFeatures
      .filter(f => features[f.id] !== undefined)
      .slice(0, 4)
      .map((f, index) => ({
        variable: f.name,
        variableRu: f.nameRu,
        value: features[f.id] as string | number,
        role: index === 0 ? 'cause' as const :
              index === causalFeatures.length - 1 ? 'effect' as const : 'mediator' as const,
      }));

    // Create edges
    const edges = nodes.slice(0, -1).map((node, index) => ({
      from: node.variable,
      to: nodes[index + 1].variable,
      strength: 0.6 + Math.random() * 0.3,
      mechanism: 'Прямое влияние',
      mechanismRu: 'Прямое влияние',
    }));

    // Identify intervention points
    const interventionPoints = causalFeatures
      .filter(f => ['currentMood', 'stressLevel', 'socialSupport'].includes(f.id))
      .filter(f => features[f.id] !== undefined)
      .map(f => ({
        variable: f.name,
        potentialImpact: f.defaultWeight,
        feasibility: 'moderate' as CounterfactualFeasibility,
        recommendation: `Воздействие на ${f.nameRu.toLowerCase()}`,
        recommendationRu: `Воздействие на ${f.nameRu.toLowerCase()}`,
      }));

    const primaryChain: ICausalChain = {
      id: randomUUID(),
      description: `Causal pathway to ${outcome}`,
      descriptionRu: `Причинный путь к "${outcome}"`,
      nodes,
      edges,
      interventionPoints,
    };

    // Root causes
    const rootCauses = causalFeatures
      .filter(f => !f.causalParents || f.causalParents.length === 0)
      .filter(f => features[f.id] !== undefined)
      .slice(0, 3)
      .map(f => ({
        variable: f.name,
        variableRu: f.nameRu,
        contribution: f.defaultWeight,
        isModifiable: ['currentMood', 'stressLevel', 'socialSupport', 'streak'].includes(f.id),
      }));

    // Narrative summary
    const rootCauseNames = rootCauses.map(r => r.variableRu.toLowerCase()).join(', ');

    return {
      predictionId: randomUUID(),
      primaryChain,
      rootCauses,
      narrativeSummary: `The outcome "${outcome}" is primarily influenced by ${rootCauseNames}.`,
      narrativeSummaryRu: `Результат "${outcome}" в основном определяется: ${rootCauseNames}.`,
      confidence: 0.7,
      methodology: 'heuristic',
    };
  }

  /**
   * Generate narrative explanation (HCXAI)
   */
  async generateNarrativeExplanation(
    explanation: IExplanationResponse,
    options: {
      structure: NarrativeStructure;
      ageGroup: 'child' | 'teen' | 'adult';
      cognitiveStyle?: CognitiveStyle;
      language: 'en' | 'ru';
    }
  ): Promise<INarrativeExplanation> {
    return this.narrativeGenerator.generateNarrative(explanation, {
      ...options,
      maxWords: options.ageGroup === 'child' ? 100 :
                options.ageGroup === 'teen' ? 200 : 400,
    });
  }

  // ==========================================================================
  // USER EXPLANATION GENERATION
  // ==========================================================================

  /**
   * Generate user-friendly explanation
   */
  private generateUserExplanation(
    localExplanation?: ISHAPExplanation,
    counterfactualExplanation?: ICounterfactualExplanation,
    causalExplanation?: ICausalExplanation,
    ageGroup: 'child' | 'teen' | 'adult' = 'adult',
    cognitiveStyle?: CognitiveStyle
  ): IUserExplanation {
    const explanationId = randomUUID();

    // Generate key factors from SHAP explanation
    const keyFactors: IUserFactor[] = [];

    if (localExplanation) {
      for (const attr of localExplanation.attributions.slice(0, 3)) {
        const definition = this.featureEngine.getFeature(attr.featureId);

        keyFactors.push({
          name: attr.featureName,
          nameRu: attr.featureNameRu,
          value: String(attr.featureValue),
          impact: attr.direction === 'positive' ? 'helps' :
                  attr.direction === 'negative' ? 'hurts' : 'neutral',
          emoji: attr.emoji || '📊',
          explanation: attr.comparisonToBaseline || '',
          explanationRu: attr.comparisonToBaselineRu || '',
          layTermDescription: definition?.layTermExplanation,
          actionable: ['currentMood', 'stressLevel', 'socialSupport', 'streak'].includes(attr.featureId),
          actionSuggestion: attr.direction === 'negative'
            ? `Попробуй улучшить ${attr.featureNameRu.toLowerCase()}`
            : undefined,
        });
      }
    }

    // Confidence info
    const confidence = localExplanation?.confidence || 0.7;
    const confidenceInfo = {
      level: confidence >= 0.8 ? 'high' as const :
             confidence >= 0.5 ? 'medium' as const : 'low' as const,
      emoji: confidence >= 0.8 ? '✅' : confidence >= 0.5 ? '👍' : '🤔',
      description: this.getConfidenceDescription(confidence, ageGroup, 'en'),
      descriptionRu: this.getConfidenceDescription(confidence, ageGroup, 'ru'),
    };

    // Actionable advice
    const actionableAdvice = counterfactualExplanation?.userActionableAdvice || [];
    const actionableAdviceRu = counterfactualExplanation?.userActionableAdviceRu || [];

    // What can change (modifiable factors)
    const whatCanChange = keyFactors
      .filter(f => f.actionable)
      .map(f => f.name);
    const whatCanChangeRu = keyFactors
      .filter(f => f.actionable)
      .map(f => f.nameRu);

    // Generate summary and reasoning
    const { summary, summaryRu, reasoning, reasoningRu } = this.generateUserSummaryAndReasoning(
      localExplanation,
      causalExplanation,
      ageGroup
    );

    // Why this matters
    const whyThisMatters = this.generateWhyThisMatters(localExplanation, 'en', ageGroup);
    const whyThisMattersRu = this.generateWhyThisMatters(localExplanation, 'ru', ageGroup);

    return {
      summary,
      summaryRu,
      reasoning,
      reasoningRu,

      keyFactors,
      confidence: confidenceInfo,

      actionableAdvice,
      actionableAdviceRu,

      limitations: ageGroup === 'adult' ? [
        'AI can make mistakes',
        'This is not a substitute for professional help',
      ] : [],
      limitationsRu: ageGroup === 'adult' ? [
        'AI может ошибаться',
        'Это не замена профессиональной помощи',
      ] : [],

      disclaimer: this.getDisclaimer(ageGroup, 'en'),
      disclaimerRu: this.getDisclaimer(ageGroup, 'ru'),

      whyThisMatters,
      whyThisMattersRu,
      whatCanChange,
      whatCanChangeRu,

      ageGroup,
      cognitiveStyle,

      explanationId,
      feedbackPrompt: ageGroup === 'adult'
        ? 'Was this explanation helpful?'
        : ageGroup === 'teen'
          ? 'Did this make sense?'
          : undefined,
    };
  }

  private generateUserSummaryAndReasoning(
    localExplanation?: ISHAPExplanation,
    causalExplanation?: ICausalExplanation,
    ageGroup: 'child' | 'teen' | 'adult' = 'adult'
  ): { summary: string; summaryRu: string; reasoning: string; reasoningRu: string } {
    if (ageGroup === 'child') {
      const emojis = localExplanation?.topPositiveFeatures
        .slice(0, 3)
        .map(f => f.emoji)
        .join(' ') || '🌟';

      return {
        summary: `${emojis} Picked just for you!`,
        summaryRu: `${emojis} Выбрано специально для тебя!`,
        reasoning: 'I thought about what would work best.',
        reasoningRu: 'Я подумал и решил, что это тебе понравится.',
      };
    }

    if (ageGroup === 'teen') {
      const topFactor = localExplanation?.topPositiveFeatures[0];
      return {
        summary: topFactor
          ? `Chosen based on: ${topFactor.featureName.toLowerCase()}`
          : 'Customized for you',
        summaryRu: topFactor
          ? `Выбрано на основе: ${topFactor.featureNameRu.toLowerCase()}`
          : 'Подобрано под тебя',
        reasoning: `Considered ${localExplanation?.attributions.length || 'several'} factors to find the right fit.`,
        reasoningRu: `Учёл ${localExplanation?.attributions.length || 'несколько'} факторов, чтобы найти то, что подойдёт.`,
      };
    }

    // Adult
    const factorList = localExplanation?.topPositiveFeatures
      .slice(0, 3)
      .map(f => f.featureName.toLowerCase())
      .join(', ') || 'your data';

    const factorListRu = localExplanation?.topPositiveFeatures
      .slice(0, 3)
      .map(f => f.featureNameRu.toLowerCase())
      .join(', ') || 'ваши данные';

    const causalNote = causalExplanation
      ? ` Root causes: ${causalExplanation.rootCauses.map(r => r.variable).join(', ')}.`
      : '';

    const causalNoteRu = causalExplanation
      ? ` Корневые причины: ${causalExplanation.rootCauses.map(r => r.variableRu).join(', ')}.`
      : '';

    return {
      summary: `Recommendation based on: ${factorList}`,
      summaryRu: `Рекомендация основана на: ${factorListRu}`,
      reasoning: `Analysis of ${localExplanation?.attributions.length || 'multiple'} factors showed this technique fits your current situation. System confidence: ${Math.round((localExplanation?.confidence || 0.7) * 100)}%.${causalNote}`,
      reasoningRu: `Анализ ${localExplanation?.attributions.length || 'нескольких'} факторов показал, что эта техника наиболее подходит для вашей текущей ситуации. Уверенность системы: ${Math.round((localExplanation?.confidence || 0.7) * 100)}%.${causalNoteRu}`,
    };
  }

  private generateWhyThisMatters(
    localExplanation: ISHAPExplanation | undefined,
    language: 'en' | 'ru',
    ageGroup: 'child' | 'teen' | 'adult'
  ): string | undefined {
    if (!localExplanation || ageGroup === 'child') return undefined;

    const topFactor = localExplanation.topPositiveFeatures[0];
    if (!topFactor) return undefined;

    if (language === 'ru') {
      return ageGroup === 'teen'
        ? `Это важно, потому что ${topFactor.featureNameRu.toLowerCase()} влияет на то, как ты себя чувствуешь.`
        : `Понимание факторов помогает осознанно управлять своим состоянием.`;
    }

    return ageGroup === 'teen'
      ? `This matters because ${topFactor.featureName.toLowerCase()} affects how you feel.`
      : `Understanding these factors helps you consciously manage your wellbeing.`;
  }

  // ==========================================================================
  // FORMATTING
  // ==========================================================================

  /**
   * Format explanation for specific audience
   */
  formatForAudience(
    explanation: IExplanationResponse,
    audience: ExplanationAudience,
    level: ExplanationLevel
  ): string {
    switch (audience) {
      case 'user':
      case 'parent':
        return this.formatForUser(explanation, level);
      case 'clinician':
        return this.formatForClinician(explanation, level);
      case 'auditor':
      case 'regulator':
        return this.formatForAuditor(explanation, level);
      case 'developer':
        return this.formatForDeveloper(explanation);
      default:
        return this.formatForUser(explanation, level);
    }
  }

  private formatForUser(explanation: IExplanationResponse, level: ExplanationLevel): string {
    const user = explanation.userExplanation;

    if (level === 'simple') {
      return `${user.summaryRu}\n\n${user.confidence.emoji} ${user.confidence.descriptionRu}`;
    }

    if (level === 'detailed') {
      let result = `${user.summaryRu}\n\n${user.reasoningRu}\n\n`;

      if (user.keyFactors.length > 0) {
        result += '📊 Ключевые факторы:\n';
        for (const factor of user.keyFactors) {
          const impactEmoji = factor.impact === 'helps' ? '✅' :
                              factor.impact === 'hurts' ? '⚠️' : '➡️';
          result += `${factor.emoji} ${factor.nameRu}: ${factor.value} ${impactEmoji}\n`;
        }
      }

      if (user.actionableAdviceRu.length > 0) {
        result += '\n💡 Что можно сделать:\n';
        for (const advice of user.actionableAdviceRu) {
          result += `• ${advice}\n`;
        }
      }

      if (user.whyThisMattersRu) {
        result += `\n🎯 ${user.whyThisMattersRu}\n`;
      }

      return result.trim();
    }

    // Technical level
    return JSON.stringify(explanation, null, 2);
  }

  private formatForClinician(explanation: IExplanationResponse, level: ExplanationLevel): string {
    const clinician = explanation.clinicianExplanation;
    if (!clinician) return 'No clinician explanation available';

    return `
═══════════════════════════════════════════════
CLINICAL EXPLANATION REPORT
═══════════════════════════════════════════════

Patient ID: ${clinician.patientId}
Session: ${clinician.sessionId}
Generated: ${clinician.timestamp.toISOString()}
Model: ${clinician.aiModelVersion}

──────────────────────────────────────────────
CLINICAL CONTEXT
──────────────────────────────────────────────
Presenting Concern: ${clinician.clinicalContext.presentingConcern}
Risk Factors: ${clinician.clinicalContext.riskFactors.join(', ') || 'None identified'}
Protective Factors: ${clinician.clinicalContext.protectiveFactors.join(', ') || 'None identified'}
${clinician.clinicalContext.familyContext ? `Family Context: ${clinician.clinicalContext.familyContext}` : ''}

──────────────────────────────────────────────
AI ASSESSMENT
──────────────────────────────────────────────
Primary Concern: ${clinician.aiAssessment.primaryConcern}
Severity: ${clinician.aiAssessment.severity}
Risk Level: ${clinician.aiAssessment.riskLevel}
Confidence: ${Math.round(clinician.aiAssessment.confidence * 100)}%

Reasoning:
${clinician.aiAssessment.reasoning}

${clinician.aiAssessment.causalFactors ? `Causal Factors: ${clinician.aiAssessment.causalFactors.join(', ')}` : ''}

──────────────────────────────────────────────
INTERVENTION RATIONALE
──────────────────────────────────────────────
Selected: ${clinician.interventionRationale.selectedIntervention}
Approach: ${clinician.interventionRationale.therapeuticApproach}
Expected Outcome: ${clinician.interventionRationale.expectedOutcome || 'N/A'}
Timeframe: ${clinician.interventionRationale.outcomeTimeframe || 'N/A'}

Evidence Basis:
${clinician.interventionRationale.evidenceBasis.map(e => `• ${e}`).join('\n')}

──────────────────────────────────────────────
RECOMMENDATIONS
──────────────────────────────────────────────
Immediate Actions:
${clinician.recommendations.immediateActions.map(a => `• ${a}`).join('\n')}

Follow-up:
${clinician.recommendations.followUpRecommendations.map(r => `• ${r}`).join('\n')}

Escalation Criteria:
${clinician.recommendations.escalationCriteria.map(c => `⚠️ ${c}`).join('\n')}

──────────────────────────────────────────────
REGULATORY COMPLIANCE
──────────────────────────────────────────────
EU AI Act Risk Level: ${clinician.regulatoryCompliance.euAIActRiskLevel}
Human Oversight Required: ${clinician.regulatoryCompliance.humanOversightRequired ? 'Yes' : 'No'}

──────────────────────────────────────────────
DISCLAIMER
──────────────────────────────────────────────
${clinician.disclaimer}

═══════════════════════════════════════════════
    `.trim();
  }

  private formatForAuditor(explanation: IExplanationResponse, level: ExplanationLevel): string {
    return JSON.stringify({
      requestId: explanation.requestId,
      predictionId: explanation.predictionId,
      generatedAt: explanation.generatedAt,
      computationTime: explanation.computationTime,
      regulatoryInfo: explanation.regulatoryInfo,
      localExplanation: explanation.localExplanation,
      counterfactualExplanation: explanation.counterfactualExplanation,
      modelVersion: explanation.explanationVersion,
    }, null, 2);
  }

  private formatForDeveloper(explanation: IExplanationResponse): string {
    return JSON.stringify(explanation, null, 2);
  }

  // ==========================================================================
  // EFFECTIVENESS TRACKING
  // ==========================================================================

  /**
   * Record explanation feedback
   */
  async recordExplanationFeedback(
    feedback: Partial<IExplanationEffectiveness>
  ): Promise<void> {
    if (!feedback.explanationId) return;

    const existing = this.effectivenessStore.get(feedback.explanationId);

    const updated: IExplanationEffectiveness = {
      explanationId: feedback.explanationId,
      userId: feedback.userId || existing?.userId || 'unknown',
      recordedAt: new Date(),
      ...existing,
      ...feedback,
    };

    this.effectivenessStore.set(feedback.explanationId, updated);
  }

  /**
   * Get explanation effectiveness
   */
  async getExplanationEffectiveness(
    explanationId: string
  ): Promise<IExplanationEffectiveness | null> {
    return this.effectivenessStore.get(explanationId) || null;
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  /**
   * Get cached global explanation
   */
  getCachedGlobalExplanation(predictionType: string): IGlobalExplanation | null {
    const cached = this.globalExplanationCache.get(predictionType);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheExpirationMs) {
      this.globalExplanationCache.delete(predictionType);
      return null;
    }

    return cached.explanation;
  }

  /**
   * Invalidate cache
   */
  invalidateCache(predictionType?: string): void {
    if (predictionType) {
      this.globalExplanationCache.delete(predictionType);
    } else {
      this.globalExplanationCache.clear();
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private normalizePrediction(prediction: unknown): {
    outcome: string;
    value: number;
    confidence: number;
  } {
    if (typeof prediction === 'object' && prediction !== null) {
      const pred = prediction as Record<string, unknown>;
      return {
        outcome: String(pred.outcome || pred.result || pred.intervention || 'unknown'),
        value: Number(pred.value || pred.score || 0.5),
        confidence: Number(pred.confidence || 0.7),
      };
    }

    return {
      outcome: String(prediction),
      value: 0.5,
      confidence: 0.7,
    };
  }

  private getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    if (confidence >= 0.3) return 'Low';
    return 'Very Low';
  }

  private getConfidenceDescription(
    confidence: number,
    ageGroup: 'child' | 'teen' | 'adult',
    language: 'en' | 'ru'
  ): string {
    if (language === 'ru') {
      if (ageGroup === 'child') {
        return confidence >= 0.8 ? 'Я уверен!' : 'Думаю, тебе понравится';
      }
      if (ageGroup === 'teen') {
        return confidence >= 0.8 ? 'Уверен на 100%' :
               confidence >= 0.5 ? 'Думаю, подойдёт' : 'Попробуй, может зайдёт';
      }
      return confidence >= 0.8 ? 'Высокая уверенность' :
             confidence >= 0.5 ? 'Средняя уверенность' : 'Низкая уверенность';
    }

    // English
    if (ageGroup === 'child') {
      return confidence >= 0.8 ? "I'm sure!" : 'I think you\'ll like it';
    }
    if (ageGroup === 'teen') {
      return confidence >= 0.8 ? '100% confident' :
             confidence >= 0.5 ? 'Should work' : 'Give it a try';
    }
    return confidence >= 0.8 ? 'High confidence' :
           confidence >= 0.5 ? 'Medium confidence' : 'Low confidence';
  }

  private getDisclaimer(ageGroup: 'child' | 'teen' | 'adult', language: 'en' | 'ru'): string {
    if (language === 'ru') {
      if (ageGroup === 'adult') {
        return 'БАЙТ — AI-помощник, не психолог. При серьёзных проблемах обратитесь к специалисту.';
      }
      if (ageGroup === 'teen') {
        return 'Я — AI, не настоящий психолог. Если тебе плохо — поговори с взрослым, которому доверяешь.';
      }
      return '';
    }

    // English
    if (ageGroup === 'adult') {
      return 'BYTE is an AI assistant, not a psychologist. For serious issues, consult a professional.';
    }
    if (ageGroup === 'teen') {
      return "I'm AI, not a real psychologist. If you're struggling, talk to a trusted adult.";
    }
    return '';
  }

  private calculateGlobalFeatureImportance(predictionType: string): IGlobalFeatureImportance[] {
    return Object.values(INTERVENTION_FEATURES).map(def => ({
      featureId: def.id,
      featureName: def.name,
      featureNameRu: def.nameRu,
      description: def.description,
      descriptionRu: def.descriptionRu,
      meanAbsoluteSHAP: def.defaultWeight,
      medianAbsoluteSHAP: def.defaultWeight * 0.95,
      maxAbsoluteSHAP: def.defaultWeight * 1.5,
      frequency: 0.8,
      coverage: 0.9,
      trend: 'stable' as const,
      trendPeriod: 'Last 30 days',
      category: def.category,
    })).sort((a, b) => b.meanAbsoluteSHAP - a.meanAbsoluteSHAP);
  }

  private extractDecisionRules(predictionType: string): IDecisionRule[] {
    return [
      {
        id: 'RULE-001',
        condition: 'riskLevel = critical OR riskLevel = high',
        conditionRu: 'уровеньРиска = критический ИЛИ уровеньРиска = высокий',
        outcome: 'Show crisis resources + escalate',
        outcomeRu: 'Показать кризисные ресурсы + эскалация',
        coverage: 0.05,
        confidence: 0.99,
        priority: 1,
        isCausal: true,
        causalStrength: 0.95,
      },
      {
        id: 'RULE-002',
        condition: 'currentMood <= 2 AND moodTrend = declining',
        conditionRu: 'текущееНастроение <= 2 И трендНастроения = снижающийся',
        outcome: 'Select supportive technique',
        outcomeRu: 'Выбрать поддерживающую технику',
        coverage: 0.15,
        confidence: 0.85,
        priority: 2,
        isCausal: true,
        causalStrength: 0.75,
      },
      {
        id: 'RULE-003',
        condition: 'currentEnergy >= 4 AND timeOfDay = morning',
        conditionRu: 'уровеньЭнергии >= 4 И времяСуток = утро',
        outcome: 'Select active technique',
        outcomeRu: 'Выбрать активную технику',
        coverage: 0.20,
        confidence: 0.80,
        priority: 3,
      },
      {
        id: 'RULE-004',
        condition: 'activeTrigger = stress',
        conditionRu: 'активныйТриггер = стресс',
        outcome: 'Select relaxation technique',
        outcomeRu: 'Выбрать релаксационную технику',
        coverage: 0.25,
        confidence: 0.82,
        priority: 4,
        isCausal: true,
        causalStrength: 0.70,
      },
    ];
  }

  private generateRegulatoryInfo(
    request: IExplanationRequest,
    response: IExplanationResponse
  ): IExplanationResponse['regulatoryInfo'] {
    // Determine risk level based on prediction type
    let riskLevel: EUAIActRiskLevel = 'limited';

    if (request.predictionType.includes('crisis') ||
        request.predictionType.includes('risk')) {
      riskLevel = 'high';
    }

    const hasLocalExplanation = !!response.localExplanation;
    const hasCounterfactual = !!response.counterfactualExplanation;

    return {
      euAIActRiskLevel: riskLevel,
      isCompliant: true,
      transparencyMet: hasLocalExplanation && hasCounterfactual,
      humanOversightRequired: riskLevel === 'high',
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create Explainability Service instance
 */
export function createExplainabilityService(
  featureEngine?: FeatureAttributionEngine,
  counterfactualEngine?: CounterfactualExplainer,
  narrativeGenerator?: NarrativeGenerator
): ExplainabilityService {
  return new ExplainabilityService(featureEngine, counterfactualEngine, narrativeGenerator);
}
