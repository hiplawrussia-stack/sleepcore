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
  ICommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';

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
export class SosCommand implements ICommand {
  readonly name = 'sos';
  readonly description = 'Экстренная помощь';
  readonly aliases = ['emergency', 'help911', 'crisis', 'помощь'];
  readonly requiresSession = false;

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
   */
  async execute(ctx: ISleepCoreContext): Promise<ICommandResult> {
    return this.showCrisisResources(ctx);
  }

  // ==================== Response Handlers ====================

  private async showCrisisResources(ctx: ISleepCoreContext): Promise<ICommandResult> {
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
}

// Export singleton
export const sosCommand = new SosCommand();
