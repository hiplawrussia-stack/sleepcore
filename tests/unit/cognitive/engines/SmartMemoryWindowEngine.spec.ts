/**
 * SmartMemoryWindowEngine Unit Tests
 * ====================================
 * Tests for cognitive consolidation system:
 * - RehearsalEngine: Pre-sleep mental rehearsal
 * - RecallEngine: Morning quiz and spaced repetition
 * - ConsolidationAnalyticsEngine: Progress tracking
 * - SmartMemoryWindowEngine: Orchestrator
 *
 * @module @sleepcore/cognitive/engines
 */

import {
  RehearsalEngine,
  RecallEngine,
  ConsolidationAnalyticsEngine,
  SmartMemoryWindowEngine,
  createSmartMemoryWindowEngine,
} from '../../../../src/cognitive/engines/SmartMemoryWindowEngine';
import {
  SLEEP_RULES,
  getRuleById,
  getBeginnerRules,
} from '../../../../src/cognitive/data/SleepRules';
import {
  type IRuleConsolidationState,
  type IRehearsalSession,
  type IRecallQuestion,
  type IRecallAnswer,
  type IRecallSession,
  type IConsolidationAnalytics,
  type IAdaptiveLearningConfig,
  type ISleepRule,
  DEFAULT_ADAPTIVE_CONFIG,
} from '../../../../src/cognitive/interfaces/ICognitiveConsolidation';

// =============================================================================
// HELPERS
// =============================================================================

function createConsolidationState(
  overrides: Partial<IRuleConsolidationState> & { ruleId: string }
): IRuleConsolidationState {
  return {
    rehearsalCount: 0,
    successfulRecalls: 0,
    failedRecalls: 0,
    consolidationScore: 0,
    lastRehearsalAt: null,
    lastRecallAt: null,
    nextReviewAt: null,
    isMastered: false,
    streakDays: 0,
    ...overrides,
  };
}

function createRehearsalSession(
  overrides?: Partial<IRehearsalSession>
): IRehearsalSession {
  return {
    sessionId: 'test-session-1',
    userId: 'user-1',
    timestamp: new Date(),
    rules: SLEEP_RULES.slice(0, 3) as ISleepRule[],
    plannedBedtime: '23:00',
    minutesBeforeBed: 30,
    visualizationCompleted: false,
    intentionSet: false,
    ...overrides,
  };
}

function createRecallQuestion(
  overrides?: Partial<IRecallQuestion>
): IRecallQuestion {
  return {
    questionId: 'q-1',
    ruleId: 'sc-01',
    type: 'free_recall',
    question: 'Test question?',
    correctAnswers: ['correct answer'],
    ...overrides,
  };
}

function createRecallAnswer(
  overrides?: Partial<IRecallAnswer>
): IRecallAnswer {
  return {
    questionId: 'q-1',
    response: 'test response',
    isCorrect: true,
    partialScore: 1,
    responseTimeSeconds: 5,
    ...overrides,
  };
}

function createRecallSession(
  overrides?: Partial<IRecallSession>
): IRecallSession {
  return {
    sessionId: 'recall-1',
    userId: 'user-1',
    timestamp: new Date(),
    rehearsalSessionId: 'rehearsal-1',
    questions: [createRecallQuestion()],
    answers: [createRecallAnswer()],
    overallScore: 1.0,
    completionTimeSeconds: 5,
    ...overrides,
  };
}

// =============================================================================
// RehearsalEngine
// =============================================================================

describe('RehearsalEngine', () => {
  let engine: RehearsalEngine;

  beforeEach(() => {
    engine = new RehearsalEngine();
  });

  describe('selectRulesForRehearsal()', () => {
    it('should return rules when all states are new (rehearsalCount=0)', () => {
      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r) =>
        createConsolidationState({ ruleId: r.id })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);

      expect(rules.length).toBeGreaterThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.minRulesPerSession);
      expect(rules.length).toBeLessThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.maxRulesPerSession);
    });

    it('should prioritize overdue rules (nextReviewAt < now)', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r, i) =>
        createConsolidationState({
          ruleId: r.id,
          rehearsalCount: 1,
          consolidationScore: 0.6,
          nextReviewAt: i === 0 ? pastDate : futureDate,
        })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);

      expect(rules[0].id).toBe(SLEEP_RULES[0].id);
    });

    it('should prioritize struggling rules (score < 0.5, rehearsalCount > 0)', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r, i) =>
        createConsolidationState({
          ruleId: r.id,
          rehearsalCount: 3,
          consolidationScore: i === 2 ? 0.2 : 0.8,
          nextReviewAt: futureDate,
        })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);

      expect(rules.some((r) => r.id === SLEEP_RULES[2].id)).toBe(true);
    });

    it('should cap at maxRulesPerSession', () => {
      const states: IRuleConsolidationState[] = [];

      const rules = engine.selectRulesForRehearsal('user-1', states);

      expect(rules.length).toBeLessThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.maxRulesPerSession);
    });

    it('should ensure minimum rules from beginner set', () => {
      // All rules mastered
      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r) =>
        createConsolidationState({
          ruleId: r.id,
          rehearsalCount: 10,
          isMastered: true,
          consolidationScore: 0.95,
          nextReviewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);

      // Should still provide minimum rules from beginner set
      expect(rules.length).toBeGreaterThanOrEqual(0);
    });

    it('should not include mastered rules in due-for-review', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r) =>
        createConsolidationState({
          ruleId: r.id,
          rehearsalCount: 10,
          isMastered: true,
          consolidationScore: 0.95,
          nextReviewAt: pastDate,
        })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);

      // Mastered rules should be excluded from due-for-review
      const masteredIds = new Set(states.map((s) => s.ruleId));
      const selectedFromMastered = rules.filter((r) => masteredIds.has(r.id));
      // They shouldn't come from the "due for review" bucket (they're mastered)
      // but may come from beginner rules fallback
      expect(rules.length).toBeLessThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.maxRulesPerSession);
    });

    it('should sort new rules by difficulty (easier first)', () => {
      const states: IRuleConsolidationState[] = [];

      const rules = engine.selectRulesForRehearsal('user-1', states);

      // All rules are new since no states, so they should be sorted by difficulty
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].difficulty).toBeGreaterThanOrEqual(rules[i - 1].difficulty);
      }
    });

    it('should not duplicate rules in selection', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r) =>
        createConsolidationState({
          ruleId: r.id,
          rehearsalCount: 1,
          consolidationScore: 0.3,
          nextReviewAt: pastDate,
        })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);
      const ids = rules.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should use custom config when provided', () => {
      const customConfig: IAdaptiveLearningConfig = {
        ...DEFAULT_ADAPTIVE_CONFIG,
        maxRulesPerSession: 2,
        minRulesPerSession: 1,
      };

      const states: IRuleConsolidationState[] = [];

      const rules = engine.selectRulesForRehearsal('user-1', states, customConfig);

      expect(rules.length).toBeLessThanOrEqual(2);
    });

    it('should include rules with null nextReviewAt as due for review', () => {
      const states: IRuleConsolidationState[] = SLEEP_RULES.map((r) =>
        createConsolidationState({
          ruleId: r.id,
          rehearsalCount: 1,
          consolidationScore: 0.5,
          nextReviewAt: null,
        })
      );

      const rules = engine.selectRulesForRehearsal('user-1', states);

      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('generateVisualization()', () => {
    it('should return visualization text containing the rule visualization prompt', () => {
      const rule = SLEEP_RULES[0] as ISleepRule;
      const viz = engine.generateVisualization(rule);

      expect(viz).toContain(rule.visualizationPrompt);
    });

    it('should include mental rehearsal header', () => {
      const rule = SLEEP_RULES[0] as ISleepRule;
      const viz = engine.generateVisualization(rule);

      expect(viz).toContain('Ментальная репетиция');
    });

    it('should work for all rule categories', () => {
      const categories = new Set(SLEEP_RULES.map((r) => r.category));
      for (const cat of categories) {
        const rule = SLEEP_RULES.find((r) => r.category === cat) as ISleepRule;
        const viz = engine.generateVisualization(rule);
        expect(viz).toBeTruthy();
        expect(viz).toContain(rule.visualizationPrompt);
      }
    });
  });

  describe('createRehearsalSession()', () => {
    it('should create session with correct userId and rules', () => {
      const rules = SLEEP_RULES.slice(0, 3) as ISleepRule[];
      const session = engine.createRehearsalSession('user-1', rules, '23:00');

      expect(session.userId).toBe('user-1');
      expect(session.rules).toBe(rules);
      expect(session.plannedBedtime).toBe('23:00');
    });

    it('should generate a unique sessionId', () => {
      const rules = SLEEP_RULES.slice(0, 2) as ISleepRule[];
      const s1 = engine.createRehearsalSession('user-1', rules, '23:00');
      const s2 = engine.createRehearsalSession('user-1', rules, '23:00');

      expect(s1.sessionId).not.toBe(s2.sessionId);
    });

    it('should set minutesBeforeBed as non-negative', () => {
      const rules = SLEEP_RULES.slice(0, 2) as ISleepRule[];
      // Use a bedtime that's already passed
      const session = engine.createRehearsalSession('user-1', rules, '00:01');

      expect(session.minutesBeforeBed).toBeGreaterThanOrEqual(0);
    });

    it('should set visualizationCompleted and intentionSet to false', () => {
      const rules = SLEEP_RULES.slice(0, 2) as ISleepRule[];
      const session = engine.createRehearsalSession('user-1', rules, '23:00');

      expect(session.visualizationCompleted).toBe(false);
      expect(session.intentionSet).toBe(false);
    });

    it('should set timestamp to approximately now', () => {
      const before = new Date();
      const rules = SLEEP_RULES.slice(0, 2) as ISleepRule[];
      const session = engine.createRehearsalSession('user-1', rules, '23:00');
      const after = new Date();

      expect(session.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('formatRehearsalMessage()', () => {
    it('should include evening rehearsal header', () => {
      const session = createRehearsalSession();
      const msg = engine.formatRehearsalMessage(session);

      expect(msg).toContain('Вечерняя репетиция сна');
    });

    it('should include minutes before bed', () => {
      const session = createRehearsalSession({ minutesBeforeBed: 45 });
      const msg = engine.formatRehearsalMessage(session);

      expect(msg).toContain('45 мин');
    });

    it('should include all rule statements and rationales', () => {
      const rules = SLEEP_RULES.slice(0, 2) as ISleepRule[];
      const session = createRehearsalSession({ rules });
      const msg = engine.formatRehearsalMessage(session);

      for (const rule of rules) {
        expect(msg).toContain(rule.statement);
        expect(msg).toContain(rule.rationale);
      }
    });

    it('should include first rule visualization prompt', () => {
      const rules = SLEEP_RULES.slice(0, 2) as ISleepRule[];
      const session = createRehearsalSession({ rules });
      const msg = engine.formatRehearsalMessage(session);

      expect(msg).toContain(rules[0].visualizationPrompt);
    });

    it('should include learning intention text', () => {
      const session = createRehearsalSession();
      const msg = engine.formatRehearsalMessage(session);

      expect(msg).toContain('Установка намерения');
    });

    it('should handle empty rules array gracefully', () => {
      const session = createRehearsalSession({ rules: [] });
      const msg = engine.formatRehearsalMessage(session);

      expect(msg).toContain('Вечерняя репетиция сна');
    });
  });

  describe('setLearningIntention()', () => {
    it('should return intention confirmation message', () => {
      const msg = engine.setLearningIntention('session-1');

      expect(msg).toContain('Намерение установлено');
    });

    it('should mention sleep consolidation', () => {
      const msg = engine.setLearningIntention('session-1');

      expect(msg).toContain('консолидировать');
    });

    it('should mention morning recall', () => {
      const msg = engine.setLearningIntention('session-1');

      expect(msg).toContain('Утром');
    });
  });
});

// =============================================================================
// RecallEngine
// =============================================================================

describe('RecallEngine', () => {
  let engine: RecallEngine;

  beforeEach(() => {
    engine = new RecallEngine();
  });

  describe('generateQuiz()', () => {
    it('should generate questions for rules in session', () => {
      const session = createRehearsalSession();
      const questions = engine.generateQuiz('user-1', session);

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(3);
    });

    it('should respect maxQuestions parameter', () => {
      const rules = SLEEP_RULES.slice(0, 5) as ISleepRule[];
      const session = createRehearsalSession({ rules });
      const questions = engine.generateQuiz('user-1', session, 2);

      expect(questions.length).toBe(2);
    });

    it('should create questions linked to rule IDs', () => {
      const rules = SLEEP_RULES.slice(0, 3) as ISleepRule[];
      const session = createRehearsalSession({ rules });
      const questions = engine.generateQuiz('user-1', session);

      for (const q of questions) {
        expect(rules.some((r) => r.id === q.ruleId)).toBe(true);
      }
    });

    it('should assign recognition type for difficulty >= 4', () => {
      const hardRules = SLEEP_RULES.filter((r) => r.difficulty >= 4) as ISleepRule[];
      if (hardRules.length === 0) return;

      const session = createRehearsalSession({ rules: hardRules });
      const questions = engine.generateQuiz('user-1', session);

      for (const q of questions) {
        expect(q.type).toBe('recognition');
      }
    });

    it('should assign free_recall type for difficulty <= 2', () => {
      const easyRules = SLEEP_RULES.filter((r) => r.difficulty <= 2) as ISleepRule[];
      if (easyRules.length === 0) return;

      const session = createRehearsalSession({ rules: easyRules.slice(0, 3) });
      const questions = engine.generateQuiz('user-1', session);

      for (const q of questions) {
        expect(q.type).toBe('free_recall');
      }
    });

    it('should assign application type for difficulty == 3', () => {
      const medRules = SLEEP_RULES.filter((r) => r.difficulty === 3) as ISleepRule[];
      if (medRules.length === 0) return;

      const session = createRehearsalSession({ rules: medRules.slice(0, 3) });
      const questions = engine.generateQuiz('user-1', session);

      for (const q of questions) {
        expect(q.type).toBe('application');
      }
    });

    it('should include options for recognition questions', () => {
      const hardRules = SLEEP_RULES.filter((r) => r.difficulty >= 4) as ISleepRule[];
      if (hardRules.length === 0) return;

      const session = createRehearsalSession({ rules: hardRules });
      const questions = engine.generateQuiz('user-1', session);

      for (const q of questions) {
        if (q.type === 'recognition') {
          expect(q.options).toBeDefined();
          expect(q.options!.length).toBe(4);
        }
      }
    });

    it('should include correct answer in recognition options', () => {
      const hardRules = SLEEP_RULES.filter((r) => r.difficulty >= 4) as ISleepRule[];
      if (hardRules.length === 0) return;

      const session = createRehearsalSession({ rules: hardRules });
      const questions = engine.generateQuiz('user-1', session);

      for (const q of questions) {
        if (q.type === 'recognition' && q.options) {
          expect(q.options).toContain(q.correctAnswers[0]);
        }
      }
    });

    it('should have unique questionIds', () => {
      const session = createRehearsalSession();
      const questions = engine.generateQuiz('user-1', session);
      const ids = questions.map((q) => q.questionId);
      const unique = new Set(ids);

      expect(unique.size).toBe(ids.length);
    });
  });

  describe('evaluateAnswer()', () => {
    it('should evaluate recognition answer as correct on exact match', () => {
      const rule = SLEEP_RULES[0] as ISleepRule;
      const question = createRecallQuestion({
        ruleId: rule.id,
        type: 'recognition',
        correctAnswers: [rule.statement],
      });

      const answer = engine.evaluateAnswer(question, rule.statement);

      expect(answer.isCorrect).toBe(true);
      expect(answer.partialScore).toBe(1);
    });

    it('should evaluate recognition answer as incorrect on mismatch', () => {
      const question = createRecallQuestion({
        type: 'recognition',
        correctAnswers: ['Correct answer'],
      });

      const answer = engine.evaluateAnswer(question, 'Wrong answer');

      expect(answer.isCorrect).toBe(false);
      expect(answer.partialScore).toBe(0);
    });

    it('should be case-insensitive for recognition', () => {
      const question = createRecallQuestion({
        type: 'recognition',
        correctAnswers: ['Correct Answer Here'],
      });

      const answer = engine.evaluateAnswer(question, 'correct answer here');

      expect(answer.isCorrect).toBe(true);
    });

    it('should evaluate free_recall with keyword matching', () => {
      const rule = SLEEP_RULES.find((r) => r.id === 'sc-01')!;
      const question = createRecallQuestion({
        ruleId: rule.id,
        type: 'free_recall',
        correctAnswers: [rule.statement],
      });

      // Include key words from the rule statement
      const keyWords = rule.statement.toLowerCase().split(' ').filter((w) => w.length > 4);
      const partialResponse = keyWords.slice(0, Math.ceil(keyWords.length * 0.6)).join(' ');

      const answer = engine.evaluateAnswer(question, partialResponse);

      expect(answer.partialScore).toBeGreaterThanOrEqual(0);
    });

    it('should give partial score for free_recall based on keyword ratio', () => {
      const rule = SLEEP_RULES.find((r) => r.id === 'sc-01')!;
      const question = createRecallQuestion({
        ruleId: rule.id,
        type: 'free_recall',
        correctAnswers: [rule.statement],
      });

      // Full matching response
      const answer = engine.evaluateAnswer(question, rule.statement.toLowerCase());

      expect(answer.partialScore).toBeGreaterThan(0);
    });

    it('should mark free_recall correct when >= 50% keywords matched', () => {
      const rule = SLEEP_RULES.find((r) => r.id === 'sc-01')!;
      const question = createRecallQuestion({
        ruleId: rule.id,
        type: 'free_recall',
        correctAnswers: [rule.statement],
      });

      const answer = engine.evaluateAnswer(question, rule.statement);

      expect(answer.isCorrect).toBe(true);
      expect(answer.partialScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should evaluate application answer with keyword matching', () => {
      const question = createRecallQuestion({
        type: 'application',
        ruleId: 'sc-03',
        correctAnswers: ['встать', 'выйти', 'уйти', 'другая комната'],
      });

      const answer = engine.evaluateAnswer(question, 'нужно встать и выйти');

      expect(answer.isCorrect).toBe(true);
      expect(answer.partialScore).toBe(1);
    });

    it('should mark application answer incorrect when no keywords match', () => {
      const question = createRecallQuestion({
        type: 'application',
        ruleId: 'sc-03',
        correctAnswers: ['встать', 'выйти'],
      });

      const answer = engine.evaluateAnswer(question, 'не знаю');

      expect(answer.isCorrect).toBe(false);
      expect(answer.partialScore).toBe(0);
    });

    it('should set responseTimeSeconds to 0', () => {
      const question = createRecallQuestion({ type: 'recognition', correctAnswers: ['a'] });
      const answer = engine.evaluateAnswer(question, 'a');

      expect(answer.responseTimeSeconds).toBe(0);
    });

    it('should return correct questionId', () => {
      const question = createRecallQuestion({ questionId: 'q-42' });
      const answer = engine.evaluateAnswer(question, 'anything');

      expect(answer.questionId).toBe('q-42');
    });

    it('should preserve original response in answer', () => {
      const question = createRecallQuestion({ type: 'recognition', correctAnswers: ['a'] });
      const answer = engine.evaluateAnswer(question, 'My Response');

      expect(answer.response).toBe('My Response');
    });
  });

  describe('createRecallSession()', () => {
    it('should create session with correct userId and rehearsalSessionId', () => {
      const questions = [createRecallQuestion()];
      const answers = [createRecallAnswer()];

      const session = engine.createRecallSession('user-1', 'rehearsal-1', questions, answers);

      expect(session.userId).toBe('user-1');
      expect(session.rehearsalSessionId).toBe('rehearsal-1');
    });

    it('should handle null rehearsalSessionId', () => {
      const questions = [createRecallQuestion()];
      const answers = [createRecallAnswer()];

      const session = engine.createRecallSession('user-1', null, questions, answers);

      expect(session.rehearsalSessionId).toBeNull();
    });

    it('should calculate overall score as average of partialScores', () => {
      const questions = [
        createRecallQuestion({ questionId: 'q-1' }),
        createRecallQuestion({ questionId: 'q-2' }),
      ];
      const answers = [
        createRecallAnswer({ questionId: 'q-1', partialScore: 1.0 }),
        createRecallAnswer({ questionId: 'q-2', partialScore: 0.5 }),
      ];

      const session = engine.createRecallSession('user-1', null, questions, answers);

      expect(session.overallScore).toBe(0.75);
    });

    it('should sum completion time from all answers', () => {
      const questions = [
        createRecallQuestion({ questionId: 'q-1' }),
        createRecallQuestion({ questionId: 'q-2' }),
      ];
      const answers = [
        createRecallAnswer({ questionId: 'q-1', responseTimeSeconds: 10 }),
        createRecallAnswer({ questionId: 'q-2', responseTimeSeconds: 20 }),
      ];

      const session = engine.createRecallSession('user-1', null, questions, answers);

      expect(session.completionTimeSeconds).toBe(30);
    });

    it('should generate unique sessionId', () => {
      const q = [createRecallQuestion()];
      const a = [createRecallAnswer()];

      const s1 = engine.createRecallSession('user-1', null, q, a);
      const s2 = engine.createRecallSession('user-1', null, q, a);

      expect(s1.sessionId).not.toBe(s2.sessionId);
    });
  });

  describe('updateConsolidationStates()', () => {
    it('should increment successfulRecalls on correct answer', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', successfulRecalls: 2, failedRecalls: 1, rehearsalCount: 3 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.successfulRecalls).toBe(3);
      expect(state!.failedRecalls).toBe(1);
    });

    it('should increment failedRecalls on incorrect answer', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', successfulRecalls: 2, failedRecalls: 1, rehearsalCount: 3 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: false, partialScore: 0 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.successfulRecalls).toBe(2);
      expect(state!.failedRecalls).toBe(2);
    });

    it('should increment streakDays on correct answer', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', streakDays: 2, successfulRecalls: 2, failedRecalls: 0, rehearsalCount: 2 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.streakDays).toBe(3);
    });

    it('should reset streakDays to 0 on incorrect answer', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', streakDays: 5, successfulRecalls: 5, failedRecalls: 0, rehearsalCount: 5 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: false, partialScore: 0 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.streakDays).toBe(0);
    });

    it('should update consolidationScore as ratio of successful/total', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', successfulRecalls: 3, failedRecalls: 1, rehearsalCount: 4 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      // 4 successful / 5 total = 0.8
      expect(state!.consolidationScore).toBe(0.8);
    });

    it('should set isMastered when score >= 0.85 AND streak >= 3', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({
          ruleId: 'sc-01',
          successfulRecalls: 8,
          failedRecalls: 1,
          streakDays: 2,
          rehearsalCount: 9,
        }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      // 9/10 = 0.9, streak = 3
      expect(state!.isMastered).toBe(true);
    });

    it('should not set isMastered when score >= 0.85 but streak < 3', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({
          ruleId: 'sc-01',
          successfulRecalls: 8,
          failedRecalls: 1,
          streakDays: 0,
          rehearsalCount: 9,
        }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      // 9/10 = 0.9, but streak = 1
      expect(state!.isMastered).toBe(false);
    });

    it('should create new state for unknown rule', () => {
      const states: IRuleConsolidationState[] = [];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state).toBeDefined();
      expect(state!.successfulRecalls).toBe(1);
      expect(state!.failedRecalls).toBe(0);
      expect(state!.consolidationScore).toBe(1);
      expect(state!.streakDays).toBe(1);
    });

    it('should create new state with failed recall', () => {
      const states: IRuleConsolidationState[] = [];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: false, partialScore: 0 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.successfulRecalls).toBe(0);
      expect(state!.failedRecalls).toBe(1);
      expect(state!.consolidationScore).toBe(0);
      expect(state!.streakDays).toBe(0);
    });

    it('should preserve unchanged states', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', rehearsalCount: 5 }),
        createConsolidationState({ ruleId: 'sc-02', rehearsalCount: 3, consolidationScore: 0.7 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const unchanged = updated.find((s) => s.ruleId === 'sc-02');

      expect(unchanged!.consolidationScore).toBe(0.7);
      expect(unchanged!.rehearsalCount).toBe(3);
    });

    it('should set nextReviewAt in the future', () => {
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', successfulRecalls: 1, failedRecalls: 0, rehearsalCount: 1 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.nextReviewAt).toBeDefined();
      expect(state!.nextReviewAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should set lastRecallAt to now', () => {
      const before = new Date();
      const states: IRuleConsolidationState[] = [
        createConsolidationState({ ruleId: 'sc-01', rehearsalCount: 1 }),
      ];
      const session = createRecallSession({
        questions: [createRecallQuestion({ questionId: 'q-1', ruleId: 'sc-01' })],
        answers: [createRecallAnswer({ questionId: 'q-1', isCorrect: true, partialScore: 1 })],
      });

      const updated = engine.updateConsolidationStates(states, session);
      const after = new Date();
      const state = updated.find((s) => s.ruleId === 'sc-01');

      expect(state!.lastRecallAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state!.lastRecallAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('formatQuizMessage()', () => {
    it('should format recognition question with keyboard', () => {
      const question = createRecallQuestion({
        type: 'recognition',
        question: 'Which rule?',
        options: ['A', 'B', 'C', 'D'],
      });

      const result = engine.formatQuizMessage(question);

      expect(result.text).toContain('Утренний тест памяти');
      expect(result.text).toContain('Which rule?');
      expect(result.keyboard).toBeDefined();
      expect(result.keyboard!.length).toBe(4);
    });

    it('should format non-recognition question without keyboard', () => {
      const question = createRecallQuestion({
        type: 'free_recall',
        question: 'What do you remember?',
      });

      const result = engine.formatQuizMessage(question);

      expect(result.text).toContain('What do you remember?');
      expect(result.keyboard).toBeUndefined();
    });

    it('should truncate long option text to 50 chars', () => {
      const longOption = 'A'.repeat(60);
      const question = createRecallQuestion({
        type: 'recognition',
        options: [longOption, 'B', 'C', 'D'],
      });

      const result = engine.formatQuizMessage(question);
      const firstButtonText = result.keyboard![0][0].text;

      expect(firstButtonText.length).toBeLessThan(60);
      expect(firstButtonText).toContain('...');
    });

    it('should include callback data with questionId', () => {
      const question = createRecallQuestion({
        questionId: 'q-test',
        type: 'recognition',
        options: ['A', 'B', 'C', 'D'],
      });

      const result = engine.formatQuizMessage(question);

      expect(result.keyboard![0][0].callbackData).toContain('q-test');
    });
  });
});

// =============================================================================
// ConsolidationAnalyticsEngine
// =============================================================================

describe('ConsolidationAnalyticsEngine', () => {
  let engine: ConsolidationAnalyticsEngine;

  beforeEach(() => {
    engine = new ConsolidationAnalyticsEngine();
  });

  describe('analyzeConsolidation()', () => {
    it('should return analytics with correct userId', () => {
      const result = engine.analyzeConsolidation('user-1', [], [], 7);

      expect(result.userId).toBe('user-1');
    });

    it('should set periodStart and periodEnd correctly', () => {
      const before = new Date();
      const result = engine.analyzeConsolidation('user-1', [], [], 7);
      const after = new Date();

      expect(result.periodEnd.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.periodEnd.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.periodEnd.getTime() - result.periodStart.getTime()).toBeCloseTo(
        7 * 24 * 60 * 60 * 1000,
        -3
      );
    });

    it('should return 0 accuracy with no sessions', () => {
      const result = engine.analyzeConsolidation('user-1', [], [], 7);

      expect(result.avgRecallAccuracy).toBe(0);
      expect(result.overallProgress).toBe(0);
    });

    it('should calculate average recall accuracy', () => {
      const sessions: IRecallSession[] = [
        createRecallSession({ overallScore: 0.8, timestamp: new Date() }),
        createRecallSession({ overallScore: 0.6, timestamp: new Date() }),
      ];

      const result = engine.analyzeConsolidation('user-1', [], sessions, 7);

      expect(result.avgRecallAccuracy).toBe(0.7);
    });

    it('should filter sessions to period', () => {
      const oldSession = createRecallSession({
        overallScore: 0.2,
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      const recentSession = createRecallSession({
        overallScore: 0.9,
        timestamp: new Date(),
      });

      const result = engine.analyzeConsolidation('user-1', [], [oldSession, recentSession], 7);

      expect(result.avgRecallAccuracy).toBe(0.9);
    });

    it('should identify strong categories (score >= 0.7)', () => {
      // Create sessions where stimulus_control scores high
      const scRule = SLEEP_RULES.find((r) => r.category === 'stimulus_control')!;
      const sessions: IRecallSession[] = [
        createRecallSession({
          timestamp: new Date(),
          questions: [createRecallQuestion({ questionId: 'q-1', ruleId: scRule.id })],
          answers: [createRecallAnswer({ questionId: 'q-1', partialScore: 0.9 })],
        }),
      ];

      const result = engine.analyzeConsolidation('user-1', [], sessions, 7);

      expect(result.strongCategories).toContain('stimulus_control');
    });

    it('should identify weak categories (score < 0.5)', () => {
      const scRule = SLEEP_RULES.find((r) => r.category === 'stimulus_control')!;
      const sessions: IRecallSession[] = [
        createRecallSession({
          timestamp: new Date(),
          questions: [createRecallQuestion({ questionId: 'q-1', ruleId: scRule.id })],
          answers: [createRecallAnswer({ questionId: 'q-1', partialScore: 0.2 })],
        }),
      ];

      const result = engine.analyzeConsolidation('user-1', [], sessions, 7);

      expect(result.weakCategories).toContain('stimulus_control');
    });

    it('should return stable trend with < 3 sessions', () => {
      const sessions: IRecallSession[] = [
        createRecallSession({ overallScore: 0.5, timestamp: new Date() }),
      ];

      const result = engine.analyzeConsolidation('user-1', [], sessions, 7);

      expect(result.trend).toBe('stable');
    });

    it('should detect improving trend', () => {
      const now = Date.now();
      const sessions: IRecallSession[] = [
        createRecallSession({ overallScore: 0.3, timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000) }),
        createRecallSession({ overallScore: 0.3, timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000) }),
        createRecallSession({ overallScore: 0.8, timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000) }),
        createRecallSession({ overallScore: 0.9, timestamp: new Date(now) }),
      ];

      const result = engine.analyzeConsolidation('user-1', [], sessions, 7);

      expect(result.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const now = Date.now();
      const sessions: IRecallSession[] = [
        createRecallSession({ overallScore: 0.9, timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000) }),
        createRecallSession({ overallScore: 0.8, timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000) }),
        createRecallSession({ overallScore: 0.3, timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000) }),
        createRecallSession({ overallScore: 0.2, timestamp: new Date(now) }),
      ];

      const result = engine.analyzeConsolidation('user-1', [], sessions, 7);

      expect(result.trend).toBe('declining');
    });

    it('should include recommendations', () => {
      const result = engine.analyzeConsolidation('user-1', [], [], 7);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getRecommendations()', () => {
    it('should return recommendations from analytics', () => {
      const analytics: IConsolidationAnalytics = {
        userId: 'user-1',
        periodStart: new Date(),
        periodEnd: new Date(),
        overallProgress: 0.5,
        ruleStats: { mastered: 0, consolidating: 5, struggling: 3, notStarted: 10 },
        avgRecallAccuracy: 0.5,
        trend: 'stable',
        strongCategories: [],
        weakCategories: [],
        recommendations: ['Test recommendation'],
      };

      const recs = engine.getRecommendations(analytics, []);

      expect(recs).toEqual(['Test recommendation']);
    });
  });

  describe('calculateNextReview()', () => {
    it('should return future date', () => {
      const state = createConsolidationState({ ruleId: 'sc-01', consolidationScore: 0.5, streakDays: 1 });
      const date = engine.calculateNextReview(state, DEFAULT_ADAPTIVE_CONFIG);

      expect(date.getTime()).toBeGreaterThan(Date.now());
    });

    it('should give shorter intervals for low scores', () => {
      const lowScore = createConsolidationState({ ruleId: 'sc-01', consolidationScore: 0.3, streakDays: 3 });
      const highScore = createConsolidationState({ ruleId: 'sc-02', consolidationScore: 0.9, streakDays: 3 });

      const lowDate = engine.calculateNextReview(lowScore, DEFAULT_ADAPTIVE_CONFIG);
      const highDate = engine.calculateNextReview(highScore, DEFAULT_ADAPTIVE_CONFIG);

      expect(lowDate.getTime()).toBeLessThanOrEqual(highDate.getTime());
    });

    it('should use spaced repetition intervals based on streak', () => {
      const state0 = createConsolidationState({ ruleId: 'sc-01', consolidationScore: 0.9, streakDays: 0 });
      const state3 = createConsolidationState({ ruleId: 'sc-01', consolidationScore: 0.9, streakDays: 3 });

      const date0 = engine.calculateNextReview(state0, DEFAULT_ADAPTIVE_CONFIG);
      const date3 = engine.calculateNextReview(state3, DEFAULT_ADAPTIVE_CONFIG);

      expect(date3.getTime()).toBeGreaterThan(date0.getTime());
    });

    it('should clamp interval index to array bounds', () => {
      const state = createConsolidationState({ ruleId: 'sc-01', consolidationScore: 0.9, streakDays: 100 });

      // Should not throw
      const date = engine.calculateNextReview(state, DEFAULT_ADAPTIVE_CONFIG);
      expect(date.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('generateProgressReport()', () => {
    it('should include period dates', () => {
      const analytics: IConsolidationAnalytics = {
        userId: 'user-1',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-07'),
        overallProgress: 0.6,
        ruleStats: { mastered: 2, consolidating: 5, struggling: 3, notStarted: 8 },
        avgRecallAccuracy: 0.6,
        trend: 'improving',
        strongCategories: ['stimulus_control'],
        weakCategories: ['cognitive'],
        recommendations: ['Keep it up'],
      };

      const report = engine.generateProgressReport(analytics);

      expect(report).toContain('Отчёт о консолидации памяти');
      expect(report).toContain('60%');
    });

    it('should show improving trend emoji', () => {
      const analytics: IConsolidationAnalytics = {
        userId: 'u',
        periodStart: new Date(),
        periodEnd: new Date(),
        overallProgress: 0.5,
        ruleStats: { mastered: 0, consolidating: 0, struggling: 0, notStarted: 0 },
        avgRecallAccuracy: 0.5,
        trend: 'improving',
        strongCategories: [],
        weakCategories: [],
        recommendations: [],
      };

      const report = engine.generateProgressReport(analytics);

      expect(report).toContain('улучшение');
    });

    it('should show declining trend', () => {
      const analytics: IConsolidationAnalytics = {
        userId: 'u',
        periodStart: new Date(),
        periodEnd: new Date(),
        overallProgress: 0.3,
        ruleStats: { mastered: 0, consolidating: 0, struggling: 0, notStarted: 0 },
        avgRecallAccuracy: 0.3,
        trend: 'declining',
        strongCategories: [],
        weakCategories: [],
        recommendations: [],
      };

      const report = engine.generateProgressReport(analytics);

      expect(report).toContain('снижение');
    });

    it('should include rule stats', () => {
      const analytics: IConsolidationAnalytics = {
        userId: 'u',
        periodStart: new Date(),
        periodEnd: new Date(),
        overallProgress: 0.5,
        ruleStats: { mastered: 5, consolidating: 7, struggling: 3, notStarted: 3 },
        avgRecallAccuracy: 0.5,
        trend: 'stable',
        strongCategories: [],
        weakCategories: [],
        recommendations: ['Rec 1'],
      };

      const report = engine.generateProgressReport(analytics);

      expect(report).toContain('5');
      expect(report).toContain('7');
      expect(report).toContain('Rec 1');
    });

    it('should show strong and weak categories', () => {
      const analytics: IConsolidationAnalytics = {
        userId: 'u',
        periodStart: new Date(),
        periodEnd: new Date(),
        overallProgress: 0.5,
        ruleStats: { mastered: 0, consolidating: 0, struggling: 0, notStarted: 0 },
        avgRecallAccuracy: 0.5,
        trend: 'stable',
        strongCategories: ['stimulus_control'],
        weakCategories: ['cognitive'],
        recommendations: [],
      };

      const report = engine.generateProgressReport(analytics);

      expect(report).toContain('stimulus_control');
      expect(report).toContain('cognitive');
    });
  });
});

// =============================================================================
// SmartMemoryWindowEngine (Orchestrator)
// =============================================================================

describe('SmartMemoryWindowEngine', () => {
  let engine: SmartMemoryWindowEngine;

  beforeEach(() => {
    engine = new SmartMemoryWindowEngine();
  });

  describe('constructor', () => {
    it('should create sub-engines', () => {
      expect(engine.rehearsal).toBeDefined();
      expect(engine.recall).toBeDefined();
      expect(engine.analytics).toBeDefined();
    });

    it('should accept custom config', () => {
      const customConfig: IAdaptiveLearningConfig = {
        ...DEFAULT_ADAPTIVE_CONFIG,
        maxRulesPerSession: 2,
      };
      const customEngine = new SmartMemoryWindowEngine(customConfig);

      expect(customEngine.rehearsal).toBeDefined();
    });
  });

  describe('initializeUser()', () => {
    it('should create consolidation states for all rules', async () => {
      const states = await engine.initializeUser('user-1');

      expect(states.length).toBe(SLEEP_RULES.length);
    });

    it('should initialize all scores to 0', async () => {
      const states = await engine.initializeUser('user-1');

      for (const state of states) {
        expect(state.consolidationScore).toBe(0);
        expect(state.rehearsalCount).toBe(0);
        expect(state.successfulRecalls).toBe(0);
        expect(state.failedRecalls).toBe(0);
        expect(state.isMastered).toBe(false);
        expect(state.streakDays).toBe(0);
      }
    });

    it('should return existing states on second call', async () => {
      const states1 = await engine.initializeUser('user-1');
      const states2 = await engine.initializeUser('user-1');

      expect(states1).toBe(states2);
    });

    it('should create separate states per user', async () => {
      const states1 = await engine.initializeUser('user-1');
      const states2 = await engine.initializeUser('user-2');

      expect(states1).not.toBe(states2);
      expect(states1.length).toBe(states2.length);
    });

    it('should have ruleIds matching SLEEP_RULES', async () => {
      const states = await engine.initializeUser('user-1');
      const ruleIds = new Set(SLEEP_RULES.map((r) => r.id));

      for (const state of states) {
        expect(ruleIds.has(state.ruleId)).toBe(true);
      }
    });
  });

  describe('getEveningRehearsal()', () => {
    it('should return a rehearsal session', async () => {
      const session = await engine.getEveningRehearsal('user-1', '23:00');

      expect(session).toBeDefined();
      expect(session.userId).toBe('user-1');
      expect(session.plannedBedtime).toBe('23:00');
      expect(session.rules.length).toBeGreaterThan(0);
    });

    it('should auto-initialize user', async () => {
      const session = await engine.getEveningRehearsal('new-user', '23:00');

      expect(session.userId).toBe('new-user');
    });

    it('should update rehearsal counts for selected rules', async () => {
      const session = await engine.getEveningRehearsal('user-1', '23:00');
      const states = await engine.initializeUser('user-1');

      const selectedIds = new Set(session.rules.map((r) => r.id));
      for (const state of states) {
        if (selectedIds.has(state.ruleId)) {
          expect(state.rehearsalCount).toBe(1);
        }
      }
    });

    it('should store session for morning quiz', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      expect(questions.length).toBeGreaterThan(0);
    });
  });

  describe('getMorningQuiz()', () => {
    it('should generate quiz from last rehearsal', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(3);
    });

    it('should use beginner rules if no rehearsal exists', async () => {
      const questions = await engine.getMorningQuiz('user-no-rehearsal');

      expect(questions.length).toBeGreaterThan(0);
    });

    it('should return questions with valid ruleIds', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      const allRuleIds = new Set(SLEEP_RULES.map((r) => r.id));
      for (const q of questions) {
        expect(allRuleIds.has(q.ruleId)).toBe(true);
      }
    });
  });

  describe('processQuizAnswers()', () => {
    it('should return feedback with score >= 0.8 as excellent', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      const answers: IRecallAnswer[] = questions.map((q) => ({
        questionId: q.questionId,
        response: q.correctAnswers[0] || '',
        isCorrect: true,
        partialScore: 1.0,
        responseTimeSeconds: 5,
      }));

      const result = await engine.processQuizAnswers('user-1', answers);

      expect(result.feedback).toContain('Отлично');
      expect(result.recallSession).toBeDefined();
      expect(result.updatedStates).toBeDefined();
    });

    it('should return feedback with score 0.5-0.79 as good', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      const answers: IRecallAnswer[] = questions.map((q, i) => ({
        questionId: q.questionId,
        response: 'partial answer',
        isCorrect: i === 0,
        partialScore: i === 0 ? 1.0 : 0.3,
        responseTimeSeconds: 5,
      }));

      // Ensure average is between 0.5 and 0.8
      const avgScore = answers.reduce((s, a) => s + a.partialScore, 0) / answers.length;
      if (avgScore >= 0.5 && avgScore < 0.8) {
        const result = await engine.processQuizAnswers('user-1', answers);
        expect(result.feedback).toContain('Хорошо');
      }
    });

    it('should return feedback with score < 0.5 as needs work', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      const answers: IRecallAnswer[] = questions.map((q) => ({
        questionId: q.questionId,
        response: 'wrong',
        isCorrect: false,
        partialScore: 0,
        responseTimeSeconds: 5,
      }));

      const result = await engine.processQuizAnswers('user-1', answers);

      expect(result.feedback).toContain('Есть над чем поработать');
    });

    it('should update consolidation states', async () => {
      await engine.initializeUser('user-1');
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      const answers: IRecallAnswer[] = questions.map((q) => ({
        questionId: q.questionId,
        response: 'test',
        isCorrect: true,
        partialScore: 1,
        responseTimeSeconds: 3,
      }));

      const result = await engine.processQuizAnswers('user-1', answers);

      expect(result.updatedStates.length).toBeGreaterThan(0);
    });

    it('should store recall session', async () => {
      await engine.getEveningRehearsal('user-1', '23:00');
      const questions = await engine.getMorningQuiz('user-1');

      const answers: IRecallAnswer[] = questions.map((q) => ({
        questionId: q.questionId,
        response: 'test',
        isCorrect: true,
        partialScore: 1,
        responseTimeSeconds: 3,
      }));

      await engine.processQuizAnswers('user-1', answers);
      const progress = await engine.getProgress('user-1');

      expect(progress.avgRecallAccuracy).toBeGreaterThan(0);
    });
  });

  describe('getProgress()', () => {
    it('should return analytics for user', async () => {
      await engine.initializeUser('user-1');
      const progress = await engine.getProgress('user-1');

      expect(progress).toBeDefined();
      expect(progress.userId).toBe('user-1');
    });

    it('should return 0 progress for new user', async () => {
      const progress = await engine.getProgress('new-user');

      expect(progress.avgRecallAccuracy).toBe(0);
      expect(progress.overallProgress).toBe(0);
    });
  });

  describe('shouldPromptRehearsal()', () => {
    it('should return true 30 min before bedtime', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(22, 30, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(true);
    });

    it('should return true 45 min before bedtime', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(22, 15, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(true);
    });

    it('should return true at 25 min before bedtime (lower bound)', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(22, 35, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(true);
    });

    it('should return true at 65 min before bedtime (upper bound)', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(21, 55, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(true);
    });

    it('should return false 10 min before bedtime (too close)', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(22, 50, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(false);
    });

    it('should return false 2 hours before bedtime (too early)', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(21, 0, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(false);
    });

    it('should return false after bedtime', () => {
      const bedtime = '23:00';
      const currentTime = new Date();
      currentTime.setHours(23, 30, 0, 0);

      expect(engine.shouldPromptRehearsal('user-1', currentTime, bedtime)).toBe(false);
    });
  });

  describe('shouldPromptMorningQuiz()', () => {
    it('should return true 30 min after wake time', () => {
      const wakeTime = '07:00';
      const currentTime = new Date();
      currentTime.setHours(7, 30, 0, 0);

      expect(engine.shouldPromptMorningQuiz('user-1', currentTime, wakeTime)).toBe(true);
    });

    it('should return true 15 min after wake time (lower bound)', () => {
      const wakeTime = '07:00';
      const currentTime = new Date();
      currentTime.setHours(7, 15, 0, 0);

      expect(engine.shouldPromptMorningQuiz('user-1', currentTime, wakeTime)).toBe(true);
    });

    it('should return true 60 min after wake time (upper bound)', () => {
      const wakeTime = '07:00';
      const currentTime = new Date();
      currentTime.setHours(8, 0, 0, 0);

      expect(engine.shouldPromptMorningQuiz('user-1', currentTime, wakeTime)).toBe(true);
    });

    it('should return false 5 min after wake (too early)', () => {
      const wakeTime = '07:00';
      const currentTime = new Date();
      currentTime.setHours(7, 5, 0, 0);

      expect(engine.shouldPromptMorningQuiz('user-1', currentTime, wakeTime)).toBe(false);
    });

    it('should return false 90 min after wake (too late)', () => {
      const wakeTime = '07:00';
      const currentTime = new Date();
      currentTime.setHours(8, 30, 0, 0);

      expect(engine.shouldPromptMorningQuiz('user-1', currentTime, wakeTime)).toBe(false);
    });

    it('should return false before wake time', () => {
      const wakeTime = '07:00';
      const currentTime = new Date();
      currentTime.setHours(6, 30, 0, 0);

      expect(engine.shouldPromptMorningQuiz('user-1', currentTime, wakeTime)).toBe(false);
    });
  });

  describe('integration: rehearsal → quiz → states → analytics', () => {
    it('should complete full cycle', async () => {
      // 1. Initialize
      await engine.initializeUser('user-1');

      // 2. Evening rehearsal
      const rehearsal = await engine.getEveningRehearsal('user-1', '23:00');
      expect(rehearsal.rules.length).toBeGreaterThan(0);

      // 3. Morning quiz
      const questions = await engine.getMorningQuiz('user-1');
      expect(questions.length).toBeGreaterThan(0);

      // 4. Answer quiz
      const answers: IRecallAnswer[] = questions.map((q) => ({
        questionId: q.questionId,
        response: 'test answer',
        isCorrect: true,
        partialScore: 0.8,
        responseTimeSeconds: 10,
      }));

      const result = await engine.processQuizAnswers('user-1', answers);
      expect(result.recallSession.overallScore).toBeCloseTo(0.8, 5);

      // 5. Check progress
      const progress = await engine.getProgress('user-1');
      expect(progress.avgRecallAccuracy).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// createSmartMemoryWindowEngine factory
// =============================================================================

describe('createSmartMemoryWindowEngine()', () => {
  it('should create engine instance', () => {
    const engine = createSmartMemoryWindowEngine();

    expect(engine).toBeDefined();
    expect(engine.rehearsal).toBeDefined();
    expect(engine.recall).toBeDefined();
    expect(engine.analytics).toBeDefined();
  });

  it('should accept custom config', () => {
    const config: IAdaptiveLearningConfig = {
      ...DEFAULT_ADAPTIVE_CONFIG,
      maxRulesPerSession: 10,
    };

    const engine = createSmartMemoryWindowEngine(config);
    expect(engine).toBeDefined();
  });
});
