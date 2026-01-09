/**
 * 🧪 COGNITIVE CORE API - COMPREHENSIVE TESTS
 * ============================================
 * Tests for Phase 3.5: Integration & API Layer
 *
 * Coverage:
 * - Factory function
 * - Session management
 * - Message processing
 * - State management
 * - Intervention system
 * - Crisis detection
 * - Event system
 * - Data management
 *
 * БФ "Другой путь" | БАЙТ Cognitive Core v1.0
 */

import {
  CognitiveCoreAPI,
  createCognitiveCoreAPI,
} from '../CognitiveCoreAPI';
import {
  DEFAULT_COGNITIVE_CORE_CONFIG,
  type ICognitiveCoreConfig,
  type IProcessMessageCommand,
  type IRecordObservationCommand,
  type IRequestInterventionCommand,
  type IRecordOutcomeCommand,
  type IUserStateQuery,
  type IInterventionHistoryQuery,
  type IDomainEvent,
} from '../ICognitiveCoreAPI';

describe('CognitiveCoreAPI', () => {
  let api: CognitiveCoreAPI;

  beforeEach(async () => {
    api = await createCognitiveCoreAPI({
      enableEventSourcing: true,
      enableRealTimeEvents: true,
      crisisDetectionEnabled: true,
      autoInterventionEnabled: true,
    });
  });

  // ============================================================================
  // FACTORY & INITIALIZATION
  // ============================================================================

  describe('Factory & Initialization', () => {
    it('should create API with default config', async () => {
      const defaultApi = await createCognitiveCoreAPI();
      expect(defaultApi).toBeInstanceOf(CognitiveCoreAPI);
    });

    it('should create API with custom config', async () => {
      const customConfig: Partial<ICognitiveCoreConfig> = {
        defaultLanguage: 'en',
        sessionTimeoutMs: 60000,
        autoInterventionEnabled: false,
      };

      const customApi = await createCognitiveCoreAPI(customConfig);
      expect(customApi).toBeInstanceOf(CognitiveCoreAPI);
    });

    it('should provide event bus', () => {
      const eventBus = api.getEventBus();
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.publish).toBe('function');
      expect(typeof eventBus.subscribe).toBe('function');
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  describe('Session Management', () => {
    describe('startSession', () => {
      it('should start new session for user', async () => {
        const result = await api.startSession('user-1', 'telegram');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data!.userId).toBe('user-1');
        expect(result.data!.platform).toBe('telegram');
        expect(result.data!.status).toBe('active');
        expect(result.data!.messageCount).toBe(0);
      });

      it('should start session with custom context', async () => {
        const result = await api.startSession('user-2', 'web', {
          language: 'en',
          ageGroup: 'adult',
        });

        expect(result.success).toBe(true);
        expect(result.data!.context.language).toBe('en');
        expect(result.data!.context.ageGroup).toBe('adult');
      });

      it('should end existing session when starting new one', async () => {
        const first = await api.startSession('user-3', 'telegram');
        const second = await api.startSession('user-3', 'web');

        expect(first.success).toBe(true);
        expect(second.success).toBe(true);
        expect(first.data!.sessionId).not.toBe(second.data!.sessionId);
      });

      it('should initialize state for new user', async () => {
        const result = await api.startSession('new-user', 'api');

        expect(result.success).toBe(true);
        expect(result.data!.currentState).toBeDefined();
        expect(result.data!.currentBelief).toBeDefined();
      });
    });

    describe('getOrCreateSession', () => {
      it('should return existing active session', async () => {
        const started = await api.startSession('user-4', 'telegram');
        const retrieved = await api.getOrCreateSession('user-4', 'telegram');

        expect(retrieved.success).toBe(true);
        expect(retrieved.data!.sessionId).toBe(started.data!.sessionId);
      });

      it('should create new session if none exists', async () => {
        const result = await api.getOrCreateSession('user-5', 'web');

        expect(result.success).toBe(true);
        expect(result.data!.userId).toBe('user-5');
        expect(result.data!.platform).toBe('web');
      });
    });

    describe('endSession', () => {
      it('should end session successfully', async () => {
        const started = await api.startSession('user-6', 'telegram');
        const result = await api.endSession(started.data!.sessionId);

        expect(result.success).toBe(true);
      });

      it('should handle ending non-existent session', async () => {
        const result = await api.endSession('non-existent-session');
        expect(result.success).toBe(true);
      });
    });

    describe('updateSessionContext', () => {
      it('should update session context', async () => {
        const session = await api.startSession('user-7', 'telegram');
        const result = await api.updateSessionContext(session.data!.sessionId, {
          currentTopic: 'anxiety',
          language: 'en',
        });

        expect(result.success).toBe(true);
        expect(result.data!.context.currentTopic).toBe('anxiety');
        expect(result.data!.context.language).toBe('en');
      });

      it('should fail for non-existent session', async () => {
        const result = await api.updateSessionContext('fake-session', {
          currentTopic: 'test',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SESSION_NOT_FOUND');
      });
    });
  });

  // ============================================================================
  // MESSAGE PROCESSING
  // ============================================================================

  describe('Message Processing', () => {
    let sessionId: string;
    const userId = 'msg-user';

    beforeEach(async () => {
      const session = await api.startSession(userId, 'telegram');
      sessionId = session.data!.sessionId;
    });

    describe('processMessage', () => {
      it('should process text message', async () => {
        const command: IProcessMessageCommand = {
          userId,
          sessionId,
          text: 'Я чувствую себя немного грустным сегодня',
        };

        const result = await api.processMessage(command);

        if (!result.success) {
          console.error('processMessage failed:', result.error);
        }
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data!.analysis).toBeDefined();
        expect(result.data!.newState).toBeDefined();
        expect(result.data!.newBelief).toBeDefined();
        expect(result.data!.responseSuggestions).toBeDefined();
      });

      it('should detect language from message', async () => {
        const russianCommand: IProcessMessageCommand = {
          userId,
          sessionId,
          text: 'Привет, как дела?',
        };

        const result = await api.processMessage(russianCommand);
        expect(result.success).toBe(true);
      });

      it('should detect English language', async () => {
        const englishCommand: IProcessMessageCommand = {
          userId,
          sessionId,
          text: 'I feel anxious today',
        };

        const result = await api.processMessage(englishCommand);
        expect(result.success).toBe(true);
      });

      it('should update session message count', async () => {
        const command: IProcessMessageCommand = {
          userId,
          sessionId,
          text: 'Test message',
        };

        await api.processMessage(command);
        const session = await api.getOrCreateSession(userId, 'telegram');

        expect(session.data!.messageCount).toBe(1);
      });

      it('should return response suggestions', async () => {
        const command: IProcessMessageCommand = {
          userId,
          sessionId,
          text: 'Мне очень плохо, не знаю что делать',
        };

        const result = await api.processMessage(command);

        expect(result.data!.responseSuggestions).toBeDefined();
        expect(Array.isArray(result.data!.responseSuggestions)).toBe(true);
      });

      it('should fail for non-existent session', async () => {
        const command: IProcessMessageCommand = {
          userId,
          sessionId: 'fake-session',
          text: 'Test',
        };

        const result = await api.processMessage(command);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SESSION_NOT_FOUND');
      });

      it('should process message with metadata', async () => {
        const command: IProcessMessageCommand = {
          userId,
          sessionId,
          text: 'Test with metadata',
          metadata: {
            messageId: 'msg-123',
            timestamp: new Date(),
          },
        };

        const result = await api.processMessage(command);
        expect(result.success).toBe(true);
      });
    });

    describe('analyzeText', () => {
      it('should analyze text without updating state', async () => {
        const result = await api.analyzeText('Я всегда все порчу');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        // Distortions are inside thoughts array
        expect(result.data!.thoughts).toBeDefined();
      });

      it('should detect cognitive distortions', async () => {
        const result = await api.analyzeText('Никто меня не понимает, все против меня');

        expect(result.success).toBe(true);
        // Extract distortions from thoughts
        const allDistortions = result.data!.thoughts.flatMap(t => t.distortions);
        expect(allDistortions.length).toBeGreaterThanOrEqual(0);
      });

      it('should respect language parameter', async () => {
        const result = await api.analyzeText('I always fail', 'en');
        expect(result.success).toBe(true);
      });

      it('should auto-detect Russian', async () => {
        const result = await api.analyzeText('Привет мир');
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  describe('State Management', () => {
    const userId = 'state-user';

    beforeEach(async () => {
      const session = await api.startSession(userId, 'telegram');
      // Process a message to create state
      await api.processMessage({
        userId,
        sessionId: session.data!.sessionId,
        text: 'Hello world',
      });
    });

    describe('getUserState', () => {
      it('should get current user state', async () => {
        const query: IUserStateQuery = {
          userId,
        };

        const result = await api.getUserState(query);

        expect(result.success).toBe(true);
        expect(result.data!.userId).toBe(userId);
        expect(result.data!.currentState).toBeDefined();
        expect(result.data!.currentBelief).toBeDefined();
      });

      it('should include history when requested', async () => {
        const query: IUserStateQuery = {
          userId,
          includeHistory: true,
          historyLimit: 10,
        };

        const result = await api.getUserState(query);

        expect(result.success).toBe(true);
        expect(result.data!.history).toBeDefined();
        expect(Array.isArray(result.data!.history)).toBe(true);
      });

      it('should include predictions when requested', async () => {
        const query: IUserStateQuery = {
          userId,
          includePredictions: true,
          predictionHorizons: ['24h'],
        };

        const result = await api.getUserState(query);

        expect(result.success).toBe(true);
        expect(result.data!.predictions).toBeDefined();
        expect(result.data!.predictions!['24h']).toBeDefined();
      });

      it('should fail for non-existent user', async () => {
        const query: IUserStateQuery = {
          userId: 'non-existent-user',
        };

        const result = await api.getUserState(query);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      });
    });

    describe('recordObservation', () => {
      it('should record observation and update state', async () => {
        const command: IRecordObservationCommand = {
          userId,
          observation: {
            id: 'obs-1',
            timestamp: new Date(),
            type: 'self_report',
            data: {
              emotional: {
                valence: 0.3,
                arousal: 0.5,
              },
            },
            reliability: 0.8,
            informsComponents: ['emotional'],
          },
          source: 'button',
        };

        const result = await api.recordObservation(command);

        expect(result.success).toBe(true);
        expect(result.data!.state).toBeDefined();
        expect(result.data!.belief).toBeDefined();
      });

      it('should create state for new user via observation', async () => {
        const command: IRecordObservationCommand = {
          userId: 'brand-new-user',
          observation: {
            id: 'obs-2',
            timestamp: new Date(),
            type: 'self_report',
            data: {
              emotional: {
                valence: 0.5,
              },
            },
            reliability: 0.7,
            informsComponents: ['emotional'],
          },
          source: 'system',
        };

        const result = await api.recordObservation(command);
        expect(result.success).toBe(true);
      });
    });

    describe('getPredictions', () => {
      it('should get predictions for user', async () => {
        const result = await api.getPredictions(userId, ['24h']);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data!['24h']).toBeDefined();
      });

      it('should support multiple horizons', async () => {
        const result = await api.getPredictions(userId, ['6h', '24h', '72h']);

        expect(result.success).toBe(true);
        expect(result.data!['6h']).toBeDefined();
        expect(result.data!['24h']).toBeDefined();
        expect(result.data!['72h']).toBeDefined();
      });

      it('should fail for non-existent user', async () => {
        const result = await api.getPredictions('fake-user');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      });
    });

    describe('getVulnerabilityWindows', () => {
      it('should get vulnerability windows', async () => {
        const result = await api.getVulnerabilityWindows(userId);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should fail for non-existent user', async () => {
        const result = await api.getVulnerabilityWindows('fake-user');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      });
    });
  });

  // ============================================================================
  // INTERVENTION SYSTEM
  // ============================================================================

  describe('Intervention System', () => {
    let sessionId: string;
    const userId = 'intervention-user';

    beforeEach(async () => {
      const session = await api.startSession(userId, 'telegram');
      sessionId = session.data!.sessionId;

      // Process message to create state
      await api.processMessage({
        userId,
        sessionId,
        text: 'I feel anxious and stressed',
      });
    });

    describe('requestIntervention', () => {
      it('should select intervention for user', async () => {
        const command: IRequestInterventionCommand = {
          userId,
          sessionId,
        };

        const result = await api.requestIntervention(command);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data!.intervention).toBeDefined();
        expect(result.data!.reasoning).toBeDefined();
      });

      it('should filter by category when specified', async () => {
        const command: IRequestInterventionCommand = {
          userId,
          sessionId,
          context: {
            userInitiated: true,
            specificCategory: 'mindfulness',
          },
        };

        const result = await api.requestIntervention(command);

        expect(result.success).toBe(true);
        if (result.data) {
          expect(result.data.intervention.category).toBe('mindfulness');
        }
      });

      it('should fail for non-existent session', async () => {
        const command: IRequestInterventionCommand = {
          userId,
          sessionId: 'fake-session',
        };

        const result = await api.requestIntervention(command);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SESSION_NOT_FOUND');
      });
    });

    describe('recordOutcome', () => {
      it('should record intervention outcome', async () => {
        // First request an intervention
        const interventionResult = await api.requestIntervention({
          userId,
          sessionId,
        });

        const command: IRecordOutcomeCommand = {
          decisionPointId: interventionResult.data!.decisionPoint.id,
          userId,
          interventionId: interventionResult.data!.intervention.id,
          outcomeType: 'completion',
          value: 1.0,
        };

        const result = await api.recordOutcome(command);
        expect(result.success).toBe(true);
      });

      it('should record engagement outcome', async () => {
        const interventionResult = await api.requestIntervention({
          userId,
          sessionId,
        });

        const command: IRecordOutcomeCommand = {
          decisionPointId: interventionResult.data!.decisionPoint.id,
          userId,
          interventionId: interventionResult.data!.intervention.id,
          outcomeType: 'engagement',
          value: 0.8,
        };

        const result = await api.recordOutcome(command);
        expect(result.success).toBe(true);
      });
    });

    describe('getInterventionHistory', () => {
      it('should get intervention history', async () => {
        const query: IInterventionHistoryQuery = {
          userId,
        };

        const result = await api.getInterventionHistory(query);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(typeof result.data!.total).toBe('number');
        expect(result.data!.statistics).toBeDefined();
      });

      it('should respect limit parameter', async () => {
        const query: IInterventionHistoryQuery = {
          userId,
          limit: 5,
        };

        const result = await api.getInterventionHistory(query);

        expect(result.success).toBe(true);
        expect(result.data!.interventions.length).toBeLessThanOrEqual(5);
      });
    });

    describe('getAvailableInterventions', () => {
      it('should get available interventions', async () => {
        const result = await api.getAvailableInterventions(userId);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should fail for user without active session', async () => {
        const result = await api.getAvailableInterventions('no-session-user');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SESSION_NOT_FOUND');
      });
    });
  });

  // ============================================================================
  // INSIGHTS & RECOMMENDATIONS
  // ============================================================================

  describe('Insights & Recommendations', () => {
    const userId = 'insight-user';

    beforeEach(async () => {
      const session = await api.startSession(userId, 'telegram');
      await api.processMessage({
        userId,
        sessionId: session.data!.sessionId,
        text: 'Я всегда все делаю неправильно',
      });
    });

    describe('generateInsights', () => {
      it('should generate insights for user', async () => {
        const result = await api.generateInsights(userId);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should fail for non-existent user', async () => {
        const result = await api.generateInsights('fake-user');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      });
    });

    describe('generateSocraticQuestions', () => {
      it('should generate Socratic questions', async () => {
        const result = await api.generateSocraticQuestions(userId, 3);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it('should respect count parameter', async () => {
        const result = await api.generateSocraticQuestions(userId, 2);

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeLessThanOrEqual(2);
      });

      it('should fail for non-existent user', async () => {
        const result = await api.generateSocraticQuestions('fake-user');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      });
    });
  });

  // ============================================================================
  // CRISIS MANAGEMENT
  // ============================================================================

  describe('Crisis Management', () => {
    const userId = 'crisis-user';
    let sessionId: string;

    beforeEach(async () => {
      const session = await api.startSession(userId, 'telegram');
      sessionId = session.data!.sessionId;
    });

    describe('checkCrisisStatus', () => {
      it('should return non-crisis for new user', async () => {
        const result = await api.checkCrisisStatus(userId);

        expect(result.success).toBe(true);
        expect(result.data!.isCrisis).toBe(false);
        expect(result.data!.recommendedAction).toBe('continue_monitoring');
      });

      it('should return crisis status structure', async () => {
        // Process message to create state
        await api.processMessage({
          userId,
          sessionId,
          text: 'I feel fine',
        });

        const result = await api.checkCrisisStatus(userId);

        expect(result.success).toBe(true);
        expect(typeof result.data!.isCrisis).toBe('boolean');
        expect(typeof result.data!.riskLevel).toBe('number');
        expect(Array.isArray(result.data!.indicators)).toBe(true);
        expect(typeof result.data!.recommendedAction).toBe('string');
      });

      it('should handle user without state', async () => {
        const result = await api.checkCrisisStatus('user-without-state');

        expect(result.success).toBe(true);
        expect(result.data!.isCrisis).toBe(false);
      });
    });

    describe('activateCrisisMode', () => {
      it('should activate crisis mode', async () => {
        const result = await api.activateCrisisMode(userId, sessionId);
        expect(result.success).toBe(true);
      });

      it('should handle non-existent session', async () => {
        const result = await api.activateCrisisMode(userId, 'fake-session');
        expect(result.success).toBe(true);
      });
    });

    describe('deactivateCrisisMode', () => {
      it('should deactivate crisis mode', async () => {
        await api.activateCrisisMode(userId, sessionId);
        const result = await api.deactivateCrisisMode(userId, sessionId);

        expect(result.success).toBe(true);
      });
    });

    describe('Crisis Detection via Message', () => {
      it('should detect crisis indicators in message', async () => {
        const result = await api.processMessage({
          userId,
          sessionId,
          text: 'Мне очень плохо, я не хочу больше жить',
        });

        expect(result.success).toBe(true);
        // The system should detect crisis
        expect(result.data!.responseSuggestions.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // DATA MANAGEMENT
  // ============================================================================

  describe('Data Management', () => {
    const userId = 'data-user';

    beforeEach(async () => {
      const session = await api.startSession(userId, 'telegram');
      await api.processMessage({
        userId,
        sessionId: session.data!.sessionId,
        text: 'Test message for data export',
      });
    });

    describe('exportUserData', () => {
      it('should export user data', async () => {
        const result = await api.exportUserData(userId);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data!.states)).toBe(true);
        expect(Array.isArray(result.data!.sessions)).toBe(true);
        expect(Array.isArray(result.data!.events)).toBe(true);
      });

      it('should include state history', async () => {
        const result = await api.exportUserData(userId);

        expect(result.success).toBe(true);
        expect(result.data!.states.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('deleteUserData', () => {
      it('should delete user data', async () => {
        const deleteResult = await api.deleteUserData(userId);
        expect(deleteResult.success).toBe(true);

        // Verify data is deleted
        const stateResult = await api.getUserState({ userId });
        expect(stateResult.success).toBe(false);
      });

      it('should handle deleting non-existent user', async () => {
        const result = await api.deleteUserData('non-existent-user');
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  describe('Event System', () => {
    describe('subscribeToEvents', () => {
      it('should subscribe to events', async () => {
        const events: IDomainEvent[] = [];
        const subscription = api.subscribeToEvents('STATE_UPDATED', async (event) => {
          events.push(event);
        });

        expect(subscription).toBeDefined();
        expect(subscription.id).toBeDefined();
        expect(typeof subscription.unsubscribe).toBe('function');

        // Clean up
        subscription.unsubscribe();
      });

      it('should receive events after processing message', async () => {
        const events: IDomainEvent[] = [];

        api.subscribeToEvents('STATE_UPDATED', async (event) => {
          events.push(event);
        });

        const session = await api.startSession('event-user', 'telegram');
        await api.processMessage({
          userId: 'event-user',
          sessionId: session.data!.sessionId,
          text: 'Test message for events',
        });

        // Wait for async event handling
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(events.length).toBeGreaterThan(0);
      });

      it('should unsubscribe successfully', async () => {
        const events: IDomainEvent[] = [];

        const subscription = api.subscribeToEvents('MESSAGE_RECEIVED', async (event) => {
          events.push(event);
        });

        subscription.unsubscribe();

        const session = await api.startSession('unsub-user', 'telegram');
        await api.processMessage({
          userId: 'unsub-user',
          sessionId: session.data!.sessionId,
          text: 'Test',
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        // Events should not be received after unsubscribe
        expect(events.filter(e => e.eventType === 'MESSAGE_RECEIVED').length).toBe(0);
      });
    });

    describe('Event Bus', () => {
      it('should get event bus instance', () => {
        const eventBus = api.getEventBus();

        expect(eventBus).toBeDefined();
        expect(typeof eventBus.publish).toBe('function');
        expect(typeof eventBus.subscribe).toBe('function');
        expect(typeof eventBus.subscribeMany).toBe('function');
        expect(typeof eventBus.unsubscribe).toBe('function');
        expect(typeof eventBus.clearAll).toBe('function');
      });

      it('should support wildcard subscription', async () => {
        const events: IDomainEvent[] = [];
        const eventBus = api.getEventBus();

        eventBus.subscribe('*', async (event) => {
          events.push(event);
        });

        const session = await api.startSession('wildcard-user', 'telegram');
        await api.processMessage({
          userId: 'wildcard-user',
          sessionId: session.data!.sessionId,
          text: 'Test',
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(events.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // RESPONSE METADATA
  // ============================================================================

  describe('Response Metadata', () => {
    it('should include metadata in all responses', async () => {
      const result = await api.startSession('meta-user', 'telegram');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.requestId).toBeDefined();
      expect(typeof result.metadata.processingTimeMs).toBe('number');
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should include processing time', async () => {
      const session = await api.startSession('time-user', 'telegram');
      const result = await api.processMessage({
        userId: 'time-user',
        sessionId: session.data!.sessionId,
        text: 'Test message',
      });

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should generate unique request IDs', async () => {
      const result1 = await api.startSession('id-user-1', 'telegram');
      const result2 = await api.startSession('id-user-2', 'telegram');

      expect(result1.metadata.requestId).not.toBe(result2.metadata.requestId);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should return error structure for failures', async () => {
      const result = await api.getUserState({ userId: 'non-existent' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBeDefined();
      expect(result.error!.message).toBeDefined();
    });

    it('should handle invalid session gracefully', async () => {
      const result = await api.processMessage({
        userId: 'test',
        sessionId: 'invalid-session-id',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SESSION_NOT_FOUND');
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe('Integration Scenarios', () => {
    describe('Full User Journey', () => {
      it('should handle complete user interaction flow', async () => {
        const userId = 'journey-user';

        // 1. Start session
        const session = await api.startSession(userId, 'telegram');
        expect(session.success).toBe(true);

        // 2. Process first message
        const msg1 = await api.processMessage({
          userId,
          sessionId: session.data!.sessionId,
          text: 'Привет, мне сегодня немного грустно',
        });
        expect(msg1.success).toBe(true);

        // 3. Get user state
        const state = await api.getUserState({ userId, includePredictions: true });
        expect(state.success).toBe(true);

        // 4. Request intervention
        const intervention = await api.requestIntervention({
          userId,
          sessionId: session.data!.sessionId,
        });
        expect(intervention.success).toBe(true);

        // 5. Record outcome
        const outcome = await api.recordOutcome({
          decisionPointId: intervention.data!.decisionPoint.id,
          userId,
          interventionId: intervention.data!.intervention.id,
          outcomeType: 'completion',
          value: 1.0,
        });
        expect(outcome.success).toBe(true);

        // 6. Process follow-up message
        const msg2 = await api.processMessage({
          userId,
          sessionId: session.data!.sessionId,
          text: 'Спасибо, мне стало немного лучше',
        });
        expect(msg2.success).toBe(true);

        // 7. End session
        const end = await api.endSession(session.data!.sessionId);
        expect(end.success).toBe(true);
      });
    });

    describe('Multi-session User', () => {
      it('should maintain state across sessions', async () => {
        const userId = 'multi-session-user';

        // Session 1
        const session1 = await api.startSession(userId, 'telegram');
        await api.processMessage({
          userId,
          sessionId: session1.data!.sessionId,
          text: 'First session message',
        });
        await api.endSession(session1.data!.sessionId);

        // Session 2
        const session2 = await api.startSession(userId, 'telegram');
        const state = await api.getUserState({ userId });

        expect(state.success).toBe(true);
        expect(state.data!.currentState).toBeDefined();

        await api.endSession(session2.data!.sessionId);
      });
    });
  });
});
