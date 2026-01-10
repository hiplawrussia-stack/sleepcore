/**
 * RoszdravnadzorAPIService Tests
 * ==============================
 * Unit tests for АИС Росздравнадзора integration.
 *
 * @packageDocumentation
 */

import {
  RoszdravnadzorAPIService,
  createRoszdravnadzorAPIService,
  initializeRoszdravnadzorService,
  AIS_ENDPOINTS,
  REQUIRED_FIELDS,
  CHANGE_PROCEDURES,
  DEFAULT_CONFIG,
  IRoszdravnadzorConfig,
  IDeviceIdentification,
  IOperationalData,
  IRoszdravnadzorReport,
  IVersionChangeNotification,
  ICybersecurityIncident,
  IErrorMetrics,
} from '../../../../src/infrastructure/regulatory';

// ============================================================================
// Test Configuration
// ============================================================================

const mockDeviceInfo: IDeviceIdentification = {
  deviceName: 'SleepCore',
  registrationNumber: 'РЗН 2025/12345',
  registrationDate: new Date('2025-09-01'),
  registryRecordNumber: 'FSR 2025/12345',
  softwareVersion: '1.0.0-alpha.4',
  aiTechnologyDescription: 'POMDP-based personalization with PLRNN prediction',
};

const mockConfig: IRoszdravnadzorConfig = {
  apiBaseUrl: AIS_ENDPOINTS.SANDBOX,
  deviceInfo: mockDeviceInfo,
  autoTransmissionEnabled: false,
  transmissionIntervalDays: 30,
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 100, // Short delay for tests
  },
};

const mockOperationalData: Omit<IOperationalData, 'applicationArea'> = {
  periodStart: new Date('2025-12-01'),
  periodEnd: new Date('2025-12-31'),
  processedStudiesCount: 150,
  successfulCompletions: 142,
  averageISIImprovement: 8.5,
  remissionRate: 0.68,
};

// ============================================================================
// Test Suite
// ============================================================================

describe('RoszdravnadzorAPIService', () => {
  let service: RoszdravnadzorAPIService;

  beforeEach(() => {
    service = new RoszdravnadzorAPIService(mockConfig);
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------

  describe('Initialization', () => {
    it('should create service instance with config', () => {
      expect(service).toBeInstanceOf(RoszdravnadzorAPIService);
    });

    it('should initialize successfully', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should emit initialized event', async () => {
      const initHandler = jest.fn();
      service.on('initialized', initHandler);

      await service.initialize();

      expect(initHandler).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      const initHandler = jest.fn();
      service.on('initialized', initHandler);

      await service.initialize();

      expect(initHandler).not.toHaveBeenCalled();
    });

    it('should throw on invalid device info', () => {
      const invalidConfig = {
        ...mockConfig,
        deviceInfo: {
          deviceName: '',
          registrationNumber: '',
          softwareVersion: '',
        } as IDeviceIdentification,
      };

      const invalidService = new RoszdravnadzorAPIService(invalidConfig);
      expect(invalidService.initialize()).rejects.toThrow('Invalid device identification');
    });

    it('should shutdown correctly', async () => {
      await service.initialize();
      const shutdownHandler = jest.fn();
      service.on('shutdown', shutdownHandler);

      await service.shutdown();

      expect(shutdownHandler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Factory Function Tests
  // --------------------------------------------------------------------------

  describe('Factory Functions', () => {
    it('should create service using factory function', () => {
      const factoryService = createRoszdravnadzorAPIService(mockConfig);
      expect(factoryService).toBeInstanceOf(RoszdravnadzorAPIService);
    });

    it('should initialize default service instance', () => {
      const defaultService = initializeRoszdravnadzorService(mockConfig);
      expect(defaultService).toBeInstanceOf(RoszdravnadzorAPIService);
    });
  });

  // --------------------------------------------------------------------------
  // Report Generation Tests
  // --------------------------------------------------------------------------

  describe('Report Generation', () => {
    it('should generate report with all required fields', () => {
      const report = service.generateReport(mockOperationalData);

      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.device.deviceName).toBe('SleepCore');
      expect(report.operational.processedStudiesCount).toBe(150);
    });

    it('should include device identification', () => {
      const report = service.generateReport(mockOperationalData);

      expect(report.device.registrationNumber).toBe('РЗН 2025/12345');
      expect(report.device.softwareVersion).toBe('1.0.0-alpha.4');
    });

    it('should include operational data', () => {
      const report = service.generateReport(mockOperationalData);

      expect(report.operational.applicationArea).toContain('CBT-I');
      expect(report.operational.successfulCompletions).toBe(142);
      expect(report.operational.remissionRate).toBe(0.68);
    });

    it('should include error metrics', () => {
      service.incrementError('networkErrors');
      service.incrementError('softwareErrors');

      const report = service.generateReport(mockOperationalData);

      expect(report.errors.networkErrors).toBe(1);
      expect(report.errors.softwareErrors).toBe(1);
    });

    it('should include institution INN if provided', () => {
      const report = service.generateReport(mockOperationalData, '7701234567');

      expect(report.institutionINN).toBe('7701234567');
    });

    it('should generate unique report IDs', () => {
      const report1 = service.generateReport(mockOperationalData);
      const report2 = service.generateReport(mockOperationalData);

      expect(report1.reportId).not.toBe(report2.reportId);
    });

    it('should emit report_generated event', () => {
      const handler = jest.fn();
      service.on('report_generated', handler);

      service.generateReport(mockOperationalData);

      expect(handler).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Report Submission Tests
  // --------------------------------------------------------------------------

  describe('Report Submission', () => {
    it('should submit report and receive success response', async () => {
      const report = service.generateReport(mockOperationalData);
      const response = await service.submitReport(report);

      expect(response.success).toBe(true);
      expect(response.transactionId).toBeDefined();
      expect(response.acceptedAt).toBeInstanceOf(Date);
    });

    it('should emit transmission events', async () => {
      const startHandler = jest.fn();
      const successHandler = jest.fn();
      service.on('transmission_started', startHandler);
      service.on('transmission_success', successHandler);

      const report = service.generateReport(mockOperationalData);
      await service.submitReport(report);

      expect(startHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should track submission in queue', async () => {
      const report = service.generateReport(mockOperationalData);
      await service.submitReport(report);

      const queueStatus = service.getQueueStatus();
      expect(queueStatus.success).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Version Change Notification Tests
  // --------------------------------------------------------------------------

  describe('Version Change Notifications', () => {
    it('should submit non-functional change notification', async () => {
      const notification: IVersionChangeNotification = {
        previousVersion: '1.0.0',
        newVersion: '1.0.1',
        changeType: 'non_functional',
        description: 'UI color scheme update',
        testProtocolsAttached: false,
      };

      const response = await service.notifyVersionChange(notification);

      expect(response.success).toBe(true);
    });

    it('should submit AI update notification', async () => {
      const notification: IVersionChangeNotification = {
        previousVersion: '1.1.0',
        newVersion: '1.2.0',
        changeType: 'ai_update',
        description: 'PLRNN model retrained on expanded dataset',
        impactAnalysis: 'Improved prediction accuracy by 15%',
        testProtocolsAttached: true,
      };

      const aiHandler = jest.fn();
      service.on('ai_update_notification', aiHandler);

      await service.notifyVersionChange(notification);

      expect(aiHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deadline: '10 working days',
          procedure: 'ais_submission_10_days',
        })
      );
    });

    it('should return correct procedure for change type', () => {
      expect(service.getRequiredProcedure('non_functional')).toBe('notification');
      expect(service.getRequiredProcedure('functional')).toBe('registry_modification');
      expect(service.getRequiredProcedure('ai_update')).toBe('ais_submission_10_days');
      expect(service.getRequiredProcedure('critical')).toBe('new_registration');
    });

    it('should update device software version', () => {
      const handler = jest.fn();
      service.on('version_updated', handler);

      service.updateSoftwareVersion('1.1.0', 'functional');

      expect(handler).toHaveBeenCalledWith({
        previousVersion: '1.0.0-alpha.4',
        newVersion: '1.1.0',
        changeType: 'functional',
      });

      expect(service.getDeviceInfo().softwareVersion).toBe('1.1.0');
    });
  });

  // --------------------------------------------------------------------------
  // Error Metrics Tests
  // --------------------------------------------------------------------------

  describe('Error Metrics', () => {
    it('should increment error counter', () => {
      service.incrementError('networkErrors');
      service.incrementError('networkErrors');
      service.incrementError('dataQualityErrors');

      const metrics = service.getErrorMetrics();

      expect(metrics.networkErrors).toBe(2);
      expect(metrics.dataQualityErrors).toBe(1);
      expect(metrics.softwareErrors).toBe(0);
    });

    it('should record multiple errors at once', () => {
      service.recordErrors({
        networkErrors: 5,
        processingErrors: 3,
      });

      const metrics = service.getErrorMetrics();

      expect(metrics.networkErrors).toBe(5);
      expect(metrics.processingErrors).toBe(3);
    });

    it('should emit error_recorded event', () => {
      const handler = jest.fn();
      service.on('error_recorded', handler);

      service.incrementError('softwareErrors');

      expect(handler).toHaveBeenCalledWith({
        type: 'softwareErrors',
        count: 1,
      });
    });

    it('should reset error metrics', () => {
      service.incrementError('networkErrors');
      service.incrementError('softwareErrors');
      service.resetErrorMetrics();

      const metrics = service.getErrorMetrics();

      expect(metrics.networkErrors).toBe(0);
      expect(metrics.softwareErrors).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Cybersecurity Incident Tests
  // --------------------------------------------------------------------------

  describe('Cybersecurity Incidents', () => {
    it('should report incident and generate ID', () => {
      const incident = service.reportIncident({
        occurredAt: new Date(),
        type: 'unauthorized_access',
        severity: 'medium',
        description: 'Multiple failed login attempts from unknown IP',
        mitigationSteps: ['IP blocked', 'Account locked'],
        resolved: false,
      });

      expect(incident.incidentId).toBeDefined();
      expect(incident.type).toBe('unauthorized_access');
    });

    it('should emit incident_reported event', () => {
      const handler = jest.fn();
      service.on('incident_reported', handler);

      service.reportIncident({
        occurredAt: new Date(),
        type: 'malware',
        severity: 'low',
        description: 'Suspicious file detected and quarantined',
        mitigationSteps: ['File quarantined'],
        resolved: true,
        resolvedAt: new Date(),
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should emit critical_incident for high severity', () => {
      const criticalHandler = jest.fn();
      service.on('critical_incident', criticalHandler);

      service.reportIncident({
        occurredAt: new Date(),
        type: 'data_breach',
        severity: 'critical',
        description: 'Potential PHI exposure detected',
        mitigationSteps: ['Systems isolated', 'Forensic analysis initiated'],
        resolved: false,
      });

      expect(criticalHandler).toHaveBeenCalled();
    });

    it('should resolve incident', () => {
      const incident = service.reportIncident({
        occurredAt: new Date(),
        type: 'dos',
        severity: 'high',
        description: 'DDoS attack detected',
        mitigationSteps: ['Traffic filtering enabled'],
        resolved: false,
      });

      const resolveHandler = jest.fn();
      service.on('incident_resolved', resolveHandler);

      service.resolveIncident(incident.incidentId, ['Attack mitigated', 'Source blocked']);

      expect(resolveHandler).toHaveBeenCalled();

      const incidents = service.getIncidents();
      const resolved = incidents.find((i) => i.incidentId === incident.incidentId);
      expect(resolved?.resolved).toBe(true);
      expect(resolved?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should filter unresolved incidents', () => {
      service.reportIncident({
        occurredAt: new Date(),
        type: 'unauthorized_access',
        severity: 'low',
        description: 'Test 1',
        mitigationSteps: [],
        resolved: true,
        resolvedAt: new Date(),
      });

      service.reportIncident({
        occurredAt: new Date(),
        type: 'other',
        severity: 'medium',
        description: 'Test 2',
        mitigationSteps: [],
        resolved: false,
      });

      const unresolvedOnly = service.getIncidents(true);
      const all = service.getIncidents();

      expect(unresolvedOnly.length).toBe(1);
      expect(all.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Status and Queue Tests
  // --------------------------------------------------------------------------

  describe('Status and Queue', () => {
    it('should return service status', async () => {
      await service.initialize();

      const status = service.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.autoTransmissionEnabled).toBe(false);
      expect(status.queueStatus).toBeDefined();
      expect(status.errorMetrics).toBeDefined();
    });

    it('should track queue status', async () => {
      const report1 = service.generateReport(mockOperationalData);
      const report2 = service.generateReport(mockOperationalData);

      await service.submitReport(report1);
      await service.submitReport(report2);

      const queueStatus = service.getQueueStatus();

      expect(queueStatus.success).toBe(2);
      expect(queueStatus.failed).toBe(0);
    });

    it('should return device info', () => {
      const deviceInfo = service.getDeviceInfo();

      expect(deviceInfo.deviceName).toBe('SleepCore');
      expect(deviceInfo.registrationNumber).toBe('РЗН 2025/12345');
    });
  });

  // --------------------------------------------------------------------------
  // Auto-transmission Tests
  // --------------------------------------------------------------------------

  describe('Auto-transmission', () => {
    it('should start auto-transmission when enabled', async () => {
      const autoConfig = {
        ...mockConfig,
        autoTransmissionEnabled: true,
        transmissionIntervalDays: 1,
      };

      const autoService = new RoszdravnadzorAPIService(autoConfig);
      const handler = jest.fn();
      autoService.on('auto_transmission_started', handler);

      await autoService.initialize();

      expect(handler).toHaveBeenCalledWith({ intervalDays: 1 });

      await autoService.shutdown();
    });

    it('should not start auto-transmission when disabled', async () => {
      const handler = jest.fn();
      service.on('auto_transmission_started', handler);

      await service.initialize();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Constants Tests
  // --------------------------------------------------------------------------

  describe('Constants', () => {
    it('should have correct AIS endpoints', () => {
      expect(AIS_ENDPOINTS.PRODUCTION).toContain('roszdravnadzor.gov.ru');
      expect(AIS_ENDPOINTS.SANDBOX).toContain('test');
    });

    it('should have all required fields defined', () => {
      expect(REQUIRED_FIELDS).toContain('deviceName');
      expect(REQUIRED_FIELDS).toContain('registrationNumber');
      expect(REQUIRED_FIELDS).toContain('softwareVersion');
      expect(REQUIRED_FIELDS).toContain('processedStudiesCount');
    });

    it('should have correct change procedures', () => {
      expect(CHANGE_PROCEDURES.non_functional).toBe('notification');
      expect(CHANGE_PROCEDURES.functional).toBe('registry_modification');
      expect(CHANGE_PROCEDURES.ai_update).toBe('ais_submission_10_days');
      expect(CHANGE_PROCEDURES.critical).toBe('new_registration');
    });

    it('should have default config values', () => {
      expect(DEFAULT_CONFIG.autoTransmissionEnabled).toBe(false);
      expect(DEFAULT_CONFIG.transmissionIntervalDays).toBe(30);
      expect(DEFAULT_CONFIG.retryConfig?.maxRetries).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Report Validation Tests
  // --------------------------------------------------------------------------

  describe('Report Validation', () => {
    it('should validate required fields', () => {
      // Create service with complete device info to test validation
      const minimalConfig = {
        ...mockConfig,
        deviceInfo: {
          deviceName: 'Test',
          registrationNumber: 'TEST-123',
          registryRecordNumber: 'FSR-TEST-123',
          softwareVersion: '1.0.0',
        } as IDeviceIdentification,
      };

      const minimalService = new RoszdravnadzorAPIService(minimalConfig);

      // Should not throw for valid data
      expect(() =>
        minimalService.generateReport({
          periodStart: new Date(),
          periodEnd: new Date(),
          processedStudiesCount: 0,
          successfulCompletions: 0,
        })
      ).not.toThrow();
    });

    it('should throw for missing registry record number', () => {
      const incompleteConfig = {
        ...mockConfig,
        deviceInfo: {
          deviceName: 'Test',
          registrationNumber: 'TEST-123',
          softwareVersion: '1.0.0',
          // registryRecordNumber intentionally missing
        } as IDeviceIdentification,
      };

      const incompleteService = new RoszdravnadzorAPIService(incompleteConfig);

      expect(() =>
        incompleteService.generateReport({
          periodStart: new Date(),
          periodEnd: new Date(),
          processedStudiesCount: 0,
          successfulCompletions: 0,
        })
      ).toThrow('Missing required fields: registryRecordNumber');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('RoszdravnadzorAPIService Integration', () => {
  let service: RoszdravnadzorAPIService;

  beforeEach(async () => {
    service = new RoszdravnadzorAPIService(mockConfig);
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should complete full reporting workflow', async () => {
    // 1. Record some errors during operation
    service.incrementError('processingErrors');
    service.incrementError('dataQualityErrors');

    // 2. Generate report
    const report = service.generateReport(mockOperationalData, '7701234567');

    // 3. Submit report
    const response = await service.submitReport(report);

    // 4. Verify success
    expect(response.success).toBe(true);
    expect(report.errors.processingErrors).toBe(1);
    expect(report.errors.dataQualityErrors).toBe(1);

    // 5. Check status
    const status = service.getStatus();
    expect(status.queueStatus.success).toBeGreaterThanOrEqual(1);
  });

  it('should handle version update with AI changes', async () => {
    // 1. Update version
    service.updateSoftwareVersion('1.1.0', 'ai_update');

    // 2. Notify about AI update
    const notification: IVersionChangeNotification = {
      previousVersion: '1.0.0-alpha.4',
      newVersion: '1.1.0',
      changeType: 'ai_update',
      description: 'PLRNN model improvements',
      impactAnalysis: 'Better sleep prediction accuracy',
      testProtocolsAttached: true,
    };

    const response = await service.notifyVersionChange(notification);

    // 3. Verify
    expect(response.success).toBe(true);
    expect(service.getDeviceInfo().softwareVersion).toBe('1.1.0');
  });

  it('should handle incident lifecycle', () => {
    // 1. Report incident
    const incident = service.reportIncident({
      occurredAt: new Date(),
      type: 'unauthorized_access',
      severity: 'high',
      description: 'Brute force attack detected',
      mitigationSteps: ['Rate limiting activated'],
      resolved: false,
    });

    // 2. Check unresolved
    expect(service.getStatus().unresolvedIncidents).toBe(1);

    // 3. Resolve incident
    service.resolveIncident(incident.incidentId, [
      'Attacker IP blocked',
      'Security audit completed',
    ]);

    // 4. Verify resolved
    expect(service.getStatus().unresolvedIncidents).toBe(0);

    const resolvedIncident = service.getIncidents().find(
      (i) => i.incidentId === incident.incidentId
    );
    expect(resolvedIncident?.mitigationSteps).toHaveLength(3);
  });
});
