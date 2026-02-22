/**
 * Diary Callback Handler
 * ======================
 * Handles 'diary:*' callbacks for sleep diary entry recording.
 *
 * Callbacks:
 * - diary:* - Sleep diary entry flow (date, times, quality)
 *
 * Database Persistence:
 * - Sleep diary entries with calculated metrics (SOL, WASO, SE, TST, TIB)
 * - ICH E6(R3) compliant audit trail
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/DiaryCallbackHandler
 */

import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';
import type { ICommandResult, IConversationCommand } from '../commands';

interface ISleepDiaryEntryEntity {
  id?: string;
  userId: string;
  date: string;
  bedtime: string;
  lightsOffTime: string;
  sleepOnsetLatency: number;
  wakeTime: string;
  outOfBedTime: string;
  nightAwakenings: number;
  wakeAfterSleepOnset: number;
  totalSleepTime: number;
  timeInBed: number;
  sleepEfficiency: number;
  sleepQuality: number;
  morningMood: number;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ISleepDiaryRepository {
  upsert(entity: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
}

interface IAuditService {
  logCreate(entityType: string, entityId: string, data: Record<string, unknown>, context?: { userId?: string }): Promise<void>;
}

interface IDiarySession {
  dbUserId?: string;
  therapyState?: {
    hasActiveSession?: boolean;
    currentWeek?: number;
    lastDiaryDate?: string;
  };
}

interface IDiaryMetadata {
  saved?: boolean;
  date: string;
  bedtimeHour: number;
  bedtimeMinute: number;
  waketimeHour: number;
  waketimeMinute: number;
  sleepQuality: number;
}

/**
 * Diary callback handler
 * Manages sleep diary entry recording with database persistence
 */
export class DiaryCallbackHandler extends BaseCallbackHandler {
  readonly command = 'diary';

  private diaryCommand: IConversationCommand;
  private sleepDiaryRepository: ISleepDiaryRepository | null;
  private auditService: IAuditService | null;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.diaryCommand = deps.diaryCommand as IConversationCommand;
    this.sleepDiaryRepository = deps.sleepDiaryRepository as ISleepDiaryRepository | null;
    this.auditService = deps.auditService as IAuditService | null;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, sleepCoreCtx, callbackData } = context;
    const session = ctx.session as IDiarySession;

    if (!('handleCallback' in this.diaryCommand)) {
      return this.notHandled();
    }

    const result = await this.diaryCommand.handleCallback(
      sleepCoreCtx,
      callbackData.raw,
      {}
    );

    // Database Persistence for Sleep Diary
    if (result?.metadata?.saved && this.sleepDiaryRepository) {
      await this.persistDiaryEntry(ctx, session, result, sleepCoreCtx.userId);
    }

    return this.handled(result);
  }

  private async persistDiaryEntry(
    ctx: IHandlerContext['ctx'],
    session: IDiarySession,
    result: ICommandResult,
    userId: string
  ): Promise<void> {
    try {
      const diaryData = result.metadata as unknown as IDiaryMetadata;

      // Calculate bedtime and wake time strings
      const bedtime = `${diaryData.bedtimeHour.toString().padStart(2, '0')}:${diaryData.bedtimeMinute.toString().padStart(2, '0')}`;
      const wakeTime = `${diaryData.waketimeHour.toString().padStart(2, '0')}:${diaryData.waketimeMinute.toString().padStart(2, '0')}`;

      // Calculate duration (handling midnight crossing)
      let hours = diaryData.waketimeHour - diaryData.bedtimeHour;
      if (hours < 0) hours += 24;
      const minutes = diaryData.waketimeMinute - diaryData.bedtimeMinute;
      const timeInBed = hours * 60 + minutes;

      // Estimate sleep metrics (simplified - would come from detailed entry)
      const sleepOnsetLatency = 15; // Default estimate
      const wakeAfterSleepOnset = Math.round(timeInBed * 0.1);
      const totalSleepTime = timeInBed - sleepOnsetLatency - wakeAfterSleepOnset;
      const sleepEfficiency = Math.round((totalSleepTime / timeInBed) * 100);

      const diaryEntity: Omit<ISleepDiaryEntryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        date: diaryData.date,
        bedtime,
        lightsOffTime: bedtime,
        sleepOnsetLatency,
        wakeTime,
        outOfBedTime: wakeTime,
        nightAwakenings: 1,
        wakeAfterSleepOnset,
        totalSleepTime,
        timeInBed,
        sleepEfficiency,
        sleepQuality: diaryData.sleepQuality,
        morningMood: diaryData.sleepQuality,
        deletedAt: null,
      };

      await this.sleepDiaryRepository!.upsert(diaryEntity);
      this.log(`Diary entry saved for user ${userId}, date: ${diaryData.date}`);

      // ICH E6(R3) Audit: Log sleep diary entry creation
      if (this.auditService && session.dbUserId) {
        await this.auditService.logCreate('sleep_diary', session.dbUserId, {
          date: diaryData.date,
          sleepEfficiency,
        }, { userId: session.dbUserId });
      }

      // Update session cache
      (ctx.session as IDiarySession).therapyState = {
        ...session.therapyState,
        hasActiveSession: true,
        lastDiaryDate: diaryData.date,
        currentWeek: session.therapyState?.currentWeek || 0,
      };
    } catch (error) {
      this.error('Failed to save diary entry:', error);
      // Graceful degradation: don't fail the user's experience
    }
  }
}
