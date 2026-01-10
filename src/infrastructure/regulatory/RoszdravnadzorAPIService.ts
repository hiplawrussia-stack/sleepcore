/**
 * Roszdravnadzor API Service
 * ==========================
 * Integration with АИС Росздравнадзора for AI medical device reporting.
 *
 * Compliance:
 * - Приказ Минздрава №181н от 11.04.2025 (Technical Documentation)
 * - Приказ Росздравнадзора №4472 от 21.07.2025 (Data Transmission)
 * - ГОСТ Р 56939-2024 (Secure Software Development)
 * - ГОСТ МЭК 62304-2022 (Software Lifecycle)
 *
 * @packageDocumentation
 * @module @sleepcore/infrastructure/regulatory
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Device identification for AIS registration
 */
export interface IDeviceIdentification {
  /** Medical device name */
  deviceName: string;
  /** Registration certificate number (РУ) */
  registrationNumber: string;
  /** Registration date */
  registrationDate: Date;
  /** State registry record number (Реестровая запись) */
  registryRecordNumber: string;
  /** Software version with AI technology */
  softwareVersion: string;
  /** AI technology description */
  aiTechnologyDescription?: string;
}

/**
 * Error categories per Order 4472
 */
export interface IErrorMetrics {
  /** Network connectivity errors */
  networkErrors: number;
  /** Data quality/validation errors */
  dataQualityErrors: number;
  /** Software/runtime errors */
  softwareErrors: number;
  /** Study/session processing errors */
  processingErrors: number;
}

/**
 * Operational data for reporting period
 */
export interface IOperationalData {
  /** Application area / solution type */
  applicationArea: string;
  /** Reporting period start */
  periodStart: Date;
  /** Reporting period end */
  periodEnd: Date;
  /** Number of processed studies/sessions */
  processedStudiesCount: number;
  /** Successful completions */
  successfulCompletions: number;
  /** Average ISI improvement (clinical outcome) */
  averageISIImprovement?: number;
  /** Remission rate (ISI < 8) */
  remissionRate?: number;
}

/**
 * Full report structure for AIS Roszdravnadzor
 */
export interface IRoszdravnadzorReport {
  /** Report unique identifier */
  reportId: string;
  /** Report generation timestamp */
  generatedAt: Date;
  /** Device identification */
  device: IDeviceIdentification;
  /** Operational data */
  operational: IOperationalData;
  /** Error metrics */
  errors: IErrorMetrics;
  /** Medical institution INN (if applicable) */
  institutionINN?: string;
  /** Digital signature (GOST R 34.10-2012) */
  digitalSignature?: string;
}

/**
 * API response from AIS
 */
export interface IAISResponse {
  /** Success status */
  success: boolean;
  /** Transaction ID from AIS */
  transactionId?: string;
  /** Error code if failed */
  errorCode?: string;
  /** Error message */
  errorMessage?: string;
  /** Timestamp of acceptance */
  acceptedAt?: Date;
}

/**
 * Version change notification per PP RF 1684
 */
export interface IVersionChangeNotification {
  /** Previous version */
  previousVersion: string;
  /** New version */
  newVersion: string;
  /** Change type */
  changeType: 'non_functional' | 'functional' | 'ai_update' | 'critical';
  /** Change description */
  description: string;
  /** Impact analysis summary */
  impactAnalysis?: string;
  /** Test protocols attached */
  testProtocolsAttached: boolean;
}

/**
 * Cybersecurity incident report
 */
export interface ICybersecurityIncident {
  /** Incident ID */
  incidentId: string;
  /** Incident timestamp */
  occurredAt: Date;
  /** Incident type */
  type: 'unauthorized_access' | 'data_breach' | 'malware' | 'dos' | 'other';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Description */
  description: string;
  /** Mitigation steps taken */
  mitigationSteps: string[];
  /** Resolution status */
  resolved: boolean;
  /** Resolution timestamp */
  resolvedAt?: Date;
}

/**
 * Service configuration
 */
export interface IRoszdravnadzorConfig {
  /** AIS API base URL */
  apiBaseUrl: string;
  /** ESIA credentials for authentication */
  esiaCredentials?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  /** Device registration info */
  deviceInfo: IDeviceIdentification;
  /** Auto-transmission enabled */
  autoTransmissionEnabled: boolean;
  /** Transmission interval (days) */
  transmissionIntervalDays: number;
  /** Retry configuration */
  retryConfig: {
    maxRetries: number;
    retryDelayMs: number;
  };
}

/**
 * Transmission status
 */
export type TransmissionStatus = 'pending' | 'transmitting' | 'success' | 'failed' | 'retry';

/**
 * Transmission record
 */
export interface ITransmissionRecord {
  /** Record ID */
  id: string;
  /** Report being transmitted */
  report: IRoszdravnadzorReport;
  /** Current status */
  status: TransmissionStatus;
  /** Attempt count */
  attempts: number;
  /** Last attempt timestamp */
  lastAttemptAt?: Date;
  /** AIS response */
  response?: IAISResponse;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Queue status summary
 */
export interface IQueueStatus {
  pending: number;
  transmitting: number;
  success: number;
  failed: number;
  retry: number;
}

/**
 * Service status summary
 */
export interface IServiceStatus {
  initialized: boolean;
  autoTransmissionEnabled: boolean;
  queueStatus: IQueueStatus;
  errorMetrics: IErrorMetrics;
  unresolvedIncidents: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default AIS API endpoints
 */
export const AIS_ENDPOINTS = {
  /** Production API */
  PRODUCTION: 'https://api.roszdravnadzor.gov.ru/ais/v1',
  /** Test/sandbox API */
  SANDBOX: 'https://api-test.roszdravnadzor.gov.ru/ais/v1',
  /** Electronic applicant cabinet */
  CABINET: 'https://elk.roszdravnadzor.gov.ru/rzn-applicant/main',
} as const;

/**
 * Required data fields per Order 4472
 */
export const REQUIRED_FIELDS = [
  'deviceName',
  'registrationNumber',
  'registryRecordNumber',
  'softwareVersion',
  'applicationArea',
  'periodStart',
  'periodEnd',
  'processedStudiesCount',
  'networkErrors',
  'dataQualityErrors',
  'softwareErrors',
  'processingErrors',
] as const;

/**
 * Change type to procedure mapping per PP RF 1684
 */
export const CHANGE_PROCEDURES = {
  non_functional: 'notification',
  functional: 'registry_modification',
  ai_update: 'ais_submission_10_days',
  critical: 'new_registration',
} as const;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Partial<IRoszdravnadzorConfig> = {
  apiBaseUrl: AIS_ENDPOINTS.SANDBOX,
  autoTransmissionEnabled: false,
  transmissionIntervalDays: 30,
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 5000,
  },
};

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Service for integration with АИС Росздравнадзора
 *
 * Handles:
 * - Automatic data transmission per Order 4472
 * - Version change notifications per PP RF 1684
 * - Cybersecurity incident reporting
 * - Error metrics collection
 *
 * @example
 * ```typescript
 * const service = new RoszdravnadzorAPIService({
 *   apiBaseUrl: AIS_ENDPOINTS.PRODUCTION,
 *   deviceInfo: {
 *     deviceName: 'SleepCore',
 *     registrationNumber: 'РЗН 2025/12345',
 *     // ...
 *   },
 *   autoTransmissionEnabled: true,
 *   transmissionIntervalDays: 30,
 * });
 *
 * await service.submitReport(report);
 * ```
 */
export class RoszdravnadzorAPIService extends EventEmitter {
  private config: IRoszdravnadzorConfig;
  private transmissionQueue: Map<string, ITransmissionRecord> = new Map();
  private errorMetrics: IErrorMetrics = {
    networkErrors: 0,
    dataQualityErrors: 0,
    softwareErrors: 0,
    processingErrors: 0,
  };
  private incidents: ICybersecurityIncident[] = [];
  private transmissionTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: IRoszdravnadzorConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config } as IRoszdravnadzorConfig;
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the service and start auto-transmission if enabled
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Validate device info
    this.validateDeviceInfo(this.config.deviceInfo);

    // Start auto-transmission scheduler if enabled
    if (this.config.autoTransmissionEnabled) {
      this.startAutoTransmission();
    }

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.transmissionTimer) {
      clearInterval(this.transmissionTimer);
      this.transmissionTimer = undefined;
    }

    // Process remaining queue
    await this.processTransmissionQueue();

    this.isInitialized = false;
    this.emit('shutdown');
  }

  // --------------------------------------------------------------------------
  // Report Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a report for the specified period
   */
  generateReport(
    operationalData: Omit<IOperationalData, 'applicationArea'>,
    institutionINN?: string
  ): IRoszdravnadzorReport {
    const report: IRoszdravnadzorReport = {
      reportId: this.generateReportId(),
      generatedAt: new Date(),
      device: { ...this.config.deviceInfo },
      operational: {
        applicationArea: 'CBT-I Digital Therapeutic for Chronic Insomnia',
        ...operationalData,
      },
      errors: { ...this.errorMetrics },
      institutionINN,
    };

    // Validate required fields
    this.validateReport(report);

    this.emit('report_generated', report);
    return report;
  }

  /**
   * Validate report has all required fields per Order 4472
   */
  private validateReport(report: IRoszdravnadzorReport): void {
    const missing: string[] = [];

    if (!report.device.deviceName) missing.push('deviceName');
    if (!report.device.registrationNumber) missing.push('registrationNumber');
    if (!report.device.registryRecordNumber) missing.push('registryRecordNumber');
    if (!report.device.softwareVersion) missing.push('softwareVersion');
    if (!report.operational.applicationArea) missing.push('applicationArea');
    if (!report.operational.periodStart) missing.push('periodStart');
    if (!report.operational.periodEnd) missing.push('periodEnd');
    if (report.operational.processedStudiesCount === undefined) {
      missing.push('processedStudiesCount');
    }

    if (missing.length > 0) {
      throw new Error(
        `Report validation failed. Missing required fields: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Validate device identification info
   */
  private validateDeviceInfo(info: IDeviceIdentification): void {
    if (!info.deviceName || !info.registrationNumber || !info.softwareVersion) {
      throw new Error('Invalid device identification. Required: deviceName, registrationNumber, softwareVersion');
    }
  }

  // --------------------------------------------------------------------------
  // Report Submission
  // --------------------------------------------------------------------------

  /**
   * Submit report to AIS Roszdravnadzor
   */
  async submitReport(report: IRoszdravnadzorReport): Promise<IAISResponse> {
    const record: ITransmissionRecord = {
      id: report.reportId,
      report,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };

    this.transmissionQueue.set(record.id, record);

    try {
      return await this.transmitReport(record);
    } catch (error) {
      record.status = 'failed';
      this.incrementError('networkErrors');
      throw error;
    }
  }

  /**
   * Transmit report to AIS
   */
  private async transmitReport(record: ITransmissionRecord): Promise<IAISResponse> {
    record.status = 'transmitting';
    record.attempts++;
    record.lastAttemptAt = new Date();

    this.emit('transmission_started', record);

    try {
      // Prepare payload per Order 4472 format
      const payload = this.formatPayload(record.report);

      // In production, this would make actual API call
      // For now, simulate the transmission
      const response = await this.sendToAIS(payload);

      record.status = response.success ? 'success' : 'failed';
      record.response = response;

      if (response.success) {
        this.emit('transmission_success', record);
      } else {
        this.emit('transmission_failed', record, response.errorMessage);

        // Retry logic
        if (record.attempts < this.config.retryConfig.maxRetries) {
          record.status = 'retry';
          await this.scheduleRetry(record);
        }
      }

      return response;
    } catch (error) {
      record.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('transmission_error', record, errorMessage);

      // Retry on network errors
      if (record.attempts < this.config.retryConfig.maxRetries) {
        record.status = 'retry';
        await this.scheduleRetry(record);
      }

      throw error;
    }
  }

  /**
   * Format report payload for AIS API
   */
  private formatPayload(report: IRoszdravnadzorReport): object {
    return {
      // Header
      schemaVersion: '1.0',
      reportType: 'AI_MEDICAL_DEVICE_OPERATIONAL',
      reportId: report.reportId,
      generatedAt: report.generatedAt.toISOString(),

      // Device identification (Идентификация изделия)
      device: {
        name: report.device.deviceName,
        registrationCertificate: report.device.registrationNumber,
        registrationDate: report.device.registrationDate?.toISOString().split('T')[0],
        registryRecord: report.device.registryRecordNumber,
        softwareVersion: report.device.softwareVersion,
        aiTechnology: report.device.aiTechnologyDescription || 'POMDP-based personalization with PLRNN prediction',
      },

      // Operational data (Операционные данные)
      operational: {
        applicationArea: report.operational.applicationArea,
        reportingPeriod: {
          start: report.operational.periodStart.toISOString().split('T')[0],
          end: report.operational.periodEnd.toISOString().split('T')[0],
        },
        statistics: {
          processedStudies: report.operational.processedStudiesCount,
          successfulCompletions: report.operational.successfulCompletions,
          averageISIImprovement: report.operational.averageISIImprovement,
          remissionRate: report.operational.remissionRate,
        },
      },

      // Error metrics (Метрики ошибок)
      errors: {
        network: report.errors.networkErrors,
        dataQuality: report.errors.dataQualityErrors,
        software: report.errors.softwareErrors,
        processing: report.errors.processingErrors,
        total:
          report.errors.networkErrors +
          report.errors.dataQualityErrors +
          report.errors.softwareErrors +
          report.errors.processingErrors,
      },

      // Institution (Медучреждение)
      institution: report.institutionINN
        ? { inn: report.institutionINN }
        : undefined,

      // Signature
      signature: report.digitalSignature,
    };
  }

  /**
   * Send payload to AIS API
   * Note: In production, this would use actual HTTP client
   */
  private async sendToAIS(payload: object): Promise<IAISResponse> {
    // Simulate API call for development
    // In production, replace with actual fetch/axios call
    const endpoint = `${this.config.apiBaseUrl}/reports/submit`;

    // Log for audit trail
    this.emit('api_call', { endpoint, payload: JSON.stringify(payload).substring(0, 500) });

    // Simulated response
    // TODO: Replace with actual API integration when AIS specs are available
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          acceptedAt: new Date(),
        });
      }, 100);
    });
  }

  /**
   * Schedule retry for failed transmission
   */
  private async scheduleRetry(record: ITransmissionRecord): Promise<void> {
    const delay = this.config.retryConfig.retryDelayMs * record.attempts;

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (record.status === 'retry') {
      await this.transmitReport(record);
    }
  }

  // --------------------------------------------------------------------------
  // Auto-transmission
  // --------------------------------------------------------------------------

  /**
   * Start automatic transmission scheduler
   */
  private startAutoTransmission(): void {
    const intervalMs = this.config.transmissionIntervalDays * 24 * 60 * 60 * 1000;

    this.transmissionTimer = setInterval(() => {
      this.emit('auto_transmission_triggered');
      this.processTransmissionQueue();
    }, intervalMs);

    this.emit('auto_transmission_started', { intervalDays: this.config.transmissionIntervalDays });
  }

  /**
   * Process pending items in transmission queue
   */
  private async processTransmissionQueue(): Promise<void> {
    const pending = Array.from(this.transmissionQueue.values()).filter(
      (r) => r.status === 'pending' || r.status === 'retry'
    );

    for (const record of pending) {
      try {
        await this.transmitReport(record);
      } catch {
        // Error already handled in transmitReport
      }
    }
  }

  // --------------------------------------------------------------------------
  // Version Change Notifications
  // --------------------------------------------------------------------------

  /**
   * Submit version change notification per PP RF 1684
   */
  async notifyVersionChange(
    notification: IVersionChangeNotification
  ): Promise<IAISResponse> {
    const procedure = CHANGE_PROCEDURES[notification.changeType];

    // AI updates must be submitted within 10 working days
    if (notification.changeType === 'ai_update') {
      this.emit('ai_update_notification', {
        notification,
        deadline: '10 working days',
        procedure,
      });
    }

    const payload = {
      schemaVersion: '1.0',
      notificationType: 'VERSION_CHANGE',
      timestamp: new Date().toISOString(),
      device: {
        name: this.config.deviceInfo.deviceName,
        registrationCertificate: this.config.deviceInfo.registrationNumber,
      },
      versionChange: {
        previous: notification.previousVersion,
        new: notification.newVersion,
        changeType: notification.changeType,
        procedure,
        description: notification.description,
        impactAnalysis: notification.impactAnalysis,
        testProtocolsAttached: notification.testProtocolsAttached,
      },
    };

    return this.sendToAIS(payload);
  }

  /**
   * Get required procedure for change type
   */
  getRequiredProcedure(changeType: IVersionChangeNotification['changeType']): string {
    return CHANGE_PROCEDURES[changeType];
  }

  // --------------------------------------------------------------------------
  // Error Metrics
  // --------------------------------------------------------------------------

  /**
   * Increment error counter
   */
  incrementError(type: keyof IErrorMetrics): void {
    this.errorMetrics[type]++;
    this.emit('error_recorded', { type, count: this.errorMetrics[type] });
  }

  /**
   * Record multiple errors
   */
  recordErrors(errors: Partial<IErrorMetrics>): void {
    if (errors.networkErrors) this.errorMetrics.networkErrors += errors.networkErrors;
    if (errors.dataQualityErrors) this.errorMetrics.dataQualityErrors += errors.dataQualityErrors;
    if (errors.softwareErrors) this.errorMetrics.softwareErrors += errors.softwareErrors;
    if (errors.processingErrors) this.errorMetrics.processingErrors += errors.processingErrors;
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics(): IErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Reset error metrics (after successful transmission)
   */
  resetErrorMetrics(): void {
    this.errorMetrics = {
      networkErrors: 0,
      dataQualityErrors: 0,
      softwareErrors: 0,
      processingErrors: 0,
    };
  }

  // --------------------------------------------------------------------------
  // Cybersecurity Incident Reporting
  // --------------------------------------------------------------------------

  /**
   * Report cybersecurity incident
   */
  reportIncident(
    incident: Omit<ICybersecurityIncident, 'incidentId'>
  ): ICybersecurityIncident {
    const fullIncident: ICybersecurityIncident = {
      incidentId: `INC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...incident,
    };

    this.incidents.push(fullIncident);

    // High/critical incidents should trigger immediate notification
    if (incident.severity === 'high' || incident.severity === 'critical') {
      this.emit('critical_incident', fullIncident);
    }

    this.emit('incident_reported', fullIncident);
    return fullIncident;
  }

  /**
   * Update incident resolution status
   */
  resolveIncident(incidentId: string, mitigationSteps: string[]): void {
    const incident = this.incidents.find((i) => i.incidentId === incidentId);
    if (incident) {
      incident.resolved = true;
      incident.resolvedAt = new Date();
      incident.mitigationSteps = [...incident.mitigationSteps, ...mitigationSteps];
      this.emit('incident_resolved', incident);
    }
  }

  /**
   * Get all incidents
   */
  getIncidents(unresolvedOnly = false): ICybersecurityIncident[] {
    if (unresolvedOnly) {
      return this.incidents.filter((i) => !i.resolved);
    }
    return [...this.incidents];
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `RPT-${timestamp}-${random}`;
  }

  /**
   * Get transmission queue status
   */
  getQueueStatus(): IQueueStatus {
    const records = Array.from(this.transmissionQueue.values());
    return {
      pending: records.filter((r) => r.status === 'pending').length,
      transmitting: records.filter((r) => r.status === 'transmitting').length,
      success: records.filter((r) => r.status === 'success').length,
      failed: records.filter((r) => r.status === 'failed').length,
      retry: records.filter((r) => r.status === 'retry').length,
    };
  }

  /**
   * Get service status
   */
  getStatus(): IServiceStatus {
    return {
      initialized: this.isInitialized,
      autoTransmissionEnabled: this.config.autoTransmissionEnabled,
      queueStatus: this.getQueueStatus(),
      errorMetrics: this.getErrorMetrics(),
      unresolvedIncidents: this.getIncidents(true).length,
    };
  }

  /**
   * Get device info
   */
  getDeviceInfo(): IDeviceIdentification {
    return { ...this.config.deviceInfo };
  }

  /**
   * Update device software version
   */
  updateSoftwareVersion(newVersion: string, changeType: IVersionChangeNotification['changeType']): void {
    const previousVersion = this.config.deviceInfo.softwareVersion;
    this.config.deviceInfo.softwareVersion = newVersion;

    this.emit('version_updated', { previousVersion, newVersion, changeType });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create RoszdravnadzorAPIService instance
 */
export function createRoszdravnadzorAPIService(
  config: IRoszdravnadzorConfig
): RoszdravnadzorAPIService {
  return new RoszdravnadzorAPIService(config);
}

/**
 * Default service instance (must be configured before use)
 */
export let roszdravnadzorAPIService: RoszdravnadzorAPIService | null = null;

/**
 * Initialize default service instance
 */
export function initializeRoszdravnadzorService(
  config: IRoszdravnadzorConfig
): RoszdravnadzorAPIService {
  roszdravnadzorAPIService = createRoszdravnadzorAPIService(config);
  return roszdravnadzorAPIService;
}
