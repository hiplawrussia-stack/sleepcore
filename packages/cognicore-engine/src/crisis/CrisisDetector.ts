/**
 * 🚨 MULTI-LAYER CRISIS DETECTION ENGINE
 * =======================================
 * Real-time Crisis Detection for Mental Health Safety
 *
 * Scientific Foundation (2025 Research):
 * - Multi-layer detection pattern (AI UX Design Guide, 2025)
 * - C-SSRS inspired severity levels (Columbia Protocol)
 * - Suicide Risk Lexicon methodology (ResearchGate, 2025)
 * - Russian language support (Springer, 2020)
 *
 * Architecture:
 * Layer 1: Raw text keyword scanning (IMMEDIATE, before any processing)
 * Layer 2: Pattern & context analysis (linguistic patterns)
 * Layer 3: State-based risk assessment (integration with StateVector)
 *
 * © БФ "Другой путь", 2025
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Crisis severity levels (C-SSRS inspired)
 */
export type CrisisSeverity =
  | 'none'           // No crisis indicators
  | 'low'            // Minor indicators, monitor
  | 'moderate'       // Clear indicators, attention needed
  | 'high'           // Serious indicators, intervention required
  | 'critical';      // Acute risk, immediate action required

/**
 * Crisis type classification
 */
export type CrisisType =
  | 'suicidal_ideation'    // Thoughts about suicide
  | 'suicidal_intent'      // Plans or intent to act
  | 'self_harm'            // Non-suicidal self-injury
  | 'acute_distress'       // Severe emotional crisis
  | 'psychotic_features'   // Reality disconnection
  | 'substance_crisis'     // Substance-related emergency
  | 'panic_attack'         // Acute anxiety crisis
  | 'unknown';             // Unclassified crisis

/**
 * Detection layer result
 */
export interface LayerResult {
  readonly triggered: boolean;
  readonly confidence: number;
  readonly indicators: string[];
  readonly matchedPatterns: string[];
}

/**
 * Complete crisis detection result
 */
export interface CrisisDetectionResult {
  readonly isCrisis: boolean;
  readonly severity: CrisisSeverity;
  readonly crisisType: CrisisType;
  readonly confidence: number;

  // Layer results
  readonly layer1RawText: LayerResult;
  readonly layer2Pattern: LayerResult;
  readonly layer3State: LayerResult;

  // Aggregated indicators
  readonly allIndicators: string[];
  readonly primaryIndicator: string | null;

  // Response guidance
  readonly recommendedAction: 'none' | 'monitor' | 'supportive_response' | 'crisis_protocol' | 'emergency_escalation';
  readonly urgency: 'routine' | 'soon' | 'urgent' | 'immediate';

  // Metadata
  readonly detectedAt: Date;
  readonly processingTimeMs: number;
}

/**
 * Crisis detector configuration
 */
export interface CrisisDetectorConfig {
  readonly enableLayer1: boolean;
  readonly enableLayer2: boolean;
  readonly enableLayer3: boolean;
  readonly sensitivityLevel: 'low' | 'medium' | 'high';
  readonly language: 'ru' | 'en' | 'auto';
}

/**
 * State risk data for Layer 3
 */
export interface StateRiskData {
  readonly overallRiskLevel: number;
  readonly suicidalIdeation: number;
  readonly selfHarmRisk: number;
  readonly emotionalValence: number;
  readonly recentTrend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// KEYWORD LEXICONS (Bilingual)
// ============================================================================

/**
 * Layer 1: Critical keywords that require IMMEDIATE attention
 * Based on Suicide Risk Lexicon and clinical guidelines
 */
const CRITICAL_KEYWORDS = {
  // Suicidal ideation - Russian
  ru_suicidal: [
    'суицид', 'самоубийств', 'покончить с собой', 'покончу с собой',
    'убить себя', 'убью себя', 'хочу умереть', 'хочу сдохнуть',
    'умереть', 'сдохнуть', // standalone for mixed language detection
    'не хочу жить', 'не хочу больше жить', 'устал жить', 'устала жить',
    'лучше бы я умер', 'лучше бы я умерла', 'лучше бы меня не было',
    'повеситься', 'повешусь', 'вскрыть вены', 'вскрою вены',
    'прыгну с', 'спрыгну с', 'наглотаюсь таблеток', 'таблетки выпью',
    'жизнь не имеет смысла', 'зачем жить', 'незачем жить',
    'всем будет лучше без меня', 'никому не нужен', 'никому не нужна',
    'конец всему', 'хочу исчезнуть', 'хочу пропасть',
  ],

  // Suicidal ideation - English
  en_suicidal: [
    'suicide', 'kill myself', 'end my life', 'end it all',
    'want to die', 'wanna die', 'wish i was dead', 'wish i were dead',
    'don\'t want to live', 'do not want to live', 'tired of living',
    'better off dead', 'better if i was gone', 'world without me',
    'hang myself', 'slit my wrists', 'overdose', 'jump off',
    'no reason to live', 'life is meaningless', 'pointless to live',
    'everyone would be better', 'nobody needs me', 'no one cares',
    'disappear forever', 'cease to exist',
  ],

  // Self-harm - Russian
  ru_selfharm: [
    'порезать себя', 'порежу себя', 'режу себя', 'режусь',
    'вред себе', 'навредить себе', 'причинить боль себе',
    'бью себя', 'ударю себя', 'царапаю себя',
    'селфхарм', 'самоповреждени',
  ],

  // Self-harm - English
  en_selfharm: [
    'cut myself', 'cutting myself', 'hurt myself', 'hurting myself',
    'harm myself', 'harming myself', 'self-harm', 'selfharm',
    'self harm', 'self-injury', 'self injury',
    'burn myself', 'punch myself', 'hit myself',
  ],

  // Hopelessness indicators - Russian
  ru_hopeless: [
    'безнадёжно', 'безнадежно', 'нет надежды', 'ничего не изменится',
    'никогда не станет лучше', 'всегда будет плохо', 'выхода нет',
    'нет выхода', 'тупик', 'в ловушке', 'застрял навсегда',
    'бессмысленно всё', 'ничего не поможет',
  ],

  // Hopelessness indicators - English
  en_hopeless: [
    'hopeless', 'no hope', 'nothing will change', 'nothing will ever change',
    'never get better', 'always be like this', 'no way out', 'trapped forever',
    'stuck forever', 'pointless', 'nothing helps', 'can\'t go on',
  ],
};

/**
 * Layer 2: Context patterns that increase concern
 * Linguistic patterns suggesting crisis
 */
const CONTEXT_PATTERNS = {
  // Planning language
  planning: [
    /план.*(?:убить|умереть|покончить|суицид)/i,
    /готов(?:а|лю)?.*(?:умереть|уйти|покончить)/i,
    /решил(?:а)?.*(?:убить|покончить|уйти)/i,
    /plan.*(?:kill|die|end|suicide)/i,
    /ready to.*(?:die|end|go)/i,
    /decided to.*(?:kill|end|die)/i,
    /going to.*(?:kill myself|end it)/i,
  ],

  // Farewell language
  farewell: [
    /прощ(?:ай|айте).*(?:всем?|навсегда)/i,
    /последн(?:ий|яя|ее).*(?:раз|сообщение|письмо)/i,
    /goodbye.*(?:forever|everyone|all)/i,
    /this is.*(?:goodbye|the end|my last)/i,
    /final.*(?:message|goodbye|words)/i,
  ],

  // Giving away possessions
  giving_away: [
    /отда(?:м|ю).*(?:вещи|всё|деньги)/i,
    /раздам.*(?:вещи|всё)/i,
    /giving away.*(?:stuff|things|everything)/i,
    /want you to have/i,
  ],

  // Time pressure
  urgency: [
    /сегодня.*(?:ночью?|вечером|конец)/i,
    /(?:это|вот).*конец/i,
    /tonight.*(?:end|over|die)/i,
    /this is.*(?:it|the end)/i,
    /won'?t.*(?:see|be here).*(?:tomorrow|morning)/i,
  ],

  // Absolute negative statements
  absolutes: [
    /никогда.*(?:не буд|не стан|не измен)/i,
    /всегда.*(?:плохо|одинок|страда)/i,
    /никто.*(?:не поможет|не понима|не люб)/i,
    /never.*(?:get better|change|be happy)/i,
    /always.*(?:alone|suffering|miserable)/i,
    /nobody.*(?:cares|understands|loves)/i,
    /everyone.*(?:hates|against|better without)/i,
  ],
};

/**
 * Protective factors that may reduce severity
 */
const PROTECTIVE_FACTORS = [
  // Russian - more specific patterns to avoid false positives
  /но\s+(?:хочу|буду|попробу|есть надежда)/i,
  /не\s+(?:хочу умирать|собираюсь|буду этого делать)/i,
  /помог(?:и|ите)/i,
  /нужна помощь/i,
  /хочу\s+жить/i,            // must be "хочу жить" directly, not separated
  /хочу\s+(?:измени|помощ)/i,

  // English - more specific patterns
  /but\s+(?:i\s+)?(?:want to|will|trying|there's hope)/i,
  /(?:i\s+)?don'?t\s+(?:want to die|going to|actually)/i,
  /help me/i,
  /need help/i,
  /want to\s+(?:live|change|get help)/i,
];

// ============================================================================
// CRISIS DETECTOR IMPLEMENTATION
// ============================================================================

/**
 * Default configuration
 */
export const DEFAULT_CRISIS_CONFIG: CrisisDetectorConfig = {
  enableLayer1: true,
  enableLayer2: true,
  enableLayer3: true,
  sensitivityLevel: 'high',
  language: 'auto',
};

/**
 * Multi-layer Crisis Detector
 */
export class CrisisDetector {
  private readonly config: CrisisDetectorConfig;

  constructor(config: Partial<CrisisDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CRISIS_CONFIG, ...config };
  }

  /**
   * Main detection method - analyzes text for crisis indicators
   * This should be called BEFORE any cognitive analysis
   */
  detect(
    rawText: string,
    stateRiskData?: StateRiskData
  ): CrisisDetectionResult {
    const startTime = Date.now();

    // Normalize text for analysis
    const normalizedText = this.normalizeText(rawText);
    const detectedLanguage = this.detectLanguage(normalizedText);

    // Run all enabled layers
    const layer1 = this.config.enableLayer1
      ? this.runLayer1RawTextScan(normalizedText, detectedLanguage)
      : this.emptyLayerResult();

    const layer2 = this.config.enableLayer2
      ? this.runLayer2PatternAnalysis(normalizedText)
      : this.emptyLayerResult();

    const layer3 = this.config.enableLayer3 && stateRiskData
      ? this.runLayer3StateAnalysis(stateRiskData)
      : this.emptyLayerResult();

    // Check for protective factors
    const hasProtectiveFactors = this.checkProtectiveFactors(normalizedText);

    // Aggregate results
    const result = this.aggregateResults(layer1, layer2, layer3, hasProtectiveFactors);

    return {
      ...result,
      layer1RawText: layer1,
      layer2Pattern: layer2,
      layer3State: layer3,
      detectedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Quick check - returns true if ANY crisis indicator found
   * Use for immediate bypass decisions
   */
  quickCheck(rawText: string): boolean {
    const normalizedText = this.normalizeText(rawText);
    const language = this.detectLanguage(normalizedText);

    // Check critical keywords only (fastest path)
    const keywords = language === 'ru'
      ? [...CRITICAL_KEYWORDS.ru_suicidal, ...CRITICAL_KEYWORDS.ru_selfharm]
      : language === 'en'
      ? [...CRITICAL_KEYWORDS.en_suicidal, ...CRITICAL_KEYWORDS.en_selfharm]
      : [...CRITICAL_KEYWORDS.ru_suicidal, ...CRITICAL_KEYWORDS.ru_selfharm,
         ...CRITICAL_KEYWORDS.en_suicidal, ...CRITICAL_KEYWORDS.en_selfharm];

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  // ==========================================================================
  // LAYER 1: Raw Text Keyword Scanning
  // ==========================================================================

  private runLayer1RawTextScan(text: string, language: 'ru' | 'en' | 'both'): LayerResult {
    const indicators: string[] = [];
    const matchedPatterns: string[] = [];

    // Select keyword sets based on language
    const keywordSets = this.getKeywordSets(language);

    // Check each category
    for (const [category, keywords] of Object.entries(keywordSets)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          indicators.push(`keyword_${category}`);
          matchedPatterns.push(keyword);
        }
      }
    }

    // Calculate confidence based on number and type of matches
    const confidence = this.calculateLayer1Confidence(indicators);

    return {
      triggered: indicators.length > 0,
      confidence,
      indicators: [...new Set(indicators)],
      matchedPatterns: [...new Set(matchedPatterns)],
    };
  }

  private getKeywordSets(language: 'ru' | 'en' | 'both'): Record<string, string[]> {
    if (language === 'ru') {
      return {
        suicidal: CRITICAL_KEYWORDS.ru_suicidal,
        selfharm: CRITICAL_KEYWORDS.ru_selfharm,
        hopeless: CRITICAL_KEYWORDS.ru_hopeless,
      };
    } else if (language === 'en') {
      return {
        suicidal: CRITICAL_KEYWORDS.en_suicidal,
        selfharm: CRITICAL_KEYWORDS.en_selfharm,
        hopeless: CRITICAL_KEYWORDS.en_hopeless,
      };
    } else {
      return {
        suicidal: [...CRITICAL_KEYWORDS.ru_suicidal, ...CRITICAL_KEYWORDS.en_suicidal],
        selfharm: [...CRITICAL_KEYWORDS.ru_selfharm, ...CRITICAL_KEYWORDS.en_selfharm],
        hopeless: [...CRITICAL_KEYWORDS.ru_hopeless, ...CRITICAL_KEYWORDS.en_hopeless],
      };
    }
  }

  private calculateLayer1Confidence(indicators: string[]): number {
    if (indicators.length === 0) return 0;

    // Weight by indicator type
    let score = 0;
    for (const indicator of indicators) {
      if (indicator.includes('suicidal')) score += 0.4;
      else if (indicator.includes('selfharm')) score += 0.3;
      else if (indicator.includes('hopeless')) score += 0.2;
      else score += 0.1;
    }

    return Math.min(1, score);
  }

  // ==========================================================================
  // LAYER 2: Pattern & Context Analysis
  // ==========================================================================

  private runLayer2PatternAnalysis(text: string): LayerResult {
    const indicators: string[] = [];
    const matchedPatterns: string[] = [];

    // Check each pattern category
    for (const [category, patterns] of Object.entries(CONTEXT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          indicators.push(`pattern_${category}`);
          const match = text.match(pattern);
          if (match) {
            matchedPatterns.push(match[0]);
          }
        }
      }
    }

    // Calculate confidence
    const confidence = this.calculateLayer2Confidence(indicators);

    return {
      triggered: indicators.length > 0,
      confidence,
      indicators: [...new Set(indicators)],
      matchedPatterns,
    };
  }

  private calculateLayer2Confidence(indicators: string[]): number {
    if (indicators.length === 0) return 0;

    // Weight by pattern type
    let score = 0;
    for (const indicator of indicators) {
      if (indicator.includes('planning')) score += 0.5;
      else if (indicator.includes('farewell')) score += 0.4;
      else if (indicator.includes('giving_away')) score += 0.3;
      else if (indicator.includes('urgency')) score += 0.4;
      else if (indicator.includes('absolutes')) score += 0.2;
      else score += 0.1;
    }

    return Math.min(1, score);
  }

  // ==========================================================================
  // LAYER 3: State-Based Risk Analysis
  // ==========================================================================

  private runLayer3StateAnalysis(stateRisk: StateRiskData): LayerResult {
    const indicators: string[] = [];
    const matchedPatterns: string[] = [];

    // Check risk thresholds
    if (stateRisk.overallRiskLevel >= 0.7) {
      indicators.push('state_high_overall_risk');
      matchedPatterns.push(`risk_level=${stateRisk.overallRiskLevel.toFixed(2)}`);
    }

    if (stateRisk.suicidalIdeation > 0.5) {
      indicators.push('state_suicidal_ideation');
      matchedPatterns.push(`suicidal_ideation=${stateRisk.suicidalIdeation.toFixed(2)}`);
    }

    if (stateRisk.selfHarmRisk > 0.5) {
      indicators.push('state_self_harm_risk');
      matchedPatterns.push(`self_harm_risk=${stateRisk.selfHarmRisk.toFixed(2)}`);
    }

    if (stateRisk.emotionalValence < -0.7) {
      indicators.push('state_severe_negative_affect');
      matchedPatterns.push(`valence=${stateRisk.emotionalValence.toFixed(2)}`);
    }

    if (stateRisk.recentTrend === 'declining') {
      indicators.push('state_declining_trend');
      matchedPatterns.push('trend=declining');
    }

    // Calculate confidence
    const confidence = this.calculateLayer3Confidence(stateRisk, indicators);

    return {
      triggered: indicators.length > 0,
      confidence,
      indicators,
      matchedPatterns,
    };
  }

  private calculateLayer3Confidence(stateRisk: StateRiskData, indicators: string[]): number {
    if (indicators.length === 0) return 0;

    // Weighted combination of risk factors
    const riskScore = (
      stateRisk.overallRiskLevel * 0.3 +
      stateRisk.suicidalIdeation * 0.4 +
      stateRisk.selfHarmRisk * 0.3
    );

    return Math.min(1, riskScore);
  }

  // ==========================================================================
  // PROTECTIVE FACTORS
  // ==========================================================================

  private checkProtectiveFactors(text: string): boolean {
    for (const pattern of PROTECTIVE_FACTORS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // RESULT AGGREGATION
  // ==========================================================================

  private aggregateResults(
    layer1: LayerResult,
    layer2: LayerResult,
    layer3: LayerResult,
    hasProtectiveFactors: boolean
  ): Omit<CrisisDetectionResult, 'layer1RawText' | 'layer2Pattern' | 'layer3State' | 'detectedAt' | 'processingTimeMs'> {

    // Collect all indicators
    const allIndicators = [
      ...layer1.indicators,
      ...layer2.indicators,
      ...layer3.indicators,
    ];

    // Check if any layer triggered
    const anyTriggered = layer1.triggered || layer2.triggered || layer3.triggered;

    // Calculate combined confidence
    const combinedConfidence = this.calculateCombinedConfidence(layer1, layer2, layer3, hasProtectiveFactors);

    // Determine severity
    const severity = this.determineSeverity(layer1, layer2, layer3, combinedConfidence, hasProtectiveFactors);

    // Determine crisis type
    const crisisType = this.determineCrisisType(allIndicators);

    // Determine recommended action
    const { recommendedAction, urgency } = this.determineResponse(severity, crisisType);

    // Find primary indicator
    const primaryIndicator = this.findPrimaryIndicator(layer1, layer2, layer3);

    return {
      isCrisis: anyTriggered && severity !== 'none' && severity !== 'low',
      severity,
      crisisType,
      confidence: combinedConfidence,
      allIndicators,
      primaryIndicator,
      recommendedAction,
      urgency,
    };
  }

  private calculateCombinedConfidence(
    layer1: LayerResult,
    layer2: LayerResult,
    layer3: LayerResult,
    hasProtectiveFactors: boolean
  ): number {
    // Weighted combination - Layer 1 (raw text) is most important
    const base = (
      layer1.confidence * 0.5 +
      layer2.confidence * 0.3 +
      layer3.confidence * 0.2
    );

    // Reduce confidence slightly if protective factors present
    const adjusted = hasProtectiveFactors ? base * 0.85 : base;

    return Math.min(1, adjusted);
  }

  private determineSeverity(
    layer1: LayerResult,
    layer2: LayerResult,
    layer3: LayerResult,
    confidence: number,
    hasProtectiveFactors: boolean
  ): CrisisSeverity {

    // CRITICAL: Planning + suicidal keywords
    if (layer1.indicators.includes('keyword_suicidal') &&
        layer2.indicators.includes('pattern_planning')) {
      return 'critical';
    }

    // CRITICAL: High confidence + multiple layers
    if (confidence > 0.8 && layer1.triggered && layer2.triggered) {
      return hasProtectiveFactors ? 'high' : 'critical';
    }

    // HIGH: ANY suicidal keyword is serious - don't require high confidence
    // Suicidal content should always be treated as high severity for safety
    if (layer1.indicators.includes('keyword_suicidal')) {
      return hasProtectiveFactors ? 'moderate' : 'high';
    }

    // HIGH: Farewell + urgency patterns
    if (layer2.indicators.includes('pattern_farewell') ||
        layer2.indicators.includes('pattern_urgency')) {
      return 'high';
    }

    // MODERATE: Self-harm indicators
    if (layer1.indicators.includes('keyword_selfharm')) {
      return hasProtectiveFactors ? 'low' : 'moderate';
    }

    // MODERATE: State-based high risk
    if (layer3.indicators.includes('state_suicidal_ideation') ||
        layer3.indicators.includes('state_high_overall_risk')) {
      return 'moderate';
    }

    // LOW: Hopelessness without other indicators
    if (layer1.indicators.includes('keyword_hopeless') &&
        !layer1.indicators.includes('keyword_suicidal')) {
      return 'low';
    }

    // LOW: Only absolutes pattern
    if (layer2.triggered && layer2.indicators.length === 1 &&
        layer2.indicators[0] === 'pattern_absolutes') {
      return 'low';
    }

    // NONE: No significant indicators
    if (!layer1.triggered && !layer2.triggered && !layer3.triggered) {
      return 'none';
    }

    // Default to low if any indicator but not clear severity
    return 'low';
  }

  private determineCrisisType(indicators: string[]): CrisisType {
    // Check for suicidal indicators first
    const hasSuicidalKeyword = indicators.some(i => i.includes('suicidal'));
    const hasPlanning = indicators.some(i => i.includes('planning'));

    if (hasSuicidalKeyword && hasPlanning) {
      return 'suicidal_intent';
    }

    if (hasSuicidalKeyword) {
      return 'suicidal_ideation';
    }

    // Check for self-harm
    if (indicators.some(i => i.includes('selfharm') || i.includes('self_harm'))) {
      return 'self_harm';
    }

    // Check for acute distress
    if (indicators.some(i => i.includes('hopeless') || i.includes('absolutes'))) {
      return 'acute_distress';
    }

    // Check for panic
    if (indicators.some(i => i.includes('urgency'))) {
      return 'panic_attack';
    }

    return 'unknown';
  }

  private determineResponse(
    severity: CrisisSeverity,
    _crisisType: CrisisType
  ): { recommendedAction: CrisisDetectionResult['recommendedAction']; urgency: CrisisDetectionResult['urgency'] } {

    switch (severity) {
      case 'critical':
        return { recommendedAction: 'emergency_escalation', urgency: 'immediate' };
      case 'high':
        return { recommendedAction: 'crisis_protocol', urgency: 'urgent' };
      case 'moderate':
        return { recommendedAction: 'supportive_response', urgency: 'soon' };
      case 'low':
        return { recommendedAction: 'monitor', urgency: 'routine' };
      case 'none':
      default:
        return { recommendedAction: 'none', urgency: 'routine' };
    }
  }

  private findPrimaryIndicator(
    layer1: LayerResult,
    layer2: LayerResult,
    layer3: LayerResult
  ): string | null {
    // Priority: suicidal > planning > selfharm > others
    const allIndicators = [...layer1.indicators, ...layer2.indicators, ...layer3.indicators];

    if (allIndicators.some(i => i.includes('suicidal'))) {
      return allIndicators.find(i => i.includes('suicidal')) || null;
    }
    if (allIndicators.some(i => i.includes('planning'))) {
      return allIndicators.find(i => i.includes('planning')) || null;
    }
    if (allIndicators.some(i => i.includes('selfharm') || i.includes('self_harm'))) {
      return allIndicators.find(i => i.includes('selfharm') || i.includes('self_harm')) || null;
    }

    return allIndicators[0] || null;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectLanguage(text: string): 'ru' | 'en' | 'both' {
    if (this.config.language !== 'auto') {
      return this.config.language === 'ru' ? 'ru' : 'en';
    }

    // Simple heuristic: check for Cyrillic characters
    const cyrillicPattern = /[а-яё]/i;
    const latinPattern = /[a-z]/i;

    const hasCyrillic = cyrillicPattern.test(text);
    const hasLatin = latinPattern.test(text);

    if (hasCyrillic && hasLatin) return 'both';
    if (hasCyrillic) return 'ru';
    return 'en';
  }

  private emptyLayerResult(): LayerResult {
    return {
      triggered: false,
      confidence: 0,
      indicators: [],
      matchedPatterns: [],
    };
  }

  /**
   * Get crisis resources for user
   */
  getCrisisResources(language: 'ru' | 'en' = 'ru'): string[] {
    if (language === 'ru') {
      return [
        'Телефон доверия: 8-800-2000-122 (бесплатно)',
        'Центр экстренной психологической помощи МЧС: 8-499-216-50-50',
        'Детский телефон доверия: 8-800-2000-122',
        'Помощь взрослым: 051 (с мобильного 8-495-051)',
      ];
    }

    return [
      'National Suicide Prevention Lifeline: 988',
      'Crisis Text Line: Text HOME to 741741',
      'International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/',
    ];
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create crisis detector with optional configuration
 */
export function createCrisisDetector(config?: Partial<CrisisDetectorConfig>): CrisisDetector {
  return new CrisisDetector(config);
}

/**
 * Create default crisis detector instance
 */
export const defaultCrisisDetector = createCrisisDetector();
