/**
 * 🔄 MESSAGE PROCESSING PIPELINE - INTERFACES
 * ============================================
 * Phase 5.2: Message Processing Pipeline Architecture
 *
 * Research Foundation (2025):
 * - JITAI (Just-in-Time Adaptive Interventions) patterns
 * - NLP Pipeline Architecture (Intent → Entity → Sentiment → Response)
 * - Layered Safety Systems for Mental Health Chatbots
 * - Age-Adaptive Response Generation (CHI 2025)
 * - CBT-based Chatbot Clinical Efficacy (JMIR 2025)
 *
 * Architecture Patterns:
 * - Pipeline Pattern with composable stages
 * - Strategy Pattern for response generation
 * - Observer Pattern for event emission
 * - Factory Pattern for intervention creation
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Input message for processing
 */
export interface IIncomingMessage {
  /** Unique message ID */
  messageId: string;

  /** User ID */
  userId: string;

  /** Chat ID */
  chatId: string;

  /** Session ID */
  sessionId: string;

  /** Message text */
  text: string;

  /** Message timestamp */
  timestamp: Date;

  /** Platform */
  platform: 'telegram' | 'web' | 'api';

  /** Original message metadata */
  metadata?: {
    replyToMessageId?: string;
    hasMedia?: boolean;
    languageCode?: string;
    username?: string;
    firstName?: string;
  };
}

/**
 * Message analysis result from NLP stage
 */
export interface IMessageAnalysis {
  /** Detected primary intent */
  intent: MessageIntent;

  /** Intent confidence (0-1) */
  intentConfidence: number;

  /** Extracted entities */
  entities: IExtractedEntity[];

  /** Sentiment analysis */
  sentiment: ISentimentAnalysis;

  /** Detected language */
  language: 'ru' | 'en';

  /** Topic classification */
  topic?: MessageTopic;

  /** Raw analysis data */
  raw?: unknown;
}

/**
 * Message intents
 */
export type MessageIntent =
  | 'greeting'
  | 'help_request'
  | 'emotional_disclosure'
  | 'crisis'
  | 'question'
  | 'reflection'
  | 'exercise_response'
  | 'feedback'
  | 'small_talk'
  | 'command'
  | 'unknown';

/**
 * Message topics for mental health context
 */
export type MessageTopic =
  | 'digital_addiction'
  | 'anxiety'
  | 'depression'
  | 'stress'
  | 'relationships'
  | 'self_esteem'
  | 'sleep'
  | 'motivation'
  | 'general'
  | 'unknown';

/**
 * Extracted entity
 */
export interface IExtractedEntity {
  /** Entity type */
  type: 'emotion' | 'time' | 'duration' | 'activity' | 'person' | 'device' | 'app';

  /** Entity value */
  value: string;

  /** Confidence */
  confidence: number;

  /** Position in text */
  position: { start: number; end: number };
}

/**
 * Sentiment analysis result
 */
export interface ISentimentAnalysis {
  /** Overall sentiment */
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';

  /** Sentiment score (-1 to 1) */
  score: number;

  /** Emotional intensity (0-1) */
  intensity: number;

  /** Detected emotions */
  emotions: IDetectedEmotion[];
}

/**
 * Detected emotion
 */
export interface IDetectedEmotion {
  /** Emotion type */
  type: EmotionType;

  /** Confidence (0-1) */
  confidence: number;

  /** Valence (positive/negative) */
  valence: 'positive' | 'negative' | 'neutral';
}

/**
 * Emotion types
 */
export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'anxiety'
  | 'stress'
  | 'hope'
  | 'gratitude'
  | 'loneliness'
  | 'frustration'
  | 'shame'
  | 'guilt'
  | 'neutral';

// ============================================================================
// USER STATE
// ============================================================================

/**
 * User state for context-aware processing
 */
export interface IUserState {
  /** User ID */
  userId: string;

  /** Detected age group */
  ageGroup: AgeGroup;

  /** Current emotional state */
  emotionalState: IEmotionalState;

  /** Risk assessment */
  risk: IRiskAssessment;

  /** Engagement metrics */
  engagement: IEngagementMetrics;

  /** Session context */
  sessionContext: ISessionContext;

  /** Intervention history */
  interventionHistory: IInterventionRecord[];

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Age groups for adaptive responses
 */
export type AgeGroup = 'child' | 'teen' | 'adult';

/**
 * Emotional state tracking
 */
export interface IEmotionalState {
  /** Current primary emotion */
  primaryEmotion: EmotionType;

  /** Emotion intensity (0-1) */
  intensity: number;

  /** Trend (improving/stable/declining) */
  trend: 'improving' | 'stable' | 'declining';

  /** Recent emotion history (last 10) */
  recentEmotions: Array<{
    emotion: EmotionType;
    timestamp: Date;
    intensity: number;
  }>;
}

/**
 * Risk assessment
 */
export interface IRiskAssessment {
  /** Overall risk level */
  level: RiskLevel;

  /** Risk score (0-1) */
  score: number;

  /** Active risk indicators */
  indicators: RiskIndicator[];

  /** Crisis mode active */
  crisisMode: boolean;

  /** Last assessment time */
  lastAssessment: Date;
}

/**
 * Risk levels
 */
export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

/**
 * Risk indicators
 */
export type RiskIndicator =
  | 'self_harm_mention'
  | 'suicidal_ideation'
  | 'hopelessness'
  | 'social_isolation'
  | 'substance_mention'
  | 'declining_mood'
  | 'crisis_keywords'
  | 'rapid_mood_change';

/**
 * Engagement metrics
 */
export interface IEngagementMetrics {
  /** Total messages in session */
  messagesInSession: number;

  /** Session duration (minutes) */
  sessionDuration: number;

  /** Average response length */
  avgResponseLength: number;

  /** Intervention completion rate */
  interventionCompletionRate: number;

  /** Days since last interaction */
  daysSinceLastInteraction: number;
}

/**
 * Session context
 */
export interface ISessionContext {
  /** Current conversation topic */
  currentTopic?: MessageTopic;

  /** Active exercise */
  activeExercise?: {
    exerciseId: string;
    exerciseType: string;
    step: number;
    startedAt: Date;
  };

  /** Pending follow-up */
  pendingFollowUp?: {
    type: string;
    scheduledFor: Date;
    context: unknown;
  };

  /** Custom data */
  customData: Record<string, unknown>;
}

/**
 * Intervention record
 */
export interface IInterventionRecord {
  /** Intervention ID */
  interventionId: string;

  /** Intervention type */
  type: InterventionType;

  /** Delivered at */
  deliveredAt: Date;

  /** User response */
  userResponse?: 'engaged' | 'skipped' | 'completed' | 'no_response';

  /** Effectiveness rating (0-1) */
  effectiveness?: number;
}

// ============================================================================
// INTERVENTION TYPES
// ============================================================================

/**
 * Intervention types based on CBT/JITAI research
 */
export type InterventionType =
  // Cognitive Interventions
  | 'cognitive_restructuring'
  | 'thought_challenging'
  | 'reframing'
  | 'perspective_taking'
  // Behavioral Interventions
  | 'behavioral_activation'
  | 'activity_scheduling'
  | 'graded_task'
  // Mindfulness
  | 'mindfulness_breathing'
  | 'grounding_exercise'
  | 'body_scan'
  // Emotional Regulation
  | 'emotion_labeling'
  | 'self_compassion'
  | 'validation'
  // Digital Wellness
  | 'digital_detox_prompt'
  | 'screen_time_awareness'
  | 'healthy_alternative'
  // Crisis
  | 'crisis_support'
  | 'safety_plan'
  | 'hotline_referral'
  // Engagement
  | 'check_in'
  | 'reflection_prompt'
  | 'encouragement';

/**
 * Intervention to deliver
 */
export interface IIntervention {
  /** Intervention ID */
  id: string;

  /** Type */
  type: InterventionType;

  /** Content */
  content: IInterventionContent;

  /** Priority (1-10) */
  priority: number;

  /** Target age groups */
  targetAgeGroups: AgeGroup[];

  /** Minimum risk level to trigger */
  minRiskLevel?: RiskLevel;

  /** Maximum risk level to trigger */
  maxRiskLevel?: RiskLevel;

  /** Timing constraints (JITAI) */
  timing: IInterventionTiming;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Intervention content
 */
export interface IInterventionContent {
  /** Primary text (template with placeholders) */
  text: string;

  /** Alternative texts for variety */
  alternatives?: string[];

  /** Buttons/actions */
  buttons?: IInterventionButton[];

  /** Follow-up prompts */
  followUpPrompts?: string[];

  /** Media attachments */
  media?: {
    type: 'image' | 'audio' | 'video' | 'gif';
    url: string;
    caption?: string;
  };
}

/**
 * Intervention button
 */
export interface IInterventionButton {
  /** Button label */
  label: string;

  /** Callback data */
  callbackData: string;

  /** Next action */
  nextAction?: 'start_exercise' | 'skip' | 'rate' | 'more_info';
}

/**
 * JITAI timing constraints
 */
export interface IInterventionTiming {
  /** Cooldown period (minutes) since last intervention of same type */
  cooldownMinutes: number;

  /** Maximum interventions per session */
  maxPerSession: number;

  /** Preferred time windows (hours of day) */
  preferredHours?: number[];

  /** Trigger conditions */
  triggerConditions?: ITriggerCondition[];
}

/**
 * JITAI trigger condition
 */
export interface ITriggerCondition {
  /** Condition type */
  type: 'emotion_detected' | 'risk_elevated' | 'topic_match' | 'time_based' | 'engagement_drop';

  /** Condition parameters */
  params: Record<string, unknown>;
}

// ============================================================================
// RESPONSE GENERATION
// ============================================================================

/**
 * Generated response
 */
export interface IGeneratedResponse {
  /** Response ID */
  responseId: string;

  /** Response type */
  type: ResponseType;

  /** Primary text */
  text: string;

  /** Parse mode */
  parseMode: 'HTML' | 'Markdown' | 'plain';

  /** Inline keyboard */
  inlineKeyboard?: IResponseButton[][];

  /** Reply keyboard */
  replyKeyboard?: IResponseButton[][];

  /** Typing delay (ms) for therapeutic effect */
  typingDelay: number;

  /** Split into multiple messages */
  splitMessages?: string[];

  /** Follow-up response scheduled */
  scheduledFollowUp?: {
    delay: number;
    response: Omit<IGeneratedResponse, 'scheduledFollowUp'>;
  };

  /** Metadata */
  metadata: {
    generatedAt: Date;
    ageGroupAdapted: AgeGroup;
    interventionIncluded?: string;
    rationale: string;
  };
}

/**
 * Response types
 */
export type ResponseType =
  | 'acknowledgment'
  | 'empathetic_response'
  | 'intervention'
  | 'question'
  | 'information'
  | 'encouragement'
  | 'crisis_response'
  | 'exercise'
  | 'check_in';

/**
 * Response button
 */
export interface IResponseButton {
  /** Button text */
  text: string;

  /** Callback data */
  callbackData?: string;

  /** URL (for link buttons) */
  url?: string;
}

// ============================================================================
// PIPELINE INTERFACES
// ============================================================================

/**
 * Pipeline stage result
 */
export interface IPipelineStageResult<T> {
  /** Stage name */
  stage: string;

  /** Success flag */
  success: boolean;

  /** Result data */
  data?: T;

  /** Error if failed */
  error?: Error;

  /** Processing time (ms) */
  processingTimeMs: number;

  /** Should continue pipeline */
  continueProcessing: boolean;

  /** Early response (skip remaining stages) */
  earlyResponse?: IGeneratedResponse;
}

/**
 * Full pipeline result
 */
export interface IPipelineResult {
  /** Pipeline run ID */
  pipelineId: string;

  /** Original message */
  originalMessage: IIncomingMessage;

  /** Message analysis */
  analysis: IMessageAnalysis;

  /** Updated user state */
  userState: IUserState;

  /** Generated response */
  response: IGeneratedResponse;

  /** Intervention delivered (if any) */
  interventionDelivered?: IIntervention;

  /** Events emitted */
  eventsEmitted: string[];

  /** Total processing time (ms) */
  totalProcessingTimeMs: number;

  /** Stage results */
  stageResults: IPipelineStageResult<unknown>[];
}

/**
 * Pipeline configuration
 */
export interface IPipelineConfig {
  /** Enable NLP analysis */
  enableNlpAnalysis: boolean;

  /** Enable risk detection */
  enableRiskDetection: boolean;

  /** Enable JITAI interventions */
  enableInterventions: boolean;

  /** Default language */
  defaultLanguage: 'ru' | 'en';

  /** Therapeutic response delay (ms) */
  therapeuticDelay: number;

  /** Max response length */
  maxResponseLength: number;

  /** Age group detection enabled */
  enableAgeDetection: boolean;

  /** Debug mode */
  debug: boolean;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: IPipelineConfig = {
  enableNlpAnalysis: true,
  enableRiskDetection: true,
  enableInterventions: true,
  defaultLanguage: 'ru',
  therapeuticDelay: 500,
  maxResponseLength: 4000,
  enableAgeDetection: true,
  debug: false,
};

// ============================================================================
// MAIN PIPELINE INTERFACE
// ============================================================================

/**
 * Message Processing Pipeline
 * Main interface for processing incoming messages
 */
export interface IMessageProcessingPipeline {
  /**
   * Process incoming message through full pipeline
   * @param message - Incoming message
   * @returns Pipeline result with response
   */
  process(message: IIncomingMessage): Promise<IPipelineResult>;

  /**
   * Analyze message without generating response
   * @param text - Text to analyze
   * @param language - Language hint
   * @returns Analysis result
   */
  analyzeOnly(text: string, language?: 'ru' | 'en'): Promise<IMessageAnalysis>;

  /**
   * Get user state
   * @param userId - User ID
   * @returns Current user state
   */
  getUserState(userId: string): Promise<IUserState | null>;

  /**
   * Update user state
   * @param userId - User ID
   * @param updates - State updates
   */
  updateUserState(userId: string, updates: Partial<IUserState>): Promise<void>;

  /**
   * Subscribe to pipeline events
   * @param event - Event name
   * @param handler - Event handler
   */
  on(event: PipelineEvent, handler: PipelineEventHandler): void;

  /**
   * Get pipeline statistics
   * @returns Pipeline stats
   */
  getStats(): IPipelineStats;
}

/**
 * Pipeline events
 */
export type PipelineEvent =
  | 'message:received'
  | 'message:analyzed'
  | 'state:updated'
  | 'risk:detected'
  | 'crisis:detected'
  | 'intervention:selected'
  | 'intervention:delivered'
  | 'response:generated'
  | 'pipeline:completed'
  | 'pipeline:error';

/**
 * Pipeline event handler
 */
export type PipelineEventHandler = (data: unknown) => void | Promise<void>;

/**
 * Pipeline statistics
 */
export interface IPipelineStats {
  /** Total messages processed */
  messagesProcessed: number;

  /** Average processing time (ms) */
  avgProcessingTimeMs: number;

  /** Crisis detections */
  crisisDetections: number;

  /** Interventions delivered */
  interventionsDelivered: number;

  /** Error count */
  errorCount: number;

  /** Uptime (seconds) */
  uptimeSeconds: number;
}
