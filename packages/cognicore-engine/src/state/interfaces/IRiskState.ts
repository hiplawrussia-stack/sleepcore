/**
 * 🚨 RISK STATE INTERFACE
 * =======================
 * Comprehensive risk assessment compatible with CrisisPipeline
 * Multi-layer risk tracking with early warning system
 *
 * Scientific Foundation:
 * - Columbia Suicide Severity Rating Scale (C-SSRS)
 * - Risk-Need-Responsivity Model (Andrews & Bonta)
 * - Safety Planning Intervention (Stanley & Brown)
 * - Dynamic Risk Assessment (Douglas & Skeem)
 *
 * Integration:
 * - Compatible with existing CrisisPipeline
 * - Aligned with CrisisRiskLevel from src project
 * - Supports fail-safe design principles
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

/**
 * Risk level (aligned with CrisisPipeline)
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk trajectory (direction of change)
 */
export type RiskTrajectory = 'improving' | 'stable' | 'declining' | 'volatile';

/**
 * Risk category types
 */
export type RiskCategory =
  | 'self_harm'           // Self-injury risk
  | 'suicidal_ideation'   // Suicidal thoughts
  | 'substance_use'       // Substance abuse risk
  | 'behavioral'          // Dangerous behaviors
  | 'relational'          // Relationship crisis
  | 'emotional_crisis'    // Acute emotional distress
  | 'digital_addiction'   // Digital/internet addiction
  | 'social_isolation'    // Severe isolation
  | 'academic_crisis'     // School/work crisis
  | 'family_crisis';      // Family conflict

/**
 * Risk factor (contributing to risk)
 */
export interface RiskFactor {
  readonly id: string;
  readonly category: RiskCategory;
  readonly description: string;
  readonly severity: number;        // 0.0 - 1.0
  readonly temporality: 'static' | 'stable_dynamic' | 'acute_dynamic';
  readonly modifiable: boolean;     // Can be changed through intervention
  readonly detectedAt: Date;
  readonly lastUpdated: Date;
  readonly evidence: string[];      // What indicates this risk
}

/**
 * Protective factor (reducing risk)
 */
export interface ProtectiveFactor {
  readonly id: string;
  readonly type: 'internal' | 'external';
  readonly description: string;
  readonly strength: number;        // 0.0 - 1.0
  readonly reliability: number;     // How consistently available
  readonly category: 'social_support' | 'coping_skills' | 'hope' | 'reasons_for_living' | 'professional_support' | 'values' | 'self_efficacy';
  readonly detectedAt: Date;
  readonly evidence: string[];
}

/**
 * Early warning sign
 */
export interface EarlyWarning {
  readonly id: string;
  readonly type: 'behavioral' | 'emotional' | 'cognitive' | 'social' | 'physical';
  readonly description: string;
  readonly severity: number;        // 0.0 - 1.0
  readonly detectedAt: Date;
  readonly trend: 'new' | 'increasing' | 'stable' | 'decreasing';
  readonly requiresAction: boolean;
  readonly suggestedAction?: string;
}

/**
 * Safety plan component
 */
export interface SafetyPlanComponent {
  readonly type: 'warning_signs' | 'coping_strategies' | 'distraction_activities' | 'support_contacts' | 'professional_contacts' | 'environment_safety';
  readonly items: string[];
  readonly lastUpdated: Date;
  readonly userDefined: boolean;
}

/**
 * Safety plan status
 */
export interface SafetyPlan {
  readonly exists: boolean;
  readonly lastUpdated?: Date;
  readonly completeness: number;    // 0.0 - 1.0
  readonly components: SafetyPlanComponent[];
  readonly primaryContact?: {
    readonly name: string;
    readonly phone?: string;
    readonly relationship: string;
  };
  readonly professionalContact?: {
    readonly name: string;
    readonly phone?: string;
    readonly type: 'therapist' | 'psychiatrist' | 'counselor' | 'hotline';
  };
}

/**
 * Crisis event record
 */
export interface CrisisEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly severity: RiskLevel;
  readonly category: RiskCategory;
  readonly triggeredBy: string;
  readonly actionTaken: string;
  readonly outcome: 'resolved' | 'escalated' | 'referred' | 'ongoing';
  readonly responseTime: number;    // milliseconds
  readonly userFeedback?: string;
}

/**
 * Lethal means assessment
 */
export interface LethalMeansAssessment {
  readonly assessed: boolean;
  readonly lastAssessedAt?: Date;
  readonly accessToMeans: 'unknown' | 'none' | 'limited' | 'easy';
  readonly meansRestrictionDiscussed: boolean;
  readonly safetyStepsCompleted: string[];
}

/**
 * Support network assessment
 */
export interface SupportNetwork {
  readonly size: number;            // Number of support people
  readonly quality: number;         // 0.0 - 1.0
  readonly accessibility: number;   // 0.0 - 1.0 (how available)
  readonly diversity: number;       // 0.0 - 1.0 (variety of support types)
  readonly primarySupports: Array<{
    readonly relationship: string;
    readonly availability: 'always' | 'usually' | 'sometimes' | 'rarely';
    readonly quality: number;
  }>;
  readonly lastContacted?: Date;
}

/**
 * Intervention effectiveness
 */
export interface InterventionEffectiveness {
  readonly interventionId: string;
  readonly interventionType: string;
  readonly timesUsed: number;
  readonly averageEffectiveness: number;  // 0.0 - 1.0
  readonly bestForRiskCategories: RiskCategory[];
  readonly contraindicated: RiskCategory[];
}

/**
 * Risk prediction
 */
export interface RiskPrediction {
  readonly timeframe: '6h' | '24h' | '72h' | '1w';
  readonly predictedLevel: RiskLevel;
  readonly confidence: number;
  readonly keyFactors: string[];
  readonly preventiveActions: string[];
  readonly calculatedAt: Date;
}

/**
 * 🚨 Main Risk State Interface
 * Core component of State Vector S_t (r_t)
 */
export interface IRiskState {
  /**
   * Current overall risk level
   */
  readonly level: RiskLevel;

  /**
   * Confidence in risk assessment (0.0 - 1.0)
   */
  readonly confidence: number;

  /**
   * Risk trajectory over time
   */
  readonly trajectory: RiskTrajectory;

  /**
   * Active risk factors
   */
  readonly riskFactors: RiskFactor[];

  /**
   * Active protective factors
   */
  readonly protectiveFactors: ProtectiveFactor[];

  /**
   * Early warning signs detected
   */
  readonly earlyWarnings: EarlyWarning[];

  /**
   * Risk by category
   */
  readonly categoryRisks: Record<RiskCategory, {
    readonly level: RiskLevel;
    readonly confidence: number;
    readonly lastAssessed: Date;
  }>;

  /**
   * Safety plan status
   */
  readonly safetyPlan: SafetyPlan;

  /**
   * Support network assessment
   */
  readonly supportNetwork: SupportNetwork;

  /**
   * Lethal means assessment
   */
  readonly lethalMeans: LethalMeansAssessment;

  /**
   * Crisis history
   */
  readonly crisisHistory: CrisisEvent[];

  /**
   * Effective interventions for this user
   */
  readonly effectiveInterventions: InterventionEffectiveness[];

  /**
   * Risk predictions
   */
  readonly predictions: RiskPrediction[];

  /**
   * Time since last crisis event
   */
  readonly daysSinceLastCrisis: number | null;

  /**
   * Current stabilization phase
   */
  readonly stabilizationPhase: 'acute' | 'subacute' | 'stable' | 'recovery';

  /**
   * Timestamp of this assessment
   */
  readonly timestamp: Date;

  /**
   * Data quality (0.0 - 1.0)
   */
  readonly dataQuality: number;

  /**
   * Assessment method used
   */
  readonly assessmentMethod: 'automated' | 'combined' | 'self_report' | 'fallback';
}

/**
 * Risk State Builder
 */
export interface IRiskStateBuilder {
  setLevel(level: RiskLevel, confidence: number): this;
  setTrajectory(trajectory: RiskTrajectory): this;
  addRiskFactor(factor: RiskFactor): this;
  addProtectiveFactor(factor: ProtectiveFactor): this;
  addEarlyWarning(warning: EarlyWarning): this;
  setCategoryRisk(category: RiskCategory, level: RiskLevel, confidence: number): this;
  setSafetyPlan(plan: SafetyPlan): this;
  setSupportNetwork(network: SupportNetwork): this;
  addCrisisEvent(event: CrisisEvent): this;
  addPrediction(prediction: RiskPrediction): this;
  build(): IRiskState;
}

/**
 * Risk State Factory
 */
export interface IRiskStateFactory {
  /**
   * Create from CrisisPipeline assessment
   * (compatibility with existing system)
   */
  fromCrisisPipelineAssessment(assessment: {
    riskLevel: string;
    confidence: number;
    triggers: Array<{ category: string; matches: string[]; confidence: number; severity: number }>;
    recommendedAction: string;
    escalationRequired: boolean;
  }): IRiskState;

  /**
   * Create from text analysis
   */
  fromTextAnalysis(
    text: string,
    previousState?: IRiskState
  ): Promise<IRiskState>;

  /**
   * Create safe baseline state
   */
  createSafe(): IRiskState;

  /**
   * Apply new evidence to update risk
   */
  updateWithEvidence(
    currentState: IRiskState,
    evidence: {
      text: string;
      emotionalState?: { intensity: number; valence: number };
      behavioralIndicators?: string[];
    }
  ): IRiskState;

  /**
   * Create fail-safe state (when detection fails)
   */
  createFailSafe(): IRiskState;
}

/**
 * Risk Detector Interface
 */
export interface IRiskDetector {
  /**
   * Detect risk from text
   */
  detectRisk(text: string): Promise<{
    level: RiskLevel;
    confidence: number;
    factors: RiskFactor[];
    warnings: EarlyWarning[];
    requiresEscalation: boolean;
  }>;

  /**
   * Detect specific risk category
   */
  detectCategoryRisk(
    text: string,
    category: RiskCategory
  ): Promise<{
    level: RiskLevel;
    confidence: number;
    evidence: string[];
  }>;

  /**
   * Predict risk trajectory
   */
  predictTrajectory(
    history: IRiskState[],
    currentState: IRiskState
  ): RiskTrajectory;
}

/**
 * Risk keywords and patterns (Russian)
 * Aligned with existing CrisisPipeline
 */
export const RISK_PATTERNS: Record<RiskCategory, {
  keywords: string[];
  phrases: string[];
  severity: number;
  requiresImmediateAction: boolean;
}> = {
  suicidal_ideation: {
    keywords: ['суицид', 'покончить', 'убить себя', 'не хочу жить', 'нет смысла жить'],
    phrases: ['хочу умереть', 'лучше бы меня не было', 'всем будет лучше без меня', 'больше не могу так'],
    severity: 1.0,
    requiresImmediateAction: true
  },
  self_harm: {
    keywords: ['порезать', 'причинить боль', 'царапать', 'бить себя'],
    phrases: ['хочу сделать себе больно', 'заслуживаю боли', 'чувствую только когда'],
    severity: 0.9,
    requiresImmediateAction: true
  },
  emotional_crisis: {
    keywords: ['невыносимо', 'не могу больше', 'истерика', 'паника'],
    phrases: ['всё рушится', 'не справляюсь', 'на грани', 'сойду с ума'],
    severity: 0.7,
    requiresImmediateAction: false
  },
  substance_use: {
    keywords: ['напиться', 'наркотики', 'таблетки', 'забыться'],
    phrases: ['хочу напиться', 'нужно что-то принять', 'только так могу'],
    severity: 0.6,
    requiresImmediateAction: false
  },
  social_isolation: {
    keywords: ['одинок', 'никто не понимает', 'никому не нужен'],
    phrases: ['я совсем один', 'не с кем поговорить', 'никто не поймёт'],
    severity: 0.5,
    requiresImmediateAction: false
  },
  digital_addiction: {
    keywords: ['не могу оторваться', 'часами сижу', 'зависим'],
    phrases: ['играю всё время', 'не могу перестать', 'жизнь только в сети'],
    severity: 0.4,
    requiresImmediateAction: false
  },
  behavioral: {
    keywords: ['рискованно', 'опасно', 'безрассудно'],
    phrases: ['мне всё равно что будет', 'пусть случится что угодно'],
    severity: 0.6,
    requiresImmediateAction: false
  },
  relational: {
    keywords: ['бросил', 'предал', 'ненавижу'],
    phrases: ['никому не доверяю', 'все против меня', 'никто не любит'],
    severity: 0.5,
    requiresImmediateAction: false
  },
  academic_crisis: {
    keywords: ['провал', 'исключат', 'отчислят', 'завалил'],
    phrases: ['не справлюсь с учёбой', 'всё провалил', 'родители убьют'],
    severity: 0.5,
    requiresImmediateAction: false
  },
  family_crisis: {
    keywords: ['развод', 'выгоняют', 'бьют', 'насилие'],
    phrases: ['дома невозможно', 'хочу сбежать', 'некуда идти'],
    severity: 0.7,
    requiresImmediateAction: false
  }
};

/**
 * Crisis response protocols by risk level
 */
export const CRISIS_RESPONSE_PROTOCOLS: Record<RiskLevel, {
  immediateActions: string[];
  resourcesProvide: string[];
  escalationRequired: boolean;
  followUpTimeframe: string;
  documentationRequired: boolean;
}> = {
  none: {
    immediateActions: ['Continue normal interaction'],
    resourcesProvide: [],
    escalationRequired: false,
    followUpTimeframe: 'none',
    documentationRequired: false
  },
  low: {
    immediateActions: [
      'Validate feelings',
      'Offer support options',
      'Check coping resources'
    ],
    resourcesProvide: ['General support information'],
    escalationRequired: false,
    followUpTimeframe: '48h',
    documentationRequired: false
  },
  medium: {
    immediateActions: [
      'Express concern and care',
      'Assess safety directly',
      'Review coping strategies',
      'Discuss support network'
    ],
    resourcesProvide: ['Crisis hotline', 'Support chat'],
    escalationRequired: false,
    followUpTimeframe: '24h',
    documentationRequired: true
  },
  high: {
    immediateActions: [
      'Direct safety assessment',
      'Safety planning',
      'Means restriction discussion',
      'Connect with support person',
      'Provide crisis contacts'
    ],
    resourcesProvide: ['24/7 Hotline: 8-800-2000-122', 'Emergency contacts'],
    escalationRequired: true,
    followUpTimeframe: '12h',
    documentationRequired: true
  },
  critical: {
    immediateActions: [
      'IMMEDIATE crisis response',
      'Keep user engaged',
      'Connect to emergency services',
      'Do not end conversation',
      'Continuous safety monitoring'
    ],
    resourcesProvide: [
      'Emergency: 112',
      'Crisis hotline: 8-800-2000-122',
      'МЧС психологи: 8-499-216-50-50'
    ],
    escalationRequired: true,
    followUpTimeframe: 'continuous',
    documentationRequired: true
  }
};

/**
 * Risk score thresholds (aligned with CrisisPipeline)
 */
export const RISK_THRESHOLDS = {
  none: 0,
  low: 0.2,
  medium: 0.4,
  high: 0.7,
  critical: 0.85
} as const;
