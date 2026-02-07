/**
 * Start Callback Handler
 * ======================
 * Handles 'start:*' callbacks for onboarding, ISI assessment, and consent.
 *
 * Callbacks:
 * - start:consent_* - Consent flow
 * - start:isi_* - ISI assessment questions and result
 * - start:onboarding_* - Onboarding completion
 *
 * Database Persistence:
 * - ISI assessment (ePRO compliant with timestamps)
 * - Consent recording (GDPR/ФЗ-152/21 CFR Part 11)
 * - Initial therapy session creation
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/StartCallbackHandler
 */

import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';
import type { ICommandResult, ISleepCoreContext, IConversationCommand } from '../commands';

interface IAssessmentEntity {
  id?: string;
  userId: string;
  type: string;
  score: number;
  severity: string;
  category: string;
  responsesJson: string;
  interpretation: string;
  assessedAt: Date;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ITherapySessionEntity {
  id?: string;
  userId: string;
  sessionType: string;
  week: number;
  component: string;
  status: string;
  adherence: number;
  homeworkCompleted: boolean;
  notesJson: string;
  scheduledAt: Date;
  completedAt: Date;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IAssessmentRepository {
  insert(entity: Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<IAssessmentEntity | null>;
}

interface ITherapySessionRepository {
  insert(entity: Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITherapySessionEntity | null>;
}

interface IUserRepository {
  recordConsent(userId: string): Promise<void>;
}

interface IAuditService {
  logCreate(entityType: string, entityId: string, data: Record<string, unknown>, context?: { userId?: string }): Promise<void>;
  logConsent(userId: string, granted: boolean, context?: { metadata?: Record<string, unknown> }): Promise<void>;
}

interface IISIData {
  answers: number[];
  answeredAt: string[];
  currentQuestion: number;
  step: string;
  startedAt?: string;
}

interface IStartSession {
  isiData?: IISIData;
  dbUserId?: string;
  therapyState?: {
    hasActiveSession?: boolean;
    currentWeek?: number;
    hasCompletedOnboarding?: boolean;
    lastDiaryDate?: string;
  };
}

/**
 * Start callback handler
 * Manages ISI assessment, consent recording, and onboarding flow
 */
export class StartCallbackHandler extends BaseCallbackHandler {
  readonly command = 'start';

  private startCommand: IConversationCommand;
  private assessmentRepository: IAssessmentRepository | null;
  private therapySessionRepository: ITherapySessionRepository | null;
  private userRepository: IUserRepository | null;
  private auditService: IAuditService | null;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.startCommand = deps.startCommand as IConversationCommand;
    this.assessmentRepository = deps.assessmentRepository as IAssessmentRepository | null;
    this.therapySessionRepository = deps.therapySessionRepository as ITherapySessionRepository | null;
    this.userRepository = deps.userRepository as IUserRepository | null;
    this.auditService = deps.auditService as IAuditService | null;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, sleepCoreCtx, callbackData } = context;
    const session = ctx.session as IStartSession;

    if (!('handleCallback' in this.startCommand)) {
      return this.notHandled();
    }

    // Get ISI data from session or initialize (ePRO compliant with timestamps)
    const isiData = session.isiData || {
      answers: [],
      answeredAt: [],
      currentQuestion: 0,
      step: 'welcome',
      startedAt: undefined,
    };

    const result = await this.startCommand.handleCallback(
      sleepCoreCtx,
      callbackData.raw,
      {
        isiAnswers: isiData.answers,
        step: isiData.step,
      }
    );

    // Update session with result metadata
    if (result?.metadata) {
      await this.updateSessionFromMetadata(ctx, session, isiData, result, sleepCoreCtx.userId);
    }

    return this.handled(result);
  }

  private async updateSessionFromMetadata(
    ctx: IHandlerContext['ctx'],
    session: IStartSession,
    isiData: IISIData,
    result: ICommandResult,
    userId: string
  ): Promise<void> {
    const meta = result.metadata as Record<string, unknown>;
    const newAnswers = (meta.isiAnswers as number[]) || isiData.answers;
    const newQuestion = (meta.currentQuestion as number) || isiData.currentQuestion;
    const newStep = (meta.step as string) || isiData.step;

    // Track timestamps for each answer (ePRO best practice)
    const answeredAt = [...isiData.answeredAt];
    if (newAnswers.length > isiData.answers.length) {
      answeredAt.push(new Date().toISOString());
    }

    // Track assessment start time
    const startedAt = isiData.startedAt ||
      (newStep.startsWith('isi_q') ? new Date().toISOString() : undefined);

    (ctx.session as IStartSession).isiData = {
      answers: newAnswers,
      answeredAt,
      currentQuestion: newQuestion,
      step: newStep,
      startedAt,
    };

    // Database Persistence for ISI Assessment
    if (meta.step === 'isi_result') {
      await this.persistISIAssessment(ctx, session, meta, newAnswers, userId);
    }

    // Database Persistence for Explicit Consent
    if (meta.consentGiven === true && meta.step === 'consent_accepted') {
      await this.persistConsent(session, meta);
    }

    // Check for onboarding completion
    if (result.metadata?.onboardingCompleted) {
      await this.handleOnboardingComplete(ctx, session, userId);
    }
  }

  private async persistISIAssessment(
    ctx: IHandlerContext['ctx'],
    session: IStartSession,
    meta: Record<string, unknown>,
    answers: number[],
    userId: string
  ): Promise<void> {
    if (!this.assessmentRepository) return;

    try {
      const isiScore = meta.isiScore as number;

      // Determine severity label for database
      let severityLabel: string;
      if (isiScore <= 7) severityLabel = 'none';
      else if (isiScore <= 14) severityLabel = 'subthreshold';
      else if (isiScore <= 21) severityLabel = 'moderate';
      else severityLabel = 'severe';

      // ePRO compliant response format with item-level timestamps
      const isiData = (ctx.session as IStartSession).isiData;
      const itemResponses = answers.map((value, index) => ({
        item: index + 1,
        value,
        answeredAt: isiData?.answeredAt[index] || null,
      }));

      const assessmentEntity: Omit<IAssessmentEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        type: 'isi',
        score: isiScore,
        severity: severityLabel,
        category: meta.severity as string,
        responsesJson: JSON.stringify({
          items: itemResponses,
          startedAt: isiData?.startedAt,
          completedAt: new Date().toISOString(),
          totalDurationMs: isiData?.startedAt
            ? Date.now() - new Date(isiData.startedAt).getTime()
            : null,
        }),
        interpretation: `ISI Score: ${isiScore}/28 - ${severityLabel}`,
        assessedAt: new Date(),
        deletedAt: null,
      };

      const savedAssessment = await this.assessmentRepository.insert(assessmentEntity);
      this.log(`ISI assessment saved for user ${userId}, score: ${isiScore}`);

      // ICH E6(R3) Audit: Log assessment completion
      if (this.auditService && savedAssessment?.id) {
        await this.auditService.logCreate('assessment', savedAssessment.id, {
          type: 'isi',
          score: isiScore,
          severity: severityLabel,
        }, { userId: session.dbUserId });
      }

      // Clear ISI session data after successful save
      (ctx.session as IStartSession).isiData = undefined;
    } catch (error) {
      this.error('Failed to save ISI assessment:', error);
    }
  }

  private async persistConsent(
    session: IStartSession,
    meta: Record<string, unknown>
  ): Promise<void> {
    if (!this.userRepository || !session.dbUserId) return;

    try {
      await this.userRepository.recordConsent(session.dbUserId);
      this.log(`User ${session.dbUserId} explicit consent recorded at ${meta.consentTimestamp}`);

      // ICH E6(R3) Audit: Log consent event
      if (this.auditService) {
        await this.auditService.logConsent(session.dbUserId, true, {
          metadata: { timestamp: meta.consentTimestamp },
        });
      }
    } catch (error) {
      this.error('Failed to record consent:', error);
    }
  }

  private async handleOnboardingComplete(
    ctx: IHandlerContext['ctx'],
    session: IStartSession,
    userId: string
  ): Promise<void> {
    (ctx.session as IStartSession).therapyState = {
      ...session.therapyState,
      hasActiveSession: true,
      currentWeek: 0,
      hasCompletedOnboarding: true,
    };

    // Create Initial Therapy Session
    if (!this.therapySessionRepository) return;

    try {
      const therapySession: Omit<ITherapySessionEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        sessionType: 'cbti',
        week: 0,
        component: 'onboarding',
        status: 'completed',
        adherence: 100,
        homeworkCompleted: true,
        notesJson: JSON.stringify({ isiCompleted: true }),
        scheduledAt: new Date(),
        completedAt: new Date(),
        deletedAt: null,
      };

      const savedSession = await this.therapySessionRepository.insert(therapySession);
      this.log(`Initial therapy session created for user ${userId}`);

      // ICH E6(R3) Audit: Log therapy session creation
      if (this.auditService && savedSession?.id) {
        await this.auditService.logCreate('therapy_session', savedSession.id, {
          sessionType: 'cbti',
          week: 0,
          component: 'onboarding',
        }, { userId: session.dbUserId });
      }
    } catch (error) {
      this.error('Failed to create therapy session:', error);
    }
  }
}
