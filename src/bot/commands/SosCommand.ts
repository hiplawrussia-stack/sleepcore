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
<b>📞 ${r.name}</b>
${r.phone}
<i>${r.description}</i>
🕐 ${r.available}`
      )
      .join('\n\n');

    const message = `
${formatter.header('🆘 Экстренная помощь')}

Если вам плохо прямо сейчас — вы не одиноки.
Позвоните на одну из линий помощи:

${resourcesList}

${formatter.divider()}

<b>Пока ждёте ответа:</b>

${formatter.numberedList([
  'Дышите медленно: вдох 4 сек, выдох 6 сек',
  'Назовите 5 вещей, которые видите вокруг',
  'Опишите 4 вещи, которые можете потрогать',
  'Вспомните 3 звука, которые слышите',
])}

${formatter.divider()}

${formatter.tip('Вы справитесь. Это состояние временное.')}
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
