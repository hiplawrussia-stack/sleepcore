/**
 * 🌐 PLATFORM INTEGRATION MODULE - INTERFACES
 * ============================================
 * Multi-Channel Platform Adapter for SleepCore DTx
 *
 * Scientific Foundation (2024-2025 Research):
 * - Grammy Telegram Framework (TypeScript Global Summit 2024)
 * - Platform Adapter Pattern (SAP Bot Connector, MuseBot)
 * - 12-Factor App Configuration (dotenv, secrets management)
 * - Kubernetes Health Probes (Lightship, z-pages pattern)
 * - Event-Driven Microservices (API Gateway patterns)
 * - Multi-Channel Chatbot Architecture (ChatBotKit patterns)
 *
 * Adapted from byte-bot for SleepCore DTx - @sleepcore/app v1.0.0
 */

// ============================================================================
// PLATFORM ADAPTER INTERFACES
// ============================================================================

/**
 * Supported Platform Types
 */
export type PlatformType =
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'whatsapp'
  | 'web'
  | 'api'
  | 'test';

/**
 * Platform Capabilities
 */
export interface IPlatformCapabilities {
  /** Supports text messages */
  supportsText: boolean;

  /** Supports images */
  supportsImages: boolean;

  /** Supports documents/files */
  supportsDocuments: boolean;

  /** Supports voice messages */
  supportsVoice: boolean;

  /** Supports video */
  supportsVideo: boolean;

  /** Supports inline buttons */
  supportsInlineButtons: boolean;

  /** Supports reply keyboards */
  supportsReplyKeyboard: boolean;

  /** Supports message editing */
  supportsEditing: boolean;

  /** Supports message deletion */
  supportsDeletion: boolean;

  /** Supports typing indicator */
  supportsTypingIndicator: boolean;

  /** Supports reactions */
  supportsReactions: boolean;

  /** Supports threads/replies */
  supportsThreads: boolean;

  /** Supports rich text formatting (markdown/html) */
  supportsRichText: boolean;

  /** Maximum message length */
  maxMessageLength: number;

  /** Maximum buttons per message */
  maxButtonsPerMessage: number;

  /** Supports webhooks */
  supportsWebhooks: boolean;

  /** Supports long polling */
  supportsPolling: boolean;
}

/**
 * Platform-Agnostic Message
 */
export interface IUniversalMessage {
  /** Unique message ID */
  messageId: string;

  /** Platform-specific message ID */
  platformMessageId?: string;

  /** Platform type */
  platform: PlatformType;

  /** Chat/Channel ID */
  chatId: string;

  /** User ID */
  userId: string;

  /** Message text */
  text?: string;

  /** Message type */
  type: MessageType;

  /** Attachments */
  attachments?: IMessageAttachment[];

  /** Reply keyboard buttons */
  replyKeyboard?: IKeyboardButton[][];

  /** Inline keyboard buttons */
  inlineKeyboard?: IInlineButton[][];

  /** Timestamp */
  timestamp: Date;

  /** Reply to message ID */
  replyToMessageId?: string;

  /** Thread ID (for threaded conversations) */
  threadId?: string;

  /** Language code */
  languageCode?: string;

  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'voice'
  | 'video'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'animation'
  | 'callback_query'
  | 'command'
  | 'unknown';

export interface IMessageAttachment {
  /** Attachment type */
  type: 'image' | 'document' | 'voice' | 'video' | 'audio' | 'sticker' | 'animation';

  /** File ID (platform-specific) */
  fileId?: string;

  /** File URL */
  url?: string;

  /** File name */
  fileName?: string;

  /** MIME type */
  mimeType?: string;

  /** File size in bytes */
  fileSize?: number;

  /** Caption/description */
  caption?: string;

  /** Thumbnail URL */
  thumbnailUrl?: string;

  /** Duration (for audio/video) */
  durationSeconds?: number;
}

export interface IKeyboardButton {
  /** Button text */
  text: string;

  /** Request contact */
  requestContact?: boolean;

  /** Request location */
  requestLocation?: boolean;
}

export interface IInlineButton {
  /** Button text */
  text: string;

  /** Callback data */
  callbackData?: string;

  /** URL to open */
  url?: string;

  /** Switch inline query */
  switchInlineQuery?: string;
}

/**
 * Platform-Agnostic User
 */
export interface IUniversalUser {
  /** Platform user ID */
  platformUserId: string;

  /** Platform type */
  platform: PlatformType;

  /** Username */
  username?: string;

  /** First name */
  firstName?: string;

  /** Last name */
  lastName?: string;

  /** Full name */
  fullName?: string;

  /** Language code */
  languageCode?: string;

  /** Is bot */
  isBot: boolean;

  /** Is premium (if applicable) */
  isPremium?: boolean;

  /** Profile photo URL */
  profilePhotoUrl?: string;

  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Platform-Agnostic Chat
 */
export interface IUniversalChat {
  /** Platform chat ID */
  platformChatId: string;

  /** Platform type */
  platform: PlatformType;

  /** Chat type */
  type: ChatType;

  /** Chat title (for groups) */
  title?: string;

  /** Chat username */
  username?: string;

  /** Is forum */
  isForum?: boolean;

  /** Members count */
  membersCount?: number;

  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

export type ChatType = 'private' | 'group' | 'supergroup' | 'channel';

/**
 * Callback Query
 */
export interface ICallbackQuery {
  /** Query ID */
  queryId: string;

  /** User who triggered */
  user: IUniversalUser;

  /** Chat where button was pressed */
  chat: IUniversalChat;

  /** Original message */
  message?: IUniversalMessage;

  /** Callback data */
  data: string;

  /** Platform type */
  platform: PlatformType;
}

/**
 * Send Message Options
 */
export interface ISendMessageOptions {
  /** Parse mode (markdown, html) */
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';

  /** Disable web page preview */
  disableWebPagePreview?: boolean;

  /** Disable notification */
  disableNotification?: boolean;

  /** Reply to message ID */
  replyToMessageId?: string;

  /** Reply keyboard */
  replyKeyboard?: IKeyboardButton[][];

  /** Inline keyboard */
  inlineKeyboard?: IInlineButton[][];

  /** Remove keyboard */
  removeKeyboard?: boolean;

  /** Protect content (disable forwarding) */
  protectContent?: boolean;
}

/**
 * Edit Message Options
 */
export interface IEditMessageOptions {
  /** Parse mode */
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';

  /** Disable web page preview */
  disableWebPagePreview?: boolean;

  /** New inline keyboard */
  inlineKeyboard?: IInlineButton[][];
}

// ============================================================================
// PLATFORM ADAPTER INTERFACE
// ============================================================================

/**
 * Platform Adapter Interface
 * Abstraction layer for different messaging platforms
 */
export interface IPlatformAdapter {
  /** Platform type */
  readonly platform: PlatformType;

  /** Platform name */
  readonly name: string;

  /** Platform capabilities */
  readonly capabilities: IPlatformCapabilities;

  // Lifecycle

  /** Initialize adapter */
  initialize(): Promise<void>;

  /** Start receiving updates */
  start(): Promise<void>;

  /** Stop receiving updates */
  stop(): Promise<void>;

  /** Check if running */
  isRunning(): boolean;

  // Messaging

  /** Send text message */
  sendMessage(chatId: string, text: string, options?: ISendMessageOptions): Promise<IUniversalMessage>;

  /** Send photo */
  sendPhoto(chatId: string, photo: string | Buffer, options?: ISendMessageOptions & { caption?: string }): Promise<IUniversalMessage>;

  /** Send document */
  sendDocument(chatId: string, document: string | Buffer, options?: ISendMessageOptions & { caption?: string; fileName?: string }): Promise<IUniversalMessage>;

  /** Edit message text */
  editMessage(chatId: string, messageId: string, text: string, options?: IEditMessageOptions): Promise<IUniversalMessage>;

  /** Delete message */
  deleteMessage(chatId: string, messageId: string): Promise<boolean>;

  /** Answer callback query */
  answerCallbackQuery(queryId: string, options?: { text?: string; showAlert?: boolean }): Promise<boolean>;

  /** Send typing indicator */
  sendTypingIndicator(chatId: string): Promise<void>;

  // User/Chat Info

  /** Get user info */
  getUser(userId: string): Promise<IUniversalUser | null>;

  /** Get chat info */
  getChat(chatId: string): Promise<IUniversalChat | null>;

  // Event Handlers

  /** Set message handler */
  onMessage(handler: MessageHandler): void;

  /** Set callback query handler */
  onCallbackQuery(handler: CallbackQueryHandler): void;

  /** Set error handler */
  onError(handler: ErrorHandler): void;

  // Webhook Support

  /** Get webhook info */
  getWebhookInfo?(): Promise<IWebhookInfo>;

  /** Set webhook */
  setWebhook?(url: string, options?: IWebhookOptions): Promise<boolean>;

  /** Delete webhook */
  deleteWebhook?(): Promise<boolean>;

  /** Handle webhook request */
  handleWebhook?(body: unknown): Promise<void>;
}

export type MessageHandler = (message: IUniversalMessage, user: IUniversalUser, chat: IUniversalChat) => Promise<void>;
export type CallbackQueryHandler = (query: ICallbackQuery) => Promise<void>;
export type ErrorHandler = (error: Error, context?: unknown) => void;

export interface IWebhookInfo {
  url?: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  lastErrorDate?: Date;
  lastErrorMessage?: string;
  maxConnections?: number;
}

export interface IWebhookOptions {
  certificate?: Buffer;
  maxConnections?: number;
  allowedUpdates?: string[];
  dropPendingUpdates?: boolean;
  secretToken?: string;
}

// ============================================================================
// TELEGRAM SPECIFIC INTERFACES
// ============================================================================

/**
 * Grammy Bot Configuration
 */
export interface ITelegramConfig {
  /** Bot token from @BotFather */
  botToken: string;

  /** Webhook URL (if using webhooks) */
  webhookUrl?: string;

  /** Webhook secret token */
  webhookSecretToken?: string;

  /** Use webhooks instead of polling */
  useWebhooks: boolean;

  /** Webhook port */
  webhookPort?: number;

  /** Allowed updates */
  allowedUpdates?: TelegramUpdateType[];

  /** Drop pending updates on start */
  dropPendingUpdates?: boolean;

  /** Polling timeout (seconds) */
  pollingTimeout?: number;

  /** Enable graceful stop */
  gracefulStop?: boolean;

  /** API URL (for local bot API server) */
  apiUrl?: string;
}

export type TelegramUpdateType =
  | 'message'
  | 'edited_message'
  | 'channel_post'
  | 'edited_channel_post'
  | 'inline_query'
  | 'chosen_inline_result'
  | 'callback_query'
  | 'shipping_query'
  | 'pre_checkout_query'
  | 'poll'
  | 'poll_answer'
  | 'my_chat_member'
  | 'chat_member'
  | 'chat_join_request';

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Application Environment
 */
export type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

/**
 * 12-Factor App Configuration
 */
export interface IAppConfig {
  /** Application name */
  appName: string;

  /** Application version */
  appVersion: string;

  /** Environment */
  environment: AppEnvironment;

  /** Debug mode */
  debug: boolean;

  /** Server configuration */
  server: IServerConfig;

  /** Platform configurations */
  platforms: IPlatformConfigs;

  /** Database configuration */
  database: IDatabaseConfig;

  /** Redis configuration */
  redis: IRedisConfig;

  /** Logging configuration */
  logging: ILoggingConfig;

  /** Security configuration */
  security: ISecurityConfig;

  /** Feature flags */
  features: IFeatureFlags;
}

export interface IServerConfig {
  /** HTTP port */
  port: number;

  /** Host */
  host: string;

  /** Health check port (if separate) */
  healthCheckPort?: number;

  /** Request timeout (ms) */
  requestTimeout: number;

  /** Keep-alive timeout (ms) */
  keepAliveTimeout: number;

  /** Enable CORS */
  enableCors: boolean;

  /** Allowed origins */
  corsOrigins: string[];

  /** Enable compression */
  enableCompression: boolean;

  /** Trust proxy */
  trustProxy: boolean;
}

export interface IPlatformConfigs {
  telegram?: ITelegramConfig;
  discord?: IDiscordConfig;
  slack?: ISlackConfig;
  web?: IWebConfig;
}

export interface IDiscordConfig {
  botToken: string;
  clientId: string;
  guildIds?: string[];
}

export interface ISlackConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string;
}

export interface IWebConfig {
  enabled: boolean;
  apiKey?: string;
  corsOrigins?: string[];
}

export interface IDatabaseConfig {
  /** Database type */
  type: 'sqlite' | 'postgresql' | 'mysql';

  /** Connection string */
  connectionString?: string;

  /** Host */
  host: string;

  /** Port */
  port: number;

  /** Database name */
  database: string;

  /** Username */
  username: string;

  /** Password */
  password: string;

  /** SSL mode */
  ssl: boolean;

  /** Connection pool min */
  poolMin: number;

  /** Connection pool max */
  poolMax: number;

  /** Migration auto-run */
  autoMigrate: boolean;
}

export interface IRedisConfig {
  /** Enable Redis */
  enabled: boolean;

  /** Host */
  host: string;

  /** Port */
  port: number;

  /** Password */
  password?: string;

  /** Database index */
  db: number;

  /** Key prefix */
  keyPrefix: string;

  /** TLS enabled */
  tls: boolean;
}

export interface ILoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';

  /** Log format */
  format: 'json' | 'pretty';

  /** Enable request logging */
  enableRequestLogging: boolean;

  /** Sensitive fields to mask */
  sensitiveFields: string[];

  /** Enable file logging */
  enableFileLogging: boolean;

  /** Log file path */
  logFilePath?: string;
}

export interface ISecurityConfig {
  /** Enable rate limiting */
  enableRateLimiting: boolean;

  /** Rate limit per minute */
  rateLimitPerMinute: number;

  /** Enable request validation */
  enableRequestValidation: boolean;

  /** JWT secret */
  jwtSecret?: string;

  /** JWT expiration (seconds) */
  jwtExpiration?: number;

  /** Encryption key (for PHI) */
  encryptionKey?: string;

  /** Enable audit logging */
  enableAuditLogging: boolean;
}

export interface IFeatureFlags {
  /** Enable AI responses */
  enableAI: boolean;

  /** Enable crisis detection */
  enableCrisisDetection: boolean;

  /** Enable proactive check-ins */
  enableProactiveCheckIns: boolean;

  /** Enable A/B testing */
  enableABTesting: boolean;

  /** Enable analytics */
  enableAnalytics: boolean;

  /** Enable debug commands */
  enableDebugCommands: boolean;

  /** Enable welcome flow */
  enableWelcomeFlow: boolean;
}

// ============================================================================
// HEALTH CHECK INTERFACES
// ============================================================================

/**
 * Health Check Status
 * Based on: Kubernetes z-pages pattern (/livez, /readyz)
 */
export interface IHealthCheckResult {
  /** Overall status */
  status: HealthStatus;

  /** Timestamp */
  timestamp: Date;

  /** Uptime (seconds) */
  uptimeSeconds: number;

  /** Version */
  version: string;

  /** Environment */
  environment: AppEnvironment;

  /** Component checks */
  checks: IComponentHealthCheck[];

  /** System info */
  system?: ISystemInfo;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface IComponentHealthCheck {
  /** Component name */
  name: string;

  /** Component status */
  status: HealthStatus;

  /** Latency (ms) */
  latencyMs?: number;

  /** Error message */
  error?: string;

  /** Additional details */
  details?: Record<string, unknown>;
}

export interface ISystemInfo {
  /** Node.js version */
  nodeVersion: string;

  /** Platform */
  platform: string;

  /** Architecture */
  architecture: string;

  /** Memory usage */
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };

  /** CPU usage */
  cpuUsage?: {
    user: number;
    system: number;
  };

  /** Process ID */
  pid: number;
}

/**
 * Health Check Service Interface
 */
export interface IHealthCheckService {
  /** Check liveness (is process alive?) */
  checkLiveness(): Promise<IHealthCheckResult>;

  /** Check readiness (can handle requests?) */
  checkReadiness(): Promise<IHealthCheckResult>;

  /** Check startup (has fully started?) */
  checkStartup(): Promise<IHealthCheckResult>;

  /** Register health check */
  registerCheck(name: string, check: () => Promise<IComponentHealthCheck>): void;

  /** Unregister health check */
  unregisterCheck(name: string): void;

  /** Set ready state */
  setReady(ready: boolean): void;

  /** Set alive state */
  setAlive(alive: boolean): void;

  /** Get current state */
  getState(): { ready: boolean; alive: boolean; starting: boolean };
}

// ============================================================================
// DEPLOYMENT INTERFACES
// ============================================================================

/**
 * Docker Configuration
 */
export interface IDockerConfig {
  /** Image name */
  imageName: string;

  /** Image tag */
  imageTag: string;

  /** Registry URL */
  registry?: string;

  /** Build args */
  buildArgs?: Record<string, string>;

  /** Environment variables */
  envVars: Record<string, string>;

  /** Exposed ports */
  ports: number[];

  /** Health check command */
  healthCheck: {
    command: string;
    interval: string;
    timeout: string;
    retries: number;
    startPeriod: string;
  };

  /** Resource limits */
  resources: {
    memory: string;
    cpus: string;
  };
}

/**
 * Kubernetes Deployment Configuration
 */
export interface IKubernetesConfig {
  /** Namespace */
  namespace: string;

  /** Deployment name */
  deploymentName: string;

  /** Replicas */
  replicas: number;

  /** Image */
  image: string;

  /** Image pull policy */
  imagePullPolicy: 'Always' | 'IfNotPresent' | 'Never';

  /** Service account */
  serviceAccount?: string;

  /** Node selector */
  nodeSelector?: Record<string, string>;

  /** Tolerations */
  tolerations?: IToleration[];

  /** Resource requests */
  resourceRequests: {
    memory: string;
    cpu: string;
  };

  /** Resource limits */
  resourceLimits: {
    memory: string;
    cpu: string;
  };

  /** Liveness probe */
  livenessProbe: IProbeConfig;

  /** Readiness probe */
  readinessProbe: IProbeConfig;

  /** Startup probe */
  startupProbe?: IProbeConfig;

  /** Environment variables from secrets */
  envFromSecrets?: string[];

  /** Environment variables from configmaps */
  envFromConfigMaps?: string[];

  /** Service configuration */
  service: IServiceConfig;

  /** Ingress configuration */
  ingress?: IIngressConfig;

  /** Horizontal Pod Autoscaler */
  hpa?: IHPAConfig;
}

export interface IToleration {
  key: string;
  operator: 'Exists' | 'Equal';
  value?: string;
  effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  tolerationSeconds?: number;
}

export interface IProbeConfig {
  /** HTTP path */
  httpPath: string;

  /** Port */
  port: number;

  /** Initial delay (seconds) */
  initialDelaySeconds: number;

  /** Period (seconds) */
  periodSeconds: number;

  /** Timeout (seconds) */
  timeoutSeconds: number;

  /** Success threshold */
  successThreshold: number;

  /** Failure threshold */
  failureThreshold: number;
}

export interface IServiceConfig {
  /** Service type */
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';

  /** Port */
  port: number;

  /** Target port */
  targetPort: number;

  /** Node port (for NodePort type) */
  nodePort?: number;
}

export interface IIngressConfig {
  /** Enable ingress */
  enabled: boolean;

  /** Ingress class name */
  className: string;

  /** Hosts */
  hosts: Array<{
    host: string;
    paths: Array<{
      path: string;
      pathType: 'Prefix' | 'Exact' | 'ImplementationSpecific';
    }>;
  }>;

  /** TLS configuration */
  tls?: Array<{
    secretName: string;
    hosts: string[];
  }>;

  /** Annotations */
  annotations?: Record<string, string>;
}

export interface IHPAConfig {
  /** Minimum replicas */
  minReplicas: number;

  /** Maximum replicas */
  maxReplicas: number;

  /** Target CPU utilization percentage */
  targetCPUUtilization: number;

  /** Target memory utilization percentage */
  targetMemoryUtilization?: number;
}

// ============================================================================
// CI/CD INTERFACES
// ============================================================================

/**
 * GitHub Actions Workflow Configuration
 */
export interface IGitHubActionsConfig {
  /** Workflow name */
  name: string;

  /** Trigger events */
  on: {
    push?: { branches: string[] };
    pull_request?: { branches: string[] };
    workflow_dispatch?: boolean;
    schedule?: Array<{ cron: string }>;
  };

  /** Jobs */
  jobs: IGitHubActionsJob[];
}

export interface IGitHubActionsJob {
  /** Job name */
  name: string;

  /** Runs on */
  runsOn: string;

  /** Needs (dependencies) */
  needs?: string[];

  /** Environment */
  environment?: string;

  /** Steps */
  steps: IGitHubActionsStep[];
}

export interface IGitHubActionsStep {
  /** Step name */
  name: string;

  /** Uses action */
  uses?: string;

  /** Run command */
  run?: string;

  /** With parameters */
  with?: Record<string, string>;

  /** Environment variables */
  env?: Record<string, string>;

  /** If condition */
  if?: string;
}

// ============================================================================
// DEFAULTS AND FACTORY TYPES
// ============================================================================

/**
 * Default Telegram Capabilities
 */
export const TELEGRAM_CAPABILITIES: IPlatformCapabilities = {
  supportsText: true,
  supportsImages: true,
  supportsDocuments: true,
  supportsVoice: true,
  supportsVideo: true,
  supportsInlineButtons: true,
  supportsReplyKeyboard: true,
  supportsEditing: true,
  supportsDeletion: true,
  supportsTypingIndicator: true,
  supportsReactions: true,
  supportsThreads: true,
  supportsRichText: true,
  maxMessageLength: 4096,
  maxButtonsPerMessage: 100,
  supportsWebhooks: true,
  supportsPolling: true,
};

/**
 * Default Application Configuration
 */
export const DEFAULT_APP_CONFIG: IAppConfig = {
  appName: 'sleepcore-dtx',
  appVersion: '1.0.0',
  environment: 'development',
  debug: false,

  server: {
    port: 3000,
    host: '0.0.0.0',
    healthCheckPort: 3001,
    requestTimeout: 30000,
    keepAliveTimeout: 65000,
    enableCors: true,
    corsOrigins: ['*'],
    enableCompression: true,
    trustProxy: false,
  },

  platforms: {},

  database: {
    type: 'sqlite',
    host: 'localhost',
    port: 5432,
    database: 'sleepcore',
    username: 'sleepcore',
    password: '',
    ssl: false,
    poolMin: 2,
    poolMax: 10,
    autoMigrate: true,
  },

  redis: {
    enabled: false,
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'sleepcore:',
    tls: false,
  },

  logging: {
    level: 'info',
    format: 'json',
    enableRequestLogging: true,
    sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
    enableFileLogging: false,
  },

  security: {
    enableRateLimiting: true,
    rateLimitPerMinute: 60,
    enableRequestValidation: true,
    enableAuditLogging: true,
  },

  features: {
    enableAI: true,
    enableCrisisDetection: true,
    enableProactiveCheckIns: false,
    enableABTesting: false,
    enableAnalytics: true,
    enableDebugCommands: false,
    enableWelcomeFlow: true,
  },
};

/**
 * Default Kubernetes Configuration
 */
export const DEFAULT_KUBERNETES_CONFIG: IKubernetesConfig = {
  namespace: 'sleepcore-system',
  deploymentName: 'sleepcore-dtx',
  replicas: 2,
  image: 'sleepcore-dtx:latest',
  imagePullPolicy: 'IfNotPresent',

  resourceRequests: {
    memory: '256Mi',
    cpu: '100m',
  },

  resourceLimits: {
    memory: '512Mi',
    cpu: '500m',
  },

  livenessProbe: {
    httpPath: '/livez',
    port: 3001,
    initialDelaySeconds: 15,
    periodSeconds: 20,
    timeoutSeconds: 5,
    successThreshold: 1,
    failureThreshold: 3,
  },

  readinessProbe: {
    httpPath: '/readyz',
    port: 3001,
    initialDelaySeconds: 5,
    periodSeconds: 10,
    timeoutSeconds: 3,
    successThreshold: 1,
    failureThreshold: 3,
  },

  startupProbe: {
    httpPath: '/startupz',
    port: 3001,
    initialDelaySeconds: 0,
    periodSeconds: 5,
    timeoutSeconds: 3,
    successThreshold: 1,
    failureThreshold: 30,
  },

  service: {
    type: 'ClusterIP',
    port: 80,
    targetPort: 3000,
  },
};

// ============================================================================
// FACTORY FUNCTION TYPES
// ============================================================================

/**
 * Platform Adapter Factory
 */
export type CreatePlatformAdapter = (
  config: IPlatformConfigs
) => Promise<IPlatformAdapter>;

/**
 * Health Check Service Factory
 */
export type CreateHealthCheckService = (
  config?: Partial<IAppConfig>
) => IHealthCheckService;

/**
 * Configuration Loader
 */
export type LoadConfig = () => Promise<IAppConfig>;
