/**
 * /sos Command - Crisis Intervention
 * ===================================
 * One-tap access to crisis resources.
 *
 * Research basis:
 * - Crisis features increase retention by 47% (AppInventiv 2025)
 * - SAMHSA 2025 guidelines for mental health apps
 * - One-tap access is critical for crisis situations
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import {
  crisisDetectionService,
  type ICrisisEvent,
} from '../services/CrisisDetectionService';
import { crisisEscalationService } from '../services/CrisisEscalationService';

/**
 * Crisis resource
 */
interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  available: string;
}

/**
 * /sos Command Implementation
 */
export class SosCommand implements IConversationCommand {
  readonly name = 'sos';
  readonly description = 'Экстренная помощь';
  readonly aliases = ['emergency', 'help911', 'crisis', 'помощь'];
  readonly requiresSession = false;
  readonly steps = ['initial'];

  /**
   * Crisis resources (Russia)
   */
  private readonly resources: CrisisResource[] = [
    {
      name: 'Телефон доверия',
      phone: '8-800-2000-122',
      description: 'Бесплатная психологическая помощь',
      available: '24/7, бесплатно',
    },
    {
      name: 'Центр экстренной психологической помощи МЧС',
      phone: '8-499-216-50-50',
      description: 'Психологическая помощь в кризисных ситуациях',
      available: '24/7',
    },
    {
      name: 'Линия помощи "Дети онлайн"',
      phone: '8-800-250-00-15',
      description: 'Для детей и подростков',
      available: '9:00-18:00 МСК, бесплатно',
    },
  ];

  /**
   * Execute the command
   * Records user-initiated crisis event and escalates to admins
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    // Record SOS activation as a crisis event and escalate
    this.escalateSosEvent(ctx).catch((err) => {
      console.error('[SosCommand] Escalation failed:', err);
    });

    return this.showCrisisResources(ctx);
  }

  /**
   * Record and escalate user-initiated SOS event
   * Non-blocking — resources are shown immediately regardless of escalation outcome
   */
  private async escalateSosEvent(ctx: ISleepCoreContext): Promise<void> {
    const event: ICrisisEvent = {
      userId: ctx.userId,
      chatId: String(ctx.chatId),
      timestamp: new Date(),
      severity: 'high',
      crisisType: 'acute_distress',
      confidence: 1.0, // User explicitly requested help
      action: 'interrupt',
      messageText: '/sos',
      indicators: ['user_initiated_sos'],
      responseProvided: true,
    };

    crisisDetectionService.recordSosEvent(event);
    await crisisEscalationService.escalate(event);
  }

  // ==================== Response Handlers ====================

  private async showCrisisResources(_ctx: ISleepCoreContext): Promise<ICommandResult> {
    const resourcesList = this.resources
      .map(
        (r) => `
*📞 ${r.name}*
${r.phone}
_${r.description}_
🕐 ${r.available}`
      )
      .join('\n\n');

    // Sonya's empathetic response for crisis
    const sonyaResponse = sonya.respondToEmotion('anxious');

    const message = `
${sonya.emoji} *${sonya.name}*

${sonyaResponse.text}

${formatter.header('🆘 Экстренная помощь')}

Если тебе плохо прямо сейчас — ты не один(а).
Позвони на одну из линий помощи:

${resourcesList}

${formatter.divider()}

*Пока ждёшь ответа:*

${formatter.numberedList([
  'Дыши медленно: вдох 4 сек, выдох 6 сек',
  'Назови 5 вещей, которые видишь вокруг',
  'Опиши 4 вещи, которые можешь потрогать',
  'Вспомни 3 звука, которые слышишь',
])}

${formatter.divider()}

${sonya.say('Ты справишься. Это состояние временное. Я рядом.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🌬 Дыхательное упражнение', callbackData: 'sos:breathing' }],
      [{ text: '🧘 Техника заземления', callbackData: 'sos:grounding' }],
      [{ text: '💬 Мне нужно выговориться', callbackData: 'sos:talk' }],
    ];

    return {
      success: true,
      message,
      keyboard,
      metadata: { crisis: true },
    };
  }
  // ==================== Conversation Interface ====================

  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    if (step === 'initial') {
      return this.execute(ctx);
    }
    return { success: false, error: `Unknown step: ${step}` };
  }

  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const parts = callbackData.split(':');
    if (parts[0] !== 'sos') {
      return { success: false, error: 'Invalid callback' };
    }

    const action = parts[1];

    switch (action) {
      case 'breathing':
        return this.showBreathingExercise();
      case 'grounding':
        return this.showGroundingExercise();
      case 'talk':
        return this.showTalkResources();
      case 'back':
        return this.showCrisisResources(ctx);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  // ==================== Callback Handlers ====================

  /**
   * 4-7-8 Breathing Exercise
   *
   * Scientific basis:
   * - Extended exhalation activates parasympathetic nervous system via vagal tone (HIGH confidence)
   * - 4-7-8 is a popularized variant of slow breathing (Andrew Weil, Arizona)
   * - No RCTs specifically for 4-7-8 and insomnia; general slow breathing has moderate evidence
   * - European Guideline 2023: relaxation as CBT-I component (Grade A)
   * - BYU 2025: 4-7-8 maintains CO2 levels better than 6 bpm (MEDIUM confidence)
   * - Safety: contraindicated in severe COPD, active asthma, active panic attack
   */
  private async showBreathingExercise(): Promise<ICommandResult> {
    const message = `
${formatter.header('🌬 Дыхательное упражнение 4-7-8')}

${sonya.say('Это упражнение активирует парасимпатическую нервную систему через длинный выдох. Давай сделаем вместе.')}

${formatter.divider()}

*Техника (разработана А. Вейлом, Университет Аризоны):*

${formatter.numberedList([
  '*Вдох* через нос — считай до *4*',
  '*Задержка* дыхания — считай до *7*',
  '*Выдох* через рот со звуком «шшш» — считай до *8*',
])}

Повтори *4 цикла*.

${formatter.divider()}

*Важно:*
• Темп счёта не важен — важно соотношение 4:7:8
• Выдох всегда в 2 раза длиннее вдоха
• При головокружении — вернись к обычному дыханию

${formatter.divider()}

${formatter.tip('Делай минимум 2 раза в день. Эффект нарастает с практикой.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'sos:back' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * 5-4-3-2-1 Grounding Exercise
   *
   * Scientific basis:
   * - Originated in Ericksonian hypnotherapy (Betty Alice Erickson) (MEDIUM confidence)
   * - Mechanism: attentional redirection from distress to sensory input (MEDIUM-HIGH confidence)
   * - No RCTs specifically for 5-4-3-2-1; Hammond & Brown 2025 confirm research gap
   * - Used in DBT (distress tolerance), CBT, trauma stabilization
   * - Very safe; first-line stabilization tool (HIGH confidence)
   * - Adapted for nighttime: eyes closed, imagine instead of see
   */
  private async showGroundingExercise(): Promise<ICommandResult> {
    const message = `
${formatter.header('🧘 Техника заземления 5-4-3-2-1')}

${sonya.say('Эта техника переключает внимание с тревожных мыслей на ощущения здесь и сейчас. Начнём.')}

${formatter.divider()}

*Сделай глубокий вдох и выдох, затем:*

*5 — ЗРЕНИЕ* 👀
Назови 5 вещей, которые ты видишь (или представь 5 спокойных образов, если глаза закрыты)

*4 — ОСЯЗАНИЕ* ✋
Обрати внимание на 4 ощущения: текстуру одеяла, температуру воздуха, вес тела на кровати, подушку под головой

*3 — СЛУХ* 👂
Прислушайся к 3 звукам: тиканье часов, шум за окном, своё дыхание

*2 — ОБОНЯНИЕ* 👃
Заметь 2 запаха (или вспомни 2 любимых аромата)

*1 — ВКУС* 👅
Заметь 1 вкус (или сделай глоток воды)

${formatter.divider()}

*Завершение:*
Сделай ещё один глубокий вдох-выдох.
Отметь, как изменилось состояние.

${formatter.tip('Если какой-то канал восприятия недоступен — пропусти его и удвой другой.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'sos:back' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show talk/crisis resources with expanded hotlines
   */
  private async showTalkResources(): Promise<ICommandResult> {
    const message = `
${formatter.header('💬 Поговорить с кем-то')}

${sonya.say('Иногда самое важное — просто рассказать кому-то. Вот люди, которые готовы выслушать прямо сейчас.')}

${formatter.divider()}

*📞 Телефон доверия*
*8-800-2000-122*
_Бесплатно, анонимно, 24/7_
_Для детей, подростков и взрослых_

*📞 Психологическая помощь*
*8-800-100-49-94*
_Бесплатно, 24/7_

*📞 МЧС — экстренная психологическая помощь*
*${this.resources[1].phone}*
_${this.resources[1].available}_

${formatter.divider()}

*Онлайн:*
🌐 psi.mchs.gov.ru — чат с психологом МЧС

${formatter.divider()}

${sonya.say('Ты не один(а). Звонок — это не слабость, а правильный шаг.')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'sos:back' }],
    ];

    return { success: true, message, keyboard };
  }
}

// Export singleton
export const sosCommand = new SosCommand();
